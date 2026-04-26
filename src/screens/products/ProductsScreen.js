import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getProducts, deleteProduct, getLowStock } from '../../db/database'
import { peso } from '../../utils/format'

export default function ProductsScreen({ navigation }) {
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    loadProducts()
  }, []))

  async function loadProducts() {
    try {
      const data = await getProducts()
      setProducts(data)
      setFiltered(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(text) {
    setSearch(text)
    const q = text.toLowerCase()
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ))
  }

  function confirmDelete(product) {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteProduct(product.id)
            loadProducts()
          }
        }
      ]
    )
  }

  function stockColor(product) {
    if (product.stock <= 0) return '#ef4444'
    if (product.stock <= product.low_stock_alert) return '#f59e0b'
    return '#10b981'
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddEditProduct', { product: null })}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>{products.length} products</Text>
        <Text style={styles.summaryText}>
          {products.filter(p => p.stock <= p.low_stock_alert).length} low stock
        </Text>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>📦</Text>
          <Text style={styles.emptyLabel}>No products yet</Text>
          <Text style={styles.emptySubLabel}>Tap "+ Add" to add your first product</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productLeft}>
                <View style={[styles.stockDot, { backgroundColor: stockColor(item) }]} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCategory}>{item.category}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.buyPrice}>Cost: {peso(item.buying_price)}</Text>
                    <Text style={styles.sellPrice}>Sell: {peso(item.selling_price)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.productRight}>
                <Text style={[styles.stockCount, { color: stockColor(item) }]}>
                  {item.stock}
                </Text>
                <Text style={styles.stockLabel}>in stock</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('AddEditProduct', { product: item })}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDelete(item)}
                  >
                    <Text style={styles.deleteBtnText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
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
  addBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchBox: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#1e293b', borderRadius: 10,
    padding: 12, color: '#f1f5f9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155'
  },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 4
  },
  summaryText: { fontSize: 12, color: '#64748b' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 48, marginBottom: 12 },
  emptyLabel: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  emptySubLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  productCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155'
  },
  productLeft: { flexDirection: 'row', flex: 1, gap: 10 },
  stockDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  productCategory: { fontSize: 12, color: '#64748b', marginTop: 2 },
  priceRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  buyPrice: { fontSize: 12, color: '#94a3b8' },
  sellPrice: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  productRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  stockCount: { fontSize: 22, fontWeight: '800' },
  stockLabel: { fontSize: 11, color: '#64748b' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  editBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5
  },
  editBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#3b0a0a', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5
  },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' }
})