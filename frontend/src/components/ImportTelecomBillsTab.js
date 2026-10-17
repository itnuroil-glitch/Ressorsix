import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';

// -----------------------------------------------------------------------------
// STATIC DATASET FROM SCREENSHOT REFERENCE (24 NUMBERS)
// -----------------------------------------------------------------------------
const STATIC_IMPORTED_NUMBERS = [
  {
    id: 1,
    number: '0501070455',
    employee: 'Omar Khalid',
    planAed: '200.00',
    billExclVat: '941.70',
    excessAed: '741.70',
    status: 'over_limit',
    statusLabel: 'Over limit',
    department: 'Sales & BD',
    provider: 'e& (Etisalat)',
  },
  {
    id: 2,
    number: '0547499303',
    employee: 'Khalid Hassan',
    planAed: '100.00',
    billExclVat: '124.00',
    excessAed: '24.00',
    status: 'over_limit',
    statusLabel: 'Over limit',
    department: 'Operations',
    provider: 'e& (Etisalat)',
  },
  {
    id: 3,
    number: '0524806401',
    employee: 'Not found',
    planAed: '—',
    billExclVat: '129.65',
    excessAed: '—',
    status: 'not_in_system',
    statusLabel: 'Add connection first',
    department: '—',
    provider: 'e& (Etisalat)',
  },
  {
    id: 4,
    number: '0507385301',
    employee: 'Sara Ali',
    planAed: '100.00',
    billExclVat: '110.41',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Finance',
    provider: 'e& (Etisalat)',
  },
  {
    id: 5,
    number: '0545829147',
    employee: 'Rami Saleh',
    planAed: '200.00',
    billExclVat: '198.60',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Logistics',
    provider: 'e& (Etisalat)',
  },
  // Additional matched numbers completing the 24 count
  {
    id: 6,
    number: '0503051035',
    employee: 'Navaneetha Krishnan',
    planAed: '100.00',
    billExclVat: '98.50',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Management',
    provider: 'e& (Etisalat)',
  },
  {
    id: 7,
    number: '0554412722',
    employee: 'Abdullah Al-Zaabi',
    planAed: '150.00',
    billExclVat: '142.10',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Procurement',
    provider: 'e& (Etisalat)',
  },
  {
    id: 8,
    number: '0568421267',
    employee: 'Mansoor Tareq',
    planAed: '200.00',
    billExclVat: '185.00',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'IT Infrastructure',
    provider: 'e& (Etisalat)',
  },
  {
    id: 9,
    number: '0523909665',
    employee: 'Farooq Azam',
    planAed: '150.00',
    billExclVat: '136.20',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Warehouse',
    provider: 'e& (Etisalat)',
  },
  {
    id: 10,
    number: '0559742427',
    employee: 'Mustafa Kamal',
    planAed: '100.00',
    billExclVat: '89.90',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Transport',
    provider: 'e& (Etisalat)',
  },
  {
    id: 11,
    number: '0502728659',
    employee: 'Hamad Rashid',
    planAed: '200.00',
    billExclVat: '195.40',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Corporate Affairs',
    provider: 'e& (Etisalat)',
  },
  {
    id: 12,
    number: '0502834282',
    employee: 'Zubair Ahmed',
    planAed: '100.00',
    billExclVat: '104.50',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Quality Assurance',
    provider: 'e& (Etisalat)',
  },
  {
    id: 13,
    number: '0542172643',
    employee: 'Bilal Saeed',
    planAed: '150.00',
    billExclVat: '145.00',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Security',
    provider: 'e& (Etisalat)',
  },
  {
    id: 14,
    number: '0524399757',
    employee: 'Ibrahim Al-Nuaimi',
    planAed: '100.00',
    billExclVat: '94.80',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Maintenance',
    provider: 'e& (Etisalat)',
  },
  {
    id: 15,
    number: '0556921813',
    employee: 'Salem Khalfan',
    planAed: '100.00',
    billExclVat: '99.20',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'HR Support',
    provider: 'e& (Etisalat)',
  },
  {
    id: 16,
    number: '0567764865',
    employee: 'Youssef Adel',
    planAed: '150.00',
    billExclVat: '125.75',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Engineering',
    provider: 'e& (Etisalat)',
  },
  {
    id: 17,
    number: '0541663464',
    employee: 'Ali Al-Maktoum',
    planAed: '100.00',
    billExclVat: '88.00',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Executive Office',
    provider: 'e& (Etisalat)',
  },
  {
    id: 18,
    number: '0507465628',
    employee: 'Zainab Hameed',
    planAed: '200.00',
    billExclVat: '180.20',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Customer Care',
    provider: 'e& (Etisalat)',
  },
  {
    id: 19,
    number: '0561104571',
    employee: 'Kareem Jamil',
    planAed: '100.00',
    billExclVat: '91.40',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Field Sales',
    provider: 'e& (Etisalat)',
  },
  {
    id: 20,
    number: '0558781481',
    employee: 'Tariq Mahmoud',
    planAed: '150.00',
    billExclVat: '140.00',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Legal',
    provider: 'e& (Etisalat)',
  },
  {
    id: 21,
    number: '0503508296',
    employee: 'Hassan Nasser',
    planAed: '100.00',
    billExclVat: '85.60',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Procurement',
    provider: 'e& (Etisalat)',
  },
  {
    id: 22,
    number: '0509904583',
    employee: 'Amira Sultan',
    planAed: '200.00',
    billExclVat: '190.00',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Marketing',
    provider: 'e& (Etisalat)',
  },
  {
    id: 23,
    number: '0552282213',
    employee: 'Majid Al-Falasi',
    planAed: '100.00',
    billExclVat: '97.80',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Admin',
    provider: 'e& (Etisalat)',
  },
  {
    id: 24,
    number: '0502377134',
    employee: 'Sultan Al-Shamsi',
    planAed: '150.00',
    billExclVat: '148.90',
    excessAed: '—',
    status: 'within_limit',
    statusLabel: 'Within limit',
    department: 'Operations',
    provider: 'e& (Etisalat)',
  },
];

