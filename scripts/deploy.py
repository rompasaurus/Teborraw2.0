#!/usr/bin/env python3
"""
Teboraw 2.0 - Production Deploy CLI
====================================
Interactive menu for server setup, deployment, and management.

Usage:
    python deploy.py                      # Interactive menu
    python deploy.py build                # Build Docker images locally
    python deploy.py push                 # Push images to server
    python deploy.py deploy               # Full build + push + restart
    python deploy.py setup                # Provision a fresh droplet
    python deploy.py migrate              # Run EF migrations on server
    python deploy.py logs [service]       # View server logs
    python deploy.py status               # Check server service status
    python deploy.py ssh                  # SSH into server
    python deploy.py ssh-agent            # Add SSH key to agent (cache passphrase)
    python deploy.py backup               # Backup production database
    python deploy.py config               # Show/set server config
"""

import os
import sys
import subprocess
import argparse
import json
import time
import platform
from pathlib import Path


# ==========================================
# UI Helpers
# ==========================================

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    MAGENTA = '\033[0;35m'
    DIM = '\033[2m'
    BOLD = '\033[1m'
    NC = '\033[0m'

    @staticmethod
    def init():
        if platform.system() == 'Windows':
            os.system('')


def clear_screen():
    os.system('cls' if platform.system() == 'Windows' else 'clear')


def print_banner():
    print(f"{Colors.CYAN}")
    print("  +========================================+")
    print("  |         TEBORAW 2.0 DEPLOY            |")
    print("  |   Build Local -> Push to Production    |")
    print("  +========================================+")
    print(f"{Colors.NC}")


def print_step(msg):
    print(f"{Colors.GREEN}> {msg}{Colors.NC}")


def print_info(msg):
    print(f"{Colors.BLUE}  {msg}{Colors.NC}")


def print_warn(msg):
    print(f"{Colors.YELLOW}! {msg}{Colors.NC}")


def print_error(msg):
    print(f"{Colors.RED}X {msg}{Colors.NC}")


def print_success(msg):
    print(f"{Colors.GREEN}+ {msg}{Colors.NC}")


def print_header(msg):
    width = len(msg) + 4
    print()
    print(f"  {Colors.CYAN}{'─' * width}{Colors.NC}")
    print(f"  {Colors.CYAN}  {msg}{Colors.NC}")
    print(f"  {Colors.CYAN}{'─' * width}{Colors.NC}")
    print()


def prompt(msg):
    return input(f"  {Colors.YELLOW}{msg}{Colors.NC} ").strip()


def confirm(msg):
    return prompt(f"{msg} [y/N]:").lower() == 'y'


def pause():
    input(f"\n  {Colors.DIM}Press Enter to continue...{Colors.NC}")


def menu_option(key, label, description=""):
    if description:
        print(f"    {Colors.GREEN}[{key}]{Colors.NC}  {label:<28} {Colors.DIM}{description}{Colors.NC}")
    else:
        print(f"    {Colors.GREEN}[{key}]{Colors.NC}  {label}")


def get_project_root():
    return str(Path(__file__).resolve().parent.parent)


# ==========================================
# Config
# ==========================================

CONFIG_FILE = os.path.join(get_project_root(), '.deploy.json')
DEFAULT_CONFIG = {
    'server_host': '',
    'server_user': 'root',
    'server_path': '/opt/teboraw',
    'domain': '',
    'compose_file': 'docker-compose.prod.yml',
}


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            stored = json.load(f)
            return {**DEFAULT_CONFIG, **stored}
    return dict(DEFAULT_CONFIG)


def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    print_success("Config saved to .deploy.json")


def ensure_config(config):
    if not config['server_host']:
        print_warn("No server configured yet.")
        host = prompt("Enter server IP or hostname:")
        if not host:
            print_error("Server host is required.")
            sys.exit(1)
        config['server_host'] = host
        save_config(config)
    return config


def ssh_target(config):
    return f"{config['server_user']}@{config['server_host']}"


