import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getExpenses, addExpense, deleteExpense, getExpenseSummary } from '../../db/database'
import { peso, formatDateTime } from '../../utils/format'

const CATEGORIES = ['Restock', 'Salary', 'Maintenance', 'Others']

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [saving, setSaving] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Restock')
  const [notes, setNotes] = useState('')
  const [categoryModal, setCategoryModal] = useState(false)

  useFocusEffect(useCallback(() => {
    loadData()
  }, [categoryFilter]))

  async function loadData() {
    setLoading(true)
    try {
      const [data, sum] = await Promise.all([
        getExpenses({ category: categoryFilter }),
        getExpenseSummary()
      ])
      setExpenses(data)
      setSummary(sum)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function resetForm() {
    setDescription('')
    setAmount('')
    setCategory('Restock')
    setNotes('')
  }

  async function handleAdd() {
    if (!description.trim()) { Alert.alert('Error', 'Description is required.'); return }
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return }

    setSaving(true)
    try {
      await addExpense({
        description: description.trim(),
        amount: parseFloat(amount),
        category,
        notes: notes.trim()
      })
      resetForm()
      setAddModal(false)
      loadData()
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally { setSaving(false) }
  }

  function confirmDelete(expense) {
    Alert.alert(
      'Delete Expense',
      `Delete "${expense.description}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteExpense(expense.id)
          loadData()
        }}
      ]
    )
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  function categoryColor(cat) {
    const colors = {
      'Restock': '#3b82f6',
      'Supplies': '#f59e0b',
      'Utilities': '#10b981',
      'Salary': '#8b5cf6',
      'Maintenance': '#ef4444',
      'Others': '#64748b'
    }
    return colors[cat] || '#64748b'
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Today</Text>
          <Text style={styles.summaryValue}>{peso(summary?.todayExp?.total || 0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryValue}>{peso(summary?.weeklyExp?.total || 0)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryValue}>{peso(summary?.monthlyExp?.total || 0)}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {['All', ...CATEGORIES].map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, categoryFilter === c && styles.chipActive]}
            onPress={() => setCategoryFilter(c)}
          >
            <Text style={[styles.chipText, categoryFilter === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Filtered Total</Text>
        <Text style={styles.totalValue}>{peso(totalExpenses)}</Text>
      </View>

      {/* List */}
      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyText}>No expenses yet</Text>
          <Text style={styles.emptySubText}>Tap "+ Add" to log an expense</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor(item.category) }]} />
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseName}>{item.description}</Text>
                <Text style={styles.expenseCategory}>{item.category}</Text>
                <Text style={styles.expenseDate}>{formatDateTime(item.created_at)}</Text>
                {item.notes ? <Text style={styles.expenseNotes}>{item.notes}</Text> : null}
              </View>
              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>{peso(item.amount)}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                  <Text style={styles.deleteBtnText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Expense Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

              <Text style={styles.modalLabel}>Description *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Restocking of Foods/Sakada"
                placeholderTextColor="#475569"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.modalLabel}>Amount *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor="#475569"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.modalLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoryModal(true)}
              >
                <Text style={styles.categorySelectorText}>{category}</Text>
                <Text style={styles.categorySelectorArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Additional details..."
                placeholderTextColor="#475569"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Expense</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setAddModal(false) }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={categoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryOption, category === c && styles.categoryOptionActive]}
                onPress={() => { setCategory(c); setCategoryModal(false) }}
              >
                <View style={[styles.categoryDot, { backgroundColor: categoryColor(c) }]} />
                <Text style={[styles.categoryOptionText, category === c && styles.categoryOptionTextActive]}>{c}</Text>
                {category === c && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCategoryModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#334155'
  },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
  chipScroll: { paddingLeft: 16, marginBottom: 8 },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', marginRight: 8
  },
  chipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#3b82f6' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8
  },
  totalLabel: { color: '#64748b', fontSize: 13 },
  totalValue: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  emptySubText: { fontSize: 13, color: '#64748b', marginTop: 4 },
  expenseCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, borderWidth: 1, borderColor: '#334155'
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  expenseCategory: { fontSize: 12, color: '#64748b', marginTop: 2 },
  expenseDate: { fontSize: 11, color: '#475569', marginTop: 2 },
  expenseNotes: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
  expenseRight: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 16, fontWeight: '800', color: '#ef4444' },
  deleteBtn: { backgroundColor: '#3b0a0a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: '#334155'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  categorySelector: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  categorySelectorText: { color: '#f1f5f9', fontSize: 15 },
  categorySelectorArrow: { color: '#64748b', fontSize: 12 },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 10, marginBottom: 4, gap: 10
  },
  categoryOptionActive: { backgroundColor: '#1e3a5f' },
  categoryOptionText: { flex: 1, color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  categoryOptionTextActive: { color: '#3b82f6' },
  checkmark: { color: '#3b82f6', fontSize: 16, fontWeight: '800' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#64748b', fontSize: 14 }
})