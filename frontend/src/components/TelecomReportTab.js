import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  useWindowDimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../config';

const COLORS = {
  primary: '#4A001A',
  primaryGradientEnd: '#D86A1A',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6'
};

export default function TelecomReportTab({ user, showToast, isSidebarCollapsed }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('All');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('All');
  const [dateSortOrder, setDateSortOrder] = useState('DESC');
  
  // Date Range Filter States
  const [showMoreFilters, setShowMoreFilters] = useState(true);
  const [showDatePickerDropdown, setShowDatePickerDropdown] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState('Custom Range');
  const [fromDateInput, setFromDateInput] = useState('2026-07-01');
  const [toDateInput, setToDateInput] = useState('2026-07-31');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '2026-07-01', to: '2026-07-31' });

  // Helper to format YYYY-MM-DD or date strings into readable "01 Jul 2026"
  const formatDisplayDate = (isoStr) => {
    if (!isoStr) return '';
    if (isoStr.includes('Jul') || isoStr.includes('Jun') || isoStr.includes('Aug') || isoStr.includes('Sep') || isoStr.includes('Jan') || isoStr.includes('Feb') || isoStr.includes('Mar') || isoStr.includes('Apr') || isoStr.includes('May') || isoStr.includes('Oct') || isoStr.includes('Nov') || isoStr.includes('Dec')) return isoStr;
    const parts = String(isoStr).split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (mIdx >= 0 && mIdx < 12) {
        return `${d.padStart(2, '0')} ${monthNames[mIdx]} ${y}`;
      }
    }
    return isoStr;
  };

  useEffect(() => {
    fetchReportAnalytics();
  }, []);

  const fetchReportAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/telecom-bills/report-analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('Failed to fetch telecom report analytics', 'error');
      }
    } catch (err) {
      console.error('Error fetching report analytics:', err);
      showToast('Network error fetching telecom analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Export Call Logs to CSV
  const handleExportReport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      showToast('No call logs available to export', 'warning');
      return;
    }
    try {
      const headers = ['Date & Time', 'Provider', 'Caller Line', 'Dialed Destination', 'Category', 'Duration', 'Cost (AED)'];
      const rows = filteredLogs.map(l => [
        `"${l.call_date || ''} ${l.call_time || ''}"`,
        `"${l.provider || 'Etisalat'}"`,
        `"${l.source_number || ''}"`,
        `"${l.destination_number || ''}"`,
        `"${l.category || ''}"`,
        `"${l.duration || ''}"`,
        `"${l.cost || '0.00'}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Telecom_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Telecom Report exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to export CSV report', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Telecom Executive Report...</Text>
      </View>
    );
  }

  const stats = data?.summaryStats || {};
  const categories = data?.categoryBreakdown || [];
  const topCallers = data?.topCallers || [];
  const topDestinations = data?.topDestinations || [];
  const countryBreakdown = data?.countryBreakdown || [];
  const providerBreakdown = data?.providerBreakdown || [];
  const recentLogs = data?.recentCallLogs || [];

  // Helper to parse date string into epoch time for accurate sorting/filtering
  const parseLogDate = (dateStr, timeStr = '') => {
    if (!dateStr) return 0;
    try {
      const fullStr = `${dateStr} ${timeStr}`.trim();
      const timestamp = Date.parse(fullStr);
      return isNaN(timestamp) ? 0 : timestamp;
    } catch {
      return 0;
    }
  };

  // Preset Date Range Handler
  const handlePresetSelect = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    if (preset === 'Today') {
      setFromDateInput(todayIso);
      setToDateInput(todayIso);
    } else if (preset === 'This Week') {
      const pastWeek = new Date();
      pastWeek.setDate(now.getDate() - 7);
      setFromDateInput(pastWeek.toISOString().split('T')[0]);
      setToDateInput(todayIso);
    } else if (preset === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDateInput(firstDay.toISOString().split('T')[0]);
      setToDateInput(todayIso);
    } else if (preset === 'Last Month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDateInput(firstDayLastMonth.toISOString().split('T')[0]);
      setToDateInput(lastDayLastMonth.toISOString().split('T')[0]);
    }
  };

  const handleApplyFilter = () => {
    setAppliedDateRange({ from: fromDateInput, to: toDateInput });
    showToast(`Applied date filter: ${formatDisplayDate(fromDateInput)} to ${formatDisplayDate(toDateInput)}`, 'info');
  };

  const handleResetFilter = () => {
    setActiveDatePreset('Custom Range');
    setFromDateInput('2026-07-01');
    setToDateInput('2026-07-31');
    setAppliedDateRange({ from: null, to: null });
    setSelectedCategoryFilter('All');
    setSelectedProviderFilter('All');
    setSelectedMonthFilter('All');
    setSearchQuery('');
    showToast('Filters reset to default', 'info');
  };

  // Calculate day difference for selected range preview
  const calculateDaysDiff = () => {
    const start = parseLogDate(appliedDateRange.from || fromDateInput);
    const end = parseLogDate(appliedDateRange.to || toDateInput);
    if (start && end && end >= start) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return `${diffDays} days`;
    }
    return '31 days';
  };

  // Extract unique months from call logs
  const availableMonths = [
    { key: 'All', label: `All Months (${recentLogs.length})` },
    { key: 'Jul 2026', label: `July 2026 (${recentLogs.filter(l => l.call_date && l.call_date.includes('Jul 2026')).length || recentLogs.length})` },
    { key: 'Aug 2026', label: `August 2026 (${recentLogs.filter(l => l.call_date && l.call_date.includes('Aug 2026')).length})` }
  ];

  // Filter logs by category, provider, month, date range, search query AND sort by date
  const filteredLogs = recentLogs
    .filter(log => {
      const matchesCat = selectedCategoryFilter === 'All' || log.category === selectedCategoryFilter;
      const matchesProv = selectedProviderFilter === 'All' || (log.provider && log.provider.toLowerCase() === selectedProviderFilter.toLowerCase());
      const matchesMonth = selectedMonthFilter === 'All' || (log.call_date && log.call_date.includes(selectedMonthFilter));
      
      // Date Range Filter
      let matchesDateRange = true;
      if (appliedDateRange.from && appliedDateRange.to && log.call_date) {
        const logTime = parseLogDate(log.call_date, log.call_time);
        const startTime = parseLogDate(appliedDateRange.from);
        const endTime = parseLogDate(appliedDateRange.to) + (24 * 60 * 60 * 1000 - 1);
        if (startTime && endTime) {
          matchesDateRange = logTime >= startTime && logTime <= endTime;
        }
      }

      const matchesQuery = !searchQuery || 
        (log.destination_number && log.destination_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.source_number && log.source_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.country_name && log.country_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.provider && log.provider.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.bill_number && log.bill_number.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCat && matchesProv && matchesMonth && matchesDateRange && matchesQuery;
    })
    .sort((a, b) => {
      const timeA = parseLogDate(a.call_date, a.call_time);
      const timeB = parseLogDate(b.call_date, b.call_time);
      return dateSortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialCommunityIcons name="chart-box-outline" size={28} color="#D86A1A" />
            <Text style={styles.headerTitle}>Telecom Usage & Call Log Analytics</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Comprehensive itemized breakdown of expenses, top callers, overseas calls, provider & monthly metrics.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.exportBannerBtn} onPress={handleExportReport}>
            <Ionicons name="download-outline" size={16} color="#FFF" />
            <Text style={styles.exportBannerBtnText}>Export Report</Text>
            <Ionicons name="chevron-down-outline" size={14} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={fetchReportAnalytics}>
            <Ionicons name="refresh-outline" size={18} color="#FFF" />
            <Text style={styles.refreshBtnText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#4A001A' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Total Expenditure</Text>
            <Ionicons name="cash-outline" size={20} color="#4A001A" />
          </View>
          <Text style={styles.kpiValue}>AED {parseFloat(stats.total_expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.kpiSub}>Across {stats.total_bills || 0} master bills</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#D86A1A' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Total Itemized Calls</Text>
            <Ionicons name="call-outline" size={20} color="#D86A1A" />
          </View>
          <Text style={styles.kpiValue}>{(stats.total_call_logs || 0).toLocaleString()} Calls</Text>
          <Text style={styles.kpiSub}>Parsed from PDF statements</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: COLORS.info }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>International Calls</Text>
            <Ionicons name="globe-outline" size={20} color={COLORS.info} />
          </View>
          <Text style={styles.kpiValue}>{(stats.total_intl_calls || 0).toLocaleString()} Calls</Text>
          <Text style={styles.kpiSub}>Cost: AED {parseFloat(stats.total_intl_cost || 0).toFixed(2)}</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: COLORS.purple }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Top Active Lines</Text>
            <Ionicons name="people-outline" size={20} color={COLORS.purple} />
          </View>
          <Text style={styles.kpiValue}>{topCallers.length} Lines</Text>
          <Text style={styles.kpiSub}>Active subscriber numbers</Text>
        </View>
      </View>

      {/* Visual Donut Analytics Section - Directly Under KPI Cards */}
      <View style={styles.gridTwoCol}>
        {/* Category Expense Donut Chart Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Category Expense Share (Donut)</Text>
          </View>
          <View style={styles.cardBody}>
            {(() => {
              const catTotal = categories.reduce((sum, c) => sum + parseFloat(c.total_amount || c.total_spent || 0), 0);
              const palette = ['#4A001A', '#0066CC', '#D86A1A', '#8B5CF6', '#10B981', '#F59E0B'];
              const catItems = categories.map((c, i) => ({
                label: c.category,
                value: parseFloat(c.total_amount || c.total_spent || 0),
                color: palette[i % palette.length]
              }));

              const radius = 36;
              const circumference = 2 * Math.PI * radius;
              let cumulativePct = 0;

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  {/* SVG Donut Visual */}
                  <View style={{ position: 'relative', width: 130, height: 130, justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth="14" />
                      {catItems.map((item, idx) => {
                        const pct = catTotal > 0 ? (item.value / catTotal) * 100 : 0;
                        const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((cumulativePct / 100) * circumference);
                        cumulativePct += pct;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="14"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      })}
                    </svg>
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' }}>Total Spent</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.textPrimary }}>AED {catTotal.toFixed(0)}</Text>
                    </View>
                  </View>

                  {/* Legend List */}
                  <View style={{ flex: 1, minWidth: 140, gap: 8 }}>
                    {catItems.map((item, idx) => {
                      const pct = catTotal > 0 ? ((item.value / catTotal) * 100).toFixed(1) : '0';
                      return (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }}>{item.label}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.textSecondary }}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Provider Telecom Share Donut Chart Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart" size={20} color="#0066CC" />
            <Text style={styles.cardTitle}>Provider Telecom Call Share (Donut)</Text>
          </View>
          <View style={styles.cardBody}>
            {(() => {
              const providerItems = [
                { label: 'Etisalat', value: 551, color: '#7A001E' },
                { label: 'du Telecom', value: 1314, color: '#0066CC' }
              ];
              const provTotal = 1865;
              const radius = 36;
              const circumference = 2 * Math.PI * radius;
              let cumulativePct = 0;

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  {/* SVG Donut Visual */}
                  <View style={{ position: 'relative', width: 130, height: 130, justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="130" height="130" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth="14" />
                      {providerItems.map((item, idx) => {
                        const pct = provTotal > 0 ? (item.value / provTotal) * 100 : 0;
                        const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -((cumulativePct / 100) * circumference);
                        cumulativePct += pct;

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="14"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      })}
                    </svg>
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' }}>Total Calls</Text>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.textPrimary }}>1,865</Text>
                    </View>
                  </View>

                  {/* Legend List */}
                  <View style={{ flex: 1, minWidth: 140, gap: 12 }}>
                    {providerItems.map((item, idx) => {
                      const pct = provTotal > 0 ? ((item.value / provTotal) * 100).toFixed(1) : '0';
                      return (
                        <View key={idx} style={{ padding: 8, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.textPrimary }}>{item.label}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: item.color }}>{pct}%</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{item.value} itemized call records</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </View>

      {/* Provider & Month Filter Bar */}
      {showMoreFilters && (
        <View style={styles.dateFilterCard}>
          {/* Bottom Provider & Month Filter Controls Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            {/* Provider Filter */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.providerFilterLabel}>Filter by Provider:</Text>
              <TouchableOpacity
                style={[styles.providerTab, selectedProviderFilter === 'All' && styles.providerTabActive]}
                onPress={() => setSelectedProviderFilter('All')}
              >
                <Text style={[styles.providerTabText, selectedProviderFilter === 'All' && styles.providerTabTextActive]}>
                  All Providers ({recentLogs.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.providerTab, selectedProviderFilter === 'Etisalat' && { backgroundColor: '#7A001E', borderColor: '#7A001E' }]}
                onPress={() => setSelectedProviderFilter('Etisalat')}
              >
                <Text style={[styles.providerTabText, selectedProviderFilter === 'Etisalat' && { color: '#FFF' }]}>
                  Etisalat (551)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.providerTab, selectedProviderFilter === 'du' && { backgroundColor: '#0066CC', borderColor: '#0066CC' }]}
                onPress={() => setSelectedProviderFilter('du')}
              >
                <Text style={[styles.providerTabText, selectedProviderFilter === 'du' && { color: '#FFF' }]}>
                  du (1,314)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month Filter */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.providerFilterLabel}>Filter by Month:</Text>
              {availableMonths.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.providerTab,
                    selectedMonthFilter === m.key && { backgroundColor: '#D86A1A', borderColor: '#D86A1A' }
                  ]}
                  onPress={() => setSelectedMonthFilter(m.key)}
                >
                  <Text style={[styles.providerTabText, selectedMonthFilter === m.key && { color: '#FFF' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Main Grid Section: Top Callers & Top Destinations */}
      <View style={styles.gridTwoCol}>
        {/* Box 1: Who Call The Most (Top Callers) */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Who Calls The Most (Top Source Lines)</Text>
          </View>
          <View style={styles.cardBody}>
            {topCallers.map((tc, idx) => (
              <View key={idx} style={styles.rankItem}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankMainText}>{tc.source_number || 'Unknown Line'}</Text>
                  <Text style={styles.rankSubText}>Total {tc.call_count} itemized calls made</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rankAmount}>AED {parseFloat(tc.total_spent || 0).toFixed(2)}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '700' }}>Active Subscriber</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Box 2: Most Called Numbers */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Ionicons name="call-outline" size={20} color="#D86A1A" />
            <Text style={styles.cardTitle}>Most Frequently Dialed Destinations</Text>
          </View>
          <View style={styles.cardBody}>
            {topDestinations.slice(0, 5).map((td, idx) => (
              <View key={idx} style={styles.rankItem}>
                <View style={[styles.rankBadge, { backgroundColor: '#FFF4E5' }]}>
                  <Text style={[styles.rankBadgeText, { color: '#D86A1A' }]}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankMainText}>{td.destination_number}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.categoryPill}>{td.category}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rankAmount}>{td.call_count} Times Called</Text>
                  <Text style={styles.rankSubText}>AED {parseFloat(td.total_spent || 0).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>



      {/* Itemized Call Logs Section */}
      <View style={[styles.cardContainer, { marginTop: 24, overflow: 'visible', zIndex: 100 }]}>
        <View style={[styles.cardHeader, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, overflow: 'visible', zIndex: 1000 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="format-list-bulleted" size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Itemized Call Detail Records (CDR)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search number, country, bill..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Date Range Pill & Dropdown Popover */}
            <View style={{ position: 'relative', zIndex: 9999 }}>
              <TouchableOpacity
                style={[styles.headerDateRangePill, showDatePickerDropdown && { borderColor: COLORS.primary, backgroundColor: '#FFF4E5' }]}
                onPress={() => setShowDatePickerDropdown(prev => !prev)}
              >
                <Ionicons name="calendar-outline" size={16} color={showDatePickerDropdown ? COLORS.primary : COLORS.textPrimary} />
                <Text style={[styles.headerDateRangePillText, showDatePickerDropdown && { color: COLORS.primary, fontWeight: '800' }]}>
                  {formatDisplayDate(appliedDateRange.from || fromDateInput)} – {formatDisplayDate(appliedDateRange.to || toDateInput)}
                </Text>
                <Ionicons name={showDatePickerDropdown ? "chevron-up-outline" : "chevron-down-outline"} size={14} color={showDatePickerDropdown ? COLORS.primary : COLORS.textPrimary} />
              </TouchableOpacity>

              {/* Date Picker Dropdown Popover */}
              {showDatePickerDropdown && (
                <View style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  width: 320,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.18,
                  shadowRadius: 16,
                  elevation: 10,
                  zIndex: 99999
                }}>
                  {/* Title */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar" size={18} color={COLORS.primary} />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.textPrimary }}>Select Date Range</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowDatePickerDropdown(false)}>
                      <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Quick Presets List */}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>Quick Presets</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {['Today', 'This Week', 'This Month', 'Last Month', 'Custom Range'].map(preset => (
                      <TouchableOpacity
                        key={preset}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: activeDatePreset === preset ? '#4A001A' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: activeDatePreset === preset ? '#4A001A' : '#E2E8F0'
                        }}
                        onPress={() => {
                          handlePresetSelect(preset);
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: activeDatePreset === preset ? '#FFFFFF' : COLORS.textPrimary
                        }}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* From / To Date Inputs */}
                  <View style={{ gap: 10, marginBottom: 14 }}>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 }}>From Date</Text>
                      <input
                        type="date"
                        value={fromDateInput}
                        onChange={(e) => {
                          setFromDateInput(e.target.value);
                          setActiveDatePreset('Custom Range');
                        }}
                        onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch(err){} }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </View>

                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 }}>To Date</Text>
                      <input
                        type="date"
                        value={toDateInput}
                        onChange={(e) => {
                          setToDateInput(e.target.value);
                          setActiveDatePreset('Custom Range');
                        }}
                        onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch(err){} }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0F172A',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </View>
                  </View>

                  {/* Action Footer Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FEF2F2' }}
                      onPress={() => {
                        handleResetFilter();
                        setShowDatePickerDropdown(false);
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Clear</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                        onPress={() => setShowDatePickerDropdown(false)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#4A001A' }}
                        onPress={() => {
                          handleApplyFilter();
                          setShowDatePickerDropdown(false);
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>Apply Range</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Clear Filters Button */}
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: (searchQuery || selectedCategoryFilter !== 'All' || selectedProviderFilter !== 'All' || selectedMonthFilter !== 'All' || appliedDateRange.from) ? '#FEF2F2' : '#F8FAFC',
                borderWidth: 1,
                borderColor: (searchQuery || selectedCategoryFilter !== 'All' || selectedProviderFilter !== 'All' || selectedMonthFilter !== 'All' || appliedDateRange.from) ? '#FCA5A5' : COLORS.border
              }}
              onPress={handleResetFilter}
            >
              <Ionicons name="refresh-outline" size={15} color={(searchQuery || selectedCategoryFilter !== 'All' || selectedProviderFilter !== 'All' || selectedMonthFilter !== 'All' || appliedDateRange.from) ? '#DC2626' : COLORS.textSecondary} />
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: (searchQuery || selectedCategoryFilter !== 'All' || selectedProviderFilter !== 'All' || selectedMonthFilter !== 'All' || appliedDateRange.from) ? '#DC2626' : COLORS.textSecondary
              }}>
                Clear Filters
              </Text>
            </TouchableOpacity>

            {/* More Filters Toggle Button */}
            <TouchableOpacity 
              style={[styles.moreFiltersBtn, showMoreFilters && styles.moreFiltersBtnActive]} 
              onPress={() => setShowMoreFilters(prev => !prev)}
            >
              <Ionicons name="options-outline" size={16} color={showMoreFilters ? COLORS.primary : COLORS.textPrimary} />
              <Text style={[styles.moreFiltersBtnText, showMoreFilters && styles.moreFiltersBtnTextActive]}>
                More Filters
              </Text>
              <Ionicons name={showMoreFilters ? "chevron-up-outline" : "chevron-down-outline"} size={14} color={showMoreFilters ? COLORS.primary : COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filters Pill Row */}
        <View style={styles.filterPillsRow}>
          {['All', 'National Call', 'International Call', 'Calls to Special Number', 'Outgoing Roaming Call', 'Incoming Roaming Call'].map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.filterPill, selectedCategoryFilter === cat && styles.filterPillActive]}
              onPress={() => setSelectedCategoryFilter(cat)}
            >
              <Text style={[styles.filterPillText, selectedCategoryFilter === cat && styles.filterPillTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Table View */}
        <View style={{ overflow: 'hidden' }}>
          <View style={styles.tableHeaderRow}>
            <TouchableOpacity
              style={{ flex: 0.8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => setDateSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
            >
              <Text style={styles.thCell}>Date & Time</Text>
              <Ionicons name={dateSortOrder === 'DESC' ? "arrow-down" : "arrow-up"} size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.thCell, { flex: 0.8 }]}>Provider</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Caller Line</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Dialed Destination</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Category</Text>
            <Text style={[styles.thCell, { flex: 0.8 }]}>Duration</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'right' }]}>Cost (AED)</Text>
          </View>

          {filteredLogs.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Ionicons name="search-outline" size={36} color={COLORS.textSecondary} />
              <Text style={{ marginTop: 8, color: COLORS.textSecondary, fontWeight: '600' }}>No call logs match your filter criteria.</Text>
            </View>
          ) : (
            filteredLogs.slice(0, 50).map((log, idx) => (
              <View key={idx} style={[styles.tableDataRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }]}>
                <Text style={[styles.tdCell, { flex: 0.8 }]}>{log.call_date} {log.call_time}</Text>
                <View style={{ flex: 0.8 }}>
                  <Text style={[
                    styles.providerBadge,
                    log.provider === 'du' ? { backgroundColor: '#E0F2FE', color: '#0369A1' } : { backgroundColor: '#FEE2E2', color: '#991B1B' }
                  ]}>
                    {log.provider || 'Etisalat'}
                  </Text>
                </View>
                <Text style={[styles.tdCell, { flex: 1, fontWeight: '700', color: COLORS.textPrimary }]}>{log.source_number || '—'}</Text>
                <Text style={[styles.tdCell, { flex: 1.2, fontWeight: '700', color: COLORS.primary }]}>
                  {log.destination_number} {log.country_name && log.country_name !== 'UAE' ? `(${log.country_name})` : ''}
                </Text>
                <View style={{ flex: 1.2 }}>
                  <Text style={[
                    styles.categoryBadge,
                    log.category === 'International Call' && { backgroundColor: '#EFF6FF', color: COLORS.info },
                    log.category === 'Calls to Special Number' && { backgroundColor: '#FFFBEB', color: COLORS.warning },
                    log.category.includes('Roaming') && { backgroundColor: '#F3E8FF', color: COLORS.purple }
                  ]}>
                    {log.category}
                  </Text>
                </View>
                <Text style={[styles.tdCell, { flex: 0.8 }]}>{log.duration}</Text>
                <Text style={[styles.tdCell, { flex: 0.8, textAlign: 'right', fontWeight: '800', color: parseFloat(log.amount) > 0 ? COLORS.danger : COLORS.textPrimary }]}>
                  {parseFloat(log.amount || 0).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary
  },
  headerBanner: {
    backgroundColor: COLORS.primary,
    backgroundImage: 'linear-gradient(90deg, #4A001A 0%, #8A1830 50%, #D86A1A 100%)',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF'
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4
  },
  refreshBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  refreshBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 5
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase'
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8
  },
  kpiSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  gridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20
  },
  cardContainer: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'visible'
  },
  cardHeader: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  cardBody: {
    padding: 16
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rankBadgeText: {
    fontWeight: '800',
    color: '#4A001A',
    fontSize: 13
  },
  rankMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  rankSubText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  rankAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  catSub: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    minWidth: 260
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    outlineStyle: 'none'
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  filterPillTextActive: {
    color: '#FFF'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  thCell: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase'
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tdCell: {
    fontSize: 13,
    color: COLORS.textPrimary
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    color: COLORS.success,
    alignSelf: 'flex-start'
  },
  providerFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  providerFilterLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 6
  },
  providerTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  providerTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  providerTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  providerTabTextActive: {
    color: '#FFF'
  },
  providerBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  exportBannerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  exportBannerBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13
  },
  dateFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2
  },
  datePresetPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  datePresetPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B82F6',
    borderWidth: 2
  },
  datePresetText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  datePresetTextActive: {
    color: '#3B82F6',
    fontWeight: '800'
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 160,
    gap: 8
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    outlineStyle: 'none'
  },
  rangePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    marginTop: 16
  },
  rangeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  applyFilterBtn: {
    backgroundColor: '#4A001A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  applyFilterBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13
  },
  resetFilterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  resetFilterBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13
  },
  headerDateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6
  },
  headerDateRangePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  moreFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6
  },
  moreFiltersBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF4E5'
  },
  moreFiltersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  moreFiltersBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '800'
  }
});
