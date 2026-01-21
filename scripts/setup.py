#!/usr/bin/env python3
"""
Teboraw 2.0 - Cross-Platform Setup Script
==========================================
Works on Windows, macOS, and Linux

Usage:
    python setup.py              # Docker deployment (default)
    python setup.py --docker     # Docker deployment
    python setup.py --local      # Local development setup
"""

import os
import sys
import subprocess
import shutil
import time
import platform
import argparse
import urllib.request

# Colors for terminal output (cross-platform)
class Colors:
    """ANSI color codes that work on Windows 10+, macOS, and Linux"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

    @staticmethod
    def init():
        """Enable ANSI colors on Windows"""
        if platform.system() == 'Windows':
            os.system('')  # Enable ANSI escape sequences on Windows 10+


def print_header(message: str):
    print(f"\n{Colors.BLUE}{'=' * 60}{Colors.NC}")
    print(f"{Colors.BLUE}  {message}{Colors.NC}")
    print(f"{Colors.BLUE}{'=' * 60}{Colors.NC}\n")


def print_step(message: str):
    print(f"{Colors.GREEN}> {message}{Colors.NC}")


def print_warning(message: str):
    print(f"{Colors.YELLOW}! {message}{Colors.NC}")


def print_error(message: str):
    print(f"{Colors.RED}X {message}{Colors.NC}")


def print_success(message: str):
    print(f"{Colors.GREEN}+ {message}{Colors.NC}")


def get_npm_global_path() -> str:
    """Get the npm global bin directory"""
    try:
        result = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            # npm root -g returns node_modules path, we need the parent bin folder
            npm_root = result.stdout.strip()
            if platform.system() == 'Windows':
                # On Windows, global bins are in the same directory as node_modules
                return os.path.dirname(npm_root)
            else:
                # On Unix, global bins are in ../bin relative to node_modules
                return os.path.join(os.path.dirname(npm_root), 'bin')
    except:
        pass
    return None


def find_command(cmd: str) -> str:
    """Find a command, checking PATH and npm global directory"""
    # First check standard PATH
    path = shutil.which(cmd)
    if path:
        return path

    # On Windows, also check npm global directory
    if platform.system() == 'Windows':
        npm_path = get_npm_global_path()
        if npm_path:
            # Check for .cmd wrapper (Windows npm global installs)
            cmd_path = os.path.join(npm_path, f"{cmd}.cmd")
            if os.path.exists(cmd_path):
                return cmd_path
            # Check for .exe
            exe_path = os.path.join(npm_path, f"{cmd}.exe")
            if os.path.exists(exe_path):
                return exe_path
            # Check without extension
            bare_path = os.path.join(npm_path, cmd)
            if os.path.exists(bare_path):
                return bare_path

    return None


def check_command_exists(cmd: str) -> bool:
    """Check if a command exists in PATH or npm global"""
    return find_command(cmd) is not None


def run_command(cmd: list, cwd: str = None, capture: bool = False, shell: bool = None) -> subprocess.CompletedProcess:
    """Run a command and return the result.
    On Windows, shell=True is used by default to ensure commands are found in PATH.
    """
    try:
        # Default to shell=True on Windows for better PATH resolution
        if shell is None:
            shell = platform.system() == 'Windows'

        original_cmd = cmd[0] if isinstance(cmd, list) else cmd

        # Try to find the command's full path if it's a list
        if isinstance(cmd, list) and len(cmd) > 0:
            full_path = find_command(cmd[0])
            if full_path:
                cmd = [full_path] + cmd[1:]
            elif not shell:
                # If we can't find the command and not using shell, error out
                print_error(f"Command not found: {cmd[0]}")
                return None

        if shell and isinstance(cmd, list):
            # Convert list to string for shell execution
            cmd = ' '.join(f'"{c}"' if ' ' in c else c for c in cmd)

        if capture:
            result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=shell)
        else:
            result = subprocess.run(cmd, cwd=cwd, shell=shell)
        return result
    except FileNotFoundError:
        print_error(f"Command not found: {original_cmd}")
        return None
    except Exception as e:
        print_error(f"Error running command: {e}")
        return None


def get_version(cmd: list) -> str:
    """Get version string from a command"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.stdout.strip() or result.stderr.strip()
    except:
        return "unknown"


