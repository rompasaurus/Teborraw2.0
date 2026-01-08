import {
  AggregatedStats,
  AppUsageStat,
  CategoryUsageStat,
  HourlyActivity,
  SessionData,
  IdlePeriod,
  InputStats,
} from './types'
import { AppCategorizer } from './app-categorizer'

export class StatisticsCalculator {
  private categorizer: AppCategorizer
  private sessions: SessionData[] = []
  private idlePeriods: IdlePeriod[] = []
  private inputStatsPeriods: InputStats[] = []

  constructor(categorizer: AppCategorizer) {
    this.categorizer = categorizer
  }

  addSession(session: SessionData): void {
    this.sessions.push(session)
  }

  addIdlePeriod(period: IdlePeriod): void {
    this.idlePeriods.push(period)
  }

  addInputStats(stats: InputStats): void {
    this.inputStatsPeriods.push(stats)
  }

  clear(): void {
    this.sessions = []
    this.idlePeriods = []
    this.inputStatsPeriods = []
  }

  // Clear data older than a certain date
  clearBefore(date: Date): void {
    this.sessions = this.sessions.filter((s) => s.startTime >= date)
    this.idlePeriods = this.idlePeriods.filter((p) => p.startTime >= date)
    this.inputStatsPeriods = this.inputStatsPeriods.filter(
      (s) => s.periodStartTime >= date
    )
  }

  // Get stats for a specific date
  getStatsForDate(date: Date): AggregatedStats {
    const dateStr = date.toISOString().split('T')[0]
    const dayStart = new Date(dateStr)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    // Filter sessions for this date
    const daySessions = this.sessions.filter(
      (s) => s.startTime >= dayStart && s.startTime < dayEnd
    )

    // Filter idle periods for this date
    const dayIdle = this.idlePeriods.filter(
      (p) => p.startTime >= dayStart && p.startTime < dayEnd
    )

    // Filter input stats for this date
    const dayInputStats = this.inputStatsPeriods.filter(
      (s) => s.periodStartTime >= dayStart && s.periodStartTime < dayEnd
    )

    // Calculate totals
    const totalActiveSeconds = daySessions.reduce(
      (sum, s) => sum + s.durationSeconds,
      0
    )
    const totalIdleSeconds = dayIdle.reduce((sum, p) => sum + p.durationSeconds, 0)

    // Calculate app breakdown
    const appBreakdown = this.calculateAppBreakdown(daySessions)

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(daySessions)

    // Calculate hourly activity
    const hourlyActivity = this.calculateHourlyActivity(daySessions, dayIdle)

    // Aggregate input stats
    const inputStats = this.aggregateInputStats(dayInputStats)

    // Calculate overall productivity score
    const productivityData = daySessions.map((s) =>
      this.categorizer.getProductivityData(s.appName, s.durationSeconds, s.windowTitle)
    )
    const productivityScore =
      this.categorizer.calculateOverallProductivity(productivityData)

    return {
      date: dateStr,
      totalActiveSeconds,
      totalIdleSeconds,
      productivityScore,
      appBreakdown,
      categoryBreakdown,
      hourlyActivity,
      inputStats,
    }
  }

  private calculateAppBreakdown(sessions: SessionData[]): AppUsageStat[] {
    const appMap = new Map<
      string,
      { duration: number; count: number; keystrokes: number; clicks: number }
    >()

    for (const session of sessions) {
      const existing = appMap.get(session.appName) || {
        duration: 0,
        count: 0,
        keystrokes: 0,
        clicks: 0,
      }
      existing.duration += session.durationSeconds
      existing.count += 1
      existing.keystrokes += session.inputStats?.keystrokeCount || 0
      existing.clicks += session.inputStats?.mouseClicks || 0
      appMap.set(session.appName, existing)
    }

    return Array.from(appMap.entries())
      .map(([appName, data]) => {
        const category = this.categorizer.categorize(appName)
        return {
          appName,
          category: category.name,
          durationSeconds: data.duration,
          productivityScore: category.productivityScore,
          sessionCount: data.count,
          keystrokeCount: data.keystrokes,
          mouseClicks: data.clicks,
        }
      })
      .sort((a, b) => b.durationSeconds - a.durationSeconds)
  }

