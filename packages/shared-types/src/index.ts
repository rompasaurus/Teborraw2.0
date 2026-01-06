// User and Authentication
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

// Activity Types
export type ActivitySource = 'desktop' | 'browser' | 'mobile';
export type ActivityType =
  | 'window_focus'
  | 'screenshot'
  | 'page_visit'
  | 'search'
  | 'tab_change'
  | 'location'
  | 'audio_recording'
  | 'thought'
  | 'idle_start'
  | 'idle_end';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  source: ActivitySource;
  timestamp: Date;
  data: Record<string, unknown>;
  createdAt: Date;
}

// Desktop Activity
export interface DesktopSession {
  id: string;
  activityId: string;
  appName: string;
  windowTitle: string;
  durationSeconds: number;
  startTime: Date;
  endTime?: Date;
}

export interface Screenshot {
  id: string;
  activityId: string;
  filePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  capturedAt: Date;
}

// Browser Activity
export interface PageVisit {
  id: string;
  activityId: string;
  url: string;
  title: string;
  domain: string;
  durationSeconds: number;
  visitedAt: Date;
}

export interface SearchQuery {
  id: string;
  activityId: string;
  query: string;
  engine: string;
  searchedAt: Date;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
  pinned: boolean;
}

// Mobile Activity
export interface LocationPoint {
  id: string;
  activityId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  recordedAt: Date;
}

export interface AudioRecording {
  id: string;
  activityId: string;
  filePath: string;
  durationSeconds: number;
  transcript?: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  recordedAt: Date;
}

// Journal / Thoughts
export interface Thought {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  linkedActivityIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface PaginatedRequest {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityFilter {
  sources?: ActivitySource[];
  types?: ActivityType[];
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export interface TimelineEntry {
  id: string;
  type: ActivityType;
  source: ActivitySource;
  timestamp: Date;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Sync Types
export interface SyncPayload {
  deviceId: string;
  activities: Activity[];
  lastSyncTimestamp: Date;
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  conflicts: SyncConflict[];
  serverTimestamp: Date;
}

export interface SyncConflict {
  localActivity: Activity;
  serverActivity: Activity;
  resolution: 'use_local' | 'use_server' | 'merge';
}

// Settings
export interface UserSettings {
  userId: string;
  tracking: TrackingSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
}

export interface TrackingSettings {
  desktopEnabled: boolean;
  browserEnabled: boolean;
  locationEnabled: boolean;
  audioEnabled: boolean;
  screenshotInterval: number; // seconds
  locationInterval: number; // seconds
  idleThreshold: number; // seconds before marking as idle
}

export interface PrivacySettings {
  excludedApps: string[];
  excludedDomains: string[];
  blurScreenshots: boolean;
  dataRetentionDays: number;
}

export interface NotificationSettings {
  dailySummary: boolean;
  weeklySummary: boolean;
  syncAlerts: boolean;
}

// API Endpoints Constants
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  ACTIVITIES: {
    LIST: '/api/activities',
    CREATE: '/api/activities',
    GET: (id: string) => `/api/activities/${id}`,
    DELETE: (id: string) => `/api/activities/${id}`,
    SYNC: '/api/activities/sync',
  },
  THOUGHTS: {
    LIST: '/api/thoughts',
    CREATE: '/api/thoughts',
    GET: (id: string) => `/api/thoughts/${id}`,
    UPDATE: (id: string) => `/api/thoughts/${id}`,
    DELETE: (id: string) => `/api/thoughts/${id}`,
  },
  TIMELINE: {
    GET: '/api/timeline',
  },
  SETTINGS: {
    GET: '/api/settings',
    UPDATE: '/api/settings',
  },
} as const;
