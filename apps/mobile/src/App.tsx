import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'react-native'
import { useAuthStore } from './store/authStore'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TrackingService } from './services/TrackingService'

const Stack = createNativeStackNavigator()

export default function App() {
  const { isAuthenticated, accessToken, loadStoredAuth } = useAuthStore()

  useEffect(() => {
    loadStoredAuth()
  }, [loadStoredAuth])

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      TrackingService.start()
    } else {
      TrackingService.stop()
    }

    return () => {
      TrackingService.stop()
    }
  }, [isAuthenticated, accessToken])

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#e2e8f0',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Teboraw' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
