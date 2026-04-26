import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal
} from 'react-native'
import { addProduct, updateProduct } from '../../db/database'
import { CameraView, useCameraPermissions } from 'expo-camera'

const CATEGORIES = ['General', 'Food', 'Drinks', 'Snacks', 'Personal Care', 'Household', 'Others']

export default function AddEditProductScreen({ route, navigation }) {
  const existing = route.params?.product
  const isEdit = !!existing

  const [name, setName] = useState(existing?.name || '')
  const [category, setCategory] = useState(existing?.category || 'General')
  const [buyingPrice, setBuyingPrice] = useState(existing?.buying_price?.toString() || '')
  const [sellingPrice, setSellingPrice] = useState(existing?.selling_price?.toString() || '')
  const [stock, setStock] = useState(existing?.stock?.toString() || '0')
  const [lowStockAlert, setLowStockAlert] = useState(existing?.low_stock_alert?.toString() || '5')
  const [barcode, setBarcode] = useState(existing?.barcode || '')
  const [loading, setLoading] = useState(false)
  const [categoryModal, setCategoryModal] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()

  const profit = (parseFloat(sellingPrice) || 0) - (parseFloat(buyingPrice) || 0)
  const margin = buyingPrice && sellingPrice
    ? (profit / (parseFloat(sellingPrice) || 1) * 100).toFixed(1)
    : '0'

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.')
        return
      }
    }
    setScanned(false)
    setScannerOpen(true)
  }

  function handleBarcodeScan({ data }) {
    if (scanned) return
    setScanned(true)
    setBarcode(data)
    setScannerOpen(false)
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'Product name is required.'); return }
    if (!buyingPrice || !sellingPrice) { Alert.alert('Error', 'Buying and selling price are required.'); return }
    if (parseFloat(sellingPrice) < parseFloat(buyingPrice)) {
      Alert.alert('Warning', 'Selling price is lower than buying price. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => save() }
      ])
      return
    }
    save()
  }

  async function save() {
    setLoading(true)
    try {
      const product = {
        name: name.trim(),
        category,
        buying_price: parseFloat(buyingPrice),
        selling_price: parseFloat(sellingPrice),
        stock: parseInt(stock) || 0,
        low_stock_alert: parseInt(lowStockAlert) || 5,
        barcode: barcode.trim() || null
      }
      if (isEdit) {
        await updateProduct({ ...product, id: existing.id })
      } else {
        await addProduct(product)
      }
      navigation.goBack()
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

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        </View>

        <View style={styles.form}>

          {/* Name */}
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Lucky Me Pancit Canton"
            placeholderTextColor="#475569"
            value={name}
            onChangeText={setName}
          />

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setCategoryModal(true)}
          >
            <Text style={styles.categorySelectorText}>{category}</Text>
            <Text style={styles.categorySelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* Prices */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Buying Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#475569"
                value={buyingPrice}
                onChangeText={setBuyingPrice}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Selling Price *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#475569"
                value={sellingPrice}
                onChangeText={setSellingPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Profit Preview */}
          {buyingPrice && sellingPrice ? (
            <View style={[styles.profitBox, { borderColor: profit >= 0 ? '#10b981' : '#ef4444' }]}>
              <Text style={styles.profitLabel}>Profit per item</Text>
              <Text style={[styles.profitValue, { color: profit >= 0 ? '#10b981' : '#ef4444' }]}>
                ₱{profit.toFixed(2)} ({margin}% margin)
              </Text>
            </View>
          ) : null}

          {/* Stock */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Stock Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#475569"
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Low Stock Alert</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor="#475569"
                value={lowStockAlert}
                onChangeText={setLowStockAlert}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Barcode */}
          <Text style={styles.label}>Barcode (optional)</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Scan or enter barcode"
              placeholderTextColor="#475569"
              value={barcode}
              onChangeText={setBarcode}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
              <Text style={styles.scanBtnText}>📷 Scan</Text>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Product'}</Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Category Modal */}
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
                <Text style={[styles.categoryOptionText, category === c && styles.categoryOptionTextActive]}>
                  {c}
                </Text>
                {category === c && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setCategoryModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal visible={scannerOpen} animationType="slide">
        <View style={styles.scannerContainer}>
          <Text style={styles.scannerTitle}>Scan Barcode</Text>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScan}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'] }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
          </View>
          <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setScannerOpen(false)}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16, paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  backBtn: { padding: 4 },
  backText: { color: '#3b82f6', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  form: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, fontSize: 15, color: '#f1f5f9'
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  categorySelector: {
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    borderRadius: 10, padding: 13, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  categorySelectorText: { color: '#f1f5f9', fontSize: 15 },
  categorySelectorArrow: { color: '#64748b', fontSize: 12 },
  profitBox: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  profitLabel: { color: '#94a3b8', fontSize: 13 },
  profitValue: { fontSize: 14, fontWeight: '700' },
  barcodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  scanBtn: {
    backgroundColor: '#1e3a5f', borderRadius: 10,
    padding: 13, borderWidth: 1, borderColor: '#3b82f6'
  },
  scanBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 13 },
  saveBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    padding: 15, alignItems: 'center', marginTop: 24
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#334155'
  },
  modalTitle: {
    fontSize: 16, fontWeight: '800', color: '#f1f5f9',
    marginBottom: 16, textAlign: 'center'
  },
  categoryOption: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 4
  },
  categoryOptionActive: { backgroundColor: '#1e3a5f' },
  categoryOptionText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  categoryOptionTextActive: { color: '#3b82f6' },
  checkmark: { color: '#3b82f6', fontSize: 16, fontWeight: '800' },
  modalCancel: {
    marginTop: 8, padding: 14, alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 10
  },
  modalCancelText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  scannerContainer: { flex: 1, backgroundColor: '#0f172a' },
  scannerTitle: {
    color: '#f1f5f9', fontSize: 18, fontWeight: '700',
    textAlign: 'center', paddingTop: 52, marginBottom: 16
  },
  camera: { flex: 1 },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', marginTop: 80
  },
  scannerFrame: {
    width: 250, height: 150, borderWidth: 2,
    borderColor: '#3b82f6', borderRadius: 12, backgroundColor: 'transparent'
  },
  cancelScanBtn: {
    backgroundColor: '#1e293b', margin: 24,
    padding: 15, borderRadius: 10, alignItems: 'center'
  },
  cancelScanText: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' }
})