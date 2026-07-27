import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

// Available modules will be fetched dynamically from the database's module table

export default function PlanManagementTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed, permissions }) {
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Form states
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [enabledModules, setEnabledModules] = useState([]);
  const [status, setStatus] = useState(1);
  const [saving, setSaving] = useState(false);

  const [dbModules, setDbModules] = useState([]);

  useEffect(() => {
    fetchPlans();
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch(`${API_URL}/api/modules`);
      if (!res.ok) throw new Error('Failed to fetch modules data');
      const data = await res.json();

      // Keep all active modules (both parents and submodules)
      const activeModules = data.filter(m => !m.status || String(m.status).toLowerCase() === 'active' || String(m.status) === '1');
      setDbModules(activeModules);
    } catch (err) {
      console.error('Error fetching modules:', err);
      showToast('Error loading active modules', 'error');
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/plans`);
      if (!res.ok) throw new Error('Failed to fetch plan data');
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(p =>
    p.plan_name && p.plan_name.toLowerCase().includes(search.toLowerCase())
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredPlans.length / ITEMS_PER_PAGE)));
  const paginatedPlans = filteredPlans.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleToggleModule = (moduleId, childrenIds = []) => {
    const isCurrentlyChecked = enabledModules.includes(moduleId);
    let updated = [...enabledModules];

    if (isCurrentlyChecked) {
      // Uncheck parent or submodule
      updated = updated.filter(m => m !== moduleId);
      // Also uncheck all children if they are present
      if (childrenIds.length > 0) {
        updated = updated.filter(m => !childrenIds.includes(m));
      }
    } else {
      // Check parent or submodule
      if (!updated.includes(moduleId)) {
        updated.push(moduleId);
      }
      // Also check all children if any
      childrenIds.forEach(childId => {
        if (!updated.includes(childId)) {
          updated.push(childId);
        }
      });
    }
    setEnabledModules(updated);
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      showToast('Plan name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan_name: planName.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0.00,
        enabled_modules: enabledModules,
        status: parseInt(status, 10)
      };

      const url = editingId ? `${API_URL}/api/plans/${editingId}` : `${API_URL}/api/plans`;
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

      showToast(editingId ? 'Plan updated successfully' : 'Plan created successfully', 'success');
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving subscription plan', 'error');
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
      const res = await fetch(`${API_URL}/api/plans/${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Plan deleted successfully', 'success');
      fetchPlans();
    } catch (err) {
      console.error(err);
      showToast('Error deleting plan', 'error');
    }
  };

  const openModal = (planObj = null) => {
    if (planObj) {
      setEditingId(planObj.id);
      setPlanName(planObj.plan_name || '');
      setDescription(planObj.description || '');
      setPrice(planObj.price ? String(planObj.price) : '0.00');
      
      let modulesList = [];
      if (planObj.enabled_modules) {
        try {
          modulesList = typeof planObj.enabled_modules === 'string'
            ? JSON.parse(planObj.enabled_modules)
            : planObj.enabled_modules;
        } catch (e) {
          modulesList = [];
        }
      }
      setEnabledModules(Array.isArray(modulesList) ? modulesList.map(String) : []);
      setStatus(planObj.status !== undefined ? planObj.status : 1);
    } else {
      setEditingId(null);
      setPlanName('');
      setDescription('');
      setPrice('0.00');
      setEnabledModules([]);
      setStatus(1);
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
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Subscription Plans</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Configure tiers, price models, and module accessibility per client account.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add New Plan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search by plan name...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Querying plan tables...</Text>
          </View>
        ) : filteredPlans.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 600 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <View style={{ flex: 1.0 }}><Text style={styles.thCell}>ID</Text></View>
                    <View style={{ flex: 3.5 }}><Text style={styles.thCell}>PLAN NAME</Text></View>
                    <View style={{ flex: 1.5 }}><Text style={styles.thCell}>PRICE</Text></View>
                    <View style={{ flex: 1.2 }}><Text style={styles.thCell}>STATUS</Text></View>
                    <View style={{ flex: 1.5, alignItems: 'center' }}><Text style={styles.thCell}>ACTIONS</Text></View>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedPlans.map((item, index) => {
                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedPlans.length - 1 && styles.lastTableRow]}>
                        <View style={{ flex: 1.0 }}>
                          <Text style={[styles.tdCell, { fontWeight: '700' }]}>#{item.id}</Text>
                        </View>
                        <View style={{ flex: 3.5 }}>
                          <Text style={[styles.tdCell, { color: COLORS.textPrimary, fontWeight: '700' }]}>{item.plan_name}</Text>
                          {item.description ? (
                            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>{item.description}</Text>
                          ) : null}
                        </View>
                        <View style={{ flex: 1.5 }}>
                          <Text style={[styles.tdCell, { fontWeight: '700', color: COLORS.primary }]}>
                            ${parseFloat(item.price).toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flex: 1.2 }}>
                          <View style={[styles.statusBadge, { backgroundColor: item.status === 1 ? '#EBF4F0' : '#FFF5F5' }]}>
                            <Text style={[styles.statusBadgeText, { color: item.status === 1 ? '#10B981' : '#EF4444' }]}>
                              {item.status === 1 ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
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
            {renderTablePagination(filteredPlans.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="card-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{plans.length === 0 ? "No plans configured yet." : "No matching plans found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 650 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Create'} Subscription Plan</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalForm, { maxHeight: 500, padding: 20 }]}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Plan Name <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Basic Plan"
                  value={planName}
                  onChangeText={setPlanName}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Price ($) <Text style={{color: 'red'}}>*</Text></Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 49.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <TouchableOpacity
                      style={[styles.statusSelectBtn, status === 1 && { backgroundColor: '#ECECFE', borderColor: COLORS.primary }]}
                      onPress={() => setStatus(1)}
                    >
                      <Text style={[styles.statusSelectText, status === 1 && { color: COLORS.primary }]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusSelectBtn, status === 0 && { backgroundColor: '#FEECEC', borderColor: COLORS.error }]}
                      onPress={() => setStatus(0)}
                    >
                      <Text style={[styles.statusSelectText, status === 0 && { color: COLORS.error }]}>Inactive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Details about plan tier..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Enable Access to Modules</Text>
                {dbModules.filter(m => m.parent_id === null || m.parent_id === undefined || m.parent_id === '').map(parent => {
                  const submodules = dbModules.filter(m => m.parent_id !== null && m.parent_id !== undefined && String(m.parent_id) === String(parent.id));
                  const isParentChecked = enabledModules.includes(parent.id.toString());
                  const childrenIds = submodules.map(sub => sub.id.toString());

                  return (
                    <View key={parent.id} style={styles.parentModuleSection}>
                      {/* Parent Card */}
                      <TouchableOpacity
                        style={[styles.parentModuleCheckCard, isParentChecked && styles.moduleCheckCardChecked]}
                        onPress={() => handleToggleModule(parent.id.toString(), childrenIds)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.checkbox, isParentChecked && styles.checkboxChecked]}>
                          {isParentChecked && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                        </View>
                        <Text style={[styles.parentModuleCheckText, isParentChecked && styles.parentModuleCheckTextChecked]}>
                          {parent.module_name}
                        </Text>
                      </TouchableOpacity>

                      {/* Submodules Grid */}
                      {submodules.length > 0 && (
                        <View style={styles.submodulesContainer}>
                          <View style={styles.submodulesGrid}>
                            {submodules.map(sub => {
                              const isSubChecked = enabledModules.includes(sub.id.toString());
                              return (
                                <TouchableOpacity
                                  key={sub.id}
                                  style={[styles.submoduleCheckCard, isSubChecked && styles.moduleCheckCardChecked]}
                                  onPress={() => handleToggleModule(sub.id.toString())}
                                  activeOpacity={0.8}
                                >
                                  <View style={[styles.checkbox, isSubChecked && styles.checkboxChecked]}>
                                    {isSubChecked && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                                  </View>
                                  <Text style={[styles.submoduleCheckText, isSubChecked && styles.submoduleCheckTextChecked]}>
                                    {sub.module_name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Plan'}</Text>
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
                Are you sure you want to delete this subscription plan? This will soft-delete the plan and prevent new clients from registering to it.
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
                <Text style={styles.saveBtnText}>Delete Plan</Text>
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
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  tabHeadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabHeadingSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    ...SHADOWS.small,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tableLoaderContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loaderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  tableWrapper: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tdCell: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  codeBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  moduleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  moduleTagText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  modalForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
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
  statusSelectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  parentModuleSection: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  parentModuleCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  parentModuleCheckText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  parentModuleCheckTextChecked: {
    color: COLORS.primary,
  },
  submodulesContainer: {
    padding: 12,
    backgroundColor: COLORS.white,
  },
  submodulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  submoduleCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 8,
    borderRadius: 6,
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  submoduleCheckText: {
    fontSize: 12,
    color: '#475569',
  },
  submoduleCheckTextChecked: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  moduleCheckCardChecked: {
    borderColor: COLORS.primary,
    backgroundColor: '#F8F8FF',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  moduleCheckText: {
    fontSize: 13,
    color: '#475569',
  },
  moduleCheckTextChecked: {
    fontWeight: '600',
    color: COLORS.primary,
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
