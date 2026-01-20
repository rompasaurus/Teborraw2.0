# Teboraw Browser Extension - Installation Guide

## Prerequisites

Before installing the extension, make sure you have:

1. **Google Chrome** or **Microsoft Edge** browser (Chromium-based)
2. **Teboraw API running** (backend server at `http://localhost:5185` or your configured API URL)
3. **User account** created in the Teboraw system

## Installation Steps

### Step 1: Enable Developer Mode

1. Open your browser (Chrome or Edge)
2. Navigate to the extensions page:
   - **Chrome**: Enter `chrome://extensions` in the address bar
   - **Edge**: Enter `edge://extensions` in the address bar
3. Look for the **"Developer mode"** toggle in the top-right corner
4. **Enable** Developer mode (the toggle should be ON/blue)

### Step 2: Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. In the file picker dialog, navigate to:
   ```
   /Users/rompasaurus/Documents/Teborraw2.0/apps/extension
   ```
3. Select the `extension` folder and click **"Select"** or **"Open"**

### Step 3: Verify Installation

You should see the Teboraw extension appear in your extensions list with:
- **Name**: Teboraw - Browser Activity Tracker
- **Version**: 1.0.0
- **Description**: Track your browsing activity and sync with Teboraw
- **Status**: Enabled (toggle should be ON)

### Step 4: Pin the Extension (Optional)

1. Click the **puzzle piece icon** (Extensions) in your browser toolbar
2. Find "Teboraw - Browser Activity Tracker" in the list
3. Click the **pin icon** next to it to keep it visible in your toolbar

## First-Time Setup

### Login to Your Account

1. Click the extension icon in your browser toolbar
2. You'll see the extension popup with a login form
3. Enter your credentials:
   - **API URL**: `http://localhost:5185/api` (or your custom API URL)
   - **Email**: Your registered email address
   - **Password**: Your account password
4. Click **"Login"**

### Verify It's Working

After logging in, the extension will start tracking automatically:

1. **Check the popup**: Click the extension icon to see status
   - Should show "Authenticated" or "Logged in"
   - Shows count of pending activities to sync

2. **Open Browser Console** (F12 → Console tab) and look for:
   ```
   📋 Teboraw content script loaded
   📄 Captured X chars at scroll position Y
   📤 Sent page content: X chars, Y sections
   ```

3. **Visit any webpage** and scroll around - you should see console messages indicating content is being captured

## What Gets Tracked

Once installed and authenticated, the extension automatically tracks:

### 1. Page Visits
- URL, title, domain
- Time spent on each page
- Page metadata (description, author, keywords)

### 2. Page Content
- Full article/main content text
- Visible text in viewport as you scroll
- Text from sections where you linger (5+ seconds)

### 3. Search Queries
- Searches on Google, Bing, DuckDuckGo, Yahoo
- Search terms automatically extracted

### 4. Idle Detection
- Detects when you go idle or lock your computer
- Tracks when you return to active browsing

## Debugging Connection Issues

If the extension randomly stops working or loses connection, follow these steps to diagnose the issue.

### Step 1: View Debug Logs

The extension now includes comprehensive logging. To view logs:

1. **Service Worker (Background) Logs:**
   - Go to `chrome://extensions`
   - Find Teboraw extension
   - Click "service worker" link under "Inspect views"
   - Look for messages prefixed with `[Teboraw BG]`

2. **Content Script Logs:**
   - Open any webpage
   - Press F12 to open DevTools
   - Go to Console tab
   - Look for messages prefixed with `[Teboraw CS]`

3. **Popup Logs:**
   - Right-click the extension icon
   - Select "Inspect popup"
   - Look for messages prefixed with `[Teboraw Popup]`

### Step 2: Use the Debug Button

1. Click the extension icon in toolbar
2. Click the "Debug Info (F12)" button at the bottom
3. Open DevTools (F12) and check Console tab
4. You'll see a complete state dump including:
   - Authentication status
   - Connection status
   - Pending activities count
   - Stored tokens (presence, not values)
   - Alarm schedules
   - Current tab being tracked

### Step 3: Common Issues and Solutions

**Service Worker Unloading:**
- Chrome may unload the service worker when idle
- The extension now auto-recovers state when waking up
- Look for log: `Service worker woke up - reinitializing state`

**Token Expiration:**
- Tokens are automatically refreshed on 401 errors
- Health checks run every 5 minutes to validate tokens
- If refresh fails, you'll need to re-login
- Look for logs: `Token expired`, `Attempting token refresh`

**Network Disconnection:**
- Check `connectionStatus` in debug info
- Extension retries sync on next alarm (every minute)
- Pending activities are preserved locally

**State Mismatch:**
- If `isAuthenticated` is true but tokens are missing
- Extension validates and auto-corrects on next operation
- Look for: `accessToken missing from storage (state mismatch)`

### Step 4: Force Recovery

If the extension seems stuck:

1. **Force Health Check:**
   - Open popup, check if connection status updates
   - The popup auto-refreshes every 10 seconds

2. **Manual Sync:**
   - Click "Sync Now" in popup
   - Check console for sync results

3. **Reload Extension:**
   - Go to `chrome://extensions`
   - Click reload button on Teboraw
   - Check service worker logs for initialization

4. **Clear and Re-login:**
   - Click "Logout" in popup
   - Log back in with credentials
   - This resets all tokens

### Log Message Reference

Key log messages to look for:

