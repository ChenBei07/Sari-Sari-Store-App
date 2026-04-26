import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getSales, voidSale, getReceipts } from '../../db/database'
import ReceiptModal from '../../components/ReceiptModal'
import { peso, formatDateTime } from '../../utils/format'
import useAppStore from '../../store/useAppStore'

const FILTERS = ['All', 'Cash', 'GCash', 'Maya']

export default function SalesHistoryScreen({ navigation }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterVisible, setFilterVisible] = useState(false)
  const { user } = useAppStore()
  const isOwner = user?.role === 'owner'
  const [receipts, setReceipts] = useState([])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [receiptVisible, setReceiptVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('sales')

  useFocusEffect(useCallback(() => {
    loadSales()
  }, [paymentFilter, dateFrom, dateTo]))

  async function loadSales() {
    setLoading(true)
    try {
      const [data, receiptData] = await Promise.all([
        getSales({
          payment_method: paymentFilter,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined
        }),
        getReceipts()
      ])
      setSales(data)
      setReceipts(receiptData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function confirmVoid(sale) {
    if (!isOwner) { Alert.alert('Access Denied', 'Only the owner can void sales.'); return }
    Alert.alert(
      'Void Sale',
      `Void sale of ${sale.product_name} (${peso(sale.total_amount)})? Stock will be restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Void', style: 'destructive', onPress: async () => {
          await voidSale(sale.id)
          loadSales()
        }}
      ]
    )
  }

  const totalSales = sales.reduce((s, i) => s + i.total_amount, 0)
  const totalProfit = sales.reduce((s, i) => s + i.profit, 0)

  function paymentColor(method) {
    if (method === 'GCash') return '#3b82f6'
    if (method === 'Maya') return '#10b981'
    return '#f59e0b'
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('NewSale')}>
          <Text style={styles.backText}>← New Sale</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales History</Text>
        <TouchableOpacity onPress={() => setFilterVisible(true)}>
          <Text style={styles.filterBtn}>Filter ▼</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
        >
          <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>Sales</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receipts' && styles.tabActive]}
          onPress={() => setActiveTab('receipts')}
        >
          <Text style={[styles.tabText, activeTab === 'receipts' && styles.tabTextActive]}>
            Receipts ({receipts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Filter Chips - only show on sales tab */}
      {activeTab === 'sales' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, paymentFilter === f && styles.chipActive]}
              onPress={() => setPaymentFilter(f)}
            >
              <Text style={[styles.chipText, paymentFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab === 'sales' ? (
        <>
          {/* Summary Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{peso(totalSales)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Profit</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>{peso(totalProfit)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{sales.length}</Text>
            </View>
          </View>

          {sales.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No sales found</Text>
              <Text style={styles.emptySubText}>Try adjusting your filters</Text>
            </View>
          ) : (
            <FlatList
              data={sales}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingTop: 8 }}
              renderItem={({ item }) => (
                <View style={styles.saleCard}>
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleName}>{item.product_name}</Text>
                    <Text style={styles.saleDateTime}>{formatDateTime(item.created_at)}</Text>
                    <View style={styles.saleMetaRow}>
                      <Text style={styles.saleQty}>{item.quantity} pcs</Text>
                      <View style={[styles.paymentBadge, { backgroundColor: paymentColor(item.payment_method) + '22', borderColor: paymentColor(item.payment_method) }]}>
                        <Text style={[styles.paymentBadgeText, { color: paymentColor(item.payment_method) }]}>
                          {item.payment_method}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleAmount}>{peso(item.total_amount)}</Text>
                    <Text style={styles.saleProfit}>+{peso(item.profit)}</Text>
                    {isOwner && (
                      <TouchableOpacity style={styles.voidBtn} onPress={() => confirmVoid(item)}>
                        <Text style={styles.voidBtnText}>Void</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </>
      ) : (
        <>
          {receipts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>No receipts saved</Text>
              <Text style={styles.emptySubText}>Receipts appear here after each sale</Text>
            </View>
          ) : (
            <FlatList
              data={receipts}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ padding: 16, paddingTop: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.saleCard}
                  onPress={() => { setSelectedReceipt(item); setReceiptVisible(true) }}
                >
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleName}>{item.receipt_ref}</Text>
                    <Text style={styles.saleDateTime}>{formatDateTime(item.created_at)}</Text>
                    <Text style={styles.saleQty}>Cashier: {item.cashier}</Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleAmount}>{peso(item.grand_total)}</Text>
                    <View style={[styles.paymentBadge, { backgroundColor: paymentColor(item.payment_method) + '22', borderColor: paymentColor(item.payment_method) }]}>
                      <Text style={[styles.paymentBadgeText, { color: paymentColor(item.payment_method) }]}>
                        {item.payment_method}
                      </Text>
                    </View>
                    <Text style={styles.viewReceiptText}>Tap to view →</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* Filter Modal */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filter by Date</Text>

            <Text style={styles.modalLabel}>Date From (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2026-04-01"
              placeholderTextColor="#475569"
              value={dateFrom}
              onChangeText={setDateFrom}
            />

            <Text style={styles.modalLabel}>Date To (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 2026-04-25"
              placeholderTextColor="#475569"
              value={dateTo}
              onChangeText={setDateTo}
            />

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => { setFilterVisible(false); loadSales() }}
            >
              <Text style={styles.applyBtnText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => { setDateFrom(''); setDateTo(''); setFilterVisible(false) }}
            >
              <Text style={styles.clearFilterText}>Clear Dates</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setFilterVisible(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <ReceiptModal
        visible={receiptVisible}
        receipt={selectedReceipt}
        onClose={() => setReceiptVisible(false)}
        onDeleted={() => loadSales()}
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
  backText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  filterBtn: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16,
    marginBottom: 12, backgroundColor: '#1e293b',
    borderRadius: 10, padding: 4,
    borderWidth: 1, borderColor: '#334155'
  },
  tab: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  chipScroll: { paddingLeft: 16, marginBottom: 8 },
  chip: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', marginRight: 8
  },
  chipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#3b82f6' },
  summaryBar: {
    flexDirection: 'row', backgroundColor: '#1e293b',
    margin: 16, marginTop: 0, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#334155'
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#f1f5f9' },
  summaryDivider: { width: 1, backgroundColor: '#334155' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  emptySubText: { fontSize: 13, color: '#64748b', marginTop: 4 },
  saleCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155'
  },
  saleLeft: { flex: 1 },
  saleName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  saleDateTime: { fontSize: 11, color: '#64748b', marginTop: 3 },
  saleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  saleQty: { fontSize: 12, color: '#94a3b8' },
  paymentBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1
  },
  paymentBadgeText: { fontSize: 11, fontWeight: '700' },
  saleRight: { alignItems: 'flex-end', gap: 4 },
  saleAmount: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  saleProfit: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  voidBtn: {
    backgroundColor: '#3b0a0a', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 4
  },
  voidBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  viewReceiptText: { color: '#3b82f6', fontSize: 11, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#334155'
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  applyBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 20
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clearFilterBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  clearFilterText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  cancelModalBtn: { padding: 12, alignItems: 'center' },
  cancelModalText: { color: '#64748b', fontSize: 14 }
})