import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal, Switch, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
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

export default function PurchaseDetailsTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isEmployee = false;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldsLayout, setFieldsLayout] = useState(null);
  const [customFieldId, setCustomFieldId] = useState(null);
  const [configParams, setConfigParams] = useState({ clientid: null, country_id: null, moduleid: null });
  const [formData, setFormData] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [PurchaseDetailsRecords, setPurchaseDetailsRecords] = useState([]);

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
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [activeBarcodeRowId, setActiveBarcodeRowId] = useState(null);
  const [sNoModalVisible, setSNoModalVisible] = useState(false);
  const [activeSNoRowId, setActiveSNoRowId] = useState(null);

  const [wizardStep, setWizardStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [countries, setCountries] = useState([]);
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [assignedQuantities, setAssignedQuantities] = useState([]);

  // Line Items state
  const [lineItems, setLineItems] = useState([{ id: Date.now(), barcode: '', barcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
  const [uomList, setUomList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [vatList, setVatList] = useState([]);

  useEffect(() => {
    fetchInitialData();
    fetchUomList();
    fetchAssetsList(user?.clientid || user?.client_id);
    fetchVatList();
  }, []);

  const fetchUomList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/uom`);
      if (res.ok) {
        const data = await res.json();
        setUomList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Could not fetch UOM list', e);
    }
  };

  const fetchAssetsList = async (clientId) => {
    try {
      const url = clientId
        ? `${API_URL}/api/asset-details/dropdown?clientid=${clientId}`
        : `${API_URL}/api/asset-details/dropdown`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAssetsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Could not fetch Assets list', e);
    }
  };

  const fetchVatList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/vat`);
      if (res.ok) {
        const data = await res.json();
        setVatList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Could not fetch VAT list', e);
    }
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: Date.now(), barcode: '', barcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
  };

  const removeLineItem = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const isSNoHeader = (val) => {
    const s = String(val).toLowerCase().trim();
    return s === 'serial number' || s === 'serial' || s === 'sn' || s === 's/n' || s === 'sno' || s === 'serial_number';
  };

  const extractSerialsFromSheet = (sheetsData) => {
    if (!Array.isArray(sheetsData) || sheetsData.length === 0) return [];

    let targetColIdx = 0;
    const firstRow = sheetsData[0];
    if (Array.isArray(firstRow)) {
      for (let i = 0; i < firstRow.length; i++) {
        const val = String(firstRow[i] || '').toLowerCase().trim();
        if (val.includes('serial') || val === 'sn' || val === 'sno' || val === 's/n') {
          targetColIdx = i;
          break;
        }
      }
    }

    const results = [];
    for (let rIdx = 0; rIdx < sheetsData.length; rIdx++) {
      const row = sheetsData[rIdx];
      if (!Array.isArray(row)) continue;
      const cellVal = row[targetColIdx];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        const strVal = String(cellVal).trim();
        if (!isSNoHeader(strVal)) {
          results.push(strVal);
        }
      }
    }

    if (results.length === 0 && targetColIdx !== 0) {
      for (let rIdx = 0; rIdx < sheetsData.length; rIdx++) {
        const row = sheetsData[rIdx];
        if (!Array.isArray(row)) continue;
        const cellVal = row[0];
        if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
          const strVal = String(cellVal).trim();
          if (!isSNoHeader(strVal)) {
            results.push(strVal);
          }
        }
      }
    }
    return results;
  };

  const handleSNoFileUpload = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls,.csv,.txt';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (fileExt === 'xlsx' || fileExt === 'xls') {
          reader.onload = (evt) => {
            try {
              const data = new Uint8Array(evt.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              const serials = extractSerialsFromSheet(jsonData);
              if (serials.length > 0) {
                updateLineItem(activeSNoRowId, {
                  qty: serials.length,
                  serial_numbers: serials
                });
                showToast(`Successfully imported ${serials.length} serial numbers`, 'success');
              } else {
                showToast('No serial numbers found in the Excel file', 'error');
              }
            } catch (err) {
              console.error(err);
              showToast('Failed to parse Excel file', 'error');
            }
          };
          reader.readAsArrayBuffer(file);
        } else if (fileExt === 'csv' || fileExt === 'txt') {
          reader.onload = (evt) => {
            try {
              const text = evt.target.result;
              const lines = text.split(/\r?\n/);
              const serials = [];
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (fileExt === 'csv') {
                  const firstCol = trimmed.split(',')[0].trim();
                  if (firstCol && !isSNoHeader(firstCol)) {
                    serials.push(firstCol);
                  }
                } else {
                  if (!isSNoHeader(trimmed)) {
                    serials.push(trimmed);
                  }
                }
              }
              if (serials.length > 0) {
                updateLineItem(activeSNoRowId, {
                  qty: serials.length,
                  serial_numbers: serials
                });
                showToast(`Successfully imported ${serials.length} serial numbers`, 'success');
              } else {
                showToast('No serial numbers found in the file', 'error');
              }
            } catch (err) {
              console.error(err);
              showToast('Failed to parse file', 'error');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  const updateLineItem = (id, fieldOrObj, value) => {
    setLineItems(prev => {
      const globalSelected = prev.flatMap(i => {
        if (i.id === id) return [];
        return i.barcodes || (i.barcode ? [i.barcode] : []);
      });

      return prev.map(item => {
        if (item.id !== id) return item;
        let updated = typeof fieldOrObj === 'object'
          ? { ...item, ...fieldOrObj }
          : { ...item, [fieldOrObj]: value };

        const isQtyChanged = fieldOrObj === 'qty' || (typeof fieldOrObj === 'object' && 'qty' in fieldOrObj);
        if (isQtyChanged) {
          const newQty = parseInt(typeof fieldOrObj === 'object' ? fieldOrObj.qty : value) || 0;
          let currentBarcodes = [...(item.barcodes || (item.barcode ? [item.barcode] : []))];
          if (newQty < currentBarcodes.length) {
            currentBarcodes = currentBarcodes.slice(0, newQty);
          } else if (newQty > currentBarcodes.length) {
            const selectedAsset = assetsList.find(a => String(a.name) === String(item.item_name));
            if (selectedAsset && Array.isArray(selectedAsset.barcodes)) {
              const available = selectedAsset.barcodes.filter(b =>
                !globalSelected.includes(b) && !currentBarcodes.includes(b)
              );
              const needed = newQty - currentBarcodes.length;
              const toAdd = available.slice(0, needed);
              currentBarcodes = [...currentBarcodes, ...toAdd];
            }
          }
          updated.barcodes = currentBarcodes;
          updated.barcode = currentBarcodes.length > 0 ? currentBarcodes[0] : '';

          let currentSNo = [...(updated.serial_numbers || [])];
          if (newQty < currentSNo.length) {
            currentSNo = currentSNo.slice(0, newQty);
          } else if (newQty > currentSNo.length) {
            const diff = newQty - currentSNo.length;
            for (let i = 0; i < diff; i++) {
              currentSNo.push('');
            }
          }
          updated.serial_numbers = currentSNo;
        }

        const isItemNameChanged = fieldOrObj === 'item_name' || (typeof fieldOrObj === 'object' && 'item_name' in fieldOrObj);
        if (isItemNameChanged) {
          const itemNameValue = typeof fieldOrObj === 'object' ? fieldOrObj.item_name : value;
          const selectedAsset = assetsList.find(a => String(a.name) === String(itemNameValue));
          if (selectedAsset) {
            // Set default UOM from asset details if present
            if (selectedAsset.details) {
              const assetUom = selectedAsset.details.UOM || selectedAsset.details.uom;
              if (assetUom) {
                const matchedUom = uomList.find(u =>
                  String(u.id) === String(assetUom) ||
                  String(u.uom_name).toLowerCase() === String(assetUom).toLowerCase()
                );
                if (matchedUom) {
                  updated.uom = matchedUom.uom_name;
                } else {
                  updated.uom = assetUom;
                }
              }
            }

            if (Array.isArray(selectedAsset.barcodes)) {
              const available = selectedAsset.barcodes.filter(b => !globalSelected.includes(b));
              const numToAssign = parseInt(updated.qty) || 1;
              const toAdd = available.slice(0, numToAssign);
              updated.barcodes = toAdd;
              updated.barcode = toAdd.length > 0 ? toAdd[0] : '';
            } else {
              updated.barcodes = [];
              updated.barcode = '';
            }
          } else {
            updated.barcodes = [];
            updated.barcode = '';
          }
        }

        const qty = parseFloat(updated.qty) || 0;
        const price = parseFloat(updated.unit_price) || 0;
        const vat = parseFloat(updated.vat) || 0;
        updated.subtotal = (qty * price * (1 + vat / 100)).toFixed(2);
        return updated;
      });
    });
  };

  const grandTotal = lineItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0).toFixed(2);
  const assetOptions = [{ label: '-- Item --', value: '', rawData: null }, ...assetsList.map(asset => ({ label: asset.name, value: asset.name, rawData: asset }))];
  const uomOptions = [{ label: '-- UOM --', value: '' }, ...uomList.map(u => ({ label: u.uom_name, value: u.uom_name }))];
  const vatOptions = (() => {
    const options = [{ label: '0%', value: 0 }];
    const seen = new Set(['0%']);
    vatList.forEach(v => {
      const isNum = !isNaN(parseFloat(v.vat));
      const labelText = isNum ? `${parseFloat(v.vat)}%` : v.vat;
      if (!seen.has(labelText)) {
        seen.add(labelText);
        options.push({ label: labelText, value: v.vat });
      }
    });
    return options;
  })();

  const fetchInitialData = async () => {
    try {
      const [clientsRes, countriesRes, modulesRes, recordsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/countries`),
        fetch(`${API_URL}/api/modules`),
        fetch(`${API_URL}/api/purchases${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`)
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
      setPurchaseDetailsRecords(Array.isArray(recordsData) ? recordsData : []);

      // Try to set defaults if available
      const clientVal = user?.client_id || user?.clientid;
      if (clientVal) {
        setSelectedClient(String(clientVal));
        await fetchCompaniesForClient(String(clientVal));
      }
      if (user?.country_id || user?.countryid) setSelectedCountry(String(user?.country_id || user?.countryid));
      if (user?.company_id || user?.companyid) setSelectedCompany(String(user?.company_id || user?.companyid));
      const viModule = (modulesData || []).find(m => m.module_name && m.module_name.toLowerCase().includes('purchase') && m.module_name.toLowerCase().includes('detail'));
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
    setLineItems([{ id: Date.now(), barcode: '', barcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
    setAssignedQuantities([]);
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
      // Load assets scoped to this client ID
      await fetchAssetsList(clientId);

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
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                let displayName = '';
                // If item has field_data (e.g. suppliers, assets), extract first value from it as the display name
                if (item.field_data && typeof item.field_data === 'object') {
                  const firstVal = Object.values(item.field_data)[0];
                  if (firstVal && typeof firstVal === 'string') displayName = firstVal;
                }
                if (!displayName) {
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
                  if (nameKey) displayName = String(item[nameKey]);
                }
                if (!displayName) {
                  const firstKey = Object.keys(item)[0];
                  displayName = firstKey ? String(item[firstKey]) : '';
                }

                return displayName;
              }
              return String(item);
            }).filter(Boolean);
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
    
    // Fetch assigned quantities
    try {
      const assignedRes = await fetch(`${API_URL}/api/purchases/${record.id}/assigned-quantities`);
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        setAssignedQuantities(assignedData || []);
      } else {
        setAssignedQuantities([]);
      }
    } catch (err) {
      console.warn('Could not fetch assigned quantities', err);
      setAssignedQuantities([]);
    }
    // Pre-populate form data from the record
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    // Restore line items if any
    if (record.line_items) {
      try {
        const items = typeof record.line_items === 'string' ? JSON.parse(record.line_items) : record.line_items;
        setLineItems(Array.isArray(items) && items.length > 0 ? items.map(item => ({
          ...item,
          barcodes: item.barcodes || (item.barcode ? [item.barcode] : []),
          originalBarcodes: item.barcodes || (item.barcode ? [item.barcode] : []),
          serial_numbers: item.serial_numbers || []
        })) : [{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
      } catch (e) { setLineItems([{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]); }
    } else {
      setLineItems([{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
    }
    // Set wizard selectors to match the record
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''));
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
    
    // Fetch assigned quantities
    try {
      const assignedRes = await fetch(`${API_URL}/api/purchases/${record.id}/assigned-quantities`);
      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        setAssignedQuantities(assignedData || []);
      } else {
        setAssignedQuantities([]);
      }
    } catch (err) {
      console.warn('Could not fetch assigned quantities', err);
      setAssignedQuantities([]);
    }
    // Pre-populate form data from the record
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) { }
    }
    setFormData(parsed);
    // Restore line items if any
    if (record.line_items) {
      try {
        const items = typeof record.line_items === 'string' ? JSON.parse(record.line_items) : record.line_items;
        setLineItems(Array.isArray(items) && items.length > 0 ? items.map(item => ({
          ...item,
          barcodes: item.barcodes || (item.barcode ? [item.barcode] : []),
          originalBarcodes: item.barcodes || (item.barcode ? [item.barcode] : []),
          serial_numbers: item.serial_numbers || []
        })) : [{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
      } catch (e) { setLineItems([{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]); }
    } else {
      setLineItems([{ id: Date.now(), barcode: '', barcodes: [], originalBarcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
    }
    // Set wizard selectors to match the record
    setSelectedClient(String(record.clientid || ''));
    setSelectedCountry(String(record.country_id || ''));
    setSelectedModule(String(record.moduleid || ''));
    await fetchCompaniesForClient(String(record.clientid || ''));
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
      const res = await fetch(`${API_URL}/api/purchases/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete Purchase details record');

      showToast('Purchase details record deleted successfully', 'success');
      setDeleteModalVisible(false);
      setRecordToDelete(null);
      fetchInitialData(); // Refresh the list
    } catch (error) {
      console.error(error);
      showToast('Error deleting Purchase details record', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validation against already assigned quantities
      if (editingRecord) {
        for (const aq of assignedQuantities) {
          const matchedItem = lineItems.find(item => 
            item.item_name && String(item.item_name).trim().toLowerCase() === String(aq.item_name).trim().toLowerCase()
          );
          if (!matchedItem) {
            showToast(`Cannot remove item "${aq.item_name}" because it has ${aq.assigned_qty} already assigned assets.`, 'error');
            setSaving(false);
            return;
          }
          const itemQty = parseInt(matchedItem.qty, 10) || 0;
          if (itemQty < aq.assigned_qty) {
            showToast(`Quantity for "${aq.item_name}" cannot be less than already assigned assets (${aq.assigned_qty}).`, 'error');
            setSaving(false);
            return;
          }
        }
      }
      const payload = {
        custom_field_id: customFieldId,
        field_data: formData,
        line_items: lineItems,
        clientid: configParams.clientid,
        country_id: configParams.country_id,
        moduleid: configParams.moduleid,
        company_id: selectedCompany || null,
        roleid: user ? user.roleId : null,
        user_id: user ? user.id : null
      };

      const isEditing = !!editingRecord;
      const url = isEditing
        ? `${API_URL}/api/purchases/${editingRecord.id}`
        : `${API_URL}/api/purchases`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'save'} Purchase details`);

      showToast(isEditing ? 'Purchase details record updated successfully!' : 'Form submitted successfully!', 'success');
      setIsFormOpen(false);
      setEditingRecord(null);
      setFormData({});
      setLineItems([{ id: Date.now(), barcode: '', barcodes: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
      fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast('Error saving Purchase details', 'error');
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
      case 'Single Checkbox': {
        const val = !!formData[field.id];
        return (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10 }}
            onPress={() => !isViewOnly && handleInputChange(field.id, !val)}
            activeOpacity={isViewOnly ? 1 : 0.8}
          >
            <View style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: val ? (isViewOnly ? '#94A3B8' : COLORS.primary) : '#CBD5E1',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#FFFFFF'
            }}>
              {val && (
                <Ionicons name="checkmark" size={14} color={isViewOnly ? '#94A3B8' : COLORS.primary} />
              )}
            </View>
            <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>
              {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
            </Text>
          </TouchableOpacity>
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
      {/* MAIN HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Purchase Details</Text>
          <Text style={styles.headerSubtitle}>Manage your Purchase details records.</Text>
        </View>
        {!isEmployee && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddNewRecord}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Purchase Details</Text>
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
                <Ionicons name="car-sport" size={40} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' }}>
                Purchase Registration Entry
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22, maxWidth: 440 }}>
                Please register the Purchase specifications and details. All records are processed securely.
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
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Add Purchase Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          PurchaseDetailsRecords.length === 0 && !searchQuery ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>No Purchase details records found.</Text>
              <Text style={styles.emptyStateSubtext}>Click 'Add Purchase Details' to create a new record.</Text>
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
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Company</Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Module Info</Text>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Supplier Name</Text>
                <Text style={{ flex: 1.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Employee</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>View</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Edit</Text>
                <Text style={{ flex: 0.5, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Delete</Text>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                {(() => {
                  const filtered = PurchaseDetailsRecords.filter(r => {
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
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '500' }} numberOfLines={1}>{record.company_name || 'N/A'}</Text>
                            </View>

                            <View style={{ flex: 1.5, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>{moduleName}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Created: {new Date(record.created_at).toLocaleDateString()}</Text>
                            </View>
                            <View style={{ flex: 2, paddingRight: 10 }}>
                              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500', marginBottom: 4 }} numberOfLines={1}>{String(firstValue)}</Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8' }} numberOfLines={1}>Field: {firstKey}</Text>
                              {(() => {
                                let parsedLineItems = [];
                                if (record.line_items) {
                                  try {
                                    parsedLineItems = typeof record.line_items === 'string' ? JSON.parse(record.line_items) : record.line_items;
                                  } catch (e) { }
                                }
                                const serialsList = (parsedLineItems || [])
                                  .flatMap(item => item.serial_numbers || (item.serial_number ? [item.serial_number] : []))
                                  .filter(s => s && String(s).trim() !== '');

                                if (serialsList.length === 0) return null;
                                return (
                                  <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                                    S/Ns: {serialsList.join(', ')}
                                  </Text>
                                );
                              })()}
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
                const filtered = PurchaseDetailsRecords.filter(r => {
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
              This will permanently delete the selected Purchase details record. This action cannot be undone and will be completely removed from the database.
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
                <Text style={styles.modalTitle}>{isViewOnly ? `View Purchase Details Record #${editingRecord?.id}` : (editingRecord ? `Edit Purchase Details Record #${editingRecord.id}` : 'Add Purchase Details')}</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsFormOpen(false); setEditingRecord(null); setFormData({}); setIsViewOnly(false); }} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {/* WIZARD PROGRESS BAR */}
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
                <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 24, paddingBottom: 8 }}>
                  {fieldsLayout.map((section, index) => (
                    <View key={section.id} style={[styles.sectionCard, { zIndex: fieldsLayout.length - index }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{section.name || 'Section'}</Text>
                      </View>

                      <View style={styles.sectionBody}>
                        {section.fields.map((field, fieldIndex) => {
                          const visibleSubsections = (field.subsections || []).filter(sub => {
                            // If triggerValue is not set or is empty, show it by default
                            if (!sub.triggerValue || sub.triggerValue.trim() === '') {
                              return true;
                            }
                            // Otherwise, only show if it matches the parent field value
                            const parentValue = formData[field.id];
                            return parentValue && String(parentValue).trim().toLowerCase() === String(sub.triggerValue).trim().toLowerCase();
                          });
                          const hasSubsections = visibleSubsections.length > 0;
                          const isFullWidthField = hasSubsections || field.name?.toLowerCase().includes('remarks') || field.type?.toLowerCase().includes('textarea');

                          return (
                            <View key={field.id} style={[isFullWidthField ? styles.fieldContainerFull : styles.fieldContainer, { zIndex: section.fields.length - fieldIndex }]}>
                              {field.type !== 'Single Checkbox' && (
                                <Text style={styles.fieldLabel}>
                                  {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                                </Text>
                              )}
                              {renderField(field)}

                              {/* Render subsections if any are visible */}
                              {hasSubsections && (
                                <View style={styles.subsectionsContainer}>
                                  {visibleSubsections.map((sub, subIndex) => (
                                    <View key={sub.id} style={[styles.subsectionCard, { zIndex: visibleSubsections.length - subIndex, position: 'relative' }]}>
                                      <Text style={styles.subsectionTitle}>{sub.name}</Text>
                                      <View style={styles.subsectionBody}>
                                        {sub.fields.map((sf, sfIndex) => {
                                          const isSubFullWidth = sf.name?.toLowerCase().includes('remarks') || sf.type?.toLowerCase().includes('textarea');
                                          return (
                                            <View key={sf.id} style={[isSubFullWidth ? styles.fieldContainerFull : styles.fieldContainer, { zIndex: sub.fields.length - sfIndex }]}>
                                              {sf.type !== 'Single Checkbox' && (
                                                <Text style={styles.fieldLabel}>
                                                  {sf.name} {sf.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                                                </Text>
                                              )}
                                              {renderField(sf)}
                                            </View>
                                          );
                                        })}
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
                  {/* LINE ITEMS TABLE */}
                  {/* LINE ITEMS TABLE */}
                  <View style={{ marginHorizontal: 24, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'visible', zIndex: 50 }}>
                    {/* Section Header */}
                    <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Line Items</Text>
                      {!isViewOnly && (
                        <TouchableOpacity
                          onPress={addLineItem}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                        >
                          <Ionicons name="add" size={14} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Add Item</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                      <Text style={{ flex: 0.4, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>No.</Text>
                      <Text style={{ flex: 2.4, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Asset Name</Text>
                      <Text style={{ flex: 0.7, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Qty</Text>
                      <Text style={{ flex: 0.9, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>UOM</Text>
                      <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Unit Price</Text>
                      <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>VAT (%)</Text>
                      <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Subtotal</Text>
                      <Text style={{ flex: 0.8, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', textAlign: 'center' }}>SNo</Text>
                      {!isViewOnly && <Text style={{ flex: 0.6, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', textAlign: 'center' }}>Action</Text>}
                    </View>

                    {/* Table Rows */}
                    {lineItems.map((item, index) => {
                      const match = editingRecord && assignedQuantities.find(aq => 
                        aq.item_name && String(aq.item_name).trim().toLowerCase() === String(item.item_name).trim().toLowerCase()
                      );
                      const isQtyInvalid = match && (parseInt(item.qty, 10) || 0) < match.assigned_qty;

                      return (
                        <View key={item.id} style={{ borderBottomWidth: index < lineItems.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF', zIndex: lineItems.length - index, position: 'relative', paddingVertical: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                            {/* No. */}
                            <Text style={{ flex: 0.4, fontSize: 13, fontWeight: '700', color: '#94A3B8' }}>{index + 1}</Text>

                            {/* Item Name */}
                            <View style={{ flex: 2.4, paddingRight: 8 }}>
                              <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA', height: 35, justifyContent: 'center' }}>
                                <CustomDropdown
                                  selectedValue={item.item_name}
                                  onValueChange={(val) => updateLineItem(item.id, 'item_name', val)}
                                  options={assetOptions.filter(opt => {
                                    if (opt.value === '' || opt.value === item.item_name) return true;
                                    const otherChosen = lineItems
                                      .filter(li => li.id !== item.id)
                                      .map(li => li.item_name);
                                    return !otherChosen.includes(opt.value);
                                  })}
                                  disabled={isViewOnly}
                                />
                              </View>
                            </View>

                            {/* Qty */}
                            <View style={{ flex: 0.7, paddingRight: 8 }}>
                              <View>
                                <TextInput
                                  style={{ borderWidth: 1, borderColor: isQtyInvalid ? COLORS.error : '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: isViewOnly ? '#64748B' : '#1E293B', backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA', textAlign: 'center', outlineStyle: 'none' }}
                                  placeholder="1"
                                  placeholderTextColor="#94A3B8"
                                  value={String(item.qty)}
                                  onChangeText={(val) => updateLineItem(item.id, 'qty', val)}
                                  onBlur={() => {
                                    const minAllowed = match ? match.assigned_qty : 1; 
                                    const enteredQty = parseInt(item.qty, 10) || 0;
                                    
                                    if (enteredQty < minAllowed) {
                                      updateLineItem(item.id, 'qty', minAllowed);
                                      showToast(`Quantity cannot be less than already assigned quantity. Reset to minimum: ${minAllowed}.`, 'warning');
                                    }
                                  }}
                                  keyboardType="numeric"
                                  editable={!isViewOnly}
                                />
                                {match && match.assigned_qty > 0 && (
                                  <Text style={{ fontSize: 9, color: isQtyInvalid ? COLORS.error : '#64748B', marginTop: 2, textAlign: 'center', fontWeight: '600' }}>
                                    Assigned: {match.assigned_qty}
                                  </Text>
                                )}
                              </View>
                            </View>

                            {/* UOM Dropdown */}
                            <View style={{ flex: 0.9, paddingRight: 8 }}>
                              <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA', height: 35, justifyContent: 'center' }}>
                                <CustomDropdown
                                  selectedValue={item.uom}
                                  onValueChange={(val) => updateLineItem(item.id, 'uom', val)}
                                  options={uomOptions}
                                  disabled={isViewOnly}
                                />
                              </View>
                            </View>

                            {/* Unit Price */}
                            <View style={{ flex: 1.1, paddingRight: 8 }}>
                              <TextInput
                                style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: isViewOnly ? '#64748B' : '#1E293B', backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA', textAlign: 'right', outlineStyle: 'none' }}
                                placeholder="0.00"
                                placeholderTextColor="#94A3B8"
                                value={String(item.unit_price)}
                                onChangeText={(val) => updateLineItem(item.id, 'unit_price', val)}
                                keyboardType="numeric"
                                editable={!isViewOnly}
                              />
                            </View>

                            {/* VAT (%) */}
                            <View style={{ flex: 1.2, paddingRight: 8 }}>
                              <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA', height: 35, justifyContent: 'center' }}>
                                <CustomDropdown
                                  selectedValue={item.vat}
                                  onValueChange={(val) => updateLineItem(item.id, 'vat', val)}
                                  options={vatOptions}
                                  disabled={isViewOnly}
                                />
                              </View>
                            </View>

                            {/* Subtotal (Read Only) */}
                            <View style={{ flex: 1.2, paddingRight: 8 }}>
                              <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#F8FAFC' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'right' }}>{parseFloat(item.subtotal || 0).toFixed(2)}</Text>
                              </View>
                            </View>

                            {/* SNo Column Button */}
                            <View style={{ flex: 0.8, paddingRight: 8, alignItems: 'center' }}>
                              <TouchableOpacity
                                onPress={() => {
                                  setActiveSNoRowId(item.id);
                                  setSNoModalVisible(true);
                                }}
                                style={{
                                  backgroundColor: '#E2E8F0',
                                  paddingHorizontal: 8,
                                  paddingVertical: 8,
                                  borderRadius: 6,
                                  height: 35,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  width: '100%'
                                }}
                              >
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#1E293B' }}>{isViewOnly ? 'View SNo' : 'Add SNo'}</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Delete Button */}
                            {!isViewOnly && (
                              <View style={{ flex: 0.6, alignItems: 'center' }}>
                                <TouchableOpacity
                                  onPress={() => removeLineItem(item.id)}
                                  disabled={lineItems.length === 1}
                                  style={{ opacity: lineItems.length === 1 ? 0.3 : 1 }}
                                >
                                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>

                          {/* Row-Level Validation Warning */}
                          {isQtyInvalid && (
                            <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#FEE2E2', marginHorizontal: 12 }}>
                              <Ionicons name="alert-circle" size={14} color={COLORS.error} />
                              <Text style={{ fontSize: 11, color: '#991B1B', fontWeight: '600' }}>
                                Quantity for "{item.item_name || 'Asset'}" cannot be less than already assigned assets ({match.assigned_qty}).
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {/* Grand Total Footer */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Grand Total:</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.primary, minWidth: 80, textAlign: 'right' }}>{grandTotal}</Text>
                    </View>
                  </View>

                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: isViewOnly ? 'flex-end' : 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
                   {isViewOnly ? (
                    <TouchableOpacity
                      style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 8 }}
                      onPress={() => { 
                        setIsFormOpen(false); 
                        setEditingRecord(null); 
                        setFormData({}); 
                        setLineItems([{ id: Date.now(), barcode: '', barcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
                        setIsViewOnly(false); 
                      }}
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
                            setLineItems([{ id: Date.now(), barcode: '', barcodes: [], serial_numbers: [], item_name: '', qty: 1, uom: '', unit_price: 0, vat: 0, subtotal: 0 }]);
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

      {/* Barcode Manager Modal */}
      <Modal
        visible={barcodeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setBarcodeModalVisible(false);
          setActiveBarcodeRowId(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <View style={{ width: 450, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            {(() => {
              const activeItem = lineItems.find(i => i.id === activeBarcodeRowId);
              if (!activeItem) return null;

              const selectedAsset = assetsList.find(a => String(a.name) === String(activeItem.item_name));
              const rawBarcodes = selectedAsset?.barcodes || [];
              let barcodeData = rawBarcodes.map(b => ({ label: b, value: b }));

              const currentBarcodes = activeItem.barcodes || (activeItem.barcode ? [activeItem.barcode] : []);
              const originalBarcodes = activeItem.originalBarcodes || [];
              const barcodesToInject = new Set([...currentBarcodes, ...originalBarcodes]);

              barcodesToInject.forEach(b => {
                if (b && !barcodeData.find(opt => opt.value === b)) {
                  barcodeData.push({ label: b, value: b });
                }
              });

              const numDropdowns = parseInt(activeItem.qty) || 1;
              const filledBarcodes = currentBarcodes.filter(b => b);
              const globalSelectedBarcodes = lineItems.flatMap(i => i.barcodes || (i.barcode ? [i.barcode] : []));

              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="barcode-outline" size={22} color={COLORS.primary} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Manage Barcodes</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setBarcodeModalVisible(false); setActiveBarcodeRowId(null); }}>
                      <Ionicons name="close" size={22} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Asset Name</Text>
                    <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '500' }}>{activeItem.item_name || '--'}</Text>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                      Assigned Barcodes ({filledBarcodes.length} / {numDropdowns})
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                      {filledBarcodes.map((bVal, bIdx) => (
                        <View key={bIdx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' }}>
                          <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600' }}>{bVal}</Text>
                          {!isViewOnly && (
                            <TouchableOpacity onPress={() => {
                              const updated = currentBarcodes.filter((_, i) => i !== bIdx);
                              updateLineItem(activeItem.id, {
                                barcodes: updated,
                                barcode: updated.length > 0 ? updated[0] : ''
                              });
                            }} style={{ marginLeft: 6 }}>
                              <Ionicons name="close" size={14} color="#1D4ED8" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {filledBarcodes.length === 0 && (
                        <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No barcodes assigned.</Text>
                      )}
                    </View>

                    {!isViewOnly && filledBarcodes.length < numDropdowns && (
                      <View style={{ marginTop: 8 }}>
                        <SearchableDropdown
                          data={barcodeData.filter(opt => !globalSelectedBarcodes.includes(opt.value))}
                          value=""
                          onChange={(val) => {
                            if (!val) return;
                            const updated = [...filledBarcodes, val];
                            updateLineItem(activeItem.id, {
                              barcodes: updated,
                              barcode: updated[0]
                            });
                          }}
                          placeholder="+ Add Barcode"
                          searchPlaceholder="Search barcode..."
                          displayKey="label"
                          valueKey="value"
                          disabled={barcodeData.length === 0}
                        />
                      </View>
                    )}
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 }}
                      onPress={() => { setBarcodeModalVisible(false); setActiveBarcodeRowId(null); }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Serial Number Manager Modal */}
      <Modal
        visible={sNoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSNoModalVisible(false);
          setActiveSNoRowId(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <View style={{ width: 400, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
            {(() => {
              const activeItem = lineItems.find(i => i.id === activeSNoRowId);
              if (!activeItem) return null;

              const numDropdowns = parseInt(activeItem.qty) || 1;

              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="list-outline" size={22} color={COLORS.primary} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>Manage Serial Numbers</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSNoModalVisible(false); setActiveSNoRowId(null); }}>
                      <Ionicons name="close" size={22} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Asset Name</Text>
                    <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '500' }}>{activeItem.item_name || '--'}</Text>
                  </View>

                  {!isViewOnly && (
                    <TouchableOpacity
                      onPress={handleSNoFileUpload}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FAFAFA',
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: COLORS.primary,
                        borderStyle: 'dashed',
                        marginBottom: 16,
                        gap: 8,
                      }}
                    >
                      <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>
                        Import from Excel / CSV / TXT
                      </Text>
                    </TouchableOpacity>
                  )}

                  <ScrollView style={{ maxHeight: 300, marginBottom: 20 }}>
                    {Array.from({ length: numDropdowns }).map((_, idx) => {
                      const currentSNoList = activeItem.serial_numbers || [];
                      const val = currentSNoList[idx] || '';
                      return (
                        <View key={idx} style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 }}>Unit #{idx + 1} Serial Number</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#0F172A', backgroundColor: isViewOnly ? '#F1F5F9' : '#FFFFFF', outlineStyle: 'none' }}
                            value={val}
                            editable={!isViewOnly}
                            onChangeText={(text) => {
                              const updatedSNo = [...currentSNoList];
                              while (updatedSNo.length <= idx) {
                                updatedSNo.push('');
                              }
                              updatedSNo[idx] = text;
                              updateLineItem(activeItem.id, 'serial_numbers', updatedSNo);
                            }}
                            placeholder="Enter serial number..."
                          />
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 }}
                      onPress={() => { setSNoModalVisible(false); setActiveSNoRowId(null); }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
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
    maxWidth: 1400,
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
  }
});
