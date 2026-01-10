import { EventEmitter } from 'events'
import { clipboard } from 'electron'
import { InputStats } from './types'

/**
 * InputMonitor - Keyboard/Mouse activity tracking
 *
 * Tracks keyboard and mouse input using uIOhook-napi
 */

let uIOhook: any = null
let uIOhookAvailable = false

// Try to load uIOhook-napi
try {
  const uIOhookModule = require('uIOhook-napi')
  uIOhook = uIOhookModule.uIOhook
  uIOhookAvailable = true
  console.log('✅ uIOhook-napi loaded successfully')
} catch (error) {
  console.warn('⚠️  uIOhook-napi failed to load:', error)
  console.warn('   Input monitoring will be disabled')
  console.warn('   Ensure Accessibility permissions are granted before launching the app')
}

export class InputMonitor extends EventEmitter {
  private running: boolean = false
  private lastKeyActivity: Date = new Date()
  private lastMouseActivity: Date = new Date()
  private periodStartTime: Date = new Date()

  // Input counters
  private keystrokeCount: number = 0
  private wordCount: number = 0
  private mouseClicks = { left: 0, right: 0, middle: 0 }
  private mouseDistance: number = 0
  private scrollDistance: number = 0
  private modifierUsage = { shift: 0, ctrl: 0, alt: 0, meta: 0 }

  // For tracking mouse position
  private lastMouseX: number = 0
  private lastMouseY: number = 0

  // For calculating words typed
  private lastKeypressTime: number = 0
  private wordBoundaryKeysSeen: boolean = false

  // Buffer for capturing typed text
  private textBuffer: string = ''
  private readonly maxBufferSize: number = 10000 // Max characters to store

  // Clipboard tracking
  private copyCount: number = 0
  private pasteCount: number = 0
  private clipboardHistory: Array<{ operation: 'copy' | 'paste', text: string, timestamp: Date }> = []
  private readonly maxClipboardHistory: number = 50 // Max clipboard entries to store
  private lastClipboardText: string = ''

  constructor() {
    super()
    if (uIOhookAvailable) {
      console.log('InputMonitor: Created with uIOhook-napi')
    } else {
      console.log('InputMonitor: Created without input monitoring (uIOhook unavailable)')
    }
  }

  start(): boolean {
    if (!uIOhookAvailable) {
      console.warn('InputMonitor: Cannot start - uIOhook-napi not available')
      return false
    }

    if (this.running) {
      console.log('InputMonitor: Already running')
      return true
    }

    try {
      // Set up event handlers
      uIOhook.on('keydown', this.handleKeyDown.bind(this))
      uIOhook.on('mousedown', this.handleMouseDown.bind(this))
      uIOhook.on('mousemove', this.handleMouseMove.bind(this))
      uIOhook.on('wheel', this.handleWheel.bind(this))

      // Start the hook
      uIOhook.start()
      this.running = true
      this.periodStartTime = new Date()

      console.log('✅ InputMonitor started')
      return true
    } catch (error) {
      console.error('❌ Failed to start InputMonitor:', error)
      console.error('   Make sure Accessibility permissions are granted')
      this.running = false
      return false
    }
  }

  stop(): void {
    if (!uIOhookAvailable || !this.running) {
      this.running = false
      return
    }

    try {
      uIOhook.stop()
      this.running = false
      console.log('InputMonitor stopped')
    } catch (error) {
      console.error('Error stopping InputMonitor:', error)
    }
  }

  isRunning(): boolean {
    return this.running
  }

  isAvailable(): boolean {
    return uIOhookAvailable
  }

