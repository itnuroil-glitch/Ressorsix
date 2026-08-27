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

export default function VehicleInsuranceTab({ user, showToast, isSidebarCollapsed, permissions, checkRowPermission }) {
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
  const [insuranceRecords, setInsuranceRecords] = useState([]);

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
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/vehicle-insurance${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
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
      setInsuranceRecords(Array.isArray(recordsData) ? recordsData : []);

      // Try to set defaults if available
      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));
      const viModule = (modulesData || []).find(m => m.module_name && m.module_name.toLowerCase().includes('vehicle insurance'));
      if (viModule) setSelectedModule(String(viModule.id));
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
      let action = overrideAction;
      if (!action) {
        action = isFormOpen ? (isViewOnly ? 'view' : (editingRecord ? 'edit' : 'create')) : 'view';
      }
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const actionQuery = `&module_id=vehicle_insurance&action=${action}`;
      const res = await fetch(`${API_URL}/api/companies/client/${clientId}${emailParam}${actionQuery}`);
      if (res.ok) {
        const data = await res.json();
        const compList = data || [];
        setCompanies(compList);
        if (compList.length > 0) {
          setSelectedCompany(prev => {
            const isValid = compList.some(c => String(c.id) === String(prev));
            return isValid ? prev : String(compList[0].id);
          });
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

  const fetchFormConfiguration = async (clientId, countryId, moduleId) => {
    setLoading(true);
    setWizardStep(2);
    try {
      // 3. Fetch custom fields for this configuration
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

      // 4. Fetch permissions
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
        // If no explicit permission is configured, hide the form layout
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

        // 5. Fetch dropdown option values from tbl_customfieldsvalues
        let fieldValuesMap = {};
        try {
          const fvRes = await fetch(`${API_URL}/api/custom-fields/${matchingFieldDef.id}/field-values`);
          if (fvRes.ok) {
            fieldValuesMap = await fvRes.json();
          }
        } catch (e) {
          console.warn('Could not fetch field values', e);
        }

        const fetchDynamicOptions = async (path, fieldName = '') => {
          if (!path) return [];
          try {
            let processedPath = (path || '').trim();

            const activeCompanyId = selectedCompany
              ? String(selectedCompany).split(',')[0].trim()
              : '';

            // Replace :clientId placeholder if present, or append clientId
            if (processedPath.includes(':clientId')) {
              processedPath = processedPath.replace(':clientId', clientId || '');
            } else if (processedPath.includes('client') && clientId) {
              if (processedPath.endsWith('/client') || processedPath.endsWith('/client/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${clientId}`;
              }
            }

            // Replace :companyId placeholder if present, or append companyId
            if (processedPath.includes(':companyId')) {
              processedPath = processedPath.replace(':companyId', activeCompanyId || '');
            } else if (processedPath.includes('/company') && activeCompanyId) {
              if (processedPath.endsWith('/company') || processedPath.endsWith('/company/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${activeCompanyId}`;
              }
            } else if (activeCompanyId && !processedPath.includes('companyId=')) {
              const separator = processedPath.includes('?') ? '&' : '?';
              processedPath = `${processedPath}${separator}companyId=${activeCompanyId}`;
            }

            // Automatically append countryId if the path is designed for country lookup
            if (processedPath.includes('country') && countryId) {
              if (processedPath.endsWith('/country') || processedPath.endsWith('/country/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${countryId}`;
              }
            }

            // Normalize leading slash if it doesn't start with '/' and is not a full URL
            if (processedPath && !processedPath.startsWith('/') && !processedPath.startsWith('http')) {
              processedPath = '/' + processedPath;
            }

            // Automatically append email if user is logged in
            if (user?.email) {
              const separator = processedPath.includes('?') ? '&' : '?';
              processedPath = `${processedPath}${separator}email=${encodeURIComponent(user.email)}`;
            }

            const url = processedPath.startsWith('http') ? processedPath : `${API_URL}${processedPath}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];

            const fNameLower = (fieldName || '').toLowerCase();

            return data.map(item => {
              if (typeof item === 'string') {
                let val = item.trim();
                if (fNameLower.includes('plate') && val.includes(' - ')) {
                  val = val.split(' - ')[1].trim();
                } else if (fNameLower.includes('vehicle') && fNameLower.includes('name') && val.includes(' - ')) {
                  val = val.split(' - ')[0].trim();
                }
                return { label: val, value: val };
              }

              if (item && typeof item === 'object') {
                // If field is Plate No / Plate Number
                if (fNameLower.includes('plate')) {
                  if (item.plate_no && String(item.plate_no).trim() && !/^\d{4}-\d{2}-\d{2}/.test(String(item.plate_no))) {
                    const p = String(item.plate_no).trim();
                    return { label: p, value: p };
                  }
                  if (item.vehicle_display_name && item.vehicle_display_name.includes(' - ')) {
                    const p = item.vehicle_display_name.split(' - ')[1].trim();
                    return { label: p, value: p };
                  }
                }

                // If field is Vehicle Name
                if (fNameLower.includes('vehicle') && fNameLower.includes('name')) {
                  if (item.vehicle_name && String(item.vehicle_name).trim()) {
                    const n = String(item.vehicle_name).trim();
                    return { label: n, value: n };
                  }
                  if (item.vehicle_display_name && item.vehicle_display_name.includes(' - ')) {
                    const n = item.vehicle_display_name.split(' - ')[0].trim();
                    return { label: n, value: n };
                  }
                }

                if (item.vehicle_display_name) {
                  let disp = String(item.vehicle_display_name);
                  if (fNameLower.includes('plate') && disp.includes(' - ')) {
                    disp = disp.split(' - ')[1].trim();
                  }
                  return { label: disp, value: disp };
                }

                const nameKey = Object.keys(item).find(key =>
                  key.toLowerCase().includes('name') ||
                  key.toLowerCase().includes('label') ||
                  key.toLowerCase() === 'title' ||
                  key.toLowerCase().includes('plate') ||
                  key.toLowerCase().includes('chassis') ||
                  key.toLowerCase().includes('chasis') ||
                  key.toLowerCase().includes('policy') ||
                  key.toLowerCase().includes('department')
                );
                const idVal = item.id !== undefined ? item.id : (item.Id !== undefined ? item.Id : item.vehicle_id);
                if (nameKey) {
                  let val = String(item[nameKey]);
                  if (fNameLower.includes('plate') && val.includes(' - ')) {
                    val = val.split(' - ')[1].trim();
                  }
                  return { label: val, value: val };
                }
                const firstKey = Object.keys(item)[0];
                if (firstKey) {
                  let val = String(item[firstKey]);
                  if (fNameLower.includes('plate') && val.includes(' - ')) {
                    val = val.split(' - ')[1].trim();
                  }
                  return { label: val, value: val };
                }
                return null;
              }
              return { label: String(item), value: String(item) };
            }).filter(Boolean);
          } catch (e) {
            console.warn(`Error fetching dynamic options from ${path}:`, e);
            return [];
          }
        };

        const processField = async (f) => {
          let updatedField = { ...f };
          const fieldNameLower = (f.name || f.label || '').toLowerCase();

          if (['Dropdown', 'Searchable Dropdown', 'Radio Button', 'Checkbox'].includes(f.type)) {
            if (f.optionSource === 'dynamic' && f.dynamicPath) {
              const dynOptions = await fetchDynamicOptions(f.dynamicPath, f.name || f.label || '');
              updatedField.allowedOptions = dynOptions;
              // Auto-select if there is only 1 option and field is 'Company'
              if (f.name && f.name.toLowerCase().includes('company') && dynOptions.length === 1) {
                setFormData(prev => ({ ...prev, [f.id]: dynOptions[0] }));
              }
            } else {
              const dbOptions = fieldValuesMap[f.id];
              const fallback = f.optionsArr && f.optionsArr.length > 0
                ? f.optionsArr
                : (f.options || '').split(',').map(o => o.trim()).filter(Boolean);
              let rawOptions = (dbOptions && dbOptions.length > 0) ? dbOptions : fallback;
              if (fieldNameLower.includes('plate')) {
                rawOptions = rawOptions.map(opt => {
                  const optStr = typeof opt === 'object' ? (opt.label || opt.value || '') : String(opt);
                  if (optStr.includes(' - ')) {
                    const p = optStr.split(' - ')[1].trim();
                    return typeof opt === 'object' ? { label: p, value: p } : p;
                  }
                  return opt;
                });
              }
              updatedField.allowedOptions = rawOptions;
            }

            // Auto-fetch Account Numbers for any "Acc No" dropdown when options are empty
            if ((!updatedField.allowedOptions || updatedField.allowedOptions.length === 0) &&
                (fieldNameLower.includes('acc no') || fieldNameLower.includes('account no') || fieldNameLower.includes('acc_no'))) {
              const accOptions = await fetchDynamicOptions('/api/vehicle-tolls/account-numbers', f.name || f.label || '');
              if (accOptions && accOptions.length > 0) {
                updatedField.allowedOptions = accOptions;
              }
            }
            
            // Auto-select if there is only 1 option and field is 'Company'
            if (f.name && f.name.toLowerCase().includes('company') && updatedField.allowedOptions.length === 1) {
              setFormData(prev => ({ ...prev, [f.id]: updatedField.allowedOptions[0] }));
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

        // Filter sections based on permissions and process fields
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

        // Pre-populate "Company" field if found in layout
        if (selectedCompany && !editingRecord) {
          const selectedIds = String(selectedCompany).split(',').map(s => s.trim()).filter(Boolean);
          if (selectedIds.length > 0) {
            const firstSelectedComp = companies.find(c => String(c.id) === selectedIds[0]);
            if (firstSelectedComp) {
              const compName = firstSelectedComp.company_name || firstSelectedComp.name;
              if (compName) {
                // Look for Company field in layout
                for (const section of filteredSections) {
                  for (const field of section.fields) {
                    if (field.name && field.name.toLowerCase() === 'company') {
                      setFormData(prev => ({
                        ...prev,
                        [field.id]: compName
                      }));
                    }
                  }
                }
              }
            }
          }
        }

        setFieldsLayout(filteredSections);
      } else {
        setFieldsLayout([]);
        setCustomFieldId(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading form configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (record) => {
    setIsViewOnly(false);
    setEditingRecord(record);
    // Pre-populate form data from the record
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    // Set wizard selectors to match the record
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''), 'edit');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    // Load the form configuration then open the modal
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
    // Pre-populate form data from the record
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    // Set wizard selectors to match the record
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''), 'view');
    setSelectedCompany(record.company_id ? String(record.company_id) : '');
    // Load the form configuration then open the modal
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
    if (deleteConfirmationText !== 'YES' || !recordToDelete) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/vehicle-insurance/${recordToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'roleid': String(user?.roleId || ''),
          'clientid': String(user?.clientid || ''),
          'companyid': String(recordToDelete.company_id || '')
        }
      });

      if (!res.ok) throw new Error('Failed to delete insurance record');

      showToast('Insurance record deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData(); // Refresh the list
    } catch (error) {
      console.error(error);
      showToast('Error deleting insurance record', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalFormData = { ...formData };

      const setDefaults = (fields) => {
        fields.forEach(f => {
          if (f.type === 'Date' && !finalFormData[f.id]) {
            finalFormData[f.id] = new Date().toISOString().split('T')[0];
          } else if (f.type === 'DateTime' && !finalFormData[f.id]) {
            const d = new Date();
            const date = d.toISOString().split('T')[0];
            const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            finalFormData[f.id] = `${date}T${time}`;
          } else if (f.type === 'Time' && !finalFormData[f.id]) {
            const d = new Date();
            finalFormData[f.id] = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
          if (f.subsections && f.subsections.length > 0) {
            f.subsections.forEach(sub => {
              if (sub.fields) setDefaults(sub.fields);
            });
          }
        });
      };

      if (fieldsLayout) {
        fieldsLayout.forEach(section => {
          if (section.fields) setDefaults(section.fields);
        });
      }

      const payload = {
        vehicle_id: editingRecord ? (editingRecord.vehicle_id || null) : null,
        custom_field_id: customFieldId,
        field_data: finalFormData,
        clientid: configParams.clientid,
        country_id: configParams.country_id,
        moduleid: configParams.moduleid,
        company_id: selectedCompany || null,
        roleid: user ? user.roleId : null,
        user_id: user ? user.id : null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}/api/vehicle-insurance/${editingRecord.id}`
        : `${API_URL}/api/vehicle-insurance`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'save'} insurance`);

      showToast(isEditing ? 'Insurance record updated successfully!' : 'Form submitted successfully!', 'success');
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast('Error saving insurance details', 'error');
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
        const fNameLower = (field.name || field.label || '').toLowerCase();
        const options = (field.allowedOptions && field.allowedOptions.length > 0)
          ? field.allowedOptions
          : (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
        const dropdownData = options.map(opt => {
          let label = typeof opt === 'object' ? (opt.label !== undefined ? opt.label : opt.value) : String(opt);
          let value = typeof opt === 'object' ? (opt.value !== undefined ? opt.value : opt.label) : String(opt);
          if (fNameLower.includes('plate') && String(label).includes(' - ')) {
            label = String(label).split(' - ')[1].trim();
            value = String(value).includes(' - ') ? String(value).split(' - ')[1].trim() : label;
          } else if (fNameLower.includes('vehicle') && fNameLower.includes('name') && String(label).includes(' - ')) {
            label = String(label).split(' - ')[0].trim();
            value = String(value).includes(' - ') ? String(value).split(' - ')[0].trim() : label;
          }
          return { label, value };
        });

        let currentValue = formData[field.id] || '';
        if (fNameLower.includes('plate') && String(currentValue).includes(' - ')) {
          currentValue = String(currentValue).split(' - ')[1].trim();
        } else if (fNameLower.includes('vehicle') && fNameLower.includes('name') && String(currentValue).includes(' - ')) {
          currentValue = String(currentValue).split(' - ')[0].trim();
        }

        return (
          <SearchableDropdown
            data={dropdownData}
            value={currentValue}
            onChange={(val) => handleInputChange(field.id, val)}
            placeholder={`-- Select ${field.name} --`}
            searchPlaceholder={`Search ${field.name}...`}
            displayKey="label"
            valueKey="value"
            disabled={isViewOnly}
          />
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
      case 'Textarea':
        return (
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }]}
            placeholder={`Enter ${field.name}`}
            placeholderTextColor={COLORS.textMuted}
            value={formData[field.id] || ''}
            onChangeText={(val) => handleInputChange(field.id, val)}
            multiline
            editable={!isViewOnly}
          />
        );
      case 'File Upload':
      case 'Image Upload': {
        const fileData = formData[field.id];

        const handleFileSelect = () => {
          if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = field.type === 'Image Upload' ? 'image/*' : '*/*';
            if (field.allowMultiple) {
              input.multiple = true;
            }
            input.onchange = async (e) => {
              const files = Array.from(e.target.files);
              if (files.length === 0) return;

              const processedFiles = await Promise.all(
                files.map(file => {
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                      resolve({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: reader.result
                      });
                    };
                  });
                })
              );

              if (field.allowMultiple) {
                const currentFiles = Array.isArray(fileData) ? fileData : (fileData ? [fileData] : []);
                handleInputChange(field.id, [...currentFiles, ...processedFiles]);
              } else {
                handleInputChange(field.id, processedFiles[0]);
              }
            };
            input.click();
          }
        };

        const handleRemoveFile = (indexToRemove) => {
          if (field.allowMultiple && Array.isArray(fileData)) {
            const updated = fileData.filter((_, idx) => idx !== indexToRemove);
            handleInputChange(field.id, updated.length > 0 ? updated : null);
          } else {
            handleInputChange(field.id, null);
          }
        };

        const renderFileItem = (file, index) => {
          if (!file) return null;
          const name = file.name || (typeof file === 'string' ? file : 'Uploaded File');
          const isUploaded = file.data && (file.data.startsWith('http') || file.data.startsWith('/'));

          return (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 6, gap: 8, marginTop: 4 }}>
              <Ionicons
                name={field.type === 'Image Upload' ? 'image-outline' : 'document-outline'}
                size={16}
                color="#64748B"
              />
              {isUploaded ? (
                <TouchableOpacity
                  onPress={() => {
                    const fileUrl = file.data.startsWith('/') ? `${API_URL}${file.data}` : file.data;
                    if (typeof window !== 'undefined') {
                      window.open(fileUrl, '_blank');
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13, textDecorationLine: 'underline', fontWeight: '500' }} numberOfLines={1}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ flex: 1, color: '#334155', fontSize: 13 }} numberOfLines={1}>
                  {name}
                </Text>
              )}
              {!isViewOnly && (
                <TouchableOpacity onPress={() => handleRemoveFile(index)} style={{ padding: 2 }}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          );
        };

        const filesArray = Array.isArray(fileData) ? fileData : (fileData ? [fileData] : []);

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
                  gap: 8,
                  marginTop: 4
                }}
                onPress={handleFileSelect}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#64748B" />
                <Text style={{ flex: 1, color: '#94A3B8', fontSize: 14 }}>
                  {field.type === 'Image Upload' ? 'Click to upload image(s)...' : 'Click to upload file(s)...'}
                </Text>
              </TouchableOpacity>
            )}

            {filesArray.length > 0 && (
              <View style={{ marginTop: 8, gap: 4 }}>
                {filesArray.map((file, idx) => renderFileItem(file, idx))}
              </View>
            )}
          </View>
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
            <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" />
            </View>
          </View>
        );
      }
      case 'DateTime': {
        const getDef = () => {
          const d = new Date();
          const date = d.toISOString().split('T')[0];
          const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          return `${date}T${time}`;
        };
        const val = formData[field.id] || getDef();
        return (
          <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
            <input
              type="datetime-local"
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }])}
              disabled={isViewOnly}
            />
            <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
              <Ionicons name="time-outline" size={18} color="#64748B" />
            </View>
          </View>
        );
      }
      case 'Time': {
        const getDef = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        const val = formData[field.id] || getDef();
        return (
          <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
            <input
              type="time"
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && { backgroundColor: '#F1F5F9', color: '#64748B' }])}
              disabled={isViewOnly}
            />
            <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
              <Ionicons name="time-outline" size={18} color="#64748B" />
            </View>
          </View>
        );
      }
      case 'Toggle/Switch': {
        const val = !!formData[field.id];
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
            <Switch
              value={val}
              onValueChange={(newVal) => handleInputChange(field.id, newVal)}
              trackColor={{ false: '#CBD5E1', true: '#C5A880' }}
              thumbColor={val ? COLORS.primary : '#F4F3F4'}
              disabled={isViewOnly}
            />
            <Text style={{ marginLeft: 8, fontSize: 14, color: COLORS.textSecondary }}>
              {val ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        );
      }
      case 'Checkbox': {
        const options = (field.allowedOptions && field.allowedOptions.length > 0)
          ? field.allowedOptions
          : (field.options || '').split(',').map(o => o.trim()).filter(Boolean);

        // If there are no options, render it as a single toggle switch
        if (options.length === 0) {
          const val = !!formData[field.id];
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
              <Switch
                value={val}
                onValueChange={(newVal) => handleInputChange(field.id, newVal)}
                trackColor={{ false: '#CBD5E1', true: '#C5A880' }}
                thumbColor={val ? COLORS.primary : '#F4F3F4'}
                disabled={isViewOnly}
              />
              <Text style={{ marginLeft: 8, fontSize: 14, color: COLORS.textSecondary }}>
                {val ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          );
        }

        // Multi-select checkbox
        const rawValue = formData[field.id];
        const selectedValues = Array.isArray(rawValue)
          ? rawValue
          : (typeof rawValue === 'string' ? rawValue.split(',').map(s => s.trim()).filter(Boolean) : []);

        const toggleOption = (opt) => {
          let updated;
          if (selectedValues.includes(opt)) {
            updated = selectedValues.filter(v => v !== opt);
          } else {
            updated = [...selectedValues, opt];
          }
          handleInputChange(field.id, updated.join(', '));
        };

        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                  onPress={() => !isViewOnly && toggleOption(opt)}
                  activeOpacity={isViewOnly ? 1 : 0.8}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: isSelected ? (isViewOnly ? '#94A3B8' : COLORS.primary) : '#CBD5E1',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF'
                  }}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={isViewOnly ? '#94A3B8' : COLORS.primary} />
                    )}
                  </View>
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }
      case 'Radio Button': {
        const options = (field.allowedOptions && field.allowedOptions.length > 0)
          ? field.allowedOptions
          : (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
        const selectedValue = formData[field.id] || '';

        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
            {options.map((opt) => {
              const isSelected = selectedValue === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                  onPress={() => !isViewOnly && handleInputChange(field.id, opt)}
                  activeOpacity={isViewOnly ? 1 : 0.8}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? (isViewOnly ? '#94A3B8' : COLORS.primary) : '#CBD5E1',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF'
                  }}>
                    {isSelected && (
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: isViewOnly ? '#94A3B8' : COLORS.primary
                      }} />
                    )}
                  </View>
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }
      default:
        // Default text input
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

  return (
    <View style={styles.container}>
      {/* MODERN VEHICLE INSURANCE HEADER BANNER */}
      <View style={styles.bannerContainer}>
        {/* Background Decorative Gradient Wave & Watermark */}
        <View style={[styles.bannerWatermarkContainer, { pointerEvents: 'none' }]}>
          <View style={styles.bannerOrangeGlow} />
          <View style={styles.bannerWaveOuter} />
          <View style={styles.bannerWaveInner} />
          <View style={styles.bannerWatermarkIconBox}>
            <Ionicons name="shield-outline" size={135} color="rgba(241, 118, 22, 0.08)" />
          </View>
        </View>

        {/* Banner Content Layout */}
        <View style={styles.bannerContent}>
          {/* Left Group: Icon Badge & Titles */}
          <View style={styles.bannerTitleGroup}>
            <View style={styles.bannerIconBadge}>
              <View style={styles.bannerIconInner}>
                <Ionicons name="shield-checkmark" size={26} color="#72002A" />
                <View style={styles.iconOrangeDot} />
              </View>
            </View>

            <View style={styles.bannerTextStack}>
              <Text style={styles.bannerTitle}>Vehicle Insurance</Text>
              <Text style={styles.bannerSubtitle}>Manage your vehicle insurance records.</Text>
            </View>
          </View>

          {/* Right Group: Action Button */}
          {canCreate && (
            <TouchableOpacity
              style={styles.bannerAddButton}
              onPress={handleAddNewRecord}
              activeOpacity={0.88}
            >
              <View style={styles.bannerAddIconBadge}>
                <Ionicons name="add" size={14} color="#72002A" />
              </View>
              <Text style={styles.bannerAddButtonText}>Add Insurance</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MAIN CONTENT TABLE & CONTROLS */}
      <View style={styles.mainContent}>
        {insuranceRecords.length === 0 && !searchQuery ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyStateText}>No insurance records found.</Text>
            <Text style={styles.emptyStateSubtext}>Click 'Add Insurance' to create a new record.</Text>
          </View>
        ) : (
          <View style={{ flex: 1, gap: 16 }}>
            {/* Separate Top Search & Filter Bar */}
            <View style={styles.standaloneToolbarCard}>
              <View style={styles.tableSearchBox}>
                <Ionicons name="search-outline" size={16} color="#475569" />
                <TextInput
                  style={styles.tableSearchInput}
                  placeholder="Search by ID or Client..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={(text) => { setSearchQuery(text); setCurrentPage(1); }}
                />
              </View>

              <TouchableOpacity style={styles.tableFilterBtn} activeOpacity={0.8}>
                <Ionicons name="funnel-outline" size={15} color="#FF5500" />
                <Text style={styles.tableFilterBtnText}>Filter</Text>
              </TouchableOpacity>
            </View>

            {/* Main Data Table Card */}
            <View style={styles.tableCardContainer}>
              {/* Table Header Columns */}
              <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>ID</Text>
              {isSuperAdmin && (
                <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>CLIENT INFO</Text>
              )}
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>VEHICLE NAME</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>COMPANY NAME</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>INSURER</Text>
              <View style={{ flex: 1.3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.tableHeaderCell}>START DATE</Text>
                <Ionicons name="swap-vertical" size={12} color="#FFE4D6" />
              </View>
              <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>EXPIRY DATE</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>SUBMITTED BY</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>STATUS</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'center' }]}>ACTION</Text>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {(() => {
                const filtered = insuranceRecords.filter(r => {
                  if (user && String(user.roleId) !== '1' && user.clientid) {
                    if (String(r.clientid) !== String(user.clientid)) return false;
                  }
                  if (!searchQuery) return true;
                  const queryLower = searchQuery.toLowerCase();
                  const cObj = clients.find(c => String(c.id) === String(r.clientid));
                  const cName = cObj ? (cObj.client_name || cObj.name) : `Client ${r.clientid}`;
                  const vehName = r.vehicle_display_name || '';
                  return String(r.id).includes(searchQuery) ||
                    (cName && cName.toLowerCase().includes(queryLower)) ||
                    (vehName && vehName.toLowerCase().includes(queryLower));
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

                const getInitials = (name) => {
                  if (!name) return 'NR';
                  const parts = String(name).trim().split(' ');
                  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                };

                return (
                  <View style={{ flex: 1 }}>
                    {paginated.map((record, index) => {
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

                      const valuesList = Object.values(parsedData).filter(v => typeof v === 'string' && v.trim());
                      const matchedVehicleVal = valuesList.find(v => v.includes(' - ')) || valuesList[0];

                      const vehicleDisplayName = record.vehicle_display_name && record.vehicle_display_name !== 'N/A'
                        ? record.vehicle_display_name
                        : (matchedVehicleVal || 'N/A');

                      const startDateVal = record.start_date && record.start_date !== 'N/A'
                        ? record.start_date
                        : (() => {
                            const entries = Object.entries(parsedData);
                            const match = entries.find(([k, v]) => k.toLowerCase().includes('start') || k.toLowerCase().includes('issue') || k.toLowerCase().includes('effective'));
                            return match ? match[1] : 'N/A';
                          })();

                      const formatDateStr = (valStr) => {
                        if (!valStr || valStr === 'N/A') return 'N/A';
                        const str = String(valStr);
                        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                          const [year, month, day] = str.split('-');
                          return `${day}/${month}/${year}`;
                        } else if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                          const datePart = str.split('T')[0];
                          const [year, month, day] = datePart.split('-');
                          return `${day}/${month}/${year}`;
                        }
                        return str;
                      };

                      const isOddRow = index % 2 === 1;
                      const isLastRow = index === paginated.length - 1;

                      return (
                        <View key={record.id} style={[styles.tableRowContainer, isOddRow && { backgroundColor: '#FFF8F2' }, isLastRow && { borderBottomWidth: 0 }]}>

                          {/* ID Column */}
                          <Text style={[styles.rowCellText, { flex: 0.6, color: '#72002A', fontWeight: '600', fontSize: 13.5 }]}>
                            #{record.id}
                          </Text>

                          {/* CLIENT INFO Column */}
                          {isSuperAdmin && (
                            <View style={{ flex: 1.8, paddingRight: 10 }}>
                              <Text style={styles.clientNameText} numberOfLines={1}>{clientName}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                <Ionicons name="location-sharp" size={10} color="#94A3B8" />
                                <Text style={styles.clientCountryText} numberOfLines={1}>{countryName || 'United Arab Emirates'}</Text>
                              </View>
                            </View>
                          )}

                          {/* VEHICLE NAME Column */}
                          <View style={{ flex: 1.5, paddingRight: 10 }}>
                            <Text style={styles.vehicleNameText} numberOfLines={1}>{vehicleDisplayName}</Text>
                          </View>

                          {/* COMPANY NAME Column */}
                          <View style={{ flex: 1.5, paddingRight: 10 }}>
                            <Text style={styles.companyNameText} numberOfLines={1}>{record.company_name || 'N/A'}</Text>
                          </View>

                          {/* INSURER Column */}
                          <View style={{ flex: 1.1, paddingRight: 10 }}>
                            <Text style={styles.mutedCellText} numberOfLines={1}>{record.insurer || 'N/A'}</Text>
                          </View>

                          {/* START DATE Column */}
                          <View style={{ flex: 1.3, paddingRight: 10 }}>
                            <Text style={styles.mutedCellText} numberOfLines={1}>{formatDateStr(startDateVal)}</Text>
                          </View>

                          {/* EXPIRY DATE Column */}
                          <View style={{ flex: 1.3, paddingRight: 10 }}>
                            <Text style={styles.mutedCellText} numberOfLines={1}>{formatDateStr(record.expiry_date)}</Text>
                          </View>

                          {/* SUBMITTED BY Column */}
                          <View style={{ flex: 1.6, paddingRight: 10 }}>
                            <Text style={styles.submitterRoleText} numberOfLines={1}>
                              {record.role_name || (record.roleid ? `Role: ${record.roleid}` : 'Client')}
                            </Text>
                            <Text style={styles.submitterSubtext} numberOfLines={1}>
                              {record.employee_name || 'nirmalrajs2023@gmail.com'}
                            </Text>
                          </View>

                          {/* STATUS Column */}
                          <View style={{ flex: 1.1, alignItems: 'flex-start' }}>
                            <View style={styles.statusPillBadge}>
                              <View style={styles.statusDotGreen} />
                              <Text style={styles.statusPillText}>Active</Text>
                            </View>
                          </View>

                          {/* ACTION Column */}
                          <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <TouchableOpacity style={styles.actionBtnView} onPress={() => handleView(record)} activeOpacity={0.8}>
                              <Ionicons name="eye-outline" size={16} color="rgb(158, 46, 42)" />
                            </TouchableOpacity>

                            {(checkRowPermission ? checkRowPermission(record.company_id || record.companyid, 'edit') : canEdit) && (
                              <TouchableOpacity style={styles.actionBtnEdit} onPress={() => handleEdit(record)} activeOpacity={0.8}>
                                <Ionicons name="pencil" size={15} color="#166534" />
                              </TouchableOpacity>
                            )}

                            {(checkRowPermission ? checkRowPermission(record.company_id || record.companyid, 'delete') : canDelete) && (
                              <TouchableOpacity style={styles.actionBtnDelete} onPress={() => handleDelete(record)} activeOpacity={0.8}>
                                <Ionicons name="trash-outline" size={15} color="#EF4444" />
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
              const filtered = insuranceRecords.filter(r => {
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

              const pageNumbers = [];
              for (let i = 1; i <= Math.min(4, totalPages); i++) {
                pageNumbers.push(i);
              }

              return (
                <View style={styles.paginationFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={styles.paginationInfoText}>
                      Showing <Text style={{ fontWeight: '600', color: '#1E293B' }}>{startEntry}</Text> to <Text style={{ fontWeight: '600', color: '#1E293B' }}>{endEntry}</Text> of <Text style={{ fontWeight: '600', color: '#1E293B' }}>{filtered.length}</Text> entries
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>Rows per page:</Text>
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.pageNavBtn, currentPage === 1 && { opacity: 0.5 }]}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage(p => p - 1)}
                    >
                      <Ionicons name="chevron-back" size={14} color="#64748B" />
                    </TouchableOpacity>

                    {pageNumbers.map(pNum => (
                      <TouchableOpacity
                        key={pNum}
                        style={[styles.pageNumberBtn, currentPage === pNum && styles.pageNumberBtnActive]}
                        onPress={() => setCurrentPage(pNum)}
                      >
                        <Text style={[styles.pageNumberText, currentPage === pNum && styles.pageNumberTextActive]}>
                          {pNum}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.pageNavBtn, currentPage === totalPages && { opacity: 0.5 }]}
                      disabled={currentPage === totalPages}
                      onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      <Ionicons name="chevron-forward" size={14} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      )}
    </View>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: 480, maxWidth: '95%', padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 }}>
            
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' }}>
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#DC2626' }}>Confirm Deletion</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} activeOpacity={0.7} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Warning Banner Card */}
            <View style={{ backgroundColor: '#FFF5F5', borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2', padding: 18, flexDirection: 'row', gap: 14, marginBottom: 22 }}>
              <Ionicons name="warning" size={26} color="#E11D48" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', lineHeight: 22 }}>
                  Are you sure you want to delete <Text style={{ color: '#DC2626', fontWeight: '700' }}>Record #{recordToDelete?.id}</Text>?
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 19 }}>
                  This will permanently delete the selected insurance record. This action cannot be undone and will be completely removed from the database.
                </Text>
              </View>
            </View>

            {/* Confirmation Field */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                TYPE <Text style={{ color: '#DC2626', fontWeight: '800' }}>YES</Text> TO CONFIRM <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>

              <TextInput
                style={{ height: 48, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 16, fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF', outlineStyle: 'none' }}
                placeholder="YES"
                placeholderTextColor="#94A3B8"
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                autoCapitalize="characters"
              />
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 4 }}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={{ height: 42, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[{ height: 42, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: '#DC2626' }, deleteConfirmationText !== 'YES' && { opacity: 0.5 }]}
                disabled={deleteConfirmationText !== 'YES'}
                onPress={handleConfirmDelete}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Delete Record</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* MODAL FOR FORM */}
      <Modal
        visible={isFormOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }}
      >
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF0F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCE7F3', position: 'relative' }}>
                  <Ionicons name="document-text" size={26} color="#72002A" />
                  <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#72002A', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF0F2' }}>
                    <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 }}>
                    {isViewOnly ? `View Insurance Record #${editingRecord?.id}` : (editingRecord ? `Edit Insurance Record #${editingRecord.id}` : 'Add Vehicle Insurance')}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    {isViewOnly
                      ? 'Viewing vehicle insurance record details.'
                      : (editingRecord ? 'Update the details below for this insurance record.' : 'Fill in the details below to continue adding a new insurance record.')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            {/* WIZARD PROGRESS BAR */}
            {!isViewOnly && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingVertical: 18, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                {/* Step 1: Configuration */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      borderWidth: wizardStep === 1 ? 2 : (wizardStep > 1 ? 0 : 1),
                      borderColor: wizardStep === 1 ? '#72002A' : '#CBD5E1',
                      backgroundColor: wizardStep > 1 ? '#72002A' : '#FFFFFF',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      {wizardStep > 1 ? (
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      ) : (
                        <Text style={{ fontSize: 16, fontWeight: '700', color: wizardStep === 1 ? '#72002A' : '#64748B' }}>1</Text>
                      )}
                    </View>
                    {wizardStep === 1 && (
                      <View style={{
                        position: 'absolute',
                        bottom: -5,
                        width: 0,
                        height: 0,
                        borderLeftWidth: 6,
                        borderRightWidth: 6,
                        borderTopWidth: 6,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: '#72002A',
                      }} />
                    )}
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: wizardStep >= 1 ? '#72002A' : '#475569' }}>Configuration</Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>Select client and company details</Text>
                  </View>
                </View>

                {/* Connecting Line */}
                <View style={{ flex: 1, maxWidth: 180, height: 1, backgroundColor: wizardStep > 1 ? '#72002A' : '#E2E8F0', marginHorizontal: 24 }} />

                {/* Step 2: Form Data */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: wizardStep === 2 ? '#72002A' : '#F1F5F9',
                      borderWidth: wizardStep === 2 ? 0 : 1,
                      borderColor: '#E2E8F0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: wizardStep === 2 ? '#FFFFFF' : '#64748B' }}>2</Text>
                    </View>
                    {wizardStep === 2 && (
                      <View style={{
                        position: 'absolute',
                        bottom: -5,
                        width: 0,
                        height: 0,
                        borderLeftWidth: 6,
                        borderRightWidth: 6,
                        borderTopWidth: 6,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: '#72002A',
                      }} />
                    )}
                  </View>

                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: wizardStep === 2 ? '#0F172A' : '#64748B' }}>Form Data</Text>
                    <Text style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>Enter insurance information</Text>
                  </View>
                </View>
              </View>
            )}

            {wizardStep === 1 ? (
              <View style={{ flex: 1, backgroundColor: '#FAFAFC', paddingHorizontal: 24, paddingVertical: 20 }}>
                <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' }}>
                  {/* Left Graphic Banner Panel */}
                  <View style={{ width: 250, backgroundColor: '#FFF5F2', borderRightWidth: 1, borderRightColor: '#FEE2E2', paddingTop: 32, paddingHorizontal: 20, alignItems: 'center' }}>
                    <View style={{ alignItems: 'center', width: '100%' }}>
                      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCE7F3', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#8A1538', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#8A1538', textTransform: 'uppercase', letterSpacing: 0.5 }}>Step 1 of 2</Text>
                      <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 6, textAlign: 'center', lineHeight: 22 }}>Choose Client{"\n"}and Company</Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>Select the client who owns the vehicle and the company under which it is registered.</Text>
                    </View>

                    {/* Bottom Illustration Image */}
                    <Image 
                      source={require('../../assets/vehicle_insurance_illustration.png')} 
                      style={{ width: '100%', height: 145, resizeMode: 'contain', marginTop: 'auto', marginBottom: 0 }} 
                    />
                  </View>

                  {/* Right Configuration Form Area */}
                  <View style={{ flex: 1, paddingHorizontal: 40, paddingVertical: 32, justifyContent: 'center' }}>
                    {(!user || String(user.roleId) === '1') && (
                      <View style={{ marginBottom: 24, zIndex: 30 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF0F2', borderWidth: 1, borderColor: '#FCE7F3', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="business" size={22} color="#8A1538" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', letterSpacing: 0.3 }}>CLIENT <Text style={{ color: '#EF4444' }}>*</Text></Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Choose the client who owns this vehicle.</Text>
                          </View>
                        </View>
                        <SearchableDropdown
                          data={clients}
                          value={selectedClient}
                          onChange={(val) => {
                            setSelectedClient(val);
                            setSelectedCompany('');
                            fetchCompaniesForClient(val);
                          }}
                          placeholder="-- Select Client --"
                          searchPlaceholder="Search Client..."
                          displayKey="client_name"
                          valueKey="id"
                          hideClearIcon={true}
                          selectorStyle={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E28D99', backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}
                        />
                      </View>
                    )}

                    {(!user || String(user.roleId) === '1') && (
                      <View style={{ borderStyle: 'dashed', borderWidth: 0.8, borderColor: '#E2E8F0', marginVertical: 20 }} />
                    )}

                    <View style={{ marginBottom: 12, zIndex: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF4ED', borderWidth: 1, borderColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="briefcase" size={22} color="#E87928" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', letterSpacing: 0.3 }}>COMPANY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Choose the company under which the vehicle is registered.</Text>
                        </View>
                      </View>
                      <SearchableDropdown
                        data={companies}
                        value={selectedCompany}
                        onChange={(val) => {
                          if (String(selectedCompany) !== String(val)) {
                            // Clear vehicle selections when company changes
                            setFormData(prev => {
                              const updated = { ...prev };
                              Object.keys(updated).forEach(k => {
                                const kLower = String(k).toLowerCase();
                                if (kLower.includes('vehicle') || kLower.includes('plate')) {
                                  delete updated[k];
                                }
                              });
                              return updated;
                            });
                          }
                          setSelectedCompany(val);
                          const selectedIds = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
                          if (selectedIds.length > 0) {
                            const firstSelected = companies.find(c => String(c.id) === selectedIds[0]);
                            if (firstSelected && firstSelected.country) {
                              setSelectedCountry(String(firstSelected.country));
                            }
                          } else {
                            setSelectedCountry('');
                          }
                        }}
                        placeholder="-- Select Company --"
                        searchPlaceholder="Search Company..."
                        displayKey="company_name"
                        valueKey="id"
                        isMultiSelect={true}
                        hideClearIcon={true}
                        selectorStyle={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#FB923C', backgroundColor: '#FFFFFF', paddingHorizontal: 16 }}
                        getIsOptionDisabled={(item) => {
                          const selectedIds = selectedCompany ? String(selectedCompany).split(',').map(s => s.trim()).filter(Boolean) : [];
                          if (selectedIds.length === 0) return false;
                          const firstSelected = companies.find(c => String(c.id) === selectedIds[0]);
                          if (!firstSelected) return false;
                          return item.country !== firstSelected.country;
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Wizard Step 1 Footer Controls */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 22, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
                    onPress={() => setIsFormOpen(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#475569" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 38, borderRadius: 12, backgroundImage: 'linear-gradient(90deg, #72002A 0%, #D86A1A 100%)', boxShadow: '0px 4px 14px rgba(216, 106, 26, 0.35)' }, (!selectedClient || !selectedCompany) && { opacity: 0.5 }]}
                    disabled={!selectedClient || !selectedCompany}
                    onPress={() => fetchFormConfiguration(selectedClient, selectedCountry, selectedModule)}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Next</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontWeight: '500' }}>Loading form...</Text>
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
                  Please check if the selected Client, Country, and Module have a defined layout and active permissions.
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 8 }}
                  onPress={() => {
                    setWizardStep(1);
                  }}
                >
                  <Text style={{ color: '#0F172A', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFC' }} contentContainerStyle={{ padding: 24, paddingBottom: 28 }}>
                  {fieldsLayout.map((section, index) => (
                    <View key={section.id} style={[styles.sectionCard, { zIndex: fieldsLayout.length - index }]}>
                      {/* Section Header Banner Box */}
                      <View style={{
                        backgroundColor: '#FFF5F6',
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#FCE7F3',
                        flexDirection: 'row',
                        overflow: 'hidden',
                        marginHorizontal: 16,
                        marginTop: 16,
                        marginBottom: 4,
                      }}>
                        <View style={{ width: 4, backgroundColor: '#72002A' }} />
                        <View style={{ paddingVertical: 14, paddingHorizontal: 16, flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#72002A', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {section.name || 'INSURANCE INFO'}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                            Enter the coverage details and period terms for this policy.
                          </Text>
                        </View>
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
                          )
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: isViewOnly ? 'flex-end' : 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                  {isViewOnly ? (
                    <TouchableOpacity
                      style={{ paddingVertical: 12, paddingHorizontal: 28, backgroundColor: '#72002A', borderRadius: 10 }}
                      onPress={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 22, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}
                        onPress={() => {
                          setWizardStep(1);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="arrow-back" size={16} color="#475569" />
                        <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 36, borderRadius: 12, backgroundImage: 'linear-gradient(90deg, #72002A 0%, #D86A1A 100%)', boxShadow: '0px 4px 14px rgba(216, 106, 26, 0.35)' }, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        activeOpacity={0.85}
                        disabled={saving}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                          {saving ? (editingRecord ? 'Updating...' : 'Saving...') : (editingRecord ? 'Update' : 'Save')}
                        </Text>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
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
    fontFamily: 'Inter_400Regular, Roboto, sans-serif',
    outlineStyle: 'none', outlineWidth: 0,
    width: '100%',
    boxSizing: 'border-box'
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    zIndex: 10,
  },
  subsectionsContainer: {
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    width: '100%',
  },
  subsectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  subsectionBody: {
    padding: 16,
    paddingBottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
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
    paddingBottom: 120,
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
    minHeight: '61%',
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
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
    alignSelf: 'flex-end',
    minWidth: 120,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
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
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: '#F17616',
  },
  bannerTextStack: {
    gap: 3,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#59001F',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
    lineHeight: 19,
  },
  bannerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#72002A',
    backgroundImage: 'linear-gradient(135deg, #72002A 0%, #A20E35 55%, #F17616 100%)',
    height: 42,
    paddingHorizontal: 20,
    borderRadius: 11,
    gap: 9,
    shadowColor: '#F17616',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 3,
    cursor: 'pointer',
  },
  bannerAddIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  // TABLE & CONTROLS STYLES
  standaloneToolbarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 16,
  },
  tableCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1E7DD',
    shadowColor: '#72002A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
  },
  tableSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    width: 280,
    height: 40,
  },
  tableSearchInput: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 13,
    color: '#1E293B',
    outlineStyle: 'none',
  },
  tableFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5EE',
    borderWidth: 1,
    borderColor: '#FFD5C0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 38,
    cursor: 'pointer',
  },
  tableFilterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A02B00',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(158, 46, 42)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 25,
    paddingHorizontal: 24,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE4D6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    marginVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dotted',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  rowOrangeAccentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    backgroundColor: '#FF5500',
    borderTopRightRadius: 2.5,
    borderBottomRightRadius: 2.5,
  },
  clientAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    backgroundImage: 'linear-gradient(135deg, #FF7E40 0%, #E65100 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    boxShadow: '0px 2px 5px rgba(241, 118, 22, 0.22)',
  },
  clientAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  clientNameText: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  clientCountryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
  },
  vehicleNameText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  companyNameText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  mutedCellText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '400',
  },
  submitterRoleText: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  submitterSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  actionBtnView: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  actionBtnEdit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  actionBtnDelete: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  paginationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1E7DD',
    backgroundColor: '#FFFFFF',
  },
  paginationInfoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  pageNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  pageNumberBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  pageNumberBtnActive: {
    backgroundColor: '#72002A',
    backgroundImage: 'linear-gradient(135deg, #72002A 0%, #A20E35 50%, #F17616 100%)',
    borderColor: 'transparent',
    boxShadow: '0px 2px 8px rgba(241, 118, 22, 0.3)',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  }
});