| Message | Meaning |
|---------|---------|
| `Extension installed/updated` | Fresh install or update |
| `Browser startup detected` | Chrome started |
| `Service worker activated` | Worker woke from idle |
| `State initialized` | Successfully loaded state from storage |
| `Authentication validated successfully` | Token is valid |
| `Token expired during validation` | Need to refresh |
| `Token refresh successful` | Got new tokens |
| `Token refresh failed` | Must re-login |
| `Sync successful` | Data sent to server |
| `Sync failed (network error)` | Can't reach server |
| `Health check complete` | Periodic validation done |

## Troubleshooting

### Extension Won't Load

**Error: "Could not load manifest"**
- Make sure you selected the correct folder (`/apps/extension`)
- Check that `manifest.json` exists in the folder
- Verify the manifest.json file is valid JSON

**Error: "Manifest version 2 is deprecated"**
- This extension uses Manifest V3, which is current
- If you see this, you may have an old Chrome version - update your browser

### Content Script Not Running

**No console messages when visiting pages:**
1. Check that the extension is enabled (`chrome://extensions`)
2. Verify "Content scripts" section shows in extension details
3. Try refreshing the page (Ctrl+R or Cmd+R)
4. Check browser console for any error messages

### Login Issues

**"Invalid credentials" error:**
- Verify your API URL is correct (should end with `/api`)
- Check that the Teboraw API server is running
- Confirm your email and password are correct
- Try creating a new account if needed

**Can't connect to API:**
- Make sure the API server is running: `cd apps/api && dotnet run`
- Check the API URL (default: `http://localhost:5185/api`)
- Verify no firewall is blocking the connection
- Check browser console (F12) for detailed error messages

### Data Not Syncing

**Activities not appearing in Dashboard:**
1. Check extension popup - should show "Authenticated"
2. Look for pending activities count in popup
3. Click "Sync Now" button in popup to force sync
4. Check browser console for sync errors
5. Verify API server is running and accessible

## Managing the Extension

### Viewing Activity Logs

1. Right-click the extension icon
2. Select "Inspect popup" or "Inspect service worker"
3. Go to Console tab to see activity logs

### Manual Sync

If activities aren't syncing automatically:
1. Click the extension icon
2. Click the "Sync Now" button
3. Check the console for sync status

### Logout

To logout from the extension:
1. Click the extension icon
2. Click "Logout" button
3. Your credentials will be removed from local storage

### Disable/Remove Extension

**To temporarily disable:**
1. Go to `chrome://extensions`
2. Toggle OFF the Teboraw extension

**To completely remove:**
1. Go to `chrome://extensions`
2. Click "Remove" on the Teboraw extension
3. Confirm removal

## Privacy & Permissions

### Required Permissions

The extension requests these permissions:

- **tabs**: To track which pages you visit
- **history**: To access browsing history
- **storage**: To store auth tokens and pending activities
- **alarms**: To schedule periodic syncing
- **idle**: To detect when you're away from computer
- **host_permissions (<all_urls>)**: To inject content script on all pages

### What Data is Collected

- URLs of pages you visit
- Page titles and metadata
- Full text content from pages (articles, etc.)
- Text visible in your viewport as you scroll
- Time spent on each page
- Search queries you enter
- Idle/active status

### Where Data is Stored

- **Locally**: Pending activities stored in browser's local storage
- **Backend**: Synced to your personal Teboraw account
- **Privacy**: Data is NOT shared with third parties
- **Purpose**: Personal productivity tracking and analysis only

## Development Mode

If you're developing/modifying the extension:

### Reload After Changes

After modifying extension files:
1. Go to `chrome://extensions`
2. Find Teboraw extension
3. Click the **reload icon** (circular arrow)
4. Refresh any open pages to reload content scripts

### View Service Worker Logs

1. Go to `chrome://extensions`
2. Find Teboraw extension
3. Click "service worker" link under "Inspect views"
4. Console opens with background script logs

### Debug Content Script

1. Open any webpage
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for messages from content.js (marked with 📋, 📄, 📤)

## Advanced Configuration

### Change API URL

If your API is running on a different URL:
1. Open extension popup
2. Logout if currently logged in
3. Enter new API URL in the login form
4. Login with credentials

### Adjust Sync Interval

To change how often activities sync:
1. Open `src/background.js`
2. Find `SYNC_INTERVAL_MINUTES` (line 4)
3. Change value (default: 1 minute)
4. Reload extension

### Modify Capture Settings

To adjust content capture behavior:
1. Open `src/content.js`
2. Modify constants at top of file:
   - `LINGER_THRESHOLD_MS`: How long to wait before considering "lingering" (default: 5000ms)
   - `SCROLL_CAPTURE_DELAY_MS`: Delay after scroll stops (default: 2000ms)
   - `MAX_TEXT_LENGTH`: Max characters per page (default: 50000)
3. Reload extension

## Support

### Getting Help

If you encounter issues:

1. **Check console logs**: F12 → Console for error messages
2. **Verify API is running**: Visit `http://localhost:5185/api` in browser
3. **Check extension status**: `chrome://extensions` → Teboraw details
4. **Review this guide**: Re-read installation steps

### Common Solutions

**Extension not tracking:**
- Reload the extension
- Refresh the webpage
- Check you're logged in
- Verify content script is loaded (check console)

**Login fails:**
- Verify API URL format: `http://localhost:5185/api`
- Check API server is running
- Confirm credentials are correct
- Look at network tab in DevTools for failed requests

**Sync not working:**
- Click "Sync Now" manually
- Check network connectivity
- Verify API server is accessible
- Look for auth token expiration (re-login)

## Next Steps

After installation:

1. **Browse normally** - Extension tracks automatically
2. **Visit the Dashboard** - Open `http://localhost:5173` to see tracked data
3. **Review captured content** - Expand PageVisit activities to see scraped text
4. **Adjust settings** - Modify capture thresholds if needed

Happy tracking! 🚀
