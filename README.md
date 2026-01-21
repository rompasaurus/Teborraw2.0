# Teboraw 2.0

A comprehensive self-hosted personal activity tracking platform that captures browsing history, desktop activity, GPS location, and ambient audio with transcription.

---

## Prerequisites & System Requirements

### Required Software

Before running Teboraw 2.0, ensure you have the following installed:

| Software | Minimum Version | Recommended Version | Installation |
|----------|-----------------|---------------------|--------------|
| **Node.js** | 18.12+ | 20.x LTS | Via nvm (see below) |
| **pnpm** | 9.0+ | Latest | `npm install -g pnpm` |
| **.NET SDK** | 8.0+ | 8.0 LTS | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| **Docker** | 20.0+ | Latest | [docker.com](https://docker.com) |
| **Docker Compose** | 2.0+ | Latest | Included with Docker Desktop |

### Node.js Version Management (CRITICAL)

**Teboraw 2.0 requires Node.js v18.12 or higher.** The pnpm package manager will not work with older versions.

#### Check Your Current Node.js Version

```bash
node -v
```

If the output shows a version lower than `v18.12.0`, you **must** upgrade before proceeding.

#### Installing/Upgrading Node.js with nvm (Recommended)

**nvm (Node Version Manager)** is the recommended way to manage Node.js versions. It allows you to easily switch between versions without affecting your system.

##### Step 1: Install nvm (if not already installed)

```bash
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# After installation, restart your terminal or run:
source ~/.bashrc   # for bash
source ~/.zshrc    # for zsh
```

##### Step 2: Load nvm in Your Current Shell

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

##### Step 3: Install and Use Node.js 20

```bash
# Install Node.js 20 (LTS)
nvm install 20

# Switch to Node.js 20
nvm use 20

# Set as default for all new terminals
nvm alias default 20

# Verify the version
node -v  # Should show v20.x.x
```

##### Quick One-Liner (Copy & Paste)

```bash
source ~/.nvm/nvm.sh && nvm install 20 && nvm use 20 && nvm alias default 20
```

#### Alternative: Using Homebrew (macOS)

```bash
brew install node@20
brew link node@20
```

#### Alternative: Direct Download

Download the installer from [nodejs.org](https://nodejs.org/) and install version 20.x LTS.

### Verifying All Prerequisites

Run this command to check all prerequisites at once:

```bash
echo "Node.js: $(node -v)" && \
echo "pnpm: $(pnpm -v 2>/dev/null || echo 'NOT INSTALLED')" && \
echo "dotnet: $(dotnet --version)" && \
echo "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
```

Expected output (versions may vary):
```
Node.js: v20.10.0
pnpm: 9.1.0
dotnet: 8.0.100
Docker: 24.0.7
```

### Installing Missing Prerequisites

#### pnpm
```bash
npm install -g pnpm
```

#### .NET 8 SDK
- **macOS**: `brew install dotnet-sdk`
- **Linux**: See [Microsoft's installation guide](https://learn.microsoft.com/en-us/dotnet/core/install/linux)
- **Windows**: Download from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)

#### Docker
- **macOS/Windows**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: Follow the [official installation guide](https://docs.docker.com/engine/install/)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEBORAW 2.0 ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                │
│  │   Desktop   │   │   Chrome    │   │   Mobile    │                │
│  │   Agent     │   │  Extension  │   │    App      │                │
│  │  (Electron) │   │             │   │(React Native)│               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                │
│         │                 │                 │                        │
│         └────────────┬────┴────────────────┘                        │
│                      │                                               │
│                      ▼                                               │
│         ┌────────────────────────┐                                  │
│         │    .NET 8 Web API      │                                  │
│         │   (Self-Hosted Server) │                                  │
│         └───────────┬────────────┘                                  │
│                     │                                                │
│                     ▼                                                │
│         ┌────────────────────────┐                                  │
│         │      PostgreSQL        │                                  │
│         │   + Redis (caching)    │                                  │
│         └────────────────────────┘                                  │
│                     │                                                │
│                     ▼                                                │
│         ┌────────────────────────┐                                  │
│         │   React TypeScript     │                                  │
│         │     Dashboard          │                                  │
│         └────────────────────────┘                                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend Dashboard | React 18 + TypeScript + Vite + TailwindCSS |
| Backend API | .NET 8 Web API (C#) |
| Database | PostgreSQL 16 + Redis |
| Desktop Agent | Electron + TypeScript |
| Browser Extension | Chrome Extension (Manifest V3) |
| Mobile App | React Native + TypeScript (Android) |
| Audio Transcription | Whisper.cpp (local) |
| Authentication | JWT + Refresh Tokens |

## Getting Started

### Prerequisites Checklist

Before proceeding, ensure you have completed the **Prerequisites & System Requirements** section above.

**Quick Check:**
```bash
# Run this to verify your setup
node -v  # Must be v18.12.0 or higher!
```

If your Node.js version is too low, **STOP** and follow the nvm instructions above.

### Quick Start (Automated)

The easiest way to get started is using the setup script:

```bash
# First, ensure Node.js 20 is active
source ~/.nvm/nvm.sh && nvm use 20

# Make scripts executable
chmod +x scripts/setup.sh scripts/run.sh

# Run the setup script
./scripts/setup.sh
```

The setup script will:
1. Verify all prerequisites
2. Start Docker services (PostgreSQL, Redis, pgAdmin)
3. Install pnpm dependencies
4. Build shared packages
5. Restore .NET packages
6. Apply database migrations

### Quick Start (Manual)

If you prefer to run steps manually:

1. **Ensure Node.js 20 is active:**
   ```bash
   source ~/.nvm/nvm.sh && nvm use 20
   node -v  # Verify: should show v20.x.x
   ```

2. **Start the database services:**
   ```bash
   docker compose up -d
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Build the shared types package:**
   ```bash
   pnpm --filter @teboraw/shared-types build
   ```

5. **Start the API:**
   ```bash
   cd apps/api
   dotnet run --project Teboraw.Api
   ```
   API will be available at `http://localhost:5000`

6. **Start the web dashboard (in a new terminal):**
   ```bash
   pnpm dev:web
   ```
   Dashboard will be available at `http://localhost:5173`

### Running the Application

After setup is complete, use the run script:

```bash
./scripts/run.sh           # Start all services (API + Web + Docker)
./scripts/run.sh api       # Start only the API
./scripts/run.sh web       # Start only the Web Dashboard
./scripts/run.sh desktop   # Start the Electron Desktop Agent
./scripts/run.sh docker    # Start only Docker services
./scripts/run.sh stop      # Stop all Docker services
```

### Running Components

#### Web Dashboard
```bash
pnpm dev:web
```

#### Desktop Agent (Electron)
```bash
cd apps/desktop
pnpm install
pnpm dev
```

#### Chrome Extension
1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `apps/extension` folder

#### Mobile App (Android)
```bash
cd apps/mobile
pnpm install
pnpm android
```

## Project Structure

```
Teboraw 2.0/
├── apps/
│   ├── web/           # React Dashboard
│   ├── api/           # .NET 8 Web API
│   ├── desktop/       # Electron Desktop Agent
│   ├── extension/     # Chrome Extension
│   └── mobile/        # React Native Android App
├── packages/
│   └── shared-types/  # Shared TypeScript types
├── docker-compose.yml
└── package.json
```

## Features

- **Desktop Activity Tracking**: Window focus, screenshots, idle detection
- **Browser Tracking**: Page visits, searches, tab activity
- **Mobile Tracking**: GPS location, ambient audio recording
- **Audio Transcription**: Local Whisper-based transcription
- **Thoughts Journal**: Capture and organize ideas
- **Timeline Dashboard**: Chronological view of all activities
- **Self-Hosted**: All data stays on your infrastructure

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/activities` | GET | List activities |
| `/api/activities` | POST | Create activity |
| `/api/activities/sync` | POST | Sync activities from clients |
| `/api/thoughts` | GET/POST | Manage thoughts |

## Docker Architecture

Teboraw uses Docker Compose to orchestrate all backend services. The stack runs on a dedicated bridge network (`teboraw-network`) allowing containers to communicate using service names.

### Container Overview

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `teboraw-postgres` | postgres:16-alpine | 5432 | Primary database |
| `teboraw-redis` | redis:7-alpine | 6379 | Caching layer |
| `teboraw-api` | Custom (.NET 8) | 5000 | Backend API |
| `teboraw-web` | Custom (nginx) | 5173 | Web dashboard |
| `teboraw-pgadmin` | dpage/pgadmin4 | 5050 | Database admin UI |

### Container Details

#### PostgreSQL (`teboraw-postgres`)
The primary data store for all application data.

- **Image:** `postgres:16-alpine`
- **Port:** `5432:5432`
- **Volume:** `postgres_data:/var/lib/postgresql/data`
- **Credentials:** `teboraw` / `teboraw_dev` (configurable via env vars)
- **Health Check:** `pg_isready` command every 10s

**Data Stored:**
- User accounts and authentication
- Activities (window focus, page visits, screenshots, etc.)
- Thoughts and journal entries
- Device registrations

#### Redis (`teboraw-redis`)
In-memory cache for performance optimization.

- **Image:** `redis:7-alpine`
- **Port:** `6379:6379`
- **Volume:** `redis_data:/data`
- **Health Check:** `redis-cli ping` every 10s

**Intended Use:**
- Activity summary caching
- Rate limiting
- Session storage
- Real-time pub/sub (future)

> **Note:** Redis is provisioned but not yet actively used in the codebase. The infrastructure is ready for future caching implementations.

#### API (`teboraw-api`)
The .NET 8 backend that handles all business logic.

- **Build Context:** `./apps/api`
- **Port:** `5000:5000`
- **Health Check:** `curl http://localhost:5000/health` every 30s
- **Depends On:** postgres (healthy), redis (healthy)

**Responsibilities:**
- REST API endpoints for all clients
- JWT authentication and token refresh
- Activity ingestion and storage
- Database migrations (EF Core)
- Swagger documentation at `/swagger`

**Environment Variables:**
- `ConnectionStrings__DefaultConnection` - PostgreSQL connection string
- `Jwt__SecretKey` - JWT signing key
- `Redis__Host` / `Redis__Port` - Redis connection

#### Web Dashboard (`teboraw-web`)
The React frontend served via nginx.

- **Build Context:** `./apps/web`
- **Port:** `5173:80` (nginx serves on port 80 internally)
- **Health Check:** wget spider test every 30s
- **Depends On:** api

**Features:**
- Activity timeline with filtering and search
- Thoughts journal management
- Statistics and visualizations
- Dark theme UI

**Build Args:**
- `VITE_API_URL=/api` - API endpoint configuration

#### pgAdmin (`teboraw-pgadmin`)
Web-based database administration interface (optional, for development).

- **Image:** `dpage/pgadmin4:latest`
- **Port:** `5050:80`
- **Volume:** `pgadmin_data:/var/lib/pgadmin`
- **Credentials:** `admin@example.com` / `admin`
- **Depends On:** postgres

**Use Cases:**
- View and edit database tables
- Run SQL queries
- Export/import data
- Monitor database performance

### Persistent Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL database files |
| `redis_data` | Redis persistence (RDB/AOF) |
| `pgadmin_data` | pgAdmin configuration and saved servers |

### Network

All containers run on `teboraw-network` (bridge driver). Containers communicate using service names:
- API connects to `postgres:5432` and `redis:6379`
- Web proxies API calls to `api:5000`

### Common Commands

```bash
# Start all services
docker compose up -d

# Start with rebuild
docker compose up -d --build

# View logs
docker compose logs -f              # All services
docker compose logs -f api          # API only

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Restart a single service
docker compose restart api

# Check service health
docker compose ps
```

### Environment Variables

Create a `.env` file in the project root to customize:

```env
POSTGRES_USER=teboraw
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=teboraw
JWT_SECRET_KEY=your_32_char_minimum_secret_key
```

---

## Configuration

### API Configuration (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=teboraw;Username=teboraw;Password=teboraw_dev"
  },
  "Jwt": {
    "SecretKey": "YOUR_SECRET_KEY_MIN_32_CHARS",
    "Issuer": "Teboraw",
    "Audience": "Teboraw"
  }
}
```

## Privacy & Security

- All data is self-hosted on your infrastructure
- Audio is transcribed locally using Whisper
- JWT-based authentication with refresh tokens
- Data encrypted in transit (HTTPS)
- Granular tracking controls per feature

---

## Troubleshooting

### Common Issues

#### "This version of pnpm requires at least Node.js v18.12"

**Cause:** Your active Node.js version is too old.

**Solution:**
```bash
# Load nvm
source ~/.nvm/nvm.sh

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v  # Should show v20.x.x

# Now retry
./scripts/setup.sh
```

**Note:** Each new terminal session may need `nvm use 20` unless you set the default alias.

#### "nvm: command not found"

**Cause:** nvm is not installed or not loaded in your shell.

**Solution:**
```bash
# Check if nvm is installed
ls -la ~/.nvm/nvm.sh

# If not installed, install it:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm (add this to your ~/.bashrc or ~/.zshrc for persistence)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### "docker-compose: command not found"

**Cause:** You're using an older Docker installation. Modern Docker uses `docker compose` (with a space) instead of `docker-compose` (with a hyphen).

**Solution:** The scripts in this project already use `docker compose`. If you're running commands manually, use:
```bash
docker compose up -d     # Instead of: docker-compose up -d
docker compose down      # Instead of: docker-compose down
```

#### Docker containers won't start

**Cause:** Docker daemon might not be running, or ports might be in use.

**Solution:**
```bash
# Check if Docker is running
docker info

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :5050  # pgAdmin

# If ports are in use, stop conflicting services or modify docker-compose.yml
```

#### "Cannot connect to PostgreSQL"

**Cause:** The database container might not be ready yet.

**Solution:**
```bash
# Check container status
docker compose ps

# Check logs
docker compose logs postgres

# Wait for PostgreSQL to be ready
docker exec teboraw-postgres pg_isready -U teboraw -d teboraw
```

#### .NET build errors

**Cause:** Missing .NET SDK or wrong version.

**Solution:**
```bash
# Check .NET version
dotnet --version  # Should be 8.x.x

# If missing, install .NET 8 SDK
# macOS:
brew install dotnet-sdk

# Then restore packages
cd apps/api
dotnet restore
```

#### React Native / Mobile build issues

**Cause:** Missing Android SDK or incorrect setup.

**Solution:**
1. Install Android Studio
2. Install Android SDK via Android Studio's SDK Manager
3. Set environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Create an Android emulator or connect a physical device
5. Run: `cd apps/mobile && pnpm android`

### Getting Help

If you encounter issues not covered here:

1. Check the console output for specific error messages
2. Ensure all prerequisites are correctly installed
3. Try running `./scripts/setup.sh` again after fixing any issues
4. Check Docker logs: `docker compose logs`
5. Check API logs when running: `cd apps/api && dotnet run --project Teboraw.Api`

---

## License

Private - All rights reserved
