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
import { FileText, PlusCircle, Edit3, List, FolderTree, Hash } from 'lucide-react'

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

type MobileTab = 'editor' | 'topics' | 'thoughts' | 'recentTopics'
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
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor')
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
    draftTitle,
    draftContent,
    isDirty,
    currentTopic,
    setCurrentThought,
    setDraftContent,
    setTopicTree,
    createNewThought,
    markSaved,
    insertTextAtCursor,
  } = useThoughtsEditorStore()

  // Parse topics from content
  const { tree } = useTopicParser(
    draftContent,
    currentThoughtId ?? undefined
  )

  // Check if title is missing
  const isTitleMissing = !draftTitle.trim()

  // Auto-snapshot for history tracking
  useAutoSnapshot(currentThoughtId, draftContent, draftTitle)

  // Update topic tree when content changes
  useEffect(() => {
    setTopicTree(tree)
  }, [tree, setTopicTree])

  // Fetch thoughts list
  const { data: thoughtsData, isLoading: isLoadingList, isError: isListError } = useQuery({
    queryKey: ['thoughts'],
    queryFn: () => thoughtsApi.list({ pageSize: 50 }),
  })

  // Fetch latest thought on mount if no current thought
  const { data: latestData } = useQuery({
    queryKey: ['thoughts', 'latest'],
    queryFn: () => thoughtsApi.getLatest(),
    enabled: !currentThoughtId && !draftContent && !isDirty,
  })

  // Load latest thought on initial mount (not when creating a new thought)
  useEffect(() => {
    if (latestData?.data && !currentThoughtId && !draftContent && !isDirty) {
      setCurrentThought(latestData.data)
    }
  }, [latestData, currentThoughtId, draftContent, isDirty, setCurrentThought])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: ({ content, title }: { content: string; title: string }) =>
      thoughtsApi.create({
        content,
        title,
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
    mutationFn: ({ id, content, title }: { id: string; content: string; title: string }) =>
      thoughtsApi.update(id, {
        content,
        title,
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
      addHistoryEntry(currentThoughtId, draftContent, draftTitle, 'save')
      updateMutation.mutate({ id: currentThoughtId, content: draftContent, title: draftTitle })
    } else {
      createMutation.mutate({ content: draftContent, title: draftTitle })
    }
  }, [currentThoughtId, draftContent, draftTitle, addHistoryEntry, createMutation, updateMutation])

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

  // Mobile tab navigation items
  const mobileTabs = [
    { id: 'editor' as const, label: 'Editor', icon: Edit3 },
    { id: 'topics' as const, label: 'Topics', icon: FolderTree },
    { id: 'thoughts' as const, label: 'Thoughts', icon: List },
    { id: 'recentTopics' as const, label: 'Tags', icon: Hash },
  ]

  // Render mobile content based on active tab
  const renderMobileContent = () => {
    switch (mobileTab) {
      case 'editor':
        return (
          <div className="h-full flex flex-col">
            <ThoughtsToolbar
              onSave={handleSave}
              onNew={handleNew}
              onDelete={handleDelete}
              onShowTutorial={handleShowTutorial}
              onShowHistory={handleShowHistory}
              isSaving={isSaving}
              isDeleting={isDeleting}
              isTitleMissing={isTitleMissing}
              title={draftTitle}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              {thoughts.length === 0 && !currentThoughtId && !draftContent && !isDirty ? (
                <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 p-4">
                  <FileText className="w-12 h-12 mb-4 text-slate-400" />
                  <h2 className="text-lg font-semibold mb-2 text-center">Welcome to Thoughts</h2>
                  <p className="text-sm text-slate-500 mb-6 text-center">
                    Capture your ideas, notes, and reflections.
                  </p>
                  <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Create Your First Thought
                  </button>
                </div>
              ) : (
                <ThoughtsEditor onContentChange={handleContentChange} />
              )}
            </div>
          </div>
        )
      case 'topics':
        return (
          <div className="h-full bg-slate-800 overflow-auto">
            <TopicTree tree={tree} />
            <div className="border-t border-slate-700 mt-2 pt-2">
              <TopicDetails topic={currentTopic} />
            </div>
          </div>
        )
      case 'thoughts':
        return (
          <div className="h-full bg-slate-800 overflow-auto">
            <ThoughtsList
              thoughts={thoughts}
              isLoading={isLoadingList}
              isError={isListError}
              onSelect={(thought) => {
                handleSelectThought(thought)
                setMobileTab('editor')
              }}
              onNew={() => {
                handleNew()
                setMobileTab('editor')
              }}
            />
          </div>
        )
      case 'recentTopics':
        return (
          <div className="h-full bg-slate-800 overflow-auto">
            <RecentTopics
              thoughts={thoughts}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onTopicClick={(topicName) => {
                handleTopicClick(topicName)
                setMobileTab('editor')
              }}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Layout>
      {/* Tutorial Overlay */}
      <ThoughtsTutorial isOpen={showTutorial} onComplete={handleTutorialComplete} />

      {/* History Panel Modal for Mobile */}
      {isMobile && isHistoryPanelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900">
          <HistoryPanel
            thoughtId={currentThoughtId}
            currentContent={draftContent}
            currentTitle={draftTitle}
            onRestore={(content) => {
              handleRestoreFromHistory(content)
              setMobileTab('editor')
            }}
            onClose={handleCloseHistory}
          />
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile ? (
        <div id="thoughts-page-mobile" className="h-full flex flex-col overflow-hidden">
          {/* Mobile Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderMobileContent()}
          </div>

          {/* Mobile Tab Bar */}
          <nav className="bg-slate-800 border-t border-slate-700 flex-shrink-0">
            <div className="flex">
              {mobileTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = mobileTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMobileTab(tab.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors ${
                      isActive
                        ? 'text-primary-400 bg-slate-700/50'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      ) : (
        /* Desktop Layout with Allotment */
        <div id="thoughts-page" className="h-screen -m-8">
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
                        isError={isListError}
                        onSelect={handleSelectThought}
                        onNew={handleNew}
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
                      isTitleMissing={isTitleMissing}
                      title={draftTitle}
                    />
                    <div id="thoughts-editor-container" className="flex-1 overflow-hidden">
                      {thoughts.length === 0 && !currentThoughtId && !draftContent && !isDirty ? (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600">
                          <FileText className="w-16 h-16 mb-4 text-slate-400" />
                          <h2 className="text-xl font-semibold mb-2">Welcome to Thoughts</h2>
                          <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
                            Capture your ideas, notes, and reflections. Click the button below to create your first thought.
                          </p>
                          <button
                            onClick={handleNew}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                          >
                            <PlusCircle className="w-5 h-5" />
                            Create Your First Thought
                          </button>
                        </div>
                      ) : (
                        <ThoughtsEditor onContentChange={handleContentChange} />
                      )}
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
                  currentTitle={draftTitle}
                  onRestore={handleRestoreFromHistory}
                  onClose={handleCloseHistory}
                />
              </Allotment.Pane>
            )}
          </Allotment>
        </div>
      )}
    </Layout>
  )
}
