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
  const canView = !user || String(user.roleId) === '1' || (permissions && (permissions.can_view || permissions.full_control));
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
      let url = `${API_URL}/api/audit-history?module=VEHICLE_MAINTENANCE&limit=100`;
      if (recordId) {
        url += `&record_id=${recordId}`;
      } else if (user && String(user.roleId) !== '1' && user.clientid) {
        url += `&clientid=${user.clientid}`;
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
      console.error('Error fetching maintenance audit logs:', err);
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
  const [allVehicles, setAllVehicles] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes, vehiclesRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/vehicle-maintenance${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`),
        fetch(`${API_URL}/api/vehicle-details${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
      ]);
      const [clientsData, countriesData, modulesData, recordsData, vehiclesData] = await Promise.all([
        clientsRes.ok ? clientsRes.json() : [],
        countriesRes.ok ? countriesRes.json() : [],
        modulesRes.ok ? modulesRes.json() : [],
        recordsRes.ok ? recordsRes.json() : [],
        vehiclesRes && vehiclesRes.ok ? vehiclesRes.json() : []
      ]);
      setClients(clientsData || []);
      setCountries(countriesData || []);
      setModules(modulesData || []);
      setMaintenanceRecords(Array.isArray(recordsData) ? recordsData : []);
      setAllVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

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
        let data = await res.json();
        let compList = data || [];
        if (Array.isArray(compList) && user && String(user.roleId) !== '1') {
          if (Array.isArray(user.associatedCompanyIds) && user.associatedCompanyIds.length > 0) {
            const allowedIds = user.associatedCompanyIds.map(String);
            compList = compList.filter(comp => allowedIds.includes(String(comp.id)));
          }
          try {
            const resPerm = await fetch(`${API_URL}/api/roles/${user.roleId}/permissions`);
            if (resPerm.ok) {
              const permData = await resPerm.json();
              const targetModuleIds = ['74', '55']; // Supports Local (74) and Live Server (55)
              
              if (Array.isArray(permData.companyPermissions) && permData.companyPermissions.length > 0) {
                const allowedCompIds = permData.companyPermissions
                  .filter(cp => targetModuleIds.includes(String(cp.module_id)) && (action === 'create' ? cp.can_create : (cp.can_view || cp.can_create || cp.full_control)))
                  .map(cp => String(cp.company_id));

                if (allowedCompIds.length > 0) {
                  compList = compList.filter(comp => allowedCompIds.includes(String(comp.id)));
                } else {
                  const hasEntry = permData.companyPermissions.some(cp => targetModuleIds.includes(String(cp.module_id)));
                  if (hasEntry) {
                    compList = [];
                  }
                }
              }
            }
          } catch (pErr) {
            console.warn('Could not fetch role permissions in VehicleMaintenanceTab:', pErr);
          }
        }
        setCompanies(compList);
        if (compList.length > 0) {
          setSelectedCompany(prev => {
            const isValid = compList.some(c => String(c.id) === String(prev));
            return isValid ? prev : String(compList[0].id);
          });
        } else {
          setSelectedCompany('');
        }
        return compList;
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
    if (currentCompanies.length > 0) {
      setSelectedCompany(prev => {
        const isValid = currentCompanies.some(c => String(c.id) === String(prev));
        if (!isValid) {
          const firstComp = currentCompanies[0];
          if (firstComp.country) setSelectedCountry(String(firstComp.country));
          return String(firstComp.id);
        }
        return prev;
      });
    }
    setIsFormOpen(true);
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const fetchFormConfiguration = async (clientId, countryId, moduleId, targetCompanyId) => {
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

      let parsedSections = [];
      if (matchingFieldDef) {
        setCustomFieldId(matchingFieldDef.id);
        setConfigParams({
          clientid: matchingFieldDef.clientid || matchingFieldDef.client_id || clientId,
          country_id: matchingFieldDef.countryid || matchingFieldDef.country_id || countryId,
          moduleid: matchingFieldDef.moduleid || matchingFieldDef.module_id || moduleId
        });
        parsedSections = typeof matchingFieldDef.field_data === 'string'
          ? JSON.parse(matchingFieldDef.field_data)
          : matchingFieldDef.field_data;
      } else {
        // Fallback default form layout if no custom fields are defined
        parsedSections = [
          {
            id: 'sec_maintenance',
            section_name: 'Vehicle Maintenance Details',
            fields: [
              { id: 'vehicle_id', name: 'Select Vehicle', type: 'Searchable Dropdown', optionSource: 'dynamic', dynamicPath: '/api/vehicle-details/client/:clientId' },
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
        ];
        setCustomFieldId(null);
      }

      // Filter sections & fields by permittedFields if permissions are configured
      if (permittedFields && Object.keys(permittedFields).length > 0) {
        parsedSections = (parsedSections || []).map(sec => ({
          ...sec,
          fields: (sec.fields || []).filter(f => permittedFields[f.id] !== false && permittedFields[f.name] !== false)
        })).filter(sec => sec.fields && sec.fields.length > 0);
      }

      const activeClientId = clientId || user?.client_id || user?.clientid || '1';
      const activeCompanyId = (targetCompanyId !== undefined && targetCompanyId !== null && targetCompanyId !== '')
        ? String(targetCompanyId).split(',')[0].trim()
        : (selectedCompany ? String(selectedCompany).split(',')[0].trim() : '');

      // Fetch dynamic options for dropdowns if needed
      for (const sec of (parsedSections || [])) {
        for (const field of (sec.fields || [])) {
          const isDropdownType = field.type === 'Dropdown' || field.type === 'Searchable Dropdown' || field.type === 'MultiSelect Dropdown' || field.type === 'Multiselect' || field.type === 'Radio Button' || field.type === 'Checkbox';
          const isDynamic = field.optionSource === 'dynamic' || field.optionSource === 'dynamicLink' || field.optionSource === 'dynamic_link' || !!field.dynamicPath || !!field.dynamicLink || !!field.apiPath;
          const dynamicUrl = field.dynamicPath || field.dynamicLink || field.apiPath;

          if (isDropdownType && isDynamic && dynamicUrl) {
            let path = dynamicUrl;
            if (path.includes('client-vehicles')) {
              path = path.replace('client-vehicles', `client/${activeClientId}`);
            } else if (path.includes(':clientId') || path.includes(':clientid')) {
              path = path.replace(':clientId', activeClientId).replace(':clientid', activeClientId);
            } else if (path.includes('client')) {
              if (path.endsWith('/client') || path.endsWith('/client/')) {
                path = `${path.replace(/\/$/, '')}/${activeClientId}`;
              }
            }

            if (path.includes(':companyId') || path.includes(':companyid')) {
              path = path.replace(':companyId', activeCompanyId).replace(':companyid', activeCompanyId);
            } else if (activeCompanyId && !path.includes('companyId=')) {
              const separator = path.includes('?') ? '&' : '?';
              path = `${path}${separator}companyId=${activeCompanyId}`;
            }

            try {
              const res = await fetch(`${API_URL}${path.startsWith('/') ? path : '/' + path}`);
              if (res.ok) {
                const data = await res.json();
                field.dynamicOptionsList = data;
              }
            } catch (e) {
              console.warn('Failed to fetch dynamic options for', field.id, e);
            }
          }
        }
      }

      setFieldsLayout(JSON.parse(JSON.stringify(parsedSections || [])));
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error loading form configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'Dropdown':
      case 'MultiSelect Dropdown':
      case 'Multiselect':
      case 'Searchable Dropdown': {
        const fNameLower = (field.name || field.label || '').toLowerCase();
        const isMulti = !!(field.isMultiSelect || field.is_multi_select || field.type === 'MultiSelect Dropdown' || field.type === 'Multiselect' || fNameLower.includes('service detail') || fNameLower.includes('service details') || fNameLower.includes('service type'));

        let optionsList = [];
        const isDynamicField = field.optionSource === 'dynamic' || field.optionSource === 'dynamicLink' || field.optionSource === 'dynamic_link' || !!field.dynamicPath || !!field.dynamicLink || !!field.apiPath;

        if (isDynamicField && field.dynamicOptionsList) {
          optionsList = field.dynamicOptionsList.map(opt => {
            if (typeof opt === 'string') {
              let labelStr = opt;
              let valueStr = opt;
              if (labelStr.includes(' - ')) {
                const parts = labelStr.split(' - ');
                labelStr = `${parts[0].trim()} - ${parts[1].trim()}`;
              }
              return { label: labelStr, value: valueStr, rawId: valueStr };
            }
            let label = opt.vehicle_display_name || opt.Vehiclename || opt.vehiclename || opt.Plateno || opt.plateno || opt.plate_number || opt.plate_no || opt.service_name || opt.service_details || opt.service_detail || opt.vehicle_name || opt.name || opt.label || opt.company_name || opt.id;
            let value = String(opt.id || opt.vehicle_id || opt.value || label);
            const rawId = String(opt.id || opt.vehicle_id || opt.value || '');

            const isServiceField = fNameLower.includes('service detail') || fNameLower.includes('service details') || fNameLower.includes('service type') || fNameLower.includes('service');
            if (isServiceField) {
              value = String(opt.service_name || opt.service_details || opt.service_detail || opt.name || opt.label || opt.id || label);
            }

            // Combined format: Vehicle Name - Plate No
            const vName = opt.vehicle_name || (String(label).includes(' - ') ? String(label).split(' - ')[0].trim() : null);
            const pNo = opt.plate_no || opt.plateno || opt.plate_number || (String(label).includes(' - ') ? String(label).split(' - ')[1].trim() : null);

            if (vName && pNo && vName !== pNo) {
              label = `${vName} - ${pNo}`;
            }

            return { label: String(label), value: String(value), rawId: String(rawId) };
          });
        } else if (field.options) {
          const rawOpts = typeof field.options === 'string' ? field.options.split(',').map(s => s.trim()) : field.options;
          optionsList = rawOpts.map(opt => {
            let label = typeof opt === 'object' ? (opt.label !== undefined ? opt.label : opt.value) : String(opt);
            let value = typeof opt === 'object' ? (opt.value !== undefined ? opt.value : opt.label) : String(opt);
            if (String(label).includes(' - ')) {
              const parts = String(label).split(' - ');
              label = `${parts[0].trim()} - ${parts[1].trim()}`;
            }
            return { label: String(label), value: String(value), rawId: String(value) };
          });
        }

        const isVehicleField = fNameLower.includes('vehicle') || field.id === 'vehicle_id';

        // Fallback to allVehicles if dynamicOptionsList returned empty for vehicle dropdown
        if (isVehicleField && optionsList.length === 0 && allVehicles.length > 0) {
          optionsList = allVehicles.map(v => {
            const vName = v.vehicle_name || v.Vehiclename || '';
            const pNo = v.plate_no || v.Plateno || '';
            const label = (vName && pNo && vName !== pNo) ? `${vName} - ${pNo}` : (vName || pNo || `Vehicle #${v.id}`);
            return {
              label: String(label),
              value: String(v.id || v.vehicle_id),
              rawId: String(v.id || v.vehicle_id)
            };
          });
        }

        // Guarantee that the currently selected or edited vehicle is always available with its label
        if (isVehicleField) {
          const currentVehicleId = String(
            formData[field.id] ||
            formData.vehicle_id ||
            formData.vehicleId ||
            (editingRecord ? (editingRecord.vehicle_id || '') : '')
          ).trim();
          if (currentVehicleId && currentVehicleId !== 'null' && currentVehicleId !== 'undefined') {
            const exists = optionsList.some(opt => String(opt.value) === currentVehicleId || String(opt.rawId) === currentVehicleId);
            if (!exists) {
              const matchedFromAll = allVehicles.find(v => String(v.id) === currentVehicleId || String(v.vehicle_id) === currentVehicleId);
              let vName = matchedFromAll ? (matchedFromAll.vehicle_name || matchedFromAll.Vehiclename) : (editingRecord?.vehicle_name);
              let pNo = matchedFromAll ? (matchedFromAll.plate_no || matchedFromAll.Plateno) : (editingRecord?.plate_no);

              let vLabel = '';
              if (vName && vName !== 'N/A') {
                vLabel = (pNo && pNo !== 'N/A' && pNo !== vName) ? `${vName} - ${pNo}` : vName;
              } else if (editingRecord && editingRecord.vehicle_name && editingRecord.vehicle_name !== 'N/A') {
                vLabel = (editingRecord.plate_no && editingRecord.plate_no !== 'N/A' && editingRecord.plate_no !== editingRecord.vehicle_name)
                  ? `${editingRecord.vehicle_name} - ${editingRecord.plate_no}`
                  : editingRecord.vehicle_name;
              } else {
                vLabel = `Vehicle #${currentVehicleId}`;
              }

              if (vLabel) {
                optionsList.unshift({
                  label: String(vLabel),
                  value: currentVehicleId,
                  rawId: currentVehicleId
                });
              }
            }
          }
        }

        let currentVal = (formData[field.id] !== undefined && formData[field.id] !== null && formData[field.id] !== '')
          ? formData[field.id]
          : (isVehicleField ? (formData.vehicle_id || formData.vehicleId || editingRecord?.vehicle_id || '') : '');

        if (currentVal) {
          if (Array.isArray(currentVal)) {
            currentVal = currentVal.map(v => {
              const m = optionsList.find(o => String(o.value) === String(v) || String(o.rawId) === String(v) || String(o.label) === String(v));
              return m ? m.value : String(v);
            });
          } else if (typeof currentVal === 'string' && currentVal.includes(',')) {
            const parts = currentVal.split(',').map(p => p.trim());
            const resolvedParts = parts.map(p => {
              const m = optionsList.find(o => String(o.value) === String(p) || String(o.rawId) === String(p) || String(o.label) === String(p));
              return m ? m.value : p;
            });
            currentVal = resolvedParts.join(', ');
          } else if (typeof currentVal === 'string' || typeof currentVal === 'number') {
            const sVal = String(currentVal).trim();
            const m = optionsList.find(o => String(o.value) === sVal || String(o.rawId) === sVal || String(o.label) === sVal);
            if (m) currentVal = m.value;
          }
        }

        return (
          <SearchableDropdown
            data={optionsList}
            value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ''}
            onChange={(val) => {
              handleInputChange(field.id, val);
              if (isVehicleField) {
                handleInputChange('vehicle_id', val);
              }
            }}
            placeholder="Select..."
            searchPlaceholder={`Search ${field.name}...`}
            displayKey="label"
            valueKey="value"
            disabled={isViewOnly}
            isMultiSelect={isMulti}
          />
        );
      }
      case 'Number':
        return (
          <TextInput
            style={[styles.modalInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={formData[field.id] !== undefined && formData[field.id] !== null ? String(formData[field.id]) : ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            editable={!isViewOnly}
          />
        );
      case 'Textarea':
        return (
          <TextInput
            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor="#94A3B8"
            value={formData[field.id] || ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            multiline
            editable={!isViewOnly}
          />
        );
      case 'Date': {
        const val = formData[field.id] || new Date().toISOString().split('T')[0];
        return (
          <input
            type="date"
            style={{
              width: '100%',
              height: 40,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              paddingLeft: 12,
              fontSize: 14,
              color: '#0F172A',
              backgroundColor: isViewOnly ? '#F1F5F9' : '#FFFFFF'
            }}
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            disabled={isViewOnly}
          />
        );
      }
      case 'File Upload':
      case 'Image Upload': {
        const fileData = formData[field.id];
        const handleFileSelect = () => {
          if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = field.type === 'Image Upload' ? 'image/*' : '*/*';
            input.onchange = async (e) => {
              const files = Array.from(e.target.files);
              if (files.length === 0) return;
              const processedFiles = await Promise.all(
                files.map(file => new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result });
                }))
              );
              handleInputChange(field.id, processedFiles[0]);
            };
            input.click();
          }
        };

        const fileObj = typeof fileData === 'string' ? { name: fileData, data: fileData } : fileData;

        return (
          <View style={{ width: '100%' }}>
            {!isViewOnly && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FAFAFA',
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderStyle: 'dashed',
                  minHeight: 44,
                  gap: 8
                }}
                onPress={handleFileSelect}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#64748B" />
                <Text style={{ flex: 1, color: '#94A3B8', fontSize: 14 }}>
                  {fileObj ? fileObj.name : 'Click to upload file...'}
                </Text>
              </TouchableOpacity>
            )}
            {fileObj && isViewOnly && (
              <Text style={{ fontSize: 14, color: '#0F172A', marginTop: 4 }}>{fileObj.name}</Text>
            )}
          </View>
        );
      }
      default:
        return (
          <TextInput
            style={[styles.modalInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor="#94A3B8"
            value={formData[field.id] || ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            editable={!isViewOnly}
          />
        );
    }
  };

  const handleEdit = async (record) => {
    if (checkRowPermission ? !checkRowPermission(record.company_id || record.companyid, 'edit') : !canEdit) {
      if (showToast) showToast('You do not have permission to edit this record.', 'warning');
      return;
    }
    setIsViewOnly(false);
    setEditingRecord(record);
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    if (record.vehicle_id) {
      parsed.vehicle_id = String(record.vehicle_id);
    }
    setFormData(parsed);
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    const recCompanyId = record.company_id ? String(record.company_id) : '';
    await fetchCompaniesForClient(String(record.clientid || ''), 'edit');
    setSelectedCompany(recCompanyId);
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || ''),
      recCompanyId
    );
    if (record.vehicle_id) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: String(record.vehicle_id)
      }));
    }
    setIsFormOpen(true);
  };

  const handleView = async (record) => {
    if (checkRowPermission ? !checkRowPermission(record.company_id || record.companyid, 'view') : !canView) {
      if (showToast) showToast('You do not have permission to view this record.', 'warning');
      return;
    }
    setIsViewOnly(true);
    setEditingRecord(record);
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    if (record.vehicle_id) {
      parsed.vehicle_id = String(record.vehicle_id);
    }
    setFormData(parsed);
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    const recCompanyId = record.company_id ? String(record.company_id) : '';
    await fetchCompaniesForClient(String(record.clientid || ''), 'view');
    setSelectedCompany(recCompanyId);
    await fetchFormConfiguration(
      String(record.clientid || ''),
      String(record.country_id || ''),
      String(record.moduleid || ''),
      recCompanyId
    );
    if (record.vehicle_id) {
      setFormData(prev => ({
        ...prev,
        vehicle_id: String(record.vehicle_id)
      }));
    }
    setIsFormOpen(true);
  };

  const handleDelete = (record) => {
    if (checkRowPermission ? !checkRowPermission(record.company_id || record.companyid, 'delete') : !canDelete) {
      if (showToast) showToast('You do not have permission to delete this record.', 'warning');
      return;
    }
    setRecordToDelete(record);
    setDeleteConfirmationText('');
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText !== 'YES' || !recordToDelete) return;
    try {
      const token = user?.token;
      const headers = {
        'Content-Type': 'application/json',
        'roleid': String(user?.roleId || ''),
        'clientid': String(user?.clientid || ''),
        'companyid': String(recordToDelete.company_id || '')
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (user?.id) headers['x-user-id'] = String(user.id);
      if (user?.roleId) headers['x-role-id'] = String(user.roleId);
      if (user?.clientid) headers['x-client-id'] = String(user.clientid);
      if (user?.name || user?.username) headers['x-user-name'] = String(user.name || user.username);

      const res = await fetch(`${API_URL}/api/vehicle-maintenance/${recordToDelete.id}`, {
        method: 'DELETE',
        headers
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
      let selectedVehicleId = formData.vehicle_id || formData.vehicleId;
      if (!selectedVehicleId && fieldsLayout && Array.isArray(fieldsLayout)) {
        for (const sec of fieldsLayout) {
          for (const f of (sec.fields || [])) {
            const fName = (f.name || f.label || '').toLowerCase();
            const dPath = (f.dynamicPath || f.dynamicLink || f.apiPath || '').toLowerCase();
            if (f.id === 'vehicle_id' || fName.includes('vehicle') || dPath.includes('vehicle')) {
              if (formData[f.id]) {
                selectedVehicleId = formData[f.id];
                break;
              }
            }
          }
          if (selectedVehicleId) break;
        }
      }
      if (!selectedVehicleId && editingRecord) {
        selectedVehicleId = editingRecord.vehicle_id;
      }

      const finalFormData = { ...formData };
      if (selectedVehicleId) {
        finalFormData.vehicle_id = String(selectedVehicleId);
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (fieldsLayout && Array.isArray(fieldsLayout)) {
        for (const sec of fieldsLayout) {
          for (const f of (sec.fields || [])) {
            if (f.type === 'Date' && !finalFormData[f.id]) {
              finalFormData[f.id] = todayStr;
            }
          }
        }
      }

      const payload = {
        vehicle_id: selectedVehicleId ? String(selectedVehicleId) : null,
        custom_field_id: customFieldId || editingRecord?.custom_field_id || 37,
        field_data: finalFormData,
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

      const token = user?.token;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (user?.id) headers['x-user-id'] = String(user.id);
      if (user?.roleId) headers['x-role-id'] = String(user.roleId);
      if (user?.clientid) headers['x-client-id'] = String(user.clientid);
      if (user?.name || user?.username) headers['x-user-name'] = String(user.name || user.username);

      const res = await fetch(url, {
        method,
        headers,
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
    const vName = (rec.vehicle_name || '').toLowerCase();
    const pNo = (rec.plate_no || '').toLowerCase();
    return fdStr.includes(q) || empName.includes(q) || compName.includes(q) || vName.includes(q) || pNo.includes(q) || String(rec.id).includes(q);
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
          {canCreate && (
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
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.scrollContent}>
        {/* Search & Stats Bar */}
        <View style={[styles.searchContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }]}>
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

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#CBD5E1',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 8,
              gap: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
              cursor: 'pointer'
            }}
            onPress={() => handleOpenHistory(null)}
          >
            <Ionicons name="time-outline" size={16} color="#475569" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>History</Text>
          </TouchableOpacity>
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
                {isSuperAdmin && <Text style={[styles.thCell, { flex: 1.5 }]}>CLIENT INFO</Text>}
                <Text style={[styles.thCell, { flex: 1.5 }]}>VEHICLE NAME</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>PLATE NUMBER</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>COMPANY NAME</Text>
                <Text style={[styles.thCell, { flex: 1.5 }]}>SERVICE TYPE</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>TOTAL COST</Text>
                <Text style={[styles.thCell, { flex: 1.2 }]}>SUBMITTED BY</Text>
                <Text style={[styles.thCell, { flex: 1 }]}>STATUS</Text>
                <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>ACTIONS</Text>
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
                  const matchedVehicle = (allVehicles || []).find(v => String(v.id) === String(item.vehicle_id) || String(v.vehicle_id) === String(item.vehicle_id));
                  const vehicleName = item.vehicle_name && item.vehicle_name !== 'N/A' 
                    ? item.vehicle_name 
                    : (matchedVehicle?.vehicle_name || fd.vehicle_name || fd['Vehicle Name'] || 'N/A');
                  const plateNo = item.plate_no && item.plate_no !== 'N/A' 
                    ? item.plate_no 
                    : (matchedVehicle?.plate_no || fd.plate_no || fd['Plate Number'] || 'N/A');
                  const serviceType = fd.service_type || fd['Service Type'] || fd['1786967942496'] || 'General Service';
                  const cost = fd.total_cost || fd['Total Cost'] || fd['1786968040112'] || 'AED 0.00';

                  return (
                    <View key={item.id || idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                      {isSuperAdmin && <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.client_name || 'Krish'}</Text>}
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
                      <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                        {(checkRowPermission ? checkRowPermission(item.company_id || item.companyid, 'view') : canView) && (
                          <TouchableOpacity onPress={() => handleView(item)} style={styles.actionIconButton} title="View Details">
                            <Ionicons name="eye-outline" size={18} color="#0284C7" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleOpenHistory(item)} style={styles.actionIconButton} title="View History">
                          <Ionicons name="time-outline" size={18} color="#D97706" />
                        </TouchableOpacity>
                        {(checkRowPermission ? checkRowPermission(item.company_id || item.companyid, 'edit') : canEdit) && (
                          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionIconButton} title="Edit Record">
                            <Ionicons name="pencil-outline" size={18} color="#16A34A" />
                          </TouchableOpacity>
                        )}
                        {(checkRowPermission ? checkRowPermission(item.company_id || item.companyid, 'delete') : canDelete) && (
                          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionIconButton} title="Delete Record">
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
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

            {/* Wizard Step Indicator */}
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
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? '#1A4D3E' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? '#1A4D3E' : '#64748B' }}>{step.label}</Text>
                      </View>
                      {index < arr.length - 1 && (
                        <View style={{ flex: 1, height: 2, backgroundColor: wizardStep > step.id ? '#1A4D3E' : '#E2E8F0', marginHorizontal: 4 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {wizardStep === 1 && !editingRecord && !isViewOnly ? (
              <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24 }}>
                <View style={{ gap: 20 }}>
                  {(!user || String(user.roleId) === '1') && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        CLIENT <Text style={{ color: '#EF4444' }}>*</Text>
                      </Text>
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
                  )}

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      COMPANY <Text style={{ color: '#EF4444' }}>*</Text>
                    </Text>
                    <SearchableDropdown
                      data={companies}
                      value={selectedCompany}
                      onChange={(val) => {
                        setSelectedCompany(val);
                        const selectedIds = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (selectedIds.length > 0) {
                          const firstSelected = companies.find(c => String(c.id) === selectedIds[0]);
                          if (firstSelected && (firstSelected.country || firstSelected.country_id)) {
                            setSelectedCountry(String(firstSelected.country || firstSelected.country_id));
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

                  <View style={{ alignItems: 'flex-end', marginTop: 20 }}>
                    <TouchableOpacity
                      style={[{
                        paddingHorizontal: 28,
                        paddingVertical: 12,
                        backgroundColor: '#1A4D3E',
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }, (!selectedClient || !selectedCompany) && { opacity: 0.5 }]}
                      disabled={!selectedClient || !selectedCompany}
                      onPress={() => {
                        const countryToUse = selectedCountry || '1';
                        fetchFormConfiguration(selectedClient, countryToUse, selectedModule || '60');
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color="#1A4D3E" />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>Loading maintenance form fields...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 24, paddingBottom: 20 }}>
                  {fieldsLayout && fieldsLayout.length > 0 ? (
                    fieldsLayout.map((section, sIdx) => {
                      const rawName = String(section.section_name || section.name || 'VEHICLE MAINTENANCE DETAILS');
                      const cleanTitle = rawName.replace(/maintence/gi, 'MAINTENANCE').toUpperCase();

                      return (
                        <View key={section.id || sIdx} style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          marginBottom: 20,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 10,
                          elevation: 2,
                          zIndex: fieldsLayout.length - sIdx,
                          position: 'relative'
                        }}>
                          {/* Section Header */}
                          <View style={{
                            backgroundColor: '#F8FAFC',
                            paddingHorizontal: 20,
                            paddingVertical: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#E2E8F0',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: '#1A4D3E',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5
                            }}>
                              {cleanTitle}
                            </Text>
                          </View>

                          {/* Section Body with 2 Columns */}
                          <View style={{
                            padding: 20,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}>
                            {(section.fields || []).map((field, fIdx) => {
                              const fNameLower = (field.name || '').toLowerCase();
                              const isFullWidth = field.isFullWidth || field.type === 'Textarea' || (fNameLower.includes('invoice') && (field.type === 'File Upload' || field.type === 'Image Upload'));
                              return (
                                <View key={field.id} style={{
                                  width: isFullWidth ? '100%' : '48%',
                                  marginBottom: 20,
                                  zIndex: (section.fields || []).length - fIdx,
                                  position: 'relative'
                                }}>
                                  <Text style={styles.fieldLabel}>
                                    {field.name} {field.isRequired && <Text style={{ color: '#EF4444' }}>*</Text>}
                                  </Text>
                                  {renderField(field)}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: '#64748B' }}>No permitted maintenance fields found for this configuration.</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Modal Footer Bar */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF'
                }}>
                  {isViewOnly ? (
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: '#1A4D3E',
                        marginLeft: 'auto'
                      }}
                      onPress={() => setIsFormOpen(false)}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {wizardStep === 2 && !editingRecord ? (
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: '#E2E8F0'
                          }}
                          onPress={() => setWizardStep(1)}
                        >
                          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Back</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 8,
                            backgroundColor: '#E2E8F0'
                          }}
                          onPress={() => setIsFormOpen(false)}
                        >
                          <Text style={{ color: '#0F172A', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[{
                          paddingHorizontal: 28,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: '#1A4D3E',
                          justifyContent: 'center',
                          alignItems: 'center'
                        }, saving && { opacity: 0.7 }]}
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

      {/* ACTIVITY HISTORY / AUDIT TRAIL MODAL */}
      <Modal
        visible={historyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.historyModalOverlay}>
          <View style={styles.historyModalCard}>
            {/* Modal Header */}
            <View style={styles.historyModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.historyIconBadge}>
                  <Ionicons name="time" size={22} color="#1A4D3E" />
                </View>
                <View>
                  <Text style={styles.historyModalTitle}>
                    {historyTargetRecord
                      ? (() => {
                          const vName = historyTargetRecord.vehicle_name && historyTargetRecord.vehicle_name !== 'N/A' ? historyTargetRecord.vehicle_name : '';
                          const pNo = historyTargetRecord.plate_no && historyTargetRecord.plate_no !== 'N/A' ? historyTargetRecord.plate_no : '';
                          if (vName && pNo && vName.toLowerCase() !== pNo.toLowerCase()) {
                            return `History: ${vName} - ${pNo}`;
                          }
                          return `History: ${vName || pNo || (historyTargetRecord.vehicle_display_name && historyTargetRecord.vehicle_display_name !== 'N/A' ? historyTargetRecord.vehicle_display_name : `Maintenance #${historyTargetRecord.id}`)}`;
                        })()
                      : 'Vehicle Maintenance History'}
                  </Text>
                  <Text style={styles.historyModalSubtitle}>
                    {historyTargetRecord ? 'Audit trail specifically for this maintenance record' : 'Chronological audit trail of all maintenance creations, updates, and removals'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={styles.historyHeaderBtn}
                  onPress={() => fetchHistoryLogs(historyTargetRecord ? historyTargetRecord.id : null)}
                  disabled={historyLoading}
                  activeOpacity={0.7}
                  title="Refresh Log"
                >
                  <Ionicons name="refresh-outline" size={18} color="#475569" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.historyHeaderBtn}
                  onPress={() => setHistoryModalVisible(false)}
                  activeOpacity={0.7}
                  title="Close"
                >
                  <Ionicons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter and Search Bar inside Modal */}
            <View style={styles.historyToolbar}>
              {/* Action Filter Pills */}
              <View style={styles.historyPillGroup}>
                {['ALL', 'CREATE', 'UPDATE', 'DELETE'].map((act) => {
                  const isActive = historyFilterAction === act;
                  return (
                    <TouchableOpacity
                      key={act}
                      style={[styles.historyPill, isActive && styles.historyPillActive]}
                      onPress={() => setHistoryFilterAction(act)}
                    >
                      <Text style={[styles.historyPillText, isActive && styles.historyPillTextActive]}>
                        {act === 'ALL' ? 'All Activities' : act === 'CREATE' ? 'Created' : act === 'UPDATE' ? 'Updated' : 'Deleted'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Search Box */}
              <View style={styles.historySearchBox}>
                <Ionicons name="search-outline" size={15} color="#94A3B8" />
                <TextInput
                  style={styles.historySearchInput}
                  placeholder="Filter by vehicle or user..."
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
                  <ActivityIndicator size="large" color="#1A4D3E" />
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
                    <View style={styles.historyEmptyState}>
                      <Ionicons name="time-outline" size={48} color="#CBD5E1" />
                      <Text style={styles.historyEmptyTitle}>No Activity Logs Found</Text>
                      <Text style={styles.historyEmptyText}>
                        {historySearchQuery || historyFilterAction !== 'ALL'
                          ? 'No records match your filter criteria.'
                          : 'Any changes, updates, or maintenance records will appear here automatically.'}
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={styles.timelineContainer}>
                    {filtered.map((item, idx) => {
                      const isLast = idx === filtered.length - 1;
                      const act = String(item.action_type || 'UPDATE').toUpperCase();
                      const isCreate = act === 'CREATE';
                      const isDelete = act === 'DELETE';

                      const badgeBg = isCreate ? '#DCFCE7' : isDelete ? '#FEE2E2' : '#E0F2FE';
                      const badgeColor = isCreate ? '#15803D' : isDelete ? '#B91C1C' : '#0369A1';
                      const dotBg = isCreate ? '#22C55E' : isDelete ? '#EF4444' : '#3B82F6';

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
                        <View key={item.id || idx} style={styles.timelineItem}>
                          {/* Left Line & Dot */}
                          <View style={styles.timelineLeftColumn}>
                            <View style={[styles.timelineDot, { backgroundColor: dotBg }]}>
                              <Ionicons
                                name={isCreate ? 'add' : isDelete ? 'trash' : 'pencil'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            {!isLast && <View style={styles.timelineVerticalLine} />}
                          </View>

                          {/* Right Content Card */}
                          <View style={styles.timelineContentCard}>
                            {/* Card Top Row */}
                            <View style={styles.timelineCardTopRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <View style={[styles.actionBadge, { backgroundColor: badgeBg }]}>
                                  <Text style={[styles.actionBadgeText, { color: badgeColor }]}>{act}</Text>
                                </View>
                                <Text style={styles.timelineRecordTitle} numberOfLines={1}>
                                  {(() => {
                                    if (item.record_title && item.record_title.includes(' - ')) {
                                      return item.record_title;
                                    }
                                    if (historyTargetRecord) {
                                      const vName = historyTargetRecord.vehicle_name && historyTargetRecord.vehicle_name !== 'N/A' ? historyTargetRecord.vehicle_name : '';
                                      const pNo = historyTargetRecord.plate_no && historyTargetRecord.plate_no !== 'N/A' ? historyTargetRecord.plate_no : '';
                                      if (vName && pNo && vName.toLowerCase() !== pNo.toLowerCase()) {
                                        return `${vName} - ${pNo}`;
                                      }
                                      if (historyTargetRecord.vehicle_display_name && historyTargetRecord.vehicle_display_name !== 'N/A') {
                                        return historyTargetRecord.vehicle_display_name;
                                      }
                                    }
                                    return item.record_title || `Maintenance #${item.record_id}`;
                                  })()}
                                </Text>
                              </View>
                              <Text style={styles.timelineDateText}>{formatTime(item.created_at)}</Text>
                            </View>

                            {/* User Attribution Row */}
                            <View style={styles.timelineUserRow}>
                              <View style={styles.timelineUserAvatar}>
                                <Text style={styles.timelineUserAvatarText}>{initials}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.timelineUserName}>{item.user_name || 'System'}</Text>
                                  {item.user_role && (
                                    <Text style={styles.timelineUserRole}>• {item.user_role}</Text>
                                  )}
                                </View>
                                {item.user_email && (
                                  <Text style={styles.timelineUserEmail}>{item.user_email}</Text>
                                )}
                              </View>
                            </View>

                            {/* Summary Text */}
                            <Text style={styles.timelineSummaryText}>
                              {(() => {
                                let summary = item.action_summary || `${act} operation on maintenance record`;
                                if (historyTargetRecord && !summary.includes(' - ')) {
                                  const vName = historyTargetRecord.vehicle_name && historyTargetRecord.vehicle_name !== 'N/A' ? historyTargetRecord.vehicle_name : '';
                                  const pNo = historyTargetRecord.plate_no && historyTargetRecord.plate_no !== 'N/A' ? historyTargetRecord.plate_no : '';
                                  if (vName && pNo && vName.toLowerCase() !== pNo.toLowerCase()) {
                                    const fullTitle = `${vName} - ${pNo}`;
                                    if (pNo && summary.endsWith(`for ${pNo}`)) {
                                      summary = summary.replace(`for ${pNo}`, `for ${fullTitle}`);
                                    } else if (pNo && summary.endsWith(`: ${pNo}`)) {
                                      summary = summary.replace(`: ${pNo}`, `: ${fullTitle}`);
                                    }
                                  }
                                }
                                return summary;
                              })()}
                            </Text>

                            {/* Changed Fields Diff Table */}
                            {diffs.length > 0 && (
                              <View style={styles.diffTableContainer}>
                                <View style={styles.diffTableHeader}>
                                  <Text style={[styles.diffHeaderCol, { flex: 1.5 }]}>FIELD</Text>
                                  <Text style={[styles.diffHeaderCol, { flex: 2 }]}>PREVIOUS VALUE</Text>
                                  <Text style={[styles.diffHeaderCol, { flex: 2 }]}>NEW VALUE</Text>
                                </View>
                                {diffs.map((d, dIdx) => {
                                  const getDiffLabel = (f) => {
                                    if (f === '1786967942496' || f === 'service_type') return 'Service Type';
                                    if (f === '1786968040112' || f === 'total_cost') return 'Total Cost';
                                    if (f === 'vehicle_id') return 'Vehicle';
                                    if (/^\d+$/.test(f)) return `Field #${f.slice(-4)}`;
                                    return f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                                  };
                                  return (
                                    <View key={dIdx} style={styles.diffTableRow}>
                                      <Text style={[styles.diffFieldCol, { flex: 1.5 }]} numberOfLines={1}>
                                        {getDiffLabel(d.field)}
                                      </Text>
                                      <View style={[styles.diffValBox, { flex: 2, backgroundColor: '#FEF2F2' }]}>
                                        <Text style={styles.diffOldValText} numberOfLines={2}>
                                          {d.old_value !== null && d.old_value !== undefined ? String(typeof d.old_value === 'object' ? JSON.stringify(d.old_value) : d.old_value) : '(empty)'}
                                        </Text>
                                      </View>
                                      <View style={[styles.diffValBox, { flex: 2, backgroundColor: '#F0FDF4' }]}>
                                        <Text style={styles.diffNewValText} numberOfLines={2}>
                                          {d.new_value !== null && d.new_value !== undefined ? String(typeof d.new_value === 'object' ? JSON.stringify(d.new_value) : d.new_value) : '(cleared)'}
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
            <View style={styles.historyModalFooter}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                Showing {historyLogs.length} audit trail event{historyLogs.length === 1 ? '' : 's'}
              </Text>
              <TouchableOpacity
                style={styles.historyCloseFooterBtn}
                onPress={() => setHistoryModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Close</Text>
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
    maxWidth: 1000,
    maxHeight: '90%',
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
  // History Modal Styles
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
    borderBottomColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  historyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 77, 62, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A4D3E',
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
    backgroundColor: '#1A4D3E',
    borderColor: '#1A4D3E',
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
    backgroundColor: '#1A4D3E',
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
    borderTopColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
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
