import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  Picker,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { API_URL } from '../config';
import CustomFieldsTab, { SearchableDropdown } from './CustomFieldsTab';
import FieldPermissionsTab from './FieldPermissionsTab';
import VehicleInsuranceTab from './VehicleInsuranceTab';
import VehicleDetailsTab from './VehicleDetailsTab';
import VehiclePurchaseTab from './VehiclePurchaseTab';
import VehicleTollTab from './VehicleTollTab';
import VehicleTollReportTab from './VehicleTollReportTab';
import PremisesDetailsTab from './PremisesDetailsTab';
import AssetDetailsTab from './AssetDetailsTab';
import AssetCategoryTab from './AssetCategoryTab';
import AssetBrandTab from './AssetBrandTab';
import AssetTab from './AssetTab';
import InventoryTab from './InventoryTab';
import AssetAssignmentTab from './AssetAssignmentTab';
import SupplierDetailsTab from './SupplierDetailsTab';
import PurchaseDetailsTab from './PurchaseDetailsTab';
import PaymentMethodTab from './PaymentMethodTab';
import UOMTab from './UOMTab';
import VATTab from './VATTab';
import PlanManagementTab from './PlanManagementTab';
import SimPlanTab from './SimPlanTab';
import TelecomProviderTab from './TelecomProviderTab';
import TeleCategoryTab from './TeleCategoryTab';
import TeleChargeTypeTab from './TeleChargeTypeTab';
import SimDetailsTab from './SimDetailsTab';
import TelecomBillTab from './TelecomBillTab';
import UsageChargesTab from './UsageChargesTab';
import PremiumExtraChargesTab from './PremiumExtraChargesTab';
import PremiumExtraChargeTypeTab from './PremiumExtraChargeTypeTab';
import TelecomDocumentTab from './TelecomDocumentTab';
import TeleDocTypeTab from './TeleDocTypeTab';
import CompanyLegalFormTab from './CompanyLegalFormTab';
import CompanyLicenseAuthTab from './CompanyLicenseAuthTab';
import CompanyDefCurrencyTab from './CompanyDefCurrencyTab';
import SystemSettingsTab from './SystemSettingsTab';
import TollGateTab from './TollGateTab';

