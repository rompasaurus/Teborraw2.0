import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import {
  Mic,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react'
import { audioApi } from '@/services/api'
import { Layout } from '@/components/Layout'
import { AudioRecordingCard } from '@/components/audio'

type TranscriptionStatusFilter = 'all' | 'Pending' | 'Processing' | 'Completed' | 'Failed'

export function Audio() {
  const [dateRange, setDateRange] = useState<string>('week')
  const [statusFilter, setStatusFilter] = useState<TranscriptionStatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

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

  const { data, isLoading } = useQuery({
    queryKey: ['audio-recordings', startDate, endDate, statusFilter, page, pageSize],
    queryFn: () =>
      audioApi.list({
        startDate,
        endDate,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        pageSize,
      }),
  })

  const recordings = data?.data?.items ?? []
  const totalCount = data?.data?.totalCount ?? 0
  const totalPages = data?.data?.totalPages ?? 1

  // Filter by search query (client-side for transcript search)
  const filteredRecordings = useMemo(() => {
    if (!searchQuery.trim()) return recordings

    const query = searchQuery.toLowerCase()
    return recordings.filter((recording: any) => {
      return (
        recording.transcript?.toLowerCase().includes(query) ||
        format(new Date(recording.recordedAt), 'MMM d, yyyy h:mm a')
          .toLowerCase()
          .includes(query)
      )
    })
  }, [recordings, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const total = recordings.length
    const completed = recordings.filter((r: any) => r.transcriptionStatus === 'Completed').length
    const pending = recordings.filter((r: any) => r.transcriptionStatus === 'Pending').length
    const processing = recordings.filter((r: any) => r.transcriptionStatus === 'Processing').length
    const failed = recordings.filter((r: any) => r.transcriptionStatus === 'Failed').length
    const totalDuration = recordings.reduce((sum: number, r: any) => sum + (r.durationSeconds || 0), 0)

    return { total, completed, pending, processing, failed, totalDuration }
  }, [recordings])

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Audio Recordings</h1>
            <p className="text-slate-400 mt-1">
              Review and search your recorded audio transcripts
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6 flex-shrink-0">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Mic className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalCount}</p>
                <p className="text-sm text-slate-400">Total</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-sm text-slate-400">Transcribed</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Loader className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats.pending + stats.processing}
                </p>
                <p className="text-sm text-slate-400">Processing</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.failed}</p>
                <p className="text-sm text-slate-400">Failed</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatTotalDuration(stats.totalDuration)}
                </p>
                <p className="text-sm text-slate-400">Total Duration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value)
                  setPage(1)
                }}
                className="input"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(['all', 'Completed', 'Pending', 'Processing', 'Failed'] as const).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      statusFilter === status
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {status === 'all' ? 'All Status' : status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Recordings List */}
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <Loader className="w-8 h-8 mx-auto mb-4 animate-spin" />
              Loading recordings...
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="text-center py-12">
              <Mic className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No audio recordings found</p>
              <p className="text-sm text-slate-500 mt-1">
                {recordings.length === 0
                  ? 'Enable audio recording in the mobile app to start capturing'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {filteredRecordings.map((recording: any) => (
                <AudioRecordingCard
                  key={recording.id}
                  id={recording.id}
                  recordedAt={recording.recordedAt}
                  durationSeconds={recording.durationSeconds}
                  transcript={recording.transcript}
                  transcriptionStatus={recording.transcriptionStatus}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-700 flex-shrink-0">
            <span className="text-sm text-slate-400">
              Showing {(page - 1) * pageSize + 1} -{' '}
              {Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
