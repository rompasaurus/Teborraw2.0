import { systemPreferences, dialog, shell } from 'electron'
import os from 'os'
import { PermissionStatus } from './types'

export class PermissionsManager {
  private isMac(): boolean {
    return os.platform() === 'darwin'
  }

  private isWindows(): boolean {
    return os.platform() === 'win32'
  }

  // Check Accessibility permission (required for uiohook-napi on macOS)
  checkAccessibilityPermission(): boolean {
    if (!this.isMac()) return true // Windows/Linux don't need this
    return systemPreferences.isTrustedAccessibilityClient(false)
  }

  // Request Accessibility permission with user prompt
  async requestAccessibilityPermission(): Promise<boolean> {
    if (!this.isMac()) return true

    // Check first without prompting
    if (systemPreferences.isTrustedAccessibilityClient(false)) {
      return true
    }

    // Prompt user to enable in System Preferences
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Accessibility Permission Required',
      message: 'Teboraw needs Accessibility permission to track keyboard and mouse activity.',
      detail:
        'This is required for accurate activity tracking and idle detection.\n\nClick "Open Settings" to grant permission in System Settings > Privacy & Security > Accessibility.',
      buttons: ['Open Settings', 'Later'],
      defaultId: 0,
    })

    if (result.response === 0) {
      // Trigger the system prompt (this shows the app in the list)
      systemPreferences.isTrustedAccessibilityClient(true)
      // Open System Preferences to the Accessibility pane
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
      )
    }

    return false
  }

  // Check Screen Recording permission (for screenshots on macOS)
  checkScreenCapturePermission(): boolean {
    if (!this.isMac()) return true
    return systemPreferences.getMediaAccessStatus('screen') === 'granted'
  }

  // Request Screen Recording permission
  async requestScreenCapturePermission(): Promise<boolean> {
    if (!this.isMac()) return true

    const status = systemPreferences.getMediaAccessStatus('screen')
    if (status === 'granted') {
      return true
    }

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Screen Recording Permission Required',
      message: 'Teboraw needs Screen Recording permission to capture screenshots.',
      detail:
        'This allows automatic screenshot capture for activity tracking.\n\nClick "Open Settings" to grant permission in System Settings > Privacy & Security > Screen Recording.',
      buttons: ['Open Settings', 'Later'],
      defaultId: 0,
    })

    if (result.response === 0) {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      )
    }

    return false
  }

  // Get all permission statuses
  getPermissionStatus(): PermissionStatus {
    return {
      accessibility: this.checkAccessibilityPermission(),
      screenCapture: this.checkScreenCapturePermission(),
    }
  }

  // Request all required permissions
  async requestAllPermissions(): Promise<PermissionStatus> {
    const accessibility = await this.requestAccessibilityPermission()
    const screenCapture = await this.requestScreenCapturePermission()

    return {
      accessibility,
      screenCapture,
    }
  }

  // Check if running with sufficient permissions for full tracking
  hasFullTrackingPermissions(): boolean {
    const status = this.getPermissionStatus()
    return status.accessibility && status.screenCapture
  }

  // Get platform-specific info
  getPlatformInfo(): { platform: string; needsPermissions: boolean } {
    return {
      platform: os.platform(),
      needsPermissions: this.isMac(),
    }
  }
}
