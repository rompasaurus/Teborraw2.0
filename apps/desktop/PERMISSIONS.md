# macOS Permissions Setup & Troubleshooting

The Teboraw Desktop app requires specific system permissions on macOS to track activity and capture screenshots.

## Quick Start

**Important Notes:**
- **To quit the app:** Press `Cmd+Q` or use the menu: Teboraw → Quit
- **Closing the window** does NOT quit the app - it continues running in the menu bar
- **Force quit:** You can also quit from the tray icon in the menu bar

## Required Permissions

### 1. Accessibility Permission (Required for Activity Tracking)

The `active-win` package needs Accessibility permission to detect which application window is currently active.

**Error you might see:**
```
Error: Command failed: /path/to/node_modules/active-win/main
```

**How to fix:**

1. **First Time:** When you start the app, it will show a dialog asking for permission
   - Click "Open System Settings" to be taken directly to the settings
   - OR manually go to: **System Settings** → **Privacy & Security** → **Accessibility**

2. In the Accessibility settings:
   - Look for your app in the list:
     - In development: Look for "Electron"
     - In production: Look for "Teboraw"
   - If the app is not in the list, click the "+" button and add it manually
   - Enable the checkbox next to the app

3. **Restart the application** after granting permission
   - Press `Cmd+Q` to quit
   - Restart the app

**Development Note:** When running in development mode (`pnpm dev`), you need to grant permission to **Electron**.

### 2. Screen Recording Permission (Required for Screenshots)

The `screenshot-desktop` package needs Screen Recording permission to capture screenshots.

**How to grant:**

1. Open **System Settings** → **Privacy & Security** → **Screen Recording**
2. Enable permission for the app
3. **Restart the application** after granting permission

## Troubleshooting

### How to quit the app?

The app runs in the menu bar even when you close the window. To actually quit:

1. **Keyboard shortcut:** Press `Cmd+Q` (standard macOS quit shortcut)
2. **From menu:** Click "Teboraw" in the menu bar → "Quit"
3. **From tray icon:** Right-click the tray icon → "Quit"

### The app won't start tracking even after granting permissions

**Solution:** Restart the application completely. macOS only checks permissions when the app launches.

1. Press `Cmd+Q` to quit (NOT just close the window)
2. Start the app again

### I granted permission but still get errors

**Check these:**

1. Make sure you granted permission to the correct app:
   - Development: Look for "Electron" in System Settings
   - Production: Look for "Teboraw"

2. **Fully quit and restart** the app after granting permissions
   - Press `Cmd+Q` (not just close the window)
   - Restart the app

3. Try rebuilding native modules:
   ```bash
   cd apps/desktop
   pnpm rebuild
   ```

4. If still not working, try removing and re-adding the app in System Settings

### I don't see Electron in the Accessibility list

**This is the most common issue.** macOS only adds apps to the Accessibility list **after they actually attempt to use accessibility features**.

Here's how to fix it:

**Option 1: Let the app trigger it automatically (Recommended)**
1. Start the desktop app: `cd apps/desktop && pnpm dev`
2. On first launch, the app will **automatically** attempt to access window information
3. macOS will show a system dialog asking for permission - this happens automatically!
4. You should see a dialog from the app explaining what to do next
5. Click "Open System Settings" to go directly to Accessibility settings
6. Enable the checkbox next to "Electron"
7. Quit the app with `Cmd+Q` and restart it

**Option 2: Manually add Electron (Most reliable)**
1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the lock icon to unlock (bottom left)
3. Click the **"+"** button
4. Press **`Cmd+Shift+G`** to open "Go to folder" dialog
5. Paste this path: `/Users/YOUR_USERNAME/Documents/Teborraw2.0/node_modules/.pnpm/electron@33.4.11/node_modules/electron/dist/Electron.app`
   - Replace `YOUR_USERNAME` with your actual username
   - Or navigate manually through Finder (you may need to show hidden files with `Cmd+Shift+.`)
6. Select **Electron.app** and click **Open**
7. Enable the checkbox next to Electron
8. Restart the app with `Cmd+Q` and then `pnpm dev`

**To find your Electron.app path, run:**
```bash
cd apps/desktop
./find-electron.sh
```

**Option 3: Use terminal access as temporary workaround**
If Electron won't appear, grant permission to your **Terminal** app instead:
1. Go to **System Settings** → **Privacy & Security** → **Accessibility**
2. Add your Terminal app (Terminal.app, iTerm2, etc.)
3. The app running from that terminal will inherit the permissions

### I don't see a permission dialog

If the app doesn't show a permission dialog:

1. The app might already be in the Accessibility list but disabled
2. Manually check: **System Settings** → **Privacy & Security** → **Accessibility**
3. Look for "Electron" or your terminal app (Terminal, iTerm2)
4. Enable the checkbox next to it
5. Quit (`Cmd+Q`) and restart the app

### How do I know if permissions are granted?

Check the console output when the app starts:
```
✅ Activity tracker started
   Input monitor enabled: true
   Accessibility permission: ✅
   Screen Recording permission: ✅
```

If you see ❌ next to any permission, follow the steps above to grant it.

## Entitlements

The app uses the following entitlements (configured in `build/entitlements.mac.plist`):

- `com.apple.security.automation.apple-events` - Required for active-win
- `com.apple.security.device.camera` - Required for screenshot-desktop
- Standard Electron entitlements for JIT and unsigned memory

## Building for Production

When building the app for distribution:

```bash
pnpm build    # Build the app
pnpm package  # Create distributable package
```

The built app will include the proper entitlements and will prompt users for permissions on first launch.

## Development vs Production

**Development (`pnpm dev`):**
- Runs as Electron in development mode
- May need permissions granted to Electron, Terminal, or your code editor
- More verbose console logging

**Production (built app):**
- Runs as standalone app
- Needs permissions granted to "Teboraw"
- Will show system permission dialogs on first launch
