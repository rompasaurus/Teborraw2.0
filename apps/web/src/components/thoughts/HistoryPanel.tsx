import { useState, useEffect } from 'react'
import { X, History, Trash2 } from 'lucide-react'
import {
  useThoughtHistoryStore,
  groupEntriesByDate,
} from '@/store/thoughtHistoryStore'
import { HistoryEntry } from './HistoryEntry'

interface HistoryPanelProps {
  thoughtId: string | null
  currentContent: string
  currentTitle: string
  onRestore: (content: string) => void
  onClose: () => void
}

export function HistoryPanel({
  thoughtId,
  currentContent,
  currentTitle,
  onRestore,
  onClose,
}: HistoryPanelProps) {
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const {
    currentThoughtHistory,
    selectedEntryId,
    loadHistoryForThought,
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistoryForThought,
    selectEntry,
    getEntryContent,
  } = useThoughtHistoryStore()

  useEffect(() => {
    if (thoughtId) {
      loadHistoryForThought(thoughtId)
    }
  }, [thoughtId, loadHistoryForThought])

  const handleRestore = (entryId: string) => {
    setShowRestoreConfirm(entryId)
  }

  const confirmRestore = () => {
    if (!showRestoreConfirm || !thoughtId) return

    // Create a backup of current content before restoring
    addHistoryEntry(thoughtId, currentContent, currentTitle, 'manual')

    const content = getEntryContent(showRestoreConfirm)
    if (content) {
      onRestore(content)
    }
    setShowRestoreConfirm(null)
  }

  const handleDelete = (entryId: string) => {
    if (thoughtId) {
      deleteHistoryEntry(thoughtId, entryId)
    }
  }

  const handleClearAll = () => {
    if (thoughtId) {
      clearHistoryForThought(thoughtId)
      setShowClearConfirm(false)
    }
  }

  const groupedEntries = groupEntriesByDate(currentThoughtHistory)
  const entryCount = currentThoughtHistory.length

  return (
    <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-medium text-white">History</h3>
          {entryCount > 0 && (
            <span className="text-xs text-slate-500">({entryCount})</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!thoughtId ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
            <History className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm text-center">Save your thought to start tracking history</p>
          </div>
        ) : entryCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
            <History className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm text-center">No history yet</p>
            <p className="text-xs text-center mt-1">Changes will be tracked automatically</p>
          </div>
        ) : (
          groupedEntries.map(({ date, entries }) => (
            <div key={date}>
              <div className="px-4 py-2 bg-slate-850 text-xs font-medium text-slate-500 sticky top-0">
                {date}
              </div>
              {entries.map((entry) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedEntryId === entry.id}
                  onSelect={() => selectEntry(entry.id)}
                  onRestore={() => handleRestore(entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {entryCount > 0 && (
        <div className="px-4 py-3 border-t border-slate-700">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear all history
          </button>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-2">Restore this version?</h3>
            <p className="text-slate-400 mb-6">
              Your current content will be backed up before restoring.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-2">Clear all history?</h3>
            <p className="text-slate-400 mb-6">
              This will permanently delete all history entries for this thought.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
