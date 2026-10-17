import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// -----------------------------------------------------------------------------
// STATIC BILL RECORD (EXACT MATCH FOR THE SCREENSHOT DATA)
// -----------------------------------------------------------------------------
const STATIC_BILL_DATA = {
  // Top KPI Card Values
  totalBill: 988.79,
  planRental: 200.00,
  usageCharges: 741.70,
  vatAmount: 47.09,
  excessUsage: 741.70,

  // Bill & Subscription Specifications
  company: 'Nuragro FZE',
  telecomProvider: 'Etisalat',
  mobileNumber: '0501070455',
  employee: 'Omar Khalid · Logistics',
  connectionType: 'SIM',
  planName: 'Standard 200 AED Plan',
  invoiceNumber: 'INV2055361022',
  billPeriod: '01 Sep to 30 Sep 2026',
  pdfFileName: 'Etisalat_Bill_INV2055361022.pdf',
  status: 'ACTIVE',

  // Plan Limit vs Actual Usage
  limitsSummary: '1 limit exceeded',
  usageComparison: [
    {
      item: 'Local minutes',
      planLimit: '1,000 min',
      used: '980 min',
      overBy: '–',
      extraCharge: '–',
      isExceeded: false,
    },
    {
      item: 'International minutes',
      planLimit: '250 min',
      used: '862 min',
      overBy: '+612 min',
      extraCharge: '655.40',
      isExceeded: true,
    },
    {
      item: 'Data',
      planLimit: '20 GB',
      used: '8.4 GB',
      overBy: '–',
      extraCharge: '–',
      isExceeded: false,
    },
    {
      item: 'Local SMS',
      planLimit: '100',
      used: '40',
      overBy: '–',
      extraCharge: '–',
      isExceeded: false,
    },
    {
      item: 'Calls to special numbers',
      planLimit: 'Not included',
      used: '31 calls',
      overBy: 'All',
      extraCharge: '48.10',
      isExceeded: true,
    },
  ],

  // Itemized Breakdown
  breakdown: [
    {
      id: 1,
      description: 'Plan Rental',
      recordType: 'SERVICE',
      amount: 200.00,
    },
    {
      id: 2,
      description: 'Usage Charges',
      recordType: 'CHARGE',
      amount: 741.70,
    },
    {
      id: 3,
      description: 'VAT (5%)',
      recordType: 'TAX',
      amount: 47.09,
    },
  ],
};

// Alternative sample records for interactive showcase
const SAMPLE_BILLS = [
  {
    id: 'INV2055361022',
    label: 'INV2055361022 · 0501070455 (Nuragro FZE) — Excess Usage',
    data: STATIC_BILL_DATA,
  },
  {
    id: 'INV2055361048',
    label: 'INV2055361048 · 0524806401 (Nuragro FZE) — Normal Plan',
    data: {
      ...STATIC_BILL_DATA,
      totalBill: 210.00,
      planRental: 200.00,
      usageCharges: 0.00,
      vatAmount: 10.00,
      excessUsage: 0.00,
      mobileNumber: '0524806401',
      employee: 'Rashid Al Nuaimi · Operations',
      invoiceNumber: 'INV2055361048',
      limitsSummary: '0 limits exceeded',
      usageComparison: [
        { item: 'Local minutes', planLimit: '1,000 min', used: '640 min', overBy: '–', extraCharge: '–', isExceeded: false },
        { item: 'International minutes', planLimit: '250 min', used: '110 min', overBy: '–', extraCharge: '–', isExceeded: false },
        { item: 'Data', planLimit: '20 GB', used: '12.6 GB', overBy: '–', extraCharge: '–', isExceeded: false },
        { item: 'Local SMS', planLimit: '100', used: '18', overBy: '–', extraCharge: '–', isExceeded: false },
        { item: 'Calls to special numbers', planLimit: 'Not included', used: '0 calls', overBy: '–', extraCharge: '–', isExceeded: false },
      ],
      breakdown: [
        { id: 1, description: 'Plan Rental', recordType: 'SERVICE', amount: 200.00 },
        { id: 2, description: 'Usage Charges', recordType: 'CHARGE', amount: 0.00 },
        { id: 3, description: 'VAT (5%)', recordType: 'TAX', amount: 10.00 },
      ],
    },
  },
];

