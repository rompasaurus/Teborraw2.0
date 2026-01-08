import { EventEmitter } from 'events'
import { InputStats } from './types'

/**
 * InputMonitor - Keyboard/Mouse activity tracking (STUB)
 *
 * NOTE: uiohook-napi has been disabled because it crashes on macOS
 * during native module initialization, even before start() is called.
 * This appears to be a compatibility issue with Electron 33 and/or
 * missing Accessibility permissions.
 *
 * The app will work without keystroke/mouse tracking - window focus
 * tracking and screenshots still work.
 *
 * To re-enable in the future:
 * 1. Grant Accessibility permissions in System Preferences BEFORE launching
 * 2. Rebuild uiohook-napi: pnpm rebuild uiohook-napi
 * 3. Test with a simple script first to verify it works
 */

export class InputMonitor extends EventEmitter {
  private running: boolean = false
  private lastKeyActivity: Date = new Date()
  private lastMouseActivity: Date = new Date()
  private periodStartTime: Date = new Date()

  // Stub counters (always zero since monitoring is disabled)
  private keystrokeCount: number = 0
  private wordCount: number = 0
  private mouseClicks = { left: 0, right: 0, middle: 0 }
  private mouseDistance: number = 0
  private scrollDistance: number = 0
  private modifierUsage = { shift: 0, ctrl: 0, alt: 0, meta: 0 }

  constructor() {
    super()
    console.log('InputMonitor: Created (monitoring disabled - uiohook unavailable)')
  }

  start(): boolean {
    console.warn('InputMonitor: Input monitoring is disabled (uiohook-napi crashes on load)')
    console.warn('InputMonitor: Window focus tracking and screenshots still work')
    this.running = false
    return false
  }

  stop(): void {
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }

  isAvailable(): boolean {
    return false
  }

  getLastActivityTime(): Date {
    return this.lastKeyActivity > this.lastMouseActivity
      ? this.lastKeyActivity
      : this.lastMouseActivity
  }

  getLastKeyActivityTime(): Date {
    return this.lastKeyActivity
  }

  getLastMouseActivityTime(): Date {
    return this.lastMouseActivity
  }

  // Get current stats without resetting
  getCurrentStats(): InputStats {
    const now = new Date()
    const periodSeconds = Math.max(1, Math.floor((now.getTime() - this.periodStartTime.getTime()) / 1000))

    return {
      keystrokeCount: 0,
      wordsTyped: 0,
      avgTypingSpeed: 0,
      mouseClicks: 0,
      mouseClicksByButton: { left: 0, right: 0, middle: 0 },
      mouseDistance: 0,
      scrollDistance: 0,
      modifierKeyUsage: { shift: 0, ctrl: 0, alt: 0, meta: 0 },
      periodStartTime: this.periodStartTime,
      periodEndTime: now,
      periodSeconds,
    }
  }

  // Get stats and reset counters
  getStatsAndReset(): InputStats {
    const stats = this.getCurrentStats()
    this.periodStartTime = new Date()
    return stats
  }
}
