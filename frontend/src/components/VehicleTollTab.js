import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal, Switch, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchableDropdown } from './CustomFieldsTab';
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

export default function VehicleTollTab({ user, showToast, isSidebarCollapsed, permissions, checkRowPermission }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isEmployee = user && String(user.roleId) !== '1' && String(user.roleId) !== '2' && String(user.roleId) !== '5' && String(user.roleId) !== '8';

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
  const [vehicleTollRecords, setVehicleTollRecords] = useState([]);

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/vehicle-toll${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
      ]);
      const [clientsData, countriesData, modulesData, recordsData] = await Promise.all([
        clientsRes.json(),
        countriesRes.json(),
        modulesRes.json(),
        recordsRes.ok ? recordsRes.json() : []
      ]);
      setClients(clientsData || []);
      setCountries(countriesData || []);
      setModules(modulesData || []);
      setVehicleTollRecords(Array.isArray(recordsData) ? recordsData : []);

      // Defaults
      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));

      // Target Module ID ('50' for Vehicle Toll or dynamic matching)
      const tollModule = (modulesData || []).find(m => String(m.id) === '50' || (m.module_name && m.module_name.toLowerCase().includes('toll')));
      if (tollModule) {
        setSelectedModule(String(tollModule.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompaniesForClient = async (clientId, overrideAction) => {
    if (!clientId) {
      setCompanies([]);
      return [];
    }
    try {
      let action = 'view';
      if (overrideAction) {
        action = overrideAction;
      } else if (isFormOpen) {
        action = isViewOnly ? 'view' : (editingRecord ? 'edit' : 'create');
      }
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const actionQuery = `&module_id=vehicle_toll&action=${action}`;
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
    let currentCompanies = [];
    if (selectedClient) {
      currentCompanies = await fetchCompaniesForClient(selectedClient, 'create');
    }
    if (currentCompanies.length === 1 && user && String(user.roleId) !== '1') {
      const singleComp = currentCompanies[0];
      setSelectedCompany(String(singleComp.id));
      const targetCountry = singleComp.country ? String(singleComp.country) : selectedCountry;
      if (singleComp.country) setSelectedCountry(String(singleComp.country));
      await fetchFormConfiguration(
        selectedClient,
        targetCountry,
        selectedModule || '50'
      );
    } else {
      setWizardStep(1);
    }
    setIsFormOpen(true);
  };

  const fetchFormConfiguration = async (clientId, countryId, moduleId) => {
    setLoading(true);
    setWizardStep(2);
    try {
      // 1. Fetch custom fields for this configuration
      const cfRes = await fetch(`${API_URL}/api/custom-fields`);
      const customFields = await cfRes.json();

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

      // 2. Fetch permissions
      const permRes = await fetch(`${API_URL}/api/field-permissions`);
      const permissionsList = await permRes.json();

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
      } else {
        matchingFieldDef = null;
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

        // 3. Fetch dropdown option values
        let fieldValuesMap = {};
        try {
          const fvRes = await fetch(`${API_URL}/api/custom-fields/${matchingFieldDef.id}/field-values`);
          if (fvRes.ok) {
            fieldValuesMap = await fvRes.json();
          }
        } catch (e) {
          console.warn('Could not fetch field values', e);
        }

        const fetchDynamicOptions = async (path) => {
          try {
            let processedPath = (path || '').trim();
            if (processedPath.includes('client') && clientId) {
              if (processedPath.endsWith('/client') || processedPath.endsWith('/client/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${clientId}`;
              }
            }
            if (processedPath.includes('country') && countryId) {
              if (processedPath.endsWith('/country') || processedPath.endsWith('/country/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${countryId}`;
              }
            }
            if (processedPath && !processedPath.startsWith('/') && !processedPath.startsWith('http')) {
              processedPath = '/' + processedPath;
            }
            const url = processedPath.startsWith('http') ? processedPath : `${API_URL}${processedPath}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            return data.map(item => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                const nameKey = Object.keys(item).find(key =>
                  key.toLowerCase().includes('name') ||
                  key.toLowerCase().includes('label') ||
                  key.toLowerCase() === 'title' ||
                  key.toLowerCase().includes('plate')
                );
                if (nameKey) return String(item[nameKey]);
                const firstKey = Object.keys(item)[0];
                return firstKey ? String(item[firstKey]) : '';
              }
              return String(item);
            }).filter(Boolean);
          } catch (e) {
            console.warn(`Error fetching options from ${path}:`, e);
            return [];
          }
        };

        const processField = async (f) => {
          let updatedField = { ...f };
          if (['Dropdown', 'Searchable Dropdown', 'Radio Button', 'Checkbox'].includes(f.type)) {
            if (f.optionSource === 'dynamic' && f.dynamicPath) {
              const dynOptions = await fetchDynamicOptions(f.dynamicPath);
              updatedField.allowedOptions = dynOptions;
            } else {
              const dbOptions = fieldValuesMap[f.id];
              const fallback = f.optionsArr && f.optionsArr.length > 0
                ? f.optionsArr
                : (f.options || '').split(',').map(o => o.trim()).filter(Boolean);
              updatedField.allowedOptions = (dbOptions && dbOptions.length > 0) ? dbOptions : fallback;
            }
          }
          if (f.subsections && f.subsections.length > 0) {
            const filteredSubs = await Promise.all(
              f.subsections.map(async (sub) => {
                const subFields = await Promise.all(
                  (sub.fields || [])
                    .filter(sf => permittedFields[sf.id])
                    .map(sf => processField(sf))
                );
                const sortedSubFields = [...subFields].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
                return { ...sub, fields: sortedSubFields };
              })
            );
            updatedField.subsections = filteredSubs.filter(sub => sub.fields.length > 0);
          }
          return updatedField;
        };

        const filteredSections = (await Promise.all(parsedSections.map(async (section) => {
          const sectionFields = await Promise.all(
            (section.fields || [])
              .filter(f => permittedFields[f.id])
              .map(f => processField(f))
          );
          const sortedSectionFields = [...sectionFields].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
          return {
            ...section,
            fields: sortedSectionFields
          };
        }))).filter(section => section.fields.length > 0);

        setFieldsLayout(filteredSections);
      } else {
        setFieldsLayout([]);
        setCustomFieldId(null);
      }
    } catch (err) {
      console.error(err);
      showToast && showToast('Error loading form configuration', 'error');
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
    setSelectedModule(String(record.moduleid || '50'));
    await fetchCompaniesForClient(String(record.clientid || ''), 'edit');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || '50')
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
    setSelectedModule(String(record.moduleid || '50'));
    await fetchCompaniesForClient(String(record.clientid || ''), 'view');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || '50')
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
      const res = await fetch(`${API_URL}/api/vehicle-toll/${recordToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete vehicle toll record');

      showToast && showToast('Vehicle toll record deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast && showToast('Error deleting vehicle toll record', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        vehicle_id: null,
        custom_field_id: customFieldId,
        field_data: formData,
        clientid: configParams.clientid || selectedClient || null,
        country_id: configParams.country_id || selectedCountry || null,
        moduleid: configParams.moduleid || selectedModule || 50,
        company_id: selectedCompany || null,
        roleid: user ? user.roleId : null,
        user_id: user ? user.id : null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}/api/vehicle-toll/${editingRecord.id}`
        : `${API_URL}/api/vehicle-toll`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'save'} vehicle toll record`);

      showToast && showToast(isEditing ? 'Vehicle toll record updated successfully!' : 'Form submitted successfully!', 'success');
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast && showToast('Error saving vehicle toll record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'Dropdown':
      case 'Searchable Dropdown': {
        const options = (field.allowedOptions && field.allowedOptions.length > 0)
          ? field.allowedOptions
          : (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
        const dropdownData = options.map(opt => ({ label: opt, value: opt }));
        return (
          <SearchableDropdown
            data={dropdownData}
            value={formData[field.id] || ''}
            onChange={(val) => handleInputChange(field.id, val)}
            placeholder={`-- Select ${field.name} --`}
            searchPlaceholder={`Search ${field.name}...`}
            displayKey="label"
            valueKey="value"
            disabled={isViewOnly}
          />
        );
      }
      case 'Date': {
        const val = formData[field.id] || new Date().toISOString().split('T')[0];
        return (
          <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
            <input
              type="date"
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }])}
              disabled={isViewOnly}
            />
          </View>
        );
      }
      case 'Time': {
        const val = formData[field.id] || '12:00';
        return (
          <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
            <input
              type="time"
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }])}
              disabled={isViewOnly}
            />
          </View>
        );
      }
      case 'Number':
        return (
          <TextInput
            style={[styles.input, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor={COLORS.textMuted}
            value={formData[field.id] || ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            keyboardType="numeric"
            editable={!isViewOnly}
          />
        );
      default:
        return (
          <TextInput
            style={[styles.input, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor={COLORS.textMuted}
            value={formData[field.id] || ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            editable={!isViewOnly}
          />
        );
    }
  };

  // Helper to get formatted row value from record
  const getRecordValue = (record, possibleNames) => {
    if (!record.field_data) return '-';
    const data = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
    // Iterate entries to find matching field label
    for (const [key, val] of Object.entries(data)) {
      if (val) return String(val);
    }
    return '-';
  };

  const filteredRecords = vehicleTollRecords.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const str = JSON.stringify(r.field_data || {}).toLowerCase();
    return str.includes(q);
  });

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <View style={styles.container}>
      {/* MAIN HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vehicle Toll</Text>
          <Text style={styles.headerSubtitle}>Manage your vehicle toll records.</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNewRecord}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Vehicle Toll</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        {vehicleTollRecords.length === 0 && !searchQuery ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No vehicle toll records found.</Text>
            <Text style={styles.emptyStateSubtext}>Click 'Add Vehicle Toll' to create a new record.</Text>
          </View>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1, overflow: 'hidden' }}>
            {/* Top Toolbar */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', width: 300 }}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 13, color: '#334155', outlineStyle: 'none', outlineWidth: 0 }}
                  placeholder="Search by ID or Client..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={(text) => { setSearchQuery(text); setCurrentPage(1); }}
                />
              </View>
            </View>

            {/* Table Header */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 20 }}>
              <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>ID</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Client Info</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Module Info</Text>
              <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Data Preview</Text>
              <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Submitted By</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</Text>
              <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ACTION</Text>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {(() => {
                const filtered = vehicleTollRecords.filter(r => {
                  if (user && String(user.roleId) !== '1' && user.clientid) {
                    if (String(r.clientid) !== String(user.clientid)) return false;
                  }
                  if (!searchQuery) return true;
                  const cObj = clients.find(c => String(c.id) === String(r.clientid));
                  const cName = cObj ? (cObj.client_name || cObj.name) : `Client ${r.clientid}`;
                  return String(r.id).includes(searchQuery) || (cName && cName.toLowerCase().includes(searchQuery.toLowerCase()));
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
                const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                if (filtered.length === 0) {
                  return (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 14 }}>No matches found</Text>
                    </View>
                  );
                }

                return (
                  <View style={{ flex: 1 }}>
                    {paginated.map((record) => {
                      let parsedData = {};
                      if (record.field_data) {
                        try {
                          parsedData = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
                        } catch (e) { }
                      }
                      const clientObj = clients.find(c => String(c.id) === String(record.clientid));
                      const clientName = clientObj ? (clientObj.client_name || clientObj.name) : `Client ${record.clientid}`;
                      const countryObj = countries.find(c => String(c.id) === String(record.country_id));
                      const countryName = countryObj ? countryObj.name : `Country ${record.country_id}`;
                      const moduleObj = modules.find(m => String(m.id) === String(record.moduleid));
                      const moduleName = moduleObj ? moduleObj.module_name : `Vehicle Toll`;

                      const rawFirstValue = Object.values(parsedData)[0];
                      let firstValue = '-';
                      if (rawFirstValue && typeof rawFirstValue === 'object') {
                        if (Array.isArray(rawFirstValue)) {
                          firstValue = rawFirstValue.map(f => f.name || 'File').join(', ');
                        } else {
                          firstValue = rawFirstValue.name || 'File';
                        }
                      } else if (rawFirstValue !== undefined && rawFirstValue !== null) {
                        firstValue = String(rawFirstValue);
                      }
                      const firstKey = Object.keys(parsedData)[0] ? Object.keys(parsedData)[0].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'No Data';

                      return (
                        <View key={record.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
                          <Text style={{ flex: 0.5, fontSize: 12, color: '#334155', fontWeight: '700' }}>#{record.id}</Text>

                          <View style={{ flex: 1.5, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{clientName}</Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Country: {countryName}</Text>
                          </View>

                          <View style={{ flex: 1.5, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{moduleName}</Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Created: {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}</Text>
                          </View>

                          <View style={{ flex: 2, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500', marginBottom: 4 }} numberOfLines={1}>{String(firstValue)}</Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Field: {firstKey}</Text>
                          </View>

                          <View style={{ flex: 1.5, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{record.role_name || `Role: ${record.roleid || 'N/A'}`}</Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>{record.employee_name || 'N/A'}</Text>
                          </View>

                          <View style={{ flex: 1, alignItems: 'flex-start' }}>
                            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Active</Text>
                            </View>
                          </View>

                          <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <TouchableOpacity style={{ padding: 4 }} onPress={() => handleView(record)}>
                              <Ionicons name="eye-outline" size={18} color="#0F172A" />
                            </TouchableOpacity>

                            {(checkRowPermission ? checkRowPermission(record.company_id || record.companyid, 'edit') : canEdit) && (
                              <TouchableOpacity style={{ padding: 4 }} onPress={() => handleEdit(record)}>
                                <Ionicons name="pencil" size={18} color="#166534" />
                              </TouchableOpacity>
                            )}

                            {(checkRowPermission ? checkRowPermission(record.company_id || record.companyid, 'delete') : canDelete) && (
                              <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDelete(record)}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>

            {/* Pagination Footer */}
            {(() => {
              const filtered = vehicleTollRecords.filter(r => {
                if (user && String(user.roleId) !== '1' && user.clientid) {
                  if (String(r.clientid) !== String(user.clientid)) return false;
                }
                if (!searchQuery) return true;
                const cObj = clients.find(c => String(c.id) === String(r.clientid));
                const cName = cObj ? (cObj.client_name || cObj.name) : `Client ${r.clientid}`;
                return String(r.id).includes(searchQuery) || (cName && cName.toLowerCase().includes(searchQuery.toLowerCase()));
              });
              const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
              const startEntry = filtered.length === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
              const endEntry = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>
                    Showing <Text style={{ fontWeight: '600', color: '#334155' }}>{startEntry}</Text> to <Text style={{ fontWeight: '600', color: '#334155' }}>{endEntry}</Text> of <Text style={{ fontWeight: '600', color: '#334155' }}>{filtered.length}</Text> entries
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: currentPage > 1 ? '#FFFFFF' : '#F1F5F9', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage(p => p - 1)}
                    >
                      <Text style={{ fontSize: 12, color: currentPage > 1 ? '#475569' : '#94A3B8', fontWeight: '500' }}>{'< Prev'}</Text>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Page <Text style={{ fontWeight: '600', color: '#334155' }}>{currentPage}</Text> of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: currentPage < totalPages ? '#FFFFFF' : '#F1F5F9', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}
                      disabled={currentPage === totalPages}
                      onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      <Text style={{ fontSize: 12, color: currentPage < totalPages ? '#475569' : '#94A3B8', fontWeight: '500' }}>{'Next >'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        )}
      </View>

      {/* Dynamic Form Modal (Field Permissions Enabled!) */}
      <Modal visible={isFormOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>
                  {isViewOnly ? `View Vehicle Toll Details #${editingRecord?.id}` : (editingRecord ? `Edit Vehicle Toll #${editingRecord.id}` : 'Add Vehicle Toll')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Step Indicator */}
            {!isViewOnly && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                {[
                  { id: 1, label: 'Configuration', icon: 'settings-outline' },
                  { id: 2, label: 'Form Data', icon: 'document-text-outline' }
                ].map((step, index, arr) => {
                  const isActive = wizardStep === step.id;
                  const isPast = wizardStep > step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? COLORS.primary : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? COLORS.primary : '#64748B' }}>{step.label}</Text>
                      </View>
                      {index < arr.length - 1 && (
                        <View style={{ flex: 1, height: 2, backgroundColor: wizardStep > step.id ? COLORS.primary : '#E2E8F0', marginHorizontal: 4 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {/* Modal Content */}
            {wizardStep === 1 && !editingRecord && !isViewOnly ? (
              <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24 }}>
                <View style={{ gap: 20 }}>
                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>CLIENT <Text style={styles.required}>*</Text></Text>
                    <SearchableDropdown
                      data={clients}
                      value={selectedClient}
                      onChange={async (val) => {
                        setSelectedClient(val);
                        setSelectedCompany('');
                        await fetchCompaniesForClient(val, 'create');
                      }}
                      placeholder="-- Select Client --"
                      searchPlaceholder="Search Client..."
                      displayKey="client_name"
                      valueKey="id"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>COMPANY <Text style={styles.required}>*</Text></Text>
                    <SearchableDropdown
                      data={companies}
                      value={selectedCompany}
                      onChange={(val) => {
                        setSelectedCompany(val);
                        const selectedIds = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (selectedIds.length > 0) {
                          const firstSelected = companies.find(c => String(c.id) === selectedIds[0]);
                          if (firstSelected && firstSelected.country) {
                            setSelectedCountry(String(firstSelected.country));
                          } else if (firstSelected && firstSelected.country_id) {
                            setSelectedCountry(String(firstSelected.country_id));
                          } else {
                            setSelectedCountry('1');
                          }
                        } else {
                          setSelectedCountry('');
                        }
                      }}
                      placeholder="-- Select Company --"
                      searchPlaceholder="Search Company..."
                      displayKey="company_name"
                      valueKey="id"
                    />
                  </View>

                  <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
                    <TouchableOpacity
                      style={[
                        styles.completeSaveBtn,
                        (!selectedClient || !selectedCompany) && { opacity: 0.5 }
                      ]}
                      disabled={!selectedClient || !selectedCompany}
                      onPress={() => {
                        const countryToUse = selectedCountry || '1';
                        fetchFormConfiguration(selectedClient, countryToUse, selectedModule || '50');
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontWeight: '500' }}>Loading form configuration...</Text>
              </View>
            ) : (!fieldsLayout || fieldsLayout.length === 0) ? (
              <View style={styles.centerContainer}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
                </View>
                <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' }}>
                  No form configuration found
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
                  Please check if active field permissions are defined for Vehicle Toll.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 8 }}
                  onPress={() => setWizardStep(1)}
                >
                  <Text style={{ color: '#0F172A', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 24, paddingBottom: 20 }}>
                  {fieldsLayout.map((section, index) => (
                    <View key={section.id} style={[styles.sectionCard, { zIndex: fieldsLayout.length - index }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.name || 'VEHICLE TOLL INFO'}</Text>
                      </View>

                      <View style={styles.sectionBody}>
                        {section.fields.map((field, fieldIndex) => (
                          <View key={field.id} style={[styles.fieldContainer, { zIndex: section.fields.length - fieldIndex }]}>
                            <Text style={styles.fieldLabel}>
                              {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                            </Text>
                            {renderField(field)}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Modal Footer */}
                <View style={styles.modalFooterBar}>
                  {isViewOnly ? (
                    <TouchableOpacity
                      style={styles.completeSaveBtn}
                      onPress={() => setIsFormOpen(false)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {wizardStep === 2 && !editingRecord ? (
                        <TouchableOpacity
                          style={styles.backBtn}
                          onPress={() => setWizardStep(1)}
                        >
                          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Back</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.backBtn}
                          onPress={() => setIsFormOpen(false)}
                        >
                          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.completeSaveBtn}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                            {editingRecord ? 'Update Record' : 'Complete & Save'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.error }]}>Confirm Deletion</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 12 }}>
              <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                Are you sure you want to delete this vehicle toll record?
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                Type <Text style={{ fontWeight: '700', color: COLORS.error }}>YES</Text> to confirm deletion:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Type YES"
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: COLORS.error }, deleteConfirmationText !== 'YES' && { opacity: 0.5 }]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmationText !== 'YES'}
              >
                <Text style={styles.submitBtnText}>Delete Permanently</Text>
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
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    padding: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    minHeight: 400,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 320,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    outline: 'none',
  },
  centerContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  td: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  tdActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  pageBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  pageBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  pageNumberText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 1100,
    maxHeight: '90%',
    minHeight: '60%',
    backgroundColor: COLORS.surface,
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fieldContainer: {
    width: '48%',
    marginBottom: 20,
    position: 'relative',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  formGroup: {
    gap: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    outlineStyle: 'none',
  },
  htmlDateInput: {
    height: 44,
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
    fontSize: 14,
    outlineStyle: 'none',
    outlineWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
  },
  modalFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  completeSaveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
