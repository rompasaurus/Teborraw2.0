import { format } from 'date-fns'
import { FileText, Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import type { Thought } from '@/types/journal'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsListProps {
  thoughts: Thought[]
  isLoading?: boolean
  isError?: boolean
  onSelect: (thought: Thought) => void
  onNew?: () => void
}

export function ThoughtsList({
  thoughts,
  isLoading,
  isError,
  onSelect,
  onNew,
}: ThoughtsListProps) {
  const { currentThoughtId, isDirty } = useThoughtsEditorStore()

  const getTitle = (thought: Thought) => {
    if (thought.title) return thought.title
    const firstLine = thought.content.split('\n')[0]?.trim() || 'Untitled'
    return firstLine.replace(/:$/, '').trim()
  }

  const handleSelect = (thought: Thought) => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them?'
      )
      if (!confirmed) return
    }
    onSelect(thought)
  }

  if (isLoading) {
    return (
      <div id="thoughts-list-loading" className="h-full flex items-center justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div id="thoughts-list-error" className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
        <p className="text-sm text-center text-red-400">Failed to load thoughts</p>
        <p className="text-xs text-center mt-1">Please try again later</p>
      </div>
    )
  }

  if (thoughts.length === 0) {
    return (
      <div id="thoughts-list-empty" className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <FileText className="w-8 h-8 mb-2" />
        <p className="text-sm text-center font-medium text-slate-400">No thoughts yet</p>
        <p className="text-xs text-center mt-1 mb-3">Start capturing your ideas!</p>
        {onNew && (
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-md transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Thought
          </button>
        )}
      </div>
    )
  }

  return (
    <div id="thoughts-list" className="h-full overflow-auto">
      <div id="thoughts-list-header" className="px-3 sm:px-3 py-3 sm:py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700">
        Recent Thoughts
      </div>
      <div id="thoughts-list-items" className="divide-y divide-slate-700/50">
        {thoughts.map((thought) => {
          const isActive = thought.id === currentThoughtId
          return (
            <button
              key={thought.id}
              id={`thoughts-list-item-${thought.id}`}
              onClick={() => handleSelect(thought)}
              className={`w-full text-left px-3 py-3 sm:py-2 hover:bg-slate-700/50 active:bg-slate-700 transition-colors ${
                isActive ? 'bg-slate-700 border-l-2 border-primary-500' : ''
              }`}
            >
              <p
                className={`text-sm sm:text-sm truncate ${
                  isActive ? 'text-primary-400' : 'text-slate-300'
                }`}
              >
                {getTitle(thought)}
              </p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-0.5">
                {format(new Date(thought.updatedAt), 'MMM d, yyyy')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
