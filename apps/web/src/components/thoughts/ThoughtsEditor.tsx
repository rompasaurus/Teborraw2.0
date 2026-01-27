import { useCallback, useRef, useEffect } from 'react'
import Editor, { OnMount, OnChange, BeforeMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsEditorProps {
  onContentChange?: (content: string) => void
}

const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
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
  const { draftContent, setDraftContent, currentTopic, setEditorInstance } =
    useThoughtsEditorStore()

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('thoughts-theme', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#d1d5dbab',
      },
    })
  }, [])

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    setEditorInstance(editor)
    editor.focus()
  }, [setEditorInstance])

  // Cleanup editor instance on unmount
  useEffect(() => {
    return () => {
      setEditorInstance(null)
    }
  }, [setEditorInstance])

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
    <div id="thoughts-editor-wrapper" className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        value={draftContent}
        onChange={handleChange}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        theme="thoughts-theme"
        options={EDITOR_OPTIONS}
        loading={
          <div id="thoughts-editor-loading" className="flex items-center justify-center h-full text-slate-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
