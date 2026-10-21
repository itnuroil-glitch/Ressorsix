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
import { API_URL } from '../config';

const EMPTY_FORM = {
  package_name: '',
  monthly_plan_amount: '',
  data_allowance: '',
  data_unit: 'GB',
  local_minutes: '',
  international_minutes: '',
  local_sms: '',
  international_sms: '',
  cug: '',
  status: 'Active',
};

const dash = (v) => (v === undefined || v === null || String(v).trim() === '' ? '—' : String(v));

export default function TelePackageTab({ user, showToast, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const can = (key) =>
    !user || String(user.roleId) === '1' || (permissions && (permissions[key] || permissions.full_control));
  const canCreate = can('can_create');
  const canEdit = can('can_edit');
  const canDelete = can('can_delete');

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await fetchPackages();
      // First visit with an empty master: pull in the plans already used on connections (once)
      let alreadyImported = false;
      try { alreadyImported = typeof localStorage !== 'undefined' && localStorage.getItem('telePackageImported') === '1'; } catch (e) { }
      if (list && list.length === 0 && !alreadyImported) {
        try { localStorage.setItem('telePackageImported', '1'); } catch (e) { }
        importFromConnections(true);
      }
    })();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/tele-packages${clientQuery}`);
      if (!res.ok) throw new Error('Failed to fetch tele packages');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPackages(list);
      return list;
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading tele packages', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Bring the plans already used on telecom connections into this master
  const importFromConnections = async (silent = false) => {
    setImporting(true);
    try {
      const res = await fetch(`${API_URL}/api/tele-packages/import-from-connections`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Import failed');
      await fetchPackages();
      if (!silent && showToast) showToast(body.message || 'Import completed', body.imported ? 'success' : 'info');
    } catch (err) {
      console.error(err);
      if (!silent && showToast) showToast(err.message || 'Error importing packages', 'error');
    } finally {
      setImporting(false);
    }
  };

  const filtered = packages.filter((p) =>
    (p.package_name || '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openModal = (item = null) => {
    setShowErrors(false);
    if (item) {
      setEditingId(item.id);
      setForm({
        package_name: item.package_name || '',
        monthly_plan_amount:
          item.monthly_plan_amount === null || item.monthly_plan_amount === undefined
            ? ''
            : String(item.monthly_plan_amount),
        data_allowance: item.data_allowance || '',
        data_unit: item.data_unit || 'GB',
        local_minutes: item.local_minutes || '',
        international_minutes: item.international_minutes || '',
        local_sms: item.local_sms || '',
        international_sms: item.international_sms || '',
        cug: item.cug || '',
        status: item.status || 'Active',
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const missingName = showErrors && !form.package_name.trim();
  const missingAmount = showErrors && !String(form.monthly_plan_amount).trim();

  const handleSave = async () => {
    if (!form.package_name.trim() || !String(form.monthly_plan_amount).trim()) {
      setShowErrors(true);
      if (showToast) showToast('Please fill mandatory fields: Package Plan Name, Monthly Plan Amount', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, client_id: user?.clientid || null };
      const url = editingId
        ? `${API_URL}/api/tele-packages/${editingId}`
        : `${API_URL}/api/tele-packages`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }
      if (showToast)
        showToast(editingId ? 'Tele package updated successfully' : 'Tele package created successfully', 'success');
      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error saving tele package', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/tele-packages/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }
      if (showToast) showToast('Tele package deleted successfully', 'success');
      setDeleteTarget(null);
      fetchPackages();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error deleting tele package', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderField = (label, key, placeholder, opts = {}) => (
    <View style={opts.full ? { width: '100%' } : styles.formCol}>
      <Text style={styles.inputLabel}>
        {label}
        {opts.required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.textInput, opts.error && styles.textInputError]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={form[key]}
        onChangeText={(val) => setField(key, val)}
        keyboardType={opts.numeric ? 'numeric' : 'default'}
      />
      {opts.error ? (
        <Text style={styles.errorText}>{label} is required</Text>
      ) : opts.helper ? (
        <Text style={styles.helperText}>{opts.helper}</Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      <View
        style={[
          styles.headerContainer,
          !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
        ]}
      >
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconSquareBadge}>
            <Ionicons name="cube-outline" size={22} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.tabHeadingTitle}>Tele Package</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage telecom package plans with their monthly amount and allowances.
            </Text>
          </View>
        </View>

        {canCreate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={[styles.importBtn, importing && { opacity: 0.6 }]}
              onPress={() => importFromConnections(false)}
              disabled={importing}
              activeOpacity={0.8}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#004D34" />
              ) : (
                <Ionicons name="download-outline" size={16} color="#004D34" />
              )}
              <Text style={styles.importBtnText}>Import from Connections</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Tele Package</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tableCard}>
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search package names..."
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setPage(1);
              }}
              placeholderTextColor="#94A3B8"
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(''); setPage(1); }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color="#004D34" />
            <Text style={styles.loaderText}>Loading tele packages...</Text>
          </View>
        ) : filtered.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: 1100, flexGrow: 1 }]}>
                <View style={styles.tableHeader}>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 0.7 }]}>ID</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 2.6 }]}>PACKAGE NAME</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.6 }]}>MONTHLY AMOUNT</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.2 }]}>DATA</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.1 }]}>LOCAL MIN</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.1 }]}>INTL MIN</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.1 }]}>LOCAL SMS</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.1 }]}>INTL SMS</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.0 }]}>CUG</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
                  <Text numberOfLines={1} style={[styles.thCell, { flex: 1.1, textAlign: 'center' }]}>ACTIONS</Text>
                </View>

                {pageRows.map((item, index) => {
                  const isInactive = (item.status || '').toLowerCase() !== 'active';
                  return (
                    <View
                      key={item.id}
                      style={[styles.tableRow, index === pageRows.length - 1 && styles.lastTableRow]}
                    >
                      <Text style={[styles.tdCell, { flex: 0.7, fontWeight: '700' }]}>#{item.id}</Text>
                      <Text style={[styles.tdCell, { flex: 2.6, fontWeight: '600' }]}>{item.package_name}</Text>
                      <Text style={[styles.tdCell, { flex: 1.6, fontWeight: '700', color: '#166534' }]}>
                        {Number(item.monthly_plan_amount || 0).toFixed(2)} AED
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1.2 }]}>
                        {item.data_allowance ? `${item.data_allowance} ${item.data_unit || 'GB'}` : '—'}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1.1 }]}>{dash(item.local_minutes)}</Text>
                      <Text style={[styles.tdCell, { flex: 1.1 }]}>{dash(item.international_minutes)}</Text>
                      <Text style={[styles.tdCell, { flex: 1.1 }]}>{dash(item.local_sms)}</Text>
                      <Text style={[styles.tdCell, { flex: 1.1 }]}>{dash(item.international_sms)}</Text>
                      <Text style={[styles.tdCell, { flex: 1.0 }]}>{dash(item.cug)}</Text>
                      <View style={[styles.tdCell, { flex: 1.2, alignItems: 'center' }]}>
                        <View style={[styles.statusBadge, isInactive ? styles.statusInactive : styles.statusActive]}>
                          <Text style={[styles.statusText, isInactive ? styles.statusTextInactive : styles.statusTextActive]}>
                            {(item.status || 'ACTIVE').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tdCell, { flex: 1.1, flexDirection: 'row', justifyContent: 'center', gap: 14 }]}>
                        {canEdit && (
                          <TouchableOpacity style={styles.rowActionEdit} onPress={() => openModal(item)} activeOpacity={0.7}>
                            <Ionicons name="pencil" size={16} color="#166534" />
                          </TouchableOpacity>
                        )}
                        {canDelete && (
                          <TouchableOpacity style={styles.rowActionDelete} onPress={() => setDeleteTarget(item)} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.paginationRow}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Showing <Text style={styles.boldNum}>{(currentPage - 1) * itemsPerPage + 1}</Text> to{' '}
                <Text style={styles.boldNum}>{Math.min(currentPage * itemsPerPage, filtered.length)}</Text> of{' '}
                <Text style={styles.boldNum}>{filtered.length}</Text> entries
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
                  disabled={currentPage <= 1}
                  onPress={() => setPage((p) => p - 1)}
                >
                  <Text style={[styles.pageNavText, currentPage <= 1 && styles.pageNavTextDisabled]}>{'< Prev'}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Page <Text style={styles.boldNum}>{currentPage}</Text> of {totalPages}
                </Text>
                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={[styles.pageNavText, currentPage >= totalPages && styles.pageNavTextDisabled]}>{'Next >'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="cube-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {packages.length === 0 ? 'No tele packages created yet.' : 'No matching tele packages found.'}
            </Text>
          </View>
        )}
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 680 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={22} color="#0F172A" />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Tele Package</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.formGrid}>
                {renderField('Package Plan Name', 'package_name', 'e.g. Standard 100 AED Plan', {
                  full: true,
                  required: true,
                  error: missingName,
                })}
                {renderField('Monthly Plan Amount (AED)', 'monthly_plan_amount', '100', {
                  required: true,
                  numeric: true,
                  error: missingAmount,
                  helper: 'Bills above this amount are marked as excess',
                })}

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Data Allowance</Text>
                  <View style={{ gap: 8 }}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10.5"
                      placeholderTextColor="#94A3B8"
                      value={form.data_allowance}
                      onChangeText={(val) => setField('data_allowance', val)}
                    />
                  </View>
                </View>
                {renderField('Local Minutes', 'local_minutes', '750', { numeric: true })}
                {renderField('International Minutes', 'international_minutes', '250', { numeric: true })}
                {renderField('Local SMS', 'local_sms', '65', { numeric: true })}
                {renderField('International SMS', 'international_sms', '65', { numeric: true })}
                {renderField('CUG', 'cug', '10000', { numeric: true })}

                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', height: 42 }}>
                    <Switch
                      value={form.status === 'Active'}
                      onValueChange={(val) => setField('status', val ? 'Active' : 'Inactive')}
                      trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                      thumbColor="#FFFFFF"
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        fontSize: 14,
                        color: form.status === 'Active' ? '#10B981' : '#64748B',
                        fontWeight: '500',
                      }}
                    >
                      {form.status}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)} disabled={saving}>
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Package'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={{ padding: 28, alignItems: 'center' }}>
              <View style={styles.deleteIconWrap}>
                <Ionicons name="warning-outline" size={28} color="#DC2626" />
              </View>
              <Text style={styles.deleteTitle}>Delete Tele Package?</Text>
              <Text style={styles.deleteText}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>{deleteTarget?.package_name}</Text>?
              </Text>
              <Text style={styles.deleteHint}>
                Connections already using this plan keep their saved values.
              </Text>
            </View>
            <View style={[styles.modalFooter, { justifyContent: 'center' }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteTarget(null)} disabled={deleting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, deleting && { opacity: 0.7 }]}
                onPress={handleConfirmDelete}
                disabled={deleting}
                activeOpacity={0.85}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Delete Package</Text>
                  </>
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
  tabContent: { flex: 1, padding: 24, backgroundColor: '#F8FAFC' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconSquareBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  importBtnText: { color: '#004D34', fontWeight: '700', fontSize: 13 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  toolbarWrapper: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
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
  searchBarInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: '#334155', outlineStyle: 'none' },
  tableLoaderContainer: { padding: 40, alignItems: 'center' },
  loaderText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  tableWrapper: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  lastTableRow: { borderBottomWidth: 0 },
  tdCell: { fontSize: 13, color: '#0F172A' },
  rowActionEdit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionDelete: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusActive: { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#7DD3FC' },
  statusInactive: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
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
  boldNum: { fontWeight: '700', color: '#334155' },
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
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
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
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '4%', rowGap: 16 },
  formCol: { width: '48%' },
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
  textInputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  deleteIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  deleteText: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21 },
  deleteHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  helperText: { fontSize: 11, color: '#64748B', marginTop: 4 },
  errorText: { fontSize: 11, color: '#DC2626', marginTop: 4, fontWeight: '500' },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unitChip: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#E2E8F0' },
  unitChipActive: { backgroundColor: '#0E5434' },
  unitChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
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
  saveBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 8, backgroundColor: '#004D34' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
