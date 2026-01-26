import { format } from 'date-fns'
import { FileText, Loader2 } from 'lucide-react'
import type { Thought } from '@/types/journal'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsListProps {
  thoughts: Thought[]
  isLoading?: boolean
  onSelect: (thought: Thought) => void
}

export function ThoughtsList({
  thoughts,
  isLoading,
  onSelect,
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
      <div className="h-full flex items-center justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (thoughts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <FileText className="w-8 h-8 mb-2" />
        <p className="text-sm text-center">No thoughts yet</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-700">
        Recent Thoughts
      </div>
      <div className="divide-y divide-slate-700/50">
        {thoughts.map((thought) => {
          const isActive = thought.id === currentThoughtId
          return (
            <button
              key={thought.id}
              onClick={() => handleSelect(thought)}
              className={`w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors ${
                isActive ? 'bg-slate-700 border-l-2 border-primary-500' : ''
              }`}
            >
              <p
                className={`text-sm truncate ${
                  isActive ? 'text-primary-400' : 'text-slate-300'
                }`}
              >
                {getTitle(thought)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {format(new Date(thought.updatedAt), 'MMM d, yyyy')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