def remote_cmd(config, cmd):
    return ['ssh', ssh_target(config), cmd]


def run(cmd, cwd=None, capture=False, check=True):
    try:
        if capture:
            result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        else:
            result = subprocess.run(cmd, cwd=cwd)
        if check and result.returncode != 0:
            return None
        return result
    except FileNotFoundError:
        print_error(f"Command not found: {cmd[0]}")
        return None
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {e}")
        return None


def run_remote(config, cmd, check=True):
    return run(remote_cmd(config, cmd), check=check)


def config_summary(config):
    """Print a one-line config summary for the menu header."""
    host = config.get('server_host') or '(not set)'
    domain = config.get('domain') or '(not set)'
    return f"Server: {host}  |  Domain: {domain}"


# ==========================================
# Server Setup / Provisioning
# ==========================================

def cmd_setup(args, config):
    """Provision a fresh droplet with Docker, firewall, swap."""
    config = ensure_config(config)
    target = ssh_target(config)
    server_path = config['server_path']

    print_header("Server Provisioning")
    print_info(f"Target: {target}")
    print()

    steps = [
        ("Update system packages", "apt update && DEBIAN_FRONTEND=noninteractive apt upgrade -y"),
        ("Install Docker", "curl -fsSL https://get.docker.com | sh"),
        ("Install Docker Compose plugin", "apt install -y docker-compose-plugin"),
        ("Create app directory", f"mkdir -p {server_path}/apps/web && mkdir -p {server_path}/apps/api"),
        ("Configure firewall",
         "ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && echo 'y' | ufw enable"),
        ("Add 2GB swap",
         "if [ ! -f /swapfile ]; then "
         "fallocate -l 2G /swapfile && chmod 600 /swapfile && "
         "mkswap /swapfile && swapon /swapfile && "
         "echo '/swapfile none swap sw 0 0' >> /etc/fstab && "
         "echo 'Swap created'; else echo 'Swap already exists'; fi"),
    ]

    for i, (desc, cmd) in enumerate(steps, 1):
        print(f"  {Colors.CYAN}[{i}/{len(steps)}]{Colors.NC} {desc}...")
        result = run_remote(config, cmd, check=False)
        if result and result.returncode == 0:
            print_success(f"  {desc}")
        else:
            print_warn(f"  {desc} - may have issues, continuing...")
        print()

    # Push .env file if it exists
    project_root = get_project_root()
    env_file = os.path.join(project_root, '.env.production.local')
    if os.path.exists(env_file):
        print_step("Uploading .env.production.local -> .env")
        run(['scp', env_file, f'{target}:{server_path}/.env'])
        run_remote(config, f'chmod 600 {server_path}/.env')
        print_success(".env file deployed")
    else:
        print_warn("No .env.production.local found - create one and re-run setup")

    print()
    print(f"  {Colors.CYAN}{'=' * 40}{Colors.NC}")
    print_success("Server provisioning complete!")
    print(f"  {Colors.CYAN}{'=' * 40}{Colors.NC}")
    print()
    print_info("Next steps:")
    print_info("  1. Deploy:  python scripts/deploy.py deploy")
    print_info("  2. Migrate: python scripts/deploy.py migrate")


def cmd_setup_caddy(args, config):
    """Install and configure Caddy on the server."""
    config = ensure_config(config)

    if not config.get('domain'):
        domain = prompt("Enter your domain (e.g., teboraw.com):")
        if not domain:
            print_error("Domain is required for Caddy setup.")
            return
        config['domain'] = domain
        save_config(config)

    domain = config['domain']
    print_header(f"Caddy Setup for {domain}")

    caddy_install = (
        "apt install -y debian-keyring debian-archive-keyring apt-transport-https curl && "
        "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | "
        "gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null && "
        "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | "
        "tee /etc/apt/sources.list.d/caddy-stable.list && "
        "apt update && apt install caddy -y"
    )

    caddyfile = (
        f'{domain} {{\n'
        f'    reverse_proxy localhost:5173\n'
        f'}}\n\n'
        f'www.{domain} {{\n'
        f'    redir https://{domain}{{uri}}\n'
        f'}}'
    )

    print_step("Installing Caddy...")
    run_remote(config, caddy_install, check=False)

    print_step("Writing Caddyfile...")
    escaped = caddyfile.replace("'", "'\\''")
    run_remote(config, f"echo '{escaped}' > /etc/caddy/Caddyfile")

    print_step("Restarting Caddy...")
    run_remote(config, "systemctl restart caddy")

    print()
    print_success(f"Caddy configured for {domain}")
    print_info("SSL will be auto-provisioned by Let's Encrypt")
    print_info("Make sure your DNS A records point to this server")


