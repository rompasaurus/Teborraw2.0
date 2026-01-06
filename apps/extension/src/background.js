// Teboraw Browser Extension - Background Service Worker

const DEFAULT_API_URL = 'http://localhost:5000/api'
const SYNC_INTERVAL_MINUTES = 1
const SEARCH_ENGINES = {
  'google.com': /[?&]q=([^&]+)/,
  'bing.com': /[?&]q=([^&]+)/,
  'duckduckgo.com': /[?&]q=([^&]+)/,
  'yahoo.com': /[?&]p=([^&]+)/,
}

// State
let currentTab = null
let currentTabStart = Date.now()
let pendingActivities = []
let isAuthenticated = false

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Teboraw extension installed')
  await initializeState()
  setupAlarms()
})

chrome.runtime.onStartup.addListener(async () => {
  await initializeState()
  setupAlarms()
})

async function initializeState() {
  const stored = await chrome.storage.local.get([
    'accessToken',
    'pendingActivities',
  ])

  isAuthenticated = !!stored.accessToken
  pendingActivities = stored.pendingActivities || []
}

function setupAlarms() {
  chrome.alarms.create('sync', { periodInMinutes: SYNC_INTERVAL_MINUTES })
}

// Tab tracking
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await recordCurrentTabDuration()

  const tab = await chrome.tabs.get(activeInfo.tabId)
  if (tab.url) {
    startTrackingTab(tab)
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
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

// Sync alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync') {
    await syncActivities()
  }
})

async function syncActivities() {
  if (!isAuthenticated || pendingActivities.length === 0) return

  const stored = await chrome.storage.local.get([
    'apiUrl',
    'accessToken',
    'deviceId',
    'lastSyncTimestamp',
  ])

  const apiUrl = stored.apiUrl || DEFAULT_API_URL
  const accessToken = stored.accessToken
  let deviceId = stored.deviceId

  if (!deviceId) {
    deviceId = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await chrome.storage.local.set({ deviceId })
  }

  const activitiesToSync = [...pendingActivities]

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

    if (response.ok) {
      // Remove synced activities
      pendingActivities = pendingActivities.slice(activitiesToSync.length)
      await chrome.storage.local.set({
        pendingActivities,
        lastSyncTimestamp: new Date().toISOString(),
      })

      console.log(`Synced ${activitiesToSync.length} activities`)
    } else if (response.status === 401) {
      // Token expired
      await refreshToken()
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

async function refreshToken() {
  const stored = await chrome.storage.local.get(['apiUrl', 'refreshToken'])

  if (!stored.refreshToken) {
    isAuthenticated = false
    return
  }

  try {
    const response = await fetch(
      `${stored.apiUrl || DEFAULT_API_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      await chrome.storage.local.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      isAuthenticated = true
    } else {
      isAuthenticated = false
      await chrome.storage.local.remove(['accessToken', 'refreshToken'])
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    sendResponse({
      isAuthenticated,
      pendingCount: pendingActivities.length,
    })
    return true
  }

  if (message.type === 'LOGIN') {
    handleLogin(message.data).then(sendResponse)
    return true
  }

  if (message.type === 'LOGOUT') {
    handleLogout().then(sendResponse)
    return true
  }

  if (message.type === 'SYNC_NOW') {
    syncActivities().then(() => sendResponse({ success: true }))
    return true
  }
})

async function handleLogin({ apiUrl, email, password }) {
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
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
    return { success: true, user: data.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function handleLogout() {
  const stored = await chrome.storage.local.get(['apiUrl', 'refreshToken'])

  if (stored.refreshToken) {
    try {
      await fetch(`${stored.apiUrl || DEFAULT_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      })
    } catch {
      // Ignore logout errors
    }
  }

  await chrome.storage.local.remove([
    'accessToken',
    'refreshToken',
    'user',
  ])

  isAuthenticated = false
  return { success: true }
}
