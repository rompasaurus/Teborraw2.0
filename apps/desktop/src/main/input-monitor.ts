import { uIOhook, UiohookKey } from 'uiohook-napi'
import { EventEmitter } from 'events'
import { InputEvent, InputStats } from './types'

// Word detection: space, enter, tab indicate word completion
const WORD_BOUNDARY_KEYS: number[] = [
  UiohookKey.Space,
  UiohookKey.Enter,
  UiohookKey.Tab,
]

export class InputMonitor extends EventEmitter {
  private running: boolean = false
  private lastKeyActivity: Date = new Date()
  private lastMouseActivity: Date = new Date()
  private lastMouseX: number = 0
  private lastMouseY: number = 0

  // Keystroke tracking
  private keystrokeCount: number = 0
  private wordCount: number = 0
  private keystrokeTimestamps: number[] = [] // For WPM calculation

  // Mouse tracking
  private mouseClicks: { left: number; right: number; middle: number } = {
    left: 0,
    right: 0,
    middle: 0,
  }
  private mouseDistance: number = 0
  private scrollDistance: number = 0

  // Modifier key usage
  private modifierUsage: { shift: number; ctrl: number; alt: number; meta: number } = {
    shift: 0,
    ctrl: 0,
    alt: 0,
    meta: 0,
  }

  // Period tracking
  private periodStartTime: Date = new Date()

  constructor() {
    super()
  }

  start(): boolean {
    if (this.running) return true

    try {
      // Register keyboard events
      uIOhook.on('keydown', (event) => {
        this.handleKeyDown(event)
      })

      uIOhook.on('keyup', (event) => {
        this.handleKeyUp(event)
      })

      // Register mouse events
      uIOhook.on('mousedown', (event) => {
        this.handleMouseDown(event as { button: number; x: number; y: number; clicks: number })
      })

      uIOhook.on('mouseup', (event) => {
        this.handleMouseUp(event as { button: number; x: number; y: number })
      })

      uIOhook.on('mousemove', (event) => {
        this.handleMouseMove(event)
      })

      uIOhook.on('wheel', (event) => {
        this.handleWheel(event)
      })

      // Start the hook
      uIOhook.start()
      this.running = true
      this.periodStartTime = new Date()
      console.log('Input monitor started')
      return true
    } catch (error) {
      console.error('Failed to start input monitor:', error)
      this.emit('error', error as Error)
      return false
    }
  }

  stop(): void {
    if (!this.running) return

    try {
      uIOhook.stop()
      uIOhook.removeAllListeners()
      this.running = false
      console.log('Input monitor stopped')
    } catch (error) {
      console.error('Error stopping input monitor:', error)
    }
  }

