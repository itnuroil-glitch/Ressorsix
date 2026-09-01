import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal, Switch, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchableDropdown } from './CustomFieldsTab';
import { API_URL } from '../config';
import * as XLSX from 'xlsx';

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

export default function VehicleTollTab({ user, showToast, isSidebarCollapsed, permissions, checkRowPermission, isOverview = false, isTransaction = false }) {
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
  const [allCustomFields, setAllCustomFields] = useState([]);

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

  // View Details Modal state
  const [viewDetailModalVisible, setViewDetailModalVisible] = useState(false);
  const [selectedViewRecord, setSelectedViewRecord] = useState(null);

  // Excel Preview & 2-Step Import Modal state
  const [excelPreviewVisible, setExcelPreviewVisible] = useState(false);
  const [excelPreviewRows, setExcelPreviewRows] = useState([]);
  const [excelPreviewHeaders, setExcelPreviewHeaders] = useState([]);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  // 2-Step Import Wizard Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importClient, setImportClient] = useState('');
  const [importCompany, setImportCompany] = useState('');
  const [importSummary, setImportSummary] = useState(null);

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

  const apiRoute = isTransaction ? '/api/vehicle-toll-transaction' : (isOverview ? '/api/vehicle-toll-overview' : '/api/vehicle-toll');

  useEffect(() => {
    fetchInitialData();
  }, [isOverview, isTransaction]);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes, cfRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}${apiRoute}${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`),
        fetch(`${API_URL}/api/custom-fields`)
      ]);
      const [clientsData, countriesData, modulesData, recordsData, cfData] = await Promise.all([
        clientsRes.json(),
        countriesRes.json(),
        modulesRes.json(),
        recordsRes.ok ? recordsRes.json() : [],
        cfRes.ok ? cfRes.json() : []
      ]);
      setClients(clientsData || []);
      setCountries(countriesData || []);
      setModules(modulesData || []);
      setVehicleTollRecords(Array.isArray(recordsData) ? recordsData : []);
      setAllCustomFields(Array.isArray(cfData) ? cfData : []);

      // Defaults
      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));

      // Target Module ID ('71' for Toll Transactions, '70' for Vehicle Toll Overview, '50' for Vehicle Toll)
      const tollModule = (modulesData || []).find(m => isTransaction
        ? (m.module_name && m.module_name.toLowerCase().includes('transaction')) || String(m.id) === '71'
        : (isOverview
          ? (m.module_name && m.module_name.toLowerCase().includes('vehicle toll overview')) || String(m.id) === '70'
          : String(m.id) === '50' || (m.module_name && m.module_name.toLowerCase() === 'vehicle toll')
        )
      );
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

      // Fallback check: if no custom fields specifically for module #70 (Vehicle Toll Overview), check module #50 (Vehicle Toll)
      if (!matchingFieldDef && (String(moduleId) === '70' || isOverview)) {
        matchingFieldDef = customFields.find(cf =>
          String(cf.client_id || cf.clientid) === String(clientId) &&
          String(cf.module_id || cf.moduleid) === '50' &&
          String(cf.country_id || cf.countryid) === String(countryId)
        ) || customFields.find(cf =>
          (!cf.clientid && !cf.client_id) &&
          String(cf.module_id || cf.moduleid) === '50' &&
          String(cf.country_id || cf.countryid) === String(countryId)
        );
      }

      // 2. Fetch permissions
      const permRes = await fetch(`${API_URL}/api/field-permissions`);
      const permissionsList = await permRes.json();

      let activePerm = permissionsList.find(p =>
        String(p.clientid) === String(clientId) &&
        String(p.moduleid) === String(moduleId) &&
        String(p.countryid || p.country_id) === String(countryId)
      );
      if (!activePerm && (String(moduleId) === '70' || isOverview)) {
        activePerm = permissionsList.find(p =>
          String(p.clientid) === String(clientId) &&
          String(p.moduleid) === '50' &&
          String(p.countryid || p.country_id) === String(countryId)
        );
      }

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
                if (item.label) return String(item.label);
                if (item.value) return String(item.value);
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

            // Auto-fetch Account Numbers for any "Acc No" dropdown when options are empty
            const fieldNameLower = (f.name || f.label || '').toLowerCase();
            if ((!updatedField.allowedOptions || updatedField.allowedOptions.length === 0) &&
                (fieldNameLower.includes('acc no') || fieldNameLower.includes('account no') || fieldNameLower.includes('acc_no'))) {
              const accOptions = await fetchDynamicOptions('/api/vehicle-tolls/account-numbers');
              if (accOptions && accOptions.length > 0) {
                updatedField.allowedOptions = accOptions;
              }
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

  const handleView = (record) => {
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setSelectedViewRecord({ ...record, parsedData: parsed });
    setViewDetailModalVisible(true);
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText !== 'YES' || !recordToDelete) return;
    try {
      const res = await fetch(`${API_URL}${apiRoute}/${recordToDelete.id}`, {
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
        moduleid: configParams.moduleid || selectedModule || (isOverview ? 70 : 50),
        company_id: selectedCompany || null,
        roleid: user ? user.roleId : null,
        user_id: user ? user.id : null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}${apiRoute}/${editingRecord.id}`
        : `${API_URL}${apiRoute}`;
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
    if (user && String(user.roleId) !== '1' && user.clientid) {
      if (String(r.clientid) !== String(user.clientid)) return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const str = JSON.stringify(r.field_data || {}).toLowerCase();
    return str.includes(q);
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownloadTemplate = () => {
    try {
      if (isTransaction) {
        const templateAOA = [
          ["Trips Report"],
          [""],
          ["Account No: 34866829"],
          ["Trip(s) From 01-05-2026 To 16-05-2026"],
          ["Trip(s) Type: All types of trips"],
          ["All Vehicle(s)"],
          [""],
          ["Trips Details"],
          ["Transaction ID", "Trip Date", "Trip Time", "Transaction Post Date", "Toll Gate", "Direction", "Tag Number", "Plate", "Amount (AED)", "5% VAT Amount (AED)", "Total Amount (AED) (Incl. VAT)"],
          ["90044195184", "15 Aug 2026", "10:34:49 AM", "15 Aug 2026", "Al Mamzar South", "Sharjah", "13199982", "64914", "4.00", "0.20", "4.20"],
          ["90044195185", "15 Aug 2026", "11:15:00 AM", "15 Aug 2026", "Sheikh Zayed Bridge", "Abu Dhabi", "13101128", "59462", "4.00", "0.20", "4.20"]
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(templateAOA);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Vehicle_Toll_Transactions_Template.xlsx");
        showToast && showToast('Template downloaded successfully!', 'success');
        return;
      }

      const templateData = [
        {
          "Account No": "D-990",
          "Toll Name": "Darb"
        },
        {
          "Account No": "34866829",
          "Toll Name": "Salik"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      const filename = isOverview ? "Vehicle_Toll_Overview_Template.xlsx" : "Vehicle_Toll_Template.xlsx";
      XLSX.writeFile(workbook, filename);
      showToast && showToast('Template downloaded successfully!', 'success');
    } catch (e) {
      console.error('Error downloading template:', e);
      showToast && showToast('Error downloading template', 'error');
    }
  };

  const handleImportExcelClick = async () => {
    setImportStep(1);
    const defaultClient = selectedClient || (user?.client_id || user?.clientid ? String(user?.client_id || user?.clientid) : '');
    setImportClient(defaultClient);
    setImportCompany('');
    setImportSummary(null);
    if (defaultClient) {
      const compList = await fetchCompaniesForClient(defaultClient, 'view');
      if (compList && compList.length > 0) {
        setImportCompany(String(compList[0].id));
      }
    } else {
      setCompanies([]);
    }
    setIsImportModalOpen(true);
  };

  const handleFileUploadFromModal = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Scan top 20 rows for header Account No (e.g. "Account No: 34866829")
      let extractedAccountNo = null;
      for (let i = 0; i < Math.min(rawMatrix.length, 20); i++) {
        const rowArr = rawMatrix[i] || [];
        const rowStr = rowArr.map(c => String(c || '')).join(' ');
        const match = rowStr.match(/Account\s*(?:No|Number|#)?\s*[:.-]?\s*([A-Za-z0-9-]+)/i);
        if (match && match[1]) {
          extractedAccountNo = match[1].trim();
          break;
        }
      }

      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawMatrix.length, 50); i++) {
        const rowStr = JSON.stringify(rawMatrix[i] || {}).toLowerCase();
        if (
          rowStr.includes('transaction id') ||
          rowStr.includes('toll id') ||
          rowStr.includes('tag number') ||
          rowStr.includes('toll name') ||
          rowStr.includes('trip date') ||
          rowStr.includes('plate')
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

      const filteredRows = (rows || []).filter(r => {
        const str = JSON.stringify(r || {}).toLowerCase();
        return !str.includes('totalamount') && !str.includes('totaltrips');
      }).map(r => {
        const hasAccountKey = Object.keys(r).some(k => k.toLowerCase().includes('account'));
        if (extractedAccountNo && !hasAccountKey) {
          return {
            'Account No': extractedAccountNo,
            ...r
          };
        }
        return r;
      });

      if (!filteredRows || filteredRows.length === 0) {
        showToast && showToast('No valid transaction data found in the imported file', 'error');
        setLoading(false);
        return;
      }

      const headers = Object.keys(filteredRows[0] || {});
      setExcelPreviewHeaders(headers);
      setExcelPreviewRows(filteredRows);
      setIsImportModalOpen(false);
      setExcelPreviewVisible(true);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      showToast && showToast('Error reading Excel file: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!excelPreviewRows || excelPreviewRows.length === 0) return;
    try {
      setIsImportingExcel(true);
      
      const flattenCustomFieldsList = (detailsArr) => {
        const result = [];
        if (!Array.isArray(detailsArr)) return result;
        detailsArr.forEach(item => {
          if (item && item.fields && Array.isArray(item.fields)) {
            result.push(...flattenCustomFieldsList(item.fields));
          } else if (item && item.id) {
            result.push(item);
          }
        });
        return result;
      };

      // Gather flat list of field definitions from all custom field records
      const flatFields = [];
      (allCustomFields || []).forEach(cf => {
        if (cf.custom_field_details) {
          let details = cf.custom_field_details;
          if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch(e){}
          }
          flatFields.push(...flattenCustomFieldsList(details));
        }
      });

      // Match Toll Name & Toll ID field IDs
      let tollNameField = flatFields.find(f => (f.name || f.label || '').toLowerCase().trim().includes('toll name') || (f.name || f.label || '').toLowerCase().trim().includes('name'));
      let tollIdField = flatFields.find(f => (f.name || f.label || '').toLowerCase().trim().includes('account') || (f.name || f.label || '').toLowerCase().trim().includes('toll id') || ((f.name || f.label || '').toLowerCase().trim().includes('id') && !(f.name || f.label || '').toLowerCase().trim().includes('name') && !(f.name || f.label || '').toLowerCase().trim().includes('client')));

      const targetModuleId = isTransaction ? 71 : (isOverview ? 70 : 50);
      const targetApiRoute = isTransaction ? '/api/vehicle-toll-transaction' : (isOverview ? '/api/vehicle-toll-overview' : '/api/vehicle-toll');

      const uniqueBatchRows = excelPreviewRows;
      let fileDuplicatesCount = 0;

      let importedCount = 0;
      let dbSkippedCount = 0;
      let failedCount = 0;

      const savePromises = uniqueBatchRows.map(async (row) => {
        try {
          const clientidVal = importClient || row['Client ID'] || row['clientid'] || selectedClient || user?.client_id || user?.clientid || 1;
          const countryIdVal = row['Country ID'] || row['country_id'] || selectedCountry || user?.country_id || user?.countryid || 1;
          const companyIdVal = importCompany || row['Company ID'] || row['company_id'] || selectedCompany || user?.company_id || user?.companyid || 1;

          // Locate matching custom field record for this client, country & module
          let matchingCf = (allCustomFields || []).find(cf =>
            String(cf.client_id || cf.clientid) === String(clientidVal) &&
            String(cf.module_id || cf.moduleid) === String(targetModuleId) &&
            String(cf.country_id || cf.countryid) === String(countryIdVal)
          );
          if (!matchingCf && (String(targetModuleId) === '70' || isOverview)) {
            matchingCf = (allCustomFields || []).find(cf =>
              String(cf.client_id || cf.clientid) === String(clientidVal) &&
              String(cf.module_id || cf.moduleid) === '50' &&
              String(cf.country_id || cf.countryid) === String(countryIdVal)
            ) || (allCustomFields || []).find(cf =>
              (!cf.clientid && !cf.client_id) &&
              String(cf.module_id || cf.moduleid) === '50' &&
              String(cf.country_id || cf.countryid) === String(countryIdVal)
            );
          }
          if (!matchingCf) {
            matchingCf = (allCustomFields || []).find(cf =>
              (!cf.clientid && !cf.client_id) &&
              String(cf.module_id || cf.moduleid) === String(targetModuleId) &&
              String(cf.country_id || cf.countryid) === String(countryIdVal)
            ) || (allCustomFields || []).find(cf =>
              String(cf.module_id || cf.moduleid) === String(targetModuleId)
            );
          }

          let cfDetails = [];
          if (matchingCf && matchingCf.custom_field_details) {
            try {
              cfDetails = typeof matchingCf.custom_field_details === 'string'
                ? JSON.parse(matchingCf.custom_field_details)
                : matchingCf.custom_field_details;
            } catch(e) {}
          }
          const flatCfFields = flattenCustomFieldsList(cfDetails);

          // Match Toll Name & Account No / Toll ID field IDs specific to matchingCf
          let rowTollNameField = flatCfFields.find(f => (f.name || f.label || '').toLowerCase().trim().includes('toll name') || (f.name || f.label || '').toLowerCase().trim().includes('name')) || tollNameField;
          let rowTollIdField = flatCfFields.find(f => (f.name || f.label || '').toLowerCase().trim().includes('account') || (f.name || f.label || '').toLowerCase().trim().includes('toll id') || ((f.name || f.label || '').toLowerCase().trim().includes('id') && !(f.name || f.label || '').toLowerCase().trim().includes('name') && !(f.name || f.label || '').toLowerCase().trim().includes('client'))) || tollIdField;

          const fieldDataObj = {};
          const tollNameVal = row['Toll Name'] || row['Toll Gate'] || row['Toll Type'] || row['toll_name'] || row['Name'] || Object.values(row)[0] || '';
          const tollIdVal = row['Account No'] || row['ACCOUNT NO'] || row['account_no'] || row['Transaction ID'] || row['Toll ID'] || row['toll_id'] || row['Tag Number'] || row['ID'] || Object.values(row)[0] || '';

          if (rowTollNameField) {
            fieldDataObj[rowTollNameField.id] = tollNameVal;
          }
          if (rowTollIdField) {
            fieldDataObj[rowTollIdField.id] = tollIdVal;
          }
          if (tollNameVal) fieldDataObj['1786629185586'] = tollNameVal;
          if (tollIdVal) fieldDataObj['1786629206891'] = tollIdVal;

          Object.keys(row).forEach(k => {
            if (!['Client ID', 'Country ID', 'Company ID', 'clientid', 'country_id', 'company_id'].includes(k)) {
              fieldDataObj[k] = row[k];
              const matchedF = flatCfFields.find(f => (f.name || f.label || '').toLowerCase().trim() === k.toLowerCase().trim() || String(f.id) === String(k))
                || flatFields.find(f => (f.name || f.label || '').toLowerCase().trim() === k.toLowerCase().trim() || String(f.id) === String(k));
              if (matchedF) {
                fieldDataObj[matchedF.id] = row[k];
              }
            }
          });

          const payload = {
            custom_field_id: matchingCf ? matchingCf.id : null,
            clientid: clientidVal,
            country_id: countryIdVal,
            company_id: companyIdVal,
            moduleid: targetModuleId,
            roleid: user?.roleId || user?.role_id || null,
            user_id: user?.id || null,
            transaction_id: row['Transaction ID'] || row['transaction_id'] || row['Toll ID'] || row['toll_id'] || row['Trip ID'] || row['trip_id'] || row['ID'] || null,
            plate: row['Plate'] || row['plate'] || row['Plate Number'] || row['Plate No'] || null,
            tag_number: row['Tag Number'] || row['tag_number'] || row['Tag No'] || row['Tag'] || null,
            toll_gate: row['Toll Gate'] || row['toll_gate'] || row['Gate'] || row['Toll Name'] || null,
            direction: row['Direction'] || row['direction'] || null,
            trip_date: row['Trip Date'] || row['trip_date'] || row['Date'] || null,
            trip_time: row['Trip Time'] || row['trip_time'] || row['Time'] || null,
            amount: row['Amount(AED)'] || row['Amount'] || row['amount'] || row['Fee'] || null,
            toll_name: row['Toll Name'] || row['toll_name'] || row['Toll Type'] || null,
            field_data: fieldDataObj
          };

          const res = await fetch(`${API_URL}${targetApiRoute}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (res.ok) {
            if (data.skipped) {
              dbSkippedCount++;
            } else {
              importedCount++;
            }
          } else {
            failedCount++;
          }
        } catch (rowErr) {
          console.error('Error importing single row:', rowErr);
          failedCount++;
        }
      });

      await Promise.all(savePromises);

      const totalSkipped = fileDuplicatesCount + dbSkippedCount;

      let titleHeader = "Import Complete!";
      if (totalSkipped > 0) {
        titleHeader = "Duplicate entry exists!";
      } else if (failedCount > 0 && importedCount === 0) {
        titleHeader = "Import Failed!";
      }

      const summaryMsg = `${titleHeader}\n\nImported: ${importedCount}\nSkipped duplicates: ${totalSkipped}\nFailed: ${failedCount}`;
      showToast && showToast(summaryMsg, totalSkipped > 0 ? 'info' : (failedCount > 0 ? 'error' : 'success'));

      setExcelPreviewVisible(false);
      setExcelPreviewRows([]);
      setExcelPreviewHeaders([]);
      await fetchInitialData();
    } catch (err) {
      console.error('Error importing Excel:', err);
      showToast && showToast('Error processing Excel file: ' + err.message, 'error');
    } finally {
      setIsImportingExcel(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* MAIN HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.headerTitle}>{isTransaction ? 'Toll Transactions' : (isOverview ? 'Vehicle Toll Overview' : 'Vehicle Toll')}</Text>
          <Text style={styles.headerSubtitle}>
            {isTransaction ? 'Detailed trip transaction logs imported from Salik / Darb reports.' : (isOverview ? 'Comprehensive overview and transaction summary of vehicle tolls across all client fleets.' : 'Manage your vehicle toll records.')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Template Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#475569',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              gap: 6
            }}
            onPress={handleDownloadTemplate}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Template</Text>
          </TouchableOpacity>

          {/* Import Excel Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#16A34A',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              gap: 6
            }}
            onPress={handleImportExcelClick}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{isTransaction || isOverview ? '+ Import Excel' : 'Import Excel'}</Text>
          </TouchableOpacity>

          {/* Add Vehicle Toll Button */}
          {canCreate && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#14532D',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                gap: 6
              }}
              onPress={handleAddNewRecord}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{isTransaction ? 'Add Transaction' : (isOverview ? 'Add Overview' : 'Add Vehicle Toll')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* OVERVIEW SUMMARY CARDS */}
      {isOverview && (
        <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 16, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="car-outline" size={22} color="#059669" />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Total Toll Accounts</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{vehicleTollRecords.length}</Text>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={22} color="#2563EB" />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>Active Gateways</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>Salik / Darb</Text>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#D97706" />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>System Status</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669', marginTop: 2 }}>Active Sync</Text>
            </View>
          </View>
        </View>
      )}

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        {vehicleTollRecords.length === 0 && !searchQuery ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No vehicle toll records found.</Text>
            <Text style={styles.emptyStateSubtext}>Click '{isOverview ? 'Add Overview' : 'Add Vehicle Toll'}' to create a new record.</Text>
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
            {isTransaction ? (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 20 }}>
                <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TRANSACTION ID</Text>
                <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TAG / PLATE</Text>
                <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>VEHICLE NAME</Text>
                <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TOLL GATE</Text>
                <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>DIRECTION</Text>
                <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TRIP DATE & TIME</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TOTAL AMOUNT (AED)</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ACTION</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 20 }}>
                <Text style={{ flex: isOverview ? 1.2 : 0.8, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>{isOverview ? 'ACCOUNT NO' : 'ID'}</Text>
                {!isOverview && (
                  <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Client Info</Text>
                )}
                {isOverview ? (
                  <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>COMPANY</Text>
                ) : (
                  <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Module Info</Text>
                )}
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>{isOverview ? 'TOLL TYPE' : 'DATA PREVIEW'}</Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Submitted By</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</Text>
                <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>ACTION</Text>
              </View>
            )}

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {(() => {
                const filtered = vehicleTollRecords.filter(r => {
                  if (user && String(user.roleId) !== '1' && user.clientid) {
                    if (String(r.clientid) !== String(user.clientid)) return false;
                  }
                  if (!searchQuery) return true;
                  const cObj = clients.find(c => String(c.id) === String(r.clientid));
                  const cName = cObj ? (cObj.client_name || cObj.name) : `Client ${r.clientid}`;
                  const txnMatch = r.transaction_id && String(r.transaction_id).toLowerCase().includes(searchQuery.toLowerCase());
                  const tagMatch = r.tag_number && String(r.tag_number).toLowerCase().includes(searchQuery.toLowerCase());
                  const plateMatch = r.plate && String(r.plate).toLowerCase().includes(searchQuery.toLowerCase());
                  const gateMatch = r.toll_gate && String(r.toll_gate).toLowerCase().includes(searchQuery.toLowerCase());
                  return String(r.id).includes(searchQuery) || (cName && cName.toLowerCase().includes(searchQuery.toLowerCase())) || txnMatch || tagMatch || plateMatch || gateMatch;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
                const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

                      if (isTransaction) {
                        const txnId = record.transaction_id || parsedData['Transaction ID'] || parsedData['toll_id'] || `#${record.id}`;
                        const tagNo = record.tag_number || parsedData['Tag Number'] || 'N/A';
                        const plateNo = record.plate || parsedData['Plate'] || 'N/A';
                        const gate = record.toll_gate || parsedData['Toll Gate'] || parsedData['toll_name'] || 'N/A';
                        const dir = record.direction || parsedData['Direction'] || 'N/A';
                        const tripDt = (record.trip_date || parsedData['Trip Date'] || '') + ' ' + (record.trip_time || parsedData['Trip Time'] || '');
                        
                        const rawTotalAmt = record.total_amount !== null && record.total_amount !== undefined
                          ? record.total_amount
                          : (record.amount !== null && record.amount !== undefined
                              ? (parseFloat(record.amount) * 1.05)
                              : (parsedData['Total Amount (AED) (Incl. VAT)'] || parsedData['total_amount'] || parsedData['Amount (AED)'] || parsedData['Amount(AED)'] || parsedData['amount'] || 0));
                        const totalAmtNum = parseFloat(rawTotalAmt) || 0;

                        return (
                          <View key={record.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
                            <View style={{ flex: 1.4, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700' }} numberOfLines={1}>{txnId}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>DB ID: #{record.id}</Text>
                            </View>

                            <View style={{ flex: 1.2, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>
                                {plateNo}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#64748B' }} numberOfLines={1}>
                                Tag: {tagNo}
                              </Text>
                            </View>

                            <View style={{ flex: 1.4, paddingRight: 10 }}>
                              {record.vehicle_name ? (
                                <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                                  <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '700' }} numberOfLines={1}>
                                    🚗 {record.vehicle_name}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Unassigned</Text>
                              )}
                            </View>

                            <View style={{ flex: 1.4, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }} numberOfLines={1}>{gate}</Text>
                            </View>

                            <View style={{ flex: 1.1, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={1}>{dir}</Text>
                            </View>

                            <View style={{ flex: 1.4, paddingRight: 10 }}>
                              <Text style={{ fontSize: 12, color: '#334155' }} numberOfLines={1}>{tripDt.trim() || 'N/A'}</Text>
                            </View>

                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#166534', fontWeight: '700' }} numberOfLines={1}>AED {totalAmtNum.toFixed(2)}</Text>
                            </View>

                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
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
                      }
                      const clientObj = clients.find(c => String(c.id) === String(record.clientid));
                      const clientName = clientObj ? (clientObj.client_name || clientObj.name) : `Client ${record.clientid}`;
                      const companyObj = companies.find(c => String(c.id) === String(record.company_id || record.companyid));
                      const companyName = companyObj ? (companyObj.company_name || companyObj.name) : (record.company_name ? record.company_name : (record.company_id || record.companyid ? `Company #${record.company_id || record.companyid}` : ''));
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

                      // Extract Account No and Toll Type from parsedData JSON
                      let formAccountNoVal = '';
                      let formTollTypeVal = '';

                      if (parsedData && typeof parsedData === 'object') {
                        // Direct key lookup for Account No / Toll ID
                        formAccountNoVal = 
                          parsedData['Account No'] || 
                          parsedData['ACCOUNT NO'] || 
                          parsedData['account_no'] || 
                          parsedData['1786629206891'] || 
                          parsedData['Toll ID'] || 
                          parsedData['toll_id'] || 
                          '';

                        // Direct key lookup for Toll Name / Type
                        formTollTypeVal = 
                          parsedData['Toll Name'] || 
                          parsedData['TOLL NAME'] || 
                          parsedData['toll_name'] || 
                          parsedData['1786629185586'] || 
                          '';

                        if (!formAccountNoVal || !formTollTypeVal) {
                          const entries = Object.entries(parsedData);
                          if (!formAccountNoVal && entries.length > 1) {
                            formAccountNoVal = String(entries[1][1] || '');
                          }
                          if (!formTollTypeVal && entries.length > 0) {
                            formTollTypeVal = String(entries[0][1] || '');
                          }
                        }
                      }

                      if (!formTollTypeVal) formTollTypeVal = firstValue !== '-' ? firstValue : 'Salik / Darb';
                      if (!formAccountNoVal || formAccountNoVal === formTollTypeVal) {
                        formAccountNoVal = `Acc: #${record.id}`;
                      }

                      return (
                        <View key={record.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
                          <View style={{ flex: 1.2, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700' }} numberOfLines={1}>
                              {isOverview ? formAccountNoVal : `#${record.id}`}
                            </Text>
                            {isOverview && (
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>
                                Toll: {formTollTypeVal}
                              </Text>
                            )}
                          </View>

                          {!isOverview && (
                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{clientName}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Country: {countryName}</Text>
                            </View>
                          )}

                          {isOverview ? (
                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600' }} numberOfLines={1}>
                                {companyName || 'Unassigned'}
                              </Text>
                            </View>
                          ) : (
                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{moduleName}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Created: {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}</Text>
                            </View>
                          )}

                          <View style={{ flex: 2, paddingRight: 10 }}>
                            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>
                              {isOverview ? formTollTypeVal : String(firstValue)}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>
                              {isOverview ? `Account: ${formAccountNoVal}` : `Field: ${firstKey}`}
                            </Text>
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
              const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
              const startEntry = filtered.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
              const endEntry = Math.min(currentPage * itemsPerPage, filtered.length);

              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Showing <Text style={{ fontWeight: '600', color: '#334155' }}>{startEntry}</Text> to <Text style={{ fontWeight: '600', color: '#334155' }}>{endEntry}</Text> of <Text style={{ fontWeight: '600', color: '#334155' }}>{filtered.length}</Text> entries
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Rows per page:</Text>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          borderColor: '#CBD5E1',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          fontSize: 12,
                          color: '#1E293B',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 14, paddingVertical: 2, backgroundColor: currentPage > 1 ? '#FFFFFF' : '#F1F5F9', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage(p => p - 1)}
                    >
                      <Text style={{ fontSize: 12, color: currentPage > 1 ? '#475569' : '#94A3B8', fontWeight: '500' }}>{'< Prev'}</Text>
                    </TouchableOpacity>

                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Page <Text style={{ fontWeight: '600', color: '#334155' }}>{currentPage}</Text> of {totalPages}
                    </Text>

                    <TouchableOpacity
                      style={{ paddingHorizontal: 14, paddingVertical: 2, backgroundColor: currentPage < totalPages ? '#FFFFFF' : '#F1F5F9', borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' }}
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
                        {section.fields.map((field, fieldIndex) => {
                          const visibleSubsections = (field.subsections || []).filter(sub => {
                            if (!sub.triggerValue || sub.triggerValue.trim() === '') {
                              return true;
                            }
                            const parentValue = formData[field.id];
                            return parentValue && String(parentValue).trim().toLowerCase() === String(sub.triggerValue).trim().toLowerCase();
                          });
                          const hasSubsections = visibleSubsections.length > 0;

                          return (
                            <View key={field.id} style={[hasSubsections ? styles.fieldContainerFull : styles.fieldContainer, { zIndex: section.fields.length - fieldIndex }]}>
                              <Text style={styles.fieldLabel}>
                                {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                              </Text>
                              {renderField(field)}

                              {/* Render subsections if any are visible */}
                              {hasSubsections && (
                                <View style={styles.subsectionsContainer}>
                                  {visibleSubsections.map((sub, subIndex) => (
                                    <View key={sub.id} style={[styles.subsectionCard, { zIndex: visibleSubsections.length - subIndex, position: 'relative' }]}>
                                      <Text style={styles.subsectionTitle}>{sub.name}</Text>
                                      <View style={styles.subsectionBody}>
                                        {sub.fields.map((sf, sfIndex) => (
                                          <View key={sf.id} style={[styles.fieldContainer, { zIndex: sub.fields.length - sfIndex }]}>
                                            <Text style={styles.fieldLabel}>
                                              {sf.name} {sf.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                                            </Text>
                                            {renderField(sf)}
                                          </View>
                                        ))}
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          );
                        })}
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

      {/* Excel Import Preview Modal */}
      <Modal visible={excelPreviewVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 1000, maxHeight: '85%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color="#16A34A" />
                <View>
                  <Text style={styles.modalTitle}>Excel Import Data Preview</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Reviewing {excelPreviewRows.length} row(s) extracted from imported spreadsheet
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setExcelPreviewVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Table Preview Body */}
            <View style={{ flex: 1, padding: 20, backgroundColor: '#F8FAFC' }}>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ minWidth: '100%' }}
                style={{ flex: 1 }}
              >
                <View style={{ flex: 1, minWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
                  {/* Table Headers */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ width: 60, fontWeight: '700', fontSize: 12, color: '#475569' }}>#</Text>
                    {excelPreviewHeaders.map((headerKey) => (
                      <Text key={headerKey} style={{ flex: 1, minWidth: 160, fontWeight: '700', fontSize: 12, color: '#1E293B', textTransform: 'uppercase', paddingRight: 16 }}>
                        {headerKey}
                      </Text>
                    ))}
                  </View>

                  {/* Table Rows */}
                  <ScrollView style={{ flex: 1, maxHeight: 420 }}>
                    {excelPreviewRows.map((row, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                        <Text style={{ width: 60, fontSize: 13, color: '#64748B', fontWeight: '600' }}>{idx + 1}</Text>
                        {excelPreviewHeaders.map((headerKey) => (
                          <Text key={headerKey} style={{ flex: 1, minWidth: 160, fontSize: 13, color: '#0F172A', paddingRight: 16 }} numberOfLines={1}>
                            {row[headerKey] !== undefined && row[headerKey] !== null ? String(row[headerKey]) : '-'}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>

            {/* Modal Footer Bar */}
            <View style={styles.modalFooterBar}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setExcelPreviewVisible(false)}
                disabled={isImportingExcel}
              >
                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#16A34A',
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: isImportingExcel ? 0.7 : 1
                }}
                onPress={handleConfirmExcelImport}
                disabled={isImportingExcel}
              >
                {isImportingExcel ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                  {isImportingExcel ? 'Importing Data...' : `Confirm & Import ${excelPreviewRows.length} Rows`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2-Step Configuration Import Wizard Modal */}
      {isImportModalOpen && (
        <View style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '92%', maxWidth: 620, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)', borderWidth: 1, borderColor: '#E2E8F0' }}>
            
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                  <Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>Import Toll Transactions</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Upload Salik / Darb transaction sheets into corporate asset log</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsImportModalOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Stepper Header Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: importStep === 1 ? COLORS.primary : '#10B981', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {importStep > 1 ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>1</Text>
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>STEP 1</Text>
                  <Text style={{ fontSize: 13, fontWeight: importStep === 1 ? '700' : '600', color: importStep === 1 ? COLORS.primary : '#10B981' }}>Scope Configuration</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: importStep === 2 ? COLORS.primary : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: importStep === 2 ? '#FFFFFF' : '#64748B', fontSize: 13, fontWeight: '800' }}>2</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>STEP 2</Text>
                  <Text style={{ fontSize: 13, fontWeight: importStep === 2 ? '700' : '500', color: importStep === 2 ? COLORS.primary : '#64748B' }}>File Upload & Import</Text>
                </View>
              </View>
            </View>

            {/* Modal Body */}
            <View style={{ padding: 24, backgroundColor: '#FFFFFF' }}>

              {/* STEP 1: CONFIGURATION */}
              {importStep === 1 && (
                <View>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                      Select the destination <Text style={{ fontWeight: '700', color: '#0F172A' }}>Client</Text> and <Text style={{ fontWeight: '700', color: '#0F172A' }}>Company</Text>. All transactions in the uploaded sheet will be automatically assigned to this scope.
                    </Text>
                  </View>

                  {/* Client Dropdown */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.3 }}>CLIENT <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={importClient}
                        onChange={async (e) => {
                          const cId = e.target.value;
                          setImportClient(cId);
                          setImportCompany('');
                          if (cId) {
                            const compList = await fetchCompaniesForClient(cId, 'view');
                            if (compList && compList.length > 0) {
                              setImportCompany(String(compList[0].id));
                            }
                          } else {
                            setCompanies([]);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Select Client --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.client_name || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </View>

                  {/* Company Dropdown */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.3 }}>COMPANY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={importCompany}
                        onChange={(e) => setImportCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Select Company --</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}
                      onPress={() => setIsImportModalOpen(false)}
                    >
                      <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)' }}
                      onPress={() => {
                        if (!importClient) {
                          showToast && showToast('Please select a Client', 'error');
                          return;
                        }
                        if (!importCompany) {
                          showToast && showToast('Please select a Company', 'error');
                          return;
                        }
                        setImportStep(2);
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Continue to Upload</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: FILE UPLOAD */}
              {importStep === 2 && (
                <View>
                  {/* Configuration Summary Badge */}
                  {(() => {
                    const selectedClientObj = clients.find(c => String(c.id) === String(importClient));
                    const selectedCompObj = companies.find(c => String(c.id) === String(importCompany));
                    return (
                      <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <View style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="shield-checkmark" size={16} color="#059669" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>ACTIVE CONFIGURATION SCOPE</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#6EE7B7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="person-outline" size={13} color="#047857" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>{selectedClientObj?.client_name || selectedClientObj?.name || importClient}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={12} color="#059669" />
                            <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#6EE7B7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="business-outline" size={13} color="#047857" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>{selectedCompObj?.company_name || selectedCompObj?.name || importCompany}</Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => setImportStep(1)}
                          style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>Change Scope</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {/* Dropzone */}
                  <View style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: '#059669', borderRadius: 14, padding: 32, alignItems: 'center', backgroundColor: '#F8FAFC', marginBottom: 20, position: 'relative' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Ionicons name="cloud-upload" size={30} color={COLORS.primary} />
                    </View>
                    
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Select Excel / CSV File</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                      Upload official Salik or Darb trip statement sheet (.xlsx, .xls, .csv)
                    </Text>

                    {/* Styled Custom Button with hidden overlay file input */}
                    <div style={{ marginTop: 18, position: 'relative', display: 'inline-block' }}>
                      <div style={{
                        backgroundColor: COLORS.primary,
                        color: '#FFFFFF',
                        padding: '12px 24px',
                        borderRadius: 8,
                        fontWeight: '700',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
                        cursor: 'pointer'
                      }}>
                        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                        <span>Browse Excel File</span>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUploadFromModal}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={() => setImportStep(1)}
                    >
                      <Ionicons name="arrow-back" size={16} color="#475569" />
                      <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Back to Config</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                      onPress={() => setIsImportModalOpen(false)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </View>
          </View>
        </View>
      )}

      {/* VIEW DETAILS MODAL */}
      <Modal
        visible={viewDetailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard || {}, { maxWidth: 720, width: '90%', maxHeight: '85%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', padding: 0 }]}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={22} color="#0284C7" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                    {isTransaction ? 'Toll Transaction Details' : (isOverview ? 'Vehicle Toll Account Details' : 'Vehicle Toll Details')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {selectedViewRecord ? `DB Record ID: #${selectedViewRecord.id}` : ''}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setViewDetailModalVisible(false)}
                style={{ padding: 6, borderRadius: 6, backgroundColor: '#F1F5F9' }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            {selectedViewRecord && (
              <ScrollView style={{ flex: 1, padding: 20 }}>
                {/* Banner Header */}
                <View style={{ backgroundColor: '#F0F9FF', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {isTransaction ? 'TRANSACTION ID' : 'ACCOUNT NUMBER'}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                      {isTransaction
                        ? (selectedViewRecord.transaction_id || selectedViewRecord.parsedData['Transaction ID'] || `#${selectedViewRecord.id}`)
                        : (selectedViewRecord.parsedData['1786629206891'] || selectedViewRecord.parsedData['Account No'] || `Acc #${selectedViewRecord.id}`)}
                    </Text>
                  </View>

                  {isTransaction && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL AMOUNT</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#166534', marginTop: 4 }}>
                        {(() => {
                          const rawTot = selectedViewRecord.total_amount !== null && selectedViewRecord.total_amount !== undefined
                            ? selectedViewRecord.total_amount
                            : (selectedViewRecord.amount !== null && selectedViewRecord.amount !== undefined
                                ? (parseFloat(selectedViewRecord.amount) * 1.05)
                                : (selectedViewRecord.parsedData['Total Amount (AED) (Incl. VAT)'] || selectedViewRecord.parsedData['total_amount'] || selectedViewRecord.parsedData['Amount (AED)'] || selectedViewRecord.parsedData['Amount(AED)'] || selectedViewRecord.parsedData['amount'] || 0));
                          return `AED ${(parseFloat(rawTot) || 0).toFixed(2)}`;
                        })()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Grid Details */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Reported Information
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                  {isTransaction ? (
                    <>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Plate Number</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>{selectedViewRecord.plate || selectedViewRecord.parsedData['Plate'] || 'N/A'}</Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Tag Number</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>{selectedViewRecord.tag_number || selectedViewRecord.parsedData['Tag Number'] || 'N/A'}</Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Vehicle Name</Text>
                        <Text style={{ fontSize: 13, color: selectedViewRecord.vehicle_name ? '#0369A1' : '#94A3B8', fontWeight: '700', marginTop: 2 }}>
                          {selectedViewRecord.vehicle_name ? `🚗 ${selectedViewRecord.vehicle_name}` : 'Unassigned'}
                        </Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Toll Gateway / Name</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>{selectedViewRecord.toll_name || selectedViewRecord.parsedData['Toll Name'] || 'Salik / Darb'}</Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Toll Gate</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>{selectedViewRecord.toll_gate || selectedViewRecord.parsedData['Toll Gate'] || 'N/A'}</Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Direction</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>{selectedViewRecord.direction || selectedViewRecord.parsedData['Direction'] || 'N/A'}</Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Trip Date & Time</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>
                          {`${selectedViewRecord.trip_date || ''} ${selectedViewRecord.trip_time || ''}`.trim() || 'N/A'}
                        </Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Linked Toll Overview ID</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>
                          {selectedViewRecord.toll_overview_id ? `#${selectedViewRecord.toll_overview_id}` : 'Unlinked'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Account No</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>
                          {selectedViewRecord.parsedData['1786629206891'] || selectedViewRecord.parsedData['Account No'] || 'N/A'}
                        </Text>
                      </View>
                      <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Toll Name</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '700', marginTop: 2 }}>
                          {selectedViewRecord.parsedData['1786629185586'] || selectedViewRecord.parsedData['Toll Name'] || 'N/A'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Raw JSON / Excel Key-Values */}
                {selectedViewRecord.parsedData && Object.keys(selectedViewRecord.parsedData).length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Full Excel Raw Attributes
                    </Text>
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
                      {Object.entries(selectedViewRecord.parsedData).map(([k, v], idx) => {
                        const labelKey = k === '1786629185586' ? 'Toll Name' : (k === '1786629206891' ? 'Account No' : k);
                        return (
                          <View key={k} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: idx === Object.keys(selectedViewRecord.parsedData).length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: '#64748B' }}>{labelKey}</Text>
                            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{String(v !== null && v !== undefined ? v : '-')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'flex-end' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => setViewDetailModalVisible(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Close Details</Text>
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
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  fieldContainerFull: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  subsectionsContainer: {
    marginTop: 12,
    gap: 16,
    width: '100%',
  },
  subsectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  subsectionBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
