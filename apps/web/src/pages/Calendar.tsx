import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
} from 'date-fns'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Globe,
  Smartphone,
  MapPin,
  Mic,
  Image as ImageIcon,
  Search,
  Clock,
  Keyboard,
  FileText,
  X,
} from 'lucide-react'
import { activitiesApi } from '@/services/api'
import { Layout } from '@/components/Layout'

const activityTypes = [
  'WindowFocus',
  'Screenshot',
  'PageVisit',
  'Search',
  'TabChange',
  'Location',
  'AudioRecording',
  'Thought',
  'IdleStart',
  'IdleEnd',
  'InputActivity',
]

const typeIcons: Record<string, React.ElementType> = {
  WindowFocus: Monitor,
  PageVisit: Globe,
  Location: MapPin,
  AudioRecording: Mic,
  Screenshot: ImageIcon,
  Search: Search,
  TabChange: FileText,
  Thought: FileText,
  IdleStart: Clock,
  IdleEnd: Clock,
  InputActivity: Keyboard,
}

const sourceColors: Record<string, string> = {
  Desktop: 'bg-green-500',
  Browser: 'bg-blue-500',
  Mobile: 'bg-purple-500',
}

const typeColors: Record<string, string> = {
  WindowFocus: 'bg-green-400',
  PageVisit: 'bg-blue-400',
  Location: 'bg-purple-400',
  AudioRecording: 'bg-yellow-400',
  Screenshot: 'bg-pink-400',
  Search: 'bg-orange-400',
  TabChange: 'bg-cyan-400',
  Thought: 'bg-indigo-400',
  IdleStart: 'bg-slate-400',
  IdleEnd: 'bg-slate-400',
  InputActivity: 'bg-emerald-400',
}

interface DayData {
  date: Date
  activities: any[]
  totalCount: number
  bySource: Record<string, number>
  byType: Record<string, number>
  totalDuration: number
  keystrokeCount: number
  wordsTyped: number
}

