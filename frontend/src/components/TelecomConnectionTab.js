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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { SHADOWS } from '../theme';
import { API_URL } from '../config';
import { getTelecomBillCalculation } from '../utils/telecomBilling';
import {
  STATIC_CONNECTION_TYPES,
  STATIC_DATA_UNITS,
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

const createEmptyAddonDraft = () => ({
  planName: '',
  planAmount: '',
  subscriptionType: 'Recurring',
  dataAllowance: '',
  localMinutes: '',
  intlMinutes: '',
  localSMS: '',
  intlSMS: '',
  cug: '',
});

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
  const { width, height } = useWindowDimensions();

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
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [billMonthLabel, setBillMonthLabel] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonConnection, setAddonConnection] = useState(null);
  const [addonDraft, setAddonDraft] = useState(createEmptyAddonDraft);
  const [addonDraftError, setAddonDraftError] = useState('');
  const [isSavingAddon, setIsSavingAddon] = useState(false);

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
    company: '',
    subCompany: user?.full_name || 'Krish',
    provider: '',
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
    planType: 'Recurring',
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
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isConnectionsLoading, setIsConnectionsLoading] = useState(true);
  const [planDraft, setPlanDraft] = useState({});
  const [planDraftError, setPlanDraftError] = useState('');
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isConnTypeDropdownOpen, setIsConnTypeDropdownOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const isMissing = key => showErrors && !String(formData[key] ?? '').trim();
  const errBorder = { borderColor: '#DC2626', backgroundColor: '#FEF2F2' };

  // Close any open dropdown when the user clicks outside of it
  const anyDropdownOpen =
    isConnTypeDropdownOpen || isCompanyDropdownOpen || isProviderDropdownOpen ||
    isPlanDropdownOpen || isDataUnitDropdownOpen || isEmployeeDropdownOpen;
  useEffect(() => {
    if (Platform.OS !== 'web' || !anyDropdownOpen || typeof document === 'undefined') return undefined;
    const handleOutside = (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('[data-dropdown="1"]')) return;
      setIsConnTypeDropdownOpen(false);
      setIsCompanyDropdownOpen(false);
      setIsProviderDropdownOpen(false);
      setIsPlanDropdownOpen(false);
      setIsDataUnitDropdownOpen(false);
      setIsEmployeeDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [anyDropdownOpen]);
  const [telePackages, setTelePackages] = useState([]);
  const [teleProviders, setTeleProviders] = useState([]);
  const [teleConnTypes, setTeleConnTypes] = useState([]);
  const [teleServiceAccounts, setTeleServiceAccounts] = useState([]);
  const [editingPlanName, setEditingPlanName] = useState('');

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
    setIsConnectionsLoading(true);
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
            planType: c.plan_type || 'Recurring',
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
          // Show the connections straight away; the (slow) bills lookup fills in "Latest Bill" afterwards
          setConnections(mapped.map(m => ({ ...m, currentBillAED: null, isOverPlan: false, billSub: '' })));

          const loadLatestBills = async () => {
          // Latest bill per number: real bill amount (excl. VAT) and over-plan flag (more than AED 10 above plan)
          let bills = [];
          try {
            const br = await fetch(`${API_URL}/api/tele-connections/latest-bills`);
            if (br.ok) {
              const bd = await br.json();
              bills = Array.isArray(bd) ? bd : (bd && Array.isArray(bd.data) ? bd.data : []);
            }
          } catch (e) {
            console.warn('Could not load bills for connections', e);
          }
          const keyOfNum = (v) => String(v || '').replace(/\D/g, '').slice(-9);
          const monthKeyOf = (b) => {
            const raw = b.period_to || b.period_from || b['Bill Period To'] || b['Bill Period From'] || b.created_at;
            const d = raw ? new Date(raw) : null;
            return d && !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
          };
          const known = new Set(mapped.map(m => keyOfNum(m.connectionNumber)));
          const billMonths = bills
            .filter(b => known.has(keyOfNum(b.mobile_number || b['Mobile Number / Account'])))
            .map(monthKeyOf)
            .filter(Boolean)
            .sort();
          const latestMonth = billMonths.length ? billMonths[billMonths.length - 1] : '';
          if (latestMonth) {
            const [yy, mm] = latestMonth.split('-');
            setBillMonthLabel(`${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(mm) - 1]} ${yy}`);
          } else {
            setBillMonthLabel('');
          }
          const withBills = mapped.map(m => {
            const matching = bills
              .filter(b => keyOfNum(b.mobile_number || b['Mobile Number / Account']) === keyOfNum(m.connectionNumber) && monthKeyOf(b) === latestMonth)
              .sort((a, b) => Number(b.tele_bill_id || b.id || 0) - Number(a.tele_bill_id || a.id || 0));
            if (!latestMonth || matching.length === 0) {
              return { ...m, currentBillAED: null, isOverPlan: false, billSub: '' };
            }
            const b = matching[0];
            const calculation = getTelecomBillCalculation(b);
            const billExcl = calculation.billExclVat;
            const excess = calculation.excessExclVat;
            const over = calculation.isExcess;
            return {
              ...m,
              currentBillAED: billExcl,
              isOverPlan: over,
              billSub: calculation.status === 'needs_review' ? 'Needs review' : (over ? `+${excess.toFixed(2)} over plan` : ''),
            };
          });
          const billInfoById = new Map(withBills.map(w => [w.id, w]));
          setConnections(prev => prev.map(c => {
            const w = billInfoById.get(c.id);
            return w ? { ...c, currentBillAED: w.currentBillAED, isOverPlan: w.isOverPlan, billSub: w.billSub } : c;
          }));
          };
          loadLatestBills().catch(e => console.warn('Could not load latest bills', e));
        } else {
          setConnections([]);
        }
      } else {
        setConnections([]);
      }
    } catch (err) {
      console.warn('Could not fetch from backend, setting empty connections', err);
      setConnections([]);
    } finally {
      setIsConnectionsLoading(false);
    }
  };

  const fetchTeleServiceAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tele-service-providers`);
      if (res.ok) {
        const data = await res.json();
        setTeleServiceAccounts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch tele service providers', err);
    }
  };

  // Account numbers saved in the Tele Service Provider master for a company + provider pair
  const accountsFor = (company, provider) => {
    const c = String(company || '').trim().toLowerCase();
    const p = String(provider || '').trim().toLowerCase();
    if (!c || !p) return [];
    const list = teleServiceAccounts
      .filter(r => String(r.status || 'Active').toLowerCase() === 'active'
        && String(r.company_name || '').trim().toLowerCase() === c
        && String(r.service_provider || '').trim().toLowerCase() === p)
      .map(r => String(r.account_number || '').trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  };

  const fetchTeleConnTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tele-connection-types`);
      if (res.ok) {
        const data = await res.json();
        setTeleConnTypes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch tele connection types', err);
    }
  };

  const fetchTeleProviders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/telecom-providers`);
      if (res.ok) {
        const data = await res.json();
        setTeleProviders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch tele providers', err);
    }
  };

  const fetchTelePackages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tele-packages`);
      if (res.ok) {
        const data = await res.json();
        setTelePackages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch tele packages', err);
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
    fetchTelePackages();
    fetchTeleProviders();
    fetchTeleConnTypes();
    fetchTeleServiceAccounts();
  }, []);

  // Company choices come only from live master data.
  const companyOptions = useMemo(() => {
    if (apiCompanies && apiCompanies.length > 0) {
      const names = apiCompanies
        .filter(c => !c.is_deleted && c.company_name)
        .map(c => c.company_name.trim());
      const unique = Array.from(new Set(names));
      if (unique.length > 0) return unique;
    }
    return [];
  }, [apiCompanies]);

  // Company filter lists only companies that have connections (with the connection count)
  const companyConnectionCounts = useMemo(() => {
    const counts = {};
    connections.forEach(c => { if (c.company) counts[c.company] = (counts[c.company] || 0) + 1; });
    return counts;
  }, [connections]);

  const toolbarCompanyOptions = useMemo(() => {
    const withConnections = Object.keys(companyConnectionCounts).sort((a, b) => a.localeCompare(b));
    return ['All Companies', ...withConnections];
  }, [companyConnectionCounts]);

  // ---------------------------------------------------------------------------
  // FILTERING & SEARCH
  // ---------------------------------------------------------------------------
  // One definition of "unassigned" shared by the list filter and the tab counts
  const isUnassignedConn = (c) =>
    c.status === 'UNASSIGNED' || !c.employeeName || !c.employeeName.trim() || c.employeeName.toLowerCase().includes('unassigned');

  // Connections after company / type / search / excess filters (before the All | Assigned | Unassigned tab)
  const scopeConnections = useMemo(() => {
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

      // Excess usage filter toggle
      let matchExcess = true;
      if (isExcessFilterActive) {
        matchExcess = item.isOverPlan === true;
      }

      // Company dropdown match
      const matchCompany = selectedCompany === 'All Companies' || item.company === selectedCompany;

      // Type dropdown match
      const matchType = selectedType === 'All Types' || item.connectionType === selectedType;

      return matchSearch && matchExcess && matchCompany && matchType;
    });
  }, [connections, searchTerm, isExcessFilterActive, selectedCompany, selectedType]);

  // Real history & audit trail, loaded each time the History popup opens
  useEffect(() => {
    if (!isHistoryModalOpen) return;
    setHistoryLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/tele-connections/history/all`);
        const data = res.ok ? await res.json() : [];
        setHistoryLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Could not load connection history', err);
        setHistoryLogs([]);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [isHistoryModalOpen]);

  const formatHistoryTime = (v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  };

  // Tab Match ('All' | 'Assigned' | 'Unassigned')
  const filteredConnections = useMemo(() => {
    if (activeFilterTab === 'Assigned') return scopeConnections.filter(c => !isUnassignedConn(c));
    if (activeFilterTab === 'Unassigned') return scopeConnections.filter(c => isUnassignedConn(c));
    return scopeConnections;
  }, [scopeConnections, activeFilterTab]);

  // back to page 1 whenever a filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilterTab, selectedCompany, selectedType, searchTerm, isExcessFilterActive]);

  // Available employees dynamically filtered by the selected company in the form
  // Connection types come from the Tele Connection Type master (falls back to the built-in three while it is empty)
  const connTypeOptions = useMemo(() => {
    const names = teleConnTypes
      .filter(ct => String(ct.status || 'Active').toLowerCase() === 'active' && ct.connection_type_name)
      .map(ct => String(ct.connection_type_name).trim());
    const unique = Array.from(new Set(names));
    return unique.length > 0 ? unique : ['SIM', 'Internet', 'Landline'];
  }, [teleConnTypes]);

  // Providers come only from the Tele Provider master.
  const providerOptions = useMemo(() => {
    const names = teleProviders
      .filter(pr => String(pr.status || 'Active').toLowerCase() === 'active' && pr.provider_name)
      .map(pr => String(pr.provider_name).trim());
    const unique = Array.from(new Set(names));
    return unique;
  }, [teleProviders]);

  // Package plans come only from the Tele Package master (Settings > Tele Package)
  const planOptions = useMemo(() => {
    return telePackages
      .filter(pk => String(pk.status || 'Active').toLowerCase() === 'active')
      .map(pk => ({
        id: pk.id,
        planName: pk.package_name,
        planType: pk.plan_type || 'Recurring',
        monthlyRentAED: pk.monthly_plan_amount,
        dataAllowance: pk.data_allowance,
        dataUnit: pk.data_unit || 'GB',
        localMinutes: pk.local_minutes,
        intlMinutes: pk.international_minutes,
        localSMS: pk.local_sms,
        intlSMS: pk.international_sms,
        cug: pk.cug,
      }));
  }, [telePackages]);

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

    return [{ id: 'unassigned', name: 'Unassigned', company: formData.company, joinDate: '' }];
  }, [apiEmployees, formData.company]);

  // Tab Badge Counts
  // counts follow the company / type / search filters, so each tab matches what it will show
  const totalCount = scopeConnections.length;
  const unassignedCount = scopeConnections.filter(isUnassignedConn).length;
  const assignedCount = totalCount - unassignedCount;
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
  const handleOpenAddon = (item) => {
    setActionMenu(null);
    setAddonConnection(item);
    setAddonDraft(createEmptyAddonDraft());
    setAddonDraftError('');
    setIsAddonModalOpen(true);
  };

  const handleCloseAddon = () => {
    if (isSavingAddon) return;
    setIsAddonModalOpen(false);
    setAddonConnection(null);
    setAddonDraftError('');
  };

  const handleSaveAddon = async () => {
    if (!addonConnection) return;

    const addonName = String(addonDraft.planName || '').trim();
    const amountText = String(addonDraft.planAmount ?? '').trim();
    const amount = Number(amountText);
    if (!addonName) {
      setAddonDraftError('Package Plan Name is required');
      return;
    }
    if (!amountText || !Number.isFinite(amount) || amount < 0) {
      setAddonDraftError('Enter a valid Monthly Plan Amount');
      return;
    }

    const payload = {
      package_name: addonName,
      plan_type: addonDraft.subscriptionType,
      monthly_plan_amount: amount.toFixed(2),
      data_allowance: String(addonDraft.dataAllowance || '').trim() || null,
      data_unit: 'GB',
      local_minutes: String(addonDraft.localMinutes || '').trim() || null,
      international_minutes: String(addonDraft.intlMinutes || '').trim() || null,
      local_sms: String(addonDraft.localSMS || '').trim() || null,
      international_sms: String(addonDraft.intlSMS || '').trim() || null,
      cug: String(addonDraft.cug || '').trim() || null,
      status: 'Active',
      client_id: user?.clientid || user?.client_id || user?.clientId || null,
    };

    setIsSavingAddon(true);
    setAddonDraftError('');
    try {
      const res = await fetch(`${API_URL}/api/tele-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
      if (!res.ok) throw new Error(data.message || `Failed to save package plan (HTTP ${res.status})`);

      await fetchTelePackages();
      if (showToast) showToast(`${addonName} added to Tele Package`, 'success');
      setIsAddonModalOpen(false);
      setAddonConnection(null);
      setAddonDraft(createEmptyAddonDraft());
    } catch (err) {
      console.error('Error saving package plan:', err);
      setAddonDraftError(err.message || 'Failed to save package plan');
      if (showToast) showToast(err.message || 'Failed to save package plan', 'error');
    } finally {
      setIsSavingAddon(false);
    }
  };

  // Coming from a bill's "Add to Telecom Connection" button: open the add form already filled in
  useEffect(() => {
    let raw = null;
    try { raw = typeof localStorage !== 'undefined' ? localStorage.getItem('teleConnPrefill') : null; } catch (e) { }
    if (!raw) return;
    try { localStorage.removeItem('teleConnPrefill'); } catch (e) { }
    try {
      const pre = JSON.parse(raw);
      setFormData({ ...defaultFormState, ...pre });
      setActiveItem(null);
      setShowErrors(false);
    setIsAddEditModalOpen(true);
    } catch (e) { }
  }, []);

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
      planType: 'Recurring',
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
    setShowErrors(false);
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
      cug: String(item.cug || '10000'),
      planType: item.planType || 'Recurring'
    });
    setIsCompanyDropdownOpen(false);
    setIsProviderDropdownOpen(false);
    setIsDataUnitDropdownOpen(false);
    setIsEmployeeDropdownOpen(false);
    setShowErrors(false);
    setIsAddEditModalOpen(true);
  };

  const handleSaveConnection = async () => {
    const missingLabels = [];
    if (!String(formData.company || '').trim()) missingLabels.push('Company');
    if (!String(formData.provider || '').trim()) missingLabels.push('Provider');
    if (!String(formData.connectionNumber || '').trim()) missingLabels.push('Mobile / Line Number');
    if (!String(formData.accountNumber || '').trim()) missingLabels.push('Account No');
    if (!String(formData.planName || '').trim()) missingLabels.push('Package Plan');
    if (missingLabels.length > 0) {
      setShowErrors(true);
      if (showToast) showToast(`Please fill mandatory fields: ${missingLabels.join(', ')}`, 'error');
      return;
    }
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
      plan_type: formData.planType || 'Recurring',
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
      let token = null;
      try { token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null; } catch (e) { }
      const res = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // The server (or a proxy in front of it) may answer with non-JSON, so read it safely
      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch (e) { data = {}; }
      if (!res.ok) {
        throw new Error(data.message || `Failed to delete connection (HTTP ${res.status})`);
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
            <Ionicons name="add" size={22} color="#0E5434" />
            <Text style={styles.addConnectionBtnText}>+ Add Connection</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.toolbarRow, { zIndex: (isCompanyFilterOpen || isTypeFilterOpen) ? 1000 : 20 }]}>
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
        <View style={[styles.toolbarRightWrap, { zIndex: (isCompanyFilterOpen || isTypeFilterOpen) ? 1000 : 25 }]}>
          {/* Backdrop to close on click outside */}
          {(isCompanyFilterOpen || isTypeFilterOpen) && (
            <TouchableOpacity
              style={{
                position: Platform.OS === 'web' ? 'fixed' : 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 990,
                backgroundColor: 'transparent',
              }}
              onPress={() => {
                setIsCompanyFilterOpen(false);
                setIsTypeFilterOpen(false);
              }}
              activeOpacity={1}
            />
          )}

          {/* Company Filter Dropdown */}
          <View style={{ position: 'relative', zIndex: isCompanyFilterOpen ? 1001 : 1 }}>
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
              <View style={[styles.popoverMenu, { minWidth: 200, maxWidth: 280, zIndex: 1002 }]}>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled={true}>
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
                        {comp === 'All Companies' ? `${comp} (${connections.length})` : `${comp} (${companyConnectionCounts[comp] || 0})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Type Filter Dropdown */}
          <View style={{ position: 'relative', zIndex: isTypeFilterOpen ? 1001 : 1 }}>
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
              <View style={[styles.popoverMenu, { width: 150, zIndex: 1002 }]}>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled={true}>
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
                </ScrollView>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}>
          <View style={{ minWidth: 980, flex: 1, width: '100%' }}>
            {/* Table Header Row */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colHeader, { flex: 2.4 }]}>COMPANY NAME</Text>
              <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Text style={styles.colHeader}>TYPE</Text>
                <View style={styles.newHeaderBadge}>
                  <Text style={styles.newHeaderBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={[styles.colHeader, { flex: 1.2 }]}>PROVIDER</Text>
              <Text style={[styles.colHeader, { flex: 1.3 }]}>NUMBER</Text>
              <Text style={[styles.colHeader, { flex: 2.1 }]}>EMPLOYEE</Text>
              <Text style={[styles.colHeader, { flex: 1.8 }]}>PLAN NAME</Text>
              <Text style={[styles.colHeader, { flex: 1.4 }]}>MONTHLY AMOUNT</Text>
              <Text style={[styles.colHeader, { flex: 1.2 }]}>STATUS</Text>
              <Text style={[styles.colHeader, { flex: 2, textAlign: 'center' }]}>ACTION</Text>
            </View>

            {/* Table Body Rows */}
            {paginatedData.length === 0 && isConnectionsLoading ? (
              <View style={styles.emptyTableState}>
                <ActivityIndicator size="large" color={THEME.primaryGreen} />
                <Text style={styles.emptyTableTitle}>Loading connections…</Text>
                <Text style={styles.emptyTableSub}>Please wait a moment.</Text>
              </View>
            ) : paginatedData.length === 0 ? (
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
                    <View style={[{ flex: 2.4, paddingRight: 8 }]}>
                      <Text style={styles.companyNameText}>{row.company}</Text>
                      <Text style={styles.companySubText}>{row.subCompany || 'Krish'}</Text>
                    </View>

                    {/* 2. TYPE */}
                    <View style={[{ flex: 1 }]}>
                      <View style={styles.typeBadgePill}>
                        <Text style={styles.typeBadgePillText}>{row.connectionType}</Text>
                      </View>
                    </View>

                    {/* 3. PROVIDER */}
                    <View style={[{ flex: 1.2, paddingRight: 6 }]}>
                      <Text style={styles.providerLineOne}>
                        {row.provider.includes('(Etisalat)') ? 'e&' : row.provider}
                      </Text>
                      {row.provider.includes('(Etisalat)') && (
                        <Text style={styles.providerLineTwo}>(Etisalat)</Text>
                      )}
                    </View>

                    {/* 4. NUMBER (Blue link or Red if overage) */}
                    <View style={[{ flex: 1.3 }]}>
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
                    <View style={[{ flex: 2.1, paddingRight: 8 }]}>
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
                    <View style={[{ flex: 1.8, paddingRight: 8 }]}>
                      <Text style={styles.planNameText} numberOfLines={1}>{row.planName}</Text>
                    </View>

                    {/* 7. MONTHLY AMOUNT */}
                    <View style={[{ flex: 1.4 }]}>
                      <Text style={styles.monthlyAmountText}>
                        {row.monthlyRentAED} AED
                      </Text>
                    </View>

                    {/* 8. STATUS */}
                    <View style={[{ flex: 1.2 }]}>
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
                          {row.status === 'ACTIVE' ? 'ASSIGNED' : row.status}
                        </Text>
                      </View>
                    </View>

                    {/* 10. ACTION (Eye, Pencil, Person-Add, Trash, List) */}
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

                      {/* More actions */}
                      <TouchableOpacity
                        style={[styles.tableActionIconBtn, styles.listActionIconBtn]}
                        onPress={(event) => {
                          const { pageX = width - 24, pageY = 0 } = event.nativeEvent || {};
                          setActionMenu({ row, x: pageX, y: pageY });
                        }}
                        activeOpacity={0.7}
                        title="More actions"
                        accessibilityLabel={`More actions for ${row.connectionNumber}`}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: actionMenu?.row?.id === row.id }}
                      >
                        <Ionicons name="list-outline" size={17} color={THEME.slate900} />
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
          {/* Showing x to y of z entries on the left */}
          <Text style={styles.showingEntriesText}>
            Showing <Text style={styles.showingBold}>{filteredConnections.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</Text> to <Text style={styles.showingBold}>{Math.min(currentPage * itemsPerPage, filteredConnections.length)}</Text> of <Text style={styles.showingBold}>{filteredConnections.length}</Text> entries
          </Text>

          {/* Legend Indicator in the middle */}
          <View style={styles.legendWrap}>
            <View style={styles.legendColorBox} />
            <Text style={styles.legendLabelText}>
              Red rows: bill is over the plan amount
            </Text>
          </View>

          {/* Prev / Page x of y / Next on the right */}
          <View style={styles.paginationBtnsWrap}>
            <TouchableOpacity
              style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <Ionicons name="chevron-back" size={13} color={THEME.slate600} />
              <Text style={[styles.paginationBtnText, currentPage === 1 && styles.paginationBtnTextDisabled]}>
                Prev
              </Text>
            </TouchableOpacity>

            <Text style={styles.pageOfText}>
              Page <Text style={styles.showingBold}>{currentPage}</Text> of <Text style={styles.showingBold}>{totalPages}</Text>
            </Text>

            <TouchableOpacity
              style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <Text style={[styles.paginationBtnText, currentPage === totalPages && styles.paginationBtnTextDisabled]}>
                Next
              </Text>
              <Ionicons name="chevron-forward" size={13} color={THEME.slate600} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ROW ACTION DROPDOWN */}
      <Modal
        visible={Boolean(actionMenu)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenu(null)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setActionMenu(null)}
        >
          <View
            style={[
              styles.actionMenu,
              {
                left: Math.max(12, Math.min((actionMenu?.x || width) - 154, width - 182)),
                top: Math.max(12, Math.min((actionMenu?.y || 0) + 16, height - 116)),
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                const row = actionMenu?.row;
                setActionMenu(null);
                if (row) handleOpenReassign(row);
              }}
            >
              <Ionicons name="person-add-outline" size={17} color={THEME.blueLink} />
              <Text style={styles.actionMenuText}>Assignment</Text>
            </TouchableOpacity>
            <View style={styles.actionMenuDivider} />
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                const row = actionMenu?.row;
                if (row) handleOpenAddon(row);
              }}
            >
              <Ionicons name="add-circle-outline" size={17} color={THEME.textGreen} />
              <Text style={styles.actionMenuText}>Add-on</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add-on is intentionally available only from a connection row action. */}
      <Modal
        visible={isAddonModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAddon}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 640, width: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Plan Details</Text>
                <Text style={styles.modalSubtitle}>Create a new add-on package plan</Text>
              </View>
              <TouchableOpacity
                onPress={handleCloseAddon}
                disabled={isSavingAddon}
                accessibilityLabel="Close add-on form"
              >
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.planModalGrid}>
                <View style={{ width: '100%' }}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>
                    Package Plan Name <Text style={{ color: THEME.redAlertText }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.planName}
                    onChangeText={val => {
                      setAddonDraft(prev => ({ ...prev, planName: val }));
                      setAddonDraftError('');
                    }}
                    placeholder="e.g. Standard 100 AED Plan"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>
                    Monthly Plan Amount (AED) <Text style={{ color: THEME.redAlertText }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.planAmount}
                    onChangeText={val => {
                      setAddonDraft(prev => ({ ...prev, planAmount: val }));
                      setAddonDraftError('');
                    }}
                    placeholder="100"
                    keyboardType="decimal-pad"
                    placeholderTextColor={THEME.slate400}
                  />
                  <Text style={styles.fieldHelperText}>Bills above this amount are marked as excess</Text>
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Data Allowance</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.dataAllowance}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, dataAllowance: val }))}
                    placeholder="10.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={{ width: '100%' }}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 8 }]}>Billing Frequency</Text>
                  <View style={styles.addonRadioGroup} accessibilityRole="radiogroup">
                    {[
                      { label: 'Recurring', value: 'Recurring' },
                      { label: 'One time', value: 'One Time' },
                    ].map(option => {
                      const selected = addonDraft.subscriptionType === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.addonRadioOption, selected && styles.addonRadioOptionActive]}
                          onPress={() => setAddonDraft(prev => ({ ...prev, subscriptionType: option.value }))}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.addonRadioCircle, selected && styles.addonRadioCircleActive]}>
                            {selected && <View style={styles.addonRadioDot} />}
                          </View>
                          <Text style={[styles.addonRadioText, selected && styles.addonRadioTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local Minutes</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.localMinutes}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, localMinutes: val }))}
                    placeholder="750"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International Minutes</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.intlMinutes}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, intlMinutes: val }))}
                    placeholder="250"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local SMS</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.localSMS}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, localSMS: val }))}
                    placeholder="65"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International SMS</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.intlSMS}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, intlSMS: val }))}
                    placeholder="65"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>CUG</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={addonDraft.cug}
                    onChangeText={val => setAddonDraft(prev => ({ ...prev, cug: val }))}
                    placeholder="10000"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>
              </View>

              {!!addonDraftError && <Text style={styles.addonErrorText}>{addonDraftError}</Text>}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleCloseAddon} disabled={isSavingAddon}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, isSavingAddon && { opacity: 0.65 }]}
                onPress={handleSaveAddon}
                disabled={isSavingAddon}
              >
                {isSavingAddon && <ActivityIndicator size="small" color={THEME.white} />}
                <Text style={styles.primaryBtnText}>{isSavingAddon ? 'Saving...' : 'Save Plan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <View style={[styles.formSectionBox, { zIndex: (isConnTypeDropdownOpen || isCompanyDropdownOpen || isProviderDropdownOpen) ? 1000 : 2 }]}>
                <Text style={styles.formSectionHeader}>CONNECTION DETAILS</Text>

                {/* Row 1: Connection Type * | Company * */}
                <View style={[styles.formTwoColRow, { zIndex: (isConnTypeDropdownOpen || isCompanyDropdownOpen) ? 1000 : 12 }]}>
                  <View style={[styles.formCol, { zIndex: isConnTypeDropdownOpen ? 1002 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Connection Type <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      dataSet={{ dropdown: '1' }}
                      style={[
                        styles.dropdownSelector,
                        isConnTypeDropdownOpen && { borderColor: '#166534', backgroundColor: '#FFFFFF' },
                      ]}
                      onPress={() => {
                        setIsConnTypeDropdownOpen(!isConnTypeDropdownOpen);
                        setIsCompanyDropdownOpen(false);
                        setIsProviderDropdownOpen(false);
                        setIsDataUnitDropdownOpen(false);
                        setIsEmployeeDropdownOpen(false);
                        setIsPlanDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dropdownValueText}>{formData.connectionType || 'SIM'}</Text>
                      <Ionicons
                        name={isConnTypeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={THEME.slate500}
                      />
                    </TouchableOpacity>

                    {isConnTypeDropdownOpen && (
                      <View dataSet={{ dropdown: '1' }} style={styles.dropdownListPopover}>
                        {connTypeOptions.map(type => (
                          <TouchableOpacity
                            key={type}
                            style={[styles.dropdownItem, formData.connectionType === type && styles.dropdownItemActive]}
                            onPress={() => {
                              setFormData({ ...formData, connectionType: type });
                              setIsConnTypeDropdownOpen(false);
                            }}
                          >
                            <Text
                              style={[styles.dropdownItemText, formData.connectionType === type && styles.dropdownItemTextActive]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={[styles.formCol, { zIndex: isCompanyDropdownOpen ? 1001 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Company <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      dataSet={{ dropdown: '1' }}
                      style={[
                        styles.dropdownSelector,
                        isMissing('company') && errBorder,
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
                    {isMissing('company') && <Text style={styles.fieldErrorText}>Company is required</Text>}

                    {isCompanyDropdownOpen && (
                      <View dataSet={{ dropdown: '1' }} style={styles.dropdownListPopover}>
                        <View style={{ maxHeight: 220, overflow: 'auto' }}>
                          {companyOptions.map(comp => (
                            <TouchableOpacity
                              key={comp}
                              style={[
                                styles.dropdownItem,
                                formData.company === comp && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData(prev => {
                                  const accs = accountsFor(comp, prev.provider);
                                  return { ...prev, company: comp, ...(accs.length ? { accountNumber: accs[0] } : {}) };
                                });
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
                </View>

                {/* Row 2: Provider * | Mobile / Line Number * */}
                <View style={[styles.formTwoColRow, { zIndex: isProviderDropdownOpen ? 1000 : 11 }]}>
                  <View style={[styles.formCol, { zIndex: isProviderDropdownOpen ? 1001 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Provider <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      dataSet={{ dropdown: '1' }}
                      style={[
                        styles.dropdownSelector,
                        isMissing('provider') && errBorder,
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
                    {isMissing('provider') && <Text style={styles.fieldErrorText}>Provider is required</Text>}

                    {isProviderDropdownOpen && (
                      <View dataSet={{ dropdown: '1' }} style={styles.dropdownListPopover}>
                        <View style={{ maxHeight: 220, overflow: 'auto' }}>
                          {providerOptions.map(prov => (
                            <TouchableOpacity
                              key={prov}
                              style={[
                                styles.dropdownItem,
                                formData.provider === prov && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormData(prev => {
                                  const accs = accountsFor(prev.company, prov);
                                  return { ...prev, provider: prov, ...(accs.length ? { accountNumber: accs[0] } : {}) };
                                });
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
                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Mobile / Line Number <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.exactTextInput, isMissing('connectionNumber') && errBorder]}
                      value={formData.connectionNumber}
                      onChangeText={val => setFormData({ ...formData, connectionNumber: val })}
                      placeholder="e.g. 0527901846"
                      placeholderTextColor={THEME.slate400}
                    />
                    {isMissing('connectionNumber') && <Text style={styles.fieldErrorText}>Mobile / Line Number is required</Text>}
                    <Text style={styles.fieldHelperText}>
                      Landline and Internet: the service number, e.g. 04-2856310
                    </Text>
                  </View>
                </View>

                {/* Row 3: Account No * | Serial Number */}
                <View style={[styles.formTwoColRow, { zIndex: 5 }]}>
                  <View style={styles.formCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.exactFieldLabel}>
                        Account No <Text style={{ color: THEME.redAlertText }}>*</Text>
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.exactTextInput, isMissing('accountNumber') && errBorder]}
                      value={formData.accountNumber}
                      onChangeText={val => setFormData({ ...formData, accountNumber: val })}
                      placeholder="Provider account number from the bill"
                      placeholderTextColor={THEME.slate400}
                    />
                    {isMissing('accountNumber') && <Text style={styles.fieldErrorText}>Account No is required</Text>}
                    {accountsFor(formData.company, formData.provider).length > 0 && (
                      <View style={{ marginTop: 6 }}>
                        <Text style={styles.fieldHelperText}>
                          {accountsFor(formData.company, formData.provider).length > 1
                            ? 'Accounts for this company and provider (Tele Service Provider):'
                            : 'Filled from Tele Service Provider'}
                        </Text>
                        {accountsFor(formData.company, formData.provider).length > 1 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {accountsFor(formData.company, formData.provider).map(acc => (
                              <TouchableOpacity
                                key={acc}
                                onPress={() => setFormData(prev => ({ ...prev, accountNumber: acc }))}
                                style={[styles.planUnitChip, formData.accountNumber === acc && styles.planUnitChipActive]}
                              >
                                <Text style={[styles.planUnitChipText, formData.accountNumber === acc && { color: THEME.white }]}>
                                  {acc}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.formCol}>
                    <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Serial Number</Text>
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

                {/* Row 5: Contract No */}
                <View style={styles.formTwoColRow}>
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
                  <View style={styles.formCol} />
                </View>
              </View>

              {/* SECTION 2: PLAN & LIMITS */}
              <View style={[styles.formSectionBox, { marginTop: 18, zIndex: isPlanDropdownOpen ? 1000 : 1 }]}>
                <Text style={styles.formSectionHeader}>PLAN & LIMITS</Text>

                {/* Package Plan dropdown (+ creates a new plan) */}
                <View style={[styles.formCol, { zIndex: isPlanDropdownOpen ? 1000 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.exactFieldLabel}>
                      Package Plan <Text style={{ color: THEME.redAlertText }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={{ marginLeft: 8, padding: 2 }}
                      onPress={() => {
                        setIsPlanDropdownOpen(false);
                        setEditingPlanName('');
                        setPlanDraft({
                          planName: '',
                          planType: 'Recurring',
                          monthlyRentAED: '',
                          dataAllowance: '',
                          dataUnit: 'GB',
                          localMinutes: '',
                          intlMinutes: '',
                          localSMS: '',
                          intlSMS: '',
                          cug: '',
                        });
                        setPlanDraftError('');
                        setIsPlanModalOpen(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={22} color="#0E5434" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      dataSet={{ dropdown: '1' }}
                      style={[
                        styles.dropdownSelector,
                        { flex: 1 },
                        isMissing('planName') && errBorder,
                        isPlanDropdownOpen && { borderColor: '#166534', backgroundColor: '#FFFFFF' },
                      ]}
                      onPress={() => {
                        setIsPlanDropdownOpen(!isPlanDropdownOpen);
                        setIsCompanyDropdownOpen(false);
                        setIsProviderDropdownOpen(false);
                        setIsEmployeeDropdownOpen(false);
                        setIsDataUnitDropdownOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.dropdownValueText, !formData.planName && { color: THEME.slate400 }]}
                        numberOfLines={1}
                      >
                        {formData.planName || 'Select package plan'}
                      </Text>
                      <Ionicons
                        name={isPlanDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={THEME.slate500}
                      />
                    </TouchableOpacity>
                    {!!formData.planName && (
                      <>
                        <TouchableOpacity
                          style={styles.planEditBtn}
                          onPress={() => {
                            setIsPlanDropdownOpen(false);
                            setEditingPlanName(formData.planName);
                            setPlanDraft({
                              planName: formData.planName,
                              planType: formData.planType || 'Recurring',
                              monthlyRentAED: formData.monthlyRentAED,
                              dataAllowance: formData.dataAllowance,
                              dataUnit: formData.dataUnit || 'GB',
                              localMinutes: formData.localMinutes,
                              intlMinutes: formData.intlMinutes,
                              localSMS: formData.localSMS,
                              intlSMS: formData.intlSMS,
                              cug: formData.cug,
                            });
                            setPlanDraftError('');
                            setIsPlanModalOpen(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="pencil-outline" size={17} color="#0E5434" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  {isMissing('planName') && <Text style={styles.fieldErrorText}>Package Plan is required</Text>}

                  {isPlanDropdownOpen && (
                    <View dataSet={{ dropdown: '1' }} style={[styles.dropdownListPopover, { top: 74, left: 0, right: formData.planName ? 48 : 0 }]}>
                      <View style={{ maxHeight: 220, overflow: 'auto' }}>
                        {planOptions.length === 0 && (
                          <View style={styles.dropdownItem}>
                            <Text style={styles.dropdownItemText}>No packages yet. Click + or add them in Settings → Tele Package.</Text>
                          </View>
                        )}
                        {planOptions.map(plan => (
                          <TouchableOpacity
                            key={plan.planName}
                            style={[
                              styles.dropdownItem,
                              formData.planName === plan.planName && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setFormData(prev => ({
                                ...prev,
                                planName: plan.planName,
                                planType: plan.planType || 'Recurring',
                                monthlyRentAED: plan.monthlyRentAED === undefined || plan.monthlyRentAED === null ? '' : String(plan.monthlyRentAED),
                                dataAllowance: plan.dataAllowance === undefined || plan.dataAllowance === null ? '' : String(plan.dataAllowance),
                                dataUnit: plan.dataUnit || 'GB',
                                localMinutes: plan.localMinutes === undefined || plan.localMinutes === null ? '' : String(plan.localMinutes),
                                intlMinutes: plan.intlMinutes === undefined || plan.intlMinutes === null ? '' : String(plan.intlMinutes),
                                localSMS: plan.localSMS === undefined || plan.localSMS === null ? '' : String(plan.localSMS),
                                intlSMS: plan.intlSMS === undefined || plan.intlSMS === null ? '' : String(plan.intlSMS),
                                cug: plan.cug === undefined || plan.cug === null ? '' : String(plan.cug),
                              }));
                              setIsPlanDropdownOpen(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                formData.planName === plan.planName && styles.dropdownItemTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {plan.planName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Selected plan details */}
                {!!formData.planName && (
                  <View style={{ marginTop: 14 }}>
                    <View style={styles.planSummaryGrid}>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>Plan Type</Text>
                        <Text style={styles.detailValue}>{formData.planType || 'Recurring'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>Monthly Plan Amount</Text>
                        <Text style={styles.detailValue}>{formData.monthlyRentAED ? `${formData.monthlyRentAED} AED` : '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>Data Allowance</Text>
                        <Text style={styles.detailValue}>{formData.dataAllowance ? `${formData.dataAllowance} ${formData.dataUnit || 'GB'}` : '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>Local Minutes</Text>
                        <Text style={styles.detailValue}>{formData.localMinutes || '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>International Minutes</Text>
                        <Text style={styles.detailValue}>{formData.intlMinutes || '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>Local SMS</Text>
                        <Text style={styles.detailValue}>{formData.localSMS || '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>International SMS</Text>
                        <Text style={styles.detailValue}>{formData.intlSMS || '—'}</Text>
                      </View>
                      <View style={styles.planSummaryTile}>
                        <Text style={styles.detailLabel}>CUG</Text>
                        <Text style={styles.detailValue}>{formData.cug || '—'}</Text>
                      </View>
                    </View>
                    <Text style={styles.fieldHelperText}>Bills above the monthly plan amount are marked as excess</Text>
                  </View>
                )}
              </View>

              {/* SECTION 3: NOTES */}
              <View style={[styles.formSectionBox, { marginTop: 18 }]}>
                <Text style={styles.formSectionHeader}>ADDITIONAL DETAILS</Text>

                {/* Row 2: Notes */}
                <View style={{ marginBottom: 4 }}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Remarks</Text>
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
      {/* MODAL: PLAN DETAILS (opened from + beside Package Plan)               */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isPlanModalOpen} transparent animationType="fade" onRequestClose={() => setIsPlanModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 640, width: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingPlanName ? 'Edit Plan' : 'Plan Details'}</Text>
                <Text style={styles.modalSubtitle}>{editingPlanName ? editingPlanName : 'Create a new package plan'}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPlanModalOpen(false)}>
                <Ionicons name="close" size={22} color={THEME.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.planModalGrid}>
                <View style={{ width: '100%' }}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>
                    Package Plan Name <Text style={{ color: THEME.redAlertText }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.planName}
                    onChangeText={val => { setPlanDraft(prev => ({ ...prev, planName: val })); setPlanDraftError(''); }}
                    placeholder="e.g. Standard 100 AED Plan"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>
                    Monthly Plan Amount (AED) <Text style={{ color: THEME.redAlertText }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.exactTextInput, !!planDraftError && { borderColor: THEME.redAlertText }]}
                    value={planDraft.monthlyRentAED}
                    onChangeText={val => { setPlanDraft(prev => ({ ...prev, monthlyRentAED: val })); setPlanDraftError(''); }}
                    placeholder="100"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                  {planDraftError ? (
                    <Text style={[styles.fieldHelperText, { color: THEME.redAlertText }]}>{planDraftError}</Text>
                  ) : (
                    <Text style={styles.fieldHelperText}>Bills above this amount are marked as excess</Text>
                  )}
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Data Allowance</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.dataAllowance}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, dataAllowance: val }))}
                    placeholder="10.5"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local Minutes</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.localMinutes}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, localMinutes: val }))}
                    placeholder="750"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International Minutes</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.intlMinutes}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, intlMinutes: val }))}
                    placeholder="250"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>Local SMS</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.localSMS}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, localSMS: val }))}
                    placeholder="65"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>International SMS</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.intlSMS}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, intlSMS: val }))}
                    placeholder="65"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

                <View style={styles.planModalField}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>CUG</Text>
                  <TextInput
                    style={styles.exactTextInput}
                    value={planDraft.cug}
                    onChangeText={val => setPlanDraft(prev => ({ ...prev, cug: val }))}
                    placeholder="10000"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.slate400}
                  />
                </View>

              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIsPlanModalOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  if (!String(planDraft.planName ?? '').trim()) {
                    setPlanDraftError('Package Plan Name is required');
                    return;
                  }
                  if (!String(planDraft.monthlyRentAED ?? '').trim()) {
                    setPlanDraftError('Monthly Plan Amount is required');
                    return;
                  }
                  const saved = { ...planDraft, planName: String(planDraft.planName).trim() };
                  const existing = editingPlanName
                    ? telePackages.find(pk => String(pk.package_name || '').trim().toLowerCase() === editingPlanName.trim().toLowerCase())
                    : null;
                  (async () => {
                    try {
                      const payload = {
                        package_name: saved.planName,
                        plan_type: saved.planType || 'Recurring',
                        monthly_plan_amount: saved.monthlyRentAED,
                        data_allowance: saved.dataAllowance,
                        data_unit: saved.dataUnit || 'GB',
                        local_minutes: saved.localMinutes,
                        international_minutes: saved.intlMinutes,
                        local_sms: saved.localSMS,
                        international_sms: saved.intlSMS,
                        cug: saved.cug,
                        status: existing ? existing.status || 'Active' : 'Active',
                        client_id: user?.clientid || null,
                      };
                      const res = await fetch(
                        existing ? `${API_URL}/api/tele-packages/${existing.id}` : `${API_URL}/api/tele-packages`,
                        {
                          method: existing ? 'PUT' : 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        }
                      );
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        setPlanDraftError(body.message || 'Could not save the package plan');
                        return;
                      }
                      await fetchTelePackages();
                      setFormData(prev => ({ ...prev, ...saved }));

                      // Editing an existing connection: save the plan values into tbl_tele_connection right away
                      let savedToConnection = false;
                      if (activeItem && activeItem.id) {
                        const connRes = await fetch(`${API_URL}/api/tele-connections/${activeItem.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            plan_name: saved.planName,
                            plan_type: saved.planType || 'Recurring',
                            monthly_plan_amount: saved.monthlyRentAED,
                            data_allowance: saved.dataAllowance || '',
                            data_unit: saved.dataUnit || 'GB',
                            local_minutes: saved.localMinutes || '',
                            international_minutes: saved.intlMinutes || '',
                            local_sms: saved.localSMS || '',
                            international_sms: saved.intlSMS || '',
                            cug: saved.cug || '',
                          }),
                        });
                        if (!connRes.ok) {
                          const connBody = await connRes.json().catch(() => ({}));
                          setPlanDraftError(connBody.message || 'Package saved, but the connection could not be updated');
                          return;
                        }
                        savedToConnection = true;
                        await fetchConnections();
                      }

                      setIsPlanModalOpen(false);
                      if (showToast) {
                        showToast(
                          savedToConnection
                            ? 'Package plan saved to the Tele Package master and this connection'
                            : (existing ? 'Package plan updated in Tele Package master' : 'Package plan added to Tele Package master'),
                          'success'
                        );
                      }
                    } catch (err) {
                      setPlanDraftError('Could not save the package plan');
                    }
                  })();
                }}
              >
                <Text style={styles.primaryBtnText}>{editingPlanName ? 'Update Plan' : 'Save Plan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: VIEW DETAILS                                                   */}
      {/* --------------------------------------------------------------------- */}
      {/* MODAL: VIEW DETAILS (MATCHING TELECOM DETAILS DESIGN 100%)            */}
      {/* --------------------------------------------------------------------- */}
      <Modal visible={isViewModalOpen} transparent animationType="fade" onRequestClose={() => setIsViewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContainer}>
            {/* Header (same as Edit form) */}
            <View style={styles.addModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="document-text" size={20} color={THEME.textGreen} />
                <Text style={styles.addModalTitle}>View Telecom Connection</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseCircle}
                onPress={() => setIsViewModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={THEME.slate600} />
              </TouchableOpacity>
            </View>

            {/* Read-only body: identical sections, order and field styling as the Edit form */}
            {activeItem && (() => {
              const dash = v => (v === undefined || v === null || String(v).trim() === '' ? '—' : String(v));
              const Field = ({ label, value, dropdown, calendar, required, helper, disabled }) => (
                <View style={styles.formCol}>
                  <Text style={[styles.exactFieldLabel, { marginBottom: 6 }]}>
                    {label}
                    {required ? <Text style={{ color: THEME.redAlertText }}> *</Text> : null}
                  </Text>
                  <View
                    style={[
                      styles.exactTextInput,
                      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                      disabled && { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 13, color: value === '—' || disabled ? '#94A3B8' : '#1E293B', flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      {value}
                    </Text>
                    {dropdown && <Ionicons name="chevron-down" size={14} color={THEME.slate500} />}
                    {calendar && <Ionicons name="calendar-outline" size={17} color={THEME.slate500} />}
                  </View>
                  {!!helper && <Text style={styles.fieldHelperText}>{helper}</Text>}
                </View>
              );
              const Row = ({ children }) => <View style={styles.formTwoColRow}>{children}</View>;
              const isSim = (activeItem.connectionType || 'SIM') === 'SIM';
              const tiles = [
                ['Plan Type', dash(activeItem.planType || 'Recurring')],
                ['Monthly Plan Amount', activeItem.monthlyRentAED !== undefined && activeItem.monthlyRentAED !== null ? `${activeItem.monthlyRentAED} AED` : '—'],
                ['Data Allowance', activeItem.dataAllowance ? `${activeItem.dataAllowance} ${activeItem.dataUnit || 'GB'}` : '—'],
                ['Local Minutes', dash(activeItem.localMinutes)],
                ['International Minutes', dash(activeItem.intlMinutes)],
                ['Local SMS', dash(activeItem.localSMS)],
                ['International SMS', dash(activeItem.intlSMS)],
                ['CUG', dash(activeItem.cug)],
              ];
              return (
                <ScrollView
                  style={styles.addModalScroll}
                  contentContainerStyle={styles.addModalScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* SECTION 1: CONNECTION DETAILS */}
                  <View style={styles.formSectionBox}>
                    <Text style={styles.formSectionHeader}>CONNECTION DETAILS</Text>
                    <Row>
                      <Field required label="Connection Type" value={dash(activeItem.connectionType || 'SIM')} dropdown />
                      <Field required label="Company" value={dash(activeItem.company)} dropdown />
                    </Row>
                    <Row>
                      <Field required label="Provider" value={dash(activeItem.provider)} dropdown />
                      <Field
                        required
                        label="Mobile / Line Number"
                        value={dash(activeItem.connectionNumber)}
                        helper="Landline and Internet: the service number, e.g. 04-2856310"
                      />
                    </Row>
                    <Row>
                      <Field required label="Account No" value={dash(activeItem.accountNumber)} />
                      <Field
                        label="Serial Number"
                        value={dash(activeItem.iccid)}
                        disabled={!isSim}
                        helper="SIM only"
                      />
                    </Row>
                    <Row>
                      <Field label="Contract From" value={dash(activeItem.contractFrom)} calendar />
                      <Field label="Contract To" value={dash(activeItem.contractTo)} calendar />
                    </Row>
                    <Row>
                      <Field label="Contract No" value={dash(activeItem.contractNo)} />
                      <View style={styles.formCol} />
                    </Row>
                  </View>

                  {/* SECTION 2: PLAN & LIMITS */}
                  <View style={[styles.formSectionBox, { marginTop: 18 }]}>
                    <Text style={styles.formSectionHeader}>PLAN & LIMITS</Text>
                    <Row>
                      <Field required label="Package Plan" value={dash(activeItem.planName)} dropdown />
                    </Row>
                    <View style={styles.planSummaryGrid}>
                      {tiles.map(([label, value]) => (
                        <View key={label} style={styles.planSummaryTile}>
                          <Text style={styles.detailLabel}>{label}</Text>
                          <Text style={styles.detailValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* SECTION 3: ADDITIONAL DETAILS */}
                  <View style={[styles.formSectionBox, { marginTop: 18 }]}>
                    <Text style={styles.formSectionHeader}>ADDITIONAL DETAILS</Text>
                    <Row>
                      <Field label="Remarks" value={dash(activeItem.notes)} />
                    </Row>
                  </View>
                </ScrollView>
              );
            })()}

            {/* Footer (same as Edit form): Close on the left, Edit Details on the right */}
            <View style={styles.addModalFooter}>
              <TouchableOpacity
                style={styles.formBackBtn}
                onPress={() => setIsViewModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.formBackBtnText}>Close</Text>
              </TouchableOpacity>

              <View style={styles.formFooterRightActions}>
                <TouchableOpacity
                  style={[styles.formSaveBtn, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                  onPress={() => {
                    setIsViewModalOpen(false);
                    handleOpenEdit(activeItem);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.formSaveBtnText}>Edit Details</Text>
                </TouchableOpacity>
              </View>
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
              {activeItem && !isUnassignedConn(activeItem) && (
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
              )}

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
              {historyLoading && (
                <Text style={{ fontSize: 13, color: THEME.slate500, padding: 12 }}>Loading history...</Text>
              )}
              {!historyLoading && historyLogs.length === 0 && (
                <Text style={{ fontSize: 13, color: THEME.slate500, padding: 12 }}>No history recorded yet.</Text>
              )}
              {historyLogs.map(log => (
                <View key={log.id} style={styles.historyLogCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.slate900 }}>{log.action} • {log.line}</Text>
                    <Text style={{ fontSize: 11, color: THEME.slate500 }}>{formatHistoryTime(log.at)}</Text>
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
    position: 'relative',
    zIndex: 20,
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
    position: 'relative',
    zIndex: 25,
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
    zIndex: 99999,
    elevation: 30,
    boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
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
    position: 'relative',
    zIndex: 1,
    ...SHADOWS.small,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  colHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: THEME.white,
  },
  tableRowOverPlan: {
    backgroundColor: '#FFF5F5', // Tint red when bill > plan amount
  },
  companyNameText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1D4ED8', // Blue link
  },
  phoneNumberTextOver: {
    color: '#DC2626', // Red if over plan
    textDecorationLine: 'underline',
  },
  employeeNameText: {
    fontSize: 14,
    fontWeight: '600',
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
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tableActionIconBtn: {
    padding: 3,
  },
  listActionIconBtn: {
    width: 28,
    height: 28,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderRadius: 4,
  },
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  actionMenu: {
    position: 'absolute',
    width: 170,
    paddingVertical: 5,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.slate200,
    borderRadius: 8,
    ...SHADOWS.md,
  },
  actionMenuItem: {
    minHeight: 40,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  actionMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.slate800,
  },
  actionMenuDivider: {
    height: 1,
    marginHorizontal: 10,
    backgroundColor: THEME.slate100,
  },

  // 4. Footer & Pagination Bar
  tableFooterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: THEME.white,
    gap: 12,
  },
  showingBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  pageOfText: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderStyle: 'solid',
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
  fieldErrorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E5434',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '2%',
    rowGap: 10,
  },
  detailCol: {
    width: '23.5%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  planSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '2%',
    rowGap: 10,
  },
  planSummaryTile: {
    width: '32%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  planEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#0E5434',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '4%',
    rowGap: 16,
  },
  planModalField: {
    width: '48%',
  },
  addonRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  addonRadioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  addonRadioOptionActive: {
    borderColor: '#0E5434',
    backgroundColor: '#F0FDF4',
  },
  addonRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addonRadioCircleActive: {
    borderColor: '#0E5434',
  },
  addonRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0E5434',
  },
  addonRadioText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  addonRadioTextActive: {
    color: '#0E5434',
    fontWeight: '700',
  },
  addonErrorText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  planUnitChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  planUnitChipActive: {
    backgroundColor: '#0E5434',
  },
  planUnitChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
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