  private handleKeyDown(event: { keycode: number; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): void {
    const now = new Date()
    this.lastKeyActivity = now
    this.keystrokeCount++
    this.keystrokeTimestamps.push(now.getTime())

    // Track word boundaries
    if (WORD_BOUNDARY_KEYS.includes(event.keycode)) {
      this.wordCount++
    }

    // Track modifier usage
    if (event.shiftKey) this.modifierUsage.shift++
    if (event.ctrlKey) this.modifierUsage.ctrl++
    if (event.altKey) this.modifierUsage.alt++
    if (event.metaKey) this.modifierUsage.meta++

    // Emit activity event
    const inputEvent: InputEvent = {
      type: 'keydown',
      timestamp: now,
      keycode: event.keycode,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    }
    this.emit('activity', inputEvent)
    this.emit('keydown', inputEvent)
  }

  private handleKeyUp(event: { keycode: number }): void {
    const inputEvent: InputEvent = {
      type: 'keyup',
      timestamp: new Date(),
      keycode: event.keycode,
    }
    this.emit('keyup', inputEvent)
  }

  private handleMouseDown(event: { button: number; x: number; y: number; clicks: number }): void {
    const now = new Date()
    this.lastMouseActivity = now

    // Track click by button type
    switch (event.button) {
      case 1:
        this.mouseClicks.left++
        break
      case 2:
        this.mouseClicks.right++
        break
      case 3:
        this.mouseClicks.middle++
        break
    }

    const inputEvent: InputEvent = {
      type: 'mousedown',
      timestamp: now,
      button: event.button,
      x: event.x,
      y: event.y,
      clicks: event.clicks,
    }
    this.emit('activity', inputEvent)
    this.emit('mousedown', inputEvent)
  }

  private handleMouseUp(event: { button: number; x: number; y: number }): void {
    const inputEvent: InputEvent = {
      type: 'mouseup',
      timestamp: new Date(),
      button: event.button,
      x: event.x,
      y: event.y,
    }
    this.emit('mouseup', inputEvent)
  }

  private handleMouseMove(event: { x: number; y: number }): void {
    const now = new Date()

    // Calculate distance moved
    if (this.lastMouseX !== 0 || this.lastMouseY !== 0) {
      const dx = event.x - this.lastMouseX
      const dy = event.y - this.lastMouseY
      const distance = Math.sqrt(dx * dx + dy * dy)
      this.mouseDistance += distance
    }

    this.lastMouseX = event.x
    this.lastMouseY = event.y
    this.lastMouseActivity = now

    const inputEvent: InputEvent = {
      type: 'mousemove',
      timestamp: now,
      x: event.x,
      y: event.y,
    }
    // Don't emit activity for every mouse move (too noisy)
    this.emit('mousemove', inputEvent)
  }

  private handleWheel(event: { rotation: number; x: number; y: number }): void {
    const now = new Date()
    this.lastMouseActivity = now
    this.scrollDistance += Math.abs(event.rotation)

    const inputEvent: InputEvent = {
      type: 'wheel',
      timestamp: now,
      x: event.x,
      y: event.y,
    }
    this.emit('activity', inputEvent)
    this.emit('wheel', inputEvent)
  }

  // Calculate typing speed (WPM) based on recent keystrokes
  private calculateTypingSpeed(): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // Filter to keystrokes in the last minute
    const recentKeystrokes = this.keystrokeTimestamps.filter((ts) => ts > oneMinuteAgo)

    if (recentKeystrokes.length < 2) return 0

    // Calculate characters per minute
    const timeSpanMs = recentKeystrokes[recentKeystrokes.length - 1] - recentKeystrokes[0]
    if (timeSpanMs === 0) return 0

    const cpm = (recentKeystrokes.length / timeSpanMs) * 60000

    // Convert to WPM (average word is 5 characters)
    return Math.round(cpm / 5)
  }

  // Get current input statistics and reset counters
  getStatsAndReset(): InputStats {
    const now = new Date()
    const periodSeconds = Math.floor((now.getTime() - this.periodStartTime.getTime()) / 1000)

    const stats: InputStats = {
      keystrokeCount: this.keystrokeCount,
      wordsTyped: this.wordCount,
      avgTypingSpeed: this.calculateTypingSpeed(),
      mouseClicks:
        this.mouseClicks.left + this.mouseClicks.right + this.mouseClicks.middle,
      mouseClicksByButton: { ...this.mouseClicks },
      mouseDistance: Math.round(this.mouseDistance),
      scrollDistance: Math.round(this.scrollDistance),
      modifierKeyUsage: { ...this.modifierUsage },
      periodStartTime: this.periodStartTime,
      periodEndTime: now,
      periodSeconds,
    }

    // Reset counters
    this.resetCounters()

    return stats
  }

  // Get current stats without resetting
  getCurrentStats(): InputStats {
    const now = new Date()
    const periodSeconds = Math.floor((now.getTime() - this.periodStartTime.getTime()) / 1000)

    return {
      keystrokeCount: this.keystrokeCount,
      wordsTyped: this.wordCount,
      avgTypingSpeed: this.calculateTypingSpeed(),
      mouseClicks:
        this.mouseClicks.left + this.mouseClicks.right + this.mouseClicks.middle,
      mouseClicksByButton: { ...this.mouseClicks },
      mouseDistance: Math.round(this.mouseDistance),
      scrollDistance: Math.round(this.scrollDistance),
      modifierKeyUsage: { ...this.modifierUsage },
      periodStartTime: this.periodStartTime,
      periodEndTime: now,
      periodSeconds,
    }
  }

  private resetCounters(): void {
    this.keystrokeCount = 0
    this.wordCount = 0
    this.keystrokeTimestamps = []
    this.mouseClicks = { left: 0, right: 0, middle: 0 }
    this.mouseDistance = 0
    this.scrollDistance = 0
    this.modifierUsage = { shift: 0, ctrl: 0, alt: 0, meta: 0 }
    this.periodStartTime = new Date()
  }

  isRunning(): boolean {
    return this.running
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
}
