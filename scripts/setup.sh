#!/bin/bash

# Teboraw 2.0 - Setup & Run Script
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✖ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_header "Teboraw 2.0 - Setup Script"

# Check prerequisites
print_step "Checking prerequisites..."

# Source nvm if available (needed for node version management)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version is $(node -v). Required: 18+"

    # Check if nvm is available
    if type nvm &> /dev/null; then
        print_step "nvm detected. Installing Node.js 20..."
        nvm install 20
        nvm use 20
        nvm alias default 20
        print_success "Node.js 20 installed and activated"
    else
        print_error "Node.js 18+ is required."
        print_error "Please run these commands first, then re-run this script:"
        echo ""
        echo "    nvm install 20"
        echo "    nvm use 20"
        echo ""
        exit 1
    fi
fi
print_success "Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm not found. Installing..."
    npm install -g pnpm
fi
print_success "pnpm $(pnpm -v)"

# Check .NET
if ! command -v dotnet &> /dev/null; then
    print_error ".NET SDK is not installed. Please install .NET 8 SDK"
    exit 1
fi
print_success "dotnet $(dotnet --version)"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker"
    exit 1
fi
print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

echo ""

# Start Docker services
print_step "Starting Docker services (PostgreSQL, Redis, pgAdmin)..."
docker compose up -d

# Wait for PostgreSQL to be ready
print_step "Waiting for PostgreSQL to be ready..."
sleep 5
until docker exec teboraw-postgres pg_isready -U teboraw -d teboraw &> /dev/null; do
    echo -n "."
    sleep 1
done
echo ""
print_success "PostgreSQL is ready"

# Install dependencies
print_step "Installing pnpm dependencies..."
pnpm install

# Build shared types
print_step "Building shared types package..."
cd "$PROJECT_ROOT/packages/shared-types"
pnpm build
cd "$PROJECT_ROOT"

# Restore .NET packages
print_step "Restoring .NET packages..."
cd "$PROJECT_ROOT/apps/api"
dotnet restore

# Apply database migrations
print_step "Applying database migrations..."
dotnet ef database update --project Teboraw.Infrastructure --startup-project Teboraw.Api 2>/dev/null || true

cd "$PROJECT_ROOT"

print_header "Setup Complete!"

echo -e "You can now run the project using:"
echo -e ""
echo -e "  ${GREEN}./scripts/run.sh${NC}        - Start all services"
echo -e "  ${GREEN}./scripts/run.sh api${NC}    - Start only the API"
echo -e "  ${GREEN}./scripts/run.sh web${NC}    - Start only the web dashboard"
echo -e ""
echo -e "Or manually:"
echo -e "  ${YELLOW}API:${NC}       cd apps/api && dotnet run --project Teboraw.Api"
echo -e "  ${YELLOW}Web:${NC}       pnpm dev:web"
echo -e "  ${YELLOW}Desktop:${NC}   cd apps/desktop && pnpm dev"
echo -e ""
echo -e "Services:"
echo -e "  ${BLUE}API:${NC}        http://localhost:5000"
echo -e "  ${BLUE}Swagger:${NC}    http://localhost:5000/swagger"
echo -e "  ${BLUE}Dashboard:${NC}  http://localhost:5173"
echo -e "  ${BLUE}pgAdmin:${NC}    http://localhost:5050 (admin@teboraw.local / admin)"
echo -e ""