  private handleKeyDown(event: any): void {
    this.lastKeyActivity = new Date()
    this.keystrokeCount++

    // Detect copy/paste operations
    // Ctrl+C or Cmd+C (keycode 46 = 'C')
    if ((event.ctrlKey || event.metaKey) && event.keycode === 46) {
      this.handleCopy()
    }
    // Ctrl+V or Cmd+V (keycode 47 = 'V')
    else if ((event.ctrlKey || event.metaKey) && event.keycode === 47) {
      this.handlePaste()
    }
    // Ctrl+X or Cmd+X (keycode 45 = 'X') - cut is also a copy operation
    else if ((event.ctrlKey || event.metaKey) && event.keycode === 45) {
      this.handleCopy()
    }

    // Capture typed characters
    const char = this.keycodeToChar(event.keycode, event.shiftKey)
    if (char !== null) {
      // Handle backspace
      if (event.keycode === 14 && this.textBuffer.length > 0) {
        this.textBuffer = this.textBuffer.slice(0, -1)
      } else if (char !== '') {
        // Add character to buffer
        this.textBuffer += char

        // Enforce max buffer size
        if (this.textBuffer.length > this.maxBufferSize) {
          this.textBuffer = this.textBuffer.slice(-this.maxBufferSize)
        }
      }
    }

    // Calculate words typed (approximate)
    // A "word" is roughly every 5 keystrokes, or when space/enter is pressed
    const isWordBoundary = event.keycode === 57 || event.keycode === 28 // Space or Enter
    if (isWordBoundary) {
      this.wordCount++
      this.wordBoundaryKeysSeen = true
    } else {
      // Count a word for every 5 keystrokes if no word boundaries detected
      if (!this.wordBoundaryKeysSeen && this.keystrokeCount % 5 === 0) {
        this.wordCount++
      }
    }

    // Track modifier key usage
    if (event.shiftKey) this.modifierUsage.shift++
    if (event.ctrlKey) this.modifierUsage.ctrl++
    if (event.altKey) this.modifierUsage.alt++
    if (event.metaKey) this.modifierUsage.meta++

    this.lastKeypressTime = Date.now()
    this.emit('keydown', event)
  }

  private handleMouseDown(event: any): void {
    this.lastMouseActivity = new Date()

    // Track click by button (button: 1=left, 2=right, 3=middle)
    if (event.button === 1) {
      this.mouseClicks.left++
    } else if (event.button === 2) {
      this.mouseClicks.right++
    } else if (event.button === 3) {
      this.mouseClicks.middle++
    }

    this.emit('mousedown', event)
  }

  private handleMouseMove(event: any): void {
    this.lastMouseActivity = new Date()

    // Calculate distance moved
    if (this.lastMouseX !== 0 || this.lastMouseY !== 0) {
      const dx = event.x - this.lastMouseX
      const dy = event.y - this.lastMouseY
      const distance = Math.sqrt(dx * dx + dy * dy)
      this.mouseDistance += distance
    }

    this.lastMouseX = event.x
    this.lastMouseY = event.y

    this.emit('mousemove', event)
  }

  private handleWheel(event: any): void {
    this.lastMouseActivity = new Date()

    // Track scroll distance (amount is in "clicks", approximate to pixels)
    const scrollAmount = Math.abs(event.amount || 0) * 100 // Approximate pixels per scroll
    this.scrollDistance += scrollAmount

    this.emit('wheel', event)
  }

  /**
   * Convert uIOhook keycode to character
   * Returns null for non-character keys (modifiers, function keys, etc.)
   */
  private keycodeToChar(keycode: number, shiftKey: boolean): string | null {
    // Backspace
    if (keycode === 14) return ''

    // Number row (0-9)
    const numberKeys: { [key: number]: [string, string] } = {
      2: ['1', '!'],
      3: ['2', '@'],
      4: ['3', '#'],
      5: ['4', '$'],
      6: ['5', '%'],
      7: ['6', '^'],
      8: ['7', '&'],
      9: ['8', '*'],
      10: ['9', '('],
      11: ['0', ')'],
    }

    if (numberKeys[keycode]) {
      return shiftKey ? numberKeys[keycode][1] : numberKeys[keycode][0]
    }

    // Letter keys (A-Z) - keycodes 16-25 (QWERTY top row), 30-38 (middle row), 44-50 (bottom row)
    const letterKeys: { [key: number]: string } = {
      16: 'q',
      17: 'w',
      18: 'e',
      19: 'r',
      20: 't',
      21: 'y',
      22: 'u',
      23: 'i',
      24: 'o',
      25: 'p',
      30: 'a',
      31: 's',
      32: 'd',
      33: 'f',
      34: 'g',
      35: 'h',
      36: 'j',
      37: 'k',
      38: 'l',
      44: 'z',
      45: 'x',
      46: 'c',
      47: 'v',
      48: 'b',
      49: 'n',
      50: 'm',
    }

    if (letterKeys[keycode]) {
      return shiftKey ? letterKeys[keycode].toUpperCase() : letterKeys[keycode]
    }

    // Special characters
    const specialKeys: { [key: number]: [string, string] } = {
      12: ['-', '_'],
      13: ['=', '+'],
      26: ['[', '{'],
      27: [']', '}'],
      43: ['\\', '|'],
      39: [';', ':'],
      40: ["'", '"'],
      41: ['`', '~'],
      51: [',', '<'],
      52: ['.', '>'],
      53: ['/', '?'],
      57: [' ', ' '], // Space
      28: ['\n', '\n'], // Enter
      15: ['\t', '\t'], // Tab
    }

    if (specialKeys[keycode]) {
      return shiftKey ? specialKeys[keycode][1] : specialKeys[keycode][0]
    }

    // Non-character keys (modifiers, function keys, arrows, etc.)
    return null
  }

