import { useEffect, useRef } from 'react'
import { useThoughtHistoryStore } from '@/store/thoughtHistoryStore'

const AUTO_SNAPSHOT_INTERVAL = 30000 // 30 seconds

export function useAutoSnapshot(
  thoughtId: string | null,
  content: string,
  title: string
): void {
  const lastHashRef = useRef<string>('')
  const addHistoryEntry = useThoughtHistoryStore((s) => s.addHistoryEntry)

  useEffect(() => {
    if (!thoughtId) {
      lastHashRef.current = ''
      return
    }

    const generateHash = (str: string): string => {
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
      }
      return hash.toString(36)
    }

    const checkAndSnapshot = () => {
      const currentHash = generateHash(content)
      if (currentHash !== lastHashRef.current && content.trim().length > 0) {
        addHistoryEntry(thoughtId, content, title, 'auto')
        lastHashRef.current = currentHash
      }
    }

    // Set initial hash without creating snapshot
    lastHashRef.current = generateHash(content)

    const intervalId = setInterval(checkAndSnapshot, AUTO_SNAPSHOT_INTERVAL)

    return () => {
      clearInterval(intervalId)
    }
  }, [thoughtId, content, title, addHistoryEntry])
}
