#!/usr/bin/env python3
"""
Teboraw Mobile App Setup Wizard
Interactive CLI walkthrough for setting up the React Native mobile app.
"""

import subprocess
import sys
import os
import shutil
import platform
from pathlib import Path

# Get the project root and mobile directory
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
MOBILE_DIR = PROJECT_ROOT / "apps" / "mobile"

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

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}  {text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_step(step: int, text: str):
    print(f"{Colors.CYAN}{Colors.BOLD}[Step {step}]{Colors.ENDC} {text}")

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

def ask_choice(question: str, choices: list[str]) -> int:
    print(f"\n{question}")
    for i, choice in enumerate(choices, 1):
        print(f"  {Colors.CYAN}{i}{Colors.ENDC}) {choice}")
    while True:
        try:
            response = int(input(f"Enter choice (1-{len(choices)}): "))
            if 1 <= response <= len(choices):
                return response - 1
            print(f"Please enter a number between 1 and {len(choices)}")
        except ValueError:
            print("Please enter a valid number")

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

def check_command_exists(cmd: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(cmd) is not None

def get_command_version(cmd: str, version_flag: str = "--version") -> str | None:
    """Get the version of a command."""
    try:
        result = run_command(f"{cmd} {version_flag}", capture=True, check=False)
        return result.stdout.strip() or result.stderr.strip()
    except Exception:
        return None

def detect_android_sdk() -> str | None:
    """Detect Android SDK location."""
    # Check environment variables first
    android_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    if android_home and os.path.exists(android_home):
        return android_home

    # Check common locations
    home = Path.home()
    common_paths = [
        home / "Library" / "Android" / "sdk",  # macOS default
        home / "Android" / "Sdk",               # Linux default
        Path("/usr/local/android-sdk"),         # Alternative Linux
        home / "AppData" / "Local" / "Android" / "Sdk",  # Windows
    ]

    for path in common_paths:
        if path.exists():
            return str(path)

    return None

def setup_android_home() -> bool:
    """Set up ANDROID_HOME environment variable."""
    print_header("Android SDK Configuration")

    android_home = detect_android_sdk()

    if android_home:
        print_success(f"Found Android SDK at: {android_home}")

        # Check if already in environment
        if os.environ.get("ANDROID_HOME") == android_home:
            print_success("ANDROID_HOME is already set correctly")
            return True

        print_warning("ANDROID_HOME is not set in your shell environment")

        if ask_yes_no("Would you like to add ANDROID_HOME to your shell profile?"):
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
                print_info(f"Run 'source {profile_file}' or restart your terminal to apply changes")

                # Set for current session
                os.environ["ANDROID_HOME"] = android_home
                return True
            except Exception as e:
                print_error(f"Failed to update {profile_file}: {e}")
                print_info("You can manually add these lines to your shell profile:")
                print(export_lines)
                return False
        else:
            print_info("Skipping ANDROID_HOME setup")
            print_info("You can manually add this to your shell profile:")
            print(f'  export ANDROID_HOME="{android_home}"')
            return False
    else:
        print_error("Android SDK not found")
        print_info("Please install Android Studio from https://developer.android.com/studio")
        print_info("After installation, the SDK is typically located at:")
        if platform.system() == "Darwin":
            print_info("  ~/Library/Android/sdk")
        else:
            print_info("  ~/Android/Sdk")
        return False

def setup_java() -> bool:
    """Install and configure Java JDK."""
    print_header("Java JDK Setup")

    # Check if Java is already installed
    if check_command_exists("java"):
        version = get_command_version("java", "-version")
        if version:
            print_success(f"Java is already installed")
            # Check JAVA_HOME
            java_home = os.environ.get("JAVA_HOME")
            if java_home:
                print_success(f"JAVA_HOME: {java_home}")
            else:
                print_warning("JAVA_HOME not set")
                if ask_yes_no("Would you like to configure JAVA_HOME?"):
                    configure_java_home()
            return True

    print_error("Java JDK not found")
    print_info("Java 17 is required for React Native Android development\n")

    is_mac = platform.system() == "Darwin"

    if is_mac:
        # Check if Homebrew is available
        if check_command_exists("brew"):
            print_info("Homebrew detected. You can install Java via:")
            print(f"  {Colors.CYAN}brew install --cask zulu@17{Colors.ENDC}")
            print()

            if ask_yes_no("Would you like to install Zulu JDK 17 via Homebrew?"):
                print_info("Installing Zulu JDK 17...")
                try:
                    run_command("brew install --cask zulu@17")
                    print_success("Java JDK 17 installed successfully!")

                    # Configure JAVA_HOME
                    configure_java_home()
                    return True
                except subprocess.CalledProcessError:
                    print_error("Failed to install Java")
                    print_info("Try installing manually: brew install --cask zulu@17")
                    return False
        else:
            print_info("Install options:")
            print("  1. Install Homebrew first: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"")
            print("  2. Then run: brew install --cask zulu@17")
            print("  3. Or download from: https://www.azul.com/downloads/?version=java-17-lts")
    else:
        print_info("Install options:")
        print("  - Ubuntu/Debian: sudo apt install openjdk-17-jdk")
        print("  - Fedora: sudo dnf install java-17-openjdk-devel")
        print("  - Or download from: https://www.azul.com/downloads/?version=java-17-lts")

    print_info("\nAfter installing Java, run this setup again.")
    return False

def configure_java_home() -> bool:
    """Configure JAVA_HOME environment variable."""
    is_mac = platform.system() == "Darwin"

    if is_mac:
        # Try to find Java home using java_home utility
        try:
            result = run_command("/usr/libexec/java_home -v 17", capture=True, check=False)
            if result.returncode == 0 and result.stdout.strip():
                java_home = result.stdout.strip()
            else:
                # Fallback to Android Studio JDK
                android_studio_jdk = "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
                if os.path.exists(android_studio_jdk):
                    java_home = android_studio_jdk
                else:
                    print_warning("Could not auto-detect JAVA_HOME")
                    return False
        except Exception:
            print_warning("Could not auto-detect JAVA_HOME")
            return False

        print_success(f"Found Java at: {java_home}")

        if ask_yes_no("Add JAVA_HOME to your shell profile?"):
            shell = os.environ.get("SHELL", "/bin/zsh")
            if "zsh" in shell:
                profile_file = Path.home() / ".zshrc"
            elif "bash" in shell:
                profile_file = Path.home() / ".bash_profile"
            else:
                profile_file = Path.home() / ".profile"

            export_line = f'\n# Java JDK (added by Teboraw mobile setup)\nexport JAVA_HOME="{java_home}"\n'

            try:
                with open(profile_file, "a") as f:
                    f.write(export_line)
                print_success(f"Added JAVA_HOME to {profile_file}")
                print_info(f"Run 'source {profile_file}' or restart your terminal to apply changes")

                # Set for current session
                os.environ["JAVA_HOME"] = java_home
                return True
            except Exception as e:
                print_error(f"Failed to update {profile_file}: {e}")
                print_info(f"Manually add: export JAVA_HOME=\"{java_home}\"")
                return False

    return False

def list_android_emulators() -> list[str]:
    """List available Android emulators."""
    android_home = os.environ.get("ANDROID_HOME") or detect_android_sdk()
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

def start_android_emulator(avd_name: str) -> bool:
    """Start an Android emulator."""
    android_home = os.environ.get("ANDROID_HOME") or detect_android_sdk()
    if not android_home:
        print_error("ANDROID_HOME not set")
        return False

    emulator_path = os.path.join(android_home, "emulator", "emulator")

    print_info(f"Starting emulator: {avd_name}")
    print_info("This will run in the background...")

    try:
        # Start emulator in background
        subprocess.Popen(
            [emulator_path, "-avd", avd_name],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        print_success(f"Emulator '{avd_name}' is starting...")
        print_info("It may take a minute for the emulator to fully boot")
        return True
    except Exception as e:
        print_error(f"Failed to start emulator: {e}")
        return False

def check_prerequisites() -> dict[str, any]:
    """Check all prerequisites and return status dict."""
    print_header("Checking Prerequisites")

    checks = {}
    is_mac = platform.system() == "Darwin"

    # Node.js
    print_info("Checking Node.js...")
    if check_command_exists("node"):
        version = get_command_version("node", "-v")
        if version:
            major_version = int(version.replace("v", "").split(".")[0])
            if major_version >= 18:
                print_success(f"Node.js {version} (>= 18 required)")
                checks["node"] = True
            else:
                print_error(f"Node.js {version} found, but >= 18 required")
                checks["node"] = False
        else:
            checks["node"] = False
    else:
        print_error("Node.js not found")
        checks["node"] = False

    # Package manager (pnpm preferred, npm fallback)
    print_info("Checking package manager...")
    if check_command_exists("pnpm"):
        version = get_command_version("pnpm", "-v")
        print_success(f"pnpm {version}")
        checks["package_manager"] = "pnpm"
    elif check_command_exists("npm"):
        version = get_command_version("npm", "-v")
        print_warning(f"npm {version} (pnpm recommended)")
        checks["package_manager"] = "npm"
    else:
        print_error("No package manager found (pnpm or npm)")
        checks["package_manager"] = None

    # React Native CLI
    print_info("Checking React Native CLI...")
    if check_command_exists("npx"):
        print_success("npx available (will use @react-native-community/cli)")
        checks["react_native_cli"] = True
    else:
        print_error("npx not found")
        checks["react_native_cli"] = False

    # iOS checks (Mac only)
    if is_mac:
        print_info("Checking iOS development tools...")

        # Xcode
        if check_command_exists("xcodebuild"):
            result = run_command("xcodebuild -version", capture=True, check=False)
            if result.returncode == 0:
                version_line = result.stdout.split("\n")[0]
                print_success(f"{version_line}")
                checks["xcode"] = True
            else:
                print_error("Xcode not properly configured")
                checks["xcode"] = False
        else:
            print_error("Xcode not found")
            checks["xcode"] = False

        # CocoaPods
        if check_command_exists("pod"):
            version = get_command_version("pod")
            print_success(f"CocoaPods {version.split()[0] if version else 'installed'}")
            checks["cocoapods"] = True
        else:
            print_warning("CocoaPods not found (required for iOS)")
            checks["cocoapods"] = False
    else:
        checks["xcode"] = None
        checks["cocoapods"] = None

    # Android checks
    print_info("Checking Android development tools...")
    android_home = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or detect_android_sdk()
    if android_home and os.path.exists(android_home):
        print_success(f"Android SDK found: {android_home}")
        checks["android_sdk"] = True
        checks["android_home"] = android_home

        # Check if ANDROID_HOME env var is set
        if not os.environ.get("ANDROID_HOME"):
            print_warning("ANDROID_HOME environment variable not set (SDK found but not configured)")
            checks["android_home_configured"] = False
        else:
            checks["android_home_configured"] = True
    else:
        print_warning("Android SDK not found")
        checks["android_sdk"] = False
        checks["android_home_configured"] = False

    # Java
    print_info("Checking Java JDK...")
    if check_command_exists("java"):
        result = run_command("java -version", capture=True, check=False)
        version_output = result.stderr or result.stdout  # Java outputs version to stderr
        if version_output:
            # Extract version number
            version_line = version_output.split('\n')[0]
            print_success(f"Java found: {version_line}")
            checks["java"] = True

            # Check JAVA_HOME
            java_home = os.environ.get("JAVA_HOME")
            if java_home:
                checks["java_home_configured"] = True
            else:
                print_warning("JAVA_HOME not set")
                checks["java_home_configured"] = False
        else:
            checks["java"] = False
            checks["java_home_configured"] = False
    else:
        print_error("Java not found (required for Android)")
        checks["java"] = False
        checks["java_home_configured"] = False

    return checks

def install_dependencies(package_manager: str):
    """Install npm dependencies."""
    print_header("Installing Dependencies")

    os.chdir(MOBILE_DIR)

    print_info(f"Installing dependencies with {package_manager}...")
    print_info("This may take a few minutes...\n")

    try:
        run_command(f"{package_manager} install")
        print_success("Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError:
        print_error("Failed to install dependencies")
        return False

def setup_native_project():
    """Set up the native iOS/Android projects."""
    print_header("Native Project Setup")

    native_dir = MOBILE_DIR / "TeborawMobile"

    # Check if native project already exists with ios/android folders
    if native_dir.exists() and (native_dir / "ios").exists() and (native_dir / "android").exists():
        print_success("Native project already exists at TeborawMobile/")
        if ask_yes_no("Reinitialize? (This will delete the existing project)", default=False):
            print_info("Removing existing native project...")
            shutil.rmtree(native_dir)
        else:
            return True

    print_info("The native project needs to be initialized.")
    print_info("This will create ios/ and android/ folders with native code.\n")

    choice = ask_choice(
        "How would you like to set up the native project?",
        [
            "Initialize new project (recommended)",
            "Skip - I'll set it up manually later",
        ]
    )

    if choice == 0:
        # Clean up if directory exists but is incomplete
        if native_dir.exists():
            print_info("Cleaning up incomplete native project...")
            shutil.rmtree(native_dir)

        print_info("\nInitializing React Native project...")
        print_info("This may take a few minutes...\n")

        os.chdir(MOBILE_DIR)

        try:
            # Use the correct modern CLI command
            run_command(
                "npx -y @react-native-community/cli@latest init TeborawMobile",
                timeout=600  # 10 minute timeout
            )
            print_success("Native project initialized!")

            # Verify the project was created correctly
            if (native_dir / "android").exists() and (native_dir / "ios").exists():
                print_success("Both iOS and Android folders created successfully!")
            else:
                print_warning("Project created but some folders may be missing")

            print_info("\nNext steps:")
            print_info("  1. Copy your src/ folder contents into TeborawMobile/")
            print_info("  2. Update TeborawMobile/package.json with your dependencies")
            print_info("  3. Install dependencies in TeborawMobile/")
            return True

        except subprocess.TimeoutExpired:
            print_error("Project initialization timed out")
            print_info("Try running manually: npx @react-native-community/cli@latest init TeborawMobile")
            return False
        except subprocess.CalledProcessError as e:
            print_error("Failed to initialize native project")
            print_info("Try running manually: npx @react-native-community/cli@latest init TeborawMobile")
            return False
    else:
        print_info("Skipping native project setup.")
        print_info("To initialize manually, run:")
        print_info("  cd apps/mobile && npx @react-native-community/cli@latest init TeborawMobile")
        return True

def setup_ios():
    """Set up iOS-specific configuration."""
    print_header("iOS Setup")

    if platform.system() != "Darwin":
        print_warning("iOS development requires macOS. Skipping iOS setup.")
        return True

    ios_dir = MOBILE_DIR / "TeborawMobile" / "ios"

    if not ios_dir.exists():
        print_warning("iOS folder not found. Run native project setup first.")
        return False

    if ask_yes_no("Install CocoaPods dependencies?"):
        print_info("Installing CocoaPods dependencies...")
        os.chdir(ios_dir)

        try:
            run_command("bundle install", check=False)  # Install bundler deps if available
            run_command("pod install")
            print_success("CocoaPods dependencies installed!")
        except subprocess.CalledProcessError:
            print_error("Failed to install CocoaPods dependencies")
            print_info("Try running manually: cd ios && pod install")

    print_info("\n" + "="*50)
    print_info("IMPORTANT: Manual iOS Configuration Required")
    print_info("="*50)
    print("""
Add the following to your Info.plist:

1. Location Permission Descriptions:
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Teboraw needs location access to track your position</string>
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Teboraw needs background location to track while app is closed</string>
   <key>NSLocationAlwaysUsageDescription</key>
   <string>Teboraw needs background location to track while app is closed</string>

2. Background Modes:
   <key>UIBackgroundModes</key>
   <array>
     <string>location</string>
     <string>fetch</string>
     <string>processing</string>
   </array>

See NATIVE_SETUP.md for complete configuration details.
""")

    input("\nPress Enter when you've noted these requirements...")
    return True

def setup_android():
    """Set up Android-specific configuration."""
    print_header("Android Setup")

    android_dir = MOBILE_DIR / "TeborawMobile" / "android"

    if not android_dir.exists():
        print_warning("Android folder not found. Run native project setup first.")
        return False

    # Check ANDROID_HOME
    if not os.environ.get("ANDROID_HOME"):
        print_warning("ANDROID_HOME not set in current session")
        if ask_yes_no("Would you like to configure ANDROID_HOME now?"):
            setup_android_home()

    # List and optionally start emulator
    emulators = list_android_emulators()
    if emulators:
        print_success(f"Found {len(emulators)} Android emulator(s):")
        for emu in emulators:
            print(f"    - {emu}")

        if ask_yes_no("\nWould you like to start an emulator?"):
            if len(emulators) == 1:
                start_android_emulator(emulators[0])
            else:
                choice = ask_choice("Select an emulator to start:", emulators)
                start_android_emulator(emulators[choice])
    else:
        print_warning("No Android emulators found")
        print_info("Create one in Android Studio > Device Manager")

    print_info("\n" + "="*50)
    print_info("IMPORTANT: Manual Android Configuration Required")
    print_info("="*50)
    print("""
Add the following permissions to AndroidManifest.xml:

<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

Also add to build.gradle (app level):
  manifestPlaceholders = [appAuthRedirectScheme: 'teboraw']

See NATIVE_SETUP.md for complete configuration details.
""")

    input("\nPress Enter when you've noted these requirements...")
    return True

def configure_api():
    """Configure API connection settings."""
    print_header("API Configuration")

    print_info("The mobile app needs to connect to your Teboraw API server.")
    print_info("For local development, use your machine's local IP address.\n")

    print("Examples:")
    print("  - Local development: http://192.168.1.100:3000")
    print("  - Production: https://api.yourdomain.com")
    print("  - Note: 'localhost' won't work from a mobile device\n")

    api_url = input("Enter your API URL (or press Enter to skip): ").strip()

    if api_url:
        print_success(f"API URL: {api_url}")
        print_info("\nTo set this in the app, you can:")
        print("  1. Use AsyncStorage.setItem('apiUrl', '<your-url>') in the app")
        print("  2. Or modify src/services/TrackingService.ts directly")
    else:
        print_info("Skipping API configuration. You can set it up later.")

    return True

def run_app():
    """Run the mobile app."""
    print_header("Run Application")

    native_dir = MOBILE_DIR / "TeborawMobile"

    if not native_dir.exists() or not (native_dir / "android").exists():
        print_error("Native project not found. Run setup first.")
        return False

    is_mac = platform.system() == "Darwin"

    choices = ["Android"]
    if is_mac:
        choices.insert(0, "iOS")
    choices.append("Cancel")

    choice = ask_choice("Which platform would you like to run?", choices)

    if choices[choice] == "Cancel":
        return True

    os.chdir(native_dir)

    if choices[choice] == "iOS":
        print_info("Starting iOS app...")
        print_info("This will launch the iOS Simulator\n")
        try:
            run_command("npx react-native run-ios")
        except subprocess.CalledProcessError:
            print_error("Failed to run iOS app")
            print_info("Try running manually: cd TeborawMobile && npx react-native run-ios")

    elif choices[choice] == "Android":
        # Check for running emulator or device
        print_info("Checking for connected Android devices/emulators...")

        result = run_command("adb devices", capture=True, check=False)
        devices = [line for line in result.stdout.split("\n")[1:] if "device" in line and "offline" not in line]

        if not devices:
            print_warning("No Android device or emulator connected")
            emulators = list_android_emulators()
            if emulators:
                if ask_yes_no("Would you like to start an emulator first?"):
                    if len(emulators) == 1:
                        start_android_emulator(emulators[0])
                    else:
                        emu_choice = ask_choice("Select an emulator:", emulators)
                        start_android_emulator(emulators[emu_choice])
                    print_info("Waiting for emulator to boot (30 seconds)...")
                    import time
                    time.sleep(30)

        print_info("Starting Android app...\n")
        try:
            run_command("npx react-native run-android")
        except subprocess.CalledProcessError:
            print_error("Failed to run Android app")
            print_info("Try running manually: cd TeborawMobile && npx react-native run-android")

    return True

def print_summary(checks: dict[str, any]):
    """Print setup summary and next steps."""
    print_header("Setup Complete!")

    print(f"{Colors.BOLD}Prerequisites Status:{Colors.ENDC}")
    print(f"  Node.js:         {'✓' if checks.get('node') else '✗'}")
    print(f"  Package Manager: {'✓ ' + checks.get('package_manager', 'none') if checks.get('package_manager') else '✗'}")
    print(f"  React Native:    {'✓' if checks.get('react_native_cli') else '✗'}")
    if checks.get('xcode') is not None:
        print(f"  Xcode:           {'✓' if checks.get('xcode') else '✗'}")
        print(f"  CocoaPods:       {'✓' if checks.get('cocoapods') else '✗'}")
    print(f"  Android SDK:     {'✓' if checks.get('android_sdk') else '✗'}")
    print(f"  ANDROID_HOME:    {'✓' if checks.get('android_home_configured') else '✗ (run setup again to configure)'}")
    print(f"  Java JDK:        {'✓' if checks.get('java') else '✗ (run setup again to install)'}")
    print(f"  JAVA_HOME:       {'✓' if checks.get('java_home_configured') else '✗ (run setup again to configure)'}")

    print(f"\n{Colors.BOLD}Next Steps:{Colors.ENDC}")
    print("""
1. Complete native project configuration (see apps/mobile/NATIVE_SETUP.md)

2. Run the app:
   iOS:     cd apps/mobile/TeborawMobile && npx react-native run-ios
   Android: cd apps/mobile/TeborawMobile && npx react-native run-android

3. For development with hot reload:
   cd apps/mobile/TeborawMobile && npx react-native start

4. Grant location permissions when prompted in the app

5. Configure your API URL in the app settings
""")

    print(f"\n{Colors.BOLD}Useful Commands:{Colors.ENDC}")
    print("  npx react-native start       # Start Metro bundler")
    print("  npx react-native run-ios     # Run on iOS simulator")
    print("  npx react-native run-android # Run on Android emulator")
    print("  npx react-native log-ios     # View iOS logs")
    print("  npx react-native log-android # View Android logs")
    print("  adb devices                  # List connected Android devices")
    print("  emulator -list-avds          # List Android emulators")

def main():
    print(f"""
{Colors.BOLD}{Colors.HEADER}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          Teboraw Mobile App Setup Wizard                   ║
║                                                            ║
║   Interactive guide to set up your React Native app        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
{Colors.ENDC}
""")

    print("This wizard will help you:")
    print("  - Check prerequisites (Node.js, Xcode, Android Studio)")
    print("  - Install Java JDK 17 (required for Android)")
    print("  - Configure JAVA_HOME and ANDROID_HOME")
    print("  - Install dependencies")
    print("  - Initialize native iOS/Android projects")
    print("  - Start Android emulators")
    print("  - Run the app\n")

    if not ask_yes_no("Ready to begin?"):
        print("Setup cancelled.")
        return

    # Step 1: Check prerequisites
    checks = check_prerequisites()

    # Verify minimum requirements
    if not checks.get("node") or not checks.get("package_manager"):
        print_error("\nCritical prerequisites missing!")
        print_info("Please install Node.js 18+ and pnpm/npm before continuing.")
        if not ask_yes_no("Continue anyway?", default=False):
            return

    # Step 2: Install Java if missing
    if not checks.get("java"):
        print_step(2, "Java JDK Installation")
        if ask_yes_no("Java is required for Android development. Install now?"):
            if setup_java():
                checks["java"] = True
                checks["java_home_configured"] = True
    elif not checks.get("java_home_configured"):
        print_step(2, "Java Configuration")
        if ask_yes_no("Configure JAVA_HOME environment variable?"):
            configure_java_home()
            checks["java_home_configured"] = True

    # Step 3: Configure ANDROID_HOME if needed
    if checks.get("android_sdk") and not checks.get("android_home_configured"):
        print_step(3, "Android SDK Configuration")
        if ask_yes_no("Configure ANDROID_HOME environment variable?"):
            setup_android_home()
            checks["android_home_configured"] = True

    # Step 4: Install dependencies
    print_step(4, "Install Dependencies")
    if ask_yes_no("Install npm dependencies?"):
        install_dependencies(checks.get("package_manager", "npm"))

    # Step 5: Native project setup
    print_step(5, "Native Project Setup")
    if ask_yes_no("Initialize native iOS/Android project?"):
        setup_native_project()

    # Step 6+: Platform-specific setup
    is_mac = platform.system() == "Darwin"
    step = 6

    if is_mac:
        print_step(step, "iOS Configuration")
        if ask_yes_no("Configure iOS development?"):
            setup_ios()
        step += 1

    print_step(step, "Android Configuration")
    if ask_yes_no("Configure Android development?"):
        setup_android()
    step += 1

    # API configuration
    print_step(step, "API Configuration")
    if ask_yes_no("Configure API connection?"):
        configure_api()

    # Summary
    print_summary(checks)

    # Offer to run the app
    if ask_yes_no("Would you like to run the app now?", default=False):
        run_app()

    print(f"\n{Colors.GREEN}{Colors.BOLD}Setup wizard complete!{Colors.ENDC}\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Setup cancelled by user.{Colors.ENDC}")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Colors.RED}An error occurred: {e}{Colors.ENDC}")
        sys.exit(1)
