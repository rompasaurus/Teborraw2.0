import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Thought, Topic, TopicTreeElement } from '@/types/journal'

interface ThoughtsEditorState {
  // Current thought being edited
  currentThought: Thought | null
  currentThoughtId: string | null

  // Parsed topics from current thought content
  topicTree: TopicTreeElement[]
  currentTopic: Topic | null

  // Draft state for auto-save
  draftContent: string
  isDirty: boolean
  lastSavedAt: Date | null

  // UI state
  selectedTopicPath: string | null

  // Actions
  setCurrentThought: (thought: Thought | null) => void
  setDraftContent: (content: string) => void
  setTopicTree: (tree: TopicTreeElement[]) => void
  selectTopic: (path: string | null, topic: Topic | null) => void
  markSaved: () => void
  markDirty: () => void
  createNewThought: () => void
  reset: () => void
}

const DEFAULT_CONTENT = 'Untitled Thought:\n    '

export const useThoughtsEditorStore = create<ThoughtsEditorState>()(
  persist(
    (set) => ({
      // Initial state
      currentThought: null,
      currentThoughtId: null,
      topicTree: [],
      currentTopic: null,
      draftContent: '',
      isDirty: false,
      lastSavedAt: null,
      selectedTopicPath: null,

      // Actions
      setCurrentThought: (thought) =>
        set({
          currentThought: thought,
          currentThoughtId: thought?.id ?? null,
          draftContent: thought?.content ?? '',
          isDirty: false,
          lastSavedAt: thought ? new Date() : null,
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
          draftContent: '',
          isDirty: false,
          lastSavedAt: null,
          selectedTopicPath: null,
        }),
    }),
    {
      name: 'teboraw-thoughts-editor',
      partialize: (state) => ({
        // Only persist draft content and current thought ID for recovery
        currentThoughtId: state.currentThoughtId,
        draftContent: state.draftContent,
        isDirty: state.isDirty,
      }),
    }
  )
)
