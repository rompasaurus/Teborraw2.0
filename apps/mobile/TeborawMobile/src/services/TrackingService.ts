import AsyncStorage from '@react-native-async-storage/async-storage'
import BackgroundGeolocation, {
  Location,
  Subscription,
  State,
} from 'react-native-background-geolocation'

interface Activity {
  type: string
  source: 'Mobile'
  timestamp: string
  data: Record<string, unknown>
}

interface TrackingSettings {
  locationEnabled: boolean
  audioEnabled: boolean
  locationInterval: number
  audioChunkDuration: number
}

const DEFAULT_SETTINGS: TrackingSettings = {
  locationEnabled: true,
  audioEnabled: false, // Audio recording disabled by default
  locationInterval: 60000, // 1 minute
  audioChunkDuration: 300000, // 5 minutes
}

class TrackingServiceClass {
  private isRunning = false
  private pendingActivities: Activity[] = []
  private settings: TrackingSettings = DEFAULT_SETTINGS
  private locationSubscription: Subscription | null = null
  private motionChangeSubscription: Subscription | null = null
  private syncInterval: NodeJS.Timeout | null = null
  private isConfigured = false

  async start() {
    if (this.isRunning) return

    this.isRunning = true

    // Load pending activities from storage
    const stored = await AsyncStorage.getItem('pendingActivities')
    if (stored) {
      this.pendingActivities = JSON.parse(stored)
    }

    // Load settings
    const settingsStr = await AsyncStorage.getItem('trackingSettings')
    if (settingsStr) {
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsStr) }
    }

    // Start location tracking
    if (this.settings.locationEnabled) {
      await this.startLocationTracking()
    }

    // Start sync interval (every 5 minutes)
    this.syncInterval = setInterval(() => this.syncActivities(), 300000)

    console.log('Tracking service started')
  }

  async stop() {
    this.isRunning = false

    // Stop location tracking
    await this.stopLocationTracking()

    // Stop sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Final sync before stopping
    await this.syncActivities()

    // Persist pending activities
    await this.savePendingActivities()

    console.log('Tracking service stopped')
  }

  private async configureBackgroundGeolocation(): Promise<State> {
    if (this.isConfigured) {
      return BackgroundGeolocation.getState()
    }

    const state = await BackgroundGeolocation.ready({
      // Geolocation Config
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10, // Minimum distance (meters) before recording
      stopTimeout: 5, // Minutes to wait before switching to stationary mode

      // Activity Recognition
      stopOnStationary: false,

      // Application config
      debug: __DEV__, // Enable debug sounds/notifications in dev
      logLevel: __DEV__ ? BackgroundGeolocation.LOG_LEVEL_VERBOSE : BackgroundGeolocation.LOG_LEVEL_OFF,

      // Background tracking
      stopOnTerminate: false, // Continue tracking after app termination
      startOnBoot: true, // Auto-start on device boot
      enableHeadless: true, // Enable headless mode for Android

      // Foreground service notification (Android)
      foregroundService: true,
      notification: {
        title: 'Teboraw',
        text: 'Tracking your location',
        channelName: 'Location Tracking',
        color: '#0ea5e9',
        smallIcon: 'drawable/ic_notification',
        largeIcon: 'drawable/ic_launcher',
        priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
      },

      // Battery optimization
      preventSuspend: false,
      heartbeatInterval: 60, // Seconds between heartbeats when stationary

      // iOS specific
      activityType: BackgroundGeolocation.ACTIVITY_TYPE_OTHER,
      pausesLocationUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,

      // Location authorization
      locationAuthorizationRequest: 'Always',
      backgroundPermissionRationale: {
        title: 'Allow background location access',
        message:
          'Teboraw needs access to your location in the background to track your activities even when the app is closed.',
        positiveAction: 'Allow',
        negativeAction: 'Cancel',
      },
    })

    this.isConfigured = true
    return state
  }

  private async startLocationTracking() {
    try {
      await this.configureBackgroundGeolocation()

      // Subscribe to location updates
      this.locationSubscription = BackgroundGeolocation.onLocation(
        (location: Location) => {
          this.recordLocation(location)
        },
        (error) => {
          console.error('[Location Error]:', error)
        }
      )

      // Subscribe to motion change events (moving/stationary)
      this.motionChangeSubscription = BackgroundGeolocation.onMotionChange(
        (event) => {
          console.log('[Motion Change]:', event.isMoving ? 'Moving' : 'Stationary')

          // Record motion change as activity
          const activity: Activity = {
            type: event.isMoving ? 'MotionStart' : 'MotionStop',
            source: 'Mobile',
            timestamp: new Date().toISOString(),
            data: {
              isMoving: event.isMoving,
              location: event.location ? {
                latitude: event.location.coords.latitude,
                longitude: event.location.coords.longitude,
                accuracy: event.location.coords.accuracy,
              } : null,
            },
          }
          this.pendingActivities.push(activity)
          this.savePendingActivities()
        }
      )

      // Start tracking
      await BackgroundGeolocation.start()
      console.log('[BackgroundGeolocation] Started successfully')
    } catch (error) {
      console.error('[BackgroundGeolocation] Failed to start:', error)
    }
  }

  private async stopLocationTracking() {
    try {
      // Remove subscriptions
      if (this.locationSubscription) {
        this.locationSubscription.remove()
        this.locationSubscription = null
      }
      if (this.motionChangeSubscription) {
        this.motionChangeSubscription.remove()
        this.motionChangeSubscription = null
      }

      // Stop tracking
      await BackgroundGeolocation.stop()
      console.log('[BackgroundGeolocation] Stopped')
    } catch (error) {
      console.error('[BackgroundGeolocation] Failed to stop:', error)
    }
  }

  private recordLocation(location: Location) {
    const activity: Activity = {
      type: 'Location',
      source: 'Mobile',
      timestamp: new Date(location.timestamp).toISOString(),
      data: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        // Additional metadata
        isMoving: location.is_moving,
        odometer: location.odometer,
        activityType: location.activity?.type,
        activityConfidence: location.activity?.confidence,
        battery: {
          level: location.battery?.level,
          isCharging: location.battery?.is_charging,
        },
      },
    }

    this.pendingActivities.push(activity)
    this.savePendingActivities()

    console.log(
      `[Location] Recorded: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
    )
  }

  private async savePendingActivities() {
    try {
      await AsyncStorage.setItem(
        'pendingActivities',
        JSON.stringify(this.pendingActivities)
      )
    } catch (error) {
      console.error('Failed to save pending activities:', error)
    }
  }

  async syncActivities() {
    if (this.pendingActivities.length === 0) {
      console.log('[Sync] No pending activities')
      return
    }

    const accessToken = await AsyncStorage.getItem('accessToken')
    const apiUrl = await AsyncStorage.getItem('apiUrl')
    let deviceId = await AsyncStorage.getItem('deviceId')

    if (!accessToken || !apiUrl) {
      console.log('[Sync] Missing credentials, skipping sync')
      return
    }

    if (!deviceId) {
      deviceId = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await AsyncStorage.setItem('deviceId', deviceId)
    }

    const activitiesToSync = [...this.pendingActivities]
    const lastSyncTimestamp =
      (await AsyncStorage.getItem('lastSyncTimestamp')) ||
      new Date(0).toISOString()

    try {
      console.log(`[Sync] Syncing ${activitiesToSync.length} activities...`)

      const response = await fetch(`${apiUrl}/activities/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceId,
          activities: activitiesToSync,
          lastSyncTimestamp,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        this.pendingActivities = this.pendingActivities.slice(
          activitiesToSync.length
        )
        await this.savePendingActivities()
        await AsyncStorage.setItem(
          'lastSyncTimestamp',
          new Date().toISOString()
        )
        console.log(`[Sync] Successfully synced ${result.syncedCount} activities`)
      } else if (response.status === 401) {
        console.log('[Sync] Token expired, attempting refresh...')
        await this.refreshToken()
        // Retry sync after refresh
        await this.syncActivities()
      } else {
        console.error(`[Sync] Failed with status: ${response.status}`)
      }
    } catch (error) {
      console.error('[Sync] Failed:', error)
    }
  }

  private async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('refreshToken')
    const apiUrl = await AsyncStorage.getItem('apiUrl')

    if (!refreshToken || !apiUrl) return

    try {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        await AsyncStorage.setItem('accessToken', data.accessToken)
        await AsyncStorage.setItem('refreshToken', data.refreshToken)
        console.log('[Auth] Token refreshed successfully')
      }
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error)
    }
  }

  getPendingCount(): number {
    return this.pendingActivities.length
  }

  isActive(): boolean {
    return this.isRunning
  }

  async getLocationState(): Promise<State | null> {
    try {
      return await BackgroundGeolocation.getState()
    } catch {
      return null
    }
  }

  async getCurrentPosition(): Promise<Location | null> {
    try {
      const location = await BackgroundGeolocation.getCurrentPosition({
        samples: 1,
        persist: false,
      })
      return location
    } catch (error) {
      console.error('[Location] Failed to get current position:', error)
      return null
    }
  }

  async updateSettings(settings: Partial<TrackingSettings>) {
    this.settings = { ...this.settings, ...settings }
    await AsyncStorage.setItem(
      'trackingSettings',
      JSON.stringify(this.settings)
    )

    // Handle location tracking toggle
    if ('locationEnabled' in settings) {
      if (settings.locationEnabled && this.isRunning) {
        await this.startLocationTracking()
      } else if (!settings.locationEnabled) {
        await this.stopLocationTracking()
      }
    }

    console.log('[Settings] Updated:', this.settings)
  }

  getSettings(): TrackingSettings {
    return { ...this.settings }
  }

  async clearPendingActivities() {
    this.pendingActivities = []
    await this.savePendingActivities()
    console.log('[Storage] Cleared pending activities')
  }

  // Force sync - useful for manual sync button
  async forceSyncNow() {
    await this.syncActivities()
  }
}

export const TrackingService = new TrackingServiceClass()
