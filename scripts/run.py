#!/usr/bin/env python3
"""
Teboraw 2.0 - Cross-Platform Run Script
========================================
Works on Windows, macOS, and Linux

Usage:
    python run.py                    # Start all in Docker (default)
    python run.py --docker           # Start all in Docker
    python run.py stop               # Stop Docker services
    python run.py logs [service]     # View logs
    python run.py rebuild            # Rebuild and restart
    python run.py --local            # Start API/Web locally, DB in Docker
    python run.py --local api        # Start just the API locally
"""

import os
import sys
import subprocess
import signal
import platform
import time
import atexit
import shutil
import argparse
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


def docker_compose_cmd() -> list:
    """Get the appropriate docker compose command"""
    try:
        result = subprocess.run(['docker', 'compose', 'version'], capture_output=True, text=True)
        if result.returncode == 0:
            return ['docker', 'compose']
    except:
        pass
    return ['docker-compose']


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


# ==========================================
# Docker Mode Functions
# ==========================================

def docker_start_all(project_root: str):
    """Start all services in Docker"""
    print_banner()
    print_step("Starting all services in Docker...")

    cmd = docker_compose_cmd() + ['up', '-d']
    subprocess.run(cmd, cwd=project_root)

    print(f"\n{Colors.CYAN}{'=' * 60}{Colors.NC}")
    print(f"{Colors.GREEN}All services started!{Colors.NC}")
    print(f"{Colors.CYAN}{'=' * 60}{Colors.NC}")
    print()
    print(f"  {Colors.BLUE}API:{Colors.NC}        http://localhost:5000")
    print(f"  {Colors.BLUE}Swagger:{Colors.NC}    http://localhost:5000/swagger")
    print(f"  {Colors.BLUE}Dashboard:{Colors.NC}  http://localhost:5173")
    print(f"  {Colors.BLUE}pgAdmin:{Colors.NC}    http://localhost:5050")
    print()

    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'
    print(f"{Colors.YELLOW}Use '{python_cmd} scripts/run.py logs' to view logs{Colors.NC}")
    print(f"{Colors.YELLOW}Use '{python_cmd} scripts/run.py stop' to stop all services{Colors.NC}")
    print()


def docker_stop(project_root: str):
    """Stop all Docker services"""
    print_step("Stopping all Docker services...")
    cmd = docker_compose_cmd() + ['down']
    subprocess.run(cmd, cwd=project_root)
    print(f"{Colors.GREEN}Done{Colors.NC}")


def docker_logs(project_root: str, service: str = None):
    """View Docker logs"""
    cmd = docker_compose_cmd() + ['logs', '-f']
    if service:
        cmd.append(service)
    try:
        subprocess.run(cmd, cwd=project_root)
    except KeyboardInterrupt:
        pass


def docker_rebuild(project_root: str):
    """Rebuild and restart Docker services"""
    print_step("Rebuilding and restarting services...")

    cmd = docker_compose_cmd()
    subprocess.run(cmd + ['down'], cwd=project_root)
    subprocess.run(cmd + ['build', '--no-cache'], cwd=project_root)
    subprocess.run(cmd + ['up', '-d'], cwd=project_root)

    print(f"{Colors.GREEN}Done{Colors.NC}")


def docker_status(project_root: str):
    """Show Docker container status"""
    print_step("Service Status:")
    cmd = docker_compose_cmd() + ['ps']
    subprocess.run(cmd, cwd=project_root)


# ==========================================
# Local Mode Functions
# ==========================================

def local_start_docker(project_root: str):
    """Start Docker services for local development (DB only)"""
    print_step("Starting Docker services (PostgreSQL, Redis)...")
    cmd = docker_compose_cmd() + ['up', '-d', 'postgres', 'redis', 'pgadmin']
    subprocess.run(cmd, cwd=project_root)
    time.sleep(2)


def local_start_api(project_root: str, background: bool = False) -> Optional[subprocess.Popen]:
    """Start the .NET API"""
    print_step("Starting .NET API on http://localhost:5000")
    api_dir = os.path.join(project_root, 'apps', 'api')
    cmd = ['dotnet', 'run', '--project', 'Teboraw.Api', '--urls', 'http://localhost:5000']

    if background:
        return run_command(cmd, cwd=api_dir, background=True)
    else:
        run_command(cmd, cwd=api_dir)
        return None


