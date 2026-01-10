# InputMonitor API Fix

## Issue
The `InputMonitor` was failing to start with error:
```
❌ Failed to start InputMonitor: TypeError: uiohook.on is not a function
```

## Root Cause
The `uiohook-napi` package exports `uIOhook` (with capital `IO`), not `uiohook`. The correct import is:

```typescript
const { uIOhook } = require('uiohook-napi')
```

## Fix Applied
Updated [input-monitor.ts](src/main/input-monitor.ts) to:
1. Import `uIOhook` correctly from the module
2. Updated all references from `uiohook` to `uIOhook`

## Changes
- Line 15-16: Changed import to extract `uIOhook` from module
- Lines 69-75: Changed all `uiohook.on()` calls to `uIOhook.on()`
- Line 96: Changed `uiohook.stop()` to `uIOhook.stop()`

## Verification
Build completed successfully:
```
✓ built in 97ms
```

## Next Steps
1. **Grant Accessibility Permissions** (macOS):
   - System Settings → Privacy & Security → Accessibility
   - Enable your app (or Electron during development)
   - **Must grant BEFORE launching the app**

2. **Start the App**:
   ```bash
   cd apps/desktop
   pnpm run dev
   ```

3. **Verify**:
   Look for these console messages:
   ```
   ✅ uiohook-napi loaded successfully
   InputMonitor: Created with uiohook-napi
   ✅ InputMonitor started
   ✅ Activity tracker started
      Input monitor enabled: true
      Accessibility permission: ✅
   ```

4. **Test**:
   - Type some text in any application
   - Click around with your mouse
   - Wait a few minutes for data to sync
   - Check the Dashboard web app
   - Expand an activity to see input statistics
   - Verify "Words Typed" shows non-zero values

## Expected Data
Once working, you should see:
- WindowFocus activities with keystroke/word counts
- InputActivity entries every 5 minutes with detailed stats
- Mouse clicks, distance, scroll distance tracked
- Modifier key usage (Shift, Ctrl, Alt, Cmd)
- WPM (Words Per Minute) calculations

## Troubleshooting
If still not working:
1. Check accessibility permissions are granted
2. Completely quit and restart the app (not just reload)
3. Check console for error messages
4. Try rebuilding: `pnpm rebuild uiohook-napi`
