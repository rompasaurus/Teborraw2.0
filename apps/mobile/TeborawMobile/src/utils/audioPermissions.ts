import { Platform, Alert } from 'react-native'
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
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionStatus> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  }) as Permission

  const result = await check(permission)
  return mapPermissionResult(result)
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<PermissionStatus> {
  const permission = Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  }) as Permission

  const result = await request(permission)
  return mapPermissionResult(result)
}

/**
 * Full microphone permission request flow with user dialogs
 */
export async function requestMicrophonePermissionWithDialog(): Promise<boolean> {
  // Check current status
  const currentStatus = await checkMicrophonePermission()

  if (currentStatus === 'granted') {
    return true
  }

  if (currentStatus === 'blocked') {
    // Permission was permanently denied, show settings dialog
    return new Promise((resolve) => {
      Alert.alert(
        'Microphone Permission Required',
        'Teboraw needs microphone access to record audio for transcription. Please enable microphone permission in Settings.',
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
              const newStatus = await checkMicrophonePermission()
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
      'Enable Audio Recording',
      'Teboraw can record audio and transcribe it to help you remember conversations and meetings.\n\nYour recordings are stored securely on your own server.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Continue',
          onPress: async () => {
            const status = await requestMicrophonePermission()
            resolve(status === 'granted')
          },
        },
      ]
    )
  })
}

/**
 * Check if microphone permission is granted
 */
export async function hasMicrophonePermission(): Promise<boolean> {
  const status = await checkMicrophonePermission()
  return status === 'granted'
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
