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
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';
import { SearchableDropdown } from './CustomFieldsTab';
import PhoneInputWithCountryCode from './PhoneInputWithCountryCode';

export default function SimDetailsTab({
  user,
  showToast,
  renderTableToolbar,
  renderTablePagination,
  isSidebarCollapsed,
  permissions,
  title = "Telecom Details",
  buttonLabel = "+ Add Telecom Details"
}) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const canCreate = !user || String(user.roleId) === '1' || (permissions && (permissions.can_create || permissions.full_control));
  const isClientLogged = Boolean(user && String(user.roleId) !== '1' && user.clientid);
  const isTelecomDataView = title === "Telecom Data";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Auto-Fill PDF State
  const [parsingPdf, setParsingPdf] = useState(false);
  const [attachedPdfName, setAttachedPdfName] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [extractedPdfData, setExtractedPdfData] = useState({});

  // Dropdown Master Options
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [providers, setProviders] = useState([]);
  const [simPlans, setSimPlans] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Wizard & Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Configuration, 2: Form Data
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  // Custom Fields & Layout State
  const [fieldsLayout, setFieldsLayout] = useState(null);
  const [customFieldId, setCustomFieldId] = useState(null);

  // Selected Configuration values
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    company: '',
    telecom_provider: '',
    mobile_number: '',
    sim_number: '',
    account_number: '',
    plan_name: '',
    monthly_plan_amount: '',
    data_allowance: '',
    local_minutes: '',
    international_minutes: '',
    local_sms_allowance: '',
    international_sms_allowance: '',
    activation_date: '',
    contract_start_date: '',
    contract_expiry_date: '',
    assigned_employee: '',
    department: '',
    status: 'Active',
    remarks: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?clientid=${user.clientid}` : '';
      const endpoint = isTelecomDataView ? 'telecom-data' : 'sim-details';
      
      const [simRes, clientsRes, providersRes, plansRes, empRes] = await Promise.all([
        fetch(`${API_URL}/api/${endpoint}${clientQuery}`),
        fetch(`${API_URL}/api/clients`),
        fetch(`${API_URL}/api/telecom-providers${user?.clientid ? `?client_id=${user.clientid}` : ''}`),
        fetch(`${API_URL}/api/sim-plans${user?.clientid ? `?client_id=${user.clientid}` : ''}`),
        fetch(`${API_URL}/api/employees${clientQuery}`)
      ]);

      const [simData, clientsData, providersData, plansData, empData] = await Promise.all([
        simRes.ok ? simRes.json() : [],
        clientsRes.ok ? clientsRes.json() : [],
        providersRes.ok ? providersRes.json() : [],
        plansRes.ok ? plansRes.json() : [],
        empRes.ok ? empRes.json() : []
      ]);

      setRecords(Array.isArray(simData) ? simData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProviders(Array.isArray(providersData) ? providersData : []);
      setSimPlans(Array.isArray(plansData) ? plansData : []);
      setEmployees(Array.isArray(empData) ? empData : []);

      if (user?.clientid) {
        setSelectedClient(String(user.clientid));
        fetchCompaniesForClient(String(user.clientid));
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      showToast('Error loading SIM details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompaniesForClient = async (clientId) => {
    if (!clientId) {
      setCompanies([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/companies/client/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
    }
  };

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId);
    setSelectedCompany('');
    fetchCompaniesForClient(clientId);
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const fetchFormConfiguration = async (clientId) => {
    try {
      const cfRes = await fetch(`${API_URL}/api/custom-fields`);
      if (!cfRes.ok) return;
      const customFields = await cfRes.json();

      const isSimModule = (cf) => {
        const modId = String(cf.moduleid || cf.module_id || '');
        const modName = String(cf.module_name || '').toLowerCase();
        if (modId === '55') return true;
        if (modName.includes('document')) return false;
        return modName.includes('sim') || modName === 'telecom details' || modName.includes('telecom detail');
      };

      let matchingFieldDef = customFields.find(cf =>
        (String(cf.client_id || cf.clientid) === String(clientId)) && isSimModule(cf)
      );
      if (!matchingFieldDef) {
        matchingFieldDef = customFields.find(cf =>
          (!cf.clientid && !cf.client_id) && isSimModule(cf)
        );
      }
      if (!matchingFieldDef && customFields.length > 0) {
        matchingFieldDef = customFields.find(cf => isSimModule(cf));
      }

      if (matchingFieldDef) {
        // Fetch field permissions
        let permittedFields = null;
        try {
          const permRes = await fetch(`${API_URL}/api/field-permissions`);
          if (permRes.ok) {
            const permissionsList = await permRes.json();
            const activePerm = permissionsList.find(p =>
              (String(p.clientid) === String(clientId) || !p.clientid) &&
              (String(p.module_name || '').toLowerCase().includes('telecom') || String(p.module_name || '').toLowerCase().includes('sim') || String(p.moduleid) === String(matchingFieldDef.moduleid || matchingFieldDef.module_id))
            );
            if (activePerm && activePerm.permitted_fields) {
              permittedFields = typeof activePerm.permitted_fields === 'string'
                ? JSON.parse(activePerm.permitted_fields)
                : activePerm.permitted_fields;
            }
          }
        } catch (e) {}

        setCustomFieldId(matchingFieldDef.id);
        const cId = matchingFieldDef.country_id || matchingFieldDef.countryid || user?.country_id || user?.countryid || null;
        if (cId) setSelectedCountry(String(cId));
        let parsedSections = typeof matchingFieldDef.field_data === 'string'
          ? JSON.parse(matchingFieldDef.field_data)
          : matchingFieldDef.field_data;

        let fieldValuesMap = {};
        try {
          const fvRes = await fetch(`${API_URL}/api/custom-fields/${matchingFieldDef.id}/field-values`);
          if (fvRes.ok) {
            fieldValuesMap = await fvRes.json();
          }
        } catch (e) {}

        const fetchDynamicOptions = async (path) => {
          try {
            let processedPath = (path || '').trim();
            if (processedPath.includes('client') && clientId) {
              if (processedPath.endsWith('/client') || processedPath.endsWith('/client/')) {
                const separator = processedPath.endsWith('/') ? '' : '/';
                processedPath = `${processedPath}${separator}${clientId}`;
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
                let displayName = '';
                if (item.field_data && typeof item.field_data === 'object') {
                  const firstVal = Object.values(item.field_data)[0];
                  if (firstVal && typeof firstVal === 'string') displayName = firstVal;
                }
                if (!displayName) {
                  const nameKey = Object.keys(item).find(key =>
                    key.toLowerCase().includes('name') ||
                    key.toLowerCase().includes('label') ||
                    key.toLowerCase() === 'title' ||
                    key.toLowerCase().includes('company') ||
                    key.toLowerCase().includes('client')
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
          return updatedField;
        };

        const processedSections = (await Promise.all(parsedSections.map(async (sec) => {
          const processedFields = await Promise.all(
            (sec.fields || [])
              .filter(f => {
                if (permittedFields === null || permittedFields === undefined) return true;
                if (permittedFields[f.id] !== undefined) return Boolean(permittedFields[f.id]);
                if (permittedFields[f.name] !== undefined) return Boolean(permittedFields[f.name]);
                return true;
              })
              .map(f => processField(f))
          );
          const sortedFields = [...processedFields].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
          return { ...sec, fields: sortedFields };
        }))).filter(sec => sec.fields.length > 0);

        setFieldsLayout(processedSections);
      } else {
        setFieldsLayout([]);
        setCustomFieldId(null);
      }
    } catch (err) {
      console.error('Error fetching SIM details custom fields:', err);
    }
  };

  const openModal = async (record = null, viewMode = false) => {
    setIsViewOnly(viewMode);
    const targetClient = record?.clientid ? String(record.clientid) : (user?.clientid ? String(user.clientid) : selectedClient);
    if (targetClient) {
      await fetchFormConfiguration(targetClient);
    }
    if (record) {
      setEditingId(record.id);
      setSelectedClient(record.clientid ? String(record.clientid) : '');
      if (record.clientid) {
        fetchCompaniesForClient(String(record.clientid));
      }
      setSelectedCompany(record.company_id ? String(record.company_id) : '');
      setSelectedCountry(record.country_id ? String(record.country_id) : (record.countryid ? String(record.countryid) : ''));

      let fd = {};
      try {
        fd = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : (record.field_data || {});
      } catch (e) {
        fd = {};
      }
      setFormData({
        ...record,
        ...fd,
        company: record.company || record.company_id || fd.company || '',
        telecom_provider: record.telecom_provider || fd.telecom_provider || '',
        mobile_number: record.mobile_number || record.mobile_account || fd.mobile_number || '',
        mobile_account: record.mobile_account || record.mobile_number || fd.mobile_account || '',
        sim_number: record.sim_number || fd.sim_number || '',
        account_number: record.account_number || record.mobile_account || fd.account_number || '',
        bill_number: record.bill_number || record.doc_number || fd.bill_number || '',
        doc_number: record.doc_number || record.bill_number || fd.doc_number || '',
        period_from: record.period_from || fd.period_from || '',
        period_to: record.period_to || fd.period_to || '',
        issue_date: record.issue_date || fd.issue_date || '',
        due_date: record.due_date || fd.due_date || '',
        expiry_date: record.expiry_date || fd.expiry_date || '',
        service_rental: record.service_rental || fd.service_rental || '',
        usage_charges: record.usage_charges || fd.usage_charges || '',
        one_time_charges: record.one_time_charges || fd.one_time_charges || '',
        other_charges: record.other_charges || fd.other_charges || '',
        vat: record.vat || fd.vat || '',
        total_amount: record.total_amount || fd.total_amount || '',
        plan_name: record.plan_name || fd.plan_name || '',
        monthly_plan_amount: record.monthly_plan_amount || fd.monthly_plan_amount || '',
        data_allowance: record.data_allowance || fd.data_allowance || '',
        local_minutes: record.local_minutes || fd.local_minutes || '',
        international_minutes: record.international_minutes || fd.international_minutes || '',
        local_sms_allowance: record.local_sms_allowance || fd.local_sms_allowance || '',
        international_sms_allowance: record.international_sms_allowance || fd.international_sms_allowance || '',
        activation_date: record.activation_date || fd.activation_date || '',
        contract_start_date: record.contract_start_date || fd.contract_start_date || '',
        contract_expiry_date: record.contract_expiry_date || fd.contract_expiry_date || '',
        assigned_employee: record.assigned_employee || fd.assigned_employee || '',
        department: record.department || fd.department || '',
        status: record.status || fd.status || 'Active',
        remarks: record.remarks || fd.remarks || ''
      });
      setAttachedPdfName(record.pdf_name || fd.attached_pdf || fd.invoice_pdf || '');
      setPdfBase64(record.pdf_base64 || '');
      setExtractedPdfData(record.extracted_data || {});

      setWizardStep(2); // Jump straight to Form Data on Edit / View
    } else {
      setEditingId(null);
      setWizardStep(1); // Show Configuration step first for New record
      const defaultClient = user?.clientid ? String(user.clientid) : '';
      setSelectedClient(defaultClient);
      if (defaultClient) fetchCompaniesForClient(defaultClient);
      setSelectedCompany('');
      setAttachedPdfName('');
      setPdfBase64('');
      setExtractedPdfData({});

      setFormData({
        company: '',
        telecom_provider: '',
        mobile_number: '',
        sim_number: '',
        account_number: '',
        plan_name: '',
        monthly_plan_amount: '',
        data_allowance: '',
        local_minutes: '',
        international_minutes: '',
        local_sms_allowance: '',
        international_sms_allowance: '',
        activation_date: '',
        contract_start_date: '',
        contract_expiry_date: '',
        assigned_employee: '',
        department: '',
        status: 'Active',
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleNextStep = async () => {
    if (!selectedClient) {
      showToast('Please select a Client', 'error');
      return;
    }
    await fetchFormConfiguration(selectedClient);
    setWizardStep(2);
  };

  const renderCustomField = (field) => {
    switch (field.type) {
      case 'Dropdown':
      case 'Searchable Dropdown': {
        let options = (field.allowedOptions && field.allowedOptions.length > 0)
          ? field.allowedOptions
          : (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
        
        const fName = String(field.name || '').toLowerCase();
        if (options.length === 0) {
          if (fName.includes('telecom') || fName.includes('provider')) {
            options = providers.map(p => p.provider_name || p.name).filter(Boolean);
          } else if (fName.includes('company')) {
            options = companies.map(c => c.company_name || c.name).filter(Boolean);
          } else if (fName.includes('plan')) {
            options = simPlans.map(p => p.plan_name || p.name).filter(Boolean);
          } else if (fName.includes('employee') || fName.includes('assigned')) {
            options = employees.map(e => e.employee_name || e.first_name || e.name).filter(Boolean);
          } else if (fName.includes('status')) {
            options = ['Active', 'Available', 'Assigned', 'Suspended', 'Lost', 'Damaged', 'Cancelled'];
          }
        }

        const dropdownData = options.map(opt => ({ label: opt, value: opt }));
        const curVal = formData[field.id] !== undefined ? formData[field.id] : (formData[field.name] || '');
        return (
          <SearchableDropdown
            data={dropdownData}
            value={curVal}
            onChange={(val) => {
              handleChange(field.id, val);
              handleChange(field.name, val);
              if (fName.includes('telecom') || fName.includes('provider')) handleChange('telecom_provider', val);
              if (fName.includes('company')) handleChange('company', val);
              if (fName.includes('plan')) handleChange('plan_name', val);
              if (fName.includes('employee') || fName.includes('assigned')) handleChange('assigned_employee', val);
              if (fName.includes('status')) handleChange('status', val);
            }}
            placeholder={`-- Select ${field.name} --`}
            searchPlaceholder={`Search ${field.name}...`}
            displayKey="label"
            valueKey="value"
            disabled={isViewOnly}
          />
        );
      }
      case 'Date': {
        const val = formData[field.id] || formData[field.name] || '';
        return (
          <input
            type="date"
            value={val}
            onChange={(e) => {
              handleChange(field.id, e.target.value);
              handleChange(field.name, e.target.value);
            }}
            style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && styles.readOnlyInput])}
            disabled={isViewOnly}
          />
        );
      }
      case 'Toggle/Switch':
      case 'Single Checkbox': {
        const val = !!(formData[field.id] || formData[field.name]);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
            <Switch
              value={val}
              onValueChange={(newVal) => {
                handleChange(field.id, newVal);
                handleChange(field.name, newVal);
              }}
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
      case 'Number':
        return (
          <TextInput
            style={[styles.input, isViewOnly && styles.readOnlyInput]}
            placeholder={`Enter ${field.name}`}
            value={formData[field.id] !== undefined ? String(formData[field.id]) : (formData[field.name] !== undefined ? String(formData[field.name]) : '')}
            onChangeText={(val) => {
              handleChange(field.id, val);
              handleChange(field.name, val);
            }}
            keyboardType="numeric"
            editable={!isViewOnly}
          />
        );
      case 'Textarea':
        return (
          <TextInput
            style={[styles.input, { height: 80 }, isViewOnly && styles.readOnlyInput]}
            placeholder={`Enter ${field.name}`}
            value={formData[field.id] !== undefined ? String(formData[field.id]) : (formData[field.name] !== undefined ? String(formData[field.name]) : '')}
            onChangeText={(val) => {
              handleChange(field.id, val);
              handleChange(field.name, val);
            }}
            multiline
            editable={!isViewOnly}
          />
        );
      case 'File Upload':
      case 'Image Upload':
      case 'File': {
        const val = formData[field.id] !== undefined ? formData[field.id] : (formData[field.name] || '');
        const handleFileSelect = () => {
          if (typeof document !== 'undefined') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = field.type === 'Image Upload' ? 'image/*' : '*/*';
            input.onchange = (e) => {
              const files = Array.from(e.target.files);
              if (files.length > 0) {
                handleChange(field.id, files[0].name);
                handleChange(field.name, files[0].name);
              }
            };
            input.click();
          }
        };

        return (
          <View style={{ width: '100%' }}>
            {!val ? (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isViewOnly ? '#F1F5F9' : '#FAFAFA',
                  paddingHorizontal: 14,
                  height: 44,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  borderStyle: 'dashed',
                  gap: 8,
                }}
                onPress={handleFileSelect}
                disabled={isViewOnly}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#64748B" />
                <Text style={{ flex: 1, color: '#94A3B8', fontSize: 13 }}>
                  Click to upload file...
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="document-text-outline" size={18} color="#166534" />
                  <Text style={{ color: '#0F172A', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {typeof val === 'object' ? val.name : String(val)}
                  </Text>
                </View>
                {!isViewOnly && (
                  <TouchableOpacity onPress={() => { handleChange(field.id, ''); handleChange(field.name, ''); }} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      }
      case 'Phone':
      case 'Phone Number':
        return (
          <PhoneInputWithCountryCode
            value={formData[field.id] !== undefined ? String(formData[field.id]) : (formData[field.name] !== undefined ? String(formData[field.name]) : '')}
            onChangeText={(val) => {
              handleChange(field.id, val);
              handleChange(field.name, val);
              const fName = String(field.name || '').toLowerCase();
              if (fName.includes('mobile')) handleChange('mobile_number', val);
              if (fName.includes('account')) handleChange('account_number', val);
              if (fName.includes('sim number') || fName.includes('iccid')) handleChange('sim_number', val);
            }}
            placeholder="560 1234"
            disabled={isViewOnly}
          />
        );
      default:
        return (
          <TextInput
            style={[styles.input, isViewOnly && styles.readOnlyInput]}
            placeholder={`Enter ${field.name}`}
            value={formData[field.id] !== undefined ? String(formData[field.id]) : (formData[field.name] !== undefined ? String(formData[field.name]) : '')}
            onChangeText={(val) => {
              handleChange(field.id, val);
              handleChange(field.name, val);
              const fName = String(field.name || '').toLowerCase();
              if (fName.includes('mobile')) handleChange('mobile_number', val);
              if (fName.includes('sim number') || fName.includes('iccid')) handleChange('sim_number', val);
            }}
            editable={!isViewOnly}
          />
        );
    }
  };

  const handleSave = async () => {
    let telecomProvider = formData.telecom_provider || formData['Telecom Provider'] || '';
    let mobileNumber = formData.mobile_number || formData['Mobile Number'] || '';
    let simNumber = formData.sim_number || formData['SIM Number'] || formData['sim_number'] || '';

    // Check fieldsLayout to resolve dynamic field values stored by field.id
    if (fieldsLayout && fieldsLayout.length > 0) {
      for (const section of fieldsLayout) {
        for (const f of section.fields || []) {
          const val = formData[f.id] !== undefined ? formData[f.id] : formData[f.name];
          const name = String(f.name || '').toLowerCase();
          if (val) {
            if (!telecomProvider && (name.includes('telecom') || name.includes('provider'))) {
              telecomProvider = String(val);
            }
            if (!mobileNumber && (name.includes('mobile') || name.includes('phone') || name.includes('account'))) {
              mobileNumber = String(val);
            }
            if (!simNumber && (name.includes('sim number') || name.includes('iccid') || name.includes('sim'))) {
              simNumber = String(val);
            }
          }
        }
      }
    }

    // Validate required fields based on fieldsLayout if present, otherwise fallback defaults
    const missingFields = [];
    if (fieldsLayout && fieldsLayout.length > 0) {
      fieldsLayout.forEach(sec => {
        (sec.fields || []).forEach(f => {
          if (f.isRequired) {
            const val = formData[f.id] !== undefined ? formData[f.id] : formData[f.name];
            if (val === undefined || val === null || String(val).trim() === '') {
              missingFields.push(f.name);
            }
          }
        });
      });
    } else {
      if (!telecomProvider) missingFields.push('Telecom Provider');
      if (!mobileNumber) missingFields.push('Mobile Number');
      if (!simNumber) missingFields.push('SIM Number');
    }

    if (missingFields.length > 0) {
      showToast(`Please fill in required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const endpoint = isTelecomDataView ? 'telecom-data' : 'sim-details';
      const payload = {
        ...formData,
        ...extractedPdfData,
        custom_field_id: customFieldId || null,
        clientid: selectedClient || user?.clientid || null,
        country_id: selectedCountry || formData.country_id || user?.country_id || user?.countryid || 1,
        company_id: selectedCompany || null,
        user_id: user?.id || user?.userId || user?.user_id || null,
        role_id: user?.roleId || null,
        moduleid: isTelecomDataView ? 59 : 52,
        pdf_name: attachedPdfName || null,
        attached_pdf: attachedPdfName || null,
        pdf_base64: pdfBase64 || null,
        extracted_data: extractedPdfData || {},
        status: formData.status || 'Active'
      };

      const url = editingId ? `${API_URL}/api/${endpoint}/${editingId}` : `${API_URL}/api/${endpoint}`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || 'Failed to save record');
      }

      showToast(isTelecomDataView ? 'Telecom data saved to database successfully!' : (editingId ? 'SIM details updated successfully' : 'SIM details created successfully'), 'success');
      setIsModalOpen(false);
      setSuccessDetails(payload);
      setShowSuccessDialog(true);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error saving record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const endpoint = isTelecomDataView ? 'telecom-data' : 'sim-details';
      const res = await fetch(`${API_URL}/api/${endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Record deleted successfully', 'success');
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showToast('Error deleting record', 'error');
    }
  };

  const filteredRecords = records.filter(item => {
    let fd = {};
    let ed = {};
    try {
      fd = typeof item.field_data === 'string' ? JSON.parse(item.field_data) : (item.field_data || {});
      ed = typeof item.extracted_data === 'string' ? JSON.parse(item.extracted_data) : (item.extracted_data || {});
    } catch (e) {
      fd = {};
      ed = {};
    }
    const searchLower = search.toLowerCase();
    const mob = fd.mobile_account || ed.mobile_account || fd.mobile_number || fd.sim_number || '';
    const prov = fd.telecom_provider || ed.telecom_provider || fd.provider || '';
    return (
      String(item.id).includes(searchLower) ||
      mob.toLowerCase().includes(searchLower) ||
      prov.toLowerCase().includes(searchLower) ||
      (fd.plan_name && fd.plan_name.toLowerCase().includes(searchLower)) ||
      (item.client_name && item.client_name.toLowerCase().includes(searchLower)) ||
      (item.company_name && item.company_name.toLowerCase().includes(searchLower))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Auto fill form data from uploaded PDF and automatically persist to tbl_telecome_data
  const handleAutoFillFromPdf = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setAttachedPdfName(file.name);
    setParsingPdf(true);

    try {
      // 1. Read Base64 string of PDF file
      const b64Promise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      const b64Data = await b64Promise;
      setPdfBase64(b64Data);

      // 2. Send PDF to parser API
      const formDataPayload = new FormData();
      formDataPayload.append('pdf', file);

      const res = await fetch(`${API_URL}/api/pdf/parse-pdf`, {
        method: 'POST',
        body: formDataPayload,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to extract PDF data');

      const extracted = data.extractedData || data.parsedData || data.data || {};
      setExtractedPdfData(extracted);

      const updatedFormData = {
        ...formData,
        ...extracted,
        attached_pdf: file.name
      };
      setFormData(updatedFormData);

      // 3. Immediately insert extracted PDF record into database table (tbl_telecome_data)
      if (isTelecomDataView) {
        const dbPayload = {
          ...extracted,
          ...updatedFormData,
          custom_field_id: customFieldId || null,
          clientid: selectedClient || user?.clientid || null,
          country_id: selectedCountry || formData.country_id || user?.country_id || user?.countryid || 1,
          company_id: selectedCompany || null,
          user_id: user?.id || user?.userId || user?.user_id || null,
          role_id: user?.roleId || null,
          moduleid: 59,
          pdf_name: file.name,
          attached_pdf: file.name,
          pdf_base64: b64Data,
          extracted_data: extracted,
          status: 'Active'
        };

        const saveRes = await fetch(`${API_URL}/api/telecom-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbPayload)
        });

        if (saveRes.ok) {
          const resData = await saveRes.json().catch(() => ({}));
          showToast('PDF data extracted and saved to database successfully!', 'success');
          setIsModalOpen(false);
          setSuccessDetails(resData && resData.id ? resData : dbPayload);
          setShowSuccessDialog(true);
          fetchInitialData();
        } else {
          showToast('PDF extracted, but failed to save to database', 'warning');
        }
      } else {
        showToast('PDF data extracted successfully!', 'success');
      }
    } catch (err) {
      console.error('PDF Parse Error:', err);
      showToast(err.message || 'Error extracting PDF data', 'error');
    } finally {
      setParsingPdf(false);
    }
  };

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
          <View style={styles.iconWrapper}>
            <Ionicons name="hardware-chip-outline" size={24} color="#166534" />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>{title}</Text>
            <Text style={styles.tabHeadingSubtitle}>
              Manage your {title.toLowerCase()} and subscription records.
            </Text>
          </View>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABLE SECTION */}
      <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
        {renderTableToolbar
          ? renderTableToolbar(search, setSearch, setPage, 'Search by ID, mobile number, provider...')
          : null}

        {loading ? (
          <View style={styles.tableLoaderContainer}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={styles.loaderText}>Loading SIM details...</Text>
          </View>
        ) : filteredRecords.length > 0 ? (
          <>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={[styles.tableWrapper, { minWidth: isTelecomDataView ? 1500 : 900 }]}>
                <View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                    {isTelecomDataView ? (
                      <>
                        <Text style={[styles.thCell, { flex: 1.8 }]}>COMPANY</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>MOBILE SERVICE</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>MOBILE NO</Text>
                        <Text style={[styles.thCell, { flex: 1.6 }]}>BILL NUMBER</Text>
                        <Text style={[styles.thCell, { flex: 1.4 }]}>PERIOD FROM</Text>
                        <Text style={[styles.thCell, { flex: 1.4 }]}>PERIOD TO</Text>
                        <Text style={[styles.thCell, { flex: 1.4 }]}>SERVICE RENTAL</Text>
                        <Text style={[styles.thCell, { flex: 1.4 }]}>USAGE CHARGES</Text>
                        <Text style={[styles.thCell, { flex: 1.2 }]}>VAT</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>TOTAL AMOUNT</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.thCell, { flex: 2.0 }]}>CLIENT INFO</Text>
                        <Text style={[styles.thCell, { flex: 2.0 }]}>TELECOM PROVIDER</Text>
                        <Text style={[styles.thCell, { flex: 2.0 }]}>MOBILE NUMBER</Text>
                        <Text style={[styles.thCell, { flex: 2.0 }]}>PLAN NAME</Text>
                        <Text style={[styles.thCell, { flex: 1.5 }]}>MONTHLY AMOUNT</Text>
                      </>
                    )}
                    <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>ACTION</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedRecords.map((item, index) => {
                    let fd = {};
                    let ed = {};
                    try {
                      fd = typeof item.field_data === 'string' ? JSON.parse(item.field_data) : (item.field_data || {});
                      ed = typeof item.extracted_data === 'string' ? JSON.parse(item.extracted_data) : (item.extracted_data || {});
                    } catch (e) {
                      fd = {};
                      ed = {};
                    }

                    const isInactive = item.status === 'Inactive' || item.status === 'Suspended' || item.status === 'Cancelled';

                    const companyName = item.company_name || item.company || fd.company || fd.company_name || item.client_name || 'N/A';
                    const mobileService = item.telecom_provider || fd.telecom_provider || ed.telecom_provider || fd.provider || 'Etisalat';
                    const mobileNo = item.mobile_number || item.mobile_account || fd.mobile_account || ed.mobile_account || fd.mobile_number || fd.phone_number || 'N/A';
                    const billNo = item.bill_number || item.doc_number || fd.bill_number || ed.bill_number || fd.doc_number || 'N/A';
                    const periodFrom = item.period_from || fd.period_from || ed.period_from || fd.bill_period_from || fd.start_date || 'N/A';
                    const periodTo = item.period_to || fd.period_to || ed.period_to || fd.bill_period_to || fd.end_date || 'N/A';
                    const serviceRental = item.service_rental || fd.service_rental || ed.service_rental || '0.00';
                    const usageCharges = item.usage_charges || fd.usage_charges || ed.usage_charges || '0.00';
                    const vatAmt = item.vat || fd.vat || ed.vat || '0.00';
                    const totalAmt = item.total_amount || fd.total_amount || ed.total_amount || fd.monthly_plan_amount;

                    return (
                      <View key={item.id} style={[styles.tableRow, index === paginatedRecords.length - 1 && styles.lastTableRow]}>
                        <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700' }]}>#{item.id}</Text>
                        
                        {isTelecomDataView ? (
                          <>
                            {/* COMPANY */}
                            <View style={[styles.tdCell, { flex: 1.8 }]}>
                              <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{companyName}</Text>
                            </View>

                            {/* MOBILE SERVICE */}
                            <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '600', color: '#1E40AF' }]}>
                              {mobileService}
                            </Text>

                            {/* MOBILE NO */}
                            <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '600', color: COLORS.textPrimary }]}>
                              {mobileNo}
                            </Text>

                            {/* BILL NUMBER */}
                            <Text style={[styles.tdCell, { flex: 1.6, fontWeight: '600', color: COLORS.textPrimary }]}>
                              {billNo}
                            </Text>

                            {/* BILL PERIOD FROM */}
                            <Text style={[styles.tdCell, { flex: 1.4, color: COLORS.textSecondary }]}>
                              {periodFrom}
                            </Text>

                            {/* BILL PERIOD TO */}
                            <Text style={[styles.tdCell, { flex: 1.4, color: COLORS.textSecondary }]}>
                              {periodTo}
                            </Text>

                            {/* SERVICE RENTAL */}
                            <Text style={[styles.tdCell, { flex: 1.4, color: COLORS.textPrimary }]}>
                              {serviceRental ? `${serviceRental} AED` : '0.00 AED'}
                            </Text>

                            {/* USAGE CHARGES */}
                            <Text style={[styles.tdCell, { flex: 1.4, color: COLORS.textPrimary }]}>
                              {usageCharges ? `${usageCharges} AED` : '0.00 AED'}
                            </Text>

                            {/* VAT */}
                            <Text style={[styles.tdCell, { flex: 1.2, color: COLORS.textSecondary }]}>
                              {vatAmt ? `${vatAmt} AED` : '0.00 AED'}
                            </Text>

                            {/* TOTAL AMOUNT */}
                            <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '700', color: '#15803D' }]}>
                              {totalAmt ? `${totalAmt} AED` : 'N/A'}
                            </Text>
                          </>
                        ) : (
                          <>
                            <View style={[styles.tdCell, { flex: 2.0 }]}>
                              <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{item.client_name || 'N/A'}</Text>
                              {item.country_name && <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{item.country_name}</Text>}
                            </View>

                            <Text style={[styles.tdCell, { flex: 2.0, fontWeight: '600', color: COLORS.textPrimary }]}>
                              {fd.telecom_provider || 'N/A'}
                            </Text>

                            <Text style={[styles.tdCell, { flex: 2.0, color: COLORS.textPrimary }]}>
                              {fd.mobile_number || 'N/A'}
                            </Text>

                            <Text style={[styles.tdCell, { flex: 2.0, color: COLORS.textSecondary }]}>
                              {fd.plan_name || 'N/A'}
                            </Text>

                            <Text style={[styles.tdCell, { flex: 1.5, fontWeight: '600', color: COLORS.textPrimary }]}>
                              {fd.monthly_plan_amount ? `${fd.monthly_plan_amount} AED` : 'N/A'}
                            </Text>
                          </>
                        )}

                        {/* Status Badge */}
                        <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                          <View style={[styles.statusBadge, {
                            backgroundColor: isInactive ? '#FEE2E2' : '#E0F2FE',
                            borderColor: isInactive ? '#FCA5A5' : '#7DD3FC',
                            borderWidth: 1,
                          }]}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: isInactive ? '#EF4444' : '#0284C7',
                              textTransform: 'uppercase',
                            }}>
                              {item.status || 'ACTIVE'}
                            </Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={[styles.tdCell, { flex: 1.5, flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                          <TouchableOpacity onPress={() => openModal(item, true)}>
                            <Ionicons name="eye-outline" size={18} color="#64748B" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openModal(item, false)}>
                            <Ionicons name="pencil-outline" size={18} color="#166534" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {renderTablePagination
              ? renderTablePagination(filteredRecords.length, page, setPage)
              : null}
          </>
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="hardware-chip-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{records.length === 0 ? "No SIM details added yet." : "No matching SIM details found."}</Text>
          </View>
        )}
      </View>

      {/* MODAL FORM WITH PURCHASE DETAILS WIZARD DESIGN */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={styles.modalContent}>
            
            {/* Header with Green Document Icon matching Purchase Details */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={24} color="#166534" />
                <Text style={styles.modalTitle}>
                  {isViewOnly ? `View SIM Details Record #${editingId}` : (editingId ? `Edit SIM Details Record #${editingId}` : 'Add SIM Details')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* WIZARD STEP HEADER BAR */}
            {!isViewOnly && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
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

            {/* STEP 1: CONFIGURATION */}
            {wizardStep === 1 ? (
              <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24 }}>
                <View style={{ flex: 1, minHeight: 320 }}>
                  {/* Client Searchable Dropdown */}
                  {(!user || String(user.roleId) === '1') && (
                    <View style={{ marginBottom: 24, zIndex: 30 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>CLIENT *</Text>
                      <SearchableDropdown
                        data={clients}
                        value={selectedClient}
                        onChange={handleClientChange}
                        placeholder="-- Select Client --"
                        searchPlaceholder="Search Client..."
                        displayKey="client_name"
                        valueKey="id"
                      />
                    </View>
                  )}

                  {/* Company Searchable Dropdown */}
                  <View style={{ marginBottom: 32, zIndex: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' }}>COMPANY *</Text>
                    <SearchableDropdown
                      data={companies}
                      value={selectedCompany}
                      onChange={(val) => setSelectedCompany(val)}
                      placeholder="-- Select Company --"
                      searchPlaceholder="Search Company..."
                      displayKey="company_name"
                      valueKey="id"
                    />
                  </View>

                  {/* Next Button matching Purchase Details style */}
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: selectedClient ? '#8FA89B' : '#CBD5E1', marginTop: 16 }
                    ]}
                    disabled={!selectedClient}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.submitBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* STEP 2: FORM DATA */
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 24 }}>
                  
                  {/* AUTO-FILL FORM FROM PDF (Only in Client Logged Section) */}
                  {isClientLogged && !isViewOnly && (
                    <View style={{ marginBottom: 16 }}>
                      <input
                        type="file"
                        id="telecomDataPdfInput"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleAutoFillFromPdf}
                        disabled={parsingPdf}
                      />
                      <label htmlFor="telecomDataPdfInput" style={{ cursor: 'pointer', display: 'inline-block' }}>
                        <View style={styles.autoFillBtn}>
                          {parsingPdf ? (
                            <ActivityIndicator size="small" color="#7C3AED" />
                          ) : (
                            <Ionicons name="document-attach-outline" size={18} color="#7C3AED" />
                          )}
                          <Text style={styles.autoFillBtnText}>
                            {parsingPdf ? 'Extracting PDF...' : 'Attach PDF'}
                          </Text>
                        </View>
                      </label>

                      {/* Attached PDF Badge / Display Chip */}
                      {attachedPdfName ? (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#EFF6FF',
                          borderColor: '#BFDBFE',
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginTop: 10,
                          gap: 8,
                          alignSelf: 'flex-start'
                        }}>
                          <Ionicons name="document-text-outline" size={16} color="#2563EB" />
                          <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '600' }}>{attachedPdfName}</Text>
                          <TouchableOpacity onPress={() => setAttachedPdfName('')} style={{ marginLeft: 6 }}>
                            <Ionicons name="close-circle" size={16} color="#93C5FD" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  )}
                  
                  {/* FORM FIELDS SECTION */}
                  {fieldsLayout && fieldsLayout.length > 0 ? (
                    fieldsLayout.map((section, index) => (
                      <View key={section.id || index} style={[styles.sectionCard, { marginTop: index > 0 ? SPACING.md : 0 }]}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>{(section.name || 'SIM DETAILS').toUpperCase()}</Text>
                        </View>
                        <View style={styles.sectionBody}>
                          {section.fields && section.fields.map((field) => (
                            <View key={field.id} style={styles.fieldContainer}>
                              <Text style={styles.fieldLabel}>
                                {field.name} {field.isRequired && <Text style={{ color: COLORS.error }}>*</Text>}
                              </Text>
                              {renderCustomField(field)}
                            </View>
                          ))}
                        </View>
                      </View>
                    ))
                  ) : (
                    /* FALLBACK STATIC SECTION CARD IF NO CUSTOM FIELDS LAYOUT CONFIGURED */
                    <View style={styles.sectionCard}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>SIM DETAILS</Text>
                      </View>

                      <View style={styles.sectionBody}>
                        {/* Telecom Provider */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Telecom Provider <Text style={{ color: COLORS.error }}>*</Text>
                          </Text>
                          {providers.length > 0 ? (
                            <SearchableDropdown
                              data={providers}
                              value={formData.telecom_provider}
                              onChange={(val) => handleChange('telecom_provider', val)}
                              placeholder="-- Select Provider --"
                              searchPlaceholder="Search Telecom Provider..."
                              displayKey="provider_name"
                              valueKey="provider_name"
                              disabled={isViewOnly}
                            />
                          ) : (
                            <TextInput
                              style={[styles.input, isViewOnly && styles.readOnlyInput]}
                              placeholder="e.g. Etisalat, du"
                              value={formData.telecom_provider}
                              onChangeText={val => handleChange('telecom_provider', val)}
                              editable={!isViewOnly}
                            />
                          )}
                        </View>

                        {/* Mobile Number */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Mobile Number <Text style={{ color: COLORS.error }}>*</Text>
                          </Text>
                          <PhoneInputWithCountryCode
                            value={formData.mobile_number}
                            onChangeText={val => handleChange('mobile_number', val)}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* SIM Number / ICCID */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            SIM Number / ICCID <Text style={{ color: COLORS.error }}>*</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 8997101000..."
                            value={formData.sim_number}
                            onChangeText={val => handleChange('sim_number', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Account / Mobile Account */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Account Number / Mobile Account</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 0522486345"
                            value={formData.account_number || formData.mobile_account}
                            onChangeText={val => {
                              handleChange('account_number', val);
                              handleChange('mobile_account', val);
                            }}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Bill Number */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Bill / Invoice Number</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. INV2045264801"
                            value={formData.bill_number || formData.doc_number}
                            onChangeText={val => {
                              handleChange('bill_number', val);
                              handleChange('doc_number', val);
                            }}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Bill Period From */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Bill Period From</Text>
                          <input
                            type="date"
                            value={formData.period_from || ''}
                            onChange={(e) => handleChange('period_from', e.target.value)}
                            style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && styles.readOnlyInput])}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Bill Period To */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Bill Period To</Text>
                          <input
                            type="date"
                            value={formData.period_to || ''}
                            onChange={(e) => handleChange('period_to', e.target.value)}
                            style={StyleSheet.flatten([styles.htmlDateInput, isViewOnly && styles.readOnlyInput])}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Service Rental */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Service Rental (AED)</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 200.00"
                            keyboardType="numeric"
                            value={formData.service_rental}
                            onChangeText={val => handleChange('service_rental', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Usage Charges */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Usage Charges (AED)</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 72.20"
                            keyboardType="numeric"
                            value={formData.usage_charges}
                            onChangeText={val => handleChange('usage_charges', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* VAT */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>VAT (AED)</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 10.85"
                            keyboardType="numeric"
                            value={formData.vat}
                            onChangeText={val => handleChange('vat', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Total Amount */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Total Amount (AED)</Text>
                          <TextInput
                            style={[styles.input, { fontWeight: '700', color: '#166534' }, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 283.05"
                            keyboardType="numeric"
                            value={formData.total_amount}
                            onChangeText={val => handleChange('total_amount', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Plan Name */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Plan Name</Text>
                          {simPlans.length > 0 ? (
                            <SearchableDropdown
                              data={simPlans}
                              value={formData.plan_name}
                              onChange={(val) => handleChange('plan_name', val)}
                              placeholder="-- Select SIM Plan --"
                              searchPlaceholder="Search SIM Plan..."
                              displayKey="plan_name"
                              valueKey="plan_name"
                              disabled={isViewOnly}
                            />
                          ) : (
                            <TextInput
                              style={[styles.input, isViewOnly && styles.readOnlyInput]}
                              placeholder="e.g. Business Freedom 150"
                              value={formData.plan_name}
                              onChangeText={val => handleChange('plan_name', val)}
                              editable={!isViewOnly}
                            />
                          )}
                        </View>

                        {/* Monthly Plan Amount */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Monthly Plan Amount (AED)</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 150"
                            keyboardType="numeric"
                            value={formData.monthly_plan_amount}
                            onChangeText={val => handleChange('monthly_plan_amount', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Data Allowance */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Data Allowance (GB)</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 25"
                            keyboardType="numeric"
                            value={formData.data_allowance}
                            onChangeText={val => handleChange('data_allowance', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Local Minutes */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Local Minutes</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 1000"
                            keyboardType="numeric"
                            value={formData.local_minutes}
                            onChangeText={val => handleChange('local_minutes', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* International Minutes */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>International Minutes</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 200"
                            keyboardType="numeric"
                            value={formData.international_minutes}
                            onChangeText={val => handleChange('international_minutes', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Local SMS Allowance */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Local SMS Allowance</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 500"
                            keyboardType="numeric"
                            value={formData.local_sms_allowance}
                            onChangeText={val => handleChange('local_sms_allowance', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* International SMS Allowance */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>International SMS Allowance</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. 100"
                            keyboardType="numeric"
                            value={formData.international_sms_allowance}
                            onChangeText={val => handleChange('international_sms_allowance', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* Activation Date */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Activation Date</Text>
                          <input
                            type="date"
                            value={formData.activation_date || ''}
                            onChange={(e) => handleChange('activation_date', e.target.value)}
                            style={styles.htmlDateInput}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Contract Start Date */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Contract Start Date</Text>
                          <input
                            type="date"
                            value={formData.contract_start_date || ''}
                            onChange={(e) => handleChange('contract_start_date', e.target.value)}
                            style={styles.htmlDateInput}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Contract Expiry Date */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Contract Expiry Date</Text>
                          <input
                            type="date"
                            value={formData.contract_expiry_date || ''}
                            onChange={(e) => handleChange('contract_expiry_date', e.target.value)}
                            style={styles.htmlDateInput}
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Assigned Employee */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Assigned Employee</Text>
                          {employees.length > 0 ? (
                            <SearchableDropdown
                              data={employees}
                              value={formData.assigned_employee}
                              onChange={(val) => handleChange('assigned_employee', val)}
                              placeholder="-- Select Employee --"
                              searchPlaceholder="Search Employee..."
                              displayKey="full_name"
                              valueKey="full_name"
                              disabled={isViewOnly}
                            />
                          ) : (
                            <TextInput
                              style={[styles.input, isViewOnly && styles.readOnlyInput]}
                              placeholder="e.g. John Doe"
                              value={formData.assigned_employee}
                              onChangeText={val => handleChange('assigned_employee', val)}
                              editable={!isViewOnly}
                            />
                          )}
                        </View>

                        {/* Department */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Department</Text>
                          <TextInput
                            style={[styles.input, isViewOnly && styles.readOnlyInput]}
                            placeholder="e.g. IT Department"
                            value={formData.department}
                            onChangeText={val => handleChange('department', val)}
                            editable={!isViewOnly}
                          />
                        </View>

                        {/* SIM Status */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>SIM Status</Text>
                          <SearchableDropdown
                            data={[
                              { label: 'Active', value: 'Active' },
                              { label: 'Available', value: 'Available' },
                              { label: 'Assigned', value: 'Assigned' },
                              { label: 'Suspended', value: 'Suspended' },
                              { label: 'Lost', value: 'Lost' },
                              { label: 'Damaged', value: 'Damaged' },
                              { label: 'Cancelled', value: 'Cancelled' }
                            ]}
                            value={formData.status}
                            onChange={(val) => handleChange('status', val)}
                            placeholder="Select Status"
                            displayKey="label"
                            valueKey="value"
                            disabled={isViewOnly}
                          />
                        </View>

                        {/* Remarks / Notes */}
                        <View style={styles.fieldContainerFull}>
                          <Text style={styles.fieldLabel}>Notes / Remarks</Text>
                          <TextInput
                            style={[styles.input, { height: 80 }, isViewOnly && styles.readOnlyInput]}
                            placeholder="Additional notes..."
                            multiline={true}
                            value={formData.remarks}
                            onChangeText={val => handleChange('remarks', val)}
                            editable={!isViewOnly}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                </ScrollView>

                {/* Bottom Action Footer */}
                <View style={styles.modalFooter}>
                  {!isViewOnly && (
                    <TouchableOpacity style={styles.backBtn} onPress={() => setWizardStep(1)}>
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                      <Text style={styles.cancelBtnText}>{isViewOnly ? 'Close' : 'Cancel'}</Text>
                    </TouchableOpacity>

                    {!isViewOnly && (
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.saveBtnText}>Complete & Save</Text>
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

      {/* SUCCESS DIALOGUE BOX MODAL */}
      <Modal
        visible={showSuccessDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessDialog(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '90%', maxWidth: 480, padding: 24 }}>
            
            {/* Header Icon & Title */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={36} color="#166534" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center' }}>
                Record Saved Successfully!
              </Text>
              <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                The record has been stored in <Text style={{ fontWeight: '600', color: '#0F172A' }}>tbl_telecome_data</Text>.
              </Text>
            </View>

            {/* Extracted Details Summary Card */}
            {successDetails && (
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                  Saved Record Details
                </Text>

                <View style={{ gap: 8 }}>
                  {successDetails.company && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>Company:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{successDetails.company}</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>Telecom Service:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E40AF' }}>{successDetails.telecom_provider || successDetails.provider || 'Etisalat'}</Text>
                  </View>

                  {(successDetails.mobile_account || successDetails.mobile_number) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>Mobile Account / No:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{successDetails.mobile_account || successDetails.mobile_number}</Text>
                    </View>
                  )}

                  {(successDetails.bill_number || successDetails.doc_number) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>Bill Number:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{successDetails.bill_number || successDetails.doc_number}</Text>
                    </View>
                  )}

                  {(successDetails.period_from || successDetails.period_to) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>Bill Period:</Text>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#334155' }}>
                        {successDetails.period_from || 'N/A'} to {successDetails.period_to || 'N/A'}
                      </Text>
                    </View>
                  )}

                  {successDetails.total_amount && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Total Amount:</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803D' }}>{successDetails.total_amount} AED</Text>
                    </View>
                  )}

                  {(successDetails.pdf_name || successDetails.attached_pdf) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#64748B' }}>Attached PDF:</Text>
                      <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '500' }}>{successDetails.pdf_name || successDetails.attached_pdf}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={{ backgroundColor: '#166534', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => setShowSuccessDialog(false)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>OK, Close</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrapper: {
    justifyContent: 'center',
  },
  tabHeadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabHeadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#166534',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    ...SHADOWS.card,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  tableLoaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  tableWrapper: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tdCell: {
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
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
    minHeight: 560,
    backgroundColor: COLORS.white,
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
    borderBottomColor: '#E2E8F0',
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

  /* SECTION CARD STYLING MATCHING PURCHASE DETAILS */
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
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
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
  fieldContainerFull: {
    width: '100%',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
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
    width: '100%',
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
    outlineStyle: 'none',
    boxSizing: 'border-box'
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  submitBtn: {
    backgroundColor: '#8FA89B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    minWidth: 110,
    elevation: 2,
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  modalFooter: {
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  backBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#166534',
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    alignSelf: 'flex-start',
  },
  autoFillBtnText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 13,
  }
});
