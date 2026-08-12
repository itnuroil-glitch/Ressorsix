import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { API_URL } from '../config';

const MODULE_ID = 57;

// Simple custom Searchable Dropdown for enterprise components
const SearchableDropdown = ({
  data = [],
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  displayKey = 'name',
  valueKey = 'id',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedItem = data.find(
    (item) => String(item[valueKey]) === String(value) || item[displayKey] === value
  );
  const displayLabel = selectedItem ? selectedItem[displayKey] : value || placeholder;

  const filteredData = data.filter((item) => {
    const val = item[displayKey] || '';
    return String(val).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1 }}>
      <TouchableOpacity
        style={[
          styles.dropdownHeader,
          disabled && styles.disabledDropdown,
          isOpen && styles.activeDropdownHeader,
        ]}
        onPress={() => !disabled && setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownLabel, !selectedItem && !value && styles.placeholderText]} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownBody}>
          <View style={styles.dropdownSearchWrapper}>
            <Ionicons name="search" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder={searchPlaceholder || 'Search...'}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#94A3B8"
              autoFocus
            />
          </View>

          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filteredData.length > 0 ? (
              filteredData.map((item, idx) => {
                const itemVal = item[valueKey] || item[displayKey];
                const itemLabel = item[displayKey];
                const isSelected = String(itemVal) === String(value) || itemLabel === value;

                return (
                  <TouchableOpacity
                    key={item[valueKey] || idx}
                    style={[styles.dropdownItem, isSelected && styles.selectedDropdownItem]}
                    onPress={() => {
                      onChange(itemVal);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.selectedDropdownItemText]}>
                      {itemLabel}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#004D34" />}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>No options found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const UsageChargesTab = ({
  user,
  showToast,
  isSidebarCollapsed,
  permissions = {},
  checkRowPermission,
  moduleId = 57,
  pageTitle = 'Usage Charges',
  pageSubtitle = 'Manage telecom usage charges records.',
  addBtnText = 'Add Usage Charge',
  headerIcon = 'receipt-outline',
}) => {
  const singularTitle = pageTitle.endsWith('s') ? pageTitle.slice(0, -1) : pageTitle;
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const canCreate = permissions.canCreate !== false;
  const canEdit = permissions.canEdit !== false;
  const canDelete = permissions.canDelete !== false;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Lists for Dropdowns
  const [clientsList, setClientsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [telecomBillsList, setTelecomBillsList] = useState([]);
  const [simDetailsList, setSimDetailsList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);

  // Modal & Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  // Configuration Step Selection
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(1);

  // Dynamic Custom Fields
  const [customFields, setCustomFields] = useState(null);
  const [fieldsLayout, setFieldsLayout] = useState([]);
  const [formData, setFormData] = useState({});

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [teleDocTypesList, setTeleDocTypesList] = useState([]);
  const [parsingPdf, setParsingPdf] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchRecords(),
      fetchClients(),
      fetchCompanies(),
      fetchTelecomBills(),
      fetchSimDetails(),
      fetchCountries(),
      fetchTeleDocTypes(),
    ]);
    setLoading(false);
  };

  const apiEndpoint = (moduleId === 61 || String(moduleId) === '61') ? '/api/tele-documents' : '/api/usage-charges';

  const fetchRecords = async () => {
    try {
      const url = moduleId ? `${API_URL}${apiEndpoint}?moduleid=${moduleId}` : `${API_URL}${apiEndpoint}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients`);
      if (res.ok) {
        const data = await res.json();
        setClientsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const fetchCompanies = async (cId) => {
    try {
      const url = cId ? `${API_URL}/api/companies/client/${cId}` : `${API_URL}/api/companies`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompaniesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchTelecomBills = async () => {
    try {
      const res = await fetch(`${API_URL}/api/telecom-bills`);
      if (res.ok) {
        const data = await res.json();
        setTelecomBillsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const fetchSimDetails = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sim-details`);
      if (res.ok) {
        const data = await res.json();
        setSimDetailsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${API_URL}/api/countries`);
      if (res.ok) {
        const data = await res.json();
        setCountriesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const fetchTeleDocTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tele-doc-types`);
      if (res.ok) {
        const data = await res.json();
        setTeleDocTypesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
  };

  const fetchDynamicOptions = async (dynamicPath) => {
    try {
      const cleanPath = (dynamicPath || '').trim().replace(/[\.\s\/]+$/g, '');
      if (!cleanPath) return [];
      const url = cleanPath.startsWith('http') ? cleanPath : `${API_URL}${cleanPath}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(item => {
        if (typeof item === 'string') return item;
        const fd = typeof item.field_data === 'string' ? JSON.parse(item.field_data || '{}') : (item.field_data || {});
        return item.doc_type_name || item.charge_type_name || item.company_name || item.name || item.title || item.client_name ||
          fd['Mobile Number / Account'] || fd['Mobile Number'] || fd['SIM Number / ICCID'] || fd['Account Number'] ||
          item.mobile_account || item.mobile_number || item.sim_number || `Item #${item.id || item.tele_id || item.doc_id}`;
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  const fetchCustomFields = async () => {
    try {
      const cId = selectedClient || user?.clientid || '';
      const url = cId
        ? `${API_URL}/api/custom-fields/permissioned-fields?clientid=${cId}&moduleid=${moduleId}`
        : `${API_URL}/api/custom-fields/module/${moduleId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const cfObj = Array.isArray(data) ? data[0] : data;
        setCustomFields(cfObj || null);
        if (cfObj && cfObj.field_data) {
          const parsed = typeof cfObj.field_data === 'string' ? JSON.parse(cfObj.field_data) : cfObj.field_data;
          const rawSections = Array.isArray(parsed) ? parsed : [];

          const processedSections = await Promise.all(rawSections.map(async (sec) => {
            const processedFields = await Promise.all((sec.fields || []).map(async (f) => {
              let updatedField = { ...f };
              if (f.optionSource === 'dynamic' && f.dynamicPath) {
                const dynOpts = await fetchDynamicOptions(f.dynamicPath);
                updatedField.allowedOptions = dynOpts;
              }
              if (f.subsections && f.subsections.length > 0) {
                const updatedSubs = await Promise.all(f.subsections.map(async (sub) => {
                  const subFields = await Promise.all((sub.fields || []).map(async (sf) => {
                    let updatedSf = { ...sf };
                    if (sf.optionSource === 'dynamic' && sf.dynamicPath) {
                      const sfDynOpts = await fetchDynamicOptions(sf.dynamicPath);
                      updatedSf.allowedOptions = sfDynOpts;
                    }
                    return updatedSf;
                  }));
                  return { ...sub, fields: subFields };
                }));
                updatedField.subsections = updatedSubs;
              }
              return updatedField;
            }));
            return { ...sec, fields: processedFields };
          }));

          setFieldsLayout(processedSections);
        }
      }
    } catch (err) {
      console.error('Error loading custom fields:', err);
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setIsViewOnly(false);
    setWizardStep(1);
    const initialClient = user?.clientid ? String(user.clientid) : '';
    setSelectedClient(initialClient);
    setSelectedCompany('');
    fetchCompanies(initialClient);
    setFormData({});
    setIsModalOpen(true);
  };

  const openViewModal = (record) => {
    setEditingRecord(record);
    setIsViewOnly(true);
    populateRecordData(record);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setIsViewOnly(false);
    populateRecordData(record);
  };

  const populateRecordData = (record) => {
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) {}
    }
    const recClient = String(record.clientid || user?.clientid || '');
    const recCompany = String(record.company_id || parsed.Company || parsed.company_id || '');
    setSelectedClient(recClient);
    setSelectedCompany(recCompany);
    fetchCompanies(recClient);
    setFormData({
      ...parsed,
      Company: recCompany,
      status: record.status || parsed.status || 'Active'
    });
    setWizardStep(2);
    fetchCustomFields();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setIsViewOnly(false);
    setWizardStep(1);
    setFormData({});
  };

  const handleClientChange = (val) => {
    setSelectedClient(val);
    setSelectedCompany('');
    fetchCompanies(val);
  };

  const handleNextStep = async () => {
    if (!selectedClient) {
      showToast('Please select a Client.', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      Company: selectedCompany,
      company_id: selectedCompany
    }));
    await fetchCustomFields();
    setWizardStep(2);
  };

  const handleInputChange = (fieldKey, value, secondaryKey) => {
    if (isViewOnly) return;
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value,
      ...(secondaryKey ? { [secondaryKey]: value } : {})
    }));
  };

  const handleAutoFillFromPdf = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingPdf(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target.result;
        const res = await fetch(`${API_URL}/api/pdf/parse-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_base64: base64String,
            file_name: file.name
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to extract PDF data');
        }

        const ext = data.extractedData || {};

        // Match company in companiesList if matched
        let compName = '';
        if (ext.company_id) {
          const foundComp = companiesList.find(c => String(c.id) === String(ext.company_id));
          if (foundComp) compName = foundComp.company_name;
        }

        // Match doc type in teleDocTypesList
        let docTypeName = '';
        if (ext.doc_type_id) {
          const foundDt = teleDocTypesList.find(dt => String(dt.id) === String(ext.doc_type_id));
          if (foundDt) docTypeName = foundDt.doc_type_name;
        }

        if (compName) {
          setSelectedCompany(compName);
        }
        if (clientsList.length > 0 && !selectedClient) {
          setSelectedClient(String(clientsList[0].id || clientsList[0].clientid || '1'));
        }

        // Make sure custom fields are loaded
        await fetchCustomFields();

        const dynMap = ext.dynamic_field_map || {};
        const dynamicExtractedFields = {};
        
        // Match form field names dynamically against extracted text lines & AcroForm fields
        (fieldsLayout || []).flatMap(sec => sec.fields || []).forEach(f => {
          if (!f) return;
          const fName = f.name ? f.name.trim() : '';
          const fId = f.id ? f.id.trim() : '';
          const lowerName = fName.toLowerCase();
          const lowerId = fId.toLowerCase();
          const snakeName = lowerName.replace(/[\s\-_]+/g, '_');
          const snakeId = lowerId.replace(/[\s\-_]+/g, '_');

          const matchedVal = dynMap[fName] || dynMap[fId] || dynMap[lowerName] || dynMap[lowerId] || dynMap[snakeName] || dynMap[snakeId];
          if (matchedVal) {
            if (fName) dynamicExtractedFields[fName] = matchedVal;
            if (fId) dynamicExtractedFields[fId] = matchedVal;
          }
        });

        // Update formData fields flexibly with standard & dynamic matches
        setFormData(prev => ({
          ...prev,
          ...dynamicExtractedFields,
          Company: compName || prev.Company || selectedCompany || '',
          'Document Type': docTypeName || prev['Document Type'] || prev['f_doc_type'] || '',
          'doc_type': docTypeName || prev['doc_type'] || '',
          'Document Number': ext.doc_number || prev['Document Number'] || prev['f_doc_number'] || '',
          'doc_number': ext.doc_number || prev['doc_number'] || '',
          'Mobile Number / Account': ext.mobile_account || prev['Mobile Number / Account'] || prev['Mobile Number'] || '',
          'Mobile Number': ext.mobile_account || prev['Mobile Number'] || '',
          'Account Number': ext.mobile_account || prev['Account Number'] || '',
          'Issue Date': ext.issue_date || prev['Issue Date'] || '',
          'Expiry Date': ext.expiry_date || prev['Expiry Date'] || '',
          'Remarks': ext.remarks || prev['Remarks'] || '',
          'File Upload': base64String,
          'File Upload_name': file.name
        }));

        setWizardStep(2);

        if (showToast) {
          showToast('PDF data extracted & form auto-filled successfully!', 'success');
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('PDF Parse Error:', err);
      if (showToast) {
        showToast(err.message || 'Error extracting PDF data', 'error');
      }
    } finally {
      setParsingPdf(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (isViewOnly) return;
    setSaving(true);
    try {
      const payload = {
        custom_field_id: customFields?.id || null,
        field_data: { ...formData, Company: selectedCompany || formData.Company },
        clientid: selectedClient || user?.clientid || null,
        country_id: selectedCountry || 1,
        company_id: selectedCompany || formData.Company || null,
        moduleid: moduleId,
        user_id: user?.id || null,
        status: formData.status || 'Active'
      };

      const recId = editingRecord ? (editingRecord.id || editingRecord.doc_id || editingRecord.usage_id) : null;
      const url = editingRecord
        ? `${API_URL}${apiEndpoint}/${recId}`
        : `${API_URL}${apiEndpoint}`;
      const method = editingRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingRecord ? `${singularTitle} record updated successfully!` : `${singularTitle} record created successfully!`, 'success');
        closeModal();
        fetchRecords();
      } else {
        const errData = await res.json();
        showToast(errData.error || errData.message || `Failed to save ${singularTitle.toLowerCase()}.`, 'error');
      }
    } catch (err) {
      console.error(`Error saving ${singularTitle}:`, err);
      showToast('Error connecting to backend.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (record) => {
    setRecordToDelete(record);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmText.toUpperCase() !== 'YES' && deleteConfirmText.toUpperCase() !== 'DELETE') {
      showToast('Please type YES to confirm deletion.', 'warning');
      return;
    }
    setDeleting(true);
    try {
      const recId = recordToDelete.id || recordToDelete.doc_id || recordToDelete.usage_id;
      const res = await fetch(`${API_URL}${apiEndpoint}/${recId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`${singularTitle} record deleted successfully!`, 'success');
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
        fetchRecords();
      } else {
        showToast('Could not delete record.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const renderFieldInput = (field) => {
    const val = formData[field.name] !== undefined ? formData[field.name] : (formData[field.id] !== undefined ? formData[field.id] : '');
    const fType = (field.type || '').toLowerCase().trim();

    if (fType.includes('file') || fType.includes('image') || fType === 'file upload' || fType === 'file') {
      const fileData = val;

      const handleFileSelect = () => {
        if (typeof document !== 'undefined') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = (fType.includes('image')) ? 'image/*' : '*/*';
          if (field.allowMultiple || field.allow_multiple) {
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

            const resultVal = (field.allowMultiple || field.allow_multiple)
              ? [...(Array.isArray(fileData) ? fileData : (fileData ? [fileData] : [])), ...processedFiles]
              : processedFiles[0];

            handleInputChange(field.name, resultVal, field.id);
          };
          input.click();
        }
      };

      const handleRemoveFile = (indexToRemove) => {
        let updated;
        if ((field.allowMultiple || field.allow_multiple) && Array.isArray(fileData)) {
          updated = fileData.filter((_, idx) => idx !== indexToRemove);
          if (updated.length === 0) updated = null;
        } else {
          updated = null;
        }
        handleInputChange(field.name, updated, field.id);
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
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderStyle: 'dashed',
                minHeight: 44,
                gap: 10,
                marginTop: 2
              }}
              onPress={handleFileSelect}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
              <Text style={{ flex: 1, color: '#475569', fontSize: 13, fontWeight: '500' }}>
                {filesArray.length > 0
                  ? `${filesArray.length} file(s) selected - Click to add/change`
                  : (fType.includes('image') ? 'Click to browse & upload image(s)...' : 'Click to browse & upload file(s)...')}
              </Text>
            </TouchableOpacity>
          )}

          {filesArray.length > 0 && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {filesArray.map((file, idx) => {
                if (!file) return null;
                const name = typeof file === 'string' ? file : (file.name || 'Uploaded File');
                const isUploaded = typeof file === 'object' && file.data && (file.data.startsWith('http') || file.data.startsWith('/'));

                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, gap: 8 }}>
                    <Ionicons
                      name={fType.includes('image') ? 'image-outline' : 'document-outline'}
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
                      <Text style={{ flex: 1, color: '#334155', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                        {name}
                      </Text>
                    )}
                    {!isViewOnly && (
                      <TouchableOpacity onPress={() => handleRemoveFile(idx)} style={{ padding: 2 }}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (field.name === 'Bill Number' || fType.includes('bill')) {
      const billOptions = telecomBillsList.map(b => {
        const fd = typeof b.field_data === 'string' ? JSON.parse(b.field_data || '{}') : (b.field_data || {});
        const label = fd['Bill Number'] || fd['bill_number'] || `Bill #${b.tele_bill_id || b.id}`;
        return { label, value: label };
      });

      return (
        <SearchableDropdown
          data={billOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v, field.id)}
          placeholder="-- Select Bill Number --"
          searchPlaceholder="Search Bill Number..."
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (field.name === 'Mobile Number' || field.name === 'Mobile Number / Account' || fType.includes('mobile')) {
      const simOptions = (field.allowedOptions && field.allowedOptions.length > 0)
        ? field.allowedOptions.map(opt => ({ label: String(opt), value: String(opt) }))
        : simDetailsList.map(s => {
            const fd = typeof s.field_data === 'string' ? JSON.parse(s.field_data || '{}') : (s.field_data || {});
            const label = fd['Mobile Number / Account'] || fd['Mobile Number'] || fd['SIM Number / ICCID'] || fd['Account Number'] || fd['mobile_number'] || `SIM #${s.tele_id || s.id}`;
            return { label, value: label };
          });

      return (
        <SearchableDropdown
          data={simOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v, field.id)}
          placeholder="-- Select Mobile Number --"
          searchPlaceholder="Search Mobile..."
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (field.name === 'Country' || fType.includes('country')) {
      const countryOptions = countriesList.map(c => ({ label: c.name, value: c.name }));

      return (
        <SearchableDropdown
          data={countryOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v, field.id)}
          placeholder="-- Select Country --"
          searchPlaceholder="Search Country..."
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (field.name === 'Document Type' || field.id === 'f_doc_type' || fType.includes('doc_type') || fType.includes('document type')) {
      const docTypeOptions = (field.allowedOptions && field.allowedOptions.length > 0)
        ? field.allowedOptions.map(opt => ({ label: String(opt), value: String(opt) }))
        : (teleDocTypesList.length > 0)
          ? teleDocTypesList.map(dt => ({ label: dt.doc_type_name, value: dt.doc_type_name }))
          : (field.options ? field.options.split(',').map(o => ({ label: o.trim(), value: o.trim() })) : []);

      return (
        <SearchableDropdown
          data={docTypeOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v, field.id)}
          placeholder="-- Select Document Type --"
          searchPlaceholder="Search Document Type..."
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (fType === 'dropdown' || fType === 'searchable dropdown') {
      let options = (field.allowedOptions && field.allowedOptions.length > 0)
        ? field.allowedOptions
        : (field.optionsArr || (field.options ? field.options.split(',') : []));
      if (!Array.isArray(options)) options = [];

      const formattedOptions = options.map(opt => {
        const str = typeof opt === 'object' ? (opt.label || opt.value || '') : String(opt);
        return { label: str.trim(), value: str.trim() };
      });

      return (
        <SearchableDropdown
          data={formattedOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v, field.id)}
          placeholder={`-- Select ${field.name} --`}
          searchPlaceholder={`Search ${field.name}...`}
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (fType === 'date') {
      return (
        <input
          type="date"
          style={{
            width: '100%',
            height: 44,
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            paddingLeft: 16,
            fontSize: 14,
            color: '#1E293B',
            outline: 'none',
            backgroundColor: isViewOnly ? '#F1F5F9' : '#F8FAFC',
            boxSizing: 'border-box'
          }}
          value={val}
          disabled={isViewOnly}
          onChange={(e) => handleInputChange(field.name, e.target.value, field.id)}
        />
      );
    }

    if (fType === 'textarea') {
      return (
        <TextInput
          style={[styles.textInput, { height: 80, paddingTop: 10, textAlignVertical: 'top' }, isViewOnly && styles.disabledInput]}
          value={String(val)}
          editable={!isViewOnly}
          multiline
          numberOfLines={3}
          onChangeText={(text) => handleInputChange(field.name, text, field.id)}
          placeholder={`Enter ${field.name}`}
          placeholderTextColor={COLORS.textMuted}
        />
      );
    }

    return (
      <TextInput
        style={[styles.textInput, isViewOnly && styles.disabledInput]}
        value={String(val)}
        editable={!isViewOnly}
        onChangeText={(text) => handleInputChange(field.name, text, field.id)}
        placeholder={`Enter ${field.name}`}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={fType === 'number' ? 'numeric' : 'default'}
      />
    );
  };

  const filteredRecords = records.filter(r => {
    if (r.moduleid && String(r.moduleid) !== String(moduleId)) {
      return false;
    }
    if (user && String(user.roleId) !== '1' && user.clientid && String(r.clientid) !== String(user.clientid)) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fdStr = JSON.stringify(r.field_data || {}).toLowerCase();
    const clientStr = (r.client_name || '').toLowerCase();
    const compStr = (r.company_name || '').toLowerCase();
    return fdStr.includes(q) || clientStr.includes(q) || compStr.includes(q) || (r.status && r.status.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Default Fallback Fields Array matching Usage & Extra Charges Form Specification
  const defaultUsageFields = [
    { id: 'f_bill_no', name: 'Bill Number', type: 'Dropdown', isRequired: true },
    { id: 'f_mobile', name: 'Mobile Number', type: 'Dropdown', isRequired: true },
    { id: 'f_date', name: 'Usage Date', type: 'Date', isRequired: true },
    { id: 'f_time', name: 'Time', type: 'Time', isRequired: false },
    { id: 'f_type', name: 'Usage Type', type: 'Dropdown', isRequired: true, options: 'Local Call,International Call,Roaming Call,Local Data,Roaming Data,SMS,Premium SMS,Special Number,Third Party Service,Other Extra Charge' },
    { id: 'f_premium_type', name: 'Premium / Extra Charge Type', type: 'Dropdown', isRequired: false, options: 'None,Premium SMS,Roaming Pass,VAS Subscription,Third Party App,Out of Bundle Data,Late Payment Fee,Disconnection Fee,Other Extra Charge' },
    { id: 'f_dest', name: 'Called / Destination Number', type: 'Textbox', isRequired: false },
    { id: 'f_country', name: 'Country', type: 'Dropdown', isRequired: false },
    { id: 'f_duration', name: 'Duration', type: 'Textbox', isRequired: false },
    { id: 'f_units', name: 'Units', type: 'Number', isRequired: false },
    { id: 'f_base_amount', name: 'Standard Charge Amount', type: 'Number', isRequired: false },
    { id: 'f_extra_amount', name: 'Premium / Extra Charge Amount', type: 'Number', isRequired: false },
    { id: 'f_amount', name: 'Total Amount', type: 'Number', isRequired: true },
    { id: 'f_remarks', name: 'Remarks', type: 'Textarea', isRequired: false },
  ];

  const defaultExtraFields = [
    { id: 'f_bill_no', name: 'Bill Number', type: 'Dropdown', isRequired: true },
    { id: 'f_mobile', name: 'Mobile Number', type: 'Dropdown', isRequired: true },
    { id: 'f_date', name: 'Date', type: 'Date', isRequired: true },
    { id: 'f_time', name: 'Time', type: 'Time', isRequired: false },
    { id: 'f_premium_type', name: 'Charge Type', type: 'Dropdown', isRequired: true, options: 'Premium SMS,Roaming Pass,VAS Subscription,Third Party App,Out of Bundle Data,Late Payment Fee,Disconnection Fee,Other Extra Charge' },
    { id: 'f_dest', name: 'Service / Number', type: 'Textbox', isRequired: false },
    { id: 'f_country', name: 'Quantity', type: 'Number', isRequired: false },
    { id: 'f_amount', name: 'Amount', type: 'Number', isRequired: true },
    { id: 'f_remarks', name: 'Business Purpose / Remarks', type: 'Textarea', isRequired: false },
  ];

  const defaultDocFields = [
    { id: 'f_company', name: 'Company', type: 'Dropdown', isRequired: true, optionSource: 'dynamic', dynamicPath: '/api/companies' },
    { id: 'f_mobile_account', name: 'Mobile Number / Account', type: 'Dropdown', isRequired: false, optionSource: 'dynamic', dynamicPath: '/api/sim-details' },
    { id: 'f_doc_type', name: 'Document Type', type: 'Dropdown', isRequired: true, optionSource: 'dynamic', dynamicPath: '/api/tele-doc-types', options: 'Telecom Invoice,SIM Contract,Device Warranty,SIM Handover,Employee Acknowledgement,Provider Agreement,Other' },
    { id: 'f_doc_number', name: 'Document Number', type: 'Textbox', isRequired: false },
    { id: 'f_issue_date', name: 'Issue Date', type: 'Date', isRequired: false },
    { id: 'f_expiry_date', name: 'Expiry Date', type: 'Date', isRequired: false },
    { id: 'f_file_upload', name: 'File Upload', type: 'File', isRequired: true },
    { id: 'f_remarks', name: 'Remarks', type: 'Textarea', isRequired: false },
  ];

  const activeDefaultFields = (moduleId === 61 || String(moduleId) === '61')
    ? defaultDocFields
    : (moduleId === 58 || String(moduleId) === '58')
      ? defaultExtraFields
      : defaultUsageFields;

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.iconSquareBadge}>
            <Ionicons name={headerIcon || 'receipt-outline'} size={22} color="#0284C7" />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.tabHeadingTitle}>{pageTitle}</Text>
            <Text style={styles.tabHeadingSubtitle}>{pageSubtitle}</Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>
              {addBtnText.startsWith('+') ? addBtnText : `+ ${addBtnText}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DATA TABLE (UNIFIED ENTERPRISE CARD) */}
      <View style={styles.tableCard}>

        {/* INTEGRATED SEARCH TOOLBAR */}
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search by Bill No, Mobile or Usage Type..."
              value={search}
              onChangeText={text => { setSearch(text); setPage(1); }}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderView}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontWeight: '500' }}>Loading usage charges...</Text>
          </View>
        ) : paginatedRecords.length > 0 ? (
          <>
            {/* TABLE HEADER ROW */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 0.6 }]}>ID</Text>
              <Text style={[styles.thCell, { flex: 1.8 }]}>CLIENT INFO</Text>
              <Text style={[styles.thCell, { flex: 1.6 }]}>{(moduleId === 61 || String(moduleId) === '61') ? 'COMPANY' : 'BILL NUMBER'}</Text>
              <Text style={[styles.thCell, { flex: 1.6 }]}>{(moduleId === 61 || String(moduleId) === '61') ? 'MOBILE / ACCOUNT' : 'MOBILE NUMBER'}</Text>
              <Text style={[styles.thCell, { flex: 1.8 }]}>{(moduleId === 61 || String(moduleId) === '61') ? 'DOCUMENT TYPE' : 'USAGE DATE & TIME'}</Text>
              <Text style={[styles.thCell, { flex: 1.6 }]}>{(moduleId === 61 || String(moduleId) === '61') ? 'DOC NUMBER' : 'USAGE TYPE'}</Text>
              <Text style={[styles.thCell, { flex: 1.4 }]}>{(moduleId === 61 || String(moduleId) === '61') ? 'EXPIRY DATE' : 'AMOUNT'}</Text>
              <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>ACTION</Text>
            </View>

            {/* TABLE BODY ROWS */}
            {paginatedRecords.map((r) => {
              const fd = typeof r.field_data === 'string' ? JSON.parse(r.field_data || '{}') : (r.field_data || {});
              const isDoc = (moduleId === 61 || String(moduleId) === '61');

              const billNo = isDoc ? (r.company_name || fd['Company'] || fd['company'] || r.company || '—') : (fd['Bill Number'] || fd['bill_number'] || '—');
              const mobile = isDoc ? (fd['Mobile Number / Account'] || fd['mobile_account'] || r.mobile_account || '—') : (fd['Mobile Number'] || fd['mobile_number'] || '—');
              const usageDate = isDoc ? (fd['Document Type'] || fd['doc_type'] || r.document_type || '—') : (fd['Usage Date'] || fd['usage_date'] || '—');
              const time = isDoc ? '' : (fd['Time'] || fd['time'] || '');
              const usageType = isDoc ? (fd['Document Number'] || fd['doc_number'] || r.document_number || '—') : (fd['Usage Type'] || fd['usage_type'] || '—');
              
              const rawAmt = fd['Amount'] || fd['amount'] || fd['Total Amount'] || fd['f_amount'];
              let amount = '—';
              if (isDoc) {
                amount = fd['Expiry Date'] || fd['expiry_date'] || r.expiry_date || '—';
              } else if (rawAmt !== undefined && rawAmt !== null && String(rawAmt).trim() !== '') {
                const strAmt = String(rawAmt).trim();
                amount = strAmt.toLowerCase().includes('aed') ? strAmt : `${strAmt} AED`;
              }
              
              const st = r.status || 'Active';
              const isPaid = st.toLowerCase() === 'active' || st.toLowerCase() === 'paid';

              return (
                <View key={r.doc_id || r.usage_id || r.id} style={styles.tableBodyRow}>
                  <Text style={[styles.tdCell, { flex: 0.6, fontWeight: '700', color: '#334155' }]}>#{r.doc_id || r.usage_id || r.id}</Text>

                  <View style={[styles.tdCell, { flex: 1.8 }]}>
                    <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: 13, marginBottom: 2 }}>
                      {r.client_name || user?.client_name || 'Nirmal Raj'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      Country: {r.country_name || 'United Arab Emirates'}
                    </Text>
                  </View>

                  <Text style={[styles.tdCell, { flex: 1.6, color: '#0F172A', fontWeight: '600' }]}>{billNo}</Text>
                  <Text style={[styles.tdCell, { flex: 1.6, color: '#475569', fontWeight: '500' }]}>{mobile}</Text>
                  <View style={[styles.tdCell, { flex: 1.8 }]}>
                    <Text style={{ color: '#0F172A', fontWeight: '500', fontSize: 13 }}>{usageDate}</Text>
                    {time ? <Text style={{ fontSize: 11, color: '#94A3B8' }}>{time}</Text> : null}
                  </View>
                  <View style={[styles.tdCell, { flex: 1.6 }]}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>{usageType}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tdCell, { flex: 1.4, fontWeight: '700', color: isDoc ? '#475569' : COLORS.primary }]}>{amount}</Text>

                  <View style={[styles.tdCell, { flex: 1.0, alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, isPaid ? styles.statusActive : styles.statusInactive]}>
                      <Text style={[styles.statusText, isPaid ? styles.statusTextActive : styles.statusTextInactive]}>
                        {st.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                    <TouchableOpacity style={{ padding: 4 }} onPress={() => openViewModal(r)} activeOpacity={0.7}>
                      <Ionicons name="eye-outline" size={18} color="#0F172A" />
                    </TouchableOpacity>

                    {canEdit && (
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => openEditModal(r)} activeOpacity={0.7}>
                        <Ionicons name="pencil" size={18} color="#166534" />
                      </TouchableOpacity>
                    )}

                    {canDelete && (
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => openDeleteModal(r)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* INTEGRATED PAGINATION FOOTER */}
            <View style={styles.paginationRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Showing <Text style={{ fontWeight: '600', color: '#334155' }}>{(currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={{ fontWeight: '600', color: '#334155' }}>{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</Text> of <Text style={{ fontWeight: '600', color: '#334155' }}>{filteredRecords.length}</Text> entries
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Rows per page:</Text>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setPage(1);
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
                      cursor: 'pointer',
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
                  style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
                  disabled={currentPage <= 1}
                  onPress={() => setPage(p => p - 1)}
                >
                  <Text style={[styles.pageNavText, currentPage <= 1 && styles.pageNavTextDisabled]}>{'< Prev'}</Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Page <Text style={{ fontWeight: '600', color: '#334155' }}>{currentPage}</Text> of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
                  disabled={currentPage >= totalPages}
                  onPress={() => setPage(p => p + 1)}
                >
                  <Text style={[styles.pageNavText, currentPage >= totalPages && styles.pageNavTextDisabled]}>{'Next >'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 }}>No {pageTitle} Found</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>Add a new {singularTitle.toLowerCase()} record to start tracking charges.</Text>
          </View>
        )}
      </View>

      {/* 2-STEP MODAL WIZARD */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>
                  {isViewOnly ? `${singularTitle} Details` : editingRecord ? `Edit ${singularTitle}` : `Add ${singularTitle}`}
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* WIZARD STEP HEADER BAR */}
            {!isViewOnly && (
              <View style={styles.wizardHeaderBar}>
                {[
                  { id: 1, label: 'Configuration', icon: 'settings-outline' },
                  { id: 2, label: 'Form Data', icon: 'document-text-outline' }
                ].map((step, index, arr) => {
                  const isActive = wizardStep === step.id;
                  const isPast = wizardStep > step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.stepCircle, (isActive || isPast) ? styles.stepCircleActive : styles.stepCircleInactive]}>
                          <Ionicons name={step.icon} size={14} color={(isActive || isPast) ? COLORS.white : COLORS.textSecondary} />
                        </View>
                        <Text style={[styles.stepLabel, (isActive || isPast) ? styles.stepLabelActive : styles.stepLabelInactive]}>
                          {step.label}
                        </Text>
                      </View>
                      {index < arr.length - 1 && (
                        <View style={[styles.stepDivider, wizardStep > step.id ? styles.stepDividerActive : styles.stepDividerInactive]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {/* WIZARD STEP 1: CONFIGURATION */}
            {wizardStep === 1 && !isViewOnly ? (
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 24 }}>
                  {/* CLIENT * */}
                  <View style={[styles.configFieldGroup, { zIndex: 30 }]}>
                    <Text style={styles.configLabel}>CLIENT *</Text>
                    <SearchableDropdown
                      data={clientsList}
                      value={selectedClient}
                      onChange={handleClientChange}
                      placeholder="-- Select Client --"
                      searchPlaceholder="Search Client..."
                      displayKey="client_name"
                      valueKey="id"
                    />
                  </View>

                  {/* COMPANY * */}
                  <View style={[styles.configFieldGroup, { zIndex: 20 }]}>
                    <Text style={styles.configLabel}>COMPANY *</Text>
                    <SearchableDropdown
                      data={selectedClient
                        ? companiesList.filter(c => !c.clientid || String(c.clientid) === String(selectedClient))
                        : companiesList
                      }
                      value={selectedCompany}
                      onChange={(val) => setSelectedCompany(val)}
                      placeholder={selectedClient ? "-- Select Company --" : "-- Select Client First --"}
                      searchPlaceholder="Search Company..."
                      displayKey="company_name"
                      valueKey="company_name"
                      disabled={!selectedClient}
                    />
                  </View>
                </ScrollView>

                {/* STEP 1 MODAL FOOTER */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveBtn,
                      { backgroundColor: (selectedClient && selectedCompany) ? '#004D34' : '#94A3B8' },
                      { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }
                    ]}
                    disabled={!selectedClient || !selectedCompany}
                    onPress={handleNextStep}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveBtnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* WIZARD STEP 2: FORM DATA */
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 24, paddingBottom: 24 }}>
                  {fieldsLayout.length > 0 ? (
                    fieldsLayout.map((sec, sIdx) => (
                      <View key={sec.id || sIdx} style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>{(sec.name || `${singularTitle} FORM DETAILS`).toUpperCase()}</Text>

                          {!isViewOnly && (
                            <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                              <input
                                type="file"
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                onChange={handleAutoFillFromPdf}
                                disabled={parsingPdf}
                              />
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#004D34',
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                                borderRadius: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                              }}>
                                {parsingPdf ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Ionicons name="sparkles" size={15} color="#F9C62A" />
                                )}
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                                  {parsingPdf ? 'Extracting PDF...' : 'Auto-Fill Form from PDF'}
                                </Text>
                              </View>
                            </label>
                          )}
                        </View>
                        <View style={styles.sectionBody}>
                          {(sec.fields || []).map((f, fIdx) => (
                            <View key={f.id || fIdx} style={[styles.fieldContainer, { width: isLargeScreen ? '48%' : '100%', zIndex: 100 - fIdx, position: 'relative' }]}>
                              <Text style={styles.fieldLabel}>
                                {f.name} {f.isRequired && !isViewOnly && <Text style={{ color: COLORS.error }}>*</Text>}
                              </Text>
                              {renderFieldInput(f)}
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  ) : (
                    /* FALLBACK SECTION CARD */
                    <View style={styles.sectionCard}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{`${singularTitle} FORM DETAILS`.toUpperCase()}</Text>

                        {!isViewOnly && (
                          <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input
                              type="file"
                              accept="application/pdf"
                              style={{ display: 'none' }}
                              onChange={handleAutoFillFromPdf}
                              disabled={parsingPdf}
                            />
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#004D34',
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              borderRadius: 8,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 3,
                            }}>
                              {parsingPdf ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Ionicons name="sparkles" size={15} color="#F9C62A" />
                              )}
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                                {parsingPdf ? 'Extracting PDF...' : 'Auto-Fill Form from PDF'}
                              </Text>
                            </View>
                          </label>
                        )}
                      </View>
                      <View style={styles.sectionBody}>
                        {activeDefaultFields.map((f, fIdx) => (
                          <View key={f.id} style={[styles.fieldContainer, { width: isLargeScreen ? '48%' : '100%', zIndex: 100 - fIdx, position: 'relative' }]}>
                            <Text style={styles.fieldLabel}>
                              {f.name} {f.isRequired && !isViewOnly && <Text style={{ color: COLORS.error }}>*</Text>}
                            </Text>
                            {renderFieldInput(f)}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* STEP 2 MODAL FOOTER */}
                <View style={styles.modalFooter}>
                  {!isViewOnly && (
                    <TouchableOpacity style={styles.backBtn} onPress={() => setWizardStep(1)}>
                      <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flexDirection: 'row', gap: 12, marginLeft: 'auto' }}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Text style={styles.cancelBtnText}>{isViewOnly ? 'Close' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    {!isViewOnly && (
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                        {saving ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.saveBtnText}>{editingRecord ? 'Update Record' : 'Complete & Save'}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}

          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 440, minHeight: 0, padding: 24 }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="trash-outline" size={24} color={COLORS.error} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 }}>Delete {singularTitle} Record?</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 }}>
                Type <Text style={{ fontWeight: '800', color: COLORS.error }}>YES</Text> to confirm deletion of this {singularTitle.toLowerCase()} record.
              </Text>
            </View>

            <TextInput
              style={[styles.textInput, { textAlign: 'center', fontWeight: '700', letterSpacing: 1 }]}
              placeholder="Type YES"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setIsDeleteModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: COLORS.error }]} onPress={handleDelete} disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 24, backgroundColor: '#F8FAFC' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconSquareBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: { justifyContent: 'center' },
  tabHeadingTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  tabHeadingSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#004D34', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  
  /* UNIFIED ENTERPRISE TABLE CARD */
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
    width: 320,
  },
  searchBarInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#334155',
    outlineStyle: 'none',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  tdCell: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#F0FDF4' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#166534' },
  statusTextInactive: { color: '#991B1B' },
  loaderView: { padding: 40, alignItems: 'center' },
  emptyView: { padding: 50, alignItems: 'center', backgroundColor: COLORS.cardBg },
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
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pageNavBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  pageNavText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  pageNavTextDisabled: {
    color: '#94A3B8',
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
    maxWidth: 1050,
    maxHeight: '90%',
    minHeight: '61%',
    backgroundColor: COLORS.cardBg,
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
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  wizardHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#0F172A' },
  stepCircleInactive: { backgroundColor: '#E2E8F0' },
  stepLabel: { fontSize: 13, fontWeight: '600' },
  stepLabelActive: { color: '#0F172A' },
  stepLabelInactive: { color: COLORS.textSecondary },
  stepDivider: { flex: 1, height: 2, marginHorizontal: 12 },
  stepDividerActive: { backgroundColor: '#0F172A' },
  stepDividerInactive: { backgroundColor: '#E2E8F0' },
  configFieldGroup: { marginBottom: 24 },
  configLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  nextBtn: { width: 120, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  nextBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  disabledDropdown: { backgroundColor: '#F1F5F9' },
  activeDropdownHeader: { borderColor: '#004D34', backgroundColor: '#FFFFFF' },
  dropdownLabel: { fontSize: 14, color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  dropdownBody: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  dropdownSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  dropdownSearchInput: { flex: 1, height: 38, fontSize: 13, color: '#1E293B', outlineStyle: 'none' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  selectedDropdownItem: { backgroundColor: '#F0FDF4' },
  dropdownItemText: { fontSize: 13, color: '#334155' },
  selectedDropdownItemText: { fontWeight: '700', color: '#004D34' },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'visible',
    zIndex: 1,
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#004D34',
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
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
    outlineStyle: 'none',
  },
  disabledInput: { backgroundColor: '#F1F5F9', color: '#64748B' },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0'
  },
  backBtnText: { color: '#0F172A', fontWeight: '600', fontSize: 14 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#004D34' },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default UsageChargesTab;