export default function TelecomBillDetailsTab({
  user,
  showToast,
  isSidebarCollapsed,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [selectedBillId, setSelectedBillId] = useState('INV2055361022');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);

  const activeBill = SAMPLE_BILLS.find(b => b.id === selectedBillId)?.data || STATIC_BILL_DATA;

  const handleClose = () => {
    if (onNavigate) {
      onNavigate('telecom_bill');
    } else if (showToast) {
      showToast('Closed Telecom Bill Details', 'info');
    }
  };

  const handleViewUsageReport = () => {
    if (onNavigate) {
      onNavigate('telecom_report');
    } else {
      setShowUsageModal(true);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, isMobile && { padding: 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Optional Top Bar for switching sample bills */}
      <View style={styles.topSelectorBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Ionicons name="documents-outline" size={16} color="#004D34" />
          <Text style={styles.topSelectorLabel}>Select Static Bill View:</Text>
          {SAMPLE_BILLS.map((b) => {
            const isSelected = b.id === selectedBillId;
            return (
              <TouchableOpacity
                key={b.id}
                onPress={() => setSelectedBillId(b.id)}
                style={[
                  styles.billPillBtn,
                  isSelected && styles.billPillBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.billPillBtnText,
                    isSelected && styles.billPillBtnTextActive,
                  ]}
                >
                  {b.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MAIN CARD CONTAINER (MATCHING EXACT SCREENSHOT MODAL STYLE) */}
      <View style={styles.modalCard}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="receipt-outline" size={24} color="#15803D" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Telecom Bill Details</Text>
              <Text style={styles.headerSubtitle}>
                Summary, plan comparison and itemized charges
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeCircleBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 5 KPI SUMMARY CARDS */}
        <View style={styles.kpiRow}>
          {/* Card 1: TOTAL BILL */}
          <View style={[styles.kpiCard, styles.kpiCardTotal]}>
            <Text style={styles.kpiLabelTotal}>TOTAL BILL</Text>
            <Text style={styles.kpiValueTotal}>
              AED {activeBill.totalBill.toFixed(2)}
            </Text>
            <Text style={styles.kpiNoteTotal}>Net payable incl. VAT</Text>
          </View>

          {/* Card 2: PLAN RENTAL */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>PLAN RENTAL</Text>
            <Text style={styles.kpiValue}>
              AED {activeBill.planRental.toFixed(2)}
            </Text>
            <Text style={styles.kpiNote}>Fixed monthly charge</Text>
          </View>

          {/* Card 3: USAGE CHARGES */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>USAGE CHARGES</Text>
            <Text style={styles.kpiValue}>
              AED {activeBill.usageCharges.toFixed(2)}
            </Text>
            <Text style={styles.kpiNote}>Calls, data, SMS</Text>
          </View>

          {/* Card 4: VAT (5%) */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>VAT (5%)</Text>
            <Text style={styles.kpiValue}>
              AED {activeBill.vatAmount.toFixed(2)}
            </Text>
            <Text style={styles.kpiNote}>Tax</Text>
          </View>

          {/* Card 5: EXCESS USAGE [NEW] */}
          <View style={[styles.kpiCard, styles.kpiCardExcess]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.kpiLabelExcess}>EXCESS USAGE</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={styles.kpiValueExcess}>
              AED {activeBill.excessUsage.toFixed(2)}
            </Text>
            <Text style={styles.kpiNoteExcess}>Over plan amount</Text>
          </View>
        </View>

        {/* SECTION 1: BILL & SUBSCRIPTION SPECIFICATIONS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleGreen}>
              BILL & SUBSCRIPTION SPECIFICATIONS
            </Text>
            <View style={styles.activePillBadge}>
              <Text style={styles.activePillText}>{activeBill.status}</Text>
            </View>
          </View>

          {/* 3x3 GRID */}
          <View style={styles.specGrid}>
            {/* Box 1 */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>COMPANY / SUBSIDIARY</Text>
              <Text style={styles.specValue}>{activeBill.company}</Text>
            </View>

            {/* Box 2 */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>TELECOM PROVIDER</Text>
              <Text style={[styles.specValue, { color: '#16A34A' }]}>
                {activeBill.telecomProvider}
              </Text>
            </View>

            {/* Box 3 - Highlighted red border */}
            <View style={[styles.specBox, styles.specBoxHighlightRed]}>
              <Text style={styles.specLabel}>MOBILE NUMBER</Text>
              <Text style={[styles.specValue, { color: '#DC2626' }]}>
                {activeBill.mobileNumber}
              </Text>
            </View>

            {/* Box 4 */}
            <View style={styles.specBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.specLabel}>EMPLOYEE</Text>
                <View style={styles.newBadgeInline}>
                  <Text style={styles.newBadgeTextInline}>NEW</Text>
                </View>
              </View>
              <Text style={styles.specValue}>{activeBill.employee}</Text>
            </View>

            {/* Box 5 */}
            <View style={styles.specBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.specLabel}>CONNECTION TYPE</Text>
                <View style={styles.newBadgeInline}>
                  <Text style={styles.newBadgeTextInline}>NEW</Text>
                </View>
              </View>
              <Text style={styles.specValue}>{activeBill.connectionType}</Text>
            </View>

            {/* Box 6 */}
            <View style={styles.specBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.specLabel}>PLAN</Text>
                <View style={styles.newBadgeInline}>
                  <Text style={styles.newBadgeTextInline}>NEW</Text>
                </View>
              </View>
              <Text style={styles.specValue}>{activeBill.planName}</Text>
            </View>

            {/* Box 7 */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>INVOICE / BILL NUMBER</Text>
              <Text style={styles.specValue}>{activeBill.invoiceNumber}</Text>
            </View>

            {/* Box 8 */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>BILL PERIOD</Text>
              <Text style={styles.specValue}>{activeBill.billPeriod}</Text>
            </View>

            {/* Box 9 */}
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>ATTACHED PDF</Text>
              <TouchableOpacity
                onPress={() => setShowPdfModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <Text style={styles.viewPdfLink}>View PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SECTION 2: PLAN LIMIT VS ACTUAL USAGE */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitleGreen}>
                PLAN LIMIT VS ACTUAL USAGE
              </Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            </View>
            <View style={styles.limitExceededPill}>
              <Text style={styles.limitExceededText}>
                {activeBill.limitsSummary}
              </Text>
            </View>
          </View>

          {/* USAGE COMPARISON TABLE */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>ITEM</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
                PLAN LIMIT
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
                USED
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>
                OVER BY
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>
                EXTRA CHARGE (AED)
              </Text>
            </View>

            {activeBill.usageComparison.map((row, idx) => {
              const isRed = row.isExceeded;
              return (
                <View
                  key={idx}
                  style={[
                    styles.tableDataRow,
                    idx === activeBill.usageComparison.length - 1 && { borderBottomWidth: 0 },
                    isRed && styles.tableDataRowExceeded,
                  ]}
                >
                  <Text
                    style={[
                      styles.tableDataCell,
                      { flex: 2.5, fontWeight: isRed ? '700' : '500' },
                      isRed && { color: '#B91C1C' },
                    ]}
                  >
                    {row.item}
                  </Text>
                  <Text
                    style={[
                      styles.tableDataCell,
                      { flex: 1.5, textAlign: 'right', color: '#475569' },
                    ]}
                  >
                    {row.planLimit}
                  </Text>
                  <Text
                    style={[
                      styles.tableDataCell,
                      { flex: 1.5, textAlign: 'right', fontWeight: isRed ? '700' : '500' },
                      isRed && { color: '#DC2626' },
                    ]}
                  >
                    {row.used}
                  </Text>
                  <Text
                    style={[
                      styles.tableDataCell,
                      { flex: 1.5, textAlign: 'right', fontWeight: isRed ? '700' : '500' },
                      isRed && { color: '#DC2626' },
                    ]}
                  >
                    {row.overBy}
                  </Text>
                  <Text
                    style={[
                      styles.tableDataCell,
                      { flex: 2, textAlign: 'right', fontWeight: isRed ? '700' : '500' },
                      isRed && { color: '#DC2626' },
                    ]}
                  >
                    {row.extraCharge}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: ITEMIZED BREAKDOWN */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleGreen}>ITEMIZED BREAKDOWN</Text>
          </View>

          {/* BREAKDOWN TABLE */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: 50 }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>
                CATEGORY / DESCRIPTION
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>
                RECORD TYPE
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>
                AMOUNT (AED)
              </Text>
            </View>

            {activeBill.breakdown.map((row, idx) => (
              <View
                key={row.id}
                style={[
                  styles.tableDataRow,
                  idx === activeBill.breakdown.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={[styles.tableDataCell, { width: 50, color: '#64748B' }]}>
                  {row.id}
                </Text>
                <Text style={[styles.tableDataCell, { flex: 3, fontWeight: '600' }]}>
                  {row.description}
                </Text>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.recordTypeBadge}>
                    <Text style={styles.recordTypeBadgeText}>{row.recordType}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.tableDataCell,
                    { flex: 2, textAlign: 'right', fontWeight: '700', color: '#0F172A' },
                  ]}
                >
                  {row.amount.toFixed(2)}
                </Text>
              </View>
            ))}

            {/* TOTAL FOOTER ROW */}
            <View style={[styles.tableDataRow, styles.totalSummaryRow]}>
              <Text style={[styles.tableDataCell, { width: 50 }]}></Text>
              <Text style={[styles.tableDataCell, { flex: 3, fontWeight: '800', color: '#0F172A' }]}>
                Total Net Payable (incl. VAT)
              </Text>
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.recordTypeBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                  <Text style={[styles.recordTypeBadgeText, { color: '#15803D' }]}>TOTAL</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.tableDataCell,
                  { flex: 2, textAlign: 'right', fontWeight: '800', color: '#047857', fontSize: 15 },
                ]}
              >
                {activeBill.totalBill.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* BOTTOM ACTION BAR / FOOTER */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.viewUsageBtn}
            onPress={handleViewUsageReport}
            activeOpacity={0.85}
          >
            <Text style={styles.viewUsageBtnText}>View Usage Report</Text>
            <View style={styles.newBadgeLight}>
              <Text style={styles.newBadgeTextLight}>NEW</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF PREVIEW MODAL */}
      <Modal
        visible={showPdfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalCard}>
            <View style={styles.pdfModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color="#004D34" />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                    {activeBill.pdfFileName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Official Telecom Tax Invoice Preview
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowPdfModal(false)}
                style={styles.closeCircleBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* MOCK PDF DOCUMENT VIEW */}
            <ScrollView style={{ flex: 1, backgroundColor: '#525659', padding: 20 }}>
              <View style={styles.pdfPaper}>
                {/* PDF Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#004D34', paddingBottom: 16, marginBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#004D34', letterSpacing: 1 }}>
                      {activeBill.telecomProvider.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      Emirates Telecommunications Group Company PJSC
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>TRN: 100024855100003</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>TAX INVOICE</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Invoice: {activeBill.invoiceNumber}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Period: {activeBill.billPeriod}
                    </Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>BILLED TO</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 }}>{activeBill.company}</Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>Attn: {activeBill.employee}</Text>
                    <Text style={{ fontSize: 12, color: '#475569' }}>Mobile: {activeBill.mobileNumber}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 180 }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Total Net Due</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#047857', marginTop: 2 }}>
                      AED {activeBill.totalBill.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#15803D', marginTop: 2 }}>Status: Paid / Invoiced</Text>
                  </View>
                </View>

                {/* PDF Breakdown Items */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Summary of Charges</Text>
                <View style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 8, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' }}>
                    <Text style={{ flex: 3, fontSize: 11, fontWeight: '700', color: '#334155' }}>DESCRIPTION</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'right' }}>AMOUNT (AED)</Text>
                  </View>
                  <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                    <Text style={{ flex: 3, fontSize: 12, color: '#0F172A' }}>Monthly Plan Rental ({activeBill.planName})</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#0F172A', textAlign: 'right' }}>{activeBill.planRental.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                    <Text style={{ flex: 3, fontSize: 12, color: '#DC2626', fontWeight: '600' }}>Usage & Excess Charges (International & Special)</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#DC2626', fontWeight: '700', textAlign: 'right' }}>{activeBill.usageCharges.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                    <Text style={{ flex: 3, fontSize: 12, color: '#0F172A' }}>VAT Amount (5%)</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#0F172A', textAlign: 'right' }}>{activeBill.vatAmount.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#F0FDF4' }}>
                    <Text style={{ flex: 3, fontSize: 13, fontWeight: '800', color: '#166534' }}>Total Payable Amount</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: '#166534', textAlign: 'right' }}>AED {activeBill.totalBill.toFixed(2)}</Text>
                  </View>
                </View>

                {/* PDF Signoff */}
                <View style={{ marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Generated securely via Trakio Telecom Automation</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Page 1 of 1</Text>
                </View>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
              <TouchableOpacity
                onPress={() => setShowPdfModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Close Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  // Top Selector Bar
  topSelectorBar: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginRight: 6,
  },
  billPillBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  billPillBtnActive: {
    backgroundColor: '#004D34',
    borderColor: '#004D34',
  },
  billPillBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  billPillBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Modal Card (Exact match for the screenshot)
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    padding: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBFBF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 5 KPI Row
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiCardTotal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  kpiCardExcess: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiLabelTotal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiLabelExcess: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  kpiValueTotal: {
    fontSize: 21,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 4,
  },
  kpiValueExcess: {
    fontSize: 21,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  kpiNote: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiNoteTotal: {
    fontSize: 11,
    color: '#475569',
  },
  kpiNoteExcess: {
    fontSize: 11,
    color: '#991B1B',
  },

  // Section Generic
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleGreen: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activePillBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  limitExceededPill: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  limitExceededText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },

  // 3x3 Spec Grid
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specBox: {
    width: '32%',
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specBoxHighlightRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  specLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewPdfLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D9488',
    textDecorationLine: 'underline',
  },

  // Badges
  newBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  newBadgeInline: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  newBadgeTextInline: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  newBadgeLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  newBadgeTextLight: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Table Card
  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableDataRowExceeded: {
    backgroundColor: '#FFFBFB',
  },
  tableDataCell: {
    fontSize: 13,
    color: '#1E293B',
  },
  recordTypeBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  recordTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  totalSummaryRow: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 0,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  viewUsageBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  viewUsageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    cursor: 'pointer',
  },
  closeBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },

  // PDF Preview Modal
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pdfModalCard: {
    width: '100%',
    maxWidth: 850,
    height: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pdfPaper: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minHeight: 650,
  },
});