def cmd_setup_env(args, config):
    """Push the .env.production.local file to the server."""
    config = ensure_config(config)
    project_root = get_project_root()
    env_file = os.path.join(project_root, '.env.production.local')

    if not os.path.exists(env_file):
        print_error(".env.production.local not found in project root")
        return

    target = ssh_target(config)
    server_path = config['server_path']

    print_step("Uploading .env.production.local -> server .env")
    result = run(['scp', env_file, f'{target}:{server_path}/.env'])
    if result:
        run_remote(config, f'chmod 600 {server_path}/.env')
        print_success(".env file deployed and secured")
    else:
        print_error("Failed to upload .env file")


# ==========================================
# Build
# ==========================================

def cmd_build(args, config):
    """Build Docker images locally for linux/amd64 (Digital Ocean)."""
    project_root = get_project_root()
    services = getattr(args, 'services', None) or ['api', 'web']

    for service in services:
        if service == 'api':
            print_step("Building API image (linux/amd64)...")
            result = run(['docker', 'build', '--platform', 'linux/amd64',
                          '-t', 'teboraw-api:latest', './apps/api'],
                         cwd=project_root)
            if result is None:
                print_error("API build failed")
                sys.exit(1)
            print_success("API image built")

        elif service == 'web':
            print_step("Building Web image (linux/amd64)...")
            result = run(['docker', 'build', '--platform', 'linux/amd64',
                          '-t', 'teboraw-web:latest',
                          '--build-arg', 'VITE_API_URL=/api', './apps/web'],
                         cwd=project_root)
            if result is None:
                print_error("Web build failed")
                sys.exit(1)
            print_success("Web image built")

        else:
            print_warn(f"Unknown service: {service}")

    print()
    print_success("All images built successfully")


# ==========================================
# Push
# ==========================================

def cmd_push(args, config):
    """Push Docker images to the server."""
    config = ensure_config(config)
    project_root = get_project_root()
    target = ssh_target(config)
    server_path = config['server_path']
    services = getattr(args, 'services', None) or ['api', 'web']

    image_map = {'api': 'teboraw-api', 'web': 'teboraw-web'}

    for service in services:
        image_name = image_map.get(service)
        if not image_name:
            print_warn(f"Unknown service: {service}")
            continue

        tar_file = f"{image_name}.tar.gz"
        tar_path = os.path.join(project_root, tar_file)

        result = run(['docker', 'image', 'inspect', f'{image_name}:latest'],
                     capture=True, check=False)
        if result is None or result.returncode != 0:
            print_error(f"Image {image_name}:latest not found. Build first.")
            sys.exit(1)

        print_step(f"Saving {image_name} image...")
        result = run(['sh', '-c', f'docker save {image_name}:latest | gzip > {tar_file}'],
                     cwd=project_root)
        if result is None:
            print_error(f"Failed to save {image_name}")
            sys.exit(1)

        size_mb = os.path.getsize(tar_path) / (1024 * 1024)
        print_info(f"Image size: {size_mb:.1f} MB")

        print_step(f"Uploading {image_name} to server...")
        result = run(['scp', '-C', tar_path, f'{target}:{server_path}/{tar_file}'])
        if result is None:
            print_error(f"Failed to upload {image_name}")
            sys.exit(1)

        print_step(f"Loading {image_name} on server...")
        result = run_remote(config, f'cd {server_path} && docker load < {tar_file} && rm {tar_file}')
        if result is None:
            print_error(f"Failed to load {image_name} on server")
            sys.exit(1)

        os.remove(tar_path)
        print_success(f"{image_name} pushed to server")
        print()

    print_success("All images pushed")


