import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator
} from 'react-native'
import { getSecurityQuestion, resetPassword } from '../../db/auth'

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFindUser() {
    if (!username.trim()) { Alert.alert('Error', 'Enter your username.'); return }
    setLoading(true)
    try {
      const q = await getSecurityQuestion(username.trim())
      setQuestion(q)
      setStep(2)
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally { setLoading(false) }
  }

  async function handleReset() {
    if (!answer.trim()) { Alert.alert('Error', 'Enter your security answer.'); return }
    if (!newPassword.trim()) { Alert.alert('Error', 'Enter a new password.'); return }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return }
    if (newPassword.length < 4) { Alert.alert('Error', 'Password must be at least 4 characters.'); return }

    setLoading(true)
    try {
      await resetPassword(username.trim(), answer.trim(), newPassword)
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Login', onPress: () => navigation.replace('Login') }
      ])
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally { setLoading(false) }
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
          <Text style={styles.logoText}>🔐</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Enter your username to continue' : 'Answer your security question'}
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>

        <View style={styles.form}>

          {step === 1 ? (
            <>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#475569"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.btn}
                onPress={handleFindUser}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Continue →</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>Security Question</Text>
                <Text style={styles.questionText}>{question}</Text>
              </View>

              <Text style={styles.label}>Your Answer</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                placeholderTextColor="#475569"
                value={answer}
                onChangeText={setAnswer}
                autoCapitalize="none"
              />

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#475569"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat new password"
                placeholderTextColor="#475569"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.btn}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Reset Password</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Back to Login</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 200 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoText: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155' },
  stepDotActive: { backgroundColor: '#3b82f6' },
  stepLine: { width: 60, height: 2, backgroundColor: '#334155' },
  form: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155' },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#f1f5f9'
  },
  questionBox: {
    backgroundColor: '#0f172a', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#334155', marginTop: 4
  },
  questionLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  questionText: { fontSize: 14, color: '#f1f5f9', fontWeight: '600', lineHeight: 20 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  backBtnText: { color: '#64748b', fontSize: 14 },
  loginBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#64748b', fontSize: 13 }
})