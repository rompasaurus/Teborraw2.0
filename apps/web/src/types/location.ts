export interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number
  speed?: number
  heading?: number
  recordedAt: string
  durationSeconds?: number
  activityId: string
}

export interface LocationCluster {
  latitude: number
  longitude: number
  pointCount: number
  earliestTimestamp: string
  latestTimestamp: string
  totalDurationSeconds: number
}

export interface LocationSummary {
  totalPoints: number
  daysTracked: number
  totalDistanceKm: number
  mostFrequentLocation?: LocationPoint
  firstRecordedAt?: string
  lastRecordedAt?: string
}

export interface HeatmapPoint {
  latitude: number
  longitude: number
  intensity: number
}

export interface LocationQueryParams {
  startDate?: string
  endDate?: string
  minLatitude?: number
  maxLatitude?: number
  minLongitude?: number
  maxLongitude?: number
  page?: number
  pageSize?: number
}

export interface LocationExportRequest {
  format: 'json' | 'gpx' | 'csv'
  startDate?: string
  endDate?: string
}
