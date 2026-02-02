import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  email: string
  displayName: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  apiUrl: string
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>
  logout: () => Promise<void>
  setApiUrl: (url: string) => Promise<void>
  loadStoredAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  apiUrl: 'http://10.0.2.2:5000/api', // Android emulator localhost
  isAuthenticated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    await AsyncStorage.multiSet([
      ['user', JSON.stringify(user)],
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
    ])

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    })
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['user', 'accessToken', 'refreshToken'])

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  },

  setApiUrl: async (url) => {
    await AsyncStorage.setItem('apiUrl', url)
    set({ apiUrl: url })
  },

  loadStoredAuth: async () => {
    try {
      const [[, userStr], [, accessToken], [, refreshToken], [, apiUrl]] =
        await AsyncStorage.multiGet([
          'user',
          'accessToken',
          'refreshToken',
          'apiUrl',
        ])

      if (accessToken && userStr) {
        const user = JSON.parse(userStr)
        set({
          user,
          accessToken,
          refreshToken,
          apiUrl: apiUrl || get().apiUrl,
          isAuthenticated: true,
        })
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error)
    }
  },
}))
