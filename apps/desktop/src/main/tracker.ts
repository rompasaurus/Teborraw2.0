import activeWin from 'active-win'
import screenshot from 'screenshot-desktop'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { InputMonitor } from './input-monitor'
import { IdleDetector } from './idle-detector'
import { AppCategorizer } from './app-categorizer'
import { StatisticsCalculator } from './statistics'
import { PermissionsManager } from './permissions'
import {
  Activity,
  AppCategory,
  AggregatedStats,
  InputStats,
  IdleState,
  PermissionStatus,
  SessionData,
} from './types'

interface TrackerOptions {
  screenshotInterval: number
  activityInterval: number
  idleThreshold: number
  inputAggregationInterval?: number
  excludedApps?: string[]
  customCategories?: AppCategory[]
  onActivity: (activity: Activity) => void
}

export class ActivityTracker {
  private options: TrackerOptions
  private activityTimer: NodeJS.Timeout | null = null
  private screenshotTimer: NodeJS.Timeout | null = null
  private inputAggregationTimer: NodeJS.Timeout | null = null
  private running: boolean = false
  private paused: boolean = false
  private currentWindow: { app: string; title: string } | null = null
  private windowStartTime: Date = new Date()
  private screenshotsDir: string

  // New modules
  private inputMonitor: InputMonitor
  private idleDetector: IdleDetector
  private categorizer: AppCategorizer
  private statistics: StatisticsCalculator
  private permissions: PermissionsManager
  private inputMonitorEnabled: boolean = false

