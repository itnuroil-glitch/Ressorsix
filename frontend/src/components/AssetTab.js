import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator, Switch, Picker } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function AssetTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed }) {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form fields
  const [assetTagNumber, setAssetTagNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [status, setStatus] = useState('In Stock');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAssets(),
        fetchCategories(),
        fetchBrands(),
        fetchEmployees()
      ]);
    } catch (err) {
      console.error(err);
      showToast('Error loading initial data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    const res = await fetch(`${API_URL}/api/assets`);
    if (!res.ok) throw new Error('Failed to fetch assets');
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
  };

  const fetchCategories = async () => {
    const res = await fetch(`${API_URL}/api/asset-categories`);
    if (res.ok) {
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    }
  };

  const fetchBrands = async () => {
    const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
    const res = await fetch(`${API_URL}/api/asset-brands${clientQuery}`);
    if (res.ok) {
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch(`${API_URL}/api/employees`);
    if (res.ok) {
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    }
  };

  const generateAssetTag = () => {
    // Generate a tag like AST-12345
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setAssetTagNumber(`AST-${randomNum}`);
  };

  const filteredAssets = assets.filter(a =>
    (a.asset_tag_number && a.asset_tag_number.toLowerCase().includes(search.toLowerCase())) ||
    (a.serial_number && a.serial_number.toLowerCase().includes(search.toLowerCase()))
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE)));
  const paginatedAssets = filteredAssets.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!assetTagNumber.trim()) {
      showToast('Asset tag number is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        asset_tag_number: assetTagNumber,
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        brand_id: brandId ? parseInt(brandId, 10) : null,
        serial_number: serialNumber,
        assigned_employee_id: assignedEmployeeId ? parseInt(assignedEmployeeId, 10) : null,
        status: status
      };

      const url = editingId ? `${API_URL}/api/assets/${editingId}` : `${API_URL}/api/assets`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }

      showToast(editingId ? 'Asset updated successfully' : 'Asset created successfully', 'success');
      setIsModalOpen(false);
      fetchAssets(); // Refresh only assets
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving asset', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const res = await fetch(`${API_URL}/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Asset deleted successfully', 'success');
      fetchAssets();
    } catch (err) {
      console.error(err);
      showToast('Error deleting asset', 'error');
    }
  };

  const openModal = (asset = null) => {
    if (asset) {
      setEditingId(asset.asset_id);
      setAssetTagNumber(asset.asset_tag_number || '');
      setCategoryId(asset.category_id ? String(asset.category_id) : '');
      setBrandId(asset.brand_id ? String(asset.brand_id) : '');
      setSerialNumber(asset.serial_number || '');
      setAssignedEmployeeId(asset.assigned_employee_id ? String(asset.assigned_employee_id) : '');
      setStatus(asset.status || 'In Stock');
    } else {
      setEditingId(null);
      setAssetTagNumber('');
      setCategoryId('');
      setBrandId('');
      setSerialNumber('');
      setAssignedEmployeeId('');
      setStatus('In Stock');
      generateAssetTag(); // Auto-generate when opening new
    }
    setIsModalOpen(true);
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.cid === id);
    return cat ? cat.category_name : 'N/A';
  };

  const getBrandName = (id) => {
    const brand = brands.find(b => b.bid === id);
    return brand ? brand.brand_name : 'N/A';
  };

  const getEmployeeName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.full_name : 'Unassigned';
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={styles.iconWrapper}>
            <Ionicons name="hardware-chip-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Asset Tracking</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage individual hardware assets, serial numbers, and assignments.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={18} color={COLORS.white} />
          <Text style={styles.addBtnText}>Add Asset</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar && renderTableToolbar(search, setSearch, setPage, 'Search asset tag or serial...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading assets...</Text>
          </View>
        ) : filteredAssets.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 800 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>ASSET TAG</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>CATEGORY & BRAND</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>SERIAL</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>ASSIGNED TO</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedAssets.map((item, index) => {
                    const isInactive = item.status !== 'In Stock' && item.status !== 'Deployed';

                    return (
                      <View key={item.asset_id} style={[styles.tableRow, index === paginatedAssets.length - 1 && styles.lastTableRow]}>
                        <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '700', color: COLORS.primary }]}>
                          {item.asset_tag_number}
                        </Text>
                        <View style={[styles.tdCell, { flex: 2.0 }]}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>
                            {getCategoryName(item.category_id)}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
                            {getBrandName(item.brand_id)}
                          </Text>
                        </View>
                        <Text style={[styles.tdCell, { flex: 1.5, color: COLORS.textSecondary }]}>
                          {item.serial_number || '-'}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 2.0, color: item.assigned_employee_id ? COLORS.textPrimary : COLORS.textMuted }]}>
                          {getEmployeeName(item.assigned_employee_id)}
                        </Text>

                        {/* Status Badge */}
                        <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                          <View style={[styles.statusBadge, {
                            backgroundColor: item.status === 'Deployed' ? '#FEF3C7' : (item.status === 'In Stock' ? '#D1FAE5' : '#FEE2E2'),
                            borderColor: item.status === 'Deployed' ? '#FDE68A' : (item.status === 'In Stock' ? '#6EE7B7' : '#FCA5A5'),
                            borderWidth: 1,
                          }]}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: item.status === 'Deployed' ? '#D97706' : (item.status === 'In Stock' ? '#059669' : '#EF4444'),
                              textTransform: 'uppercase',
                            }}>
                              {item.status || 'IN STOCK'}
                            </Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={[styles.tdCell, { flex: 1.0, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                          <TouchableOpacity onPress={() => openModal(item)}>
                            <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(item.asset_id)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            {renderTablePagination && renderTablePagination(filteredAssets.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="hardware-chip-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{assets.length === 0 ? "No assets added yet." : "No matching assets found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Asset</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalForm, { padding: 20, maxHeight: height * 0.7 }]}>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Asset Tag Number <Text style={{ color: 'red' }}>*</Text></Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="e.g. AST-001"
                      value={assetTagNumber}
                      onChangeText={setAssetTagNumber}
                    />
                    <TouchableOpacity onPress={generateAssetTag} style={styles.iconBtn}>
                      <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Serial Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. SN-998877"
                    value={serialNumber}
                    onChangeText={setSerialNumber}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      style={styles.webSelect}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(c => (
                        <option key={c.cid} value={c.cid}>{c.category_name}</option>
                      ))}
                    </select>
                  </div>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Brand</Text>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      style={styles.webSelect}
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.map(b => (
                        <option key={b.bid} value={b.bid}>{b.brand_name}</option>
                      ))}
                    </select>
                  </div>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Assigned Employee</Text>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={assignedEmployeeId}
                      onChange={(e) => setAssignedEmployeeId(e.target.value)}
                      style={styles.webSelect}
                    >
                      <option value="">-- Unassigned --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.full_name} ({e.email})</option>
                      ))}
                    </select>
                  </div>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={styles.webSelect}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Deployed">Deployed</option>
                      <option value="Broken">Broken</option>
                      <option value="Lost">Lost</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </View>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Asset'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECECFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  tabHeadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabHeadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    ...SHADOWS.card,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  tableLoaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  tableWrapper: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tdCell: {
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  formGroup: {
    flexDirection: 'column',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  webSelect: {
    width: '100%',
    height: 42,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular, Roboto, sans-serif',
    outlineStyle: 'none', outlineWidth: 0,
  },
  iconBtn: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  }
});
