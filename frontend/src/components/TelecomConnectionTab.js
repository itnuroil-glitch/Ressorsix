import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { SHADOWS } from '../theme';
import { API_URL } from '../config';
import {
  INITIAL_TELECOM_CONNECTIONS,
  STATIC_CONNECTION_TYPES,
  STATIC_PROVIDERS,
  STATIC_COMPANIES,
  STATIC_DATA_UNITS,
  STATIC_TELECOM_HISTORY_LOGS,
  STATIC_EMPLOYEES,
} from './telecomConnectionData';

// Color Tokens matching the exact UI in the screenshot
const THEME = {
  primaryGreen: '#0E5434',    // Deep forest green for "+ Add Connection"
  lightGreenBg: '#F0FDF4',
  textGreen: '#166534',       // Monthly amount green

  blueLink: '#2563EB',        // Phone number blue link
  badgeBlueBg: '#E0F2FE',
  badgeBlueText: '#0284C7',

  redAlertBg: '#FFF5F5',      // Red row background for overage
  redAlertBorder: '#FECACA',
  redAlertText: '#DC2626',

  amber: '#F59E0B',           // History button amber
  amberDark: '#D97706',

  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',

  statusActiveBg: '#E0F2FE',
  statusActiveText: '#0284C7',
  statusActiveBorder: '#BAE6FD',

  statusUnassignedBg: '#F1F5F9',
  statusUnassignedText: '#475569',
  statusUnassignedBorder: '#CBD5E1',
};

// Date format conversion helpers for native HTML5 date input (YYYY-MM-DD <-> DD/MM/YYYY)
const toDateInputValue = (str) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return '';
};

const fromDateInputValue = (str) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
};

// Styles used only by the Number Assignment modal
const naStyles = {
  greenBox: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 14 },
  greenTitle: { fontSize: 12, fontWeight: '800', color: '#166534', letterSpacing: 0.4 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#166534', letterSpacing: 0.4 },
  miniLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.4 },
  miniValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  releaseBtn: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  releaseBtnText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
};

