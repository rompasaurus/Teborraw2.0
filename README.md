# Teboraw 2.0

A comprehensive self-hosted personal activity tracking platform that captures browsing history, desktop activity, GPS location, and ambient audio with transcription.

---

## Table of Contents

- [Application Capabilities](#application-capabilities)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Scripts Reference](#scripts-reference)
- [Project Structure](#project-structure)
- [Naming Conventions](#naming-conventions)
- [Programming Rules](#programming-rules)
- [API Reference](#api-reference)
- [Docker Architecture](#docker-architecture)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Application Capabilities

### Core Features

| Feature | Description | Platform |
|---------|-------------|----------|
| **Desktop Activity Tracking** | Captures active window focus, application usage, idle detection, and input activity | Desktop (Electron) |
| **Screenshot Capture** | Periodic screenshots of active windows for activity context | Desktop (Electron) |
| **Browser History Tracking** | Records page visits, searches, tab changes, and scroll sessions | Chrome Extension |
| **GPS Location Tracking** | Continuous location monitoring with configurable intervals | Mobile (Android) |
| **Ambient Audio Recording** | Records audio with local Whisper-based transcription | Mobile (Android) |
| **Thoughts Journal** | Rich text journal with topic parsing (hashtags, mentions, URLs) | Web Dashboard |
| **Timeline Dashboard** | Chronological view of all activities with filtering and search | Web Dashboard |
| **Calendar View** | Day/week/month activity visualization | Web Dashboard |
| **Statistics & Analytics** | Charts and graphs for activity patterns | Web Dashboard |

### Authentication

- Email/password registration and login
- Google OAuth 2.0 integration
- JWT access tokens (60 min expiry) + refresh tokens (7 day expiry)
- Automatic token refresh on the frontend
- See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for full details

### Privacy & Security

- **Self-hosted**: All data stays on your infrastructure
- **Local transcription**: Audio processed locally via Whisper.cpp
- **JWT authentication**: Cryptographically signed tokens
- **Data isolation**: Users can only access their own data
- **HTTPS**: Data encrypted in transit

---

## Architecture Overview

```
+-----------------------------------------------------------------------+
|                         TEBORAW 2.0 ECOSYSTEM                         |
+-----------------------------------------------------------------------+
|                                                                       |
|   +-----------+     +-----------+     +-----------+                   |
|   |  Desktop  |     |  Chrome   |     |  Mobile   |                   |
|   |   Agent   |     | Extension |     |    App    |                   |
|   | (Electron)|     |           |     |(React     |                   |
|   |           |     |           |     | Native)   |                   |
|   +-----+-----+     +-----+-----+     +-----+-----+                   |
|         |                 |                 |                         |
|         +--------+--------+---------+-------+                         |
|                  |                                                    |
|                  v                                                    |
|         +------------------+                                          |
|         |  .NET 8 Web API  |                                          |
|         | (Self-Hosted)    |                                          |
|         +--------+---------+                                          |
|                  |                                                    |
|                  v                                                    |
|         +------------------+                                          |
|         |   PostgreSQL     |                                          |
|         |   + Redis        |                                          |
|         +------------------+                                          |
|                  |                                                    |
|                  v                                                    |
|         +------------------+                                          |
|         | React TypeScript |                                          |
|         |    Dashboard     |                                          |
|         +------------------+                                          |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend Dashboard | React 18 + TypeScript + Vite + TailwindCSS |
| Backend API | .NET 8 Web API (C#) |
| Database | PostgreSQL 16 + Redis 7 |
| Desktop Agent | Electron + TypeScript |
| Browser Extension | Chrome Extension (Manifest V3) |
| Mobile App | React Native + TypeScript (Android) |
| Audio Transcription | Whisper.cpp (local) |
| Authentication | JWT + Refresh Tokens + Google OAuth |
| State Management | Zustand (frontend) |
| API Client | Axios + React Query |

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Installation |
|----------|-----------------|-------------|--------------|
| **Node.js** | 20.0+ | 20.x LTS | Via nvm |
| **pnpm** | 9.0+ | 9.15+ | `npm install -g pnpm` |
| **.NET SDK** | 8.0+ | 8.0 LTS | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| **Docker** | 20.0+ | Latest | [docker.com](https://docker.com) |
| **Python** | 3.8+ | 3.10+ | System or pyenv |

### Quick Prerequisite Check

```bash
echo "Node.js: $(node -v)" && \
echo "pnpm: $(pnpm -v 2>/dev/null || echo 'NOT INSTALLED')" && \
echo "dotnet: $(dotnet --version)" && \
echo "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')" && \
echo "Python: $(python3 --version)"
```

### Installing Node.js via nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm and install Node.js 20
source ~/.nvm/nvm.sh && nvm install 20 && nvm use 20 && nvm alias default 20

# Verify
node -v  # Should show v20.x.x
```

---

## Getting Started

### Quick Start (Automated)

```bash
# 1. Ensure Node.js 20 is active
source ~/.nvm/nvm.sh && nvm use 20

# 2. Run the setup script
python3 scripts/setup.py
```

The setup script will:
1. Verify all prerequisites
2. Start Docker services (PostgreSQL, Redis, pgAdmin)
3. Install pnpm dependencies
4. Build shared packages
5. Restore .NET packages
6. Apply database migrations

### Quick Start (Manual)

```bash
# 1. Start database services
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Build shared types
pnpm --filter @teboraw/shared-types build

# 4. Start the API (terminal 1)
cd apps/api && dotnet run --project Teboraw.Api

# 5. Start the web dashboard (terminal 2)
pnpm dev:web
```

### Access Points

| Service | URL |
|---------|-----|
| Web Dashboard | http://localhost:5173 |
| API | http://localhost:5000 |
| API Swagger | http://localhost:5000/swagger |
| pgAdmin | http://localhost:5050 |

---

## Scripts Reference

### Root Package Scripts

Run these from the project root with `pnpm <script>`:

| Script | Command | Description |
|--------|---------|-------------|
| `setup` | `python scripts/setup.py` | Full project setup |
| `start` | `python scripts/run.py` | Start all services |
| `start:all` | `python scripts/run.py all` | Start API + Web + Docker |
| `start:api` | `python scripts/run.py api` | Start only the .NET API |
| `start:web` | `python scripts/run.py web` | Start only the web dashboard |
| `start:desktop` | `python scripts/start-desktop.py` | Start Electron desktop agent |
| `dev:web` | `pnpm --filter @teboraw/web dev` | Web dev server (Vite) |
| `dev:desktop` | `pnpm --filter @teboraw/desktop dev` | Desktop dev mode |
| `dev:mobile` | `pnpm --filter @teboraw/mobile start` | Mobile Metro bundler |
| `dev:api` | `dotnet watch run --project apps/api/Teboraw.Api` | API with hot reload |
| `build:web` | `pnpm --filter @teboraw/web build` | Production web build |
| `build:desktop` | `pnpm --filter @teboraw/desktop build` | Desktop build |
| `build:desktop:package` | `python scripts/start-desktop.py package` | Package desktop app |
| `build:api` | `dotnet build apps/api/Teboraw.sln` | Build .NET API |
| `docker:up` | `docker compose up -d` | Start Docker services |
| `docker:down` | `docker compose down` | Stop Docker services |
| `docker:stop` | `python scripts/run.py stop` | Stop all services |
| `deploy` | `python scripts/deploy.py deploy` | Full deployment |
| `deploy:build` | `python scripts/deploy.py build` | Build for deployment |
| `deploy:push` | `python scripts/deploy.py push` | Push to registry |
| `deploy:status` | `python scripts/deploy.py status` | Check deployment status |
| `deploy:logs` | `python scripts/deploy.py logs` | View deployment logs |
| `deploy:migrate` | `python scripts/deploy.py migrate` | Run database migrations |
| `deploy:backup` | `python scripts/deploy.py backup` | Backup database |
| `clean` | `pnpm -r clean` | Clean all workspaces |

### Shell Scripts

```bash
# Setup script (alternative)
./scripts/setup.sh

# Run script with options
./scripts/run.sh           # Start all services
./scripts/run.sh api       # Start only API
./scripts/run.sh web       # Start only Web
./scripts/run.sh desktop   # Start Electron
./scripts/run.sh docker    # Start Docker only
./scripts/run.sh stop      # Stop all services
```

---

## Project Structure

```
Teboraw 2.0/
|
+-- apps/                          # Application workspaces
|   |
|   +-- api/                       # .NET 8 Backend API
|   |   +-- Teboraw.Api/           # API project (controllers, services)
|   |   |   +-- Controllers/       # REST API controllers
|   |   |   +-- DTOs/              # Data Transfer Objects
|   |   |   +-- Services/          # Business logic services
|   |   |   +-- Program.cs         # Application entry point
|   |   |   +-- appsettings.json   # Configuration
|   |   |
|   |   +-- Teboraw.Core/          # Domain layer (entities, interfaces)
|   |   |   +-- Entities/          # Domain entities
|   |   |   +-- Interfaces/        # Repository interfaces
|   |   |
|   |   +-- Teboraw.Infrastructure/  # Data access layer
|   |       +-- Data/              # DbContext
|   |       +-- Migrations/        # EF Core migrations
|   |       +-- Repositories/      # Repository implementations
|   |
|   +-- web/                       # React Web Dashboard
|   |   +-- src/
|   |       +-- components/        # Reusable UI components
|   |       +-- pages/             # Page components (routes)
|   |       +-- hooks/             # Custom React hooks
|   |       +-- store/             # Zustand state stores
|   |       +-- services/          # API client services
|   |       +-- types/             # TypeScript type definitions
|   |       +-- App.tsx            # Root component with routing
|   |       +-- main.tsx           # Entry point
|   |
|   +-- desktop/                   # Electron Desktop Agent
|   |   +-- src/
|   |       +-- main/              # Main process code
|   |       +-- preload/           # Preload scripts
|   |       +-- renderer/          # Renderer process (UI)
|   |
|   +-- extension/                 # Chrome Extension
|   |   +-- src/
|   |       +-- background/        # Service worker
|   |       +-- content/           # Content scripts
|   |       +-- popup/             # Extension popup UI
|   |
|   +-- mobile/                    # React Native Mobile App
|       +-- src/
|           +-- screens/           # Screen components
|           +-- services/          # API and native services
|           +-- navigation/        # Navigation configuration
|
+-- packages/                      # Shared packages
|   +-- shared-types/              # Shared TypeScript types
|
+-- scripts/                       # Build and deployment scripts
|   +-- setup.py                   # Project setup script
|   +-- run.py                     # Run services script
|   +-- deploy.py                  # Deployment script
|   +-- start-desktop.py           # Desktop agent launcher
|
+-- docs/                          # Documentation
|   +-- AUTHENTICATION.md          # Auth system documentation
|
+-- docker-compose.yml             # Docker services configuration
+-- package.json                   # Root workspace configuration
+-- pnpm-workspace.yaml            # pnpm workspace definition
+-- .env                           # Environment variables (not in git)
```

---

## Naming Conventions

### General Rules

| Element | Convention | Example |
|---------|------------|---------|
| Files (TypeScript) | PascalCase for components, camelCase for utilities | `Dashboard.tsx`, `authStore.ts` |
| Files (C#) | PascalCase | `AuthService.cs`, `UserDto.cs` |
| Folders | kebab-case or lowercase | `components/`, `shared-types/` |
| React Components | PascalCase | `ThoughtsToolbar`, `Layout` |
| React Hooks | camelCase with `use` prefix | `useTopicParser`, `useAuthStore` |
| Zustand Stores | camelCase with `Store` suffix | `authStore`, `thoughtsEditorStore` |
| TypeScript Interfaces | PascalCase with `I` prefix (optional) | `User`, `AuthState`, `IRepository` |
| TypeScript Types | PascalCase | `ActivityType`, `LoginRequest` |
| C# Classes | PascalCase | `AuthService`, `Activity` |
| C# Interfaces | PascalCase with `I` prefix | `IRepository`, `IUnitOfWork` |
| C# Enums | PascalCase | `ActivityType`, `ActivitySource` |
| Database Tables | PascalCase plural | `Users`, `Activities`, `RefreshTokens` |
| API Endpoints | kebab-case or lowercase | `/auth/login`, `/activities/sync` |
| Environment Variables | SCREAMING_SNAKE_CASE | `JWT_SECRET_KEY`, `POSTGRES_PASSWORD` |

### Frontend Naming

```typescript
// Components - PascalCase
export function ThoughtsToolbar() { }

// Hooks - camelCase with use prefix
export function useTopicParser() { }

// Stores - camelCase
export const useAuthStore = create<AuthState>()

// Types - PascalCase
interface User {
  id: string
  email: string
}

// Constants - SCREAMING_SNAKE_CASE or camelCase
const API_BASE_URL = '/api'
const defaultSettings = { }
```

### Backend Naming (.NET)

```csharp
// Namespaces - PascalCase matching folder structure
namespace Teboraw.Api.Controllers;
namespace Teboraw.Core.Entities;

// Classes - PascalCase
public class AuthService : IAuthService { }

// Interfaces - PascalCase with I prefix
public interface IAuthService { }

// Methods - PascalCase
public async Task<AuthResponse?> LoginAsync(LoginRequest request)

// Properties - PascalCase
public string Email { get; set; }

// Private fields - camelCase with underscore prefix
private readonly IUnitOfWork _unitOfWork;

// DTOs - PascalCase with Dto/Request/Response suffix
public record LoginRequest(string Email, string Password);
public record AuthResponse(string AccessToken, string RefreshToken, ...);
```

---

## Programming Rules

### General Principles

1. **Type Safety**: Always use TypeScript strict mode on frontend, enable nullable reference types in C#
2. **No Magic Strings**: Use enums or constants for repeated values
3. **Single Responsibility**: Each function/class should do one thing well
4. **DRY (Don't Repeat Yourself)**: Extract common logic into shared utilities
5. **Error Handling**: Always handle errors gracefully, never swallow exceptions silently

### Frontend Rules (React/TypeScript)

```typescript
// 1. Use functional components with hooks
function MyComponent() {
  const [state, setState] = useState()
  return <div>{state}</div>
}

// 2. Use Zustand for global state
const useMyStore = create<MyState>()((set) => ({
  value: null,
  setValue: (v) => set({ value: v }),
}))

// 3. Use React Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['activities'],
  queryFn: () => api.getActivities(),
})

// 4. Always type props and state
interface Props {
  title: string
  onSubmit: (data: FormData) => void
}

// 5. Use path aliases for imports
import { useAuthStore } from '@/store/authStore'  // Not '../../../store/authStore'
```

### Backend Rules (.NET/C#)

```csharp
// 1. Use async/await for I/O operations
public async Task<User?> GetUserAsync(Guid id)
{
    return await _unitOfWork.Users.GetByIdAsync(id);
}

// 2. Use dependency injection
public class AuthService
{
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }
}

// 3. Use records for DTOs
public record UserDto(Guid Id, string Email, string DisplayName);

// 4. Always validate input at controller level
[HttpPost]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    if (string.IsNullOrEmpty(request.Email))
        return BadRequest("Email is required");
}

// 5. Extract user ID from JWT claims, never from request
private Guid GetUserId()
{
    var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return Guid.Parse(claim!);
}

// 6. Use Unit of Work pattern for transactions
await _unitOfWork.Users.AddAsync(user);
await _unitOfWork.SaveChangesAsync();
```

### API Design Rules

1. **RESTful Endpoints**: Use HTTP verbs correctly (GET, POST, PUT, DELETE)
2. **Consistent Response Format**: Always return DTOs, never entities
3. **Proper Status Codes**: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found
4. **Authentication**: Protect all endpoints except login/register/refresh
5. **Data Filtering**: Always filter by authenticated user ID

### Git Commit Rules

```bash
# Commit message format
<type>: <short description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no code change
refactor: Code restructuring
test:     Adding tests
chore:    Maintenance tasks

# Examples
feat: add Google OAuth login
fix: resolve token refresh race condition
docs: update authentication documentation
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Create new account |
| POST | `/auth/login` | No | Email/password login |
| POST | `/auth/google` | No | Google OAuth login |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/me` | Yes | Get current user |
| POST | `/auth/logout` | Yes | Revoke refresh token |

### Activity Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/activities` | Yes | List activities (with filters) |
| POST | `/activities` | Yes | Create single activity |
| POST | `/activities/sync` | Yes | Batch sync from clients |
| DELETE | `/activities/{id}` | Yes | Delete activity |

### Thought Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/thoughts` | Yes | List thoughts |
| POST | `/thoughts` | Yes | Create thought |
| PUT | `/thoughts/{id}` | Yes | Update thought |
| DELETE | `/thoughts/{id}` | Yes | Delete thought |

---

## Docker Architecture

### Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `teboraw-postgres` | postgres:16-alpine | 5432 | Primary database |
| `teboraw-redis` | redis:7-alpine | 6379 | Caching layer |
| `teboraw-pgadmin` | dpage/pgadmin4 | 5050 | Database admin UI |

### Common Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Reset database (WARNING: deletes data)
docker compose down -v
```

### Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | PostgreSQL data persistence |
| `redis_data` | Redis data persistence |
| `pgadmin_data` | pgAdmin configuration |

---

## Configuration

### Environment Variables (.env)

```env
# Database
POSTGRES_USER=teboraw
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=teboraw

# JWT
JWT_SECRET_KEY=your_32_char_minimum_secret_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
```

### API Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=teboraw;Username=teboraw;Password=teboraw_dev"
  },
  "Jwt": {
    "SecretKey": "configured-via-env",
    "Issuer": "Teboraw",
    "Audience": "Teboraw",
    "AccessTokenExpiryMinutes": 60,
    "RefreshTokenExpiryDays": 7
  }
}
```

---

## Troubleshooting

### Common Issues

#### "This version of pnpm requires at least Node.js v18.12"

```bash
source ~/.nvm/nvm.sh && nvm use 20
```

#### "nvm: command not found"

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### Docker containers won't start

```bash
# Check if Docker is running
docker info

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

#### Cannot connect to PostgreSQL

```bash
# Check container status
docker compose ps

# Wait for PostgreSQL to be ready
docker exec teboraw-postgres pg_isready -U teboraw -d teboraw
```

#### .NET build errors

```bash
# Verify .NET version
dotnet --version  # Should be 8.x.x

# Restore packages
cd apps/api && dotnet restore
```

### Getting Help

1. Check console output for specific error messages
2. Verify all prerequisites are installed
3. Try `python3 scripts/setup.py` to re-run setup
4. Check Docker logs: `docker compose logs`
5. Check API logs in the terminal running the API

---

## License

Private - All rights reserved
