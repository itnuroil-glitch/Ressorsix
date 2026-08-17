import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal, Switch, useWindowDimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomDropdown, SearchableDropdown } from './CustomFieldsTab';
import { API_URL } from '../config';

const COLORS = {
  primary: '#1A4D3E',
  secondary: '#C5A880',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
};

export default function VehicleMaintenanceTab({ user, showToast, isSidebarCollapsed, permissions, checkRowPermission }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isEmployee = user && String(user.roleId) !== '1' && String(user.roleId) !== '2' && String(user.roleId) !== '5' && String(user.roleId) !== '8';

  const isSuperAdmin = !user || String(user.roleId) === '1';
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));
  const canEdit = !user || String(user.roleId) === '1' || (permissions && (permissions.can_edit || permissions.full_control));
  const canDelete = !user || String(user.roleId) === '1' || (permissions && (permissions.can_delete || permissions.full_control));
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldsLayout, setFieldsLayout] = useState(null);
  const [customFieldId, setCustomFieldId] = useState(null);
  const [configParams, setConfigParams] = useState({ clientid: null, country_id: null, moduleid: null });
  const [formData, setFormData] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edit state
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [countries, setCountries] = useState([]);
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/vehicle-maintenance${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
      ]);
      const [clientsData, countriesData, modulesData, recordsData] = await Promise.all([
        clientsRes.ok ? clientsRes.json() : [],
        countriesRes.ok ? countriesRes.json() : [],
        modulesRes.ok ? modulesRes.json() : [],
        recordsRes.ok ? recordsRes.json() : []
      ]);
      setClients(clientsData || []);
      setCountries(countriesData || []);
      setModules(modulesData || []);
      setMaintenanceRecords(Array.isArray(recordsData) ? recordsData : []);

      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));
      const maintModule = (modulesData || []).find(m => m.module_name && m.module_name.toLowerCase().includes('vehicle maintenance'));
      if (maintModule) setSelectedModule(String(maintModule.id));
    } catch (err) {
      console.error('Error fetching initial maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompaniesForClient = async (clientId, overrideAction) => {
    if (!clientId) {
      setCompanies([]);
      return [];
    }
    try {
      let action = overrideAction;
      if (!action) {
        action = isFormOpen ? (isViewOnly ? 'view' : (editingRecord ? 'edit' : 'create')) : 'view';
      }
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const actionQuery = `&module_id=vehicle_maintenance&action=${action}`;
      const res = await fetch(`${API_URL}/api/companies/client/${clientId}${emailParam}${actionQuery}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data || []);
        return data || [];
      }
    } catch (e) {
      console.error('Error fetching companies for client:', e);
    }
    return [];
  };

  const handleAddNewRecord = async () => {
    setIsViewOnly(false);
    setEditingRecord(null);
    setFormData({});
    setWizardStep(1);
    let currentCompanies = [];
    if (selectedClient) {
      currentCompanies = await fetchCompaniesForClient(selectedClient, 'create');
    }
    if (currentCompanies.length === 1) {
      const singleComp = currentCompanies[0];
      setSelectedCompany(String(singleComp.id));
      if (singleComp.country) {
        setSelectedCountry(String(singleComp.country));
      }
    }
    setIsFormOpen(true);
  };

  const fetchFormConfiguration = async (clientId, countryId, moduleId) => {
    setLoading(true);
    setWizardStep(2);
    try {
      const cfRes = await fetch(`${API_URL}/api/custom-fields`);
      const customFields = cfRes.ok ? await cfRes.json() : [];

      let matchingFieldDef = customFields.find(cf =>
        String(cf.client_id || cf.clientid) === String(clientId) &&
        String(cf.module_id || cf.moduleid) === String(moduleId) &&
        String(cf.country_id || cf.countryid) === String(countryId)
      );
      if (!matchingFieldDef) {
        matchingFieldDef = customFields.find(cf =>
          (!cf.clientid && !cf.client_id) &&
          String(cf.module_id || cf.moduleid) === String(moduleId) &&
          String(cf.country_id || cf.countryid) === String(countryId)
        );
      }

      const permRes = await fetch(`${API_URL}/api/field-permissions`);
      const permissionsList = permRes.ok ? await permRes.json() : [];

      const activePerm = permissionsList.find(p =>
        String(p.clientid) === String(clientId) &&
        String(p.moduleid) === String(moduleId) &&
        String(p.countryid || p.country_id) === String(countryId)
      );

      let permittedFields = {};
      if (activePerm && activePerm.permitted_fields) {
        permittedFields = typeof activePerm.permitted_fields === 'string'
          ? JSON.parse(activePerm.permitted_fields)
          : activePerm.permitted_fields;
      }

      if (matchingFieldDef) {
        setCustomFieldId(matchingFieldDef.id);
        setConfigParams({
          clientid: matchingFieldDef.clientid || matchingFieldDef.client_id || clientId,
          country_id: matchingFieldDef.countryid || matchingFieldDef.country_id || countryId,
          moduleid: matchingFieldDef.moduleid || matchingFieldDef.module_id || moduleId
        });
        let parsedSections = typeof matchingFieldDef.field_data === 'string'
          ? JSON.parse(matchingFieldDef.field_data)
          : matchingFieldDef.field_data;
        setFieldsLayout(parsedSections || []);
      } else {
        // Fallback default form layout if no custom fields are defined
        setFieldsLayout([
          {
            section_name: 'Vehicle Maintenance Details',
            fields: [
              { id: 'vehicle_id', name: 'Select Vehicle', type: 'Dropdown', optionSource: 'dynamic', dynamicPath: '/api/vehicle-details/client-vehicles' },
              { id: 'service_type', name: 'Service Type', type: 'Dropdown', options: 'Oil & Filter Change, Tire Replacement, Brake Service, Battery Replacement, Transmission Repair, AC Repair, General Inspection' },
              { id: 'service_date', name: 'Service Date', type: 'Date' },
              { id: 'odometer_km', name: 'Current Odometer (KM)', type: 'Number' },
              { id: 'total_cost', name: 'Total Cost', type: 'Number' },
              { id: 'vendor_name', name: 'Workshop / Vendor Name', type: 'Text' },
              { id: 'invoice_no', name: 'Invoice Number', type: 'Text' },
              { id: 'next_service_date', name: 'Next Service Date', type: 'Date' },
              { id: 'next_service_km', name: 'Next Service Odometer (KM)', type: 'Number' },
              { id: 'invoice_file', name: 'Invoice Attachment', type: 'File Upload' },
              { id: 'remarks', name: 'Notes / Remarks', type: 'Textarea' }
            ]
          }
        ]);
        setCustomFieldId(null);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading form configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (record) => {
    setIsViewOnly(false);
    setEditingRecord(record);
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''), 'edit');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || '')
    );
    setIsFormOpen(true);
  };

  const handleView = async (record) => {
    setIsViewOnly(true);
    setEditingRecord(record);
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''), 'view');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || '')
    );
    setIsFormOpen(true);
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText !== 'YES' || !recordToDelete) return;
    try {
      const res = await fetch(`${API_URL}/api/vehicle-maintenance/${recordToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'roleid': String(user?.roleId || ''),
          'clientid': String(user?.clientid || ''),
          'companyid': String(recordToDelete.company_id || '')
        }
      });
      if (!res.ok) throw new Error('Failed to delete maintenance record');
      if (showToast) showToast('Maintenance record deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error deleting maintenance record', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        vehicle_id: editingRecord ? (editingRecord.vehicle_id || null) : null,
        custom_field_id: customFieldId,
        field_data: formData,
        clientid: configParams.clientid || selectedClient,
        country_id: configParams.country_id || selectedCountry,
        moduleid: configParams.moduleid || selectedModule,
        company_id: selectedCompany || null,
        roleid: user ? user.roleId : null,
        user_id: user ? user.id : null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}/api/vehicle-maintenance/${editingRecord.id}`
        : `${API_URL}/api/vehicle-maintenance`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'save'} maintenance record`);

      if (showToast) showToast(isEditing ? 'Maintenance record updated successfully!' : 'Maintenance record saved successfully!', 'success');
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
      fetchInitialData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error saving maintenance details', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter records based on search query
  const filteredRecords = maintenanceRecords.filter(rec => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fdStr = JSON.stringify(rec.field_data || {}).toLowerCase();
    const empName = (rec.employee_name || '').toLowerCase();
    const compName = (rec.company_name || '').toLowerCase();
    return fdStr.includes(q) || empName.includes(q) || compName.includes(q) || String(rec.id).includes(q);
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <View style={styles.container}>
      {/* MODERN VEHICLE MAINTENANCE HEADER BANNER */}
      <View style={styles.bannerContainer}>
        {/* Background Decorative Gradient Wave & Watermark */}
        <View style={[styles.bannerWatermarkContainer, { pointerEvents: 'none' }]}>
          <View style={styles.bannerOrangeGlow} />
          <View style={styles.bannerWaveOuter} />
          <View style={styles.bannerWaveInner} />
          <View style={styles.bannerWatermarkIconBox}>
            <Ionicons name="construct-outline" size={135} color="rgba(241, 118, 22, 0.08)" />
          </View>
        </View>

        {/* Banner Content Layout */}
        <View style={styles.bannerContent}>
          {/* Left Group: Icon Badge & Titles */}
          <View style={styles.bannerTitleGroup}>
            <View style={styles.bannerIconBadge}>
              <View style={styles.bannerIconInner}>
                <Ionicons name="construct" size={24} color="#72002A" />
                <View style={styles.iconOrangeDot} />
              </View>
            </View>

            <View style={styles.bannerTextStack}>
              <Text style={styles.bannerTitle}>Vehicle Maintenance</Text>
              <Text style={styles.bannerSubtitle}>Manage vehicle servicing, repairs, expenses, and service schedules.</Text>
            </View>
          </View>

          {/* Right Group: Action Button (+ Add Maintenance only) */}
          <TouchableOpacity
            style={styles.bannerAddButton}
            onPress={handleAddNewRecord}
            activeOpacity={0.88}
          >
            <View style={styles.bannerAddIconBadge}>
              <Ionicons name="add" size={14} color="#72002A" />
            </View>
            <Text style={styles.bannerAddButtonText}>+ Add Maintenance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.scrollContent}>
        {/* Search & Stats Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search maintenance by Vehicle, Plate No, Service Type, or Cost..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data Grid Table */}
        <View style={styles.tableCard}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1A4D3E" />
              <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>Loading maintenance records...</Text>
            </View>
          ) : (
            <View style={{ width: '100%', overflow: 'auto' }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 0.5 }]}># ID</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>CLIENT INFO</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>VEHICLE NAME</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>PLATE NUMBER</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>COMPANY NAME</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>SERVICE TYPE</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>TOTAL COST</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>SUBMITTED BY</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>STATUS</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>ACTIONS</Text>
              </View>

              {paginatedRecords.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Ionicons name="build-outline" size={48} color="#CBD5E1" />
                  <Text style={{ marginTop: 8, fontSize: 15, color: '#64748B', fontWeight: '500' }}>No maintenance records found</Text>
                  <Text style={{ marginTop: 4, fontSize: 13, color: '#94A3B8' }}>Click "+ Add Maintenance" to record a new vehicle service</Text>
                </View>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const fd = item.field_data || {};
                  const vehicleName = fd.vehicle_name || fd['Vehicle Name'] || 'Toyota Yaris';
                  const plateNo = fd.plate_no || fd['Plate Number'] || 'DXB EE 64914';
                  const serviceType = fd.service_type || fd['Service Type'] || 'General Service';
                  const cost = fd.total_cost || fd['Total Cost'] || 'AED 450.00';

                  return (
                    <View key={item.id || idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.tdCell, { flex: 0.5, fontWeight: '700', color: '#0F172A' }]}>#{item.id}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.client_name || 'Krish'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '600', color: '#1A4D3E' }]}>{vehicleName}</Text>
                      <Text style={[styles.tdCell, { flex: 1.2 }]}>{plateNo}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.company_name || 'Bynur Agro Trading LLC'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{serviceType}</Text>
                      <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '600', color: '#0284C7' }]}>{cost}</Text>
                      <Text style={[styles.tdCell, { flex: 1.2 }]}>{item.employee_name || 'Ana Loren'}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => handleView(item)} style={styles.actionIconButton}>
                          <Ionicons name="eye-outline" size={18} color="#0284C7" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionIconButton}>
                          <Ionicons name="pencil-outline" size={18} color="#16A34A" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionIconButton}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Pagination Bar */}
          <View style={styles.paginationBar}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} entries
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={[styles.pageButton, currentPage === 1 && { opacity: 0.5 }]}
              >
                <Text style={{ fontSize: 13, color: '#334155' }}>&lt; Prev</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }}>Page {currentPage} of {totalPages}</Text>
              <TouchableOpacity
                disabled={currentPage >= totalPages}
                onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={[styles.pageButton, currentPage >= totalPages && { opacity: 0.5 }]}
              >
                <Text style={{ fontSize: 13, color: '#334155' }}>Next &gt;</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add / Edit Maintenance Record Modal */}
      <Modal visible={isFormOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="construct-outline" size={22} color="#1A4D3E" />
                <Text style={styles.modalHeaderTitle}>
                  {isViewOnly ? 'View Maintenance Record' : (editingRecord ? 'Edit Maintenance Record' : 'Add Vehicle Maintenance Record')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsFormOpen(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }}>
              {/* Client & Company Selectors */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Select Client</Text>
                <CustomDropdown
                  data={clients.map(c => ({ label: c.client_name || c.name, value: String(c.id) }))}
                  value={selectedClient}
                  onChange={async (item) => {
                    setSelectedClient(item.value);
                    await fetchCompaniesForClient(item.value);
                  }}
                  placeholder="-- Select Client --"
                  disabled={isViewOnly}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Select Company</Text>
                <CustomDropdown
                  data={companies.map(c => ({ label: c.company_name || c.name, value: String(c.id) }))}
                  value={selectedCompany}
                  onChange={(item) => setSelectedCompany(item.value)}
                  placeholder="-- Select Company --"
                  disabled={isViewOnly}
                />
              </View>

              {/* Maintenance Fields */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Service Type</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Engine Oil Change, Tire Replacement"
                  value={formData.service_type || ''}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, service_type: val }))}
                  editable={!isViewOnly}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Total Cost (AED / $)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 450.00"
                  keyboardType="numeric"
                  value={formData.total_cost || ''}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, total_cost: val }))}
                  editable={!isViewOnly}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Service Date</Text>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    paddingLeft: 12,
                    fontSize: 14,
                    color: '#0F172A'
                  }}
                  value={formData.service_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                  disabled={isViewOnly}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Workshop / Vendor Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Al Futtaim Motors"
                  value={formData.vendor_name || ''}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, vendor_name: val }))}
                  editable={!isViewOnly}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.fieldLabel}>Notes / Remarks</Text>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Enter any additional maintenance notes..."
                  multiline
                  value={formData.remarks || ''}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, remarks: val }))}
                  editable={!isViewOnly}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsFormOpen(false)}>
                <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              {!isViewOnly && (
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save Maintenance Record</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={{ width: 420, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>Confirm Deletion</Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: '#64748B' }}>
              Type <Text style={{ fontWeight: '700', color: '#EF4444' }}>YES</Text> to confirm deleting this maintenance record.
            </Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 16 }]}
              placeholder="Type YES"
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={{ color: '#475569', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deleteConfirmationText !== 'YES'}
                style={[styles.saveButton, { backgroundColor: '#EF4444' }, deleteConfirmationText !== 'YES' && { opacity: 0.5 }]}
                onPress={handleConfirmDelete}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bannerContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 16,
    backgroundColor: '#FFF8EF',
    backgroundImage: 'linear-gradient(115deg, #FFFFFF 0%, #FFFDF9 45%, #FFF8EF 100%)',
    borderWidth: 1,
    borderColor: '#F1E7DD',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#72002A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  bannerWatermarkContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 340,
    overflow: 'hidden',
  },
  bannerOrangeGlow: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 180, 94, 0.15)',
  },
  bannerWaveOuter: {
    position: 'absolute',
    right: -40,
    bottom: -50,
    width: 290,
    height: 190,
    borderRadius: 145,
    backgroundColor: 'rgba(241, 118, 22, 0.06)',
  },
  bannerWaveInner: {
    position: 'absolute',
    right: -10,
    bottom: -70,
    width: 210,
    height: 160,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 180, 94, 0.12)',
  },
  bannerWatermarkIconBox: {
    position: 'absolute',
    right: 36,
    top: 5,
    opacity: 0.85,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
    zIndex: 2,
    flexWrap: 'wrap',
    gap: 16,
  },
  bannerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 1,
  },
  bannerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#FFF0E6',
    backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FFF0E6 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241, 118, 22, 0.18)',
    shadowColor: '#72002A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  bannerIconInner: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(114, 0, 42, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconOrangeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F17616',
  },
  bannerTextStack: {
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#72002A',
    letterSpacing: -0.3,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A5D6B',
    marginTop: 2,
  },
  bannerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#72002A',
    backgroundImage: 'linear-gradient(135deg, #72002A 0%, #4A001A 100%)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 11,
    shadowColor: '#72002A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    cursor: 'pointer',
  },
  bannerAddIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tdCell: {
    fontSize: 13,
    color: '#334155',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '600',
  },
  actionIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCard: {
    width: '90%',
    maxWidth: 640,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#1A4D3E',
  },
});
