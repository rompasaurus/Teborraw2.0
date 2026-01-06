import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Activity,
  Globe,
  MapPin,
  Mic,
  Monitor,
  Smartphone,
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
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => activitiesApi.list({ pageSize: 50 }),
  })

  const activities = data?.data?.items ?? []

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Timeline</h1>
            <p className="text-slate-400 mt-1">Your recent activity</p>
          </div>
          <div className="flex gap-2">
            <select className="input">
              <option>All Sources</option>
              <option>Desktop</option>
              <option>Browser</option>
              <option>Mobile</option>
            </select>
            <select className="input">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {activities.length}
                </p>
                <p className="text-sm text-slate-400">Activities</p>
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
                  {activities.filter((a) => a.source === 'Desktop').length}
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
                  {activities.filter((a) => a.source === 'Browser').length}
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
                  {activities.filter((a) => a.source === 'Mobile').length}
                </p>
                <p className="text-sm text-slate-400">Mobile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">
            Recent Activity
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No activities yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Install the desktop agent or browser extension to start tracking
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const SourceIcon =
                  sourceIcons[activity.source as keyof typeof sourceIcons] ||
                  Activity
                const TypeIcon =
                  typeIcons[activity.type as keyof typeof typeIcons] || Activity

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {activity.type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                          {activity.source}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {JSON.stringify(activity.data)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-slate-400">
                        {format(new Date(activity.timestamp), 'HH:mm')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(activity.timestamp), 'MMM d')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
