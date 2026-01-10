#!/bin/bash
# Teboraw Desktop App Launcher for macOS/Linux
# Run: ./start-desktop.sh

cd "$(dirname "$0")"

echo ""
echo "  Starting Teboraw Desktop..."
echo ""

python3 scripts/start-desktop.py "$@"
