# Teboraw Production Deployment Guide

Deploy Teboraw to a Digital Ocean droplet running Docker Compose.

**Estimated Cost:** $12/month (2GB RAM droplet)

---

## Prerequisites

- Digital Ocean account
- Domain name (optional but recommended)
- SSH key on your local machine

---

## Step 1: Create a Droplet

1. Log into [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **Create** → **Droplets**
3. Configure:

| Setting | Value |
|---------|-------|
| Region | Closest to your users |
| Image | Ubuntu 24.04 (LTS) x64 |
| Droplet Type | Basic (Shared CPU) |
| CPU | Regular SSD |
| Size | $12/mo (2GB RAM / 1 CPU) |
| Authentication | SSH Key |
| Hostname | `teboraw-prod` |

4. Click **Create Droplet**
5. Note the IP address once created

---

## Step 2: SSH Key Setup (if needed)

Check if you have an SSH key:

```bash
cat ~/.ssh/id_ed25519.pub || cat ~/.ssh/id_rsa.pub
```

If not, generate one:

```bash
ssh-keygen -t ed25519 -C "your@email.com"
cat ~/.ssh/id_ed25519.pub
```

Add the public key to Digital Ocean during droplet creation.

---

## Step 3: Initial Server Setup

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Run the setup commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Create app user (security best practice)
adduser --disabled-password --gecos "" teboraw
usermod -aG docker teboraw

# Create app directory
mkdir -p /opt/teboraw
chown teboraw:teboraw /opt/teboraw
```

---

## Step 4: Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Type `y` when prompted.

---

## Step 5: Deploy Application

### Option A: Deploy Script (Recommended)

Images are built locally and pushed to the server. No SDK needed on the droplet.

```bash
# First time: configure your server
python scripts/deploy.py config server_host YOUR_DROPLET_IP

# Copy your .env to the server
scp .env.production.local root@YOUR_DROPLET_IP:/opt/teboraw/.env
ssh root@YOUR_DROPLET_IP "chmod 600 /opt/teboraw/.env"

# Full deploy (build + push + restart)
python scripts/deploy.py deploy

# Or via pnpm
pnpm deploy
```

See [Deploy CLI Reference](#deploy-cli-reference) for all commands.

### Option B: Manual Deploy

```bash
# Copy project files to server
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env*.local' \
  --exclude '*.log' \
  ./ root@YOUR_DROPLET_IP:/opt/teboraw/

# Copy production environment file
scp .env.production.local root@YOUR_DROPLET_IP:/opt/teboraw/.env

# On the server: build and start
ssh root@YOUR_DROPLET_IP "cd /opt/teboraw && chmod 600 .env && docker compose up -d --build"
```

---

## Step 6: Domain & SSL Setup (Optional)

### Point your domain (Squarespace Domains)

1. **Log into Squarespace**
   - Go to [account.squarespace.com](https://account.squarespace.com)
   - Click **Domains** in the left sidebar

2. **Select your domain**
   - Click on the domain you want to configure

3. **Open DNS Settings**
   - Click **DNS** in the left sidebar
   - Click **DNS Settings**

4. **Remove default records (if needed)**
   - If there are existing A records pointing elsewhere, delete them
   - Keep any MX records if you use Squarespace/Google email

5. **Add A Records**

   Click **Add Record** and create these two records:

   | Field | First Record | Second Record |
   |-------|--------------|---------------|
   | **Type** | A | A |
   | **Host** | @ | www |
   | **Data** | YOUR_DROPLET_IP | YOUR_DROPLET_IP |
   | **TTL** | 1 hour (default) | 1 hour (default) |

   **Example:** If your droplet IP is `164.92.105.42`:

   ```
   Type: A    Host: @     Data: 164.92.105.42
   Type: A    Host: www   Data: 164.92.105.42
   ```

6. **Save and wait**
   - Click **Save** for each record
   - DNS propagation takes 5 minutes to 48 hours (usually under 30 min)

7. **Verify DNS propagation**

   From your local machine:
   ```bash
   # Check if DNS is pointing to your server
   dig +short yourdomain.com
   dig +short www.yourdomain.com

   # Should return your droplet IP
   ```

   Or use [dnschecker.org](https://dnschecker.org) to check global propagation.

**Note:** Squarespace may show a warning that your domain isn't connected to a Squarespace site. This is expected - you're pointing it to your own server.

### Install Caddy for automatic HTTPS

On the server:

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy -y

# Create Caddy config
cat > /etc/caddy/Caddyfile << 'EOF'
yourdomain.com {
    reverse_proxy localhost:5173
}

www.yourdomain.com {
    redir https://yourdomain.com{uri}
}
EOF

# Restart Caddy
systemctl restart caddy
```

Caddy automatically provisions and renews SSL certificates.

---

## Useful Commands

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

### Restart services

```bash
docker compose restart

# Or specific service
docker compose restart api
```

### Update deployment

From local machine:

```bash
# Sync changes
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env*.local' \
  ./ root@YOUR_DROPLET_IP:/opt/teboraw/

# On server: rebuild and restart
ssh root@YOUR_DROPLET_IP "cd /opt/teboraw && docker compose up -d --build"
```

### Database backup

```bash
# Create backup
docker compose exec postgres pg_dump -U teboraw teboraw > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -T postgres psql -U teboraw teboraw < backup_20260127.sql
```

### Access database directly

```bash
docker compose exec postgres psql -U teboraw teboraw
```

---

## Caddy (Reverse Proxy & SSL)

### View Caddy logs

```bash
# Live log stream
journalctl -u caddy -f

# Last 100 lines
journalctl -u caddy -n 100

# Logs from today only
journalctl -u caddy --since today

# Filter for errors only
journalctl -u caddy -p err
```

### Caddy service management

```bash
# Check status
systemctl status caddy

# Restart
systemctl restart caddy

# Stop
systemctl stop caddy

# Start
systemctl start caddy

# Reload config without downtime
systemctl reload caddy
```

### Validate Caddyfile

```bash
# Check for syntax errors before reloading
caddy validate --config /etc/caddy/Caddyfile

# Format the Caddyfile (auto-fix indentation)
caddy fmt --overwrite /etc/caddy/Caddyfile
```

### View/edit the Caddyfile

```bash
# View current config
cat /etc/caddy/Caddyfile

# Edit
nano /etc/caddy/Caddyfile

# After editing, always reload
systemctl reload caddy
```

### SSL certificate status

```bash
# List all managed certificates
caddy list-modules 2>&1 | grep tls

# Certificates are stored at:
ls /var/lib/caddy/.local/share/caddy/certificates/
```

### Common Caddy issues

**ERR_TOO_MANY_REDIRECTS:**
The `reverse_proxy` target port must match the Docker host port, not the container's internal port. Check `docker compose ps` for the host port mapping and update the Caddyfile accordingly.

```bash
# Verify which port the web container is exposed on
docker compose ps web

# The Caddyfile should proxy to that host port (e.g., 5173)
```

**SSL certificate not provisioning:**
Caddy auto-provisions Let's Encrypt certificates, but needs port 80 and 443 open.

```bash
# Verify firewall allows HTTP/HTTPS
ufw status

# Check Caddy can reach Let's Encrypt
journalctl -u caddy | grep -i "certificate\|tls\|acme"
```

**502 Bad Gateway:**
The upstream service (Docker) isn't responding.

```bash
# Check if Docker services are running
docker compose ps

# Check if the web container is healthy
docker compose logs --tail=20 web

# Test the upstream directly
curl -I http://localhost:5173
```

---

## Troubleshooting

### Services not starting

```bash
# Check service status
docker compose ps

# View detailed logs
docker compose logs --tail=100 api
```

### Port already in use

```bash
# Find what's using the port
lsof -i :80
```

### Out of memory

Consider upgrading to a larger droplet, or add swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Database connection issues

```bash
# Verify postgres is healthy
docker compose exec postgres pg_isready -U teboraw

# Check connection string in API logs
docker compose logs api | grep -i connection
```

---

## Deploy CLI Reference

The deploy script builds images locally and pushes them to your server, keeping the droplet lightweight.

### First-time setup

```bash
# Configure your server IP
python scripts/deploy.py config server_host YOUR_DROPLET_IP
```

### Commands

| Command | Description |
|---------|-------------|
| `python scripts/deploy.py deploy` | Full pipeline: build + push + restart |
| `python scripts/deploy.py build` | Build Docker images locally |
| `python scripts/deploy.py push` | Push built images to server |
| `python scripts/deploy.py deploy api` | Deploy only the API |
| `python scripts/deploy.py deploy web` | Deploy only the web frontend |
| `python scripts/deploy.py migrate` | Run EF Core migrations on server |
| `python scripts/deploy.py logs` | Stream all logs from server |
| `python scripts/deploy.py logs api` | Stream API logs |
| `python scripts/deploy.py status` | Check services, disk, memory usage |
| `python scripts/deploy.py ssh` | SSH into the server |
| `python scripts/deploy.py backup` | Download a database backup |
| `python scripts/deploy.py config` | Show deploy configuration |

### pnpm shortcuts

| Command | Description |
|---------|-------------|
| `pnpm deploy` | Full deploy |
| `pnpm deploy:build` | Build images |
| `pnpm deploy:push` | Push images |
| `pnpm deploy:status` | Check server status |
| `pnpm deploy:logs` | Stream server logs |
| `pnpm deploy:migrate` | Run migrations |
| `pnpm deploy:backup` | Download DB backup |

---

## Security Checklist

- [ ] SSH key authentication enabled (password auth disabled)
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] `.env` file has secure passwords
- [ ] `.env` file permissions set to 600
- [ ] Regular database backups scheduled
- [ ] SSL/HTTPS enabled via Caddy

---

## Cost Summary

| Resource | Monthly Cost |
|----------|-------------|
| Droplet (2GB RAM) | $12 |
| Domain (optional) | ~$1 |
| SSL Certificate | Free (Caddy/Let's Encrypt) |
| **Total** | **~$12-13/month** |

