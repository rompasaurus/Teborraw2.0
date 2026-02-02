import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { TrackingService } from '../services/TrackingService'
import {
  requestLocationPermissionWithDialog,
  hasBackgroundLocationPermission,
} from '../utils/permissions'

interface TrackingState {
  locationEnabled: boolean
  audioEnabled: boolean
  pendingCount: number
  isTracking: boolean
  hasBackgroundPermission: boolean
  lastSyncTime: string | null
  currentLocation: { lat: number; lng: number } | null
}

export function SettingsScreen() {
  const [state, setState] = useState<TrackingState>({
    locationEnabled: true,
    audioEnabled: false,
    pendingCount: 0,
    isTracking: false,
    hasBackgroundPermission: false,
    lastSyncTime: null,
    currentLocation: null,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadState = useCallback(async () => {
    const settings = TrackingService.getSettings()
    const pendingCount = TrackingService.getPendingCount()
    const isTracking = TrackingService.isActive()
    const hasPermission = await hasBackgroundLocationPermission()

    // Get current position if tracking
    let currentLocation = null
    if (isTracking && settings.locationEnabled) {
      const location = await TrackingService.getCurrentPosition()
      if (location) {
        currentLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        }
      }
    }

    setState((prev) => ({
      ...prev,
      locationEnabled: settings.locationEnabled,
      audioEnabled: settings.audioEnabled,
      pendingCount,
      isTracking,
      hasBackgroundPermission: hasPermission,
      currentLocation,
    }))
  }, [])

  useEffect(() => {
    loadState()
    // Refresh state every 30 seconds
    const interval = setInterval(loadState, 30000)
    return () => clearInterval(interval)
  }, [loadState])

  const handleLocationToggle = async () => {
    const newValue = !state.locationEnabled

    if (newValue) {
      // Request permission if enabling
      const granted = await requestLocationPermissionWithDialog()
      if (!granted) {
        return // Don't enable if permission denied
      }
    }

    setState((prev) => ({ ...prev, locationEnabled: newValue }))
    await TrackingService.updateSettings({ locationEnabled: newValue })

    // Refresh state to get updated permission status
    await loadState()
  }

  const handleAudioToggle = async () => {
    const newValue = !state.audioEnabled
    setState((prev) => ({ ...prev, audioEnabled: newValue }))
    await TrackingService.updateSettings({ audioEnabled: newValue })
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    try {
      await TrackingService.forceSyncNow()
      await loadState()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleClearPending = async () => {
    await TrackingService.clearPendingActivities()
    await loadState()
  }

  const onRefresh = async () => {
    setIsRefreshing(true)
    await loadState()
    setIsRefreshing(false)
  }

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W'
    return `${Math.abs(coord).toFixed(6)}° ${direction}`
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#0ea5e9"
        />
      }
    >
      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: state.isTracking ? '#22c55e' : '#ef4444' },
                ]}
              />
              <Text style={styles.statusLabel}>Tracking</Text>
              <Text style={styles.statusValue}>
                {state.isTracking ? 'Active' : 'Stopped'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: state.hasBackgroundPermission
                      ? '#22c55e'
                      : '#f59e0b',
                  },
                ]}
              />
              <Text style={styles.statusLabel}>Permission</Text>
              <Text style={styles.statusValue}>
                {state.hasBackgroundPermission ? 'Always' : 'Limited'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.pendingCount}>{state.pendingCount}</Text>
              <Text style={styles.statusLabel}>Pending</Text>
            </View>
          </View>

          {state.currentLocation && (
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>Current Location</Text>
              <Text style={styles.locationValue}>
                {formatCoordinate(state.currentLocation.lat, 'lat')},{' '}
                {formatCoordinate(state.currentLocation.lng, 'lng')}
              </Text>
            </View>
          )}
        </View>

        {/* Sync Button */}
        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncNow}
          disabled={isSyncing || state.pendingCount === 0}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>
              Sync Now ({state.pendingCount} pending)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tracking Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Location Tracking</Text>
            <Text style={styles.settingDesc}>
              Track GPS location in background
            </Text>
          </View>
          <Switch
            value={state.locationEnabled}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#334155', true: '#0ea5e9' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingName}>Audio Recording</Text>
            <Text style={styles.settingDesc}>
              Record ambient audio with transcription
            </Text>
          </View>
          <Switch
            value={state.audioEnabled}
            onValueChange={handleAudioToggle}
            trackColor={{ false: '#334155', true: '#0ea5e9' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Data Storage</Text>
          <Text style={styles.infoText}>
            All data is stored on your self-hosted server. Location data is
            encrypted in transit and only you have access to your tracking
            history.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Battery Optimization</Text>
          <Text style={styles.infoText}>
            Location tracking uses battery-efficient mode that records
            significant location changes. Continuous tracking only activates
            when movement is detected.
          </Text>
        </View>

        <TouchableOpacity style={styles.dangerButton} onPress={handleClearPending}>
          <Text style={styles.dangerButtonText}>Clear Pending Activities</Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Teboraw Mobile</Text>
          <Text style={styles.infoText}>Version 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  pendingCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0ea5e9',
    marginBottom: 2,
  },
  locationRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  locationLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#e2e8f0',
  },
  syncButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#334155',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  settingDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
})
