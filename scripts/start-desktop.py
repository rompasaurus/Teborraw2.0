#!/usr/bin/env python3
"""
Teboraw Desktop App Launcher
============================
Cross-platform script to build and run the Electron desktop app.
Works on Windows, macOS, and Linux.
"""

import os
import sys
import subprocess
import platform
import shutil


class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'

    @staticmethod
    def init():
        if platform.system() == 'Windows':
            os.system('')


def print_banner():
    print(f"{Colors.CYAN}")
    print("  +========================================+")
    print("  |     TEBORAW DESKTOP LAUNCHER          |")
    print("  |     Electron Activity Tracker         |")
    print("  +========================================+")
    print(f"{Colors.NC}")


def print_step(msg):
    print(f"{Colors.GREEN}> {msg}{Colors.NC}")


def print_success(msg):
    print(f"{Colors.GREEN}+ {msg}{Colors.NC}")


def print_warning(msg):
    print(f"{Colors.YELLOW}! {msg}{Colors.NC}")


def print_error(msg):
    print(f"{Colors.RED}X {msg}{Colors.NC}")


def get_npm_global_path():
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


def find_command(cmd):
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


def run_cmd(cmd, cwd=None):
    """Run a command with proper path resolution"""
    if isinstance(cmd, list) and len(cmd) > 0:
        full_path = find_command(cmd[0])
        if full_path:
            cmd = [full_path] + cmd[1:]

    shell = platform.system() == 'Windows'
    return subprocess.run(cmd, cwd=cwd, shell=shell)


def get_project_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(script_dir)


def check_prerequisites():
    """Check required tools are installed"""
    print_step("Checking prerequisites...")

    all_ok = True

    # Check Node.js
    if find_command('node'):
        result = subprocess.run(['node', '-v'], capture_output=True, text=True)
        print_success(f"Node.js {result.stdout.strip()}")
    else:
        print_error("Node.js not found. Please install Node.js 20+")
        all_ok = False

    # Check pnpm
    if find_command('pnpm'):
        result = subprocess.run(['pnpm', '-v'], capture_output=True, text=True, shell=True)
        print_success(f"pnpm {result.stdout.strip()}")
    else:
        print_error("pnpm not found. Run: npm install -g pnpm")
        all_ok = False

    return all_ok


def install_dependencies(project_root, desktop_dir):
    """Install dependencies if needed"""
    node_modules = os.path.join(desktop_dir, 'node_modules')

    if not os.path.exists(node_modules):
        print_step("Installing dependencies (first run)...")
        result = run_cmd(['pnpm', 'install'], cwd=project_root)
        if result.returncode != 0:
            print_warning("Some dependencies may have failed to install")
            print_warning("The desktop app may still work - continuing...")
    else:
        print_success("Dependencies already installed")


def rebuild_native_modules(desktop_dir):
    """Rebuild native modules for Electron if needed"""
    # Check if native modules need rebuilding
    uiohook_path = os.path.join(desktop_dir, 'node_modules', 'uiohook-napi')

    if os.path.exists(uiohook_path):
        print_step("Native modules found")
    else:
        print_warning("Native modules not found - they may need to be rebuilt")
        print_warning("If the app fails to start, run: pnpm rebuild in apps/desktop")


def start_desktop_dev(desktop_dir):
    """Start the desktop app in development mode"""
    print_step("Starting Teboraw Desktop in development mode...")
    print()
    print(f"  {Colors.BLUE}The app window should open shortly...{Colors.NC}")
    print(f"  {Colors.YELLOW}Press Ctrl+C to stop{Colors.NC}")
    print()

    # On Windows, use the dev.bat script which properly clears ELECTRON_RUN_AS_NODE
    # This env var is often set by Claude Code or other Electron-based tools
    # and makes Electron behave like Node.js instead of as an Electron app
    if platform.system() == 'Windows':
        batch_file = os.path.join(desktop_dir, 'dev.bat')
        subprocess.run(batch_file, cwd=desktop_dir, shell=True)
    else:
        # On Unix, use dev:unix script which unsets ELECTRON_RUN_AS_NODE
        env = os.environ.copy()
        env.pop('ELECTRON_RUN_AS_NODE', None)
        subprocess.run(['pnpm', 'dev:unix'], cwd=desktop_dir, env=env)


def get_clean_env():
    """Get environment without ELECTRON_RUN_AS_NODE"""
    env = os.environ.copy()
    if 'ELECTRON_RUN_AS_NODE' in env:
        del env['ELECTRON_RUN_AS_NODE']
    return env


def build_desktop(desktop_dir):
    """Build the desktop app"""
    print_step("Building desktop app...")
    result = subprocess.run(['pnpm', 'build'], cwd=desktop_dir, shell=True, env=get_clean_env())

    if result.returncode == 0:
        print_success("Build complete!")
    else:
        print_error("Build failed")
        return False
    return True


def package_desktop(desktop_dir):
    """Package the desktop app for distribution"""
    print_step("Packaging desktop app for distribution...")

    # First build
    if not build_desktop(desktop_dir):
        return False

    # Then package
    result = subprocess.run(['pnpm', 'package'], cwd=desktop_dir, shell=True, env=get_clean_env())

    if result.returncode == 0:
        release_dir = os.path.join(desktop_dir, 'release')
        print_success(f"Package complete! Check: {release_dir}")
        return True
    else:
        print_error("Packaging failed")
        return False


def show_help():
    python_cmd = 'python' if platform.system() == 'Windows' else 'python3'

    print(f"Usage: {python_cmd} scripts/start-desktop.py [command]")
    print()
    print("Commands:")
    print("  (no args)    Start desktop app in development mode")
    print("  dev          Same as above - start in dev mode")
    print("  build        Build the desktop app")
    print("  package      Package for distribution (creates installer)")
    print("  help         Show this help message")
    print()
    print("Examples:")
    print(f"  {python_cmd} scripts/start-desktop.py           # Start dev mode")
    print(f"  {python_cmd} scripts/start-desktop.py build     # Build app")
    print(f"  {python_cmd} scripts/start-desktop.py package   # Create installer")
    print()


def main():
    Colors.init()
    print_banner()

    project_root = get_project_root()
    desktop_dir = os.path.join(project_root, 'apps', 'desktop')
    os.chdir(project_root)

    # Get command
    command = sys.argv[1] if len(sys.argv) > 1 else 'dev'

    if command in ('help', '--help', '-h'):
        show_help()
        return

    # Check prerequisites
    if not check_prerequisites():
        print()
        print_error("Prerequisites check failed")
        sys.exit(1)

    print()

    # Install dependencies if needed
    install_dependencies(project_root, desktop_dir)

    # Check native modules
    rebuild_native_modules(desktop_dir)

    print()

    # Execute command
    if command in ('dev', ''):
        start_desktop_dev(desktop_dir)

    elif command == 'build':
        build_desktop(desktop_dir)

    elif command == 'package':
        package_desktop(desktop_dir)

    else:
        print_error(f"Unknown command: {command}")
        show_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
