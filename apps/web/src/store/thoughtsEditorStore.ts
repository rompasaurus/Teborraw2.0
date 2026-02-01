import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { editor } from 'monaco-editor'
import type { Thought, Topic, TopicTreeElement } from '@/types/journal'

interface ThoughtsEditorState {
  // Current thought being edited
  currentThought: Thought | null
  currentThoughtId: string | null

  // Parsed topics from current thought content
  topicTree: TopicTreeElement[]
  currentTopic: Topic | null

  // Draft state for auto-save
  draftTitle: string
  draftContent: string
  isDirty: boolean
  lastSavedAt: Date | null

  // UI state
  selectedTopicPath: string | null

  // Editor reference (not persisted)
  editorInstance: editor.IStandaloneCodeEditor | null

  // Actions
  setCurrentThought: (thought: Thought | null) => void
  setDraftTitle: (title: string) => void
  setDraftContent: (content: string) => void
  setTopicTree: (tree: TopicTreeElement[]) => void
  selectTopic: (path: string | null, topic: Topic | null) => void
  markSaved: () => void
  markDirty: () => void
  createNewThought: () => void
  reset: () => void
  setEditorInstance: (editor: editor.IStandaloneCodeEditor | null) => void
  insertTextAtCursor: (text: string) => void
}

const DEFAULT_TITLE = ''
const DEFAULT_CONTENT = ''

export const useThoughtsEditorStore = create<ThoughtsEditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentThought: null,
      currentThoughtId: null,
      topicTree: [],
      currentTopic: null,
      draftTitle: DEFAULT_TITLE,
      draftContent: '',
      isDirty: false,
      lastSavedAt: null,
      selectedTopicPath: null,
      editorInstance: null,

      // Actions
      setCurrentThought: (thought) =>
        set({
          currentThought: thought,
          currentThoughtId: thought?.id ?? null,
          draftTitle: thought?.title ?? '',
          draftContent: thought?.content ?? '',
          isDirty: false,
          lastSavedAt: thought ? new Date() : null,
        }),

      setDraftTitle: (title) =>
        set({
          draftTitle: title,
          isDirty: true,
        }),

      setDraftContent: (content) =>
        set({
          draftContent: content,
          isDirty: true,
        }),

      setTopicTree: (tree) =>
        set({
          topicTree: tree,
        }),

      selectTopic: (path, topic) =>
        set({
          selectedTopicPath: path,
          currentTopic: topic,
        }),

      markSaved: () =>
        set({
          isDirty: false,
          lastSavedAt: new Date(),
        }),

      markDirty: () =>
        set({
          isDirty: true,
        }),

      createNewThought: () =>
        set({
          currentThought: null,
          currentThoughtId: null,
          draftTitle: DEFAULT_TITLE,
          draftContent: DEFAULT_CONTENT,
          topicTree: [],
          currentTopic: null,
          isDirty: true,
          selectedTopicPath: null,
        }),

      reset: () =>
        set({
          currentThought: null,
          currentThoughtId: null,
          topicTree: [],
          currentTopic: null,
          draftTitle: '',
          draftContent: '',
          isDirty: false,
          lastSavedAt: null,
          selectedTopicPath: null,
        }),

      setEditorInstance: (editor) =>
        set({
          editorInstance: editor,
        }),

      insertTextAtCursor: (text) => {
        const { editorInstance } = get()
        if (!editorInstance) return

        const position = editorInstance.getPosition()
        if (!position) return

        // Insert the text as a topic line (with colon)
        const topicText = `${text}:\n    `

        editorInstance.executeEdits('insert-topic', [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: topicText,
          },
        ])

        // Move cursor to after the inserted text
        const newPosition = {
          lineNumber: position.lineNumber + 1,
          column: 5, // After the 4-space indent
        }
        editorInstance.setPosition(newPosition)
        editorInstance.focus()
      },
    }),
    {
      name: 'teboraw-thoughts-editor',
      partialize: (state) => ({
        // Only persist draft content and current thought ID for recovery
        // Don't persist isDirty - it should reset on page load so welcome page shows
        currentThoughtId: state.currentThoughtId,
        draftTitle: state.draftTitle,
        draftContent: state.draftContent,
      }),
    }
  )
)
