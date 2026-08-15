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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

export default function SystemSettingsTab({
  user,
  showToast,
  permissions,
  onRefreshOptions,
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

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form fields matching user screenshot
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [settingType, setSettingType] = useState('Boolean');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?client_id=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/system-settings${clientQuery}`);
      if (!res.ok) throw new Error('Failed to fetch system settings');
      const data = await res.json();
      setSettings(Array.isArray(data) ? data : []);
      if (onRefreshOptions) onRefreshOptions();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredSettings = settings.filter(
    (s) =>
      (s.setting_key && s.setting_key.toLowerCase().includes(search.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredSettings.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedSettings = filteredSettings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = async () => {
    if (!settingKey.trim()) {
      if (showToast) showToast('Setting Key is required', 'error');
      return;
    }
    if (settingValue === undefined || settingValue === null || String(settingValue).trim() === '') {
      if (showToast) showToast('Setting Value is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        setting_key: settingKey.trim(),
        setting_value: String(settingValue).trim(),
        setting_type: settingType,
        description: description.trim(),
        client_id: user?.clientid || null,
      };

      const url = editingId
        ? `${API_URL}/api/system-settings/${editingId}`
        : `${API_URL}/api/system-settings`;
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
            ? 'System setting updated successfully'
            : 'System setting created successfully',
          'success'
        );
      setIsModalOpen(false);
      fetchSystemSettings();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error saving system setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this system setting?')) return;
    try {
      const res = await fetch(`${API_URL}/api/system-settings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (showToast) showToast('System setting deleted successfully', 'success');
      fetchSystemSettings();
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error deleting system setting', 'error');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setSettingKey(item.setting_key || '');
      setSettingValue(item.setting_value !== undefined ? String(item.setting_value) : '');
      setSettingType(item.setting_type || 'Boolean');
      setDescription(item.description || '');
    } else {
      setEditingId(null);
      setSettingKey('');
      setSettingValue('1');
      setSettingType('Boolean');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View
        style={[
          styles.headerContainer,
          !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
        ]}
      >
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconSquareBadge}>
            <Ionicons name="settings-outline" size={22} color="#0F766E" />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.tabHeadingTitle}>System Settings</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Configure global system feature flags, keys, and operational parameters.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add System Setting</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE CARD */}
      <View style={styles.tableCard}>
        {/* SEARCH BAR */}
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search setting keys or description..."
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
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loaderText}>Loading system settings...</Text>
          </View>
        ) : filteredSettings.length > 0 ? (
          <>
            <View style={styles.tableWrapper}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.thCell, { flex: 3.0 }]}>SETTING KEY</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>VALUE</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>TYPE</Text>
                <Text style={[styles.thCell, { flex: 4.0 }]}>DESCRIPTION</Text>
                <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {/* Table Rows */}
              {paginatedSettings.map((item, index) => {
                const isEnabled = String(item.setting_value) === '1' || String(item.setting_value).toLowerCase() === 'true';

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.tableRow,
                      index === paginatedSettings.length - 1 && styles.lastTableRow,
                    ]}
                  >
                    <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700', color: '#0F172A' }]}>
                      #{item.id}
                    </Text>

                    <Text style={[styles.tdCell, { flex: 3.0, color: '#0F172A', fontWeight: '700', fontFamily: 'monospace' }]}>
                      {item.setting_key}
                    </Text>

                    <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                      <View
                        style={[
                          styles.valueBadge,
                          isEnabled ? styles.valueActive : styles.valueInactive,
                        ]}
                      >
                        <Text style={[styles.valueText, isEnabled ? styles.valueTextActive : styles.valueTextInactive]}>
                          {item.setting_value}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.tdCell, { flex: 1.5, textAlign: 'center', color: '#64748B', fontWeight: '500' }]}>
                      {item.setting_type || 'Boolean'}
                    </Text>

                    <Text style={[styles.tdCell, { flex: 4.0, color: '#475569', fontSize: 12 }]} numberOfLines={2}>
                      {item.description || '-'}
                    </Text>

                    <View style={[styles.tdCell, { flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 14 }]}>
                      {canEdit && (
                        <TouchableOpacity onPress={() => openModal(item)} activeOpacity={0.7}>
                          <Ionicons name="pencil" size={18} color="#0F766E" />
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
                  {Math.min(currentPage * itemsPerPage, filteredSettings.length)}
                </Text>{' '}
                of{' '}
                <Text style={{ fontWeight: '700', color: '#334155' }}>
                  {filteredSettings.length}
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
                  <Text style={[styles.pageNavText, currentPage >= totalPages && styles.pageNavTextDisabled]}>
                    {'Next >'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="settings-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {settings.length === 0 ? 'No system settings configured.' : 'No matching system settings found.'}
            </Text>
          </View>
        )}
      </View>

      {/* MODAL MATCHING USER SCREENSHOT EXACTLY */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 580 }]}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit SYSTEM SETTINGS' : 'Add SYSTEM SETTINGS'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Form Body */}
            <View style={[styles.modalForm, { padding: 24 }]}>
              {/* 1. Setting Key */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Setting Key <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. smtp_enabled or inventory_movement_enabled"
                  value={settingKey}
                  onChangeText={setSettingKey}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 2. Setting Value */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Setting Value <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1 for ON (Enabled) or 0 for OFF (Disabled)"
                  value={settingValue}
                  onChangeText={setSettingValue}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 3. Setting Type */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Setting Type <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <select
                  value={settingType}
                  onChange={(e) => setSettingType(e.target.value)}
                  style={{
                    height: 42,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    outlineStyle: 'none',
                    width: '100%',
                  }}
                >
                  <option value="Boolean">Boolean</option>
                  <option value="String">String</option>
                  <option value="Number">Number</option>
                  <option value="JSON">JSON</option>
                </select>
              </View>

              {/* 4. Description */}
              <View style={[styles.formGroup, { marginBottom: 0 }]}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, paddingVertical: 10 }]}
                  multiline
                  placeholder="Enter detailed description of what this setting controls..."
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Modal Footer */}
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
                    {editingId ? 'Update' : 'Save Setting'}
                  </Text>
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconSquareBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
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
    backgroundColor: '#0F766E',
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
    width: 340,
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
  valueBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  valueActive: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  valueInactive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  valueText: { fontSize: 11, fontWeight: '800' },
  valueTextActive: { color: '#047857' },
  valueTextInactive: { color: '#B91C1C' },
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
    borderRadius: 12,
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
    backgroundColor: '#FFFFFF',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalCloseBtn: { padding: 4 },
  modalForm: { backgroundColor: '#FFFFFF' },
  formGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  textInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#0F766E',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
