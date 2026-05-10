import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native'
import { isFirstRun, login } from '../../db/auth'
import { getStoreInfo } from '../../db/auth'
import useAppStore from '../../store/useAppStore'

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [storeName, setStoreName] = useState('Sari-Sari Store')
  const { setUser, setStoreInfo } = useAppStore()

  useEffect(() => {
    checkFirstRun()
    loadStoreInfo()
  }, [])

  async function checkFirstRun() {
    const first = await isFirstRun()
    if (first) navigation.replace('CreateAccount')
  }

  async function loadStoreInfo() {
    try {
      const info = await getStoreInfo()
      if (info) {
        setStoreName(info.store_name)
        setStoreInfo(info)
      }
    } catch (e) {}
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password.')
      return
    }
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      setUser(user)
    } catch (e) {
      Alert.alert('Login Failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ScrollView 
        contentContainerStyle={styles.scroll} 
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>🏪</Text>
          </View>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.subtitle}>Sales Monitoring System</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#475569"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#475569"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Login</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 200
  },
  header: {
    alignItems: 'center',
    marginBottom: 40
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  logoText: {
    fontSize: 40
  },
  storeName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 12
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#f1f5f9'
  },
  loginBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 24
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 16
  },
  forgotText: {
    color: '#64748b',
    fontSize: 13
  }
})