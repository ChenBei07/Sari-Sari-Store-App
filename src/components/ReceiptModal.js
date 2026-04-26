import React from 'react'
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { deleteReceipt } from '../db/database'
import { peso, formatDateTime } from '../utils/format'

export default function ReceiptModal({ visible, receipt, onClose, onDeleted }) {
  const [printing, setPrinting] = React.useState(false)

  if (!receipt) return null

  const items = typeof receipt.items === 'string'
    ? JSON.parse(receipt.items)
    : receipt.items

  async function handleDelete() {
    Alert.alert(
      'Delete Receipt',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteReceipt(receipt.id)
            onClose()
            if (onDeleted) onDeleted()
          }
        }
      ]
    )
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const itemsHtml = items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.name}</div>
          <div class="item-detail">
            <span>${item.quantity} x &#8369;${Number(item.selling_price).toFixed(2)}</span>
            <span class="item-total">&#8369;${Number(item.total_amount).toFixed(2)}</span>
          </div>
        </div>
      `).join('')

      const cashRows = receipt.payment_method === 'Cash' && receipt.cash_received ? `
        <div class="row"><span>Cash Received</span><span>&#8369;${Number(receipt.cash_received).toFixed(2)}</span></div>
        <div class="row"><span>Change</span><span style="color:#16a34a">&#8369;${Number(receipt.change_amount).toFixed(2)}</span></div>
      ` : ''

      const refRow = receipt.reference_no ? `
        <div class="row"><span>Ref No.</span><span>${receipt.reference_no}</span></div>
      ` : ''

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              width: 107mm;
              padding: 6mm;
              color: #111;
            }
            .header { text-align: center; margin-bottom: 8px; }
            .header h2 { font-size: 14px; font-weight: 900; letter-spacing: 1px; }
            .header p { font-size: 9px; color: #555; margin-top: 2px; }
            .divider { border: none; border-top: 1px dashed #aaa; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px; }
            .row span:last-child { font-weight: 600; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; font-weight: 900; }
            .item-row { padding: 4px 0; border-bottom: 1px dotted #ddd; }
            .item-name { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
            .item-detail { display: flex; justify-content: space-between; font-size: 10px; color: #444; }
            .item-total { font-weight: 700; color: #111; }
            .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #777; line-height: 1.6; }
            .ref { font-size: 9px; color: #888; text-align: center; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${receipt.store_name}</h2>
            ${receipt.store_address ? `<p>${receipt.store_address}</p>` : ''}
          </div>
          <div class="divider"></div>
          <div class="row"><span>Date:</span><span>${formatDateTime(receipt.created_at)}</span></div>
          <div class="row"><span>Cashier:</span><span>${receipt.cashier}</span></div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="total-row"><span>TOTAL</span><span>&#8369;${Number(receipt.grand_total).toFixed(2)}</span></div>
          <div class="row"><span>Payment</span><span>${receipt.payment_method}</span></div>
          ${cashRows}
          ${refRow}
          <div class="divider"></div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please come again 😊</p>
          </div>
          <div class="ref">${receipt.receipt_ref}</div>
        </body>
        </html>
      `

      const { uri } = await Print.printToFileAsync({
        html,
        width: 404,  // 107mm in points (1mm = 2.835pt) ≈ 1/4 Letter width
        height: 720
      })

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Print or Share Receipt',
        UTI: 'com.adobe.pdf'
      })

    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF: ' + e.message)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Receipt</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Store Info */}
            <View style={styles.storeSection}>
              <Text style={styles.storeName}>{receipt.store_name}</Text>
              {receipt.store_address ? (
                <Text style={styles.storeAddress}>{receipt.store_address}</Text>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* Meta */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date & Time</Text>
              <Text style={styles.metaValue}>{formatDateTime(receipt.created_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Cashier</Text>
              <Text style={styles.metaValue}>{receipt.cashier}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ref #</Text>
              <Text style={styles.metaValue}>{receipt.receipt_ref}</Text>
            </View>

            <View style={styles.divider} />

            {/* Items */}
            <Text style={styles.itemsLabel}>Items</Text>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetail}>
                    {item.quantity} x {peso(item.selling_price)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{peso(item.total_amount)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{peso(receipt.grand_total)}</Text>
            </View>

            {/* Payment */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text style={styles.metaValue}>{receipt.payment_method}</Text>
            </View>

            {receipt.payment_method === 'Cash' && receipt.cash_received && (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Cash Received</Text>
                  <Text style={styles.metaValue}>{peso(receipt.cash_received)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Change</Text>
                  <Text style={[styles.metaValue, { color: '#10b981' }]}>
                    {peso(receipt.change_amount)}
                  </Text>
                </View>
              </>
            )}

            {receipt.reference_no && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Reference No.</Text>
                <Text style={styles.metaValue}>{receipt.reference_no}</Text>
              </View>
            )}

            <View style={styles.divider} />
            <Text style={styles.footer}>Thank you for your purchase! 😊</Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.printBtn}
              onPress={handlePrint}
              disabled={printing}
            >
              {printing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.printBtnText}>🖨️ Print / Save PDF</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑️ Delete Receipt</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
    borderWidth: 1, borderColor: '#334155'
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16
  },
  title: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  closeBtn: { color: '#64748b', fontSize: 20, fontWeight: '700' },
  storeSection: { alignItems: 'center', marginBottom: 12 },
  storeName: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  storeAddress: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: '#334155', borderStyle: 'dashed', marginVertical: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  metaLabel: { color: '#64748b', fontSize: 13 },
  metaValue: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  itemsLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#334155'
  },
  itemLeft: { flex: 1 },
  itemName: { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  itemDetail: { color: '#64748b', fontSize: 12, marginTop: 2 },
  itemTotal: { color: '#10b981', fontSize: 13, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8
  },
  totalLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  totalValue: { color: '#f1f5f9', fontSize: 24, fontWeight: '800' },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 13, marginVertical: 8 },
  printBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 12
  },
  printBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: '#3b0a0a', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#ef4444'
  },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' }
})