export default function TelecomConnectionTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();

  // Local State (Starts empty, populated from live backend API)
  const [connections, setConnections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('All'); // 'All' | 'Assigned' | 'Unassigned'
  const [selectedCompany, setSelectedCompany] = useState('All Companies');
  const [selectedType, setSelectedType] = useState('All Types');
  const [isExcessFilterActive, setIsExcessFilterActive] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7; // Matches exact 7 rows in user screenshot

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Dropdown popover open states inside the Add/Edit form
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isDataUnitDropdownOpen, setIsDataUnitDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Filter dropdown popovers in toolbar
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);

  // Selected item for actions
  const [activeItem, setActiveItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiEmployees, setApiEmployees] = useState([]);
  const [apiCompanies, setApiCompanies] = useState([]);

  // Form State for Add / Edit
  const defaultFormState = {
    id: '',
    connectionType: 'SIM', // 'SIM' | 'Internet' | 'Landline'
    company: 'ASAS Gen Tr LLC',
    subCompany: user?.full_name || 'Krish',
    provider: 'e& (Etisalat)',
    connectionNumber: '',
    accountNumber: '',
    iccid: '',
    contractNo: '',
    contractFrom: '',
    contractTo: '',
    employeeName: '',
    employeeSub: '',
    assignedFrom: '',
    notes: '',
    planName: '',
    monthlyRentAED: '',
    currentBillAED: '',
    dataAllowance: '',
    dataUnit: 'GB',
    localMinutes: '',
    intlMinutes: '',
    localSMS: '',
    intlSMS: '',
    cug: '',
    status: 'ACTIVE'
  };

  const [formData, setFormData] = useState(defaultFormState);

  // Reassign Form State
  const [reassignData, setReassignData] = useState({
    newEmployeeName: '',
    newEmployeeSub: `Since ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    remarks: '',
    assignedFrom: '',
    lastWorkingDay: '',
    leaveReason: 'Resigned'
  });
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  // ---------------------------------------------------------------------------
  // FETCH CONNECTIONS FROM POSTGRESQL BACKEND API
  // ---------------------------------------------------------------------------
  const fetchConnections = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tele-connections`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(c => ({
            id: c.id,
            connectionType: c.connection_type || 'SIM',
            company: c.company_name,
            subCompany: c.sub_company || 'Krish',
            provider: c.provider,
            connectionNumber: c.connection_number,
            accountNumber: c.account_number || '',
            iccid: c.iccid || '',
            contractNo: c.contract_no || '',
            contractFrom: c.contract_from || '',
            contractTo: c.contract_to || '',
            employeeName: c.employee_name || 'Unassigned',
            employeeSub: c.assigned_from ? `Since ${c.assigned_from}` : (c.employee_name === 'Unassigned' ? 'Never assigned' : 'Active'),
            assignedFrom: c.assigned_from || '',
            notes: c.notes || '',
            planName: c.plan_name || 'Standard Plan',
            monthlyRentAED: parseFloat(c.monthly_plan_amount) || 0,
            currentBillAED: parseFloat(c.monthly_plan_amount) || 0,
            dataAllowance: c.data_allowance || '',
            dataUnit: c.data_unit || 'GB',
            localMinutes: c.local_minutes || '',
            intlMinutes: c.international_minutes || '',
            localSMS: c.local_sms || '',
            intlSMS: c.international_sms || '',
            cug: c.cug || '',
            status: c.status || 'ACTIVE'
          }));
          setConnections(mapped);
        } else {
          setConnections([]);
        }
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.warn('Could not fetch from backend, setting empty connections', err);
      setConnections([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setApiEmployees(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch employees from backend', err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/companies`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setApiCompanies(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch companies from backend', err);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchEmployees();
    fetchCompanies();
  }, []);

  // Dynamic company lists from backend API (falling back to STATIC_COMPANIES)
  const companyOptions = useMemo(() => {
    if (apiCompanies && apiCompanies.length > 0) {
      const names = apiCompanies
        .filter(c => !c.is_deleted && c.company_name)
        .map(c => c.company_name.trim());
      const unique = Array.from(new Set(names));
      if (unique.length > 0) return unique;
    }
    return STATIC_COMPANIES.filter(c => c !== 'All Companies');
  }, [apiCompanies]);

  const toolbarCompanyOptions = useMemo(() => {
    return ['All Companies', ...companyOptions];
  }, [companyOptions]);

  // ---------------------------------------------------------------------------
  // FILTERING & SEARCH
  // ---------------------------------------------------------------------------
  const filteredConnections = useMemo(() => {
    return connections.filter(item => {
      // Search Match
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (item.connectionNumber && item.connectionNumber.toLowerCase().includes(term)) ||
        (item.employeeName && item.employeeName.toLowerCase().includes(term)) ||
        (item.provider && item.provider.toLowerCase().includes(term)) ||
        (item.company && item.company.toLowerCase().includes(term)) ||
        (item.planName && item.planName.toLowerCase().includes(term));

      // Tab Match ('All' | 'Assigned' | 'Unassigned')
      const isUnassigned = item.status === 'UNASSIGNED' || (item.employeeName && item.employeeName.toLowerCase().includes('unassigned'));
      let matchTab = true;
      if (activeFilterTab === 'Assigned') matchTab = !isUnassigned;
      if (activeFilterTab === 'Unassigned') matchTab = isUnassigned;

      // Excess usage filter toggle
      let matchExcess = true;
      if (isExcessFilterActive) {
        matchExcess = item.isOverPlan === true;
      }

      // Company dropdown match
      const matchCompany = selectedCompany === 'All Companies' || item.company === selectedCompany;

      // Type dropdown match
      const matchType = selectedType === 'All Types' || item.connectionType === selectedType;

      return matchSearch && matchTab && matchExcess && matchCompany && matchType;
    });
  }, [connections, searchTerm, activeFilterTab, isExcessFilterActive, selectedCompany, selectedType]);

  // Available employees dynamically filtered by the selected company in the form
  const availableEmployees = useMemo(() => {
    const comp = (formData.company || '').trim().toLowerCase();

    if (apiEmployees && apiEmployees.length > 0) {
      const filtered = apiEmployees.filter(emp => {
        if (!comp) return true;

        // 1. Check primary / base company
        const matchesBase = emp.base_company_name &&
          emp.base_company_name.trim().toLowerCase() === comp;

        // 2. Check multiple associated companies
        const matchesAssoc = Array.isArray(emp.companies) && emp.companies.some(
          c => c.company_name && c.company_name.trim().toLowerCase() === comp
        );

        return matchesBase || matchesAssoc;
      });

      const mapped = filtered.map(emp => ({
        id: String(emp.id),
        name: emp.full_name || emp.name,
        company: emp.base_company_name || formData.company,
        joinDate: emp.created_at ? new Date(emp.created_at).toLocaleDateString('en-GB') : ''
      }));

      return [
        { id: 'unassigned', name: 'Unassigned', company: formData.company, joinDate: '' },
        ...mapped
      ];
    }

    // Fallback to STATIC_EMPLOYEES if API is loading or offline
    const list = STATIC_EMPLOYEES.filter(
      e => e.name === 'Unassigned' || !comp || e.company.toLowerCase().trim() === comp || e.company === 'All'
    );
    return list.length > 0 ? list : [{ id: 'unassigned', name: 'Unassigned', company: formData.company, joinDate: '' }];
  }, [apiEmployees, formData.company]);

  // Tab Badge Counts
  const totalCount = connections.length;
  const assignedCount = connections.filter(c => c.status !== 'UNASSIGNED' && c.employeeName && c.employeeName !== 'Unassigned').length;
  const unassignedCount = connections.filter(c => c.status === 'UNASSIGNED' || !c.employeeName || c.employeeName === 'Unassigned').length;
  const excessCount = connections.filter(c => c.isOverPlan).length;

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredConnections.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredConnections.slice(start, start + itemsPerPage);
  }, [filteredConnections, currentPage]);

  // ---------------------------------------------------------------------------
  // CRUD ACTIONS
  // ---------------------------------------------------------------------------
  const handleOpenAdd = () => {
    setFormData({
      id: '',
      connectionType: 'SIM',
      company: 'ASAS Gen Tr LLC',
      subCompany: user?.full_name || 'Krish',
      provider: 'e& (Etisalat)',
      connectionNumber: '',
      accountNumber: '',
      iccid: '',
      contractNo: '',
      contractFrom: '',
      contractTo: '',
      employeeName: '',
      employeeSub: '',
      assignedFrom: '',
      notes: '',
      planName: '',
      monthlyRentAED: '',
      currentBillAED: '',
      dataAllowance: '',
      dataUnit: 'GB',
      localMinutes: '',
      intlMinutes: '',
      localSMS: '',
      intlSMS: '',
      cug: '',
      status: 'ACTIVE'
    });
    setActiveItem(null);
    setIsCompanyDropdownOpen(false);
    setIsProviderDropdownOpen(false);
    setIsDataUnitDropdownOpen(false);
    setIsEmployeeDropdownOpen(false);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setActiveItem(item);
    setFormData({
      ...item,
      employeeName: item.employeeName || '',
      employeeSub: item.employeeSub || '',
      assignedFrom: item.assignedFrom || (item.employeeSub ? item.employeeSub.replace('Since ', '') : '01/01/2026'),
      notes: item.notes || '',
      monthlyRentAED: String(item.monthlyRentAED || '100'),
      currentBillAED: String(item.currentBillAED || '100.00'),
      dataAllowance: String(item.dataAllowance || '10.5'),
      localMinutes: String(item.localMinutes || '750'),
      intlMinutes: String(item.intlMinutes || '250'),
      localSMS: String(item.localSMS || '65'),
      intlSMS: String(item.intlSMS || '65'),
      cug: String(item.cug || '10000')
    });
    setIsCompanyDropdownOpen(false);
    setIsProviderDropdownOpen(false);
    setIsDataUnitDropdownOpen(false);
    setIsEmployeeDropdownOpen(false);
    setIsAddEditModalOpen(true);
  };

  const handleSaveConnection = async () => {
    if (!formData.connectionNumber || !formData.connectionNumber.trim()) {
      if (showToast) showToast('Mobile / Line Number is required', 'error');
      return;
    }
    if (!formData.company || !formData.company.trim()) {
      if (showToast) showToast('Company name is required', 'error');
      return;
    }
    if (!formData.provider || !formData.provider.trim()) {
      if (showToast) showToast('Telecom provider is required', 'error');
      return;
    }

    const planAmount = parseFloat(formData.monthlyRentAED) || 0;
    const isUnassigned = !formData.employeeName || !formData.employeeName.trim() || formData.employeeName.toLowerCase().includes('unassigned');

    const payload = {
      connection_type: formData.connectionType || 'SIM',
      company_name: formData.company.trim(),
      sub_company: formData.subCompany || user?.full_name || 'Krish',
      provider: formData.provider.trim(),
      connection_number: formData.connectionNumber.trim(),
      account_number: formData.accountNumber ? formData.accountNumber.trim() : null,
      iccid: formData.iccid ? formData.iccid.trim() : null,
      contract_no: formData.contractNo ? formData.contractNo.trim() : null,
      contract_from: formData.contractFrom || null,
      contract_to: formData.contractTo || null,
      plan_name: formData.planName ? formData.planName.trim() : 'Standard Plan',
      monthly_plan_amount: planAmount,
      data_allowance: formData.dataAllowance || null,
      data_unit: formData.dataUnit || 'GB',
      local_minutes: formData.localMinutes || null,
      international_minutes: formData.intlMinutes || null,
      local_sms: formData.localSMS || null,
      international_sms: formData.intlSMS || null,
      cug: formData.cug || null,
      employee_name: isUnassigned ? 'Unassigned' : formData.employeeName.trim(),
      assigned_from: formData.assignedFrom || null,
      notes: formData.notes ? formData.notes.trim() : null,
      status: isUnassigned ? 'UNASSIGNED' : 'ACTIVE',
      client_id: user?.client_id || user?.clientId || 1,
      created_by: user?.full_name || user?.username || 'Admin'
    };

    setIsSaving(true);
    try {
      if (activeItem) {
        // 1. UPDATE / EDIT API
        const res = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to update connection');
        }
        if (showToast) showToast(`Connection ${formData.connectionNumber} updated successfully!`, 'success');
      } else {
        // 2. INSERT / CREATE API
        const res = await fetch(`${API_URL}/api/tele-connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to create connection');
        }
        if (showToast) showToast(`Connection ${formData.connectionNumber} created successfully!`, 'success');
      }

      setIsAddEditModalOpen(false);
      await fetchConnections();
    } catch (err) {
      console.error('Error saving connection:', err);
      if (showToast) showToast(err.message || 'Error saving connection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAssignmentHistory = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/tele-connections/${id}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignmentHistory(Array.isArray(data) ? data : []);
        return;
      }
    } catch (err) {
      console.warn('Could not fetch assignment history', err);
    }
    setAssignmentHistory([]);
  };

  const handleOpenReassign = (item) => {
    setActiveItem(item);
    setReassignData({
      newEmployeeName: '',
      newEmployeeSub: `Since ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      remarks: '',
      assignedFrom: '',
      lastWorkingDay: '',
      leaveReason: 'Resigned'
    });
    setAssignmentHistory([]);
    setIsReassignModalOpen(true);
    fetchAssignmentHistory(item.id);
  };

  const performerName = () => (user && (user.name || user.username || user.email)) || 'Admin';

  // "Move to Unassigned List": employee is leaving, release the number
  const handleReleaseNumber = async () => {
    if (!activeItem) return;
    if (!reassignData.lastWorkingDay) {
      if (showToast) showToast('Last Working Day is required', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_working_day: reassignData.lastWorkingDay,
          reason: reassignData.leaveReason,
          performed_by: performerName()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to release number');

      if (showToast) showToast(`Line ${activeItem.connectionNumber} moved to the Unassigned list`, 'success');
      setIsReassignModalOpen(false);
      await fetchConnections();
    } catch (err) {
      console.error('Error releasing connection:', err);
      if (showToast) showToast(err.message || 'Error releasing number', 'error');
    }
  };

  // Save: assign the number to another employee
  const handleSaveReassignment = async () => {
    if (!reassignData.newEmployeeName.trim()) {
      if (showToast) showToast('Employee is required', 'error');
      return;
    }
    if (!reassignData.assignedFrom) {
      if (showToast) showToast('Assigned From date is required', 'error');
      return;
    }
    if (!activeItem) return;

    try {
      const res = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: reassignData.newEmployeeName.trim(),
          assigned_from: reassignData.assignedFrom,
          performed_by: performerName()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update assignment');
      }

      if (showToast) showToast(`Line ${activeItem.connectionNumber} assigned to ${reassignData.newEmployeeName}!`, 'success');
      setIsReassignModalOpen(false);
      await fetchConnections();
    } catch (err) {
      console.error('Error reassigning connection:', err);
      if (showToast) showToast(err.message || 'Error updating assignment', 'error');
    }
  };

  // Employees of the line's company for the Number Assignment form
  const reassignEmployees = useMemo(() => {
    const comp = ((activeItem && activeItem.company) || '').trim().toLowerCase();
    return (apiEmployees || []).filter(emp => {
      if (!comp) return true;
      const matchesBase = emp.base_company_name && emp.base_company_name.trim().toLowerCase() === comp;
      const matchesAssoc = Array.isArray(emp.companies) && emp.companies.some(
        c => c.company_name && c.company_name.trim().toLowerCase() === comp
      );
      return matchesBase || matchesAssoc;
    });
  }, [apiEmployees, activeItem]);

  const formatNaDate = (str) => {
    if (!str) return '';
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (!m) return str;
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDelete = async () => {
    if (!activeItem) return;

    try {
      const res = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete connection');
      }

      if (showToast) showToast(`Connection ${activeItem.connectionNumber} removed!`, 'info');
      setIsDeleteModalOpen(false);
      setActiveItem(null);
      await fetchConnections();
    } catch (err) {
      console.error('Error deleting connection:', err);
      if (showToast) showToast(err.message || 'Error deleting connection', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT EXCEL
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    try {
      const exportData = filteredConnections.map((c, idx) => ({
        'S.No': idx + 1,
        'Company Name': c.company,
        'Admin / Sub': c.subCompany,
        'Connection Type': c.connectionType,
        'Provider': c.provider,
        'Number': c.connectionNumber,
        'Employee / Holder': c.employeeName,
        'Assignment Timeline': c.employeeSub,
        'Plan Name': c.planName,
        'Data Allowance': `${c.dataAllowance || ''} ${c.dataUnit || ''}`.trim(),
        'Local Minutes': c.localMinutes || '',
        'Intl Minutes': c.intlMinutes || '',
        'Local SMS': c.localSMS || '',
        'Intl SMS': c.intlSMS || '',
        'CUG': c.cug || '',
        'Monthly Amount (AED)': c.monthlyRentAED,
        'Sep 2026 Bill (AED)': c.currentBillAED,
        'Excess Over Plan': c.isOverPlan ? `+${c.overPlanAmount} AED` : 'Within Plan',
        'Status': c.status,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Telecom_Connections');
      XLSX.writeFile(wb, `Telecom_Connections_${new Date().toISOString().slice(0, 10)}.xlsx`);

      if (showToast) showToast('Exported connections to Excel successfully!', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Failed to export Excel', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER ROW                                                        */}
      {/* --------------------------------------------------------------------- */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 280 }}>
          <Text style={styles.headerMainTitle}>Telecom Connections</Text>
          <Text style={styles.headerSubtitleText}>
            SIM, internet and landline connections for all group companies
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          {/* Import Bills Button */}
          <TouchableOpacity
            style={styles.importBillsBtn}
            onPress={() => setIsImportModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={THEME.slate700} />
            <Text style={styles.importBillsBtnText}>Import Bills</Text>
          </TouchableOpacity>

          {/* Excess Usage (5) Button */}
          <TouchableOpacity
            style={[
              styles.excessUsageBtn,
              isExcessFilterActive && styles.excessUsageBtnActive,
            ]}
            onPress={() => setIsExcessFilterActive(!isExcessFilterActive)}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={15} color={THEME.redAlertText} />
            <Text style={styles.excessUsageBtnText}>
              Excess Usage ({excessCount})
            </Text>
          </TouchableOpacity>

          {/* + Add Connection Button */}
          <TouchableOpacity style={styles.addConnectionBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={THEME.white} />
            <Text style={styles.addConnectionBtnText}>+ Add Connection</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --------------------------------------------------------------------- */}
      {/* FILTER & SEARCH TOOLBAR ROW                                           */}
      {/* --------------------------------------------------------------------- */}
      <View style={styles.toolbarRow}>
        {/* Left Segmented Filter Pills (All 77 | Assigned 65 | Unassigned 12) */}
        <View style={styles.segmentedPillsWrap}>
          {[
            { id: 'All', label: `All (${totalCount})` },
            { id: 'Assigned', label: `Assigned (${assignedCount})` },
            { id: 'Unassigned', label: `Unassigned (${unassignedCount})` },
          ].map(tab => {
            const isActive = activeFilterTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.segmentPill, isActive && styles.segmentPillActive]}
                onPress={() => setActiveFilterTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentPillText, isActive && styles.segmentPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Search Input */}
        <View style={styles.searchBoxWrap}>
          <Ionicons name="search-outline" size={17} color={THEME.slate400} />
          <TextInput
            style={styles.searchTextInput}
            placeholder="Search by number, employee, provider..."
            placeholderTextColor={THEME.slate400}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={THEME.slate400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Right Select Dropdowns & History Button */}
        <View style={styles.toolbarRightWrap}>
          {/* Company Filter Dropdown */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.filterDropdownBtn}
              onPress={() => {
                setIsCompanyFilterOpen(!isCompanyFilterOpen);
                setIsTypeFilterOpen(false);
              }}
            >
              <Text style={styles.filterDropdownBtnText}>{selectedCompany}</Text>
              <Ionicons name="chevron-down" size={14} color={THEME.slate600} />
            </TouchableOpacity>

            {isCompanyFilterOpen && (
              <View style={[styles.popoverMenu, { width: 190 }]}>
                {toolbarCompanyOptions.map(comp => (
                  <TouchableOpacity
                    key={comp}
                    style={[styles.popoverItem, selectedCompany === comp && styles.popoverItemActive]}
                    onPress={() => {
                      setSelectedCompany(comp);
                      setIsCompanyFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.popoverItemText, selectedCompany === comp && styles.popoverItemTextActive]}>
                      {comp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Type Filter Dropdown */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.filterDropdownBtn}
              onPress={() => {
                setIsTypeFilterOpen(!isTypeFilterOpen);
                setIsCompanyFilterOpen(false);
              }}
            >
              <Text style={styles.filterDropdownBtnText}>{selectedType}</Text>
              <Ionicons name="chevron-down" size={14} color={THEME.slate600} />
            </TouchableOpacity>

            {isTypeFilterOpen && (
              <View style={[styles.popoverMenu, { width: 140 }]}>
                {STATIC_CONNECTION_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.popoverItem, selectedType === type && styles.popoverItemActive]}
                    onPress={() => {
                      setSelectedType(type);
                      setIsTypeFilterOpen(false);
                    }}
                  >
                    <Text style={[styles.popoverItemText, selectedType === type && styles.popoverItemTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* History Button (Amber) */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setIsHistoryModalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={16} color={THEME.white} />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --------------------------------------------------------------------- */}
      {/* DATA LIST TABLE (EXACT 100% REPLICA)                                  */}
      {/* --------------------------------------------------------------------- */}
      <View style={styles.tableCardContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
          <View style={{ minWidth: 1250, width: '100%' }}>
            {/* Table Header Row */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colHeader, { width: 210 }]}>COMPANY NAME</Text>
              <View style={[{ width: 100, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Text style={styles.colHeader}>TYPE</Text>
                <View style={styles.newHeaderBadge}>
                  <Text style={styles.newHeaderBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={[styles.colHeader, { width: 110 }]}>PROVIDER</Text>
              <Text style={[styles.colHeader, { width: 130 }]}>NUMBER</Text>
              <Text style={[styles.colHeader, { width: 180 }]}>EMPLOYEE</Text>
              <Text style={[styles.colHeader, { width: 170 }]}>PLAN NAME</Text>
              <Text style={[styles.colHeader, { width: 140 }]}>MONTHLY AMOUNT</Text>
              <View style={[{ width: 150, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Text style={styles.colHeader}>SEP 2026 BILL</Text>
                <View style={styles.newHeaderBadge}>
                  <Text style={styles.newHeaderBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={[styles.colHeader, { width: 120 }]}>STATUS</Text>
              <Text style={[styles.colHeader, { width: 130, textAlign: 'center' }]}>ACTION</Text>
            </View>

            {/* Table Body Rows */}
            {paginatedData.length === 0 ? (
              <View style={styles.emptyTableState}>
                <Ionicons name="search-outline" size={36} color={THEME.slate300} />
                <Text style={styles.emptyTableTitle}>No Connections Found</Text>
                <Text style={styles.emptyTableSub}>Try clearing filters or search terms.</Text>
              </View>
            ) : (
              paginatedData.map((row) => {
                const isOver = row.isOverPlan === true;

                return (
                  <View
                    key={row.id}
                    style={[
                      styles.tableRow,
                      isOver && styles.tableRowOverPlan, // Tint row red if over plan amount
                    ]}
                  >
                    {/* 1. COMPANY NAME */}
                    <View style={[{ width: 210, paddingRight: 8 }]}>
                      <Text style={styles.companyNameText} numberOfLines={1}>{row.company}</Text>
                      <Text style={styles.companySubText}>{row.subCompany || 'Krish'}</Text>
                    </View>

                    {/* 2. TYPE */}
                    <View style={[{ width: 100 }]}>
                      <View style={styles.typeBadgePill}>
                        <Text style={styles.typeBadgePillText}>{row.connectionType}</Text>
                      </View>
                    </View>

                    {/* 3. PROVIDER */}
                    <View style={[{ width: 110, paddingRight: 6 }]}>
                      <Text style={styles.providerLineOne}>
                        {row.provider.includes('(Etisalat)') ? 'e&' : row.provider}
                      </Text>
                      {row.provider.includes('(Etisalat)') && (
                        <Text style={styles.providerLineTwo}>(Etisalat)</Text>
                      )}
                    </View>

                    {/* 4. NUMBER (Blue link or Red if overage) */}
                    <View style={[{ width: 130 }]}>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveItem(row);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.phoneNumberText,
                            isOver && styles.phoneNumberTextOver, // Red if over plan
                          ]}
                        >
                          {row.connectionNumber}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 5. EMPLOYEE */}
                    <View style={[{ width: 180, paddingRight: 8 }]}>
                      <Text
                        style={[
                          styles.employeeNameText,
                          row.employeeName === 'Unassigned' && { color: THEME.slate500, fontWeight: '500' }
                        ]}
                        numberOfLines={1}
                      >
                        {row.employeeName}
                      </Text>
                      <Text style={styles.employeeSubText} numberOfLines={1}>{row.employeeSub}</Text>
                    </View>

                    {/* 6. PLAN NAME */}
                    <View style={[{ width: 170, paddingRight: 8 }]}>
                      <Text style={styles.planNameText} numberOfLines={1}>{row.planName}</Text>
                    </View>

                    {/* 7. MONTHLY AMOUNT */}
                    <View style={[{ width: 140 }]}>
                      <Text style={styles.monthlyAmountText}>
                        {row.monthlyRentAED} AED
                      </Text>
                    </View>

                    {/* 8. SEP 2026 BILL */}
                    <View style={[{ width: 150 }]}>
                      <Text
                        style={[
                          styles.billAmountText,
                          isOver && styles.billAmountTextOver, // Red if over plan
                        ]}
                      >
                        {Number(row.currentBillAED || 0).toFixed(2)} AED
                      </Text>
                      {row.billSub && (
                        <Text
                          style={[
                            styles.billSubText,
                            isOver ? styles.billSubTextOver : { color: THEME.slate400 }
                          ]}
                        >
                          {row.billSub}
                        </Text>
                      )}
                    </View>

                    {/* 9. STATUS */}
                    <View style={[{ width: 120 }]}>
                      <View
                        style={[
                          styles.statusBadgePill,
                          row.status === 'ACTIVE'
                            ? styles.statusBadgeActive
                            : styles.statusBadgeUnassigned,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            row.status === 'ACTIVE'
                              ? styles.statusBadgeTextActive
                              : styles.statusBadgeTextUnassigned,
                          ]}
                        >
                          {row.status}
                        </Text>
                      </View>
                    </View>

                    {/* 10. ACTION (Eye, Pencil, Person-Add, Trash) */}
                    <View style={styles.actionsCol}>
                      {/* View */}
                      <TouchableOpacity
                        style={styles.tableActionIconBtn}
                        onPress={() => {
                          setActiveItem(row);
                          setIsViewModalOpen(true);
                        }}
                      >
                        <Ionicons name="eye-outline" size={17} color={THEME.slate600} />
                      </TouchableOpacity>

                      {/* Edit */}
                      <TouchableOpacity
                        style={styles.tableActionIconBtn}
                        onPress={() => handleOpenEdit(row)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={THEME.textGreen} />
                      </TouchableOpacity>

                      {/* Reassign / Transfer */}
                      <TouchableOpacity
                        style={styles.tableActionIconBtn}
                        onPress={() => handleOpenReassign(row)}
                      >
                        <Ionicons name="person-add-outline" size={16} color={THEME.blueLink} />
                      </TouchableOpacity>

                      {/* Delete */}
                      <TouchableOpacity
                        style={styles.tableActionIconBtn}
                        onPress={() => {
                          setActiveItem(row);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={THEME.redAlertText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* ------------------------------------------------------------------- */}
        {/* TABLE FOOTER & PAGINATION BAR                                       */}
        {/* ------------------------------------------------------------------- */}
        <View style={styles.tableFooterBar}>
          {/* Legend Indicator on Left */}
          <View style={styles.legendWrap}>
            <View style={styles.legendColorBox} />
            <Text style={styles.legendLabelText}>
              Red rows: bill is over the plan amount
            </Text>
          </View>

          {/* Showing 0 of 0 entries in Center */}
          <Text style={styles.showingEntriesText}>
            Showing {filteredConnections.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredConnections.length)} of {totalCount} entries
          </Text>

          {/* Prev / Next Buttons on Right */}
          <View style={styles.paginationBtnsWrap}>
            <TouchableOpacity
              style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <Text style={[styles.paginationBtnText, currentPage === 1 && styles.paginationBtnTextDisabled]}>
                Prev
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <Text style={[styles.paginationBtnText, currentPage === totalPages && styles.paginationBtnTextDisabled]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT TELECOM CONNECTION (EXACT DESIGN MATCH)             */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isAddEditModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContainer}>
            {/* Header */}
            <View style={styles.addModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={20} color={THEME.textGreen} />
                <Text style={styles.addModalTitle}>
                  {activeItem ? 'Edit Telecom Connection' : 'Add Telecom Connection'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setIsAddEditModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={THEME.slate600} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.addModalScroll}
              contentContainerStyle={styles.addModalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION 1: CONNECTION DETAILS */}
              <View style={styles.formSectionBox}>
                <Text style={styles.formSectionHeader}>CONNECTION DETAILS</Text>

                {/* Connection Type with NEW badge */}
                <View style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.exactFieldLabel}>
                      Connection Type <Text style={{ color: THEME.redAlertText }}>*</Text>
                    </Text>
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  </View>

                  {/* Segmented 3-Option Switcher: SIM | Internet | Landline */}
                  <View style={styles.connectionTypeSegment}>
                    {['SIM', 'Internet', 'Landline'].map(type => {
                      const isSelected = formData.connectionType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeSegmentBtn,
                            isSelected && styles.typeSegmentBtnActive,
                          ]}
                          onPress={() => setFormData({ ...formData, connectionType: type })}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.typeSegmentBtnText,
                              isSelected && styles.typeSegmentBtnTextActive,
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Row 1: Company * [NEW] | Provider * */}
                <View style={[styles.formTwoColRow, { zIndex: (isCompanyDropdownOpen || isProviderDropdownOpen) ? 1000 : 10 }]}>
                  {/* Company Dropdown */}
                  <View style={[styles.formCol, { zIndex: isCompanyDropdownOpen ? 1001 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Company <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.dropdownSelector,
                        isCompanyDropdownOpen && { borderColor: '#166534', backgroundColor: '#FFFFFF' },
                      ]}
                      onPress={() => {
                        setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                        setIsProviderDropdownOpen(false);
                        setIsDataUnitDropdownOpen(false);
                        setIsEmployeeDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dropdownValueText, { fontWeight: '600' }]}>{formData.company}</Text>
                      <Ionicons
                        name={isCompanyDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isCompanyDropdownOpen ? '#166534' : THEME.slate500}
                      />
                    </TouchableOpacity>

                    {isCompanyDropdownOpen && (
                      <View style={styles.dropdownListPopover}>
                        <View style={{ maxHeight: 220, overflow: 'auto' }}>
                          {companyOptions.map(comp => (
                            <TouchableOpacity
                              key={comp}
                              style={[
                                styles.dropdownItem,
                                formData.company === comp && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData(prev => ({ ...prev, company: comp }));
                                setIsCompanyDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  formData.company === comp && styles.dropdownItemTextActive,
                                ]}
                              >
                                {comp}
                              </Text>
                              {formData.company === comp && (
                                <Ionicons name="checkmark" size={14} color={THEME.primaryGreen} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Provider Dropdown */}
                  <View style={[styles.formCol, { zIndex: isProviderDropdownOpen ? 1001 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Provider <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.dropdownSelector,
                        isProviderDropdownOpen && { borderColor: '#166534', backgroundColor: '#FFFFFF' },
                      ]}
                      onPress={() => {
                        setIsProviderDropdownOpen(!isProviderDropdownOpen);
                        setIsCompanyDropdownOpen(false);
                        setIsDataUnitDropdownOpen(false);
                        setIsEmployeeDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dropdownValueText, { fontWeight: '600' }]}>{formData.provider}</Text>
                      <Ionicons
                        name={isProviderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isProviderDropdownOpen ? '#166534' : THEME.slate500}
                      />
                    </TouchableOpacity>

                    {isProviderDropdownOpen && (
                      <View style={styles.dropdownListPopover}>
                        <View style={{ maxHeight: 220, overflow: 'auto' }}>
                          {STATIC_PROVIDERS.filter(p => p !== 'All Providers').map(prov => (
                            <TouchableOpacity
                              key={prov}
                              style={[
                                styles.dropdownItem,
                                formData.provider === prov && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData(prev => ({ ...prev, provider: prov }));
                                setIsProviderDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  formData.provider === prov && styles.dropdownItemTextActive,
                                ]}
                              >
                                {prov}
                              </Text>
                              {formData.provider === prov && (
                                <Ionicons name="checkmark" size={14} color={THEME.primaryGreen} />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Row 2: Mobile / Line Number * [NEW] | Account No * */}
                <View style={[styles.formTwoColRow, { zIndex: 5 }]}>
                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Mobile / Line Number <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.connectionNumber}
                      onChangeText={val => setFormData({ ...formData, connectionNumber: val })}
                      placeholder="e.g. 0527901846"
                      placeholderTextColor={THEME.slate400}
                    />
                    <Text style={styles.fieldHelperText}>
                      Landline and Internet: the service number, e.g. 04-2856310
                    </Text>
                  </View>

                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Account No <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.accountNumber}
                      onChangeText={val => setFormData({ ...formData, accountNumber: val })}
                      placeholder="Provider account number from the bill"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>
                </View>

                {/* Row 3: ICCID | Contract No */}
                <View style={styles.formTwoColRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>ICCID</Text>
                    <TextInput
                      style={[
                        styles.exactTextInput,
                        formData.connectionType !== 'SIM' && { backgroundColor: THEME.slate100, color: THEME.slate400 }
                      ]}
                      value={formData.iccid}
                      editable={formData.connectionType === 'SIM'}
                      onChangeText={val => setFormData({ ...formData, iccid: val })}
                      placeholder="8997112217778863203"
                      placeholderTextColor={THEME.slate400}
                    />
                    <Text style={styles.fieldHelperText}>SIM only</Text>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Contract No</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.contractNo}
                      onChangeText={val => setFormData({ ...formData, contractNo: val })}
                      placeholder="Enter Contract No"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>
                </View>

                {/* Row 4: Contract From | Contract To */}
                <View style={styles.formTwoColRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Contract From</Text>
                    {Platform.OS === 'web' ? (
                      <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
                        <input
                          type="date"
                          value={toDateInputValue(formData.contractFrom)}
                          onChange={(e) => setFormData({ ...formData, contractFrom: fromDateInputValue(e.target.value) })}
                          style={StyleSheet.flatten([styles.exactDateInput])}
                        />
                        <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                          <Ionicons name="calendar-outline" size={17} color={THEME.slate500} />
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.exactTextInput}
                        value={formData.contractFrom}
                        onChangeText={val => setFormData({ ...formData, contractFrom: val })}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={THEME.slate400}
                      />
                    )}
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Contract To</Text>
                    {Platform.OS === 'web' ? (
                      <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
                        <input
                          type="date"
                          value={toDateInputValue(formData.contractTo)}
                          onChange={(e) => setFormData({ ...formData, contractTo: fromDateInputValue(e.target.value) })}
                          style={StyleSheet.flatten([styles.exactDateInput])}
                        />
                        <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                          <Ionicons name="calendar-outline" size={17} color={THEME.slate500} />
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.exactTextInput}
                        value={formData.contractTo}
                        onChangeText={val => setFormData({ ...formData, contractTo: val })}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={THEME.slate400}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* SECTION 2: PLAN & LIMITS */}
              <View style={[styles.formSectionBox, { marginTop: 18 }]}>
                <Text style={styles.formSectionHeader}>PLAN & LIMITS</Text>

                {/* Row 1: Package Plan * | Monthly Plan Amount (AED) * */}
                <View style={styles.formTwoColRow}>
                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Package Plan <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.planName}
                      onChangeText={val => setFormData({ ...formData, planName: val })}
                      placeholder="e.g. Standard 100 AED Plan"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Monthly Plan Amount (AED) <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.monthlyRentAED}
                      onChangeText={val => setFormData({ ...formData, monthlyRentAED: val })}
                      placeholder="100"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                    <Text style={styles.fieldHelperText}>Bills above this amount are marked as excess</Text>
                  </View>
                </View>

                {/* Row 2: Data Allowance (Composite with unit) | Local Minutes */}
                <View style={[styles.formTwoColRow, { zIndex: isDataUnitDropdownOpen ? 1000 : 2 }]}>
                  {/* Data Allowance */}
                  <View style={[styles.formCol, { zIndex: isDataUnitDropdownOpen ? 1001 : 1 }]}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Data Allowance</Text>
                    <View style={styles.compositeDataInputWrap}>
                      <TextInput
                        style={styles.compositeNumberInput}
                        value={formData.dataAllowance}
                        onChangeText={val => setFormData({ ...formData, dataAllowance: val })}
                        placeholder="10.5"
                        placeholderTextColor={THEME.slate400}
                      />
                      <TouchableOpacity
                        style={styles.compositeUnitSelector}
                        onPress={() => {
                          setIsDataUnitDropdownOpen(!isDataUnitDropdownOpen);
                          setIsCompanyDropdownOpen(false);
                          setIsProviderDropdownOpen(false);
                          setIsEmployeeDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.compositeUnitText}>{formData.dataUnit}</Text>
                        <Ionicons
                          name={isDataUnitDropdownOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={THEME.slate500}
                        />
                      </TouchableOpacity>
                    </View>

                    {isDataUnitDropdownOpen && (
                      <View style={[styles.dropdownListPopover, { right: 0, width: 110 }]}>
                        <View style={{ maxHeight: 180, overflow: 'auto' }}>
                          {STATIC_DATA_UNITS.map(unit => (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.dropdownItem,
                                formData.dataUnit === unit && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData(prev => ({ ...prev, dataUnit: unit }));
                                setIsDataUnitDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  formData.dataUnit === unit && styles.dropdownItemTextActive,
                                ]}
                              >
                                {unit}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Local Minutes */}
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local Minutes</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.localMinutes}
                      onChangeText={val => setFormData({ ...formData, localMinutes: val })}
                      placeholder="750"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>
                </View>

                {/* Row 3: International Minutes | Local SMS */}
                <View style={styles.formTwoColRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International Minutes</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.intlMinutes}
                      onChangeText={val => setFormData({ ...formData, intlMinutes: val })}
                      placeholder="250"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local SMS</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.localSMS}
                      onChangeText={val => setFormData({ ...formData, localSMS: val })}
                      placeholder="65"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>
                </View>

                {/* Row 4: International SMS | CUG */}
                <View style={styles.formTwoColRow}>
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International SMS</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.intlSMS}
                      onChangeText={val => setFormData({ ...formData, intlSMS: val })}
                      placeholder="65"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>CUG</Text>
                    <TextInput
                      style={styles.exactTextInput}
                      value={formData.cug}
                      onChangeText={val => setFormData({ ...formData, cug: val })}
                      placeholder="10000"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.slate400}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION 3: ASSIGN TO EMPLOYEE */}
              <View style={[styles.formSectionBox, { marginTop: 18, zIndex: isEmployeeDropdownOpen ? 1000 : 1 }]}>
                <Text style={styles.formSectionHeader}>ASSIGN TO EMPLOYEE</Text>

                {/* Row 1: Assigned Employee | Assigned From [NEW] */}
                <View style={[styles.formTwoColRow, { zIndex: isEmployeeDropdownOpen ? 1001 : 1, marginBottom: 14 }]}>
                  {/* Assigned Employee Dropdown */}
                  <View style={[styles.formCol, { zIndex: isEmployeeDropdownOpen ? 1002 : 1 }]}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Assigned Employee</Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownSelector,
                        isEmployeeDropdownOpen && { borderColor: '#166534', backgroundColor: '#FFFFFF' },
                      ]}
                      onPress={() => {
                        setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen);
                        setIsCompanyDropdownOpen(false);
                        setIsProviderDropdownOpen(false);
                        setIsDataUnitDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dropdownValueText, { fontWeight: '500' }]} numberOfLines={1}>
                        {formData.employeeName
                          ? (formData.employeeName === 'Unassigned'
                              ? 'Unassigned'
                              : `${formData.employeeName} (${formData.company || 'ASAS Gen Tr LLC'})`)
                          : 'Select Employee'}
                      </Text>
                      <Ionicons
                        name={isEmployeeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={isEmployeeDropdownOpen ? '#166534' : THEME.slate500}
                      />
                    </TouchableOpacity>

                    {isEmployeeDropdownOpen && (
                      <View style={styles.dropdownListPopover}>
                        <View style={{ maxHeight: 220, overflow: 'auto' }}>
                          {availableEmployees.map(emp => {
                            const isSelected = formData.employeeName === emp.name;
                            const label = emp.name === 'Unassigned'
                              ? 'Unassigned'
                              : `${emp.name} (${emp.company === 'All' ? formData.company : emp.company})`;
                            return (
                              <TouchableOpacity
                                key={emp.id}
                                style={[
                                  styles.dropdownItem,
                                  isSelected && styles.dropdownItemActive,
                                ]}
                                onPress={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    employeeName: emp.name,
                                    assignedFrom: emp.joinDate || prev.assignedFrom || '01/01/2026',
                                    employeeSub: emp.joinDate ? `Since ${emp.joinDate}` : prev.employeeSub,
                                  }));
                                  setIsEmployeeDropdownOpen(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSelected && styles.dropdownItemTextActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {label}
                                </Text>
                                {isSelected && (
                                  <Ionicons name="checkmark" size={14} color={THEME.primaryGreen} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                    <Text style={styles.fieldHelperText}>Only employees of the selected company are listed</Text>
                  </View>

                  {/* Assigned From with [NEW] Badge */}
                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>Assigned From</Text>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    </View>
                    {Platform.OS === 'web' ? (
                      <View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
                        <input
                          type="date"
                          value={toDateInputValue(formData.assignedFrom)}
                          onChange={(e) => {
                            const formatted = fromDateInputValue(e.target.value);
                            setFormData({
                              ...formData,
                              assignedFrom: formatted,
                              employeeSub: formatted ? `Since ${formatted}` : 'Never assigned'
                            });
                          }}
                          style={StyleSheet.flatten([styles.exactDateInput])}
                        />
                        <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                          <Ionicons name="calendar-outline" size={17} color={THEME.slate500} />
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={styles.exactTextInput}
                        value={formData.assignedFrom}
                        onChangeText={val => setFormData({ ...formData, assignedFrom: val, employeeSub: val ? `Since ${val}` : 'Never assigned' })}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={THEME.slate400}
                      />
                    )}
                    <Text style={styles.fieldHelperText}>Usually the employee's joining date</Text>
                  </View>
                </View>

                {/* Row 2: Notes */}
                <View style={{ marginBottom: 4 }}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Notes</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={formData.notes}
                    onChangeText={val => setFormData({ ...formData, notes: val })}
                    placeholder="Optional"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Bottom Action Footer (Back | Cancel | Complete & Save) */}
            <View style={styles.addModalFooter}>
              <TouchableOpacity
                style={styles.formBackBtn}
                onPress={() => setIsAddEditModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.formBackBtnText}>Back</Text>
              </TouchableOpacity>

              <View style={styles.formFooterRightActions}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => setIsAddEditModalOpen(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formSaveBtn, isSaving && { opacity: 0.7 }]}
                  onPress={handleSaveConnection}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <Text style={styles.formSaveBtnText}>{isSaving ? 'Saving...' : 'Complete & Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: VIEW DETAILS                                                   */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isViewModalOpen} transparent animationType="fade" onRequestClose={() => setIsViewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 640 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.viewModalIconWrap}>
                  <Ionicons name="information-circle-outline" size={20} color={THEME.primaryGreen} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Connection Profile</Text>
                  <Text style={styles.modalSubtitle}>{activeItem?.connectionNumber} • {activeItem?.company}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            {activeItem && (
              <ScrollView style={{ maxHeight: 480, paddingHorizontal: 20, paddingVertical: 14 }}>
                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>CONNECTION ATTRIBUTES</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Line / Service #</Text>
                      <Text style={styles.detailValueBold}>{activeItem.connectionNumber}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Account #</Text>
                      <Text style={styles.detailValue}>{activeItem.accountNumber || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Provider</Text>
                      <Text style={styles.detailValue}>{activeItem.provider}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{activeItem.connectionType}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>MONTHLY TARIFF & BILLED CHARGES</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Package Plan</Text>
                      <Text style={styles.detailValueBold}>{activeItem.planName}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Monthly Plan Amount</Text>
                      <Text style={[styles.detailValueBold, { color: THEME.textGreen }]}>{activeItem.monthlyRentAED} AED</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Sep 2026 Invoiced Bill</Text>
                      <Text style={[styles.detailValueBold, activeItem.isOverPlan && { color: THEME.redAlertText }]}>
                        {Number(activeItem.currentBillAED || 0).toFixed(2)} AED
                      </Text>
                      {activeItem.billSub && (
                        <Text style={{ fontSize: 11, color: activeItem.isOverPlan ? THEME.redAlertText : THEME.slate500 }}>
                          {activeItem.billSub}
                        </Text>
                      )}
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={styles.detailValue}>{activeItem.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.sectionHeading}>PLAN LIMITS & ALLOWANCES</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Data Allowance</Text>
                      <Text style={styles.detailValue}>{activeItem.dataAllowance ? `${activeItem.dataAllowance} ${activeItem.dataUnit || 'GB'}` : 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Local Minutes</Text>
                      <Text style={styles.detailValue}>{activeItem.localMinutes || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>International Minutes</Text>
                      <Text style={styles.detailValue}>{activeItem.intlMinutes || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Local SMS</Text>
                      <Text style={styles.detailValue}>{activeItem.localSMS || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>International SMS</Text>
                      <Text style={styles.detailValue}>{activeItem.intlSMS || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>CUG</Text>
                      <Text style={styles.detailValue}>{activeItem.cug || 'N/A'}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.profileSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionHeading}>ASSIGNMENT DETAILS</Text>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Assigned Employee</Text>
                      <Text style={styles.detailValueBold}>{activeItem.employeeName}</Text>
                      <Text style={{ fontSize: 11, color: THEME.slate400 }}>{activeItem.employeeSub}</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailLabel}>Company & Admin</Text>
                      <Text style={styles.detailValue}>{activeItem.company} ({activeItem.subCompany || 'Krish'})</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsViewModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(activeItem);
                }}
              >
                <Ionicons name="pencil-outline" size={15} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Edit Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: REASSIGN / TRANSFER LINE                                       */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isReassignModalOpen} transparent animationType="fade" onRequestClose={() => setIsReassignModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 820, maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Number Reassignment</Text>
                <Text style={{ fontSize: 12, color: THEME.slate500, marginTop: 4 }}>
                  {activeItem?.connectionNumber} · {activeItem?.connectionType} · {activeItem?.company}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsReassignModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 18, gap: 14 }}>
              {/* Currently assigned to */}
              {(() => {
                const isFree = !activeItem?.employeeName || activeItem.employeeName.toLowerCase().includes('unassigned');
                const holder = (apiEmployees || []).find(e => (e.full_name || e.name) === activeItem?.employeeName);
                return (
                  <View style={naStyles.greenBox}>
                    <Text style={naStyles.greenTitle}>CURRENTLY ASSIGNED TO</Text>
                    <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={naStyles.miniLabel}>EMPLOYEE</Text>
                        <Text style={naStyles.miniValue}>{isFree ? 'Unassigned' : activeItem?.employeeName}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={naStyles.miniLabel}>DEPARTMENT</Text>
                        <Text style={naStyles.miniValue}>{(!isFree && holder && holder.department_name) || '-'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={naStyles.miniLabel}>ASSIGNED FROM</Text>
                        <Text style={naStyles.miniValue}>{!isFree && activeItem?.assignedFrom ? formatNaDate(activeItem.assignedFrom) : '-'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Employee leaving? Release number */}
              <View style={naStyles.card}>
                <Text style={naStyles.cardTitle}>EMPLOYEE LEAVING? RELEASE NUMBER</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exactFieldLabel}>Last Working Day <Text style={{ color: '#DC2626' }}>*</Text></Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={toDateInputValue(reassignData.lastWorkingDay)}
                        onChange={(e) => setReassignData({ ...reassignData, lastWorkingDay: fromDateInputValue(e.target.value) })}
                        onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) { } }}
                        style={StyleSheet.flatten([styles.exactDateInput, { marginTop: 6, paddingRight: 12 }])}
                      />
                    ) : (
                      <TextInput
                        style={[styles.exactTextInput, { marginTop: 6 }]}
                        placeholder="dd/mm/yyyy"
                        value={reassignData.lastWorkingDay}
                        onChangeText={val => setReassignData({ ...reassignData, lastWorkingDay: val })}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exactFieldLabel}>Reason <Text style={{ color: '#DC2626' }}>*</Text></Text>
                    {Platform.OS === 'web' ? (
                      <select
                        value={reassignData.leaveReason}
                        onChange={(e) => setReassignData({ ...reassignData, leaveReason: e.target.value })}
                        style={StyleSheet.flatten([styles.exactDateInput, { marginTop: 6, paddingRight: 12 }])}
                      >
                        {['Resigned', 'Terminated', 'Transferred', 'Contract Ended', 'Other'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <TextInput
                        style={[styles.exactTextInput, { marginTop: 6 }]}
                        value={reassignData.leaveReason}
                        onChangeText={val => setReassignData({ ...reassignData, leaveReason: val })}
                      />
                    )}
                  </View>
                </View>
                <TouchableOpacity style={naStyles.releaseBtn} onPress={handleReleaseNumber}>
                  <Text style={naStyles.releaseBtnText}>Move to Unassigned List</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: THEME.slate500, marginTop: 10, lineHeight: 16 }}>
                  When an employee is marked as left in the employee master, his numbers move to the Unassigned list automatically on the last working day.
                </Text>
              </View>

              {/* Assign to another employee */}
              <View style={naStyles.card}>
                <Text style={naStyles.cardTitle}>ASSIGN TO ANOTHER EMPLOYEE</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exactFieldLabel}>Employee <Text style={{ color: '#DC2626' }}>*</Text></Text>
                    {Platform.OS === 'web' ? (
                      <select
                        value={reassignData.newEmployeeName}
                        onChange={(e) => setReassignData({ ...reassignData, newEmployeeName: e.target.value })}
                        style={StyleSheet.flatten([styles.exactDateInput, { marginTop: 6, paddingRight: 12 }])}
                      >
                        <option value="">-- Select Employee --</option>
                        {reassignEmployees.map(emp => {
                          const nm = emp.full_name || emp.name;
                          return <option key={emp.id} value={nm}>{nm}</option>;
                        })}
                      </select>
                    ) : (
                      <TextInput
                        style={[styles.exactTextInput, { marginTop: 6 }]}
                        placeholder="Employee name"
                        value={reassignData.newEmployeeName}
                        onChangeText={val => setReassignData({ ...reassignData, newEmployeeName: val })}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exactFieldLabel}>Assigned From <Text style={{ color: '#DC2626' }}>*</Text></Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={toDateInputValue(reassignData.assignedFrom)}
                        onChange={(e) => setReassignData({ ...reassignData, assignedFrom: fromDateInputValue(e.target.value) })}
                        onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) { } }}
                        style={StyleSheet.flatten([styles.exactDateInput, { marginTop: 6, paddingRight: 12 }])}
                      />
                    ) : (
                      <TextInput
                        style={[styles.exactTextInput, { marginTop: 6 }]}
                        placeholder="dd/mm/yyyy"
                        value={reassignData.assignedFrom}
                        onChangeText={val => setReassignData({ ...reassignData, assignedFrom: val })}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Assignment history */}
              <View style={naStyles.card}>
                <Text style={naStyles.cardTitle}>ASSIGNMENT HISTORY</Text>
                <View style={{ flexDirection: 'row', marginTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                  <Text style={[naStyles.miniLabel, { flex: 1.3 }]}>EMPLOYEE</Text>
                  <Text style={[naStyles.miniLabel, { flex: 1 }]}>FROM</Text>
                  <Text style={[naStyles.miniLabel, { flex: 1 }]}>TO</Text>
                </View>
                {assignmentHistory.length === 0 ? (
                  <Text style={{ fontSize: 12, color: THEME.slate500, paddingVertical: 10 }}>No assignment history yet.</Text>
                ) : assignmentHistory.map(h => (
                  <View key={h.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <Text style={[naStyles.miniValue, { flex: 1.3 }]}>{h.employee_name}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: THEME.slate600 }}>{formatNaDate(h.assigned_from) || '-'}</Text>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: h.assigned_to ? THEME.slate600 : '#15803D' }}>
                      {h.assigned_to ? formatNaDate(h.assigned_to) : 'Current'}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsReassignModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: THEME.primaryGreen }]} onPress={handleSaveReassignment}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: AUDIT HISTORY                                                 */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isHistoryModalOpen} transparent animationType="fade" onRequestClose={() => setIsHistoryModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 650 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="time" size={20} color={THEME.amberDark} />
                <Text style={styles.modalTitle}>Telecom Connection History & Audit Trail</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHistoryModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420, padding: 18 }}>
              {STATIC_TELECOM_HISTORY_LOGS.map(log => (
                <View key={log.id} style={styles.historyLogCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>{log.action} • {log.line}</Text>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>{log.date}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: THEME.slate600, lineHeight: 18 }}>{log.details}</Text>
                  <Text style={{ fontSize: 11, color: THEME.amberDark, fontWeight: '600', marginTop: 4 }}>By: {log.user}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsHistoryModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: IMPORT BILLS                                                   */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isImportModalOpen} transparent animationType="fade" onRequestClose={() => setIsImportModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 480 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="cloud-upload" size={20} color={THEME.primaryGreen} />
                <Text style={styles.modalTitle}>Import Monthly Carrier Bills</Text>
              </View>
              <TouchableOpacity onPress={() => setIsImportModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 24, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.lightGreenBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="document-attach-outline" size={32} color={THEME.textGreen} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.slate900, marginBottom: 6 }}>
                Upload Carrier PDF or Excel Bill
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate500, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
                Supports Etisalat e& and du itemized corporate accounts. System will automatically match line numbers and compute overage.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: THEME.primaryGreen, paddingHorizontal: 24 }]}
                onPress={() => {
                  setIsImportModalOpen(false);
                  if (showToast) showToast('September 2026 bills imported and audited successfully!', 'success');
                }}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Select & Process Bill File</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsImportModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION                                            */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isDeleteModalOpen} transparent animationType="fade" onRequestClose={() => setIsDeleteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 420 }]}>
            <View style={{ padding: 24, alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="warning-outline" size={26} color={THEME.redAlertText} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.slate900, marginBottom: 6, textAlign: 'center' }}>
                Delete Telecom Connection?
              </Text>
              <Text style={{ fontSize: 12, color: THEME.slate600, textAlign: 'center', lineHeight: 18 }}>
                Are you sure you want to delete line <Text style={{ fontWeight: '700' }}>{activeItem?.connectionNumber}</Text> ({activeItem?.company})?
              </Text>
            </View>

            <View style={[styles.modalFooter, { justifyContent: 'center' }]}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsDeleteModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: THEME.redAlertText }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={15} color={THEME.white} />
                <Text style={styles.primaryBtnText}>Delete Connection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// -----------------------------------------------------------------------------
// STYLESHEET (MATCHING USER SCREENSHOT EXACTLY)
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    width: '100%',
  },

  // 1. Header Row
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  importBillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  importBillsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  excessUsageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  excessUsageBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  excessUsageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  addConnectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E5434', // Deep green matching user screenshot
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  addConnectionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },

  // 2. Toolbar Row
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  segmentedPillsWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  segmentPillActive: {
    backgroundColor: THEME.white,
    ...SHADOWS.small,
  },
  segmentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentPillTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  searchBoxWrap: {
    flex: 1,
    minWidth: 260,
    height: 38,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    outlineWidth: 0,
  },
  toolbarRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterDropdownBtn: {
    height: 38,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterDropdownBtnText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  historyBtn: {
    height: 38,
    backgroundColor: '#F59E0B', // Amber
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.small,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.white,
  },
  popoverMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    zIndex: 999,
    ...SHADOWS.large,
    overflow: 'hidden',
  },
  popoverItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  popoverItemActive: {
    backgroundColor: '#F0FDF4',
  },
  popoverItemText: {
    fontSize: 12,
    color: '#334155',
  },
  popoverItemTextActive: {
    color: '#166534',
    fontWeight: '700',
  },

  // 3. Table Card
  tableCardContainer: {
    backgroundColor: THEME.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%',
    ...SHADOWS.small,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  newHeaderBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newHeaderBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: THEME.white,
  },
  tableRowOverPlan: {
    backgroundColor: '#FFF5F5', // Tint red when bill > plan amount
  },
  companyNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  companySubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  typeBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeBadgePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  providerLineOne: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  providerLineTwo: {
    fontSize: 11,
    color: '#64748B',
  },
  phoneNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB', // Blue link
    textDecorationLine: 'underline',
  },
  phoneNumberTextOver: {
    color: '#DC2626', // Red if over plan
    textDecorationLine: 'underline',
  },
  employeeNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  employeeSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  planNameText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  monthlyAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534', // Bold green
  },
  billAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  billAmountTextOver: {
    color: '#DC2626', // Bold red if over
  },
  billSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  billSubTextOver: {
    color: '#DC2626',
    fontWeight: '600',
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#E0F2FE',
  },
  statusBadgeTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  statusBadgeUnassigned: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeTextUnassigned: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  actionsCol: {
    width: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tableActionIconBtn: {
    padding: 3,
  },

  // 4. Footer & Pagination Bar
  tableFooterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
    gap: 12,
  },
  legendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColorBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FCA5A5',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  legendLabelText: {
    fontSize: 12,
    color: '#64748B',
  },
  showingEntriesText: {
    fontSize: 12,
    color: '#64748B',
  },
  paginationBtnsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: THEME.white,
  },
  paginationBtnDisabled: {
    opacity: 0.4,
  },
  paginationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  paginationBtnTextDisabled: {
    color: '#94A3B8',
  },

  // Empty State
  emptyTableState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptyTableSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },

  // History Card
  historyLogCard: {
    backgroundColor: THEME.slate50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },

  // Add/Edit Modal (Matching user screenshot)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addModalContainer: {
    width: '100%',
    maxWidth: 1000,
    maxHeight: '92%',
    backgroundColor: THEME.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
  },
  addModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalScroll: {
    backgroundColor: '#F8FAFC',
  },
  addModalScrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  formSectionBox: {
    backgroundColor: THEME.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  formSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  exactFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  newBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  connectionTypeSegment: {
    flexDirection: 'row',
    gap: 12,
  },
  typeSegmentBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSegmentBtnActive: {
    borderWidth: 1.5,
    borderColor: '#166534',
    backgroundColor: '#F0FDF4',
  },
  typeSegmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typeSegmentBtnTextActive: {
    color: '#166534',
    fontWeight: '700',
  },
  formTwoColRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    position: 'relative',
  },
  formCol: {
    flex: 1,
    position: 'relative',
  },
  exactTextInput: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
    outlineWidth: 0,
  },
  exactDateInput: {
    width: '100%',
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 36,
    fontSize: 13,
    color: '#1E293B',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  fieldHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  dropdownSelector: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  },
  dropdownValueText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    pointerEvents: 'none',
  },
  dropdownListPopover: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    zIndex: 99999,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#166534',
  },
  compositeDataInputWrap: {
    flexDirection: 'row',
    height: 42,
  },
  compositeNumberInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
    outlineWidth: 0,
  },
  compositeUnitSelector: {
    width: 72,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  compositeUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  addModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
  },
  formBackBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  formBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  formFooterRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formCancelBtn: {
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  formSaveBtn: {
    backgroundColor: '#0E5434',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  formSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.white,
  },

  // View Modal
  modalBox: {
    width: '100%',
    backgroundColor: THEME.white,
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  viewModalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCol: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    marginTop: 2,
  },
  detailValueBold: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E5434',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});
