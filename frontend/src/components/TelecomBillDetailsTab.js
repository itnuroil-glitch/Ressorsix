import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TelecomBillDetailsTab({ onNavigate }) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="receipt-outline" size={28} color="#0E5434" />
        </View>
        <Text style={styles.title}>Open a verified telecom bill</Text>
        <Text style={styles.body}>
          Bill details are generated from the selected invoice. Choose a bill in Telecom Bill Form to view its current-period totals, VAT, applicable plan and excess calculation.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => onNavigate && onNavigate('telecom_bill')} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Go to Telecom Bill Form</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 620, padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  body: { marginTop: 10, maxWidth: 500, fontSize: 14, lineHeight: 21, color: '#64748B', textAlign: 'center' },
  button: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0E5434', borderRadius: 9, paddingVertical: 11, paddingHorizontal: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