export default function ImportTelecomBillsTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLarge = width > 768;

  // Wizard state: 1 = Scope Configuration, 2 = File Upload & Import
  const [wizardStep, setWizardStep] = useState(2);

  // Configuration scope state
  const [selectedClient, setSelectedClient] = useState('Krish');
  const [selectedCompany, setSelectedCompany] = useState('Nuragro FZE');
  const [selectedProvider, setSelectedProvider] = useState('e& (Etisalat)');
  const [selectedService, setSelectedService] = useState('SIM');
  const [selectedMonth, setSelectedMonth] = useState('Sep 2026');

  // File preview & data state
  const [uploadedFileName, setUploadedFileName] = useState('1791033502808_Sep2026.pdf');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'over_limit', 'not_in_system', 'within_limit'
  const [rowsToShow, setRowsToShow] = useState(5); // Default 5 matching screenshot, expandable to 24
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filtered dataset
  const filteredNumbers = useMemo(() => {
    return STATIC_IMPORTED_NUMBERS.filter((item) => {
      // Tab filter
      if (filterTab !== 'all' && item.status !== filterTab) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.number.toLowerCase().includes(q) ||
          item.employee.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterTab, searchQuery]);

  // Display subset based on rowsToShow
  const displayedNumbers = useMemo(() => {
    return filteredNumbers.slice(0, rowsToShow);
  }, [filteredNumbers, rowsToShow]);

  // Metrics count
  const metrics = useMemo(() => {
    const total = STATIC_IMPORTED_NUMBERS.length; // 24
    const matched = STATIC_IMPORTED_NUMBERS.filter((n) => n.status !== 'not_in_system').length; // 23
    const overLimit = STATIC_IMPORTED_NUMBERS.filter((n) => n.status === 'over_limit').length; // 2
    const notInSystem = STATIC_IMPORTED_NUMBERS.filter((n) => n.status === 'not_in_system').length; // 1
    return { total, matched, overLimit, notInSystem };
  }, []);

  // Complete and save handler
  const handleCompleteAndSave = () => {
    setSavedSuccess(true);
    if (showToast) {
      showToast('Successfully imported and saved monthly usage report for 23 matched numbers.', 'success');
    }
  };

  // Reset to initial
  const handleReset = () => {
    setWizardStep(2);
    setSearchQuery('');
    setFilterTab('all');
    setRowsToShow(5);
    setSavedSuccess(false);
    if (showToast) showToast('Reset import view to default.', 'info');
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = STATIC_IMPORTED_NUMBERS.map((r, i) => ({
        '#': i + 1,
        'Number': r.number,
        'Employee': r.employee,
        'Plan (AED)': r.planAed,
        'Bill Excl. VAT (AED)': r.billExclVat,
        'Excess (AED)': r.excessAed,
        'Result': r.statusLabel,
        'Department': r.department,
        'Provider': r.provider,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Imported Telecom Bills');
      XLSX.writeFile(wb, `Imported_Telecom_Bills_${selectedMonth.replace(' ', '_')}.xlsx`);
      if (showToast) showToast('Exported table data to Excel successfully!', 'success');
    } catch (e) {
      console.error(e);
      if (showToast) showToast('Failed to export to Excel.', 'error');
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* TOP BAR / BREADCRUMB IDENTICAL TO PROTOTYPE SCREENSHOT */}
      <View style={styles.topStageBar}>
        <View style={styles.topStageLeft}>
          <Text style={styles.topStageTitle}>4. Import monthly bills</Text>
        </View>
        <View style={styles.topStageRight}>
          <TouchableOpacity
            style={styles.stageIconBtn}
            onPress={() => setIsFullscreen(!isFullscreen)}
            title="Toggle fullscreen"
          >
            <Ionicons name={isFullscreen ? 'contract-outline' : 'expand-outline'} size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stageIconBtn}
            onPress={handleExportExcel}
            title="Export Excel"
          >
            <Ionicons name="download-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.nextStepGhost}>
            <Text style={styles.nextStepGhostText}>5. Bill...</Text>
          </View>
        </View>
      </View>

      {/* MAIN MODAL / CONTAINER CARD (EXACT REPLICA OF SCREENSHOT) */}
      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={[
          styles.scrollContent,
          isFullscreen && { padding: 8, maxWidth: '100%' },
        ]}
      >
        <View style={[styles.mainCard, isFullscreen && { maxWidth: '100%', borderRadius: 12 }]}>
          {/* MODAL HEADER */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.cloudIconCircle}>
                <Ionicons name="cloud-upload-outline" size={24} color="#004D34" />
              </View>
              <View>
                <Text style={styles.modalHeading}>Import Telecom Bills</Text>
                <Text style={styles.modalSubheading}>
                  Upload monthly Etisalat or du bills for SIM, internet or landline
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeIconCircle} onPress={handleReset}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* STEPPER BAR */}
          <View style={styles.stepperContainer}>
            {/* STEP 1 */}
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => setWizardStep(1)}
              activeOpacity={0.7}
            >
              <View style={[styles.stepCircle, wizardStep === 1 ? styles.stepCircleActive : styles.stepCircleDone]}>
                {wizardStep > 1 ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepCircleNumber}>1</Text>
                )}
              </View>
              <View>
                <Text style={[styles.stepSubText, wizardStep === 1 && styles.stepSubTextActive]}>STEP 1</Text>
                <Text style={[styles.stepMainText, wizardStep === 1 && styles.stepMainTextActive]}>
                  Scope Configuration
                </Text>
              </View>
            </TouchableOpacity>

            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={styles.stepDivider} />

            {/* STEP 2 */}
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => setWizardStep(2)}
              activeOpacity={0.7}
            >
              <View style={[styles.stepCircle, wizardStep === 2 ? styles.stepCircleActive : styles.stepCircleInactive]}>
                <Text style={[styles.stepCircleNumber, wizardStep === 2 && styles.stepCircleNumberActive]}>2</Text>
              </View>
              <View>
                <Text style={[styles.stepSubText, wizardStep === 2 && styles.stepSubTextActive]}>STEP 2</Text>
                <Text style={[styles.stepMainText, wizardStep === 2 && styles.stepMainTextActive]}>
                  File Upload & Import
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ------------------------------------------------------------- */}
          {/* STEP 1 VIEW: SCOPE CONFIGURATION                              */}
          {/* ------------------------------------------------------------- */}
          {wizardStep === 1 && (
            <View style={styles.step1Container}>
              <Text style={styles.step1Title}>Configure Import Parameters</Text>
              <Text style={styles.step1Subtitle}>
                Select the target company, telecom service provider, and billing period before uploading the monthly statement.
              </Text>

              <View style={styles.formGrid}>
                {/* Client Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>CLIENT *</Text>
                  <View style={styles.staticInputBox}>
                    <Ionicons name="person-circle-outline" size={18} color="#004D34" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.staticInput}
                      value={selectedClient}
                      onChangeText={setSelectedClient}
                      placeholder="e.g. Krish"
                    />
                  </View>
                </View>

                {/* Company Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>COMPANY *</Text>
                  <View style={styles.staticInputBox}>
                    <Ionicons name="business-outline" size={18} color="#004D34" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.staticInput}
                      value={selectedCompany}
                      onChangeText={setSelectedCompany}
                      placeholder="e.g. Nuragro FZE"
                    />
                  </View>
                </View>

                {/* Telecom Provider */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>TELECOM PROVIDER *</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {['e& (Etisalat)', 'du'].map((prov) => (
                      <TouchableOpacity
                        key={prov}
                        style={[
                          styles.toggleSelectBtn,
                          selectedProvider === prov && styles.toggleSelectBtnActive,
                        ]}
                        onPress={() => setSelectedProvider(prov)}
                      >
                        <Ionicons
                          name={selectedProvider === prov ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={selectedProvider === prov ? '#004D34' : '#94A3B8'}
                        />
                        <Text
                          style={[
                            styles.toggleSelectText,
                            selectedProvider === prov && styles.toggleSelectTextActive,
                          ]}
                        >
                          {prov}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Connection Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>CONNECTION TYPE *</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['SIM', 'Internet', 'Landline'].map((svc) => (
                      <TouchableOpacity
                        key={svc}
                        style={[
                          styles.toggleSelectBtn,
                          selectedService === svc && styles.toggleSelectBtnActive,
                        ]}
                        onPress={() => setSelectedService(svc)}
                      >
                        <Text
                          style={[
                            styles.toggleSelectText,
                            selectedService === svc && styles.toggleSelectTextActive,
                          ]}
                        >
                          {svc}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Billing Month */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>BILLING MONTH *</Text>
                  <View style={styles.staticInputBox}>
                    <Ionicons name="calendar-outline" size={18} color="#004D34" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.staticInput}
                      value={selectedMonth}
                      onChangeText={setSelectedMonth}
                      placeholder="e.g. Sep 2026"
                    />
                  </View>
                </View>
              </View>

              {/* STEP 1 ACTIONS */}
              <View style={styles.step1Footer}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleReset}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.proceedBtn}
                  onPress={() => setWizardStep(2)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.proceedBtnText}>Next Step</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2 VIEW: FILE UPLOAD & IMPORT SCREENSHOT REPLICA         */}
          {/* ------------------------------------------------------------- */}
          {wizardStep === 2 && (
            <View style={styles.step2Container}>
              {/* ACTIVE CONFIGURATION SCOPE BANNER */}
              <View style={styles.scopeBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scopeBannerHeading}>ACTIVE CONFIGURATION SCOPE</Text>
                  <View style={styles.scopeBadgesRow}>
                    <View style={styles.scopePill}>
                      <Text style={styles.scopePillText}>{selectedClient}</Text>
                    </View>

                    <Text style={styles.scopeArrow}>→</Text>

                    <View style={styles.scopePill}>
                      <Text style={styles.scopePillText}>{selectedCompany}</Text>
                    </View>

                    <View style={styles.scopePill}>
                      <Text style={styles.scopePillText}>{selectedProvider}</Text>
                    </View>

                    <View style={styles.scopePill}>
                      <Text style={styles.scopePillText}>{selectedService}</Text>
                      <View style={styles.newBadgePill}>
                        <Text style={styles.newBadgePillText}>NEW</Text>
                      </View>
                    </View>

                    <View style={styles.scopePill}>
                      <Text style={styles.scopePillText}>{selectedMonth}</Text>
                      <View style={styles.newBadgePill}>
                        <Text style={styles.newBadgePillText}>NEW</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.changeScopeBtn}
                  onPress={() => setWizardStep(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeScopeBtnText}>Change Scope</Text>
                </TouchableOpacity>
              </View>

              {/* DASHED GREEN FILE PREVIEW CARD */}
              <View style={styles.filePreviewCard}>
                <View style={styles.fileInfoLeft}>
                  {/* RED PDF BADGE */}
                  <View style={styles.pdfBadgeSquare}>
                    <Text style={styles.pdfBadgeSquareText}>PDF</Text>
                  </View>

                  <View>
                    <Text style={styles.fileNameText}>{uploadedFileName}</Text>
                    <Text style={styles.fileSubText}>
                      Read successfully · {STATIC_IMPORTED_NUMBERS.length} numbers found
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.chooseFileBtn}
                  onPress={() => {
                    const altNames = [
                      '1791033502808_Sep2026.pdf',
                      'Etisalat_Corp_Invoice_Sep2026.pdf',
                      'Du_Telecommunications_Sep2026.xlsx',
                    ];
                    const next = altNames[(altNames.indexOf(uploadedFileName) + 1) % altNames.length];
                    setUploadedFileName(next);
                    if (showToast) showToast(`Loaded file: ${next}`, 'info');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chooseFileBtnText}>Choose another file</Text>
                </TouchableOpacity>
              </View>

              {/* 4 SUMMARY METRIC CARDS ROW */}
              <View style={styles.metricsRow}>
                {/* Card 1: Numbers on Bill */}
                <TouchableOpacity
                  style={[styles.metricCard, filterTab === 'all' && styles.metricCardSelected]}
                  onPress={() => setFilterTab('all')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.metricCardLabel}>NUMBERS ON BILL</Text>
                  <Text style={styles.metricCardValueDark}>{metrics.total}</Text>
                </TouchableOpacity>

                {/* Card 2: Matched to System */}
                <TouchableOpacity
                  style={[styles.metricCard, filterTab === 'within_limit' && styles.metricCardSelected]}
                  onPress={() => setFilterTab('within_limit')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.metricCardLabel}>MATCHED TO SYSTEM</Text>
                  <Text style={styles.metricCardValueGreen}>{metrics.matched}</Text>
                </TouchableOpacity>

                {/* Card 3: Over Plan Amount */}
                <TouchableOpacity
                  style={[
                    styles.metricCard,
                    styles.metricCardRed,
                    filterTab === 'over_limit' && styles.metricCardSelectedRed,
                  ]}
                  onPress={() => setFilterTab('over_limit')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.metricCardLabel, { color: '#B91C1C' }]}>OVER PLAN AMOUNT</Text>
                  <Text style={styles.metricCardValueRed}>{metrics.overLimit}</Text>
                </TouchableOpacity>

                {/* Card 4: Not in System */}
                <TouchableOpacity
                  style={[
                    styles.metricCard,
                    styles.metricCardYellow,
                    filterTab === 'not_in_system' && styles.metricCardSelectedYellow,
                  ]}
                  onPress={() => setFilterTab('not_in_system')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.metricCardLabel, { color: '#B45309' }]}>NOT IN SYSTEM</Text>
                  <Text style={styles.metricCardValueAmber}>{metrics.notInSystem}</Text>
                </TouchableOpacity>
              </View>

              {/* INTERACTIVE FILTER & SEARCH TOOLBAR */}
              <View style={styles.tableFilterBar}>
                <View style={styles.searchBoxWrap}>
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by number, employee, or department..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.tabFilterPills}>
                  {[
                    { key: 'all', label: `All (${STATIC_IMPORTED_NUMBERS.length})` },
                    { key: 'over_limit', label: `Over limit (${metrics.overLimit})` },
                    { key: 'not_in_system', label: `Not in system (${metrics.notInSystem})` },
                    { key: 'within_limit', label: `Within limit (${STATIC_IMPORTED_NUMBERS.filter(n => n.status === 'within_limit').length})` },
                  ].map((tb) => (
                    <TouchableOpacity
                      key={tb.key}
                      style={[styles.filterPillBtn, filterTab === tb.key && styles.filterPillBtnActive]}
                      onPress={() => setFilterTab(tb.key)}
                    >
                      <Text style={[styles.filterPillText, filterTab === tb.key && styles.filterPillTextActive]}>
                        {tb.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* DATA TABLE (MATCHING SCREENSHOT WITH HIGH FIDELITY) */}
              <View style={styles.tableContainer}>
                {/* TABLE HEADER */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { flex: 1.4 }]}>NUMBER</Text>
                  <Text style={[styles.thCell, { flex: 1.8 }]}>EMPLOYEE</Text>
                  <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>PLAN (AED)</Text>
                  <Text style={[styles.thCell, { flex: 1.4, textAlign: 'right' }]}>BILL EXCL. VAT</Text>
                  <Text style={[styles.thCell, { flex: 1.4, textAlign: 'right' }]}>EXCESS (AED)</Text>
                  <Text style={[styles.thCell, { flex: 1.6, textAlign: 'center' }]}>RESULT</Text>
                </View>

                {/* TABLE ROWS */}
                {displayedNumbers.map((row, index) => {
                  const isOverLimit = row.status === 'over_limit';
                  const isNotInSystem = row.status === 'not_in_system';
                  const isWithinLimit = row.status === 'within_limit';

                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.tableDataRow,
                        isNotInSystem && { backgroundColor: '#FFFDF5' },
                      ]}
                    >
                      {/* NUMBER */}
                      <View style={{ flex: 1.4 }}>
                        <Text style={[styles.tdNumberText, isOverLimit && styles.tdNumberTextRed]}>
                          {row.number}
                        </Text>
                      </View>

                      {/* EMPLOYEE */}
                      <View style={{ flex: 1.8 }}>
                        <Text
                          style={[
                            styles.tdEmployeeText,
                            isNotInSystem && styles.tdEmployeeNotFound,
                          ]}
                        >
                          {row.employee}
                        </Text>
                      </View>

                      {/* PLAN (AED) */}
                      <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                        <Text style={styles.tdNumericText}>{row.planAed}</Text>
                      </View>

                      {/* BILL EXCL. VAT */}
                      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                        <Text style={styles.tdNumericText}>{row.billExclVat}</Text>
                      </View>

                      {/* EXCESS (AED) */}
                      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.tdNumericText,
                            isOverLimit && styles.tdExcessTextRed,
                          ]}
                        >
                          {row.excessAed}
                        </Text>
                      </View>

                      {/* RESULT PILL */}
                      <View style={{ flex: 1.6, alignItems: 'center' }}>
                        {isOverLimit && (
                          <View style={styles.badgeOverLimit}>
                            <Text style={styles.badgeOverLimitText}>Over limit</Text>
                          </View>
                        )}
                        {isNotInSystem && (
                          <View style={styles.badgeAddConnection}>
                            <Text style={styles.badgeAddConnectionText}>Add connection first</Text>
                          </View>
                        )}
                        {isWithinLimit && (
                          <View style={styles.badgeWithinLimit}>
                            <Text style={styles.badgeWithinLimitText}>Within limit</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* FOOTER NOTICE / MARGIN ALLOWED CAPTION */}
              <View style={styles.footerNoticeRow}>
                <Text style={styles.footerNoticeText}>
                  Showing <Text style={{ fontWeight: '700' }}>{displayedNumbers.length}</Text> of{' '}
                  <Text style={{ fontWeight: '700' }}>{filteredNumbers.length}</Text>{' '}
                  <Text style={{ marginHorizontal: 8 }}>·</Text> AED 10 margin allowed before a bill counts as excess{' '}
                  <Text style={{ marginHorizontal: 8 }}>·</Text> On save, a monthly usage report is created for all 23 matched numbers
                </Text>

                {/* SHOW MORE / SHOW 5 TOGGLE */}
                {filteredNumbers.length > 5 && (
                  <TouchableOpacity
                    style={styles.expandToggleBtn}
                    onPress={() => setRowsToShow(rowsToShow === 5 ? filteredNumbers.length : 5)}
                  >
                    <Text style={styles.expandToggleBtnText}>
                      {rowsToShow === 5 ? `Show all ${filteredNumbers.length} numbers` : 'Show 5 only'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* SAVED SUCCESS BANNER */}
              {savedSuccess && (
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                  <Text style={styles.successBannerText}>
                    Monthly bills successfully processed and saved! 23 matched reports generated for {selectedCompany}.
                  </Text>
                </View>
              )}

              {/* MODAL BOTTOM ACTION BUTTONS */}
              <View style={styles.modalBottomActions}>
                {/* Back to Config */}
                <TouchableOpacity
                  style={styles.backToConfigBtn}
                  onPress={() => setWizardStep(1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.backToConfigBtnText}>← Back to Config</Text>
                </TouchableOpacity>

                {/* Right: Cancel & Complete & Save */}
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleReset}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.completeSaveBtn, savedSuccess && { backgroundColor: '#15803D' }]}
                    onPress={handleCompleteAndSave}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={savedSuccess ? 'checkmark-circle' : 'cloud-upload'}
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.completeSaveBtnText}>
                      {savedSuccess ? 'Saved Successfully' : 'Complete & Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------------------------------
// STYLESHEET MATCHING THE SCREENSHOT EXACTLY
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#1E232A', // Dark stylish backdrop matching mockup screenshot
  },
  topStageBar: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
    backgroundColor: '#1A202C',
  },
  topStageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topStageTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  topStageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D3748',
  },
  nextStepGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A5568',
    marginLeft: 8,
  },
  nextStepGhostText: {
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '500',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: 960,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8,
    overflow: 'hidden',
  },

  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cloudIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubheading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stepper Bar
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#004D34',
  },
  stepCircleDone: {
    backgroundColor: '#004D34',
  },
  stepCircleInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepCircleNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepCircleNumberActive: {
    color: '#FFFFFF',
  },
  stepSubText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  stepSubTextActive: {
    color: '#004D34',
  },
  stepMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepMainTextActive: {
    color: '#0F172A',
  },
  stepDivider: {
    marginHorizontal: 16,
  },

  // Step 1 Container
  step1Container: {
    padding: 24,
  },
  step1Title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  step1Subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  formGrid: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  staticInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  staticInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    outlineStyle: 'none',
  },
  toggleSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  toggleSelectBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#004D34',
  },
  toggleSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleSelectTextActive: {
    color: '#004D34',
    fontWeight: '700',
  },
  step1Footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004D34',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  proceedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Step 2 Container
  step2Container: {
    padding: 24,
  },

  // Scope Banner
  scopeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2FAF6',
    borderWidth: 1,
    borderColor: '#BBE9D7',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 16,
  },
  scopeBannerHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004D34',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  scopeBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scopePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  scopeArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: '#004D34',
    marginHorizontal: 2,
  },
  newBadgePill: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4338CA',
  },
  changeScopeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#004D34',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  changeScopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#004D34',
  },

  // Dashed File Preview Card
  filePreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#059669',
    backgroundColor: '#F8FCFA',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 16,
  },
  fileInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pdfBadgeSquare: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfBadgeSquareText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fileSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chooseFileBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chooseFileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // 4 Metric Summary Cards Row
  metricsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricCardSelected: {
    borderColor: '#004D34',
    borderWidth: 1.5,
  },
  metricCardRed: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
  },
  metricCardSelectedRed: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },
  metricCardYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  metricCardSelectedYellow: {
    borderColor: '#D97706',
    borderWidth: 1.5,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricCardValueDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricCardValueGreen: {
    fontSize: 26,
    fontWeight: '800',
    color: '#059669',
  },
  metricCardValueRed: {
    fontSize: 26,
    fontWeight: '800',
    color: '#DC2626',
  },
  metricCardValueAmber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#D97706',
  },

  // Filter Toolbar
  tableFilterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    flex: 1,
    minWidth: 260,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  tabFilterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterPillBtnActive: {
    backgroundColor: '#004D34',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Table Container
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tdNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  tdNumberTextRed: {
    color: '#DC2626',
    fontWeight: '800',
  },
  tdEmployeeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  tdEmployeeNotFound: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  tdNumericText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  tdExcessTextRed: {
    color: '#DC2626',
    fontWeight: '800',
  },

  // Result Badges
  badgeOverLimit: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOverLimitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  badgeAddConnection: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAddConnectionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  badgeWithinLimit: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeWithinLimitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },

  // Footer Notice
  footerNoticeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  footerNoticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  expandToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginLeft: 12,
  },
  expandToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004D34',
  },

  // Success Banner
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },

  // Bottom Actions
  modalBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  backToConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backToConfigBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  completeSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004D34',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  completeSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
