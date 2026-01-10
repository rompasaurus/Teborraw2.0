#!/usr/bin/env python3
"""
Teboraw 2.0 - Cross-Platform Run Script
========================================
Works on Windows, macOS, and Linux
"""

import os
import sys
import subprocess
import signal
import platform
import time
import atexit
import shutil
from typing import List, Optional

# Track background processes for cleanup
background_processes: List[subprocess.Popen] = []


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


def print_banner():
    print(f"{Colors.CYAN}")
    print("  +========================================+")
    print("  |         TEBORAW 2.0                   |")
    print("  |   Personal Activity Tracker           |")
    print("  +========================================+")
    print(f"{Colors.NC}")


def print_step(message: str):
    print(f"{Colors.GREEN}> {message}{Colors.NC}")


def print_info(message: str):
    print(f"{Colors.BLUE}  {message}{Colors.NC}")


def print_warning(message: str):
    print(f"{Colors.YELLOW}! {message}{Colors.NC}")


def print_error(message: str):
    print(f"{Colors.RED}X {message}{Colors.NC}")


def get_npm_global_path() -> str:
    """Get the npm global bin directory"""
    try:
        result = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            npm_root = result.stdout.strip()
            if platform.system() == 'Windows':
                return os.path.dirname(npm_root)
            else:
                return os.path.join(os.path.dirname(npm_root), 'bin')
    except:
        pass
    return None


def find_command(cmd: str) -> str:
    """Find a command, checking PATH and npm global directory"""
    path = shutil.which(cmd)
    if path:
        return path

    if platform.system() == 'Windows':
        npm_path = get_npm_global_path()
        if npm_path:
            for ext in ['.cmd', '.exe', '']:
                cmd_path = os.path.join(npm_path, f"{cmd}{ext}")
                if os.path.exists(cmd_path):
                    return cmd_path
    return None


