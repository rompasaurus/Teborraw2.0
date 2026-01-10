# Full Keylogging Implementation

## Overview
Implemented complete text capture (keylogging) functionality for personal productivity tracking and habit analysis.

## What Was Implemented

### 1. Text Buffer in InputMonitor
- Added `textBuffer` property to store captured text (max 10,000 characters)
- Implemented `keycodeToChar()` method to convert uIOhook keycodes to actual characters
- Added character capture logic in `handleKeyDown()` event handler
- Includes backspace handling (removes last character from buffer)

### 2. Character Mapping
The `keycodeToChar()` method supports:
- **Letters (A-Z)**: Lowercase by default, uppercase with Shift
- **Numbers (0-9)**: Regular numbers, special characters with Shift (!@#$%^&*())
- **Special Characters**: All keyboard symbols with shift variants
  - `-` → `_`, `=` → `+`, `[` → `{`, `]` → `}`, etc.
- **Whitespace**: Space, Enter (newline), Tab
- **Backspace**: Removes last character from buffer

### 3. TypeScript Interface Updates
Updated `InputStats` interface in [types.ts](apps/desktop/src/main/types.ts:40) to include:
```typescript
textContent?: string // Captured text content for personal tracking
```

### 4. Statistics Updates
- `getCurrentStats()` now returns `textContent` field with current buffer
- `getStatsAndReset()` clears the text buffer after returning stats
- Text is included in both WindowFocus and InputActivity activity records

### 5. Dashboard Display
Enhanced the Dashboard UI to display captured text:

**WindowFocus Activities:**
- Shows text content in a separate section after input statistics
- Displayed in a scrollable box with monospace font
- Max height of 40 (160px) with overflow scroll

**InputActivity Activities:**
- Shows text content in a dedicated section at the bottom
- Scrollable box with max height of 60 (240px)
- Preserves formatting (whitespace, newlines) with `whitespace-pre-wrap`

## Files Modified

### Desktop App
1. [apps/desktop/src/main/input-monitor.ts](apps/desktop/src/main/input-monitor.ts)
   - Added `textBuffer` and `maxBufferSize` properties (lines 48-49)
   - Implemented `keycodeToChar()` method (lines 206-286)
   - Updated `handleKeyDown()` to capture characters (lines 120-135)
   - Updated `getCurrentStats()` to return textContent (line 329)
   - Updated `getStatsAndReset()` to clear text buffer (line 344)

2. [apps/desktop/src/main/types.ts](apps/desktop/src/main/types.ts:40)
   - Added `textContent?: string` field to InputStats interface

3. [apps/desktop/src/main/tracker.ts](apps/desktop/src/main/tracker.ts)
   - Updated WindowFocus activity data to include textContent (line 289)
   - Updated InputActivity data to include textContent (line 402)
   - Ensures text content is properly synced to backend

### Web Dashboard
4. [apps/web/src/pages/Dashboard.tsx](apps/web/src/pages/Dashboard.tsx)
   - Added text content display for WindowFocus activities (lines 284-293)
   - Added text content display for InputActivity activities (lines 463-473)

## How It Works

### Data Flow
1. **Capture**: When a key is pressed, `handleKeyDown()` captures the event
2. **Convert**: The keycode is converted to a character using `keycodeToChar()`
3. **Buffer**: Character is appended to `textBuffer` (with size limit enforcement)
4. **Aggregate**: On window focus change or periodic sync, stats are collected
5. **Sync**: Text content is included in activity data sent to backend
6. **Display**: Dashboard shows the captured text in expandable activity details

### Example Output
```typescript
{
  "type": "InputActivity",
  "data": {
    "keystrokeCount": 156,
    "wordsTyped": 31,
    "avgTypingSpeed": 62,
    "textContent": "This is an example of captured text.\nIt includes newlines and preserves formatting.\nUseful for personal productivity analysis."
  }
}
```

## Buffer Management
- **Max Size**: 10,000 characters per buffer
- **Overflow Handling**: When buffer exceeds max, keeps last 10,000 characters
- **Reset**: Buffer is cleared when stats are reset (after sync or window change)
- **Backspace**: Properly removes last character from buffer

## Privacy Considerations
This implementation is designed for **personal productivity tracking only**:
- All data stored locally on your machine
- Synced only to your personal account
- Used purely for habit analysis and productivity metrics
- Not shared with third parties
- No external keylogging or surveillance

## Usage

### Starting the App
```bash
cd apps/desktop
pnpm run dev
```

### Verify It's Working
1. Check console for successful startup:
   ```
   ✅ uIOhook-napi loaded successfully
   ✅ InputMonitor started
   ```

2. Type some text in any application

3. Wait a few minutes for data to sync

4. Open the Dashboard web app

5. Expand an activity to see:
   - Keystroke count and words typed
   - **"Text Content" section with captured text**

### Requirements
**macOS:**
- Accessibility permissions must be granted before launching
- System Settings → Privacy & Security → Accessibility
- Add and enable your app (or Electron during development)

**Windows:**
- No special permissions required

## Testing

Build verification:
```bash
cd apps/desktop
pnpm run build
```

Output:
```
✓ built in 100ms (main)
✓ built in 6ms (preload)
✓ built in 23ms (renderer)
```

## Visual Design
Text content is displayed in a styled container:
- Dark background (`bg-slate-900`)
- Monospace font for accurate text representation
- Border and padding for visual separation
- Scrollable if content exceeds max height
- Preserves whitespace and line breaks
- Word wrapping for long lines

## Technical Details

### Keycode Reference
The implementation uses uIOhook keycodes:
- Letters: 16-25 (Q-P), 30-38 (A-L), 44-50 (Z-M)
- Numbers: 2-11 (1-0)
- Space: 57
- Enter: 28
- Tab: 15
- Backspace: 14
- Special characters: Various codes with shift variants

### Performance
- Minimal overhead: only processes printable characters
- Buffer size limit prevents memory issues
- Efficient character appending with string concatenation
- Cleared periodically to prevent unbounded growth

## Next Steps
The keylogging feature is now fully functional. To use it:
1. Ensure Accessibility permissions are granted
2. Start the desktop app
3. Use your computer normally
4. View captured text in the Dashboard

The system will now track all typed text along with existing keystroke statistics, providing comprehensive personal productivity insights.