# ==========================================
# Deploy (full pipeline)
# ==========================================

def cmd_deploy(args, config):
    """Full deploy: build, push, restart."""
    config = ensure_config(config)
    server_path = config['server_path']
    project_root = get_project_root()

    print_banner()

    print(f"\n{Colors.CYAN}[1/4] Building images locally{Colors.NC}")
    print(f"{Colors.CYAN}{'─' * 40}{Colors.NC}\n")
    cmd_build(args, config)

    print(f"\n{Colors.CYAN}[2/4] Pushing images to server{Colors.NC}")
    print(f"{Colors.CYAN}{'─' * 40}{Colors.NC}\n")
    cmd_push(args, config)

    print(f"\n{Colors.CYAN}[3/4] Syncing configuration{Colors.NC}")
    print(f"{Colors.CYAN}{'─' * 40}{Colors.NC}\n")

    target = ssh_target(config)
    compose_file = config['compose_file']
    compose_path = os.path.join(project_root, compose_file)

    if os.path.exists(compose_path):
        print_step(f"Uploading {compose_file}...")
        run(['scp', compose_path, f'{target}:{server_path}/docker-compose.yml'])
        print_success("Compose file synced")
    else:
        print_warn(f"{compose_file} not found, skipping sync")

    nginx_path = os.path.join(project_root, 'apps', 'web', 'nginx.conf')
    if os.path.exists(nginx_path):
        run(['scp', nginx_path, f'{target}:{server_path}/apps/web/nginx.conf'], check=False)

    print(f"\n{Colors.CYAN}[4/4] Restarting services{Colors.NC}")
    print(f"{Colors.CYAN}{'─' * 40}{Colors.NC}\n")

    print_step("Restarting Docker services on server...")
    result = run_remote(config, f'cd {server_path} && docker compose down && docker compose up -d')
    if result is None:
        print_error("Failed to restart services")
        sys.exit(1)

    print_step("Waiting for services to start...")
    time.sleep(10)

    print_step("Checking service health...")
    run_remote(config, f'cd {server_path} && docker compose ps')

    print()
    print(f"  {Colors.CYAN}{'=' * 40}{Colors.NC}")
    print_success("Deployment complete!")
    print(f"  {Colors.CYAN}{'=' * 40}{Colors.NC}")
    print()
    print_info(f"Server: {config['server_host']}")
    if config.get('domain'):
        print_info(f"Site:   https://{config['domain']}")
    print()


# ==========================================
# Migrate
# ==========================================

def cmd_migrate(args, config):
    """Run EF Core migrations on the server."""
    config = ensure_config(config)
    server_path = config['server_path']
    project_root = get_project_root()
    target = ssh_target(config)

    print_step("Running EF Core migrations on server...")
    print_info("Using temporary SDK container...")

    print_step("Syncing API source for migrations...")
    run(['rsync', '-avz', '--progress',
         '--exclude', 'bin', '--exclude', 'obj',
         os.path.join(project_root, 'apps', 'api') + '/',
         f'{target}:{server_path}/apps/api/'])

    migrate_cmd = (
        f'cd {server_path} && '
        f'docker run --rm '
        f'--network teboraw-network '
        f'-v {server_path}/apps/api:/src '
        f'-w /src '
        f'-e "ConnectionStrings__DefaultConnection='
        f'Host=teboraw-postgres;Port=5432;'
        f'Database=${{POSTGRES_DB:-teboraw}};'
        f'Username=${{POSTGRES_USER:-teboraw}};'
        f'Password=${{POSTGRES_PASSWORD:-teboraw_dev}}" '
        f'mcr.microsoft.com/dotnet/sdk:8.0 '
        f'bash -c "'
        f'dotnet tool install --global dotnet-ef && '
        f'export PATH=\\"\\$PATH:/root/.dotnet/tools\\" && '
        f'dotnet ef database update '
        f'--project Teboraw.Infrastructure '
        f'--startup-project Teboraw.Api'
        f'"'
    )

    full_cmd = f'cd {server_path} && set -a && source .env 2>/dev/null; set +a && {migrate_cmd}'
    result = run_remote(config, full_cmd)
    if result is None:
        print_error("Migration failed")
        print_info("Check logs: python scripts/deploy.py logs api")
        sys.exit(1)

    print_success("Migrations applied successfully")


