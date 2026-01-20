// Teboraw Browser Extension - Background Service Worker

const DEFAULT_API_URL = 'http://localhost:5185/api'
const SYNC_INTERVAL_MINUTES = 1
const HEALTH_CHECK_INTERVAL_MINUTES = 5
const SEARCH_ENGINES = {
  'google.com': /[?&]q=([^&]+)/,
  'bing.com': /[?&]q=([^&]+)/,
  'duckduckgo.com': /[?&]q=([^&]+)/,
  'yahoo.com': /[?&]p=([^&]+)/,
}

// =============================================================================
// DEBUG LOGGING SYSTEM
// =============================================================================
const DEBUG = true // Set to false in production
const LOG_PREFIX = '[Teboraw BG]'

function log(...args) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logError(...args) {
  console.error(LOG_PREFIX, new Date().toISOString(), 'ERROR:', ...args)
}

function logWarn(...args) {
  if (DEBUG) console.warn(LOG_PREFIX, new Date().toISOString(), 'WARN:', ...args)
}

function logState(context) {
  if (DEBUG) {
    console.log(LOG_PREFIX, `[STATE @ ${context}]`, {
      isAuthenticated,
      pendingCount: pendingActivities.length,
      currentTab: currentTab ? currentTab.url : null,
      timestamp: new Date().toISOString(),
    })
  }
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================
let currentTab = null
let currentTabStart = Date.now()
let pendingActivities = []
let isAuthenticated = false
let isInitialized = false
let lastHealthCheck = null
let connectionStatus = 'unknown' // 'connected', 'disconnected', 'unknown'

// Ensure state is always initialized before any operation
async function ensureInitialized() {
  if (!isInitialized) {
    log('Service worker woke up - reinitializing state')
    await initializeState()
  }
  return isAuthenticated
}

// =============================================================================
// INITIALIZATION
// =============================================================================
chrome.runtime.onInstalled.addListener(async (details) => {
  log('Extension installed/updated', { reason: details.reason, previousVersion: details.previousVersion })
  await initializeState()
  setupAlarms()
  logState('onInstalled')
})

chrome.runtime.onStartup.addListener(async () => {
  log('Browser startup detected')
  await initializeState()
  setupAlarms()
  logState('onStartup')
})

// CRITICAL: Handle service worker wake-up for any message/event
// This ensures state is restored when Chrome wakes the service worker
self.addEventListener('activate', async (event) => {
  log('Service worker activated')
  event.waitUntil(initializeState())
})

async function initializeState() {
  log('Initializing state from storage...')

  try {
    const stored = await chrome.storage.local.get([
      'accessToken',
      'refreshToken',
      'pendingActivities',
      'apiUrl',
      'user',
    ])

    const hadToken = !!stored.accessToken
    const hadRefreshToken = !!stored.refreshToken

    isAuthenticated = hadToken
    pendingActivities = stored.pendingActivities || []
    isInitialized = true

    log('State initialized:', {
      hasAccessToken: hadToken,
      hasRefreshToken: hadRefreshToken,
      pendingCount: pendingActivities.length,
      apiUrl: stored.apiUrl || DEFAULT_API_URL,
      user: stored.user?.email || 'none',
    })

    // If we have a refresh token but no access token, try to refresh
    if (!hadToken && hadRefreshToken) {
      log('Access token missing but refresh token exists - attempting refresh')
      await refreshToken()
    }

    // Validate token if we think we're authenticated
    if (isAuthenticated) {
      log('Validating existing authentication...')
      await validateAuthentication()
    }
  } catch (error) {
    logError('Failed to initialize state:', error)
    isAuthenticated = false
    pendingActivities = []
    isInitialized = true
  }
}

async function validateAuthentication() {
  try {
    const stored = await chrome.storage.local.get(['apiUrl', 'accessToken'])
    if (!stored.accessToken) {
      log('No access token found during validation')
      isAuthenticated = false
      connectionStatus = 'disconnected'
      return
    }

    const apiUrl = stored.apiUrl || DEFAULT_API_URL

    // Make a lightweight API call to validate the token
    const response = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stored.accessToken}`,
      },
    })

    if (response.ok) {
      log('Authentication validated successfully')
      isAuthenticated = true
      connectionStatus = 'connected'
      lastHealthCheck = Date.now()
    } else if (response.status === 401) {
      log('Token expired during validation - attempting refresh')
      await refreshToken()
    } else {
      logWarn('Unexpected response during validation:', response.status)
      connectionStatus = 'unknown'
    }
  } catch (error) {
    logError('Authentication validation failed (network error):', error.message)
    connectionStatus = 'disconnected'
    // Don't set isAuthenticated to false here - might just be network issue
  }
}

function setupAlarms() {
  log('Setting up alarms...')
  chrome.alarms.create('sync', { periodInMinutes: SYNC_INTERVAL_MINUTES })
  chrome.alarms.create('healthCheck', { periodInMinutes: HEALTH_CHECK_INTERVAL_MINUTES })
  log('Alarms created: sync every', SYNC_INTERVAL_MINUTES, 'min, healthCheck every', HEALTH_CHECK_INTERVAL_MINUTES, 'min')
}

// =============================================================================
// TAB TRACKING
// =============================================================================
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await ensureInitialized()
  log('Tab activated:', activeInfo.tabId)

  await recordCurrentTabDuration()

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      startTrackingTab(tab)
    }
  } catch (error) {
    logError('Failed to get tab info:', error.message)
  }
})

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    await ensureInitialized()
    log('Tab updated (complete):', tab.url?.substring(0, 50))

    await recordCurrentTabDuration()
    startTrackingTab(tab)

    // Check for search
    checkForSearch(tab.url)
  }
})

function startTrackingTab(tab) {
  if (!tab.url || tab.url.startsWith('chrome://')) {
    currentTab = null
    return
  }

  currentTab = {
    id: tab.id,
    url: tab.url,
    title: tab.title || '',
    domain: getDomain(tab.url),
  }
  currentTabStart = Date.now()
}

async function recordCurrentTabDuration() {
  if (!currentTab || !isAuthenticated) return

  const duration = Math.floor((Date.now() - currentTabStart) / 1000)

  if (duration < 1) return

  const activity = {
    type: 'PageVisit',
    source: 'Browser',
    timestamp: new Date(currentTabStart).toISOString(),
    data: {
      url: currentTab.url,
      title: currentTab.title,
      domain: currentTab.domain,
      durationSeconds: duration,
    },
  }

  pendingActivities.push(activity)
  await chrome.storage.local.set({ pendingActivities })
}

function checkForSearch(url) {
  if (!isAuthenticated) return

  const domain = getDomain(url)
  const pattern = SEARCH_ENGINES[domain]

  if (!pattern) return

  const match = url.match(pattern)
  if (match && match[1]) {
    const query = decodeURIComponent(match[1].replace(/\+/g, ' '))

    const activity = {
      type: 'Search',
      source: 'Browser',
      timestamp: new Date().toISOString(),
      data: {
        query,
        engine: domain.split('.')[0],
      },
    }

    pendingActivities.push(activity)
    chrome.storage.local.set({ pendingActivities })
  }
}

function getDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

// Idle detection
chrome.idle.onStateChanged.addListener(async (state) => {
  if (!isAuthenticated) return

  if (state === 'idle' || state === 'locked') {
    await recordCurrentTabDuration()

    const activity = {
      type: 'IdleStart',
      source: 'Browser',
      timestamp: new Date().toISOString(),
      data: { state },
    }

    pendingActivities.push(activity)
    await chrome.storage.local.set({ pendingActivities })
  } else if (state === 'active') {
    const activity = {
      type: 'IdleEnd',
      source: 'Browser',
      timestamp: new Date().toISOString(),
      data: {},
    }

    pendingActivities.push(activity)
    await chrome.storage.local.set({ pendingActivities })
  }
})

// =============================================================================
// ALARM HANDLERS
// =============================================================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  log('Alarm triggered:', alarm.name)
  await ensureInitialized()

  if (alarm.name === 'sync') {
    await syncActivities()
  } else if (alarm.name === 'healthCheck') {
    await performHealthCheck()
  }
})

async function performHealthCheck() {
  log('Performing health check...')
  logState('healthCheck')

  try {
    const stored = await chrome.storage.local.get(['apiUrl', 'accessToken', 'refreshToken'])

    if (!stored.accessToken && !stored.refreshToken) {
      log('Health check: No tokens - user not logged in')
      isAuthenticated = false
      connectionStatus = 'disconnected'
      return
    }

    if (!stored.accessToken && stored.refreshToken) {
      log('Health check: Access token missing, attempting refresh')
      await refreshToken()
      return
    }

    // Try to validate the token
    await validateAuthentication()

    log('Health check complete:', {
      isAuthenticated,
      connectionStatus,
      pendingCount: pendingActivities.length,
    })
  } catch (error) {
    logError('Health check failed:', error.message)
    connectionStatus = 'disconnected'
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================
async function syncActivities() {
  log('Sync triggered - checking conditions...')

  if (!isAuthenticated) {
    log('Sync skipped: not authenticated')
    return
  }

  if (pendingActivities.length === 0) {
    log('Sync skipped: no pending activities')
    return
  }

  log('Starting sync of', pendingActivities.length, 'activities')

  const stored = await chrome.storage.local.get([
    'apiUrl',
    'accessToken',
    'deviceId',
    'lastSyncTimestamp',
  ])

  // Double-check we have a token (might have been cleared)
  if (!stored.accessToken) {
    logWarn('Sync aborted: accessToken missing from storage (state mismatch)')
    isAuthenticated = false
    return
  }

  const apiUrl = stored.apiUrl || DEFAULT_API_URL
  const accessToken = stored.accessToken
  let deviceId = stored.deviceId

  if (!deviceId) {
    deviceId = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    await chrome.storage.local.set({ deviceId })
    log('Generated new deviceId:', deviceId)
  }

  const activitiesToSync = [...pendingActivities]
  log('Syncing to:', `${apiUrl}/activities/sync`, 'with', activitiesToSync.length, 'activities')

  try {
    const response = await fetch(`${apiUrl}/activities/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        deviceId,
        activities: activitiesToSync,
        lastSyncTimestamp:
          stored.lastSyncTimestamp || new Date(0).toISOString(),
      }),
    })

    log('Sync response status:', response.status)

    if (response.ok) {
      // Remove synced activities
      pendingActivities = pendingActivities.slice(activitiesToSync.length)
      await chrome.storage.local.set({
        pendingActivities,
        lastSyncTimestamp: new Date().toISOString(),
      })

      connectionStatus = 'connected'
      log('Sync successful:', activitiesToSync.length, 'activities synced, remaining:', pendingActivities.length)
    } else if (response.status === 401) {
      logWarn('Sync failed: 401 Unauthorized - token may be expired')
      const refreshed = await refreshToken()
      if (refreshed) {
        log('Token refreshed - retrying sync')
        // Retry sync with new token
        await syncActivities()
      } else {
        logError('Token refresh failed - user needs to re-login')
        connectionStatus = 'disconnected'
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error')
      logError('Sync failed with status:', response.status, errorText)
      connectionStatus = 'disconnected'
    }
  } catch (error) {
    logError('Sync failed (network error):', error.message)
    connectionStatus = 'disconnected'
  }
}

