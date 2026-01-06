import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('teboraw', {
  // Authentication
  getAuth: () => ipcRenderer.invoke('get-auth'),
  setAuth: (auth: { apiUrl: string; accessToken: string; refreshToken: string }) =>
    ipcRenderer.invoke('set-auth', auth),
  logout: () => ipcRenderer.invoke('logout'),

  // Tracking status
  getStatus: () => ipcRenderer.invoke('get-status'),
  pauseTracking: () => ipcRenderer.invoke('pause-tracking'),
  resumeTracking: () => ipcRenderer.invoke('resume-tracking'),

  // Sync
  syncNow: () => ipcRenderer.invoke('sync-now'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
})

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    teboraw: {
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
      getStatus: () => Promise<{
        isTracking: boolean
        isPaused: boolean
        pendingActivities: number
        lastSync: string | null
      }>
      pauseTracking: () => Promise<void>
      resumeTracking: () => Promise<void>
      syncNow: () => Promise<void>
      minimizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
    }
  }
}
