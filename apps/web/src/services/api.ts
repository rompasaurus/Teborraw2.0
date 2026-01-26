import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { refreshToken, updateTokens, logout } = useAuthStore.getState()

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data

          updateTokens(newAccessToken, newRefreshToken)
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

          return api(originalRequest)
        } catch {
          logout()
        }
      } else {
        logout()
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (email: string, password: string, displayName: string) =>
    api.post('/auth/register', { email, password, displayName }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () => api.get('/auth/me'),
}

// Activities API
export const activitiesApi = {
  list: (params?: {
    sources?: string[]
    types?: string[]
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) => api.get('/activities', { params }),

  get: (id: string) => api.get(`/activities/${id}`),

  create: (data: {
    type: string
    source: string
    timestamp?: string
    data?: Record<string, unknown>
  }) => api.post('/activities', data),

  delete: (id: string) => api.delete(`/activities/${id}`),

  sync: (data: {
    deviceId: string
    activities: Array<{
      type: string
      source: string
      timestamp?: string
      data?: Record<string, unknown>
    }>
    lastSyncTimestamp: string
  }) => api.post('/activities/sync', data),
}

// Thoughts API
export const thoughtsApi = {
  list: (params?: {
    page?: number
    pageSize?: number
    tag?: string
    search?: string
  }) => api.get('/thoughts', { params }),

  get: (id: string) => api.get(`/thoughts/${id}`),

  getLatest: () => api.get('/thoughts/latest'),

  create: (data: {
    content: string
    title?: string
    topicTree?: string
    tags?: string[]
    linkedActivityIds?: string[]
  }) => api.post('/thoughts', data),

  update: (
    id: string,
    data: {
      content?: string
      title?: string
      topicTree?: string
      tags?: string[]
      linkedActivityIds?: string[]
    }
  ) => api.put(`/thoughts/${id}`, data),

  delete: (id: string) => api.delete(`/thoughts/${id}`),

  getTags: () => api.get('/thoughts/tags'),
}
