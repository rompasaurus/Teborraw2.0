#!/bin/bash

# Teboraw 2.0 - Run Script
# ========================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_banner() {
    echo -e "${CYAN}"
    echo "  ╔════════════════════════════════════════╗"
    echo "  ║         TEBORAW 2.0                    ║"
    echo "  ║   Personal Activity Tracker            ║"
    echo "  ╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Parse mode flag
DEPLOY_MODE="docker"  # Default to docker
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            DEPLOY_MODE="local"
            shift
            ;;
        --docker)
            DEPLOY_MODE="docker"
            shift
            ;;
        *)
            COMMAND="$1"
            shift
            ;;
    esac
done

# ==========================================
# Docker Mode Functions
# ==========================================

docker_start_all() {
    print_banner
    echo -e "${GREEN}▶ Starting all services in Docker...${NC}"
    docker compose up -d

    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}All services started!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e ""
    echo -e "  ${BLUE}API:${NC}        http://localhost:5000"
    echo -e "  ${BLUE}Swagger:${NC}    http://localhost:5000/swagger"
    echo -e "  ${BLUE}Dashboard:${NC}  http://localhost:5173"
    echo -e "  ${BLUE}pgAdmin:${NC}    http://localhost:5050"
    echo -e ""
    echo -e "${YELLOW}Use './scripts/run.sh logs' to view logs${NC}"
    echo -e "${YELLOW}Use './scripts/run.sh stop' to stop all services${NC}"
    echo -e ""
}

docker_stop() {
    echo -e "${YELLOW}Stopping all Docker services...${NC}"
    docker compose down
    echo -e "${GREEN}Done${NC}"
}

docker_logs() {
    SERVICE="${1:-}"
    if [ -n "$SERVICE" ]; then
        docker compose logs -f "$SERVICE"
    else
        docker compose logs -f
    fi
}

docker_rebuild() {
    echo -e "${GREEN}▶ Rebuilding and restarting services...${NC}"
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    echo -e "${GREEN}Done${NC}"
}

docker_status() {
    echo -e "${GREEN}▶ Service Status:${NC}"
    docker compose ps
}

# ==========================================
# Local Mode Functions
# ==========================================

local_start_docker() {
    echo -e "${GREEN}▶ Starting Docker services (PostgreSQL, Redis)...${NC}"
    docker compose up -d postgres redis pgadmin
    sleep 2
}

local_start_api() {
    echo -e "${GREEN}▶ Starting .NET API on http://localhost:5000${NC}"
    cd "$PROJECT_ROOT/apps/api"
    dotnet run --project Teboraw.Api --urls "http://localhost:5000"
}

local_start_web() {
    echo -e "${GREEN}▶ Starting Web Dashboard on http://localhost:5173${NC}"
    cd "$PROJECT_ROOT"
    pnpm dev:web
}

local_start_desktop() {
    echo -e "${GREEN}▶ Starting Desktop Agent...${NC}"
    cd "$PROJECT_ROOT/apps/desktop"
    pnpm dev
}

local_start_all() {
    print_banner
    local_start_docker

    echo -e "\n${YELLOW}Starting services in background...${NC}\n"

    # Start API in background
    echo -e "${GREEN}▶ Starting API...${NC}"
    cd "$PROJECT_ROOT/apps/api"
    dotnet run --project Teboraw.Api --urls "http://localhost:5000" &
    API_PID=$!

    sleep 3

    # Start Web in background
    echo -e "${GREEN}▶ Starting Web Dashboard...${NC}"
    cd "$PROJECT_ROOT"
    pnpm dev:web &
    WEB_PID=$!

    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}All services started!${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e ""
    echo -e "  ${BLUE}API:${NC}        http://localhost:5000"
    echo -e "  ${BLUE}Swagger:${NC}    http://localhost:5000/swagger"
    echo -e "  ${BLUE}Dashboard:${NC}  http://localhost:5173"
    echo -e "  ${BLUE}pgAdmin:${NC}    http://localhost:5050"
    echo -e ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo -e ""

    # Wait and handle shutdown
    trap "echo -e '\n${RED}Stopping services...${NC}'; kill $API_PID $WEB_PID 2>/dev/null; docker compose stop postgres redis pgadmin; exit 0" SIGINT SIGTERM

    wait
}

# ==========================================
# Help
# ==========================================

show_help() {
    print_banner
    echo "Usage: ./scripts/run.sh [--docker|--local] [command]"
    echo ""
    echo "Modes:"
    echo "  --docker     Run services in Docker containers (default)"
    echo "  --local      Run API and Web locally (only DB in Docker)"
    echo ""
    echo "Docker Commands:"
    echo "  (no args)    Start all services in Docker"
    echo "  stop         Stop all Docker services"
    echo "  logs [svc]   View logs (optionally for specific service: api, web, postgres)"
    echo "  rebuild      Rebuild images and restart"
    echo "  status       Show container status"
    echo ""
    echo "Local Commands:"
    echo "  (no args)    Start all services (API + Web locally, DB in Docker)"
    echo "  api          Start only the .NET API"
    echo "  web          Start only the Web Dashboard"
    echo "  desktop      Start the Electron Desktop Agent"
    echo "  docker       Start only Docker services (DB)"
    echo "  stop         Stop Docker services"
    echo ""
    echo "Examples:"
    echo "  ./scripts/run.sh                # Start all in Docker (default)"
    echo "  ./scripts/run.sh --docker       # Start all in Docker"
    echo "  ./scripts/run.sh stop           # Stop Docker services"
    echo "  ./scripts/run.sh logs api       # View API logs"
    echo "  ./scripts/run.sh rebuild        # Rebuild and restart"
    echo "  ./scripts/run.sh --local        # Start API/Web locally"
    echo "  ./scripts/run.sh --local api    # Start just the API locally"
    echo ""
}

# ==========================================
# Main
# ==========================================

if [ "$DEPLOY_MODE" = "docker" ]; then
    case "${COMMAND:-all}" in
        stop)
            docker_stop
            ;;
        logs)
            docker_logs "$2"
            ;;
        rebuild)
            docker_rebuild
            ;;
        status)
            docker_status
            ;;
        help|--help|-h)
            show_help
            ;;
        all|"")
            docker_start_all
            ;;
        *)
            echo -e "${RED}Unknown command: $COMMAND${NC}"
            show_help
            exit 1
            ;;
    esac
else
    # Local mode
    case "${COMMAND:-all}" in
        api)
            local_start_docker
            local_start_api
            ;;
        web)
            local_start_web
            ;;
        desktop)
            local_start_desktop
            ;;
        docker)
            local_start_docker
            echo -e "${GREEN}Docker services started${NC}"
            ;;
        stop)
            echo -e "${YELLOW}Stopping Docker services...${NC}"
            docker compose stop postgres redis pgadmin
            echo -e "${GREEN}Done${NC}"
            ;;
        help|--help|-h)
            show_help
            ;;
        all|"")
            local_start_all
            ;;
        *)
            echo -e "${RED}Unknown command: $COMMAND${NC}"
            show_help
            exit 1
            ;;
    esac
fi