async function refreshToken() {
  log('Attempting token refresh...')

  const stored = await chrome.storage.local.get(['apiUrl', 'refreshToken'])

  if (!stored.refreshToken) {
    logWarn('Token refresh failed: no refresh token in storage')
    isAuthenticated = false
    connectionStatus = 'disconnected'
    return false
  }

  const apiUrl = stored.apiUrl || DEFAULT_API_URL
  log('Refreshing token via:', `${apiUrl}/auth/refresh`)

  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    })

    log('Token refresh response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      await chrome.storage.local.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      isAuthenticated = true
      connectionStatus = 'connected'
      log('Token refresh successful - new tokens stored')
      return true
    } else {
      const errorText = await response.text().catch(() => 'Unknown error')
      logError('Token refresh failed:', response.status, errorText)
      isAuthenticated = false
      connectionStatus = 'disconnected'
      await chrome.storage.local.remove(['accessToken', 'refreshToken'])
      log('Cleared invalid tokens from storage')
      return false
    }
  } catch (error) {
    logError('Token refresh failed (network error):', error.message)
    // Don't clear tokens on network error - might be temporary
    connectionStatus = 'disconnected'
    return false
  }
}

// =============================================================================
// MESSAGE HANDLING
// =============================================================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  log('Message received:', message.type)

  // Ensure state is initialized before processing any message
  ensureInitialized().then(() => {
    handleMessage(message, sendResponse)
  }).catch((error) => {
    logError('Failed to initialize before handling message:', error)
    sendResponse({ success: false, error: 'Extension not initialized' })
  })

  // Return true to indicate we will call sendResponse asynchronously
  return true
})

