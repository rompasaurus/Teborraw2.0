#!/bin/bash

echo "==================================================================="
echo "Finding Electron binary for macOS Accessibility permissions"
echo "==================================================================="
echo ""

# Check common locations for Electron
LOCATIONS=(
  "./node_modules/.bin/electron"
  "../../node_modules/.bin/electron"
  "$(which electron)"
  "/usr/local/bin/electron"
  "$(npm root -g)/electron/dist/Electron.app/Contents/MacOS/Electron"
  "$(pnpm root -g)/electron/dist/Electron.app/Contents/MacOS/Electron"
)

echo "Searching for Electron binary..."
echo ""

FOUND=0
for location in "${LOCATIONS[@]}"; do
  if [ -n "$location" ] && [ -e "$location" ]; then
    echo "✅ Found Electron at:"
    if [ -L "$location" ]; then
      # It's a symlink, resolve it
      REAL_PATH=$(readlink -f "$location" 2>/dev/null || realpath "$location" 2>/dev/null)
      echo "   Symlink: $location"
      echo "   Real path: $REAL_PATH"
    else
      echo "   $location"
    fi
    echo ""
    FOUND=1
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "❌ Could not find Electron binary"
  echo ""
  echo "Try installing Electron globally:"
  echo "  pnpm install -g electron"
  echo ""
  echo "Or check if it's installed in node_modules:"
  echo "  find . -name 'Electron.app' -type d"
else
  echo ""
  echo "To add Electron to Accessibility permissions:"
  echo "1. Open System Settings > Privacy & Security > Accessibility"
  echo "2. Click the lock icon (bottom left) to unlock"
  echo "3. Click the '+' button"
  echo "4. Navigate to one of the paths shown above"
  echo "5. Select Electron and click 'Open'"
  echo "6. Enable the checkbox next to Electron"
  echo "7. Restart the Teboraw app"
fi

echo ""
echo "==================================================================="
