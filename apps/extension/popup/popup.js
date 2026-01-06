// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  const loginSection = document.getElementById('loginSection')
  const statusSection = document.getElementById('statusSection')
  const errorDiv = document.getElementById('error')

  // Check if user is logged in
  const stored = await chrome.storage.local.get(['accessToken', 'user'])

  if (stored.accessToken) {
    showStatus(stored.user)
    updateStatus()
  } else {
    showLogin()
  }

  // Login handler
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const apiUrl = document.getElementById('apiUrl').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    errorDiv.classList.add('hidden')

    const response = await chrome.runtime.sendMessage({
      type: 'LOGIN',
      data: { apiUrl, email, password },
    })

    if (response.success) {
      showStatus(response.user)
      updateStatus()
    } else {
      errorDiv.textContent = response.error
      errorDiv.classList.remove('hidden')
    }
  })

  // Sync handler
  document.getElementById('syncBtn').addEventListener('click', async () => {
    const btn = document.getElementById('syncBtn')
    btn.disabled = true
    btn.textContent = 'Syncing...'

    await chrome.runtime.sendMessage({ type: 'SYNC_NOW' })

    btn.disabled = false
    btn.textContent = 'Sync Now'
    updateStatus()
  })

  // Logout handler
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' })
    showLogin()
  })

  function showLogin() {
    loginSection.classList.remove('hidden')
    statusSection.classList.add('hidden')
  }

  function showStatus(user) {
    loginSection.classList.add('hidden')
    statusSection.classList.remove('hidden')

    if (user) {
      document.getElementById('userName').textContent = user.displayName
      document.getElementById('userEmail').textContent = user.email
    }
  }

  async function updateStatus() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' })
    const stored = await chrome.storage.local.get(['lastSyncTimestamp'])

    document.getElementById('pendingCount').textContent = response.pendingCount

    if (stored.lastSyncTimestamp) {
      const lastSync = new Date(stored.lastSyncTimestamp)
      const now = new Date()
      const diff = Math.floor((now - lastSync) / 60000)

      document.getElementById('lastSync').textContent =
        diff < 1 ? 'Now' : `${diff}m`
    }

    const indicator = document.getElementById('statusIndicator')
    const title = document.getElementById('statusTitle')
    const desc = document.getElementById('statusDesc')

    if (response.isAuthenticated) {
      indicator.classList.add('active')
      indicator.classList.remove('inactive')
      title.textContent = 'Tracking Active'
      desc.textContent = 'Monitoring browsing activity'
    } else {
      indicator.classList.remove('active')
      indicator.classList.add('inactive')
      title.textContent = 'Not Connected'
      desc.textContent = 'Please login to start tracking'
    }
  }
})
