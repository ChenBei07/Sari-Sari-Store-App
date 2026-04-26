import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getDashboard, getLowStock } from '../../db/database'
import { getStoreInfo } from '../../db/auth'
import useAppStore from '../../store/useAppStore'
import { peso } from '../../utils/format'

export default function DashboardScreen() {
  const [data, setData] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user, storeInfo, setStoreInfo } = useAppStore()

  useFocusEffect(useCallback(() => {
    loadData()
  }, []))

  async function loadData() {
    try {
      const [dashboard, low, store] = await Promise.all([
        getDashboard(),
        getLowStock(),
        getStoreInfo()
      ])
      setData(dashboard)
      setLowStock(low)
      if (store) setStoreInfo(store)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  const today = data?.todaySales
  const weekly = data?.weeklySales
  const monthly = data?.monthlySales

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} tintColor="#3b82f6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{storeInfo?.store_name || 'My Store'}</Text>
          <Text style={styles.greeting}>Welcome back, {user?.full_name?.split(' ')[0]} 👋</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>⚠️ Low Stock Alert</Text>
          <Text style={styles.alertText}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low</Text>
          {lowStock.slice(0, 3).map(p => (
            <Text key={p.id} style={styles.alertItem}>• {p.name} — {p.stock} left</Text>
          ))}
        </View>
      )}

      {/* Today's Stats */}
      <Text style={styles.sectionTitle}>Today</Text>
      <View style={styles.statsRow}>
        <StatCard label="Sales" value={peso(today?.total_sales)} color="#3b82f6" />
        <StatCard label="Profit" value={peso(today?.total_profit)} color="#10b981" />
        <StatCard label="Transactions" value={today?.total_transactions || 0} color="#f59e0b" />
      </View>

      {/* Weekly & Monthly */}
      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.statsRow}>
        <StatCard label="Sales" value={peso(weekly?.total_sales)} color="#3b82f6" />
        <StatCard label="Profit" value={peso(weekly?.total_profit)} color="#10b981" />
      </View>

      <Text style={styles.sectionTitle}>This Month</Text>
      <View style={styles.statsRow}>
        <StatCard label="Sales" value={peso(monthly?.total_sales)} color="#3b82f6" />
        <StatCard label="Profit" value={peso(monthly?.total_profit)} color="#10b981" />
      </View>

      {/* Top Products */}
      {data?.topProducts?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Top Products This Month</Text>
          <View style={styles.card}>
            {data.topProducts.map((p, i) => (
              <View key={i} style={[styles.topRow, i < data.topProducts.length - 1 && styles.topRowBorder]}>
                <View style={styles.topRank}>
                  <Text style={styles.topRankText}>{i + 1}</Text>
                </View>
                <View style={styles.topInfo}>
                  <Text style={styles.topName}>{p.product_name}</Text>
                  <Text style={styles.topQty}>{p.total_qty} sold</Text>
                </View>
                <Text style={styles.topRevenue}>{peso(p.total_revenue)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Payment Breakdown */}
      {data?.paymentBreakdown?.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Today's Payment Methods</Text>
          <View style={styles.card}>
            {data.paymentBreakdown.map((p, i) => (
              <View key={i} style={[styles.topRow, i < data.paymentBreakdown.length - 1 && styles.topRowBorder]}>
                <Text style={styles.topName}>{p.payment_method}</Text>
                <View style={styles.topInfo} />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.topRevenue}>{peso(p.total)}</Text>
                  <Text style={styles.topQty}>{p.count} transaction{p.count > 1 ? 's' : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  )
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16 },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16, paddingTop: 48
  },
  storeName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  greeting: { fontSize: 13, color: '#64748b', marginTop: 2 },
  roleBadge: {
    backgroundColor: '#1e3a5f', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4
  },
  roleText: { color: '#3b82f6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  alertBox: {
    backgroundColor: '#431407', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#c2410c'
  },
  alertTitle: { color: '#fb923c', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  alertText: { color: '#fed7aa', fontSize: 13, marginBottom: 6 },
  alertItem: { color: '#fdba74', fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12,
    padding: 14, borderTopWidth: 3
  },
  statValue: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  card: { backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  topRowBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  topRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center'
  },
  topRankText: { color: '#3b82f6', fontWeight: '800', fontSize: 13 },
  topInfo: { flex: 1 },
  topName: { color: '#f1f5f9', fontWeight: '600', fontSize: 13 },
  topQty: { color: '#64748b', fontSize: 11, marginTop: 2 },
  topRevenue: { color: '#10b981', fontWeight: '700', fontSize: 13 }
})