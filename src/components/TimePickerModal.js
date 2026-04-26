import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView
} from 'react-native'

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function TimePickerModal({ visible, value, onConfirm, onCancel, title }) {
  const [selectedHour, setSelectedHour] = useState(value ? value.split(':')[0] : '08')
  const [selectedMinute, setSelectedMinute] = useState(value ? value.split(':')[1] : '00')

  function handleConfirm() {
    onConfirm(`${selectedHour}:${selectedMinute}`)
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title || 'Select Time'}</Text>

          <View style={styles.pickerRow}>
            {/* Hours */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Hour</Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.option, selectedHour === h && styles.optionActive]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[styles.optionText, selectedHour === h && styles.optionTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.colon}>:</Text>

            {/* Minutes */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Min</Text>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.option, selectedMinute === m && styles.optionActive]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={[styles.optionText, selectedMinute === m && styles.optionTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Selected</Text>
              <Text style={styles.previewTime}>{selectedHour}:{selectedMinute}</Text>
              <Text style={styles.previewAmPm}>
                {parseInt(selectedHour) < 12 ? 'AM' : 'PM'}
              </Text>
              <Text style={styles.previewHuman}>
                {parseInt(selectedHour) === 0 ? '12' :
                  parseInt(selectedHour) > 12 ? parseInt(selectedHour) - 12 : parseInt(selectedHour)}
                :{selectedMinute}
                {parseInt(selectedHour) < 12 ? ' AM' : ' PM'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#334155'
  },
  title: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 16, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  column: { flex: 1 },
  columnLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textAlign: 'center', marginBottom: 8 },
  scroll: { height: 180 },
  option: {
    padding: 12, borderRadius: 8, marginBottom: 4,
    alignItems: 'center'
  },
  optionActive: { backgroundColor: '#1e3a5f' },
  optionText: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  optionTextActive: { color: '#3b82f6', fontWeight: '800' },
  colon: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginTop: 20 },
  preview: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0f172a', borderRadius: 12, padding: 12
  },
  previewLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  previewTime: { fontSize: 28, fontWeight: '800', color: '#3b82f6' },
  previewAmPm: { fontSize: 13, color: '#64748b', marginTop: 2 },
  previewHuman: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 8
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontSize: 14 }
})