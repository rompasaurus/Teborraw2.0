import { useState } from 'react'
import { format } from 'date-fns'
import {
  Mic,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { AudioPlayer } from './AudioPlayer'

interface AudioRecordingCardProps {
  id: string
  recordedAt: string
  durationSeconds: number
  transcript?: string | null
  transcriptionStatus: string
  showTranscript?: boolean
}

const statusConfig = {
  Pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Pending transcription',
    animate: false,
  },
  Processing: {
    icon: Loader,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Transcribing...',
    animate: true,
  },
  Completed: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    label: 'Transcribed',
    animate: false,
  },
  Failed: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'Transcription failed',
    animate: false,
  },
}

export function AudioRecordingCard({
  id,
  recordedAt,
  durationSeconds,
  transcript,
  transcriptionStatus,
  showTranscript = true,
}: AudioRecordingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const status = statusConfig[transcriptionStatus as keyof typeof statusConfig] || statusConfig.Pending
  const StatusIcon = status.icon

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) {
      return `${secs}s`
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                {format(new Date(recordedAt), 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-slate-400">
                {format(new Date(recordedAt), 'h:mm a')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              {formatDuration(durationSeconds)}
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.animate ? 'animate-spin' : ''}`} />
              {status.label}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer audioId={id} durationSeconds={durationSeconds} />
      </div>

      {/* Transcript Section */}
      {showTranscript && transcriptionStatus === 'Completed' && transcript && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Transcript</span>
              <span className="text-xs text-slate-500">
                ({transcript.split(' ').length} words)
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 border-t border-slate-700">
              <div className="mt-4 p-4 bg-slate-900 rounded-lg">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
