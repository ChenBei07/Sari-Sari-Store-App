import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  getUsers, addStaff, deleteUser,
  lockUser, unlockUser, setUserSchedule, clearUserSchedule
} from '../../db/auth'
import TimePickerModal from '../../components/TimePickerModal'

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your oldest sibling's middle name?",
  "What was the name of your elementary school?",
]

export default function ManageStaffScreen() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Add staff form
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedQ, setSelectedQ] = useState(0)
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [startPickerVisible, setStartPickerVisible] = useState(false)
  const [endPickerVisible, setEndPickerVisible] = useState(false) 

  // Schedule form
  const [lockStart, setLockStart] = useState('')
  const [lockEnd, setLockEnd] = useState('')

  useFocusEffect(useCallback(() => {
    loadUsers()
  }, []))

  async function loadUsers() {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function resetForm() {
    setFullName(''); setUsername(''); setPassword('')
    setSelectedQ(0); setSecurityAnswer('')
  }

  async function handleAddStaff() {
    if (!fullName.trim() || !username.trim() || !password.trim() || !securityAnswer.trim()) {
      Alert.alert('Error', 'Please fill in all fields.'); return
    }
    setSaving(true)
    try {
      await addStaff({
        full_name: fullName.trim(),
        username: username.trim(),
        password,
        security_question: SECURITY_QUESTIONS[selectedQ],
        security_answer: securityAnswer.trim()
      })
      resetForm()
      setAddModal(false)
      loadUsers()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally { setSaving(false) }
  }

  async function handleToggleLock(user) {
    if (user.is_locked) {
      await unlockUser(user.id)
    } else {
      await lockUser(user.id)
    }
    loadUsers()
  }

  function confirmDelete(user) {
    Alert.alert('Delete Staff', `Remove "${user.full_name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteUser(user.id)
        loadUsers()
      }}
    ])
  }

  async function handleSaveSchedule() {
    if (!lockStart || !lockEnd) {
      Alert.alert('Error', 'Please enter both start and end time.'); return
    }
    await setUserSchedule(selectedUser.id, lockStart, lockEnd)
    setScheduleModal(false)
    loadUsers()
  }

  async function handleClearSchedule() {
    await clearUserSchedule(selectedUser.id)
    setScheduleModal(false)
    loadUsers()
  }

  function openSchedule(user) {
    setSelectedUser(user)
    setLockStart(user.lock_start || '')
    setLockEnd(user.lock_end || '')
    setScheduleModal(true)
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  const staff = users.filter(u => u.role === 'staff')
  const owners = users.filter(u => u.role === 'owner')

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Manage Staff</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addBtnText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Owners */}
        <Text style={styles.sectionLabel}>OWNER</Text>
        {owners.map(user => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{user.full_name[0]}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.full_name}</Text>
              <Text style={styles.userUsername}>@{user.username}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: '#1e3a5f' }]}>
              <Text style={[styles.roleText, { color: '#3b82f6' }]}>Owner</Text>
            </View>
          </View>
        ))}

        {/* Staff */}
        <Text style={styles.sectionLabel}>STAFF ({staff.length})</Text>
        {staff.length === 0 ? (
          <View style={styles.emptyStaff}>
            <Text style={styles.emptyText}>No staff accounts yet</Text>
            <Text style={styles.emptySubText}>Tap "+ Add Staff" to create one</Text>
          </View>
        ) : (
          staff.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={[styles.userAvatar, { backgroundColor: user.is_locked ? '#3b0a0a' : '#0f2a1e' }]}>
                <Text style={styles.userAvatarText}>{user.full_name[0]}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userUsername}>@{user.username}</Text>
                {user.lock_start && user.lock_end ? (
                  <Text style={styles.scheduleText}>⏰ {user.lock_start} – {user.lock_end}</Text>
                ) : null}
              </View>
              <View style={styles.staffActions}>
                <View style={[styles.statusBadge, { backgroundColor: user.is_locked ? '#3b0a0a' : '#0f2a1e' }]}>
                  <Text style={[styles.statusText, { color: user.is_locked ? '#ef4444' : '#10b981' }]}>
                    {user.is_locked ? 'Locked' : 'Active'}
                  </Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: user.is_locked ? '#10b981' : '#ef4444' }]}
                    onPress={() => handleToggleLock(user)}
                  >
                    <Text style={[styles.actionBtnText, { color: user.is_locked ? '#10b981' : '#ef4444' }]}>
                      {user.is_locked ? 'Unlock' : 'Lock'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#f59e0b' }]}
                    onPress={() => openSchedule(user)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Schedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#ef4444' }]}
                    onPress={() => confirmDelete(user)}
                  >
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Staff Account</Text>
            <ScrollView keyboardShouldPersistTaps="handled">

              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput style={styles.modalInput} placeholder="Full name" placeholderTextColor="#475569" value={fullName} onChangeText={setFullName} />

              <Text style={styles.modalLabel}>Username</Text>
              <TextInput style={styles.modalInput} placeholder="Username" placeholderTextColor="#475569" value={username} onChangeText={setUsername} autoCapitalize="none" />

              <Text style={styles.modalLabel}>Password</Text>
              <TextInput style={styles.modalInput} placeholder="Password" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry />

              <Text style={styles.modalLabel}>Security Question</Text>
              {SECURITY_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.questionOption, selectedQ === i && styles.questionOptionActive]}
                  onPress={() => setSelectedQ(i)}
                >
                  <View style={[styles.radio, selectedQ === i && styles.radioSelected]} />
                  <Text style={[styles.questionText, selectedQ === i && styles.questionTextActive]}>{q}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.modalLabel}>Security Answer</Text>
              <TextInput style={styles.modalInput} placeholder="Answer" placeholderTextColor="#475569" value={securityAnswer} onChangeText={setSecurityAnswer} autoCapitalize="none" />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddStaff} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Staff Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setAddModal(false) }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule Modal */}
      <Modal visible={scheduleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Work Schedule</Text>
            <Text style={styles.modalSubtitle}>Set allowed login hours for {selectedUser?.full_name}</Text>

            <Text style={styles.modalLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => setStartPickerVisible(true)}
            >
              <Text style={styles.timeSelectorText}>
                {lockStart || 'Select start time'}
              </Text>
              <Text style={styles.timeSelectorArrow}>🕐</Text>
            </TouchableOpacity>

            <Text style={styles.modalLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => setEndPickerVisible(true)}
            >
              <Text style={styles.timeSelectorText}>
                {lockEnd || 'Select end time'}
              </Text>
              <Text style={styles.timeSelectorArrow}>🕐</Text>
            </TouchableOpacity>

            {lockStart && lockEnd && (
              <View style={styles.schedulePreview}>
                <Text style={styles.schedulePreviewText}>
                  ⏰ Staff can login from {lockStart} to {lockEnd}
                </Text>
              </View>
            )}

            <Text style={styles.scheduleNote}>
              ℹ️ Outside this window, account is automatically locked.
            </Text>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSchedule}>
              <Text style={styles.saveBtnText}>Save Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearScheduleBtn} onPress={handleClearSchedule}>
              <Text style={styles.clearScheduleText}>Clear Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScheduleModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Pickers */}
      <TimePickerModal
        visible={startPickerVisible}
        value={lockStart}
        title="Select Start Time"
        onConfirm={(time) => { setLockStart(time); setStartPickerVisible(false) }}
        onCancel={() => setStartPickerVisible(false)}
      />
      <TimePickerModal
        visible={endPickerVisible}
        value={lockEnd}
        title="Select End Time"
        onConfirm={(time) => { setLockEnd(time); setEndPickerVisible(false) }}
        onCancel={() => setEndPickerVisible(false)}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, paddingTop: 52
  },
  title: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  addBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { padding: 16, paddingTop: 0 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 8 },
  userCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155'
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1e3a5f', justifyContent: 'center',
    alignItems: 'center', marginBottom: 10
  },
  userAvatarText: { color: '#3b82f6', fontSize: 18, fontWeight: '800' },
  userInfo: { marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  userUsername: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scheduleText: { fontSize: 12, color: '#f59e0b', marginTop: 4 },
  roleBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: '700' },
  staffActions: {},
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  emptyStaff: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  emptySubText: { color: '#64748b', fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: '#334155'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  questionOption: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderRadius: 8, marginBottom: 4, gap: 10
  },
  questionOptionActive: { backgroundColor: '#1e3a5f' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#475569' },
  radioSelected: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  questionText: { fontSize: 12, color: '#94a3b8', flex: 1 },
  questionTextActive: { color: '#f1f5f9' },
  scheduleNote: { fontSize: 12, color: '#64748b', marginTop: 12, lineHeight: 18 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clearScheduleBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  clearScheduleText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontSize: 14 },

  timeSelector: {
  backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
  borderRadius: 10, padding: 13, flexDirection: 'row',
  justifyContent: 'space-between', alignItems: 'center'
  },
  timeSelectorText: { color: '#f1f5f9', fontSize: 15 },
  timeSelectorArrow: { fontSize: 16 },
  schedulePreview: {
    backgroundColor: '#1e3a5f', borderRadius: 10,
    padding: 12, marginTop: 12
  },
  schedulePreviewText: { color: '#93c5fd', fontSize: 13, fontWeight: '600', textAlign: 'center' },
})