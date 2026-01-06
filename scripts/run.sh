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

start_docker() {
    echo -e "${GREEN}▶ Starting Docker services...${NC}"
    docker compose up -d
    sleep 2
}

start_api() {
    echo -e "${GREEN}▶ Starting .NET API on http://localhost:5000${NC}"
    cd "$PROJECT_ROOT/apps/api"
    dotnet run --project Teboraw.Api --urls "http://localhost:5000"
}

start_web() {
    echo -e "${GREEN}▶ Starting Web Dashboard on http://localhost:5173${NC}"
    cd "$PROJECT_ROOT"
    pnpm dev:web
}

start_desktop() {
    echo -e "${GREEN}▶ Starting Desktop Agent...${NC}"
    cd "$PROJECT_ROOT/apps/desktop"
    pnpm dev
}

start_all() {
    print_banner
    start_docker

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
    trap "echo -e '\n${RED}Stopping services...${NC}'; kill $API_PID $WEB_PID 2>/dev/null; docker compose stop; exit 0" SIGINT SIGTERM

    wait
}

show_help() {
    print_banner
    echo "Usage: ./scripts/run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  (no args)    Start all services (API + Web + Docker)"
    echo "  api          Start only the .NET API"
    echo "  web          Start only the Web Dashboard"
    echo "  desktop      Start the Electron Desktop Agent"
    echo "  docker       Start only Docker services"
    echo "  stop         Stop all Docker services"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/run.sh           # Start everything"
    echo "  ./scripts/run.sh api       # Start just the API"
    echo "  ./scripts/run.sh web       # Start just the dashboard"
    echo ""
}

# Main
case "${1:-all}" in
    api)
        start_docker
        start_api
        ;;
    web)
        start_web
        ;;
    desktop)
        start_desktop
        ;;
    docker)
        start_docker
        echo -e "${GREEN}Docker services started${NC}"
        ;;
    stop)
        echo -e "${YELLOW}Stopping Docker services...${NC}"
        docker compose down
        echo -e "${GREEN}Done${NC}"
        ;;
    help|--help|-h)
        show_help
        ;;
    all|"")
        start_all
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