# ==========================================
# Logs
# ==========================================

def cmd_logs(args, config):
    """View logs from the server."""
    config = ensure_config(config)
    server_path = config['server_path']
    services = getattr(args, 'services', None)
    service = services[0] if services else None
    tail = getattr(args, 'tail', '100') or '100'

    if service:
        cmd = f'cd {server_path} && docker compose logs -f --tail={tail} {service}'
    else:
        cmd = f'cd {server_path} && docker compose logs -f --tail={tail}'

    print_step(f"Streaming logs from {config['server_host']}...")
    print_info("Press Ctrl+C to stop\n")

    try:
        subprocess.run(['ssh', '-t', ssh_target(config), cmd])
    except KeyboardInterrupt:
        print()


# ==========================================
# Status
# ==========================================

def cmd_status(args, config):
    """Check service status on the server."""
    config = ensure_config(config)
    server_path = config['server_path']

    print_header(f"Server Status: {config['server_host']}")

    print_step("Services:")
    run_remote(config, f'cd {server_path} && docker compose ps')

    print()
    print_step("Disk:")
    run_remote(config, "df -h / | tail -1")

    print()
    print_step("Memory:")
    run_remote(config, "free -h | head -2")

    print()
    print_step("Docker disk:")
    run_remote(config, "docker system df")

    print()
    print_step("Caddy status:")
    run_remote(config, "systemctl is-active caddy 2>/dev/null && echo 'Caddy: running' || echo 'Caddy: not running'", check=False)

    print()
    print_step("Swap:")
    run_remote(config, "swapon --show 2>/dev/null || echo 'No swap configured'", check=False)


# ==========================================
# SSH
# ==========================================

def cmd_ssh(args, config):
    """SSH into the server."""
    config = ensure_config(config)
    print_step(f"Connecting to {config['server_host']}...")
    os.execvp('ssh', ['ssh', ssh_target(config)])


# ==========================================
# Backup
# ==========================================

def cmd_backup(args, config):
    """Backup the production database."""
    config = ensure_config(config)
    project_root = get_project_root()
    server_path = config['server_path']
    target = ssh_target(config)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_name = f"teboraw_backup_{timestamp}.sql"
    backup_dir = os.path.join(project_root, 'backups')
    os.makedirs(backup_dir, exist_ok=True)

    print_step("Creating database backup on server...")
    result = run_remote(config,
                        f'cd {server_path} && docker compose exec -T postgres '
                        f'pg_dump -U teboraw teboraw > /tmp/{backup_name}')
    if result is None:
        print_error("Backup failed")
        sys.exit(1)

    print_step("Downloading backup...")
    local_path = os.path.join(backup_dir, backup_name)
    result = run(['scp', f'{target}:/tmp/{backup_name}', local_path])
    if result is None:
        print_error("Download failed")
        sys.exit(1)

    run_remote(config, f'rm /tmp/{backup_name}', check=False)

    size_mb = os.path.getsize(local_path) / (1024 * 1024)
    print_success(f"Backup saved: backups/{backup_name} ({size_mb:.1f} MB)")


# ==========================================
# Restart
# ==========================================

