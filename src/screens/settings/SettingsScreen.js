import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getStoreInfo, updateStoreInfo } from '../../db/auth'
import useAppStore from '../../store/useAppStore'

export default function SettingsScreen() {
  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user, logout, setStoreInfo } = useAppStore()

  useFocusEffect(useCallback(() => {
    loadStoreInfo()
  }, []))

  async function loadStoreInfo() {
    try {
      const info = await getStoreInfo()
      if (info) {
        setStoreName(info.store_name)
        setStoreAddress(info.store_address || '')
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleSave() {
    if (!storeName.trim()) { Alert.alert('Error', 'Store name is required.'); return }
    setSaving(true)
    try {
      await updateStoreInfo(storeName.trim(), storeAddress.trim())
      setStoreInfo({ store_name: storeName.trim(), store_address: storeAddress.trim() })
      Alert.alert('Saved', 'Store information updated.')
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally { setSaving(false) }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() }
    ])
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.accountRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.full_name?.[0]}</Text>
            </View>
            <View>
              <Text style={styles.accountName}>{user?.full_name}</Text>
              <Text style={styles.accountUsername}>@{user?.username}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Store Info */}
        {user?.role === 'owner' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Store Information</Text>

            <Text style={styles.label}>Store Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter store name"
              placeholderTextColor="#475569"
              value={storeName}
              onChangeText={setStoreName}
            />

            <Text style={styles.label}>Store Address</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Enter store address (optional)"
              placeholderTextColor="#475569"
              value={storeAddress}
              onChangeText={setStoreAddress}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>Sari-Sari Store</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage</Text>
            <Text style={styles.infoValue}>Local (SQLite)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>Android</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  header: { paddingTop: 52, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#334155'
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center'
  },
  avatarText: { color: '#3b82f6', fontSize: 22, fontWeight: '800' },
  accountName: { fontSize: 17, fontWeight: '700', color: '#f1f5f9' },
  accountUsername: { fontSize: 13, color: '#64748b', marginTop: 2 },
  roleBadge: {
    backgroundColor: '#1e3a5f', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6
  },
  roleText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  saveBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 20
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#3b0a0a', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#ef4444'
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' }
})