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

export default function AssetAssignmentTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isEmployee = user && String(user.roleId) !== '1' && String(user.roleId) !== '2' && String(user.roleId) !== '5' && String(user.roleId) !== '8';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldsLayout, setFieldsLayout] = useState(null);
  const [customFieldId, setCustomFieldId] = useState(null);
  const [configParams, setConfigParams] = useState({ clientid: null, country_id: null, moduleid: null });
  const [formData, setFormData] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [assetDetailsRecords, setAssetDetailsRecords] = useState([]);

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
  const [employees, setEmployees] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [assetItems, setAssetItems] = useState([{ id: Date.now(), asset_id: '', barcode: '', qty: 1 }]);
  const [assetOptions, setAssetOptions] = useState([]);
  const [validationError, setValidationError] = useState('');

  // Custom renderer for the Dropdown items
  const renderAssetOption = (item, isSelected) => {
    const details = item.rawData?.details;
    if (!details) {
      return (
        <Text style={{ fontSize: 13, color: isSelected ? '#0284C7' : '#334155', fontWeight: isSelected ? '600' : '400' }}>
          {item.label}
        </Text>
      );
    }

    const getDetail = (keyNames) => {
      const entry = Object.entries(details).find(([k]) => keyNames.some(kn => k.toLowerCase().includes(kn)));
      return entry ? entry[1] : null;
    };

    const brand = getDetail(['brand']) || 'Unknown Brand';
    const model = getDetail(['model']) || item.label;
    const totalActiveBarcodes = item.rawData?.barcodes ? item.rawData.barcodes.length : 0;

    // The total "pool" of barcodes available for this specific edit session
    // is the Active ones from the DB PLUS any barcodes that were originally saved to this record.
    const originalBarcodesCount = assetItems.reduce((total, row) => {
      if (String(row.asset_id) === String(item.value)) {
        return total + (row.originalBarcodes ? row.originalBarcodes.length : 0);
      }
      return total;
    }, 0);

    const totalSessionPool = totalActiveBarcodes + originalBarcodesCount;

    // Now count how many blue chips are currently sitting in the table
    const currentClaimedCount = assetItems.reduce((total, row) => {
      if (String(row.asset_id) === String(item.value)) {
        const currentBarcodes = row.barcodes || (row.barcode ? [row.barcode] : []);
        const filledBarcodes = currentBarcodes.filter(b => b && b.trim() !== '');
        return total + filledBarcodes.length;
      }
      return total;
    }, 0);

    // Subtract the current claims from the total session pool
    const available = Math.max(0, totalSessionPool - currentClaimedCount);

    return (
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF', 
        padding: 12, 
        marginVertical: 4,
        marginHorizontal: 6,
        borderRadius: 6,
        borderWidth: 1, 
        borderColor: isSelected ? '#BAE6FD' : '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        alignItems: 'center'
      }}>
        <View style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#E2E8F0', marginRight: 12, overflow: 'hidden' }}>
          <Image 
            source={{ uri: 'https://dummyimage.com/100x100/e2e8f0/0f172a.png&text=IT' }} 
            style={{ width: 40, height: 40 }}
            resizeMode="cover"
          />
        </View>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 }}>
            {item.label}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
            {model}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#475569' }}>
              Brand: {brand}
            </Text>
            <Text style={{ fontSize: 12, color: available > 0 ? '#16A34A' : '#EF4444', fontWeight: '600' }}>
              Qty: {available}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes, assetsRes, employeesRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/asset-assignment${user && user.clientid ? `?clientid=${user.clientid}&email=${encodeURIComponent(user.email)}` : ''}`),
        fetch(`${API_URL}/api/asset-details/dropdown`),
        fetch(`${API_URL}/api/employees${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
      ]);
      const [clientsData, countriesData, modulesData, recordsData, assetsData, employeesData] = await Promise.all([
        clientsRes.json(),
        countriesRes.json(),
        modulesRes.json(),
        recordsRes.ok ? recordsRes.json() : [],
        assetsRes.ok ? assetsRes.json() : [],
        employeesRes.ok ? employeesRes.json() : []
      ]);
      setClients(clientsData || []);
      setCountries(countriesData || []);
      setModules(modulesData || []);
      setAssetDetailsRecords(Array.isArray(recordsData) ? recordsData : []);
      setEmployees(employeesData || []);

      const formattedAssets = (assetsData || []).map(item => {
        return { label: item.name, value: String(item.id), rawData: item };
      });
      setAssetOptions(formattedAssets);

      // Try to set defaults if available
      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));
      const viModule = (modulesData || []).find(m => m.module_name && (m.module_name.toLowerCase().includes('asset assignment') || m.module_name.toLowerCase().includes('asset assignment')));
      if (viModule) setSelectedModule(String(viModule.id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompaniesForClient = async (clientId) => {
    if (!clientId) {
      setCompanies([]);
      return [];
    }
    try {
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`${API_URL}/api/companies/client/${clientId}${emailParam}`);
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
    setAssetItems([{ id: Date.now(), asset_id: '', barcode: '', qty: 1 }]);
    if (companies.length === 1 && user && String(user.roleId) !== '1') {
      const singleComp = companies[0];
      setSelectedCompany(String(singleComp.id));
      const targetCountry = singleComp.country ? String(singleComp.country) : selectedCountry;
      if (singleComp.country) setSelectedCountry(String(singleComp.country));
      await fetchFormConfiguration(
        selectedClient,
        targetCountry,
        selectedModule
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
      // Fetch custom fields for this configuration
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

      // Fetch permissions
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

        // Fetch dropdown option values from tbl_customfieldsvalues
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
            // Automatically append clientId if the path is designed for client lookup
            if (processedPath.includes('client') && clientId) {
              if (processedPath.endsWith('/client') || processedPath.endsWith('/client/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${clientId}`;
              }
            }
            // Automatically append client_id to asset-brands dynamic path
            if (processedPath.includes('asset-brands') && clientId) {
              const separator = processedPath.includes('?') ? '&' : '?';
              processedPath = `${processedPath}${separator}client_id=${clientId}`;
            }
            // Automatically append clientid to employees dynamic path
            if (processedPath.includes('employees') && clientId) {
              const separator = processedPath.includes('?') ? '&' : '?';
              processedPath = `${processedPath}${separator}clientid=${clientId}`;
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

            const url = processedPath.startsWith('http') ? processedPath : `${API_URL}${processedPath}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];
            return data.map(item => {
              if (typeof item === 'string') return { label: item, value: item };
              if (item && typeof item === 'object') {
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
                const idKey = Object.keys(item).find(key =>
                  key.toLowerCase() === 'id' ||
                  key.toLowerCase().endsWith('id') ||
                  key.toLowerCase() === 'cid' ||
                  key.toLowerCase() === 'bid'
                );

                const label = nameKey ? String(item[nameKey]) : (Object.keys(item)[0] ? String(item[Object.keys(item)[0]]) : '');
                const value = idKey ? item[idKey] : label;
                return { label, value: String(value), rawData: item };
              }
              return { label: String(item), value: String(item) };
            }).filter(opt => opt && opt.label);
          } catch (e) {
            console.warn(`Error fetching dynamic options from ${path}:`, e);
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
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    
    if (parsed.assetItems && Array.isArray(parsed.assetItems) && parsed.assetItems.length > 0) {
      const initializedItems = parsed.assetItems.map(item => ({
        ...item,
        originalBarcodes: item.barcodes || (item.barcode ? [item.barcode] : [])
      }));
      setAssetItems(initializedItems);
    } else if (record.asset_id) {
      setAssetItems([{ id: Date.now(), asset_id: String(record.asset_id), barcode: record.barcode || '', qty: 1 }]);
    } else {
      setAssetItems([{ id: Date.now(), asset_id: '', barcode: '', qty: 1 }]);
    }

    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''));
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

    if (parsed.assetItems && Array.isArray(parsed.assetItems) && parsed.assetItems.length > 0) {
      const initializedItems = parsed.assetItems.map(item => ({
        ...item,
        originalBarcodes: item.barcodes || (item.barcode ? [item.barcode] : [])
      }));
      setAssetItems(initializedItems);
    } else if (record.asset_id) {
      setAssetItems([{ id: Date.now(), asset_id: String(record.asset_id), barcode: record.barcode || '', qty: 1, originalBarcodes: record.barcode ? [record.barcode] : [] }]);
    } else {
      setAssetItems([{ id: Date.now(), asset_id: '', barcode: '', qty: 1, originalBarcodes: [] }]);
    }
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''));
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
    if (deleteConfirmationText !== 'YES' || !recordToDelete) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/asset-assignment/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete asset assignment record');

      showToast('Premises details record deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast('Error deleting asset assignment record', 'error');
    }
  };

  const handleSave = async () => {
    // Validation for barcodes
    for (const item of assetItems) {
      if (!item.asset_id) continue;
      const numQty = parseInt(item.qty) || 1;
      const currentBarcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
      const filledBarcodes = currentBarcodes.filter(b => b && b.trim() !== '');

      if (filledBarcodes.length !== numQty) {
        setValidationError('Quantity and selected barcode count must match.');
        return;
      }

      const uniqueBarcodes = new Set(filledBarcodes);
      if (uniqueBarcodes.size !== filledBarcodes.length) {
        setValidationError('Validation Error: You cannot select the same barcode twice in one row.');
        return;
      }
    }

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

      finalFormData.assetItems = assetItems;

      const payload = {
        asset_id: assetItems.length > 0 ? assetItems[0].asset_id : (editingRecord?.asset_id || null),
        custom_field_id: customFieldId,
        field_data: finalFormData,
        clientid: configParams.clientid,
        country_id: configParams.country_id,
        moduleid: configParams.moduleid,
        company_id: selectedCompany || null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}/api/asset-assignment/${editingRecord.id}`
        : `${API_URL}/api/asset-assignment`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'save'} asset assignment`);

      showToast(isEditing ? 'Premises details record updated successfully!' : 'Form submitted successfully!', 'success');
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
      setAssetItems([{ id: Date.now(), asset_id: '', barcode: '', qty: 1 }]);
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast('Error saving asset assignment', 'error');
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
        const dropdownData = options.map(opt => {
          if (typeof opt === 'object' && opt.value !== undefined) return opt;
          return { label: String(opt), value: String(opt) };
        });

        const selectedValue = formData[field.id];

        // Custom renderer for the Dropdown items if this is the Asset Name field
        const renderAssetOption = (item, isSelected) => {
          const details = item.rawData?.details;
          if (!details) {
            return (
              <Text style={{ fontSize: 13, color: isSelected ? '#0284C7' : '#334155', fontWeight: isSelected ? '600' : '400' }}>
                {item.label}
              </Text>
            );
          }

          // Case-insensitive lookup for specific details
          const getDetail = (keyNames) => {
            const entry = Object.entries(details).find(([k]) => keyNames.some(kn => k.toLowerCase().includes(kn)));
            return entry ? entry[1] : null;
          };

          const brand = getDetail(['brand']) || 'Unknown Brand';
          const category = getDetail(['category']) || 'Unknown Category';
          const model = getDetail(['model']) || item.label;
          const available = getDetail(['opening quantity', 'available', 'stock']) || '0';

          return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: '#E2E8F0', marginRight: 10, overflow: 'hidden' }}>
                <Image 
                  source={{ uri: 'https://dummyimage.com/100x100/e2e8f0/0f172a.png&text=IT' }} 
                  style={{ width: 36, height: 36 }}
                  resizeMode="cover"
                />
              </View>
              <View style={{ flexDirection: 'column', flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                  Model: {model}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                  Brand: {brand}  •  Category: {category}
                </Text>
                <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>
                  Available: {available} {parseInt(available, 10) === 1 ? 'Unit' : 'Units'}
                </Text>
              </View>
            </View>
          );
        };

        return (
          <View style={{ width: '100%' }}>
            <SearchableDropdown
              data={dropdownData}
              value={selectedValue || ''}
              onChange={(val) => handleInputChange(field.id, val)}
              placeholder={`-- Select ${field.name} --`}
              searchPlaceholder={`Search ${field.name}...`}
              displayKey="label"
              valueKey="value"
              disabled={isViewOnly}
              renderOption={field.name && field.name.toLowerCase().includes('asset') ? renderAssetOption : undefined}
            />

            {field.name && field.name.toLowerCase().includes('asset') && selectedValue && dropdownData.find(opt => String(opt.value) === String(selectedValue))?.rawData?.details && (
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 13, color: '#475569', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' }}>
                  Asset Specifications
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(dropdownData.find(opt => String(opt.value) === String(selectedValue)).rawData.details).map(([k, v]) => {
                    if (k.length > 25 || String(v).length > 40 || k.match(/^\d+$/)) return null;
                    const keyLower = k.toLowerCase();
                    if (!keyLower.includes('name') && !keyLower.includes('model') && !keyLower.includes('brand')) return null;
                    return (
                      <View key={k} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' }}>
                        <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' }}>{k}</Text>
                        <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '500', marginTop: 2 }}>{v}</Text>
                      </View>
                    );
                  })}
                </View>
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
            {options.map((optItem) => {
              const optLabel = typeof optItem === 'object' ? optItem.label : optItem;
              const optValue = typeof optItem === 'object' ? optItem.value : optItem;
              const isSelected = selectedValues.includes(optValue);
              return (
                <TouchableOpacity
                  key={optValue}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                  onPress={() => !isViewOnly && toggleOption(optValue)}
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
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{optLabel}</Text>
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
            {options.map((optItem) => {
              const optLabel = typeof optItem === 'object' ? optItem.label : optItem;
              const optValue = typeof optItem === 'object' ? optItem.value : optItem;
              const isSelected = selectedValue === optValue;
              return (
                <TouchableOpacity
                  key={optValue}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}
                  onPress={() => !isViewOnly && handleInputChange(field.id, optValue)}
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
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{optLabel}</Text>
                </TouchableOpacity>
              );
            })}
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

  return (
    <View style={styles.container}>
      {/* MAIN HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Asset Assignment</Text>
          <Text style={styles.headerSubtitle}>Manage your asset assignment records.</Text>
        </View>
        {!isEmployee && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNewRecord}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Asset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.mainContent}>
        {isEmployee ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 400 }}>
            <View style={{
              width: '100%',
              maxWidth: 600,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 15,
              elevation: 4
            }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#EBF4F0',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24
              }}>
                <Ionicons name="construct-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' }}>
                Asset Registration Entry
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22, maxWidth: 440 }}>
                Please register the asset hardware and specification details. All records are processed securely.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  width: '100%',
                  maxWidth: 320,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 2
                }}
                onPress={handleAddNewRecord}
              >
                <Ionicons name="add-circle" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Add Asset</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          assetDetailsRecords.length === 0 && !searchQuery ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No asset assignment records found.</Text>
              <Text style={styles.emptyStateSubtext}>Click 'Add Asset' to create a new record.</Text>
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
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Employee Name</Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Module Info</Text>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Data Preview</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>View</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Edit</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Delete</Text>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                {(() => {
                  const filtered = assetDetailsRecords.filter(r => {
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
                        const moduleName = moduleObj ? moduleObj.module_name : `Module ${record.moduleid}`;

                        let assetDisplay = 'No Asset Assigned';
                        let barcodeDisplay = '-';
                        if (parsedData.assetItems && parsedData.assetItems.length > 0) {
                          const item = parsedData.assetItems[0];
                          const assetObj = assetOptions.find(opt => String(opt.value) === String(item.asset_id));
                          assetDisplay = assetObj ? assetObj.label : `Asset ID: ${item.asset_id}`;
                          barcodeDisplay = item.barcode || 'No Barcode';

                          if (parsedData.assetItems.length > 1) {
                            const extraCount = parsedData.assetItems.length - 1;
                            assetDisplay += ` (+ ${extraCount} more)`;
                            barcodeDisplay += ` (+ ${extraCount} more)`;
                          }
                        }

                        return (
                          <View key={record.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
                            <Text style={{ flex: 0.5, fontSize: 12, color: '#334155', fontWeight: '700' }}>#{record.id}</Text>

                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{clientName}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Country: {countryName}</Text>
                            </View>

                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              {(() => {
                                let empNameDisplay = record.employee_name || 'N/A';
                                if (empNameDisplay === 'N/A' && parsedData) {
                                  for (const [key, value] of Object.entries(parsedData)) {
                                    if (key !== 'assetItems' && typeof value === 'string' && value.length > 0 && value.length < 50 && !key.includes('date') && !value.includes('-')) {
                                       const matchedEmployee = employees.find(e => String(e.id) === String(value));
                                       if (matchedEmployee) {
                                          empNameDisplay = matchedEmployee.full_name || matchedEmployee.name;
                                          break;
                                       }
                                    }
                                  }
                                }
                                return (
                                  <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{empNameDisplay}</Text>
                                );
                              })()}
                            </View>

                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{moduleName}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Created: {new Date(record.created_at).toLocaleDateString()}</Text>
                            </View>

                            <View style={{ flex: 2, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{assetDisplay}</Text>
                              <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '500' }} numberOfLines={1}>Barcode: {barcodeDisplay}</Text>
                            </View>

                            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                              <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Active</Text>
                              </View>
                            </View>

                            <TouchableOpacity style={{ flex: 0.5, alignItems: 'center' }} onPress={() => handleView(record)}>
                              <Ionicons name="eye-outline" size={18} color="#0F172A" />
                            </TouchableOpacity>

                            <TouchableOpacity style={{ flex: 0.5, alignItems: 'center' }} onPress={() => handleEdit(record)}>
                              <Ionicons name="pencil" size={18} color="#166534" />
                            </TouchableOpacity>

                            <TouchableOpacity style={{ flex: 0.5, alignItems: 'center' }} onPress={() => handleDelete(record)}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </ScrollView>

              {/* Pagination Footer */}
              {(() => {
                const filtered = assetDetailsRecords.filter(r => {
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
                        onPress={() => setCurrentPage(p => p + 1)}
                      >
                        <Text style={{ fontSize: 12, color: currentPage < totalPages ? '#475569' : '#94A3B8', fontWeight: '500' }}>{'Next >'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </View>
          )
        )}
      </View>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, width: 450, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#FEE2E2' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="warning" size={24} color="#EF4444" />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#EF4444' }}>Confirm Deletion</Text>
              </View>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, color: '#334155', marginBottom: 16 }}>
              Are you sure you want to delete <Text style={{ fontWeight: '700' }}>Record #{recordToDelete?.id}</Text>?
            </Text>

            <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 20 }}>
              This will permanently delete the selected asset assignment record. This action cannot be undone and will be completely removed from the database.
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, textTransform: 'uppercase' }}>
              TYPE <Text style={{ color: '#EF4444' }}>YES</Text> TO CONFIRM *
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, fontSize: 14, color: '#334155', marginBottom: 24, outlineStyle: 'none' }}
              placeholder="Type YES here"
              placeholderTextColor="#94A3B8"
              value={deleteConfirmationText}
              onChangeText={setDeleteConfirmationText}
              autoCapitalize="characters"
            />

            <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: deleteConfirmationText === 'YES' ? '#FECACA' : '#F1F5F9', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 }}
                disabled={deleteConfirmationText !== 'YES'}
                onPress={handleConfirmDelete}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>YES</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{isViewOnly ? `View Asset Assignment Record #${editingRecord?.id}` : (editingRecord ? `Edit Asset Assignment Record #${editingRecord.id}` : 'Add Asset')}</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {!isViewOnly && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                {[
                  { id: 1, label: 'Configuration', icon: 'settings-outline' },
                  { id: 2, label: 'Form Data', icon: 'document-text-outline' }
                ].map((step, index, arr) => {
                  const isActive = wizardStep === step.id;
                  const isPast = wizardStep > step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? '#0F172A' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? '#0F172A' : '#64748B' }}>{step.label}</Text>
                      </View>
                      {index < arr.length - 1 && (
                        <View style={{ flex: 1, height: 2, backgroundColor: wizardStep > step.id ? '#0F172A' : '#E2E8F0', marginHorizontal: 4 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {wizardStep === 1 ? (
              <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24 }}>
                <View style={{ flex: 1 }}>
                  {(!user || String(user.roleId) === '1') && (
                    <View style={{ marginBottom: 20, zIndex: 30 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>Client *</Text>
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
                      />
                    </View>
                  )}

                  <View style={{ marginBottom: 20, zIndex: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>Company *</Text>
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
                      getIsOptionDisabled={(item) => {
                        const selectedIds = selectedCompany ? String(selectedCompany).split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (selectedIds.length === 0) return false;
                        const firstSelected = companies.find(c => String(c.id) === selectedIds[0]);
                        if (!firstSelected) return false;
                        return item.country !== firstSelected.country;
                      }}
                    />
                  </View>

                  {/* Module is auto-detected in the background */}

                  <TouchableOpacity
                    style={[styles.submitBtn, { opacity: selectedClient ? 1 : 0.5, marginTop: 16 }]}
                    disabled={!selectedClient}
                    onPress={() => fetchFormConfiguration(selectedClient, selectedCountry, selectedModule)}
                  >
                    <Text style={styles.submitBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
                    if (companies.length === 1 && user && String(user.roleId) !== '1') {
                      setIsFormOpen(false);
                      setEditingRecord(null);
                      setFormData({});
                      setIsViewOnly(false);
                    } else {
                      setWizardStep(1);
                    }
                  }}
                >
                  <Text style={{ color: '#0F172A', fontWeight: '600' }}>{companies.length === 1 && user && String(user.roleId) !== '1' ? 'Close' : 'Go Back'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 24, paddingBottom: 20 }}>
                  {fieldsLayout.map((section, index) => (
                    <View key={section.id} style={[styles.sectionCard, { zIndex: fieldsLayout.length - index }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.name || 'Section'}</Text>
                      </View>

                      <View style={styles.sectionBody}>
                        {section.fields.map((field, fieldIndex) => {
                          const visibleSubsections = (field.subsections || []).filter(sub => {
                            const parentValue = formData[field.id];

                            // If the parent field has no value yet, hide the subsection
                            if (!parentValue || String(parentValue).trim() === '') {
                              return false;
                            }

                            // If there is a specific trigger value set
                            if (sub.triggerValue && sub.triggerValue.trim() !== '') {
                              // If they accidentally put an API path in the trigger value, ignore it and just show the subsection
                              if (sub.triggerValue.includes('/api/')) {
                                return true;
                              }

                              // Find the label corresponding to this parent value
                              let parentLabel = '';
                              if (field.allowedOptions) {
                                const opt = field.allowedOptions.find(o => String(o.value) === String(parentValue));
                                if (opt) parentLabel = opt.label;
                              }

                              const trigger = String(sub.triggerValue).trim().toLowerCase();

                              // Check if either the ID or the Label matches the trigger value
                              return String(parentValue).trim().toLowerCase() === trigger ||
                                (parentLabel && parentLabel.trim().toLowerCase() === trigger);
                            }

                            // If no trigger value is set, show it as long as the parent has ANY value
                            return true;
                          });
                          const hasSubsections = visibleSubsections.length > 0;

                          return (
                            <View key={field.id} style={[hasSubsections ? styles.fieldContainerFull : styles.fieldContainer, { zIndex: section.fields.length - fieldIndex }]}>
                              <Text style={styles.fieldLabel}>
                                {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                              </Text>
                              {renderField(field)}

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

                        {index === 0 && (
                          <View style={[styles.fieldContainerFull, { zIndex: 0, marginTop: 16 }]}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 16 }}>Item Table</Text>
                            
                            <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'visible', zIndex: 100 }}>
                              {/* Table Header */}
                              <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                                <Text style={{ width: 60, textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: 13 }}>No.</Text>
                                <Text style={{ flex: 1, fontWeight: '600', color: '#475569', fontSize: 13, paddingLeft: 8 }}>Asset Name</Text>
                                <Text style={{ flex: 1.5, fontWeight: '600', color: '#475569', fontSize: 13, paddingLeft: 8 }}>Assigned Barcodes</Text>
                                <Text style={{ width: 100, textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: 13 }}>Qty</Text>
                                <Text style={{ width: 60, textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: 13 }}></Text>
                              </View>

                              {/* Table Rows */}
                              {assetItems.map((item, idx) => (
                                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx === assetItems.length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9', zIndex: assetItems.length - idx }}>
                                  <Text style={{ width: 60, textAlign: 'center', color: '#0F172A', fontSize: 14, fontWeight: '500' }}>{idx + 1}</Text>
                                  
                                  <View style={{ flex: 1, paddingHorizontal: 8, zIndex: 50 }}>
                                    <SearchableDropdown
                                      data={assetOptions.filter(opt => {
                                        const isSelectedElsewhere = assetItems.some((otherRow, otherIdx) => 
                                          otherIdx !== idx && String(otherRow.asset_id) === String(opt.value)
                                        );
                                        return !isSelectedElsewhere;
                                      })}
                                      value={item.asset_id}
                                      onChange={(val) => {
                                        const newItems = [...assetItems];
                                        newItems[idx].asset_id = val;
                                        newItems[idx].barcode = ''; // reset barcode
                                        setAssetItems(newItems);
                                      }}
                                      placeholder="Search asset name..."
                                      searchPlaceholder="Search asset name..."
                                      displayKey="label"
                                      valueKey="value"
                                      disabled={isViewOnly}
                                      renderOption={renderAssetOption}
                                    />
                                  </View>

                                  <View style={{ flex: 1.5, paddingHorizontal: 8, zIndex: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                    {(() => {
                                      const selectedAsset = assetOptions.find(opt => String(opt.value) === String(item.asset_id));
                                      const rawBarcodes = selectedAsset?.rawData?.barcodes || [];
                                      let barcodeData = rawBarcodes.map(b => ({ label: b, value: b }));
                                      
                                      const currentBarcodes = item.barcodes || (item.barcode ? [item.barcode] : []);
                                      const originalBarcodes = item.originalBarcodes || [];
                                      const barcodesToInject = new Set([...currentBarcodes, ...originalBarcodes]);

                                      barcodesToInject.forEach(b => {
                                        if (b && !barcodeData.find(opt => opt.value === b)) {
                                          barcodeData.push({ label: b, value: b });
                                        }
                                      });
                                      
                                      const numDropdowns = parseInt(item.qty) || 1;
                                      const filledBarcodes = currentBarcodes.filter(b => b);
                                      const globalSelectedBarcodes = assetItems.flatMap(i => i.barcodes || (i.barcode ? [i.barcode] : []));

                                      return (
                                        <>
                                          {filledBarcodes.map((bVal, bIdx) => (
                                            <View key={bIdx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' }}>
                                              <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600' }}>{bVal}</Text>
                                              {!isViewOnly && (
                                                <TouchableOpacity onPress={() => {
                                                  const newItems = [...assetItems];
                                                  const updated = currentBarcodes.filter((_, i) => i !== bIdx);
                                                  newItems[idx].barcodes = updated;
                                                  if (updated.length > 0) newItems[idx].barcode = updated[0];
                                                  else newItems[idx].barcode = '';
                                                  setAssetItems(newItems);
                                                }} style={{ marginLeft: 6 }}>
                                                  <Ionicons name="close" size={14} color="#1D4ED8" />
                                                </TouchableOpacity>
                                              )}
                                            </View>
                                          ))}

                                          {!isViewOnly && filledBarcodes.length < numDropdowns && (
                                            <View style={{ minWidth: 180, flex: 1, maxWidth: 250 }}>
                                              <SearchableDropdown
                                                data={barcodeData.filter(opt => !globalSelectedBarcodes.includes(opt.value))}
                                                value=""
                                                onChange={(val) => {
                                                  if (!val) return;
                                                  const newItems = [...assetItems];
                                                  const updated = [...filledBarcodes, val];
                                                  newItems[idx].barcodes = updated;
                                                  if (updated.length > 0) newItems[idx].barcode = updated[0];
                                                  setAssetItems(newItems);
                                                }}
                                                placeholder="+ Add Barcode"
                                                searchPlaceholder="Search..."
                                                displayKey="label"
                                                valueKey="value"
                                                disabled={barcodeData.length === 0}
                                              />
                                            </View>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </View>

                                  <View style={{ width: 100, paddingHorizontal: 8 }}>
                                    <TextInput
                                      style={{ height: 42, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, textAlign: 'center', backgroundColor: isViewOnly ? '#F8FAFC' : '#FFFFFF', color: '#0F172A' }}
                                      value={String(item.qty)}
                                      onChangeText={(val) => {
                                        const newItems = [...assetItems];
                                        newItems[idx].qty = val.replace(/[^0-9]/g, '');
                                        setAssetItems(newItems);
                                      }}
                                      keyboardType="numeric"
                                      editable={!isViewOnly}
                                    />
                                  </View>

                                  <View style={{ width: 60, alignItems: 'center' }}>
                                    {!isViewOnly && (
                                      <TouchableOpacity onPress={() => {
                                        if (assetItems.length > 1) {
                                          setAssetItems(assetItems.filter(i => i.id !== item.id));
                                        }
                                      }}>
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                </View>
                              ))}
                            </View>

                            {!isViewOnly && (
                              <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F1F5F9', alignSelf: 'flex-start', borderRadius: 6 }}
                                onPress={() => setAssetItems([...assetItems, { id: Date.now(), asset_id: '', barcode: '', qty: 1 }])}
                              >
                                <Ionicons name="add" size={18} color="#0284C7" />
                                <Text style={{ marginLeft: 6, color: '#0284C7', fontWeight: '600', fontSize: 13 }}>Add New Row</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: isViewOnly ? 'flex-end' : 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                  {isViewOnly ? (
                    <TouchableOpacity
                      style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 8 }}
                      onPress={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={{ paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#E2E8F0', borderRadius: 8 }}
                        onPress={() => {
                          if (companies.length === 1 && user && String(user.roleId) !== '1') {
                            setIsFormOpen(false);
                            setEditingRecord(null);
                            setFormData({});
                            setIsViewOnly(false);
                          } else {
                            setWizardStep(1);
                          }
                        }}
                      >
                        <Text style={{ color: '#0F172A', fontWeight: '600' }}>{companies.length === 1 && user && String(user.roleId) !== '1' ? 'Cancel' : 'Back'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.submitBtn, { marginTop: 0, marginBottom: 0 }]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={saving}
                      >
                        <Text style={styles.submitBtnText}>{saving ? 'Saving...' : 'Complete & Save'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Validation Error Modal */}
      <Modal visible={!!validationError} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View style={{ width: 340, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="warning" size={32} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Validation Error</Text>
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              {validationError}
            </Text>
            <TouchableOpacity
              style={{ width: '100%', backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={() => setValidationError('')}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
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
});