def cmd_restart(args, config):
    """Restart services on the server without rebuilding."""
    config = ensure_config(config)
    server_path = config['server_path']
    services = getattr(args, 'services', None)

    if services:
        svc = ' '.join(services)
        print_step(f"Restarting {svc}...")
        run_remote(config, f'cd {server_path} && docker compose restart {svc}')
    else:
        print_step("Restarting all services...")
        run_remote(config, f'cd {server_path} && docker compose restart')

    print_success("Services restarted")
    print()
    run_remote(config, f'cd {server_path} && docker compose ps')


# ==========================================
# SSH Agent
# ==========================================

def cmd_ssh_agent(args, config):
    """Add SSH key to ssh-agent to cache passphrase."""
    print_header("SSH Agent Setup")
    print_info("This will start ssh-agent and add your key so you only enter the passphrase once.")
    print()

    # Check if ssh-agent is already running
    ssh_auth_sock = os.environ.get('SSH_AUTH_SOCK')
    if ssh_auth_sock and os.path.exists(ssh_auth_sock):
        print_info("ssh-agent is already running")
    else:
        print_step("Starting ssh-agent...")
        result = subprocess.run(['ssh-agent', '-s'], capture_output=True, text=True)
        if result.returncode == 0:
            # Parse and set environment variables
            for line in result.stdout.split('\n'):
                if line.startswith('SSH_AUTH_SOCK='):
                    sock = line.split('=')[1].split(';')[0]
                    os.environ['SSH_AUTH_SOCK'] = sock
                elif line.startswith('SSH_AGENT_PID='):
                    pid = line.split('=')[1].split(';')[0]
                    os.environ['SSH_AGENT_PID'] = pid
            print_success("ssh-agent started")
        else:
            print_error("Failed to start ssh-agent")
            return

    # Add the key
    key_path = os.path.expanduser('~/.ssh/id_ed25519')
    if not os.path.exists(key_path):
        key_path = os.path.expanduser('~/.ssh/id_rsa')
        if not os.path.exists(key_path):
            print_error("No SSH key found at ~/.ssh/id_ed25519 or ~/.ssh/id_rsa")
            return

    print_step(f"Adding key: {key_path}")
    print_info("You will be prompted for your passphrase...")
    print()

    # Use --apple-use-keychain on macOS for persistent storage
    if platform.system() == 'Darwin':
        result = subprocess.run(['ssh-add', '--apple-use-keychain', key_path])
        if result.returncode == 0:
            print()
            print_success("Key added to ssh-agent and macOS Keychain")
            print_info("Your passphrase is now saved permanently")
    else:
        result = subprocess.run(['ssh-add', key_path])
        if result.returncode == 0:
            print()
            print_success("Key added to ssh-agent")
            print_info("Passphrase cached for this session")


# ==========================================
# Config
# ==========================================

def cmd_config(args, config):
    """Show or update deploy configuration."""
    services = getattr(args, 'services', None)

    if services:
        if len(services) >= 2:
            key, value = services[0], services[1]
            if key in DEFAULT_CONFIG:
                config[key] = value
                save_config(config)
                print_success(f"Set {key} = {value}")
            else:
                print_error(f"Unknown key: {key}")
                print_info(f"Available: {', '.join(DEFAULT_CONFIG.keys())}")
        else:
            key = services[0]
            if key in config:
                print(f"  {key} = {config[key]}")
            else:
                print_error(f"Unknown key: {key}")
    else:
        print_header("Deploy Configuration")
        for key, value in config.items():
            display = value if value else f"{Colors.DIM}(not set){Colors.NC}"
            print(f"    {Colors.BLUE}{key:<20}{Colors.NC} {display}")
        print()
        print_info("Set a value: python scripts/deploy.py config <key> <value>")


# ==========================================
# Interactive Menu
# ==========================================

def select_service():
    """Prompt user to pick a service."""
    print()
    menu_option("1", "api")
    menu_option("2", "web")
    menu_option("3", "All services")
    menu_option("b", "Back")

    choice = prompt(">")
    if choice == '1':
        return ['api']
    elif choice == '2':
        return ['web']
    elif choice == '3':
        return ['api', 'web']
    return None


