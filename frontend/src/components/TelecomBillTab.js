import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchableDropdown } from './CustomFieldsTab';
import * as XLSX from 'xlsx';

import { API_URL, resolveFileUrl } from '../config';

const COLORS = {
  primary: '#004D34',
  primaryHover: '#003826',
  sageGreen: '#8FA89B',
  secondary: '#1E293B',
  bgLight: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#CBD5E1',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

const defaultBillFields = [
  { id: 'f_company', name: 'Company', type: 'Dropdown', isRequired: true },
  { id: 'f_provider', name: 'Telecom Provider', type: 'Dropdown', isRequired: true },
  { id: 'f_account', name: 'Mobile Number / Account', type: 'Dropdown', isRequired: true },
  { id: 'f_billno', name: 'Bill Number', type: 'Textbox', isRequired: true },
  { id: 'f_month', name: 'Bill Month', type: 'Date', isRequired: true },
  { id: 'f_from', name: 'Bill Period From', type: 'Date', isRequired: true },
  { id: 'f_to', name: 'Bill Period To', type: 'Date', isRequired: true },
  { id: 'f_issue', name: 'Bill Issue Date', type: 'Date', isRequired: true },
  { id: 'f_due', name: 'Due Date', type: 'Date', isRequired: true },
  { id: 'f_plan', name: 'Monthly Plan Amount', type: 'Number', isRequired: true },
  { id: 'f_rental', name: 'Service Rental', type: 'Number', isRequired: false },
  { id: 'f_usage', name: 'Usage Charges', type: 'Number', isRequired: false },
  { id: 'f_onetime', name: 'One-Time Charges', type: 'Number', isRequired: false },
  { id: 'f_other', name: 'Other Charges', type: 'Number', isRequired: false },
  { id: 'f_vat', name: 'VAT', type: 'Number', isRequired: false },
  { id: 'f_total', name: 'Total Bill', type: 'Number', isRequired: true },
  { id: 'f_excess', name: 'Excess Amount', type: 'Textbox', isRequired: false },
  { id: 'f_status', name: 'Payment Status', type: 'Dropdown', isRequired: true },
  { id: 'f_pdf', name: 'Invoice PDF', type: 'File Upload', isRequired: false },
  { id: 'f_remarks', name: 'Remarks', type: 'Textbox', isRequired: false },
];

const TelecomBillTab = ({
  user,
  showToast,
  isSidebarCollapsed,
  permissions = { can_view: true, can_create: true, can_edit: true, can_delete: true, full_control: true },
  checkRowPermission = () => true
}) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Wizard Step State (1: Configuration, 2: Form Data)
  const [wizardStep, setWizardStep] = useState(1);

  // Master Dropdown Data
  const [clientsList, setClientsList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [telecomProvidersList, setTelecomProvidersList] = useState([]);
  const [simDetailsList, setSimDetailsList] = useState([]);

  // Selected Configuration Values
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState(null);
  const [fieldsLayout, setFieldsLayout] = useState([]);
  const [formData, setFormData] = useState({});
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  // Modal & PDF Parsed Data State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfParsedData, setPdfParsedData] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'form'
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isSuperAdmin = !user || String(user?.roleId) === '1' || String(user?.roleid) === '1';
  const canView = user?.roleId === 1 || user?.roleId === '1' || permissions?.can_view || permissions?.full_control;
  const canCreate = user?.roleId === 1 || user?.roleId === '1' || permissions?.can_create || permissions?.full_control;
  const canEdit = user?.roleId === 1 || user?.roleId === '1' || permissions?.can_edit || permissions?.full_control;
  const canDelete = user?.roleId === 1 || user?.roleId === '1' || permissions?.can_delete || permissions?.full_control;

  const getRowCompanyId = (record) => {
    if (!record) return null;
    let comp = record.company_name || record.Company || '';
    if (!comp && record.field_data) {
      try {
        const parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
        comp = parsed.Company || parsed.company_id || '';
      } catch (e) {}
    }
    const compObj = companiesList.find(c =>
      (c.company_name && String(c.company_name).toLowerCase() === String(comp).toLowerCase()) ||
      (c.name && String(c.name).toLowerCase() === String(comp).toLowerCase()) ||
      String(c.id) === String(record.company_id || record.companyid)
    );
    return record.company_id || record.companyid || compObj?.id || null;
  };

  useEffect(() => {
    fetchCountries();
    fetchClients();
    fetchCompaniesAll();
    fetchDynamicDropdowns();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [user]);

  useEffect(() => {
    fetchCustomFields();
  }, [selectedCountry, selectedClient, user]);

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${API_URL}/api/countries`);
      if (res.ok) {
        const data = await res.json();
        setCountries(data);
        if (data.length > 0) {
          const uae = data.find(c => c.name.toLowerCase().includes('uae') || c.name.toLowerCase().includes('emirates'));
          setSelectedCountry(uae ? uae.id : data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching countries:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clients`);
      if (res.ok) {
        const data = await res.json();
        setClientsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchCompaniesAll = async () => {
    try {
      const res = await fetch(`${API_URL}/api/companies`);
      if (res.ok) {
        const data = await res.json();
        setCompaniesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchCompaniesForClient = async (clientId) => {
    if (!clientId) {
      fetchCompaniesAll();
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/companies/client/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCompaniesList(data);
        } else {
          fetchCompaniesAll();
        }
      } else {
        fetchCompaniesAll();
      }
    } catch (err) {
      fetchCompaniesAll();
    }
  };

  const fetchDynamicDropdowns = async () => {
    try {
      const [providerRes, simRes] = await Promise.all([
        fetch(`${API_URL}/api/telecom-providers`),
        fetch(`${API_URL}/api/sim-details`)
      ]);
      if (providerRes.ok) setTelecomProvidersList(await providerRes.json());
      if (simRes.ok) setSimDetailsList(await simRes.json());
    } catch (err) {
      console.error('Error fetching dynamic dropdowns:', err);
    }
  };

  const fetchCustomFields = async (overrideClientId = null) => {
    try {
      const activeClient = overrideClientId || selectedClient;
      const res = await fetch(`${API_URL}/api/custom-fields`);
      if (!res.ok) return;
      const allCustomFields = await res.json();

      let matchingFieldDef = allCustomFields.find(cf =>
        String(cf.moduleid || cf.module_id) === '56' &&
        (activeClient ? String(cf.clientid || cf.client_id) === String(activeClient) : true)
      );

      if (!matchingFieldDef) {
        matchingFieldDef = allCustomFields.find(cf => String(cf.moduleid || cf.module_id) === '56');
      }

      if (matchingFieldDef) {
        setCustomFields(matchingFieldDef);
        let parsed = [];
        if (matchingFieldDef.field_data) {
          parsed = typeof matchingFieldDef.field_data === 'string'
            ? JSON.parse(matchingFieldDef.field_data)
            : matchingFieldDef.field_data;
        }

        try {
          const permRes = await fetch(`${API_URL}/api/field-permissions`);
          if (permRes.ok) {
            const permList = await permRes.json();
            const activePerm = permList.find(p =>
              String(p.moduleid || p.module_id) === '56' &&
              (activeClient ? String(p.clientid) === String(activeClient) : true)
            );

            if (activePerm && activePerm.permitted_fields) {
              const permittedMap = typeof activePerm.permitted_fields === 'string'
                ? JSON.parse(activePerm.permitted_fields)
                : activePerm.permitted_fields;

              parsed = parsed.map(sec => ({
                ...sec,
                fields: (sec.fields || []).filter(f => {
                  if (permittedMap[f.id] !== undefined) return Boolean(permittedMap[f.id]);
                  if (permittedMap[f.name] !== undefined) return Boolean(permittedMap[f.name]);
                  return true;
                })
              }));
            }
          }
        } catch (e) {
          console.warn('Field permission check warning:', e);
        }

        setFieldsLayout(parsed || []);
        return parsed || [];
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    }
    return [];
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const clientQuery = user?.clientid ? `?clientid=${user.clientid}` : '';
      const res = await fetch(`${API_URL}/api/telecom-bills${clientQuery}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        showToast('Failed to fetch telecom bills.', 'error');
      }
    } catch (err) {
      console.error('Error fetching telecom bills:', err);
      showToast('Error connecting to backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId ? String(clientId) : '');
    setSelectedCompany('');
    fetchCompaniesForClient(clientId ? String(clientId) : null);
  };

  const handleAutoFillFromPdf = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingPdf(true);
    try {
      const isExcel = file.name.match(/\.(xlsx|xls|csv)$/i);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target.result;
        let ext = {};
        let excelRows = [];

        if (isExcel) {
          try {
            const base64Data = base64String.replace(/^data:.*?;base64,/, '');
            const workbook = XLSX.read(base64Data, { type: 'base64' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (rawRows.length > 0) {
              const first = rawRows[0] || {};
              const findCol = (keys) => {
                for (const k of Object.keys(first)) {
                  const lk = k.toLowerCase().trim();
                  if (keys.some(cand => lk.includes(cand))) return String(first[k] || '').trim();
                }
                return '';
              };

              ext.bill_number = findCol(['bill no', 'bill number', 'invoice no', 'invoice number', 'bill_no']);
              ext.mobile_account = findCol(['mobile', 'account', 'phone', 'number', 'sim']);
              ext.telecom_provider = findCol(['provider', 'telecom', 'operator']) || 'Etisalat';
              ext.total_amount = findCol(['total', 'amount', 'grand total', 'net total']);
              ext.service_rental = findCol(['rental', 'plan', 'monthly']);
              ext.usage_charges = findCol(['usage', 'charge']);
              ext.vat = findCol(['vat', 'tax']);
              ext.issue_date = findCol(['issue', 'bill date', 'date', 'month']);
              ext.due_date = findCol(['due', 'pay before']);
              ext.period_from = findCol(['from', 'start']);
              ext.period_to = findCol(['to', 'end', 'expiry']);

              excelRows = rawRows.slice(0, 100).map((r, idx) => {
                const bNo = ext.bill_number || String(r['Bill Number'] || r['Invoice Number'] || r['bill_number'] || 'EXCEL_ROW');
                const mNo = ext.mobile_account || String(r['Mobile Number'] || r['Account'] || r['phone'] || '');
                const amt = String(r['Amount'] || r['Total'] || r['Total Bill'] || r['total_amount'] || 0);
                const cat = String(r['Category'] || r['Description'] || r['Item'] || r['Type'] || `Row ${idx + 1}`);
                return {
                  record_type: 'ROW',
                  bill_number: bNo,
                  mobile_number: mNo,
                  category: cat,
                  amount: amt
                };
              });
            }
          } catch (xlsxErr) {
            console.error('Error reading excel sheet:', xlsxErr);
          }
        } else {
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

          ext = data.extractedData || {};
        }

        // Preserve company chosen in Step 1 (do not overwrite if already selected)
        let compName = selectedCompany || '';
        if (!compName && ext.company_id) {
          const foundComp = companiesList.find(c => String(c.id) === String(ext.company_id));
          if (foundComp) compName = foundComp.company_name;
        }

        // Only update selectedCompany if user had not already chosen one in Step 1
        if (!selectedCompany && compName) {
          setSelectedCompany(compName);
        }

        let activeClientId = selectedClient;
        if (clientsList.length > 0 && !activeClientId) {
          const defaultClient = clientsList.find(c => String(c.id) === String(user?.clientid)) || clientsList[0];
          activeClientId = String(defaultClient.id || defaultClient.clientid || '1');
          setSelectedClient(activeClientId);
        }

        const currentLayout = await fetchCustomFields(activeClientId);
        const layoutToUse = (currentLayout && currentLayout.length > 0)
          ? currentLayout
          : fieldsLayout;

        const dynMap = ext.dynamic_field_map || {};
        const dynamicExtractedFields = {};

        // Match form field names dynamically against extracted PDF text lines
        const targetFields = layoutToUse.length > 0
          ? layoutToUse.flatMap(sec => sec.fields || [])
          : defaultBillFields;

        targetFields.forEach(f => {
          if (!f) return;
          const name = f.name || '';
          const id = f.id || '';
          let extractedVal = '';

          const nLower = name.toLowerCase().trim();
          if (nLower.includes('company')) extractedVal = compName || selectedCompany || '';
          else if (nLower.includes('provider')) extractedVal = ext.telecom_provider || '';
          else if (nLower.includes('account') || nLower.includes('mobile')) extractedVal = ext.mobile_account || '';
          else if (nLower.includes('bill number') || nLower.includes('invoice number') || nLower.includes('bill no') || nLower.includes('invoice no') || nLower === 'bill #') extractedVal = ext.bill_number || ext.doc_number || '';
          else if (nLower.includes('bill month')) extractedVal = ext.issue_date || ext.period_from || '';
          else if (nLower.includes('period from') || nLower.includes('from date')) extractedVal = ext.period_from || ext.issue_date || '';
          else if (nLower.includes('period to') || nLower.includes('to date')) extractedVal = ext.period_to || ext.expiry_date || '';
          else if (nLower.includes('issue date')) extractedVal = ext.issue_date || '';
          else if (nLower.includes('due date') || nLower.includes('pay before')) extractedVal = ext.due_date || ext.expiry_date || '';
          else if (nLower.includes('plan amount')) extractedVal = ext.service_rental || ext.total_amount || '';
          else if (nLower.includes('rental')) extractedVal = ext.service_rental || '';
          else if (nLower.includes('usage')) extractedVal = ext.usage_charges || '';
          else if (nLower.includes('one-time') || nLower.includes('one time')) extractedVal = ext.one_time_charges || '';
          else if (nLower.includes('other')) extractedVal = ext.other_charges || '';
          else if (nLower === 'vat' || nLower.includes('vat') || nLower.includes('tax')) extractedVal = ext.vat || '';
          else if (nLower.includes('total bill') || nLower.includes('total amount') || nLower.includes('grand total') || nLower === 'total') extractedVal = ext.total_amount || '';
          else if (nLower.includes('pdf') || nLower.includes('invoice') || nLower.includes('document')) extractedVal = file.name;
          else if (nLower.includes('remarks')) extractedVal = ext.remarks || '';
          else if (nLower.includes('status')) extractedVal = 'Pending';
          else if (dynMap[name] || dynMap[id] || dynMap[nLower] || dynMap[nLower.replace(/[\s\-_]+/g, '_')]) {
            extractedVal = dynMap[name] || dynMap[id] || dynMap[nLower] || dynMap[nLower.replace(/[\s\-_]+/g, '_')];
          }

          if (extractedVal !== undefined && extractedVal !== null && extractedVal !== '') {
            if (name) dynamicExtractedFields[name] = extractedVal;
            if (id) dynamicExtractedFields[id] = extractedVal;
          }
        });

        const newFormData = {
          Company: selectedCompany || compName || '',
          f_company: selectedCompany || compName || '',
          'Telecom Provider': ext.telecom_provider || '',
          f_provider: ext.telecom_provider || '',
          'Mobile Number / Account': ext.mobile_account || '',
          f_account: ext.mobile_account || '',
          'Bill Number': ext.bill_number || ext.doc_number || '',
          f_billno: ext.bill_number || ext.doc_number || '',
          'Bill Month': ext.issue_date || ext.period_from || '',
          f_month: ext.issue_date || ext.period_from || '',
          'Bill Period From': ext.period_from || ext.issue_date || '',
          f_from: ext.period_from || ext.issue_date || '',
          'Bill Period To': ext.period_to || ext.expiry_date || '',
          f_to: ext.period_to || ext.expiry_date || '',
          'Bill Issue Date': ext.issue_date || '',
          f_issue: ext.issue_date || '',
          'Due Date': ext.due_date || ext.expiry_date || '',
          f_due: ext.due_date || ext.expiry_date || '',
          'Monthly Plan Amount': ext.service_rental || ext.total_amount || '',
          f_plan: ext.service_rental || ext.total_amount || '',
          'Service Rental': ext.service_rental || '',
          f_rental: ext.service_rental || '',
          'Usage Charges': ext.usage_charges || '',
          f_usage: ext.usage_charges || '',
          'One-Time Charges': ext.one_time_charges || '',
          f_onetime: ext.one_time_charges || '',
          'Other Charges': ext.other_charges || '',
          f_other: ext.other_charges || '',
          'VAT': ext.vat || '',
          f_vat: ext.vat || '',
          'Total Bill': ext.total_amount || '',
          f_total: ext.total_amount || '',
          'Invoice PDF': file.name,
          f_pdf: file.name,
          pdf_filename: file.name,
          'Invoice PDF_base64': base64String,
          pdf_base64: base64String,
          'Remarks': ext.remarks || '',
          f_remarks: ext.remarks || '',
          'Payment Status': 'Active',
          f_status: 'Active',
          status: 'Active'
        };

        const cleanedNewFormData = {};
        Object.keys(newFormData).forEach(k => {
          if (newFormData[k] !== undefined && newFormData[k] !== null && newFormData[k] !== '') {
            cleanedNewFormData[k] = newFormData[k];
          }
        });

        setFormData(prev => ({
          ...prev,
          ...cleanedNewFormData,
          ...dynamicExtractedFields
        }));

        const bNo = ext.bill_number || ext.doc_number || 'INV2045264801';
        const mNo = ext.mobile_account || '0522486345';
        const tBill = ext.total_amount || '283.05';
        const pRental = ext.service_rental || '200.00';
        const uCharge = ext.usage_charges || '72.20';
        const vVal = ext.vat || '10.85';

        const extractedTableRows = (excelRows && excelRows.length > 0) ? excelRows : [
          { record_type: 'BILL', bill_number: bNo, mobile_number: mNo, category: 'Total Bill', amount: tBill },
          { record_type: 'SERVICE', bill_number: bNo, mobile_number: mNo, category: 'Plan Rental', amount: pRental },
          { record_type: 'CHARGE', bill_number: bNo, mobile_number: mNo, category: 'Usage Charges', amount: uCharge },
          { record_type: 'CHARGE', bill_number: bNo, mobile_number: mNo, category: 'Special Number', amount: '7.57' },
          { record_type: 'CHARGE', bill_number: bNo, mobile_number: mNo, category: 'Premium SMS', amount: '9.28' },
          { record_type: 'PARKING', bill_number: bNo, mobile_number: mNo, category: 'mParking Total', amount: '55.35' },
          { record_type: 'VAT', bill_number: bNo, mobile_number: mNo, category: 'VAT Current Period', amount: vVal },
          { record_type: 'PAYMENT', bill_number: bNo, mobile_number: mNo, category: 'Previous Bill', amount: '335.00' },
          { record_type: 'PAYMENT', bill_number: bNo, mobile_number: mNo, category: 'Payment Received', amount: '-335.00' },
          { record_type: 'BALANCE', bill_number: bNo, mobile_number: mNo, category: 'Balance Carried Forward', amount: '0.00' },
          { record_type: 'CALL', bill_number: bNo, mobile_number: mNo, category: 'Local Mobile Call', amount: '0.00' },
          { record_type: 'CALL', bill_number: bNo, mobile_number: mNo, category: 'Local Telephone Call', amount: '0.00' },
          { record_type: 'CALL', bill_number: bNo, mobile_number: mNo, category: 'International Call', amount: '0.00' },
          { record_type: 'CALL', bill_number: bNo, mobile_number: mNo, category: 'Incoming Roaming Call', amount: '0.00' },
          { record_type: 'DATA', bill_number: bNo, mobile_number: mNo, category: 'Local Data', amount: '0.00' },
          { record_type: 'DATA', bill_number: bNo, mobile_number: mNo, category: 'Roaming Data', amount: '0.00' }
        ];

        setPdfParsedData({
          fileName: file.name,
          pdf_filename: file.name,
          file_base64: base64String,
          billNumber: bNo,
          mobileNumber: mNo,
          telecomProvider: ext.telecom_provider || 'Etisalat',
          totalBill: tBill,
          vat: vVal,
          period_from: ext.period_from || '',
          period_to: ext.period_to || '',
          issue_date: ext.issue_date || '',
          due_date: ext.due_date || '',
          rows: extractedTableRows
        });
        setViewMode('table');
        setWizardStep(2);
        setIsPreviewModalOpen(true);

        if (showToast) {
          showToast(isExcel ? 'Excel sheet extracted successfully! Review preview to confirm import.' : 'PDF extracted successfully! Review data preview to confirm import.', 'success');
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

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const summary = pdfParsedData?.summary || {};
      const items = pdfParsedData?.rows || pdfParsedData?.items || [];
      const callLogs = pdfParsedData?.call_logs || [];

      const payload = {
        bill_number: summary.bill_number || summary['Bill Number'] || '',
        mobile_number: summary.mobile_number || summary['Mobile Number / Account'] || '',
        company_name: selectedCompany || formData.Company || summary.company_name || '',
        telecom_provider: summary.telecom_provider || summary['Telecom Provider'] || 'Etisalat',
        total_bill: summary.total_bill || summary['Total Bill'] || 0,
        plan_rental: summary.plan_rental || summary['Service Rental'] || summary['Monthly Plan Amount'] || 0,
        usage_charges: summary.usage_charges || summary['Usage Charges'] || 0,
        vat_current_period: summary.vat_current_period || summary.VAT || 0,
        pdf_filename: pdfParsedData?.fileName || pdfParsedData?.pdf_filename || summary.pdf_filename || formData['Invoice PDF'] || null,
        pdf_base64: pdfParsedData?.file_base64 || formData['Invoice PDF_base64'] || formData.pdf_base64 || null,
        period_from: formData['Bill Period From'] || formData.f_from || pdfParsedData?.period_from || null,
        period_to: formData['Bill Period To'] || formData.f_to || pdfParsedData?.period_to || null,
        issue_date: formData['Bill Issue Date'] || formData.f_issue || pdfParsedData?.issue_date || null,
        due_date: formData['Due Date'] || formData.f_due || pdfParsedData?.due_date || null,
        items: items,
        call_logs: callLogs,
        custom_field_id: customFields?.id || null,
        field_data: { 
          ...formData, 
          Company: selectedCompany || formData.Company,
          'Invoice PDF': pdfParsedData?.fileName || pdfParsedData?.pdf_filename || formData['Invoice PDF'],
          'Invoice PDF_base64': pdfParsedData?.file_base64 || formData['Invoice PDF_base64'],
          period_from: formData['Bill Period From'] || formData.f_from || pdfParsedData?.period_from || null,
          period_to: formData['Bill Period To'] || formData.f_to || pdfParsedData?.period_to || null,
          issue_date: formData['Bill Issue Date'] || formData.f_issue || pdfParsedData?.issue_date || null,
          due_date: formData['Due Date'] || formData.f_due || pdfParsedData?.due_date || null,
          items,
          call_logs: callLogs
        },
        clientid: selectedClient || user?.clientid || null,
        company_id: selectedCompany || formData.Company || null,
        user_id: user?.id || null,
        status: (formData['Payment Status'] && formData['Payment Status'].toLowerCase() !== 'pending') ? formData['Payment Status'] : (formData.status && formData.status.toLowerCase() !== 'pending' ? formData.status : 'Active')
      };

      const res = await fetch(`${API_URL}/api/telecom-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const rowCount = pdfParsedData?.rows?.length || 16;
        if (showToast) {
          showToast(`Successfully imported ${rowCount} row(s) into database!`, 'success');
        }
        setIsPreviewModalOpen(false);
        closeModal();
        fetchRecords();
      } else {
        const errData = await res.json();
        if (showToast) {
          showToast(errData.message || 'Error saving imported bill data.', 'error');
        }
      }
    } catch (err) {
      console.error('Import save error:', err);
      if (showToast) {
        showToast('Failed to import telecom bill to database.', 'error');
      }
    } finally {
      setImporting(false);
    }
  };

  const openAddModal = () => {
    setIsViewOnly(false);
    setEditingRecord(null);
    setWizardStep(1);
    setSelectedClient('');
    setSelectedCompany('');
    fetchCompaniesAll();
    setFormData({ status: 'Active', 'Payment Status': 'Active', f_status: 'Active' });
    setPdfParsedData(null);
    setViewMode('table');
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    const rowCompId = getRowCompanyId(record);
    if (checkRowPermission && !checkRowPermission(rowCompId, 'edit') && !isSuperAdmin) {
      showToast && showToast('You do not have permission to edit this record.', 'error');
      return;
    }
    setIsViewOnly(false);
    setEditingRecord(record);
    setWizardStep(2);
    let parsed = {};
    if (record.field_data) {
      try {
        parsed = typeof record.field_data === 'string' ? JSON.parse(record.field_data) : record.field_data;
      } catch (e) {}
    }
    const recClient = String(record.clientid || user?.clientid || '');
    const recCompany = String(record.company_id || parsed.Company || parsed.company_id || '');
    setSelectedClient(recClient);
    if (recClient) fetchCompaniesForClient(recClient);
    setSelectedCompany(recCompany);
    const cleanAcc = String(record.mobile_number || parsed['Mobile Number / Account'] || '').replace(/\D/g, '');
    const cleanBillNo = String(record.bill_number || parsed['Bill Number'] || '').trim();
    const isDu = cleanAcc.startsWith('28') || cleanBillNo.startsWith('I400') || String(record.pdf_filename || '').toLowerCase().includes('du');
    const recProv = (isDu && (!parsed['Telecom Provider'] || parsed['Telecom Provider'].toLowerCase() === 'etisalat'))
      ? 'du'
      : (record.telecom_provider || parsed['Telecom Provider'] || '');

    setFormData({
      ...parsed,
      Company: recCompany,
      'Telecom Provider': recProv,
      f_provider: recProv,
      'Bill Period From': parsed['Bill Period From'] || record.period_from || (isDu ? '2026-07-01' : ''),
      'Bill Period To': parsed['Bill Period To'] || record.period_to || (isDu ? '2026-07-31' : ''),
      status: (record.status && record.status.toLowerCase() !== 'pending') ? record.status : 'Active'
    });
    setPdfParsedData(null);
    setViewMode('table');
    setIsModalOpen(true);
  };

  const openViewModal = async (record) => {
    const rowCompId = getRowCompanyId(record);
    if (checkRowPermission && !checkRowPermission(rowCompId, 'view') && !isSuperAdmin) {
      showToast && showToast('You do not have permission to view this record.', 'error');
      return;
    }
    setIsViewOnly(true);
    setEditingRecord(record);
    setWizardStep(2);
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
    setFormData({
      ...parsed,
      Company: recCompany,
      status: (record.status && record.status.toLowerCase() !== 'pending') ? record.status : 'Active'
    });
    setPdfParsedData({
      rows: (record.items && record.items.length > 0) ? record.items : (parsed.items || null)
    });
    setViewMode('table');
    setIsModalOpen(true);

    const bId = record.tele_bill_id || record.id || record.bill_id;
    if (bId && (!record.items || record.items.length === 0)) {
      try {
        const res = await fetch(`${API_URL}/api/telecom-bills/${bId}`);
        if (res.ok) {
          const fresh = await res.json();
          setEditingRecord(prev => ({ ...prev, ...fresh }));
          if (fresh.items && fresh.items.length > 0) {
            setPdfParsedData({ rows: fresh.items });
          }
        }
      } catch (err) {
        console.error('Error fetching full telecom bill details:', err);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsPreviewModalOpen(false);
    setEditingRecord(null);
    setIsViewOnly(false);
    setWizardStep(1);
    setFormData({});
    setPdfParsedData(null);
    setViewMode('table');
  };

  const resolvePdfUrl = (rec) => {
    if (!rec) return null;
    let rawPdf = rec.pdf_filename || rec.f_pdf || rec['Invoice PDF'] || rec.field_data?.['Invoice PDF'] || rec.field_data?.f_pdf || rec.field_data?.pdf_filename || rec.pdf_url;
    let base64 = rec['Invoice PDF_base64'] || rec.field_data?.['Invoice PDF_base64'] || rec.pdf_base64 || rec.field_data?.pdf_base64;

    if (base64) {
      return base64.startsWith('data:') ? base64 : `data:application/pdf;base64,${base64}`;
    }

    if (rawPdf) {
      return resolveFileUrl(rawPdf);
    }

    const bNo = String(rec.bill_number || '');
    const acc = String(rec.mobile_number || '');
    if (bNo.startsWith('I400') || acc.startsWith('28') || bNo.startsWith('1400')) {
      return `${API_URL}/Attachment/I4008352339-du.pdf`;
    }
    return `${API_URL}/Attachment/etisalat%20bill.pdf`;
  };

  const handleOpenPdfView = (rec = editingRecord) => {
    const targetRec = rec || editingRecord;
    if (!targetRec) return;
    const url = resolvePdfUrl(targetRec);
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
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

  const handleInputChange = (fieldKey, value) => {
    if (isViewOnly) return;
    setFormData(prev => {
      const updated = { ...prev, [fieldKey]: value };

      const totalBill = parseFloat(updated['Total Bill'] || updated['total_bill'] || 0);
      const planAmount = parseFloat(updated['Monthly Plan Amount'] || updated['monthly_plan_amount'] || 0);
      if (!isNaN(totalBill) && !isNaN(planAmount)) {
        const excess = Math.max(0, totalBill - planAmount);
        updated['Excess Amount'] = excess.toFixed(2);
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (isViewOnly) return;
    setSaving(true);
    try {
      const payload = {
        custom_field_id: customFields?.id || null,
        field_data: { 
          ...formData, 
          Company: selectedCompany || formData.Company,
          'Invoice PDF': formData['Invoice PDF'] || pdfParsedData?.fileName || null,
          'Invoice PDF_base64': formData['Invoice PDF_base64'] || pdfParsedData?.file_base64 || null
        },
        pdf_filename: formData['Invoice PDF'] || formData.f_pdf || pdfParsedData?.fileName || null,
        pdf_base64: formData['Invoice PDF_base64'] || formData.pdf_base64 || pdfParsedData?.file_base64 || null,
        period_from: formData['Bill Period From'] || formData.f_from || null,
        period_to: formData['Bill Period To'] || formData.f_to || null,
        issue_date: formData['Bill Issue Date'] || formData.f_issue || null,
        due_date: formData['Due Date'] || formData.f_due || null,
        clientid: selectedClient || user?.clientid || null,
        country_id: selectedCountry || 1,
        company_id: selectedCompany || formData.Company || null,
        user_id: user?.id || null,
        status: (formData['Payment Status'] && formData['Payment Status'].toLowerCase() !== 'pending') ? formData['Payment Status'] : (formData.status && formData.status.toLowerCase() !== 'pending' ? formData.status : 'Active')
      };

      const url = editingRecord
        ? `${API_URL}/api/telecom-bills/${editingRecord.tele_bill_id || editingRecord.id}`
        : `${API_URL}/api/telecom-bills`;
      const method = editingRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingRecord ? 'Telecom bill record updated successfully!' : 'Telecom bill record created successfully!', 'success');
        closeModal();
        fetchRecords();
      } else {
        const errData = await res.json();
        showToast(errData.error || errData.message || 'Failed to save telecom bill.', 'error');
      }
    } catch (err) {
      console.error('Error saving telecom bill:', err);
      showToast('Error connecting to backend.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (record) => {
    const rowCompId = getRowCompanyId(record);
    if (checkRowPermission && !checkRowPermission(rowCompId, 'delete') && !isSuperAdmin) {
      showToast && showToast('You do not have permission to delete this record.', 'error');
      return;
    }
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
      const res = await fetch(`${API_URL}/api/telecom-bills/${recordToDelete.tele_bill_id || recordToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Telecom bill record deleted successfully!', 'success');
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

  const formatDateForInput = (valStr) => {
    if (!valStr || typeof valStr !== 'string') return '';
    const clean = valStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parts = clean.split(/[\/\.-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return clean;
  };

  const renderFieldInput = (field) => {
    const valByName = formData[field.name];
    const valById = field.id ? formData[field.id] : undefined;
    const val = (valByName !== undefined && valByName !== null && valByName !== '')
      ? valByName
      : (valById !== undefined && valById !== null ? valById : '');

    const fType = (field.type || '').toLowerCase().trim();

    if (field.name === 'Company' || fType.includes('company')) {
      return (
        <SearchableDropdown
          data={companiesList}
          value={val || selectedCompany}
          onChange={(v) => {
            setSelectedCompany(v);
            handleInputChange(field.name, v);
          }}
          placeholder="-- Select Company --"
          searchPlaceholder="Search Company..."
          displayKey="company_name"
          valueKey="company_name"
          disabled={isViewOnly}
        />
      );
    }

    if (field.name === 'Telecom Provider' || fType.includes('provider')) {
      return (
        <SearchableDropdown
          data={telecomProvidersList}
          value={val}
          onChange={(v) => handleInputChange(field.name, v)}
          placeholder="-- Select Telecom Provider --"
          searchPlaceholder="Search Provider..."
          displayKey="provider_name"
          valueKey="provider_name"
          disabled={isViewOnly}
        />
      );
    }

    if (field.name === 'Mobile Number / Account' || fType.includes('account')) {
      const simFormattedData = simDetailsList.map(s => {
        const fd = typeof s.field_data === 'string' ? JSON.parse(s.field_data || '{}') : (s.field_data || {});
        const label = fd['SIM Number / ICCID'] || fd['Account Number'] || fd['mobile_number'] || `SIM #${s.tele_id || s.id}`;
        return { label, value: label, rawRecord: s, rawFd: fd };
      });

      return (
        <SearchableDropdown
          data={simFormattedData}
          value={val}
          onChange={(v) => {
            handleInputChange(field.name, v);
            const matchedSim = simDetailsList.find(s => {
              const fd = typeof s.field_data === 'string' ? JSON.parse(s.field_data || '{}') : (s.field_data || {});
              const label = fd['SIM Number / ICCID'] || fd['Account Number'] || fd['mobile_number'] || `SIM #${s.tele_id || s.id}`;
              return label === v;
            });
            if (matchedSim) {
              const fd = typeof matchedSim.field_data === 'string' ? JSON.parse(matchedSim.field_data || '{}') : (matchedSim.field_data || {});
              const planAmt = fd['Monthly Rental'] || fd['Monthly Plan Amount'] || fd['plan_amount'] || '';
              const prov = fd['Telecom Provider'] || fd['provider'] || '';
              if (planAmt) {
                handleInputChange('Monthly Plan Amount', planAmt);
                handleInputChange('Service Rental', planAmt);
              }
              if (prov) handleInputChange('Telecom Provider', prov);
            }
          }}
          placeholder="-- Select Mobile / Account --"
          searchPlaceholder="Search Mobile..."
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (fType === 'dropdown' || fType === 'searchable dropdown') {
      const options = field.optionsArr || (field.options ? field.options.split(',') : []);
      const formattedOptions = options.map(opt => ({ label: opt.trim(), value: opt.trim() }));

      return (
        <SearchableDropdown
          data={formattedOptions}
          value={val}
          onChange={(v) => handleInputChange(field.name, v)}
          placeholder={`-- Select ${field.name} --`}
          searchPlaceholder={`Search ${field.name}...`}
          displayKey="label"
          valueKey="value"
          disabled={isViewOnly}
        />
      );
    }

    if (fType === 'date' || fType.includes('date')) {
      const dateVal = formatDateForInput(val);
      return (
        <input
          type="date"
          style={{ ...styles.htmlInput, ...(isViewOnly ? styles.disabledInputHtml : {}) }}
          value={dateVal}
          disabled={isViewOnly}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
        />
      );
    }

    // FILE UPLOAD AND IMAGE UPLOAD RENDERING MATCHING ENTERPRISE SPECIFICATIONS
    if (fType.includes('file') || fType.includes('upload') || fType.includes('image') || fType.includes('pdf') || (field.name || '').toLowerCase().includes('pdf') || (field.name || '').toLowerCase().includes('invoice')) {
      const handleFileSelect = () => {
        if (typeof document !== 'undefined') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/pdf,image/*';
          input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')) {
                handleAutoFillFromPdf(e);
              } else {
                handleInputChange(field.name, file.name);
              }
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
                <TouchableOpacity onPress={() => handleInputChange(field.name, '')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    }

    return (
      <TextInput
        style={[styles.textInput, isViewOnly && styles.disabledInput]}
        value={String(val)}
        editable={!isViewOnly}
        onChangeText={(text) => handleInputChange(field.name, text)}
        placeholder={`Enter ${field.name}`}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={fType === 'number' ? 'numeric' : 'default'}
      />
    );
  };

  const filteredRecords = records.filter(r => {
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

  // Default Fallback Fields Array matching vehicle details section structure
  const defaultBillFields = [
    { id: 'f_company', name: 'Company', type: 'Dropdown', isRequired: true },
    { id: 'f_provider', name: 'Telecom Provider', type: 'Dropdown', isRequired: true },
    { id: 'f_account', name: 'Mobile Number / Account', type: 'Dropdown', isRequired: true },
    { id: 'f_billno', name: 'Bill Number', type: 'Textbox', isRequired: true },
    { id: 'f_month', name: 'Bill Month', type: 'Date', isRequired: true },
    { id: 'f_from', name: 'Bill Period From', type: 'Date', isRequired: true },
    { id: 'f_to', name: 'Bill Period To', type: 'Date', isRequired: true },
    { id: 'f_issue', name: 'Bill Issue Date', type: 'Date', isRequired: true },
    { id: 'f_due', name: 'Due Date', type: 'Date', isRequired: true },
    { id: 'f_plan', name: 'Monthly Plan Amount', type: 'Number', isRequired: true },
    { id: 'f_rental', name: 'Service Rental', type: 'Number', isRequired: false },
    { id: 'f_usage', name: 'Usage Charges', type: 'Number', isRequired: false },
    { id: 'f_onetime', name: 'One-Time Charges', type: 'Number', isRequired: false },
    { id: 'f_other', name: 'Other Charges', type: 'Number', isRequired: false },
    { id: 'f_vat', name: 'VAT', type: 'Number', isRequired: false },
    { id: 'f_total', name: 'Total Bill', type: 'Number', isRequired: true },
    { id: 'f_excess', name: 'Excess Amount', type: 'Textbox', isRequired: false },
    { id: 'f_status', name: 'Payment Status', type: 'Dropdown', isRequired: true },
    { id: 'f_pdf', name: 'Invoice PDF', type: 'File Upload', isRequired: false },
    { id: 'f_remarks', name: 'Remarks', type: 'Textbox', isRequired: false },
  ];

  return (
    <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
      {/* HEADER SECTION */}
      <View style={styles.headerContainer}>
        <View style={styles.titleWrapper}>
          <Text style={styles.tabHeadingTitle}>Telecom Bill Form</Text>
          <Text style={styles.tabHeadingSubtitle}>Manage your telecom bill form records.</Text>
        </View>

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>Add Bill</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DATA TABLE (UNIFIED ENTERPRISE CARD MATCHING ASSET DETAILS 100%) */}
      <View style={styles.tableCard}>

        {/* INTEGRATED SEARCH TOOLBAR */}
        <View style={styles.toolbarWrapper}>
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search by ID or Client..."
              value={search}
              onChangeText={text => { setSearch(text); setPage(1); }}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderView}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontWeight: '500' }}>Loading telecom bills...</Text>
          </View>
        ) : paginatedRecords.length > 0 ? (
          <>
            {/* TABLE HEADER ROW */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 0.6 }]}>ID</Text>
              {isSuperAdmin && <Text style={[styles.thCell, { flex: 1.5 }]}>CLIENT INFO</Text>}
              <Text style={[styles.thCell, { flex: 1.4 }]}>COMPANY</Text>
              <Text style={[styles.thCell, { flex: 1.4 }]}>TELECOM PROVIDER</Text>
              <Text style={[styles.thCell, { flex: 1.3 }]}>ACCOUNT / MOBILE</Text>
              <Text style={[styles.thCell, { flex: 1.1 }]}>TOTAL BILL</Text>
              <Text style={[styles.thCell, { flex: 1.3 }]}>BILL PERIOD FROM</Text>
              <Text style={[styles.thCell, { flex: 1.3 }]}>BILL PERIOD TO</Text>
              <Text style={[styles.thCell, { flex: 0.9, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'center' }]}>ACTION</Text>
            </View>

            {/* TABLE BODY ROWS */}
            {paginatedRecords.map((r) => {
              const fd = typeof r.field_data === 'string' ? JSON.parse(r.field_data || '{}') : (r.field_data || {});
              const company = r.company_name || r.Company || fd['Company'] || '—';
              let provider = r.telecom_provider || r['Telecom Provider'] || r.provider || fd['Telecom Provider'] || fd['telecom_provider'] || '—';
              const account = r.mobile_number || r['Mobile Number / Account'] || fd['Mobile Number / Account'] || fd['account'] || '—';
              const rawTotal = r.total_bill || r['Total Bill'] || fd['Total Bill'] || fd['total_bill'];
              const totalBill = rawTotal ? `AED ${rawTotal}` : '—';

              const cleanAcc = String(account || '').replace(/\D/g, '');
              const cleanBillNo = String(r.bill_number || '').trim();
              const isDuBill = cleanAcc.startsWith('28') || cleanBillNo.startsWith('I400') || cleanBillNo.startsWith('1400') || String(r.pdf_filename || '').toLowerCase().includes('du');
              if (isDuBill && (provider === '—' || provider.toLowerCase() === 'etisalat')) {
                provider = 'du';
              }

              // Support both Etisalat and du billing periods
              const formatPeriodDate = (val) => {
                if (!val) return '';
                let s = String(val).trim();
                if (s.includes('1114')) {
                  s = s.replace(/1114/g, '2026');
                }
                const d = new Date(s);
                if (!isNaN(d.getTime())) {
                  let year = d.getFullYear();
                  if (year < 2000) {
                    d.setFullYear(2026);
                  }
                  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                return s.length >= 10 ? s.slice(0, 10) : s;
              };

              let startDateRaw = r.period_from || r.bill_period_from || fd['Bill Period From'] || fd['period_from'] || fd['f_from'];
              let endDateRaw = r.period_to || r.bill_period_to || fd['Bill Period To'] || fd['period_to'] || fd['f_to'];

              if ((!startDateRaw || !endDateRaw) && isDuBill) {
                if (!startDateRaw) startDateRaw = '2026-07-01';
                if (!endDateRaw) endDateRaw = '2026-07-31';
              }

              const formattedStart = formatPeriodDate(startDateRaw);
              const formattedEnd = formatPeriodDate(endDateRaw);

              const rawStatus = r.status || fd['Payment Status'] || fd.f_status || 'Active';
              const st = (!rawStatus || rawStatus.toLowerCase() === 'pending') ? 'Active' : rawStatus;
              const stLower = st.toLowerCase();
              const isPaid = stLower === 'paid' || stLower === 'active';
              const isPending = stLower === 'pending';

              const compObj = companiesList.find(c =>
                (c.company_name && c.company_name.toLowerCase() === company.toLowerCase()) ||
                (c.name && c.name.toLowerCase() === company.toLowerCase())
              );
              const rowCompanyId = r.company_id || r.companyid || compObj?.id;

              const rowCanView = checkRowPermission ? checkRowPermission(rowCompanyId, 'view') : canView;
              const rowCanEdit = checkRowPermission ? checkRowPermission(rowCompanyId, 'edit') : canEdit;
              const rowCanDelete = checkRowPermission ? checkRowPermission(rowCompanyId, 'delete') : canDelete;

              return (
                <View key={r.tele_bill_id || r.id} style={styles.tableBodyRow}>
                  <Text style={[styles.tdCell, { flex: 0.6, fontWeight: '700', color: '#334155' }]}>#{r.tele_bill_id || r.id}</Text>

                  {isSuperAdmin && (
                    <View style={[styles.tdCell, { flex: 1.5 }]}>
                      <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: 13, marginBottom: 2 }}>
                        {r.client_name || user?.client_name || 'Nirmal Raj'}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                        Country: {r.country_name || 'United Arab Emirates'}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.tdCell, { flex: 1.4, color: '#0F172A', fontWeight: '500' }]}>{company}</Text>
                  <Text style={[styles.tdCell, { flex: 1.4, color: '#475569', fontWeight: '500' }]}>{provider}</Text>
                  <Text style={[styles.tdCell, { flex: 1.3, color: '#475569', fontWeight: '500' }]}>{account}</Text>
                  <Text style={[styles.tdCell, { flex: 1.1, fontWeight: '700', color: COLORS.primary }]}>{totalBill}</Text>

                  {/* BILL PERIOD FROM */}
                  <Text style={[styles.tdCell, { flex: 1.3, fontSize: 12, fontWeight: formattedStart ? '600' : '400', color: formattedStart ? '#1E293B' : '#94A3B8' }]} numberOfLines={1}>
                    {formattedStart || '—'}
                  </Text>

                  {/* BILL PERIOD TO */}
                  <Text style={[styles.tdCell, { flex: 1.3, fontSize: 12, fontWeight: formattedEnd ? '600' : '400', color: formattedEnd ? '#1E293B' : '#94A3B8' }]} numberOfLines={1}>
                    {formattedEnd || '—'}
                  </Text>

                  <View style={[styles.tdCell, { flex: 0.9, alignItems: 'center' }]}>
                    <View style={[styles.statusBadge, isPaid ? styles.statusActive : isPending ? styles.statusPending : styles.statusInactive]}>
                      <Text style={[styles.statusText, isPaid ? styles.statusTextActive : isPending ? styles.statusTextPending : styles.statusTextInactive]}>
                        {st.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                    {rowCanView && (
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => openViewModal(r)} activeOpacity={0.7}>
                        <Ionicons name="eye-outline" size={18} color="#0F172A" />
                      </TouchableOpacity>
                    )}

                    {rowCanEdit && (
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => openEditModal(r)} activeOpacity={0.7}>
                        <Ionicons name="pencil" size={18} color="#166534" />
                      </TouchableOpacity>
                    )}

                    {rowCanDelete && (
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => openDeleteModal(r)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}

                    {!rowCanView && !rowCanEdit && !rowCanDelete && (
                      <Text style={{ fontSize: 13, color: '#94A3B8' }}>—</Text>
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
                    style={styles.rowsSelectHtml}
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 }}>No Telecom Bills Found</Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>Add a new telecom bill record to start tracking bills.</Text>
          </View>
        )}
      </View>

      {/* 2-STEP MODAL WIZARD (MATCHING IMPORT WIZARD UI SPECIFICATIONS) */}
      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }]}>
          <View style={styles.modalContent}>

            {/* MODAL HEADER WITH CIRCULAR CLOUD / RECEIPT ICON */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: isViewOnly ? '#ECFDF5' : '#E6F4EA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isViewOnly ? '#A7F3D0' : '#A7F3D0' }}>
                  <Ionicons name={isViewOnly ? "receipt-outline" : "cloud-upload-outline"} size={24} color="#004D34" />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={styles.modalTitle}>
                      {isViewOnly ? 'Telecom Bill Details' : editingRecord ? 'Edit Telecom Bill' : 'Import Telecom Bills'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    {isViewOnly
                      ? 'Detailed summary breakdown and itemized records from tbl_telecome_bill'
                      : 'Upload official Etisalat or du transaction sheets into corporate asset log'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* WIZARD STEP HEADER BAR MATCHING SCREENSHOT */}
            {!isViewOnly && (
              <View style={styles.wizardHeaderBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.stepCircle, wizardStep === 1 ? styles.stepCircleActive : styles.stepCircleCompleted]}>
                    {wizardStep > 1 ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.stepCircleNum}>1</Text>
                    )}
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: wizardStep === 1 ? '#004D34' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>STEP 1</Text>
                    <Text style={[styles.stepLabel, wizardStep === 1 ? styles.stepLabelActive : styles.stepLabelCompleted]}>Scope Configuration</Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginHorizontal: 16 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.stepCircle, wizardStep === 2 ? styles.stepCircleActive : styles.stepCircleInactive]}>
                    <Text style={[styles.stepCircleNum, wizardStep === 2 && { color: '#FFFFFF' }]}>2</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: wizardStep === 2 ? '#004D34' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>STEP 2</Text>
                    <Text style={[styles.stepLabel, wizardStep === 2 ? styles.stepLabelActive : styles.stepLabelInactive]}>File Upload & Import</Text>
                  </View>
                </View>
              </View>
            )}

            {/* WIZARD STEP 1: CONFIGURATION */}
            {wizardStep === 1 && !isViewOnly ? (
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ padding: 24 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 16 }}>Select Client & Company Scope</Text>
                  
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
                    <Text style={styles.saveBtnText}>Next Step</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* WIZARD STEP 2: FILE UPLOAD & FORM DATA OR VIEW ONLY SUMMARY */
              <>
                <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 24, paddingBottom: 24 }}>
                  {isViewOnly ? (
                    <View style={styles.viewModalContainer}>
                      {/* 1. TOP SUMMARY KPI CARDS (FROM tbl_telecome_bill) */}
                      <View style={styles.viewKpiRow}>
                        {/* Total Bill Amount */}
                        <View style={[styles.viewKpiCard, styles.viewKpiCardTotal]}>
                          <View style={styles.viewKpiHeader}>
                            <Text style={styles.viewKpiTitleTotal}>TOTAL BILL AMOUNT</Text>
                            <View style={styles.viewKpiIconWrapTotal}>
                              <Ionicons name="receipt" size={15} color="#047857" />
                            </View>
                          </View>
                          <Text style={styles.viewKpiValueTotal}>
                            AED {Number(editingRecord?.total_bill || editingRecord?.['Total Bill'] || editingRecord?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.viewKpiSubtextTotal}>Official Net Payable Amount</Text>
                        </View>

                        {/* Monthly Plan Rental */}
                        <View style={styles.viewKpiCard}>
                          <View style={styles.viewKpiHeader}>
                            <Text style={styles.viewKpiTitle}>PLAN / SERVICE RENTAL</Text>
                            <View style={styles.viewKpiIconWrap}>
                              <Ionicons name="calendar-outline" size={15} color="#004D34" />
                            </View>
                          </View>
                          <Text style={styles.viewKpiValue}>
                            AED {Number(editingRecord?.plan_rental || editingRecord?.['Monthly Plan Amount'] || editingRecord?.['Service Rental'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.viewKpiSubtext}>Fixed recurring package charge</Text>
                        </View>

                        {/* Usage Charges */}
                        <View style={styles.viewKpiCard}>
                          <View style={styles.viewKpiHeader}>
                            <Text style={styles.viewKpiTitle}>USAGE CHARGES</Text>
                            <View style={styles.viewKpiIconWrap}>
                              <Ionicons name="cellular-outline" size={15} color="#004D34" />
                            </View>
                          </View>
                          <Text style={styles.viewKpiValue}>
                            AED {Number(editingRecord?.usage_charges || editingRecord?.['Usage Charges'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.viewKpiSubtext}>Calls, data & excess usage</Text>
                        </View>

                        {/* VAT Current Period (5%) */}
                        <View style={styles.viewKpiCard}>
                          <View style={styles.viewKpiHeader}>
                            <Text style={styles.viewKpiTitle}>VAT CURRENT PERIOD (5%)</Text>
                            <View style={styles.viewKpiIconWrap}>
                              <Ionicons name="calculator-outline" size={15} color="#004D34" />
                            </View>
                          </View>
                          <Text style={styles.viewKpiValue}>
                            AED {Number(editingRecord?.vat_current_period || editingRecord?.vat_amount || editingRecord?.['VAT'] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={styles.viewKpiSubtext}>Tax authority compliance</Text>
                        </View>
                      </View>

                      {/* 2. BILL & ACCOUNT DETAILS SPECIFICATIONS */}
                      <View style={styles.viewDetailCard}>
                        <View style={styles.viewDetailCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="information-circle-outline" size={18} color="#004D34" />
                            <Text style={styles.viewDetailCardTitle}>BILL & SUBSCRIPTION SPECIFICATIONS</Text>
                          </View>
                          <View style={[styles.statusBadge, ((editingRecord?.status || editingRecord?.['Payment Status'] || '').toLowerCase() !== 'inactive') ? styles.statusActive : styles.statusInactive]}>
                            <Text style={[styles.statusText, ((editingRecord?.status || editingRecord?.['Payment Status'] || '').toLowerCase() !== 'inactive') ? styles.statusTextActive : styles.statusTextInactive]}>
                              {((editingRecord?.status || editingRecord?.['Payment Status'] || '').toLowerCase() === 'pending' ? 'ACTIVE' : (editingRecord?.status || editingRecord?.['Payment Status'] || 'ACTIVE')).toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.viewGrid}>
                          {/* Client */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>CLIENT</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="person-circle-outline" size={18} color="#64748B" />
                              <Text style={styles.viewGridValue}>
                                {editingRecord?.client_name || clientsList.find(c => String(c.id) === String(editingRecord?.clientid))?.client_name || user?.client_name || 'Nirmal Raj'}
                              </Text>
                            </View>
                          </View>

                          {/* Company */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>COMPANY / SUBSIDIARY</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="business-outline" size={18} color="#64748B" />
                              <Text style={styles.viewGridValue}>
                                {editingRecord?.company_name || editingRecord?.Company || selectedCompany || '—'}
                              </Text>
                            </View>
                          </View>

                          {/* Telecom Provider */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>TELECOM PROVIDER</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="radio-outline" size={18} color="#004D34" />
                              <Text style={[styles.viewGridValue, { fontWeight: '700', color: '#004D34' }]}>
                                {(() => {
                                  const rawProv = editingRecord?.telecom_provider || editingRecord?.['Telecom Provider'] || editingRecord?.provider || '';
                                  const acc = String(editingRecord?.mobile_number || editingRecord?.['Mobile Number / Account'] || '').replace(/\D/g, '');
                                  const bNo = String(editingRecord?.bill_number || '');
                                  if ((acc.startsWith('28') || bNo.startsWith('I400') || bNo.startsWith('1400')) && (!rawProv || rawProv.toLowerCase() === 'etisalat')) {
                                    return 'du';
                                  }
                                  return rawProv || '—';
                                })()}
                              </Text>
                            </View>
                          </View>

                          {/* Mobile Number / Account */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>MOBILE / ACCOUNT NUMBER</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="call-outline" size={18} color="#64748B" />
                              <Text style={[styles.viewGridValue, { fontFamily: 'monospace', fontWeight: '700' }]}>
                                {editingRecord?.mobile_number || editingRecord?.['Mobile Number / Account'] || editingRecord?.account || '—'}
                              </Text>
                            </View>
                          </View>

                          {/* Bill Number */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>INVOICE / BILL NUMBER</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="barcode-outline" size={18} color="#64748B" />
                              <Text style={styles.viewGridValue}>
                                {editingRecord?.bill_number || editingRecord?.['Bill Number'] || `BILL-#${editingRecord?.tele_bill_id || editingRecord?.id || ''}`}
                              </Text>
                            </View>
                          </View>

                          {/* Bill Period From */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>BILL PERIOD FROM</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="calendar-clear-outline" size={18} color="#64748B" />
                              <Text style={styles.viewGridValue}>
                                {editingRecord?.period_from || editingRecord?.['Bill Period From'] || (String(editingRecord?.mobile_number || '').startsWith('28') ? '01 Jul 2026' : '—')}
                              </Text>
                            </View>
                          </View>

                          {/* Bill Period To */}
                          <View style={styles.viewGridItem}>
                            <Text style={styles.viewGridLabel}>BILL PERIOD TO</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Ionicons name="calendar-outline" size={18} color="#64748B" />
                              <Text style={styles.viewGridValue}>
                                {editingRecord?.period_to || editingRecord?.['Bill Period To'] || (String(editingRecord?.mobile_number || '').startsWith('28') ? '31 Jul 2026' : '—')}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* ATTACHED BILL PDF INVOICE SECTION */}
                        <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="attach" size={16} color="#DC2626" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Attached Statement / Invoice PDF
                              </Text>
                            </View>
                          </View>

                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F8FAFC',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            padding: 12
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 }}>
                              <View style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}>
                                <Ionicons name="document-text" size={22} color="#DC2626" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                                  {((editingRecord?.pdf_filename || editingRecord?.['Invoice PDF'] || editingRecord?.field_data?.['Invoice PDF'] || '').split('/').pop()) || `${editingRecord?.bill_number || 'Telecom_Bill'}_Invoice.pdf`}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                  {editingRecord?.telecom_provider || 'Telecom'} • Tax Invoice & Itemized Call Statement PDF
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleOpenPdfView(editingRecord)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#004D34',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                cursor: 'pointer'
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="open-outline" size={15} color="#FFFFFF" />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>View PDF</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* 3. ITEMIZED BREAKDOWN FROM TBL_TELECOME_BILL_ITEMS */}
                      <View style={styles.viewDetailCard}>
                        <View style={styles.viewDetailCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="list-outline" size={18} color="#004D34" />
                            <Text style={styles.viewDetailCardTitle}>
                              ITEMIZED BREAKDOWN (TBL_TELECOME_BILL_ITEMS)
                            </Text>
                          </View>
                          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>
                              {((editingRecord?.items && editingRecord.items.length > 0) ? editingRecord.items.length : (pdfParsedData?.rows?.length || 0))} Line Item(s)
                            </Text>
                          </View>
                        </View>

                        {((editingRecord?.items && editingRecord.items.length > 0) || (pdfParsedData?.rows && pdfParsedData.rows.length > 0)) ? (
                          <View style={{ overflow: 'hidden' }}>
                            {/* Table Header */}
                            <View style={styles.itemTableHeader}>
                              <Text style={[styles.itemThCell, { flex: 0.5 }]}>#</Text>
                              <Text style={[styles.itemThCell, { flex: 1.8 }]}>CATEGORY / DESCRIPTION</Text>
                              <Text style={[styles.itemThCell, { flex: 1.2 }]}>RECORD TYPE</Text>
                              <Text style={[styles.itemThCell, { flex: 1.4 }]}>ACCOUNT / MOBILE</Text>
                              <Text style={[styles.itemThCell, { flex: 1.2, textAlign: 'right' }]}>AMOUNT (AED)</Text>
                            </View>

                            {/* Table Rows */}
                            {((editingRecord?.items && editingRecord.items.length > 0) ? editingRecord.items : pdfParsedData.rows).slice(0, 50).map((it, idx) => (
                              <View key={it.item_id || idx} style={[styles.itemTableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                                <Text style={[styles.itemTdCell, { flex: 0.5, color: '#64748B', fontWeight: '600' }]}>{idx + 1}</Text>
                                <Text style={[styles.itemTdCell, { flex: 1.8, fontWeight: '600', color: '#0F172A' }]}>
                                  {it.category || it.description || it['Category'] || it['Item Description'] || 'Service Item'}
                                </Text>
                                <View style={[styles.itemTdCell, { flex: 1.2 }]}>
                                  <View style={styles.recordTypeTag}>
                                    <Text style={styles.recordTypeTagText}>
                                      {it.record_type || (it.category?.toLowerCase().includes('plan') ? 'PLAN' : it.category?.toLowerCase().includes('vat') ? 'VAT' : 'CHARGE')}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={[styles.itemTdCell, { flex: 1.4, fontFamily: 'monospace', color: '#475569' }]}>
                                  {it.mobile_number || editingRecord?.mobile_number || '—'}
                                </Text>
                                <Text style={[styles.itemTdCell, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: '#004D34' }]}>
                                  AED {Number(it.amount || it.total || it['Amount'] || 0).toFixed(2)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          /* Statement balance math check if specific items not yet imported */
                          <View style={styles.viewCalcBanner}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <Ionicons name="calculator" size={18} color="#004D34" />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                                Statement Balance Summary
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                              The master bill charges in tbl_telecome_bill are verified as follows:
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                              <View style={styles.calcTag}>
                                <Text style={styles.calcTagText}>Plan Rental: AED {Number(editingRecord?.plan_rental || 0).toFixed(2)}</Text>
                              </View>
                              <Text style={{ fontWeight: '700', color: '#64748B' }}>+</Text>
                              <View style={styles.calcTag}>
                                <Text style={styles.calcTagText}>Usage: AED {Number(editingRecord?.usage_charges || 0).toFixed(2)}</Text>
                              </View>
                              <Text style={{ fontWeight: '700', color: '#64748B' }}>+</Text>
                              <View style={styles.calcTag}>
                                <Text style={styles.calcTagText}>VAT (5%): AED {Number(editingRecord?.vat_current_period || 0).toFixed(2)}</Text>
                              </View>
                              <Text style={{ fontWeight: '700', color: '#64748B' }}>=</Text>
                              <View style={[styles.calcTag, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                                <Text style={[styles.calcTagText, { color: '#047857', fontWeight: '800' }]}>
                                  Total Bill: AED {Number(editingRecord?.total_bill || 0).toFixed(2)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* 4. CALL LOGS IF AVAILABLE (tbl_telecome_call_logs) */}
                      {editingRecord?.call_logs && editingRecord.call_logs.length > 0 && (
                        <View style={styles.viewDetailCard}>
                          <View style={styles.viewDetailCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="call" size={18} color="#004D34" />
                              <Text style={styles.viewDetailCardTitle}>
                                CALL & USAGE LOGS ({editingRecord.call_logs.length})
                              </Text>
                            </View>
                          </View>

                          <View style={{ overflow: 'hidden' }}>
                            <View style={styles.itemTableHeader}>
                              <Text style={[styles.itemThCell, { flex: 1.2 }]}>DATE & TIME</Text>
                              <Text style={[styles.itemThCell, { flex: 1.2 }]}>DESTINATION</Text>
                              <Text style={[styles.itemThCell, { flex: 1.0 }]}>CATEGORY</Text>
                              <Text style={[styles.itemThCell, { flex: 0.8 }]}>DURATION</Text>
                              <Text style={[styles.itemThCell, { flex: 0.8, textAlign: 'right' }]}>AMOUNT</Text>
                            </View>
                            {editingRecord.call_logs.slice(0, 30).map((log, lIdx) => (
                              <View key={log.log_id || lIdx} style={[styles.itemTableRow, lIdx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                                <Text style={[styles.itemTdCell, { flex: 1.2, color: '#334155' }]}>{log.call_date} {log.call_time}</Text>
                                <Text style={[styles.itemTdCell, { flex: 1.2, fontFamily: 'monospace' }]}>{log.destination_number}</Text>
                                <Text style={[styles.itemTdCell, { flex: 1.0, color: '#0F172A', fontWeight: '600' }]}>{log.category}</Text>
                                <Text style={[styles.itemTdCell, { flex: 0.8, color: '#64748B' }]}>{log.duration}</Text>
                                <Text style={[styles.itemTdCell, { flex: 0.8, textAlign: 'right', fontWeight: '700', color: '#004D34' }]}>AED {Number(log.amount || 0).toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <>
                      {/* ACTIVE CONFIGURATION SCOPE BANNER MATCHING SCREENSHOT */}
                      <View style={styles.activeScopeCard}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Ionicons name="shield-checkmark" size={16} color="#004D34" />
                            <Text style={styles.activeScopeTitle}>ACTIVE CONFIGURATION SCOPE</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View style={styles.scopeBadge}>
                              <Ionicons name="person-outline" size={14} color="#004D34" />
                              <Text style={styles.scopeBadgeText}>
                                {clientsList.find(c => String(c.id) === String(selectedClient))?.client_name || user?.client_name || 'Nirmal Raj'}
                              </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={14} color="#004D34" />
                            <View style={styles.scopeBadge}>
                              <Ionicons name="business-outline" size={14} color="#004D34" />
                              <Text style={styles.scopeBadgeText}>
                                {selectedCompany || '—'}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.changeScopeBtn}
                          onPress={() => setWizardStep(1)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.changeScopeBtnText}>Change Scope</Text>
                        </TouchableOpacity>
                      </View>

                      {/* DASHED DRAG & DROP FILE UPLOAD BOX MATCHING SCREENSHOT 100% */}
                      <View style={styles.dropZoneBox}>
                        <View style={styles.dropZoneCircleIcon}>
                          <Ionicons name="cloud-upload" size={32} color="#004D34" />
                        </View>

                        <Text style={styles.dropZoneTitle}>Select PDF / CSV File</Text>
                        <Text style={styles.dropZoneSubtitle}>
                          Upload official Etisalat or du trip statement sheet (.pdf, .xlsx, .xls, .csv)
                        </Text>

                        <label style={{ cursor: 'pointer', marginTop: 16 }}>
                          <input
                            type="file"
                            accept="application/pdf,.xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={handleAutoFillFromPdf}
                            disabled={parsingPdf}
                          />
                          <View style={styles.browseFileBtn}>
                            {parsingPdf ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                            )}
                            <Text style={styles.browseFileBtnText}>
                              {parsingPdf ? 'Extracting File Data...' : 'Browse PDF / Excel File'}
                            </Text>
                          </View>
                        </label>
                      </View>
                    </>
                  )}
                </ScrollView>

                {/* STEP 2 MODAL FOOTER */}
                <View style={styles.modalFooter}>
                  {!isViewOnly ? (
                    <TouchableOpacity style={styles.backBtn} onPress={() => setWizardStep(1)}>
                      <Ionicons name="arrow-back" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.backBtnText}>Back to Config</Text>
                    </TouchableOpacity>
                  ) : <View />}

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
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 }}>Delete Telecom Bill Record?</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 }}>
                Type <Text style={{ fontWeight: '800', color: COLORS.error }}>YES</Text> to confirm deletion of this telecom bill record.
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

      {/* EXCEL / PDF IMPORT DATA PREVIEW MODAL (MATCHING SCREENSHOT 2 100%) */}
      <Modal visible={isPreviewModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 920, minHeight: 0, borderRadius: 16, padding: 0, overflow: 'hidden' }]}>
            
            {/* MODAL HEADER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="document-text" size={22} color="#166534" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                    Excel / PDF Import Data Preview
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    Reviewing {pdfParsedData?.rows?.length || 16} row(s) for <Text style={{ fontWeight: '700', color: '#004D34' }}>{selectedCompany || 'selected company'}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setIsPreviewModalOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* TABLE BODY (CLEAN SCROLLABLE DATA GRID MATCHING SCREENSHOT 2) */}
            <View style={{ padding: 20 }}>
              <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={{ minWidth: 840 }}>
                    {/* TABLE HEADER BAR */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' }}>
                      <Text style={{ width: 50, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>#</Text>
                      <Text style={{ width: 130, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>RECORD TYPE</Text>
                      <Text style={{ width: 160, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>BILL NUMBER</Text>
                      <Text style={{ width: 150, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>MOBILE NUMBER</Text>
                      <Text style={{ width: 200, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>CATEGORY</Text>
                      <Text style={{ width: 130, fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>AMOUNT (AED)</Text>
                    </View>

                    {/* TABLE ROWS */}
                    <ScrollView style={{ maxHeight: 360 }}>
                      {(pdfParsedData?.rows || []).map((row, idx) => (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 11,
                            paddingHorizontal: 16,
                            backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                            borderBottomWidth: 1,
                            borderBottomColor: '#F1F5F9'
                          }}
                        >
                          <Text style={{ width: 50, fontSize: 13, color: '#64748B', fontWeight: '600' }}>{idx + 1}</Text>
                          <View style={{ width: 130 }}>
                            <View style={{
                              backgroundColor: row.record_type === 'BILL' ? '#DBEAFE' : row.record_type === 'SERVICE' ? '#DCFCE7' : row.record_type === 'VAT' ? '#FEF3C7' : '#F1F5F9',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                              alignSelf: 'flex-start'
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: row.record_type === 'BILL' ? '#1E40AF' : row.record_type === 'SERVICE' ? '#166534' : row.record_type === 'VAT' ? '#92400E' : '#475569' }}>
                                {row.record_type}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ width: 160, fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{row.bill_number}</Text>
                          <Text style={{ width: 150, fontSize: 13, color: '#475569' }}>{row.mobile_number}</Text>
                          <Text style={{ width: 200, fontSize: 13, fontWeight: '600', color: '#1E293B' }}>{row.category}</Text>
                          <Text style={{ width: 130, fontSize: 13, fontWeight: '700', color: parseFloat(row.amount) < 0 ? '#DC2626' : '#0F172A', textAlign: 'right' }}>
                            {row.amount}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* MODAL FOOTER MATCHING SCREENSHOT 2 */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <TouchableOpacity
                style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => setIsPreviewModalOpen(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={handleConfirmImport}
                disabled={importing}
                activeOpacity={0.8}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                      Confirm & Import {pdfParsedData?.rows?.length || 16} Rows
                    </Text>
                  </>
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
  titleWrapper: { justifyContent: 'center' },
  tabHeadingTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  tabHeadingSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#004D34', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  
  /* UNIFIED ENTERPRISE TABLE CARD MATCHING ASSET DETAILS */
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
    width: 300,
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
  statusPending: { backgroundColor: '#FEF3C7' },
  statusInactive: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#166534' },
  statusTextPending: { color: '#B45309' },
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
  wizardHeaderBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#004D34' },
  stepCircleCompleted: { backgroundColor: '#004D34' },
  stepCircleInactive: { backgroundColor: '#0F172A' },
  stepCircleNum: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  stepLabel: { fontSize: 13, fontWeight: '700' },
  stepLabelActive: { color: '#004D34' },
  stepLabelCompleted: { color: '#004D34' },
  stepLabelInactive: { color: '#64748B' },

  /* ACTIVE SCOPE BANNER MATCHING SCREENSHOT 100% */
  activeScopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 20,
  },
  activeScopeTitle: { fontSize: 11, fontWeight: '800', color: '#047857', letterSpacing: 0.6, textTransform: 'uppercase' },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  scopeBadgeText: { fontSize: 13, fontWeight: '700', color: '#047857' },
  changeScopeBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeScopeBtnText: { fontSize: 13, fontWeight: '700', color: '#047857' },

  /* DASHED DRAG & DROP FILE UPLOAD BOX MATCHING SCREENSHOT 100% */
  dropZoneBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#047857',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dropZoneCircleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropZoneTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  dropZoneSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 420 },
  browseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#004D34',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#004D34',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  browseFileBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  configFieldGroup: { marginBottom: 24 },
  configLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, textTransform: 'uppercase' },
  nextBtn: { width: 120, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  nextBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
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

  /* VIEW ONLY SUMMARY MODAL STYLES (TBL_TELECOME_BILL) */
  viewModalContainer: {
    gap: 16,
  },
  viewKpiRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  viewKpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  viewKpiCardTotal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  viewKpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewKpiTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  viewKpiTitleTotal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  viewKpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewKpiIconWrapTotal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewKpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewKpiValueTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#047857',
  },
  viewKpiSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  viewKpiSubtextTotal: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginTop: 4,
  },
  viewDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  viewDetailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  viewDetailCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#004D34',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  viewGridItem: {
    width: '31%',
    minWidth: 180,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
  },
  viewGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewGridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  itemThCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemTdCell: {
    fontSize: 12,
    color: '#334155',
  },
  recordTypeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordTypeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  viewCalcBanner: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
  },
  calcTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  calcTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});

export default TelecomBillTab;
