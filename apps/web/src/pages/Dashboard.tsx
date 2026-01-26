import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  Activity,
  Globe,
  MapPin,
  Mic,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  FileText,
  Image as ImageIcon,
  Keyboard,
} from 'lucide-react'
import { activitiesApi } from '@/services/api'
import { Layout } from '@/components/Layout'

const sourceIcons = {
  Desktop: Monitor,
  Browser: Globe,
  Mobile: Smartphone,
}

const typeIcons = {
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

type SortField = 'timestamp' | 'type' | 'source'
type SortDirection = 'asc' | 'desc'

export function Dashboard() {
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return {
          startDate: startOfDay(now).toISOString(),
          endDate: endOfDay(now).toISOString(),
        }
      case 'week':
        return {
          startDate: startOfDay(subDays(now, 7)).toISOString(),
          endDate: endOfDay(now).toISOString(),
        }
      case 'month':
        return {
          startDate: startOfDay(subDays(now, 30)).toISOString(),
          endDate: endOfDay(now).toISOString(),
        }
      default:
        return { startDate: undefined, endDate: undefined }
    }
  }, [dateRange])

  const [pageSize, setPageSize] = useState(500)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activities', selectedSources, selectedTypes, startDate, endDate, pageSize],
    queryFn: () =>
      activitiesApi.list({
        pageSize,
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        startDate,
        endDate,
      }),
  })

  const activities = data?.data?.items ?? []

  // Client-side filtering and sorting
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = [...activities]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((activity) => {
        const activityType =
          typeof activity.type === 'string'
            ? activity.type
            : activityTypes[activity.type] || 'Unknown'
        const activitySource =
          typeof activity.source === 'string'
            ? activity.source
            : ['Desktop', 'Browser', 'Mobile'][activity.source] || 'Unknown'

        const dataString = JSON.stringify(activity.data || {}).toLowerCase()
        return (
          activityType.toLowerCase().includes(query) ||
          activitySource.toLowerCase().includes(query) ||
          dataString.includes(query)
        )
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      if (sortField === 'timestamp') {
        comparison =
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      } else if (sortField === 'type') {
        const typeA =
          typeof a.type === 'string' ? a.type : activityTypes[a.type] || ''
        const typeB =
          typeof b.type === 'string' ? b.type : activityTypes[b.type] || ''
        comparison = typeA.localeCompare(typeB)
      } else if (sortField === 'source') {
        const sourceA =
          typeof a.source === 'string'
            ? a.source
            : ['Desktop', 'Browser', 'Mobile'][a.source] || ''
        const sourceB =
          typeof b.source === 'string'
            ? b.source
            : ['Desktop', 'Browser', 'Mobile'][b.source] || ''
        comparison = sourceA.localeCompare(sourceB)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [activities, searchQuery, sortField, sortDirection])

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-500" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-primary-400" />
    ) : (
      <ArrowDown className="w-4 h-4 text-primary-400" />
    )
  }

  const toggleSourceFilter = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    )
  }

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const renderDetailedData = (data: any, activityType: string) => {
    if (!data) return null

    // Special rendering for different activity types
    if (activityType === 'WindowFocus' && data.appName) {
      // Check if input stats exist at top level or nested
      const hasInputStats = data.keystrokeCount !== undefined ||
                           data.wordsTyped !== undefined ||
                           data.inputStats

      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs text-slate-500">Application:</span>
            <p className="text-sm text-white">{data.appName}</p>
          </div>
          {data.windowTitle && (
            <div>
              <span className="text-xs text-slate-500">Window Title:</span>
              <p className="text-sm text-white">{data.windowTitle}</p>
            </div>
          )}
          {data.category && (
            <div>
              <span className="text-xs text-slate-500">Category:</span>
              <p className="text-sm text-white">{data.category}</p>
            </div>
          )}
          {data.durationSeconds !== undefined && (
            <div>
              <span className="text-xs text-slate-500">Duration:</span>
              <p className="text-sm text-white">{Math.round(data.durationSeconds)}s</p>
            </div>
          )}
          {hasInputStats && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Input Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {(data.keystrokeCount !== undefined || data.inputStats?.keystrokeCount !== undefined) && (
                  <div>
                    <span className="text-xs text-slate-500">Keystrokes:</span>
                    <p className="text-sm text-white font-semibold">
                      {data.keystrokeCount ?? data.inputStats?.keystrokeCount ?? 0}
                    </p>
                  </div>
                )}
                {(data.wordsTyped !== undefined || data.inputStats?.wordsTyped !== undefined) && (
                  <div>
                    <span className="text-xs text-slate-500">Words Typed:</span>
                    <p className="text-sm text-white font-semibold">
                      {data.wordsTyped ?? data.inputStats?.wordsTyped ?? 0}
                    </p>
                  </div>
                )}
                {(data.avgTypingSpeed !== undefined || data.inputStats?.avgTypingSpeed !== undefined) &&
                 (data.avgTypingSpeed > 0 || data.inputStats?.avgTypingSpeed > 0) && (
                  <div>
                    <span className="text-xs text-slate-500">Typing Speed:</span>
                    <p className="text-sm text-white">
                      {Math.round(data.avgTypingSpeed ?? data.inputStats?.avgTypingSpeed ?? 0)} WPM
                    </p>
                  </div>
                )}
                {(data.mouseClicks !== undefined || data.inputStats?.mouseClicks !== undefined) && (
                  <div>
                    <span className="text-xs text-slate-500">Mouse Clicks:</span>
                    <p className="text-sm text-white">
                      {data.mouseClicks ?? data.inputStats?.mouseClicks ?? 0}
                    </p>
                  </div>
                )}
              </div>
              {/* Clipboard Activity */}
              {((data.copyCount !== undefined && data.copyCount > 0) ||
                (data.pasteCount !== undefined && data.pasteCount > 0) ||
                (data.inputStats?.copyCount !== undefined && data.inputStats.copyCount > 0) ||
                (data.inputStats?.pasteCount !== undefined && data.inputStats.pasteCount > 0)) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs font-medium text-slate-400 mb-2">Clipboard Activity</p>
                  <div className="grid grid-cols-2 gap-2">
                    {((data.copyCount !== undefined && data.copyCount > 0) ||
                      (data.inputStats?.copyCount !== undefined && data.inputStats.copyCount > 0)) && (
                      <div>
                        <span className="text-xs text-slate-500">Copy Operations:</span>
                        <p className="text-sm text-white font-semibold">
                          {data.copyCount ?? data.inputStats?.copyCount ?? 0}
                        </p>
                      </div>
                    )}
                    {((data.pasteCount !== undefined && data.pasteCount > 0) ||
                      (data.inputStats?.pasteCount !== undefined && data.inputStats.pasteCount > 0)) && (
                      <div>
                        <span className="text-xs text-slate-500">Paste Operations:</span>
                        <p className="text-sm text-white font-semibold">
                          {data.pasteCount ?? data.inputStats?.pasteCount ?? 0}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Display captured text content */}
              {(data.textContent || data.inputStats?.textContent) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs font-medium text-slate-400 mb-2">Text Content</p>
                  <div className="bg-slate-900 p-3 rounded border border-slate-700 max-h-40 overflow-y-auto">
                    <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                      {data.textContent ?? data.inputStats?.textContent}
                    </p>
                  </div>
                </div>
              )}
              {/* Display clipboard history */}
              {(data.clipboardHistory && data.clipboardHistory.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs font-medium text-slate-400 mb-2">Clipboard History</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {data.clipboardHistory.map((item: any, idx: number) => (
                      <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${item.operation === 'copy' ? 'text-blue-400' : 'text-green-400'}`}>
                            {item.operation === 'copy' ? '📋 Copy' : '📌 Paste'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono truncate">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (activityType === 'PageVisit' && data.url) {
      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs text-slate-500">URL:</span>
            <p className="text-sm text-white break-all">{data.url}</p>
          </div>
          {data.title && (
            <div>
              <span className="text-xs text-slate-500">Page Title:</span>
              <p className="text-sm text-white">{data.title}</p>
            </div>
          )}
          {data.domain && (
            <div>
              <span className="text-xs text-slate-500">Domain:</span>
              <p className="text-sm text-white">{data.domain}</p>
            </div>
          )}
          {data.durationSeconds && (
            <div>
              <span className="text-xs text-slate-500">Duration:</span>
              <p className="text-sm text-white">{data.durationSeconds}s</p>
            </div>
          )}
          {/* Metadata */}
          {data.metadata && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Page Metadata</p>
              <div className="space-y-1">
                {data.metadata.description && (
                  <div>
                    <span className="text-xs text-slate-500">Description:</span>
                    <p className="text-xs text-slate-300">{data.metadata.description}</p>
                  </div>
                )}
                {data.metadata.author && (
                  <div>
                    <span className="text-xs text-slate-500">Author:</span>
                    <p className="text-xs text-slate-300">{data.metadata.author}</p>
                  </div>
                )}
                {data.metadata.keywords && (
                  <div>
                    <span className="text-xs text-slate-500">Keywords:</span>
                    <p className="text-xs text-slate-300">{data.metadata.keywords}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Main Content */}
          {data.mainContent && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">
                Page Content ({data.totalLength?.toLocaleString() || data.mainContent.length.toLocaleString()} characters)
              </p>
              <div className="bg-slate-900 p-3 rounded border border-slate-700 max-h-96 overflow-y-auto">
                <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                  {data.mainContent}
                </p>
              </div>
            </div>
          )}
          {/* Scroll Sections */}
          {data.sections && data.sections.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">
                Captured Sections ({data.sectionCount || data.sections.length})
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {data.sections.map((section: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">
                        Scroll Position: {section.scrollPosition}px
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(section.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-3">
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (activityType === 'Location' && data.latitude) {
      return (
        <div className="space-y-2">
          <div>
            <span className="text-xs text-slate-500">Coordinates:</span>
            <p className="text-sm text-white">
              {data.latitude}, {data.longitude}
            </p>
          </div>
          {data.accuracy && (
            <div>
              <span className="text-xs text-slate-500">Accuracy:</span>
              <p className="text-sm text-white">{data.accuracy}m</p>
            </div>
          )}
        </div>
      )
    }

    if (activityType === 'InputActivity') {
      return (
        <div className="space-y-3">
          {/* Keyboard Activity */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Keyboard Activity</p>
            <div className="grid grid-cols-2 gap-2">
              {data.keystrokeCount !== undefined && (
                <div>
                  <span className="text-xs text-slate-500">Total Keystrokes:</span>
                  <p className="text-sm text-white font-semibold">{data.keystrokeCount}</p>
                </div>
              )}
              {data.wordsTyped !== undefined && (
                <div>
                  <span className="text-xs text-slate-500">Words Typed:</span>
                  <p className="text-sm text-white font-semibold">{data.wordsTyped}</p>
                </div>
              )}
              {data.avgTypingSpeed !== undefined && data.avgTypingSpeed > 0 && (
                <div>
                  <span className="text-xs text-slate-500">Typing Speed:</span>
                  <p className="text-sm text-white">{Math.round(data.avgTypingSpeed)} WPM</p>
                </div>
              )}
            </div>
          </div>

          {/* Mouse Activity */}
          {(data.mouseClicks !== undefined || data.mouseDistance !== undefined) && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Mouse Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {data.mouseClicks !== undefined && (
                  <div>
                    <span className="text-xs text-slate-500">Total Clicks:</span>
                    <p className="text-sm text-white font-semibold">{data.mouseClicks}</p>
                  </div>
                )}
                {data.mouseClicksByButton && (
                  <>
                    <div>
                      <span className="text-xs text-slate-500">Left Clicks:</span>
                      <p className="text-sm text-white">{data.mouseClicksByButton.left || 0}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Right Clicks:</span>
                      <p className="text-sm text-white">{data.mouseClicksByButton.right || 0}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Middle Clicks:</span>
                      <p className="text-sm text-white">{data.mouseClicksByButton.middle || 0}</p>
                    </div>
                  </>
                )}
                {data.mouseDistance !== undefined && (
                  <div>
                    <span className="text-xs text-slate-500">Mouse Distance:</span>
                    <p className="text-sm text-white">{Math.round(data.mouseDistance).toLocaleString()} px</p>
                  </div>
                )}
                {data.scrollDistance !== undefined && data.scrollDistance > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Scroll Distance:</span>
                    <p className="text-sm text-white">{Math.round(data.scrollDistance).toLocaleString()} px</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modifier Keys Usage */}
          {data.modifierKeyUsage && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Modifier Keys Used</p>
              <div className="grid grid-cols-2 gap-2">
                {data.modifierKeyUsage.shift > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Shift:</span>
                    <p className="text-sm text-white">{data.modifierKeyUsage.shift}</p>
                  </div>
                )}
                {data.modifierKeyUsage.ctrl > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Ctrl:</span>
                    <p className="text-sm text-white">{data.modifierKeyUsage.ctrl}</p>
                  </div>
                )}
                {data.modifierKeyUsage.alt > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Alt:</span>
                    <p className="text-sm text-white">{data.modifierKeyUsage.alt}</p>
                  </div>
                )}
                {data.modifierKeyUsage.meta > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Cmd/Win:</span>
                    <p className="text-sm text-white">{data.modifierKeyUsage.meta}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Period Information */}
          {data.periodSeconds !== undefined && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Period</p>
              <div>
                <span className="text-xs text-slate-500">Duration:</span>
                <p className="text-sm text-white">{Math.round(data.periodSeconds)}s</p>
              </div>
            </div>
          )}

          {/* Clipboard Activity */}
          {((data.copyCount !== undefined && data.copyCount > 0) || (data.pasteCount !== undefined && data.pasteCount > 0)) && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Clipboard Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {data.copyCount !== undefined && data.copyCount > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Copy Operations:</span>
                    <p className="text-sm text-white font-semibold">{data.copyCount}</p>
                  </div>
                )}
                {data.pasteCount !== undefined && data.pasteCount > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Paste Operations:</span>
                    <p className="text-sm text-white font-semibold">{data.pasteCount}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Content */}
          {data.textContent && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Text Content</p>
              <div className="bg-slate-900 p-3 rounded border border-slate-700 max-h-60 overflow-y-auto">
                <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                  {data.textContent}
                </p>
              </div>
            </div>
          )}

          {/* Clipboard History */}
          {data.clipboardHistory && data.clipboardHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs font-medium text-slate-400 mb-2">Clipboard History</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.clipboardHistory.map((item: any, idx: number) => (
                  <div key={idx} className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${item.operation === 'copy' ? 'text-blue-400' : 'text-green-400'}`}>
                        {item.operation === 'copy' ? '📋 Copy' : '📌 Paste'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono truncate">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Default rendering for other types
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <span className="text-xs text-slate-500">{key}:</span>
            <p className="text-sm text-white break-all">
              {typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Layout>
      <div id="dashboard-page" className="max-w-7xl mx-auto">
        <div id="dashboard-header" className="flex items-center justify-between mb-8">
          <div>
            <h1 id="dashboard-title" className="text-3xl font-bold text-white">Timeline</h1>
            <p id="dashboard-subtitle" className="text-slate-400 mt-1">Your recent activity</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div id="dashboard-filters-card" className="card mb-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div id="dashboard-search-container" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="dashboard-search-input"
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Filters */}
            <div id="dashboard-filters" className="flex flex-wrap gap-4">
              {/* Date Range Filter */}
              <div id="dashboard-date-filter">
                <label id="dashboard-date-filter-label" className="text-xs text-slate-400 mb-1 block">
                  Date Range
                </label>
                <select
                  id="dashboard-date-range-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="input"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              {/* Source Filter */}
              <div id="dashboard-source-filter">
                <label id="dashboard-source-filter-label" className="text-xs text-slate-400 mb-1 block">
                  Sources
                </label>
                <div id="dashboard-source-filter-buttons" className="flex gap-2">
                  {['Desktop', 'Browser', 'Mobile'].map((source) => (
                    <button
                      key={source}
                      id={`dashboard-source-filter-${source.toLowerCase()}`}
                      onClick={() => toggleSourceFilter(source)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        selectedSources.includes(source)
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div id="dashboard-type-filter" className="flex-1">
                <label id="dashboard-type-filter-label" className="text-xs text-slate-400 mb-1 block">
                  Activity Types
                </label>
                <div id="dashboard-type-filter-buttons" className="flex flex-wrap gap-2">
                  {activityTypes.map((type) => (
                    <button
                      key={type}
                      id={`dashboard-type-filter-${type.toLowerCase()}`}
                      onClick={() => toggleTypeFilter(type)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedSources.length > 0 ||
              selectedTypes.length > 0 ||
              searchQuery ||
              dateRange !== 'all') && (
              <div id="dashboard-active-filters" className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Active filters:</span>
                {selectedSources.length > 0 && (
                  <span id="dashboard-active-sources-badge" className="px-2 py-1 bg-slate-700 rounded text-slate-300">
                    {selectedSources.length} sources
                  </span>
                )}
                {selectedTypes.length > 0 && (
                  <span id="dashboard-active-types-badge" className="px-2 py-1 bg-slate-700 rounded text-slate-300">
                    {selectedTypes.length} types
                  </span>
                )}
                {dateRange !== 'all' && (
                  <span id="dashboard-active-date-badge" className="px-2 py-1 bg-slate-700 rounded text-slate-300">
                    {dateRange}
                  </span>
                )}
                {searchQuery && (
                  <span id="dashboard-active-search-badge" className="px-2 py-1 bg-slate-700 rounded text-slate-300">
                    "{searchQuery}"
                  </span>
                )}
                <button
                  id="dashboard-clear-filters-btn"
                  onClick={() => {
                    setSelectedSources([])
                    setSelectedTypes([])
                    setDateRange('all')
                    setSearchQuery('')
                  }}
                  className="text-primary-400 hover:text-primary-300"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div id="dashboard-stats" className="grid grid-cols-4 gap-4 mb-6">
          <div id="dashboard-stats-total" className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p id="dashboard-stats-total-count" className="text-2xl font-bold text-white">
                  {filteredAndSortedActivities.length}
                </p>
                <p className="text-sm text-slate-400">Total</p>
              </div>
            </div>
          </div>
          <div id="dashboard-stats-desktop" className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p id="dashboard-stats-desktop-count" className="text-2xl font-bold text-white">
                  {
                    filteredAndSortedActivities.filter(
                      (a: any) => a.source === 'Desktop' || a.source === 0
                    ).length
                  }
                </p>
                <p className="text-sm text-slate-400">Desktop</p>
              </div>
            </div>
          </div>
          <div id="dashboard-stats-browser" className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p id="dashboard-stats-browser-count" className="text-2xl font-bold text-white">
                  {
                    filteredAndSortedActivities.filter(
                      (a: any) => a.source === 'Browser' || a.source === 1
                    ).length
                  }
                </p>
                <p className="text-sm text-slate-400">Browser</p>
              </div>
            </div>
          </div>
          <div id="dashboard-stats-mobile" className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p id="dashboard-stats-mobile-count" className="text-2xl font-bold text-white">
                  {
                    filteredAndSortedActivities.filter(
                      (a: any) => a.source === 'Mobile' || a.source === 2
                    ).length
                  }
                </p>
                <p className="text-sm text-slate-400">Mobile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <div id="dashboard-activity-card" className="card">
          <div id="dashboard-activity-header" className="mb-4 flex items-center justify-between">
            <h2 id="dashboard-activity-title" className="text-lg font-semibold text-white">
              Activity Timeline
            </h2>
            <div id="dashboard-activity-controls" className="flex items-center gap-4">
              <span id="dashboard-activity-count" className="text-sm text-slate-400">
                {filteredAndSortedActivities.length} of {data?.data?.totalCount ?? 0} activities
              </span>
              <select
                id="dashboard-page-size-select"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="input text-sm py-1"
              >
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1,000</option>
                <option value={2500}>2,500</option>
                <option value={5000}>5,000</option>
              </select>
              {isFetching && <span id="dashboard-loading-indicator" className="text-xs text-slate-500">Loading...</span>}
            </div>
          </div>

          {isLoading ? (
            <div id="dashboard-loading-message" className="text-center py-12 text-slate-400">
              Loading activities...
            </div>
          ) : filteredAndSortedActivities.length === 0 ? (
            <div id="dashboard-empty-state" className="text-center py-12">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No activities found</p>
              <p className="text-sm text-slate-500 mt-1">
                {activities.length === 0
                  ? 'Install the desktop agent or browser extension to start tracking'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div id="dashboard-table-container" className="overflow-x-auto">
              <table id="dashboard-activity-table" className="w-full">
                <thead id="dashboard-table-header">
                  <tr className="border-b border-slate-700">
                    <th id="dashboard-table-header-type" className="text-left py-3 px-4">
                      <button
                        id="dashboard-sort-type-btn"
                        onClick={() => toggleSort('type')}
                        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        Type
                        {getSortIcon('type')}
                      </button>
                    </th>
                    <th id="dashboard-table-header-source" className="text-left py-3 px-4">
                      <button
                        id="dashboard-sort-source-btn"
                        onClick={() => toggleSort('source')}
                        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        Source
                        {getSortIcon('source')}
                      </button>
                    </th>
                    <th id="dashboard-table-header-details" className="text-left py-3 px-4">
                      <span className="text-sm font-medium text-slate-400">
                        Details
                      </span>
                    </th>
                    <th id="dashboard-table-header-time" className="text-left py-3 px-4">
                      <button
                        id="dashboard-sort-time-btn"
                        onClick={() => toggleSort('timestamp')}
                        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                      >
                        Time
                        {getSortIcon('timestamp')}
                      </button>
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody id="dashboard-table-body">
                  {filteredAndSortedActivities.map((activity: any) => {
                    const activityType =
                      typeof activity.type === 'string'
                        ? activity.type
                        : activityTypes[activity.type] || 'Unknown'
                    const activitySource =
                      typeof activity.source === 'string'
                        ? activity.source
                        : ['Desktop', 'Browser', 'Mobile'][activity.source] ||
                          'Unknown'

                    const TypeIcon =
                      typeIcons[activityType as keyof typeof typeIcons] ||
                      Activity
                    const SourceIcon =
                      sourceIcons[activitySource as keyof typeof sourceIcons] ||
                      Activity
                    const isExpanded = expandedRows.has(activity.id)

                    return (
                      <>
                        <tr
                          key={activity.id}
                          id={`dashboard-activity-row-${activity.id}`}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                          onClick={() => toggleExpanded(activity.id)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <TypeIcon className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="text-sm text-white">
                                {activityType.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <SourceIcon className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-300">
                                {activitySource}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-slate-400 truncate max-w-md">
                              {activity.data?.appName ||
                                activity.data?.url ||
                                activity.data?.title ||
                                (activityType === 'InputActivity' && activity.data?.wordsTyped
                                  ? `${activity.data.wordsTyped} words typed, ${activity.data.keystrokeCount || 0} keystrokes`
                                  : null) ||
                                (activity.data?.inputStats?.wordsTyped
                                  ? `${activity.data.inputStats.wordsTyped} words typed`
                                  : null) ||
                                JSON.stringify(activity.data)}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm text-white">
                                {format(
                                  new Date(activity.timestamp),
                                  'MMM d, yyyy'
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {format(new Date(activity.timestamp), 'HH:mm:ss')}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${activity.id}-expanded`} id={`dashboard-activity-details-${activity.id}`}>
                            <td colSpan={5} className="bg-slate-800/50 p-4">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-medium text-white mb-3">
                                    Activity Details
                                  </h4>
                                  {renderDetailedData(
                                    activity.data,
                                    activityType
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-white mb-3">
                                    Metadata
                                  </h4>
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-xs text-slate-500">
                                        Activity ID:
                                      </span>
                                      <p className="text-sm text-slate-300 font-mono">
                                        {activity.id}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500">
                                        Created At:
                                      </span>
                                      <p className="text-sm text-slate-300">
                                        {format(
                                          new Date(activity.createdAt),
                                          'PPpp'
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500">
                                        Full Timestamp:
                                      </span>
                                      <p className="text-sm text-slate-300">
                                        {format(
                                          new Date(activity.timestamp),
                                          'PPpp'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
