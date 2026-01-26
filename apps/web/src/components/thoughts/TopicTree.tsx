import { List } from 'lucide-react'
import type { TopicTreeElement } from '@/types/journal'
import { TopicTreeNode } from './TopicTreeNode'

interface TopicTreeProps {
  tree: TopicTreeElement[]
}

export function TopicTree({ tree }: TopicTreeProps) {
  if (tree.length === 0) {
    return (
      <div id="topic-tree-empty" className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <List className="w-8 h-8 mb-2" />
        <p className="text-sm text-center">
          Topics will appear here as you type.
        </p>
        <p className="text-xs text-slate-600 mt-1 text-center">
          End a line with ":" to create a topic
        </p>
      </div>
    )
  }

  return (
    <div id="topic-tree" className="h-full overflow-auto py-2">
      <div id="topic-tree-header" className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Topics
      </div>
      {tree.map((node, index) => (
        <TopicTreeNode
          key={`root-${index}`}
          node={node}
          level={0}
          path={`${index}`}
        />
      ))}
    </div>
  )
}