def local_start_web(project_root: str, background: bool = False) -> Optional[subprocess.Popen]:
    """Start the Web Dashboard"""
    print_step("Starting Web Dashboard on http://localhost:5173")
    cmd = ['pnpm', 'dev:web']

    if background:
        return run_command(cmd, cwd=project_root, background=True)
    else:
        run_command(cmd, cwd=project_root)
        return None


def local_start_desktop(project_root: str):
    """Start the Desktop Agent"""
    print_step("Starting Desktop Agent...")
    desktop_dir = os.path.join(project_root, 'apps', 'desktop')
    run_command(['pnpm', 'dev'], cwd=desktop_dir)


def local_start_all(project_root: str):
    """Start all services locally"""
    print_banner()
    local_start_docker(project_root)

    print(f"\n{Colors.YELLOW}Starting services in background...{Colors.NC}\n")

    # Start API in background
    api_proc = local_start_api(project_root, background=True)

    # Wait a bit for API to initialize
    time.sleep(3)

    # Start Web in background
    web_proc = local_start_web(project_root, background=True)

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


def local_stop_docker(project_root: str):
    """Stop Docker services for local development"""
    print_step("Stopping Docker services...")
    cmd = docker_compose_cmd() + ['stop', 'postgres', 'redis', 'pgadmin']
    subprocess.run(cmd, cwd=project_root)
    print(f"{Colors.GREEN}Done{Colors.NC}")


# ==========================================
# Help
# ==========================================

def show_help():
    """Show help message"""
    print_banner()
    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print(f"Usage: {python_cmd} scripts/run.py [--docker|--local] [command]")
    print()
    print("Modes:")
    print("  --docker     Run services in Docker containers (default)")
    print("  --local      Run API and Web locally (only DB in Docker)")
    print()
    print("Docker Commands:")
    print("  (no args)    Start all services in Docker")
    print("  stop         Stop all Docker services")
    print("  logs [svc]   View logs (optionally for specific service: api, web, postgres)")
    print("  rebuild      Rebuild images and restart")
    print("  status       Show container status")
    print()
    print("Local Commands:")
    print("  (no args)    Start all services (API + Web locally, DB in Docker)")
    print("  api          Start only the .NET API")
    print("  web          Start only the Web Dashboard")
    print("  desktop      Start the Electron Desktop Agent")
    print("  docker       Start only Docker services (DB)")
    print("  stop         Stop Docker services")
    print()
    print("Examples:")
    print(f"  {python_cmd} scripts/run.py                # Start all in Docker (default)")
    print(f"  {python_cmd} scripts/run.py --docker       # Start all in Docker")
    print(f"  {python_cmd} scripts/run.py stop           # Stop Docker services")
    print(f"  {python_cmd} scripts/run.py logs api       # View API logs")
    print(f"  {python_cmd} scripts/run.py rebuild        # Rebuild and restart")
    print(f"  {python_cmd} scripts/run.py --local        # Start API/Web locally")
    print(f"  {python_cmd} scripts/run.py --local api    # Start just the API locally")
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

    # Parse arguments
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--docker', action='store_true', default=True)
    parser.add_argument('--local', action='store_true')
    parser.add_argument('command', nargs='?', default='all')
    parser.add_argument('extra', nargs='?', default=None)
    args = parser.parse_args()

    # Determine mode
    deploy_mode = 'local' if args.local else 'docker'
    command = args.command
    extra = args.extra

    if deploy_mode == 'docker':
        # Docker mode commands
        if command == 'stop':
            docker_stop(project_root)

        elif command == 'logs':
            docker_logs(project_root, extra)

        elif command == 'rebuild':
            docker_rebuild(project_root)

        elif command == 'status':
            docker_status(project_root)

        elif command in ('help', '--help', '-h'):
            show_help()

        elif command in ('all', ''):
            docker_start_all(project_root)

        else:
            print_error(f"Unknown command: {command}")
            show_help()
            sys.exit(1)

    else:
        # Local mode commands
        if command == 'api':
            local_start_docker(project_root)
            local_start_api(project_root)

        elif command == 'web':
            local_start_web(project_root)

        elif command == 'desktop':
            local_start_desktop(project_root)

        elif command == 'docker':
            local_start_docker(project_root)
            print(f"{Colors.GREEN}Docker services started{Colors.NC}")

        elif command == 'stop':
            local_stop_docker(project_root)

        elif command in ('help', '--help', '-h'):
            show_help()

        elif command in ('all', ''):
            local_start_all(project_root)

        else:
            print_error(f"Unknown command: {command}")
            show_help()
            sys.exit(1)


if __name__ == '__main__':
    main()
