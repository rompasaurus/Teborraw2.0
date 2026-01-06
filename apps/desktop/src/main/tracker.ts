import activeWin from 'active-win'
import screenshot from 'screenshot-desktop'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface Activity {
  type: string
  source: 'Desktop'
  timestamp: string
  data: Record<string, unknown>
}

interface TrackerOptions {
  screenshotInterval: number
  activityInterval: number
  idleThreshold: number
  onActivity: (activity: Activity) => void
}

export class ActivityTracker {
  private options: TrackerOptions
  private activityTimer: NodeJS.Timeout | null = null
  private screenshotTimer: NodeJS.Timeout | null = null
  private lastActivity: Date = new Date()
  private isIdle: boolean = false
  private running: boolean = false
  private paused: boolean = false
  private currentWindow: { app: string; title: string } | null = null
  private windowStartTime: Date = new Date()
  private screenshotsDir: string

  constructor(options: TrackerOptions) {
    this.options = options
    this.screenshotsDir = path.join(os.homedir(), '.teboraw', 'screenshots')

    // Ensure screenshots directory exists
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true })
    }
  }

  start() {
    if (this.running) return

    this.running = true
    this.paused = false

    // Start activity tracking
    this.activityTimer = setInterval(
      () => this.trackActivity(),
      this.options.activityInterval
    )

    // Start screenshot capture
    this.screenshotTimer = setInterval(
      () => this.captureScreenshot(),
      this.options.screenshotInterval
    )

    console.log('Activity tracker started')
  }

  stop() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
      this.activityTimer = null
    }

    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer)
      this.screenshotTimer = null
    }

    this.running = false
    console.log('Activity tracker stopped')
  }

  pause() {
    this.paused = true
    console.log('Activity tracker paused')
  }

  resume() {
    this.paused = false
    console.log('Activity tracker resumed')
  }

  isRunning() {
    return this.running
  }

  isPaused() {
    return this.paused
  }

  private async trackActivity() {
    if (this.paused) return

    try {
      const window = await activeWin()

      if (window) {
        const app = window.owner.name
        const title = window.title

        // Check if window changed
        if (
          this.currentWindow &&
          (this.currentWindow.app !== app || this.currentWindow.title !== title)
        ) {
          // Record the previous window session
          const duration = Math.floor(
            (Date.now() - this.windowStartTime.getTime()) / 1000
          )

          if (duration > 0) {
            this.options.onActivity({
              type: 'WindowFocus',
              source: 'Desktop',
              timestamp: this.windowStartTime.toISOString(),
              data: {
                appName: this.currentWindow.app,
                windowTitle: this.currentWindow.title,
                durationSeconds: duration,
              },
            })
          }

          // Start tracking new window
          this.windowStartTime = new Date()
        }

        this.currentWindow = { app, title }
        this.lastActivity = new Date()

        // Check idle state
        if (this.isIdle) {
          this.isIdle = false
          this.options.onActivity({
            type: 'IdleEnd',
            source: 'Desktop',
            timestamp: new Date().toISOString(),
            data: {},
          })
        }
      }

      // Check for idle
      const idleTime = Date.now() - this.lastActivity.getTime()
      if (idleTime > this.options.idleThreshold && !this.isIdle) {
        this.isIdle = true
        this.options.onActivity({
          type: 'IdleStart',
          source: 'Desktop',
          timestamp: new Date().toISOString(),
          data: { idleSeconds: Math.floor(idleTime / 1000) },
        })
      }
    } catch (error) {
      console.error('Error tracking activity:', error)
    }
  }

  private async captureScreenshot() {
    if (this.paused) return

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `screenshot-${timestamp}.png`
      const filepath = path.join(this.screenshotsDir, filename)

      const imgBuffer = await screenshot({ format: 'png' })
      fs.writeFileSync(filepath, imgBuffer)

      this.options.onActivity({
        type: 'Screenshot',
        source: 'Desktop',
        timestamp: new Date().toISOString(),
        data: {
          filePath: filepath,
          thumbnailPath: filepath, // TODO: Generate actual thumbnail
        },
      })
    } catch (error) {
      console.error('Error capturing screenshot:', error)
    }
  }
}
