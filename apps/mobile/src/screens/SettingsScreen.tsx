import React, { useState } from 'react'
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native'
import { TrackingService } from '../services/TrackingService'

export function SettingsScreen() {
  const [settings, setSettings] = useState({
    locationEnabled: true,
    audioEnabled: true,
  })

  const handleToggle = async (key: 'locationEnabled' | 'audioEnabled') => {
    const newValue = !settings[key]
    setSettings((prev) => ({ ...prev, [key]: newValue }))
    await TrackingService.updateSettings({ [key]: newValue })
  }

  return (
    <ScrollView style={styles.container}>
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
            value={settings.locationEnabled}
            onValueChange={() => handleToggle('locationEnabled')}
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
            value={settings.audioEnabled}
            onValueChange={() => handleToggle('audioEnabled')}
            trackColor={{ false: '#334155', true: '#0ea5e9' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Data Storage</Text>
          <Text style={styles.infoText}>
            All data is stored on your self-hosted server. Audio is transcribed
            locally using Whisper and only the transcript is synced to preserve
            privacy.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Permissions Required</Text>
          <Text style={styles.infoText}>
            • Location (always) - For GPS tracking{'\n'}
            • Microphone - For audio recording{'\n'}
            • Background execution - For continuous tracking
          </Text>
        </View>
      </View>

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
})
