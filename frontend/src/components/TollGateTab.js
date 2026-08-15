import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function TollGateTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));

  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  const [gateName, setGateName] = useState('');
  const [tollName, setTollName] = useState('Salik');
  const [accountNo, setAccountNo] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGates();
  }, []);

  const fetchGates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/toll-gate`);
      if (!res.ok) throw new Error('Failed to fetch Toll Gate data');
      const data = await res.json();
      setGates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading Toll Gates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredGates = gates.filter(g => 
    (g.gate_name && g.gate_name.toLowerCase().includes(search.toLowerCase())) ||
    (g.toll_name && g.toll_name.toLowerCase().includes(search.toLowerCase())) ||
    (g.location && g.location.toLowerCase().includes(search.toLowerCase())) ||
    (g.account_no && g.account_no.toLowerCase().includes(search.toLowerCase()))
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredGates.length / ITEMS_PER_PAGE)));
  const paginatedGates = filteredGates.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!gateName.trim()) {
      showToast('Gate Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingId;
      let payload;
      
      if (isEdit) {
        payload = { 
          gate_name: gateName.trim(),
          toll_name: tollName.trim(),
          account_no: accountNo.trim(),
          location: location.trim(),
          status
        };
      } else {
        const namesArray = gateName.split(',').map(n => n.trim()).filter(n => n);
        if (namesArray.length === 0) {
          showToast('Please enter at least one Gate Name', 'error');
          setSaving(false);
          return;
        }
        payload = { 
          gate_name: gateName,
          toll_name: tollName.trim(),
          account_no: accountNo.trim(),
          location: location.trim(),
          status
        };
      }

      const url = isEdit ? `${API_URL}/api/toll-gate/${editingId}` : `${API_URL}/api/toll-gate`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }
      
      showToast(editingId ? 'Toll Gate updated successfully' : 'Toll Gate created successfully', 'success');
      setIsModalOpen(false);
      fetchGates();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving Toll Gate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setDeleteModalVisible(true);
  };

  const executeDelete = async () => {
    setDeleteModalVisible(false);
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`${API_URL}/api/toll-gate/${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Toll Gate deleted successfully', 'success');
      fetchGates();
    } catch (err) {
      console.error(err);
      showToast('Error deleting Toll Gate', 'error');
    }
  };

  const openModal = (gate = null) => {
    if (gate) {
      setEditingId(gate.id);
      setGateName(gate.gate_name || '');
      setTollName(gate.toll_name || 'Salik');
      setAccountNo(gate.account_no || '');
      setLocation(gate.location || '');
      setStatus(gate.status || 'Active');
    } else {
      setEditingId(null);
      setGateName('');
      setTollName('Salik');
      setAccountNo('');
      setLocation('');
      setStatus('Active');
    }
    setIsModalOpen(true);
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={styles.iconWrapper}>
            <Ionicons name="card-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Toll Gate Settings</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage highway toll gates, Salik/Darb toll points, and system account numbers.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add Toll Gate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search by gate name, toll system, location...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading Toll Gates...</Text>
          </View>
        ) : filteredGates.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 800 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>GATE NAME</Text>
                    <Text style={[styles.thCell, { flex: 1.8 }]}>TOLL SYSTEM</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>LOCATION / CITY</Text>
                    <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedGates.map((item, index) => {
                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedGates.length - 1 && styles.lastTableRow]}>
                        <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 2.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.gate_name}
                        </Text>
                        <View style={[styles.tdCell, { flex: 1.8 }]}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>
                            {item.toll_name || 'Salik'}
                          </Text>
                          {item.account_no ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Acc: {item.account_no}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.tdCell, { flex: 2.0, color: COLORS.textSecondary }]}>
                          📍 {item.location || 'UAE'}
                        </Text>
                        <View style={[styles.tdCell, { flex: 1.2, alignItems: 'center' }]}>
                          <View style={[styles.statusBadge, {
                            backgroundColor: (item.status === 'Active' || item.status === 1) ? '#DCFCE7' : '#FEE2E2'
                          }]}>
                            <Text style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: (item.status === 'Active' || item.status === 1) ? '#16A34A' : '#DC2626'
                            }}>
                              {(item.status === 'Active' || item.status === 1) ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={[styles.tdCell, { flex: 1.2, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                          <TouchableOpacity onPress={() => openModal(item)}>
                            <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            {renderTablePagination(filteredGates.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="card-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{gates.length === 0 ? "No Toll Gates created yet." : "No matching toll gates found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Toll Gate</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Gate Name(s) <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={editingId ? "e.g. Al Mamzar Gate" : "e.g. Al Mamzar, Al Safa, Al Barsha"}
                  value={gateName}
                  onChangeText={setGateName}
                />
              </View>

              <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Toll System / Name</Text>
                  <select
                    value={tollName}
                    onChange={(e) => setTollName(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="Salik">Salik (Dubai)</option>
                    <option value="Darb">Darb (Abu Dhabi)</option>
                    <option value="Fajr">Fajr</option>
                    <option value="Other">Other Toll System</option>
                  </select>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={styles.selectInput}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </View>
              </View>

              <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 10928374"
                    value={accountNo}
                    onChangeText={setAccountNo}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Location / City</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Dubai, Abu Dhabi"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

            </View>

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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Gate'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="warning-outline" size={24} color={COLORS.error} />
                <Text style={styles.modalTitle}>Confirm Delete</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              <Text style={{ fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 }}>
                Are you sure you want to delete this Toll Gate? This action cannot be undone.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: COLORS.error }]}
                onPress={executeDelete}
              >
                <Text style={styles.saveBtnText}>Delete</Text>
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
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
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
  selectInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    height: 42,
    outlineStyle: 'none',
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
