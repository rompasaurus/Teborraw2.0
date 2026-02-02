import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useAuthStore } from '../store/authStore'
import { TrackingService } from '../services/TrackingService'

export function HomeScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuthStore()
  const [status, setStatus] = useState({
    isTracking: false,
    pendingCount: 0,
  })

  useEffect(() => {
    const updateStatus = () => {
      setStatus({
        isTracking: TrackingService.isActive(),
        pendingCount: TrackingService.getPendingCount(),
      })
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    await TrackingService.syncActivities()
    setStatus((prev) => ({
      ...prev,
      pendingCount: TrackingService.getPendingCount(),
    }))
  }

  const handleLogout = async () => {
    TrackingService.stop()
    await logout()
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.displayName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.statusCard}>
        <View
          style={[
            styles.statusIndicator,
            status.isTracking ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusDot}>●</Text>
        </View>
        <Text style={styles.statusTitle}>
          {status.isTracking ? 'Tracking Active' : 'Tracking Inactive'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {status.isTracking
            ? 'Monitoring location and audio'
            : 'Login to start tracking'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{status.pendingCount}</Text>
          <Text style={styles.statLabel}>Pending Sync</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>-</Text>
          <Text style={styles.statLabel}>Last Sync</Text>
        </View>
      </View>

      {/* Feature Cards */}
      <View style={styles.featureSection}>
        <Text style={styles.sectionTitle}>Tracking Features</Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>📍</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Location Tracking</Text>
            <Text style={styles.featureDesc}>
              GPS position recorded every minute
            </Text>
          </View>
          <View style={[styles.featureStatus, styles.featureEnabled]}>
            <Text style={styles.featureStatusText}>ON</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>🎙️</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Audio Recording</Text>
            <Text style={styles.featureDesc}>
              Ambient audio with transcription
            </Text>
          </View>
          <View style={[styles.featureStatus, styles.featureEnabled]}>
            <Text style={styles.featureStatusText}>ON</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  statusDot: {
    fontSize: 24,
    color: '#22c55e',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  featureSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureInfo: {
    flex: 1,
    marginLeft: 12,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  featureDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  featureStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureEnabled: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  featureStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  actions: {
    marginBottom: 32,
  },
  syncButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
})
