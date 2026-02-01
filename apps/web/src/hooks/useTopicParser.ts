import { useMemo, useCallback } from 'react'
import type { Topic, TopicTreeElement } from '@/types/journal'

/**
 * Calculates the number of indentation levels (tabs) from leading whitespace.
 * 4 spaces = 1 tab level
 */
function numberOfTabs(text: string): number {
  const leadingSpaces = text.length - text.trimStart().length
  return Math.floor(leadingSpaces / 4)
}

/**
 * Calculates the number of leading spaces
 */
function numberOfSpaces(text: string): number {
  return text.length - text.trimStart().length
}

/**
 * Parses content into a flat list of topics.
 * Lines ending with ':' become topics.
 * Title is handled separately - not part of the topic tree.
 */
export function parseTopicsFromContent(
  content: string,
  thoughtId?: string
): Topic[] {
  const topics: Topic[] = []
  const lines = content.split('\n')

  let currentTopic: Topic | null = null
  let lineCount = 0

  for (const line of lines) {
    const trimmedEnd = line.trimEnd()

    // Lines ending with ':' are topics
    if (trimmedEnd.endsWith(':')) {
      // Push previous topic if exists
      if (currentTopic) {
        topics.push(currentTopic)
      }

      currentTopic = {
        text: trimmedEnd.replace(/:$/, '').trim(),
        thoughtId,
        numberOfTabs: numberOfTabs(line),
        numberOfSpaces: numberOfSpaces(line),
        topicInformation: '',
        lineNumber: lineCount,
      }
    } else if (currentTopic) {
      // Non-topic lines become topic information (only if we have a current topic)
      const trimmedLine = line.trim()
      if (trimmedLine) {
        currentTopic.topicInformation +=
          (currentTopic.topicInformation ? ' ' : '') + trimmedLine
      }
    }

    lineCount++
  }

  // Push the last topic if exists
  if (currentTopic) {
    topics.push(currentTopic)
  }

  return topics
}

/**
 * Builds a hierarchical tree from a flat list of topics.
 * Uses indentation level to determine parent-child relationships.
 */
export function buildTopicTree(
  topics: Topic[],
  thoughtId?: string
): TopicTreeElement[] {
  const stack: { level: number; node: TopicTreeElement }[] = []
  const root: TopicTreeElement[] = []

  for (const topic of topics) {
    const level = topic.numberOfTabs
    const node: TopicTreeElement = {
      name: topic.text,
      content: [],
      topic,
      thoughtId,
    }

    // Pop nodes with same or higher level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    // Add to parent or root
    if (stack.length === 0) {
      root.push(node)
    } else {
      const parent = stack[stack.length - 1].node
      if (!parent.content) {
        parent.content = []
      }
      parent.content.push(node)
    }

    stack.push({ level, node })
  }

  return root
}

/**
 * Hook that provides topic parsing functionality.
 * Memoizes the parsed results for performance.
 */
export function useTopicParser(content: string, thoughtId?: string) {
  const topics = useMemo(
    () => parseTopicsFromContent(content, thoughtId),
    [content, thoughtId]
  )

  const tree = useMemo(
    () => buildTopicTree(topics, thoughtId),
    [topics, thoughtId]
  )

  const getTitle = useCallback(() => {
    const firstLine = content.split('\n')[0]?.trim() || 'Untitled'
    return firstLine.replace(/:$/, '').trim()
  }, [content])

  const getTopicAtLine = useCallback(
    (lineNumber: number): Topic | null => {
      // Find the topic that contains this line
      let lastTopic: Topic | null = null
      for (const topic of topics) {
        if (topic.lineNumber <= lineNumber) {
          lastTopic = topic
        } else {
          break
        }
      }
      return lastTopic
    },
    [topics]
  )

  return {
    topics,
    tree,
    getTitle,
    getTopicAtLine,
  }
}
