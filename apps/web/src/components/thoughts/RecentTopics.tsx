import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Hash, TrendingUp, Clock } from 'lucide-react'
import type { Thought, TopicTreeElement } from '@/types/journal'

interface RecentTopicsProps {
  thoughts: Thought[]
  isCollapsed: boolean
  onToggleCollapse: () => void
  onTopicClick?: (topicName: string) => void
}

interface AggregatedTopic {
  name: string
  count: number
  lastUsedAt: Date
}

// Recursively extract all topic names from a topic tree
function extractTopicNames(elements: TopicTreeElement[]): string[] {
  const names: string[] = []
  for (const element of elements) {
    // Skip the root "Thought Title" element
    if (element.topic?.numberOfTabs !== -1) {
      names.push(element.name)
    }
    if (element.content) {
      names.push(...extractTopicNames(element.content))
    }
  }
  return names
}

// Aggregate topics from all thoughts
function aggregateTopics(thoughts: Thought[]): AggregatedTopic[] {
  const topicMap = new Map<string, { count: number; lastUsedAt: Date }>()

  for (const thought of thoughts) {
    if (!thought.topicTree) continue

    try {
      const tree: TopicTreeElement[] = JSON.parse(thought.topicTree)
      const topicNames = extractTopicNames(tree)
      const thoughtDate = new Date(thought.updatedAt)

      for (const name of topicNames) {
        const normalizedName = name.toLowerCase().trim()
        if (!normalizedName) continue

        const existing = topicMap.get(normalizedName)
        if (existing) {
          existing.count++
          if (thoughtDate > existing.lastUsedAt) {
            existing.lastUsedAt = thoughtDate
          }
        } else {
          topicMap.set(normalizedName, {
            count: 1,
            lastUsedAt: thoughtDate,
          })
        }
      }
    } catch {
      // Skip thoughts with invalid topicTree JSON
    }
  }

  return Array.from(topicMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }))
}

type SortMode = 'recent' | 'mostUsed'

export function RecentTopics({ thoughts, isCollapsed, onToggleCollapse, onTopicClick }: RecentTopicsProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recent')

  const aggregatedTopics = useMemo(() => aggregateTopics(thoughts), [thoughts])

  const sortedTopics = useMemo(() => {
    const sorted = [...aggregatedTopics]
    if (sortMode === 'recent') {
      sorted.sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
    } else {
      sorted.sort((a, b) => b.count - a.count)
    }
    return sorted
  }, [aggregatedTopics, sortMode])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (isCollapsed) {
    return (
      <div className="h-full bg-slate-800 border-l border-slate-700 flex flex-col">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Expand topics"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-slate-500 text-xs uppercase tracking-wider"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Topics
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <h3 className="text-sm font-medium text-white">Topics</h3>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Collapse"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sort Toggle */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setSortMode('recent')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
            sortMode === 'recent'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Recent
        </button>
        <button
          onClick={() => setSortMode('mostUsed')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors ${
            sortMode === 'mostUsed'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Most Used
        </button>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto">
        {sortedTopics.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            No topics yet. Add topics by ending lines with a colon (:) in your thoughts.
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {sortedTopics.map((topic) => (
              <li key={topic.name}>
                <button
                  onClick={() => onTopicClick?.(topic.name)}
                  className="w-full flex items-start gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-700 transition-colors group"
                >
                  <Hash className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-300 group-hover:text-white capitalize truncate block">
                      {topic.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {sortMode === 'recent'
                        ? formatDate(topic.lastUsedAt)
                        : `${topic.count} ${topic.count === 1 ? 'use' : 'uses'}`}
                    </span>
                  </div>
                  {sortMode === 'recent' && topic.count > 1 && (
                    <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                      {topic.count}
                    </span>
                  )}
                  {sortMode === 'mostUsed' && (
                    <span className="text-xs text-slate-500">
                      {formatDate(topic.lastUsedAt)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
