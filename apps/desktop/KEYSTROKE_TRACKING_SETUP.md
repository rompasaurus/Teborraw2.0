# Keystroke Tracking Setup Guide

## Problem
The keystroke tracking feature is currently disabled because the `uiohook-napi` native module was not properly initialized. This module requires:
1. Accessibility permissions on macOS
2. Proper native module compilation

## Solution

### Step 1: Grant Accessibility Permissions (macOS)

**IMPORTANT:** You must grant permissions BEFORE running the app.

1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the lock icon and authenticate
3. Find your app in the list (may be "Electron" during development)
4. Enable the checkbox
5. If the app isn't listed, click the "+" button and add:
   - For development: `/Applications/Electron.app` or your electron binary
   - For production: Your built Teboraw app

### Step 2: Rebuild Native Modules

Run these commands in the desktop app directory:

```bash
cd apps/desktop

# Rebuild uiohook-napi for your Electron version
pnpm rebuild uiohook-napi

# Or rebuild all native modules
pnpm run rebuild
```

### Step 3: Restart the Application

After granting permissions and rebuilding:

```bash
# For development
pnpm run dev

# Or for production build
pnpm run build
pnpm run preview
```

## Verification

When the app starts correctly, you should see in the console:

```
✅ uiohook-napi loaded successfully
InputMonitor: Created with uiohook-napi
✅ InputMonitor started
✅ Activity tracker started
   Input monitor enabled: true
   Accessibility permission: ✅
```

If you see errors instead, check:
- Accessibility permissions are granted
- The native module was rebuilt for your Electron version
- You restarted the app after granting permissions

## What Gets Tracked

Once working, the InputMonitor will capture:

### Keyboard Activity
- **Total Keystrokes**: Count of all key presses
- **Words Typed**: Estimated word count (space/enter = word boundary, or every 5 keystrokes)
- **Typing Speed**: Average WPM (Words Per Minute)
- **Modifier Keys**: Usage count for Shift, Ctrl, Alt, Cmd/Win

### Mouse Activity
- **Total Clicks**: Overall click count
- **Click Breakdown**: Left, right, and middle button clicks
- **Mouse Distance**: Total pixels the mouse traveled
- **Scroll Distance**: Total scroll distance in pixels

## Data Privacy

All keystroke data is:
- Aggregated into statistics (no actual key content is recorded)
- Stored locally on your machine
- Only synced to your account (not shared with others)
- Counted for productivity metrics, not logged verbatim

## Troubleshooting

### "uiohook-napi failed to load"
- Rebuild the module: `pnpm rebuild uiohook-napi`
- Make sure you're in the `apps/desktop` directory
- Check that uiohook-napi is in package.json dependencies

### "Input monitoring is disabled"
- Grant Accessibility permissions in System Settings
- Restart the app after granting permissions
- On macOS, you may need to completely quit and relaunch

### Module version mismatch
```bash
# Clean and reinstall
rm -rf node_modules
pnpm install
pnpm run rebuild
```

### Still not working?
Check the [uiohook-napi documentation](https://github.com/SnosMe/uiohook-napi) for platform-specific issues.
