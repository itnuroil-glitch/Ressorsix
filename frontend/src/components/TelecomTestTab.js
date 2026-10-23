import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TelecomTestTab({ onNavigate }) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#0E5434" />
        </View>
        <Text style={styles.title}>Invoice calculations now use verified bill data</Text>
        <Text style={styles.body}>
          The former sample audit used fixed phone numbers and assumed 5% VAT. Use the live Telecom Bill Form and reports to validate an uploaded invoice with its own VAT treatment, plan and billing period.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => onNavigate && onNavigate('telecom_bill')} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Open Telecom Bill Form</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 660, padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F3EE', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  body: { marginTop: 10, maxWidth: 540, fontSize: 14, lineHeight: 21, color: '#64748B', textAlign: 'center' },
  button: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0E5434', borderRadius: 9, paddingVertical: 11, paddingHorizontal: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
