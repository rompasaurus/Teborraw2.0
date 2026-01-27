// Shared TypeScript interfaces for enhanced activity tracking

// Input activity event from keyboard/mouse
export interface InputEvent {
  type: 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'wheel'
  timestamp: Date
  keycode?: number
  button?: number
  x?: number
  y?: number
  clicks?: number
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

// Aggregated input statistics for a period
export interface InputStats {
  keystrokeCount: number
  wordsTyped: number
  avgTypingSpeed: number // WPM
  mouseClicks: number
  mouseClicksByButton: {
    left: number
    right: number
    middle: number
  }
  mouseDistance: number // pixels
  scrollDistance: number // pixels
  modifierKeyUsage: {
    shift: number
    ctrl: number
    alt: number
    meta: number
  }
  periodStartTime: Date
  periodEndTime: Date
  periodSeconds: number
  textContent?: string // Captured text content for personal tracking
  copyCount?: number // Number of copy operations
  pasteCount?: number // Number of paste operations
  clipboardHistory?: Array<{
    operation: 'copy' | 'paste'
    text: string
    timestamp: Date
  }> // History of clipboard operations
}

// Idle detection state
export interface IdleState {
  isIdle: boolean
  idleStartTime: Date | null
  lastActivityTime: Date
  idleSeconds: number
}

// App category with productivity score
export interface AppCategory {
  name: string
  patterns: string[]
  productivityScore: number // -1 to +1 scale
  color: string
}

// Productivity data for a specific app session
export interface ProductivityData {
  appName: string
  category: string
  productivityScore: number
  totalSeconds: number
  windowTitle?: string
}

// Per-app usage statistics
export interface AppUsageStat {
  appName: string
  category: string
  durationSeconds: number
  productivityScore: number
  sessionCount: number
  keystrokeCount: number
  mouseClicks: number
}

// Per-category usage statistics
export interface CategoryUsageStat {
  category: string
  durationSeconds: number
  percentage: number
  productivityScore: number
  color: string
}

// Hourly activity breakdown
export interface HourlyActivity {
  hour: number
  activeSeconds: number
  idleSeconds: number
  topApp: string
  keystrokeCount: number
  mouseClicks: number
}

// Aggregated daily statistics
export interface AggregatedStats {
  date: string
  totalActiveSeconds: number
  totalIdleSeconds: number
  productivityScore: number
  appBreakdown: AppUsageStat[]
  categoryBreakdown: CategoryUsageStat[]
  hourlyActivity: HourlyActivity[]
  inputStats: InputStats
}

// Session data for window tracking
export interface SessionData {
  appName: string
  windowTitle: string
  startTime: Date
  endTime: Date
  durationSeconds: number
  inputStats: Partial<InputStats>
}

// Idle period record
export interface IdlePeriod {
  startTime: Date
  endTime: Date
  durationSeconds: number
}

// Tracker configuration options
export interface TrackerConfig {
  activityInterval: number // ms between window checks
  screenshotInterval: number // ms between screenshots
  idleThreshold: number // ms before considered idle
  inputAggregationInterval: number // ms between input stat aggregation
  excludedApps: string[]
  categories: AppCategory[]
}

// Permission status for macOS
export interface PermissionStatus {
  accessibility: boolean
  screenCapture: boolean
}

// Scroll event with velocity tracking
export interface ScrollEvent {
  timestamp: Date
  scrollY: number
  deltaY: number
  velocity: number // pixels per second
  direction: 'up' | 'down'
}

// Scroll session aggregated metrics
export interface ScrollSessionMetrics {
  sessionId: string
  startTime: Date
  endTime: Date
  totalScrollDistance: number
  netScrollDistance: number
  directionChanges: number
  avgVelocity: number
  maxVelocity: number
  rapidScrollSegments: number
  dwellTimes: number[]
  avgDwellTime: number
  sessionDurationMs: number
  eventCount: number
}

// Doomscrolling detection indicators
export interface DoomscrollIndicators {
  rapidScrolling: boolean
  directionThrashing: boolean
  shortContentViews: boolean
  extendedSession: boolean
  infiniteScrollDetected: boolean
}

// Configuration for doomscroll detection thresholds
export interface DoomscrollConfig {
  velocityThreshold: number // px/s considered "rapid" (default: 500)
  dwellTimeThreshold: number // ms considered "short" (default: 1500)
  directionChangeThreshold: number // changes per minute threshold (default: 10)
  sessionDurationThreshold: number // ms before flagging (default: 300000 = 5min)
  confidenceThreshold: number // 0-1 threshold to flag (default: 0.6)
}

// Activity types for sync
export type ActivityType =
  | 'WindowFocus'
  | 'Screenshot'
  | 'IdleStart'
  | 'IdleEnd'
  | 'InputActivity'
  | 'ScrollSession'

export type ActivitySource = 'Desktop' | 'Browser' | 'Mobile'

// Activity record for syncing
export interface Activity {
  type: ActivityType
  source: ActivitySource
  timestamp: string
  data: Record<string, unknown>
}
