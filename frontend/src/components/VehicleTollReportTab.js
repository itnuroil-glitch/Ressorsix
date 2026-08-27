import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, useWindowDimensions } from 'react-native-web';
import { Ionicons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';

import { API_URL } from '../config';

const COLORS = {
  primary: '#1A4D3E',
  primaryDark: '#12372A',
  secondary: '#C5A880',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  badgeZeroBg: '#F1F5F9',
  badgeZeroText: '#475569',
  badgeHighBg: '#DCFCE7',
  badgeHighText: '#166534',
};

export default function VehicleTollReportTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filter States
  const [filterCompany, setFilterCompany] = useState('ALL');
  const [filterTollSystem, setFilterTollSystem] = useState('ALL');
  const [filterAccountNo, setFilterAccountNo] = useState('');
  const [filterPlate, setFilterPlate] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  // Time Series Toggle for Daily Toll Expense Line Chart
  const [timeViewMode, setTimeViewMode] = useState('Daily'); // 'Daily' | 'Weekly' | 'Monthly'

  // Recent Toll Transactions Table States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tableFilterDirection, setTableFilterDirection] = useState('ALL');
  const [tableFilterGate, setTableFilterGate] = useState('ALL');
  const [tableFilterAmount, setTableFilterAmount] = useState('ALL');

  // 2-Step Import Wizard Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1 = Configuration, 2 = File Upload
  const [importClient, setImportClient] = useState('');
  const [importCompany, setImportCompany] = useState('');
  const [importAccount, setImportAccount] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let companyApiUrl = `${API_URL}/api/companies`;
      if (user && String(user.roleId) !== '1' && user.email) {
        companyApiUrl = `${API_URL}/api/companies?email=${encodeURIComponent(user.email)}`;
      }

      const [resTxn, resClient, resComp] = await Promise.all([
        fetch(`${API_URL}/api/vehicle-toll-transaction${user && String(user.roleId) !== '1' && user.clientid ? `?clientid=${user.clientid}` : ''}`),
        fetch(`${API_URL}/api/clients`),
        fetch(companyApiUrl)
      ]);

      if (resTxn.ok) {
        const txnData = await resTxn.json();
        setRecords(Array.isArray(txnData) ? txnData : []);
      }
      if (resClient.ok) {
        const clientData = await resClient.json();
        setClients(Array.isArray(clientData) ? clientData : []);
      }
      if (resComp.ok) {
        const compData = await resComp.json();
        setCompanies(Array.isArray(compData) ? compData : []);
      }
    } catch (err) {
      console.error('Error fetching vehicle toll dashboard data:', err);
      showToast && showToast('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setActiveFilters({
      company: filterCompany,
      tollSystem: filterTollSystem,
      accountNo: filterAccountNo.trim().toLowerCase(),
      plate: filterPlate.trim().toLowerCase(),
      tag: filterTag.trim().toLowerCase(),
      fromDate: filterFromDate,
      toDate: filterToDate,
    });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterCompany('ALL');
    setFilterTollSystem('ALL');
    setFilterAccountNo('');
    setFilterPlate('');
    setFilterTag('');
    setFilterFromDate('');
    setFilterToDate('');
    setActiveFilters({});
    setCurrentPage(1);
  };

  // Master Filtered Transactions
  const filteredData = useMemo(() => {
    return records.filter(r => {
      // 1. Company Filter
      if (activeFilters.company && activeFilters.company !== 'ALL') {
        const selectedCompId = String(activeFilters.company).toLowerCase();
        const rCompId = String(r.company_id || r.companyid || r.field_data?.company_id || r.field_data?.companyid || '').toLowerCase();
        const rCompName = String(r.company_name || r.field_data?.Company || r.field_data?.company_name || '').toLowerCase();

        const selectedCompObj = companies.find(c => String(c.id) === String(activeFilters.company));
        const selectedCompName = selectedCompObj ? String(selectedCompObj.company_name || selectedCompObj.name || '').toLowerCase() : '';

        const isCompanyMatch = 
          (rCompId === selectedCompId) || 
          (selectedCompName && rCompName === selectedCompName) ||
          (rCompName && rCompName === selectedCompId);

        if (!isCompanyMatch) return false;
      }

      // 2. Toll System Filter
      if (activeFilters.tollSystem && activeFilters.tollSystem !== 'ALL') {
        const sys = String(r.toll_name || r.toll_gate || r.field_data?.['Toll System'] || r.field_data?.['Toll Name'] || '').toLowerCase();
        if (activeFilters.tollSystem === 'Salik' && (sys.includes('darb') || sys.includes('abu dhabi'))) return false;
        if (activeFilters.tollSystem === 'Darb' && !sys.includes('darb') && !sys.includes('abu dhabi')) return false;
      }

      // 3. Account Number Filter
      if (activeFilters.accountNo) {
        const targetAcc = activeFilters.accountNo.toLowerCase();
        const accHaystack = [
          r.account_number,
          r.account_no,
          r.transaction_id,
          r.toll_overview_id,
          r.field_data?.['Account Number'],
          r.field_data?.['Account No'],
          r.field_data?.['Transaction ID'],
          r.field_data?.account_number
        ].filter(Boolean).join(' ').toLowerCase();

        if (!accHaystack.includes(targetAcc)) return false;
      }

      // 4. Plate Number Filter
      if (activeFilters.plate) {
        const targetPlate = activeFilters.plate.toLowerCase();
        const plateHaystack = [
          r.plate,
          r.vehicle_name,
          r.field_data?.['Plate'],
          r.field_data?.['Plate Number'],
          r.field_data?.['Plate No'],
          r.field_data?.plate
        ].filter(Boolean).join(' ').toLowerCase();

        if (!plateHaystack.includes(targetPlate)) return false;
      }

      // 5. Tag Number Filter
      if (activeFilters.tag) {
        const targetTag = activeFilters.tag.toLowerCase();
        const tagHaystack = [
          r.tag_number,
          r.tag,
          r.field_data?.['Tag Number'],
          r.field_data?.['Tag No'],
          r.field_data?.tag_number
        ].filter(Boolean).join(' ').toLowerCase();

        if (!tagHaystack.includes(targetTag)) return false;
      }

      // 6. From Date & To Date Filter
      const recordRawDate = r.trip_date || r.field_data?.['Trip Date'] || r.created_at;
      if (recordRawDate) {
        let recordDate = null;
        if (recordRawDate instanceof Date) {
          recordDate = recordRawDate;
        } else {
          const str = String(recordRawDate).trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            recordDate = new Date(str);
          } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
            const parts = str.split('/');
            recordDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          } else {
            const d = new Date(str);
            if (!isNaN(d.getTime())) recordDate = d;
          }
        }

        if (recordDate) {
          if (activeFilters.fromDate) {
            const fromD = new Date(activeFilters.fromDate);
            fromD.setHours(0, 0, 0, 0);
            if (recordDate < fromD) return false;
          }
          if (activeFilters.toDate) {
            const toD = new Date(activeFilters.toDate);
            toD.setHours(23, 59, 59, 999);
            if (recordDate > toD) return false;
          }
        }
      }

      return true;
    });
  }, [records, activeFilters, companies]);

  // KPI Calculations
  const totalTollAmount = useMemo(() => filteredData.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0), [filteredData]);
  const totalTrips = filteredData.length;
  const uniqueVehiclesCount = useMemo(() => new Set(filteredData.map(r => r.plate).filter(Boolean)).size, [filteredData]);
  const activeTollTagsCount = useMemo(() => new Set(filteredData.map(r => r.tag_number).filter(Boolean)).size, [filteredData]);

  // Most Used Toll Gate
  const mostUsedGateObj = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const g = r.toll_gate || r.toll_name || 'Unknown Gate';
      map[g] = (map[g] || 0) + 1;
    });
    let topG = 'N/A';
    let maxC = 0;
    Object.keys(map).forEach(g => {
      if (map[g] > maxC) {
        maxC = map[g];
        topG = g;
      }
    });
    return { gate: topG, count: maxC };
  }, [filteredData]);

  // Highest Toll Vehicle
  const highestTollVehicleObj = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const p = r.plate || 'N/A';
      const name = r.vehicle_name || (r.plate ? `Plate ${r.plate}` : 'N/A');
      if (!map[p]) map[p] = { plate: p, vehicle_name: name, amount: 0, trips: 0 };
      if (r.vehicle_name && map[p].vehicle_name !== r.vehicle_name) {
        map[p].vehicle_name = r.vehicle_name;
      }
      map[p].amount += parseFloat(r.amount) || 0;
      map[p].trips += 1;
    });
    let topV = { plate: 'N/A', vehicle_name: 'N/A', amount: 0, trips: 0 };
    Object.values(map).forEach(v => {
      if (v.amount > topV.amount) topV = v;
    });
    return topV;
  }, [filteredData]);

  const avgCostPerTrip = totalTrips > 0 ? (totalTollAmount / totalTrips) : 0;
  const zeroChargeTripsCount = useMemo(() => filteredData.filter(r => (parseFloat(r.amount) || 0) === 0).length, [filteredData]);

  // Chart Aggregations
  const vehicleChartData = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const p = r.plate || 'Unknown';
      const name = r.vehicle_name || (r.plate ? `Plate ${r.plate}` : 'Unknown');
      if (!map[p]) map[p] = { plate: p, vehicle_name: name, amount: 0, trips: 0 };
      if (r.vehicle_name && map[p].vehicle_name !== r.vehicle_name) {
        map[p].vehicle_name = r.vehicle_name;
      }
      map[p].amount += parseFloat(r.amount) || 0;
      map[p].trips += 1;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [filteredData]);
  const maxVehicleAmount = Math.max(1, ...vehicleChartData.map(v => v.amount));

  const gateChartData = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const g = r.toll_gate || r.toll_name || 'Unknown Gate';
      if (!map[g]) map[g] = { gate: g, trips: 0, amount: 0 };
      map[g].trips += 1;
      map[g].amount += parseFloat(r.amount) || 0;
    });
    return Object.values(map).sort((a, b) => b.trips - a.trips);
  }, [filteredData]);
  const maxGateTrips = Math.max(1, ...gateChartData.map(g => g.trips));

  const timeSeriesChartData = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      let key = r.trip_date || 'Unspecified';
      if (timeViewMode === 'Monthly' && r.trip_date) {
        const d = new Date(r.trip_date);
        if (!isNaN(d)) key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!map[key]) map[key] = { date: key, amount: 0, trips: 0 };
      map[key].amount += parseFloat(r.amount) || 0;
      map[key].trips += 1;
    });
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData, timeViewMode]);
  const maxTimeSeriesAmount = Math.max(1, ...timeSeriesChartData.map(t => t.amount));

  const directionAnalysisData = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const dir = r.direction || 'Other';
      if (!map[dir]) map[dir] = { direction: dir, trips: 0, amount: 0 };
      map[dir].trips += 1;
      map[dir].amount += parseFloat(r.amount) || 0;
    });
    const list = Object.values(map).sort((a, b) => b.trips - a.trips);
    return list.map(d => ({
      ...d,
      percentage: totalTrips > 0 ? ((d.trips / totalTrips) * 100).toFixed(1) : 0
    }));
  }, [filteredData, totalTrips]);

  const timeUsageData = useMemo(() => {
    const categories = {
      Morning: { label: 'Morning (06:00 - 12:00)', trips: 0, amount: 0, color: '#D97706' },
      Afternoon: { label: 'Afternoon (12:00 - 17:00)', trips: 0, amount: 0, color: '#2563EB' },
      Evening: { label: 'Evening (17:00 - 22:00)', trips: 0, amount: 0, color: '#7C3AED' },
      Night: { label: 'Night (22:00 - 06:00)', trips: 0, amount: 0, color: '#475569' },
    };

    filteredData.forEach(r => {
      const timeStr = r.trip_time || '';
      let hour = 12;
      const match = timeStr.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)?/i);
      if (match) {
        hour = parseInt(match[1], 10);
        const ampm = match[4] ? match[4].toUpperCase() : '';
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      }

      const amt = parseFloat(r.amount) || 0;
      if (hour >= 6 && hour < 12) {
        categories.Morning.trips += 1;
        categories.Morning.amount += amt;
      } else if (hour >= 12 && hour < 17) {
        categories.Afternoon.trips += 1;
        categories.Afternoon.amount += amt;
      } else if (hour >= 17 && hour < 22) {
        categories.Evening.trips += 1;
        categories.Evening.amount += amt;
      } else {
        categories.Night.trips += 1;
        categories.Night.amount += amt;
      }
    });

    return Object.values(categories);
  }, [filteredData]);

  // Table Searching, Filtering, Sorting & Pagination
  const tableFilteredData = useMemo(() => {
    return filteredData.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchId = String(r.transaction_id || r.id || '').toLowerCase().includes(q);
        const matchPlate = String(r.plate || '').toLowerCase().includes(q);
        const matchTag = String(r.tag_number || '').toLowerCase().includes(q);
        const matchGate = String(r.toll_gate || r.toll_name || '').toLowerCase().includes(q);
        if (!matchId && !matchPlate && !matchTag && !matchGate) return false;
      }
      if (tableFilterDirection !== 'ALL' && (r.direction || '') !== tableFilterDirection) return false;
      if (tableFilterGate !== 'ALL' && (r.toll_gate || r.toll_name || '') !== tableFilterGate) return false;
      if (tableFilterAmount === 'ZERO' && (parseFloat(r.amount) || 0) !== 0) return false;
      if (tableFilterAmount === 'CHARGED' && (parseFloat(r.amount) || 0) === 0) return false;

      return true;
    });
  }, [filteredData, searchQuery, tableFilterDirection, tableFilterGate, tableFilterAmount]);

  const sortedData = useMemo(() => {
    return [...tableFilteredData].sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];
      if (sortColumn === 'amount') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableFilteredData, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportRows = tableFilteredData.map(r => ({
        'Transaction ID': r.transaction_id || r.id,
        'Trip Date': r.trip_date || 'N/A',
        'Trip Time': r.trip_time || 'N/A',
        'Transaction Post Date': r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A',
        'Plate Number': r.plate || 'N/A',
        'Tag Number': r.tag_number || 'N/A',
        'Toll Gate': r.toll_gate || r.toll_name || 'N/A',
        'Direction': r.direction || 'N/A',
        'Amount (AED)': parseFloat(r.amount) || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Toll_Transactions');
      XLSX.writeFile(wb, `Toll_Transactions_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
      showToast && showToast('Excel report exported successfully!', 'success');
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast && showToast('Error exporting Excel report', 'error');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Step 1 -> Step 2 Wizard Navigation
  const handleProceedToStep2 = () => {
    if (!importClient) {
      showToast && showToast('Please select a Client in Configuration', 'error');
      return;
    }
    if (!importCompany) {
      showToast && showToast('Please select a Company in Configuration', 'error');
      return;
    }
    setImportStep(2);
  };

  // Excel Import Handler with Configuration Step Integration
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Auto Header Detection
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
          const rowStr = (rawRows[i] || []).join(' ').toLowerCase();
          if (rowStr.includes('transaction') || rowStr.includes('gate') || rowStr.includes('tag') || rowStr.includes('plate')) {
            headerRowIndex = i;
            break;
          }
        }

        const dataRows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

        let totalRows = dataRows.length;
        let imported = 0;
        let duplicates = 0;
        let invalid = 0;

        for (const row of dataRows) {
          const mappedObj = {};
          Object.keys(row).forEach(k => {
            mappedObj[k.trim()] = row[k];
          });

          const txnId = mappedObj['Transaction ID'] || mappedObj['toll_id'] || mappedObj['Toll ID'] || mappedObj['ID'];
          const plate = mappedObj['Plate'] || mappedObj['Plate Number'] || mappedObj['plate'];
          const tag = mappedObj['Tag Number'] || mappedObj['tag_number'];
          const gate = mappedObj['Toll Gate'] || mappedObj['Toll Name'] || mappedObj['toll_gate'];

          const rowStrVal = JSON.stringify(mappedObj).toLowerCase();
          const isSummaryRow = 
            rowStrVal.includes('totalamount') ||
            rowStrVal.includes('totaltrips') ||
            (plate && String(plate).toLowerCase().includes('total'));

          if ((!txnId && !tag && !gate) || isSummaryRow) {
            invalid++;
            continue;
          }

          const payload = {
            moduleid: 71,
            clientid: importClient,
            company_id: importCompany,
            toll_overview_id: importAccount || null,
            field_data: mappedObj,
            transaction_id: txnId ? String(txnId).trim() : null,
            trip_date: mappedObj['Trip Date'] || mappedObj['trip_date'] || null,
            trip_time: mappedObj['Trip Time'] || mappedObj['trip_time'] || null,
            toll_gate: gate ? String(gate).trim() : null,
            direction: mappedObj['Direction'] || mappedObj['direction'] || null,
            tag_number: tag ? String(tag).trim() : null,
            plate: plate ? String(plate).trim() : null,
            amount: mappedObj['Amount(AED)'] || mappedObj['Amount'] || mappedObj['amount'] || 0,
            toll_name: gate ? String(gate).trim() : 'Salik',
          };

          const postRes = await fetch(`${API_URL}/api/vehicle-toll-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (postRes.ok) {
            const resJson = await postRes.json();
            if (resJson.skipped) {
              duplicates++;
            } else {
              imported++;
            }
          } else {
            invalid++;
          }
        }

        setImportSummary({ totalRows, imported, duplicates, invalid });
        showToast && showToast(`Import Finished: ${imported} added under selected Client/Company!`, 'success');
        fetchDashboardData();
      } catch (err) {
        console.error('Import error:', err);
        showToast && showToast('Failed to import file', 'error');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const selectedClientObj = clients.find(c => String(c.id) === String(importClient));
  const selectedCompObj = companies.find(c => String(c.id) === String(importCompany));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 24 }}>
      {/* 1. Dashboard Header */}
      <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', justifyContent: 'space-between', alignItems: isLargeScreen ? 'center' : 'flex-start', gap: 16, marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 }}>Vehicle Toll Dashboard</Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>
            Multi-company UAE vehicle asset toll management system (Salik & Darb).
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 }}
            onPress={() => {
              setImportStep(1);
              setImportClient('');
              setImportCompany('');
              setImportAccount('');
              setImportSummary(null);
              setIsImportModalOpen(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Import Toll Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, gap: 6 }}
            onPress={fetchDashboardData}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Responsive Corporate Filter Bar */}
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Filter Controls</Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Company Dropdown */}
          <View style={{ minWidth: 160, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Company</Text>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none' }}
            >
              <option value="ALL">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
              ))}
            </select>
          </View>

          {/* Toll System */}
          <View style={{ minWidth: 140, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Toll System</Text>
            <select
              value={filterTollSystem}
              onChange={(e) => setFilterTollSystem(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none' }}
            >
              <option value="ALL">Salik / Darb (All)</option>
              <option value="Salik">Salik (Dubai)</option>
              <option value="Darb">Darb (Abu Dhabi)</option>
            </select>
          </View>

          {/* Account Number */}
          <View style={{ minWidth: 140, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Account Number</Text>
            <input
              type="text"
              placeholder="Account / Txn No..."
              value={filterAccountNo}
              onChange={(e) => setFilterAccountNo(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none' }}
            />
          </View>

          {/* Vehicle / Plate Number */}
          <View style={{ minWidth: 140, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Plate Number</Text>
            <input
              type="text"
              placeholder="Plate Number..."
              value={filterPlate}
              onChange={(e) => setFilterPlate(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none' }}
            />
          </View>

          {/* Tag Number */}
          <View style={{ minWidth: 140, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Tag Number</Text>
            <input
              type="text"
              placeholder="Tag Number..."
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 13, color: '#0F172A', outline: 'none' }}
            />
          </View>

          {/* From Date */}
          <View style={{ minWidth: 130, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>From Date</Text>
            <input
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, color: '#0F172A', outline: 'none' }}
            />
          </View>

          {/* To Date */}
          <View style={{ minWidth: 130, flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>To Date</Text>
            <input
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, color: '#0F172A', outline: 'none' }}
            />
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 18 }}>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 6 }}
              onPress={handleApplyFilter}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}
              onPress={handleResetFilter}
            >
              <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. Summary KPI Cards (8 Compact Cards) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        {/* 1. Total Toll Amount */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>1. TOTAL TOLL AMOUNT</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#166534', marginTop: 6 }}>AED {totalTollAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Total AED charged in period</Text>
        </View>

        {/* 2. Total Trips */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>2. TOTAL TRIPS</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.primary, marginTop: 6 }}>{totalTrips} Trips</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Total toll crossings</Text>
        </View>

        {/* 3. Vehicles Used */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>3. VEHICLES USED</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#2563EB', marginTop: 6 }}>{uniqueVehiclesCount} Vehicles</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Unique active plate numbers</Text>
        </View>

        {/* 4. Active Toll Tags */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>4. ACTIVE TOLL TAGS</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#7C3AED', marginTop: 6 }}>{activeTollTagsCount} Tags</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Salik/Darb tags utilized</Text>
        </View>

        {/* 5. Most Used Toll Gate */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>5. MOST USED GATE</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 6 }} numberOfLines={1}>{mostUsedGateObj.gate}</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>{mostUsedGateObj.count} crossings logged</Text>
        </View>

        {/* 6. Highest Toll Vehicle */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>6. HIGHEST TOLL VEHICLE</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#C2410C', marginTop: 6 }} numberOfLines={1}>{highestTollVehicleObj.vehicle_name && highestTollVehicleObj.vehicle_name !== 'N/A' ? highestTollVehicleObj.vehicle_name : (highestTollVehicleObj.plate !== 'N/A' ? `Plate ${highestTollVehicleObj.plate}` : 'N/A')}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534', marginTop: 2 }}>AED {highestTollVehicleObj.amount.toFixed(2)} ({highestTollVehicleObj.trips} trips)</Text>
        </View>

        {/* 7. Average Cost Per Trip */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>7. AVG COST / TRIP</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#059669', marginTop: 6 }}>AED {avgCostPerTrip.toFixed(2)}</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Average expense per pass</Text>
        </View>

        {/* 8. Zero-Charge Trips */}
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' }}>8. ZERO-CHARGE TRIPS</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#475569', marginTop: 6 }}>{zeroChargeTripsCount} Trips</Text>
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>Transactions where Amount = AED 0</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, padding: 60, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
          {/* 4. Charts Section */}
          <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 20, marginBottom: 24 }}>
            {/* Chart 1: Toll Expense by Vehicle */}
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>Toll Expense by Vehicle</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>Total AED spent per vehicle</Text>
                </View>
                <Ionicons name="bar-chart-outline" size={18} color={COLORS.primary} />
              </View>

              <View style={{ gap: 12, paddingTop: 10 }}>
                {vehicleChartData.map((item, idx) => {
                  const pct = Math.round((item.amount / maxVehicleAmount) * 100);
                  return (
                    <View key={idx} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }}>{item.vehicle_name ? item.vehicle_name : `Plate ${item.plate}`}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>AED {item.amount.toFixed(2)} ({item.trips} trips)</Text>
                      </View>
                      <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: COLORS.primary, borderRadius: 5 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Chart 2: Trips by Toll Gate */}
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>Trips by Toll Gate</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>Gate crossing distribution & spend</Text>
                </View>
                <Ionicons name="location-outline" size={18} color="#2563EB" />
              </View>

              <View style={{ gap: 12, paddingTop: 10 }}>
                {gateChartData.slice(0, 8).map((g, idx) => {
                  const pct = Math.round((g.trips / maxGateTrips) * 100);
                  return (
                    <View key={idx} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }} numberOfLines={1}>{g.gate}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>{g.trips} trips (AED {g.amount.toFixed(2)})</Text>
                      </View>
                      <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#2563EB', borderRadius: 5 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Full-Width Chart - Daily Toll Expense Trend */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>Daily Toll Expense Trend</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>Historical toll expenditure pattern over time</Text>
              </View>

              <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 6, padding: 3 }}>
                {['Daily', 'Weekly', 'Monthly'].map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: timeViewMode === mode ? '#FFFFFF' : 'transparent',
                    }}
                    onPress={() => setTimeViewMode(mode)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: timeViewMode === mode ? COLORS.primary : COLORS.textMuted }}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ gap: 10, paddingTop: 10 }}>
              {timeSeriesChartData.map((item, idx) => {
                const pct = Math.round((item.amount / maxTimeSeriesAmount) * 100);
                return (
                  <View key={idx} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>{item.date}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>AED {item.amount.toFixed(2)} ({item.trips} trips)</Text>
                    </View>
                    <View style={{ height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#10B981', borderRadius: 6 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Direction Analysis & Peak Time Usage */}
          <View style={{ flexDirection: isLargeScreen ? 'row' : 'column', gap: 20, marginBottom: 24 }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>Direction Analysis</Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 16 }}>Toll crossings by travel direction</Text>

              <View style={{ gap: 14 }}>
                {directionAnalysisData.map((item, idx) => (
                  <View key={idx} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{item.direction}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }}>{item.trips} trips ({item.percentage}%) — AED {item.amount.toFixed(2)}</Text>
                    </View>
                    <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: idx === 0 ? '#1A4D3E' : idx === 1 ? '#D97706' : '#2563EB', borderRadius: 5 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 }}>Toll Usage by Time Period</Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 16 }}>Peak period toll analysis</Text>

              <View style={{ gap: 14 }}>
                {timeUsageData.map((item, idx) => {
                  const maxT = Math.max(1, ...timeUsageData.map(t => t.trips));
                  const pct = Math.round((item.trips / maxT) * 100);
                  return (
                    <View key={idx} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>{item.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: item.color }}>{item.trips} trips — AED {item.amount.toFixed(2)}</Text>
                      </View>
                      <View style={{ height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color, borderRadius: 5 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Recent Toll Transactions Table */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 30 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>Recent Toll Transactions</Text>
                
                <View style={{ flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Ionicons name="search-outline" size={16} color="#94A3B8" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 8, fontSize: 12, color: '#0F172A', outlineStyle: 'none' }}
                    placeholder="Search by ID, plate, tag, gate..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={(text) => { setSearchQuery(text); setCurrentPage(1); }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <select
                  value={tableFilterAmount}
                  onChange={(e) => { setTableFilterAmount(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, color: '#0F172A', outline: 'none' }}
                >
                  <option value="ALL">All Amounts</option>
                  <option value="ZERO">AED 0.00 Only</option>
                  <option value="CHARGED">Charged Only (&gt;0)</option>
                </select>

                <select
                  value={tableFilterDirection}
                  onChange={(e) => { setTableFilterDirection(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: 12, color: '#0F172A', outline: 'none' }}
                >
                  <option value="ALL">All Directions</option>
                  {Array.from(new Set(filteredData.map(r => r.direction).filter(Boolean))).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 }}
                  onPress={handleExportExcel}
                >
                  <Ionicons name="document-text-outline" size={15} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Export Excel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#64748B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 }}
                  onPress={handleExportPDF}
                >
                  <Ionicons name="print-outline" size={15} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>Export PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Table Headers */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#F8FAFC' }}>
              <TouchableOpacity style={{ flex: 1.4 }} onPress={() => handleSort('transaction_id')}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TRANSACTION ID ⇕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1.2 }} onPress={() => handleSort('trip_date')}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TRIP DATE & TIME ⇕</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>POST DATE</Text>
              <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>PLATE NUMBER</Text>
              <Text style={{ flex: 1.3, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>VEHICLE NAME</Text>
              <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TAG NUMBER</Text>
              <Text style={{ flex: 1.4, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>TOLL GATE</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>DIRECTION</Text>
              <TouchableOpacity style={{ flex: 1, textAlign: 'right' }} onPress={() => handleSort('amount')}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>AMOUNT (AED) ⇕</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>5% VAT (AED)</Text>
              <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>TOTAL AMOUNT ⇕</Text>
            </View>

            {paginatedData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 14 }}>No transactions match the selected criteria</Text>
              </View>
            ) : (
              <View>
                {paginatedData.map((row, idx) => {
                  const amt = parseFloat(row.amount) || 0;
                  const isZero = amt === 0;
                  const vatAmt = row.vat_amount !== undefined && row.vat_amount !== null ? parseFloat(row.vat_amount) : (amt * 0.05);
                  const totalAmt = row.total_amount !== undefined && row.total_amount !== null ? parseFloat(row.total_amount) : (amt + vatAmt);

                  return (
                    <View key={row.id || idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
                      <Text style={{ flex: 1.4, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{row.transaction_id || `#${row.id}`}</Text>
                      <View style={{ flex: 1.2 }}>
                        <Text style={{ fontSize: 12, color: '#0F172A' }}>{row.trip_date || 'N/A'}</Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>{row.trip_time || ''}</Text>
                      </View>
                      <Text style={{ flex: 1.2, fontSize: 11, color: '#64748B' }}>{row.transaction_post_date || (row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A')}</Text>
                      <Text style={{ flex: 1.1, fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{row.plate || 'N/A'}</Text>
                      <View style={{ flex: 1.3 }}>
                        {row.vehicle_name ? (
                          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '700' }} numberOfLines={1}>🚗 {row.vehicle_name}</Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 11, color: '#94A3B8' }}>Unassigned</Text>
                        )}
                      </View>
                      <Text style={{ flex: 1.1, fontSize: 12, color: '#475569' }}>{row.tag_number || 'N/A'}</Text>
                      <Text style={{ flex: 1.4, fontSize: 12, color: '#334155', fontWeight: '500' }}>{row.toll_gate || row.toll_name || 'N/A'}</Text>
                      <Text style={{ flex: 1, fontSize: 12, color: '#64748B' }}>{row.direction || 'N/A'}</Text>
                      
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View style={{
                          backgroundColor: isZero ? COLORS.badgeZeroBg : COLORS.badgeHighBg,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: isZero ? '600' : '800',
                            color: isZero ? COLORS.badgeZeroText : COLORS.badgeHighText
                          }}>
                            AED {amt.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* 5% VAT Amount */}
                      <Text style={{ flex: 1, fontSize: 12, color: '#64748B', textAlign: 'right', fontWeight: '500' }}>
                        AED {vatAmt.toFixed(2)}
                      </Text>

                      {/* Total Amount (Incl. VAT) */}
                      <Text style={{ flex: 1.2, fontSize: 12, color: '#166534', textAlign: 'right', fontWeight: '700' }}>
                        AED {totalAmt.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Pagination Controls */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                Showing <Text style={{ fontWeight: '700' }}>{(currentPage - 1) * rowsPerPage + 1}</Text> to <Text style={{ fontWeight: '700' }}>{Math.min(currentPage * rowsPerPage, sortedData.length)}</Text> of <Text style={{ fontWeight: '700' }}>{sortedData.length}</Text> entries
              </Text>

              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TouchableOpacity
                  disabled={currentPage === 1}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: currentPage === 1 ? '#E2E8F0' : '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <Text style={{ fontSize: 12, color: currentPage === 1 ? '#94A3B8' : '#334155', fontWeight: '600' }}>Previous</Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 8 }}>Page {currentPage} of {totalPages}</Text>

                <TouchableOpacity
                  disabled={currentPage >= totalPages}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: currentPage >= totalPages ? '#E2E8F0' : '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <Text style={{ fontSize: 12, color: currentPage >= totalPages ? '#94A3B8' : '#334155', fontWeight: '600' }}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      )}
      {/* 2-Step Import Wizard Modal */}
      {isImportModalOpen && (
        <View style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '92%', maxWidth: 620, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)', borderWidth: 1, borderColor: '#E2E8F0' }}>
            
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' }}>
                  <Ionicons name="cloud-upload-outline" size={22} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>Import Toll Transactions</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Upload Salik / Darb transaction sheets into corporate asset log</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setIsImportModalOpen(false); setImportSummary(null); }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Stepper Header Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: importStep === 1 ? COLORS.primary : '#10B981', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {importStep > 1 ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>1</Text>
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>STEP 1</Text>
                  <Text style={{ fontSize: 13, fontWeight: importStep === 1 ? '700' : '600', color: importStep === 1 ? COLORS.primary : '#10B981' }}>Scope Configuration</Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: importStep === 2 ? COLORS.primary : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: importStep === 2 ? '#FFFFFF' : '#64748B', fontSize: 13, fontWeight: '800' }}>2</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>STEP 2</Text>
                  <Text style={{ fontSize: 13, fontWeight: importStep === 2 ? '700' : '500', color: importStep === 2 ? COLORS.primary : '#64748B' }}>File Upload & Import</Text>
                </View>
              </View>
            </View>

            {/* Modal Body */}
            <View style={{ padding: 24, backgroundColor: '#FFFFFF' }}>

              {/* STEP 1: CONFIGURATION */}
              {importStep === 1 && (
                <View>
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={{ fontSize: 12, color: '#475569', flex: 1, lineHeight: 18 }}>
                      Select the destination <Text style={{ fontWeight: '700', color: '#0F172A' }}>Client</Text> and <Text style={{ fontWeight: '700', color: '#0F172A' }}>Company</Text>. All transactions in the uploaded sheet will be automatically assigned to this scope.
                    </Text>
                  </View>

                  {/* Client Dropdown */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.3 }}>CLIENT <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={importClient}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          setImportClient(selectedId);
                          setImportCompany('');
                          const matched = companies.filter(c => !selectedId || String(c.client_id || c.clientid) === String(selectedId));
                          if (matched.length > 0) {
                            setImportCompany(String(matched[0].id));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Select Client --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.client_name || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </View>

                  {/* Company Dropdown */}
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.3 }}>COMPANY <Text style={{ color: '#EF4444' }}>*</Text></Text>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={importCompany}
                        onChange={(e) => setImportCompany(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">-- Select Company --</option>
                        {(
                          companies.filter(c => !importClient || String(c.client_id || c.clientid) === String(importClient)).length > 0
                            ? companies.filter(c => !importClient || String(c.client_id || c.clientid) === String(importClient))
                            : companies
                        ).map(c => (
                          <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                        ))}
                      </select>
                    </div>
                  </View>

                  {/* Toll Account / Overview Optional Field */}
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8, letterSpacing: 0.3 }}>TOLL ACCOUNT / OVERVIEW (OPTIONAL)</Text>
                    <input
                      type="text"
                      placeholder="e.g. Salik Account #1004859 / Darb Account..."
                      value={importAccount}
                      onChange={(e) => setImportAccount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        fontSize: 14,
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' }}
                      onPress={() => setIsImportModalOpen(false)}
                    >
                      <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)' }}
                      onPress={handleProceedToStep2}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Continue to Upload</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: FILE UPLOAD & IMPORT */}
              {importStep === 2 && (
                <View>
                  {/* Configuration Summary Badge */}
                  <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={16} color="#059669" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>ACTIVE CONFIGURATION SCOPE</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#6EE7B7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-outline" size={13} color="#047857" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>{selectedClientObj?.client_name || selectedClientObj?.name || importClient}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={12} color="#059669" />
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#6EE7B7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="business-outline" size={13} color="#047857" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46' }}>{selectedCompObj?.company_name || selectedCompObj?.name || importCompany}</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => setImportStep(1)}
                      style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>Change Scope</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dropzone */}
                  <View style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: '#059669', borderRadius: 14, padding: 32, alignItems: 'center', backgroundColor: '#F8FAFC', marginBottom: 20, position: 'relative' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Ionicons name="cloud-upload" size={30} color={COLORS.primary} />
                    </View>
                    
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Select Excel / CSV File</Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                      Upload official Salik or Darb trip statement sheet (.xlsx, .xls, .csv)
                    </Text>

                    {/* Styled Custom Button with hidden overlay file input */}
                    <div style={{ marginTop: 18, position: 'relative', display: 'inline-block' }}>
                      <div style={{
                        backgroundColor: COLORS.primary,
                        color: '#FFFFFF',
                        padding: '12px 24px',
                        borderRadius: 8,
                        fontWeight: '700',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)',
                        cursor: 'pointer'
                      }}>
                        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                        <span>Browse Excel File</span>
                      </div>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        disabled={importing}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {importing && (
                      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '700' }}>Processing & parsing rows...</Text>
                      </View>
                    )}
                  </View>

                  {/* Results Summary */}
                  {importSummary && (
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Import Summary</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Total Rows</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>{importSummary.totalRows}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                          <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>Imported</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#065F46', marginTop: 2 }}>{importSummary.imported}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                          <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>Duplicates</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#92400E', marginTop: 2 }}>{importSummary.duplicates}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 110, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '700' }}>Invalid</Text>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: '#991B1B', marginTop: 2 }}>{importSummary.invalid}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={() => setImportStep(1)}
                    >
                      <Ionicons name="arrow-back" size={16} color="#475569" />
                      <Text style={{ color: '#475569', fontWeight: '600', fontSize: 14 }}>Back to Config</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
                      onPress={() => { setIsImportModalOpen(false); setImportSummary(null); }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

            </View>
          </View>
        </View>
      )}

    </View>
  );
}
