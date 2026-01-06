import AsyncStorage from '@react-native-async-storage/async-storage'

// Note: These imports would require proper native module setup
// import BackgroundGeolocation from 'react-native-background-geolocation'
// import { initWhisper, transcribe } from 'whisper.rn'

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
  audioEnabled: true,
  locationInterval: 60000, // 1 minute
  audioChunkDuration: 300000, // 5 minutes
}

class TrackingServiceClass {
  private isRunning = false
  private pendingActivities: Activity[] = []
  private settings: TrackingSettings = DEFAULT_SETTINGS
  private locationWatchId: number | null = null
  private audioRecordingInterval: NodeJS.Timeout | null = null
  private syncInterval: NodeJS.Timeout | null = null

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
      this.startLocationTracking()
    }

    // Start audio recording
    if (this.settings.audioEnabled) {
      this.startAudioRecording()
    }

    // Start sync interval
    this.syncInterval = setInterval(() => this.syncActivities(), 60000)

    console.log('Tracking service started')
  }

  stop() {
    this.isRunning = false

    // Stop location tracking
    this.stopLocationTracking()

    // Stop audio recording
    this.stopAudioRecording()

    // Stop sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    // Persist pending activities
    this.savePendingActivities()

    console.log('Tracking service stopped')
  }

  private startLocationTracking() {
    // Note: Actual implementation requires BackgroundGeolocation setup
    // This is a simplified placeholder showing the intended structure

    /*
    BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10,
      stopTimeout: 5,
      enableHeadless: true,
      startOnBoot: true,
      foregroundService: true,
      notification: {
        title: 'Teboraw',
        text: 'Tracking location',
      },
    }).then(() => {
      BackgroundGeolocation.onLocation((location) => {
        this.recordLocation(location)
      })

      BackgroundGeolocation.start()
    })
    */

    console.log('Location tracking started (placeholder)')
  }

  private stopLocationTracking() {
    // BackgroundGeolocation.stop()
    console.log('Location tracking stopped')
  }

  private recordLocation(location: {
    coords: {
      latitude: number
      longitude: number
      accuracy: number
      altitude: number | null
      speed: number | null
      heading: number | null
    }
    timestamp: number
  }) {
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
      },
    }

    this.pendingActivities.push(activity)
    this.savePendingActivities()
  }

  private startAudioRecording() {
    // Note: Actual implementation requires Whisper.rn and audio recording setup
    // This is a simplified placeholder showing the intended structure

    /*
    // Initialize Whisper model
    initWhisper({ model: 'base' })

    // Start recording in chunks
    this.audioRecordingInterval = setInterval(async () => {
      const audioPath = await recordAudioChunk(this.settings.audioChunkDuration)
      const transcript = await transcribe(audioPath)

      const activity: Activity = {
        type: 'AudioRecording',
        source: 'Mobile',
        timestamp: new Date().toISOString(),
        data: {
          filePath: audioPath,
          durationSeconds: this.settings.audioChunkDuration / 1000,
          transcript,
          transcriptionStatus: 'Completed',
        },
      }

      this.pendingActivities.push(activity)
      this.savePendingActivities()
    }, this.settings.audioChunkDuration)
    */

    console.log('Audio recording started (placeholder)')
  }

  private stopAudioRecording() {
    if (this.audioRecordingInterval) {
      clearInterval(this.audioRecordingInterval)
      this.audioRecordingInterval = null
    }
    console.log('Audio recording stopped')
  }

  private async savePendingActivities() {
    await AsyncStorage.setItem(
      'pendingActivities',
      JSON.stringify(this.pendingActivities)
    )
  }

  async syncActivities() {
    if (this.pendingActivities.length === 0) return

    const accessToken = await AsyncStorage.getItem('accessToken')
    const apiUrl = await AsyncStorage.getItem('apiUrl')
    let deviceId = await AsyncStorage.getItem('deviceId')

    if (!accessToken || !apiUrl) return

    if (!deviceId) {
      deviceId = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await AsyncStorage.setItem('deviceId', deviceId)
    }

    const activitiesToSync = [...this.pendingActivities]
    const lastSyncTimestamp =
      (await AsyncStorage.getItem('lastSyncTimestamp')) ||
      new Date(0).toISOString()

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
          lastSyncTimestamp,
        }),
      })

      if (response.ok) {
        this.pendingActivities = this.pendingActivities.slice(
          activitiesToSync.length
        )
        await this.savePendingActivities()
        await AsyncStorage.setItem(
          'lastSyncTimestamp',
          new Date().toISOString()
        )
        console.log(`Synced ${activitiesToSync.length} activities`)
      } else if (response.status === 401) {
        // Token expired - would need to refresh
        console.log('Token expired, need to refresh')
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  getPendingCount(): number {
    return this.pendingActivities.length
  }

  isActive(): boolean {
    return this.isRunning
  }

  async updateSettings(settings: Partial<TrackingSettings>) {
    this.settings = { ...this.settings, ...settings }
    await AsyncStorage.setItem(
      'trackingSettings',
      JSON.stringify(this.settings)
    )

    // Restart services with new settings if running
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }
}

export const TrackingService = new TrackingServiceClass()
