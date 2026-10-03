import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchableDropdown } from './CustomFieldsTab';
import { API_URL } from '../config';

const COLORS = {
  primary: '#1A4D3E',
  primaryHover: '#13392E',
  primaryLight: '#E8F5E9',
  secondary: '#C5A880',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

const PREMISE_TYPES = [
  'Office',
  'Warehouse',
  'Cold Storage',
  'Shop/Showroom',
  'Labour Accommodation',
  'Staff Accommodation',
  'Yard',
  'Parking',
  'Workshop',
  'Industrial Facility',
  'Production Facility',
  'Other',
];

const TENURE_OPTIONS = [
  { label: 'Rented', icon: 'key-outline' },
  { label: 'Owned', icon: 'business-outline' },
  { label: 'Free Zone', icon: 'globe-outline' },
  { label: 'Serviced', icon: 'construct-outline' },
  { label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

const OCCUPANCY_STATUS_OPTIONS = [
  'Active',
  'Vacant',
  'Under Fit-Out',
  'Under Handover',
  'Exit in Progress',
  'Closed',
];

const COUNTRIES = [
  'UAE',
  'Saudi Arabia',
  'Oman',
  'Qatar',
  'Kuwait',
  'Bahrain',
  'India',
  'United Kingdom',
  'United States',
  'Other',
];

const UAE_EMIRATES = [
  'Abu Dhabi',
  'Dubai',
  'Sharjah',
  'Ajman',
  'Umm Al Quwain',
  'Ras Al Khaimah',
  'Fujairah',
];

export default function PremisesInfoTab({
  user,
  showToast,
  isSidebarCollapsed,
  permissions = { can_view: true, can_create: true, can_edit: true, can_delete: true, full_control: true },
  checkRowPermission = () => true,
}) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const isSuperAdmin = !user || String(user.roleId) === '1';
  const canCreate = isSuperAdmin || (permissions && (permissions.can_create || permissions.full_control));
  const canEdit = isSuperAdmin || (permissions && (permissions.can_edit || permissions.full_control));
  const canDelete = isSuperAdmin || (permissions && (permissions.can_delete || permissions.full_control));

  // Records state
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Masters
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Form Fields (Step 1: Basic Information + Step 2: Location & Size)
  const initialFormData = {
    company_id: '',
    premise_name: '',
    premise_code: '',
    premise_type: '',
    tenure: 'Rented',
    occupancy_status: 'Active',
    department_id: '',
    business_activity: '',
    responsible_person_id: '',
    // Step 2: Location & Size
    country: 'UAE',
    emirate: '',
    area_location: '',
    building_name: '',
    plot_number: '',
    unit_number: '',
    floor: '',
    makani_map_link: '',
    area_sqft: '',
    handover_date: '',
    exit_date: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const clientParam = user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : '';
      const [premRes, compRes, deptRes, empRes] = await Promise.all([
        fetch(`${API_URL}/api/premises-info${clientParam}`),
        fetch(`${API_URL}/api/companies`),
        fetch(`${API_URL}/api/departments`),
        fetch(`${API_URL}/api/employees`),
      ]);

      const [premData, compData, deptData, empData] = await Promise.all([
        premRes.ok ? premRes.json() : [],
        compRes.ok ? compRes.json() : [],
        deptRes.ok ? deptRes.json() : [],
        empRes.ok ? empRes.json() : [],
      ]);

      setRecords(Array.isArray(premData) ? premData : []);
      setCompanies(Array.isArray(compData) ? compData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error('Error fetching premises info data:', err);
      showToast?.('Error loading premises data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextCode = async () => {
    try {
      const res = await fetch(`${API_URL}/api/premises-info/next-code`);
      if (res.ok) {
        const data = await res.json();
        return data.code;
      }
    } catch (e) {
      console.warn('Could not fetch next premise code:', e);
    }
    return 'PRE-0001';
  };

  const handleAddNew = async () => {
    setIsViewOnly(false);
    setEditingId(null);
    const nextCode = await fetchNextCode();
    setFormData({
      ...initialFormData,
      premise_code: nextCode,
      company_id: user?.company_id ? String(user.company_id) : (companies[0]?.id ? String(companies[0].id) : ''),
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setIsViewOnly(false);
    setEditingId(record.id);
    setFormData({
      company_id: record.company_id ? String(record.company_id) : '',
      premise_name: record.premise_name || '',
      premise_code: record.premise_code || '',
      premise_type: record.premise_type || '',
      tenure: record.tenure || 'Rented',
      occupancy_status: record.occupancy_status || 'Active',
      department_id: record.department_id ? String(record.department_id) : '',
      business_activity: record.business_activity || '',
      responsible_person_id: record.responsible_person_id ? String(record.responsible_person_id) : '',
      country: record.country || 'UAE',
      emirate: record.emirate || '',
      area_location: record.area_location || '',
      building_name: record.building_name || '',
      plot_number: record.plot_number || '',
      unit_number: record.unit_number || '',
      floor: record.floor || '',
      makani_map_link: record.makani_map_link || '',
      area_sqft: record.area_sqft ? String(record.area_sqft) : '',
      handover_date: record.handover_date ? String(record.handover_date).split('T')[0] : '',
      exit_date: record.exit_date ? String(record.exit_date).split('T')[0] : '',
      notes: record.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setIsViewOnly(true);
    setEditingId(record.id);
    setFormData({
      company_id: record.company_id ? String(record.company_id) : '',
      premise_name: record.premise_name || '',
      premise_code: record.premise_code || '',
      premise_type: record.premise_type || '',
      tenure: record.tenure || 'Rented',
      occupancy_status: record.occupancy_status || 'Active',
      department_id: record.department_id ? String(record.department_id) : '',
      business_activity: record.business_activity || '',
      responsible_person_id: record.responsible_person_id ? String(record.responsible_person_id) : '',
      country: record.country || 'UAE',
      emirate: record.emirate || '',
      area_location: record.area_location || '',
      building_name: record.building_name || '',
      plot_number: record.plot_number || '',
      unit_number: record.unit_number || '',
      floor: record.floor || '',
      makani_map_link: record.makani_map_link || '',
      area_sqft: record.area_sqft ? String(record.area_sqft) : '',
      handover_date: record.handover_date ? String(record.handover_date).split('T')[0] : '',
      exit_date: record.exit_date ? String(record.exit_date).split('T')[0] : '',
      notes: record.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'YES' || !recordToDelete) return;
    try {
      const res = await fetch(`${API_URL}/api/premises-info/${recordToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete premise');
      showToast?.('Premise deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData();
    } catch (e) {
      console.error(e);
      showToast?.('Error deleting premise', 'error');
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.company_id) {
      showToast?.('Please select a Company', 'warning');
      return;
    }
    if (!formData.premise_name || !formData.premise_name.trim()) {
      showToast?.('Premise Name is required', 'warning');
      return;
    }
    if (formData.premise_name.trim().length > 150) {
      showToast?.('Premise Name cannot exceed 150 characters', 'warning');
      return;
    }
    if (!formData.premise_type) {
      showToast?.('Please select a Premise Type', 'warning');
      return;
    }
    if (!formData.tenure) {
      showToast?.('Please select Tenure', 'warning');
      return;
    }
    if (!formData.country || !formData.country.trim()) {
      showToast?.('Please select a Country', 'warning');
      return;
    }
    if (formData.country === 'UAE' && (!formData.emirate || !formData.emirate.trim())) {
      showToast?.('Please select an Emirate', 'warning');
      return;
    }
    if (formData.area_sqft && (isNaN(formData.area_sqft) || parseFloat(formData.area_sqft) <= 0)) {
      showToast?.('Area (sqft) must be greater than 0', 'warning');
      return;
    }
    // Rule: Exit Date >= Handover Date
    if (formData.handover_date && formData.exit_date) {
      if (new Date(formData.exit_date) < new Date(formData.handover_date)) {
        showToast?.('Exit Date must be on or after Handover Date', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        client_id: user?.clientid || user?.client_id || null,
        company_id: parseInt(formData.company_id, 10),
        premise_code: formData.premise_code,
        premise_name: formData.premise_name.trim(),
        premise_type: formData.premise_type,
        tenure: formData.tenure,
        occupancy_status: formData.occupancy_status || 'Active',
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
        business_activity: formData.business_activity ? formData.business_activity.trim() : null,
        responsible_person_id: formData.responsible_person_id ? parseInt(formData.responsible_person_id, 10) : null,
        status: 'Active',
        // Step 2: Location & Size
        country: formData.country || 'UAE',
        emirate: formData.emirate || null,
        area_location: formData.area_location ? formData.area_location.trim() : null,
        building_name: formData.building_name ? formData.building_name.trim() : null,
        plot_number: formData.plot_number ? formData.plot_number.trim() : null,
        unit_number: formData.unit_number ? formData.unit_number.trim() : null,
        floor: formData.floor ? formData.floor.trim() : null,
        makani_map_link: formData.makani_map_link ? formData.makani_map_link.trim() : null,
        area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
        handover_date: formData.handover_date || null,
        exit_date: formData.exit_date || null,
        notes: formData.notes ? formData.notes.trim() : null,
      };

      const isEditing = !!editingId;
      const url = isEditing
        ? `${API_URL}/api/premises-info/${editingId}`
        : `${API_URL}/api/premises-info`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save premise');
      }

      showToast?.(isEditing ? 'Premise updated successfully!' : 'Premise created successfully!', 'success');
      setIsModalOpen(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Error saving premise', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered & Paginated records
  const filteredRecords = records.filter((r) => {
    if (selectedCompanyFilter && String(r.company_id) !== String(selectedCompanyFilter)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const code = (r.premise_code || '').toLowerCase();
    const name = (r.premise_name || '').toLowerCase();
    const type = (r.premise_type || '').toLowerCase();
    const comp = (r.company_name || '').toLowerCase();
    const emirate = (r.emirate || '').toLowerCase();
    const bldg = (r.building_name || '').toLowerCase();
    const loc = (r.area_location || '').toLowerCase();
    return (
      code.includes(q) ||
      name.includes(q) ||
      type.includes(q) ||
      comp.includes(q) ||
      emirate.includes(q) ||
      bldg.includes(q) ||
      loc.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const startEntry = filteredRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredRecords.length);

  // Status Badge Colors
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return { bg: '#F0FDF4', text: '#15803D' };
      case 'Vacant':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'Under Fit-Out':
      case 'Under Handover':
        return { bg: '#EFF6FF', text: '#1D4ED8' };
      case 'Exit in Progress':
        return { bg: '#FFF7ED', text: '#C2410C' };
      case 'Closed':
        return { bg: '#FEF2F2', text: '#B91C1C' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Premises Info</Text>
          <Text style={styles.headerSubtitle}>Manage real estate, facility locations, and lease tenure</Text>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddNew} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>Add Premise</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TOP STATS CARDS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="business" size={22} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.statNumber}>{records.length}</Text>
            <Text style={styles.statLabel}>Total Premises</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="key" size={22} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.statNumber}>{records.filter((r) => r.tenure === 'Rented').length}</Text>
            <Text style={styles.statLabel}>Rented / Leased</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="home" size={22} color="#D97706" />
          </View>
          <View>
            <Text style={styles.statNumber}>{records.filter((r) => r.tenure === 'Owned').length}</Text>
            <Text style={styles.statLabel}>Owned Properties</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.statNumber}>{records.filter((r) => r.occupancy_status === 'Active').length}</Text>
            <Text style={styles.statLabel}>Active Occupancy</Text>
          </View>
        </View>
      </View>

      {/* TABLE CARD */}
      <View style={styles.tableCard}>
        {/* TOOLBAR */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by code, name, type, company..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setCurrentPage(1);
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Company Filter */}
          <View style={{ width: 220 }}>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => {
                setSelectedCompanyFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                borderColor: '#CBD5E1',
                borderWidth: 1,
                borderStyle: 'solid',
                fontSize: 13,
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </View>
        </View>

        {/* DATA TABLE */}
        {loading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 13 }}>Loading premises records...</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={54} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No premises found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try modifying your search criteria' : 'Click "Add Premise" to create your first premise record'}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thText, { flex: 1 }]}>Premise Code</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Premise Name</Text>
              <Text style={[styles.thText, { flex: 1.6 }]}>Company</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Type</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Tenure</Text>
              <Text style={[styles.thText, { flex: 1.2 }]}>Occupancy</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>Responsible Person</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
            </View>

            {/* Table Body */}
            <ScrollView style={{ flex: 1 }}>
              {paginatedRecords.map((r) => {
                const statusBadge = getStatusBadgeStyle(r.occupancy_status);
                return (
                  <View key={r.id} style={styles.tableRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{r.premise_code}</Text>
                      </View>
                    </View>

                    <View style={{ flex: 2, paddingRight: 8 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {r.premise_name}
                      </Text>
                      {r.emirate || r.area_location || r.building_name ? (
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {[r.building_name, r.area_location, r.emirate].filter(Boolean).join(' • ')}
                          {r.area_sqft ? ` (${r.area_sqft} sqft)` : ''}
                        </Text>
                      ) : r.department_name ? (
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          Dept: {r.department_name}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ flex: 1.6, paddingRight: 8 }}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {r.company_name || '—'}
                      </Text>
                    </View>

                    <View style={{ flex: 1.5, paddingRight: 8 }}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {r.premise_type || '—'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.tenureChip}>
                        <Text style={styles.tenureChipText}>{r.tenure || '—'}</Text>
                      </View>
                    </View>

                    <View style={{ flex: 1.2, alignItems: 'flex-start' }}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                          {r.occupancy_status || 'Active'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flex: 1.5, paddingRight: 8 }}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {r.responsible_person_name || '—'}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleView(r)} title="View">
                        <Ionicons name="eye-outline" size={17} color="#475569" />
                      </TouchableOpacity>

                      {canEdit && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(r)} title="Edit">
                          <Ionicons name="pencil-outline" size={17} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}

                      {canDelete && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(r)} title="Delete">
                          <Ionicons name="trash-outline" size={17} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* PAGINATION FOOTER */}
            <View style={styles.paginationFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.paginationInfo}>
                  Showing <Text style={{ fontWeight: '700' }}>{startEntry}</Text> to{' '}
                  <Text style={{ fontWeight: '700' }}>{endEntry}</Text> of{' '}
                  <Text style={{ fontWeight: '700' }}>{filteredRecords.length}</Text> entries
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.paginationInfo}>Rows per page:</Text>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      borderColor: '#CBD5E1',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      fontSize: 12,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage((p) => p - 1)}
                >
                  <Ionicons name="chevron-back" size={14} color={currentPage === 1 ? '#94A3B8' : '#334155'} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && { color: '#94A3B8' }]}>Prev</Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicator}>
                  Page <Text style={{ fontWeight: '700' }}>{currentPage}</Text> of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage((p) => p + 1)}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && { color: '#94A3B8' }]}>Next</Text>
                  <Ionicons name="chevron-forward" size={14} color={currentPage === totalPages ? '#94A3B8' : '#334155'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ========================================================================= */}
      {/* FORM MODAL (Step 1: Basic Information)                                   */}
      {/* ========================================================================= */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: isLargeScreen ? 900 : '96%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="business" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>
                  {isViewOnly ? `View Premise #${editingId}` : editingId ? `Edit Premise #${editingId}` : 'Add Premise'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Top Stepper / Wizard Bar */}
            {!isViewOnly && (
              <View style={styles.wizardBar}>
                <View style={styles.wizardStep}>
                  <View style={styles.wizardStepCircle}>
                    <Ionicons name="settings-outline" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.wizardStepText}>Configuration</Text>
                </View>

                <View style={styles.wizardStepLine} />

                <View style={styles.wizardStep}>
                  <View style={styles.wizardStepCircle}>
                    <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.wizardStepText}>Form Data</Text>
                </View>
              </View>
            )}

            {/* Form Body: Scrollable Section Card */}
            <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={true}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>PREMISE DETAILS</Text>
                </View>

                <View style={styles.sectionBody}>
                  <View style={[styles.formGrid, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
                    {/* COLUMN 1 */}
                    <View style={{ flex: 1, gap: 16 }}>
                      {/* 1. Company (*) */}
                      <View>
                        <Text style={styles.fieldLabel}>
                          Company <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <SearchableDropdown
                          data={companies}
                          value={formData.company_id}
                          onChange={(val) => setFormData((prev) => ({ ...prev, company_id: String(val) }))}
                          placeholder="-- Select Company --"
                          searchPlaceholder="Search company..."
                          displayKey="company_name"
                          valueKey="id"
                          disabled={isViewOnly}
                        />
                      </View>

                      {/* 2. Premise Name (*) */}
                      <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.fieldLabel}>
                            Premise Name <Text style={styles.requiredStar}>*</Text>
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                            {(formData.premise_name || '').length}/150
                          </Text>
                        </View>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="Enter premise name (e.g. Al Quoz Warehouse 4)"
                          placeholderTextColor={COLORS.textMuted}
                          maxLength={150}
                          value={formData.premise_name}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, premise_name: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 3. Premise Code (*) - Read Only Auto Text */}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Text style={styles.fieldLabel}>
                            Premise Code <Text style={styles.requiredStar}>*</Text>
                          </Text>
                          <View style={styles.autoChip}>
                            <Ionicons name="lock-closed" size={10} color="#047857" />
                            <Text style={styles.autoChipText}>Auto-Generated</Text>
                          </View>
                        </View>
                        <TextInput
                          style={[styles.input, styles.inputDisabled, { fontWeight: '700', color: COLORS.primary }]}
                          value={formData.premise_code}
                          editable={false}
                          placeholder="PRE-0001"
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>

                      {/* 4. Premise Type (*) */}
                      <View>
                        <Text style={styles.fieldLabel}>
                          Premise Type <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <SearchableDropdown
                          data={PREMISE_TYPES.map((type) => ({ label: type, value: type }))}
                          value={formData.premise_type}
                          onChange={(val) => setFormData((prev) => ({ ...prev, premise_type: String(val) }))}
                          placeholder="-- Select Premise Type --"
                          searchPlaceholder="Search premise type..."
                          displayKey="label"
                          valueKey="value"
                          disabled={isViewOnly}
                        />
                      </View>
                    </View>

                    {/* COLUMN 2 */}
                    <View style={{ flex: 1, gap: 16 }}>
                      {/* 5. Occupancy Status (*) */}
                      <View>
                        <Text style={styles.fieldLabel}>
                          Occupancy Status <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <SearchableDropdown
                          data={OCCUPANCY_STATUS_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
                          value={formData.occupancy_status}
                          onChange={(val) => setFormData((prev) => ({ ...prev, occupancy_status: String(val) }))}
                          placeholder="-- Select Occupancy Status --"
                          searchPlaceholder="Search occupancy status..."
                          displayKey="label"
                          valueKey="value"
                          disabled={isViewOnly}
                        />
                      </View>

                      {/* 6. Department (Optional) */}
                      <View>
                        <Text style={styles.fieldLabel}>Department</Text>
                        <SearchableDropdown
                          data={departments}
                          value={formData.department_id}
                          onChange={(val) => setFormData((prev) => ({ ...prev, department_id: String(val) }))}
                          placeholder="-- Select Department --"
                          searchPlaceholder="Search department..."
                          displayKey="department_name"
                          valueKey="id"
                          disabled={isViewOnly}
                        />
                      </View>

                      {/* 7. Business Activity (Optional) */}
                      <View>
                        <Text style={styles.fieldLabel}>Business Activity</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Storage, Operations, Executive Management"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.business_activity}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, business_activity: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 8. Responsible Person (Optional) */}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.fieldLabel}>Responsible Person</Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>(Receives alerts)</Text>
                        </View>
                        <SearchableDropdown
                          data={employees.map((e) => ({
                            id: e.id,
                            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.full_name || e.email,
                          }))}
                          value={formData.responsible_person_id}
                          onChange={(val) => setFormData((prev) => ({ ...prev, responsible_person_id: String(val) }))}
                          placeholder="-- Select Responsible User --"
                          searchPlaceholder="Search user..."
                          displayKey="name"
                          valueKey="id"
                          disabled={isViewOnly}
                        />
                      </View>
                    </View>
                  </View>

                  {/* 9. Tenure (Radio Cards) - Full width across 2 columns */}
                  <View style={{ marginTop: 24, width: '100%' }}>
                    <Text style={styles.fieldLabel}>
                      Tenure <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.radioCardsRow}>
                      {TENURE_OPTIONS.map((opt) => {
                        const isSelected = formData.tenure === opt.label;
                        return (
                          <TouchableOpacity
                            key={opt.label}
                            style={[
                              styles.radioCard,
                              isSelected && styles.radioCardSelected,
                              isViewOnly && { opacity: 0.8 },
                            ]}
                            onPress={() => !isViewOnly && setFormData((prev) => ({ ...prev, tenure: opt.label }))}
                            activeOpacity={isViewOnly ? 1 : 0.75}
                          >
                            <View style={styles.radioCardHeader}>
                              <Ionicons
                                name={opt.icon}
                                size={18}
                                color={isSelected ? COLORS.primary : COLORS.textMuted}
                              />
                              <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                {isSelected && <View style={styles.radioDot} />}
                              </View>
                            </View>
                            <Text style={[styles.radioCardLabel, isSelected && styles.radioCardLabelSelected]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>

              {/* SECTION 2: LOCATION & SIZE */}
              <View style={[styles.sectionCard, { marginTop: 20 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>LOCATION & SIZE</Text>
                </View>

                <View style={styles.sectionBody}>
                  <View style={[styles.formGrid, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
                    {/* COLUMN 1 */}
                    <View style={{ flex: 1, gap: 16 }}>
                      {/* 1. Country (*) */}
                      <View>
                        <Text style={styles.fieldLabel}>
                          Country <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <SearchableDropdown
                          data={COUNTRIES.map((c) => ({ label: c, value: c }))}
                          value={formData.country}
                          onChange={(val) => {
                            setFormData((prev) => ({
                              ...prev,
                              country: String(val),
                              emirate: String(val) === 'UAE' ? prev.emirate : '',
                            }));
                          }}
                          placeholder="-- Select Country --"
                          searchPlaceholder="Search country..."
                          displayKey="label"
                          valueKey="value"
                          disabled={isViewOnly}
                        />
                      </View>

                      {/* 3. Area / Location */}
                      <View>
                        <Text style={styles.fieldLabel}>Area / Location</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Al Quoz Industrial Area 3"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.area_location}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, area_location: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 5. Plot Number */}
                      <View>
                        <Text style={styles.fieldLabel}>Plot Number</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Plot 365-102"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.plot_number}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, plot_number: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 7. Floor */}
                      <View>
                        <Text style={styles.fieldLabel}>Floor</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Ground Floor, Mezzanine"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.floor}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, floor: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 9. Handover Date */}
                      <View>
                        <Text style={styles.fieldLabel}>Handover Date</Text>
                        {Platform.OS === 'web' ? (
                          <input
                            type="date"
                            style={{
                              height: 44,
                              borderColor: '#CBD5E1',
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderRadius: 8,
                              paddingLeft: 14,
                              paddingRight: 14,
                              backgroundColor: isViewOnly ? '#F1F5F9' : '#F8FAFC',
                              color: '#0F172A',
                              fontSize: 14,
                              outlineStyle: 'none',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                            value={formData.handover_date || ''}
                            onChange={(e) => !isViewOnly && setFormData((prev) => ({ ...prev, handover_date: e.target.value }))}
                            disabled={isViewOnly}
                          />
                        ) : (
                          <TextInput
                            style={[styles.input, isViewOnly && styles.inputDisabled]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.handover_date}
                            onChangeText={(val) => setFormData((prev) => ({ ...prev, handover_date: val }))}
                            editable={!isViewOnly}
                          />
                        )}
                      </View>

                      {/* 11. Makani / Map Link */}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.fieldLabel}>Makani / Map Link</Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>(Optional)</Text>
                        </View>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. 30032 95320 or Google Maps URL"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.makani_map_link}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, makani_map_link: val }))}
                          editable={!isViewOnly}
                        />
                      </View>
                    </View>

                    {/* COLUMN 2 */}
                    <View style={{ flex: 1, gap: 16 }}>
                      {/* 2. Emirate (*) */}
                      <View>
                        <Text style={styles.fieldLabel}>
                          Emirate {formData.country === 'UAE' && <Text style={styles.requiredStar}>*</Text>}
                        </Text>
                        {formData.country === 'UAE' ? (
                          <SearchableDropdown
                            data={UAE_EMIRATES.map((e) => ({ label: e, value: e }))}
                            value={formData.emirate}
                            onChange={(val) => setFormData((prev) => ({ ...prev, emirate: String(val) }))}
                            placeholder="-- Select Emirate --"
                            searchPlaceholder="Search emirate..."
                            displayKey="label"
                            valueKey="value"
                            disabled={isViewOnly}
                          />
                        ) : (
                          <TextInput
                            style={[styles.input, isViewOnly && styles.inputDisabled]}
                            placeholder="Enter Emirate / State / Province"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.emirate}
                            onChangeText={(val) => setFormData((prev) => ({ ...prev, emirate: val }))}
                            editable={!isViewOnly}
                          />
                        )}
                      </View>

                      {/* 4. Building Name */}
                      <View>
                        <Text style={styles.fieldLabel}>Building Name</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Warehouse Complex B"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.building_name}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, building_name: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 6. Unit Number */}
                      <View>
                        <Text style={styles.fieldLabel}>Unit Number</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. Unit 4, Office 302"
                          placeholderTextColor={COLORS.textMuted}
                          value={formData.unit_number}
                          onChangeText={(val) => setFormData((prev) => ({ ...prev, unit_number: val }))}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 8. Area (sqft) - Decimal > 0 */}
                      <View>
                        <Text style={styles.fieldLabel}>Area (sqft)</Text>
                        <TextInput
                          style={[styles.input, isViewOnly && styles.inputDisabled]}
                          placeholder="e.g. 2500.00"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="decimal-pad"
                          value={formData.area_sqft}
                          onChangeText={(val) => {
                            const clean = val.replace(/[^0-9.]/g, '');
                            setFormData((prev) => ({ ...prev, area_sqft: clean }));
                          }}
                          editable={!isViewOnly}
                        />
                      </View>

                      {/* 10. Exit Date */}
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.fieldLabel}>Exit Date</Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted }}>(≥ Handover Date)</Text>
                        </View>
                        {Platform.OS === 'web' ? (
                          <input
                            type="date"
                            style={{
                              height: 44,
                              borderColor: '#CBD5E1',
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderRadius: 8,
                              paddingLeft: 14,
                              paddingRight: 14,
                              backgroundColor: isViewOnly ? '#F1F5F9' : '#F8FAFC',
                              color: '#0F172A',
                              fontSize: 14,
                              outlineStyle: 'none',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                            min={formData.handover_date || undefined}
                            value={formData.exit_date || ''}
                            onChange={(e) => !isViewOnly && setFormData((prev) => ({ ...prev, exit_date: e.target.value }))}
                            disabled={isViewOnly}
                          />
                        ) : (
                          <TextInput
                            style={[styles.input, isViewOnly && styles.inputDisabled]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.exit_date}
                            onChangeText={(val) => setFormData((prev) => ({ ...prev, exit_date: val }))}
                            editable={!isViewOnly}
                          />
                        )}
                      </View>
                    </View>
                  </View>

                  {/* 12. Notes (Textarea) */}
                  <View style={{ marginTop: 20, width: '100%' }}>
                    <Text style={styles.fieldLabel}>Notes</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { minHeight: 70, height: 70, paddingTop: 10, textAlignVertical: 'top' },
                        isViewOnly && styles.inputDisabled,
                      ]}
                      placeholder="Enter any additional notes, remarks or lease specifics..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline={true}
                      numberOfLines={3}
                      value={formData.notes}
                      onChangeText={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
                      editable={!isViewOnly}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer (Space-between matching Screenshot 2) */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setIsModalOpen(false)}
                disabled={saving}
              >
                <Text style={styles.backBtnText}>{isViewOnly ? 'Close' : 'Back'}</Text>
              </TouchableOpacity>

              {!isViewOnly && (
                <TouchableOpacity
                  style={[styles.completeBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.completeBtnText}>{editingId ? 'Update Premise' : 'Complete & Save'}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                */}
      {/* ========================================================================= */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 440, padding: 24 }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.deleteWarningIcon}>
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 }}>
                Confirm Deletion
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 }}>
                Are you sure you want to delete premise{' '}
                <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
                  {recordToDelete?.premise_code} - {recordToDelete?.premise_name}
                </Text>
                ? This action cannot be undone.
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 }}>
                Type <Text style={{ fontWeight: '700', color: '#EF4444' }}>YES</Text> to confirm:
              </Text>
              <TextInput
                style={[styles.input, { borderColor: '#FCA5A5' }]}
                placeholder="YES"
                placeholderTextColor={COLORS.textMuted}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                autoCapitalize="characters"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setRecordToDelete(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: '#EF4444' },
                  deleteConfirmationText.trim().toUpperCase() !== 'YES' && { opacity: 0.5 },
                ]}
                disabled={deleteConfirmationText.trim().toUpperCase() !== 'YES'}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.saveBtnText}>Delete Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  tableCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    width: 320,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
    outlineStyle: 'none',
  },
  htmlSelect: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
    outline: 'none',
    cursor: 'pointer',
  },
  htmlSelectSmall: {
    padding: '4px 8px',
    borderRadius: 6,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
  },
  htmlFormSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: 13,
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    cursor: 'pointer',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  codeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  tenureChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tenureChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paginationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: 12,
  },
  paginationInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  pageBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pageIndicator: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  wizardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  wizardStep: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  wizardStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#0F172A',
    marginHorizontal: 12,
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    maxHeight: 560,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    padding: 20,
  },
  formGrid: {
    gap: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
    outlineStyle: 'none',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  autoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  autoChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  radioCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  radioCard: {
    flex: 1,
    minWidth: 130,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  radioCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
  },
  radioCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  radioCardLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
  },
  completeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteWarningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
