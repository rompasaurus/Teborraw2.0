// Topic parsed from thought content
export interface Topic {
  text: string
  thoughtId?: string
  numberOfTabs: number
  numberOfSpaces: number
  topicInformation: string
  lineNumber: number
}

// Tree element for topic hierarchy
export interface TopicTreeElement {
  name: string
  content?: TopicTreeElement[]
  topic?: Topic
  thoughtId?: string
}

// Thought entity (extended from API)
export interface Thought {
  id: string
  title?: string
  content: string
  topicTree?: string // JSON serialized TopicTreeElement[]
  tags: string[]
  linkedActivityIds: string[]
  createdAt: string
  updatedAt: string
}

// Create request
export interface CreateThoughtRequest {
  title?: string
  content: string
  topicTree?: string
  tags?: string[]
  linkedActivityIds?: string[]
}

// Update request
export interface UpdateThoughtRequest {
  title?: string
  content?: string
  topicTree?: string
  tags?: string[]
  linkedActivityIds?: string[]
}

// Paginated response
export interface ThoughtsListResponse {
  items: Thought[]
  totalCount: number
  page: number
  pageSize: number
}