def get_project_root() -> str:
    """Get the project root directory"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(script_dir)


def run_command(cmd: list, cwd: str = None, background: bool = False) -> Optional[subprocess.Popen]:
    """Run a command, optionally in background"""
    try:
        # Resolve command path
        if isinstance(cmd, list) and len(cmd) > 0:
            full_path = find_command(cmd[0])
            if full_path:
                cmd = [full_path] + cmd[1:]

        if background:
            # Start process in background
            if platform.system() == 'Windows':
                # On Windows, use CREATE_NEW_PROCESS_GROUP and shell for .cmd files
                process = subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    shell=True,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                # On Unix, start in new process group
                process = subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    start_new_session=True
                )
            background_processes.append(process)
            return process
        else:
            result = subprocess.run(cmd, cwd=cwd, shell=(platform.system() == 'Windows'))
            return result
    except FileNotFoundError:
        print_error(f"Command not found: {cmd[0] if isinstance(cmd, list) else cmd}")
        return None
    except Exception as e:
        print_error(f"Error running command: {e}")
        return None


def cleanup_processes():
    """Cleanup all background processes"""
    if background_processes:
        print(f"\n{Colors.YELLOW}Stopping services...{Colors.NC}")
        for proc in background_processes:
            try:
                if proc.poll() is None:  # Process is still running
                    if platform.system() == 'Windows':
                        # On Windows, terminate the process
                        proc.terminate()
                    else:
                        # On Unix, send SIGTERM to process group
                        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except (ProcessLookupError, OSError):
                pass  # Process already terminated

        # Give processes time to cleanup
        time.sleep(1)

        # Force kill any remaining
        for proc in background_processes:
            try:
                if proc.poll() is None:
                    proc.kill()
            except (ProcessLookupError, OSError):
                pass


def signal_handler(signum, frame):
    """Handle interrupt signals"""
    cleanup_processes()
    sys.exit(0)


def start_docker(project_root: str):
    """Start Docker services"""
    print_step("Starting Docker services...")
    result = subprocess.run(['docker', 'compose', 'up', '-d'], cwd=project_root)
    if result.returncode != 0:
        # Try older docker-compose syntax
        subprocess.run(['docker-compose', 'up', '-d'], cwd=project_root)
    time.sleep(2)


def stop_docker(project_root: str):
    """Stop Docker services"""
    print_step("Stopping Docker services...")
    result = subprocess.run(['docker', 'compose', 'down'], cwd=project_root)
    if result.returncode != 0:
        subprocess.run(['docker-compose', 'down'], cwd=project_root)
    print(f"{Colors.GREEN}Done{Colors.NC}")


def start_api(project_root: str, background: bool = False) -> Optional[subprocess.Popen]:
    """Start the .NET API"""
    print_step("Starting .NET API on http://localhost:5000")
    api_dir = os.path.join(project_root, 'apps', 'api')
    cmd = ['dotnet', 'run', '--project', 'Teboraw.Api', '--urls', 'http://localhost:5000']

    if background:
        return run_command(cmd, cwd=api_dir, background=True)
    else:
        run_command(cmd, cwd=api_dir)
        return None


def start_web(project_root: str, background: bool = False) -> Optional[subprocess.Popen]:
    """Start the Web Dashboard"""
    print_step("Starting Web Dashboard on http://localhost:5173")
    cmd = ['pnpm', 'dev:web']

    if background:
        return run_command(cmd, cwd=project_root, background=True)
    else:
        run_command(cmd, cwd=project_root)
        return None


def start_desktop(project_root: str):
    """Start the Desktop Agent"""
    print_step("Starting Desktop Agent...")
    desktop_dir = os.path.join(project_root, 'apps', 'desktop')
    run_command(['pnpm', 'dev'], cwd=desktop_dir)


def start_all(project_root: str):
    """Start all services"""
    print_banner()
    start_docker(project_root)

    print(f"\n{Colors.YELLOW}Starting services in background...{Colors.NC}\n")

    # Start API in background
    api_proc = start_api(project_root, background=True)

    # Wait a bit for API to initialize
    time.sleep(3)

    # Start Web in background
    web_proc = start_web(project_root, background=True)

    # Print status
    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.NC}")
    print(f"{Colors.GREEN}All services started!{Colors.NC}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.NC}")
    print()
    print(f"  {Colors.BLUE}API:{Colors.NC}        http://localhost:5000")
    print(f"  {Colors.BLUE}Swagger:{Colors.NC}    http://localhost:5000/swagger")
    print(f"  {Colors.BLUE}Dashboard:{Colors.NC}  http://localhost:5173")
    print(f"  {Colors.BLUE}pgAdmin:{Colors.NC}    http://localhost:5050")
    print()
    print(f"{Colors.YELLOW}Press Ctrl+C to stop all services{Colors.NC}")
    print()

    # Wait for processes
    try:
        while True:
            # Check if processes are still running
            api_running = api_proc and api_proc.poll() is None
            web_running = web_proc and web_proc.poll() is None

            if not api_running and not web_running:
                print_warning("All services have stopped")
                break

            time.sleep(1)
    except KeyboardInterrupt:
        pass

    cleanup_processes()


def show_help():
    """Show help message"""
    print_banner()
    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print(f"Usage: {python_cmd} scripts/run.py [command]")
    print()
    print("Commands:")
    print("  (no args)    Start all services (API + Web + Docker)")
    print("  api          Start only the .NET API")
    print("  web          Start only the Web Dashboard")
    print("  desktop      Start the Electron Desktop Agent")
    print("  docker       Start only Docker services")
    print("  stop         Stop all Docker services")
    print("  help         Show this help message")
    print()
    print("Examples:")
    print(f"  {python_cmd} scripts/run.py           # Start everything")
    print(f"  {python_cmd} scripts/run.py api       # Start just the API")
    print(f"  {python_cmd} scripts/run.py web       # Start just the dashboard")
    print()


def main():
    """Main entry point"""
    Colors.init()

    project_root = get_project_root()
    os.chdir(project_root)

    # Setup signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup_processes)

    # Get command from arguments
    command = sys.argv[1] if len(sys.argv) > 1 else 'all'

    if command == 'api':
        start_docker(project_root)
        start_api(project_root)

    elif command == 'web':
        start_web(project_root)

    elif command == 'desktop':
        start_desktop(project_root)

    elif command == 'docker':
        start_docker(project_root)
        print(f"{Colors.GREEN}Docker services started{Colors.NC}")

    elif command == 'stop':
        stop_docker(project_root)

    elif command in ('help', '--help', '-h'):
        show_help()

    elif command in ('all', ''):
        start_all(project_root)

    else:
        print_error(f"Unknown command: {command}")
        show_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
