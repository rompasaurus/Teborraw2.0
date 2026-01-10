import axios, { AxiosInstance } from 'axios'
import Store from 'electron-store'
import { Activity } from './tracker'

interface SyncServiceOptions {
  apiUrl: string
  accessToken: string
  syncInterval: number
  store: Store
}

export class SyncService {
  private options: SyncServiceOptions
  private api: AxiosInstance
  private syncTimer: NodeJS.Timeout | null = null
  private pendingActivities: Activity[] = []
  private lastSyncTime: Date | null = null
  private deviceId: string
  private running: boolean = false

  constructor(options: SyncServiceOptions) {
    this.options = options
    this.deviceId = this.getOrCreateDeviceId()

    this.api = axios.create({
      baseURL: options.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.accessToken}`,
      },
    })

    // Load pending activities from store
    this.pendingActivities = options.store.get('pendingActivities', []) as Activity[]

    // Load lastSyncTime and convert from string to Date if needed
    const storedLastSync = options.store.get('lastSyncTime', null)
    if (storedLastSync) {
      this.lastSyncTime = typeof storedLastSync === 'string' ? new Date(storedLastSync) : storedLastSync as Date
    } else {
      this.lastSyncTime = null
    }
  }

  private getOrCreateDeviceId(): string {
    let deviceId = this.options.store.get('deviceId') as string | undefined

    if (!deviceId) {
      deviceId = `desktop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      this.options.store.set('deviceId', deviceId)
    }

    return deviceId
  }

  start() {
    if (this.running) return

    this.running = true
    this.syncTimer = setInterval(
      () => this.syncNow(),
      this.options.syncInterval
    )

    console.log('Sync service started')
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    this.running = false

    // Save pending activities to store
    this.options.store.set('pendingActivities', this.pendingActivities)

    console.log('Sync service stopped')
  }

  updateAuth(apiUrl: string, accessToken: string) {
    this.options.apiUrl = apiUrl
    this.options.accessToken = accessToken

    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
  }

  queueActivity(activity: Activity) {
    this.pendingActivities.push(activity)

    // Persist to store periodically (every 10 activities)
    if (this.pendingActivities.length % 10 === 0) {
      this.options.store.set('pendingActivities', this.pendingActivities)
    }
  }

  getPendingCount(): number {
    return this.pendingActivities.length
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime
  }

  async syncNow(): Promise<void> {
    if (this.pendingActivities.length === 0) {
      return
    }

    const activitiesToSync = [...this.pendingActivities]

    // Ensure lastSyncTime is a Date object
    let lastSyncTimestamp: string
    if (this.lastSyncTime instanceof Date && !isNaN(this.lastSyncTime.getTime())) {
      lastSyncTimestamp = this.lastSyncTime.toISOString()
    } else {
      lastSyncTimestamp = new Date(0).toISOString()
    }

    try {
      const response = await this.api.post('/activities/sync', {
        deviceId: this.deviceId,
        activities: activitiesToSync,
        lastSyncTimestamp,
      })

      if (response.data.success) {
        // Remove synced activities
        this.pendingActivities = this.pendingActivities.slice(activitiesToSync.length)
        this.lastSyncTime = new Date()

        // Persist state
        this.options.store.set('pendingActivities', this.pendingActivities)
        this.options.store.set('lastSyncTime', this.lastSyncTime)

        console.log(`Synced ${response.data.syncedCount} activities`)
      }
    } catch (error) {
      console.error('Sync failed:', error)

      // Log detailed error information for debugging
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status)
        console.error('Response data:', error.response?.data)
        console.error('Request data sample:', JSON.stringify(activitiesToSync[0], null, 2))
      }

      // If unauthorized, token might be expired
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await this.refreshToken()
      }
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.options.store.get('refreshToken') as string

    if (!refreshToken) {
      return
    }

    try {
      const response = await axios.post(`${this.options.apiUrl}/auth/refresh`, {
        refreshToken,
      })

      const { accessToken, refreshToken: newRefreshToken } = response.data

      this.options.store.set('accessToken', accessToken)
      this.options.store.set('refreshToken', newRefreshToken)

      this.updateAuth(this.options.apiUrl, accessToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
    }
  }
}
