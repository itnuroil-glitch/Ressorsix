import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';

export default function VATTab({ user, showToast, renderTableToolbar, renderTablePagination, isSidebarCollapsed, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));

  const [vats, setVats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  const [vatValue, setVatValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVats();
  }, []);

  const fetchVats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/vat`);
      if (!res.ok) throw new Error('Failed to fetch VAT data');
      const data = await res.json();
      setVats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Error loading VAT rates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredVats = vats.filter(v => 
    (v.vat !== undefined && String(v.vat).includes(search))
  );

  const displayPage = Math.min(page, Math.max(1, Math.ceil(filteredVats.length / ITEMS_PER_PAGE)));
  const paginatedVats = filteredVats.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

  const handleSave = async () => {
    if (!vatValue.trim()) {
      showToast('VAT rate is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingId;
      let payload;
      
      if (isEdit) {
        // If editing, we only update the single record
        const val = vatValue.trim();
        if (!val) {
          showToast('Please enter a valid VAT rate', 'error');
          setSaving(false);
          return;
        }
        payload = { vat: val };
      } else {
        // If creating, allow multiple comma-separated values
        const valuesArray = vatValue.split(',')
          .map(n => n.trim())
          .filter(n => n.length > 0);
        
        if (valuesArray.length === 0) {
          showToast('Please enter at least one valid VAT rate', 'error');
          setSaving(false);
          return;
        }
        payload = { vats: valuesArray };
      }

      const url = isEdit ? `${API_URL}/api/vat/${editingId}` : `${API_URL}/api/vat`;
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
      
      showToast(editingId ? 'VAT rate updated successfully' : 'VAT rate created successfully', 'success');
      setIsModalOpen(false);
      fetchVats();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving VAT rate', 'error');
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
      const res = await fetch(`${API_URL}/api/vat/${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('VAT rate deleted successfully', 'success');
      fetchVats();
    } catch (err) {
      console.error(err);
      showToast('Error deleting VAT rate', 'error');
    }
  };

  const openModal = (vatObj = null) => {
    if (vatObj) {
      setEditingId(vatObj.id);
      setVatValue(String(vatObj.vat || ''));
    } else {
      setEditingId(null);
      setVatValue('');
    }
    setIsModalOpen(true);
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={styles.iconWrapper}>
            <Ionicons name="calculator-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>VAT Rates</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage standard and custom Value Added Tax (VAT) percentages.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add VAT Rate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar(search, setSearch, setPage, 'Search by VAT rate...')}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading VAT rates...</Text>
          </View>
        ) : filteredVats.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 600 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <View style={{ flex: 1.0 }}>
                      <Text style={styles.thCell}>ID</Text>
                    </View>
                    <View style={{ flex: 5.5 }}>
                      <Text style={styles.thCell}>VAT RATE (%)</Text>
                    </View>
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <Text style={styles.thCell}>ACTIONS</Text>
                    </View>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedVats.map((item, index) => {
                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedVats.length - 1 && styles.lastTableRow]}>
                        <View style={{ flex: 1.0 }}>
                          <Text style={[styles.tdCell, { fontWeight: '700' }]}>#{item.id}</Text>
                        </View>
                        <View style={{ flex: 5.5 }}>
                          <Text style={[styles.tdCell, { color: COLORS.textPrimary, fontWeight: '600' }]}>
                            {String(item.vat).trim().endsWith('%') ? item.vat : (isNaN(parseFloat(item.vat)) ? item.vat : `${item.vat}%`)}
                          </Text>
                        </View>
                        <View style={{ flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
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
            {renderTablePagination(filteredVats.length, page, setPage)}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="calculator-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{vats.length === 0 ? "No VAT rates created yet." : "No matching VAT rates found."}</Text>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} VAT Rate</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>VAT Rate / Name <Text style={{color: 'red'}}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={editingId ? "e.g. 15 or Exempt" : "e.g. 5, 10, Exempt"}
                  value={vatValue}
                  onChangeText={setVatValue}
                  keyboardType="default"
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create VAT Rate'}</Text>
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
                Are you sure you want to delete this VAT rate? This action cannot be undone.
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
