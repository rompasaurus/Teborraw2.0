import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script starting...')
console.log('contextBridge:', typeof contextBridge)
console.log('ipcRenderer:', typeof ipcRenderer)

try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('teboraw', {
  // ============================================
  // Authentication
  // ============================================
  getAuth: () => ipcRenderer.invoke('get-auth'),
  setAuth: (auth: { apiUrl: string; accessToken: string; refreshToken: string }) =>
    ipcRenderer.invoke('set-auth', auth),
  logout: () => ipcRenderer.invoke('logout'),
  googleAuth: () => ipcRenderer.invoke('google-auth'),

  // ============================================
  // Status & Control
  // ============================================
  getStatus: () => ipcRenderer.invoke('get-status'),
  pauseTracking: () => ipcRenderer.invoke('pause-tracking'),
  resumeTracking: () => ipcRenderer.invoke('resume-tracking'),
  syncNow: () => ipcRenderer.invoke('sync-now'),

  // ============================================
  // Statistics & Productivity
  // ============================================
  getStatistics: (date?: string) => ipcRenderer.invoke('get-statistics', date),
  getCurrentProductivity: (windowMinutes?: number) =>
    ipcRenderer.invoke('get-current-productivity', windowMinutes),
  getIdleState: () => ipcRenderer.invoke('get-idle-state'),
  getInputStats: () => ipcRenderer.invoke('get-input-stats'),
  getCurrentWindow: () => ipcRenderer.invoke('get-current-window'),

  // ============================================
  // Categories & Settings
  // ============================================
  getCategories: () => ipcRenderer.invoke('get-categories'),
  setCategories: (categories: unknown[]) => ipcRenderer.invoke('set-categories', categories),
  getExcludedApps: () => ipcRenderer.invoke('get-excluded-apps'),
  setExcludedApps: (apps: string[]) => ipcRenderer.invoke('set-excluded-apps', apps),
  getIdleThreshold: () => ipcRenderer.invoke('get-idle-threshold'),
  setIdleThreshold: (thresholdMs: number) =>
    ipcRenderer.invoke('set-idle-threshold', thresholdMs),

  // ============================================
  // Permissions (macOS)
  // ============================================
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),
  requestPermissions: () => ipcRenderer.invoke('request-permissions'),
  getInputMonitorStatus: () => ipcRenderer.invoke('get-input-monitor-status'),

  // ============================================
  // Data Export
  // ============================================
  exportData: () => ipcRenderer.invoke('export-data'),
  getScreenshotsDir: () => ipcRenderer.invoke('get-screenshots-dir'),

  // ============================================
  // Window Controls
  // ============================================
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  })
  console.log('Preload script: teboraw API exposed successfully')
} catch (error) {
  console.error('Preload script error:', error)
}

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    teboraw: {
      // Authentication
      getAuth: () => Promise<{
        apiUrl: string
        accessToken: string
        refreshToken: string
      }>
      setAuth: (auth: {
        apiUrl: string
        accessToken: string
        refreshToken: string
      }) => Promise<void>
      logout: () => Promise<void>
      googleAuth: () => Promise<{
        accessToken: string
        refreshToken: string
        expiresAt: string
        user: { id: string; email: string; displayName: string; avatarUrl?: string }
      }>

      // Status & Control
      getStatus: () => Promise<{
        isTracking: boolean
        isPaused: boolean
        pendingActivities: number
        lastSync: string | null
        hasInputMonitoring: boolean
      }>
      pauseTracking: () => Promise<void>
      resumeTracking: () => Promise<void>
      syncNow: () => Promise<void>

      // Statistics & Productivity
      getStatistics: (date?: string) => Promise<{
        date: string
        totalActiveSeconds: number
        totalIdleSeconds: number
        productivityScore: number
        appBreakdown: Array<{
          appName: string
          category: string
          durationSeconds: number
          productivityScore: number
          sessionCount: number
          keystrokeCount: number
          mouseClicks: number
        }>
        categoryBreakdown: Array<{
          category: string
          durationSeconds: number
          percentage: number
          productivityScore: number
          color: string
        }>
        hourlyActivity: Array<{
          hour: number
          activeSeconds: number
          idleSeconds: number
          topApp: string
          keystrokeCount: number
          mouseClicks: number
        }>
        inputStats: {
          keystrokeCount: number
          wordsTyped: number
          avgTypingSpeed: number
          mouseClicks: number
          mouseClicksByButton: { left: number; right: number; middle: number }
          mouseDistance: number
          scrollDistance: number
          modifierKeyUsage: { shift: number; ctrl: number; alt: number; meta: number }
          periodSeconds: number
        }
      } | null>
      getCurrentProductivity: (windowMinutes?: number) => Promise<number>
      getIdleState: () => Promise<{
        isIdle: boolean
        idleStartTime: string | null
        lastActivityTime: string
        idleSeconds: number
      } | null>
      getInputStats: () => Promise<{
        keystrokeCount: number
        wordsTyped: number
        avgTypingSpeed: number
        mouseClicks: number
        mouseClicksByButton: { left: number; right: number; middle: number }
        mouseDistance: number
        scrollDistance: number
        modifierKeyUsage: { shift: number; ctrl: number; alt: number; meta: number }
        periodSeconds: number
      } | null>
      getCurrentWindow: () => Promise<{ app: string; title: string } | null>

      // Categories & Settings
      getCategories: () => Promise<
        Array<{
          name: string
          patterns: string[]
          productivityScore: number
          color: string
        }>
      >
      setCategories: (
        categories: Array<{
          name: string
          patterns: string[]
          productivityScore: number
          color: string
        }>
      ) => Promise<void>
      getExcludedApps: () => Promise<string[]>
      setExcludedApps: (apps: string[]) => Promise<void>
      getIdleThreshold: () => Promise<number>
      setIdleThreshold: (thresholdMs: number) => Promise<void>

      // Permissions (macOS)
      getPermissionStatus: () => Promise<{
        accessibility: boolean
        screenCapture: boolean
      }>
      requestPermissions: () => Promise<{
        accessibility: boolean
        screenCapture: boolean
      }>
      getInputMonitorStatus: () => Promise<boolean>

      // Data Export
      exportData: () => Promise<{
        sessions: Array<unknown>
        inputStats: Array<unknown>
        idlePeriods: Array<unknown>
      }>
      getScreenshotsDir: () => Promise<string>

      // Window Controls
      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
    }
  }
}
