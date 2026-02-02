#!/usr/bin/env python3
"""
Teboraw Mobile App Setup & Deployment Tool

Interactive CLI for:
- Checking build status and detecting code changes
- Deploying to USB-connected Android devices
- Running the setup wizard for initial configuration
"""

import subprocess
import sys
import os
import shutil
import platform
import time
import socket
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Tuple

# Get the project root and mobile directory
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
MOBILE_DIR = PROJECT_ROOT / "apps" / "mobile"
NATIVE_DIR = MOBILE_DIR / "TeborawMobile"
ANDROID_DIR = NATIVE_DIR / "android"
SRC_DIR = NATIVE_DIR / "src"

# APK paths
DEBUG_APK = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
RELEASE_APK = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'


def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')


def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}  {text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")


def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")


def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.ENDC}")


def print_info(text: str):
    print(f"{Colors.BLUE}ℹ {text}{Colors.ENDC}")


def ask_yes_no(question: str, default: bool = True) -> bool:
    default_str = "[Y/n]" if default else "[y/N]"
    while True:
        response = input(f"{question} {default_str}: ").strip().lower()
        if response == "":
            return default
        if response in ["y", "yes"]:
            return True
        if response in ["n", "no"]:
            return False
        print("Please enter 'y' or 'n'")


def run_command(cmd: str, check: bool = True, capture: bool = False, timeout: int = None) -> subprocess.CompletedProcess:
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=check,
            capture_output=capture,
            text=True,
            timeout=timeout
        )
        return result
    except subprocess.CalledProcessError as e:
        if capture:
            print_error(f"Command failed: {e.stderr}")
        raise
    except subprocess.TimeoutExpired:
        print_error(f"Command timed out")
        raise


def run_command_live(cmd: List[str], cwd: Optional[Path] = None, use_build_env: bool = False) -> int:
    """Run a command with live output."""
    env = get_build_env() if use_build_env else None
    process = subprocess.Popen(cmd, cwd=cwd or NATIVE_DIR, env=env)
    process.wait()
    return process.returncode