async function handleMessage(message, sendResponse) {
  try {
    switch (message.type) {
      case 'GET_STATUS': {
        const status = {
          isAuthenticated,
          pendingCount: pendingActivities.length,
          connectionStatus,
          lastHealthCheck,
          debug: DEBUG ? {
            isInitialized,
            currentTab: currentTab?.url?.substring(0, 50) || null,
          } : undefined,
        }
        log('GET_STATUS response:', status)
        sendResponse(status)
        break
      }

      case 'LOGIN': {
        const result = await handleLogin(message.data)
        sendResponse(result)
        break
      }

      case 'LOGOUT': {
        const result = await handleLogout()
        sendResponse(result)
        break
      }

      case 'SYNC_NOW': {
        log('Manual sync requested')
        await syncActivities()
        sendResponse({ success: true, pendingCount: pendingActivities.length })
        break
      }

      case 'PAGE_CONTENT': {
        const result = await handlePageContent(message.data)
        sendResponse(result)
        break
      }

      case 'GET_DEBUG_INFO': {
        // New message type for debugging
        const debugInfo = await getDebugInfo()
        sendResponse(debugInfo)
        break
      }

      case 'FORCE_HEALTH_CHECK': {
        // New message type for manual health check
        await performHealthCheck()
        sendResponse({
          isAuthenticated,
          connectionStatus,
          pendingCount: pendingActivities.length,
        })
        break
      }

      default:
        logWarn('Unknown message type:', message.type)
        sendResponse({ success: false, error: 'Unknown message type' })
    }
  } catch (error) {
    logError('Error handling message:', message.type, error)
    sendResponse({ success: false, error: error.message })
  }
}

