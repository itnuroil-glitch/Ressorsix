import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Modal, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { API_URL } from '../config';

const fmt = (n, d = 2) =>
  parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const getStatus = (qty, reorder) => {
  const q = parseInt(qty, 10) || 0;
  const r = parseInt(reorder, 10) || 5;
  if (q === 0) return { label: 'OUT OF STOCK', bg: '#FEE2E2', text: '#DC2626' };
  if (q <= r) return { label: 'LOW STOCK', bg: '#FEE2E2', text: '#DC2626' };
  return { label: 'IN STOCK', bg: '#D1FAE5', text: '#059669' };
};

const getMovementBadge = (type) => {
  switch (type) {
    case 'ASSIGNMENT OUT':
      return { bg: '#FEE2E2', text: '#DC2626', label: 'ASSIGNMENT OUT' };
    case 'ASSIGNED IN':
      return { bg: '#D1FAE5', text: '#059669', label: 'ASSIGNED IN' };
    case 'PURCHASE':
      return { bg: '#E0E7FF', text: '#4F46E5', label: 'PURCHASE' };
    default:
      return { bg: '#F1F5F9', text: '#475569', label: type };
  }
};

const SummaryCard = ({ icon, bg, color, label, value }) => (
  <View style={sc.card}>
    <View style={[sc.icon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={sc.label}>{label}</Text>
      <Text style={sc.value}>{value}</Text>
    </View>
  </View>
);

export default function InventoryTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLarge = width > 768;

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  // Edit / View Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [reorderLvl, setReorderLvl] = useState('');
  const [statusVal, setStatusVal] = useState('Active');
  const [viewOnly, setViewOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // History / Audit Trail Modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyFilterAction, setHistoryFilterAction] = useState('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTargetRecord, setHistoryTargetRecord] = useState(null);

  const fetchHistoryLogs = async (recordId = null) => {
    try {
      setHistoryLoading(true);
      let url = `${API_URL}/api/audit-history?module=INVENTORY&limit=100`;
      if (recordId) {
        url += `&record_id=${recordId}`;
      } else if (user && String(user.roleId) !== '1' && (user.clientid || user.client_id)) {
        url += `&clientid=${user.clientid || user.client_id}`;
      }
      const token = user?.token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { credentials: 'include', headers });
      if (res.ok) {
        const json = await res.json();
        setHistoryLogs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching inventory audit logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (specificRecord = null) => {
    setHistoryFilterAction('ALL');
    setHistorySearchQuery('');
    setHistoryTargetRecord(specificRecord);
    if (specificRecord) {
      fetchHistoryLogs(specificRecord.id);
    } else {
      fetchHistoryLogs();
    }
    setHistoryModalVisible(true);
  };

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const cid = user?.clientid || user?.client_id;
      const url = cid ? `${API_URL}/api/inventory?clientid=${cid}` : `${API_URL}/api/inventory`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch { showToast?.('Error loading inventory', 'error'); }
    finally { setLoading(false); }
  };

  const totalQty = inventory.reduce((s, i) => s + (parseInt(i.qty_on_hand, 10) || 0), 0);
  const totalRes = inventory.reduce((s, i) => s + (parseInt(i.qty_reserved, 10) || 0), 0);
  const totalVal = inventory.reduce((s, i) => s + (parseFloat(i.average_cost) || 0) * (parseInt(i.qty_on_hand, 10) || 0), 0);
  const lowCount = inventory.filter(i => (parseInt(i.qty_on_hand, 10) || 0) <= (parseInt(i.reorder_level, 10) || 5)).length;

  const filtered = inventory.filter(i => (i.asset_name || '').toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const openView = async item => {
    setEditItem(item);
    setReorderLvl(String(item.reorder_level ?? 5));
    setStatusVal(item.status || 'Active');
    setViewOnly(true);
    setModalOpen(true);
    setMovements([]);
    setLoadingMovements(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory/${item.id}/movements`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data || []);
      }
    } catch (e) {
      console.error('Error fetching inventory movements:', e);
    } finally {
      setLoadingMovements(false);
    }
  };

  const openEdit = item => {
    setEditItem(item);
    setReorderLvl(String(item.reorder_level ?? 5));
    setStatusVal(item.status || 'Active');
    setViewOnly(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder_level: parseInt(reorderLvl, 10) || 0, status: statusVal }),
      });
      if (!res.ok) throw new Error();
      showToast?.('Settings updated', 'success');
      setModalOpen(false);
      fetchInventory();
    } catch { showToast?.('Error updating', 'error'); }
    finally { setSaving(false); }
  };

  const openDelete = item => {
    setItemToDelete(item);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/inventory/${itemToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      showToast?.('Inventory record deleted successfully', 'success');
      setDeleteModalOpen(false);
      fetchInventory();
    } catch {
      showToast?.('Error deleting inventory record', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const COLS = ['ASSET NAME', 'QTY ON HAND', 'QTY RESERVED', 'UOM', 'AVG UNIT COST', 'REORDER LEVEL', 'STATUS', 'VIEW', 'LOG', 'EDIT', 'DELETE'];
  const FLEX = [2.4, 1.0, 1.0, 0.8, 1.3, 1.1, 1.1, 0.5, 0.5, 0.5, 0.5];

  return (
    <ScrollView style={s.root} keyboardShouldPersistTaps="handled">

      {/* ── PAGE HEADER ── */}
      <View style={s.pageHeader}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="cube-outline" size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={s.pageTitle}>Asset Stock Report</Text>
            <Text style={s.pageSub}>Real-time inventory levels and stock alerts</Text>
          </View>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchInventory}>
          <Ionicons name="refresh-outline" size={15} color="#6366F1" />
          <Text style={s.refreshTxt}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── SUMMARY CARDS ── */}
      <View style={{ height: 95, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <SummaryCard icon="cube-outline" bg="#EEF2FF" color="#6366F1" label="Total Assets" value={inventory.length} />
          <SummaryCard icon="layers-outline" bg="#ECFDF5" color="#059669" label="Total Stock" value={`${totalQty} units`} />
          <SummaryCard icon="lock-closed-outline" bg="#FFF7ED" color="#D97706" label="Reserved" value={`${totalRes} units`} />
          <SummaryCard icon="warning-outline" bg="#FEF2F2" color="#DC2626" label="Low / Out" value={lowCount} />
          <SummaryCard icon="cash-outline" bg="#F5F3FF" color="#7C3AED" label="Total Value" value={`AED ${fmt(totalVal, 0)}`} />
        </ScrollView>
      </View>

      {/* ── TABLE CARD ── */}
      <View style={s.card}>

        {/* Toolbar */}
        <View style={s.toolbar}>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              style={s.searchInput}
              placeholder="Search by ID or Asset Name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={v => { setSearch(v); setPage(1); }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={s.historyBtn}
              onPress={() => handleOpenHistory(null)}
              activeOpacity={0.7}
              title="All Inventory Activity Logs"
            >
              <Ionicons name="time-outline" size={16} color="#475569" />
              <Text style={s.historyBtnTxt}>History</Text>
            </TouchableOpacity>
            <Text style={s.itemCount}>{filtered.length} Items</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color="#6366F1" /><Text style={s.dimTxt}>Loading...</Text></View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="cube-outline" size={44} color="#CBD5E1" />
            <Text style={s.dimTxt}>No inventory records found.</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={{ width: '100%', minWidth: 1400 }}>

                {/* Header */}
                <View style={s.thead}>
                  {COLS.map((h, i) => (
                    <Text key={i} style={[s.th, { flex: FLEX[i] }, i > 0 && { textAlign: 'center' }]}>{h}</Text>
                  ))}
                </View>

                {/* Rows */}
                {paged.map((item) => {
                  const st = getStatus(item.qty_on_hand, item.reorder_level);
                  const qtyN = parseInt(item.qty_on_hand, 10) || 0;
                  const qtyColor = qtyN === 0 ? '#EF4444' : qtyN <= (parseInt(item.reorder_level, 10) || 5) ? '#EF4444' : '#0F172A';
                  return (
                    <View key={item.id} style={s.trow}>
                      {/* Asset Name */}
                      <View style={[s.td, { flex: FLEX[0] }]}>
                        <Text style={s.assetName}>{item.asset_name}</Text>
                      </View>

                      {/* Qty on Hand */}
                      <Text style={[s.td, { flex: FLEX[1], textAlign: 'center', fontWeight: '700', fontSize: 14, color: qtyColor }]}>
                        {item.qty_on_hand}
                      </Text>

                      {/* Qty Reserved */}
                      <Text style={[s.td, { flex: FLEX[2], textAlign: 'center', color: '#64748B' }]}>
                        {item.qty_reserved}
                      </Text>

                      {/* UOM */}
                      <Text style={[s.td, { flex: FLEX[3], textAlign: 'center', color: '#64748B' }]}>
                        {item.uom_name || '—'}
                      </Text>

                      {/* Avg Unit Cost */}
                      <Text style={[s.td, { flex: FLEX[4], textAlign: 'center', fontWeight: '600', color: 'rgb(112, 122, 143)' }]}>
                        {fmt(item.average_cost)} AED
                      </Text>

                      {/* Reorder Level */}
                      <Text style={[s.td, { flex: FLEX[5], textAlign: 'center', color: '#64748B' }]}>
                        {item.reorder_level ?? 5}
                      </Text>

                      {/* Status */}
                      <View style={[s.td, { flex: FLEX[6], alignItems: 'center', justifyContent: 'center' }]}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: (st.label === 'IN STOCK') ? '#10B981' : '#EF4444' }} />
                      </View>

                      {/* View Button */}
                      <TouchableOpacity style={[s.td, { flex: FLEX[7], alignItems: 'center' }]} onPress={() => openView(item)} title="View Movements">
                        <Ionicons name="eye-outline" size={18} color="#64748B" />
                      </TouchableOpacity>

                      {/* Log / History Button */}
                      <TouchableOpacity style={[s.td, { flex: FLEX[8], alignItems: 'center' }]} onPress={() => handleOpenHistory(item)} title="View Audit Trail">
                        <Ionicons name="time-outline" size={18} color="#D97706" />
                      </TouchableOpacity>

                      {/* Edit Button */}
                      <TouchableOpacity style={[s.td, { flex: FLEX[9], alignItems: 'center' }]} onPress={() => openEdit(item)} title="Edit Settings">
                        <Ionicons name="pencil" size={18} color="#166534" />
                      </TouchableOpacity>

                      {/* Delete Button */}
                      <TouchableOpacity style={[s.td, { flex: FLEX[10], alignItems: 'center' }]} onPress={() => openDelete(item)} title="Delete Record">
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Pagination Footer */}
            {(() => {
              const startEntry = filtered.length === 0 ? 0 : ((curPage - 1) * PER_PAGE) + 1;
              const endEntry = Math.min(curPage * PER_PAGE, filtered.length);

              return (
                <View style={s.paginRow}>
                  <Text style={s.pgInfoLeft}>
                    Showing <Text style={{ fontWeight: '600', color: '#334155' }}>{startEntry}</Text> to <Text style={{ fontWeight: '600', color: '#334155' }}>{endEntry}</Text> of <Text style={{ fontWeight: '600', color: '#334155' }}>{filtered.length}</Text> entries
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={[s.pgBtn, curPage === 1 ? s.pgBtnOff : s.pgBtnOn]}
                      disabled={curPage === 1}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <Text style={[s.pgBtnTxt, curPage === 1 ? s.pgBtnTxtOff : s.pgBtnTxtOn]}>{'< Prev'}</Text>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Page <Text style={{ fontWeight: '600', color: '#334155' }}>{curPage}</Text> of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={[s.pgBtn, curPage === totalPages ? s.pgBtnOff : s.pgBtnOn]}
                      disabled={curPage === totalPages}
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      <Text style={[s.pgBtnTxt, curPage === totalPages ? s.pgBtnTxtOff : s.pgBtnTxtOn]}>{'Next >'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </>
        )}
      </View>

      {/* ── EDIT / VIEW MODAL ── */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={[s.overlay, isLarge && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={s.modal}>
            <View style={s.modalHdr}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.modalIco}><Ionicons name={viewOnly ? "eye-outline" : "options-outline"} size={18} color="#6366F1" /></View>
                <View>
                  <Text style={s.modalTitle}>{viewOnly ? 'View Inventory Details' : 'Reorder Settings'}</Text>
                  <Text style={s.modalSub}>{editItem?.asset_name}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {editItem && (() => {
              const st = getStatus(editItem.qty_on_hand, editItem.reorder_level);
              return (
                <View style={s.strip}>
                  {[
                    { l: 'On Hand', v: editItem.qty_on_hand, c: '#059669' },
                    { l: 'Reserved', v: editItem.qty_reserved, c: '#D97706' },
                    { l: 'Avg Cost', v: `${fmt(editItem.average_cost)} AED`, c: '#6366F1' },
                  ].map(({ l, v, c }) => (
                    <View key={l} style={s.pill}>
                      <Text style={s.pillLabel}>{l}</Text>
                      <Text style={[s.pillVal, { color: c }]}>{v}</Text>
                    </View>
                  ))}
                  <View style={[s.pill, { backgroundColor: st.bg }]}>
                    <Text style={[s.pillLabel, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
              );
            })()}

            <View style={s.modalBody}>
              {viewOnly ? (
                <View style={{ flex: 1, maxHeight: 350 }}>
                  <Text style={[s.formLabel, { marginBottom: 12 }]}>Movement History</Text>
                  {loadingMovements ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Loading history...</Text>
                    </View>
                  ) : movements.length === 0 ? (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                      <Ionicons name="swap-horizontal-outline" size={32} color="#CBD5E1" />
                      <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>No movement history found.</Text>
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
                      <View style={{ gap: 10 }}>
                        {movements.map((m) => {
                          const badge = getMovementBadge(m.movement_type);
                          const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—';
                          
                          return (
                            <View key={m.id} style={{
                              padding: 12,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                              backgroundColor: '#F8FAFC',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <View style={{ flex: 1, gap: 4, paddingRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <View style={{
                                    backgroundColor: badge.bg,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 6
                                  }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: badge.text }}>
                                      {badge.label}
                                    </Text>
                                  </View>
                                  {m.barcode && (
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                                      {m.barcode}
                                    </Text>
                                  )}
                                </View>
                                <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>
                                  {m.notes || '—'}
                                </Text>
                                {m.employee_name && (
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                                    Employee: <Text style={{ fontWeight: '600', color: '#475569' }}>{m.employee_name}</Text>
                                  </Text>
                                )}
                                <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                                  {dateStr}
                                </Text>
                              </View>
                              
                              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                <Text style={{
                                  fontSize: 16,
                                  fontWeight: '800',
                                  color: m.qty < 0 ? '#EF4444' : '#10B981'
                                }}>
                                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              ) : (
                <>
                  <Text style={s.formLabel}>Reorder Threshold Level</Text>
                  <Text style={s.formHint}>Flag "LOW STOCK" when qty drops to or below this number.</Text>
                  <TextInput
                    style={[s.formInput, viewOnly && { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0' }]}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    value={reorderLvl}
                    onChangeText={setReorderLvl}
                    editable={!viewOnly}
                  />
                  <Text style={[s.formLabel, { marginTop: 16 }]}>Status</Text>
                  <div style={{ width: '100%' }}>
                    <select value={statusVal} onChange={e => setStatusVal(e.target.value)} style={webSel} disabled={viewOnly}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}
            </View>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalOpen(false)} disabled={saving}>
                <Text style={s.cancelTxt}>{viewOnly ? 'Close' : 'Cancel'}</Text>
              </TouchableOpacity>
              {!viewOnly && (
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveTxt}>Save Settings</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <Modal visible={deleteModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, width: 450, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#FEE2E2' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="warning" size={24} color="#EF4444" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#EF4444' }}>Confirm Deletion</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, color: '#334155', marginBottom: 16 }}>
              Are you sure you want to delete <Text style={{ fontWeight: '700' }}>{itemToDelete?.asset_name}</Text>?
            </Text>

            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 }}>
              This will permanently delete the selected Inventory record. This action cannot be undone.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, textTransform: 'uppercase' }}>
              TYPE <Text style={{ color: '#EF4444' }}>YES</Text> TO CONFIRM *
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, fontSize: 14, color: '#334155', marginBottom: 24, outlineStyle: 'none' }}
              placeholder="Type YES here"
              placeholderTextColor="#94A3B8"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />

            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => setDeleteModalOpen(false)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: deleteConfirmText === 'YES' ? '#EF4444' : '#F1F5F9', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 }}
                disabled={deleteConfirmText !== 'YES' || deleting}
                onPress={confirmDelete}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '700', color: deleteConfirmText === 'YES' ? '#FFFFFF' : '#94A3B8' }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── INVENTORY AUDIT TRAIL / ACTIVITY LOG MODAL ── */}
      <Modal
        visible={historyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={[s.historyModalOverlay, isLarge && { paddingLeft: isSidebarCollapsed ? 98 : 280 }]}>
          <View style={s.historyModalCard}>
            {/* Header */}
            <View style={s.historyModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.historyIconBadge}>
                  <Ionicons name="time" size={20} color="#6366F1" />
                </View>
                <View>
                  <Text style={s.historyModalTitle}>
                    {historyTargetRecord ? `Activity Log: ${historyTargetRecord.asset_name || `Asset #${historyTargetRecord.id}`}` : 'Inventory Activity Log'}
                  </Text>
                  <Text style={s.historyModalSubtitle}>
                    {historyTargetRecord ? 'Audit trail specifically for this inventory record' : 'Chronological audit trail of all inventory settings changes, movements, and deletions'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={s.historyHeaderBtn}
                  onPress={() => fetchHistoryLogs(historyTargetRecord ? historyTargetRecord.id : null)}
                  disabled={historyLoading}
                  activeOpacity={0.7}
                  title="Refresh Log"
                >
                  <Ionicons name="refresh-outline" size={18} color="#475569" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.historyHeaderBtn}
                  onPress={() => setHistoryModalVisible(false)}
                  activeOpacity={0.7}
                  title="Close"
                >
                  <Ionicons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter and Search Bar inside Modal */}
            <View style={s.historyToolbar}>
              {/* Action Filter Pills */}
              <View style={s.historyPillGroup}>
                {['ALL', 'UPDATE', 'MOVEMENT', 'DELETE'].map((act) => {
                  const isActive = historyFilterAction === act;
                  return (
                    <TouchableOpacity
                      key={act}
                      style={[s.historyPill, isActive && s.historyPillActive]}
                      onPress={() => setHistoryFilterAction(act)}
                    >
                      <Text style={[s.historyPillText, isActive && s.historyPillTextActive]}>
                        {act === 'ALL' ? 'All Activities' : act === 'UPDATE' ? 'Updated' : act === 'MOVEMENT' ? 'Movements' : 'Deleted'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Search Box */}
              <View style={s.historySearchBox}>
                <Ionicons name="search-outline" size={15} color="#94A3B8" />
                <TextInput
                  style={s.historySearchInput}
                  placeholder="Filter by asset or user..."
                  placeholderTextColor="#94A3B8"
                  value={historySearchQuery}
                  onChangeText={setHistorySearchQuery}
                />
                {historySearchQuery ? (
                  <TouchableOpacity onPress={() => setHistorySearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Timeline Body */}
            <ScrollView style={{ flex: 1, padding: 24 }} showsVerticalScrollIndicator={true}>
              {historyLoading ? (
                <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>Loading activity history...</Text>
                </View>
              ) : (() => {
                const filtered = historyLogs.filter((log) => {
                  if (historyFilterAction !== 'ALL' && String(log.action_type).toUpperCase() !== historyFilterAction) {
                    return false;
                  }
                  if (historySearchQuery && historySearchQuery.trim()) {
                    const q = historySearchQuery.toLowerCase();
                    const titleMatch = (log.record_title || '').toLowerCase().includes(q);
                    const userMatch = (log.user_name || '').toLowerCase().includes(q) || (log.user_email || '').toLowerCase().includes(q);
                    const summaryMatch = (log.action_summary || '').toLowerCase().includes(q);
                    return titleMatch || userMatch || summaryMatch;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <View style={s.historyEmptyState}>
                      <Ionicons name="time-outline" size={48} color="#CBD5E1" />
                      <Text style={s.historyEmptyTitle}>No Activity Logs Found</Text>
                      <Text style={s.historyEmptyText}>
                        {historySearchQuery || historyFilterAction !== 'ALL'
                          ? 'No records match your filter criteria.'
                          : 'Any reorder updates, stock movements, or deletions will appear here automatically.'}
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={s.timelineContainer}>
                    {filtered.map((item, idx) => {
                      const isLast = idx === filtered.length - 1;
                      const act = String(item.action_type || 'UPDATE').toUpperCase();
                      const isCreate = act === 'CREATE';
                      const isDelete = act === 'DELETE';
                      const isMovement = act === 'MOVEMENT';

                      const badgeBg = isCreate ? '#DCFCE7' : isDelete ? '#FEE2E2' : isMovement ? '#FEF3C7' : '#EEF2FF';
                      const badgeColor = isCreate ? '#15803D' : isDelete ? '#B91C1C' : isMovement ? '#B45309' : '#4F46E5';
                      const dotBg = isCreate ? '#22C55E' : isDelete ? '#EF4444' : isMovement ? '#F59E0B' : '#6366F1';

                      const formatTime = (iso) => {
                        if (!iso) return '';
                        const d = new Date(iso);
                        if (isNaN(d.getTime())) return iso;
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
                          ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                      };

                      const initials = (item.user_name || item.user_email || 'U').substring(0, 2).toUpperCase();

                      let diffs = [];
                      if (Array.isArray(item.changed_fields)) {
                        diffs = item.changed_fields;
                      } else if (typeof item.changed_fields === 'string') {
                        try { diffs = JSON.parse(item.changed_fields); } catch (e) { diffs = []; }
                      }

                      return (
                        <View key={item.id || idx} style={s.timelineItem}>
                          {/* Left Line & Dot */}
                          <View style={s.timelineLeftColumn}>
                            <View style={[s.timelineDot, { backgroundColor: dotBg }]}>
                              <Ionicons
                                name={isCreate ? 'add' : isDelete ? 'trash' : isMovement ? 'swap-horizontal' : 'pencil'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            {!isLast && <View style={s.timelineVerticalLine} />}
                          </View>

                          {/* Right Content Card */}
                          <View style={s.timelineContentCard}>
                            {/* Card Top Row */}
                            <View style={s.timelineCardTopRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <View style={[s.actionBadge, { backgroundColor: badgeBg }]}>
                                  <Text style={[s.actionBadgeText, { color: badgeColor }]}>{act}</Text>
                                </View>
                                <Text style={s.timelineRecordTitle} numberOfLines={1}>
                                  {item.record_title || (historyTargetRecord?.asset_name) || `Inventory #${item.record_id}`}
                                </Text>
                              </View>
                              <Text style={s.timelineDateText}>{formatTime(item.created_at)}</Text>
                            </View>

                            {/* User Actor Row */}
                            <View style={s.timelineUserRow}>
                              <View style={s.timelineUserAvatar}>
                                <Text style={s.timelineUserAvatarText}>{initials}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.timelineUserName}>
                                  {item.user_name || 'System User'}
                                  {item.user_role ? (
                                    <Text style={s.timelineUserRole}> ({item.user_role})</Text>
                                  ) : null}
                                </Text>
                                {item.user_email ? (
                                  <Text style={s.timelineUserEmail}>{item.user_email}</Text>
                                ) : null}
                              </View>
                            </View>

                            {/* Summary */}
                            {item.action_summary ? (
                              <Text style={s.timelineSummaryText}>{item.action_summary}</Text>
                            ) : null}

                            {/* Changed Fields Diff Table */}
                            {diffs.length > 0 && (
                              <View style={s.diffTableContainer}>
                                <View style={s.diffTableHeader}>
                                  <Text style={[s.diffHeaderCol, { flex: 1.4 }]}>FIELD</Text>
                                  <Text style={[s.diffHeaderCol, { flex: 1.5 }]}>BEFORE</Text>
                                  <Text style={[s.diffHeaderCol, { width: 24, textAlign: 'center' }]}> </Text>
                                  <Text style={[s.diffHeaderCol, { flex: 1.5 }]}>AFTER</Text>
                                </View>
                                {diffs.map((diff, dIdx) => {
                                  const fieldLabel = String(diff.field || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                  const formatDiffVal = (val) => {
                                    if (val === null || val === undefined) return '—';
                                    if (typeof val === 'object') return JSON.stringify(val);
                                    return String(val);
                                  };
                                  return (
                                    <View key={dIdx} style={s.diffTableRow}>
                                      <Text style={[s.diffFieldCol, { flex: 1.4 }]} numberOfLines={1}>
                                        {fieldLabel}
                                      </Text>
                                      <View style={[s.diffValBox, { flex: 1.5 }]}>
                                        <Text style={s.diffOldValText} numberOfLines={1}>
                                          {formatDiffVal(diff.old_value)}
                                        </Text>
                                      </View>
                                      <Text style={{ width: 24, textAlign: 'center', color: '#94A3B8', fontSize: 11 }}>➔</Text>
                                      <View style={[s.diffValBox, { flex: 1.5 }]}>
                                        <Text style={s.diffNewValText} numberOfLines={1}>
                                          {formatDiffVal(diff.new_value)}
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>

            {/* Modal Footer */}
            <View style={s.historyModalFooter}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                Showing {historyLogs.length} audit trail event{historyLogs.length === 1 ? '' : 's'}
              </Text>
              <TouchableOpacity
                style={s.historyCloseFooterBtn}
                onPress={() => setHistoryModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ── webSelect ── */
const webSel = {
  width: '100%', height: 42, borderRadius: 8,
  border: '1px solid #E2E8F0', padding: '0 12px',
  backgroundColor: '#F8FAFC', color: '#0F172A',
  fontSize: 14, outline: 'none', cursor: 'pointer',
};

/* ── Summary card ── */
const sc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, minWidth: 180, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  icon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 19, fontWeight: '800', color: '#0F172A', marginTop: 2 },
});

/* ── Main styles ── */
const s = StyleSheet.create({
  root: { width: '100%', backgroundColor: '#F1F5F9' },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  pageSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' },
  refreshTxt: { color: '#6366F1', fontWeight: '600', fontSize: 13 },

  card: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, overflow: 'hidden' },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', width: 300 },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 13, color: '#334155', outlineStyle: 'none', outlineWidth: 0 },
  itemCount: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  thead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  th: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },

  trow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' },
  td: { fontSize: 13, color: '#0F172A' },

  assetName: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  assetId: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' },

  paginRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  pgInfoLeft: { fontSize: 12, color: '#64748B' },
  pgBtn: { paddingHorizontal: 14, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  pgBtnOn: { backgroundColor: '#FFFFFF' },
  pgBtnOff: { backgroundColor: '#F1F5F9' },
  pgBtnTxt: { fontSize: 12, fontWeight: '500' },
  pgBtnTxtOn: { color: '#475569' },
  pgBtnTxtOff: { color: '#94A3B8' },

  center: { padding: 52, alignItems: 'center', gap: 12 },
  dimTxt: { color: '#94A3B8', fontSize: 14, marginTop: 8 },

  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },

  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FAFAFA' },
  modalIco: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 1 },

  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pill: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 80 },
  pillLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' },
  pillVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  modalBody: { padding: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  formHint: { fontSize: 11, color: '#94A3B8', marginBottom: 8 },
  formInput: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', outlineStyle: 'none' },

  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFAFA' },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelTxt: { color: '#64748B', fontWeight: '700', fontSize: 13 },
  saveBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, backgroundColor: '#6366F1' },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  /* ── History & Audit Trail Styles ── */
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    cursor: 'pointer',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  historyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  historyModalCard: {
    width: '100%',
    maxWidth: 820,
    height: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
    backgroundColor: '#EEF2FF',
  },
  historyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#312E81',
  },
  historyModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historyHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  historyToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
    flexWrap: 'wrap',
  },
  historyPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    cursor: 'pointer',
  },
  historyPillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  historyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  historyPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 34,
    width: 240,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    outlineStyle: 'none',
  },
  historyEmptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
  },
  historyEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 360,
    marginTop: 6,
    lineHeight: 18,
  },
  timelineContainer: {
    paddingLeft: 4,
    paddingBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeftColumn: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: -8,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timelineRecordTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineDateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  timelineUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  timelineUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timelineUserName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  timelineUserRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  timelineUserEmail: {
    fontSize: 11,
    color: '#94A3B8',
  },
  timelineSummaryText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 10,
    lineHeight: 18,
  },
  diffTableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 6,
  },
  diffTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  diffHeaderCol: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  diffTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    backgroundColor: '#FFFFFF',
  },
  diffFieldCol: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  diffValBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  diffOldValText: {
    fontSize: 11,
    color: '#DC2626',
    textDecorationLine: 'line-through',
  },
  diffNewValText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  historyModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
    backgroundColor: '#EEF2FF',
  },
  historyCloseFooterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    cursor: 'pointer',
  }
});