  constructor(options: TrackerOptions) {
    this.options = options
    this.screenshotsDir = path.join(os.homedir(), '.teboraw', 'screenshots')

    // Ensure screenshots directory exists
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true })
    }

    // Initialize modules
    this.permissions = new PermissionsManager()
    this.inputMonitor = new InputMonitor()
    this.idleDetector = new IdleDetector(options.idleThreshold, this.inputMonitor)
    this.categorizer = new AppCategorizer(options.customCategories)
    this.statistics = new StatisticsCalculator(this.categorizer)

    // Set up event handlers
    this.setupIdleEvents()
  }

  private setupIdleEvents(): void {
    this.idleDetector.on(
      'idleStart',
      (data: { idleSeconds: number; startTime: Date }) => {
        if (this.paused) return

        // Record current window session before idle
        this.recordCurrentWindowSession()

        this.options.onActivity({
          type: 'IdleStart',
          source: 'Desktop',
          timestamp: data.startTime.toISOString(),
          data: { idleSeconds: data.idleSeconds },
        })
      }
    )

    this.idleDetector.on(
      'idleEnd',
      (data: { idleDuration: number; startTime: Date; endTime: Date }) => {
        if (this.paused) return

        // Record idle period for statistics
        this.statistics.addIdlePeriod({
          startTime: data.startTime,
          endTime: data.endTime,
          durationSeconds: data.idleDuration,
        })

        this.options.onActivity({
          type: 'IdleEnd',
          source: 'Desktop',
          timestamp: data.endTime.toISOString(),
          data: { idleDurationSeconds: data.idleDuration },
        })

        // Reset window tracking after idle
        this.windowStartTime = new Date()
      }
    )
  }

  async start(): Promise<void> {
    if (this.running) return

    // Check permissions on macOS
    const permStatus = this.permissions.getPermissionStatus()

    if (!permStatus.accessibility) {
      console.log('Accessibility permission not granted, requesting...')
      await this.permissions.requestAccessibilityPermission()
    }

    // Start input monitoring
    this.inputMonitorEnabled = this.inputMonitor.start()
    if (!this.inputMonitorEnabled) {
      console.warn('Input monitor failed to start, idle detection may be less accurate')
    }

    // Start idle detection
    this.idleDetector.start()

    this.running = true
    this.paused = false
    this.windowStartTime = new Date()

    // Start activity tracking (window focus)
    this.activityTimer = setInterval(
      () => this.trackActivity(),
      this.options.activityInterval
    )

    // Start screenshot capture
    this.screenshotTimer = setInterval(
      () => this.captureScreenshot(),
      this.options.screenshotInterval
    )

    // Start input stats aggregation (every 5 minutes by default)
    const aggregationInterval = this.options.inputAggregationInterval || 300000
    this.inputAggregationTimer = setInterval(
      () => this.aggregateInputStats(),
      aggregationInterval
    )

    console.log('Activity tracker started')
    console.log(`Input monitor enabled: ${this.inputMonitorEnabled}`)
  }

  stop(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
      this.activityTimer = null
    }

    if (this.screenshotTimer) {
      clearInterval(this.screenshotTimer)
      this.screenshotTimer = null
    }

    if (this.inputAggregationTimer) {
      clearInterval(this.inputAggregationTimer)
      this.inputAggregationTimer = null
    }

    // Record final window session
    this.recordCurrentWindowSession()

    // Final input stats aggregation
    this.aggregateInputStats()

    // Stop modules
    this.idleDetector.stop()
    this.inputMonitor.stop()

    this.running = false
    console.log('Activity tracker stopped')
  }

  pause(): void {
    this.paused = true
    // Record current session before pausing
    this.recordCurrentWindowSession()
    console.log('Activity tracker paused')
  }

  resume(): void {
    this.paused = false
    this.windowStartTime = new Date()
    console.log('Activity tracker resumed')
  }

  isRunning(): boolean {
    return this.running
  }

  isPaused(): boolean {
    return this.paused
  }

  // Check if app should be excluded
  private isAppExcluded(appName: string): boolean {
    const excluded = this.options.excludedApps || []
    return excluded.some((pattern) =>
      appName.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  private recordCurrentWindowSession(): void {
    if (!this.currentWindow) return

    const now = new Date()
    const duration = Math.floor((now.getTime() - this.windowStartTime.getTime()) / 1000)

    if (duration > 0 && !this.isAppExcluded(this.currentWindow.app)) {
      // Get productivity data
      const productivityData = this.categorizer.getProductivityData(
        this.currentWindow.app,
        duration,
        this.currentWindow.title
      )

      // Get input stats for this session
      const sessionInputStats = this.inputMonitor.getCurrentStats()

      // Create session data
      const sessionData: SessionData = {
        appName: this.currentWindow.app,
        windowTitle: this.currentWindow.title,
        startTime: this.windowStartTime,
        endTime: now,
        durationSeconds: duration,
        inputStats: {
          keystrokeCount: sessionInputStats.keystrokeCount,
          mouseClicks: sessionInputStats.mouseClicks,
          wordsTyped: sessionInputStats.wordsTyped,
          avgTypingSpeed: sessionInputStats.avgTypingSpeed,
        },
      }

      // Add to statistics
      this.statistics.addSession(sessionData)

      // Emit activity with enhanced data
      this.options.onActivity({
        type: 'WindowFocus',
        source: 'Desktop',
        timestamp: this.windowStartTime.toISOString(),
        data: {
          appName: this.currentWindow.app,
          windowTitle: this.currentWindow.title,
          durationSeconds: duration,
          category: productivityData.category,
          productivityScore: productivityData.productivityScore,
          keystrokeCount: sessionInputStats.keystrokeCount,
          mouseClicks: sessionInputStats.mouseClicks,
          wordsTyped: sessionInputStats.wordsTyped,
          avgTypingSpeed: sessionInputStats.avgTypingSpeed,
        },
      })
    }
  }

  private async trackActivity(): Promise<void> {
    if (this.paused) return

    // Skip if idle
    const idleState = this.idleDetector.getState()
    if (idleState.isIdle) return

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
          this.recordCurrentWindowSession()

          // Reset input stats for new window
          this.inputMonitor.getStatsAndReset()

          // Start tracking new window
          this.windowStartTime = new Date()
        }

        this.currentWindow = { app, title }
      }
    } catch (error) {
      console.error('Error tracking activity:', error)
    }
  }

  private async captureScreenshot(): Promise<void> {
    if (this.paused) return

    // Don't capture during idle
    const idleState = this.idleDetector.getState()
    if (idleState.isIdle) return

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

  private aggregateInputStats(): void {
    if (this.paused) return

    const stats = this.inputMonitor.getStatsAndReset()

    // Only record if there was activity
    if (stats.keystrokeCount > 0 || stats.mouseClicks > 0) {
      // Add to statistics
      this.statistics.addInputStats(stats)

      // Emit aggregated input activity
      this.options.onActivity({
        type: 'InputActivity',
        source: 'Desktop',
        timestamp: stats.periodEndTime.toISOString(),
        data: {
          keystrokeCount: stats.keystrokeCount,
          wordsTyped: stats.wordsTyped,
          avgTypingSpeed: stats.avgTypingSpeed,
          mouseClicks: stats.mouseClicks,
          mouseClicksByButton: stats.mouseClicksByButton,
          mouseDistance: stats.mouseDistance,
          scrollDistance: stats.scrollDistance,
          modifierKeyUsage: stats.modifierKeyUsage,
          periodSeconds: stats.periodSeconds,
          appName: this.currentWindow?.app || 'Unknown',
        },
      })
    }
  }

  // Public API methods

  getStatistics(date?: Date): AggregatedStats {
    return this.statistics.getStatsForDate(date || new Date())
  }

  getCurrentProductivity(windowMinutes: number = 60): number {
    return this.statistics.getCurrentProductivity(windowMinutes)
  }

  getIdleState(): IdleState {
    return this.idleDetector.getState()
  }

  getInputStats(): InputStats {
    return this.inputMonitor.getCurrentStats()
  }

  getCategories(): AppCategory[] {
    return this.categorizer.getCategories()
  }

  setCategories(categories: AppCategory[]): void {
    this.categorizer.setCategories(categories)
  }

  setExcludedApps(apps: string[]): void {
    this.options.excludedApps = apps
  }

  getExcludedApps(): string[] {
    return this.options.excludedApps || []
  }

  getPermissionStatus(): PermissionStatus {
    return this.permissions.getPermissionStatus()
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return this.permissions.requestAllPermissions()
  }

  setIdleThreshold(thresholdMs: number): void {
    this.options.idleThreshold = thresholdMs
    this.idleDetector.setIdleThreshold(thresholdMs)
  }

  getIdleThreshold(): number {
    return this.options.idleThreshold
  }

  hasInputMonitoring(): boolean {
    return this.inputMonitorEnabled
  }

  // Get current window info
  getCurrentWindow(): { app: string; title: string } | null {
    return this.currentWindow
  }

  // Get screenshots directory
  getScreenshotsDir(): string {
    return this.screenshotsDir
  }

  // Clear old statistics data
  clearStatsBefore(date: Date): void {
    this.statistics.clearBefore(date)
  }

  // Export data for debugging
  exportData(): {
    sessions: SessionData[]
    inputStats: InputStats[]
    idlePeriods: { startTime: Date; endTime: Date; durationSeconds: number }[]
  } {
    return {
      sessions: this.statistics.getSessions(),
      inputStats: this.statistics.getInputStatsPeriods(),
      idlePeriods: this.statistics.getIdlePeriods(),
    }
  }
}

// Re-export Activity type for backward compatibility
export type { Activity }
