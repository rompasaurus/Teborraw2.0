import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useAuthStore } from '../store/authStore'

export function LoginScreen() {
  const { apiUrl: storedApiUrl, setApiUrl, setAuth } = useAuthStore()
  const [apiUrl, setLocalApiUrl] = useState(storedApiUrl)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    // Save API URL before attempting login
    await setApiUrl(apiUrl)

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await response.json()
      await setAuth(data.user, data.accessToken, data.refreshToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>T</Text>
        </View>
        <Text style={styles.title}>Teboraw</Text>
        <Text style={styles.subtitle}>Personal Activity Tracker</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>API URL</Text>
          <View style={styles.apiPresets}>
            <TouchableOpacity
              style={[
                styles.presetButton,
                apiUrl === 'https://teboraw.com/api' && styles.presetButtonActive,
              ]}
              onPress={() => {
                setLocalApiUrl('https://teboraw.com/api')
                setApiUrl('https://teboraw.com/api')
              }}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  apiUrl === 'https://teboraw.com/api' && styles.presetButtonTextActive,
                ]}
              >
                Production
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.presetButton,
                apiUrl.includes('10.0.2.2') && styles.presetButtonActive,
              ]}
              onPress={() => {
                setLocalApiUrl('http://10.0.2.2:5000/api')
                setApiUrl('http://10.0.2.2:5000/api')
              }}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  apiUrl.includes('10.0.2.2') && styles.presetButtonTextActive,
                ]}
              >
                Emulator
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.presetButton,
                !apiUrl.includes('teboraw.com') && !apiUrl.includes('10.0.2.2') && styles.presetButtonActive,
              ]}
              onPress={() => {
                // Just highlight custom, user will type in the input
              }}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  !apiUrl.includes('teboraw.com') && !apiUrl.includes('10.0.2.2') && styles.presetButtonTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setLocalApiUrl}
            onBlur={() => setApiUrl(apiUrl)}
            placeholder="http://192.168.x.x:5000/api"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  apiPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: '#0ea5e9',
  },
  presetButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: '#0ea5e9',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#e2e8f0',
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
