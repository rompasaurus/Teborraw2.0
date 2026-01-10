#!/usr/bin/env python3
"""
Teboraw 2.0 - Cross-Platform Setup Script
==========================================
Works on Windows, macOS, and Linux
"""

import os
import sys
import subprocess
import shutil
import time
import platform

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


def check_prerequisites() -> bool:
    """Check all required tools are installed"""
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

    # Check Docker
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


def start_docker_services(project_root: str) -> bool:
    """Start Docker services"""
    print_step("Starting Docker services (PostgreSQL, Redis, pgAdmin)...")

    result = run_command(['docker', 'compose', 'up', '-d'], cwd=project_root)
    if result is None or result.returncode != 0:
        # Try docker-compose (older syntax)
        result = run_command(['docker-compose', 'up', '-d'], cwd=project_root)

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


def print_completion_message():
    """Print setup completion message with next steps"""
    print_header("Setup Complete!")

    # Cross-platform script extension
    script_ext = '.py'
    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print("You can now run the project using:")
    print()
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py{Colors.NC}        - Start all services")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py api{Colors.NC}    - Start only the API")
    print(f"  {Colors.GREEN}{python_cmd} scripts/run.py web{Colors.NC}    - Start only the web dashboard")
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


def main():
    """Main setup function"""
    Colors.init()

    project_root = get_project_root()
    os.chdir(project_root)

    print_header("Teboraw 2.0 - Setup Script")
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Project root: {project_root}")
    print()

    # Check prerequisites
    if not check_prerequisites():
        print()
        print_error("Prerequisites check failed. Please install missing dependencies.")
        sys.exit(1)

    print()

    # Start Docker services
    if not start_docker_services(project_root):
        sys.exit(1)

    # Wait for PostgreSQL
    time.sleep(3)  # Initial wait
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

    # Print completion message
    print_completion_message()


if __name__ == '__main__':
    main()
