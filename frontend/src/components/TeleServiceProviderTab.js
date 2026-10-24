import React, { useState, useEffect, useMemo } from 'react';
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
  company_name: '',
  connection_type: '',
  service_provider: '',
  account_number: '',
  status: 'Active',
};

// Tele Service Provider master (Settings > Tele Service Provider):
// which service provider a company uses, together with the account number.
export default function TeleServiceProviderTab({ user, showToast, permissions }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const can = (key) =>
    !user || String(user.roleId) === '1' || (permissions && (permissions[key] || permissions.full_control));
  const canCreate = can('can_create');
  const canEdit = can('can_edit');
  const canDelete = can('can_delete');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const [companies, setCompanies] = useState([]);
  const [connectionTypes, setConnectionTypes] = useState([]);
  const [providers, setProviders] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [openList, setOpenList] = useState(null); // 'company' | 'connectionType' | 'provider' | null
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRows();
    fetchOptions();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/tele-service-providers${clientQuery}`);
      if (!res.ok) throw new Error('Failed to fetch tele service providers');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading tele service providers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const [cRes, tRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/companies`),
        fetch(`${API_URL}/api/tele-connection-types${clientQuery}`),
        fetch(`${API_URL}/api/telecom-providers${clientQuery}`),
      ]);
      if (cRes.ok) {
        const c = await cRes.json();
        if (Array.isArray(c)) setCompanies(c);
      }
      if (tRes.ok) {
        const t = await tRes.json();
        if (Array.isArray(t)) setConnectionTypes(t);
      }
      if (pRes.ok) {
        const p = await pRes.json();
        if (Array.isArray(p)) setProviders(p);
      }
    } catch (err) {
      console.warn('Could not load company / connection type / provider lists', err);
    }
  };

  const companyOptions = useMemo(() => {
    const names = companies
      .filter((c) => !c.is_deleted && c.company_name)
      .filter((c) => !user?.clientid || String(c.clientid ?? c.client_id ?? '') === String(user.clientid))
      .map((c) => String(c.company_name).trim());
    return Array.from(new Set(names));
  }, [companies, user?.clientid]);

  const providerOptions = useMemo(() => {
    const names = providers
      .filter((p) => String(p.status || 'Active').toLowerCase() === 'active' && p.provider_name)
      .map((p) => String(p.provider_name).trim());
    return Array.from(new Set(names));
  }, [providers]);

  const connectionTypeOptions = useMemo(() => {
    const names = connectionTypes
      .filter((t) => String(t.status || 'Active').toLowerCase() === 'active' && t.connection_type_name)
      .map((t) => String(t.connection_type_name).trim());
    return Array.from(new Set(names));
  }, [connectionTypes]);

  const term = search.toLowerCase();
  const filtered = rows.filter(
    (r) =>
      (r.company_name || '').toLowerCase().includes(term) ||
      (r.connection_type || '').toLowerCase().includes(term) ||
      (r.service_provider || '').toLowerCase().includes(term) ||
      (r.account_number || '').toLowerCase().includes(term)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const openModal = (item = null) => {
    setShowErrors(false);
    setOpenList(null);
    if (item) {
      setEditingId(item.id);
      setForm({
        company_name: item.company_name || '',
        connection_type: item.connection_type || '',
        service_provider: item.service_provider || '',
        account_number: item.account_number || '',
        status: item.status || 'Active',
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const missing = (key) => showErrors && !String(form[key] || '').trim();

  const handleSave = async () => {
    const missingLabels = [];
    if (!form.company_name.trim()) missingLabels.push('Company');
    if (!form.connection_type.trim()) missingLabels.push('Connection Type');
    if (!form.service_provider.trim()) missingLabels.push('Service Provider');
    if (!form.account_number.trim()) missingLabels.push('Account Number');
    if (missingLabels.length > 0) {
      setShowErrors(true);
      if (showToast) showToast(`Please fill mandatory fields: ${missingLabels.join(', ')}`, 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, client_id: user?.clientid || null };
      const res = await fetch(
        editingId ? `${API_URL}/api/tele-service-providers/${editingId}` : `${API_URL}/api/tele-service-providers`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Save failed');
      }
      if (showToast)
        showToast(
          editingId ? 'Tele service provider updated successfully' : 'Tele service provider created successfully',
          'success'
        );
      setIsModalOpen(false);
      fetchRows();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error saving tele service provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/tele-service-providers/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Delete failed');
      }
      if (showToast) showToast('Tele service provider deleted successfully', 'success');
      setDeleteTarget(null);
      fetchRows();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error deleting tele service provider', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // A pick-list field: the options expand under the field (no floating layer, so the modal never clips them)
  const renderPicker = (label, key, options, placeholder, listKey) => {
    const isOpen = openList === listKey;
    const hasError = missing(key);
    return (
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>
          {label} <Text style={{ color: '#EF4444' }}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.pickerBox, hasError && styles.textInputError, isOpen && styles.pickerBoxOpen]}
          onPress={() => setOpenList(isOpen ? null : listKey)}
          activeOpacity={0.8}
        >
          <Text style={[styles.pickerText, !form[key] && { color: '#94A3B8' }]} numberOfLines={1}>
            {form[key] || placeholder}
          </Text>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.pickerList}>
            <ScrollView style={{ maxHeight: 170 }} nestedScrollEnabled>
              {options.length === 0 ? (
                <Text style={styles.pickerEmpty}>No options available.</Text>
              ) : (
                options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.pickerItem, form[key] === opt && styles.pickerItemActive]}
                    onPress={() => {
                      setField(key, opt);
                      setOpenList(null);
                    }}
                  >
                    <Text style={[styles.pickerItemText, form[key] === opt && styles.pickerItemTextActive]}>{opt}</Text>
                    {form[key] === opt && <Ionicons name="checkmark" size={14} color="#0E5434" />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
        {hasError ? <Text style={styles.errorText}>{label} is required</Text> : null}
      </View>
    );
  };

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
            <Ionicons name="call-outline" size={22} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.tabHeadingTitle}>Tele Service Provider</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage the service provider and account number used by each company.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add Tele Service Provider</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tableCard}>
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search company, connection type, provider or account..."
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
            <Text style={styles.loaderText}>Loading tele service providers...</Text>
          </View>
        ) : filtered.length > 0 ? (
          <>
            <View style={styles.tableWrapper}>
              <View style={styles.tableHeader}>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 3 }]}>COMPANY</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 1.8 }]}>CONNECTION TYPE</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 2.2 }]}>SERVICE PROVIDER</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 2.2 }]}>ACCOUNT NUMBER</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 1.4, textAlign: 'center' }]}>STATUS</Text>
                <Text numberOfLines={1} style={[styles.thCell, { flex: 1.3, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {pageRows.map((item, index) => {
                const isInactive = (item.status || '').toLowerCase() !== 'active';
                return (
                  <View
                    key={item.id}
                    style={[styles.tableRow, index === pageRows.length - 1 && styles.lastTableRow]}
                  >
                    <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700' }]}>#{item.id}</Text>
                    <Text style={[styles.tdCell, { flex: 3, fontWeight: '600' }]}>{item.company_name}</Text>
                    <Text style={[styles.tdCell, { flex: 1.8 }]}>{item.connection_type || '\u2014'}</Text>
                    <Text style={[styles.tdCell, { flex: 2.2 }]}>{item.service_provider}</Text>
                    <Text style={[styles.tdCell, { flex: 2.2, fontWeight: '600', color: '#166534' }]}>{item.account_number}</Text>
                    <View style={[styles.tdCell, { flex: 1.4, alignItems: 'center' }]}>
                      <View style={[styles.statusBadge, isInactive ? styles.statusInactive : styles.statusActive]}>
                        <Text style={[styles.statusText, isInactive ? styles.statusTextInactive : styles.statusTextActive]}>
                          {(item.status || 'ACTIVE').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tdCell, { flex: 1.3, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
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
            <Ionicons name="call-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {rows.length === 0 ? 'No tele service providers created yet.' : 'No matching records found.'}
            </Text>
          </View>
        )}
      </View>

      {/* Add / Edit */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 560 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingId ? 'pencil-outline' : 'add-circle-outline'} size={22} color="#0F172A" />
                <Text style={styles.modalTitle}>{editingId ? 'Edit' : 'Add'} Tele Service Provider</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {renderPicker('Company', 'company_name', companyOptions, 'Select company', 'company')}
              {renderPicker(
                'Connection Type',
                'connection_type',
                connectionTypeOptions,
                'Select connection type',
                'connectionType'
              )}
              {renderPicker('Service Provider', 'service_provider', providerOptions, 'Select service provider', 'provider')}

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Account Number <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, missing('account_number') && styles.textInputError]}
                  placeholder="Provider account number from the bill"
                  placeholderTextColor="#94A3B8"
                  value={form.account_number}
                  onChangeText={(val) => setField('account_number', val)}
                />
                {missing('account_number') ? <Text style={styles.errorText}>Account Number is required</Text> : null}
              </View>

              <View>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                  <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <View style={{ padding: 28, alignItems: 'center' }}>
              <View style={styles.deleteIconWrap}>
                <Ionicons name="warning-outline" size={28} color="#DC2626" />
              </View>
              <Text style={styles.deleteTitle}>Delete Tele Service Provider?</Text>
              <Text style={styles.deleteText}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                  {deleteTarget?.service_provider} ({deleteTarget?.account_number})
                </Text>{' '}
                for {deleteTarget?.company_name}?
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
                    <Text style={styles.saveBtnText}>Delete</Text>
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
    width: 360,
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
  formGroup: { marginBottom: 18 },
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
  errorText: { fontSize: 11, color: '#DC2626', marginTop: 4, fontWeight: '500' },
  pickerBox: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBoxOpen: { borderColor: '#166534', backgroundColor: '#FFFFFF' },
  pickerText: { fontSize: 14, color: '#0F172A', flexShrink: 1 },
  pickerList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemActive: { backgroundColor: '#F0FDF4' },
  pickerItemText: { fontSize: 13, color: '#334155' },
  pickerItemTextActive: { color: '#0E5434', fontWeight: '700' },
  pickerEmpty: { padding: 14, fontSize: 12, color: '#94A3B8' },
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
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
});
