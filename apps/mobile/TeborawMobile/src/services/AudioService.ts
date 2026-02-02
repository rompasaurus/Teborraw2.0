import AsyncStorage from '@react-native-async-storage/async-storage'
import RNFS from 'react-native-fs'
import LiveAudioStream from 'react-native-live-audio-stream'
import { Platform } from 'react-native'
import { hasMicrophonePermission } from '../utils/audioPermissions'
import { Buffer } from 'buffer'

interface AudioSettings {
  enabled: boolean
  chunkDuration: number // milliseconds
  sampleRate: number
  channels: number
  bitsPerSample: number
}

interface PendingChunk {
  filePath: string
  recordedAt: string
  durationSeconds: number
}

const DEFAULT_SETTINGS: AudioSettings = {
  enabled: false,
  chunkDuration: 300000, // 5 minutes
  sampleRate: 16000, // 16kHz - good for speech
  channels: 1, // Mono
  bitsPerSample: 16,
}

const AUDIO_DIR = `${RNFS.DocumentDirectoryPath}/audio_chunks`
const PENDING_CHUNKS_KEY = 'pendingAudioChunks'

class AudioServiceClass {
  private settings: AudioSettings = DEFAULT_SETTINGS
  private isInitialized = false
  private isRecording = false
  private chunkTimer: ReturnType<typeof setInterval> | null = null
  private currentChunkPath: string | null = null
  private currentChunkStartTime: Date | null = null
  private audioBuffer: number[] = []
  private pendingChunks: PendingChunk[] = []

