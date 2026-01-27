import { RotateCcw, Trash2 } from 'lucide-react'
import {
  HistoryEntry as HistoryEntryType,
  getRelativeTime,
  formatTimestamp,
} from '@/store/thoughtHistoryStore'

interface HistoryEntryProps {
  entry: HistoryEntryType
  isSelected: boolean
  onSelect: () => void
  onRestore: () => void
  onDelete: () => void
}

const TYPE_LABELS: Record<HistoryEntryType['changeType'], string> = {
  auto: 'Auto',
  save: 'Save',
  manual: 'Backup',
}

const TYPE_COLORS: Record<HistoryEntryType['changeType'], string> = {
  auto: 'bg-slate-600 text-slate-300',
  save: 'bg-green-700 text-green-200',
  manual: 'bg-blue-700 text-blue-200',
}

export function HistoryEntry({
  entry,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
}: HistoryEntryProps) {
  const preview = entry.content.slice(0, 80).replace(/\n/g, ' ')

  return (
    <div
      className={`p-3 cursor-pointer border-b border-slate-700 transition-colors ${
        isSelected ? 'bg-slate-700' : 'hover:bg-slate-750'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[entry.changeType]}`}
          >
            {TYPE_LABELS[entry.changeType]}
          </span>
          <span className="text-sm text-slate-400" title={formatTimestamp(entry.timestamp)}>
            {getRelativeTime(entry.timestamp)}
          </span>
        </div>
        {isSelected && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRestore()
              }}
              className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-600 rounded transition-colors"
              title="Restore this version"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
              title="Delete this entry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-300 truncate">{entry.title || 'Untitled'}</p>
      <p className="text-xs text-slate-500 truncate mt-1">{preview}...</p>
    </div>
  )
}
