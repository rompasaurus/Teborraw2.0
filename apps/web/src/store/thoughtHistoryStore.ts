import { create } from 'zustand'

export interface HistoryEntry {
  id: string
  timestamp: number
  content: string
  title: string
  changeType: 'auto' | 'save' | 'manual'
}

interface ThoughtHistoryState {
  currentThoughtHistory: HistoryEntry[]
  isHistoryPanelOpen: boolean
  selectedEntryId: string | null

  loadHistoryForThought: (thoughtId: string) => void
  addHistoryEntry: (
    thoughtId: string,
    content: string,
    title: string,
    changeType: HistoryEntry['changeType']
  ) => void
  deleteHistoryEntry: (thoughtId: string, entryId: string) => void
  clearHistoryForThought: (thoughtId: string) => void
  setHistoryPanelOpen: (isOpen: boolean) => void
  selectEntry: (entryId: string | null) => void
  getEntryContent: (entryId: string) => string | null
}

const STORAGE_KEY_PREFIX = 'teboraw-thought-history-'
const MAX_ENTRIES = 50
const MAX_AGE_DAYS = 30

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateContentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function getStorageKey(thoughtId: string): string {
  return `${STORAGE_KEY_PREFIX}${thoughtId}`
}

function loadFromStorage(thoughtId: string): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(getStorageKey(thoughtId))
    if (!stored) return []
    const entries = JSON.parse(stored) as HistoryEntry[]
    // Prune old entries on load
    const maxAge = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    return entries.filter((e) => e.timestamp > maxAge)
  } catch {
    return []
  }
}

function saveToStorage(thoughtId: string, entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(getStorageKey(thoughtId), JSON.stringify(entries))
  } catch {
    // Storage full - try removing oldest auto entries
    const filtered = entries
      .filter((e) => e.changeType !== 'auto')
      .slice(-MAX_ENTRIES / 2)
    try {
      localStorage.setItem(getStorageKey(thoughtId), JSON.stringify(filtered))
    } catch {
      // Give up silently
    }
  }
}

function pruneEntries(entries: HistoryEntry[]): HistoryEntry[] {
  if (entries.length <= MAX_ENTRIES) return entries

  // Sort by timestamp descending
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)

  // Keep all save/manual entries, fill rest with auto
  const saveManual = sorted.filter((e) => e.changeType !== 'auto')
  const auto = sorted.filter((e) => e.changeType === 'auto')

  const keepCount = MAX_ENTRIES - saveManual.length
  const keptAuto = auto.slice(0, Math.max(0, keepCount))

  return [...saveManual, ...keptAuto].sort((a, b) => b.timestamp - a.timestamp)
}

export const useThoughtHistoryStore = create<ThoughtHistoryState>((set, get) => ({
  currentThoughtHistory: [],
  isHistoryPanelOpen: false,
  selectedEntryId: null,

  loadHistoryForThought: (thoughtId) => {
    const entries = loadFromStorage(thoughtId)
    set({ currentThoughtHistory: entries, selectedEntryId: null })
  },

  addHistoryEntry: (thoughtId, content, title, changeType) => {
    const entries = loadFromStorage(thoughtId)

    // Check for duplicate content
    if (entries.length > 0) {
      const lastHash = generateContentHash(entries[0].content)
      const newHash = generateContentHash(content)
      if (lastHash === newHash) {
        return // Skip duplicate
      }
    }

    const newEntry: HistoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      content,
      title,
      changeType,
    }

    const updated = pruneEntries([newEntry, ...entries])
    saveToStorage(thoughtId, updated)

    // Update state if viewing this thought's history
    set({ currentThoughtHistory: updated })
  },

  deleteHistoryEntry: (thoughtId, entryId) => {
    const entries = loadFromStorage(thoughtId)
    const updated = entries.filter((e) => e.id !== entryId)
    saveToStorage(thoughtId, updated)
    set({ currentThoughtHistory: updated, selectedEntryId: null })
  },

  clearHistoryForThought: (thoughtId) => {
    localStorage.removeItem(getStorageKey(thoughtId))
    set({ currentThoughtHistory: [], selectedEntryId: null })
  },

  setHistoryPanelOpen: (isOpen) => {
    set({ isHistoryPanelOpen: isOpen })
  },

  selectEntry: (entryId) => {
    set({ selectedEntryId: entryId })
  },

  getEntryContent: (entryId) => {
    const { currentThoughtHistory } = get()
    const entry = currentThoughtHistory.find((e) => e.id === entryId)
    return entry?.content ?? null
  },
}))

export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function groupEntriesByDate(
  entries: HistoryEntry[]
): { date: string; entries: HistoryEntry[] }[] {
  const groups: Map<string, HistoryEntry[]> = new Map()

  for (const entry of entries) {
    const date = new Date(entry.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let dateKey: string
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday'
    } else {
      dateKey = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(entry)
  }

  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }))
}