def check_command_exists(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def get_command_version(cmd: str, version_flag: str = "--version") -> str | None:
    try:
        result = run_command(f"{cmd} {version_flag}", capture=True, check=False)
        return result.stdout.strip() or result.stderr.strip()
    except Exception:
        return None


# =============================================================================
# Java Configuration
# =============================================================================

def get_java_21_home() -> Optional[str]:
    """Get path to Java 21 JDK (required for React Native builds)."""
    is_mac = platform.system() == "Darwin"

    if is_mac:
        # Check for Java 21 first (best compatibility), then 17
        for version in ['21', '17']:
            try:
                result = subprocess.run(
                    ['/usr/libexec/java_home', '-v', version],
                    capture_output=True, text=True, check=False
                )
                if result.returncode == 0 and result.stdout.strip():
                    return result.stdout.strip()
            except Exception:
                pass

        # Check common paths
        common_paths = [
            '/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home',
            '/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home',
            '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
            '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home',
            '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path
    else:
        # Linux/Windows - check common paths
        common_paths = [
            '/usr/lib/jvm/java-21-openjdk',
            '/usr/lib/jvm/java-17-openjdk',
            os.path.expanduser('~/.jdks/openjdk-21'),
            os.path.expanduser('~/.jdks/openjdk-17'),
        ]
        for path in common_paths:
            if os.path.exists(path):
                return path

    return None


def get_build_env() -> dict:
    """Get environment variables for building, with correct Java version."""
    env = os.environ.copy()

    # Set JAVA_HOME to Java 21 if available
    java_home = get_java_21_home()
    if java_home:
        env['JAVA_HOME'] = java_home
        # Prepend Java bin to PATH
        java_bin = os.path.join(java_home, 'bin')
        env['PATH'] = f"{java_bin}:{env.get('PATH', '')}"

    # Set ANDROID_HOME
    android_home = get_android_home()
    if android_home:
        env['ANDROID_HOME'] = android_home
        env['PATH'] = f"{env['PATH']}:{android_home}/platform-tools"

    return env


# =============================================================================
# Android SDK and ADB Functions
# =============================================================================

def get_android_home() -> Optional[str]:
    """Get ANDROID_HOME path."""
    android_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if android_home and Path(android_home).exists():
        return android_home

    common_paths = [
        Path.home() / "Library" / "Android" / "sdk",
        Path.home() / "Android" / "Sdk",
        Path("/usr/local/android-sdk"),
        Path.home() / "AppData" / "Local" / "Android" / "Sdk",
    ]

    for path in common_paths:
        if path.exists():
            return str(path)
    return None


def get_adb_path() -> Optional[str]:
    """Get the path to adb."""
    if check_command_exists('adb'):
        return 'adb'

    android_home = get_android_home()
    if android_home:
        adb_path = Path(android_home) / "platform-tools" / "adb"
        if adb_path.exists():
            return str(adb_path)
    return None


def get_connected_devices() -> List[Tuple[str, str, str]]:
    """Get list of connected Android devices via ADB."""
    adb = get_adb_path()
    if not adb:
        return []

    try:
        result = subprocess.run(
            [adb, 'devices', '-l'],
            capture_output=True,
            text=True,
            check=False
        )
        devices = []

        for line in result.stdout.strip().split('\n')[1:]:
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    device_id = parts[0]
                    status = parts[1]
                    model = "Unknown"
                    for part in parts[2:]:
                        if part.startswith('model:'):
                            model = part.split(':')[1].replace('_', ' ')
                            break
                    devices.append((device_id, status, model))
        return devices
    except Exception:
        return []


def list_android_emulators() -> list[str]:
    """List available Android emulators."""
    android_home = get_android_home()
    if not android_home:
        return []

    emulator_path = os.path.join(android_home, "emulator", "emulator")
    if not os.path.exists(emulator_path):
        return []

    try:
        result = run_command(f'"{emulator_path}" -list-avds', capture=True, check=False)
        if result.returncode == 0:
            avds = [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
            return avds
    except Exception:
        pass
    return []


# =============================================================================
# Network Discovery Functions
# =============================================================================

def get_local_ip() -> Optional[str]:
    """Get the local network IP address of this machine."""
    try:
        # Create a socket to determine which interface would be used
        # to connect to an external address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        # Doesn't actually connect, just determines the route
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        pass

    # Fallback: try to get from hostname
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        # Filter out localhost
        if local_ip and not local_ip.startswith('127.'):
            return local_ip
    except Exception:
        pass

    return None


def get_all_local_ips() -> List[str]:
    """Get all local network IP addresses."""
    ips = []
    try:
        hostname = socket.gethostname()
        # Get all IPs for this hostname
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.'):
                ips.append(ip)
    except Exception:
        pass

    # Also try the primary method
    primary = get_local_ip()
    if primary and primary not in ips:
        ips.insert(0, primary)

    return list(set(ips))


# =============================================================================
# API URL Configuration
# =============================================================================

PRODUCTION_API_URL = "https://teboraw.com/api"
LOCAL_API_PORT = 5000

def configure_api_url():
    """Configure the API URL for the mobile app."""
    print_header("API URL Configuration")

    local_ip = get_local_ip()
    local_url = f"http://{local_ip}:{LOCAL_API_PORT}/api" if local_ip else None

    print("Choose how the mobile app should connect to the Teboraw API:\n")

    print(f"  {Colors.GREEN}1.{Colors.ENDC} Production API")
    print(f"     {Colors.DIM}{PRODUCTION_API_URL}{Colors.ENDC}")
    print(f"     {Colors.DIM}Use the hosted Teboraw service{Colors.ENDC}")
    print()

    if local_url:
        print(f"  {Colors.GREEN}2.{Colors.ENDC} Local Network API {Colors.CYAN}(auto-detected){Colors.ENDC}")
        print(f"     {Colors.DIM}{local_url}{Colors.ENDC}")
        print(f"     {Colors.DIM}Connect to API running on this machine{Colors.ENDC}")
        print()
    else:
        print(f"  {Colors.DIM}2. Local Network API (could not detect local IP){Colors.ENDC}")
        print()

    print(f"  {Colors.GREEN}3.{Colors.ENDC} Android Emulator (localhost)")
    print(f"     {Colors.DIM}http://10.0.2.2:{LOCAL_API_PORT}/api{Colors.ENDC}")
    print(f"     {Colors.DIM}For Android emulator connecting to host machine{Colors.ENDC}")
    print()

    print(f"  {Colors.GREEN}4.{Colors.ENDC} Custom URL")
    print(f"     {Colors.DIM}Enter a custom API URL{Colors.ENDC}")
    print()

    while True:
        choice = input(f"\n{Colors.BOLD}Choice (1-4): {Colors.ENDC}").strip()

        if choice == '1':
            selected_url = PRODUCTION_API_URL
            break
        elif choice == '2':
            if local_url:
                selected_url = local_url
                break
            else:
                print_error("Local IP could not be detected. Please use Custom URL option.")
        elif choice == '3':
            selected_url = f"http://10.0.2.2:{LOCAL_API_PORT}/api"
            break
        elif choice == '4':
            custom_url = input(f"\n{Colors.BOLD}Enter API URL: {Colors.ENDC}").strip()
            if custom_url:
                # Basic validation
                if not custom_url.startswith('http://') and not custom_url.startswith('https://'):
                    print_warning("URL should start with http:// or https://")
                    if ask_yes_no("Add https:// prefix?"):
                        custom_url = f"https://{custom_url}"
                selected_url = custom_url
                break
            else:
                print_error("Please enter a valid URL")
        else:
            print_error("Please enter 1, 2, 3, or 4")

    # Update the authStore.ts file
    success = update_api_url_in_source(selected_url)

    if success:
        print_success(f"API URL configured: {selected_url}")
        print_info("The app will use this URL by default")
        print_info("Users can still change it on the login screen")
    else:
        print_warning("Could not update source file automatically")
        print_info(f"Please manually set the API URL in the app to: {selected_url}")

    return selected_url


def update_api_url_in_source(url: str) -> bool:
    """Update the default API URL in authStore.ts."""
    auth_store_path = SRC_DIR / "store" / "authStore.ts"

    if not auth_store_path.exists():
        return False

    try:
        content = auth_store_path.read_text()

        # Find and replace the apiUrl default value
        import re
        pattern = r"apiUrl: '[^']*',"
        replacement = f"apiUrl: '{url}',"

        if re.search(pattern, content):
            new_content = re.sub(pattern, replacement, content)
            auth_store_path.write_text(new_content)
            return True
        else:
            # Try double quotes
            pattern = r'apiUrl: "[^"]*",'
            if re.search(pattern, content):
                replacement = f'apiUrl: "{url}",'
                new_content = re.sub(pattern, replacement, content)
                auth_store_path.write_text(new_content)
                return True

        return False
    except Exception as e:
        print_error(f"Failed to update authStore.ts: {e}")
        return False


# =============================================================================
# Build Status Functions
# =============================================================================

def get_build_info() -> dict:
    """Get information about existing builds."""
    info = {
        'debug': {'exists': False, 'path': None, 'time': None, 'size': None},
        'release': {'exists': False, 'path': None, 'time': None, 'size': None}
    }

    if DEBUG_APK.exists():
        stat = DEBUG_APK.stat()
        info['debug'] = {
            'exists': True,
            'path': DEBUG_APK,
            'time': datetime.fromtimestamp(stat.st_mtime),
            'size': stat.st_size / (1024 * 1024)
        }

    if RELEASE_APK.exists():
        stat = RELEASE_APK.stat()
        info['release'] = {
            'exists': True,
            'path': RELEASE_APK,
            'time': datetime.fromtimestamp(stat.st_mtime),
            'size': stat.st_size / (1024 * 1024)
        }

    return info


def get_latest_source_modification() -> Optional[datetime]:
    """Get the most recent modification time of source files."""
    latest = None

    source_paths = [
        NATIVE_DIR / "src",
        NATIVE_DIR / "App.tsx",
        NATIVE_DIR / "index.js",
        MOBILE_DIR / "src",
    ]

    extensions = {'.ts', '.tsx', '.js', '.jsx', '.json'}

    for source in source_paths:
        if source.is_file():
            mtime = datetime.fromtimestamp(source.stat().st_mtime)
            if latest is None or mtime > latest:
                latest = mtime
        elif source.is_dir():
            for file in source.rglob('*'):
                if file.is_file() and file.suffix in extensions:
                    mtime = datetime.fromtimestamp(file.stat().st_mtime)
                    if latest is None or mtime > latest:
                        latest = mtime

    return latest


def check_rebuild_needed() -> Tuple[bool, str]:
    """Check if a rebuild is needed based on source changes."""
    build_info = get_build_info()

    if not build_info['debug']['exists']:
        return True, "No build exists yet"

    build_time = build_info['debug']['time']
    source_time = get_latest_source_modification()

    if source_time is None:
        return False, "Could not determine source modification time"

    if source_time > build_time:
        time_diff = source_time - build_time
        return True, f"Source changed {format_timedelta(time_diff)} after last build"

    return False, "Build is up to date"


def format_timedelta(td) -> str:
    seconds = int(td.total_seconds())
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"


def format_datetime(dt: datetime) -> str:
    now = datetime.now()
    diff = now - dt

    if diff.days == 0:
        if diff.seconds < 60:
            return "just now"
        elif diff.seconds < 3600:
            return f"{diff.seconds // 60} minutes ago"
        else:
            return f"{diff.seconds // 3600} hours ago"
    elif diff.days == 1:
        return "yesterday"
    else:
        return dt.strftime("%b %d, %H:%M")


# =============================================================================
# Main Dashboard
# =============================================================================

def display_dashboard():
    """Display the main status dashboard."""
    clear_screen()

    print(f"""
{Colors.BOLD}{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║            Teboraw Mobile - Setup & Deployment               ║
╚══════════════════════════════════════════════════════════════╝{Colors.ENDC}
""")

    # Check if native project exists
    if not NATIVE_DIR.exists():
        print(f"  {Colors.RED}○{Colors.ENDC} Native project not initialized")
        print(f"  {Colors.DIM}Run setup wizard to create TeborawMobile/{Colors.ENDC}")
        print(f"\n{Colors.BOLD}OPTIONS{Colors.ENDC}")
        print("─" * 50)
        print(f"  {Colors.GREEN}s.{Colors.ENDC} Run Setup Wizard")
        print(f"  {Colors.YELLOW}q.{Colors.ENDC} Quit")
        print()
        return None, None, None, []

    # === Build Status ===
    print(f"{Colors.BOLD}BUILD STATUS{Colors.ENDC}")
    print("─" * 50)

    build_info = get_build_info()

    if build_info['debug']['exists']:
        dt = build_info['debug']['time']
        size = build_info['debug']['size']
        print(f"  {Colors.GREEN}●{Colors.ENDC} Debug APK    {Colors.DIM}({size:.1f} MB){Colors.ENDC}")
        print(f"    Built: {format_datetime(dt)}")
    else:
        print(f"  {Colors.RED}○{Colors.ENDC} Debug APK    {Colors.DIM}(not built){Colors.ENDC}")

    if build_info['release']['exists']:
        dt = build_info['release']['time']
        size = build_info['release']['size']
        print(f"  {Colors.GREEN}●{Colors.ENDC} Release APK  {Colors.DIM}({size:.1f} MB){Colors.ENDC}")
        print(f"    Built: {format_datetime(dt)}")
    else:
        print(f"  {Colors.DIM}○{Colors.ENDC} Release APK  {Colors.DIM}(not built){Colors.ENDC}")

    # === Rebuild Check ===
    rebuild_needed, rebuild_reason = check_rebuild_needed()
    print()
    if rebuild_needed:
        print(f"  {Colors.YELLOW}⚠ Rebuild recommended:{Colors.ENDC} {rebuild_reason}")
    else:
        print(f"  {Colors.GREEN}✓{Colors.ENDC} {rebuild_reason}")

    # === Connected Devices ===
    print(f"\n{Colors.BOLD}CONNECTED DEVICES{Colors.ENDC}")
    print("─" * 50)

    devices = get_connected_devices()
    authorized_devices = [(d, s, m) for d, s, m in devices if s == 'device']

    if not devices:
        print(f"  {Colors.RED}○{Colors.ENDC} No devices connected")
        print(f"  {Colors.DIM}Connect via USB with debugging enabled{Colors.ENDC}")
    else:
        for device_id, status, model in devices:
            if status == 'device':
                print(f"  {Colors.GREEN}●{Colors.ENDC} {model}")
                print(f"    {Colors.DIM}{device_id}{Colors.ENDC}")
            elif status == 'unauthorized':
                print(f"  {Colors.YELLOW}●{Colors.ENDC} {model} {Colors.YELLOW}(unauthorized){Colors.ENDC}")
                print(f"    {Colors.DIM}Check phone to authorize{Colors.ENDC}")
            else:
                print(f"  {Colors.RED}●{Colors.ENDC} {model} ({status})")

    # === Metro Status ===
    print(f"\n{Colors.BOLD}METRO BUNDLER{Colors.ENDC}")
    print("─" * 50)

    metro_running = is_metro_running()
    if metro_running:
        print(f"  {Colors.GREEN}●{Colors.ENDC} Running on port 8081")
    else:
        print(f"  {Colors.RED}○{Colors.ENDC} Not running")

    # === Menu Options ===
    print(f"\n{Colors.BOLD}OPTIONS{Colors.ENDC}")
    print("─" * 50)

    has_build = build_info['debug']['exists']
    has_device = len(authorized_devices) > 0

    if has_device and has_build and not rebuild_needed:
        print(f"  {Colors.GREEN}1.{Colors.ENDC} Deploy to device {Colors.DIM}(quick install){Colors.ENDC}")
    elif has_device and has_build:
        print(f"  {Colors.GREEN}1.{Colors.ENDC} Rebuild & Deploy {Colors.YELLOW}(changes detected){Colors.ENDC}")
    elif has_device:
        print(f"  {Colors.GREEN}1.{Colors.ENDC} Build & Deploy {Colors.DIM}(first build){Colors.ENDC}")
    else:
        print(f"  {Colors.DIM}1. Deploy to device (no device connected){Colors.ENDC}")

    print(f"  {Colors.GREEN}2.{Colors.ENDC} Full rebuild & deploy")
    print(f"  {Colors.GREEN}3.{Colors.ENDC} View device logs")
    print()

    # Metro controls
    if metro_running:
        print(f"  {Colors.CYAN}m.{Colors.ENDC} Stop Metro")
        print(f"  {Colors.CYAN}l.{Colors.ENDC} Reload app on device")
    else:
        print(f"  {Colors.CYAN}m.{Colors.ENDC} Start Metro")

    print()
    print(f"  {Colors.CYAN}s.{Colors.ENDC} Setup wizard")
    print(f"  {Colors.CYAN}a.{Colors.ENDC} Configure API URL")
    print(f"  {Colors.CYAN}c.{Colors.ENDC} Clean build")
    print(f"  {Colors.CYAN}f.{Colors.ENDC} Fix device auth")
    print(f"  {Colors.YELLOW}q.{Colors.ENDC} Quit")
    print()

    return has_build, has_device, rebuild_needed, authorized_devices


# =============================================================================
# Deployment Functions
# =============================================================================

def is_metro_running() -> bool:
    """Check if Metro bundler is running on port 8081."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', 8081))
        return result == 0
    except Exception:
        return False
    finally:
        sock.close()


def stop_metro() -> bool:
    """Stop any running Metro bundler processes."""
    killed = False

    # Kill by process name
    try:
        result = subprocess.run(
            ['pkill', '-f', 'react-native start'],
            capture_output=True, check=False
        )
        if result.returncode == 0:
            killed = True
    except Exception:
        pass

    # Kill by port
    try:
        result = subprocess.run(
            ['lsof', '-ti:8081'],
            capture_output=True, text=True, check=False
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    subprocess.run(['kill', '-9', pid], check=False, capture_output=True)
                    killed = True
                except Exception:
                    pass
    except Exception:
        pass

    return killed


def start_metro_background() -> Optional[subprocess.Popen]:
    """Start Metro bundler in background."""
    # Check if already running
    if is_metro_running():
        print_success("Metro bundler already running")
        return None

    print_info("Starting Metro bundler in background...")

    # Start Metro in a new process
    process = subprocess.Popen(
        ['npx', 'react-native', 'start'],
        cwd=NATIVE_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True
    )

    # Wait for Metro to start
    for i in range(15):  # Wait up to 15 seconds
        time.sleep(1)
        if is_metro_running():
            print_success("Metro bundler started!")
            return process
        print(f"  Waiting for Metro... ({i+1}s)")

    print_warning("Metro may still be starting...")
    return process


def setup_port_forwarding(device_id: str) -> bool:
    """Set up ADB reverse port forwarding."""
    adb = get_adb_path()
    if not adb:
        return False

    print_info("Setting up port forwarding...")
    result = subprocess.run(
        [adb, '-s', device_id, 'reverse', 'tcp:8081', 'tcp:8081'],
        capture_output=True, check=False
    )

    if result.returncode == 0:
        print_success("Port forwarding configured (8081)")
        return True
    else:
        print_warning("Port forwarding may have failed")
        return False


def reload_app_on_device():
    """Send reload command to connected device."""
    adb = get_adb_path()
    if not adb:
        print_error("ADB not found")
        return False

    devices = get_connected_devices()
    authorized = [(d, s, m) for d, s, m in devices if s == 'device']

    if not authorized:
        print_error("No device connected")
        return False

    device_id = authorized[0][0]

    # Send 'r' key to reload (React Native dev menu shortcut)
    # First try double-tap R
    subprocess.run([
        adb, '-s', device_id, 'shell',
        'input', 'text', 'rr'
    ], capture_output=True, check=False)

    print_success("Reload command sent to device")
    return True


def smart_deploy(has_build: bool, rebuild_needed: bool, devices: list):
    """Smart deploy based on current status."""
    if not devices:
        print_error("No authorized device connected.")
        return False

    # Select device if multiple
    if len(devices) == 1:
        device_id, _, model = devices[0]
    else:
        print(f"\n{Colors.BOLD}Select device:{Colors.ENDC}")
        for i, (d_id, _, model) in enumerate(devices, 1):
            print(f"  {i}. {model}")

        while True:
            try:
                choice = input(f"\nChoice (1-{len(devices)}): ").strip()
                idx = int(choice) - 1
                if 0 <= idx < len(devices):
                    device_id, _, model = devices[idx]
                    break
            except ValueError:
                pass
            print_error("Invalid choice")

    adb = get_adb_path()

    # Ensure Metro is running (silently)
    if not is_metro_running():
        print_info("Starting Metro bundler...")
        start_metro_background()

    # Setup port forwarding (silently)
    subprocess.run(
        [adb, '-s', device_id, 'reverse', 'tcp:8081', 'tcp:8081'],
        capture_output=True, check=False
    )

    # Build/Install
    if not has_build or rebuild_needed:
        print_info(f"Building and deploying to {model}...")
        cmd = ['npx', 'react-native', 'run-android', '--deviceId', device_id]
        return_code = run_command_live(cmd, cwd=NATIVE_DIR, use_build_env=True)
    else:
        print_info(f"Installing to {model}...")

        # Install APK
        result = subprocess.run([adb, '-s', device_id, 'install', '-r', str(DEBUG_APK)],
                               capture_output=True, text=True, check=False)

        if result.returncode == 0:
            # Launch the app
            subprocess.run([
                adb, '-s', device_id, 'shell',
                'am', 'start', '-n',
                'com.teborawmobile/.MainActivity'
            ], capture_output=True, check=False)
            return_code = 0
        else:
            print_error(f"Install failed: {result.stderr}")
            return_code = 1

    if return_code == 0:
        print_success("Deployed successfully!")
        return True
    else:
        print_error("Deployment failed")
        return False


def full_rebuild_deploy(devices: list):
    """Full clean rebuild and deploy."""
    if not devices:
        print_error("No authorized device connected.")
        return False

    # Select device
    if len(devices) == 1:
        device_id, _, model = devices[0]
    else:
        print(f"\n{Colors.BOLD}Select device:{Colors.ENDC}")
        for i, (_, _, model) in enumerate(devices, 1):
            print(f"  {i}. {model}")
        while True:
            try:
                choice = input(f"\nChoice: ").strip()
                idx = int(choice) - 1
                if 0 <= idx < len(devices):
                    device_id, _, model = devices[idx]
                    break
            except ValueError:
                pass

    adb = get_adb_path()

    # Ensure Metro is running (silently)
    if not is_metro_running():
        print_info("Starting Metro bundler...")
        start_metro_background()

    # Setup port forwarding (silently)
    if adb:
        subprocess.run(
            [adb, '-s', device_id, 'reverse', 'tcp:8081', 'tcp:8081'],
            capture_output=True, check=False
        )

    print_info(f"Full rebuild and deploy to {model}...")

    # Clean first
    gradlew = ANDROID_DIR / ("gradlew.bat" if sys.platform == "win32" else "gradlew")
    if gradlew.exists():
        if sys.platform != "win32":
            os.chmod(gradlew, 0o755)
        print_info("Cleaning build...")
        subprocess.run([str(gradlew), 'clean'], cwd=ANDROID_DIR,
                      capture_output=True, env=get_build_env(), check=False)

    # Build and deploy
    cmd = ['npx', 'react-native', 'run-android', '--deviceId', device_id]
    return_code = run_command_live(cmd, cwd=NATIVE_DIR, use_build_env=True)

    if return_code == 0:
        print_success("Full rebuild complete!")
        return True
    else:
        print_error("Build failed")
        return False


def start_metro():
    """Start Metro bundler."""
    print(f"\n{Colors.BOLD}Starting Metro bundler...{Colors.ENDC}")
    print(f"{Colors.DIM}Press Ctrl+C to stop{Colors.ENDC}\n")

    try:
        run_command_live(['npx', 'react-native', 'start'], cwd=NATIVE_DIR)
    except KeyboardInterrupt:
        print("\nMetro stopped.")


def view_logs():
    """View device logs."""
    adb = get_adb_path()
    if not adb:
        print_error("ADB not found.")
        return

    devices = get_connected_devices()
    authorized = [(d, s, m) for d, s, m in devices if s == 'device']

    if not authorized:
        print_error("No device connected.")
        return

    device_id = authorized[0][0]
    print(f"\n{Colors.BOLD}Device logs{Colors.ENDC} {Colors.DIM}(Ctrl+C to stop){Colors.ENDC}\n")

    try:
        subprocess.run([
            adb, '-s', device_id, 'logcat',
            '-v', 'time',
            'ReactNative:V', 'ReactNativeJS:V', '*:S'
        ])
    except KeyboardInterrupt:
        print("\nLog viewer stopped.")


def clean_build():
    """Clean the build."""
    print(f"\n{Colors.BOLD}Cleaning build...{Colors.ENDC}\n")

    gradlew = ANDROID_DIR / ("gradlew.bat" if sys.platform == "win32" else "gradlew")

    if not gradlew.exists():
        print_error("Android project not initialized.")
        return

    if sys.platform != "win32":
        os.chmod(gradlew, 0o755)

    return_code = run_command_live([str(gradlew), 'clean'], cwd=ANDROID_DIR, use_build_env=True)

    if return_code == 0:
        print_success("Build cleaned!")
    else:
        print_error("Clean failed")


def fix_device_authorization():
    """Fix ADB device authorization issues."""
    print(f"\n{Colors.BOLD}Fixing Device Authorization{Colors.ENDC}\n")

    adb = get_adb_path()
    if not adb:
        print_error("ADB not found.")
        return

    # Step 1: Restart ADB server
    print_info("Step 1: Restarting ADB server...")
    subprocess.run([adb, 'kill-server'], capture_output=True)
    time.sleep(1)
    subprocess.run([adb, 'start-server'], capture_output=True)
    print_success("ADB server restarted")

    # Step 2: Instructions for the phone
    print(f"""
{Colors.BOLD}Step 2: On your Android phone:{Colors.ENDC}

  1. {Colors.CYAN}Unlock your phone screen{Colors.ENDC}
     (The authorization prompt only appears when unlocked)

  2. {Colors.CYAN}Go to Settings → Developer Options{Colors.ENDC}

  3. {Colors.CYAN}Tap "Revoke USB debugging authorizations"{Colors.ENDC}
     (This clears old computer authorizations)

  4. {Colors.CYAN}Disconnect and reconnect the USB cable{Colors.ENDC}

  5. {Colors.CYAN}A popup should appear - tap "Allow"{Colors.ENDC}
     (Check "Always allow from this computer" for convenience)

{Colors.BOLD}If no popup appears:{Colors.ENDC}
  - Try a different USB cable (some are charge-only)
  - Try a different USB port
  - Set USB mode to "File Transfer" (MTP) not "Charging only"
  - Toggle USB debugging off and on in Developer Options
""")

    input(f"{Colors.CYAN}Press Enter after completing these steps...{Colors.ENDC}")

    # Check if it worked
    print_info("Checking device status...")
    devices = get_connected_devices()

    if not devices:
        print_error("No device detected. Check USB connection.")
    else:
        for device_id, status, model in devices:
            if status == 'device':
                print_success(f"Device authorized: {model}")
            elif status == 'unauthorized':
                print_warning(f"Still unauthorized: {model}")
                print_info("Try the steps above again, or try a different cable.")
            else:
                print_warning(f"Device status: {status}")


# =============================================================================
# Setup Wizard Functions (from original script)
# =============================================================================

def setup_wizard():
    """Run the full setup wizard."""
    clear_screen()
    print_header("Setup Wizard")

    print("This wizard will help you:")
    print("  - Check prerequisites (Node.js, Xcode, Android Studio)")
    print("  - Configure JAVA_HOME and ANDROID_HOME")
    print("  - Install dependencies")
    print("  - Initialize native iOS/Android projects")
    print()

    if not ask_yes_no("Ready to begin?"):
        return

    # Check prerequisites
    checks = check_prerequisites()

    # Configure ANDROID_HOME if needed
    if checks.get("android_sdk") and not checks.get("android_home_configured"):
        if ask_yes_no("\nConfigure ANDROID_HOME environment variable?"):
            setup_android_home()

    # Configure JAVA_HOME if needed
    if checks.get("java") and not checks.get("java_home_configured"):
        if ask_yes_no("\nConfigure JAVA_HOME environment variable?"):
            configure_java_home()

    # Install dependencies
    if ask_yes_no("\nInstall npm dependencies?"):
        install_dependencies(checks.get("package_manager", "npm"))

    # Native project setup
    if ask_yes_no("\nInitialize native iOS/Android project?"):
        setup_native_project()

    # Platform-specific setup
    is_mac = platform.system() == "Darwin"

    if checks.get("android_sdk"):
        if ask_yes_no("\nConfigure Android (fix Gradle, etc.)?"):
            setup_android()

    if is_mac and checks.get("xcode"):
        if ask_yes_no("\nConfigure iOS (install pods)?"):
            setup_ios()

    # API URL Configuration
    if NATIVE_DIR.exists():
        if ask_yes_no("\nConfigure API URL (production vs local)?"):
            configure_api_url()

    print_success("\nSetup wizard complete!")
    input(f"\n{Colors.CYAN}Press Enter to return to main menu...{Colors.ENDC}")


def check_prerequisites() -> dict:
    """Check all prerequisites and return status dict."""
    print_info("Checking prerequisites...\n")

    checks = {}
    is_mac = platform.system() == "Darwin"

    # Node.js
    if check_command_exists("node"):
        version = get_command_version("node", "-v")
        if version:
            major_version = int(version.replace("v", "").split(".")[0])
            if major_version >= 18:
                print_success(f"Node.js {version}")
                checks["node"] = True
            else:
                print_error(f"Node.js {version} (need >= 18)")
                checks["node"] = False
    else:
        print_error("Node.js not found")
        checks["node"] = False

    # Package manager
    if check_command_exists("pnpm"):
        print_success("pnpm installed")
        checks["package_manager"] = "pnpm"
    elif check_command_exists("npm"):
        print_warning("npm installed (pnpm recommended)")
        checks["package_manager"] = "npm"
    else:
        print_error("No package manager found")
        checks["package_manager"] = None

    # Android SDK
    android_home = get_android_home()
    if android_home:
        print_success(f"Android SDK: {android_home}")
        checks["android_sdk"] = True
        checks["android_home_configured"] = bool(os.environ.get("ANDROID_HOME"))
        if not checks["android_home_configured"]:
            print_warning("  ANDROID_HOME not set in environment")
    else:
        print_warning("Android SDK not found")
        checks["android_sdk"] = False
        checks["android_home_configured"] = False

    # Java
    if check_command_exists("java"):
        print_success("Java installed")
        checks["java"] = True
        checks["java_home_configured"] = bool(os.environ.get("JAVA_HOME"))
        if not checks["java_home_configured"]:
            print_warning("  JAVA_HOME not set")
    else:
        print_error("Java not found")
        checks["java"] = False
        checks["java_home_configured"] = False

    # iOS (Mac only)
    if is_mac:
        if check_command_exists("xcodebuild"):
            print_success("Xcode installed")
            checks["xcode"] = True
        else:
            print_warning("Xcode not found")
            checks["xcode"] = False

        if check_command_exists("pod"):
            print_success("CocoaPods installed")
            checks["cocoapods"] = True
        else:
            print_warning("CocoaPods not found")
            checks["cocoapods"] = False

    return checks


def setup_android_home():
    """Set up ANDROID_HOME environment variable."""
    android_home = get_android_home()
    if not android_home:
        print_error("Android SDK not found")
        return False

    shell = os.environ.get("SHELL", "/bin/zsh")
    if "zsh" in shell:
        profile_file = Path.home() / ".zshrc"
    elif "bash" in shell:
        profile_file = Path.home() / ".bash_profile"
    else:
        profile_file = Path.home() / ".profile"

    export_lines = f'''
# Android SDK (added by Teboraw mobile setup)
export ANDROID_HOME="{android_home}"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
'''

    try:
        with open(profile_file, "a") as f:
            f.write(export_lines)
        print_success(f"Added ANDROID_HOME to {profile_file}")
        print_info(f"Run 'source {profile_file}' to apply")
        os.environ["ANDROID_HOME"] = android_home
        return True
    except Exception as e:
        print_error(f"Failed to update {profile_file}: {e}")
        return False


def configure_java_home():
    """Configure JAVA_HOME environment variable."""
    is_mac = platform.system() == "Darwin"

    if is_mac:
        try:
            result = run_command("/usr/libexec/java_home -v 17", capture=True, check=False)
            if result.returncode == 0 and result.stdout.strip():
                java_home = result.stdout.strip()
            else:
                android_studio_jdk = "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
                if os.path.exists(android_studio_jdk):
                    java_home = android_studio_jdk
                else:
                    print_warning("Could not auto-detect JAVA_HOME")
                    return False
        except Exception:
            print_warning("Could not auto-detect JAVA_HOME")
            return False

        shell = os.environ.get("SHELL", "/bin/zsh")
        if "zsh" in shell:
            profile_file = Path.home() / ".zshrc"
        else:
            profile_file = Path.home() / ".bash_profile"

        export_line = f'\n# Java JDK (added by Teboraw mobile setup)\nexport JAVA_HOME="{java_home}"\n'

        try:
            with open(profile_file, "a") as f:
                f.write(export_line)
            print_success(f"Added JAVA_HOME to {profile_file}")
            os.environ["JAVA_HOME"] = java_home
            return True
        except Exception as e:
            print_error(f"Failed: {e}")
            return False

    return False


def install_dependencies(package_manager: str):
    """Install npm dependencies."""
    print_info(f"Installing dependencies with {package_manager}...")

    os.chdir(NATIVE_DIR if NATIVE_DIR.exists() else MOBILE_DIR)

    try:
        run_command(f"{package_manager} install")
        print_success("Dependencies installed!")
        return True
    except subprocess.CalledProcessError:
        print_error("Failed to install dependencies")
        return False


def setup_native_project():
    """Set up the native iOS/Android projects."""
    if NATIVE_DIR.exists() and (NATIVE_DIR / "ios").exists() and (NATIVE_DIR / "android").exists():
        print_success("Native project already exists")
        if not ask_yes_no("Reinitialize? (This will delete existing)", default=False):
            return True
        shutil.rmtree(NATIVE_DIR)

    print_info("Initializing React Native project...")
    os.chdir(MOBILE_DIR)

    try:
        run_command(
            "npx -y @react-native-community/cli@latest init TeborawMobile",
            timeout=600
        )
        print_success("Native project initialized!")
        return True
    except Exception as e:
        print_error(f"Failed: {e}")
        return False


def setup_android():
    """Set up Android-specific configuration."""
    if not ANDROID_DIR.exists():
        print_warning("Android folder not found")
        return False

    # Fix Gradle version
    gradle_props = ANDROID_DIR / "gradle" / "wrapper" / "gradle-wrapper.properties"
    if gradle_props.exists():
        try:
            content = gradle_props.read_text()
            import re
            new_content = re.sub(
                r'distributionUrl=.*gradle-[\d.]+-.*\.zip',
                r'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.13-bin.zip',
                content
            )
            gradle_props.write_text(new_content)
            print_success("Updated Gradle to 8.13")
        except Exception as e:
            print_warning(f"Could not update Gradle: {e}")

    # Clean caches
    for cache_dir in [ANDROID_DIR / ".gradle", ANDROID_DIR / "build", ANDROID_DIR / "app" / "build"]:
        if cache_dir.exists():
            try:
                shutil.rmtree(cache_dir)
            except Exception:
                pass

    print_success("Android configured")
    return True


def setup_ios():
    """Set up iOS-specific configuration."""
    if platform.system() != "Darwin":
        print_warning("iOS requires macOS")
        return True

    ios_dir = NATIVE_DIR / "ios"
    if not ios_dir.exists():
        print_warning("iOS folder not found")
        return False

    print_info("Installing CocoaPods dependencies...")
    os.chdir(ios_dir)

    try:
        run_command("pod install")
        print_success("CocoaPods installed!")
    except subprocess.CalledProcessError:
        print_error("Failed to install pods")

    return True


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    """Main entry point with dashboard."""
    while True:
        result = display_dashboard()

        if result[0] is None:
            # Native project doesn't exist - limited menu
            choice = input(f"{Colors.BOLD}Choice: {Colors.ENDC}").strip().lower()

            if choice == 's':
                setup_wizard()
            elif choice == 'q':
                print(f"\n{Colors.CYAN}Goodbye!{Colors.ENDC}\n")
                break
            continue

        has_build, has_device, rebuild_needed, devices = result

        choice = input(f"{Colors.BOLD}Choice: {Colors.ENDC}").strip().lower()

        if choice == '1':
            if has_device:
                smart_deploy(has_build, rebuild_needed, devices)
                time.sleep(2)  # Brief pause to show result
            else:
                print_warning("Connect a device first.")
                time.sleep(1)

        elif choice == '2':
            if has_device:
                full_rebuild_deploy(devices)
                time.sleep(2)
            else:
                print_warning("Connect a device first.")
                time.sleep(1)

        elif choice == '3':
            view_logs()

        elif choice == 'm':
            if is_metro_running():
                print_info("Stopping Metro bundler...")
                if stop_metro():
                    print_success("Metro bundler stopped")
                else:
                    print_warning("Could not stop Metro - may need manual kill")
                time.sleep(1)
            else:
                start_metro_background()
                time.sleep(1)

        elif choice == 'l':
            if is_metro_running():
                reload_app_on_device()
                time.sleep(1)
            else:
                print_warning("Metro not running - start it first")
                time.sleep(1)

        elif choice == 's':
            setup_wizard()

        elif choice == 'a':
            configure_api_url()
            time.sleep(1)

        elif choice == 'c':
            clean_build()
            time.sleep(2)

        elif choice == 'f':
            fix_device_authorization()

        elif choice == 'q':
            # Stop Metro if running before quitting
            if is_metro_running():
                if ask_yes_no("Metro bundler is running. Stop it before quitting?"):
                    stop_metro()
                    print_success("Metro stopped")
            print(f"\n{Colors.CYAN}Goodbye!{Colors.ENDC}\n")
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.CYAN}Goodbye!{Colors.ENDC}\n")
        sys.exit(0)
