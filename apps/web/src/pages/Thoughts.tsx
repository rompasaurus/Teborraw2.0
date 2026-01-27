import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'

import { Layout } from '@/components/Layout'
import {
  ThoughtsEditor,
  TopicTree,
  ThoughtsToolbar,
  ThoughtsList,
  TopicDetails,
  RecentTopics,
  ThoughtsTutorial,
  useShouldShowTutorial,
  HistoryPanel,
  HistoryDiffView,
} from '@/components/thoughts'
import { thoughtsApi } from '@/services/api'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'
import { useTopicParser } from '@/hooks/useTopicParser'
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot'
import { useThoughtHistoryStore } from '@/store/thoughtHistoryStore'
import type { Thought } from '@/types/journal'

const TOPICS_SIDEBAR_COLLAPSED_KEY = 'teboraw-topics-sidebar-collapsed'

export function Thoughts() {
  const queryClient = useQueryClient()
  const shouldShowTutorial = useShouldShowTutorial()
  const [showTutorial, setShowTutorial] = useState(false)
  const [isTopicsSidebarCollapsed, setIsTopicsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(TOPICS_SIDEBAR_COLLAPSED_KEY)
    return saved === 'true'
  })
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false)
  const addHistoryEntry = useThoughtHistoryStore((s) => s.addHistoryEntry)
  const selectedEntryId = useThoughtHistoryStore((s) => s.selectedEntryId)
  const currentThoughtHistory = useThoughtHistoryStore((s) => s.currentThoughtHistory)
  const selectedEntry = currentThoughtHistory.find((e) => e.id === selectedEntryId)
  const {
    currentThoughtId,
    draftContent,
    currentTopic,
    setCurrentThought,
    setDraftContent,
    setTopicTree,
    createNewThought,
    markSaved,
    insertTextAtCursor,
  } = useThoughtsEditorStore()

  // Parse topics from content
  const { tree, getTitle } = useTopicParser(
    draftContent,
    currentThoughtId ?? undefined
  )

  // Auto-snapshot for history tracking
  useAutoSnapshot(currentThoughtId, draftContent, getTitle())

  // Update topic tree when content changes
  useEffect(() => {
    setTopicTree(tree)
  }, [tree, setTopicTree])

  // Fetch thoughts list
  const { data: thoughtsData, isLoading: isLoadingList } = useQuery({
    queryKey: ['thoughts'],
    queryFn: () => thoughtsApi.list({ pageSize: 50 }),
  })

  // Fetch latest thought on mount if no current thought
  const { data: latestData } = useQuery({
    queryKey: ['thoughts', 'latest'],
    queryFn: () => thoughtsApi.getLatest(),
    enabled: !currentThoughtId && !draftContent,
  })

  // Load latest thought on initial mount
  useEffect(() => {
    if (latestData?.data && !currentThoughtId && !draftContent) {
      setCurrentThought(latestData.data)
    }
  }, [latestData, currentThoughtId, draftContent, setCurrentThought])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (content: string) =>
      thoughtsApi.create({
        content,
        title: getTitle(),
        topicTree: JSON.stringify(tree),
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] })
      setCurrentThought(response.data)
      markSaved()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      thoughtsApi.update(id, {
        content,
        title: getTitle(),
        topicTree: JSON.stringify(tree),
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] })
      setCurrentThought(response.data)
      markSaved()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => thoughtsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thoughts'] })
      createNewThought()
    },
  })

  const thoughts = thoughtsData?.data?.items ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isDeleting = deleteMutation.isPending

  const handleSave = useCallback(() => {
    if (currentThoughtId) {
      // Add history entry on save
      addHistoryEntry(currentThoughtId, draftContent, getTitle(), 'save')
      updateMutation.mutate({ id: currentThoughtId, content: draftContent })
    } else {
      createMutation.mutate(draftContent)
    }
  }, [currentThoughtId, draftContent, getTitle, addHistoryEntry, createMutation, updateMutation])

  const handleNew = useCallback(() => {
    createNewThought()
    // Show tutorial for first-time users when creating a new thought
    if (shouldShowTutorial) {
      setShowTutorial(true)
    }
  }, [createNewThought, shouldShowTutorial])

  const handleDelete = useCallback(() => {
    if (currentThoughtId) {
      deleteMutation.mutate(currentThoughtId)
    }
  }, [currentThoughtId, deleteMutation])

  const handleSelectThought = useCallback(
    (thought: Thought) => {
      setCurrentThought(thought)
    },
    [setCurrentThought]
  )

  const handleContentChange = useCallback(
    (content: string) => {
      setDraftContent(content)
    },
    [setDraftContent]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNew()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleNew])

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false)
  }, [])

  const handleShowTutorial = useCallback(() => {
    setShowTutorial(true)
  }, [])

  const handleToggleTopicsSidebar = useCallback(() => {
    setIsTopicsSidebarCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem(TOPICS_SIDEBAR_COLLAPSED_KEY, String(newValue))
      return newValue
    })
  }, [])

  const handleTopicClick = useCallback(
    (topicName: string) => {
      insertTextAtCursor(topicName)
    },
    [insertTextAtCursor]
  )

  const handleShowHistory = useCallback(() => {
    setIsHistoryPanelOpen(true)
  }, [])

  const handleCloseHistory = useCallback(() => {
    setIsHistoryPanelOpen(false)
  }, [])

  const handleRestoreFromHistory = useCallback(
    (content: string) => {
      setDraftContent(content)
      setIsHistoryPanelOpen(false)
    },
    [setDraftContent]
  )

  return (
    <Layout>
      {/* Tutorial Overlay */}
      <ThoughtsTutorial isOpen={showTutorial} onComplete={handleTutorialComplete} />

      <div id="thoughts-page" className="h-[calc(100vh-2rem)] -m-6">
        <Allotment>
          {/* Left Panel: Topic Tree + Thoughts List (20%) */}
          <Allotment.Pane preferredSize="20%" minSize={150} maxSize={400}>
            <div id="thoughts-left-panel" className="h-full bg-slate-800 border-r border-slate-700">
              <Allotment vertical>
                {/* Topic Tree */}
                <Allotment.Pane preferredSize="60%">
                  <TopicTree tree={tree} />
                </Allotment.Pane>
                {/* Thoughts List */}
                <Allotment.Pane>
                  <div id="thoughts-list-panel" className="h-full border-t border-slate-700">
                    <ThoughtsList
                      thoughts={thoughts}
                      isLoading={isLoadingList}
                      onSelect={handleSelectThought}
                    />
                  </div>
                </Allotment.Pane>
              </Allotment>
            </div>
          </Allotment.Pane>

          {/* Center Panel: Editor + Details (65%) */}
          <Allotment.Pane>
            <Allotment vertical>
              {/* Editor (75%) */}
              <Allotment.Pane preferredSize="75%">
                <div id="thoughts-editor-panel" className="h-full flex flex-col">
                  <ThoughtsToolbar
                    onSave={handleSave}
                    onNew={handleNew}
                    onDelete={handleDelete}
                    onShowTutorial={handleShowTutorial}
                    onShowHistory={handleShowHistory}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    title={getTitle()}
                  />
                  <div id="thoughts-editor-container" className="flex-1 overflow-hidden">
                    <ThoughtsEditor onContentChange={handleContentChange} />
                  </div>
                </div>
              </Allotment.Pane>
              {/* Topic Details or Diff View (25%) */}
              <Allotment.Pane preferredSize="25%" minSize={100}>
                {isHistoryPanelOpen && selectedEntry ? (
                  <HistoryDiffView
                    originalContent={selectedEntry.content}
                    modifiedContent={draftContent}
                    originalTitle={`${selectedEntry.title} (${new Date(selectedEntry.timestamp).toLocaleString()})`}
                    modifiedTitle="Current"
                  />
                ) : (
                  <div id="thoughts-details-panel" className="h-full bg-slate-800 border-t border-slate-700">
                    <TopicDetails topic={currentTopic} />
                  </div>
                )}
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* Right Panel: Recent Topics (15% or collapsed) */}
          <Allotment.Pane
            preferredSize={isTopicsSidebarCollapsed ? 44 : '15%'}
            minSize={44}
            maxSize={isTopicsSidebarCollapsed ? 44 : 300}
          >
            <RecentTopics
              thoughts={thoughts}
              isCollapsed={isTopicsSidebarCollapsed}
              onToggleCollapse={handleToggleTopicsSidebar}
              onTopicClick={handleTopicClick}
            />
          </Allotment.Pane>

          {/* History Panel (conditional) */}
          {isHistoryPanelOpen && (
            <Allotment.Pane preferredSize="20%" minSize={250} maxSize={400}>
              <HistoryPanel
                thoughtId={currentThoughtId}
                currentContent={draftContent}
                currentTitle={getTitle()}
                onRestore={handleRestoreFromHistory}
                onClose={handleCloseHistory}
              />
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </Layout>
  )
}
