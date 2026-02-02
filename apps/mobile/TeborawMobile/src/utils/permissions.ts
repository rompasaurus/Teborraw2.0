import { Platform, Alert, Linking } from 'react-native'
import {
  request,
  check,
  PERMISSIONS,
  RESULTS,
  openSettings,
  Permission,
} from 'react-native-permissions'

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited'

/**
 * Check and request location permission
 * Returns true if permission is granted (either "always" or "when in use")
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission

  const result = await check(permission)
  return mapPermissionResult(result)
}

/**
 * Request foreground location permission first (required before background on Android 10+)
 */
export async function requestForegroundLocationPermission(): Promise<PermissionStatus> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
    android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  }) as Permission

  const result = await request(permission)
  return mapPermissionResult(result)
}

/**
 * Request background location permission (requires foreground permission first)
 */
export async function requestBackgroundLocationPermission(): Promise<PermissionStatus> {
  // First ensure foreground permission is granted
  const foregroundStatus = await requestForegroundLocationPermission()
  if (foregroundStatus !== 'granted') {
    return foregroundStatus
  }

  // On iOS, request "Always" permission
  // On Android 10+, request background location separately
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.LOCATION_ALWAYS)
    return mapPermissionResult(result)
  }

  if (Platform.OS === 'android' && Platform.Version >= 29) {
    const result = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
    return mapPermissionResult(result)
  }

  // On Android < 10, foreground permission includes background
  return 'granted'
}

/**
 * Full location permission request flow with user dialogs
 */
export async function requestLocationPermissionWithDialog(): Promise<boolean> {
  // Check current status
  const currentStatus = await checkLocationPermission()

  if (currentStatus === 'granted') {
    return true
  }

  if (currentStatus === 'blocked') {
    // Permission was permanently denied, show settings dialog
    return new Promise((resolve) => {
      Alert.alert(
        'Location Permission Required',
        'Teboraw needs location access to track your activities. Please enable location permission in Settings.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              await openSettings()
              // Check again after returning from settings
              const newStatus = await checkLocationPermission()
              resolve(newStatus === 'granted')
            },
          },
        ]
      )
    })
  }

  // Show explanation before requesting
  return new Promise((resolve) => {
    Alert.alert(
      'Enable Location Tracking',
      'Teboraw needs access to your location to track your activities and show them on the map.\n\nFor best results, select "Allow Always" when prompted.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Continue',
          onPress: async () => {
            const status = await requestBackgroundLocationPermission()
            resolve(status === 'granted')
          },
        },
      ]
    )
  })
}

/**
 * Check if background location is specifically granted (iOS Always / Android Background)
 */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const result = await check(PERMISSIONS.IOS.LOCATION_ALWAYS)
    return result === RESULTS.GRANTED
  }

  if (Platform.OS === 'android') {
    // On Android < 10, fine location includes background
    if (Platform.Version < 29) {
      const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
      return result === RESULTS.GRANTED
    }

    // On Android 10+, check background location separately
    const result = await check(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
    return result === RESULTS.GRANTED
  }

  return false
}

function mapPermissionResult(result: string): PermissionStatus {
  switch (result) {
    case RESULTS.GRANTED:
      return 'granted'
    case RESULTS.DENIED:
      return 'denied'
    case RESULTS.BLOCKED:
      return 'blocked'
    case RESULTS.UNAVAILABLE:
      return 'unavailable'
    case RESULTS.LIMITED:
      return 'limited'
    default:
      return 'denied'
  }
}
