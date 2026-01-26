import { useEffect, useCallback } from 'react'
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
} from '@/components/thoughts'
import { thoughtsApi } from '@/services/api'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'
import { useTopicParser } from '@/hooks/useTopicParser'
import type { Thought } from '@/types/journal'

export function Thoughts() {
  const queryClient = useQueryClient()
  const {
    currentThoughtId,
    draftContent,
    currentTopic,
    setCurrentThought,
    setDraftContent,
    setTopicTree,
    createNewThought,
    markSaved,
  } = useThoughtsEditorStore()

  // Parse topics from content
  const { tree, getTitle } = useTopicParser(
    draftContent,
    currentThoughtId ?? undefined
  )

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

  const thoughts = thoughtsData?.data?.items ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSave = useCallback(() => {
    if (currentThoughtId) {
      updateMutation.mutate({ id: currentThoughtId, content: draftContent })
    } else {
      createMutation.mutate(draftContent)
    }
  }, [currentThoughtId, draftContent, createMutation, updateMutation])

  const handleNew = useCallback(() => {
    createNewThought()
  }, [createNewThought])

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

  return (
    <Layout>
      <div className="h-[calc(100vh-2rem)] -m-6">
        <Allotment>
          {/* Left Panel: Topic Tree + Thoughts List (20%) */}
          <Allotment.Pane preferredSize="20%" minSize={150} maxSize={400}>
            <div className="h-full bg-slate-800 border-r border-slate-700">
              <Allotment vertical>
                {/* Topic Tree */}
                <Allotment.Pane preferredSize="60%">
                  <TopicTree tree={tree} />
                </Allotment.Pane>
                {/* Thoughts List */}
                <Allotment.Pane>
                  <div className="h-full border-t border-slate-700">
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

          {/* Right Panel: Editor + Details (80%) */}
          <Allotment.Pane>
            <Allotment vertical>
              {/* Editor (75%) */}
              <Allotment.Pane preferredSize="75%">
                <div className="h-full flex flex-col">
                  <ThoughtsToolbar
                    onSave={handleSave}
                    onNew={handleNew}
                    isSaving={isSaving}
                    title={getTitle()}
                  />
                  <div className="flex-1 overflow-hidden">
                    <ThoughtsEditor onContentChange={handleContentChange} />
                  </div>
                </div>
              </Allotment.Pane>
              {/* Topic Details (25%) */}
              <Allotment.Pane preferredSize="25%" minSize={100}>
                <div className="h-full bg-slate-800 border-t border-slate-700">
                  <TopicDetails topic={currentTopic} />
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
    </Layout>
  )
}
