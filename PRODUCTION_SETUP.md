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

### From your local machine:

```bash
# Navigate to project root
cd /path/to/Teborraw2.0

# Copy project files to server (excludes node_modules, .git, etc.)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env*.local' \
  --exclude '*.log' \
  ./ root@YOUR_DROPLET_IP:/opt/teboraw/

# Copy production environment file
scp .env.production.local root@YOUR_DROPLET_IP:/opt/teboraw/.env
```

### On the server:

```bash
ssh root@YOUR_DROPLET_IP

cd /opt/teboraw

# Secure the env file
chmod 600 .env

# Build and start all services
docker compose up -d --build

# Verify services are running
docker compose ps

# Check logs if needed
docker compose logs -f
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
    reverse_proxy localhost:80
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
