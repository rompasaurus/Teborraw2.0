// Popup script with debug logging

// =============================================================================
// DEBUG LOGGING
// =============================================================================
const DEBUG = true
const LOG_PREFIX = '[Teboraw Popup]'

function log(...args) {
  if (DEBUG) console.log(LOG_PREFIX, new Date().toISOString(), ...args)
}

function logError(...args) {
  console.error(LOG_PREFIX, new Date().toISOString(), 'ERROR:', ...args)
}

// Safe message sending with error handling
async function sendMessage(message) {
  log('Sending message:', message.type)
  try {
    const response = await chrome.runtime.sendMessage(message)
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message)
    }
    log('Message response:', message.type, response)
    return response
  } catch (error) {
    logError('Message failed:', message.type, error.message)
    // Check if extension context is invalidated
    if (error.message.includes('Extension context invalidated')) {
      showError('Extension disconnected. Please close and reopen this popup.')
    }
    return null
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error')
  errorDiv.textContent = message
  errorDiv.classList.remove('hidden')
}

document.addEventListener('DOMContentLoaded', async () => {
  log('Popup opened')

  const loginSection = document.getElementById('loginSection')
  const statusSection = document.getElementById('statusSection')
  const errorDiv = document.getElementById('error')

  // Check if user is logged in
  log('Checking stored credentials...')
  const stored = await chrome.storage.local.get(['accessToken', 'user', 'apiUrl'])
  log('Stored data:', {
    hasToken: !!stored.accessToken,
    user: stored.user?.email || null,
    apiUrl: stored.apiUrl || 'default',
  })

  if (stored.accessToken) {
    showStatus(stored.user)
    await updateStatus()
  } else {
    showLogin()
  }

  // Login handler
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const apiUrl = document.getElementById('apiUrl').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    log('Login attempt for:', email, 'via', apiUrl)
    errorDiv.classList.add('hidden')

    const response = await sendMessage({
      type: 'LOGIN',
      data: { apiUrl, email, password },
    })

    if (response?.success) {
      log('Login successful')
      showStatus(response.user)
      await updateStatus()
    } else {
      log('Login failed:', response?.error || 'No response')
      errorDiv.textContent = response?.error || 'Connection failed - please try again'
      errorDiv.classList.remove('hidden')
    }
  })

  // Sync handler
  document.getElementById('syncBtn').addEventListener('click', async () => {
    log('Manual sync requested')
    const btn = document.getElementById('syncBtn')
    btn.disabled = true
    btn.textContent = 'Syncing...'

    const response = await sendMessage({ type: 'SYNC_NOW' })
    log('Sync response:', JSON.stringify(response, null, 2))

    if (response && !response.success) {
      log('Sync failed! connectionStatus:', response.connectionStatus)
    }

    btn.disabled = false
    btn.textContent = 'Sync Now'
    await updateStatus()
  })

  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    log('Logout requested')
    await sendMessage({ type: 'LOGOUT' })
    showLogin()
  })

  // Debug info handler (if debug button exists)
  const debugBtn = document.getElementById('debugBtn')
  if (debugBtn) {
    debugBtn.addEventListener('click', async () => {
      log('Debug info requested')
      const debugInfo = await sendMessage({ type: 'GET_DEBUG_INFO' })
      console.log('=== DEBUG INFO ===')
      console.log(JSON.stringify(debugInfo, null, 2))
      console.log('==================')
      alert('Debug info logged to console (F12 to view)')
    })
  }

  function showLogin() {
    log('Showing login screen')
    loginSection.classList.remove('hidden')
    statusSection.classList.add('hidden')
  }

  function showStatus(user) {
    log('Showing status screen for:', user?.email)
    loginSection.classList.add('hidden')
    statusSection.classList.remove('hidden')

    if (user) {
      document.getElementById('userName').textContent = user.displayName
      document.getElementById('userEmail').textContent = user.email
    }
  }

  async function updateStatus() {
    log('Updating status...')
    const response = await sendMessage({ type: 'GET_STATUS' })

    if (!response) {
      log('Failed to get status')
      return
    }

    const stored = await chrome.storage.local.get(['lastSyncTimestamp'])

    log('Status update:', {
      isAuthenticated: response.isAuthenticated,
      pendingCount: response.pendingCount,
      connectionStatus: response.connectionStatus,
      lastSync: stored.lastSyncTimestamp,
    })

    document.getElementById('pendingCount').textContent = response.pendingCount

    if (stored.lastSyncTimestamp) {
      const lastSync = new Date(stored.lastSyncTimestamp)
      const now = new Date()
      const diff = Math.floor((now - lastSync) / 60000)

      document.getElementById('lastSync').textContent =
        diff < 1 ? 'Now' : `${diff}m ago`
    }

    const indicator = document.getElementById('statusIndicator')
    const title = document.getElementById('statusTitle')
    const desc = document.getElementById('statusDesc')

    if (response.isAuthenticated) {
      indicator.classList.add('active')
      indicator.classList.remove('inactive')
      title.textContent = 'Tracking Active'

      // Show connection status
      if (response.connectionStatus === 'connected') {
        desc.textContent = 'Connected and monitoring'
      } else if (response.connectionStatus === 'disconnected') {
        desc.textContent = 'Offline - will sync when connected'
        indicator.classList.remove('active')
        indicator.classList.add('inactive')
      } else {
        desc.textContent = 'Monitoring browsing activity'
      }
    } else {
      indicator.classList.remove('active')
      indicator.classList.add('inactive')
      title.textContent = 'Not Connected'
      desc.textContent = 'Please login to start tracking'

      // If we thought we were logged in but aren't, show login
      const storedToken = await chrome.storage.local.get(['accessToken'])
      if (!storedToken.accessToken) {
        log('Token missing - showing login')
        showLogin()
      }
    }
  }

  // Auto-refresh status every 10 seconds while popup is open
  const statusInterval = setInterval(async () => {
    if (statusSection.classList.contains('hidden')) return
    log('Auto-refreshing status...')
    await updateStatus()
  }, 10000)

  // Clean up interval when popup closes
  window.addEventListener('unload', () => {
    clearInterval(statusInterval)
    log('Popup closed')
  })
})
