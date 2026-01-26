import { Save, FilePlus, Loader2 } from 'lucide-react'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsToolbarProps {
  onSave: () => void
  onNew: () => void
  isSaving?: boolean
  title?: string
}

export function ThoughtsToolbar({
  onSave,
  onNew,
  isSaving,
  title,
}: ThoughtsToolbarProps) {
  const { isDirty, lastSavedAt } = useThoughtsEditorStore()

  const formatLastSaved = () => {
    if (!lastSavedAt) return null
    const date = new Date(lastSavedAt)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div id="thoughts-toolbar" className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
      <div id="thoughts-toolbar-left" className="flex items-center gap-4">
        <h2 id="thoughts-toolbar-title" className="text-lg font-medium text-white truncate max-w-md">
          {title || 'Untitled Thought'}
        </h2>
        {isDirty && (
          <span id="thoughts-toolbar-unsaved-indicator" className="text-xs text-amber-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            Unsaved changes
          </span>
        )}
        {!isDirty && lastSavedAt && (
          <span id="thoughts-toolbar-saved-indicator" className="text-xs text-slate-500">
            Last saved at {formatLastSaved()}
          </span>
        )}
      </div>

      <div id="thoughts-toolbar-actions" className="flex items-center gap-2">
        <button
          id="thoughts-new-btn"
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <FilePlus className="w-4 h-4" />
          New
        </button>
        <button
          id="thoughts-save-btn"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