  async initialize() {
    if (this.isInitialized) return

    // Load settings from storage
    const settingsStr = await AsyncStorage.getItem('audioSettings')
    if (settingsStr) {
      this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsStr) }
    }

    // Load pending chunks
    const pendingStr = await AsyncStorage.getItem(PENDING_CHUNKS_KEY)
    if (pendingStr) {
      this.pendingChunks = JSON.parse(pendingStr)
    }

    // Ensure audio directory exists
    const dirExists = await RNFS.exists(AUDIO_DIR)
    if (!dirExists) {
      await RNFS.mkdir(AUDIO_DIR)
    }

    this.isInitialized = true
    console.log('[AudioService] Initialized')
  }

  async start() {
    await this.initialize()

    if (!this.settings.enabled) {
      console.log('[AudioService] Audio recording is disabled')
      return
    }

    const hasPermission = await hasMicrophonePermission()
    if (!hasPermission) {
      console.log('[AudioService] Microphone permission not granted')
      return
    }

    if (this.isRecording) {
      console.log('[AudioService] Already recording')
      return
    }

    try {
      // Configure live audio stream
      LiveAudioStream.init({
        sampleRate: this.settings.sampleRate,
        channels: this.settings.channels,
        bitsPerSample: this.settings.bitsPerSample,
        audioSource: Platform.OS === 'android' ? 6 : undefined, // VOICE_RECOGNITION on Android
        bufferSize: 4096,
        wavFile: '', // Empty string means don't write to file directly
      })

      // Set up audio data handler
      LiveAudioStream.on('data', (data: string) => {
        // Data comes as base64 encoded string
        this.processAudioData(data)
      })

      // Start recording
      LiveAudioStream.start()
      this.isRecording = true
      this.startNewChunk()

      // Set up chunk timer
      this.chunkTimer = setInterval(() => {
        this.finalizeCurrentChunk()
        this.startNewChunk()
      }, this.settings.chunkDuration)

      console.log('[AudioService] Recording started')
    } catch (error) {
      console.error('[AudioService] Failed to start recording:', error)
    }
  }

  async stop() {
    if (!this.isRecording) {
      return
    }

    try {
      // Stop the timer
      if (this.chunkTimer) {
        clearInterval(this.chunkTimer)
        this.chunkTimer = null
      }

      // Stop recording
      LiveAudioStream.stop()
      this.isRecording = false

      // Finalize current chunk
      await this.finalizeCurrentChunk()

      console.log('[AudioService] Recording stopped')
    } catch (error) {
      console.error('[AudioService] Failed to stop recording:', error)
    }
  }

  private processAudioData(base64Data: string) {
    // Convert base64 to byte array and add to buffer
    const bytes = this.base64ToBytes(base64Data)
    this.audioBuffer.push(...bytes)
  }

  private base64ToBytes(base64: string): number[] {
    const buffer = Buffer.from(base64, 'base64')
    return Array.from(buffer)
  }

  private startNewChunk() {
    const timestamp = new Date()
    const fileName = `audio_${timestamp.getTime()}.wav`
    this.currentChunkPath = `${AUDIO_DIR}/${fileName}`
    this.currentChunkStartTime = timestamp
    this.audioBuffer = []

    console.log(`[AudioService] Starting new chunk: ${fileName}`)
  }

  private async finalizeCurrentChunk() {
    if (!this.currentChunkPath || !this.currentChunkStartTime) {
      return
    }

    if (this.audioBuffer.length === 0) {
      console.log('[AudioService] No audio data in buffer, skipping chunk')
      return
    }

    try {
      // Create WAV file from buffer
      const wavData = this.createWavFile(this.audioBuffer)
      const base64Wav = this.bytesToBase64(wavData)

      await RNFS.writeFile(this.currentChunkPath, base64Wav, 'base64')

      // Calculate duration
      const durationSeconds = Math.round(
        this.audioBuffer.length /
          (this.settings.sampleRate *
            this.settings.channels *
            (this.settings.bitsPerSample / 8))
      )

      // Add to pending chunks
      const chunk: PendingChunk = {
        filePath: this.currentChunkPath,
        recordedAt: this.currentChunkStartTime.toISOString(),
        durationSeconds,
      }
      this.pendingChunks.push(chunk)
      await this.savePendingChunks()

      console.log(
        `[AudioService] Chunk saved: ${this.currentChunkPath} (${durationSeconds}s)`
      )
    } catch (error) {
      console.error('[AudioService] Failed to save chunk:', error)
    }

    // Reset for next chunk
    this.currentChunkPath = null
    this.currentChunkStartTime = null
    this.audioBuffer = []
  }

  private createWavFile(audioData: number[]): number[] {
    const sampleRate = this.settings.sampleRate
    const numChannels = this.settings.channels
    const bitsPerSample = this.settings.bitsPerSample
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
    const blockAlign = (numChannels * bitsPerSample) / 8
    const dataSize = audioData.length
    const fileSize = 36 + dataSize

    const header: number[] = []

    // RIFF header
    header.push(...this.stringToBytes('RIFF'))
    header.push(...this.int32ToBytes(fileSize))
    header.push(...this.stringToBytes('WAVE'))

    // fmt chunk
    header.push(...this.stringToBytes('fmt '))
    header.push(...this.int32ToBytes(16)) // Subchunk1Size
    header.push(...this.int16ToBytes(1)) // AudioFormat (PCM)
    header.push(...this.int16ToBytes(numChannels))
    header.push(...this.int32ToBytes(sampleRate))
    header.push(...this.int32ToBytes(byteRate))
    header.push(...this.int16ToBytes(blockAlign))
    header.push(...this.int16ToBytes(bitsPerSample))

    // data chunk
    header.push(...this.stringToBytes('data'))
    header.push(...this.int32ToBytes(dataSize))

    return [...header, ...audioData]
  }

  private stringToBytes(str: string): number[] {
    return str.split('').map((c) => c.charCodeAt(0))
  }

  // eslint-disable-next-line no-bitwise
  private int16ToBytes(value: number): number[] {
    return [value & 0xff, (value >> 8) & 0xff]
  }

  // eslint-disable-next-line no-bitwise
  private int32ToBytes(value: number): number[] {
    return [
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    ]
  }

  private bytesToBase64(bytes: number[]): string {
    return Buffer.from(bytes).toString('base64')
  }

  private async savePendingChunks() {
    await AsyncStorage.setItem(
      PENDING_CHUNKS_KEY,
      JSON.stringify(this.pendingChunks)
    )
  }

  async uploadPendingChunks() {
    if (this.pendingChunks.length === 0) {
      return
    }

    const accessToken = await AsyncStorage.getItem('accessToken')
    const apiUrl = await AsyncStorage.getItem('apiUrl')

    if (!accessToken || !apiUrl) {
      console.log('[AudioService] Missing credentials, skipping upload')
      return
    }

    const chunksToUpload = [...this.pendingChunks]
    const successfulUploads: string[] = []

    for (const chunk of chunksToUpload) {
      try {
        // Check if file exists
        const exists = await RNFS.exists(chunk.filePath)
        if (!exists) {
          console.log(`[AudioService] File not found: ${chunk.filePath}`)
          successfulUploads.push(chunk.filePath)
          continue
        }

        // Create form data
        const formData = new FormData()
        formData.append('file', {
          uri: `file://${chunk.filePath}`,
          type: 'audio/wav',
          name: chunk.filePath.split('/').pop(),
        } as unknown as Blob)
        formData.append('recordedAt', chunk.recordedAt)
        formData.append('durationSeconds', chunk.durationSeconds.toString())

        // Upload to server
        const response = await fetch(`${apiUrl}/audio/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })

        if (response.ok) {
          console.log(`[AudioService] Uploaded: ${chunk.filePath}`)
          successfulUploads.push(chunk.filePath)

          // Delete local file after successful upload
          await RNFS.unlink(chunk.filePath)
        } else {
          console.error(
            `[AudioService] Upload failed: ${response.status} ${response.statusText}`
          )
        }
      } catch (error) {
        console.error(`[AudioService] Upload error for ${chunk.filePath}:`, error)
      }
    }

    // Remove successfully uploaded chunks from pending list
    this.pendingChunks = this.pendingChunks.filter(
      (c) => !successfulUploads.includes(c.filePath)
    )
    await this.savePendingChunks()

    console.log(
      `[AudioService] Upload complete. ${successfulUploads.length} uploaded, ${this.pendingChunks.length} remaining`
    )
  }

  async setEnabled(enabled: boolean) {
    this.settings.enabled = enabled
    await AsyncStorage.setItem('audioSettings', JSON.stringify(this.settings))

    if (enabled) {
      await this.start()
    } else {
      await this.stop()
    }

    console.log(`[AudioService] Audio recording ${enabled ? 'enabled' : 'disabled'}`)
  }

  async setChunkDuration(duration: number) {
    this.settings.chunkDuration = duration
    await AsyncStorage.setItem('audioSettings', JSON.stringify(this.settings))

    // Restart recording with new chunk duration if currently recording
    if (this.isRecording) {
      await this.stop()
      await this.start()
    }
  }

  isEnabled(): boolean {
    return this.settings.enabled
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  getPendingChunkCount(): number {
    return this.pendingChunks.length
  }

  getSettings(): AudioSettings {
    return { ...this.settings }
  }

  async cleanupOldFiles() {
    try {
      const dirExists = await RNFS.exists(AUDIO_DIR)
      if (!dirExists) return

      const files = await RNFS.readDir(AUDIO_DIR)
      const now = Date.now()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      for (const file of files) {
        if (!file.mtime) continue
        const fileTime = new Date(file.mtime).getTime()
        if (now - fileTime > maxAge) {
          // Check if file is not in pending uploads
          const isPending = this.pendingChunks.some(
            (c) => c.filePath === file.path
          )
          if (!isPending) {
            await RNFS.unlink(file.path)
            console.log(`[AudioService] Cleaned up old file: ${file.name}`)
          }
        }
      }
    } catch (error) {
      console.error('[AudioService] Cleanup error:', error)
    }
  }
}

export const AudioService = new AudioServiceClass()