export function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Fetch activities for the visible month range (including partial weeks)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-activities', format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')],
    queryFn: () =>
      activitiesApi.list({
        pageSize: 10000,
        startDate: startOfDay(calendarStart).toISOString(),
        endDate: endOfDay(calendarEnd).toISOString(),
      }),
  })

  const activities = data?.data?.items ?? []

  // Process activities into day buckets
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()

    // Initialize all days in the calendar view
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    days.forEach((day) => {
      map.set(format(day, 'yyyy-MM-dd'), {
        date: day,
        activities: [],
        totalCount: 0,
        bySource: {},
        byType: {},
        totalDuration: 0,
        keystrokeCount: 0,
        wordsTyped: 0,
      })
    })

    // Populate with activity data
    activities.forEach((activity: any) => {
      const dayKey = format(new Date(activity.timestamp), 'yyyy-MM-dd')
      const dayData = map.get(dayKey)
      if (dayData) {
        dayData.activities.push(activity)
        dayData.totalCount++

        // Count by source
        const source = typeof activity.source === 'string'
          ? activity.source
          : ['Desktop', 'Browser', 'Mobile'][activity.source] || 'Unknown'
        dayData.bySource[source] = (dayData.bySource[source] || 0) + 1

        // Count by type
        const type = typeof activity.type === 'string'
          ? activity.type
          : activityTypes[activity.type] || 'Unknown'
        dayData.byType[type] = (dayData.byType[type] || 0) + 1

        // Aggregate duration
        if (activity.data?.durationSeconds) {
          dayData.totalDuration += activity.data.durationSeconds
        }

        // Aggregate input stats
        if (activity.data?.keystrokeCount) {
          dayData.keystrokeCount += activity.data.keystrokeCount
        }
        if (activity.data?.wordsTyped) {
          dayData.wordsTyped += activity.data.wordsTyped
        }
      }
    })

    return map
  }, [activities, calendarStart, calendarEnd])

  // Get days for the calendar grid
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

  // Selected day's activities
  const selectedDayData = selectedDay
    ? dayDataMap.get(format(selectedDay, 'yyyy-MM-dd'))
    : null

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) =>
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
    setSelectedDay(new Date())
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getActivityIntensity = (count: number) => {
    if (count === 0) return 'bg-slate-800'
    if (count < 10) return 'bg-primary-900/50'
    if (count < 50) return 'bg-primary-800/60'
    if (count < 100) return 'bg-primary-700/70'
    return 'bg-primary-600/80'
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Calendar</h1>
            <p className="text-slate-400 mt-1">Your activity overview by day</p>
          </div>
          <button
            onClick={goToToday}
            className="btn-secondary"
          >
            Today
          </button>
        </div>

        <div className="flex gap-6">
          {/* Calendar Grid */}
          <div className={`flex-1 ${selectedDay ? 'lg:w-2/3' : 'w-full'}`}>
            <div className="card">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h2 className="text-xl font-semibold text-white">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-slate-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              {isLoading ? (
                <div className="text-center py-12 text-slate-400">
                  Loading calendar data...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const dayKey = format(day, 'yyyy-MM-dd')
                    const dayData = dayDataMap.get(dayKey)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isToday = isSameDay(day, new Date())
                    const isSelected = selectedDay && isSameDay(day, selectedDay)

                    return (
                      <button
                        key={dayKey}
                        onClick={() => setSelectedDay(day)}
                        className={`
                          min-h-[100px] p-2 rounded-lg transition-all text-left flex flex-col
                          ${getActivityIntensity(dayData?.totalCount || 0)}
                          ${!isCurrentMonth ? 'opacity-40' : ''}
                          ${isSelected ? 'ring-2 ring-primary-500' : ''}
                          ${isToday ? 'ring-2 ring-yellow-500/50' : ''}
                          hover:ring-2 hover:ring-slate-500
                        `}
                      >
                        {/* Date Number */}
                        <span
                          className={`
                            text-sm font-medium mb-1
                            ${isToday ? 'text-yellow-400' : isCurrentMonth ? 'text-white' : 'text-slate-500'}
                          `}
                        >
                          {format(day, 'd')}
                        </span>

                        {/* Activity Indicators */}
                        {dayData && dayData.totalCount > 0 && (
                          <div className="flex-1 flex flex-col justify-end">
                            {/* Source Dots */}
                            <div className="flex gap-1 mb-1">
                              {Object.entries(dayData.bySource).map(([source, count]) => (
                                <div
                                  key={source}
                                  className={`w-2 h-2 rounded-full ${sourceColors[source] || 'bg-slate-500'}`}
                                  title={`${source}: ${count}`}
                                />
                              ))}
                            </div>

                            {/* Count Badge */}
                            <span className="text-xs text-slate-300">
                              {dayData.totalCount} {dayData.totalCount === 1 ? 'activity' : 'activities'}
                            </span>

                            {/* Duration if significant */}
                            {dayData.totalDuration > 60 && (
                              <span className="text-xs text-slate-400">
                                {formatDuration(dayData.totalDuration)}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-slate-400">Sources:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-slate-300">Desktop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-slate-300">Browser</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-slate-300">Mobile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Day Detail Panel */}
          {selectedDay && (
            <div className="lg:w-1/3 min-w-[320px]">
              <div className="card sticky top-8">
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {format(selectedDay, 'EEEE')}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {format(selectedDay, 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {selectedDayData && selectedDayData.totalCount > 0 ? (
                  <>
                    {/* Day Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">
                          {selectedDayData.totalCount}
                        </p>
                        <p className="text-xs text-slate-400">Activities</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">
                          {formatDuration(selectedDayData.totalDuration)}
                        </p>
                        <p className="text-xs text-slate-400">Tracked Time</p>
                      </div>
                      {selectedDayData.keystrokeCount > 0 && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-white">
                            {selectedDayData.keystrokeCount.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400">Keystrokes</p>
                        </div>
                      )}
                      {selectedDayData.wordsTyped > 0 && (
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-white">
                            {selectedDayData.wordsTyped.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400">Words Typed</p>
                        </div>
                      )}
                    </div>

                    {/* Activity Breakdown by Type */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        By Activity Type
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(selectedDayData.byType)
                          .sort(([, a], [, b]) => b - a)
                          .map(([type, count]) => {
                            const Icon = typeIcons[type] || Activity
                            const percentage = Math.round(
                              (count / selectedDayData.totalCount) * 100
                            )
                            return (
                              <div key={type} className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded flex items-center justify-center ${
                                    typeColors[type] || 'bg-slate-600'
                                  }`}
                                >
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300">
                                      {type.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span className="text-slate-400">
                                      {count} ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-slate-700 rounded-full mt-1">
                                    <div
                                      className={`h-full rounded-full ${
                                        typeColors[type] || 'bg-slate-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    {/* Activity Breakdown by Source */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        By Source
                      </h4>
                      <div className="flex gap-2">
                        {Object.entries(selectedDayData.bySource).map(
                          ([source, count]) => {
                            const percentage = Math.round(
                              (count / selectedDayData.totalCount) * 100
                            )
                            return (
                              <div
                                key={source}
                                className="flex-1 bg-slate-700/50 rounded-lg p-3 text-center"
                              >
                                <div
                                  className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                                    sourceColors[source] || 'bg-slate-500'
                                  }`}
                                />
                                <p className="text-lg font-bold text-white">{count}</p>
                                <p className="text-xs text-slate-400">{source}</p>
                                <p className="text-xs text-slate-500">{percentage}%</p>
                              </div>
                            )
                          }
                        )}
                      </div>
                    </div>

                    {/* Recent Activities List */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Activity Timeline
                      </h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {selectedDayData.activities
                          .sort(
                            (a, b) =>
                              new Date(b.timestamp).getTime() -
                              new Date(a.timestamp).getTime()
                          )
                          .slice(0, 50)
                          .map((activity: any) => {
                            const type =
                              typeof activity.type === 'string'
                                ? activity.type
                                : activityTypes[activity.type] || 'Unknown'
                            const source =
                              typeof activity.source === 'string'
                                ? activity.source
                                : ['Desktop', 'Browser', 'Mobile'][activity.source] ||
                                  'Unknown'
                            const Icon = typeIcons[type] || Activity

                            return (
                              <div
                                key={activity.id}
                                className="flex items-start gap-3 p-2 bg-slate-700/30 rounded-lg"
                              >
                                <div
                                  className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                                    typeColors[type] || 'bg-slate-600'
                                  }`}
                                >
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white font-medium">
                                      {type.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        sourceColors[source] || 'bg-slate-500'
                                      }`}
                                    />
                                  </div>
                                  <p className="text-xs text-slate-400 truncate">
                                    {activity.data?.appName ||
                                      activity.data?.url ||
                                      activity.data?.title ||
                                      (type === 'InputActivity' &&
                                      activity.data?.wordsTyped
                                        ? `${activity.data.wordsTyped} words typed`
                                        : null) ||
                                      ''}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {format(new Date(activity.timestamp), 'HH:mm:ss')}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        {selectedDayData.activities.length > 50 && (
                          <p className="text-xs text-slate-500 text-center py-2">
                            + {selectedDayData.activities.length - 50} more activities
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No activities recorded</p>
                    <p className="text-sm text-slate-500 mt-1">
                      This day has no tracked activity
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activities.length.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Total Activities</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activities.filter(
                    (a: any) => a.source === 'Desktop' || a.source === 0
                  ).length.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Desktop</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activities.filter(
                    (a: any) => a.source === 'Browser' || a.source === 1
                  ).length.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Browser</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activities.filter(
                    (a: any) => a.source === 'Mobile' || a.source === 2
                  ).length.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400">Mobile</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