export default function DashboardScreen({ user, onSignOut }) {
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'custom-date-picker-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          input[type="date"]::-webkit-calendar-picker-indicator { background: transparent; bottom: 0; color: transparent; cursor: pointer; height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto; }
          input[type="date"] { position: relative; }
          select { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url("data:image/svg+xml;utf8,<svg fill='%2364748B' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>"); background-repeat: no-repeat; background-position-x: 98%; background-position-y: center; }
          .r-fontSize-vbi3md { font-size: 12.5px !important; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);
  const isLargeScreen = width > 768; // standard tablet/desktop break

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('trakio_active_tab');
      if (saved) return saved;
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('trakio_active_tab', activeTab);
    }
  }, [activeTab]);

  const [activeModuleId, setActiveModuleId] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('trakio_active_module_id');
      if (saved) return saved;
    }
    return null;
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && activeModuleId !== null && activeModuleId !== undefined) {
      localStorage.setItem('trakio_active_module_id', String(activeModuleId));
    }
  }, [activeModuleId]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [expandedParentIds, setExpandedParentIds] = useState({});

  // Search queries
  const [rolesSearch, setRolesSearch] = useState('');
  const [deptsSearch, setDeptsSearch] = useState('');
  const [smtpSearch, setSmtpSearch] = useState('');
  const [clientsSearch, setClientsSearch] = useState('');
  const [countriesSearch, setCountriesSearch] = useState('');
  const [statesSearch, setStatesSearch] = useState('');
  const [modulesSearch, setModulesSearch] = useState('');

  // Pagination pages
  const [rolesPage, setRolesPage] = useState(1);
  const [deptsPage, setDeptsPage] = useState(1);
  const [smtpPage, setSmtpPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const [countriesPage, setCountriesPage] = useState(1);
  const [statesPage, setStatesPage] = useState(1);
  const [modulesPage, setModulesPage] = useState(1);

  // Items per page
  const ITEMS_PER_PAGE = 5;

  // Helper to render premium search bar toolbar
  const renderTableToolbar = (searchVal, setSearchVal, setPageVal, placeholderText) => {
    return (
      <View style={styles.toolbarContainer}>
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchBarInput}
            placeholder={placeholderText}
            placeholderTextColor={COLORS.textMuted}
            value={searchVal}
            onChangeText={(text) => {
              setSearchVal(text);
              setPageVal(1); // reset to page 1 on search
            }}
          />
          {searchVal ? (
            <TouchableOpacity onPress={() => { setSearchVal(''); setPageVal(1); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  // Helper to render premium pagination controls
  const renderTablePagination = (totalItems, currentPage, setPageVal) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const startEntry = totalItems === 0 ? 0 : (activePage - 1) * ITEMS_PER_PAGE + 1;
    const endEntry = Math.min(activePage * ITEMS_PER_PAGE, totalItems);

    return (
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationText}>
          Showing <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{startEntry}</Text> to{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{endEntry}</Text> of{' '}
          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{totalItems}</Text> entries
        </Text>

        <View style={styles.paginationButtons}>
          <TouchableOpacity
            style={[styles.pageBtn, activePage === 1 && styles.pageBtnDisabled]}
            disabled={activePage === 1}
            onPress={() => setPageVal(activePage - 1)}
          >
            <Ionicons name="chevron-back" size={16} color={activePage === 1 ? COLORS.textMuted : COLORS.primary} />
            <Text style={[styles.pageBtnText, activePage === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorText}>
              Page <Text style={{ fontWeight: '700' }}>{activePage}</Text> of {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.pageBtn, activePage === totalPages && styles.pageBtnDisabled]}
            disabled={activePage === totalPages}
            onPress={() => setPageVal(activePage + 1)}
          >
            <Text style={[styles.pageBtnText, activePage === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color={activePage === totalPages ? COLORS.textMuted : COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Shipments filter state
  const [shipmentFilter, setShipmentFilter] = useState('All'); // 'All' | 'In Transit' | 'Sorting' | 'Delivering'

  // Module state variables
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null); // stores active module object under edit

  // Add Module Form states
  const [newModuleName, setNewModuleName] = useState('');
  const [newParentId, setNewParentId] = useState(''); // Stores module ID as a string or empty string
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('active'); // 'active' | 'inactive'
  const [newRoute, setNewRoute] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Role state variables
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // stores active role object under edit

  // Add/Edit Role Form states
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleStatus, setNewRoleStatus] = useState(1); // 1 = Active, 0 = Inactive
  const [roleFormSaving, setRoleFormSaving] = useState(false);
  const [roleFormError, setRoleFormError] = useState('');
  const [newRoleClientIds, setNewRoleClientIds] = useState([]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Department state variables
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null); // stores active dept object under edit

  // Add/Edit Department Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptStatus, setNewDeptStatus] = useState(1); // 1 = Active, 0 = Inactive
  const [deptFormSaving, setDeptFormSaving] = useState(false);
  const [deptFormError, setDeptFormError] = useState('');

  // SMTP Config state variables
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [isAddSmtpModalOpen, setIsAddSmtpModalOpen] = useState(false);
  const [editingSmtp, setEditingSmtp] = useState(null); // stores active SMTP configuration object under edit

  // Add/Edit SMTP Config Form states
  const [smtpConfigName, setSmtpConfigName] = useState('');
  const [smtpStatus, setSmtpStatus] = useState(1); // 1 = Active, 0 = Inactive
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpReplyTo, setSmtpReplyTo] = useState('');
  const [smtpSecurity, setSmtpSecurity] = useState('STARTTLS'); // STARTTLS, SSL/TLS, None
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpFormError, setSmtpFormError] = useState('');
  const [smtpUserId, setSmtpUserId] = useState('');


  // Company state variables
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isCompanyViewOnly, setIsCompanyViewOnly] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companiesSearch, setCompaniesSearch] = useState('');
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [companyShortCode, setCompanyShortCode] = useState('');
  const [companyTrafficFileNumber, setCompanyTrafficFileNumber] = useState('');
  const [companyClientId, setCompanyClientId] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companyStatus, setCompanyStatus] = useState('Active');

  const [companyLegalForm, setCompanyLegalForm] = useState('');
  const [legalFormOptions, setLegalFormOptions] = useState([]);

  const fetchCompanyLegalFormOptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/company-legal-forms`);
      if (res.ok) {
        const data = await res.json();
        setLegalFormOptions(Array.isArray(data) ? data.filter(item => (item.status || '').toLowerCase() === 'active') : []);
      }
    } catch (err) {
      console.error('Error fetching company legal forms:', err);
    }
  };

  useEffect(() => {
    fetchCompanyLegalFormOptions();
  }, []);

  useEffect(() => {
    if (isCompanyModalOpen) {
      fetchCompanyLegalFormOptions();
    }
  }, [isCompanyModalOpen]);
  const [companyBusinessActivity, setCompanyBusinessActivity] = useState('');
  const [companyTradeLicenseFile, setCompanyTradeLicenseFile] = useState(null);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyJurisdiction, setCompanyJurisdiction] = useState('');
  const [companyLicensingAuthority, setCompanyLicensingAuthority] = useState('');
  const [licenseAuthOptions, setLicenseAuthOptions] = useState([]);

  const fetchCompanyLicenseAuthOptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/company-license-auth`);
      if (res.ok) {
        const data = await res.json();
        setLicenseAuthOptions(Array.isArray(data) ? data.filter(item => (item.status || '').toLowerCase() === 'active') : []);
      }
    } catch (err) {
      console.error('Error fetching company licensing authorities:', err);
    }
  };

  useEffect(() => {
    fetchCompanyLicenseAuthOptions();
  }, []);

  useEffect(() => {
    if (isCompanyModalOpen) {
      fetchCompanyLicenseAuthOptions();
    }
  }, [isCompanyModalOpen]);

  const [defCurrencyOptions, setDefCurrencyOptions] = useState([]);

  const fetchCompanyDefCurrencyOptions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/company-def-currency`);
      if (res.ok) {
        const data = await res.json();
        setDefCurrencyOptions(Array.isArray(data) ? data.filter(item => (item.status || '').toLowerCase() === 'active') : []);
      }
    } catch (err) {
      console.error('Error fetching company default currencies:', err);
    }
  };

  useEffect(() => {
    fetchCompanyDefCurrencyOptions();
  }, []);

  useEffect(() => {
    if (isCompanyModalOpen) {
      fetchCompanyDefCurrencyOptions();
    }
  }, [isCompanyModalOpen]);
  const [companyTradeLicenseNumber, setCompanyTradeLicenseNumber] = useState('');
  const [companyTradeLicenseIssueDate, setCompanyTradeLicenseIssueDate] = useState('');
  const [companyTradeLicenseExpiryDate, setCompanyTradeLicenseExpiryDate] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyEmirate, setCompanyEmirate] = useState('');
  const [companyRegisteredAddress, setCompanyRegisteredAddress] = useState('');
  const [companyPoBox, setCompanyPoBox] = useState('');
  const [companyContactPerson, setCompanyContactPerson] = useState('');
  const [companyContactEmail, setCompanyContactEmail] = useState('');
  const [companyContactPhone, setCompanyContactPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyVatRegistered, setCompanyVatRegistered] = useState(false);
  const [companyTrn, setCompanyTrn] = useState('');
  const [companyCorporateTaxRegistrationNumber, setCompanyCorporateTaxRegistrationNumber] = useState('');
  const [companyEstablishmentCardNumber, setCompanyEstablishmentCardNumber] = useState('');
  const [companyEstablishmentCardExpiryDate, setCompanyEstablishmentCardExpiryDate] = useState('');
  const [companyMohreNumber, setCompanyMohreNumber] = useState('');
  const [companyWpsRegistered, setCompanyWpsRegistered] = useState(false);
  const [companyNafisEmiratisationApplicable, setCompanyNafisEmiratisationApplicable] = useState(false);
  const [companyGpssaApplicable, setCompanyGpssaApplicable] = useState(false);
  const [companyAuthorizedSignatoryName, setCompanyAuthorizedSignatoryName] = useState('');
  const [companyAuthorizedSignatoryDesignation, setCompanyAuthorizedSignatoryDesignation] = useState('');
  const [companyDefaultBank, setCompanyDefaultBank] = useState('');
  const [companyDefaultCurrency, setCompanyDefaultCurrency] = useState('');
  const [companyAssetPrefix, setCompanyAssetPrefix] = useState('');
  const [companyVehiclePrefix, setCompanyVehiclePrefix] = useState('');
  const [companyEmployeePrefix, setCompanyEmployeePrefix] = useState('');
  const [companyTradeLicenseAlertDays, setCompanyTradeLicenseAlertDays] = useState('30');
  const [companyEstablishmentCardAlertDays, setCompanyEstablishmentCardAlertDays] = useState('30');
  const [companyInsuranceAlertDays, setCompanyInsuranceAlertDays] = useState('30');
  const [companyPlanId, setCompanyPlanId] = useState('');
  const [companyPartyId, setCompanyPartyId] = useState('');
  const [companyWizardStep, setCompanyWizardStep] = useState(1);

  // Employee state variables
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isViewOnlyEmployee, setIsViewOnlyEmployee] = useState(false);
  const [empFullName, setEmpFullName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRoleId, setEmpRoleId] = useState('');
  const [empRoleIds, setEmpRoleIds] = useState([]);
  const [empStatus, setEmpStatus] = useState(1);
  const [empDepartmentId, setEmpDepartmentId] = useState('');
  const [empBaseCompanyId, setEmpBaseCompanyId] = useState('');
  const [empAssociatedCompanies, setEmpAssociatedCompanies] = useState([]);
  const [empCompanyDropdownOpen, setEmpCompanyDropdownOpen] = useState(false);
  const [empAutoGeneratePassword, setEmpAutoGeneratePassword] = useState(false);
  const [employeesSearch, setEmployeesSearch] = useState('');
  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeeFormSaving, setEmployeeFormSaving] = useState(false);
  const [employeeFormError, setEmployeeFormError] = useState('');
  const [empRoleError, setEmpRoleError] = useState('');
  const [isEmpRoleDropdownOpen, setIsEmpRoleDropdownOpen] = useState(false);
  const [empCompanyError, setEmpCompanyError] = useState('');
  const [isViewEmpCompaniesModalOpen, setIsViewEmpCompaniesModalOpen] = useState(false);
  const [selectedEmployeeForCompanies, setSelectedEmployeeForCompanies] = useState(null);
  const [selectedNonBaseCompanyIds, setSelectedNonBaseCompanyIds] = useState([]);
  const [savingEmpCompanies, setSavingEmpCompanies] = useState(false);
  const [showViewCardPassword, setShowViewCardPassword] = useState(true);


  // Client state variables
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isViewClientCompaniesModalOpen, setIsViewClientCompaniesModalOpen] = useState(false);
  const [selectedClientForView, setSelectedClientForView] = useState(null);

  // Add/Edit Client Form states
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyShortname, setCompanyShortname] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [trnNo, setTrnNo] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [website, setWebsite] = useState('');
  const [tradeLicenseno, setTradeLicenseno] = useState('');
  const [maxCompanies, setMaxCompanies] = useState('');
  const [maxEmployess, setMaxEmployess] = useState('');
  const [maxAsset, setMaxAsset] = useState('');
  const [clientStatus, setClientStatus] = useState(1); // 1 = Active, 0 = Inactive
  const [enabledModule, setEnabledModule] = useState('');
  const [clientFormSaving, setClientFormSaving] = useState(false);
  const [clientFormError, setClientFormError] = useState('');
  const [clientWizardStep, setClientWizardStep] = useState(1); // 1 = Identity, 2 = License, 3 = Location, 4 = Limits
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Country state variables
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [newCountryName, setNewCountryName] = useState('');
  const [countryFormSaving, setCountryFormSaving] = useState(false);
  const [countryFormError, setCountryFormError] = useState('');

  // State state variables
  const [states, setStates] = useState([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [isAddStateModalOpen, setIsAddStateModalOpen] = useState(false);
  const [editingState, setEditingState] = useState(null);
  const [newStateName, setNewStateName] = useState('');
  const [newStateCountryId, setNewStateCountryId] = useState('');
  const [stateFormSaving, setStateFormSaving] = useState(false);
  const [stateFormError, setStateFormError] = useState('');

  // Role Permission states
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPermissionCompanyId, setSelectedPermissionCompanyId] = useState('all');
  const [modalPermissionCompanyId, setModalPermissionCompanyId] = useState('all');
  const [companyPermissionDrafts, setCompanyPermissionDrafts] = useState({});
  const [isRolePermissionModalOpen, setIsRolePermissionModalOpen] = useState(false);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  // Logged-in user permissions
  const [userPermissions, setUserPermissions] = useState([]);
  const [userCompanyPermissions, setUserCompanyPermissions] = useState([]);
  const [userPermissionsLoading, setUserPermissionsLoading] = useState(true);

  // Fetch logged-in user permissions on load
  const fetchUserPermissions = () => {
    if (!user || !user.roleId) {
      setUserPermissionsLoading(false);
      return;
    }
    setUserPermissionsLoading(true);
    const compIds = (user.associatedCompanyIds && user.associatedCompanyIds.length > 0)
      ? user.associatedCompanyIds.join(',')
      : (user.companyid || '');
    let url = `${API_URL}/api/roles/${user.roleId}/permissions?company_id=${compIds}&_t=${Date.now()}`;
    if (user.clientid) {
      url += `&clientid=${user.clientid}`;
    }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user permissions.');
        return res.json();
      })
      .then((data) => {
        setUserPermissions(data.permissions || []);
        setUserCompanyPermissions(data.companyPermissions || []);
        setUserPermissionsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching user permissions:', err);
        setUserPermissionsLoading(false);
      });
  };

  // Fetch role permissions
  const fetchRolePermissions = (roleId, companyId = '') => {
    if (!roleId) {
      setRolePermissions([]);
      return;
    }
    setPermissionsLoading(true);
    let url = `${API_URL}/api/roles/${roleId}/permissions?1=1`;
    if (user && user.clientid) {
      url += `&clientid=${user.clientid}`;
    }
    if (companyId && companyId !== 'all') {
      url += `&company_id=${companyId}`;
    }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch role permissions.');
        return res.json();
      })
      .then((data) => {
        // Group and order hierarchically: parent followed by its children
        let permissions = data.permissions;

        if (user && String(user.roleId) !== '1') {
          permissions = permissions.filter(p => {
            const up = userPermissions.find(upm => upm.module_id === p.module_id);
            if (up && up.can_view) return true;
            // Also include parent modules if any of their children are viewable
            const hasVisibleChild = data.permissions.some(child => {
              if (child.parent_id === p.module_id) {
                const childUp = userPermissions.find(upm => upm.module_id === child.module_id);
                return childUp && childUp.can_view;
              }
              return false;
            });
            return hasVisibleChild;
          });
        }

        const parents = permissions.filter(p => p.parent_id === null || p.parent_id === undefined);
        const ordered = [];
        const visitedIds = new Set();

        const addWithChildren = (parentItem) => {
          if (!parentItem || visitedIds.has(parentItem.module_id)) return;
          visitedIds.add(parentItem.module_id);
          ordered.push(parentItem);
          const children = permissions.filter(p => p.parent_id === parentItem.module_id);
          children.forEach(child => addWithChildren(child));
        };

        parents.forEach(parent => addWithChildren(parent));

        permissions.forEach(p => {
          if (!visitedIds.has(p.module_id)) {
            addWithChildren(p);
          }
        });

        if (!ordered || ordered.length === 0) {
          initializeDefaultRolePermissions();
        } else {
          setRolePermissions(ordered);
        }
        setPermissionsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching permissions:', err);
        showToast('Could not load role permissions.', 'error');
        initializeDefaultRolePermissions();
        setPermissionsLoading(false);
      });
  };

  // Toggle a modular permission field
  const togglePermission = (moduleId, field) => {
    setRolePermissions(prev => {
      return prev.map(perm => {
        if (perm.module_id !== moduleId) return perm;

        const updated = { ...perm };
        if (field === 'full_control') {
          const val = !perm.full_control;
          updated.full_control = val;
          updated.can_view = val;
          updated.can_create = val;
          updated.can_edit = val;
          updated.can_delete = val;
          updated.all_record_view = val;
        } else {
          updated[field] = !perm[field];
        }
        return updated;
      });
    });
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    setPermissionsSaving(true);

    const selectedRoleObj = roles.find(r => String(r.id) === String(selectedRoleId));
    const roleClientId = selectedRoleObj?.clientid || selectedRoleObj?.client_id || user?.clientid || null;

    const allDrafts = {
      ...companyPermissionDrafts,
      [selectedPermissionCompanyId || 'all']: rolePermissions
    };

    const savePromises = Object.entries(allDrafts).map(([compId, perms]) => {
      let targetCompanyIds = [];
      if (compId === 'all' || !compId) {
        targetCompanyIds = ['all'];
      } else {
        targetCompanyIds = [compId];
      }

      return fetch(`${API_URL}/api/roles/${selectedRoleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          permissions: perms,
          company_ids: targetCompanyIds,
          client_id: roleClientId
        }),
      }).then((res) => {
        if (!res.ok) throw new Error('Failed to save permissions.');
        return res.json();
      });
    });

    Promise.all(savePromises)
      .then(() => {
        showToast('Role permissions updated successfully!', 'success');
        setPermissionsSaving(false);
        setCompanyPermissionDrafts({});
        setIsRolePermissionModalOpen(false);
        // Sync active user privileges in real-time if editing their own role!
        if (user && String(selectedRoleId) === String(user.roleId)) {
          fetchUserPermissions();
        }
      })
      .catch((err) => {
        console.error('Error saving permissions:', err);
        showToast('Could not save role permissions.', 'error');
        setPermissionsSaving(false);
      });
  };

  // Toast notification state variables
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => (prev.message === message ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  // User dropdown menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Change Password Modal state
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      showToast('Please fill all password fields.', 'warning');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (pwdNew.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: pwdCurrent,
          newPassword: pwdNew
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Password updated successfully!', 'success');
        setChangePasswordVisible(false);
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
        setShowPwdCurrent(false);
        setShowPwdNew(false);
        setShowPwdConfirm(false);
      } else {
        showToast(data.message || 'Failed to update password.', 'error');
      }
    } catch (err) {
      console.error('Change password error:', err);
      showToast('Could not reach the server.', 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  // Admin password reset for other employees
  const [adminPasswordResetEmployee, setAdminPasswordResetEmployee] = useState(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPwdLoading, setAdminPwdLoading] = useState(false);
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);

  const handleOpenPasswordResetModal = (emp) => {
    setAdminPasswordResetEmployee(emp);
    setAdminNewPassword('');
    setAdminConfirmPassword('');
    setShowAdminNewPassword(false);
    setShowAdminConfirmPassword(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminNewPassword(pass);
    setAdminConfirmPassword(pass);
    setShowAdminNewPassword(true);
    setShowAdminConfirmPassword(true);
  };

  const handleAdminChangePassword = async () => {
    if (!adminNewPassword || !adminConfirmPassword) {
      showToast('Please fill all password fields.', 'warning');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (adminNewPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    setAdminPwdLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/admin-change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: adminPasswordResetEmployee.email,
          newPassword: adminNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Password for ${adminPasswordResetEmployee.full_name} updated successfully!`, 'success');
        setAdminPasswordResetEmployee(null);
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setShowAdminNewPassword(false);
        setShowAdminConfirmPassword(false);
      } else {
        showToast(data.message || 'Failed to update password.', 'error');
      }
    } catch (err) {
      console.error('Admin password change error:', err);
      showToast('An error occurred during password update.', 'error');
    } finally {
      setAdminPwdLoading(false);
    }
  };

  // Delete confirmation state variables
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState(''); // 'client' | 'role' | 'department' | 'smtp' | 'country' | 'state' | 'module'
  const [deleteTargetName, setDeleteTargetName] = useState('');

  // Trigger delete confirmation flow
  const confirmDelete = (id, type, name) => {
    setDeleteTargetId(id);
    setDeleteTargetType(type);
    setDeleteTargetName(name || `ID #${id}`);
    setDeleteConfirmText('');
    setDeleteConfirmationVisible(true);
  };

  // Handle actual confirm delete after typing YES
  const handleConfirmDelete = () => {
    if (deleteConfirmText.trim() !== 'YES') {
      showToast('Please type YES to confirm.', 'error');
      return;
    }

    const id = deleteTargetId;
    const type = deleteTargetType;

    // Reset state before fetching/deleting
    setDeleteConfirmationVisible(false);
    setDeleteTargetId(null);
    setDeleteTargetType('');
    setDeleteTargetName('');
    setDeleteConfirmText('');

    if (type === 'client') {
      handleDeleteClient(id);
    } else if (type === 'role') {
      handleDeleteRole(id);
    } else if (type === 'department') {
      handleDeleteDepartment(id);
    } else if (type === 'smtp') {
      handleDeleteSmtp(id);
    } else if (type === 'country') {
      handleDeleteCountry(id);
    } else if (type === 'state') {
      handleDeleteState(id);
    } else if (type === 'module') {
      handleDeleteModule(id);
    } else if (type === 'company') {
      handleDeleteCompany(id);
    } else if (type === 'employee') {
      handleDeleteEmployee(id);
    }
  };

  // Fetch modules from the REST API
  const fetchModules = () => {
    setModulesLoading(true);
    const clientParam = user?.clientid ? `?clientid=${user.clientid}` : '';
    fetch(`${API_URL}/api/modules${clientParam}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve modules.');
        return res.json();
      })
      .then((data) => {
        // Check if any Vehicle sub-modules exist but the Vehicle parent (18) is missing
        const hasVehicleSubmodule = data.some(m => [19, 23, 24].includes(m.id) || m.parent_id === 18);
        const hasVehicleParent = data.some(m => m.id === 18);
        
        if (hasVehicleSubmodule && !hasVehicleParent) {
          data.push({
            id: 18,
            module_name: "Vehicle",
            parent_id: null,
            route: null,
            status: "active"
          });
        }

        // Group and order hierarchically: parent followed by its children
        const parents = data.filter(m => m.parent_id === null || m.parent_id === undefined);
        const ordered = [];
        parents.forEach(parent => {
          ordered.push(parent);
          const children = data.filter(m => m.parent_id === parent.id);
          ordered.push(...children);
        });
        const orderedIds = new Set(ordered.map(m => m.id));
        const orphans = data.filter(m => !orderedIds.has(m.id));
        ordered.push(...orphans);

        setModules(ordered);
        setModulesLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching modules:', err);
        setModulesLoading(false);
      });
  };

  // Fetch roles from the REST API
  const fetchRoles = () => {
    setRolesLoading(true);
    fetch(`${API_URL}/api/roles?clientid=${user?.clientid || ''}&roleid=${user?.roleId || ''}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve roles.');
        return res.json();
      })
      .then((data) => {
        setRoles(data);
        setRolesLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching roles:', err);
        setRolesLoading(false);
      });
  };

  // Fetch departments from the REST API
  const fetchDepartments = () => {
    setDepartmentsLoading(true);
    fetch(`${API_URL}/api/departments`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve departments.');
        return res.json();
      })
      .then((data) => {
        setDepartments(data);
        setDepartmentsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching departments:', err);
        setDepartmentsLoading(false);
      });
  };

  // Fetch SMTP configurations from the REST API
  const fetchSmtpConfigs = () => {
    setSmtpLoading(true);
    fetch(`${API_URL}/api/smtp`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve SMTP configurations.');
        return res.json();
      })
      .then((data) => {
        setSmtpConfigs(data);
        setSmtpLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching SMTP configs:', err);
        setSmtpLoading(false);
      });
  };

  // Fetch static database tables on mount
  useEffect(() => {
    fetchDepartments();
    fetchSmtpConfigs();
    fetchClients();
    fetchCompanies();
    fetchCountries();
    fetchStates();
    fetchPlans();
  }, []);

  // Fetch user-dependent data when user loads or changes
  useEffect(() => {
    if (user) {
      fetchModules();
      fetchRoles();
      fetchUserPermissions();
      fetchEmployees();
    }
  }, [user]);

  // Fetch clients from the REST API

  const fetchPlans = () => {
    fetch(`${API_URL}/api/plans`)
      .then(res => res.json())
      .then(data => {
        setPlans(Array.isArray(data) ? data.filter(p => p.status === 1) : []);
      })
      .catch(err => {
        console.error('Error fetching plans:', err);
      });
  };

  const fetchCompanies = () => {
    setCompaniesLoading(true);
    fetch(API_URL + '/api/companies')
      .then(res => res.json())
      .then(data => {
        setCompanies(Array.isArray(data) ? data : []);
        setCompaniesLoading(false);
      })
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompaniesLoading(false);
      });
  };

  const fetchEmployees = () => {
    setEmployeesLoading(true);
    let url = `${API_URL}/api/employees`;
    if (user && String(user.roleId) !== '1' && user.clientid) {
      url += `?clientid=${user.clientid}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setEmployees(Array.isArray(data) ? data : []);
        setEmployeesLoading(false);
      })
      .catch(err => {
        console.error('Error fetching employees:', err);
        setEmployeesLoading(false);
      });
  };

  const handleSaveEmployee = () => {
    // Reset all field errors
    setEmpRoleError('');
    setEmpCompanyError('');
    setEmployeeFormError('');

    let hasError = false;
    if (!empFullName.trim() || !empEmail.trim()) {
      setEmployeeFormError('Full Name and Email are required.');
      hasError = true;
    }
    if (!empRoleIds || empRoleIds.length === 0) {
      setEmpRoleError('Please select at least one role.');
      hasError = true;
    }
    if (!empAssociatedCompanies || empAssociatedCompanies.length === 0) {
      setEmpCompanyError('Please select at least one company.');
      hasError = true;
    }
    if (hasError) return;

    setEmployeeFormSaving(true);
    // Use exactly what was selected in the form — no overrides
    const finalCompanies = empAssociatedCompanies;

    const payload = {
      full_name: empFullName.trim(),
      email: empEmail.trim(),
      phone: empPhone.trim(),
      roleid: empRoleIds.join(','),
      status: empStatus,
      clientid: user && user.clientid ? user.clientid : null,
      department_id: empDepartmentId,
      basecompany_id: empBaseCompanyId ? parseInt(empBaseCompanyId) : null,
      companies: finalCompanies,
      auto_generate_password: editingEmployee ? empAutoGeneratePassword : true
    };

    const method = editingEmployee ? 'PUT' : 'POST';
    const url = editingEmployee ? `${API_URL}/api/employees/${editingEmployee.id}` : `${API_URL}/api/employees`;

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to save employee.');
        }
        return res.json();
      })
      .then((data) => {
        showToast(editingEmployee ? 'Employee updated successfully!' : 'Employee created successfully!', 'success');
        if (data.tempPassword) {
          alert(`User created! Temporary Password: ${data.tempPassword}`);
        }
        setIsEmpRoleDropdownOpen(false);
                        setIsEmployeeModalOpen(false);
        fetchEmployees();
      })
      .catch(err => {
        setEmployeeFormError(err.message || 'Error connecting to server.');
      })
      .finally(() => {
        setEmployeeFormSaving(false);
      });
  };

  const handleSaveEmployeeCompanies = async () => {
    if (!selectedEmployeeForCompanies) return;
    setSavingEmpCompanies(true);
    try {
      const newCompList = [];
      if (selectedEmployeeForCompanies.basecompany_id) {
        newCompList.push(Number(selectedEmployeeForCompanies.basecompany_id));
      }

      const idsArray = Array.isArray(selectedNonBaseCompanyIds)
        ? selectedNonBaseCompanyIds
        : String(selectedNonBaseCompanyIds).split(',').map(s => s.trim()).filter(Boolean);

      idsArray.forEach(id => {
        if (id) newCompList.push(Number(id));
      });

      const finalCompList = [...new Set(newCompList)];

      const res = await fetch(`${API_URL}/api/employees/${selectedEmployeeForCompanies.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: finalCompList,
          basecompany_id: selectedEmployeeForCompanies.basecompany_id || null
        })
      });

      if (res.ok) {
        showToast('Companies updated successfully!', 'success');
        setIsViewEmpCompaniesModalOpen(false);
        fetchEmployees();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to update companies');
      }
    } catch (err) {
      console.error('Error saving employee companies:', err);
      alert('Error saving companies');
    } finally {
      setSavingEmpCompanies(false);
    }
  };

  const startViewEmployee = (emp) => {
    setIsViewOnlyEmployee(true);
    setEditingEmployee(emp);
    setEmpFullName(emp.full_name || '');
    setEmpEmail(emp.email || '');
    setEmpPhone(emp.phone || '');
    setEmpRoleId(emp.roleid || '');
    const parsedRoleIds = emp.roleid ? String(emp.roleid).split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean) : [];
    setEmpRoleIds(parsedRoleIds);
    setEmpStatus(emp.status !== undefined ? emp.status : 1);
    setEmpDepartmentId(emp.department_id || '');
    setEmpBaseCompanyId(emp.basecompany_id || '');
    setEmpAssociatedCompanies(emp.companies ? emp.companies.map(c => c.id) : []);
    setEmpAutoGeneratePassword(false);
    setEmployeeFormError('');
    setEmpCompanyDropdownOpen(false);
    setIsEmpRoleDropdownOpen(false);
    setIsEmployeeModalOpen(true);
  };

  const startEditEmployee = (emp) => {
    setIsViewOnlyEmployee(false);
    setEditingEmployee(emp);
    setEmpFullName(emp.full_name || '');
    setEmpEmail(emp.email || '');
    setEmpPhone(emp.phone || '');
    setEmpRoleId(emp.roleid || '');
    const parsedRoleIds = emp.roleid ? String(emp.roleid).split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean) : [];
    setEmpRoleIds(parsedRoleIds);
    setEmpStatus(emp.status !== undefined ? emp.status : 1);
    setEmpDepartmentId(emp.department_id || '');
    setEmpBaseCompanyId(emp.basecompany_id || '');
    // Always load the employee's saved companies when editing
    setEmpAssociatedCompanies(emp.companies ? emp.companies.map(c => c.id) : []);
    setEmpAutoGeneratePassword(false);
    setEmployeeFormError('');
    setEmpCompanyDropdownOpen(false);
    setIsEmpRoleDropdownOpen(false);
    setIsEmployeeModalOpen(true);
  };

  const handleDeleteEmployee = (id) => {
    fetch(`${API_URL}/api/employees/${id}`, { method: 'DELETE' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to delete employee.');
        return res.json();
      })
      .then(() => {
        showToast('Employee deleted successfully!', 'success');
        fetchEmployees();
      })
      .catch(err => {
        showToast(err.message, 'error');
      });
  };


  const fetchClients = () => {
    setClientsLoading(true);
    fetch(`${API_URL}/api/clients`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve clients.');
        return res.json();
      })
      .then((data) => {
        setClients(data);
        setClientsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching clients:', err);
        setClientsLoading(false);
      });
  };

  // Handle soft deleting a client
  const handleDeleteClient = (id) => {
    fetch(`${API_URL}/api/clients/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to soft-delete client.');
        }
        return res.json();
      })
      .then(() => {
        showToast('Client deleted successfully!', 'success');
        fetchClients();
      })
      .catch((err) => {
        console.error('Error deleting client:', err);
        showToast(err.message || 'Could not delete client. Please check server connection.', 'error');
        fetchClients(); // Sync stale state
      });
  };

  // Trigger editing context for client

  const startEditCompany = (item, isView = false) => {
    setIsCompanyViewOnly(!!isView);
    setEditingCompany(item);
    setCompanyNameInput(item.company_name || '');
    setCompanyShortCode(item.short_code || '');
    setCompanyTrafficFileNumber(item.traffic_file_number || '');
    setCompanyClientId(item.clientid ? String(item.clientid) : '');
    setCompanyIndustry(item.industry || '');
    setCompanyStatus(item.company_status || 'Active');

    setCompanyLegalForm(item.legal_form || '');
    setCompanyBusinessActivity(item.business_activity || '');
    setCompanyJurisdiction(item.jurisdiction || '');
    setCompanyLicensingAuthority(item.licensing_authority || '');
    setCompanyTradeLicenseNumber(item.trade_license_number || '');
    setCompanyTradeLicenseIssueDate(item.trade_license_issue_date ? item.trade_license_issue_date.split('T')[0] : '');
    setCompanyTradeLicenseExpiryDate(item.trade_license_expiry_date ? item.trade_license_expiry_date.split('T')[0] : '');
    setCompanyCountry(item.country || '');
    setCompanyEmirate(item.emirate || '');
    setCompanyRegisteredAddress(item.registered_address || '');
    setCompanyPoBox(item.po_box || '');
    setCompanyContactPerson(item.contact_person || '');
    setCompanyContactEmail(item.contact_email || '');
    setCompanyContactPhone(item.contact_phone || '');
    setCompanyWebsite(item.website || '');
    setCompanyVatRegistered(!!item.vat_registered);
    setCompanyTrn(item.trn || '');
    setCompanyCorporateTaxRegistrationNumber(item.corporate_tax_registration_number || '');
    setCompanyEstablishmentCardNumber(item.establishment_card_number || '');
    setCompanyEstablishmentCardExpiryDate(item.establishment_card_expiry_date ? item.establishment_card_expiry_date.split('T')[0] : '');
    setCompanyMohreNumber(item.mohre_number || '');
    setCompanyWpsRegistered(!!item.wps_registered);
    setCompanyNafisEmiratisationApplicable(!!item.nafis_emiratisation_applicable);
    setCompanyGpssaApplicable(!!item.gpssa_applicable);
    setCompanyAuthorizedSignatoryName(item.authorized_signatory_name || '');
    setCompanyAuthorizedSignatoryDesignation(item.authorized_signatory_designation || '');
    setCompanyDefaultBank(item.default_bank || '');
    setCompanyDefaultCurrency(item.default_currency || '');
    setCompanyAssetPrefix(item.asset_prefix || '');
    setCompanyVehiclePrefix(item.vehicle_prefix || '');
    setCompanyEmployeePrefix(item.employee_prefix || '');
    setCompanyTradeLicenseAlertDays(item.trade_license_alert_days ? String(item.trade_license_alert_days) : '30');
    setCompanyEstablishmentCardAlertDays(item.establishment_card_alert_days ? String(item.establishment_card_alert_days) : '30');
    setCompanyInsuranceAlertDays(item.insurance_alert_days ? String(item.insurance_alert_days) : '30');
    setCompanyPlanId(item.plan_id ? String(item.plan_id) : '');
    setCompanyPartyId(item.party_id || '');
    if (item.trade_license_attachment_path) {
      const fileName = item.trade_license_attachment_path.split('/').pop();
      setCompanyTradeLicenseFile({ name: fileName, isExisting: true });
    } else {
      setCompanyTradeLicenseFile(null);
    }
    if (item.company_logo_path) {
      const logoFileName = item.company_logo_path.split('/').pop();
      setCompanyLogoFile({ name: logoFileName, isExisting: true });
    } else {
      setCompanyLogoFile(null);
    }
    setCompanyWizardStep(1);

    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async () => {
    if (!companyNameInput.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }

    let attachmentBase64 = null;
    let attachmentName = null;
    if (companyTradeLicenseFile && !companyTradeLicenseFile.isExisting) {
      try {
        attachmentName = companyTradeLicenseFile.name;
        attachmentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(companyTradeLicenseFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }

    let logoBase64 = null;
    let logoName = null;
    if (companyLogoFile && !companyLogoFile.isExisting) {
      try {
        logoName = companyLogoFile.name;
        logoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(companyLogoFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      } catch (err) {
        console.error("Error reading logo file:", err);
      }
    }

    const payload = {
      company_name: companyNameInput,
      short_code: companyShortCode,
      traffic_file_number: companyTrafficFileNumber,
      clientid: companyClientId ? parseInt(companyClientId) : (user?.clientid ? parseInt(user.clientid) : null),
      industry: companyIndustry,
      company_status: companyStatus,

      legal_form: companyLegalForm,
      business_activity: companyBusinessActivity,
      jurisdiction: companyJurisdiction,
      licensing_authority: companyLicensingAuthority,
      trade_license_number: companyTradeLicenseNumber,
      trade_license_issue_date: companyTradeLicenseIssueDate || null,
      trade_license_expiry_date: companyTradeLicenseExpiryDate || null,
      country: companyCountry,
      emirate: companyEmirate,
      registered_address: companyRegisteredAddress,
      po_box: companyPoBox,
      contact_person: companyContactPerson,
      contact_email: companyContactEmail,
      contact_phone: companyContactPhone,
      website: companyWebsite,
      vat_registered: companyVatRegistered,
      trn: companyTrn,
      corporate_tax_registration_number: companyCorporateTaxRegistrationNumber,
      establishment_card_number: companyEstablishmentCardNumber,
      establishment_card_expiry_date: companyEstablishmentCardExpiryDate || null,
      mohre_number: companyMohreNumber,
      wps_registered: companyWpsRegistered,
      nafis_emiratisation_applicable: companyNafisEmiratisationApplicable,
      gpssa_applicable: companyGpssaApplicable,
      authorized_signatory_name: companyAuthorizedSignatoryName,
      authorized_signatory_designation: companyAuthorizedSignatoryDesignation,
      default_bank: companyDefaultBank,
      default_currency: companyDefaultCurrency,
      asset_prefix: companyAssetPrefix,
      vehicle_prefix: companyVehiclePrefix,
      employee_prefix: companyEmployeePrefix,
      trade_license_alert_days: parseInt(companyTradeLicenseAlertDays) || 30,
      establishment_card_alert_days: parseInt(companyEstablishmentCardAlertDays) || 30,
      insurance_alert_days: parseInt(companyInsuranceAlertDays) || 30,
      plan_id: companyPlanId ? parseInt(companyPlanId, 10) : null,
      party_id: companyPartyId,

      trade_license_attachment_base64: attachmentBase64,
      trade_license_attachment_name: attachmentName,
      company_logo_attachment_base64: logoBase64,
      company_logo_attachment_name: logoName
    };
    const url = editingCompany ? API_URL + '/api/companies/' + editingCompany.id : API_URL + '/api/companies';
    const method = editingCompany ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save company');
        showToast('Company ' + (editingCompany ? 'updated' : 'added') + ' successfully', 'success');
        setIsCompanyModalOpen(false);
        fetchCompanies();
      })
      .catch(err => {
        console.error(err);
        showToast('Error saving company', 'error');
      });
  };

  const handleDeleteCompany = (id) => {
    fetch(API_URL + '/api/companies/' + id, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        showToast('Company deleted successfully', 'success');
        fetchCompanies();
      })
      .catch(err => showToast('Error deleting company', 'error'));
  };

  const startEditClient = (item) => {
    setEditingClient(item);
    setClientName(item.client_name || '');
    setCompanyName(item.companyname || '');
    setCompanyShortname(item.company_shortname || '');
    setIndustry(item.industry || '');
    setAddress(item.address || '');

    // Resolve country to ID if it's stored as name
    let resolvedCountryId = '';
    if (item.country) {
      if (/^\d+$/.test(String(item.country))) {
        resolvedCountryId = String(item.country);
      } else {
        const found = countries.find(
          c => c.name && c.name.trim().toLowerCase() === String(item.country).trim().toLowerCase()
        );
        if (found) resolvedCountryId = String(found.id);
      }
    }
    setCountry(resolvedCountryId);

    // Resolve state to ID if it's stored as name
    let resolvedStateId = '';
    if (item.state) {
      if (/^\d+$/.test(String(item.state))) {
        resolvedStateId = String(item.state);
      } else {
        const found = states.find(
          s => s.name && s.name.trim().toLowerCase() === String(item.state).trim().toLowerCase()
        );
        if (found) resolvedStateId = String(found.id);
      }
    }
    setStateName(resolvedStateId);

    setCity(item.city || '');
    setClientEmail(item.email || '');
    setTrnNo(item.trn_no ? item.trn_no.toString() : '');
    setContactNo(item.contact_no ? item.contact_no.toString() : '');
    setPhoneNo(item.phone_no ? item.phone_no.toString() : '');
    setWebsite(item.website || '');
    setTradeLicenseno(item.trade_licenseno || '');
    setMaxCompanies(item.max_companies ? item.max_companies.toString() : '');
    setMaxEmployess(item.max_employess ? item.max_employess.toString() : '');
    setMaxAsset(item.max_asset ? item.max_asset.toString() : '');
    setClientStatus(item.status !== undefined ? item.status : 1);
    setSelectedPlanId(item.plan_id ? String(item.plan_id) : '');
    setEnabledModule(item.enabled_module || '');
    setClientFormError('');
    setClientWizardStep(1);
    setIsAddClientModalOpen(true);
  };

  // Handle saving/creating/updating a client
  const handleSaveClient = () => {
    setClientFormError('');

    if (!clientName.trim()) {
      setClientFormError('Client name is required.');
      return;
    }

    setClientFormSaving(true);

    const payload = {
      client_name: clientName.trim(),
      companyname: companyName.trim() || null,
      company_shortname: companyShortname.trim() || null,
      industry: industry.trim() || null,
      address: address.trim() || null,
      country: country.trim() || null,
      state: stateName.trim() || null,
      city: city.trim() || null,
      email: clientEmail.trim() || null,
      trn_no: trnNo.trim() || null,
      contact_no: contactNo.trim() || null,
      phone_no: phoneNo.trim() || null,
      website: website.trim() || null,
      trade_licenseno: tradeLicenseno.trim() || null,
      max_companies: maxCompanies.trim() ? parseInt(maxCompanies.trim(), 10) : null,
      max_employess: maxEmployess.trim() ? parseInt(maxEmployess.trim(), 10) : null,
      max_asset: maxAsset.trim() ? parseInt(maxAsset.trim(), 10) : null,
      status: clientStatus,
      plan_id: selectedPlanId ? parseInt(selectedPlanId, 10) : null,
      enabled_module: enabledModule.trim() || null,
    };

    const url = editingClient
      ? `${API_URL}/api/clients/${editingClient.id}`
      : `${API_URL}/api/clients`;
    const method = editingClient ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save client.');
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingClient ? 'Client updated successfully!' : 'Client registered successfully!', 'success');
        setClientFormSaving(false);
        setIsAddClientModalOpen(false);
        setEditingClient(null);
        // Reset fields
        setClientName('');
        setCompanyName('');
        setCompanyShortname('');
        setIndustry('');
        setAddress('');
        setCountry('');
        setStateName('');
        setCity('');
        setClientEmail('');
        setTrnNo('');
        setContactNo('');
        setPhoneNo('');
        setWebsite('');
        setTradeLicenseno('');
        setMaxCompanies('');
        setMaxEmployess('');
        setMaxAsset('');
        setClientStatus(1);
        setSelectedPlanId('');
        setEnabledModule('');
        // Re-fetch clients
        fetchClients();
      })
      .catch((err) => {
        setClientFormSaving(false);
        setClientFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Fetch countries from the REST API
  const fetchCountries = () => {
    setCountriesLoading(true);
    fetch(`${API_URL}/api/countries`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve countries.');
        return res.json();
      })
      .then((data) => {
        setCountries(data);
        setCountriesLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching countries:', err);
        setCountriesLoading(false);
      });
  };

  // Handle deleting a country (soft delete in database)
  const handleDeleteCountry = (id) => {
    fetch(`${API_URL}/api/countries/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to delete country.');
        }
        return res.json();
      })
      .then(() => {
        showToast('Country deleted successfully!', 'success');
        fetchCountries();
      })
      .catch((err) => {
        console.error('Error deleting country:', err);
        showToast(err.message || 'Could not delete country. Please check server connection.', 'error');
        fetchCountries(); // Sync stale state
      });
  };

  // Handle restoring a soft-deleted country
  const handleRestoreCountry = (id) => {
    fetch(`${API_URL}/api/countries/${id}/restore`, {
      method: 'PUT',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to restore country.');
        return res.json();
      })
      .then(() => {
        showToast('Country restored successfully!', 'success');
        fetchCountries();
      })
      .catch((err) => {
        console.error('Error restoring country:', err);
        showToast('Could not restore country. Please check server connection.', 'error');
      });
  };

  // Trigger editing context for country
  const startEditCountry = (item) => {
    setEditingCountry(item);
    setNewCountryName(item.name || '');
    setCountryFormError('');
    setIsAddCountryModalOpen(true);
  };

  // Handle saving/creating/updating a country
  const handleSaveCountry = () => {
    setCountryFormError('');

    if (!newCountryName.trim()) {
      setCountryFormError('Country name is required.');
      return;
    }

    setCountryFormSaving(true);

    const payload = {
      name: newCountryName.trim(),
    };

    const url = editingCountry
      ? `${API_URL}/api/countries/${editingCountry.id}`
      : `${API_URL}/api/countries`;
    const method = editingCountry ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save country.');
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingCountry ? 'Country updated successfully!' : 'Country added successfully!', 'success');
        setCountryFormSaving(false);
        setIsAddCountryModalOpen(false);
        setEditingCountry(null);
        setNewCountryName('');
        // Re-fetch countries
        fetchCountries();
      })
      .catch((err) => {
        setCountryFormSaving(false);
        setCountryFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Fetch states from the REST API
  const fetchStates = () => {
    setStatesLoading(true);
    fetch(`${API_URL}/api/states`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve states.');
        return res.json();
      })
      .then((data) => {
        setStates(data);
        setStatesLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching states:', err);
        setStatesLoading(false);
      });
  };

  // Handle deleting a state
  const handleDeleteState = (id) => {
    fetch(`${API_URL}/api/states/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to delete state.');
        }
        return res.json();
      })
      .then(() => {
        showToast('State deleted successfully!', 'success');
        fetchStates();
      })
      .catch((err) => {
        console.error('Error deleting state:', err);
        showToast(err.message || 'Could not delete state. Please check server connection.', 'error');
        fetchStates(); // Sync stale state
      });
  };

  // Trigger editing context for state
  const startEditState = (item) => {
    setEditingState(item);
    setNewStateName(item.name || '');
    setNewStateCountryId(item.country_id ? item.country_id.toString() : '');
    setStateFormError('');
    setIsAddStateModalOpen(true);
  };

  // Handle saving/creating/updating a state
  const handleSaveState = () => {
    setStateFormError('');

    if (!newStateName.trim()) {
      setStateFormError('State name is required.');
      return;
    }

    if (!newStateCountryId) {
      setStateFormError('Associated country is required.');
      return;
    }

    setStateFormSaving(true);

    const payload = {
      name: newStateName.trim(),
      country_id: parseInt(newStateCountryId, 10),
    };

    const url = editingState
      ? `${API_URL}/api/states/${editingState.id}`
      : `${API_URL}/api/states`;
    const method = editingState ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save state.');
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingState ? 'State updated successfully!' : 'State added successfully!', 'success');
        setStateFormSaving(false);
        setIsAddStateModalOpen(false);
        setEditingState(null);
        setNewStateName('');
        setNewStateCountryId('');
        // Re-fetch states
        fetchStates();
      })
      .catch((err) => {
        setStateFormSaving(false);
        setStateFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Handle soft deleting a module
  const handleDeleteModule = (id) => {
    fetch(`${API_URL}/api/modules/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to soft-delete module.');
        }
        return res.json();
      })
      .then(() => {
        showToast('Module deleted successfully!', 'success');
        fetchModules();
      })
      .catch((err) => {
        console.error('Error deleting module:', err);
        showToast(err.message || 'Could not delete module. Please check server connection.', 'error');
        fetchModules(); // Sync stale state
      });
  };

  // Handle saving/creating a new module
  const handleSaveModule = () => {
    setFormError('');

    if (!newModuleName.trim()) {
      setFormError('Module name is required.');
      return;
    }

    setFormSaving(true);

    const payload = {
      module_name: newModuleName.trim(),
      parent_id: newParentId ? parseInt(newParentId, 10) : null,
      status: newStatus,
      route: newRoute.trim() || null,
    };

    const url = editingModule
      ? `${API_URL}/api/modules/${editingModule.id}`
      : `${API_URL}/api/modules`;
    const method = editingModule ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || `Failed to ${editingModule ? 'update' : 'create'} module.`);
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingModule ? 'Module updated successfully!' : 'Module created successfully!', 'success');
        setFormSaving(false);
        setIsAddModalOpen(false);
        // Reset fields
        setEditingModule(null);
        setNewModuleName('');
        setNewParentId('');
        setIsParentDropdownOpen(false);
        setNewStatus('active');
        setNewRoute('');
        // Re-fetch modules
        fetchModules();
      })
      .catch((err) => {
        setFormSaving(false);
        setFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Helper to open modules modal in Edit Mode
  const handleEditModuleClick = (item) => {
    setEditingModule(item);
    setNewModuleName(item.module_name);
    setNewParentId(item.parent_id ? String(item.parent_id) : '');
    setNewRoute(item.route || '');
    setNewStatus(item.status || 'active');
    setFormError('');
    setIsParentDropdownOpen(false);
    setIsAddModalOpen(true);
  };

  // Handle soft deleting a role
  const handleDeleteRole = (id) => {
    fetch(`${API_URL}/api/roles/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to soft-delete role.');
        }
        return res.json();
      })
      .then(() => {
        showToast('Role deleted successfully!', 'success');
        fetchRoles();
      })
      .catch((err) => {
        console.error('Error deleting role:', err);
        showToast(err.message || 'Could not delete role. Please check server connection.', 'error');
        fetchRoles(); // Sync stale state
      });
  };

  // Initialize empty default permissions for role creation
  const initializeDefaultRolePermissions = () => {
    const defaults = modules.map(m => ({
      module_id: m.id,
      module_name: m.module_name,
      parent_id: m.parent_id,
      permission_id: 0,
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
      all_record_view: false,
      full_control: false
    }));
    setRolePermissions(defaults);
  };

  // Trigger editing context for role
  const startEditRole = (item) => {
    setEditingRole(item);
    setNewRoleName(item.role);
    setNewRoleStatus(item.status);
    const clientIds = Array.isArray(item.companyids)
      ? item.companyids.map(String)
      : (Array.isArray(item.clientids) ? item.clientids.map(String) : (item.clientid ? [String(item.clientid)] : []));
    setNewRoleClientIds(clientIds);
    setIsCompanyDropdownOpen(false);
    setRoleFormError('');
    const firstCompId = clientIds.length > 0 ? clientIds[0] : '';
    setModalPermissionCompanyId(firstCompId || 'all');
    fetchRolePermissions(item.id, firstCompId);
    setIsAddRoleModalOpen(true);
  };

  // Handle saving/creating/updating a role
  const handleSaveRole = () => {
    setRoleFormError('');

    if (!newRoleName.trim()) {
      setRoleFormError('Role title is required.');
      return;
    }

    // Company selection is optional (empty array means Global / System Role)

    setRoleFormSaving(true);

    const payload = {
      role: newRoleName.trim(),
      status: newRoleStatus,
      companyids: newRoleClientIds.map(Number),
      clientids: newRoleClientIds.map(Number)
    };

    const url = editingRole
      ? `${API_URL}/api/roles/${editingRole.id}`
      : `${API_URL}/api/roles`;
    const method = editingRole ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save role.');
          }
          return data;
        });
      })
      .then((data) => {
        const savedRoleId = data.role.id;
        const allDrafts = {
          ...companyPermissionDrafts,
          [modalPermissionCompanyId || 'all']: rolePermissions
        };

        const savePromises = Object.entries(allDrafts).map(([compId, perms]) => {
          if (!perms || perms.length === 0) return Promise.resolve();

          const targetCompIds = (compId && compId !== 'all')
            ? [Number(compId)]
            : (newRoleClientIds.length > 0 ? [Number(newRoleClientIds[0])] : [null]);

          return fetch(`${API_URL}/api/roles/${savedRoleId}/permissions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              permissions: perms,
              company_ids: targetCompIds
            }),
          }).then(pRes => {
            if (!pRes.ok) throw new Error('Failed to save role permissions.');
            return pRes.json();
          });
        });

        return Promise.all(savePromises).then(() => data);
      })
      .then(() => {
        showToast(editingRole ? 'Role updated successfully!' : 'Role created successfully!', 'success');
        setRoleFormSaving(false);
        setIsAddRoleModalOpen(false);
        setEditingRole(null);
        // Reset fields
        setNewRoleName('');
        setNewRoleStatus(1);
        setNewRoleClientIds([]);
        setIsCompanyDropdownOpen(false);
        setRolePermissions([]);
        // Re-fetch roles and sync user permissions in real-time
        fetchRoles();
        fetchUserPermissions();
      })
      .catch((err) => {
        setRoleFormSaving(false);
        setRoleFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Handle soft deleting a department
  const handleDeleteDepartment = (id) => {
    fetch(`${API_URL}/api/departments/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to soft-delete department.');
        }
        return res.json();
      })
      .then(() => {
        showToast('Department deleted successfully!', 'success');
        fetchDepartments();
      })
      .catch((err) => {
        console.error('Error deleting department:', err);
        showToast(err.message || 'Could not delete department. Please check server connection.', 'error');
        fetchDepartments(); // Sync stale state
      });
  };

  // Trigger editing context for department
  const startEditDepartment = (item) => {
    setEditingDepartment(item);
    setNewDeptName(item.department_name);
    setNewDeptStatus(item.status);
    setDeptFormError('');
    setIsAddDepartmentModalOpen(true);
  };

  // Handle saving/creating/updating a department
  const handleSaveDepartment = () => {
    setDeptFormError('');

    if (!newDeptName.trim()) {
      setDeptFormError('Department name is required.');
      return;
    }

    setDeptFormSaving(true);

    const payload = {
      department_name: newDeptName.trim(),
      status: newDeptStatus,
    };

    const url = editingDepartment
      ? `${API_URL}/api/departments/${editingDepartment.id}`
      : `${API_URL}/api/departments`;
    const method = editingDepartment ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save department.');
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingDepartment ? 'Department updated successfully!' : 'Department created successfully!', 'success');
        setDeptFormSaving(false);
        setIsAddDepartmentModalOpen(false);
        setEditingDepartment(null);
        // Reset fields
        setNewDeptName('');
        setNewDeptStatus(1);
        // Re-fetch departments
        fetchDepartments();
      })
      .catch((err) => {
        setDeptFormSaving(false);
        setDeptFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Handle soft deleting an SMTP config
  const handleDeleteSmtp = (id) => {
    fetch(`${API_URL}/api/smtp/${id}`, {
      method: 'DELETE',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to soft-delete SMTP configuration.');
        }
        return res.json();
      })
      .then(() => {
        showToast('SMTP Configuration deleted successfully!', 'success');
        fetchSmtpConfigs();
      })
      .catch((err) => {
        console.error('Error deleting SMTP config:', err);
        showToast(err.message || 'Could not delete configuration. Please check server connection.', 'error');
        fetchSmtpConfigs(); // Sync stale state
      });
  };

  // Trigger editing context for SMTP Configuration
  const startEditSmtp = (item) => {
    setEditingSmtp(item);
    setSmtpConfigName(item.stmpconfiguration_name || '');
    setSmtpStatus(item.status);
    setSmtpHost(item.smtp_host || '');
    setSmtpPort(item.smtp_port ? String(item.smtp_port) : '');
    setSmtpUsername(item.smtp_usename || '');
    setSmtpPassword(item.smtp_password || '');
    setSmtpFromEmail(item.from_email || '');
    setSmtpFromName(item.from_name || '');
    setSmtpReplyTo(item.reply_to_adress || '');
    setSmtpSecurity(item.security_protocol || 'STARTTLS');
    setSmtpUserId(item.userid ? String(item.userid) : '');
    setSmtpFormError('');
    setIsAddSmtpModalOpen(true);
  };

  // Handle saving/creating/updating an SMTP configuration
  const handleSaveSmtp = () => {
    setSmtpFormError('');

    if (!smtpConfigName.trim()) {
      setSmtpFormError('Configuration name is required.');
      return;
    }

    setSmtpSaving(true);

    const payload = {
      stmpconfiguration_name: smtpConfigName.trim(),
      status: smtpStatus,
      smtp_host: smtpHost.trim() || null,
      smtp_port: smtpPort ? parseInt(smtpPort, 10) : null,
      smtp_usename: smtpUsername.trim() || null,
      smtp_password: smtpPassword.trim() || null,
      from_email: smtpFromEmail.trim() || null,
      from_name: smtpFromName.trim() || null,
      reply_to_adress: smtpReplyTo.trim() || null,
      security_protocol: smtpSecurity,
      userid: editingSmtp?.userid ? parseInt(editingSmtp.userid, 10) : (user?.id ? parseInt(user.id, 10) : null),
    };

    const url = editingSmtp
      ? `${API_URL}/api/smtp/${editingSmtp.id}`
      : `${API_URL}/api/smtp`;
    const method = editingSmtp ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        return res.json().then((data) => {
          if (!res.ok) {
            throw new Error(data.message || 'Failed to save SMTP config.');
          }
          return data;
        });
      })
      .then(() => {
        showToast(editingSmtp ? 'SMTP Configuration updated successfully!' : 'SMTP Configuration created successfully!', 'success');
        setSmtpSaving(false);
        setIsAddSmtpModalOpen(false);
        setEditingSmtp(null);
        // Reset fields
        setSmtpConfigName('');
        setSmtpStatus(1);
        setSmtpHost('');
        setSmtpPort('');
        setSmtpUsername('');
        setSmtpPassword('');
        setSmtpFromEmail('');
        setSmtpFromName('');
        setSmtpReplyTo('');
        setSmtpSecurity('STARTTLS');
        setSmtpUserId('');
        // Re-fetch list
        fetchSmtpConfigs();
      })
      .catch((err) => {
        setSmtpSaving(false);
        setSmtpFormError(err.message || 'Server connection error.');
        showToast(err.message || 'Server connection error.', 'error');
      });
  };

  // Mock shipments data (with DATE removed as requested)
  const trackingItems = [
    { id: '#TRK-4982', dest: 'Chicago, IL', status: 'In Transit', ETA: '2h 15m', driver: 'Marcus Vance' },
    { id: '#TRK-2871', dest: 'Los Angeles, CA', status: 'Sorting', ETA: '1d', driver: 'Sarah Connor' },
    { id: '#TRK-9013', dest: 'New York, NY', status: 'Out for Delivery', ETA: '30m', driver: 'John Doe' },
    { id: '#TRK-3345', dest: 'Miami, FL', status: 'In Transit', ETA: '4h', driver: 'Jane Miller' },
    { id: '#TRK-7861', dest: 'Houston, TX', status: 'Sorting', ETA: '2d', driver: 'Bob Vance' },
  ];

  // Helper for tracking badges
  const getStatusStyle = (status) => {
    switch (status) {
      case 'In Transit':
        return { bg: '#EBF4F0', text: COLORS.primary };
      case 'Sorting':
        return { bg: '#FFF8E1', text: '#F57F17' };
      case 'Out for Delivery':
        return { bg: '#E3F2FD', text: '#1565C0' };
      default:
        return { bg: '#E2E8F0', text: COLORS.textSecondary };
    }
  };

  // Dynamic Route Tab Decider mapping database route to our layout state
  const getTabIdByRoute = (name, route) => {
    let r = route ? route.toLowerCase().trim() : '';
    let n = name ? name.toLowerCase().trim() : '';
    if (n.includes('licensing') || n.includes('license_auth') || r.includes('company-license') || r.includes('licensing-authority')) return 'company_license_auth';
    if ((n.includes('system') || n.includes('sytem')) && n.includes('setting') || r.includes('system-setting') || n === 'system_settings') return 'system_settings';
    if (n.includes('company') && n.includes('legal') || n.includes('legal_form') || r.includes('company-legal') || r.includes('legal-form')) return 'company_legal_form';
    if (n.includes('currency') || n.includes('def_currency') || r.includes('company-currency') || r.includes('def-currency')) return 'company_def_currency';
    if (n === 'tele doument type' || n === 'tele document type' || n === 'tele_doc_type' || r === '/tele-doc-types' || r === '/tele-doc-type') return 'tele_doc_type';
    if (n === 'tele charge type' || n === 'telecom charge type' || n === 'tele_charge_type') return 'tele_charge_type';
    if (n === 'tele category' || n === 'telecom category' || n === 'tele_category') return 'tele_category';
    if (n === 'telecom document' || n === 'tele document' || n === 'telecom_document') return 'telecom_document';
    if (r === '/dashboard' || n.includes('dashboard')) return 'dashboard';
    if (r === '/shipments' || n.includes('shipment')) return 'shipments';
    if (r === '/analytics' || n.includes('analytic')) return 'analytics';
    if (r === '/settings' || r === '/modules' || n === 'settings' || n === 'modules') return 'settings';
    if (r === '/plans' || n === 'plans' || n === 'plan') return 'plans';
    if (r === '/role' || r === '/roles' || n === 'role' || n === 'roles') return 'roles';
    if (r === '/department' || r === '/departments' || n === 'department' || n === 'departments') return 'departments';
    if (r === '/smtp' || n === 'smtp') return 'smtp';
    if (r === '/client' || r === '/clients' || n === 'client' || n === 'clients') return 'client';
    if (r === '/country' || r === '/countries' || n === 'country' || n === 'countries') return 'country';
    if (r === '/state' || r === '/states' || n === 'state' || n === 'states') return 'state';
    if (r === '/permissions' || r === '/permission' || n === 'role permissions' || n === 'permissions') return 'permissions';
    if (r === '/company' || r === '/companies' || n === 'company' || n === 'companies') return 'company';
    if (r === '/employee' || r === '/employees' || n === 'employee' || n === 'employees') return 'employees';
    if (r.includes('custom') && r.includes('field') || n.includes('custom') && n.includes('field')) return 'custom_fields';
    if (r.includes('field') && r.includes('permission') || n.includes('field') && n.includes('permission')) return 'field_permissions';
    if (r.includes('feild') && r.includes('permision') || n.includes('feild') && n.includes('permision')) return 'field_permissions';
    if (r.includes('vehicle') && r.includes('insurance') || n.includes('vehicle') && n.includes('insurance')) return 'vehicle_insurance';
    if (r.includes('vehicle') && r.includes('detail') || n.includes('vehicle') && n.includes('detail')) return 'vehicle_details';
    if (r.includes('vehicle') && r.includes('purchase') || n.includes('vehicle') && n.includes('purchase') || r.includes('vehile') && r.includes('purchase') || n.includes('vehile') && n.includes('purchase')) return 'vehicle_purchase';
    if ((r.includes('toll') || n.includes('toll')) && (r.includes('report') || n.includes('report'))) return 'vehicle_toll_report';
    if ((r.includes('toll') || n.includes('toll')) && (r.includes('transaction') || n.includes('transaction'))) return 'toll_transactions';
    if (r.includes('transaction') || n.includes('transaction')) return 'toll_transactions';
    if ((r.includes('toll') || n.includes('toll')) && (r.includes('overview') || n.includes('overview'))) return 'vehicle_toll_overview';
    if (r.includes('vehicle') && r.includes('toll') || n.includes('vehicle') && n.includes('toll') || r.includes('vehile') && r.includes('toll') || n.includes('vehile') && n.includes('toll')) return 'vehicle_toll';
    if (r.includes('primise') && r.includes('detail') || n.includes('primise') && n.includes('detail') || r.includes('premise') && r.includes('detail') || n.includes('premise') && n.includes('detail')) return 'premises_details';
    if (r.includes('asset') && r.includes('detail') || n.includes('asset') && n.includes('detail')) return 'asset_details';
    if (r.includes('asset') && r.includes('category') || n.includes('asset') && n.includes('category')) return 'asset_category';
    if (r.includes('asset') && r.includes('brand') || n.includes('asset') && n.includes('brand')) return 'asset_brand';
    if (r.includes('asset') && r.includes('assignment') || n.includes('asset') && n.includes('assignment')) return 'asset_assignment';
    if (n === 'asset inventory' || n === 'asset stock report' || n === 'asset inventory report') return 'asset_inventory';
    if (r.includes('supplier') || n.includes('supplier')) return 'supplier_details';
    if ((r.includes('payment') && r.includes('method')) || (n.includes('payment') && n.includes('method'))) return 'payment_method';
    if ((r.includes('purchase') && r.includes('detail')) || (n.includes('purchase') && n.includes('detail'))) return 'purchase_details';
    if (r.includes('uom') || n.includes('uom')) return 'uom';
    if (r.includes('vat') || n.includes('vat')) return 'vat';
    if ((r.includes('premium') || n.includes('premium') || r.includes('extra') || n.includes('extra')) && (r.includes('type') || n.includes('type') || r.includes('chargetype') || n.includes('chargetype'))) return 'premium_extra_charge_type';
    if (r.includes('premium') || n.includes('premium') || r.includes('extra') || n.includes('extra')) return 'premium_extra_charges';
    if ((r.includes('tele') || n.includes('tele')) && (r.includes('charge') && r.includes('type') || n.includes('charge') && n.includes('type') || r.includes('chargetype') || n.includes('chargetype'))) return 'tele_charge_type';
    if ((r.includes('tele') || n.includes('tele')) && (r.includes('category') || n.includes('category'))) return 'tele_category';
    if (r.includes('bill') || n.includes('bill')) return 'telecom_bill';
    if (r.includes('data') || n.includes('data')) return 'telecom_data';
    if ((r.includes('tele') || n.includes('tele') || r.includes('sim') || n.includes('sim')) && (r.includes('detail') || n.includes('detail'))) return 'sim_details';
    if (r.includes('usage') || n.includes('usage') || r.includes('charge') || n.includes('charge')) return 'usage_charges';
    if ((r.includes('type') || n.includes('type')) && (r.includes('doc') || n.includes('doc') || r.includes('doument') || n.includes('document'))) return 'tele_doc_type';
    if (r.includes('doc') || n.includes('doc') || r.includes('document') || n.includes('document')) return 'telecom_document';
    if (r.includes('telecom') || n.includes('telecom') || r.includes('telecome') || n.includes('telecome')) return 'telecom_provider';
    if (r.includes('sim') || n.includes('sim')) return 'sim_plan';
    return null; // unknown route — don't switch tab
  };

  // Dynamic Icon selector based on module name or route parameters
  const getModuleIcon = (name, route) => {
    const n = (name || '').toLowerCase();
    const r = (route || '').toLowerCase();
    if (n.includes('insurance') || r.includes('insurance')) return 'document-text-outline';
    if (n.includes('purchase') || r.includes('purchase')) return 'cart-outline';
    if (n.includes('toll') || r.includes('toll')) return 'receipt-outline';
    if (n.includes('vehicle') || r.includes('vehicle')) return 'car-outline';
    if (n.includes('supplier') || r.includes('supplier')) return 'diamond-outline';
    if (n.includes('dashboard') || r.includes('dashboard')) return 'grid-outline';
    if (n.includes('shipment') || r.includes('shipment')) return 'cube-outline';
    if (n.includes('analytic') || r.includes('analytic')) return 'bar-chart-outline';
    if (n.includes('setting') || n.includes('module') || r.includes('settings') || r.includes('modules')) return 'settings-outline';
    if (n.includes('role') || r.includes('role')) return 'people-outline';
    if (n.includes('dept') || n.includes('department') || r.includes('dept') || r.includes('department')) return 'business-outline';
    if (n.includes('smtp') || r.includes('smtp')) return 'mail-outline';
    if (n.includes('client') || r.includes('client')) return 'briefcase-outline';
    if (n.includes('country') || r.includes('country')) return 'earth-outline';
    if (n.includes('state') || r.includes('state')) return 'map-outline';
    if (n.includes('permission') || r.includes('permission')) return 'shield-checkmark-outline';
    if (n.includes('employee') || r.includes('employee')) return 'people-outline';
    if (n.includes('custom') && n.includes('field') || r.includes('custom') && r.includes('field')) return 'list-outline';
    if (n.includes('field') && n.includes('permission') || r.includes('field') && r.includes('permission')) return 'lock-closed-outline';
    if (n.includes('feild') && n.includes('permision') || r.includes('feild') && r.includes('permision')) return 'lock-closed-outline';
    if (n.includes('primise') || n.includes('premise') || r.includes('primise') || r.includes('premise')) return 'business-outline';
    if (n.includes('report') || r.includes('report')) return 'document-text-outline';
    if (n.includes('asset') || r.includes('asset')) return 'wallet-outline';
    if (n.includes('uom') || r.includes('uom')) return 'options-outline';
    if (n.includes('currency') || r.includes('currency')) return 'cash-outline';
    if (n.includes('vat') || r.includes('vat')) return 'calculator-outline';
    return 'document-text-outline';
  };

  // Verifies if a given module matches our active view tab for sidebar selection
  const isModuleActive = (mod) => {
    if (!mod || activeModuleId === null || activeModuleId === undefined) return false;
    const modId = mod.id?.toString().startsWith('virtual-parent-')
      ? mod.id.toString().replace('virtual-parent-', '')
      : mod.id;
    return String(activeModuleId) === String(modId);
  };

  // Sync activeModuleId when modules load or activeTab changes if activeModuleId is not set
  useEffect(() => {
    if (modules && modules.length > 0) {
      const matched = modules.find(m => getTabIdByRoute(m.module_name, m.route) === activeTab);
      if (matched) {
        setActiveModuleId(matched.id);
      }
    }
  }, [modules, activeTab]);

  // Helper to check view permissions for a given module ID
  const hasViewPermission = (moduleId) => {
    if (!user) return false;
    // Superadmin bypass
    if (String(user.roleId) === '1') return true;

    const userCompanyIds = (user?.associatedCompanyIds && user.associatedCompanyIds.length > 0)
      ? user.associatedCompanyIds.map(String)
      : (user?.companyid ? [String(user.companyid)] : []);

    // 1. Check company-specific permissions across assigned companies if present
    if (userCompanyPermissions && userCompanyPermissions.length > 0 && userCompanyIds.length > 0) {
      const compPerms = userCompanyPermissions.filter(
        p => p.module_id === moduleId && userCompanyIds.includes(String(p.company_id))
      );
      if (compPerms.length > 0) {
        return compPerms.some(p => p.can_view || p.full_control);
      }
    }

    // 2. Rely on Role-based userPermissions (global/default permissions where company_id is null)
    const perm = userPermissions.find(p => p.module_id === moduleId);
    return perm ? (perm.can_view || perm.full_control) : true;
  };

  // Helper to check if user has access to a specific tab
  const hasTabPermission = (tabId) => {
    if (!user) return false;
    if (tabId === 'plans') {
      return String(user.roleId) === '1';
    }
    if (tabId === 'dashboard' || tabId === 'profile' || tabId === 'shipments' || tabId === 'analytics' || tabId === 'tele_doc_type') {
      return true;
    }
    const tabModules = modules.filter(m => getTabIdByRoute(m.module_name, m.route) === tabId);
    if (tabModules.length === 0) return true;
    return tabModules.some(m => hasViewPermission(m.id));
  };

  // Render Sidebar Menu Links
  const renderSidebarContent = () => {
    const isSidebarLoading = userPermissionsLoading || modulesLoading;

    // Filter modules array based on view permission, showing parent if any child is allowed.
    const visibleModules = isSidebarLoading
      ? []
      : modules.filter(m => {
        // Only Super Admin (roleId === 1) can view the Plans menu
        if (m.route === '/plans' || m.module_name === 'Plans') {
          return user && String(user.roleId) === '1';
        }
        if (hasViewPermission(m.id)) return true;
        // If it's a parent module, show it if any of its children are visible
        const hasVisibleChildren = modules.some(child => {
          if (child.route === '/plans' || child.module_name === 'Plans') {
            return child.parent_id === m.id && user && String(user.roleId) === '1';
          }
          return child.parent_id === m.id && hasViewPermission(child.id);
        });
        return hasVisibleChildren;
      });

    // Group active modules into parents and children (with self-healing fallback for orphan children)
    const effectiveModules = visibleModules;
    const activeModuleIds = new Set(effectiveModules.map(m => m.id));
    const parentModules = effectiveModules.filter(m => m.parent_id === null || m.parent_id === undefined || !activeModuleIds.has(m.parent_id));

    return (
      <ScrollView contentContainerStyle={[styles.sidebarInner, isSidebarCollapsed && { paddingHorizontal: 6 }]} showsVerticalScrollIndicator={false}>

        <View style={{ width: '100%', zIndex: 1 }}>
          {/* Brand Header */}
          <View style={[styles.sidebarLogoContainer, isSidebarCollapsed && { paddingHorizontal: 0, justifyContent: 'center' }]}>
            {!isSidebarCollapsed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.brandLogoBox}>
                    <View style={styles.brandLogoInnerSquare} />
                  </View>
                  <View>
                    <Text style={styles.sidebarBrandName}>Trakio</Text>
                    <Text style={styles.sidebarBrandSubtitle}>PORTAL</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setIsSidebarCollapsed(true)}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsSidebarCollapsed(false)}
                style={{ padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Menu Navigation - Dynamic from PostgreSQL table */}
          {isSidebarLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.white} />
            </View>
          ) : parentModules.length > 0 ? (
            <View style={[styles.sidebarMenuItems, isSidebarCollapsed && { paddingHorizontal: 0, gap: 10, alignItems: 'center' }]}>
              {parentModules.map((parent) => {
                const getDescendants = (parentId) => {
                  const direct = effectiveModules.filter(m => m.parent_id === parentId);
                  let all = [...direct];
                  direct.forEach(child => {
                    all.push(...getDescendants(child.id));
                  });
                  return all;
                };
                const children = getDescendants(parent.id);
                const hasChildren = children.length > 0;
                const isParentGroupActive = isModuleActive(parent) || children.some(c => isModuleActive(c));
                const isParentActive = !hasChildren && isModuleActive(parent);

                // Add parent as the first virtual sub-menu item so it is always accessible and clickable
                const virtualChildren = [];
                if (hasChildren) {
                  if (hasViewPermission(parent.id) && parent.route) {
                    virtualChildren.push({
                      id: `virtual-parent-${parent.id}`,
                      module_name: parent.module_name === 'Settings' ? 'Settings' : parent.module_name,
                      route: parent.route
                    });
                  }
                  virtualChildren.push(...children);
                }

                if (isSidebarCollapsed) {
                  const isCollapsedActive = isParentActive || isParentGroupActive;
                  return (
                    <TouchableOpacity
                      key={parent.id}
                      style={[
                        styles.sidebarMenuItemCollapsed,
                        isCollapsedActive && styles.sidebarMenuItemActive,
                      ]}
                      onPress={() => {
                        if (!hasChildren) {
                          setActiveModuleId(parent.id);
                          const tabId = getTabIdByRoute(parent.module_name, parent.route);
                          if (tabId) setActiveTab(tabId);
                        }
                      }}
                      onMouseEnter={() => setHoveredItemId(parent.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={getModuleIcon(parent.module_name, parent.route)}
                        size={22}
                        color={isCollapsedActive ? "#F9C62A" : "#FFFFFF"}
                      />

                      {/* Floating overlay sub-menu when hovering settings */}
                      {hoveredItemId === parent.id && (
                        hasChildren ? (
                          <View style={styles.floatingSubmenu}>
                            <Text style={styles.floatingSubmenuTitle}>{parent.module_name}</Text>
                            <View style={styles.floatingDivider} />
                            {virtualChildren.map((child) => {
                              const isChildActive = isModuleActive(child);
                              return (
                                <TouchableOpacity
                                  key={child.id}
                                  style={[
                                    styles.floatingSubmenuItem,
                                    isChildActive && styles.floatingSubmenuItemActive,
                                  ]}
                                  onPress={() => {
                                    const modId = child.id?.toString().startsWith('virtual-parent-')
                                      ? child.id.toString().replace('virtual-parent-', '')
                                      : child.id;
                                    setActiveModuleId(modId);
                                    const tabId = getTabIdByRoute(child.module_name, child.route);
                                    if (tabId) setActiveTab(tabId);
                                    setHoveredItemId(null);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.floatingSubmenuText,
                                      isChildActive && styles.floatingSubmenuTextActive,
                                    ]}
                                  >
                                    {child.module_name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <View style={styles.tooltip}>
                            <Text style={styles.tooltipText}>{parent.module_name}</Text>
                          </View>
                        )
                      )}
                    </TouchableOpacity>
                  );
                }

                // Expanded mode parent and children list
                const isExpanded = expandedParentIds[parent.id] !== undefined
                  ? expandedParentIds[parent.id]
                  : isParentGroupActive;

                return (
                  <View key={parent.id} style={styles.sidebarMenuSection}>
                    {/* Top-Level Parent Link */}
                    <TouchableOpacity
                      style={[
                        styles.sidebarMenuItem,
                        isParentActive && styles.sidebarMenuItemActive,
                      ]}
                      onPress={() => {
                        if (hasChildren) {
                          setExpandedParentIds(prev => ({
                            ...prev,
                            [parent.id]: !isExpanded
                          }));
                        } else {
                          setActiveModuleId(parent.id);
                          const targetTab = getTabIdByRoute(parent.module_name, parent.route);
                          if (targetTab) setActiveTab(targetTab);
                        }
                        setIsMobileSidebarOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={getModuleIcon(parent.module_name, parent.route)}
                        size={22}
                        color={(isParentActive || isParentGroupActive) ? "#F9C62A" : "#FFFFFF"}
                      />
                      <Text
                        style={[
                          styles.sidebarMenuText,
                          (isParentActive || isParentGroupActive) && styles.sidebarMenuTextActive,
                        ]}
                      >
                        {parent.module_name}
                      </Text>

                      {hasChildren ? (
                        <Ionicons
                          name={isExpanded ? "chevron-down" : "chevron-forward"}
                          size={16}
                          color={(isParentActive || isParentGroupActive) ? "#F9C62A" : "rgba(255, 255, 255, 0.7)"}
                          style={{ marginLeft: 'auto' }}
                        />
                      ) : isParentActive ? (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#F9C62A"
                          style={{ marginLeft: 'auto' }}
                        />
                      ) : null}
                    </TouchableOpacity>

                    {/* Sub-menu child items */}
                    {hasChildren && isExpanded && (
                      <View style={styles.sidebarSubMenuContainer}>
                        {virtualChildren.map((child) => {
                          const isChildActive = isModuleActive(child);
                          const isVirtualParent = child.id.toString().startsWith('virtual-parent-');
                          return (
                            <TouchableOpacity
                              key={child.id}
                              style={[
                                styles.sidebarSubMenuItem,
                                isChildActive && styles.sidebarSubMenuItemActive,
                              ]}
                              onPress={() => {
                                const modId = child.id?.toString().startsWith('virtual-parent-')
                                  ? child.id.toString().replace('virtual-parent-', '')
                                  : child.id;
                                setActiveModuleId(modId);
                                const targetTab = getTabIdByRoute(child.module_name, child.route);
                                if (targetTab) setActiveTab(targetTab);
                                setIsMobileSidebarOpen(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.treeDot, isChildActive && styles.treeDotActive]} />
                              <Ionicons
                                name={isVirtualParent ? getModuleIcon(parent.module_name, parent.route) : getModuleIcon(child.module_name, child.route)}
                                size={18}
                                color={isChildActive ? "#F9C62A" : "#FFFFFF"}
                                style={{ marginRight: 6 }}
                              />
                              <Text
                                style={[
                                  styles.sidebarSubMenuText,
                                  isChildActive && styles.sidebarSubMenuTextActive,
                                ]}
                              >
                                {child.module_name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Sidebar Footer User Details */}
        <View style={[styles.sidebarFooter, isSidebarCollapsed && { paddingHorizontal: 0, alignItems: 'center', borderTopWidth: 0 }]}>
          {!isSidebarCollapsed ? (
            <View style={styles.sidebarUserSection}>
              <View style={styles.sidebarUserCardRow}>
                <View style={styles.sidebarAvatar}>
                  <Text style={styles.sidebarAvatarText}>
                    {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'JS'}
                  </Text>
                </View>
                <View style={styles.sidebarUserInfo}>
                  <Text style={styles.sidebarUserName} numberOfLines={1}>{user.name || 'John Smith'}</Text>
                  <Text style={styles.sidebarUserRole} numberOfLines={1}>{user.roleName || user.email || 'Administrator'}</Text>
                </View>
              </View>
              <View style={styles.sidebarUserDivider} />
              <TouchableOpacity style={styles.sidebarSignOutBtn} onPress={onSignOut} activeOpacity={0.7}>
                <Ionicons name="exit-outline" size={18} color="#FFFFFF" />
                <Text style={styles.sidebarSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={styles.sidebarAvatar}
                onMouseEnter={() => setHoveredItemId('avatar')}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <Text style={styles.sidebarAvatarText}>
                  {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'JS'}
                </Text>
                {hoveredItemId === 'avatar' && (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{user.name || 'John Smith'}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sidebarSignOutCollapsed}
                onPress={onSignOut}
                onMouseEnter={() => setHoveredItemId('signout')}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <Ionicons name="exit-outline" size={20} color="#FFFFFF" />
                {hoveredItemId === 'signout' && (
                  <View style={[styles.tooltip, { bottom: 10 }]}>
                    <Text style={[styles.tooltipText, { color: '#FFFFFF' }]}>Sign Out</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // End of DashboardScreen component - Tele Document Type module active
  // Render Dashboard Tab Content
  const renderDashboardTab = () => {
    const stats = [
      {
        title: 'Active Deliveries',
        value: '14',
        icon: 'truck-delivery-outline',
        iconType: 'material',
        color: COLORS.primary,
        bgColor: '#EBF4F0',
      },
      {
        title: 'Pending Alerts',
        value: '3',
        icon: 'alert-decagram-outline',
        iconType: 'material',
        color: '#B7791F',
        bgColor: '#FEFCBF',
      },
      {
        title: 'Completed Today',
        value: '28',
        icon: 'checkmark-circle-outline',
        iconType: 'ionicons',
        color: COLORS.success,
        bgColor: '#E8F5E9',
      },
    ];

    return (
      <View style={styles.tabContent}>
        {/* Welcome Hero Banner */}
        <View style={[styles.welcomeCard, !isLargeScreen && { flexDirection: 'column-reverse', alignItems: 'flex-start', gap: 16 }]}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome back,</Text>
            <Text style={styles.userName}>{user.name || 'John Smith'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user.name ? user.name.split(' ').map(n => n[0]).join('') : 'JS'}
            </Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Overview Dashboard</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={[styles.statCard, { backgroundColor: COLORS.cardBg }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: stat.bgColor }]}>
                {stat.iconType === 'material' ? (
                  <MaterialCommunityIcons name="cube-outline" size={24} color={stat.color} />
                ) : (
                  <Ionicons name="stats-chart-outline" size={24} color={stat.color} />
                )}
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Active Shipments Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Shipments</Text>
            <TouchableOpacity onPress={() => setActiveTab('shipments')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableCard}>
            {trackingItems.slice(0, 3).map((item, idx) => {
              const statusStyle = getStatusStyle(item.status);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.tableRow,
                    idx === 2 && styles.lastTableRow,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.textSecondary} />
                    <View style={styles.rowInfo}>
                      <Text style={styles.itemId}>{item.id}</Text>
                      <Text style={styles.itemDest}>{item.dest}</Text>
                    </View>
                  </View>
                  <View style={styles.rowRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.etaText}>ETA: {item.ETA}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Operations Hub */}
        <Text style={styles.sectionTitle}>Quick Operations</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="search" size={22} color="#1E88E5" />
            </View>
            <Text style={styles.actionCardTitle}>Track Package</Text>
            <Text style={styles.actionCardDesc}>Verify exact GPS coordinates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="add-circle-outline" size={22} color="#43A047" />
            </View>
            <Text style={styles.actionCardTitle}>New Shipment</Text>
            <Text style={styles.actionCardDesc}>Create transit manifests</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Shipments Tab Content (with DATE fully removed)
  const renderShipmentsTab = () => {
    // Filter list
    const filteredItems = trackingItems.filter((item) => {
      if (shipmentFilter === 'All') return true;
      if (shipmentFilter === 'In Transit') return item.status === 'In Transit';
      if (shipmentFilter === 'Sorting') return item.status === 'Sorting';
      if (shipmentFilter === 'Delivering') return item.status === 'Out for Delivery';
      return true;
    });

    const segments = ['All', 'In Transit', 'Sorting', 'Delivering'];

    return (
      <View style={styles.tabContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#ECECFE',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="git-pull-request-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Logistics Shipments</Text>
            <Text style={styles.tabHeadingSubtitle}>Monitor all active transits, manifests, and logistics coordinates.</Text>
          </View>
        </View>

        {/* Filter Segments */}
        <View style={styles.filterSegments}>
          {segments.map((seg) => (
            <TouchableOpacity
              key={seg}
              style={[
                styles.filterSegmentBtn,
                shipmentFilter === seg && styles.filterSegmentBtnActive,
              ]}
              onPress={() => setShipmentFilter(seg)}
            >
              <Text
                style={[
                  styles.filterSegmentText,
                  shipmentFilter === seg && styles.filterSegmentTextActive,
                ]}
              >
                {seg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Input Mock */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Tracking ID, City, Driver..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Big Shipments List */}
        <View style={styles.tableCard}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const statusStyle = getStatusStyle(item.status);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.tableRowBig,
                    idx === filteredItems.length - 1 && styles.lastTableRow,
                  ]}
                >
                  <View style={styles.rowBigLeft}>
                    <View style={styles.packageIconBg}>
                      <MaterialCommunityIcons name="package-variant" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={styles.itemIdBig}>{item.id}</Text>
                      <Text style={styles.itemDestBig}>Destination: {item.dest}</Text>
                      <Text style={styles.itemDriver}>Driver: {item.driver}</Text>
                    </View>
                  </View>

                  <View style={styles.rowBigRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.etaTextBig}>ETA: {item.ETA}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No shipments found for "{shipmentFilter}" filter.</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render Analytics Tab Content
  const renderAnalyticsTab = () => {
    const kpis = [
      { label: 'Avg. Delivery Speed', value: '14.2 Hours', rate: '+8.4%', trend: 'up' },
      { label: 'On-Time Dispatch', value: '98.4%', rate: '+1.2%', trend: 'up' },
      { label: 'Fuel Savings', value: '$2,480.00', rate: '-2.1%', trend: 'down' },
    ];

    const volumeStats = [
      { label: 'Route Chicago - NY', progress: 0.85, value: '85%' },
      { label: 'Route Dallas - LA', progress: 0.60, value: '60%' },
      { label: 'Route Miami - Houston', progress: 0.40, value: '40%' },
    ];

    return (
      <View style={styles.tabContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#ECECFE',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="stats-chart-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Logistics Analytics</Text>
            <Text style={styles.tabHeadingSubtitle}>Real-time delivery performance grids and shipping efficiency stats.</Text>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.statsGrid}>
          {kpis.map((kpi, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <View
                  style={[
                    styles.trendBadge,
                    kpi.trend === 'up' ? styles.trendUp : styles.trendDown,
                  ]}
                >
                  <Text style={[styles.trendText, kpi.trend === 'up' ? styles.trendUpText : styles.trendDownText]}>
                    {kpi.rate}
                  </Text>
                </View>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Progress Indicators */}
        <Text style={styles.sectionTitle}>Route Capacity Volumes</Text>
        <View style={styles.tableCard}>
          {volumeStats.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.volumeRow,
                idx === volumeStats.length - 1 && styles.lastTableRow,
              ]}
            >
              <View style={styles.volumeHeader}>
                <Text style={styles.volumeLabel}>{item.label}</Text>
                <Text style={styles.volumeValue}>{item.value}</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.progress * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render Modules Tab Content (Shows ONLY the modules table and button)
  const renderSettingsTab = () => {
    const isClient = !!(user && user.clientid);
    let baseModules = modules;
    if (isClient) {
      const myClient = clients.find(c => Number(c.id) === Number(user.clientid));
      if (myClient && myClient.enabled_module) {
        try {
          const enabledIds = Array.isArray(myClient.enabled_module)
            ? myClient.enabled_module
            : JSON.parse(myClient.enabled_module);
          baseModules = modules.filter(m => enabledIds.includes(m.id.toString()) || enabledIds.includes(Number(m.id)));
        } catch (e) {
          console.error("Failed to parse enabled_module", e);
        }
      }
    }

    const filteredModules = baseModules.filter(m =>
      m.module_name.toLowerCase().includes(modulesSearch.toLowerCase()) ||
      (m.route && m.route.toLowerCase().includes(modulesSearch.toLowerCase()))
    );
    const displayPage = Math.min(modulesPage, Math.max(1, Math.ceil(filteredModules.length / ITEMS_PER_PAGE)));
    const paginatedModules = filteredModules.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* MODULES HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="layers-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>System Modules</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Manage workspace variable permissions, hierarchical relationships, and active routing coordinates.
              </Text>
            </View>
          </View>

          {!isClient && (
            <TouchableOpacity
              style={styles.addModuleBtn}
              onPress={() => {
                setEditingModule(null);
                setNewModuleName('');
                setNewParentId('');
                setNewRoute('');
                setNewStatus('active');
                setFormError('');
                setIsParentDropdownOpen(false);
                setIsAddModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.white} />
              <Text style={styles.addModuleBtnText}>Add Module</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SYSTEM MODULES MANAGER TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(modulesSearch, setModulesSearch, setModulesPage, 'Search modules by name or route...')}

          {modulesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL tables...</Text>
            </View>
          ) : filteredModules.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.2 }]}>Module Name</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Parent Module</Text>
                    <Text style={[styles.thCell, { flex: 1.2 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Route</Text>
                    {!isClient && (
                      <>
                        <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                        <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Delete</Text>
                      </>
                    )}
                  </View>

                  {/* Table Data Rows */}
                  {paginatedModules.map((mod, index) => {
                    const parentModule = mod.parent_id !== null
                      ? modules.find((m) => m.id === mod.parent_id)
                      : null;

                    return (
                      <View
                        key={mod.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedModules.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700' }]}>#{mod.id}</Text>
                        <Text style={[styles.tdCell, { flex: 2.2, color: COLORS.textPrimary }]}>{mod.module_name}</Text>
                        <Text style={[styles.tdCell, { flex: 2.0, fontWeight: '600', color: parentModule ? COLORS.primary : COLORS.textMuted }]}>
                          {parentModule ? `${parentModule.module_name} (#${mod.parent_id})` : '[None]'}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 1.2 }]}>
                          <View style={[styles.statusBadgeSmall, mod.status === 'active' ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                            <Text style={[styles.statusTextSmall, mod.status === 'active' ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                              {mod.status}
                            </Text>
                          </View>
                        </Text>
                        <Text style={[styles.tdCell, { flex: 2.0, color: COLORS.primary, fontSize: 12 }]}>{mod.route || '[null]'}</Text>

                        {!isClient && (
                          <>
                            {/* Edit trigger */}
                            <TouchableOpacity
                              style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                              onPress={() => handleEditModuleClick(mod)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                            </TouchableOpacity>

                            {/* Delete trigger */}
                            <TouchableOpacity
                              style={[styles.tdCell, { flex: 1.0, alignItems: 'center' }]}
                              onPress={() => confirmDelete(mod.id, 'module', mod.module_name)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredModules.length, modulesPage, setModulesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="layers-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{modules.length === 0 ? "No registered system modules found." : "No matching modules found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render Roles Tab Content (Dedicated Role Management Tab!)
  const renderRolesTab = () => {
    const filteredRoles = roles.filter(r =>
      r.role.toLowerCase().includes(rolesSearch.toLowerCase())
    );
    const displayPage = Math.min(rolesPage, Math.max(1, Math.ceil(filteredRoles.length / ITEMS_PER_PAGE)));
    const paginatedRoles = filteredRoles.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* ROLES HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Role Management</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Configure access control groups, permission clearances, and security privileges.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingRole(null);
              setNewRoleName('');
              setNewRoleStatus(1);
              const clientCompanyIds = user && String(user.roleId) !== '1'
                ? companies.filter(c => Number(c.clientid) === Number(user?.clientid)).map(c => String(c.id))
                : [];
              setNewRoleClientIds(clientCompanyIds);
              setIsCompanyDropdownOpen(false);
              setRoleFormError('');
              initializeDefaultRolePermissions();
              setIsAddRoleModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add Role</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM ROLES TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(rolesSearch, setRolesSearch, setRolesPage, 'Search roles by title...')}

          {rolesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL roles...</Text>
            </View>
          ) : filteredRoles.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 4.0 }]}>Role Title</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Delete</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedRoles.map((item, index) => {
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedRoles.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 4.0, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.role}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 2.0 }]}>
                          <View style={[styles.statusBadgeSmall, item.status === 1 ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                            <Text style={[styles.statusTextSmall, item.status === 1 ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                              {item.status === 1 ? 'active' : 'inactive'}
                            </Text>
                          </View>
                        </Text>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => startEditRole(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Delete trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => confirmDelete(item.id, 'role', item.role)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredRoles.length, rolesPage, setRolesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="people-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{roles.length === 0 ? "No registered security roles found." : "No matching roles found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render Departments Tab Content (Dedicated Department Management Tab!)
  const renderDepartmentsTab = () => {
    const filteredDepts = departments.filter(d =>
      d.department_name.toLowerCase().includes(deptsSearch.toLowerCase())
    );
    const displayPage = Math.min(deptsPage, Math.max(1, Math.ceil(filteredDepts.length / ITEMS_PER_PAGE)));
    const paginatedDepts = filteredDepts.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* DEPARTMENTS HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="business-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Department Management</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Configure organizational sectors, staff divisions, and active operations units.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingDepartment(null);
              setNewDeptName('');
              setNewDeptStatus(1);
              setDeptFormError('');
              setIsAddDepartmentModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add Department</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM DEPARTMENTS TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(deptsSearch, setDeptsSearch, setDeptsPage, 'Search departments by name...')}

          {departmentsLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL departments...</Text>
            </View>
          ) : filteredDepts.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 4.0 }]}>Department Name</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Delete</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedDepts.map((item, index) => {
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedDepts.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 4.0, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.department_name}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 2.0 }]}>
                          <View style={[styles.statusBadgeSmall, item.status === 1 ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                            <Text style={[styles.statusTextSmall, item.status === 1 ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                              {item.status === 1 ? 'active' : 'inactive'}
                            </Text>
                          </View>
                        </Text>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => startEditDepartment(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Delete trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => confirmDelete(item.id, 'department', item.department_name)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredDepts.length, deptsPage, setDeptsPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="business-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{departments.length === 0 ? "No registered departments found." : "No matching departments found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render SMTP Tab Content (Dedicated SMTP Configurations Management Page!)
  const renderSmtpTab = () => {
    let baseSmtp = smtpConfigs;
    if (user && user.clientid) {
      baseSmtp = smtpConfigs.filter(s => Number(s.userid) === Number(user.id));
    }

    const filteredSmtp = baseSmtp.filter(s =>
      s.stmpconfiguration_name.toLowerCase().includes(smtpSearch.toLowerCase()) ||
      (s.smtp_host && s.smtp_host.toLowerCase().includes(smtpSearch.toLowerCase()))
    );
    const displayPage = Math.min(smtpPage, Math.max(1, Math.ceil(filteredSmtp.length / ITEMS_PER_PAGE)));
    const paginatedSmtp = filteredSmtp.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* SMTP HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>SMTP Configurations</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Configure global email servers, routing protocols, sender identities, and security clearances.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingSmtp(null);
              setSmtpConfigName('');
              setSmtpStatus(1);
              setSmtpHost('');
              setSmtpPort('');
              setSmtpUsername('');
              setSmtpPassword('');
              setSmtpFromEmail('');
              setSmtpFromName('');
              setSmtpReplyTo('');
              setSmtpSecurity('STARTTLS');
              setSmtpUserId('');
              setSmtpFormError('');
              setIsAddSmtpModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add SMTP Config</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM SMTP TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(smtpSearch, setSmtpSearch, setSmtpPage, 'Search SMTP by name or host...')}

          {smtpLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL smtp_configuration...</Text>
            </View>
          ) : filteredSmtp.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.8 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Config Name</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>SMTP Host : Port</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>Sender Info (From)</Text>
                    <Text style={[styles.thCell, { flex: 1.2 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Delete</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedSmtp.map((item, index) => {
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedSmtp.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 0.8, fontWeight: '700' }]}>#{item.id}</Text>
                        <View style={[styles.tdCell, { flex: 2.0 }]}>
                          <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>
                            {item.stmpconfiguration_name}
                          </Text>
                          {item.userid ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                              User ID: {item.userid}
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' }}>
                              No User Assigned
                            </Text>
                          )}
                        </View>
                        <View style={[styles.tdCell, { flex: 2.5 }]}>
                          <Text style={{ fontWeight: '600', color: COLORS.primary }}>
                            {item.smtp_host || '[null]'}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                            Port: {item.smtp_port || '25'} | Security: {item.security_protocol || 'None'}
                          </Text>
                        </View>
                        <View style={[styles.tdCell, { flex: 2.5 }]}>
                          <Text style={{ color: COLORS.textPrimary, fontSize: 12 }}>
                            {item.from_email || '[null]'}
                          </Text>
                          {item.from_name ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                              Name: {item.from_name}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.tdCell, { flex: 1.2 }]}>
                          <View style={[styles.statusBadgeSmall, item.status === 1 ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                            <Text style={[styles.statusTextSmall, item.status === 1 ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                              {item.status === 1 ? 'active' : 'inactive'}
                            </Text>
                          </View>
                        </Text>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => startEditSmtp(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Delete trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => confirmDelete(item.id, 'smtp', item.stmpconfiguration_name)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredSmtp.length, smtpPage, setSmtpPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="mail-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{smtpConfigs.length === 0 ? "No SMTP configurations registered." : "No matching SMTP configs found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render Clients Tab Content (Dedicated Client Management Page!)

  const renderEmployeesTab = () => {
    const filtered = employees.filter(e => {
      let companyMatch = true;
      if (user && String(user.roleId) !== '1') {
        const matchesClient = user.clientid && Number(e.clientid) === Number(user.clientid);
        const matchesCompany = user.companyid && e.companies && e.companies.some(c => Number(c.id) === Number(user.companyid));
        if (user.clientid) {
          companyMatch = matchesClient || matchesCompany;
        } else if (user.companyid) {
          companyMatch = matchesCompany;
        }
      }

      const matchSearch = (e.full_name && e.full_name.toLowerCase().includes(employeesSearch.toLowerCase())) ||
        (e.email && e.email.toLowerCase().includes(employeesSearch.toLowerCase()));
      return matchSearch && companyMatch;
    });
    const displayPage = Math.min(employeesPage, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
    const paginated = filtered.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    const handleExcelEmployeeImport = (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonRows || jsonRows.length === 0) {
            showToast('No records found in the selected Excel file.', 'error');
            return;
          }

          const rawMappedRows = jsonRows.map(row => {
            // Match Role by ID or Title
            const rawRole = String(row['System Permissions Role'] || row['Role'] || row['role'] || row['Role ID'] || '').trim();
            const roleName = rawRole.toLowerCase();
            const matchedRoles = roles.filter(r => 
              String(r.id) === rawRole || (r.role || '').trim().toLowerCase() === roleName
            );
            const roleid = matchedRoles.length > 0 ? matchedRoles.map(r => r.id) : (rawRole && !isNaN(rawRole) ? [Number(rawRole)] : []);

            // Match Department by ID or Name
            const rawDept = String(row['Department'] || row['department'] || row['Department ID'] || '').trim();
            const deptName = rawDept.toLowerCase();
            const matchedDept = departments.find(d => 
              String(d.id) === rawDept || (d.department_name || '').trim().toLowerCase() === deptName
            );
            const department_id = matchedDept ? matchedDept.id : (rawDept && !isNaN(rawDept) ? Number(rawDept) : null);

            // Match Base Company by ID or Name
            const rawBaseComp = String(
              row['Base Company'] || row['Base Company Name'] || row['Company 1'] || row['Company'] || row['company'] || row['Base Company ID'] || ''
            ).trim();

            const baseCompLower = rawBaseComp.toLowerCase();
            const matchedBaseComp = companies.find(c => 
              String(c.id) === rawBaseComp || (c.company_name || '').trim().toLowerCase() === baseCompLower
            );
            const basecompany_id = matchedBaseComp ? matchedBaseComp.id : (!isNaN(rawBaseComp) && rawBaseComp !== '' ? Number(rawBaseComp) : null);

            // Match any additional company values if present
            const rawCompValues = [
              row['Company 2'],
              row['Company 3'],
              row['Companies'],
              row['Company (Comma-separated for multiple)']
            ].filter(val => val !== undefined && val !== null && String(val).trim() !== '');

            const matchedCompIds = basecompany_id ? [basecompany_id] : [];
            for (let item of rawCompValues) {
              const splitItems = String(item).split(',');
              for (let rawC of splitItems) {
                const cTrim = rawC.trim();
                if (!cTrim) continue;
                const cLower = cTrim.toLowerCase();
                const matchedC = companies.find(c => 
                  String(c.id) === cTrim || (c.company_name || '').trim().toLowerCase() === cLower
                );
                if (matchedC && !matchedCompIds.includes(matchedC.id)) {
                  matchedCompIds.push(matchedC.id);
                } else if (!isNaN(cTrim) && !matchedCompIds.includes(Number(cTrim))) {
                  matchedCompIds.push(Number(cTrim));
                }
              }
            }

            const rawStatus = String(row['Status'] || row['status'] || 'Active').trim().toLowerCase();
            const status = rawStatus === 'inactive' || rawStatus === '0' || rawStatus === 'false' ? 0 : 1;

            return {
              full_name: row['Full Name'] || row['Name'] || row['name'] || '',
              email: row['Email'] || row['email'] || '',
              phone: String(row['Phone'] || row['phone'] || ''),
              roleid: roleid,
              department_id: department_id,
              basecompany_id: basecompany_id,
              companies: matchedCompIds,
              status: status,
              clientid: user?.clientid || 16
            };
          }).filter(emp => emp.full_name && emp.email);

          if (rawMappedRows.length === 0) {
            showToast('No valid employee rows found. Rows must contain "Full Name" and "Email".', 'error');
            return;
          }

          // Group and Merge row entries by Email if needed
          const employeeMap = new Map();
          for (const emp of rawMappedRows) {
            const emailKey = emp.email.trim().toLowerCase();
            if (!employeeMap.has(emailKey)) {
              employeeMap.set(emailKey, { ...emp, companies: [...emp.companies] });
            } else {
              const existing = employeeMap.get(emailKey);
              if (!existing.basecompany_id && emp.basecompany_id) existing.basecompany_id = emp.basecompany_id;
              for (const compId of emp.companies) {
                if (!existing.companies.includes(compId)) {
                  existing.companies.push(compId);
                }
              }
              if (!existing.department_id && emp.department_id) existing.department_id = emp.department_id;
              if ((!existing.roleid || existing.roleid.length === 0) && emp.roleid && emp.roleid.length > 0) existing.roleid = emp.roleid;
              if (!existing.phone && emp.phone) existing.phone = emp.phone;
            }
          }

          const mappedEmployees = Array.from(employeeMap.values());

          const response = await fetch(`${API_URL}/api/employees/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employees: mappedEmployees, clientid: user?.clientid || 16 })
          });

          const resData = await response.json();
          if (response.ok) {
            showToast(`Successfully imported ${resData.importedCount} users from Excel!`, 'success');
            fetchEmployees();
          } else {
            showToast(resData.message || 'Failed to import Excel data.', 'error');
          }
        } catch (err) {
          console.error('Excel Import Error:', err);
          showToast('Error reading Excel file.', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    };

    const handleDownloadExcelTemplate = async () => {
      try {
        const activeRolesList = roles && roles.length > 0
          ? roles.filter(r => r.status === 1).map(r => r.role)
          : ['Accountant', 'Assistant Manager', 'Manager', 'Driver', 'HR Manager', 'Document Controller'];

        const activeDeptsList = departments && departments.length > 0
          ? departments.filter(d => d.status !== 0).map(d => d.department_name)
          : ['Admin Department', 'Logistics Department', 'IT Department'];

        const targetClientId = user?.clientid || 16;
        const clientCompanies = companies && companies.length > 0
          ? companies.filter(c => Number(c.clientid || c.client_id) === Number(targetClientId))
          : [];

        const activeCompaniesList = clientCompanies.length > 0
          ? clientCompanies.map(c => c.company_name)
          : ['Ansar Mall', 'Night to Night'];

        const workbook = new ExcelJS.Workbook();
        const mainSheet = workbook.addWorksheet('Employee Import');

        mainSheet.columns = [
          { header: 'Full Name', key: 'full_name', width: 25 },
          { header: 'Email', key: 'email', width: 28 },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'System Permissions Role', key: 'role', width: 28 },
          { header: 'Department', key: 'department', width: 25 },
          { header: 'Base Company', key: 'base_company', width: 28 },
          { header: 'Status', key: 'status', width: 15 }
        ];

        // Header Styling
        const headerRow = mainSheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' }
        };

        // Add Data Rows (showing Base Company)
        if (employees && employees.length > 0) {
          employees.forEach(emp => {
            const baseComp = companies.find(c => Number(c.id) === Number(emp.basecompany_id));
            mainSheet.addRow({
              full_name: emp.full_name || '',
              email: emp.email || '',
              phone: emp.phone || '',
              role: emp.role_name || '',
              department: emp.department_name || '',
              base_company: emp.base_company_name || baseComp?.company_name || '',
              status: emp.status === 0 || emp.status === '0' || emp.status === 'Inactive' ? 'Inactive' : 'Active'
            });
          });
        } else {
          mainSheet.addRow({
            full_name: 'Kiran Raj',
            email: 'kiranraj@gmail.com',
            phone: '9847112233',
            role: activeRolesList[0] || 'Accountant',
            department: activeDeptsList[0] || 'Admin Department',
            base_company: activeCompaniesList[0] || 'Ansar Mall',
            status: 'Active'
          });
        }

        // Add Reference Worksheet FIRST so dataValidation can safely reference it
        const refSheet = workbook.addWorksheet('Valid Roles & References');
        refSheet.columns = [
          { header: 'Roles (From Database)', key: 'role', width: 30 },
          { header: 'Departments (From Database)', key: 'dept', width: 30 },
          { header: 'Base Companies (From Database)', key: 'company', width: 30 },
          { header: 'Status Options', key: 'status', width: 20 }
        ];

        const refHeaderRow = refSheet.getRow(1);
        refHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        refHeaderRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF10B981' }
        };

        const maxRows = Math.max(activeRolesList.length, activeDeptsList.length, activeCompaniesList.length, 2);
        for (let i = 0; i < maxRows; i++) {
          refSheet.addRow({
            role: activeRolesList[i] || '',
            dept: activeDeptsList[i] || '',
            company: activeCompaniesList[i] || '',
            status: i === 0 ? 'Active' : (i === 1 ? 'Inactive' : '')
          });
        }

        // Add native Excel Data Validation Dropdowns for rows 2 through 200 using Range Formulas
        const rolesEndRow = Math.max(activeRolesList.length + 1, 2);
        const deptsEndRow = Math.max(activeDeptsList.length + 1, 2);
        const compEndRow = Math.max(activeCompaniesList.length + 1, 2);

        const rolesFormula = `'Valid Roles & References'!$A$2:$A$${rolesEndRow}`;
        const deptsFormula = `'Valid Roles & References'!$B$2:$B$${deptsEndRow}`;
        const companiesFormula = `'Valid Roles & References'!$C$2:$C$${compEndRow}`;
        const statusFormula = `'Valid Roles & References'!$D$2:$D$3`;

        for (let rowIdx = 2; rowIdx <= 200; rowIdx++) {
          // Column D: System Permissions Role
          mainSheet.getCell(`D${rowIdx}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [rolesFormula]
          };
          // Column E: Department
          mainSheet.getCell(`E${rowIdx}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [deptsFormula]
          };
          // Column F: Base Company Dropdown
          mainSheet.getCell(`F${rowIdx}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [companiesFormula]
          };
          // Column G: Status Dropdown
          mainSheet.getCell(`G${rowIdx}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [statusFormula]
          };
        }

        // Write as file download blob
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Employee_Import_Template.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error generating Excel template with ExcelJS:', err);
        showToast('Failed to generate Excel template.', 'error');
      }
    };

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECECFE', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Employees Management</Text>
              <Text style={styles.tabHeadingSubtitle}>Manage internal and external employees and users.</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Download Template Button */}
            <TouchableOpacity
              style={[styles.addModuleBtn, { backgroundColor: '#475569' }]}
              onPress={handleDownloadExcelTemplate}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.addModuleBtnText}>Template</Text>
            </TouchableOpacity>

            {/* Import Excel Button */}
            <TouchableOpacity
              style={[styles.addModuleBtn, { backgroundColor: '#16A34A' }]}
              onPress={() => {
                if (typeof document !== 'undefined') {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx, .xls, .csv';
                  input.onchange = handleExcelEmployeeImport;
                  input.click();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.addModuleBtnText}>Import Excel</Text>
            </TouchableOpacity>

            {/* Create User Button */}
            <TouchableOpacity
              style={styles.addModuleBtn}
              onPress={() => {
                setIsViewOnlyEmployee(false);
                setEditingEmployee(null);
                setEmpFullName('');
                setEmpEmail('');
                setEmpPhone('');
                setEmpRoleId('');
                setEmpRoleIds([]);
                setEmpStatus(1);
                setEmpDepartmentId('');
                setEmpBaseCompanyId('');
                setEmpAssociatedCompanies([]);
                setEmpAutoGeneratePassword(true);
                setEmployeeFormError('');
                setIsEmpRoleDropdownOpen(false);
                setIsEmployeeModalOpen(true);
              }}
            >
              <Ionicons name="add" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.addModuleBtnText}>Create User</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(employeesSearch, setEmployeesSearch, setEmployeesPage, 'Search employees...')}

          {employeesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filtered.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}>
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 2 }]}>NAME</Text>
                    <Text style={[styles.thCell, { flex: 2 }]}>EMAIL</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>ROLE</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>DEPARTMENT</Text>
                    <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 1.8, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {paginated.map((item) => (
                    <View key={"employee-" + item.id} style={styles.modulesTableRow}>
                      <Text style={[styles.tdCell, { flex: 2, fontWeight: '500', color: COLORS.textPrimary }]} numberOfLines={1}>
                        {item.full_name}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>
                        {item.email}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>
                        {item.role_name || '-'}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]} numberOfLines={1}>
                        {item.department_name || '-'}
                      </Text>
                      <View style={[styles.tdCell, { flex: 1, justifyContent: 'center' }]}>
                        <View style={[styles.statusBadge, {
                          backgroundColor: item.status === 1 ? '#DCFCE7' : '#FEE2E2'
                        }]}>
                          <Text style={[styles.statusBadgeText, {
                            color: item.status === 1 ? '#16A34A' : '#DC2626'
                          }]}>
                            {item.status === 1 ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tdCell, { flex: 1.8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }]}>
                        <TouchableOpacity onPress={() => startViewEmployee(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} title="View User">
                          <Ionicons name="eye-outline" size={18} color="#059669" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => startEditEmployee(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} title="Edit User">
                          <Ionicons name="pencil" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedEmployeeForCompanies(item);
                            const assignedNonBaseIds = (item.companies || [])
                              .filter(c => Number(c.id) !== Number(item.basecompany_id))
                              .map(c => String(c.id));
                            setSelectedNonBaseCompanyIds(assignedNonBaseIds);
                            setIsViewEmpCompaniesModalOpen(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          title="Additional Company"
                          style={{ position: 'relative' }}
                        >
                          <Ionicons name="business-outline" size={18} color="#2563EB" />
                          {item.companies && item.companies.length > 0 && (
                            <View style={{
                              position: 'absolute', top: -4, right: -6, backgroundColor: '#2563EB',
                              borderRadius: 6, minWidth: 12, height: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2
                            }}>
                              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{item.companies.length}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleOpenPasswordResetModal(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} title="Reset / Assign Password">
                          <Ionicons name="key-outline" size={18} color="#f59e0b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item.id, 'employee', item.full_name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} title="Delete User">
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
              {renderTablePagination(filtered.length, employeesPage, setEmployeesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No employees found.</Text>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };


  const renderCompanySinglePageView = () => {
    return (
      <View style={{ paddingVertical: 4, paddingHorizontal: 2 }}>
        {/* SECTION 1: IDENTITY */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="business-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>1. Company Identity Profile</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Company Name</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyNameInput || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Short Code</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyShortCode || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Traffic File No</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTrafficFileNumber || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Industry</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyIndustry || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Legal Form</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyLegalForm || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Business Activity</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyBusinessActivity || '-'}</Text></View>
            <View style={{ width: '47%' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Company Status</Text>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: companyStatus === 'Active' ? '#D1FAE5' : '#F1F5F9', borderWidth: 1, borderColor: companyStatus === 'Active' ? '#A7F3D0' : '#E2E8F0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: companyStatus === 'Active' ? '#047857' : '#64748B' }}>{companyStatus}</Text>
              </View>
            </View>
            {editingCompany?.company_logo_path && (
              <View style={{ width: '100%', marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Company Logo Preview</Text>
                <Image
                  source={{ uri: API_URL + '/' + editingCompany.company_logo_path }}
                  style={{ width: 90, height: 90, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', resizeMode: 'contain', backgroundColor: '#F8FAFC' }}
                />
              </View>
            )}
          </View>
        </View>

        {/* SECTION 2: LICENSING */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="card-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>2. Trade Licensing & Currency</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Jurisdiction</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyJurisdiction || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Licensing Authority</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyLicensingAuthority || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Trade License No</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTradeLicenseNumber || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Issue Date</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTradeLicenseIssueDate ? companyTradeLicenseIssueDate.split('T')[0] : '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Expiry Date</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTradeLicenseExpiryDate ? companyTradeLicenseExpiryDate.split('T')[0] : '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Default Currency</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyDefaultCurrency || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Trade License File</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#2563EB' }}>{companyTradeLicenseFile?.name || (editingCompany?.trade_license_attachment_path ? editingCompany.trade_license_attachment_path.split('/').pop() : 'None Attached')}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Company Logo</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#2563EB' }}>{companyLogoFile?.name || (editingCompany?.company_logo_path ? editingCompany.company_logo_path.split('/').pop() : 'None Attached')}</Text></View>
          </View>
        </View>

        {/* SECTION 3: LOCATION & CONTACT */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>3. Location & Contact Details</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Country</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyCountry || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Emirate / State</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyEmirate || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Registered Address</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyRegisteredAddress || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>PO Box</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyPoBox || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Contact Person</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyContactPerson || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Contact Email</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyContactEmail || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Contact Phone</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyContactPhone || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Website</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyWebsite || '-'}</Text></View>
          </View>
        </View>

        {/* SECTION 4: MODULES & STATUTORY TAX */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="grid-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>4. Modules & Statutory Tax</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>VAT Registered</Text><Text style={{ fontSize: 14, fontWeight: '600', color: companyVatRegistered ? '#047857' : '#64748B' }}>{companyVatRegistered ? 'Yes' : 'No'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>TRN Number</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTrn || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Corporate Tax Reg No</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyCorporateTaxRegistrationNumber || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Establishment Card No</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyEstablishmentCardNumber || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Establishment Expiry</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyEstablishmentCardExpiryDate ? companyEstablishmentCardExpiryDate.split('T')[0] : '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>MOHRE Number</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyMohreNumber || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>WPS Registered</Text><Text style={{ fontSize: 14, fontWeight: '600', color: companyWpsRegistered ? '#047857' : '#64748B' }}>{companyWpsRegistered ? 'Yes' : 'No'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>NAFIS Emiratisation</Text><Text style={{ fontSize: 14, fontWeight: '600', color: companyNafisEmiratisationApplicable ? '#047857' : '#64748B' }}>{companyNafisEmiratisationApplicable ? 'Yes' : 'No'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>GPSSA Applicable</Text><Text style={{ fontSize: 14, fontWeight: '600', color: companyGpssaApplicable ? '#047857' : '#64748B' }}>{companyGpssaApplicable ? 'Yes' : 'No'}</Text></View>
          </View>
        </View>

        {/* SECTION 5: LIMITS & ALERTS */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="options-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>5. System Prefixes & Alert Settings</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Asset Prefix</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyAssetPrefix || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Vehicle Prefix</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyVehiclePrefix || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Employee Prefix</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyEmployeePrefix || '-'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Trade License Alert</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyTradeLicenseAlertDays ? `${companyTradeLicenseAlertDays} Days` : '30 Days'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Establishment Card Alert</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyEstablishmentCardAlertDays ? `${companyEstablishmentCardAlertDays} Days` : '30 Days'}</Text></View>
            <View style={{ width: '47%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Insurance Alert</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyInsuranceAlertDays ? `${companyInsuranceAlertDays} Days` : '30 Days'}</Text></View>
          </View>
        </View>

        {/* SECTION 6: OTHER DETAILS */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="ellipsis-horizontal-outline" size={18} color="#2563EB" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>6. Other Details</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16, columnGap: 16 }}>
            <View style={{ width: '97%' }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Party ID</Text><Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>{companyPartyId || '-'}</Text></View>
          </View>
        </View>
      </View>
    );
  };

  const renderCompanyTab = () => {
    const filtered = companies.filter(c => {
      const matchClient = (!user || !user.clientid) ? true : (Number(c.clientid) === Number(user.clientid));
      const matchSearch = c.company_name && c.company_name.toLowerCase().includes(companiesSearch.toLowerCase());
      return matchClient && matchSearch;
    });
    const displayPage = Math.min(companiesPage, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
    const paginated = filtered.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECECFE', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="business-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Company Management</Text>
              <Text style={styles.tabHeadingSubtitle}>Manage internal and external company profiles.</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setIsCompanyViewOnly(false);
              setEditingCompany(null);
              setCompanyNameInput('');
              setCompanyShortCode('');
              setCompanyTrafficFileNumber('');
              setCompanyClientId('');
              setCompanyIndustry('');
              setCompanyStatus('Active');

              setCompanyLegalForm('');
              setCompanyBusinessActivity('');
              setCompanyTradeLicenseFile(null);
              setCompanyLogoFile(null);
              setCompanyJurisdiction('');
              setCompanyLicensingAuthority('');
              setCompanyTradeLicenseNumber('');
              setCompanyTradeLicenseIssueDate('');
              setCompanyTradeLicenseExpiryDate('');
              setCompanyCountry('');
              setCompanyEmirate('');
              setCompanyRegisteredAddress('');
              setCompanyPoBox('');
              setCompanyContactPerson('');
              setCompanyContactEmail('');
              setCompanyContactPhone('');
              setCompanyWebsite('');
              setCompanyVatRegistered(false);
              setCompanyTrn('');
              setCompanyCorporateTaxRegistrationNumber('');
              setCompanyEstablishmentCardNumber('');
              setCompanyEstablishmentCardExpiryDate('');
              setCompanyMohreNumber('');
              setCompanyWpsRegistered(false);
              setCompanyNafisEmiratisationApplicable(false);
              setCompanyGpssaApplicable(false);
              setCompanyAuthorizedSignatoryName('');
              setCompanyAuthorizedSignatoryDesignation('');
              setCompanyDefaultBank('');
              setCompanyDefaultCurrency('');
              setCompanyAssetPrefix('');
              setCompanyVehiclePrefix('');
              setCompanyEmployeePrefix('');
              setCompanyTradeLicenseAlertDays('30');
              setCompanyEstablishmentCardAlertDays('30');
              setCompanyInsuranceAlertDays('30');
              setCompanyPlanId('');
              setCompanyPartyId('');
              setCompanyWizardStep(1);
              setIsCompanyModalOpen(true);
            }}
          >
            <Ionicons name="add" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={styles.addModuleBtnText}>Add Company</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(companiesSearch, setCompaniesSearch, setCompaniesPage, 'Search companies...')}

          {companiesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filtered.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}>
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.5 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2 }]}>COMPANY NAME</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>SHORT CODE</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>CLIENT</Text>
                    <Text style={[styles.thCell, { flex: 1.5 }]}>INDUSTRY</Text>
                    <Text style={[styles.thCell, { flex: 1 }]}>STATUS</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>ACTIONS</Text>
                  </View>

                  {paginated.map((item) => (
                    <View key={"company-" + item.id} style={styles.modulesTableRow}>
                      <Text style={[styles.tdCell, { flex: 0.5, color: COLORS.textMuted }]}>#{item.id}</Text>
                      <Text style={[styles.tdCell, { flex: 2, fontWeight: '500', color: COLORS.textPrimary }]}>{item.company_name}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.short_code || '-'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.client_name || '-'}</Text>
                      <Text style={[styles.tdCell, { flex: 1.5 }]}>{item.industry || '-'}</Text>
                      <View style={[styles.tdCell, { flex: 1, justifyContent: 'center' }]}>
                        <View style={[styles.statusBadge, getStatusStyle(item.company_status)]}>
                          <Text style={[styles.statusText, getStatusStyle(item.company_status)]}>{item.company_status}</Text>
                        </View>
                      </View>
                      <View style={[styles.tdCell, { flex: 0.8, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                        <TouchableOpacity onPress={() => startEditCompany(item, true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="eye-outline" size={18} color="#0284C7" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => startEditCompany(item, false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="pencil" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => confirmDelete(item.id, 'company', item.company_name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
              {renderTablePagination(filtered.length, companiesPage, setCompaniesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No Companies Found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderClientTab = () => {
    const filteredClients = clients.filter(c =>
      c.client_name.toLowerCase().includes(clientsSearch.toLowerCase()) ||
      (c.companyname && c.companyname.toLowerCase().includes(clientsSearch.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(clientsSearch.toLowerCase())) ||
      (c.contact_no && c.contact_no.toLowerCase().includes(clientsSearch.toLowerCase()))
    );
    const displayPage = Math.min(clientsPage, Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE)));
    const paginatedClients = filteredClients.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* CLIENTS HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="briefcase-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Client Management</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Register client enterprises, configure service volumes, and toggle licensed modules.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingClient(null);
              setClientName('');
              setCompanyName('');
              setCompanyShortname('');
              setIndustry('');
              setAddress('');
              setCountry('');
              setStateName('');
              setCity('');
              setClientEmail('');
              setTrnNo('');
              setContactNo('');
              setPhoneNo('');
              setWebsite('');
              setTradeLicenseno('');
              setMaxCompanies('');
              setMaxEmployess('');
              setMaxAsset('');
              setClientStatus(1);
              setEnabledModule('');
              setSelectedPlanId('');
              setClientFormError('');
              setClientWizardStep(1);
              setIsAddClientModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add Client</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM CLIENTS TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(clientsSearch, setClientsSearch, setClientsPage, 'Search clients by name, company, email...')}

          {clientsLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL client table...</Text>
            </View>
          ) : filteredClients.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.6 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.2 }]}>Client & Company</Text>
                    <Text style={[styles.thCell, { flex: 2.0 }]}>Contact & Info</Text>
                    <Text style={[styles.thCell, { flex: 1.8 }]}>Location</Text>
                    <Text style={[styles.thCell, { flex: 1.2 }]}>Capacities</Text>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>View</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Password</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Delete</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedClients.map((item, index) => {
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedClients.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 0.6, fontWeight: '700' }]}>#{item.id}</Text>
                        <View style={[styles.tdCell, { flex: 2.2 }]}>
                          <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{item.client_name}</Text>
                          {item.plan_name ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <View style={{ backgroundColor: '#ECECFE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700' }}>
                                  {item.plan_name.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                          {item.companyname ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                              {item.companyname} {item.company_shortname ? `(${item.company_shortname})` : ''}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.tdCell, { flex: 2.0 }]}>
                          {item.email ? <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>{item.email}</Text> : null}
                          {item.phone_no || item.contact_no ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                              📞 {item.phone_no || item.contact_no}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.tdCell, { flex: 1.8 }]}>
                          <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>
                            {[
                              item.city,
                              states.find(s => String(s.id) === String(item.state))?.name || item.state
                            ].filter(Boolean).join(', ')}
                          </Text>
                          {item.country ? (
                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                              {countries.find(c => String(c.id) === String(item.country))?.name || item.country}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.tdCell, { flex: 1.2 }]}>
                          <Text style={{ fontSize: 11, color: COLORS.textPrimary }}>
                            🏢 Max Co: {item.max_companies || '—'}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 1 }}>
                            👥 Staff: {item.max_employess || '—'}
                          </Text>
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                            📦 Assets: {item.max_asset || '—'}
                          </Text>
                        </View>
                        <View style={[styles.tdCell, { flex: 1.0 }]}>
                          <View style={[styles.statusBadgeSmall, item.status === 1 ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                            <Text style={[styles.statusTextSmall, item.status === 1 ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                              {item.status === 1 ? 'active' : 'inactive'}
                            </Text>
                          </View>
                        </View>

                        {/* View details trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => {
                            setSelectedClientForView(item);
                            setIsViewClientCompaniesModalOpen(true);
                          }}
                        >
                          <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => startEditClient(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Password reset trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => {
                            if (!item.email) {
                              showToast('This client does not have an email address associated with a portal account.', 'warning');
                              return;
                            }
                            setAdminPasswordResetEmployee({
                              email: item.email,
                              full_name: item.client_name
                            });
                          }}
                        >
                          <Ionicons name="key-outline" size={18} color="#f59e0b" />
                        </TouchableOpacity>

                        {/* Delete trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => confirmDelete(item.id, 'client', item.client_name)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredClients.length, clientsPage, setClientsPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="briefcase-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{clients.length === 0 ? "No registered clients found in the database." : "No matching clients found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render Country Settings Tab Content
  const renderCountryTab = () => {
    const filteredCountries = countries.filter(c =>
      c.name.toLowerCase().includes(countriesSearch.toLowerCase())
    );
    const displayPage = Math.min(countriesPage, Math.max(1, Math.ceil(filteredCountries.length / ITEMS_PER_PAGE)));
    const paginatedCountries = filteredCountries.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* COUNTRY HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="earth-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Country Settings</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Manage geographic listings, register country codes, and configure destination hubs.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingCountry(null);
              setNewCountryName('');
              setCountryFormError('');
              setIsAddCountryModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add Country</Text>
          </TouchableOpacity>
        </View>

        {/* SYSTEM COUNTRIES TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(countriesSearch, setCountriesSearch, setCountriesPage, 'Search countries by name...')}

          {countriesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL countries...</Text>
            </View>
          ) : filteredCountries.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 4.5 }]}>Country Name</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Action</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedCountries.map((item, index) => {
                    const isSoftDeleted = item.is_deleted === 1;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedCountries.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 4.5, color: COLORS.textPrimary, fontWeight: '600', textDecorationLine: isSoftDeleted ? 'line-through' : 'none', opacity: isSoftDeleted ? 0.6 : 1.0 }]}>
                          {item.name}
                        </Text>

                        {/* Status Badge */}
                        <View style={[styles.tdCell, { flex: 1.5, alignItems: 'center' }]}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isSoftDeleted ? '#FEE2E2' : '#E0F2FE',
                                borderColor: isSoftDeleted ? '#FCA5A5' : '#7DD3FC',
                                borderWidth: 1,
                                borderRadius: 4,
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isSoftDeleted ? '#EF4444' : '#0284C7',
                                textTransform: 'uppercase',
                              }}
                            >
                              {isSoftDeleted ? 'Deleted' : 'Active'}
                            </Text>
                          </View>
                        </View>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center', opacity: isSoftDeleted ? 0.35 : 1 }]}
                          onPress={() => !isSoftDeleted && startEditCountry(item)}
                          disabled={isSoftDeleted}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Delete/Restore trigger */}
                        {isSoftDeleted ? (
                          <TouchableOpacity
                            style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                            onPress={() => handleRestoreCountry(item.id)}
                          >
                            <Ionicons name="reload-outline" size={18} color={COLORS.primary} />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                            onPress={() => confirmDelete(item.id, 'country', item.name)}
                          >
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredCountries.length, countriesPage, setCountriesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="earth-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{countries.length === 0 ? "No registered countries found." : "No matching countries found."}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render State Settings Tab Content (Brand New State Management Tab!)
  const renderStateTab = () => {
    const filteredStates = states.filter(s =>
      s.name.toLowerCase().includes(statesSearch.toLowerCase()) ||
      (s.country_name && s.country_name.toLowerCase().includes(statesSearch.toLowerCase()))
    );
    const displayPage = Math.min(statesPage, Math.max(1, Math.ceil(filteredStates.length / ITEMS_PER_PAGE)));
    const paginatedStates = filteredStates.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* STATE HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="map-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>State / Province Settings</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Link state listings to registered countries, manage regional divisions, and configure shipping domains.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addModuleBtn}
            onPress={() => {
              setEditingState(null);
              setNewStateName('');
              // Default to first active country if available
              const activeCountries = countries.filter(c => c.is_deleted === 0);
              setNewStateCountryId(activeCountries.length > 0 ? activeCountries[0].id.toString() : '');
              setStateFormError('');
              setIsAddStateModalOpen(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.white} />
            <Text style={styles.addModuleBtnText}>Add State</Text>
          </TouchableOpacity>
        </View>

        {/* REGIONAL STATES TABLE */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(statesSearch, setStatesSearch, setStatesPage, 'Search states by name or country...')}

          {statesLoading ? (
            <View style={styles.tableLoaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Querying PostgreSQL states...</Text>
            </View>
          ) : filteredStates.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 1000 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 1.0 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 4.0 }]}>State Name</Text>
                    <Text style={[styles.thCell, { flex: 4.0 }]}>Country Association</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Edit</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Delete</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedStates.map((item, index) => {
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.modulesTableRow,
                          index === paginatedStates.length - 1 && styles.lastTableRow,
                        ]}
                      >
                        <Text style={[styles.tdCell, { flex: 1.0, fontWeight: '700' }]}>#{item.id}</Text>
                        <Text style={[styles.tdCell, { flex: 4.0, color: COLORS.textPrimary, fontWeight: '600' }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 4.0, color: COLORS.textSecondary, fontWeight: '500' }]}>
                          🌍 {item.country_name || 'Unlinked (ID: ' + item.country_id + ')'}
                        </Text>

                        {/* Edit trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => startEditState(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        {/* Delete trigger */}
                        <TouchableOpacity
                          style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}
                          onPress={() => confirmDelete(item.id, 'state', item.name)}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View></View></ScrollView>
              {renderTablePagination(filteredStates.length, statesPage, setStatesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="map-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No registered states found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render Role Permissions Matrix Tab Content
  const renderPermissionsTab = () => {
    const activeRole = roles.find(r => String(r.id) === String(selectedRoleId));

    const filteredRoles = roles.filter(r =>
      r.role.toLowerCase().includes(rolesSearch.toLowerCase())
    );
    const displayPage = Math.min(rolesPage, Math.max(1, Math.ceil(filteredRoles.length / ITEMS_PER_PAGE)));
    const paginatedRoles = filteredRoles.slice((displayPage - 1) * ITEMS_PER_PAGE, displayPage * ITEMS_PER_PAGE);

    return (
      <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">

        {/* HEADER SECTION */}
        <View style={[styles.modulesHeaderContainer, !isLargeScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: isLargeScreen ? 1 : undefined, width: isLargeScreen ? 'auto' : '100%', gap: 16 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ECECFE',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.modulesTitleWrapper}>
              <Text style={[styles.tabHeadingTitle, { marginBottom: 2 }]}>Modular Role Permissions</Text>
              <Text style={styles.tabHeadingSubtitle}>
                Manage security roles and customize granular modular permissions inside the configuration module.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.addModuleBtn, { backgroundColor: '#0F172A' }]}
              onPress={() => {
                setEditingRole(null);
                setNewRoleName('');
                setNewRoleStatus(1);
                setNewRoleClientIds([]);
                setRoleFormError('');
                if (typeof initializeDefaultRolePermissions === 'function') {
                  initializeDefaultRolePermissions();
                }
                setIsAddRoleModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.white} />
              <Text style={styles.addModuleBtnText}>Add Role Permission</Text>
            </TouchableOpacity>


          </View>
        </View>

        {/* SYSTEM ROLES LIST TABLE CARD */}
        <View style={[styles.tableCard, { marginTop: SPACING.md }]}>
          {renderTableToolbar(rolesSearch, setRolesSearch, setRolesPage, 'Search roles by title...')}
          
          {rolesLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filteredRoles.length > 0 ? (
            <>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={[styles.modulesTableWrapper, { minWidth: 800 }]}><View style={{ paddingBottom: 10 }}>
                  {/* Table Header Row */}
                  <View style={styles.modulesTableHeader}>
                    <Text style={[styles.thCell, { flex: 0.6 }]}>ID</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>Role Name</Text>
                    <Text style={[styles.thCell, { flex: 2.5 }]}>Client & Company</Text>
                    <Text style={[styles.thCell, { flex: 1.2 }]}>Status</Text>
                    <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
                  </View>

                  {/* Table Data Rows */}
                  {paginatedRoles.map((r, index) => (
                    <View
                      key={r.id}
                      style={[
                        styles.modulesTableRow,
                        index === paginatedRoles.length - 1 && styles.lastTableRow,
                        { paddingVertical: 12 }
                      ]}
                    >
                      <Text style={[styles.tdCell, { flex: 0.6, fontWeight: '700' }]}>#{r.id}</Text>
                      <Text style={[styles.tdCell, { flex: 2.5, fontWeight: '700', color: COLORS.textPrimary }]}>{r.role}</Text>
                      <View style={[styles.tdCell, { flex: 2.5 }]}>
                        {r.client_name ? (
                          <>
                            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{r.client_name}</Text>
                            {r.companyname ? (
                              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{r.companyname}</Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>Global System Role</Text>
                        )}
                      </View>
                      <View style={[styles.tdCell, { flex: 1.2 }]}>
                        <View style={[styles.statusBadgeSmall, r.status === 1 ? styles.statusActiveSmall : styles.statusInactiveSmall]}>
                          <Text style={[styles.statusTextSmall, r.status === 1 ? styles.statusTextActiveSmall : styles.statusTextInactiveSmall]}>
                            {r.status === 1 ? 'active' : 'inactive'}
                          </Text>
                        </View>

                      </View>
                      <View style={[styles.tdCell, { flex: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => startEditRole(r)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{ padding: 4 }}
                          onPress={() => confirmDelete(r.id, 'role', r.role)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View></View>
              </ScrollView>
              {renderTablePagination(filteredRoles.length, rolesPage, setRolesPage)}
            </>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="shield-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No registered security roles found.</Text>
            </View>
          )}
        </View>

        {/* MODULAR ROLE PERMISSION CONFIGURATION MODAL */}
        <Modal
          visible={isRolePermissionModalOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsRolePermissionModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 900, width: '90%', maxHeight: '90%' }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { marginBottom: 12 }]}>
                <View style={styles.modalTitleWrapper}>
                  <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>Configure Role Permissions</Text>
                </View>
                <TouchableOpacity onPress={() => setIsRolePermissionModalOpen(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content */}
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
                {/* ROLE PICKER */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 }}>
                    SELECT SECURITY ROLE *
                  </Text>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedRoleId(val);
                      setSelectedPermissionCompanyId('all');
                      setCompanyPermissionDrafts({});
                      
                      const rObj = roles.find(r => String(r.id) === String(val));
                      const rAssoc = rObj
                        ? companies.filter(c => 
                            (Array.isArray(rObj.companyids) && rObj.companyids.map(id => String(id)).includes(String(c.id))) ||
                            (Array.isArray(rObj.clientids) && rObj.clientids.map(id => String(id)).includes(String(c.id))) ||
                            (rObj.clientid && String(c.clientid) === String(rObj.clientid))
                          )
                        : [];
                      const fetchCompId = rAssoc.length > 0 ? rAssoc.map(c => c.id).join(',') : '';
                      fetchRolePermissions(val, fetchCompId);
                    }}
                    style={{
                      height: 44,
                      borderColor: '#E2E8F0',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      backgroundColor: '#F8FAFC',
                      color: '#1E293B',
                      fontSize: 14,
                      outlineStyle: 'none',
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Select Security Role --</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.role} {r.status === 1 ? '' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </View>

                {/* COMPANY PICKER */}
                {(() => {
                  const selectedRoleObj = roles.find(r => String(r.id) === String(selectedRoleId));
                  const roleAssociatedCompanies = selectedRoleObj
                    ? companies.filter(c => 
                        (Array.isArray(selectedRoleObj.companyids) && selectedRoleObj.companyids.map(id => String(id)).includes(String(c.id))) ||
                        (Array.isArray(selectedRoleObj.clientids) && selectedRoleObj.clientids.map(id => String(id)).includes(String(c.id))) ||
                        (selectedRoleObj.clientid && String(c.clientid) === String(selectedRoleObj.clientid))
                      )
                    : [];
                  
                  if (!selectedRoleId) return null;

                  return (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 }}>
                        SELECT TARGET COMPANY *
                      </Text>
                      <select
                        value={selectedPermissionCompanyId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const currentComp = selectedPermissionCompanyId || 'all';
                          if (rolePermissions && rolePermissions.length > 0) {
                            setCompanyPermissionDrafts(prev => ({
                              ...prev,
                              [currentComp]: rolePermissions
                            }));
                          }
                          setSelectedPermissionCompanyId(val);

                          if (companyPermissionDrafts[val]) {
                            setRolePermissions(companyPermissionDrafts[val]);
                          } else {
                            const fetchCompId = val === 'all' 
                              ? roleAssociatedCompanies.map(c => c.id).join(',')
                              : val;
                            fetchRolePermissions(selectedRoleId, fetchCompId);
                          }
                        }}
                        style={{
                          height: 44,
                          borderColor: '#E2E8F0',
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 16,
                          backgroundColor: '#F8FAFC',
                          color: '#1E293B',
                          fontSize: 14,
                          outlineStyle: 'none',
                          width: '100%',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="all">All Associated Companies</option>
                        {roleAssociatedCompanies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.company_name}
                          </option>
                        ))}
                      </select>
                    </View>
                  );
                })()}

                {permissionsLoading ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading permissions schema...</Text>
                  </View>
                ) : selectedRoleId ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 }}>
                    {/* Inner Header with Role info & Save Button */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: 16,
                    }}>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>
                          Active Role: {activeRole ? activeRole.role : 'Unknown'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addModuleBtn, { marginVertical: 0 }]}
                        onPress={handleSavePermissions}
                        disabled={permissionsSaving}
                        activeOpacity={0.8}
                      >
                        {permissionsSaving ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="save-outline" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                            <Text style={styles.addModuleBtnText}>Save Policy Changes</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {rolePermissions.length > 0 ? (
                      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
                        <View style={[styles.modulesTableWrapper, { minWidth: 700 }]}><View style={{ paddingBottom: 10 }}>
                          {/* Table Header Row */}
                          <View style={styles.modulesTableHeader}>
                            <Text style={[styles.thCell, { flex: 3.0 }]}>System Module</Text>
                            <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>View</Text>
                            <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Create</Text>
                            <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Edit</Text>
                            <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center' }]}>Delete</Text>
                            <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center', fontWeight: 'bold', color: COLORS.primary }]}>Full Control</Text>
                          </View>

                          {/* Table Data Rows */}
                          {rolePermissions.map((item, index) => {
                            const isParent = item.parent_id === null || item.parent_id === undefined;
                            return (
                              <View key={item.module_id} style={[styles.modulesTableRow, index === rolePermissions.length - 1 && styles.lastTableRow, { paddingVertical: 12 }]}>
                                <View style={[styles.tdCell, { flex: 3.0, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                  {!isParent && <View style={{ width: 14, height: 1, backgroundColor: '#CBD5E1', marginRight: 4 }} />}
                                  <Ionicons name={isParent ? "folder-outline" : "document-text-outline"} size={14} color={isParent ? COLORS.primary : COLORS.textSecondary} />
                                  <Text style={{ color: COLORS.textPrimary, fontWeight: isParent ? '700' : '500', fontSize: isParent ? 14 : 13 }}>
                                    {item.module_name}
                                  </Text>
                                </View>
                                {/* Checkboxes */}
                                {['can_view', 'can_create', 'can_edit', 'can_delete'].map(field => (
                                  <View key={field} style={[styles.tdCell, { flex: 1.0, alignItems: 'center' }]}>
                                    <TouchableOpacity
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 6,
                                        borderWidth: 2,
                                        borderColor: item[field] ? COLORS.primary : '#94A3B8',
                                        backgroundColor: item[field] ? COLORS.primary : 'transparent',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                      }}
                                      onPress={() => togglePermission(item.module_id, field)}
                                      activeOpacity={0.7}
                                    >
                                      {item[field] && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                {/* Full Control */}
                                <View style={[styles.tdCell, { flex: 1.2, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 6,
                                      borderWidth: 2,
                                      borderColor: item.full_control ? COLORS.success : '#94A3B8',
                                      backgroundColor: item.full_control ? COLORS.success : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'full_control')}
                                    activeOpacity={0.7}
                                  >
                                    {item.full_control && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View></View>
                      </ScrollView>
                    ) : (
                      <View style={[styles.emptyView, { paddingVertical: 40 }]}>
                        <Ionicons name="alert-circle-outline" size={44} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No registered active modules found.</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Ionicons name="shield-outline" size={48} color={COLORS.textMuted} />
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8 }}>Please select a security role above to begin configuring permissions.</Text>
                  </View>
                )}
              </ScrollView>

              {/* Sticky Footer Action Bar */}
              <View style={{
                borderTopWidth: 1,
                borderTopColor: '#E2E8F0',
                paddingTop: 14,
                marginTop: 12,
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#FFFFFF',
              }}>
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    backgroundColor: '#F8FAFC',
                  }}
                  onPress={() => setIsRolePermissionModalOpen(false)}
                >
                  <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>

                {selectedRoleId && (
                  <TouchableOpacity
                    style={[styles.addModuleBtn, { marginVertical: 0, paddingHorizontal: 20, height: 42 }]}
                    onPress={handleSavePermissions}
                    disabled={permissionsSaving}
                    activeOpacity={0.8}
                  >
                    {permissionsSaving ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                        <Text style={styles.addModuleBtnText}>Save Policy Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    );
  };
  // Select active tab content
  // ─── Profile Tab ───────────────────────────────────────────────────────────
  const renderProfileTab = () => {
    const initials = user.name
      ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : 'JS';

    const infoRows = [
      { label: 'Full Name', value: user.name || '—', icon: 'person-outline' },
      { label: 'Email Address', value: user.email || '—', icon: 'mail-outline' },
      { label: 'Primary Role', value: user.role || user.roleName || (user.roleId ? `Role #${user.roleId}` : '—'), icon: 'shield-checkmark-outline' },
      { label: 'Account ID', value: user.id ? `#${user.id}` : '—', icon: 'finger-print-outline' },
    ];

    return (
      <View style={styles.tabContent}>
        {/* Header Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="person-outline" size={24} color="#D86A1A" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#4A001A', letterSpacing: -0.5, fontFamily: 'Inter, system-ui, sans-serif' }}>User Profile</Text>
            <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>Manage your account settings and preferences</Text>
          </View>
        </View>

        {/* Responsive Two-Column Layout */}
        <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 24 }}>

          {/* Left Column: Profile Summary Card (Clean White/Cream Aesthetic) */}
          <View style={{ flex: isLargeScreen ? 1 : undefined, maxWidth: isLargeScreen ? 330 : '100%' }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 500,
              borderWidth: 1, borderColor: '#F1F5F9',
              boxShadow: '0px 8px 28px rgba(0, 0, 0, 0.04)',
              elevation: 4,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle Warm Top Glow Accent */}
              <View style={{
                position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70,
                backgroundColor: '#FFF4E5', pointerEvents: 'none',
              }} />

              <View style={{ alignItems: 'center', width: '100%', zIndex: 2 }}>
                {/* Avatar Ring Container with Floating Camera Badge */}
                <View style={{ position: 'relative', marginBottom: 16, marginTop: 8 }}>
                  <View style={{
                    width: 106, height: 106, borderRadius: 53,
                    backgroundColor: '#4A001A',
                    borderWidth: 3, borderColor: '#F5A623',
                    justifyContent: 'center', alignItems: 'center',
                    boxShadow: '0 6px 20px rgba(74, 0, 26, 0.15)',
                    elevation: 6
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '800', fontFamily: 'Inter, system-ui, sans-serif' }}>{initials}</Text>
                  </View>

                  {/* Floating Camera Button on Avatar */}
                  <TouchableOpacity
                    onPress={() => showToast('Avatar upload coming soon.', 'success')}
                    style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: '#4A001A',
                      borderWidth: 2, borderColor: '#FFFFFF',
                      justifyContent: 'center', alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      elevation: 4,
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="camera" size={15} color="#F9C62A" />
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#4A001A', textAlign: 'center', letterSpacing: -0.3, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {user.name || 'John Smith'}
                </Text>

                {/* Email */}
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                  {user.email}
                </Text>

                {/* Role Badge */}
                <View style={{
                  marginTop: 14, paddingHorizontal: 16, paddingVertical: 7,
                  backgroundColor: '#FFF4E5',
                  borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
                  borderWidth: 1, borderColor: '#FFE2C2',
                }}>
                  <Ionicons name="shield-checkmark" size={13} color="#D86A1A" />
                  <Text style={{ color: '#4A001A', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {user.role || user.roleName || 'STAFF MEMBER'}
                  </Text>
                </View>

                {/* Quick Stats Card */}
                <View style={{
                  marginTop: 20, width: '100%',
                  backgroundColor: '#FFF8F0',
                  borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
                  borderWidth: 1, borderColor: '#FFE8D6',
                }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 }}>STATUS</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' }} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>Active</Text>
                    </View>
                  </View>

                  <View style={{ width: 1, height: 26, backgroundColor: 'rgba(74, 0, 26, 0.1)' }} />

                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 }}>MEMBER</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#4A001A', marginTop: 3 }}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* Change Photo Action Button */}
              <TouchableOpacity
                onPress={() => showToast('Avatar upload coming soon.', 'success')}
                style={{
                  width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, backgroundColor: '#4A001A',
                  backgroundImage: 'linear-gradient(90deg, #4A001A 0%, #D86A1A 100%)',
                  borderRadius: 14,
                  paddingVertical: 13,
                  marginTop: 24, zIndex: 2,
                  boxShadow: '0 4px 14px rgba(74, 0, 26, 0.2)',
                  elevation: 4,
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column: Details & Security */}
          <View style={{ flex: 2 }}>

            {/* Personal Information Card */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#F1F5F9',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              elevation: 2,
            }}>
              {/* Card Header Banner */}
              <View style={{
                backgroundColor: '#4A001A',
                backgroundImage: 'linear-gradient(90deg, #4A001A 0%, #6E0F28 60%, #8A1830 100%)',
                paddingHorizontal: 24,
                paddingVertical: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: '#D86A1A',
                  justifyContent: 'center', alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(216, 106, 26, 0.4)',
                }}>
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>Personal Information</Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 }}>Basic details associated with your account</Text>
                </View>
              </View>

              {/* Rows List */}
              <View style={{ padding: 24 }}>
                {infoRows.map((row, idx) => {
                  const bgColors = ['#FFF4E5', '#FFF0F3', '#FFFBEB', '#FDF2F8'];
                  const iconColors = ['#D86A1A', '#991B1B', '#D97706', '#BE185D'];
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx < infoRows.length - 1 ? 16 : 0 }}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 12,
                        backgroundColor: bgColors[idx % bgColors.length],
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 16,
                      }}>
                        <Ionicons name={row.icon} size={20} color={iconColors[idx % iconColors.length]} />
                      </View>
                      <View style={{ flex: 1, borderBottomWidth: idx < infoRows.length - 1 ? 1 : 0, borderBottomColor: '#F1F5F9', paddingBottom: idx < infoRows.length - 1 ? 16 : 0 }}>
                        <Text style={{ fontSize: 11, color: '#4A001A', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                          {row.label}
                        </Text>
                        <Text style={{ fontSize: 16, color: '#0F172A', fontWeight: '700' }}>
                          {row.value}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Security Settings Section */}
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#F1F5F9',
              marginTop: 24,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              elevation: 2,
            }}>
              {/* Security Header Banner */}
              <View style={{
                backgroundColor: '#FFF8F0',
                backgroundImage: 'linear-gradient(90deg, #FFF8F0 0%, #FFF3E0 100%)',
                paddingHorizontal: 24,
                paddingVertical: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(216, 106, 26, 0.1)',
              }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: '#D86A1A',
                  backgroundImage: 'linear-gradient(135deg, #D86A1A 0%, #F5A623 100%)',
                  justifyContent: 'center', alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(216, 106, 26, 0.3)',
                }}>
                  <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#4A001A' }}>Security Settings</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Manage your password and active sessions</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ padding: 24, flexDirection: isLargeScreen ? 'row' : 'column', gap: 16 }}>
                <TouchableOpacity
                  onPress={() => setChangePasswordVisible(true)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 10, backgroundColor: '#4A001A',
                    backgroundImage: 'linear-gradient(90deg, #4A001A 0%, #D86A1A 100%)',
                    borderRadius: 12,
                    paddingVertical: 14, paddingHorizontal: 20,
                    boxShadow: '0 4px 14px rgba(74, 0, 26, 0.25)',
                    elevation: 4,
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Update Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onSignOut}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 10, backgroundColor: '#4A001A',
                    backgroundImage: 'linear-gradient(90deg, #4A001A 0%, #D86A1A 100%)',
                    borderRadius: 12,
                    paddingVertical: 14, paddingHorizontal: 20,
                    boxShadow: '0 4px 14px rgba(74, 0, 26, 0.25)',
                    elevation: 4,
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </View>
    );
  };

  const getTabPermissions = (tabId) => {
    if (user && String(user.roleId) === '1') {
      return { can_view: true, can_create: true, can_edit: true, can_delete: true, full_control: true };
    }
    const tabModules = modules.filter(m => getTabIdByRoute(m.module_name, m.route) === tabId);
    if (tabModules.length === 0) {
      return { can_view: true, can_create: true, can_edit: true, can_delete: true, full_control: true };
    }
    const perms = { can_view: false, can_create: false, can_edit: false, can_delete: false, full_control: false };
    const userCompanyIds = (user?.associatedCompanyIds && user.associatedCompanyIds.length > 0)
      ? user.associatedCompanyIds.map(String)
      : (user?.companyid ? [String(user.companyid)] : []);

    const isTrue = val => val === true || String(val) === '1' || val === 1;

    tabModules.forEach(m => {
      // 1. Aggregate permissions across all assigned companies for multi-company employees
      if (userCompanyPermissions && userCompanyPermissions.length > 0 && userCompanyIds.length > 0) {
        const compPerms = userCompanyPermissions.filter(
          p => p.module_id === m.id && userCompanyIds.includes(String(p.company_id))
        );
        if (compPerms.length > 0) {
          compPerms.forEach(cp => {
            if (isTrue(cp.can_view) || isTrue(cp.full_control)) perms.can_view = true;
            if (isTrue(cp.can_create) || isTrue(cp.full_control)) perms.can_create = true;
            if (isTrue(cp.can_edit) || isTrue(cp.full_control)) perms.can_edit = true;
            if (isTrue(cp.can_delete) || isTrue(cp.full_control)) perms.can_delete = true;
            if (isTrue(cp.full_control)) perms.full_control = true;
          });
          return;
        }
      }

      // 2. Fall back to global userPermissions
      const up = userPermissions.find(p => p.module_id === m.id);
      if (up) {
        if (isTrue(up.can_view) || isTrue(up.full_control)) perms.can_view = true;
        if (isTrue(up.can_create) || isTrue(up.full_control)) perms.can_create = true;
        if (isTrue(up.can_edit) || isTrue(up.full_control)) perms.can_edit = true;
        if (isTrue(up.can_delete) || isTrue(up.full_control)) perms.can_delete = true;
        if (isTrue(up.full_control)) perms.full_control = true;
      } else {
        perms.can_view = true;
        perms.can_create = true;
        perms.can_edit = true;
        perms.can_delete = true;
        perms.full_control = true;
      }
    });
    return perms;
  };

  const checkRowPermission = (tabId, companyId, action) => {
    if (user && String(user.roleId) === '1') {
      return true; // Super Admin has full control
    }
    
    // Find modules belonging to this tabId
    const tabModules = modules.filter(m => getTabIdByRoute(m.module_name, m.route) === tabId);
    if (tabModules.length === 0) {
      return true;
    }
    const moduleDbIds = tabModules.map(m => m.id);
    const isTrue = val => val === true || String(val) === '1' || val === 1 || String(val).toLowerCase() === 'true';

    // 1. Check if there are company-specific permissions for this company
    if (companyId) {
      const compPerms = userCompanyPermissions.filter(p => String(p.company_id) === String(companyId) && moduleDbIds.includes(p.module_id));
      if (compPerms.length > 0) {
        return compPerms.some(p => {
          if (isTrue(p.full_control)) return true;
          if (action === 'view' && isTrue(p.can_view)) return true;
          if (action === 'create' && isTrue(p.can_create)) return true;
          if (action === 'edit' && isTrue(p.can_edit)) return true;
          if (action === 'delete' && isTrue(p.can_delete)) return true;
          return false;
        });
      }
    }

    // 2. Fall back to global userPermissions
    const globalPerms = userPermissions.filter(p => moduleDbIds.includes(p.module_id));
    if (globalPerms.length > 0) {
      return globalPerms.some(p => {
        if (isTrue(p.full_control)) return true;
        if (action === 'view' && isTrue(p.can_view)) return true;
        if (action === 'create' && isTrue(p.can_create)) return true;
        if (action === 'edit' && isTrue(p.can_edit)) return true;
        if (action === 'delete' && isTrue(p.can_delete)) return true;
        return false;
      });
    }

    return false;
  };

  const renderTabContent = () => {
    // Permission guard: check that the user has explicit view permissions for this module
    if (!userPermissionsLoading && !hasTabPermission(activeTab)) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color="#EF4444" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 }}>Access Denied</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', maxWidth: 400 }}>
            You do not have permission to view this section. Please contact your system administrator.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={{ color: COLORS.white, fontWeight: '700' }}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab();
      case 'shipments':
        return renderShipmentsTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'settings':
        return renderSettingsTab();
      case 'roles':
        return renderRolesTab();
      case 'departments':
        return renderDepartmentsTab();
      case 'smtp':
        return renderSmtpTab();
      case 'client':
        return renderClientTab();
      case 'company':
        return renderCompanyTab();
      case 'country':
        return renderCountryTab();
      case 'custom_fields':
        return <CustomFieldsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} />;
      case 'field_permissions':
        return <FieldPermissionsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} />;
      case 'vehicle_insurance':
        return <VehicleInsuranceTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_insurance')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_insurance', compId, act)} />;
      case 'vehicle_details':
        return <VehicleDetailsTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_details')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_details', compId, act)} />;
      case 'vehicle_purchase':
        return <VehiclePurchaseTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_purchase')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_purchase', compId, act)} />;
      case 'vehicle_toll':
        return <VehicleTollTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_toll')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_toll', compId, act)} />;
      case 'vehicle_toll_overview':
      case 'toll_overview':
        return <VehicleTollTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_toll')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_toll', compId, act)} isOverview={true} />;
      case 'vehicle_toll_transaction':
      case 'vehicle_toll_transactions':
      case 'toll_transactions':
      case 'toll_transaction':
        return <VehicleTollTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vehicle_toll')} checkRowPermission={(compId, act) => checkRowPermission('vehicle_toll', compId, act)} isTransaction={true} />;
      case 'vehicle_toll_report':
      case 'vehicle_toll_reports':
      case 'toll_report':
      case 'toll_reports':
        return <VehicleTollReportTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} />;
      case 'premises_details':
        return <PremisesDetailsTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('premises_details')} checkRowPermission={(compId, act) => checkRowPermission('premises_details', compId, act)} />;
      case 'asset_details':
        return <AssetDetailsTab user={user} showToast={showToast} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('asset_details')} checkRowPermission={(compId, act) => checkRowPermission('asset_details', compId, act)} />;
      case 'asset_category':
        return <AssetCategoryTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('asset_category')} checkRowPermission={(compId, act) => checkRowPermission('asset_category', compId, act)} />;
      case 'asset_brand':
        return <AssetBrandTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('asset_brand')} checkRowPermission={(compId, act) => checkRowPermission('asset_brand', compId, act)} />;
      case 'asset_inventory':
        return <InventoryTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('asset_inventory')} checkRowPermission={(compId, act) => checkRowPermission('asset_inventory', compId, act)} />;
      case 'asset_assignment':
        return <AssetAssignmentTab user={user} showToast={showToast} />;
      case 'supplier_details':
        return <SupplierDetailsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('supplier_details')} checkRowPermission={(compId, act) => checkRowPermission('supplier_details', compId, act)} />;
      case 'purchase_details':
        return <PurchaseDetailsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('purchase_details')} checkRowPermission={(compId, act) => checkRowPermission('purchase_details', compId, act)} />;
      case 'payment_method':
        return <PaymentMethodTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('payment_method')} checkRowPermission={(compId, act) => checkRowPermission('payment_method', compId, act)} />;
      case 'uom':
        return <UOMTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('uom')} checkRowPermission={(compId, act) => checkRowPermission('uom', compId, act)} />;
      case 'vat':
        return <VATTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('vat')} checkRowPermission={(compId, act) => checkRowPermission('vat', compId, act)} />;
      case 'plans':
        return <PlanManagementTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('plans')} checkRowPermission={(compId, act) => checkRowPermission('plans', compId, act)} />;
      case 'sim_plan':
        return <SimPlanTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('sim_plan')} checkRowPermission={(compId, act) => checkRowPermission('sim_plan', compId, act)} />;
      case 'telecom_provider':
        return <TelecomProviderTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('telecom_provider')} checkRowPermission={(compId, act) => checkRowPermission('telecom_provider', compId, act)} />;
      case 'tele_category':
        return <TeleCategoryTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('tele_category')} checkRowPermission={(compId, act) => checkRowPermission('tele_category', compId, act)} />;
      case 'tele_charge_type':
      case 'telecom_charge_type':
      case 'telecome_charge_type':
        return <TeleChargeTypeTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('tele_charge_type')} checkRowPermission={(compId, act) => checkRowPermission('tele_charge_type', compId, act)} />;
      case 'sim_details':
      case 'telecom_details':
      case 'telecome_details':
        return <SimDetailsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('sim_details')} checkRowPermission={(compId, act) => checkRowPermission('sim_details', compId, act)} title="Telecom Details" buttonLabel="+ Add Telecom Details" />;
      case 'telecom_data':
      case 'telecome_data':
        return <SimDetailsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('sim_details')} checkRowPermission={(compId, act) => checkRowPermission('sim_details', compId, act)} title="Telecom Data" buttonLabel="+ Add Telecom Data" />;
      case 'telecom_bill':
      case 'telecome_bill':
        return <TelecomBillTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('telecom_bill')} checkRowPermission={(compId, act) => checkRowPermission('telecom_bill', compId, act)} />;
      case 'usage_charges':
      case 'usage_charge':
      case 'tele_usage_charges':
      case 'tele_usage_charge':
        return <UsageChargesTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('usage_charges')} checkRowPermission={(compId, act) => checkRowPermission('usage_charges', compId, act)} />;
      case 'premium_extra_charge_type':
      case 'premium_charge_type':
      case 'extra_charge_type':
        return <PremiumExtraChargeTypeTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('premium_extra_charge_type')} checkRowPermission={(compId, act) => checkRowPermission('premium_extra_charge_type', compId, act)} />;
      case 'premium_extra_charges':
      case 'premium_charges':
      case 'extra_charges':
        return <PremiumExtraChargesTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('premium_extra_charges')} checkRowPermission={(compId, act) => checkRowPermission('premium_extra_charges', compId, act)} />;
      case 'telecom_document':
      case 'telecome_document':
      case 'tele_document':
      case 'telecom_documents':
        return <TelecomDocumentTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('telecom_document')} checkRowPermission={(compId, act) => checkRowPermission('telecom_document', compId, act)} />;
      case 'tele_doc_type':
      case 'tele_document_type':
      case 'tele_doument_type':
      case 'telecom_document_type':
        return <TeleDocTypeTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('tele_doc_type')} checkRowPermission={(compId, act) => checkRowPermission('tele_doc_type', compId, act)} />;
      case 'company_legal_form':
      case 'company_legal_forms':
        return <CompanyLegalFormTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('company_legal_form')} checkRowPermission={(compId, act) => checkRowPermission('company_legal_form', compId, act)} onRefreshOptions={fetchCompanyLegalFormOptions} />;
      case 'company_license_auth':
      case 'company_licensing_authority':
      case 'company_license_authorities':
        return <CompanyLicenseAuthTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('company_license_auth')} checkRowPermission={(compId, act) => checkRowPermission('company_license_auth', compId, act)} onRefreshOptions={fetchCompanyLicenseAuthOptions} />;
      case 'company_def_currency':
      case 'company_default_currency':
      case 'company_default_currencies':
      case 'company_def_currencies':
        return <CompanyDefCurrencyTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('company_def_currency')} checkRowPermission={(compId, act) => checkRowPermission('company_def_currency', compId, act)} onRefreshOptions={fetchCompanyDefCurrencyOptions} />;
      case 'system_settings':
      case 'system_setting':
      case 'system-settings':
      case 'system-setting':
        return <SystemSettingsTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('system_settings')} checkRowPermission={(compId, act) => checkRowPermission('system_settings', compId, act)} />;
      case 'toll_gate':
      case 'toll-gate':
      case 'toll_gates':
      case 'toll-gates':
      case 'tollgate':
      case 'tbl_toll_gate':
        return <TollGateTab user={user} showToast={showToast} renderTableToolbar={renderTableToolbar} renderTablePagination={renderTablePagination} isSidebarCollapsed={isSidebarCollapsed} permissions={getTabPermissions('toll_gate')} checkRowPermission={(compId, act) => checkRowPermission('toll_gate', compId, act)} />;
      case 'state':
        return renderStateTab();
      case 'employees':
        return renderEmployeesTab();
      case 'permissions':
        return renderPermissionsTab();
      case 'profile':
        return renderProfileTab();
      default:
        return renderDashboardTab();
    }
  };

  // Find currently selected parent module's object
  const selectedParentModule = newParentId
    ? modules.find(m => String(m.id) === newParentId)
    : null;

  const dynamicModalOverlayStyle = [
    styles.modalOverlay,
    isLargeScreen && { marginLeft: isSidebarCollapsed ? 78 : 260 }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Premium Notification Modal System */}
      <Modal
        visible={toast.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setToast(prev => ({ ...prev, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: 420,
            maxWidth: '92%',
            paddingVertical: 32,
            paddingHorizontal: 28,
            alignItems: 'center',
            shadowColor: '#72002A',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.12,
            shadowRadius: 30,
            elevation: 12,
            position: 'relative'
          }}>
            {/* Top Right Close Button Badge */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0F2', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}
              onPress={() => setToast(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#72002A" />
            </TouchableOpacity>

            {/* Concentric Circle Icon Badge with Sparkle Accents */}
            <View style={{ position: 'relative', width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginTop: 4, marginBottom: 16 }}>
              {/* Decorative sparkles & dots */}
              <View style={{ position: 'absolute', top: 6, left: 10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#72002A' }} />
              <View style={{ position: 'absolute', top: 20, left: 2 }}><Text style={{ color: '#D86A1A', fontSize: 11, fontWeight: '700' }}>✦</Text></View>
              <View style={{ position: 'absolute', bottom: 14, left: 6, width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5, borderColor: '#72002A' }} />
              
              <View style={{ position: 'absolute', top: 8, right: 14, width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: '#D86A1A' }} />
              <View style={{ position: 'absolute', top: 36, right: 4 }}><Text style={{ color: '#72002A', fontSize: 10, fontWeight: '700' }}>+</Text></View>
              <View style={{ position: 'absolute', bottom: 12, right: 12, width: 4, height: 4, borderRadius: 2, backgroundColor: '#72002A' }} />

              {/* Concentric Green Circle */}
              <View style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: '#F0FDF4',
                borderWidth: 1.5,
                borderColor: '#DCFCE7',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#16A34A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
              }}>
                <View style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}>
                  <Ionicons
                    name={
                      toast.type === 'success' ? 'checkmark' :
                      toast.type === 'error' ? 'close' :
                      toast.type === 'warning' ? 'warning-outline' : 'information'
                    }
                    size={30}
                    color={
                      toast.type === 'success' ? '#16A34A' :
                      toast.type === 'error' ? '#DC2626' :
                      toast.type === 'warning' ? '#D97706' : '#2563EB'
                    }
                  />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#59001F', textAlign: 'center', letterSpacing: -0.3 }}>
              {toast.type === 'success' ? 'Success!' : toast.type === 'error' ? 'Error!' : toast.type === 'warning' ? 'Warning!' : 'Information!'}
            </Text>

            {/* Gradient Underline Accent */}
            <View style={{ width: 44, height: 3.5, borderRadius: 2, backgroundImage: 'linear-gradient(90deg, #72002A 0%, #D86A1A 100%)', marginTop: 10, marginBottom: 18 }} />

            {/* Message Text */}
            <Text style={{ fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21, marginBottom: 28, paddingHorizontal: 12 }}>
              {toast.message}
            </Text>

            {/* Action OK Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 46,
                paddingHorizontal: 44,
                borderRadius: 12,
                backgroundImage: 'linear-gradient(90deg, #72002A 0%, #D86A1A 100%)',
                boxShadow: '0px 6px 18px rgba(216, 106, 26, 0.35)',
              }}
              onPress={() => setToast(prev => ({ ...prev, visible: false }))}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        visible={changePasswordVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setChangePasswordVisible(false);
          setPwdCurrent('');
          setPwdNew('');
          setPwdConfirm('');
          setShowPwdCurrent(false);
          setShowPwdNew(false);
          setShowPwdConfirm(false);
        }}
      >
        <TouchableOpacity style={dynamicModalOverlayStyle} activeOpacity={1} onPress={() => {
          setChangePasswordVisible(false);
          setPwdCurrent('');
          setPwdNew('');
          setPwdConfirm('');
          setShowPwdCurrent(false);
          setShowPwdNew(false);
          setShowPwdConfirm(false);
        }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { }}
            style={[styles.modalCard, { width: width > 768 ? 440 : '95%', maxWidth: 440, padding: 0, overflow: 'hidden' }]}
          >
            {/* Header */}
            <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Change Password</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Secure your account</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => {
                setChangePasswordVisible(false);
                setPwdCurrent('');
                setPwdNew('');
                setPwdConfirm('');
                setShowPwdCurrent(false);
                setShowPwdNew(false);
                setShowPwdConfirm(false);
              }} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ padding: 24, gap: 20 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>Current Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14 }}>
                  <Ionicons name="lock-open-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Enter current password"
                    placeholderTextColor="#94A3B8"
                    value={pwdCurrent}
                    onChangeText={setPwdCurrent}
                    secureTextEntry={!showPwdCurrent}
                    autoComplete="current-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPwdCurrent(!showPwdCurrent)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPwdCurrent ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>New Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14 }}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Enter new password (min 6 chars)"
                    placeholderTextColor="#94A3B8"
                    value={pwdNew}
                    onChangeText={setPwdNew}
                    secureTextEntry={!showPwdNew}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPwdNew(!showPwdNew)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPwdNew ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>Confirm New Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    value={pwdConfirm}
                    onChangeText={setPwdConfirm}
                    secureTextEntry={!showPwdConfirm}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPwdConfirm(!showPwdConfirm)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showPwdConfirm ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' }}
                onPress={() => {
                  setChangePasswordVisible(false);
                  setPwdCurrent('');
                  setPwdNew('');
                  setPwdConfirm('');
                  setShowPwdCurrent(false);
                  setShowPwdNew(false);
                  setShowPwdConfirm(false);
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 }, pwdLoading && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={pwdLoading}
              >
                {pwdLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ADMIN CHANGE PASSWORD MODAL */}
      <Modal
        visible={!!adminPasswordResetEmployee}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setAdminPasswordResetEmployee(null);
          setAdminNewPassword('');
          setAdminConfirmPassword('');
          setShowAdminNewPassword(false);
          setShowAdminConfirmPassword(false);
        }}
      >
        <TouchableOpacity style={dynamicModalOverlayStyle} activeOpacity={1} onPress={() => {
          setAdminPasswordResetEmployee(null);
          setAdminNewPassword('');
          setAdminConfirmPassword('');
          setShowAdminNewPassword(false);
          setShowAdminConfirmPassword(false);
        }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { }}
            style={[styles.modalCard, { width: width > 768 ? 440 : '95%', maxWidth: 440, padding: 0, overflow: 'hidden' }]}
          >
            {/* Header */}
            <View style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="key" size={20} color="#D97706" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Reset Password</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                    {adminPasswordResetEmployee?.full_name ? `For: ${adminPasswordResetEmployee.full_name}` : 'Change employee password'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => {
                setAdminPasswordResetEmployee(null);
                setAdminNewPassword('');
                setAdminConfirmPassword('');
                setShowAdminNewPassword(false);
                setShowAdminConfirmPassword(false);
              }} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={{ padding: 24, gap: 20 }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>New Password</Text>
                  <TouchableOpacity onPress={handleGenerateRandomPassword} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="sparkles" size={13} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>Auto-Generate Key</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14 }}>
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Enter new password (min 6 chars)"
                    placeholderTextColor="#94A3B8"
                    value={adminNewPassword}
                    onChangeText={setAdminNewPassword}
                    secureTextEntry={!showAdminNewPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowAdminNewPassword(!showAdminNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showAdminNewPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8 }}>Confirm New Password</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14 }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 14, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    value={adminConfirmPassword}
                    onChangeText={setAdminConfirmPassword}
                    secureTextEntry={!showAdminConfirmPassword}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showAdminConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' }}
                onPress={() => {
                  setAdminPasswordResetEmployee(null);
                  setAdminNewPassword('');
                  setAdminConfirmPassword('');
                  setShowAdminNewPassword(false);
                  setShowAdminConfirmPassword(false);
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 }, adminPwdLoading && { opacity: 0.7 }]}
                onPress={handleAdminChangePassword}
                disabled={adminPwdLoading}
              >
                {adminPwdLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      <Modal
        visible={deleteConfirmationVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteConfirmationVisible(false)}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 480 : '95%', maxWidth: 480 }]}>

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: '#FEE2E2' }]}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="warning" size={24} color={COLORS.error} />
                <Text style={[styles.modalTitle, { color: COLORS.error }]}>Confirm Deletion</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeleteConfirmationVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <View style={styles.modalForm}>
              <Text style={{ fontSize: 15, color: COLORS.textPrimary, marginBottom: SPACING.md, lineHeight: 22 }}>
                Are you sure you want to delete <Text style={{ fontWeight: '700' }}>{deleteTargetName}</Text>?
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 }}>
                This will soft-delete the selected {deleteTargetType}. This action is reversible but requires database administrative intervention.
              </Text>

              <Text style={styles.modalLabel}>Type <Text style={{ color: COLORS.error, fontWeight: '800' }}>YES</Text> to confirm *</Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type YES here"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteConfirmationVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: deleteConfirmText.trim() === 'YES' ? COLORS.error : '#FDA4AF',
                    opacity: deleteConfirmText.trim() === 'YES' ? 1.0 : 0.6
                  }
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText.trim() !== 'YES'}
              >
                <Text style={styles.modalSaveText}>YES</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD MODULE MODAL OVERLAY */}
      <Modal
        visible={isAddModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsParentDropdownOpen(false);
          setIsAddModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <MaterialCommunityIcons name={editingModule ? "layers" : "layers-plus"} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingModule ? 'Edit System Module' : 'Add System Module'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsParentDropdownOpen(false);
                  setIsAddModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 260 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalForm}>
                {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

                {/* Module Name Input */}
                <Text style={styles.modalLabel}>Module Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Invoicing"
                  placeholderTextColor={COLORS.textMuted}
                  value={newModuleName}
                  onChangeText={setNewModuleName}
                />

                {/* Parent Module Selector (DROPDOWN WITH MODULE NAMES) */}
                <Text style={styles.modalLabel}>Parent Module (Optional)</Text>

                <TouchableOpacity
                  style={[styles.dropdownSelector, isParentDropdownOpen && styles.dropdownSelectorOpen]}
                  onPress={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownSelectorText, !newParentId && styles.dropdownSelectorTextEmpty]}>
                    {selectedParentModule
                      ? `${selectedParentModule.module_name} (#${selectedParentModule.id})`
                      : 'None (Top-Level Parent Module)'}
                  </Text>
                  <Ionicons
                    name={isParentDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {/* Custom Scrollable Dropdown Menu Drawer */}
                {isParentDropdownOpen && (
                  <View style={styles.dropdownListContainer}>
                    <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>

                      {/* None Option */}
                      <TouchableOpacity
                        style={[
                          styles.dropdownOptionItem,
                          !newParentId && styles.dropdownOptionItemActive,
                        ]}
                        onPress={() => {
                          setNewParentId('');
                          setIsParentDropdownOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, !newParentId && styles.dropdownOptionTextActive]}>
                          None (Top-Level Parent Module)
                        </Text>
                      </TouchableOpacity>

                      {/* Populate options with existing DB module names */}
                      {modules.map((mod) => (
                        <TouchableOpacity
                          key={mod.id}
                          style={[
                            styles.dropdownOptionItem,
                            newParentId === String(mod.id) && styles.dropdownOptionItemActive,
                          ]}
                          onPress={() => {
                            setNewParentId(String(mod.id));
                            setIsParentDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownOptionText, newParentId === String(mod.id) && styles.dropdownOptionTextActive]}>
                            {mod.module_name} (#{mod.id})
                          </Text>
                        </TouchableOpacity>
                      ))}

                    </ScrollView>
                  </View>
                )}

                {/* Route Path Input */}
                <Text style={styles.modalLabel}>Route Path (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. /billing"
                  placeholderTextColor={COLORS.textMuted}
                  value={newRoute}
                  onChangeText={setNewRoute}
                  autoCapitalize="none"
                />

                {/* Status Segment Selection */}
                <Text style={styles.modalLabel}>Status</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    gap: 12,
                    marginBottom: 16,
                  }}
                  onPress={() => setNewStatus(prev => (prev === 'active' ? 'inactive' : 'active'))}
                  activeOpacity={0.8}
                >
                  {/* Toggle Switch Track */}
                  <View
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: newStatus === 'active' ? '#10B981' : '#CBD5E1',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      transition: 'background-color 0.2s ease', // smooth transition on web
                    }}
                  >
                    {/* Toggle Switch Knob */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        alignSelf: newStatus === 'active' ? 'flex-end' : 'flex-start',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                        transition: 'transform 0.2s ease', // smooth transition on web
                      }}
                    />
                  </View>

                  {/* Status Badge Label */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: newStatus === 'active' ? '#D1FAE5' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: newStatus === 'active' ? '#065F46' : '#64748B',
                        fontFamily: 'Roboto',
                      }}
                    >
                      {newStatus === 'active' ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setIsParentDropdownOpen(false);
                  setIsAddModalOpen(false);
                }}
                disabled={formSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveModule}
                disabled={formSaving}
              >
                {formSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>{editingModule ? 'Update Module' : 'Save Module'}</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT COUNTRY MODAL OVERLAY */}
      <Modal
        visible={isAddCountryModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsAddCountryModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingCountry ? 'pencil-outline' : 'earth-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingCountry ? 'Edit Country' : 'Add New Country'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAddCountryModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 260 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalForm}>
                {countryFormError ? <Text style={styles.modalError}>{countryFormError}</Text> : null}

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Country Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. United Arab Emirates"
                    placeholderTextColor={COLORS.textMuted}
                    value={newCountryName}
                    onChangeText={setNewCountryName}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Controls */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setIsAddCountryModalOpen(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCountry}
                disabled={countryFormSaving}
              >
                {countryFormSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Country</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT STATE MODAL OVERLAY */}
      <Modal
        visible={isAddStateModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsAddStateModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingState ? 'pencil-outline' : 'map-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingState ? 'Edit State / Province' : 'Add New State'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAddStateModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 260 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalForm}>
                {stateFormError ? <Text style={styles.modalError}>{stateFormError}</Text> : null}

                {/* State Name Input */}
                <View style={[styles.modalInputGroup, { marginBottom: 16 }]}>
                  <Text style={styles.modalLabel}>State Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. California"
                    placeholderTextColor={COLORS.textMuted}
                    value={newStateName}
                    onChangeText={setNewStateName}
                  />
                </View>

                {/* Country Selection Dropdown */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Country *</Text>
                  <select
                    value={newStateCountryId}
                    onChange={(e) => setNewStateCountryId(e.target.value)}
                    style={{
                      height: 40,
                      borderColor: '#E2E8F0',
                      borderWidth: 1,
                      borderRadius: 6,
                      paddingHorizontal: 12,
                      backgroundColor: '#F8FAFC',
                      color: '#1E293B',
                      fontSize: 14,
                      fontFamily: 'Roboto',
                      outlineStyle: 'none', outlineWidth: 0,
                      width: '100%',
                    }}
                  >
                    <option value="">-- Select Country --</option>
                    {countries
                      .filter(c => c.is_deleted === 0)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Controls */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setIsAddStateModalOpen(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveState}
                disabled={stateFormSaving}
              >
                {stateFormSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save State</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT CLIENT MODAL OVERLAY */}
      <Modal
        visible={isAddClientModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsAddClientModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 1500 ? 1400 : '95%', maxWidth: 1400, maxHeight: '92%', display: 'flex', flexDirection: 'column' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name={editingClient ? 'pencil-outline' : 'briefcase-outline'} size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingClient ? 'Edit Client Registry' : 'Register New Client'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAddClientModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Stepper Navigation Indicator */}
            <View style={styles.wizardStepperContainer}>
              {[
                { step: 1, label: 'Identity', icon: 'business-outline' },
                { step: 2, label: 'License', icon: 'card-outline' },
                { step: 3, label: 'Location', icon: 'location-outline' },
                { step: 4, label: 'Limits', icon: 'speedometer-outline' }
              ].map((item, idx) => {
                const isActive = clientWizardStep === item.step;
                const isCompleted = clientWizardStep > item.step;
                return (
                  <React.Fragment key={item.step}>
                    <TouchableOpacity
                      style={styles.wizardStepItem}
                      onPress={() => {
                        // Validate previous steps before jumping forward
                        if (item.step > 1 && !clientName.trim()) {
                          setClientFormError('Client name is required.');
                          return;
                        }
                        setClientFormError('');
                        setClientWizardStep(item.step);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.wizardStepCircle,
                        isActive && styles.wizardStepCircleActive,
                        isCompleted && styles.wizardStepCircleCompleted
                      ]}>
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={14} color={COLORS.white} />
                        ) : (
                          <Ionicons name={item.icon} size={14} color={isActive ? COLORS.white : COLORS.textSecondary} />
                        )}
                      </View>
                      {width > 600 && (
                        <Text style={[
                          styles.wizardStepLabel,
                          isActive && styles.wizardStepLabelActive,
                          isCompleted && styles.wizardStepLabelCompleted
                        ]}>
                          {item.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                    {idx < 4 && (
                      <View style={[
                        styles.wizardStepLine,
                        clientWizardStep > item.step && styles.wizardStepLineActive
                      ]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Modal Form Content */}
            <View style={[styles.modalForm, { flex: 1, minHeight: 0, marginBottom: 12 }]}>
              {clientFormError ? <Text style={styles.modalError}>{clientFormError}</Text> : null}

              <ScrollView style={{ flex: 1, paddingRight: 8 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* STEP 1: IDENTITY & INDUSTRY */}
                {clientWizardStep === 1 && (
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.primary, marginBottom: 12, marginTop: 4 }}>
                      I. Identity & Industry
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Client Name *</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. John Doe Enterprises"
                          placeholderTextColor={COLORS.textMuted}
                          value={clientName}
                          onChangeText={setClientName}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Company Name</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. Acme Corporation"
                          placeholderTextColor={COLORS.textMuted}
                          value={companyName}
                          onChangeText={setCompanyName}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Company Shortname</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. ACME"
                          placeholderTextColor={COLORS.textMuted}
                          value={companyShortname}
                          onChangeText={setCompanyShortname}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Industry</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. Logistics, Supply Chain"
                          placeholderTextColor={COLORS.textMuted}
                          value={industry}
                          onChangeText={setIndustry}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Subscription Plan</Text>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          style={{
                            height: 40,
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                            borderRadius: 6,
                            paddingHorizontal: 12,
                            backgroundColor: '#F8FAFC',
                            color: '#1E293B',
                            fontSize: 14,
                            fontFamily: 'Roboto',
                            outlineStyle: 'none',
                            outlineWidth: 0,
                            width: '100%',
                          }}
                        >
                          <option value="">Select a Subscription Plan</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.plan_name} ($${parseFloat(p.price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </View>
                    </View>
                  </View>
                )}

                {/* STEP 2: CONTACT & LICENSE */}
                {clientWizardStep === 2 && (
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.primary, marginBottom: 12, marginTop: 4 }}>
                      II. Contact & License
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Email Address</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. contact@acme.com"
                          placeholderTextColor={COLORS.textMuted}
                          value={clientEmail}
                          onChangeText={setClientEmail}
                          keyboardType="email-address"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Website URL</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. https://acme.com"
                          placeholderTextColor={COLORS.textMuted}
                          value={website}
                          onChangeText={setWebsite}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Phone Number</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 971501234567"
                          placeholderTextColor={COLORS.textMuted}
                          value={phoneNo}
                          onChangeText={setPhoneNo}
                          keyboardType="phone-pad"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Contact Mobile</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 971509998887"
                          placeholderTextColor={COLORS.textMuted}
                          value={contactNo}
                          onChangeText={setContactNo}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>TRN Number (Tax Registration)</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 100234891200003"
                          placeholderTextColor={COLORS.textMuted}
                          value={trnNo}
                          onChangeText={setTrnNo}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Trade License Number</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. TL-882910"
                          placeholderTextColor={COLORS.textMuted}
                          value={tradeLicenseno}
                          onChangeText={setTradeLicenseno}
                        />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Client Status *</Text>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 6,
                            gap: 12,
                          }}
                          onPress={() => setClientStatus(prev => (prev === 1 ? 0 : 1))}
                          activeOpacity={0.8}
                        >
                          {/* Toggle Switch Track */}
                          <View
                            style={{
                              width: 52,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: clientStatus === 1 ? '#10B981' : '#CBD5E1',
                              justifyContent: 'center',
                              paddingHorizontal: 3,
                              transition: 'background-color 0.2s ease', // smooth transition on web
                            }}
                          >
                            {/* Toggle Switch Knob */}
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: '#FFFFFF',
                                alignSelf: clientStatus === 1 ? 'flex-end' : 'flex-start',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.2,
                                shadowRadius: 1.5,
                                elevation: 2,
                                transition: 'transform 0.2s ease', // smooth transition on web
                              }}
                            />
                          </View>

                          {/* Status Badge Label */}
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              backgroundColor: clientStatus === 1 ? '#D1FAE5' : '#F1F5F9',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '700',
                                color: clientStatus === 1 ? '#065F46' : '#64748B',
                                fontFamily: 'Roboto',
                              }}
                            >
                              {clientStatus === 1 ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1 }} />
                    </View>
                  </View>
                )}

                {/* STEP 3: LOCATION DETAILS */}
                {clientWizardStep === 3 && (
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.primary, marginBottom: 12, marginTop: 4 }}>
                      III. Location Details
                    </Text>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.modalLabel}>Full Address</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. 104 Al Meydan Rd, Nad Al Sheba 1"
                        placeholderTextColor={COLORS.textMuted}
                        value={address}
                        onChangeText={setAddress}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Country *</Text>
                        <select
                          value={country}
                          onChange={(e) => {
                            setCountry(e.target.value);
                            setStateName(''); // Reset state selection when country changes
                          }}
                          style={{
                            height: 40,
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                            borderRadius: 6,
                            paddingHorizontal: 12,
                            backgroundColor: '#F8FAFC',
                            color: '#1E293B',
                            fontSize: 14,
                            fontFamily: 'Roboto',
                            outlineStyle: 'none', outlineWidth: 0,
                            width: '100%',
                          }}
                        >
                          <option value="">-- Select Country --</option>
                          {countries
                            .filter(c => c.is_deleted !== 1)
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>State / Province *</Text>
                        <select
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          disabled={!country}
                          style={{
                            height: 40,
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                            borderRadius: 6,
                            paddingHorizontal: 12,
                            backgroundColor: !country ? '#F1F5F9' : '#F8FAFC',
                            color: !country ? '#94A3B8' : '#1E293B',
                            fontSize: 14,
                            fontFamily: 'Roboto',
                            outlineStyle: 'none', outlineWidth: 0,
                            width: '100%',
                          }}
                        >
                          {!country ? (
                            <option value="">-- Select Country First --</option>
                          ) : (
                            <>
                              <option value="">-- Select State --</option>
                              {states
                                .filter(s => Number(s.country_id) === Number(country) && s.is_deleted !== 1)
                                .map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                            </>
                          )}
                        </select>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>City</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. Dubai"
                          placeholderTextColor={COLORS.textMuted}
                          value={city}
                          onChangeText={setCity}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* STEP 4: MODULE PERMISSIONS & SELECTION */}

                {/* STEP 5: LICENSE LIMITS & VOLUMES */}
                {clientWizardStep === 4 && (
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: COLORS.primary, marginBottom: 12, marginTop: 4 }}>
                      IV. License Limits & Volumes
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Max Companies Allowed</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 5"
                          placeholderTextColor={COLORS.textMuted}
                          value={maxCompanies}
                          onChangeText={setMaxCompanies}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Max Employees Allowed</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 50"
                          placeholderTextColor={COLORS.textMuted}
                          value={maxEmployess}
                          onChangeText={setMaxEmployess}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Max Assets Allowed</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. 1000"
                          placeholderTextColor={COLORS.textMuted}
                          value={maxAsset}
                          onChangeText={setMaxAsset}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                )}

              </ScrollView>
            </View>

            {/* Modal Buttons (Wizard Footer Navigation) */}
            <View style={[styles.modalFooter, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                {clientWizardStep > 1 ? (
                  <TouchableOpacity
                    style={styles.wizardPrevBtn}
                    onPress={() => setClientWizardStep(prev => prev - 1)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.wizardPrevText}>Previous</Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[styles.wizardPrevBtn, { borderColor: '#E2E8F0', opacity: 0.5 }]}
                  >
                    <Ionicons name="arrow-back" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={[styles.wizardPrevText, { color: '#94A3B8' }]}>Previous</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsAddClientModalOpen(false)}
                  disabled={clientFormSaving}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                {clientWizardStep < 4 ? (
                  <TouchableOpacity
                    style={styles.wizardNextBtn}
                    onPress={() => {
                      // Basic validation for Step 1
                      if (clientWizardStep === 1 && !clientName.trim()) {
                        setClientFormError('Client name is required.');
                        return;
                      }
                      setClientFormError('');
                      setClientWizardStep(prev => prev + 1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.wizardNextText}>Next</Text>
                    <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSaveClient}
                    disabled={clientFormSaving}
                  >
                    {clientFormSaving ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.modalSaveText}>{editingClient ? 'Update Client' : 'Register Client'}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT ROLE MODAL OVERLAY */}
      <Modal
        visible={isAddRoleModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsAddRoleModalOpen(false);
          setEditingRole(null);
          setNewRoleName('');
          setNewRoleStatus(1);
          setNewRoleClientIds([]);
          setIsCompanyDropdownOpen(false);
          setRolePermissions([]);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[
            styles.modalCard,
            {
              width: activeTab === 'roles' ? (width > 600 ? 550 : '95%') : (width > 992 ? 880 : (width > 768 ? 780 : '95%')),
              maxWidth: activeTab === 'roles' ? 580 : 900,
              maxHeight: '90%'
            }
          ]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="people-outline" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingRole ? 'Edit Security Role' : 'Add Security Role'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsAddRoleModalOpen(false);
                  setEditingRole(null);
                  setNewRoleName('');
                  setNewRoleStatus(1);
                  setNewRoleClientIds([]);
                  setIsCompanyDropdownOpen(false);
                  setRolePermissions([]);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 260 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalForm}>
                {roleFormError ? <Text style={styles.modalError}>{roleFormError}</Text> : null}

                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16, flexWrap: 'wrap', zIndex: 999 }}>
                  {/* Role Name Input */}
                  <View style={{ flex: 1, minWidth: 250 }}>
                    <Text style={styles.modalLabel}>Role Title *</Text>
                    {activeTab === 'roles' ? (
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. Driver"
                        style={{
                          height: 40,
                          borderColor: '#E2E8F0',
                          borderWidth: 1.5,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          backgroundColor: '#FFFFFF',
                          color: '#1E293B',
                          fontSize: 14,
                          fontFamily: 'Roboto',
                          outlineStyle: 'none',
                          outlineWidth: 0,
                          width: '100%',
                          marginTop: 6,
                          boxSizing: 'border-box'
                        }}
                      />
                    ) : (
                      <select
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        style={{
                          height: 40,
                          borderColor: '#E2E8F0',
                          borderWidth: 1.5,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          backgroundColor: '#FFFFFF',
                          color: '#1E293B',
                          fontSize: 14,
                          fontFamily: 'Roboto',
                          outlineStyle: 'none',
                          outlineWidth: 0,
                          width: '100%',
                          marginTop: 6,
                        }}
                      >
                        <option value="">-- Select Role Title --</option>
                        {(() => {
                          const uniqueRoles = new Set(roles.map(r => r.role));
                          if (newRoleName) {
                            uniqueRoles.add(newRoleName);
                          }
                          return Array.from(uniqueRoles).filter(Boolean).map((roleName) => (
                            <option key={roleName} value={roleName}>
                              {roleName}
                            </option>
                          ));
                        })()}
                      </select>
                    )}
                  </View>

                  {/* Company Multi-Select Dropdown */}
                  {activeTab !== 'roles' && (
                    <View style={{ flex: 1, minWidth: 250, position: 'relative', zIndex: 100 }}>
                      <Text style={styles.modalLabel}>Company</Text>
                      <TouchableOpacity
                        style={{
                          minHeight: 44,
                          borderColor: isCompanyDropdownOpen ? COLORS.primary : '#E2E8F0',
                          borderWidth: 1.5,
                          borderRadius: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          backgroundColor: '#FFFFFF',
                          justifyContent: 'center',
                          width: '100%',
                          cursor: 'pointer',
                          marginTop: 6,
                          shadowColor: isCompanyDropdownOpen ? COLORS.primary : 'transparent',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: isCompanyDropdownOpen ? 2 : 0,
                        }}
                        onPress={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                        activeOpacity={0.9}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                            {newRoleClientIds.length > 0 ? (
                              newRoleClientIds.map(id => {
                                const sel = companies.find(c => String(c.id) === String(id));
                                return (
                                  <View
                                    key={id}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      backgroundColor: '#F1F5F9',
                                      borderColor: '#E2E8F0',
                                      borderWidth: 1,
                                      borderRadius: 6,
                                      paddingLeft: 10,
                                      paddingRight: 6,
                                      paddingVertical: 4,
                                      gap: 6
                                    }}
                                  >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }}>
                                      {sel ? sel.company_name : `Company #${id}`}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        setNewRoleClientIds(prev => prev.filter(x => String(x) !== String(id)));
                                      }}
                                      style={{
                                        backgroundColor: '#CBD5E1',
                                        borderRadius: 10,
                                        width: 16,
                                        height: 16,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <Ionicons name="close" size={11} color="#475569" />
                                    </TouchableOpacity>
                                  </View>
                                );
                              })
                            ) : (
                              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Select Company</Text>
                            )}
                          </View>
                          <Ionicons name={isCompanyDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color={isCompanyDropdownOpen ? COLORS.primary : COLORS.textSecondary} />
                        </View>
                      </TouchableOpacity>

                      {isCompanyDropdownOpen && (
                        <View style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderWidth: 1,
                          borderRadius: 12,
                          zIndex: 99999,
                          maxHeight: 250,
                          overflowY: 'auto',
                          shadowColor: '#0F172A',
                          shadowOffset: { width: 0, height: 12 },
                          shadowOpacity: 0.12,
                          shadowRadius: 24,
                          elevation: 10,
                          marginTop: 1,
                          paddingVertical: 6,
                        }}>


                          {/* List of Companies (filtered depending on logged-in user) */}
                          {(() => {
                            let filteredCompanies = (user && String(user.roleId) !== '1' && user.clientid)
                              ? companies.filter(c => Number(c.clientid) === Number(user.clientid))
                              : companies;

                            if (filteredCompanies.length === 0) {
                              return (
                                <View style={{ padding: 16, alignItems: 'center' }}>
                                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>No companies found under this client.</Text>
                                </View>
                              );
                            }

                            return filteredCompanies.map(c => {
                              const isSelected = newRoleClientIds.some(x => String(x) === String(c.id));
                              const clientObj = clients.find(cl => Number(cl.id) === Number(c.clientid));
                              const clientName = clientObj ? clientObj.client_name : '';

                              return (
                                <TouchableOpacity
                                  key={c.id}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#F8FAFC',
                                    gap: 12,
                                    backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                                  }}
                                  onPress={() => {
                                    if (isSelected) {
                                      setNewRoleClientIds(prev => prev.filter(x => String(x) !== String(c.id)));
                                    } else {
                                      setNewRoleClientIds(prev => [...prev, String(c.id)]);
                                    }
                                  }}
                                >
                                  <View style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    borderWidth: 1.5,
                                    borderColor: isSelected ? COLORS.primary : '#CBD5E1',
                                    backgroundColor: isSelected ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? COLORS.primary : '#334155' }}>
                                      {c.company_name}
                                    </Text>
                                    {clientName ? (
                                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                                        {clientName}
                                      </Text>
                                    ) : null}
                                  </View>
                                </TouchableOpacity>
                              );
                            });
                          })()}
                        </View>
                      )}
                    </View>
                  )}
                </View>
                
                                {/* Status Segment Selection */}
                <Text style={styles.modalLabel}>Status</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    gap: 12,
                    marginBottom: 16,
                  }}
                  onPress={() => setNewRoleStatus(prev => (prev === 1 ? 0 : 1))}
                  activeOpacity={0.8}
                >
                  {/* Toggle Switch Track */}
                  <View
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: newRoleStatus === 1 ? '#10B981' : '#CBD5E1',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Toggle Switch Knob */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        alignSelf: newRoleStatus === 1 ? 'flex-end' : 'flex-start',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </View>

                  {/* Status Badge Label */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: newRoleStatus === 1 ? '#D1FAE5' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: newRoleStatus === 1 ? '#065F46' : '#64748B',
                        fontFamily: 'Roboto',
                      }}
                    >
                      {newRoleStatus === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* MODULAR PERMISSIONS MATRIX */}
                {activeTab !== 'roles' && (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                      <Text style={styles.modalLabel}>Modular Permissions</Text>
                      {newRoleClientIds.length > 1 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary }}>Target Company:</Text>
                          <select
                            value={modalPermissionCompanyId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setModalPermissionCompanyId(val);
                              const fetchCompId = val === 'all'
                                ? (newRoleClientIds.length > 0 ? newRoleClientIds[0] : '')
                                : val;
                              if (editingRole) {
                                fetchRolePermissions(editingRole.id, fetchCompId);
                              }
                            }}
                            style={{
                              height: 32,
                              borderColor: '#CBD5E1',
                              borderWidth: 1,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              backgroundColor: '#FFFFFF',
                              color: '#1E293B',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            <option value="all">All Assigned Companies</option>
                            {newRoleClientIds.map(id => {
                              const comp = companies.find(c => String(c.id) === String(id));
                              return (
                                <option key={id} value={id}>
                                  {comp ? comp.company_name : `Company #${id}`}
                                </option>
                              );
                            })}
                          </select>
                        </View>
                      )}
                    </View>
                    {permissionsLoading ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>Loading permissions...</Text>
                      </View>
                    ) : rolePermissions.length > 0 ? (
                      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>
                        <View style={[styles.modulesTableWrapper, { minWidth: 600, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 10 }]}>
                          {/* Table Header Row */}
                          <View style={[styles.modulesTableHeader, { backgroundColor: '#F8FAFC', paddingVertical: 8 }]}>
                            <Text style={[styles.thCell, { flex: 2.2, fontSize: 12 }]}>System Module</Text>
                            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>View</Text>
                            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>Create</Text>
                            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>Edit</Text>
                            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>Delete</Text>
                            <Text style={[styles.thCell, { flex: 1.0, textAlign: 'center', fontWeight: 'bold', color: COLORS.primary, fontSize: 12 }]}>Full Control</Text>
                          </View>

                          {/* Table Data Rows */}
                          {rolePermissions.map((item, index) => {
                            const isParent = item.parent_id === null || item.parent_id === undefined;

                            return (
                              <View
                                key={item.module_id}
                                style={[
                                  styles.modulesTableRow,
                                  index === rolePermissions.length - 1 && styles.lastTableRow,
                                  { paddingVertical: 8 }
                                ]}
                              >
                                <View style={[styles.tdCell, { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                  {!isParent && (
                                    <View style={{ width: 10, height: 1, backgroundColor: '#CBD5E1', marginRight: 2 }} />
                                  )}
                                  <Ionicons
                                    name={isParent ? "folder-outline" : "document-text-outline"}
                                    size={12}
                                    color={isParent ? COLORS.primary : COLORS.textSecondary}
                                  />
                                  <Text style={{
                                    color: COLORS.textPrimary,
                                    fontWeight: isParent ? '700' : '500',
                                    fontSize: isParent ? 12 : 11,
                                  }}>
                                    {item.module_name}
                                  </Text>
                                </View>

                                {/* View Checkbox */}
                                <View style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      borderWidth: 1.5,
                                      borderColor: item.can_view ? COLORS.primary : '#94A3B8',
                                      backgroundColor: item.can_view ? COLORS.primary : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'can_view')}
                                    activeOpacity={0.7}
                                  >
                                    {item.can_view && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>

                                {/* Create Checkbox */}
                                <View style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      borderWidth: 1.5,
                                      borderColor: item.can_create ? COLORS.primary : '#94A3B8',
                                      backgroundColor: item.can_create ? COLORS.primary : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'can_create')}
                                    activeOpacity={0.7}
                                  >
                                    {item.can_create && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>

                                {/* Edit Checkbox */}
                                <View style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      borderWidth: 1.5,
                                      borderColor: item.can_edit ? COLORS.primary : '#94A3B8',
                                      backgroundColor: item.can_edit ? COLORS.primary : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'can_edit')}
                                    activeOpacity={0.7}
                                  >
                                    {item.can_edit && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>

                                {/* Delete Checkbox */}
                                <View style={[styles.tdCell, { flex: 0.8, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      borderWidth: 1.5,
                                      borderColor: item.can_delete ? COLORS.primary : '#94A3B8',
                                      backgroundColor: item.can_delete ? COLORS.primary : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'can_delete')}
                                    activeOpacity={0.7}
                                  >
                                    {item.can_delete && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>

                                {/* Full Control Checkbox */}
                                <View style={[styles.tdCell, { flex: 1.0, alignItems: 'center' }]}>
                                  <TouchableOpacity
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      borderWidth: 1.5,
                                      borderColor: item.full_control ? COLORS.success : '#94A3B8',
                                      backgroundColor: item.full_control ? COLORS.success : 'transparent',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                    onPress={() => togglePermission(item.module_id, 'full_control')}
                                    activeOpacity={0.7}
                                  >
                                    {item.full_control && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    ) : (
                      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No permissions available.</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setIsAddRoleModalOpen(false);
                  setEditingRole(null);
                  setNewRoleName('');
                  setNewRoleStatus(1);
                  setRolePermissions([]);
                }}
                disabled={roleFormSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveRole}
                disabled={roleFormSaving}
              >
                {roleFormSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>{editingRole ? 'Update Role' : 'Save Role'}</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT DEPARTMENT MODAL OVERLAY */}
      <Modal
        visible={isAddDepartmentModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setIsAddDepartmentModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingDepartment ? 'Edit Department' : 'Add Department'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddDepartmentModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 260 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalForm}>
                {deptFormError ? <Text style={styles.modalError}>{deptFormError}</Text> : null}

                {/* Department Name Input */}
                <Text style={styles.modalLabel}>Department Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Fleet Logistics"
                  placeholderTextColor={COLORS.textMuted}
                  value={newDeptName}
                  onChangeText={setNewDeptName}
                />

                {/* Status Segment Selection */}
                <Text style={styles.modalLabel}>Status</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    gap: 12,
                    marginBottom: 16,
                  }}
                  onPress={() => setNewDeptStatus(prev => (prev === 1 ? 0 : 1))}
                  activeOpacity={0.8}
                >
                  {/* Toggle Switch Track */}
                  <View
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: newDeptStatus === 1 ? '#10B981' : '#CBD5E1',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Toggle Switch Knob */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        alignSelf: newDeptStatus === 1 ? 'flex-end' : 'flex-start',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </View>

                  {/* Status Badge Label */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: newDeptStatus === 1 ? '#D1FAE5' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: newDeptStatus === 1 ? '#065F46' : '#64748B',
                        fontFamily: 'Roboto',
                      }}
                    >
                      {newDeptStatus === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddDepartmentModalOpen(false)}
                disabled={deptFormSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveDepartment}
                disabled={deptFormSaving}
              >
                {deptFormSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>{editingDepartment ? 'Update Dept' : 'Save Dept'}</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* VIEW CLIENT COMPANIES MODAL OVERLAY */}
      <Modal
        visible={isViewClientCompaniesModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsViewClientCompaniesModalOpen(false)}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 600 : '95%', maxWidth: 600, maxHeight: '80%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>
                  Companies under {selectedClientForView?.client_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsViewClientCompaniesModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 200, paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase' }}>
                  Registered Company Records
                </Text>
                {selectedClientForView && (
                  (() => {
                    const clientCompanies = companies.filter(
                      c => String(c.clientid || c.client_id) === String(selectedClientForView.id)
                    );
                    if (clientCompanies.length > 0) {
                      return clientCompanies.map((c) => {
                        const companyEmployees = employees.filter(emp =>
                          emp.companies && emp.companies.some(comp => String(comp.id) === String(c.id))
                        );

                        return (
                          <View
                            key={c.id}
                            style={{
                              backgroundColor: '#F8FAFC',
                              padding: 14,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                              marginBottom: 10
                            }}
                          >
                            {/* Company Header Row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="business-outline" size={18} color={COLORS.primary} style={{ marginRight: 10 }} />
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>
                                {c.company_name} {c.short_code ? `(${c.short_code})` : ''}
                              </Text>
                            </View>

                            {/* Employees Under Company */}
                            <View style={{ marginTop: 10, paddingLeft: 28, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
                                Employees ({companyEmployees.length})
                              </Text>
                              {companyEmployees.length > 0 ? (
                                companyEmployees.map(emp => (
                                  <View key={emp.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                                    <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>
                                      {emp.full_name} <Text style={{ fontSize: 11, color: COLORS.textMuted }}>({emp.role_name || 'Staff'})</Text>
                                    </Text>
                                  </View>
                                ))
                              ) : (
                                <Text style={{ color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                                  No employees registered under this company.
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      });
                    } else {
                      return (
                        <Text style={{ color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                          No companies associated with this client.
                        </Text>
                      );
                    }
                  })()
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { width: '100%', alignItems: 'center' }]}
                onPress={() => setIsViewClientCompaniesModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* VIEW EMPLOYEE ADDITIONAL COMPANIES MODAL */}
      <Modal
        visible={isViewEmpCompaniesModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsViewEmpCompaniesModalOpen(false)}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 540 : '95%', maxWidth: 540, maxHeight: '80%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="business-outline" size={24} color="#2563EB" />
                <Text style={styles.modalTitle}>
                  Companies - {selectedEmployeeForCompanies?.full_name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsViewEmpCompaniesModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView
              style={{ flexGrow: 0, maxHeight: height - 200, paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={{ paddingHorizontal: 20 }}>
                {/* Base Company Section */}
                <View style={{ marginBottom: 20, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 }}>
                    Primary Base Company
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="location-outline" size={18} color="#2563EB" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                      {selectedEmployeeForCompanies?.base_company_name ||
                        companies.find(c => Number(c.id) === Number(selectedEmployeeForCompanies?.basecompany_id))?.company_name ||
                        'Not Specified'}
                    </Text>
                  </View>
                </View>

                {/* Non-Base Companies Dropdown Section */}
                {(() => {
                  const baseCompId = selectedEmployeeForCompanies?.basecompany_id;
                  const clientCompanies = (!user || !user.clientid)
                    ? companies
                    : companies.filter(c => Number(c.clientid) === Number(user.clientid));
                  
                  const nonBaseCompanies = clientCompanies.filter(c => Number(c.id) !== Number(baseCompId));

                  return (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>
                        Company ({nonBaseCompanies.length})
                      </Text>

                      {nonBaseCompanies.length > 0 ? (
                        <View style={{ marginBottom: 16 }}>
                          <SearchableDropdown
                            data={nonBaseCompanies}
                            value={selectedNonBaseCompanyIds}
                            onChange={(val) => {
                              const arr = Array.isArray(val)
                                ? val
                                : String(val).split(',').map(s => s.trim()).filter(Boolean);
                              setSelectedNonBaseCompanyIds(arr);
                            }}
                            placeholder={`Select / View Companies (${nonBaseCompanies.length})`}
                            searchPlaceholder="Search Company..."
                            displayKey="company_name"
                            valueKey="id"
                            isMultiSelect={true}
                          />
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                            No additional non-base companies available.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20 }]}
                onPress={() => setIsViewEmpCompaniesModalOpen(false)}
                disabled={savingEmpCompanies}
              >
                <Text style={[styles.modalCancelText, { color: '#475569' }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#2563EB', paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={handleSaveEmployeeCompanies}
                disabled={savingEmpCompanies}
              >
                {savingEmpCompanies ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={[styles.modalSubmitText, { color: '#FFFFFF', fontWeight: '600' }]}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ADD/EDIT SMTP CONFIG MODAL OVERLAY */}
      <Modal
        visible={isAddSmtpModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsAddSmtpModalOpen(false);
        }}
      >
        <View style={dynamicModalOverlayStyle}>
          <View style={[styles.modalCard, { width: width > 768 ? 800 : '95%', maxWidth: 800, maxHeight: '90%' }]}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrapper}>
                <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{editingSmtp ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddSmtpModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Modal Form Content */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalForm}>
                {smtpFormError ? <Text style={styles.modalError}>{smtpFormError}</Text> : null}

                {/* Configuration Name */}
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Configuration Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Office 365 Mailer"
                    placeholderTextColor={COLORS.textMuted}
                    value={smtpConfigName}
                    onChangeText={setSmtpConfigName}
                  />
                </View>

                {/* SMTP Host / Port Grid */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: SPACING.md }}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.modalLabel}>SMTP Host</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="smtp.office365.com"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpHost}
                      onChangeText={setSmtpHost}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>SMTP Port</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="587"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpPort}
                      onChangeText={setSmtpPort}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* SMTP Username / Password Grid */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: SPACING.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>SMTP Username</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="notify@trakio.com"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpUsername}
                      onChangeText={setSmtpUsername}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>SMTP Password</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="••••••••••••"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpPassword}
                      onChangeText={setSmtpPassword}
                      secureTextEntry={true}
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Sender Email / Sender Name Grid */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: SPACING.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>From Email</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="notify@trakio.com"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpFromEmail}
                      onChangeText={setSmtpFromEmail}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>From Name</Text>
                    <TextInput
                      style={[styles.modalInput, { marginBottom: 0 }]}
                      placeholder="Trakio Notifications"
                      placeholderTextColor={COLORS.textMuted}
                      value={smtpFromName}
                      onChangeText={setSmtpFromName}
                    />
                  </View>
                </View>

                {/* Reply-To Address */}
                <Text style={styles.modalLabel}>Reply-To Address</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="support@trakio.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={smtpReplyTo}
                  onChangeText={setSmtpReplyTo}
                  autoCapitalize="none"
                />

                {/* Security Protocol Selection */}
                <Text style={styles.modalLabel}>Security Protocol</Text>
                <View style={[styles.statusSegmentContainer, { marginBottom: SPACING.md }]}>
                  <TouchableOpacity
                    style={[
                      styles.statusSegmentBtn,
                      smtpSecurity === 'STARTTLS' && styles.statusSegmentBtnActive,
                    ]}
                    onPress={() => setSmtpSecurity('STARTTLS')}
                  >
                    <Text
                      style={[
                        styles.statusSegmentText,
                        smtpSecurity === 'STARTTLS' && styles.statusSegmentTextActive,
                      ]}
                    >
                      STARTTLS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusSegmentBtn,
                      smtpSecurity === 'SSL/TLS' && styles.statusSegmentBtnActive,
                    ]}
                    onPress={() => setSmtpSecurity('SSL/TLS')}
                  >
                    <Text
                      style={[
                        styles.statusSegmentText,
                        smtpSecurity === 'SSL/TLS' && styles.statusSegmentTextActive,
                      ]}
                    >
                      SSL/TLS
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusSegmentBtn,
                      smtpSecurity === 'None' && styles.statusSegmentBtnActive,
                    ]}
                    onPress={() => setSmtpSecurity('None')}
                  >
                    <Text
                      style={[
                        styles.statusSegmentText,
                        smtpSecurity === 'None' && styles.statusSegmentTextActive,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Status Segment Selection */}
                <Text style={styles.modalLabel}>Status</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 6,
                    gap: 12,
                    marginBottom: 16,
                  }}
                  onPress={() => setSmtpStatus(prev => (prev === 1 ? 0 : 1))}
                  activeOpacity={0.8}
                >
                  {/* Toggle Switch Track */}
                  <View
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: smtpStatus === 1 ? '#10B981' : '#CBD5E1',
                      justifyContent: 'center',
                      paddingHorizontal: 3,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Toggle Switch Knob */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#FFFFFF',
                        alignSelf: smtpStatus === 1 ? 'flex-end' : 'flex-start',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </View>

                  {/* Status Badge Label */}
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: smtpStatus === 1 ? '#D1FAE5' : '#F1F5F9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: smtpStatus === 1 ? '#065F46' : '#64748B',
                        fontFamily: 'Roboto',
                      }}
                    >
                      {smtpStatus === 1 ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={[styles.modalFooter, { marginTop: SPACING.md }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddSmtpModalOpen(false)}
                disabled={smtpSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSmtp}
                disabled={smtpSaving}
              >
                {smtpSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveText}>{editingSmtp ? 'Update Config' : 'Save Config'}</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Sidebar Mobile Backdrop Drawer */}
      {!isLargeScreen && isMobileSidebarOpen && (
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Structural Layout */}
      <View style={styles.mainLayout}>

        {/* Left Side Navigation Sidebar */}
        {isLargeScreen ? (
          <View style={[styles.sidebar, { width: isSidebarCollapsed ? 78 : 260 }]}>{renderSidebarContent()}</View>
        ) : (
          isMobileSidebarOpen && (
            <View style={[styles.sidebar, styles.sidebarMobile, { width: 260 }]}>
              {renderSidebarContent()}
            </View>
          )
        )}

        {/* Right Side Main Scroll Area */}
        <View style={styles.contentArea}>

          {/* Header (Top Navigation Menu for Mobile/Web) */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Menu Hamburger icon */}
              <TouchableOpacity
                onPress={() => isLargeScreen ? setIsSidebarCollapsed(prev => !prev) : setIsMobileSidebarOpen(true)}
                style={styles.menuHamburger}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="menu-outline" size={22} color="#4A001A" />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Trakio</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>PORTAL</Text>
                </View>
              </View>
            </View>

            {/* Global Search Bar in Header */}
            <View style={styles.headerSearchBar}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.headerSearchInput}
                placeholder="Search anything..."
                placeholderTextColor="#94A3B8"
                value={
                  activeTab === 'roles' ? rolesSearch :
                    activeTab === 'departments' ? deptsSearch :
                      activeTab === 'smtp' ? smtpSearch :
                        activeTab === 'client' ? clientsSearch :
                          activeTab === 'country' ? countriesSearch :
                            activeTab === 'state' ? statesSearch :
                              activeTab === 'settings' ? modulesSearch : ''
                }
                onChangeText={(text) => {
                  if (activeTab === 'roles') { setRolesSearch(text); setRolesPage(1); }
                  else if (activeTab === 'departments') { setDeptsSearch(text); setDeptsPage(1); }
                  else if (activeTab === 'smtp') { setSmtpSearch(text); setSmtpPage(1); }
                  else if (activeTab === 'client') { setClientsSearch(text); setClientsPage(1); }
                  else if (activeTab === 'country') { setCountriesSearch(text); setCountriesPage(1); }
                  else if (activeTab === 'state') { setStatesSearch(text); setStatesPage(1); }
                  else if (activeTab === 'settings') { setModulesSearch(text); setModulesPage(1); }
                }}
              />
              {(
                activeTab === 'roles' ? rolesSearch :
                  activeTab === 'departments' ? deptsSearch :
                    activeTab === 'smtp' ? smtpSearch :
                      activeTab === 'client' ? clientsSearch :
                        activeTab === 'country' ? countriesSearch :
                          activeTab === 'state' ? statesSearch :
                            activeTab === 'settings' ? modulesSearch : ''
              ) ? (
                <TouchableOpacity onPress={() => {
                  if (activeTab === 'roles') { setRolesSearch(''); setRolesPage(1); }
                  else if (activeTab === 'departments') { setDeptsSearch(''); setDeptsPage(1); }
                  else if (activeTab === 'smtp') { setSmtpSearch(''); setSmtpPage(1); }
                  else if (activeTab === 'client') { setClientsSearch(''); setClientsPage(1); }
                  else if (activeTab === 'country') { setCountriesSearch(''); setCountriesPage(1); }
                  else if (activeTab === 'state') { setStatesSearch(''); setStatesPage(1); }
                  else if (activeTab === 'settings') { setModulesSearch(''); setModulesPage(1); }
                }}>
                  <Ionicons name="close-circle" size={17} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Right-side: Notification Bell & User Avatar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Notification Bell Button */}
              <TouchableOpacity style={styles.headerNotificationBtn} activeOpacity={0.75}>
                <Ionicons name="notifications-outline" size={19} color="#4A001A" />
                <View style={styles.headerNotifBadge}>
                  <Text style={styles.headerNotifBadgeText}>3</Text>
                </View>
              </TouchableOpacity>

              {/* User Profile Avatar */}
              <TouchableOpacity
                style={styles.headerUserAvatar}
                onPress={() => setUserMenuOpen(prev => !prev)}
                activeOpacity={0.85}
              >
                <Text style={styles.headerUserAvatarText}>
                  {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'JS'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

            {/* ADD/EDIT COMPANY MODAL OVERLAY */}
            <Modal
              visible={isCompanyModalOpen}
              animationType="fade"
              transparent={true}
              onRequestClose={() => {
                setIsCompanyModalOpen(false);
              }}
            >
              <View style={dynamicModalOverlayStyle}>
                <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>

                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleWrapper}>
                      <Ionicons name={isCompanyViewOnly ? 'eye-outline' : editingCompany ? 'pencil-outline' : 'business-outline'} size={24} color={isCompanyViewOnly ? '#0284C7' : COLORS.primary} />
                      <Text style={styles.modalTitle}>{isCompanyViewOnly ? 'View Company Profile' : editingCompany ? 'Edit Company' : 'Add New Company'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setIsCompanyModalOpen(false);
                      }}
                      style={styles.modalCloseBtn}
                    >
                      <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Form Content */}
                  <ScrollView
                    style={{ flexGrow: 0, maxHeight: height - 260 }}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {isCompanyViewOnly ? renderCompanySinglePageView() : (
                      <View style={styles.modalForm}>

                        {/* Wizard Header Progress */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                        {[
                          { id: 1, label: 'Identity', icon: 'business-outline' },
                          { id: 2, label: 'License', icon: 'card-outline' },
                          { id: 3, label: 'Location', icon: 'location-outline' },
                          { id: 4, label: 'Modules', icon: 'grid-outline' },
                          { id: 5, label: 'Limits', icon: 'options-outline' },
                          { id: 6, label: 'Other', icon: 'ellipsis-horizontal-outline' }
                        ].map((step, index, arr) => {
                          const isActive = companyWizardStep === step.id;
                          const isPast = companyWizardStep > step.id;

                          return (
                            <React.Fragment key={step.id}>
                              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? '#0F172A' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                                  <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? '#0F172A' : '#64748B' }}>{step.label}</Text>
                              </View>
                              {index < arr.length - 1 && (
                                <View style={{ flex: 1, height: 2, backgroundColor: companyWizardStep > step.id ? '#0F172A' : '#E2E8F0', marginHorizontal: 4 }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </View>


                      {companyWizardStep === 1 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Company Name *</Text>
                            <TextInput style={styles.modalInput} placeholder="Company Name *" placeholderTextColor={COLORS.textMuted} value={companyNameInput} onChangeText={setCompanyNameInput} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Short Code</Text>
                            <TextInput style={styles.modalInput} placeholder="Short Code" placeholderTextColor={COLORS.textMuted} value={companyShortCode} onChangeText={setCompanyShortCode} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Traffic File No</Text>
                            <TextInput style={styles.modalInput} placeholder="Traffic File No" placeholderTextColor={COLORS.textMuted} value={companyTrafficFileNumber} onChangeText={setCompanyTrafficFileNumber} />
                          </View>



                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Industry</Text>
                            <TextInput style={styles.modalInput} placeholder="Industry" placeholderTextColor={COLORS.textMuted} value={companyIndustry} onChangeText={setCompanyIndustry} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Legal Form</Text>
                            <SearchableDropdown
                              data={legalFormOptions}
                              value={companyLegalForm}
                              onChange={(val) => setCompanyLegalForm(val)}
                              placeholder="Select Legal Form"
                              searchPlaceholder="Search Legal Form..."
                              displayKey="legal_form_name"
                              valueKey="legal_form_name"
                            />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Business Activity</Text>
                            <TextInput style={styles.modalInput} placeholder="Business Activity" placeholderTextColor={COLORS.textMuted} value={companyBusinessActivity} onChangeText={setCompanyBusinessActivity} />
                          </View>

                          {/* Trade License Attachment */}
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Trade License Attachment</Text>
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
                                padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
                                marginTop: 4
                              }}
                              onPress={() => {
                                if (typeof document !== 'undefined') {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '*/*';
                                  input.onchange = (e) => {
                                    const file = e.target.files[0];
                                    if (file) setCompanyTradeLicenseFile(file);
                                  };
                                  input.click();
                                }
                              }}
                            >
                              <Ionicons name="cloud-upload-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                              <Text style={{ flex: 1, color: companyTradeLicenseFile ? '#334155' : '#94A3B8', fontSize: 13, fontFamily: 'Roboto' }} numberOfLines={1}>
                                {companyTradeLicenseFile ? companyTradeLicenseFile.name : 'Upload Trade License...'}
                              </Text>
                              {companyTradeLicenseFile && (
                                <TouchableOpacity onPress={() => setCompanyTradeLicenseFile(null)} style={{ padding: 4 }}>
                                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                            </TouchableOpacity>
                          </View>

                          {/* Company Logo Attachment */}
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Company Logo</Text>
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
                                padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
                                marginTop: 4
                              }}
                              onPress={() => {
                                if (typeof document !== 'undefined') {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = e.target.files[0];
                                    if (file) setCompanyLogoFile(file);
                                  };
                                  input.click();
                                }
                              }}
                            >
                              <Ionicons name="image-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                              <Text style={{ flex: 1, color: companyLogoFile ? '#334155' : '#94A3B8', fontSize: 13, fontFamily: 'Roboto' }} numberOfLines={1}>
                                {companyLogoFile ? companyLogoFile.name : 'Upload Company Logo...'}
                              </Text>
                              {companyLogoFile && (
                                <TouchableOpacity onPress={() => setCompanyLogoFile(null)} style={{ padding: 4 }}>
                                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                            </TouchableOpacity>
                          </View>


                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Company Status</Text>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyStatus(prev => (prev === 'Active' ? 'Inactive' : 'Active'))} activeOpacity={0.8}>
                              <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyStatus === 'Active' ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyStatus === 'Active' ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                              </View>
                              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: companyStatus === 'Active' ? '#D1FAE5' : '#F1F5F9' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: companyStatus === 'Active' ? '#065F46' : '#64748B', fontFamily: 'Roboto' }}>{companyStatus === 'Active' ? 'Active' : 'Inactive'}</Text>
                              </View>
                            </TouchableOpacity>
                          </View>

                        </>
                      )}


                      {companyWizardStep === 2 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Jurisdiction</Text>
                            <TextInput style={styles.modalInput} placeholder="Jurisdiction" placeholderTextColor={COLORS.textMuted} value={companyJurisdiction} onChangeText={setCompanyJurisdiction} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Licensing Authority</Text>
                            <SearchableDropdown
                              data={licenseAuthOptions}
                              value={companyLicensingAuthority}
                              onChange={(val) => setCompanyLicensingAuthority(val)}
                              placeholder="Select Licensing Authority"
                              searchPlaceholder="Search Licensing Authority..."
                              displayKey="authority_name"
                              valueKey="authority_name"
                            />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Trade License Number</Text>
                            <TextInput style={styles.modalInput} placeholder="Trade License Number" placeholderTextColor={COLORS.textMuted} value={companyTradeLicenseNumber} onChangeText={setCompanyTradeLicenseNumber} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Trade License Issue Date</Text>
                            <View style={{ position: 'relative', width: '100%', justifyContent: 'center', marginBottom: 24 }}>
                              <input
                                type="date"
                                value={companyTradeLicenseIssueDate ? companyTradeLicenseIssueDate.split('T')[0] : ''}
                                onChange={(e) => setCompanyTradeLicenseIssueDate(e.target.value)}
                                style={{
                                  height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8,
                                  paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B',
                                  fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outlineStyle: 'none', outlineWidth: 0, width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                              </View>
                            </View>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Trade License Expiry Date</Text>
                            <View style={{ position: 'relative', width: '100%', justifyContent: 'center', marginBottom: 24 }}>
                              <input
                                type="date"
                                value={companyTradeLicenseExpiryDate ? companyTradeLicenseExpiryDate.split('T')[0] : ''}
                                onChange={(e) => setCompanyTradeLicenseExpiryDate(e.target.value)}
                                style={{
                                  height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8,
                                  paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B',
                                  fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outlineStyle: 'none', outlineWidth: 0, width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                              </View>
                            </View>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Default Currency</Text>
                            <SearchableDropdown
                              data={defCurrencyOptions.length > 0 ? defCurrencyOptions : [
                                { currency_code: 'AED', currency_name: 'UAE Dirham (AED)' },
                                { currency_code: 'USD', currency_name: 'US Dollar (USD)' },
                                { currency_code: 'EUR', currency_name: 'Euro (EUR)' },
                                { currency_code: 'GBP', currency_name: 'British Pound (GBP)' },
                                { currency_code: 'SAR', currency_name: 'Saudi Riyal (SAR)' },
                                { currency_code: 'QAR', currency_name: 'Qatari Riyal (QAR)' },
                                { currency_code: 'KWD', currency_name: 'Kuwaiti Dinar (KWD)' },
                                { currency_code: 'BHD', currency_name: 'Bahraini Dinar (BHD)' },
                                { currency_code: 'OMR', currency_name: 'Omani Rial (OMR)' },
                                { currency_code: 'INR', currency_name: 'Indian Rupee (INR)' }
                              ]}
                              value={companyDefaultCurrency}
                              onChange={(val) => setCompanyDefaultCurrency(val)}
                              placeholder="Select Default Currency"
                              searchPlaceholder="Search Currency..."
                              displayKey="currency_name"
                              valueKey="currency_code"
                            />
                          </View>

                        </>
                      )}


                      {companyWizardStep === 3 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Country</Text>
                            <select
                              value={companyCountry}
                              onChange={(e) => {
                                setCompanyCountry(e.target.value);
                                setCompanyEmirate('');
                              }}
                              style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outlineStyle: 'none', outlineWidth: 0, width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
                            >
                              <option value="">-- Select Country --</option>
                              {countries.filter(c => c.is_deleted !== 1).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Emirate</Text>
                            <select
                              value={companyEmirate}
                              onChange={(e) => setCompanyEmirate(e.target.value)}
                              disabled={!companyCountry}
                              style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: !companyCountry ? '#F1F5F9' : '#FAFAFA', color: !companyCountry ? '#94A3B8' : '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outlineStyle: 'none', outlineWidth: 0, width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
                            >
                              {!companyCountry ? (
                                <option value="">-- Select Country First --</option>
                              ) : (
                                <>
                                  <option value="">-- Select Emirate --</option>
                                  {states.filter(s => Number(s.country_id) === Number(companyCountry) && s.is_deleted !== 1).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </>
                              )}
                            </select>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Registered Address</Text>
                            <TextInput style={styles.modalInput} placeholder="Registered Address" placeholderTextColor={COLORS.textMuted} value={companyRegisteredAddress} onChangeText={setCompanyRegisteredAddress} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>PO Box</Text>
                            <TextInput style={styles.modalInput} placeholder="PO Box" placeholderTextColor={COLORS.textMuted} value={companyPoBox} onChangeText={setCompanyPoBox} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Contact Person</Text>
                            <TextInput style={styles.modalInput} placeholder="Contact Person" placeholderTextColor={COLORS.textMuted} value={companyContactPerson} onChangeText={setCompanyContactPerson} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Contact Email</Text>
                            <TextInput style={styles.modalInput} placeholder="Contact Email" placeholderTextColor={COLORS.textMuted} value={companyContactEmail} onChangeText={setCompanyContactEmail} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Contact Phone</Text>
                            <TextInput style={styles.modalInput} placeholder="Contact Phone" placeholderTextColor={COLORS.textMuted} value={companyContactPhone} onChangeText={setCompanyContactPhone} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Website</Text>
                            <TextInput style={styles.modalInput} placeholder="Website" placeholderTextColor={COLORS.textMuted} value={companyWebsite} onChangeText={setCompanyWebsite} />
                          </View>

                        </>
                      )}


                      {companyWizardStep === 4 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>VAT Registered</Text>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyVatRegistered(prev => !prev)} activeOpacity={0.8}>
                              <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyVatRegistered ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyVatRegistered ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: companyVatRegistered ? '#065F46' : '#64748B' }}>{companyVatRegistered ? 'Yes' : 'No'}</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>TRN</Text>
                            <TextInput style={styles.modalInput} placeholder="TRN" placeholderTextColor={COLORS.textMuted} value={companyTrn} onChangeText={setCompanyTrn} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Corporate Tax Reg. No.</Text>
                            <TextInput style={styles.modalInput} placeholder="Corporate Tax Reg. No." placeholderTextColor={COLORS.textMuted} value={companyCorporateTaxRegistrationNumber} onChangeText={setCompanyCorporateTaxRegistrationNumber} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Establishment Card Number</Text>
                            <TextInput style={styles.modalInput} placeholder="Establishment Card Number" placeholderTextColor={COLORS.textMuted} value={companyEstablishmentCardNumber} onChangeText={setCompanyEstablishmentCardNumber} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Establishment Card Expiry Date</Text>
                            <View style={{ position: 'relative', width: '100%', justifyContent: 'center', marginBottom: 24 }}>
                              <input
                                type="date"
                                value={companyEstablishmentCardExpiryDate ? companyEstablishmentCardExpiryDate.split('T')[0] : ''}
                                onChange={(e) => setCompanyEstablishmentCardExpiryDate(e.target.value)}
                                style={{
                                  height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8,
                                  paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B',
                                  fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outlineStyle: 'none', outlineWidth: 0, width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                              </View>
                            </View>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>MOHRE Number</Text>
                            <TextInput style={styles.modalInput} placeholder="MOHRE Number" placeholderTextColor={COLORS.textMuted} value={companyMohreNumber} onChangeText={setCompanyMohreNumber} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>WPS Registered</Text>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyWpsRegistered(prev => !prev)} activeOpacity={0.8}>
                              <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyWpsRegistered ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyWpsRegistered ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: companyWpsRegistered ? '#065F46' : '#64748B' }}>{companyWpsRegistered ? 'Yes' : 'No'}</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>NAFIS Emiratisation Applicable</Text>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyNafisEmiratisationApplicable(prev => !prev)} activeOpacity={0.8}>
                              <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyNafisEmiratisationApplicable ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyNafisEmiratisationApplicable ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: companyNafisEmiratisationApplicable ? '#065F46' : '#64748B' }}>{companyNafisEmiratisationApplicable ? 'Yes' : 'No'}</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>GPSSA Applicable</Text>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyGpssaApplicable(prev => !prev)} activeOpacity={0.8}>
                              <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyGpssaApplicable ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyGpssaApplicable ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: companyGpssaApplicable ? '#065F46' : '#64748B' }}>{companyGpssaApplicable ? 'Yes' : 'No'}</Text>
                            </TouchableOpacity>
                          </View>

                        </>
                      )}


                      {companyWizardStep === 5 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Asset Prefix</Text>
                            <TextInput style={styles.modalInput} placeholder="Asset Prefix" placeholderTextColor={COLORS.textMuted} value={companyAssetPrefix} onChangeText={setCompanyAssetPrefix} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Vehicle Prefix</Text>
                            <TextInput style={styles.modalInput} placeholder="Vehicle Prefix" placeholderTextColor={COLORS.textMuted} value={companyVehiclePrefix} onChangeText={setCompanyVehiclePrefix} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Employee Prefix</Text>
                            <TextInput style={styles.modalInput} placeholder="Employee Prefix" placeholderTextColor={COLORS.textMuted} value={companyEmployeePrefix} onChangeText={setCompanyEmployeePrefix} />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Trade License Alert Days</Text>
                            <TextInput style={styles.modalInput} placeholder="Trade License Alert Days" placeholderTextColor={COLORS.textMuted} value={companyTradeLicenseAlertDays} onChangeText={setCompanyTradeLicenseAlertDays} keyboardType="numeric" />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Establishment Card Alert Days</Text>
                            <TextInput style={styles.modalInput} placeholder="Establishment Card Alert Days" placeholderTextColor={COLORS.textMuted} value={companyEstablishmentCardAlertDays} onChangeText={setCompanyEstablishmentCardAlertDays} keyboardType="numeric" />
                          </View>

                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Insurance Alert Days</Text>
                            <TextInput style={styles.modalInput} placeholder="Insurance Alert Days" placeholderTextColor={COLORS.textMuted} value={companyInsuranceAlertDays} onChangeText={setCompanyInsuranceAlertDays} keyboardType="numeric" />
                          </View>

                        </>
                      )}


                      {companyWizardStep === 6 && (
                        <>
                          <View style={styles.modalInputGroup}>
                            <Text style={styles.modalLabel}>Party ID</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Party ID"
                              placeholderTextColor={COLORS.textMuted}
                              value={companyPartyId}
                              onChangeText={setCompanyPartyId}
                            />
                          </View>

                        </>
                      )}

                      </View>
                    )}
                  </ScrollView>

                  {/* Modal Footer Controls */}
                  <View style={[styles.modalFooter, { justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                    {isCompanyViewOnly ? (
                      <>
                        <TouchableOpacity
                          style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                          onPress={() => setIsCompanyModalOpen(false)}
                        >
                          <Text style={[styles.modalCancelText, { color: '#64748B', fontWeight: '600' }]}>Close View</Text>
                        </TouchableOpacity>

                        {editingCompany && (
                          <TouchableOpacity
                            style={[styles.modalSaveBtn, { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                            onPress={() => setIsCompanyViewOnly(false)}
                          >
                            <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
                            <Text style={[styles.modalSaveText, { fontWeight: '700' }]}>Edit Company Profile</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                          onPress={() => setIsCompanyModalOpen(false)}
                        >
                          <Text style={[styles.modalCancelText, { color: '#64748B' }]}>Cancel</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          {companyWizardStep > 1 && (
                            <TouchableOpacity
                              style={[styles.modalCancelBtn, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                              onPress={() => setCompanyWizardStep(prev => prev - 1)}
                            >
                              <Text style={[styles.modalCancelText, { color: '#475569' }]}>Previous</Text>
                            </TouchableOpacity>
                          )}

                          {companyWizardStep < 6 ? (
                            <TouchableOpacity
                              style={[styles.modalSaveBtn, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#0F172A' }]}
                              onPress={() => setCompanyWizardStep(prev => prev + 1)}
                            >
                              <Text style={[styles.modalSaveText, { fontWeight: '600' }]}>Next Step</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.modalSaveBtn, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#10B981' }]}
                              onPress={handleSaveCompany}
                            >
                              <Text style={[styles.modalSaveText, { fontWeight: '700' }]}>Save Company</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </>
                    )}
                  </View>

                </View>
              </View>
            </Modal>

            {/* User Dropdown — rendered via Modal so it always appears above everything */}
            <Modal
              visible={userMenuOpen}
              transparent={true}
              animationType="none"
              onRequestClose={() => setUserMenuOpen(false)}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => setUserMenuOpen(false)}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => { }}
                  style={styles.userMenuDropdown}
                >
                  <View style={styles.userMenuHeader}>
                    <View style={styles.userMenuAvatar}>
                      <Text style={styles.userMenuAvatarText}>
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'JS'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userMenuName} numberOfLines={1}>{user.name || 'John Smith'}</Text>
                      <Text style={styles.userMenuEmail} numberOfLines={1}>{user.email}</Text>
                    </View>
                  </View>

                  <View style={styles.userMenuDivider} />

                  <TouchableOpacity
                    style={styles.userMenuItem}
                    onPress={() => { setUserMenuOpen(false); setActiveTab('profile'); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.userMenuItemIcon, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="person-outline" size={16} color="#3B82F6" />
                    </View>
                    <Text style={styles.userMenuItemText}>Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.userMenuItem}
                    onPress={() => { setUserMenuOpen(false); setChangePasswordVisible(true); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.userMenuItemIcon, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="lock-closed-outline" size={16} color="#22C55E" />
                    </View>
                    <Text style={styles.userMenuItemText}>Change Password</Text>
                  </TouchableOpacity>

                  <View style={styles.userMenuDivider} />

                  <TouchableOpacity
                    style={styles.userMenuItem}
                    onPress={() => { setUserMenuOpen(false); onSignOut(); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.userMenuItemIcon, { backgroundColor: '#FFF1F2' }]}>
                      <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                    </View>
                    <Text style={[styles.userMenuItemText, { color: '#EF4444' }]}>Logout</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            {/* Employee Modal */}
            {isEmployeeModalOpen && (
              <Modal transparent={true} animationType="fade" visible={isEmployeeModalOpen}>
                <View style={dynamicModalOverlayStyle}>
                  <View style={[styles.modalCard, { width: width > 768 ? 720 : '95%', maxWidth: 720, maxHeight: '90%' }]}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                      <View style={styles.modalTitleWrapper}>
                        <Ionicons name={isViewOnlyEmployee ? 'eye-outline' : (editingEmployee ? 'pencil-outline' : 'person-add-outline')} size={24} color={COLORS.primary} />
                        <Text style={styles.modalTitle}>{isViewOnlyEmployee ? 'View User Details' : (editingEmployee ? 'Edit User' : 'Create User')}</Text>
                      </View>
                      <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsEmployeeModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: height - 260 }}>
                      {isViewOnlyEmployee ? (
                        <View style={{ paddingVertical: 4 }}>
                          {/* Profile Banner */}
                          <View style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: 14,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            marginBottom: 20,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 16
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                              <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: '#EEF2FF',
                                borderWidth: 2,
                                borderColor: '#C7D2FE',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary }}>
                                  {(empFullName || 'U').charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
                                  {empFullName || 'N/A'}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                                  {empEmail || 'No Email Provided'}
                                </Text>
                              </View>
                            </View>

                            <View style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                              backgroundColor: empStatus === 1 ? '#DCFCE7' : '#FEE2E2',
                              borderWidth: 1,
                              borderColor: empStatus === 1 ? '#86EFAC' : '#FCA5A5',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: empStatus === 1 ? '#16A34A' : '#DC2626' }} />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: empStatus === 1 ? '#15803D' : '#B91C1C' }}>
                                {empStatus === 1 ? 'Active Account' : 'Inactive Account'}
                              </Text>
                            </View>
                          </View>

                          {/* Details Grid */}
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Employee Information
                          </Text>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {/* Phone */}
                            <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="call-outline" size={14} color="#64748B" />
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</Text>
                              </View>
                              <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>{empPhone || 'N/A'}</Text>
                            </View>

                            {/* System Role */}
                            <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="shield-outline" size={14} color="#64748B" />
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>System Role</Text>
                              </View>
                              <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '600' }}>
                                {empRoleIds.length > 0
                                  ? roles.filter(r => empRoleIds.includes(r.id)).map(r => r.role).join(', ')
                                  : (editingEmployee?.role_name || 'No Role Assigned')}
                              </Text>
                            </View>

                            {/* Base Company */}
                            <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="business-outline" size={14} color="#64748B" />
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Base Company</Text>
                              </View>
                              <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>
                                {companies.find(c => String(c.id) === String(empBaseCompanyId))?.company_name || editingEmployee?.basecompany_name || 'N/A'}
                              </Text>
                            </View>

                            {/* Department */}
                            <View style={{ width: '48%', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <Ionicons name="briefcase-outline" size={14} color="#64748B" />
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Department</Text>
                              </View>
                              <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '600' }}>
                                {departments.find(d => String(d.id) === String(empDepartmentId))?.department_name || editingEmployee?.department_name || 'N/A'}
                              </Text>
                            </View>

                            {/* Assigned Companies */}
                            <View style={{ width: '100%', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Ionicons name="location-outline" size={14} color="#64748B" />
                                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Companies</Text>
                              </View>
                              {empAssociatedCompanies.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                  {companies
                                    .filter(c => empAssociatedCompanies.includes(c.id))
                                    .map(c => (
                                      <View key={c.id} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}>
                                        <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>{c.company_name}</Text>
                                      </View>
                                    ))}
                                </View>
                              ) : (
                                <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No additional companies assigned</Text>
                              )}
                            </View>

                            {/* Assigned Password / Security Key */}
                            <View style={{ width: '100%', backgroundColor: '#FFFBEB', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#FCD34D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                              <View style={{ flex: 1, minWidth: 200 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <Ionicons name="key-outline" size={14} color="#B45309" />
                                  <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700', textTransform: 'uppercase' }}>Assigned Password / Access Key</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                  <Text style={{ fontSize: 15, color: '#78350F', fontWeight: '700', letterSpacing: showViewCardPassword ? 0.5 : 2 }}>
                                    {editingEmployee?.assigned_password || editingEmployee?.tempPassword
                                      ? (showViewCardPassword ? (editingEmployee.assigned_password || editingEmployee.tempPassword) : '••••••••')
                                      : 'No Password Set'}
                                  </Text>
                                  {(editingEmployee?.assigned_password || editingEmployee?.tempPassword) && (
                                    <TouchableOpacity onPress={() => setShowViewCardPassword(prev => !prev)} style={{ padding: 2 }}>
                                      <Ionicons name={showViewCardPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#B45309" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                              <TouchableOpacity
                                style={{ backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                onPress={() => {
                                  setIsEmployeeModalOpen(false);
                                  handleOpenPasswordResetModal(editingEmployee);
                                }}
                              >
                                <Ionicons name="key" size={14} color="#FFFFFF" />
                                <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '700' }}>Reset / Assign Password</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.modalForm}>
                          {employeeFormError ? (
                            <Text style={styles.modalError}>{employeeFormError}</Text>
                          ) : null}

                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>Full Name</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Full Name *"
                              value={empFullName}
                              onChangeText={setEmpFullName}
                              placeholderTextColor={COLORS.textMuted}
                            />
                          </View>

                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>Email</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Email Address"
                              value={empEmail}
                              onChangeText={setEmpEmail}
                              keyboardType="email-address"
                              placeholderTextColor={COLORS.textMuted}
                            />
                          </View>

                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>Phone</Text>
                            <TextInput
                              style={styles.modalInput}
                              placeholder="Phone Number"
                              value={empPhone}
                              onChangeText={setEmpPhone}
                              keyboardType="phone-pad"
                              placeholderTextColor={COLORS.textMuted}
                            />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, zIndex: 20 }}>
                            <View style={{ flex: 1 }}>
                              {/* Label row */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={styles.modalLabel}>System Permissions Role</Text>
                                {empRoleIds.length > 0 && (
                                  <TouchableOpacity onPress={() => setEmpRoleIds([])} style={{ marginLeft: 'auto' }}>
                                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Clear</Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              {/* Dropdown trigger button */}
                              <TouchableOpacity
                                onPress={() => { setIsEmpRoleDropdownOpen(prev => !prev); setEmpRoleError(''); }}
                                style={[styles.modalInput, {
                                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                  height: 42, paddingHorizontal: 12, cursor: 'pointer', marginBottom: 0,
                                  borderColor: empRoleError ? '#EF4444' : undefined,
                                }]}
                              >
                                <Text style={{ color: empRoleIds.length > 0 ? COLORS.textPrimary : '#94A3B8', fontSize: 14, flex: 1 }} numberOfLines={1}>
                                  {empRoleIds.length > 0
                                    ? roles.filter(r => empRoleIds.includes(r.id)).map(r => r.role).join(', ')
                                    : 'Select Role'}
                                </Text>
                                {empRoleIds.length > 0 && (
                                  <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{empRoleIds.length}</Text>
                                  </View>
                                )}
                                <Ionicons name={isEmpRoleDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={isEmpRoleDropdownOpen ? COLORS.primary : '#94A3B8'} />
                              </TouchableOpacity>
                              {empRoleError ? (
                                <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 2 }}>
                                  ⚠ {empRoleError}
                                </Text>
                              ) : null}

                              {/* Dropdown checklist panel */}
                              {isEmpRoleDropdownOpen && (
                                <View style={{
                                  borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
                                  backgroundColor: '#FFFFFF', marginTop: 4,
                                  position: 'absolute', top: '100%', left: 0, right: 0,
                                  shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 },
                                  shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
                                  zIndex: 100, overflow: 'hidden'
                                }}>
                                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                    {roles.length === 0 ? (
                                      <View style={{ padding: 16, alignItems: 'center' }}>
                                        <Ionicons name="shield-outline" size={24} color="#CBD5E1" />
                                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>No roles found</Text>
                                      </View>
                                    ) : (
                                      roles.map((r, index) => {
                                        const isSelected = empRoleIds.includes(r.id);
                                        return (
                                          <TouchableOpacity
                                            key={r.id}
                                            style={{
                                              flexDirection: 'row', alignItems: 'center',
                                              paddingVertical: 11, paddingHorizontal: 14,
                                              backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                                              borderBottomWidth: index < roles.length - 1 ? 1 : 0,
                                              borderBottomColor: '#F1F5F9',
                                            }}
                                            onPress={() => {
                                              setEmpRoleIds(prev =>
                                                prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                                              );
                                            }}
                                          >
                                            {/* Custom checkbox */}
                                            <View style={{
                                              width: 20, height: 20, borderRadius: 5,
                                              borderWidth: 2,
                                              borderColor: isSelected ? '#10B981' : '#CBD5E1',
                                              backgroundColor: isSelected ? '#10B981' : '#FFFFFF',
                                              alignItems: 'center', justifyContent: 'center',
                                              marginRight: 12, flexShrink: 0
                                            }}>
                                              {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                                            </View>
                                            <Text style={{
                                              fontSize: 14, flex: 1,
                                              color: isSelected ? '#065F46' : '#475569',
                                              fontWeight: isSelected ? '600' : '400'
                                            }}>{r.role}</Text>
                                            {isSelected && (
                                              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />
                                            )}
                                          </TouchableOpacity>
                                        );
                                      })
                                    )}
                                  </ScrollView>
                                </View>
                              )}
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ width: 100, marginTop: 25 }}>
                              <Text style={[styles.modalLabel, { textAlign: 'center' }]}>Status</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                                <Switch
                                  value={empStatus === 1}
                                  onValueChange={(val) => setEmpStatus(val ? 1 : 0)}
                                  trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                                  thumbColor={COLORS.white}
                                />
                                <Text style={{ marginLeft: 8, fontSize: 13, color: empStatus === 1 ? '#10B981' : COLORS.textSecondary, fontWeight: '500' }}>
                                  {empStatus === 1 ? 'Active' : 'Inactive'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Base Company Dropdown */}
                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>Base Company</Text>
                            <SearchableDropdown
                              data={(!user || !user.clientid)
                                ? companies
                                : companies.filter(c => Number(c.clientid) === Number(user.clientid))}
                              value={empBaseCompanyId}
                              onChange={(val) => {
                                setEmpBaseCompanyId(val);
                                if (val) {
                                  const selectedCompId = Number(val);
                                  setEmpAssociatedCompanies(prev => {
                                    if (prev.includes(selectedCompId)) return prev;
                                    return [...prev, selectedCompId];
                                  });
                                }
                              }}
                              placeholder="Select Base Company"
                              searchPlaceholder="Search Base Company..."
                              displayKey="company_name"
                              valueKey="id"
                            />
                          </View>

                          {(() => {
                            const clientCompanies = (!user || !user.clientid)
                              ? companies
                              : companies.filter(c => Number(c.clientid) === Number(user.clientid));
                            const selectedNames = empAssociatedCompanies.length > 0
                              ? clientCompanies.filter(c => empAssociatedCompanies.includes(c.id)).map(c => c.company_name).join(', ')
                              : '';
                            return (
                              <View style={{ marginBottom: 16, zIndex: 10 }}>
                                {/* Label row */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                  <Text style={styles.modalLabel}>Company</Text>
                                  {empAssociatedCompanies.length > 0 && (
                                    <TouchableOpacity onPress={() => setEmpAssociatedCompanies([])} style={{ marginLeft: 'auto' }}>
                                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>Clear</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>

                                {/* Dropdown trigger button */}
                                <TouchableOpacity
                                  onPress={() => { setEmpCompanyDropdownOpen(prev => !prev); setEmpCompanyError(''); }}
                                  style={[styles.modalInput, {
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    height: 42, paddingHorizontal: 12, cursor: 'pointer', marginBottom: 0,
                                    borderColor: empCompanyError ? '#EF4444' : undefined,
                                  }]}
                                >
                                  <Text style={{ color: selectedNames ? COLORS.textPrimary : '#94A3B8', fontSize: 14, flex: 1 }} numberOfLines={1}>
                                    {selectedNames || 'Select Company'}
                                  </Text>
                                  {empAssociatedCompanies.length > 0 && (
                                    <View style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 }}>
                                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{empAssociatedCompanies.length}</Text>
                                    </View>
                                  )}
                                  <Ionicons name={empCompanyDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={empCompanyDropdownOpen ? COLORS.primary : '#94A3B8'} />
                                </TouchableOpacity>
                                {empCompanyError ? (
                                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 2 }}>
                                    ⚠ {empCompanyError}
                                  </Text>
                                ) : null}


                                {/* Dropdown checklist panel */}
                                {empCompanyDropdownOpen && (
                                  <View style={{
                                    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
                                    backgroundColor: '#FFFFFF', marginTop: 0,
                                    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
                                    overflow: 'hidden'
                                  }}>
                                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                      {clientCompanies.length === 0 ? (
                                        <View style={{ padding: 16, alignItems: 'center' }}>
                                          <Ionicons name="business-outline" size={24} color="#CBD5E1" />
                                          <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>No companies found</Text>
                                        </View>
                                      ) : (
                                        clientCompanies.map((c, index) => {
                                          const isSelected = empAssociatedCompanies.includes(c.id);
                                          return (
                                            <TouchableOpacity
                                              key={c.id}
                                              style={{
                                                flexDirection: 'row', alignItems: 'center',
                                                paddingVertical: 11, paddingHorizontal: 14,
                                                backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                                                borderBottomWidth: index < clientCompanies.length - 1 ? 1 : 0,
                                                borderBottomColor: '#F1F5F9',
                                              }}
                                              onPress={() => {
                                                setEmpAssociatedCompanies(prev =>
                                                  prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                );
                                              }}
                                            >
                                              {/* Custom checkbox */}
                                              <View style={{
                                                width: 20, height: 20, borderRadius: 5,
                                                borderWidth: 2,
                                                borderColor: isSelected ? '#10B981' : '#CBD5E1',
                                                backgroundColor: isSelected ? '#10B981' : '#FFFFFF',
                                                alignItems: 'center', justifyContent: 'center',
                                                marginRight: 12, flexShrink: 0
                                              }}>
                                                {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                                              </View>
                                              <Text style={{
                                                fontSize: 14, flex: 1,
                                                color: isSelected ? '#065F46' : '#475569',
                                                fontWeight: isSelected ? '600' : '400'
                                              }}>{c.company_name}</Text>
                                              {isSelected && (
                                                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />
                                              )}
                                            </TouchableOpacity>
                                          );
                                        })
                                      )}
                                    </ScrollView>
                                  </View>
                                )}
                              </View>
                            );
                          })()}


                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.modalLabel}>Department</Text>
                            <SearchableDropdown
                              data={departments}
                              value={empDepartmentId}
                              onChange={(val) => setEmpDepartmentId(val)}
                              placeholder="Select Department"
                              searchPlaceholder="Search Department..."
                              displayKey="department_name"
                              valueKey="id"
                            />
                          </View>

                          {true && (
                            <View style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>Security</Text>
                                </View>
                                <Switch
                                  value={empAutoGeneratePassword}
                                  onValueChange={setEmpAutoGeneratePassword}
                                  trackColor={{ false: '#CBD5E1', true: '#34D399' }}
                                  thumbColor={COLORS.white}
                                />
                              </View>
                              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
                                Auto-generate temporary password
                              </Text>
                              {empAutoGeneratePassword && (
                                <Text style={{ fontSize: 12, color: COLORS.primary, marginTop: 8, fontStyle: 'italic' }}>
                                  Temporary Password will be displayed upon saving.
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </ScrollView>

                    <View style={[styles.modalFooter, { justifyContent: isViewOnlyEmployee ? 'flex-end' : 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 20 }]}>
                      {isViewOnlyEmployee ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
                          <TouchableOpacity
                            style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                            onPress={() => setIsEmployeeModalOpen(false)}
                          >
                            <Text style={[styles.modalCancelText, { color: '#64748B', fontWeight: '600' }]}>Close</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalSaveBtn, { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                            onPress={() => setIsViewOnlyEmployee(false)}
                          >
                            <Ionicons name="pencil" size={16} color="#FFFFFF" />
                            <Text style={[styles.modalSaveText, { fontWeight: '600', color: '#FFFFFF' }]}>Edit User</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }]}
                            onPress={() => setIsEmployeeModalOpen(false)}
                            disabled={employeeFormSaving}
                          >
                            <Text style={[styles.modalCancelText, { color: '#64748B' }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modalSaveBtn, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: '#0F172A' }, employeeFormSaving && { opacity: 0.7 }]}
                            onPress={handleSaveEmployee}
                            disabled={employeeFormSaving}
                          >
                            {employeeFormSaving ? (
                              <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                              <Text style={[styles.modalSaveText, { fontWeight: '600', color: '#FFFFFF' }]}>{editingEmployee ? 'Save Changes' : 'Create User'}</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </Modal>
            )}

          {/* Main Dashboard Panel Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.dashboardWrapper}>
              {renderTabContent()}
            </View>
          </ScrollView>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#4A001A',
    backgroundImage: 'linear-gradient(180deg, #4A001A 0%, #6E0F28 35%, #8A1830 70%, #D86A1A 100%)',
    borderRightWidth: 0,
    transition: 'width 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  brandLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#E65C19',
    backgroundImage: 'linear-gradient(135deg, #E65C19 0%, #9C3807 100%)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    boxShadow: '0px 2px 8px rgba(230, 92, 25, 0.4)',
  },
  brandLogoInnerSquare: {
    width: 16,
    height: 16,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 3,
  },
  sidebarBrandSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginTop: 0,
  },
  sidebarSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  sidebarSearchInput: {
    color: COLORS.white,
    fontSize: 14,
    flex: 1,
    padding: 0,
    outlineStyle: 'none', // for Web to disable border glow
  },
  sidebarSearchCollapsedBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sidebarMenuItemCollapsed: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // so tooltips can be positioned relative to this!
  },
  sidebarSignOutCollapsed: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    left: 60,
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    zIndex: 1000,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  tooltipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    whiteSpace: 'nowrap', // for Web text wrap behavior
  },
  floatingSubmenu: {
    position: 'absolute',
    left: 60,
    top: -10,
    width: 170,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
    ...SHADOWS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingSubmenuTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingLeft: 4,
  },
  floatingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 4,
  },
  floatingSubmenuItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  floatingSubmenuItemActive: {
    backgroundColor: '#EBF4F0',
  },
  floatingSubmenuText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  floatingSubmenuTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sidebarMobile: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    ...SHADOWS.card,
    elevation: 8,
  },
  sidebarBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 90,
  },
  sidebarInner: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  sidebarLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 12,
  },
  sidebarBrandName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  sidebarMenuItems: {
    paddingHorizontal: 16,
    gap: 16,
  },
  sidebarMenuSection: {
    marginBottom: 0,
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingLeft: 20,
    paddingRight: 16,
    borderRadius: 14,
    gap: 12,
    transition: 'all 250ms ease-in-out',
  },
  sidebarMenuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
  },
  sidebarMenuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  sidebarMenuTextActive: {
    color: '#F9C62A',
    fontWeight: '700',
  },
  sidebarSubMenuContainer: {
    paddingLeft: 16,
    marginTop: 6,
    gap: 6,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 24,
    position: 'relative',
  },
  sidebarSubMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    position: 'relative',
  },
  sidebarSubMenuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
  },
  sidebarSubMenuText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '500',
  },
  sidebarSubMenuTextActive: {
    color: '#F9C62A',
    fontWeight: '700',
  },
  treeDot: {
    position: 'absolute',
    left: -19,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 2,
  },
  treeDotActive: {
    position: 'absolute',
    left: -20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F9C62A',
    boxShadow: '0 0 8px #F9C62A',
    zIndex: 3,
  },
  sidebarFooter: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    zIndex: 2,
  },
  sidebarUserSection: {
    width: '100%',
    backgroundColor: 'rgba(74, 0, 26, 0.75)',
    backdropFilter: 'blur(12px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.3)',
    elevation: 6,
  },
  sidebarUserCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6E0F28',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sidebarAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sidebarUserRole: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  sidebarUserDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 12,
  },
  sidebarSignOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sidebarSignOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
    height: '100%',
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    height: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuHamburger: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#4A001A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  badge: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  badgeText: {
    color: '#D86A1A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginHorizontal: 32,
    maxWidth: 440,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E293B',
    fontWeight: '400',
    padding: 0,
    outlineStyle: 'none',
  },
  headerNotificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerNotifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#991B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  headerUserAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4A001A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  userMenuBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  userMenuDropdown: {
    position: 'fixed',
    top: 62,
    right: 16,
    width: 250,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  userMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMenuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMenuAvatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  userMenuName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userMenuEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  userMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userMenuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMenuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  dashboardWrapper: {
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
  },
  tabContent: {
    width: '100%',
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  welcomeTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: SPACING.xs,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm + 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg + 4,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: SPACING.md,
    backgroundColor: COLORS.cardBg,
    ...SHADOWS.card,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.card,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowInfo: {},
  itemId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemDest: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  etaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionCardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabHeadingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tabHeadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  filterSegments: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  filterSegmentBtn: {
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterSegmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterSegmentTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    height: 40,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  tableRowBig: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowBigLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  packageIconBg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F0F5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIdBig: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemDestBig: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemDriver: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowBigRight: {
    alignItems: 'flex-end',
  },
  etaTextBig: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyView: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  trendBadge: {
    borderRadius: 8,
    paddingHorizontal: SPACING.sm - 2,
    paddingVertical: 2,
  },
  trendUp: {
    backgroundColor: '#E8F5E9',
  },
  trendUpText: {
    color: COLORS.success,
  },
  trendDown: {
    backgroundColor: '#FFEBEB',
  },
  trendDownText: {
    color: COLORS.error,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  volumeRow: {
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm - 2,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  volumeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },

  // Modules management styles
  modulesHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  modulesTitleWrapper: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  addModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 8,
    gap: SPACING.xs,
    ...SHADOWS.button,
  },
  addModuleBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tableLoaderContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  loaderText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  modulesTableWrapper: {
    width: '100%',
  },
  modulesTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  thCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  modulesTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tdCell: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadgeSmall: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusActiveSmall: {
    backgroundColor: '#EBF4F0',
  },
  statusInactiveSmall: {
    backgroundColor: '#FFEBEB',
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusTextActiveSmall: {
    color: COLORS.primary,
  },
  statusTextInactiveSmall: {
    color: COLORS.error,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Sleek dark slate premium overlay (no blur)
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20, // larger, smoother corners
    padding: SPACING.xl, // more generous padding
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)', // elegant subtle border
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30, // massive soft drop shadow
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // softer border
    paddingBottom: SPACING.md,
    marginBottom: SPACING.xl,
  },
  modalTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A', // darker premium color
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalForm: {
    marginBottom: SPACING.lg,
  },
  modalError: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#FFEBEB',
    padding: SPACING.sm,
    borderRadius: 6,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1', // softer border
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: SPACING.lg,
  },
  statusSegmentContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    height: 40,
    backgroundColor: '#FAFAFA',
  },
  statusSegmentBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSegmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  statusSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusSegmentTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  modalCancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    ...SHADOWS.button,
  },
  modalSaveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Dropdown selector styles
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FAFAFA',
    marginBottom: SPACING.md,
    height: 40,
  },
  dropdownSelectorOpen: {
    borderColor: COLORS.primary,
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  dropdownSelectorTextEmpty: {
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  dropdownListContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    maxHeight: 160,
    overflow: 'hidden',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 999,
  },
  dropdownScrollView: {
    maxHeight: 160,
  },
  dropdownOptionItem: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  dropdownOptionItemActive: {
    backgroundColor: '#F0F5F2',
  },
  dropdownOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Table toolbar styles
  toolbarContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    height: 40,
    paddingHorizontal: SPACING.md,
    maxWidth: 360,
  },
  searchBarIcon: {
    marginRight: SPACING.sm,
  },
  searchBarInput: {
    flex: 1,
    height: '100%',
    color: COLORS.textPrimary,
    fontSize: 14,
    outlineWidth: 0, // for web
  },

  // Pagination styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  paginationText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  paginationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    gap: 4,
  },
  pageBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  pageBtnTextDisabled: {
    color: COLORS.textMuted,
  },
  pageIndicator: {
    paddingHorizontal: SPACING.sm,
  },
  pageIndicatorText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Stepper/Tabs styling
  wizardStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wizardStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  wizardStepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  wizardStepCircleCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  wizardStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  wizardStepLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  wizardStepLabelCompleted: {
    color: '#10B981',
  },
  wizardStepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    minWidth: 10,
  },
  wizardStepLineActive: {
    backgroundColor: '#10B981',
  },
  wizardPrevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  wizardPrevText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  wizardNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: COLORS.primary,
  },
  wizardNextText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
