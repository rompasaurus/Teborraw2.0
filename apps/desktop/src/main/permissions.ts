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

    // Try to trigger the system prompt by attempting to use accessibility features
    // This is necessary because macOS only shows the prompt when an app actually tries to use the feature
    try {
      // Import active-win dynamically to trigger permission check
      const activeWin = await import('active-win')
      // Attempt to get the active window - this will trigger the system permission prompt
      await activeWin.default()
    } catch (error) {
      // Expected to fail without permission, but this attempt triggers the system prompt
      console.log('Attempted to access active window (triggering permission prompt if needed)')
    }

    // Give macOS a moment to show the system prompt
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Now check again with prompt flag
    const isTrusted = systemPreferences.isTrustedAccessibilityClient(true)

    if (isTrusted) {
      return true
    }

    // If still not trusted, show our own dialog to guide the user
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Accessibility Permission Required',
      message: 'Teboraw needs Accessibility permission to track window activity.',
      detail:
        'To enable activity tracking:\n\n' +
        '1. macOS should have just shown you a system dialog\n' +
        '2. If you missed it, click "Open System Settings" below\n' +
        '3. Find "Electron" in the Accessibility list\n' +
        '4. Enable the checkbox next to it\n' +
        '5. Restart this application (press Cmd+Q to quit)\n\n' +
        'Without this permission, the app cannot detect which window is active.',
      buttons: ['Open System Settings', 'Quit App', 'Continue Anyway'],
      defaultId: 0,
      cancelId: 2,
    })

    if (result.response === 0) {
      // Open System Settings to the Accessibility pane
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
      )
    } else if (result.response === 1) {
      // User chose to quit
      const { app } = require('electron')
      app.quit()
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
      type: 'warning',
      title: 'Screen Recording Permission Required',
      message: 'Teboraw needs Screen Recording permission to capture screenshots.',
      detail:
        'To enable screenshot capture:\n\n' +
        '1. Click "Open System Settings" below\n' +
        '2. Find "Electron" or "Teboraw" in the list\n' +
        '3. Enable the checkbox next to it\n' +
        '4. Restart this application\n\n' +
        'The app will continue to work without this, but screenshots will not be captured.',
      buttons: ['Open System Settings', 'Skip for Now'],
      defaultId: 0,
      cancelId: 1,
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
