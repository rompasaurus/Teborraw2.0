import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, FileText } from 'lucide-react'
import type { TopicTreeElement } from '@/types/journal'
import { useThoughtsEditorStore } from '@/store/thoughtsEditorStore'

interface TopicTreeNodeProps {
  node: TopicTreeElement
  level: number
  path: string
}

export function TopicTreeNode({ node, level, path }: TopicTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { selectedTopicPath, selectTopic } = useThoughtsEditorStore()
  const hasChildren = node.content && node.content.length > 0
  const isSelected = selectedTopicPath === path

  const handleClick = useCallback(() => {
    selectTopic(path, node.topic ?? null)
  }, [path, node.topic, selectTopic])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsExpanded(!isExpanded)
    },
    [isExpanded]
  )

  return (
    <div id={`topic-node-${path}`} className="select-none">
      <div
        id={`topic-node-row-${path}`}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-slate-700 rounded ${
          isSelected ? 'bg-slate-700 text-primary-400' : 'text-slate-300'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            id={`topic-node-toggle-${path}`}
            onClick={handleToggle}
            className="p-0.5 hover:bg-slate-600 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span id={`topic-node-label-${path}`} className="truncate text-sm">{node.name || 'Untitled'}</span>
      </div>

      {hasChildren && isExpanded && (
        <div id={`topic-node-children-${path}`}>
          {node.content!.map((child, index) => (
            <TopicTreeNode
              key={`${path}-${index}`}
              node={child}
              level={level + 1}
              path={`${path}-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
