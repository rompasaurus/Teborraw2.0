import { useCallback, useRef, useEffect, useState } from 'react'
import Editor, { OnMount, OnChange, BeforeMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface ThoughtsEditorProps {
  onContentChange?: (content: string) => void
}

// Hook to detect mobile screen size
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

const getEditorOptions = (isMobile: boolean): editor.IStandaloneEditorConstructionOptions => ({
  minimap: { enabled: !isMobile },
  wordWrap: 'on',
  fontSize: isMobile ? 16 : 14, // Larger font on mobile for readability
  lineNumbers: isMobile ? 'off' : 'on',
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: { top: isMobile ? 12 : 16, bottom: isMobile ? 12 : 16 },
  renderLineHighlight: isMobile ? 'none' : 'all',
  cursorBlinking: 'smooth',
  smoothScrolling: true,
  glyphMargin: !isMobile,
  folding: !isMobile,
  lineDecorationsWidth: isMobile ? 0 : 10,
  lineNumbersMinChars: isMobile ? 0 : 3,
})

export function ThoughtsEditor({ onContentChange }: ThoughtsEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const isMobile = useIsMobile()
  const { draftContent, setDraftContent, currentTopic, setEditorInstance } =
    useThoughtsEditorStore()

  // Update editor options when screen size changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions(getEditorOptions(isMobile))
    }
  }, [isMobile])

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
        options={getEditorOptions(isMobile)}
        loading={
          <div id="thoughts-editor-loading" className="flex items-center justify-center h-full text-slate-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
