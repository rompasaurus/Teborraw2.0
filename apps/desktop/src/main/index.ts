import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { ActivityTracker } from './tracker'
import { SyncService } from './sync'
import Store from 'electron-store'
import { AppCategory } from './types'

// Track if app is quitting (used to prevent window hide on close when actually quitting)
let isQuitting = false

const store = new Store({ name: 'teboraw-config' })
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let activityTracker: ActivityTracker | null = null
let syncService: SyncService | null = null

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow?.show(),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true
            app.quit()
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/index.js')
  console.log('Preload path:', preloadPath)
  console.log('Preload exists:', fs.existsSync(preloadPath))

  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: false, // Show in dock/taskbar for easier force quit
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // electron-vite sets ELECTRON_RENDERER_URL in dev mode
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })

  tray = new Tray(icon)

  const updateTrayMenu = () => {
    const isPaused = activityTracker?.isPaused() ?? false
    const isRunning = activityTracker?.isRunning() ?? false

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => mainWindow?.show(),
      },
      { type: 'separator' },
      {
        label: isRunning ? (isPaused ? 'Resume Tracking' : 'Pause Tracking') : 'Start Tracking',
        click: () => {
          if (!isRunning) {
            activityTracker?.start()
          } else if (isPaused) {
            activityTracker?.resume()
          } else {
            activityTracker?.pause()
          }
          updateTrayMenu()
        },
      },
      {
        label: 'Sync Now',
        click: () => syncService?.syncNow(),
      },
      { type: 'separator' },
      {
        label: `Status: ${isRunning ? (isPaused ? 'Paused' : 'Tracking') : 'Stopped'}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])

    tray?.setContextMenu(contextMenu)
  }

  tray.setToolTip('Teboraw - Activity Tracker')
  updateTrayMenu()

  tray.on('click', () => {
    mainWindow?.show()
  })

  // Update menu periodically
  setInterval(updateTrayMenu, 5000)
}

async function initializeServices() {
  const apiUrl = store.get('apiUrl', 'http://localhost:5000/api') as string
  const accessToken = store.get('accessToken', '') as string
  const excludedApps = store.get('excludedApps', []) as string[]
  const customCategories = store.get('customCategories') as AppCategory[] | undefined
  const idleThreshold = store.get('idleThreshold', 300000) as number

  activityTracker = new ActivityTracker({
    screenshotInterval: 300000, // 5 minutes
    activityInterval: 5000, // 5 seconds
    idleThreshold, // 5 minutes default
    inputAggregationInterval: 300000, // 5 minutes
    excludedApps,
    customCategories,
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

  // Always start the tracker (it will handle permission requests)
  // This ensures the permission dialog is shown even without auth
  await activityTracker.start()

  if (accessToken) {
    syncService.start()
  }
}

// ============================================
// IPC Handlers Setup - Must run after app is ready
// ============================================

function setupIpcHandlers() {
  // Authentication
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

  // Status & Control
  ipcMain.handle('get-status', () => ({
    isTracking: activityTracker?.isRunning() ?? false,
    isPaused: activityTracker?.isPaused() ?? false,
    pendingActivities: syncService?.getPendingCount() ?? 0,
    lastSync: syncService?.getLastSyncTime() ?? null,
    hasInputMonitoring: activityTracker?.hasInputMonitoring() ?? false,
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

  // Statistics & Productivity
  ipcMain.handle('get-statistics', (_, date?: string) => {
    const targetDate = date ? new Date(date) : new Date()
    return activityTracker?.getStatistics(targetDate) ?? null
  })

  ipcMain.handle('get-current-productivity', (_, windowMinutes?: number) => {
    return activityTracker?.getCurrentProductivity(windowMinutes ?? 60) ?? 0
  })

  ipcMain.handle('get-idle-state', () => {
    return activityTracker?.getIdleState() ?? null
  })

  ipcMain.handle('get-input-stats', () => {
    return activityTracker?.getInputStats() ?? null
  })

  ipcMain.handle('get-current-window', () => {
    return activityTracker?.getCurrentWindow() ?? null
  })

  // Categories & Settings
  ipcMain.handle('get-categories', () => {
    return activityTracker?.getCategories() ?? []
  })

  ipcMain.handle('set-categories', (_, categories: AppCategory[]) => {
    activityTracker?.setCategories(categories)
    store.set('customCategories', categories)
  })

  ipcMain.handle('get-excluded-apps', () => {
    return activityTracker?.getExcludedApps() ?? []
  })

  ipcMain.handle('set-excluded-apps', (_, apps: string[]) => {
    activityTracker?.setExcludedApps(apps)
    store.set('excludedApps', apps)
  })

  ipcMain.handle('get-idle-threshold', () => {
    return activityTracker?.getIdleThreshold() ?? 300000
  })

  ipcMain.handle('set-idle-threshold', (_, thresholdMs: number) => {
    activityTracker?.setIdleThreshold(thresholdMs)
    store.set('idleThreshold', thresholdMs)
  })

  // Permissions (macOS)
  ipcMain.handle('get-permission-status', () => {
    return activityTracker?.getPermissionStatus() ?? { accessibility: false, screenCapture: false }
  })

  ipcMain.handle('request-permissions', async () => {
    return activityTracker?.requestPermissions() ?? { accessibility: false, screenCapture: false }
  })

  ipcMain.handle('get-input-monitor-status', () => {
    return activityTracker?.hasInputMonitoring() ?? false
  })

  // Data Export
  ipcMain.handle('export-data', () => {
    return activityTracker?.exportData() ?? { sessions: [], inputStats: [], idlePeriods: [] }
  })

  ipcMain.handle('get-screenshots-dir', () => {
    return activityTracker?.getScreenshotsDir() ?? ''
  })

  // Window Controls
  ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('close-window', () => {
    mainWindow?.hide()
  })
}

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(() => {
  setupIpcHandlers()
  createApplicationMenu()
  createWindow()
  createTray()
  initializeServices()
})

app.on('window-all-closed', () => {
  // On macOS, apps stay in menu bar even when window is closed
  // But allow quitting if isQuitting flag is set
  if (process.platform !== 'darwin' || isQuitting) {
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
