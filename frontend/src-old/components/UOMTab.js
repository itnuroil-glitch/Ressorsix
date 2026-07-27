import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function UOMTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));

  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  const [uomName, setUomName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUoms();
  }, []);

  const fetchUoms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/uom`);
      if (!res.ok) throw new Error('Failed to fetch UOM data');
      const data = await res.json();
      setUoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading Units of Measure', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUoms = uoms.filter(u => 
    (u.uom_name && u.uom_name.toLowerCase().includes(search.toLowerCase()))
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredUoms.length / ITEMS_PER_PAGE)));
  const paginatedUoms = filteredUoms.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!uomName.trim()) {
      showToast('UOM Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingId;
      let payload;
      
      if (isEdit) {
        // If editing, we only update the single record
        payload = { uom_name: uomName.trim() };
      } else {
        // If creating, allow multiple comma-separated names
        const namesArray = uomName.split(',').map(n => n.trim()).filter(n => n);
        if (namesArray.length === 0) {
          showToast('Please enter at least one UOM Name', 'error');
          setSaving(false);
          return;
        }
        payload = { uom_names: namesArray };
      }

      const url = isEdit ? `${API_URL}/api/uom/${editingId}` : `${API_URL}/api/uom`;
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
      
      showToast(editingId ? 'Unit of Measure updated successfully' : 'Unit of Measure created successfully', 'success');
      setIsModalOpen(false);
      fetchUoms();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving Unit of Measure', 'error');
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
      const res = await fetch(`${API_URL}/api/uom/${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Unit of Measure deleted successfully', 'success');
      fetchUoms();
    } catch (err) {
      console.error(err);
      showToast('Error deleting Unit of Measure', 'error');
    }
  };

  const openModal = (uom = null) => {
    if (uom) {
      setEditingId(uom.id);
      setUomName(uom.uom_name || '');
    } else {
      setEditingId(null);
      setUomName('');
    }
    setIsModalOpen(true);
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={styles.iconWrapper}>
            <Ionicons name="options-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Units of Measure (UOM)</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage Units of Measure for purchasing and inventory items.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add UOM</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search by UOM name...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading Units of Measure...</Text>
          </View>
        ) : filteredUoms.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 600 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 5.5 }]}>UOM NAME</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedUoms.map((item, index) => {
                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedUoms.length - 1 && styles.lastTableRow]}>
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 5.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.uom_name}
                        </Text>

                        {/* Actions */}
                        <View style={[styles.tdCell, { flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
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
            {renderTablePagination(filteredUoms.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="options-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{uoms.length === 0 ? "No Units of Measure created yet." : "No matching UOMs found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={[styles.modalCard, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Unit of Measure</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>UOM Name(s) <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={editingId ? "e.g. Kilogram" : "e.g. Pieces, Kilogram, Box"}
                  value={uomName}
                  onChangeText={setUomName}
                />
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create UOM'}</Text>
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
                Are you sure you want to delete this Unit of Measure? This action cannot be undone.
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
