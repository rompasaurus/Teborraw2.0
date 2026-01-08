import { EventEmitter } from 'events'
import { InputMonitor } from './input-monitor'
import { IdleState, InputEvent } from './types'

// Try to load desktop-idle, but fall back gracefully if unavailable
let desktopIdle: { getIdleTime: () => number } | null = null
try {
  desktopIdle = require('desktop-idle')
} catch {
  console.warn('desktop-idle not available, using input-based idle detection only')
}

export class IdleDetector extends EventEmitter {
  private inputMonitor: InputMonitor
  private idleThreshold: number // milliseconds
  private checkInterval: NodeJS.Timeout | null = null
  private isIdle: boolean = false
  private idleStartTime: Date | null = null
  private lastActivityTime: Date = new Date()
  private running: boolean = false
  private ownsInputMonitor: boolean = false

  constructor(idleThresholdMs: number = 300000, inputMonitor?: InputMonitor) {
    super()
    this.idleThreshold = idleThresholdMs

    // Use provided input monitor or create our own
    if (inputMonitor) {
      this.inputMonitor = inputMonitor
      this.ownsInputMonitor = false
    } else {
      this.inputMonitor = new InputMonitor()
      this.ownsInputMonitor = true
    }

    // Listen to input activity
    this.inputMonitor.on('activity', (event: InputEvent) => {
      this.handleActivity(event)
    })
  }

  start(): boolean {
    if (this.running) return true

    // Start input monitoring if we own it
    if (this.ownsInputMonitor) {
      const inputStarted = this.inputMonitor.start()
      if (!inputStarted) {
        console.warn('Input monitor failed to start, using system idle only')
      }
    }

    // Start periodic idle check
    this.checkInterval = setInterval(() => {
      this.checkIdleState()
    }, 1000) // Check every second

    this.running = true
    console.log('Idle detector started')
    return true
  }

  stop(): void {
    if (!this.running) return

    // Stop input monitoring if we own it
    if (this.ownsInputMonitor) {
      this.inputMonitor.stop()
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.running = false
    console.log('Idle detector stopped')
  }

  private handleActivity(event: InputEvent): void {
    this.lastActivityTime = event.timestamp

    // If was idle, emit idle end
    if (this.isIdle && this.idleStartTime) {
      const idleDuration = Math.floor((Date.now() - this.idleStartTime.getTime()) / 1000)
      this.isIdle = false
      const startTime = this.idleStartTime
      this.idleStartTime = null
      this.emit('idleEnd', { idleDuration, startTime, endTime: new Date() })
    }
  }

  private checkIdleState(): void {
    // Get system idle time (seconds)
    let systemIdleSeconds = 0
    try {
      if (desktopIdle) {
        systemIdleSeconds = desktopIdle.getIdleTime()
      }
    } catch (error) {
      console.error('Error getting system idle time:', error)
    }

    // Also check time since last tracked input activity
    const inputIdleMs = Date.now() - this.lastActivityTime.getTime()

    // Use the minimum of system idle and input idle for accuracy
    // System idle is in seconds, convert to ms
    const effectiveIdleMs = Math.min(systemIdleSeconds * 1000, inputIdleMs)

    // Check if should transition to idle
    if (!this.isIdle && effectiveIdleMs >= this.idleThreshold) {
      this.isIdle = true
      this.idleStartTime = new Date(Date.now() - effectiveIdleMs)
      this.emit('idleStart', {
        idleSeconds: Math.floor(effectiveIdleMs / 1000),
        startTime: this.idleStartTime,
      })
    }

    // Emit state update
    const state = this.getState()
    this.emit('stateUpdate', state)
  }

  getState(): IdleState {
    let systemIdleSeconds = 0
    try {
      if (desktopIdle) {
        systemIdleSeconds = desktopIdle.getIdleTime()
      }
    } catch (error) {
      // Fallback to input-based idle detection
    }

    const inputIdleMs = Date.now() - this.lastActivityTime.getTime()
    const effectiveIdleMs = Math.min(systemIdleSeconds * 1000, inputIdleMs)

    return {
      isIdle: this.isIdle,
      idleStartTime: this.idleStartTime,
      lastActivityTime: this.lastActivityTime,
      idleSeconds: Math.floor(effectiveIdleMs / 1000),
    }
  }

  setIdleThreshold(thresholdMs: number): void {
    this.idleThreshold = thresholdMs
  }

  getIdleThreshold(): number {
    return this.idleThreshold
  }

  isRunning(): boolean {
    return this.running
  }

  isCurrentlyIdle(): boolean {
    return this.isIdle
  }

  getInputMonitor(): InputMonitor {
    return this.inputMonitor
  }

  // Force check idle state (useful for immediate status)
  forceCheck(): IdleState {
    this.checkIdleState()
    return this.getState()
  }

  // Manually trigger activity (useful for window focus events)
  triggerActivity(): void {
    this.handleActivity({
      type: 'keydown',
      timestamp: new Date(),
    })
  }
}
