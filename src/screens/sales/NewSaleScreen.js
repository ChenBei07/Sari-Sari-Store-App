import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getProducts, recordMultiSale, saveReceipt } from '../../db/database'
import { getStoreInfo } from '../../db/auth'
import useAppStore from '../../store/useAppStore'
import { peso, nowDateTime } from '../../utils/format'
import ReceiptModal from '../../components/ReceiptModal'

const PAYMENT_METHODS = ['Cash', 'GCash', 'Maya']

export default function NewSaleScreen({ navigation }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [cashReceived, setCashReceived] = useState('')
  const [reference, setReference] = useState('')
  const [processing, setProcessing] = useState(false)
  const [receiptVisible, setReceiptVisible] = useState(false)
  const [lastReceipt, setLastReceipt] = useState(null)

  const { cart, addToCart, updateCartItem, removeFromCart, clearCart, getCartTotal, user } = useAppStore()

  useFocusEffect(useCallback(() => {
    loadProducts()
  }, []))

  async function loadProducts() {
    try {
      const data = await getProducts()
      setProducts(data)
      setFiltered(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleSearch(text) {
    setSearch(text)
    const q = text.toLowerCase()
    setFiltered(products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ))
  }

  function stockColor(p) {
    if (p.stock <= 0) return '#ef4444'
    if (p.stock <= p.low_stock_alert) return '#f59e0b'
    return '#10b981'
  }

  const total = getCartTotal()
  const cashAmt = parseFloat(cashReceived) || 0
  const change = cashAmt - total

  async function handleCheckout() {
    if (cart.length === 0) { Alert.alert('Error', 'Cart is empty.'); return }
    if (paymentMethod === 'Cash') {
      if (!cashReceived) { Alert.alert('Error', 'Enter cash received.'); return }
      if (cashAmt < total) { Alert.alert('Error', `Cash is short by ${peso(total - cashAmt)}.`); return }
    }
    if ((paymentMethod === 'GCash' || paymentMethod === 'Maya') && !reference) {
      Alert.alert('Error', 'Reference number is required for e-wallet payments.')
      return
    }

    setProcessing(true)
    try {
      await recordMultiSale(cart, paymentMethod)
      

      const storeInfo = await getStoreInfo()
      const receiptRef = 'RCP-' + Date.now()
      
      const receiptData = {
        receipt_ref: receiptRef,
        store_name: storeInfo?.store_name || 'My Store',
        store_address: storeInfo?.store_address || '',
        cashier: user?.full_name || user?.username,
        items: cart,
        grand_total: total,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'Cash' ? cashAmt : null,
        change_amount: paymentMethod === 'Cash' ? change : null,
        reference_no: reference || null
      }

      await saveReceipt(receiptData)

      clearCart()
      setCheckoutVisible(false)
      setCashReceived('')
      setReference('')
      setPaymentMethod('Cash')
      loadProducts()

      // Show receipt option
      setLastReceipt(receiptData)
      setReceiptVisible(true)
    } catch (e) {
      Alert.alert('Error', e.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>New Sale</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <Text style={styles.historyBtnText}>🧾 History</Text>
          </TouchableOpacity>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => { Alert.alert('Clear Cart', 'Remove all items?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearCart }]) }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>{cart.length} item{cart.length > 1 ? 's' : ''} in cart</Text>
            <Text style={styles.cartTotal}>{peso(total)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setCheckoutVisible(true)}>
            <Text style={styles.checkoutBtnText}>Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Cart Items */}
      {cart.length > 0 && (
        <View style={styles.cartSection}>
          <Text style={styles.sectionLabel}>CART</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {cart.map(item => (
              <View key={item.product_id} style={styles.cartChip}>
                <Text style={styles.cartChipName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.cartQtyRow}>
                  <TouchableOpacity onPress={() => updateCartItem(item.product_id, item.quantity - 1)}>
                    <Text style={styles.qtyBtn}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.cartQty}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateCartItem(item.product_id, item.quantity + 1)}>
                    <Text style={styles.qtyBtn}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartChipTotal}>{peso(item.total_amount)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products List */}
      <Text style={styles.sectionLabel} style={{ paddingHorizontal: 16, color: '#64748b', fontSize: 12, fontWeight: '700', marginTop: 8 }}>PRODUCTS</Text>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        renderItem={({ item }) => {
          const inCart = cart.find(c => c.product_id === item.id)
          const outOfStock = item.stock <= 0
          return (
            <TouchableOpacity
              style={[styles.productCard, outOfStock && styles.productCardDisabled]}
              onPress={() => {
                if (outOfStock) { Alert.alert('Out of Stock', `${item.name} has no stock.`); return }
                addToCart(item)
              }}
              disabled={outOfStock}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productCategory}>{item.category}</Text>
              </View>
              <View style={styles.productRight}>
                <Text style={styles.productPrice}>{peso(item.selling_price)}</Text>
                <Text style={[styles.productStock, { color: stockColor(item) }]}>
                  {item.stock} left
                </Text>
                {inCart && (
                  <View style={styles.inCartBadge}>
                    <Text style={styles.inCartText}>{inCart.quantity} in cart</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Checkout</Text>

            {/* Cart Summary */}
            <ScrollView style={styles.modalCartList}>
              {cart.map(item => (
                <View key={item.product_id} style={styles.modalCartRow}>
                  <Text style={styles.modalCartName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.modalCartQty}>{item.quantity}x</Text>
                  <Text style={styles.modalCartTotal}>{peso(item.total_amount)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>TOTAL</Text>
              <Text style={styles.modalTotalValue}>{peso(total)}</Text>
            </View>

            {/* Payment Method */}
            <Text style={styles.modalLabel}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.paymentChip, paymentMethod === m && styles.paymentChipActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.paymentChipText, paymentMethod === m && styles.paymentChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cash Calculator */}
            {paymentMethod === 'Cash' && (
              <>
                <Text style={styles.modalLabel}>Cash Received</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  placeholderTextColor="#475569"
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="decimal-pad"
                />
                {cashReceived ? (
                  <View style={[styles.changeBox, { borderColor: change >= 0 ? '#10b981' : '#ef4444' }]}>
                    <Text style={styles.changeLabel}>Change</Text>
                    <Text style={[styles.changeValue, { color: change >= 0 ? '#10b981' : '#ef4444' }]}>
                      {peso(change)}
                    </Text>
                  </View>
                ) : null}

                {/* Quick Cash Buttons */}
                <View style={styles.quickCashRow}>
                  {[20, 50, 100, 200, 500, 1000].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={styles.quickCashBtn}
                      onPress={() => setCashReceived(amt.toString())}
                    >
                      <Text style={styles.quickCashText}>₱{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* GCash/Maya Reference */}
            {(paymentMethod === 'GCash' || paymentMethod === 'Maya') && (
              <>
                <Text style={styles.modalLabel}>Reference Number</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter reference number"
                  placeholderTextColor="#475569"
                  value={reference}
                  onChangeText={setReference}
                  keyboardType="number-pad"
                />
              </>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleCheckout}
              disabled={processing}
            >
              {processing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnText}>Confirm Sale</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Receipt Modal */}
      <ReceiptModal
        visible={receiptVisible}
        receipt={lastReceipt}
        onClose={() => setReceiptVisible(false)}
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
  clearText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  cartBar: {
    backgroundColor: '#1e3a5f', margin: 16, marginTop: 0,
    borderRadius: 12, padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#3b82f6'
  },
  cartCount: { color: '#93c5fd', fontSize: 12, fontWeight: '600' },
  cartTotal: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  checkoutBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchBox: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#1e293b', borderRadius: 10,
    padding: 12, color: '#f1f5f9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155'
  },
  cartSection: { paddingLeft: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  cartChip: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 10,
    marginRight: 8, minWidth: 100, borderWidth: 1, borderColor: '#334155'
  },
  cartChipName: { color: '#f1f5f9', fontSize: 12, fontWeight: '600', marginBottom: 6, maxWidth: 90 },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  qtyBtn: { color: '#3b82f6', fontSize: 18, fontWeight: '800', paddingHorizontal: 4 },
  cartQty: { color: '#f1f5f9', fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartChipTotal: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  productCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#334155'
  },
  productCardDisabled: { opacity: 0.4 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  productCategory: { fontSize: 12, color: '#64748b', marginTop: 2 },
  productRight: { alignItems: 'flex-end', gap: 4 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#3b82f6' },
  productStock: { fontSize: 12, fontWeight: '600' },
  inCartBadge: { backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  inCartText: { color: '#3b82f6', fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#64748b', fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  modalCartList: { maxHeight: 150 },
  modalCartRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  modalCartName: { flex: 1, color: '#f1f5f9', fontSize: 13 },
  modalCartQty: { color: '#64748b', fontSize: 13, marginHorizontal: 8 },
  modalCartTotal: { color: '#10b981', fontSize: 13, fontWeight: '700' },
  modalTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 2, borderTopColor: '#334155', marginTop: 4
  },
  modalTotalLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  modalTotalValue: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentChip: {
    flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155'
  },
  paymentChipActive: { backgroundColor: '#1e3a5f', borderColor: '#3b82f6' },
  paymentChipText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  paymentChipTextActive: { color: '#3b82f6' },
  modalInput: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  changeBox: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  changeLabel: { color: '#94a3b8', fontSize: 14 },
  changeValue: { fontSize: 20, fontWeight: '800' },
  quickCashRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickCashBtn: {
    backgroundColor: '#0f172a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155'
  },
  quickCashText: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    padding: 15, alignItems: 'center', marginTop: 16
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#64748b', fontSize: 14 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyBtn: {
    backgroundColor: '#1e293b', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#334155'
  },
  historyBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' }
})