async function getDebugInfo() {
  const stored = await chrome.storage.local.get(null) // Get all storage
  const alarms = await chrome.alarms.getAll()

  return {
    state: {
      isAuthenticated,
      isInitialized,
      connectionStatus,
      lastHealthCheck,
      pendingCount: pendingActivities.length,
      currentTab: currentTab?.url || null,
    },
    storage: {
      hasAccessToken: !!stored.accessToken,
      hasRefreshToken: !!stored.refreshToken,
      apiUrl: stored.apiUrl || DEFAULT_API_URL,
      user: stored.user?.email || null,
      deviceId: stored.deviceId || null,
      lastSyncTimestamp: stored.lastSyncTimestamp || null,
      storedPendingCount: stored.pendingActivities?.length || 0,
    },
    alarms: alarms.map(a => ({
      name: a.name,
      scheduledTime: new Date(a.scheduledTime).toISOString(),
    })),
    timestamp: new Date().toISOString(),
  }
}

async function handlePageContent(contentData) {
  log('Received page content:', {
    url: contentData.url?.substring(0, 50),
    length: contentData.totalLength,
    sections: contentData.sectionCount,
  })

  if (!isAuthenticated) {
    logWarn('Page content rejected: not authenticated')
    return { success: false, error: 'Not authenticated' }
  }

  // Create a PageVisit activity with captured content
  const activity = {
    type: 'PageVisit',
    source: 'Browser',
    timestamp: contentData.capturedAt,
    data: {
      url: contentData.url,
      title: contentData.title,
      domain: getDomain(contentData.url),
      metadata: contentData.metadata,
      mainContent: contentData.mainContent,
      sections: contentData.sections,
      totalLength: contentData.totalLength,
      sectionCount: contentData.sectionCount,
    },
  }

  pendingActivities.push(activity)
  await chrome.storage.local.set({ pendingActivities })

  log('Stored page content:', contentData.totalLength, 'chars from', contentData.url?.substring(0, 50))
  log('Pending activities now:', pendingActivities.length)

  return { success: true, pendingCount: pendingActivities.length }
}

async function handleLogin({ apiUrl, email, password }) {
  log('Login attempt for:', email, 'via', apiUrl)

  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    log('Login response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Invalid credentials')
      logError('Login failed:', response.status, errorText)
      return { success: false, error: 'Invalid credentials' }
    }

    const data = await response.json()

    await chrome.storage.local.set({
      apiUrl,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    })

    isAuthenticated = true
    connectionStatus = 'connected'
    log('Login successful for:', data.user?.email)
    logState('afterLogin')

    return { success: true, user: data.user }
  } catch (error) {
    logError('Login failed (network error):', error.message)
    return { success: false, error: error.message }
  }
}

async function handleLogout() {
  log('Logout requested')

  const stored = await chrome.storage.local.get(['apiUrl', 'refreshToken'])

  if (stored.refreshToken) {
    try {
      await fetch(`${stored.apiUrl || DEFAULT_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      })
      log('Server logout successful')
    } catch (error) {
      logWarn('Server logout failed (continuing with local logout):', error.message)
    }
  }

  await chrome.storage.local.remove([
    'accessToken',
    'refreshToken',
    'user',
  ])

  isAuthenticated = false
  connectionStatus = 'disconnected'
  log('Local logout complete')
  logState('afterLogout')

  return { success: true }
}
