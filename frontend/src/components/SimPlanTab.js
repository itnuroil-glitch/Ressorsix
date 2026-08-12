import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function SimPlanTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form fields
  const [planName, setPlanName] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSimPlans();
  }, []);

  const fetchSimPlans = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/sim-plans${clientQuery}`);
      if (!res.ok) throw new Error('Failed to fetch SIM plan data');
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading SIM plan names', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(p => 
    p.plan_name && p.plan_name.toLowerCase().includes(search.toLowerCase())
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredPlans.length / ITEMS_PER_PAGE)));
  const paginatedPlans = filteredPlans.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!planName.trim()) {
      showToast('Plan name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan_name: planName.trim(),
        status: status,
        client_id: user?.clientid || null
      };

      const url = editingId ? `${API_URL}/api/sim-plans/${editingId}` : `${API_URL}/api/sim-plans`;
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
      
      showToast(editingId ? 'SIM plan updated successfully' : 'SIM plan created successfully', 'success');
      setIsModalOpen(false);
      fetchSimPlans();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving SIM plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SIM plan name?')) return;
    try {
      const res = await fetch(`${API_URL}/api/sim-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('SIM plan deleted successfully', 'success');
      fetchSimPlans();
    } catch (err) {
      console.error(err);
      showToast('Error deleting SIM plan', 'error');
    }
  };

  const openModal = (planObj = null) => {
    if (planObj) {
      setEditingId(planObj.id);
      setPlanName(planObj.plan_name || '');
      setStatus(planObj.status || 'Active');
    } else {
      setEditingId(null);
      setPlanName('');
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
            <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Sim Plan Name</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage master plan names for your telecom provider SIM cards.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add Plan Name</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search plan names...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading SIM plan names...</Text>
          </View>
        ) : filteredPlans.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 600 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 3.5 }]}>PLAN NAME</Text>
                    <Text style={[styles.thCell, { flex: 2.0, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedPlans.map((item, index) => {
                    const isInactive = item.status !== 'Active';

                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedPlans.length - 1 && styles.lastTableRow]}>
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 3.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.plan_name}
                        </Text>

                        {/* Status Badge */}
                        <View style={[styles.tdCell, { flex: 2.0, alignItems: 'center' }]}>
                          <View style={[styles.statusBadge, {
                            backgroundColor: isInactive ? '#FEE2E2' : '#E0F2FE',
                            borderColor: isInactive ? '#FCA5A5' : '#7DD3FC',
                            borderWidth: 1,
                          }]}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: isInactive ? '#EF4444' : '#0284C7',
                              textTransform: 'uppercase',
                            }}>
                              {item.status || 'ACTIVE'}
                            </Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={[styles.tdCell, { flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                          <TouchableOpacity onPress={() => openModal(item)}>
                            <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            {renderTablePagination(filteredPlans.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="document-text-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{plans.length === 0 ? "No SIM plan names created yet." : "No matching SIM plan names found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM - MATCHING "ADD ASSET BRAND" MODAL EXACTLY */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={22} color="#0F172A" />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} SIM Plan Name</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Plan Name(s) <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Business Freedom 150, Corporate 250, Unlimited 300"
                  value={planName}
                  onChangeText={setPlanName}
                />
                {!editingId && (
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                    💡 Tip: Separate multiple plan names with commas to add them in bulk.
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Switch
                    value={status === 'Active'}
                    onValueChange={(val) => setStatus(val ? 'Active' : 'Inactive')}
                    trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                    thumbColor={COLORS.white}
                  />
                  <Text style={{ marginLeft: 8, fontSize: 14, color: status === 'Active' ? '#10B981' : COLORS.textSecondary, fontWeight: '500' }}>
                    {status}
                  </Text>
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Plan'}</Text>
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
  formGroup: {
    marginBottom: 20,
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
