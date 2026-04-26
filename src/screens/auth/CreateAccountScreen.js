import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native'
import { createAccount } from '../../db/auth'
import useAppStore from '../../store/useAppStore'

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your oldest sibling's middle name?",
  "What was the name of your elementary school?",
]

export default function CreateAccountScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedQ, setSelectedQ] = useState(0)
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAppStore()

  async function handleCreate() {
    if (!fullName.trim() || !username.trim() || !password.trim() || !securityAnswer.trim()) {
      Alert.alert('Error', 'Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.')
      return
    }
    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters.')
      return
    }

    setLoading(true)
    try {
      await createAccount({
        full_name: fullName.trim(),
        username: username.trim(),
        password,
        role: 'owner',
        security_question: SECURITY_QUESTIONS[selectedQ],
        security_answer: securityAnswer.trim()
      })
      // Auto login after creating owner account
      const { login } = require('../../db/auth')
      const user = await login(username.trim(), password)
      setUser(user)
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logoText}>🏪</Text>
          <Text style={styles.title}>Create Owner Account</Text>
          <Text style={styles.subtitle}>Set up your store for the first time</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#475569"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Choose a username"
            placeholderTextColor="#475569"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            placeholderTextColor="#475569"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat your password"
            placeholderTextColor="#475569"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Security Question</Text>
          <View style={styles.questionBox}>
            {SECURITY_QUESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.questionOption, selectedQ === i && styles.questionSelected]}
                onPress={() => setSelectedQ(i)}
              >
                <View style={[styles.radio, selectedQ === i && styles.radioSelected]} />
                <Text style={[styles.questionText, selectedQ === i && styles.questionTextSelected]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Security Answer</Text>
          <TextInput
            style={styles.input}
            placeholder="Your answer"
            placeholderTextColor="#475569"
            value={securityAnswer}
            onChangeText={setSecurityAnswer}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account & Continue</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoText: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
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
    marginTop: 14
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
  questionBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden'
  },
  questionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10
  },
  questionSelected: { backgroundColor: '#1e3a5f' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#475569'
  },
  radioSelected: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  questionText: { fontSize: 12, color: '#94a3b8', flex: 1 },
  questionTextSelected: { color: '#f1f5f9' },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 24
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
})