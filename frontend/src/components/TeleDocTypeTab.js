import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { API_URL } from '../config';

export default function TeleDocTypeTab({
  user,
  showToast,
  isSidebarCollapsed,
  permissions,
  pageTitle = 'Tele Document Type',
  pageSubtitle = 'Manage document types for contract tracking and file management.',
  addBtnText = 'Add Tele Document Type',
  modalTitle = 'Tele Document Type',
  headerIcon = 'document-attach-outline',
}) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate =
    !user ||
    String(user.roleId) === '1' ||
    (permissions && (permissions.can_create || permissions.full_control));
  const canEdit =
    !user ||
    String(user.roleId) === '1' ||
    (permissions && (permissions.can_edit || permissions.full_control));
  const canDelete =
    !user ||
    String(user.roleId) === '1' ||
    (permissions && (permissions.can_delete || permissions.full_control));

  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form fields
  const [docTypeName, setDocTypeName] = useState('');
  const [status, setStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeleDocTypes();
  }, []);

  const fetchTeleDocTypes = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/tele-doc-types${clientQuery}`);
      if (!res.ok) throw new Error('Failed to fetch tele document type data');
      const data = await res.json();
      setDocTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading tele document types', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocTypes = docTypes.filter((c) =>
    c.doc_type_name && c.doc_type_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredDocTypes.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedDocTypes = filteredDocTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = async () => {
    if (!docTypeName.trim()) {
      if (showToast) showToast('Document type name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        doc_type_name: docTypeName.trim(),
        status: status,
        client_id: user?.clientid || null,
      };

      const url = editingId
        ? `${API_URL}/api/tele-doc-types/${editingId}`
        : `${API_URL}/api/tele-doc-types`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }

      if (showToast)
        showToast(
          editingId
            ? 'Tele document type updated successfully'
            : 'Tele document type created successfully',
          'success'
        );
      setIsModalOpen(false);
      fetchTeleDocTypes();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error saving tele document type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tele document type?')) return;
    try {
      const res = await fetch(`${API_URL}/api/tele-doc-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (showToast) showToast('Tele document type deleted successfully', 'success');
      fetchTeleDocTypes();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error deleting tele document type', 'error');
    }
  };

  const openModal = (itemObj = null) => {
    if (itemObj) {
      setEditingId(itemObj.id);
      setDocTypeName(itemObj.doc_type_name || '');
      setStatus(itemObj.status || 'Active');
    } else {
      setEditingId(null);
      setDocTypeName('');
      setStatus('Active');
    }
    setIsModalOpen(true);
  };

  return (
    <View style={styles.tabContent}>
      {/* HEADER SECTION */}
      <View
        style={[
          styles.headerContainer,
          !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
        ]}
      >
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconSquareBadge}>
            <Ionicons name={headerIcon} size={22} color="#0284C7" />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.tabHeadingTitle}>{pageTitle}</Text>
            <Text style={styles.tabHeadingSubtitle}>
              {pageSubtitle}
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {addBtnText.startsWith('+') ? addBtnText : `+ ${addBtnText}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE CARD */}
      <View style={styles.tableCard}>
        {/* TOOLBAR SEARCH BAR */}
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search document type names..."
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setPage(1);
              }}
              placeholderTextColor="#94A3B8"
            />
            {search ? (
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color="#004D34" />
            <Text style={styles.loaderText}>Loading tele document types...</Text>
          </View>
        ) : filteredDocTypes.length > 0 ? (
          <>
            <View style={styles.tableWrapper}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                <Text style={[styles.thCell, { flex: 4.0 }]}>DOCUMENT TYPE NAME</Text>
                <Text style={[styles.thCell, { flex: 2.0, textAlign: 'center' }]}>STATUS</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {/* Table Rows */}
              {paginatedDocTypes.map((item, index) => {
                const isInactive = (item.status || '').toLowerCase() !== 'active';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.tableRow,
                      index === paginatedDocTypes.length - 1 && styles.lastTableRow,
                    ]}
                  >
                    <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700', color: '#0F172A' }]}>
                      #{item.id}
                    </Text>

                    <Text
                      style={[
                        styles.tdCell,
                        { flex: 4.0, color: '#0F172A', fontWeight: '600', fontSize: 13 },
                      ]}
                    >
                      {item.doc_type_name}
                    </Text>

                    {/* Status Badge */}
                    <View style={[styles.tdCell, { flex: 2.0, alignItems: 'center' }]}>
                      <View
                        style={[
                          styles.statusBadge,
                          isInactive ? styles.statusInactive : styles.statusActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isInactive ? styles.statusTextInactive : styles.statusTextActive,
                          ]}
                        >
                          {(item.status || 'ACTIVE').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View
                      style={[
                        styles.tdCell,
                        { flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 14 },
                      ]}
                    >
                      {canEdit && (
                        <TouchableOpacity onPress={() => openModal(item)} activeOpacity={0.7}>
                          <Ionicons name="pencil" size={18} color="#166534" />
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity onPress={() => handleDelete(item.id)} activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* PAGINATION FOOTER */}
            <View style={styles.paginationRow}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Showing{' '}
                <Text style={{ fontWeight: '700', color: '#334155' }}>
                  {(currentPage - 1) * itemsPerPage + 1}
                </Text>{' '}
                to{' '}
                <Text style={{ fontWeight: '700', color: '#334155' }}>
                  {Math.min(currentPage * itemsPerPage, filteredDocTypes.length)}
                </Text>{' '}
                of{' '}
                <Text style={{ fontWeight: '700', color: '#334155' }}>
                  {filteredDocTypes.length}
                </Text>{' '}
                entries
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
                  disabled={currentPage <= 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <Text style={[styles.pageNavText, currentPage <= 1 && styles.pageNavTextDisabled]}>
                    {'< Prev'}
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Page <Text style={{ fontWeight: '700', color: '#334155' }}>{currentPage}</Text> of{' '}
                  {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text
                    style={[
                      styles.pageNavText,
                      currentPage >= totalPages && styles.pageNavTextDisabled,
                    ]}
                  >
                    {'Next >'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="document-attach-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {docTypes.length === 0
                ? 'No tele document types created yet.'
                : 'No matching tele document types found.'}
            </Text>
          </View>
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons
                  name={editingId ? 'pencil-outline' : 'add-circle-outline'}
                  size={22}
                  color="#0F172A"
                />
                <Text style={styles.modalTitle}>
                  {editingId ? 'Edit' : 'Add'} {modalTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { padding: 20 }]}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Document Type Name(s) <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Telecom Invoice, SIM Contract, Device Warranty, Provider Agreement"
                  value={docTypeName}
                  onChangeText={setDocTypeName}
                  placeholderTextColor="#94A3B8"
                />
                {!editingId && (
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                    💡 Tip: Separate multiple document type names with commas to add them in bulk.
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
                    thumbColor="#FFFFFF"
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 14,
                      color: status === 'Active' ? '#10B981' : '#64748B',
                      fontWeight: '500',
                    }}
                  >
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingId ? 'Save Changes' : `Create ${modalTitle}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 24, backgroundColor: '#F8FAFC' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconSquareBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: { justifyContent: 'center' },
  tabHeadingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  tabHeadingSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#004D34',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  toolbarWrapper: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 320,
  },
  searchBarInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#334155',
    outlineStyle: 'none',
  },
  tableLoaderContainer: { padding: 40, alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  tableWrapper: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  lastTableRow: { borderBottomWidth: 0 },
  tdCell: { fontSize: 13, color: '#0F172A' },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActive: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statusTextActive: { color: '#0284C7' },
  statusTextInactive: { color: '#EF4444' },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pageNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageNavBtnDisabled: { backgroundColor: '#F1F5F9' },
  pageNavText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  pageNavTextDisabled: { color: '#94A3B8' },
  emptyView: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  modalCloseBtn: { padding: 4 },
  formGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  textInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    outlineStyle: 'none',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#004D34',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
