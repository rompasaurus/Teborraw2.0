import { useCallback, useRef, useEffect } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsEditorProps {
  onContentChange?: (content: string) => void
}

const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  theme: 'vs-dark',
  minimap: { enabled: true },
  wordWrap: 'on',
  fontSize: 14,
  lineNumbers: 'on',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: 'all',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
}

export function ThoughtsEditor({ onContentChange }: ThoughtsEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { draftContent, setDraftContent, currentTopic } =
    useThoughtsEditorStore()

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    editor.focus()
  }, [])

  const handleChange: OnChange = useCallback(
    (value) => {
      const content = value ?? ''
      setDraftContent(content)
      onContentChange?.(content)
    },
    [setDraftContent, onContentChange]
  )

  // Scroll to line when topic is selected
  useEffect(() => {
    if (editorRef.current && currentTopic && currentTopic.lineNumber >= 0) {
      editorRef.current.revealLineInCenter(currentTopic.lineNumber + 1)
      editorRef.current.setPosition({
        lineNumber: currentTopic.lineNumber + 1,
        column: 1,
      })
      editorRef.current.focus()
    }
  }, [currentTopic])

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        value={draftContent}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={EDITOR_OPTIONS}
        loading={
          <div className="flex items-center justify-center h-full text-slate-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