def interactive_config(config):
    """Interactive config editor."""
    while True:
        clear_screen()
        print_header("Configuration")

        keys = list(DEFAULT_CONFIG.keys())
        for i, key in enumerate(keys, 1):
            value = config.get(key) or f"{Colors.DIM}(not set){Colors.NC}"
            menu_option(str(i), key, str(value) if config.get(key) else "")

        print()
        menu_option("b", "Back")
        print()

        choice = prompt(">")
        if choice == 'b':
            return

        try:
            idx = int(choice) - 1
            if 0 <= idx < len(keys):
                key = keys[idx]
                current = config.get(key, '')
                print(f"\n    Current: {current or '(not set)'}")
                new_val = prompt(f"  New value for {key}:")
                if new_val:
                    config[key] = new_val
                    save_config(config)
        except (ValueError, IndexError):
            pass


def interactive_logs(config):
    """Interactive log viewer with service selection."""
    print()
    menu_option("1", "All services")
    menu_option("2", "API")
    menu_option("3", "Web")
    menu_option("4", "PostgreSQL")
    menu_option("5", "Redis")
    menu_option("6", "Caddy (system)")
    menu_option("b", "Back")
    print()

    choice = prompt(">")
    server_path = config['server_path']

    service_map = {
        '1': None, '2': 'api', '3': 'web',
        '4': 'postgres', '5': 'redis',
    }

    if choice == '6':
        print_step("Streaming Caddy logs...")
        print_info("Press Ctrl+C to stop\n")
        try:
            subprocess.run(['ssh', '-t', ssh_target(config),
                            'journalctl -u caddy -f --no-pager -n 100'])
        except KeyboardInterrupt:
            pass
        return
    elif choice == 'b':
        return

    service = service_map.get(choice)
    if choice not in service_map:
        return

    if service:
        cmd = f'cd {server_path} && docker compose logs -f --tail=100 {service}'
    else:
        cmd = f'cd {server_path} && docker compose logs -f --tail=100'

    print_step(f"Streaming logs...")
    print_info("Press Ctrl+C to stop\n")
    try:
        subprocess.run(['ssh', '-t', ssh_target(config), cmd])
    except KeyboardInterrupt:
        pass