  private calculateCategoryBreakdown(sessions: SessionData[]): CategoryUsageStat[] {
    const categoryMap = new Map<
      string,
      { duration: number; score: number; color: string }
    >()
    let totalDuration = 0

    for (const session of sessions) {
      const category = this.categorizer.categorize(session.appName)
      const existing = categoryMap.get(category.name) || {
        duration: 0,
        score: category.productivityScore,
        color: category.color,
      }
      existing.duration += session.durationSeconds
      categoryMap.set(category.name, existing)
      totalDuration += session.durationSeconds
    }

    return Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({
        category: categoryName,
        durationSeconds: data.duration,
        percentage: totalDuration > 0 ? (data.duration / totalDuration) * 100 : 0,
        productivityScore: data.score,
        color: data.color,
      }))
      .sort((a, b) => b.durationSeconds - a.durationSeconds)
  }

  private calculateHourlyActivity(
    sessions: SessionData[],
    idlePeriods: IdlePeriod[]
  ): HourlyActivity[] {
    const hours: HourlyActivity[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      activeSeconds: 0,
      idleSeconds: 0,
      topApp: '',
      keystrokeCount: 0,
      mouseClicks: 0,
    }))

    // Track app usage per hour for top app calculation
    const hourlyApps = new Map<number, Map<string, number>>()

    for (const session of sessions) {
      const hour = session.startTime.getHours()
      hours[hour].activeSeconds += session.durationSeconds
      hours[hour].keystrokeCount += session.inputStats?.keystrokeCount || 0
      hours[hour].mouseClicks += session.inputStats?.mouseClicks || 0

      // Track app usage per hour
      if (!hourlyApps.has(hour)) {
        hourlyApps.set(hour, new Map())
      }
      const appMap = hourlyApps.get(hour)!
      appMap.set(
        session.appName,
        (appMap.get(session.appName) || 0) + session.durationSeconds
      )
    }

    // Calculate idle time per hour
    for (const period of idlePeriods) {
      const hour = period.startTime.getHours()
      hours[hour].idleSeconds += period.durationSeconds
    }

    // Determine top app for each hour
    for (const [hour, appMap] of hourlyApps) {
      let topApp = ''
      let maxDuration = 0
      for (const [app, duration] of appMap) {
        if (duration > maxDuration) {
          maxDuration = duration
          topApp = app
        }
      }
      hours[hour].topApp = topApp
    }

    return hours
  }

  private aggregateInputStats(inputStatsPeriods: InputStats[]): InputStats {
    if (inputStatsPeriods.length === 0) {
      return {
        keystrokeCount: 0,
        wordsTyped: 0,
        avgTypingSpeed: 0,
        mouseClicks: 0,
        mouseClicksByButton: { left: 0, right: 0, middle: 0 },
        mouseDistance: 0,
        scrollDistance: 0,
        modifierKeyUsage: { shift: 0, ctrl: 0, alt: 0, meta: 0 },
        periodStartTime: new Date(),
        periodEndTime: new Date(),
        periodSeconds: 0,
      }
    }

    const first = inputStatsPeriods[0]
    const last = inputStatsPeriods[inputStatsPeriods.length - 1]

    const aggregated: InputStats = {
      keystrokeCount: 0,
      wordsTyped: 0,
      avgTypingSpeed: 0,
      mouseClicks: 0,
      mouseClicksByButton: { left: 0, right: 0, middle: 0 },
      mouseDistance: 0,
      scrollDistance: 0,
      modifierKeyUsage: { shift: 0, ctrl: 0, alt: 0, meta: 0 },
      periodStartTime: first.periodStartTime,
      periodEndTime: last.periodEndTime,
      periodSeconds: 0,
    }

    let totalTypingSpeedWeight = 0

    for (const stats of inputStatsPeriods) {
      aggregated.keystrokeCount += stats.keystrokeCount
      aggregated.wordsTyped += stats.wordsTyped
      aggregated.mouseClicks += stats.mouseClicks
      aggregated.mouseClicksByButton.left += stats.mouseClicksByButton.left
      aggregated.mouseClicksByButton.right += stats.mouseClicksByButton.right
      aggregated.mouseClicksByButton.middle += stats.mouseClicksByButton.middle
      aggregated.mouseDistance += stats.mouseDistance
      aggregated.scrollDistance += stats.scrollDistance
      aggregated.modifierKeyUsage.shift += stats.modifierKeyUsage.shift
      aggregated.modifierKeyUsage.ctrl += stats.modifierKeyUsage.ctrl
      aggregated.modifierKeyUsage.alt += stats.modifierKeyUsage.alt
      aggregated.modifierKeyUsage.meta += stats.modifierKeyUsage.meta
      aggregated.periodSeconds += stats.periodSeconds

      // Weight typing speed by keystroke count for accurate average
      if (stats.keystrokeCount > 0) {
        aggregated.avgTypingSpeed += stats.avgTypingSpeed * stats.keystrokeCount
        totalTypingSpeedWeight += stats.keystrokeCount
      }
    }

    // Calculate weighted average typing speed
    if (totalTypingSpeedWeight > 0) {
      aggregated.avgTypingSpeed = Math.round(
        aggregated.avgTypingSpeed / totalTypingSpeedWeight
      )
    }

    return aggregated
  }

  // Get real-time productivity metrics for a time window
  getCurrentProductivity(windowMinutes: number = 60): number {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)
    const recent = this.sessions.filter((s) => s.startTime >= cutoff)

    const productivityData = recent.map((s) =>
      this.categorizer.getProductivityData(s.appName, s.durationSeconds)
    )

    return this.categorizer.calculateOverallProductivity(productivityData)
  }

  // Get session count
  getSessionCount(): number {
    return this.sessions.length
  }

  // Get total tracked time
  getTotalTrackedTime(): number {
    return this.sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
  }

  // Get sessions for export/debugging
  getSessions(): SessionData[] {
    return [...this.sessions]
  }

  // Get idle periods for export/debugging
  getIdlePeriods(): IdlePeriod[] {
    return [...this.idlePeriods]
  }

  // Get input stats periods for export/debugging
  getInputStatsPeriods(): InputStats[] {
    return [...this.inputStatsPeriods]
  }
}
