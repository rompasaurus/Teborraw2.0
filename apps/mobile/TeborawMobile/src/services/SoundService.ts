import Sound from 'react-native-sound'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback')

type SoundType = 'syncComplete' | 'syncError' | 'trackingStart' | 'trackingStop' | 'tap'

class SoundServiceClass {
  private sounds: Map<SoundType, Sound> = new Map()
  private isEnabled = true
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    // Load enabled state from storage
    const storedEnabled = await AsyncStorage.getItem('soundEffectsEnabled')
    this.isEnabled = storedEnabled !== 'false' // Default to enabled

    // Preload sounds
    this.preloadSounds()
    this.isInitialized = true
  }

  private preloadSounds() {
    // Define sounds with their source files
    // These use system sounds as fallback since custom sounds require bundling
    const soundFiles: Record<SoundType, string> = {
      syncComplete: 'sync_complete.mp3',
      syncError: 'sync_error.mp3',
      trackingStart: 'tracking_start.mp3',
      trackingStop: 'tracking_stop.mp3',
      tap: 'tap.mp3',
    }

    // Attempt to load each sound
    Object.entries(soundFiles).forEach(([type, filename]) => {
      try {
        const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.log(`[SoundService] Could not load ${filename}:`, error.message)
            // Sound file doesn't exist yet - that's OK, we'll skip playing
          } else {
            this.sounds.set(type as SoundType, sound)
            console.log(`[SoundService] Loaded ${filename}`)
          }
        })
      } catch (error) {
        console.log(`[SoundService] Error creating sound ${filename}:`, error)
      }
    })
  }

  async setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    await AsyncStorage.setItem('soundEffectsEnabled', enabled.toString())
    console.log(`[SoundService] Sound effects ${enabled ? 'enabled' : 'disabled'}`)
  }

  isEnabledSync(): boolean {
    return this.isEnabled
  }

  async getEnabled(): Promise<boolean> {
    const storedEnabled = await AsyncStorage.getItem('soundEffectsEnabled')
    this.isEnabled = storedEnabled !== 'false'
    return this.isEnabled
  }

  play(type: SoundType) {
    if (!this.isEnabled) {
      return
    }

    const sound = this.sounds.get(type)
    if (sound) {
      sound.stop(() => {
        sound.play((success) => {
          if (!success) {
            console.log(`[SoundService] Failed to play ${type}`)
          }
        })
      })
    } else {
      // Sound not loaded - use system haptic/vibration as fallback could be added here
      console.log(`[SoundService] Sound ${type} not loaded, skipping`)
    }
  }

  // Play sync complete sound
  playSyncComplete() {
    this.play('syncComplete')
  }

  // Play sync error sound
  playSyncError() {
    this.play('syncError')
  }

  // Play tracking started sound
  playTrackingStart() {
    this.play('trackingStart')
  }

  // Play tracking stopped sound
  playTrackingStop() {
    this.play('trackingStop')
  }

  // Play tap/button press sound
  playTap() {
    this.play('tap')
  }

  // Cleanup sounds when app is terminated
  release() {
    this.sounds.forEach((sound) => {
      sound.release()
    })
    this.sounds.clear()
    this.isInitialized = false
  }
}

export const SoundService = new SoundServiceClass()