  /**
   * Handle copy operation - capture clipboard content
   */
  private handleCopy(): void {
    try {
      // Small delay to ensure clipboard is populated
      setTimeout(() => {
        const clipboardText = clipboard.readText()
        if (clipboardText && clipboardText !== this.lastClipboardText) {
          this.copyCount++
          this.lastClipboardText = clipboardText

          // Add to clipboard history
          this.clipboardHistory.push({
            operation: 'copy',
            text: clipboardText,
            timestamp: new Date(),
          })

          // Enforce max clipboard history size
          if (this.clipboardHistory.length > this.maxClipboardHistory) {
            this.clipboardHistory = this.clipboardHistory.slice(-this.maxClipboardHistory)
          }

          console.log(`📋 Copy detected (${clipboardText.length} chars)`)
        }
      }, 50)
    } catch (error) {
      console.error('Error reading clipboard on copy:', error)
    }
  }

  /**
   * Handle paste operation - capture clipboard content
   */
  private handlePaste(): void {
    try {
      const clipboardText = clipboard.readText()
      if (clipboardText) {
        this.pasteCount++

        // Add to clipboard history
        this.clipboardHistory.push({
          operation: 'paste',
          text: clipboardText,
          timestamp: new Date(),
        })

        // Enforce max clipboard history size
        if (this.clipboardHistory.length > this.maxClipboardHistory) {
          this.clipboardHistory = this.clipboardHistory.slice(-this.maxClipboardHistory)
        }

        console.log(`📋 Paste detected (${clipboardText.length} chars)`)
      }
    } catch (error) {
      console.error('Error reading clipboard on paste:', error)
    }
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
    const periodSeconds = Math.max(
      1,
      Math.floor((now.getTime() - this.periodStartTime.getTime()) / 1000)
    )

    // Calculate WPM (Words Per Minute)
    const avgTypingSpeed =
      periodSeconds > 0 ? Math.round((this.wordCount / periodSeconds) * 60) : 0

    const totalClicks =
      this.mouseClicks.left + this.mouseClicks.right + this.mouseClicks.middle

    return {
      keystrokeCount: this.keystrokeCount,
      wordsTyped: this.wordCount,
      avgTypingSpeed,
      mouseClicks: totalClicks,
      mouseClicksByButton: { ...this.mouseClicks },
      mouseDistance: Math.round(this.mouseDistance),
      scrollDistance: Math.round(this.scrollDistance),
      modifierKeyUsage: { ...this.modifierUsage },
      periodStartTime: this.periodStartTime,
      periodEndTime: now,
      periodSeconds,
      textContent: this.textBuffer,
      copyCount: this.copyCount,
      pasteCount: this.pasteCount,
      clipboardHistory: [...this.clipboardHistory],
    }
  }

  // Get stats and reset counters
  getStatsAndReset(): InputStats {
    const stats = this.getCurrentStats()

    // Reset counters
    this.keystrokeCount = 0
    this.wordCount = 0
    this.mouseClicks = { left: 0, right: 0, middle: 0 }
    this.mouseDistance = 0
    this.scrollDistance = 0
    this.modifierUsage = { shift: 0, ctrl: 0, alt: 0, meta: 0 }
    this.textBuffer = ''
    this.copyCount = 0
    this.pasteCount = 0
    this.clipboardHistory = []
    this.periodStartTime = new Date()
    this.wordBoundaryKeysSeen = false

    return stats
  }
}
