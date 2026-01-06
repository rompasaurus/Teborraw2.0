import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import path from 'path'
import { ActivityTracker } from './tracker'
import { SyncService } from './sync'
import Store from 'electron-store'

const store = new Store()
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let activityTracker: ActivityTracker | null = null
let syncService: SyncService | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => mainWindow?.show(),
    },
    {
      label: 'Tracking',
      submenu: [
        {
          label: 'Pause Tracking',
          click: () => activityTracker?.pause(),
        },
        {
          label: 'Resume Tracking',
          click: () => activityTracker?.resume(),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: () => syncService?.syncNow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Teboraw - Activity Tracker')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
  })
}

function initializeServices() {
  const apiUrl = store.get('apiUrl', 'http://localhost:5000/api') as string
  const accessToken = store.get('accessToken', '') as string

  activityTracker = new ActivityTracker({
    screenshotInterval: 300000, // 5 minutes
    activityInterval: 5000, // 5 seconds
    idleThreshold: 300000, // 5 minutes
    onActivity: (activity) => {
      syncService?.queueActivity(activity)
    },
  })

  syncService = new SyncService({
    apiUrl,
    accessToken,
    syncInterval: 60000, // 1 minute
    store,
  })

  if (accessToken) {
    activityTracker.start()
    syncService.start()
  }
}

// IPC handlers
ipcMain.handle('get-auth', () => ({
  apiUrl: store.get('apiUrl', 'http://localhost:5000/api'),
  accessToken: store.get('accessToken', ''),
  refreshToken: store.get('refreshToken', ''),
}))

ipcMain.handle('set-auth', (_, { apiUrl, accessToken, refreshToken }) => {
  store.set('apiUrl', apiUrl)
  store.set('accessToken', accessToken)
  store.set('refreshToken', refreshToken)

  if (syncService) {
    syncService.updateAuth(apiUrl, accessToken)
  }

  if (accessToken && activityTracker && !activityTracker.isRunning()) {
    activityTracker.start()
    syncService?.start()
  }
})

ipcMain.handle('logout', () => {
  store.delete('accessToken')
  store.delete('refreshToken')
  activityTracker?.stop()
  syncService?.stop()
})

ipcMain.handle('get-status', () => ({
  isTracking: activityTracker?.isRunning() ?? false,
  isPaused: activityTracker?.isPaused() ?? false,
  pendingActivities: syncService?.getPendingCount() ?? 0,
  lastSync: syncService?.getLastSyncTime() ?? null,
}))

ipcMain.handle('pause-tracking', () => {
  activityTracker?.pause()
})

ipcMain.handle('resume-tracking', () => {
  activityTracker?.resume()
})

ipcMain.handle('sync-now', async () => {
  await syncService?.syncNow()
})

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  createTray()
  initializeServices()
})

app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  activityTracker?.stop()
  syncService?.stop()
})

// Extend app type
declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}
