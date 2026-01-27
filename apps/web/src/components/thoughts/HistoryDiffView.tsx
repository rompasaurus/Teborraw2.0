import { useCallback } from 'react'
import { DiffEditor, BeforeMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface HistoryDiffViewProps {
  originalContent: string
  modifiedContent: string
  originalTitle?: string
  modifiedTitle?: string
}

const DIFF_OPTIONS: editor.IDiffEditorConstructionOptions = {
  readOnly: true,
  renderSideBySide: true,
  minimap: { enabled: false },
  wordWrap: 'on',
  wordWrapColumn: 80,
  wrappingStrategy: 'advanced',
  fontSize: 13,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  renderOverviewRuler: false,
  diffWordWrap: 'on',
  enableSplitViewResizing: true,
  useInlineViewWhenSpaceIsLimited: false,
}

export function HistoryDiffView({
  originalContent,
  modifiedContent,
  originalTitle = 'History Version',
  modifiedTitle = 'Current',
}: HistoryDiffViewProps) {
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('diff-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e293b',
        'diffEditor.insertedTextBackground': '#22c55e50',
        'diffEditor.removedTextBackground': '#ef444440',
        'diffEditor.insertedLineBackground': '#22c55e35',
        'diffEditor.removedLineBackground': '#ef444430',
        'diffEditorGutter.insertedLineBackground': '#22c55e60',
        'diffEditorGutter.removedLineBackground': '#ef444450',
      },
    })
  }, [])

  return (
    <div className="h-full flex flex-col bg-slate-800">
      {/* Header with labels */}
      <div className="flex border-b border-slate-700">
        <div className="flex-1 px-4 py-2 text-xs font-medium text-slate-400 border-r border-slate-700">
          {originalTitle}
        </div>
        <div className="flex-1 px-4 py-2 text-xs font-medium text-slate-400">
          {modifiedTitle}
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1">
        <DiffEditor
          height="100%"
          language="plaintext"
          original={originalContent}
          modified={modifiedContent}
          beforeMount={handleBeforeMount}
          theme="diff-theme"
          options={DIFF_OPTIONS}
          loading={
            <div className="flex items-center justify-center h-full text-slate-400">
              Loading diff...
            </div>
          }
        />
      </div>
    </div>
  )
}