def interactive_menu():
    """Main interactive menu loop."""
    config = load_config()
    dummy_args = argparse.Namespace(services=None, tail='100')

    while True:
        clear_screen()
        print_banner()

        # Status bar
        host = config.get('server_host')
        domain = config.get('domain')
        if host:
            print(f"    {Colors.DIM}Server:{Colors.NC} {Colors.GREEN}{host}{Colors.NC}", end="")
            if domain:
                print(f"  {Colors.DIM}|  Domain:{Colors.NC} {Colors.GREEN}{domain}{Colors.NC}", end="")
            print()
        else:
            print(f"    {Colors.YELLOW}No server configured - start with Setup{Colors.NC}")
        print()

        # Server Setup
        print(f"  {Colors.BOLD}Server Setup{Colors.NC}")
        menu_option("1", "Provision droplet",       "Install Docker, firewall, swap")
        menu_option("2", "Setup Caddy + SSL",        "Install Caddy, configure domain")
        menu_option("3", "Push .env to server",      "Upload .env.production.local")
        print()

        # Deploy
        print(f"  {Colors.BOLD}Deploy{Colors.NC}")
        menu_option("4", "Full deploy",              "Build + push + restart")
        menu_option("5", "Build images only",        "Build Docker images locally")
        menu_option("6", "Push images only",         "Upload images to server")
        menu_option("7", "Run migrations",           "EF Core database update")
        print()

        # Monitor
        print(f"  {Colors.BOLD}Monitor{Colors.NC}")
        menu_option("8", "Server status",            "Services, disk, memory")
        menu_option("9", "View logs",                "Stream service logs")
        menu_option("0", "Restart services",         "Restart without rebuilding")
        print()

        # Manage
        print(f"  {Colors.BOLD}Manage{Colors.NC}")
        menu_option("a", "Add SSH key to agent",     "Cache passphrase (enter once)")
        menu_option("b", "Database backup",          "Download a DB backup")
        menu_option("s", "SSH into server",          "Open shell")
        menu_option("c", "Configuration",            "Edit deploy settings")
        print()

        menu_option("q", "Quit")
        print()

        choice = prompt(">")

        if choice == 'q':
            print()
            break

        elif choice == '1':
            cmd_setup(dummy_args, config)
            pause()

        elif choice == '2':
            cmd_setup_caddy(dummy_args, config)
            config = load_config()
            pause()

        elif choice == '3':
            cmd_setup_env(dummy_args, config)
            pause()

        elif choice == '4':
            svc = select_service()
            if svc:
                dummy_args.services = svc
                cmd_deploy(dummy_args, config)
                dummy_args.services = None
                pause()

        elif choice == '5':
            svc = select_service()
            if svc:
                dummy_args.services = svc
                cmd_build(dummy_args, config)
                dummy_args.services = None
                pause()

        elif choice == '6':
            svc = select_service()
            if svc:
                dummy_args.services = svc
                cmd_push(dummy_args, config)
                dummy_args.services = None
                pause()

        elif choice == '7':
            cmd_migrate(dummy_args, config)
            pause()

        elif choice == '8':
            cmd_status(dummy_args, config)
            pause()

        elif choice == '9':
            config = ensure_config(config)
            interactive_logs(config)

        elif choice == '0':
            svc = select_service()
            if svc:
                dummy_args.services = svc
                cmd_restart(dummy_args, config)
                dummy_args.services = None
                pause()

        elif choice == 'a':
            cmd_ssh_agent(dummy_args, config)
            pause()

        elif choice == 'b':
            config = ensure_config(config)
            cmd_backup(dummy_args, config)
            pause()

        elif choice == 's':
            cmd_ssh(dummy_args, config)

        elif choice == 'c':
            interactive_config(config)
            config = load_config()


# ==========================================
# Main
# ==========================================

def main():
    Colors.init()

    # No arguments -> interactive menu
    if len(sys.argv) == 1:
        try:
            interactive_menu()
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}Interrupted{Colors.NC}")
        return

    # CLI mode
    parser = argparse.ArgumentParser(
        description='Teboraw 2.0 - Production Deploy Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Commands:
  setup              Provision a fresh droplet
  setup-caddy        Install Caddy + configure domain
  setup-env          Push .env file to server
  build              Build Docker images locally
  push               Push images to server
  deploy             Full pipeline: build + push + restart
  migrate            Run EF Core database migrations
  logs [service]     Stream logs from server
  status             Check server health
  restart [service]  Restart services
  ssh                Open SSH session
  ssh-agent          Add SSH key to agent (cache passphrase)
  backup             Download a database backup
  config [key val]   Show or set configuration

Run without arguments for interactive menu.
        '''
    )

    parser.add_argument('command', choices=[
        'setup', 'setup-caddy', 'setup-env',
        'build', 'push', 'deploy', 'migrate',
        'logs', 'status', 'restart', 'ssh', 'ssh-agent', 'backup', 'config'
    ], help='Command to run')
    parser.add_argument('services', nargs='*', help='Services to target (api, web)')
    parser.add_argument('--tail', default='100', help='Number of log lines (default: 100)')

    args = parser.parse_args()
    config = load_config()

    commands = {
        'setup': cmd_setup,
        'setup-caddy': cmd_setup_caddy,
        'setup-env': cmd_setup_env,
        'build': cmd_build,
        'push': cmd_push,
        'deploy': cmd_deploy,
        'migrate': cmd_migrate,
        'logs': cmd_logs,
        'status': cmd_status,
        'restart': cmd_restart,
        'ssh': cmd_ssh,
        'ssh-agent': cmd_ssh_agent,
        'backup': cmd_backup,
        'config': cmd_config,
    }

    try:
        commands[args.command](args, config)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Interrupted{Colors.NC}")
        sys.exit(1)


if __name__ == '__main__':
    main()
