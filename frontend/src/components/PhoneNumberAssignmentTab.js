import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { SHADOWS } from '../theme';
import {
  INITIAL_PHONE_ASSIGNMENTS,
  STATIC_ASSIGNMENT_STATUSES,
  STATIC_HOLDER_TYPES,
  STATIC_PROVIDERS,
  STATIC_COMPANIES,
} from './phoneNumberAssignmentData';

// Theme tokens matching the enterprise aesthetic
const THEME = {
  primary: '#166534',         // Forest Green matching corporate assignment standard
  primaryLight: '#ECFDF5',
  primaryBorder: '#A7F3D0',
  primaryHover: '#0E5434',

  accent: '#F59E0B',          // Amber
  accentLight: '#FEF3C7',
  accentBorder: '#FDE68A',

  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',

  success: '#059669',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',

  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#2563EB',
  infoLight: '#EFF6FF',
  infoBorder: '#BFDBFE',

  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
};

export default function PhoneNumberAssignmentTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;

  const STORAGE_KEY = 'trakio_phone_number_assignments_user_data_v1';

  // Local State: starts empty and only shows when user adds new data
  const [assignments, setAssignments] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading assignments from localStorage:', e);
    }
    return [];
  });

  // Persist assignments to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
      }
    } catch (e) {
      console.warn('Error saving assignments to localStorage:', e);
    }
  }, [assignments]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedHolderType, setSelectedHolderType] = useState('All Types');
  const [selectedProvider, setSelectedProvider] = useState('All Providers');
  const [selectedCompany, setSelectedCompany] = useState('All Companies');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Selected Item
  const [activeItem, setActiveItem] = useState(null);

  // Form State for Add / Edit
  const defaultFormState = {
    id: '',
    phoneNumber: '',
    iccid: '',
    accountNumber: '',
    provider: 'e& (Etisalat)',
    company: 'ASAS Gen Tr LLC',
    connectionType: 'Mobile Voice & Data',
    planName: 'Standard 100 AED Plan',
    holderType: 'Employee',
    holderName: '',
    employeeId: '',
    department: '',
    designation: '',
    workEmail: '',
    assignedDevice: 'SIM Only',
    assignedDate: new Date().toISOString().split('T')[0],
    monthlyLimitAED: '150',
    authorizedBy: 'Operations Manager',
    handoverCondition: 'Good Working Condition',
    handoverNotes: '',
    acknowledgmentSigned: true,
    status: 'Assigned'
  };

  const [formData, setFormData] = useState(defaultFormState);

  // Reassignment Form State
  const [reassignData, setReassignData] = useState({
    newHolderType: 'Employee',
    newHolderName: '',
    newEmployeeId: '',
    newDepartment: '',
    newDesignation: '',
    newAssignedDevice: '',
    transferDate: new Date().toISOString().split('T')[0],
    transferReason: ''
  });

  // Return Form State
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    returnCondition: 'Hardware Returned in Good Condition',
    returnReason: 'Employee Exit / Device Handover',
    returnToSparePool: true
  });

  // ---------------------------------------------------------------------------
  // FILTERING & SEARCH
  // ---------------------------------------------------------------------------
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const matchSearch =
        !searchTerm.trim() ||
        (item.phoneNumber && item.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.iccid && item.iccid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.holderName && item.holderName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.employeeId && item.employeeId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.department && item.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.designation && item.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.assignedDevice && item.assignedDevice.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.company && item.company.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = selectedStatus === 'All Statuses' || item.status === selectedStatus;
      const matchHolderType = selectedHolderType === 'All Types' || item.holderType === selectedHolderType;
      const matchProvider = selectedProvider === 'All Providers' || item.provider === selectedProvider;
      const matchCompany = selectedCompany === 'All Companies' || item.company === selectedCompany;

      return matchSearch && matchStatus && matchHolderType && matchProvider && matchCompany;
    });
  }, [assignments, searchTerm, selectedStatus, selectedHolderType, selectedProvider, selectedCompany]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage]);

  // ---------------------------------------------------------------------------
  // KPI CALCULATIONS
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter(a => a.status === 'Assigned').length;
    const available = assignments.filter(a => a.status === 'Available (Spare)').length;
    const returned = assignments.filter(a => a.status === 'Returned' || a.status === 'Suspended').length;

    return {
      total,
      active,
      available,
      returned
    };
  }, [assignments]);

  // ---------------------------------------------------------------------------
  // CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setFormData({
      ...defaultFormState,
      id: `PNA-${1000 + assignments.length + 1}`
    });
    setActiveItem(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setActiveItem(item);
    setFormData({
      ...item,
      monthlyLimitAED: String(item.monthlyLimitAED || '150')
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!formData.phoneNumber.trim()) {
      if (showToast) showToast('Phone Number is required', 'error');
      return;
    }
    if (!formData.holderName.trim()) {
      if (showToast) showToast('Holder / Assignee Name is required', 'error');
      return;
    }

    if (activeItem) {
      // Edit existing
      setAssignments(prev =>
        prev.map(a =>
          a.id === activeItem.id
            ? {
                ...a,
                ...formData,
                monthlyLimitAED: parseFloat(formData.monthlyLimitAED) || 0
              }
            : a
        )
      );
      if (showToast) showToast(`Assignment for ${formData.phoneNumber} updated!`, 'success');
    } else {
      // Add new
      const newEntry = {
        ...formData,
        id: formData.id || `PNA-${1000 + assignments.length + 1}`,
        monthlyLimitAED: parseFloat(formData.monthlyLimitAED) || 0
      };
      setAssignments([newEntry, ...assignments]);
      if (showToast) showToast(`Phone ${newEntry.phoneNumber} assigned to ${newEntry.holderName}!`, 'success');
    }

    setIsAddEditModalOpen(false);
  };

  const handleOpenReassign = (item) => {
    setActiveItem(item);
    setReassignData({
      newHolderType: 'Employee',
      newHolderName: '',
      newEmployeeId: '',
      newDepartment: '',
      newDesignation: '',
      newAssignedDevice: item.assignedDevice || 'SIM Only',
      transferDate: new Date().toISOString().split('T')[0],
      transferReason: 'Inter-department line reallocation'
    });
    setIsReassignModalOpen(true);
  };

  const handleSaveReassignment = () => {
    if (!reassignData.newHolderName.trim()) {
      if (showToast) showToast('New Holder Name is required', 'error');
      return;
    }

    setAssignments(prev =>
      prev.map(a =>
        a.id === activeItem.id
          ? {
              ...a,
              holderType: reassignData.newHolderType,
              holderName: reassignData.newHolderName,
              employeeId: reassignData.newEmployeeId,
              department: reassignData.newDepartment,
              designation: reassignData.newDesignation,
              assignedDevice: reassignData.newAssignedDevice,
              assignedDate: reassignData.transferDate,
              handoverNotes: `Transferred from ${activeItem.holderName} on ${reassignData.transferDate}. Reason: ${reassignData.transferReason}`,
              status: 'Assigned'
            }
          : a
      )
    );

    if (showToast) showToast(`Line ${activeItem.phoneNumber} transferred to ${reassignData.newHolderName}!`, 'success');
    setIsReassignModalOpen(false);
  };

  const handleOpenReturn = (item) => {
    setActiveItem(item);
    setReturnData({
      returnDate: new Date().toISOString().split('T')[0],
      returnCondition: 'Hardware Returned in Good Working Condition',
      returnReason: 'Employee Clearance / Project Completion',
      returnToSparePool: true
    });
    setIsReturnModalOpen(true);
  };

  const handleSaveReturn = () => {
    setAssignments(prev =>
      prev.map(a =>
        a.id === activeItem.id
          ? {
              ...a,
              status: returnData.returnToSparePool ? 'Available (Spare)' : 'Returned',
              holderName: returnData.returnToSparePool ? `Spare IT Reserve (${a.phoneNumber})` : `${a.holderName} (Returned)`,
              holderType: returnData.returnToSparePool ? 'Spare Pool' : a.holderType,
              handoverNotes: `Returned on ${returnData.returnDate}. Condition: ${returnData.returnCondition}. Note: ${returnData.returnReason}`
            }
          : a
      )
    );

    if (showToast) showToast(`Phone ${activeItem.phoneNumber} checked in & de-assigned!`, 'info');
    setIsReturnModalOpen(false);
  };

  const handleDelete = () => {
    if (!activeItem) return;
    setAssignments(prev => prev.filter(a => a.id !== activeItem.id));
    if (showToast) showToast(`Assignment record for ${activeItem.phoneNumber} deleted!`, 'info');
    setIsDeleteModalOpen(false);
    setActiveItem(null);
  };

  // ---------------------------------------------------------------------------
  // EXPORT TO EXCEL
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    try {
      const exportData = filteredAssignments.map((a, idx) => ({
        'S.No': idx + 1,
        'Assignment ID': a.id,
        'Phone Number': a.phoneNumber,
        'SIM ICCID': a.iccid || 'N/A',
        'Provider': a.provider,
        'Company': a.company,
        'Assignee Name': a.holderName,
        'Assignee Type': a.holderType,
        'Employee ID': a.employeeId || 'N/A',
        'Department': a.department,
        'Designation': a.designation || 'N/A',
        'Work Email': a.workEmail || 'N/A',
        'Assigned Handset': a.assignedDevice,
        'Assignment Date': a.assignedDate,
        'Usage Cap (AED)': a.monthlyLimitAED,
        'Authorized By': a.authorizedBy,
        'Status': a.status,
        'Handover Notes': a.handoverNotes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Phone_Assignments');
      XLSX.writeFile(wb, `Phone_Number_Assignments_${new Date().toISOString().slice(0, 10)}.xlsx`);

      if (showToast) showToast('Phone Number Assignments exported to Excel!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      if (showToast) showToast('Failed to export Excel file', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // BADGES & HELPERS
  // ---------------------------------------------------------------------------
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Assigned':
        return { bg: THEME.successLight, text: THEME.success, border: THEME.successBorder, label: 'Assigned' };
      case 'Available (Spare)':
        return { bg: THEME.infoLight, text: THEME.info, border: THEME.infoBorder, label: 'Available (Spare)' };
      case 'Returned':
        return { bg: THEME.slate100, text: THEME.slate600, border: THEME.slate200, label: 'Returned' };
      case 'Suspended':
        return { bg: THEME.dangerLight, text: THEME.danger, border: THEME.dangerBorder, label: 'Suspended' };
      default:
        return { bg: THEME.slate100, text: THEME.slate700, border: THEME.slate200, label: status || 'Active' };
    }
  };

  const getHolderIcon = (type) => {
    switch (type) {
      case 'Employee':
        return 'person-circle-outline';
      case 'Asset / Vehicle':
        return 'car-sport-outline';
      case 'Premises / Branch':
        return 'business-outline';
      case 'Spare Pool':
        return 'archive-outline';
      default:
        return 'person-outline';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER                                                            */}
      {/* --------------------------------------------------------------------- */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={styles.titleWithIcon}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="call-outline" size={24} color={THEME.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Phone Number Assignment</Text>
              <Text style={styles.headerSubtitle}>
                Corporate inventory for allocating, transferring & tracking corporate phone numbers and handsets
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleExportExcel} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={17} color={THEME.slate700} />
            <Text style={styles.secondaryBtnText}>Export Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={18} color={THEME.white} />
            <Text style={styles.primaryBtnText}>+ Assign Phone Number</Text>
          </TouchableOpacity>
        </View>
      </View>



      {/* --------------------------------------------------------------------- */}
      {/* DATA TABLE CONTAINER                                                  */}
      {/* --------------------------------------------------------------------- */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableHeaderTitle}>
            Assignment Register ({filteredAssignments.length} records found)
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: 1120 }}>
            {/* Table Header */}
            <View style={styles.gridHeaderRow}>
              <Text style={[styles.th, { width: 150 }]}>PHONE NUMBER</Text>
              <Text style={[styles.th, { width: 130 }]}>PROVIDER</Text>
              <Text style={[styles.th, { width: 250 }]}>ASSIGNED HOLDER / ENTITY</Text>
              <Text style={[styles.th, { width: 220 }]}>LINKED HANDSET / DEVICE</Text>
              <Text style={[styles.th, { width: 120 }]}>ASSIGNED ON</Text>
              <Text style={[styles.th, { width: 130 }]}>STATUS</Text>
              <Text style={[styles.th, { width: 140, textAlign: 'center' }]}>ACTIONS</Text>
            </View>

            {/* Table Rows */}
            {assignments.length === 0 ? (
              <View style={styles.emptyTable}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="call-outline" size={28} color={THEME.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Phone Number Assignments Yet</Text>
                <Text style={styles.emptySub}>
                  Assignments will appear here once you add new records using the button below.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={handleOpenAdd}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={18} color={THEME.white} />
                  <Text style={styles.primaryBtnText}>+ Assign Phone Number</Text>
                </TouchableOpacity>
              </View>
            ) : paginatedData.length === 0 ? (
              <View style={styles.emptyTable}>
                <Ionicons name="search-outline" size={40} color={THEME.slate300} />
                <Text style={styles.emptyTitle}>No Matching Assignments Found</Text>
                <Text style={styles.emptySub}>Try adjusting your search criteria or filter tags.</Text>
              </View>
            ) : (
              paginatedData.map((item, idx) => {
                const badge = getStatusBadge(item.status);
                const isEven = idx % 2 === 0;

                return (
                  <View key={item.id} style={[styles.gridDataRow, isEven ? styles.rowEven : styles.rowOdd]}>
                    {/* Phone Number */}
                    <View style={[{ width: 150 }]}>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveItem(item);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Text style={styles.primaryLinkText}>{item.phoneNumber}</Text>
                        <Text style={styles.subCellText}>{item.iccid ? `SIM: ${item.iccid.slice(-8)}` : 'Non-SIM / Landline'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Provider */}
                    <View style={[{ width: 130 }]}>
                      <View style={styles.providerBadge}>
                        <Text style={styles.providerBadgeText}>{item.provider}</Text>
                      </View>
                      <Text style={styles.subCellText}>{item.connectionType}</Text>
                    </View>

                    {/* Assigned Holder */}
                    <View style={[{ width: 250 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={getHolderIcon(item.holderType)} size={16} color={THEME.primary} />
                        <Text style={[styles.cellText, { fontWeight: '700' }]} numberOfLines={1}>
                          {item.holderName}
                        </Text>
                      </View>
                      <Text style={styles.subCellText} numberOfLines={1}>
                        {item.employeeId ? `${item.employeeId} • ` : ''}
                        {item.department ? `${item.department} • ` : ''}
                        {item.company}
                      </Text>
                    </View>

                    {/* Linked Device */}
                    <View style={[{ width: 220 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="phone-portrait-outline" size={14} color={THEME.slate500} />
                        <Text style={styles.cellText} numberOfLines={1}>{item.assignedDevice}</Text>
                      </View>
                      <Text style={styles.subCellText}>
                        Allowance Cap: AED {Number(item.monthlyLimitAED || 0).toFixed(2)}
                      </Text>
                    </View>

                    {/* Assigned On */}
                    <View style={[{ width: 120 }]}>
                      <Text style={styles.cellText}>{item.assignedDate}</Text>
                    </View>

                    {/* Status */}
                    <View style={[{ width: 130 }]}>
                      <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={[{ width: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                      {/* View */}
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => {
                          setActiveItem(item);
                          setIsViewModalOpen(true);
                        }}
                        title="View Handover Details"
                      >
                        <Ionicons name="eye-outline" size={16} color={THEME.slate600} />
                      </TouchableOpacity>

                      {/* Edit */}
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleOpenEdit(item)}
                        title="Edit Assignment"
                      >
                        <Ionicons name="pencil-outline" size={15} color={THEME.info} />
                      </TouchableOpacity>

                      {/* Reassign / Transfer */}
                      <TouchableOpacity
                        style={styles.iconActionBtn}
                        onPress={() => handleOpenReassign(item)}
                        title="Transfer to New User"
                      >
                        <Ionicons name="swap-horizontal-outline" size={16} color={THEME.purple} />
                      </TouchableOpacity>

                      {/* Return / De-assign */}
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: THEME.slate100 }]}
                        onPress={() => handleOpenReturn(item)}
                        title="Return to Inventory"
                      >
                        <Ionicons name="arrow-undo-outline" size={15} color={THEME.slate700} />
                      </TouchableOpacity>

                      {/* Delete */}
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: THEME.dangerLight }]}
                        onPress={() => {
                          setActiveItem(item);
                          setIsDeleteModalOpen(true);
                        }}
                        title="Delete Record"
                      >
                        <Ionicons name="trash-outline" size={15} color={THEME.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Pagination Bar */}
        <View style={styles.paginationBar}>
          <Text style={styles.paginationInfo}>
            Showing <Text style={{ fontWeight: '700' }}>{filteredAssignments.length === 0 ? 0 : Math.min(filteredAssignments.length, (currentPage - 1) * itemsPerPage + 1)}</Text> to{' '}
            <Text style={{ fontWeight: '700' }}>{Math.min(filteredAssignments.length, currentPage * itemsPerPage)}</Text> of{' '}
            <Text style={{ fontWeight: '700' }}>{filteredAssignments.length}</Text> entries
          </Text>

          <View style={styles.paginationButtons}>
            <TouchableOpacity
              style={[styles.pageNavBtn, currentPage === 1 && styles.pageNavBtnDisabled]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? THEME.slate400 : THEME.slate700} />
              <Text style={[styles.pageNavBtnText, currentPage === 1 && styles.pageNavBtnTextDisabled]}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.pageNumberBadge}>
              <Text style={styles.pageNumberText}>
                Page {currentPage} of {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.pageNavBtn, currentPage === totalPages && styles.pageNavBtnDisabled]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <Text style={[styles.pageNavBtnText, currentPage === totalPages && styles.pageNavBtnTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={14} color={currentPage === totalPages ? THEME.slate400 : THEME.slate700} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ASSIGN / EDIT PHONE NUMBER                                     */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isAddEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 960 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconContainer, { width: 36, height: 36 }]}>
                  <Ionicons name={activeItem ? 'pencil' : 'person-add'} size={18} color={THEME.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {activeItem ? 'Edit Phone Number Assignment' : 'Assign Phone Number'}
                  </Text>
                  <Text style={styles.modalSubtitle}>Allocate corporate phone number and hardware to staff or assets</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsAddEditModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 680, paddingHorizontal: 28, paddingVertical: 18 }} showsVerticalScrollIndicator={true}>
              {/* SECTION: PHONE & CONNECTION */}
              <View style={styles.formSectionCard}>
                <Text style={styles.formSectionHeader}>PHONE LINE & SUBSCRIPTION</Text>
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Phone / Line Number *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 052 790 1846"
                      value={formData.phoneNumber}
                      onChangeText={val => setFormData({ ...formData, phoneNumber: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>SIM ICCID Number</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="899711..."
                      value={formData.iccid}
                      onChangeText={val => setFormData({ ...formData, iccid: val })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Carrier / Provider *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e& (Etisalat), du, STC..."
                      value={formData.provider}
                      onChangeText={val => setFormData({ ...formData, provider: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Operating Company *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. ASAS Gen Tr LLC"
                      value={formData.company}
                      onChangeText={val => setFormData({ ...formData, company: val })}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION: HOLDER ASSIGNMENT */}
              <View style={[styles.formSectionCard, { marginTop: 14 }]}>
                <Text style={styles.formSectionHeader}>ASSIGNEE / HOLDER SPECIFICATIONS</Text>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Holder Category *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Employee, Asset / Vehicle, Premises..."
                      value={formData.holderType}
                      onChangeText={val => setFormData({ ...formData, holderType: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Assignee Full Name *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Fatima Zahra or Delivery Van 19"
                      value={formData.holderName}
                      onChangeText={val => setFormData({ ...formData, holderName: val })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Employee ID / Asset Code</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. EMP-1042"
                      value={formData.employeeId}
                      onChangeText={val => setFormData({ ...formData, employeeId: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Department</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. HR & Administration"
                      value={formData.department}
                      onChangeText={val => setFormData({ ...formData, department: val })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Designation / Role</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. HR Manager"
                      value={formData.designation}
                      onChangeText={val => setFormData({ ...formData, designation: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Work Email</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. fatima@company.ae"
                      value={formData.workEmail}
                      onChangeText={val => setFormData({ ...formData, workEmail: val })}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION: HARDWARE & LIMITS */}
              <View style={[styles.formSectionCard, { marginTop: 14 }]}>
                <Text style={styles.formSectionHeader}>HANDSET, HARDWARE & POLICIES</Text>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Assigned Device / Handset</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Apple iPhone 15 Pro (IMEI: 35...) or SIM Only"
                      value={formData.assignedDevice}
                      onChangeText={val => setFormData({ ...formData, assignedDevice: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Monthly Allowance Cap (AED)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="150"
                      keyboardType="numeric"
                      value={formData.monthlyLimitAED}
                      onChangeText={val => setFormData({ ...formData, monthlyLimitAED: val })}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Assignment Date</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="YYYY-MM-DD"
                      value={formData.assignedDate}
                      onChangeText={val => setFormData({ ...formData, assignedDate: val })}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Authorized By</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Operations Director"
                      value={formData.authorizedBy}
                      onChangeText={val => setFormData({ ...formData, authorizedBy: val })}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.formLabel}>Handover Condition & Notes</Text>
                  <TextInput
                    style={[styles.formInput, { height: 54, textAlignVertical: 'top' }]}
                    placeholder="Handset accessories, case, condition notes..."
                    multiline
                    numberOfLines={2}
                    value={formData.handoverNotes}
                    onChangeText={val => setFormData({ ...formData, handoverNotes: val })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsAddEditModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveAssignment}>
                <Ionicons name="checkmark-circle-outline" size={16} color={THEME.white} />
                <Text style={styles.primaryBtnText}>{activeItem ? 'Save Changes' : 'Confirm Assignment'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: VIEW FULL HANDOVER PROFILE                                     */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isViewModalOpen} transparent animationType="fade" onRequestClose={() => setIsViewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 920 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconContainer, { width: 36, height: 36 }]}>
                  <Ionicons name="document-text-outline" size={20} color={THEME.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Phone Assignment Handover Card</Text>
                  <Text style={styles.modalSubtitle}>{activeItem?.phoneNumber} • {activeItem?.id}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            {activeItem && (
              <ScrollView style={{ maxHeight: 680, paddingHorizontal: 28, paddingVertical: 18 }} showsVerticalScrollIndicator={true}>
                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>SUBSCRIBER & LINE PROFILE</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Assigned Phone Number</Text>
                      <Text style={styles.detailValueBold}>{activeItem.phoneNumber}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>SIM ICCID</Text>
                      <Text style={styles.detailValue}>{activeItem.iccid || 'Non-SIM / Landline'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Carrier / Provider</Text>
                      <Text style={styles.detailValue}>{activeItem.provider}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Package / Plan</Text>
                      <Text style={styles.detailValue}>{activeItem.planName || 'Corporate Plan'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>ASSIGNEE SPECIFICATIONS</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Holder Name</Text>
                      <Text style={styles.detailValueBold}>{activeItem.holderName}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Employee ID / Asset Tag</Text>
                      <Text style={styles.detailValue}>{activeItem.employeeId || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Company & Department</Text>
                      <Text style={styles.detailValue}>{activeItem.company} • {activeItem.department}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Designation / Email</Text>
                      <Text style={styles.detailValue}>{activeItem.designation || 'Staff'} ({activeItem.workEmail || 'N/A'})</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>DEVICE & FINANCIAL CAPS</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Assigned Hardware</Text>
                      <Text style={styles.detailValueBold}>{activeItem.assignedDevice}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Monthly Allowance Limit</Text>
                      <Text style={styles.detailValue}>AED {Number(activeItem.monthlyLimitAED || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Handover Effective Date</Text>
                      <Text style={styles.detailValue}>{activeItem.assignedDate}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Authorized By</Text>
                      <Text style={styles.detailValue}>{activeItem.authorizedBy || 'HR Admin'}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.profileSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionHeading}>DECLARATION & CONDITION NOTES</Text>
                  <Text style={styles.noteBoxText}>{activeItem.handoverNotes || 'No special handover annotations.'}</Text>
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={activeItem.acknowledgmentSigned ? 'checkmark-circle' : 'alert-circle'}
                      size={16}
                      color={activeItem.acknowledgmentSigned ? THEME.success : THEME.accent}
                    />
                    <Text style={{ fontSize: 12, color: THEME.slate600 }}>
                      Acknowledgment Status:{' '}
                      <Text style={{ fontWeight: '700', color: activeItem.acknowledgmentSigned ? THEME.success : THEME.accent }}>
                        {activeItem.acknowledgmentSigned ? 'Signed & Verified' : 'Pending Signature'}
                      </Text>
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsViewModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(activeItem);
                }}
              >
                <Ionicons name="pencil-outline" size={15} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Edit Handover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: REASSIGN / TRANSFER NUMBER                                     */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isReassignModalOpen} transparent animationType="fade" onRequestClose={() => setIsReassignModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 740 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconContainer, { width: 36, height: 36 }]}>
                  <Ionicons name="swap-horizontal" size={20} color={THEME.purple} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Transfer Phone Number</Text>
                  <Text style={styles.modalSubtitle}>Reassign line {activeItem?.phoneNumber} to a new user or department</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsReassignModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.formLabel}>Current Holder</Text>
                <View style={[styles.noteBoxText, { backgroundColor: THEME.slate100, padding: 10, borderRadius: 6 }]}>
                  <Text style={{ fontWeight: '700', color: THEME.slate800 }}>{activeItem?.holderName}</Text>
                  <Text style={{ fontSize: 12, color: THEME.slate500 }}>{activeItem?.department} • {activeItem?.company}</Text>
                </View>
              </View>

              <View style={{ marginBottom: 14 }}>
                <Text style={styles.formLabel}>New Assignee Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Tariq Mansour or Delivery Van #2"
                  value={reassignData.newHolderName}
                  onChangeText={val => setReassignData({ ...reassignData, newHolderName: val })}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>New Employee ID</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. EMP-1089"
                    value={reassignData.newEmployeeId}
                    onChangeText={val => setReassignData({ ...reassignData, newEmployeeId: val })}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>New Department</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Operations, Sales"
                    value={reassignData.newDepartment}
                    onChangeText={val => setReassignData({ ...reassignData, newDepartment: val })}
                  />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.formLabel}>Transfer Reason / Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 50, textAlignVertical: 'top' }]}
                  placeholder="Reason for line reassignment..."
                  multiline
                  numberOfLines={2}
                  value={reassignData.transferReason}
                  onChangeText={val => setReassignData({ ...reassignData, transferReason: val })}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsReassignModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: THEME.purple }]} onPress={handleSaveReassignment}>
                <Ionicons name="checkmark" size={16} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Confirm Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: RETURN / DE-ASSIGN LINE                                        */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isReturnModalOpen} transparent animationType="fade" onRequestClose={() => setIsReturnModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 640 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.headerIconContainer, { width: 36, height: 36 }]}>
                  <Ionicons name="arrow-undo-outline" size={20} color={THEME.slate700} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Return Phone Number</Text>
                  <Text style={styles.modalSubtitle}>De-assign line from {activeItem?.holderName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsReturnModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.formLabel}>Return Date</Text>
                <TextInput
                  style={styles.formInput}
                  value={returnData.returnDate}
                  onChangeText={val => setReturnData({ ...returnData, returnDate: val })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.formLabel}>Hardware Condition on Check-In</Text>
                <TextInput
                  style={styles.formInput}
                  value={returnData.returnCondition}
                  onChangeText={val => setReturnData({ ...returnData, returnCondition: val })}
                  placeholder="e.g. Returned in original box, no screen scratches"
                />
              </View>

              <View style={{ marginBottom: 14 }}>
                <Text style={styles.formLabel}>Return Reason</Text>
                <TextInput
                  style={styles.formInput}
                  value={returnData.returnReason}
                  onChangeText={val => setReturnData({ ...returnData, returnReason: val })}
                  placeholder="e.g. Employee resignation, project wrapped up"
                />
              </View>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                onPress={() => setReturnData({ ...returnData, returnToSparePool: !returnData.returnToSparePool })}
              >
                <Ionicons
                  name={returnData.returnToSparePool ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={THEME.primary}
                />
                <Text style={{ fontSize: 13, color: THEME.slate800, fontWeight: '600' }}>
                  Return to Active Spare Pool (Available for next hire)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsReturnModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: THEME.primary }]} onPress={handleSaveReturn}>
                <Ionicons name="checkmark-done" size={16} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Confirm Check-In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION                                            */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 440 }]}>
            <View style={{ padding: 24, alignItems: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: THEME.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="warning-outline" size={28} color={THEME.danger} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: THEME.slate900, marginBottom: 8, textAlign: 'center' }}>
                Delete Assignment Record?
              </Text>
              <Text style={{ fontSize: 13, color: THEME.slate600, textAlign: 'center', lineHeight: 20 }}>
                Are you sure you want to permanently remove the assignment record for <Text style={{ fontWeight: '700' }}>{activeItem?.phoneNumber}</Text> ({activeItem?.holderName})?
              </Text>
            </View>

            <View style={[styles.modalFooter, { justifyContent: 'center' }]}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsDeleteModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: THEME.danger }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={15} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Delete Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// -----------------------------------------------------------------------------
// STYLESHEET
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.slate900,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.slate500,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  primaryBtnText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.slate200,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: THEME.slate700,
    fontSize: 13,
    fontWeight: '600',
  },

  // KPI Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderTopWidth: 4,
    ...SHADOWS.small,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.slate500,
    letterSpacing: 0.5,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.slate900,
    letterSpacing: -0.5,
  },
  metricSubtext: {
    fontSize: 12,
    color: THEME.slate400,
    marginTop: 4,
  },

  // Toolbar
  toolbarCard: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.slate200,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.slate50,
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.slate800,
    outlineWidth: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.slate500,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.slate100,
  },
  filterChipActive: {
    backgroundColor: THEME.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: THEME.slate700,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: THEME.white,
    fontWeight: '700',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetFilterText: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '600',
  },

  // Table Card
  tableCard: {
    backgroundColor: THEME.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.slate200,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: THEME.slate200,
    backgroundColor: THEME.white,
  },
  tableHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.slate800,
  },
  tableHeaderMeta: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableHeaderMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.primary,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.slate50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: THEME.slate200,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.slate500,
    letterSpacing: 0.5,
  },
  gridDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: THEME.slate100,
  },
  rowEven: {
    backgroundColor: THEME.white,
  },
  rowOdd: {
    backgroundColor: '#FAFCFE',
  },
  cellText: {
    fontSize: 13,
    color: THEME.slate700,
  },
  primaryLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  subCellText: {
    fontSize: 11,
    color: THEME.slate400,
    marginTop: 2,
  },
  providerBadge: {
    backgroundColor: THEME.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.slate700,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: THEME.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyTable: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.slate700,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.slate400,
    marginTop: 4,
  },

  // Pagination
  paginationBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderColor: THEME.slate200,
  },
  paginationInfo: {
    fontSize: 13,
    color: THEME.slate600,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.slate200,
    backgroundColor: THEME.white,
  },
  pageNavBtnDisabled: {
    opacity: 0.5,
  },
  pageNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.slate700,
  },
  pageNavBtnTextDisabled: {
    color: THEME.slate400,
  },
  pageNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: THEME.slate50,
    borderRadius: 6,
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.slate600,
  },

  // Modal Container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '92%',
    maxWidth: 960,
    maxHeight: '92%',
    backgroundColor: THEME.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.15)',
    } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: THEME.slate200,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.slate900,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.slate500,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: THEME.slate200,
    backgroundColor: THEME.slate50,
  },

  // Form Section Card
  formSectionCard: {
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderRadius: 8,
    padding: 16,
  },
  formSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.slate700,
    marginBottom: 6,
  },
  formInput: {
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: THEME.slate900,
  },

  // Profile Section in View Modal
  profileSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: THEME.slate100,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.slate400,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCol: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    color: THEME.slate500,
  },
  detailValue: {
    fontSize: 13,
    color: THEME.slate800,
    fontWeight: '500',
    marginTop: 2,
  },
  detailValueBold: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  noteBoxText: {
    fontSize: 12,
    color: THEME.slate600,
    lineHeight: 18,
  },
});