def get_project_root() -> str:
    """Get the project root directory"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(script_dir)


def check_windows_build_tools() -> bool:
    """Check if Windows has the required build tools for native modules"""
    if platform.system() != 'Windows':
        return True

    # Check for Visual Studio Build Tools by looking for vswhere
    vswhere_paths = [
        r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe",
        r"C:\Program Files\Microsoft Visual Studio\Installer\vswhere.exe"
    ]

    for vswhere in vswhere_paths:
        if os.path.exists(vswhere):
            result = subprocess.run(
                [vswhere, '-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath'],
                capture_output=True, text=True
            )
            if result.returncode == 0 and result.stdout.strip():
                return True

    return False


def check_and_install_setuptools() -> bool:
    """Check if setuptools is installed (provides distutils for Python 3.12+)"""
    # Python 3.12+ removed distutils, but node-gyp needs it
    # setuptools provides a compatibility layer

    print_step("Checking Python setuptools (required for node-gyp)...")

    # Check Python version
    py_version = sys.version_info
    if py_version.major == 3 and py_version.minor >= 12:
        # Check if setuptools is installed
        try:
            import setuptools
            print_success(f"setuptools {setuptools.__version__}")
            return True
        except ImportError:
            print_warning("setuptools not found (required for Python 3.12+ with node-gyp)")
            print_step("Installing setuptools...")

            result = subprocess.run([sys.executable, '-m', 'pip', 'install', 'setuptools'],
                                    capture_output=True, text=True)
            if result.returncode == 0:
                print_success("setuptools installed successfully")
                return True
            else:
                print_error("Failed to install setuptools")
                print_error("Please run: pip install setuptools")
                return False
    else:
        print_success(f"Python {py_version.major}.{py_version.minor} (distutils available)")
        return True


def install_windows_build_tools() -> bool:
    """Install Visual Studio Build Tools on Windows using winget or manual download"""
    if platform.system() != 'Windows':
        return True

    print_step("Installing Visual Studio Build Tools...")
    print_warning("This may take several minutes...")

    # Try winget first (available on Windows 10 1709+ and Windows 11)
    if check_command_exists('winget'):
        print_step("Using winget to install Visual Studio Build Tools...")
        result = subprocess.run(
            'winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"',
            shell=True
        )
        if result.returncode == 0:
            print_success("Visual Studio Build Tools installed successfully")
            return True
        else:
            print_warning("winget installation failed, trying alternative method...")

    # Try using npm windows-build-tools (works but deprecated)
    print_step("Attempting to install via npm windows-build-tools...")
    print_warning("This requires running as Administrator")

    # Check if running as admin
    try:
        import ctypes
        is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        is_admin = False

    if is_admin:
        result = subprocess.run('npm install -g windows-build-tools', shell=True)
        if result.returncode == 0:
            print_success("Windows build tools installed successfully")
            return True

    # If all else fails, provide manual instructions
    print_error("Could not automatically install Visual Studio Build Tools")
    print()
    print("Please install manually using ONE of these methods:")
    print()
    print(f"  {Colors.CYAN}Option 1 - winget (recommended):{Colors.NC}")
    print('    winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"')
    print()
    print(f"  {Colors.CYAN}Option 2 - npm (run as Administrator):{Colors.NC}")
    print("    npm install -g windows-build-tools")
    print()
    print(f"  {Colors.CYAN}Option 3 - Manual download:{Colors.NC}")
    print("    1. Visit: https://visualstudio.microsoft.com/visual-cpp-build-tools/")
    print("    2. Download and run the installer")
    print("    3. Select 'Desktop development with C++' workload")
    print("    4. Click Install")
    print()

    return False


def check_docker_prerequisites() -> bool:
    """Check Docker-related prerequisites only"""
    print_step("Checking Docker prerequisites...")
    all_ok = True

    # Check Docker
    if check_command_exists('docker'):
        version_output = get_version(['docker', '--version'])
        version = version_output.split()[2].rstrip(',') if version_output else "unknown"
        print_success(f"Docker {version}")
    else:
        print_error("Docker is not installed. Please install Docker Desktop")
        print_error("  Download from: https://www.docker.com/products/docker-desktop")
        all_ok = False

    # Check Docker Compose
    result = run_command(['docker', 'compose', 'version'], capture=True)
    if result and result.returncode == 0:
        version = result.stdout.strip().split()[-1] if result.stdout else "unknown"
        print_success(f"Docker Compose {version}")
    else:
        # Try docker-compose (old syntax)
        result = run_command(['docker-compose', '--version'], capture=True)
        if result and result.returncode == 0:
            print_success(f"Docker Compose (legacy)")
        else:
            print_error("Docker Compose is not available")
            print_error("  Please ensure Docker Desktop is properly installed")
            all_ok = False

    # Check if Docker daemon is running
    result = run_command(['docker', 'info'], capture=True)
    if result and result.returncode == 0:
        print_success("Docker daemon is running")
    else:
        print_error("Docker daemon is not running")
        print_error("  Please start Docker Desktop")
        all_ok = False

    return all_ok


def check_local_prerequisites() -> bool:
    """Check all required tools for local development"""
    print_step("Checking prerequisites...")
    all_ok = True

    # Check Python setuptools (needed for node-gyp on Python 3.12+)
    if not check_and_install_setuptools():
        print_warning("Continuing without setuptools - native modules may fail to build")

    # Check Windows Build Tools (needed for native modules like active-win, uiohook-napi)
    if platform.system() == 'Windows':
        if check_windows_build_tools():
            print_success("Visual Studio Build Tools")
        else:
            print_warning("Visual Studio Build Tools not found")
            print_warning("Native Node.js modules (active-win, uiohook-napi) require build tools.")
            print()

            # Attempt to install automatically
            if not install_windows_build_tools():
                print_warning("Continuing without build tools - desktop app may not work")
                # Don't fail - let the user decide if they need desktop app

    # Check Node.js
    if check_command_exists('node'):
        version_output = get_version(['node', '-v'])
        version_num = version_output.replace('v', '').split('.')[0]
        try:
            if int(version_num) >= 18:
                print_success(f"Node.js {version_output}")
            else:
                print_warning(f"Node.js version is {version_output}. Required: 18+")
                print_error("Please install Node.js 18 or higher")
                all_ok = False
        except ValueError:
            print_warning(f"Could not parse Node.js version: {version_output}")
    else:
        print_error("Node.js is not installed. Please install Node.js 20+")
        all_ok = False

    # Check pnpm
    if check_command_exists('pnpm'):
        version = get_version(['pnpm', '-v'])
        print_success(f"pnpm {version}")
    else:
        print_warning("pnpm not found. Attempting to install via npm...")
        result = run_command(['npm', 'install', '-g', 'pnpm'])

        if result and result.returncode == 0:
            # Verify pnpm is now available
            verify = run_command(['pnpm', '-v'], capture=True)
            if verify and verify.returncode == 0:
                print_success(f"pnpm {verify.stdout.strip()} installed successfully")
            else:
                print_success("pnpm installed successfully")
                print_warning("You may need to restart your terminal for pnpm to be in PATH")
        else:
            print_error("Failed to install pnpm automatically")
            print_error("Please install pnpm manually:")
            print_error("  npm install -g pnpm")
            print_error("  or visit: https://pnpm.io/installation")
            all_ok = False

    # Check .NET SDK
    if check_command_exists('dotnet'):
        version = get_version(['dotnet', '--version'])
        print_success(f"dotnet {version}")
    else:
        print_error(".NET SDK is not installed. Please install .NET 8 SDK")
        print_error("  Download from: https://dotnet.microsoft.com/download")
        all_ok = False

    # Check Docker (also needed for local mode for database)
    if check_command_exists('docker'):
        version_output = get_version(['docker', '--version'])
        # Extract just the version number
        version = version_output.split()[2].rstrip(',') if version_output else "unknown"
        print_success(f"Docker {version}")
    else:
        print_error("Docker is not installed. Please install Docker Desktop")
        print_error("  Download from: https://www.docker.com/products/docker-desktop")
        all_ok = False

    return all_ok


def docker_compose_cmd() -> list:
    """Get the appropriate docker compose command"""
    result = run_command(['docker', 'compose', 'version'], capture=True)
    if result and result.returncode == 0:
        return ['docker', 'compose']
    return ['docker-compose']


def build_docker_images(project_root: str) -> bool:
    """Build Docker images for API and Web"""
    print_step("Building Docker images...")

    cmd = docker_compose_cmd() + ['build']
    result = run_command(cmd, cwd=project_root)

    if result and result.returncode == 0:
        print_success("Docker images built successfully")
        return True
    else:
        print_error("Failed to build Docker images")
        return False


def start_docker_services(project_root: str, services: list = None) -> bool:
    """Start Docker services"""
    if services:
        print_step(f"Starting Docker services ({', '.join(services)})...")
        cmd = docker_compose_cmd() + ['up', '-d'] + services
    else:
        print_step("Starting all Docker services...")
        cmd = docker_compose_cmd() + ['up', '-d']

    result = run_command(cmd, cwd=project_root)

    if result and result.returncode == 0:
        return True
    else:
        print_error("Failed to start Docker services")
        return False


def wait_for_postgres(project_root: str, max_wait: int = 60) -> bool:
    """Wait for PostgreSQL to be ready"""
    print_step("Waiting for PostgreSQL to be ready...")

    start_time = time.time()
    while time.time() - start_time < max_wait:
        # Check if PostgreSQL is ready using docker exec
        result = run_command(
            ['docker', 'exec', 'teboraw-postgres', 'pg_isready', '-U', 'teboraw', '-d', 'teboraw'],
            capture=True
        )
        if result and result.returncode == 0:
            print_success("PostgreSQL is ready")
            return True

        print(".", end="", flush=True)
        time.sleep(2)

    print()
    print_error("PostgreSQL did not become ready in time")
    return False


def wait_for_api(max_wait: int = 90) -> bool:
    """Wait for API to be healthy"""
    print_step("Waiting for API to be healthy...")

    start_time = time.time()
    while time.time() - start_time < max_wait:
        try:
            req = urllib.request.Request('http://localhost:5000/health')
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    print_success("API is healthy")
                    return True
        except:
            pass

        print(".", end="", flush=True)
        time.sleep(2)

    print()
    print_warning("API health check timed out")
    print_warning("Check logs with: docker compose logs api")
    return False


def install_dependencies(project_root: str) -> bool:
    """Install pnpm dependencies"""
    print_step("Installing pnpm dependencies...")
    result = run_command(['pnpm', 'install'], cwd=project_root)

    if result is None:
        print_error("Failed to run pnpm install")
        return False

    if result.returncode != 0:
        # Check if this was a native module build failure (common on Windows without build tools)
        print_warning("pnpm install encountered errors")
        print_warning("If you see 'electron-rebuild' errors, you may need Visual Studio Build Tools")
        print_warning("The web app and API should still work without the desktop app dependencies")

        # Try to continue anyway - web/api might still work
        return True

    return True


def build_shared_types(project_root: str) -> bool:
    """Build the shared types package"""
    print_step("Building shared types package...")
    shared_types_dir = os.path.join(project_root, 'packages', 'shared-types')
    result = run_command(['pnpm', 'build'], cwd=shared_types_dir)
    return result and result.returncode == 0


def restore_dotnet_packages(project_root: str) -> bool:
    """Restore .NET packages"""
    print_step("Restoring .NET packages...")
    api_dir = os.path.join(project_root, 'apps', 'api')
    result = run_command(['dotnet', 'restore'], cwd=api_dir)
    return result and result.returncode == 0


def apply_migrations(project_root: str) -> bool:
    """Apply Entity Framework database migrations"""
    print_step("Applying database migrations...")
    api_dir = os.path.join(project_root, 'apps', 'api')

    # Check if EF tools are available
    result = run_command(
        ['dotnet', 'ef', 'database', 'update',
         '--project', 'Teboraw.Infrastructure',
         '--startup-project', 'Teboraw.Api'],
        cwd=api_dir,
        capture=True
    )

    if result and result.returncode == 0:
        print_success("Database migrations applied")
        return True
    else:
        print_warning("Could not apply migrations (this is OK for first run)")
        return True  # Don't fail on migration errors


def install_chrome_extension(project_root: str) -> bool:
    """Open Chrome extensions page and guide user to install the extension"""
    print_header("Chrome Extension Installation")

    extension_path = os.path.join(project_root, 'apps', 'extension')

    # Check if extension exists
    if not os.path.exists(os.path.join(extension_path, 'manifest.json')):
        print_warning("Chrome extension not found at apps/extension")
        return False

    print_step("Opening Chrome extensions page...")
    print()
    print(f"  {Colors.YELLOW}Please complete the following steps:{Colors.NC}")
    print()
    print(f"  1. Enable {Colors.YELLOW}Developer mode{Colors.NC} (toggle in top-right corner)")
    print(f"  2. Click {Colors.GREEN}Load unpacked{Colors.NC}")
    print(f"  3. Select the folder:")
    print(f"     {Colors.BLUE}{extension_path}{Colors.NC}")
    print()

    # Open chrome://extensions in the default browser
    chrome_extensions_url = "chrome://extensions"

    try:
        if platform.system() == 'Darwin':  # macOS
            # Try to open Chrome specifically with the extensions page
            chrome_paths = [
                '/Applications/Google Chrome.app',
                os.path.expanduser('~/Applications/Google Chrome.app')
            ]
            chrome_found = False
            for chrome_path in chrome_paths:
                if os.path.exists(chrome_path):
                    subprocess.run([
                        'open', '-a', chrome_path, chrome_extensions_url
                    ], capture_output=True)
                    chrome_found = True
                    break

            if not chrome_found:
                print_warning("Google Chrome not found in standard locations")
                print(f"  Please manually open Chrome and navigate to: {Colors.BLUE}chrome://extensions{Colors.NC}")
                return True

        elif platform.system() == 'Windows':
            # Try common Chrome installation paths on Windows
            chrome_paths = [
                os.path.expandvars(r'%ProgramFiles%\Google\Chrome\Application\chrome.exe'),
                os.path.expandvars(r'%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe'),
                os.path.expandvars(r'%LocalAppData%\Google\Chrome\Application\chrome.exe'),
            ]
            chrome_found = False
            for chrome_path in chrome_paths:
                if os.path.exists(chrome_path):
                    subprocess.run([chrome_path, chrome_extensions_url], capture_output=True)
                    chrome_found = True
                    break

            if not chrome_found:
                # Try using start command as fallback
                subprocess.run(['start', chrome_extensions_url], shell=True, capture_output=True)

        else:  # Linux
            # Try to find Chrome or Chromium
            chrome_cmds = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
            chrome_found = False
            for chrome_cmd in chrome_cmds:
                if shutil.which(chrome_cmd):
                    subprocess.run([chrome_cmd, chrome_extensions_url], capture_output=True)
                    chrome_found = True
                    break

            if not chrome_found:
                # Try xdg-open as fallback
                subprocess.run(['xdg-open', chrome_extensions_url], capture_output=True)

        print_success("Chrome extensions page opened")
        print()

        # Wait for user to complete installation
        input(f"  Press {Colors.GREEN}Enter{Colors.NC} after installing the extension to continue...")
        print()
        print_success("Chrome extension setup completed")
        return True

    except Exception as e:
        print_warning(f"Could not automatically open Chrome: {e}")
        print(f"  Please manually open Chrome and navigate to: {Colors.BLUE}chrome://extensions{Colors.NC}")
        return True


def print_docker_completion_message():
    """Print completion message for Docker deployment"""
    print_header("Setup Complete!")

    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print("All services are running in Docker containers.")
    print()
    print("Services:")
    print(f"  {Colors.BLUE}API:{Colors.NC}        http://localhost:5000")
    print(f"  {Colors.BLUE}Swagger:{Colors.NC}    http://localhost:5000/swagger")
    print(f"  {Colors.BLUE}Dashboard:{Colors.NC}  http://localhost:5173")
    print(f"  {Colors.BLUE}pgAdmin:{Colors.NC}    http://localhost:5050 (admin@teboraw.local / admin)")
    print()
    print("Commands:")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py{Colors.NC}           - Start all services")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py stop{Colors.NC}      - Stop all services")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py logs{Colors.NC}      - View logs")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py rebuild{Colors.NC}   - Rebuild and restart")
    print()


def print_local_completion_message():
    """Print setup completion message with next steps for local development"""
    print_header("Setup Complete!")

    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print("You can now run the project using:")
    print()
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py --local{Colors.NC}        - Start all services locally")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py --local api{Colors.NC}    - Start only the API")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py --local web{Colors.NC}    - Start only the web dashboard")
    print()
    print("Or manually:")
    print(f"  {Colors.YELLOW}API:{Colors.NC}       cd apps/api && dotnet run --project Teboraw.Api")
    print(f"  {Colors.YELLOW}Web:{Colors.NC}       pnpm dev:web")
    print(f"  {Colors.YELLOW}Desktop:{Colors.NC}   cd apps/desktop && pnpm dev")
    print()
    print("Services:")
    print(f"  {Colors.BLUE}API:{Colors.NC}        http://localhost:5000")
    print(f"  {Colors.BLUE}Swagger:{Colors.NC}    http://localhost:5000/swagger")
    print(f"  {Colors.BLUE}Dashboard:{Colors.NC}  http://localhost:5173")
    print(f"  {Colors.BLUE}pgAdmin:{Colors.NC}    http://localhost:5050 (admin@teboraw.local / admin)")
    print()


def setup_docker(project_root: str):
    """Docker deployment setup"""
    print_header("Docker Deployment Setup")

    # Check Docker prerequisites
    if not check_docker_prerequisites():
        print()
        print_error("Docker prerequisites check failed.")
        sys.exit(1)

    print()

    # Build Docker images
    if not build_docker_images(project_root):
        sys.exit(1)

    # Start infrastructure services first
    if not start_docker_services(project_root, ['postgres', 'redis']):
        sys.exit(1)

    # Wait for PostgreSQL
    time.sleep(3)
    if not wait_for_postgres(project_root):
        print_warning("Continuing without confirming PostgreSQL readiness...")

    # Start API and Web containers
    if not start_docker_services(project_root, ['api', 'web', 'pgadmin']):
        sys.exit(1)

    # Wait for API to be healthy
    time.sleep(5)
    wait_for_api()

    # Install Chrome extension
    install_chrome_extension(project_root)

    # Print completion message
    print_docker_completion_message()


def setup_local(project_root: str):
    """Local development setup"""
    print_header("Local Development Setup")

    # Check prerequisites
    if not check_local_prerequisites():
        print()
        print_error("Prerequisites check failed. Please install missing dependencies.")
        sys.exit(1)

    print()

    # Start Docker services (PostgreSQL, Redis, pgAdmin only)
    if not start_docker_services(project_root, ['postgres', 'redis', 'pgadmin']):
        sys.exit(1)

    # Wait for PostgreSQL
    time.sleep(3)
    if not wait_for_postgres(project_root):
        print_warning("Continuing without confirming PostgreSQL readiness...")

    # Install pnpm dependencies
    if not install_dependencies(project_root):
        print_error("Failed to install dependencies")
        sys.exit(1)

    # Build shared types
    if not build_shared_types(project_root):
        print_error("Failed to build shared types")
        sys.exit(1)

    # Restore .NET packages
    if not restore_dotnet_packages(project_root):
        print_error("Failed to restore .NET packages")
        sys.exit(1)

    # Apply migrations
    apply_migrations(project_root)

    # Install Chrome extension
    install_chrome_extension(project_root)

    # Print completion message
    print_local_completion_message()


def main():
    """Main setup function"""
    Colors.init()

    # Parse arguments
    parser = argparse.ArgumentParser(
        description='Teboraw 2.0 Setup Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python setup.py              # Docker deployment (default)
  python setup.py --docker     # Docker deployment
  python setup.py --local      # Local development setup
        '''
    )
    parser.add_argument('--docker', action='store_true', default=True,
                        help='Setup for Docker deployment (default)')
    parser.add_argument('--local', action='store_true',
                        help='Setup for local development')
    args = parser.parse_args()

    # Determine mode (--local overrides default --docker)
    deploy_mode = 'local' if args.local else 'docker'

    project_root = get_project_root()
    os.chdir(project_root)

    print_header("Teboraw 2.0 - Setup Script")
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Project root: {project_root}")
    print(f"Deployment mode: {Colors.BLUE}{deploy_mode}{Colors.NC}")
    print()

    if deploy_mode == 'docker':
        setup_docker(project_root)
    else:
        setup_local(project_root)


if __name__ == '__main__':
    main()
