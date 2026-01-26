import { Info, Hash, AlignLeft } from 'lucide-react'
import type { Topic } from '@/types/journal'

interface TopicDetailsProps {
  topic: Topic | null
}

export function TopicDetails({ topic }: TopicDetailsProps) {
  if (!topic) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <Info className="w-8 h-8 mb-2" />
        <p className="text-sm text-center">Select a topic to view details</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="px-1 pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Topic Details
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">{topic.text}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Hash className="w-4 h-4" />
              <span className="text-xs">Line</span>
            </div>
            <p className="text-white font-medium">{topic.lineNumber + 1}</p>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <AlignLeft className="w-4 h-4" />
              <span className="text-xs">Indent Level</span>
            </div>
            <p className="text-white font-medium">
              {topic.numberOfTabs >= 0 ? topic.numberOfTabs : 'Root'}
            </p>
          </div>
        </div>

        {topic.topicInformation && topic.topicInformation !== 'Thought Title' && (
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">
              Content
            </div>
            <p className="text-sm text-slate-300 bg-slate-700/50 rounded-lg p-3">
              {topic.topicInformation}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
