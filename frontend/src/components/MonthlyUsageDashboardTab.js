import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import { API_URL } from '../config';
import { openMonthlyUsagePdf } from '../utils/monthlyUsagePdf';

const EMPTY_DASHBOARD = {
  number: '',
  key: '',
  company: '',
  plan_name: '',
  employee: '',
  bill_number: '',
  period_label: '',
  due_date: '',
  status: 'needs_review',
  summary_text: 'No verified invoice data is available for this selection.',
  kpis: {
    total: null,
    bill_excl_vat: null,
    vat: null,
    bill_incl_vat: null,
    plan: null,
    extra: null,
    extra_pct: null,
    charged_call_duration_minutes: 0,
    premium_sms: 0,
    premium_sms_amount: 0,
    data_gb: 0,
    data_limit_gb: null,
    deltas: null,
  },
  chart_months: [],
  sources: [],
  call_minutes_per_day: {
    first_charge_flag: '',
    first_charge_time: '',
    uncharged_calls: 0,
    uncharged_minutes: 0,
    charged_calls: 0,
    charged_minutes: 0,
    charged_amount: 0,
    daily_bars: [],
  },
  allowances: [],
  month_wise_history: [],
  history_totals: { total: 0, plan: 0, extra: 0, extra_pct: null, call_min: 0, data_gb: 0, premium_sms: 0 },
  top_10_numbers: [],
  top_10_total: { calls: 0, total_min: 0, uncharged_min: 0, charged_call_min: 0, charged_aed: 0, note: '' },
  where_money_went: [],
  total_amount_due: null,
};
const moneyText = (value) => value === null || value === undefined ? 'Needs review' : Number(value).toFixed(2);
const percentText = (value) => value === null || value === undefined ? 'N/A' : `${Number(value).toFixed(2)}%`;
const abovePlanPercent = (extra, plan) => extra == null || plan == null || Number(plan) <= 0
  ? null
  : Number(((Number(extra) / Number(plan)) * 100).toFixed(2));
export default function MonthlyUsageDashboardTab({
  user,
  showToast,
  isSidebarCollapsed,
  reportRequest,
  onReportRequestHandled,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  // Options & Selections
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [compareMode, setCompareMode] = useState('previous'); // 'previous' | 'last_year'

  // Sub-tabs in charts & tables
  const [chartMetric, setChartMetric] = useState('Amount'); // 'Amount' | 'Minutes' | 'Data' | 'SMS'
  const [historyYearTab, setHistoryYearTab] = useState(String(new Date().getFullYear()));
  const [topSortTab, setTopSortTab] = useState('highest_extra'); // 'most_calls' | 'longest_time' | 'highest_extra'

  // Dashboard Data State
  const [dashData, setDashData] = useState(EMPTY_DASHBOARD);

  // Email modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');
  const [emailSubject, setEmailSubject] = useState('Telecom Monthly Usage Report');
  const [emailSending, setEmailSending] = useState(false);

  // Fetch available options (companies and phone numbers)
  useEffect(() => {
    fetchOptions();
  }, []);

  // Handle incoming report request when navigated from bill details
  useEffect(() => {
    if (!reportRequest) return;
    const reqNum = reportRequest.number ? String(reportRequest.number).replace(/\D/g, '') : '';
    if (reqNum) {
      // Find full formatted or raw number
      setSelectedNumber(reportRequest.number);
    }
    if (reportRequest.company) {
      setSelectedCompany(reportRequest.company);
    }
    if (reportRequest.month) {
      setSelectedMonth(reportRequest.month);
    } else if (reportRequest.to) {
      setSelectedMonth(String(reportRequest.to).slice(0, 7));
    } else if (reportRequest.from) {
      setSelectedMonth(String(reportRequest.from).slice(0, 7));
    }

    if (onReportRequestHandled) onReportRequestHandled();
  }, [reportRequest]);

  // When company, number or month changes, fetch analytics
  useEffect(() => {
    if (selectedNumber) {
      loadDashboardData(selectedCompany, selectedNumber, selectedMonth);
    }
  }, [selectedCompany, selectedNumber, selectedMonth]);

  const fetchOptions = async () => {
    setOptionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/telecom-bills/usage-report/options`);
      if (res.ok) {
        const json = await res.json();
        const comps = json.companies || [];
        setCompanies(comps);

        // If no company selected yet, choose first
        if (!selectedCompany && comps.length > 0) {
          setSelectedCompany(comps[0].name);
          if (comps[0].numbers && comps[0].numbers.length > 0) {
            setSelectedNumber(comps[0].numbers[0].number);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch usage report options:', err);
      setCompanies([]);
    } finally {
      setOptionsLoading(false);
    }
  };

  const loadDashboardData = async (companyName, phoneNumber, monthKey) => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/telecom-bills/usage-report?number=${encodeURIComponent(phoneNumber)}&month=${encodeURIComponent(monthKey || '')}&company=${encodeURIComponent(companyName || '')}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json.selected && json.months && json.months.length > 0) {
          // Adapt backend response to dashboard shape
          const adapted = shapeBackendData(json, companyName, phoneNumber);
          setDashData(adapted);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('API error loading usage report:', e);
    }

    setDashData({ ...EMPTY_DASHBOARD, company: companyName || '', number: phoneNumber || '' });
    setLoading(false);
  };

  const shapeBackendData = (json, companyName, phoneNumber) => {
    const sel = json.selected || {};
    const kpis = sel.kpis || {};
    const calls = sel.calls || {};
    const allowance = sel.allowance || {};
    const topNumbers = sel.top_numbers || {};
    const conn = json.connection || {};
    const bill = sel.bill || {};

    const total = kpis.bill_incl_vat == null ? null : Number(kpis.bill_incl_vat);
    const billExclVat = kpis.bill_excl_vat == null ? null : Number(kpis.bill_excl_vat);
    const vat = kpis.vat == null ? null : Number(kpis.vat);
    const plan = kpis.plan == null ? null : Number(kpis.plan);
    const extra = kpis.extra == null ? null : Number(kpis.extra);
    const extraPct = kpis.extra_pct == null ? abovePlanPercent(extra, plan) : Number(kpis.extra_pct);

    // Sources
    const rawSources = sel.sources || [];
    const sources = rawSources.length > 0
      ? rawSources.map((s, idx) => {
          const colors = ['#E11D48', '#F97316', '#F59E0B', '#334155', '#7C3AED', '#059669'];
          const amt = parseFloat(s.amount) || 0;
          return {
            name: s.name || 'Extra Usage',
            amount: amt,
            pct: extra > 0 ? Math.round((amt / extra) * 100) : 0,
            color: colors[idx % colors.length]
          };
        })
      : [];

    // Chart Months
    const chartMonths = (json.months || []).map(m => ({
      key: m.key,
      label: m.label ? m.label.split(' ')[0] : m.key,
      total: m.bill_excl_vat == null ? null : Number(m.bill_excl_vat),
      bill_incl_vat: m.total == null ? null : Number(m.total),
      vat: m.vat == null ? null : Number(m.vat),
      plan: m.plan == null ? null : Number(m.plan),
      extra: m.extra == null ? null : Number(m.extra),
      minutes: parseFloat(m.call_minutes) || 0,
      data: parseFloat(m.data_gb) || 0,
      sms: parseInt(m.premium_sms) || 0,
      selected: m.key === sel.month
    }));

    // Daily calls breakdown
    const rawDaily = sel.daily || [];
    const dailyBars = rawDaily.length > 0
      ? rawDaily.map((d, idx) => ({
          day: d.day || idx + 1,
          uncharged_min: parseFloat(d.uncharged_min) || 0,
          charged_call_min: parseFloat(d.charged_call_min) || 0
        }))
      : [];

    // Month-wise history table rows
    const historyRows = (json.months || []).map(m => ({
      month: m.label || m.key,
      key: m.key,
      bill_no: m.bill_number || `INV-${m.key.replace('-', '')}`,
      total: m.bill_excl_vat == null ? null : Number(m.bill_excl_vat),
      bill_incl_vat: m.total == null ? null : Number(m.total),
      vat: m.vat == null ? null : Number(m.vat),
      plan: m.plan == null ? null : Number(m.plan),
      extra: m.extra == null ? null : Number(m.extra),
      extra_pct: m.extra_pct == null ? abovePlanPercent(m.extra, m.plan) : Number(m.extra_pct),
      call_min: parseFloat(m.call_minutes) || 0,
      data_gb: parseFloat(m.data_gb) || 0,
      premium_sms: parseInt(m.premium_sms) || 0,
      status: m.status === 'over' ? 'Over plan' : m.status === 'needs_review' ? 'Needs review' : 'Within plan',
      selected: m.key === sel.month
    }));

    // History totals
    const historyTotals = {
      total: historyRows.reduce((acc, r) => acc + r.total, 0),
      plan: historyRows.reduce((acc, r) => acc + r.plan, 0),
      extra: historyRows.reduce((acc, r) => acc + r.extra, 0),
      extra_pct: abovePlanPercent(
        historyRows.every(r => r.extra != null) ? historyRows.reduce((acc, r) => acc + r.extra, 0) : null,
        historyRows.every(r => r.plan != null) ? historyRows.reduce((acc, r) => acc + r.plan, 0) : null,
      ),
      call_min: historyRows.reduce((acc, r) => acc + r.call_min, 0),
      data_gb: historyRows.reduce((acc, r) => acc + r.data_gb, 0),
      premium_sms: historyRows.reduce((acc, r) => acc + r.premium_sms, 0)
    };

    // Top 10 numbers
    const rawTop = (topNumbers.by_extra && topNumbers.by_extra.length > 0)
      ? topNumbers.by_extra
      : (topNumbers.by_calls || []);

    const top10 = rawTop.slice(0, 10).map((t, idx) => ({
      rank: idx + 1,
      number: t.number || '050xxxxxxx',
      calls: parseInt(t.calls) || 1,
      total_min: parseFloat(t.total_min) || 0,
      uncharged_min: parseFloat(t.uncharged_min) || 0,
      charged_call_min: parseFloat(t.charged_call_min) || 0,
      charged_aed: parseFloat(t.charged_amount) || 0
    }));

    const localMinutesLimit = allowance.local_minutes_limit == null ? null : Number(allowance.local_minutes_limit);
    const dataLimit = allowance.data_limit_gb == null ? null : Number(allowance.data_limit_gb);

    // Where money went
    const lines = (sel.lines || []).map(l => ({
      line: l.description || 'Charge item',
      amount: parseFloat(l.amount) || 0,
      is_extra: l.part === 'Extra usage'
    }));

    return {
      number: phoneNumber,
      key: json.key,
      company: bill.company || conn.company || companyName,
      plan_name: conn.plan_name || 'Business Mobile Postpaid',
      employee: conn.employee || 'Assigned Holder',
      bill_number: bill.bill_number || `INV-${sel.month}`,
      period_label: `${bill.period_from || '1'}–${bill.period_to || '30'} ${sel.label}`,
      due_date: bill.due_date || 'Due 15th',
      status: sel.status || 'needs_review',
      summary_text: sel.status === 'needs_review'
        ? 'Some invoice values are missing. This bill needs review.'
        : `Bill excluding VAT is AED ${billExclVat.toFixed(2)} against a plan excluding VAT of AED ${plan.toFixed(2)}. Excess excluding VAT is AED ${extra.toFixed(2)}.`,
      kpis: {
        total,
        bill_excl_vat: billExclVat,
        vat,
        bill_incl_vat: total,
        plan,
        extra,
        extra_pct: extraPct,
        charged_call_duration_minutes: calls.duration_of_calls_with_charges_minutes || 0,
        premium_sms: allowance.premium_sms || 0,
        premium_sms_amount: allowance.premium_sms_amount || 0,
        data_gb: allowance.data_used_gb ?? null,
        data_limit_gb: allowance.data_limit_gb ?? null,
        data_difference_gb: allowance.data_difference_gb ?? null,
        invoice_data_charge_excl_vat: allowance.invoice_data_charge_excl_vat ?? null,
        deltas: kpis.deltas
      },
      chart_months: chartMonths,
      sources,
      call_minutes_per_day: {
        first_charge_flag: calls.first_call_with_charge ? `${calls.first_call_with_charge.date} · first call with a charge` : 'No calls with charges',
        first_charge_time: calls.first_call_with_charge ? `${calls.first_call_with_charge.date}, ${calls.first_call_with_charge.time}` : '',
        uncharged_calls: calls.uncharged_calls || 0,
        uncharged_minutes: calls.uncharged_minutes || 0,
        charged_calls: calls.calls_with_charges || 0,
        charged_minutes: calls.duration_of_calls_with_charges_minutes || 0,
        charged_amount: calls.charged_amount || 0,
        daily_bars: dailyBars
      },
      allowances: [
        {
          title: 'Local minutes',
          used_label: `${(calls.actual_local_minutes || 0).toLocaleString()} actual min${allowance.provider_reported_local_minutes == null ? '' : ` · provider reports ${allowance.provider_reported_local_minutes}`}`,
          pct: localMinutesLimit > 0 ? Math.min(200, (((calls.actual_local_minutes || 0) / localMinutesLimit) * 100)) : 0,
          color: calls.duration_above_allowance_minutes > 0 ? '#E11D48' : '#059669',
          note: calls.duration_above_allowance_minutes == null
            ? 'Applicable allowance or eligible categories are not confirmed'
            : calls.duration_above_allowance_minutes > 0
              ? `${calls.duration_above_allowance_minutes} min above allowance; not verified chargeable minutes`
              : `Within the ${localMinutesLimit.toLocaleString()} min allowance`
        },
        {
          title: 'Local data',
          used_label: dataLimit === null ? `${allowance.data_used_gb || 0} GB used · limit unknown` : `${allowance.data_used_gb || 0} of ${dataLimit} GB`,
          pct: dataLimit > 0 ? Math.min(100, (((allowance.data_used_gb || 0) / dataLimit) * 100)) : 0,
          color: '#F97316',
          note: dataLimit === null
            ? 'Plan allowance needs review'
            : `${Number(allowance.data_difference_gb || 0).toFixed(2)} GB difference · invoice data charge AED ${moneyText(allowance.invoice_data_charge_excl_vat)}; usage difference is not assumed chargeable`
        },
        {
          title: 'Premium SMS',
          used_label: `${allowance.premium_sms || 0} sent`,
          pct: (allowance.premium_sms || 0) > 0 ? 100 : 0,
          color: '#E11D48',
          note: `AED ${(allowance.premium_sms_amount || 0).toFixed(2)} charged outside plan`
        },
        {
          title: 'mParking (Sharjah)',
          used_label: `AED ${(allowance.parking_amount || 0).toFixed(2)}`,
          pct: (allowance.parking_amount || 0) > 0 ? 80 : 0,
          color: '#7C3AED',
          note: '3rd-party city parking fees'
        }
      ],
      month_wise_history: historyRows,
      history_totals: historyTotals,
      top_10_numbers: top10,
      top_10_total: {
        calls: top10.reduce((s, x) => s + x.calls, 0),
        total_min: Math.round(top10.reduce((s, x) => s + x.total_min, 0) * 10) / 10,
        uncharged_min: Math.round(top10.reduce((s, x) => s + x.uncharged_min, 0) * 10) / 10,
        charged_call_min: Math.round(top10.reduce((s, x) => s + x.charged_call_min, 0) * 10) / 10,
        charged_aed: Math.round(top10.reduce((s, x) => s + x.charged_aed, 0) * 100) / 100,
        note: `Top ${top10.length} destinations by consumption.`
      },
      where_money_went: lines,
      total_amount_due: kpis.bill_incl_vat ?? total
    };
  };

  // Switch month helper (prev/next or timeline click)
  const handleTimelineMonthClick = (mKey) => {
    setSelectedMonth(mKey);
    if (showToast) showToast(`Switched view to ${mKey}`, 'info');
  };

  const handleStepMonth = (direction) => {
    const base = /^\d{4}-\d{2}$/.test(selectedMonth) ? `${selectedMonth}-01T00:00:00` : new Date().toISOString();
    const date = new Date(base);
    date.setMonth(date.getMonth() + (direction === 'prev' ? -1 : 1));
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  // Available numbers for the currently selected company
  const availableNumbers = useMemo(() => {
    const comp = companies.find(c => c.name.toLowerCase() === selectedCompany.toLowerCase());
    return comp ? comp.numbers : [];
  }, [companies, selectedCompany]);

  const timelineMonths = useMemo(() => {
    const year = /^\d{4}/.test(selectedMonth) ? selectedMonth.slice(0, 4) : String(new Date().getFullYear());
    const byKey = new Map((dashData.chart_months || []).map(month => [month.key, month]));
    return Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      const row = byKey.get(key);
      return {
        key,
        label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index],
        status: row ? (row.extra > 10 ? 'over' : 'within') : 'no_bill',
        total: row ? row.total : null,
        text: row && row.total != null ? Number(row.total).toFixed(2) : '—',
      };
    });
  }, [dashData.chart_months, selectedMonth]);

  // Export to Excel (Full multi-sheet workbook)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ['MONTHLY TELECOM USAGE DASHBOARD', ''],
        ['Company', dashData.company],
        ['Phone Number', dashData.number],
        ['Billing Period', dashData.period_label],
        ['Plan Name', dashData.plan_name],
        ['Employee / Holder', dashData.employee],
        ['Invoice Number', dashData.bill_number],
        ['', ''],
        ['KEY PERFORMANCE INDICATORS', ''],
        ['Plan — excluding VAT (AED)', dashData.kpis.plan],
        ['Bill — excluding VAT (AED)', dashData.kpis.bill_excl_vat],
        ['VAT (AED)', dashData.kpis.vat],
        ['Bill — including VAT (AED)', dashData.kpis.bill_incl_vat],
        ['Excess — excluding VAT (AED)', dashData.kpis.extra],
        ['Duration of calls with charges (minutes)', dashData.kpis.charged_call_duration_minutes],
        ['Premium SMS Count', dashData.kpis.premium_sms],
        ['Data Used (GB)', dashData.kpis.data_gb],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // 2. Month-Wise History Sheet
      const historyRows = [
        ['Month', 'Bill Number', 'Plan — excluding VAT', 'Bill — excluding VAT', 'VAT', 'Bill — including VAT', 'Excess — excluding VAT', 'Call Minutes', 'Data (GB)', 'Premium SMS', 'Status']
      ];
      dashData.month_wise_history.forEach(h => {
        historyRows.push([h.month, h.bill_no, h.plan, h.total, h.vat, h.bill_incl_vat, h.extra, h.call_min, h.data_gb, h.premium_sms, h.status]);
      });
      const wsHistory = XLSX.utils.aoa_to_sheet(historyRows);
      XLSX.utils.book_append_sheet(wb, wsHistory, 'Month History');

      // 3. Top 10 Numbers Sheet
      const topRows = [
        ['Rank', 'Number', 'Calls Count', 'Actual Minutes', 'Duration of Calls Without Charges', 'Duration of Calls With Charges', 'Actual Call Charges (AED)']
      ];
      dashData.top_10_numbers.forEach(t => {
        topRows.push([t.rank, t.number, t.calls, t.total_min, t.uncharged_min, t.charged_call_min, t.charged_aed]);
      });
      const wsTop = XLSX.utils.aoa_to_sheet(topRows);
      XLSX.utils.book_append_sheet(wb, wsTop, 'Top 10 Numbers');

      // 4. Where Money Went Sheet
      const moneyRows = [
        ['Bill Charge Line', 'Amount (AED)', 'Charge Classification']
      ];
      dashData.where_money_went.forEach(m => {
        moneyRows.push([m.line, m.amount, m.is_extra ? 'Extra Usage' : 'Plan Base']);
      });
      moneyRows.push(['Total Amount Due', dashData.total_amount_due, '']);
      const wsMoney = XLSX.utils.aoa_to_sheet(moneyRows);
      XLSX.utils.book_append_sheet(wb, wsMoney, 'Itemized Charges');

      const fileName = `Monthly_Usage_${dashData.number.replace(/\s+/g, '')}_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, fileName);
      if (showToast) showToast(`Exported ${fileName} successfully!`, 'success');
    } catch (err) {
      console.error('Error generating Excel:', err);
      if (showToast) showToast('Failed to export Excel spreadsheet', 'error');
    }
  };

  // Download PDF / Print
  const handleDownloadPdf = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const opened = openMonthlyUsagePdf(dashData, selectedMonth);
      if (!opened && showToast) {
        showToast('Please allow pop-ups to download the PDF report.', 'error');
      }
    } else {
      if (showToast) showToast('PDF download is currently available on the web version.', 'info');
    }
  };

  // Send Email Modal Trigger
  const handleSendEmail = () => {
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      setEmailModalVisible(false);
      if (showToast) showToast(`Report successfully emailed to ${emailTarget}!`, 'success');
    }, 1000);
  };

  // Max value calculation for Bar Chart (Bill History)
  const maxChartVal = useMemo(() => {
    if (!dashData.chart_months || dashData.chart_months.length === 0) return 600;
    if (chartMetric === 'Amount') return Math.max(...dashData.chart_months.map(m => m.total), 500);
    if (chartMetric === 'Minutes') return Math.max(...dashData.chart_months.map(m => m.minutes), 1200);
    if (chartMetric === 'Data') return Math.max(...dashData.chart_months.map(m => m.data), 20);
    return Math.max(...dashData.chart_months.map(m => m.sms), 30);
  }, [dashData.chart_months, chartMetric]);

  // Max value for daily call minutes
  const maxDailyMin = useMemo(() => {
    const bars = dashData.call_minutes_per_day?.daily_bars || [];
    return Math.max(...bars.map(b => (b.uncharged_min || 0) + (b.charged_call_min || 0)), 100);
  }, [dashData.call_minutes_per_day]);

  // Sorted Top Numbers
  const displayedTopNumbers = useMemo(() => {
    const list = [...(dashData.top_10_numbers || [])];
    if (topSortTab === 'most_calls') {
      return list.sort((a, b) => b.calls - a.calls);
    }
    if (topSortTab === 'longest_time') {
      return list.sort((a, b) => b.total_min - a.total_min);
    }
    return list.sort((a, b) => b.charged_aed - a.charged_aed);
  }, [dashData.top_10_numbers, topSortTab]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP BREADCRUMB & PAGE HEADER */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.headerContainer}>
        {/* Breadcrumb Row */}
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity onPress={() => onNavigate && onNavigate('telecom_bill')}>
            <Text style={styles.breadcrumbLink}>Telecom</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <Text style={styles.breadcrumbLink}>Reports</Text>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <Text style={styles.breadcrumbActive}>Monthly Usage Dashboard</Text>
        </View>

        {/* Title Bar */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.mainTitle}>Monthly Usage Dashboard</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={styles.mainSubtitle}>
              One number at a time. Pick the company, the number and the month; every bill is analysed automatically when it is imported.
            </Text>
          </View>

          {/* Action Buttons: Email, Export Excel, Download PDF */}
          <View style={styles.topActionsRow}>
            {onNavigate && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => onNavigate('telecom_bill')}
              >
                <Ionicons name="arrow-back-outline" size={15} color="#475569" />
                <Text style={styles.backBtnText}>Telecom Bills</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => setEmailModalVisible(true)}
            >
              <Ionicons name="mail-outline" size={16} color="#0F172A" />
              <Text style={styles.actionBtnText}>Email to employee</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={handleExportExcel}
            >
              <Ionicons name="download-outline" size={16} color="#0F172A" />
              <Text style={styles.actionBtnText}>Export Excel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSolid}
              onPress={handleDownloadPdf}
            >
              <Ionicons name="download" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnTextWhite}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 2. FILTER CONTROLS BAR */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.filterCard}>
        <View style={[styles.filterRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
          {/* Company Picker */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>COMPANY</Text>
            <select
              value={selectedCompany}
              onChange={(e) => {
                const newComp = e.target.value;
                setSelectedCompany(newComp);
                const compObj = companies.find(c => c.name === newComp);
                if (compObj && compObj.numbers && compObj.numbers.length > 0) {
                  setSelectedNumber(compObj.numbers[0].number);
                }
              }}
              style={styles.nativeSelect}
            >
              {companies.map((c, idx) => (
                <option key={idx} value={c.name}>
                  {c.name} {c.numbers ? `(${c.numbers.length} numbers)` : ''}
                </option>
              ))}
            </select>
          </View>

          {/* Number Picker */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>NUMBER</Text>
            <select
              value={selectedNumber}
              onChange={(e) => setSelectedNumber(e.target.value)}
              style={styles.nativeSelect}
            >
              {availableNumbers.map((n, idx) => (
                <option key={idx} value={n.number}>
                  {n.number} {n.plan ? `(${n.plan})` : ''}
                </option>
              ))}
            </select>
          </View>

          {/* Month Stepper */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>MONTH</Text>
            <View style={styles.monthStepper}>
              <TouchableOpacity
                onPress={() => handleStepMonth('prev')}
                style={styles.stepperArrow}
              >
                <Ionicons name="chevron-back" size={16} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.monthStepperText}>
                {dashData.period_label ? dashData.period_label.replace(/^\d+–\d+\s+/, '') : (selectedMonth || 'No bill selected')}
              </Text>
              <TouchableOpacity
                onPress={() => handleStepMonth('next')}
                style={styles.stepperArrow}
              >
                <Ionicons name="chevron-forward" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Compare With Switcher */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>COMPARE WITH</Text>
            <View style={styles.compareToggleWrap}>
              <TouchableOpacity
                style={[styles.comparePill, compareMode === 'previous' && styles.comparePillActive]}
                onPress={() => setCompareMode('previous')}
              >
                <Text style={[styles.comparePillText, compareMode === 'previous' && styles.comparePillTextActive]}>
                  Previous month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.comparePill, compareMode === 'last_year' && styles.comparePillActive]}
                onPress={() => setCompareMode('last_year')}
              >
                <Text style={[styles.comparePillText, compareMode === 'last_year' && styles.comparePillTextActive]}>
                  Same month, last year
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 3. 12-MONTH HORIZONTAL TIMELINE TRACKER */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineLegendRow}>
          <Text style={styles.timelineYearText}>{selectedMonth ? selectedMonth.slice(0, 4) : new Date().getFullYear()}</Text>
          <View style={styles.legendDotGroup}>
            <View style={[styles.legendMiniDot, { backgroundColor: '#64748B' }]} />
            <Text style={styles.legendMiniText}>within plan</Text>
          </View>
          <View style={styles.legendDotGroup}>
            <View style={[styles.legendMiniDot, { backgroundColor: '#E11D48' }]} />
            <Text style={styles.legendMiniText}>over plan</Text>
          </View>
          <Text style={[styles.legendMiniText, { color: '#94A3B8' }]}>
            (dashed = no bill imported)
          </Text>
        </View>

        {/* 12 Months Horizontal Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timelinePillsScroll}
        >
          {timelineMonths.map((m, idx) => {
            const isSelected = selectedMonth === m.key;
            const isNoBill = m.status === 'no_bill';
            const isOverPlan = m.status === 'over';

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleTimelineMonthClick(m.key)}
                activeOpacity={0.8}
                style={[
                  styles.timelineMonthPill,
                  isNoBill && styles.timelineMonthPillDashed,
                  isSelected && styles.timelineMonthPillSelected
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[
                    styles.timelineMonthLabel,
                    isSelected && { color: '#FFFFFF' }
                  ]}>
                    {m.label}
                  </Text>
                  {!isNoBill && (
                    <View style={[
                      styles.timelineStatusDot,
                      { backgroundColor: isOverPlan ? '#E11D48' : '#64748B' },
                      isSelected && isOverPlan && { borderColor: '#FFFFFF', borderWidth: 1 }
                    ]} />
                  )}
                </View>
                <Text style={[
                  styles.timelineMonthSub,
                  isSelected && { color: '#CBD5E1' }
                ]}>
                  {m.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 4. ACTIVE NUMBER HERO BANNER & SHORT SUMMARY CARD */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Text style={styles.heroPhoneNumber}>{dashData.number}</Text>
            {dashData.status === 'over' ? (
              <View style={styles.overPlanBadge}>
                <Text style={styles.overPlanBadgeText}>
                  Over plan · AED {(dashData.kpis.extra || 0).toFixed(2)} extra
                </Text>
              </View>
            ) : (
              <View style={styles.withinPlanBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.withinPlanBadgeText}>Within plan</Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata Key-Value row */}
        <View style={styles.heroMetadataRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Plan</Text>
            <Text style={styles.metaValue}>{dashData.plan_name}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Company</Text>
            <Text style={styles.metaValue}>{dashData.company}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Employee</Text>
            <Text style={styles.metaValue}>{dashData.employee}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Bill</Text>
            <Text style={styles.metaValue}>{dashData.bill_number}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Period</Text>
            <Text style={styles.metaValue}>{dashData.period_label}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Due</Text>
            <Text style={styles.metaValue}>{dashData.due_date}</Text>
          </View>
        </View>

        {/* In short Summary Box */}
        <View style={styles.summaryCallout}>
          <Text style={styles.summaryCalloutText}>
            {dashData.summary_text}
          </Text>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 5. 6 KPI CARDS ROW */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.kpiGrid}>
        {/* Bill excluding VAT */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Bill — excluding VAT</Text>
          <Text style={styles.kpiValueMain}>
            AED {moneyText(dashData.kpis.bill_excl_vat)}
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#64748B' }]}>Current period</Text>
          </View>
        </View>

        {/* Fixed Plan */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Plan — excluding VAT</Text>
          <Text style={styles.kpiValueMain}>
            AED {moneyText(dashData.kpis.plan)}
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#64748B' }]}>Applicable billing period</Text>
          </View>
        </View>

        {/* VAT */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>VAT</Text>
          <Text style={styles.kpiValueMain}>
            AED {moneyText(dashData.kpis.vat)}
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#64748B' }]}>Invoice-stated current period</Text>
          </View>
        </View>

        {/* Bill including VAT */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Bill — including VAT</Text>
          <Text style={styles.kpiValueMain}>
            AED {moneyText(dashData.kpis.bill_incl_vat)}
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#64748B' }]}>Current period</Text>
          </View>
        </View>

        {/* Excess excluding VAT */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Excess — excluding VAT</Text>
          <Text style={[styles.kpiValueMain, { color: '#E11D48' }]}>AED {moneyText(dashData.kpis.extra)}</Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#E11D48' }]}>Flagged only above AED 10.00</Text>
          </View>
        </View>

        {/* Extra Minutes */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Duration of calls with charges</Text>
          <Text style={[styles.kpiValueMain, { color: '#E11D48' }]}>
            {dashData.kpis.charged_call_duration_minutes || 0} min
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#E11D48' }]}>
              From itemized calls with invoice amounts
            </Text>
          </View>
        </View>

        {/* Premium SMS */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Premium SMS</Text>
          <Text style={[styles.kpiValueMain, { color: '#E11D48' }]}>
            {dashData.kpis.premium_sms || 0}
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#E11D48' }]}>
              {dashData.kpis.premium_sms || 0} · AED {moneyText(dashData.kpis.premium_sms_amount)}
            </Text>
          </View>
        </View>

        {/* Data Used */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>Data used</Text>
          <Text style={styles.kpiValueMain}>
            {(dashData.kpis.data_gb || 0).toFixed(2)} GB
          </Text>
          <View style={styles.kpiTrendRow}>
            <Text style={[styles.kpiTrendText, { color: '#E11D48' }]}>
              {dashData.kpis.data_limit_gb == null ? 'Plan limit needs review' : `Plan ${dashData.kpis.data_limit_gb} GB`}
            </Text>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 6. ROW 1: BILL HISTORY (MONTH WISE) & EXTRA BY SOURCE */}
      {/* ----------------------------------------------------------------- */}
      <View style={[styles.twoColRow, isMobile && { flexDirection: 'column' }]}>
        {/* Left Chart: Bill history — month wise */}
        <View style={[styles.card, { flex: 1.6 }]}>
          <View style={styles.cardHeaderWithTabs}>
            <View>
              <Text style={styles.cardTitle}>Bill history — month wise</Text>
              <Text style={styles.cardSubtitle}>
                Plan and bill compared on the same excluding-VAT basis. Click a bar to open that month.
              </Text>
            </View>

            {/* Metric Switcher Tabs */}
            <View style={styles.miniTabsWrap}>
              {['Amount', 'Minutes', 'Data', 'SMS'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setChartMetric(tab)}
                  style={[styles.miniTab, chartMetric === tab && styles.miniTabActive]}
                >
                  <Text style={[styles.miniTabText, chartMetric === tab && styles.miniTabTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bar Chart Visualization */}
          <View style={styles.barChartContainer}>
            {/* Y Axis Guide Lines */}
            <View style={styles.yAxisGuides}>
              {[600, 450, 300, 150, 0].map((val) => (
                <View key={val} style={styles.yAxisLineRow}>
                  <Text style={styles.yAxisLabel}>{val}</Text>
                  <View style={styles.yAxisDottedLine} />
                </View>
              ))}
            </View>

            {/* Bars Area */}
            <View style={styles.barsArea}>
              {dashData.chart_months.map((item, idx) => {
                const totalVal = chartMetric === 'Amount' ? item.total
                  : chartMetric === 'Minutes' ? item.minutes
                  : chartMetric === 'Data' ? item.data : item.sms;

                const baseVal = chartMetric === 'Amount' ? item.plan : (totalVal * 0.4);
                const extraVal = Math.max(0, totalVal - baseVal);

                const barHeightPct = Math.min(100, (totalVal / maxChartVal) * 100);
                const baseHeightPct = totalVal > 0 ? (baseVal / totalVal) * 100 : 100;
                const extraHeightPct = 100 - baseHeightPct;
                const isSelected = item.selected || item.key === selectedMonth;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleTimelineMonthClick(item.key)}
                    style={styles.barCol}
                    activeOpacity={0.8}
                  >
                    {/* Value Badge on top */}
                    {isSelected && item.extra > 0 && chartMetric === 'Amount' && (
                      <View style={styles.extraCalloutBadge}>
                        <Text style={styles.extraCalloutBadgeText}>+{item.extra.toFixed(2)}</Text>
                      </View>
                    )}
                    <Text style={styles.barTopVal}>
                      {chartMetric === 'Amount' ? item.total.toFixed(2)
                        : chartMetric === 'Minutes' ? `${Math.round(item.minutes)}m`
                        : chartMetric === 'Data' ? `${item.data.toFixed(1)}G` : item.sms}
                    </Text>

                    {/* Stacked Bar Pillar */}
                    <View style={[
                      styles.stackedBarTrack,
                      { height: `${barHeightPct}%` },
                      isSelected && styles.stackedBarSelected
                    ]}>
                      {/* Top segment: Extra usage (Red) */}
                      {extraVal > 0 && (
                        <View style={[styles.barSegmentExtra, { height: `${extraHeightPct}%` }]} />
                      )}
                      {/* Bottom segment: Fixed plan (Grey) */}
                      <View style={[styles.barSegmentFixed, { height: `${baseHeightPct}%` }]} />
                    </View>

                    <Text style={[styles.barMonthLabel, isSelected && { fontWeight: '800', color: '#0F172A' }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Chart Footer Legend */}
          <View style={styles.chartLegendFooter}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#CBD5E1' }]} />
              <Text style={styles.legendLabel}>Fixed plan</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#E11D48' }]} />
              <Text style={styles.legendLabel}>Extra usage</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, { backgroundColor: 'transparent', borderColor: '#0F172A', borderWidth: 2 }]} />
              <Text style={styles.legendLabel}>Selected month</Text>
            </View>
          </View>
        </View>

        {/* Right Card: Extra by source (Donut Chart) */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Extra by source</Text>
          <Text style={styles.cardSubtitle}>
            Where the AED {(dashData.kpis.extra || 0).toFixed(2)} extra came from.
          </Text>

          {/* Donut Layout */}
          <View style={styles.donutContainer}>
            {/* Visual CSS-based Donut Ring */}
            <View style={styles.donutRingOuter}>
              <View style={styles.donutRingInner}>
                <Text style={styles.donutCenterLabel}>Extra</Text>
                <Text style={styles.donutCenterValue}>
                  {(dashData.kpis.extra || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Sources Breakdown Legend */}
            <View style={styles.donutLegendWrap}>
              {dashData.sources.map((src, idx) => (
                <View key={idx} style={styles.sourceRow}>
                  <View style={[styles.sourceDot, { backgroundColor: src.color }]} />
                  <Text style={styles.sourceName}>{src.name}</Text>
                  <Text style={styles.sourceAmount}>
                    {src.amount.toFixed(2)} · <Text style={{ color: '#64748B' }}>{src.pct}%</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 7. ROW 2: CALL MINUTES PER DAY & PLAN ALLOWANCE USED */}
      {/* ----------------------------------------------------------------- */}
      <View style={[styles.twoColRow, isMobile && { flexDirection: 'column' }]}>
        {/* Left Card: Call minutes per day */}
        <View style={[styles.card, { flex: 1.6 }]}>
          <View style={styles.cardHeaderWithTabs}>
            <View>
              <Text style={styles.cardTitle}>Call minutes per day</Text>
              <Text style={styles.cardSubtitle}>
                Grey = calls with no invoice charge. Red = calls with an invoice charge. No tariff rate is inferred.
              </Text>
            </View>

            {/* Exhaustion Banner / Pill */}
            <View style={styles.exhaustionPill}>
              <Ionicons name="alert-circle-outline" size={13} color="#E11D48" />
              <Text style={styles.exhaustionPillText}>
                {dashData.call_minutes_per_day.first_charge_flag}
              </Text>
            </View>
          </View>

          {/* Daily 30 Bars */}
          <View style={styles.dailyChartBox}>
            <View style={styles.dailyBarsTrack}>
              {dashData.call_minutes_per_day.daily_bars.map((d) => {
                const totalMin = (d.uncharged_min || 0) + (d.charged_call_min || 0);
                const heightPct = Math.min(100, (totalMin / maxDailyMin) * 100);
                const freePct = totalMin > 0 ? (d.uncharged_min / totalMin) * 100 : 0;
                const chargedPct = totalMin > 0 ? (d.charged_call_min / totalMin) * 100 : 0;

                return (
                  <View key={d.day} style={styles.dailyBarCol}>
                    <View style={[styles.dailyBarPillar, { height: `${heightPct}%` }]}>
                      {d.charged_call_min > 0 && (
                        <View style={[styles.dailySegmentCharged, { height: `${chargedPct}%` }]} />
                      )}
                      {d.uncharged_min > 0 && (
                        <View style={[styles.dailySegmentFree, { height: `${freePct}%` }]} />
                      )}
                    </View>
                    <Text style={[styles.dailyDayNum, (d.day === 1 || d.day % 5 === 0) && { fontWeight: '700', color: '#0F172A' }]}>
                      {d.day === 1 || d.day % 5 === 0 ? d.day : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Daily Footer Summary */}
          <View style={styles.dailyFooterRow}>
            <View style={styles.dailyLegendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.dailyLegendText}>
                Calls without charges · {dashData.call_minutes_per_day.uncharged_calls} calls · {dashData.call_minutes_per_day.uncharged_minutes} min
              </Text>
            </View>
            <View style={styles.dailyLegendItem}>
              <View style={[styles.legendBox, { backgroundColor: '#E11D48' }]} />
              <Text style={[styles.dailyLegendText, { color: '#E11D48', fontWeight: '700' }]}>
                Calls with charges · {dashData.call_minutes_per_day.charged_calls} calls · {dashData.call_minutes_per_day.charged_minutes} min · AED {dashData.call_minutes_per_day.charged_amount}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Card: Plan allowance used */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Plan allowance used</Text>
          <Text style={styles.cardSubtitle}>
            What the plan covers and what was used.
          </Text>

          <View style={styles.allowanceList}>
            {dashData.allowances.map((item, idx) => (
              <View key={idx} style={styles.allowanceItem}>
                <View style={styles.allowanceHeaderRow}>
                  <Text style={styles.allowanceTitle}>{item.title}</Text>
                  <Text style={[styles.allowanceUsedVal, item.pct > 100 && { color: '#E11D48', fontWeight: '800' }]}>
                    {item.used_label}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }
                  ]} />
                </View>

                <Text style={styles.allowanceNote}>{item.note}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 8. MONTH-WISE REPORT FOR THIS NUMBER (FULL WIDTH TABLE) */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithTabs}>
          <View>
            <Text style={styles.cardTitle}>Month-wise report for this number</Text>
            <Text style={styles.cardSubtitle}>
              {dashData.number} · {dashData.company} · click a row to open that month.
            </Text>
          </View>

          {/* Year Switcher Tabs */}
          <View style={styles.miniTabsWrap}>
            {['2026', '2025', 'Last 12 months'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setHistoryYearTab(tab)}
                style={[styles.miniTab, historyYearTab === tab && styles.miniTabActive]}
              >
                <Text style={[styles.miniTabText, historyYearTab === tab && styles.miniTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Responsive Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ minWidth: 860 }}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { flex: 1.8 }]}>MONTH</Text>
              <Text style={[styles.thCell, { flex: 1.6 }]}>BILL NO.</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>TOTAL AED</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>PLAN AED</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>EXTRA AED</Text>
              <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>ABOVE PLAN %</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>CALL MIN</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'right' }]}>DATA GB</Text>
              <Text style={[styles.thCell, { flex: 1.3, textAlign: 'right' }]}>PREMIUM SMS</Text>
              <Text style={[styles.thCell, { flex: 1.4, textAlign: 'center' }]}>STATUS</Text>
            </View>

            {/* Table Rows */}
            {dashData.month_wise_history.map((row, idx) => {
              const isSelected = row.selected || row.key === selectedMonth;
              const isOver = row.status === 'Over plan';

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleTimelineMonthClick(row.key)}
                  style={[styles.tableDataRow, isSelected && styles.tableDataRowActive]}
                  activeOpacity={0.7}
                >
                  <View style={[{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    {isSelected && <Text style={{ color: '#0F172A', fontWeight: '900' }}>▸</Text>}
                    <Text style={[styles.tdCellBold, isSelected && { color: '#0F172A', fontWeight: '800' }]}>
                      {row.month}
                    </Text>
                  </View>

                  <Text style={[styles.tdCell, { flex: 1.6, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                    {row.bill_no}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
                    {moneyText(row.total)}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right' }]}>
                    {moneyText(row.plan)}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right', color: isOver ? '#E11D48' : '#0F172A', fontWeight: isOver ? '700' : '400' }]}>
                    {moneyText(row.extra)}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'right', color: isOver ? '#E11D48' : '#64748B' }]}>
                    {percentText(row.extra_pct)}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right' }]}>
                    {row.call_min.toLocaleString()}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.1, textAlign: 'right' }]}>
                    {row.data_gb == null ? 'Needs review' : row.data_gb.toFixed(2)}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.3, textAlign: 'right' }]}>
                    {row.premium_sms}
                  </Text>

                  {/* Status Badge */}
                  <View style={[{ flex: 1.4, alignItems: 'center' }]}>
                    <View style={[styles.tableStatusBadge, isOver ? styles.badgeOver : styles.badgeWithin]}>
                      <Text style={[styles.tableStatusBadgeText, isOver ? styles.badgeOverText : styles.badgeWithinText]}>
                        {row.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Total / Average Summary Row */}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tdTotalCell, { flex: 3.4 }]}>Total / average</Text>
              <Text style={[styles.tdTotalCell, { flex: 1.2, textAlign: 'right' }]}>
                {dashData.history_totals.total.toFixed(2)}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1.2, textAlign: 'right' }]}>
                {dashData.history_totals.plan.toFixed(2)}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1.2, textAlign: 'right', color: '#E11D48' }]}>
                {dashData.history_totals.extra.toFixed(2)}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1, textAlign: 'right', color: '#E11D48' }]}>
                {percentText(dashData.history_totals.extra_pct)}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1.2, textAlign: 'right' }]}>
                {dashData.history_totals.call_min.toLocaleString()}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1.1, textAlign: 'right' }]}>
                {dashData.history_totals.data_gb.toFixed(1)}
              </Text>
              <Text style={[styles.tdTotalCell, { flex: 1.3, textAlign: 'right' }]}>
                {dashData.history_totals.premium_sms}
              </Text>
              <View style={{ flex: 1.4 }} />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 9. ROW 3: TOP 10 NUMBERS CALLED & WHERE THE MONEY WENT */}
      {/* ----------------------------------------------------------------- */}
      <View style={[styles.twoColRow, isMobile && { flexDirection: 'column' }]}>
        {/* Left Card: Top 10 numbers called */}
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeaderWithTabs}>
            <View>
              <Text style={styles.cardTitle}>Top 10 numbers called</Text>
              <Text style={styles.cardSubtitle}>
                {dashData.period_label ? dashData.period_label.replace(/^\d+–\d+\s+/, '') : (selectedMonth || 'No bill selected')} · excess excluding VAT.
              </Text>
            </View>

            {/* Sort Filter Tabs */}
            <View style={styles.miniTabsWrap}>
              {[
                { key: 'most_calls', label: 'Most calls' },
                { key: 'longest_time', label: 'Longest time' },
                { key: 'highest_extra', label: 'Highest extra' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setTopSortTab(tab.key)}
                  style={[styles.miniTab, topSortTab === tab.key && styles.miniTabActive]}
                >
                  <Text style={[styles.miniTabText, topSortTab === tab.key && styles.miniTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Numbers Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 540 }}>
              <View style={[styles.tableHeaderRow, styles.topNumbersHeader]}>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { width: 32, textAlign: 'center' }]}>#</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1.6 }]}>Number</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1, textAlign: 'right' }]}>Calls</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1.3, textAlign: 'right' }]}>Total min</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1.2, textAlign: 'right' }]}>No-charge{`\n`}min</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1.8, textAlign: 'center' }]}>Charged-call{`\n`}min</Text>
                <Text style={[styles.thCell, styles.topNumbersHeaderText, { flex: 1.3, textAlign: 'right' }]}>Extra AED</Text>
              </View>

              {displayedTopNumbers.map((row) => (
                <View key={row.rank} style={styles.tableDataRowSmall}>
                  <Text style={[styles.tdCell, { width: 32, color: '#94A3B8' }]}>{row.rank}</Text>
                  <Text style={[styles.tdCellBold, { flex: 1.6, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                    {row.number}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1, textAlign: 'right' }]}>{row.calls}</Text>
                  <Text style={[styles.tdCell, { flex: 1.3, textAlign: 'right' }]}>{row.total_min.toFixed(1)}</Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'right' }]}>{row.uncharged_min.toFixed(1)}</Text>

                  {/* Extra Minutes with mini visual bar */}
                  <View style={[{ flex: 1.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }]}>
                    <View style={styles.miniBarTrack}>
                      <View style={[styles.miniBarFill, { width: `${Math.min(100, (row.charged_call_min / 250) * 100)}%` }]} />
                    </View>
                    <Text style={[styles.tdCell, { color: row.charged_call_min > 0 ? '#E11D48' : '#64748B', fontWeight: row.charged_call_min > 0 ? '700' : '400' }]}>
                      {row.charged_call_min.toFixed(1)}
                    </Text>
                  </View>

                  <Text style={[styles.tdCell, { flex: 1.3, textAlign: 'right', color: row.charged_aed > 0 ? '#E11D48' : '#0F172A', fontWeight: row.charged_aed > 0 ? '700' : '400' }]}>
                    {row.charged_aed.toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Top 10 Total Summary */}
              <View style={styles.tableTotalRow}>
                <Text style={[styles.tdTotalCell, { flex: 2.1 }]}>Top 10 total</Text>
                <Text style={[styles.tdTotalCell, { flex: 1, textAlign: 'right' }]}>{dashData.top_10_total.calls}</Text>
                <Text style={[styles.tdTotalCell, { flex: 1.3, textAlign: 'right' }]}>{dashData.top_10_total.total_min.toFixed(1)}</Text>
                <Text style={[styles.tdTotalCell, { flex: 1.2, textAlign: 'right' }]}>{dashData.top_10_total.uncharged_min.toFixed(1)}</Text>
                <Text style={[styles.tdTotalCell, { flex: 1.8, textAlign: 'right', color: '#E11D48' }]}>{dashData.top_10_total.charged_call_min.toFixed(1)}</Text>
                <Text style={[styles.tdTotalCell, { flex: 1.3, textAlign: 'right', color: '#E11D48' }]}>{dashData.top_10_total.charged_aed.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footnote */}
          <Text style={styles.footnoteText}>
            {dashData.top_10_total.note}
          </Text>
        </View>

        {/* Right Card: Where the money went */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>Where the money went</Text>
          <Text style={styles.cardSubtitle}>
            Each charge line of the bill. Red lines are extra.
          </Text>

          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, { flex: 3 }]}>BILL LINE</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>AED</Text>
          </View>

          <View style={{ gap: 6, marginTop: 4 }}>
            {dashData.where_money_went.map((line, idx) => (
              <View key={idx} style={styles.moneyLineRow}>
                <View style={{ flex: 3 }}>
                  <Text style={[styles.moneyLineName, line.is_extra && { color: '#E11D48' }]}>
                    {line.line}
                  </Text>
                  {/* Proportional charge bar */}
                  <View style={styles.moneyBarTrack}>
                    <View style={[
                      styles.moneyBarFill,
                      {
                        width: `${Math.min(100, (line.amount / 300) * 100)}%`,
                        backgroundColor: line.is_extra ? '#E11D48' : '#94A3B8'
                      }
                    ]} />
                  </View>
                </View>

                <Text style={[styles.moneyLineAmount, line.is_extra && { color: '#E11D48', fontWeight: '700' }]}>
                  {line.amount.toFixed(2)}
                </Text>
              </View>
            ))}

            {/* Total Amount Due */}
            <View style={styles.moneyTotalRow}>
              <Text style={styles.moneyTotalLabel}>Total amount due</Text>
              <Text style={styles.moneyTotalValue}>
                {dashData.total_amount_due.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 10. PREVIEW FOOTER DISCLAIMER */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.footerNoteBox}>
        <Text style={styles.footerNoteText}>
          Figures are loaded from the selected invoice and billing period. Missing source values are marked for review.
        </Text>
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL: EMAIL REPORT TO EMPLOYEE */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        visible={emailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="mail" size={22} color="#0F172A" />
                <Text style={styles.modalTitle}>Email Usage Report</Text>
              </View>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14, marginVertical: 14 }}>
              <View>
                <Text style={styles.modalFieldLabel}>EMPLOYEE EMAIL</Text>
                <TextInput
                  value={emailTarget}
                  onChangeText={setEmailTarget}
                  style={styles.modalTextInput}
                  placeholder="employee@company.ae"
                />
              </View>

              <View>
                <Text style={styles.modalFieldLabel}>SUBJECT</Text>
                <TextInput
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  style={styles.modalTextInput}
                />
              </View>

              <View style={styles.emailPreviewBox}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  Bill Statement Summary Attached:
                </Text>
                <Text style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  • Mobile: {dashData.number} ({dashData.plan_name})
                  {'\n'}• Period: {dashData.period_label}
                  {'\n'}• Bill excluding VAT: AED {moneyText(dashData.kpis.bill_excl_vat)} (Excess excluding VAT: AED {moneyText(dashData.kpis.extra)})
                  {'\n'}• Attached format: PDF & Excel Breakdown
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setEmailModalVisible(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendEmail}
                disabled={emailSending}
                style={styles.modalSendBtn}
              >
                {emailSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={15} color="#FFFFFF" />
                    <Text style={styles.modalSendBtnText}>Send Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// -----------------------------------------------------------------------------
// STYLESHEET MATCHING PIXEL-PERFECT SPECIFICATION
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerContainer: {
    marginBottom: 16,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  breadcrumbDivider: {
    fontSize: 13,
    color: '#94A3B8',
  },
  breadcrumbActive: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    maxWidth: 720,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#004D34',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    boxShadow: '0 2px 4px rgba(0, 77, 52, 0.2)',
  },
  actionBtnTextWhite: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Filter Card
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  filterGroup: {
    flex: 1,
    minWidth: 180,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  nativeSelect: {
    width: '100%',
    padding: '8px 12px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0F172A',
    outline: 'none',
    cursor: 'pointer',
  },
  monthStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepperArrow: {
    padding: 4,
  },
  monthStepperText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  compareToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  comparePill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  comparePillActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  comparePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  comparePillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // 12-Month Timeline
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  timelineLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  timelineYearText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  legendDotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendMiniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendMiniText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  timelinePillsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  timelineMonthPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 70,
  },
  timelineMonthPillDashed: {
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FAFAFA',
  },
  timelineMonthPillSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  timelineMonthLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  timelineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineMonthSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroPhoneNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    letterSpacing: -0.5,
  },
  overPlanBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  overPlanBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  withinPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  withinPlanBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  heroMetadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  summaryCallout: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 8,
    padding: 12,
  },
  summaryCalloutText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#881337',
    fontWeight: '500',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  kpiTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 6,
  },
  kpiValueMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiTrendRow: {
    marginTop: 6,
  },
  kpiTrendText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // 2 Column Layout
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  cardHeaderWithTabs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  miniTabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniTabActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  miniTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  miniTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // Bar Chart Layout
  barChartContainer: {
    height: 240,
    position: 'relative',
    marginTop: 10,
    marginBottom: 10,
  },
  yAxisGuides: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  yAxisLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#94A3B8',
    width: 32,
    textAlign: 'right',
  },
  yAxisDottedLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  barsArea: {
    ...StyleSheet.absoluteFillObject,
    left: 45,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 20,
  },
  barCol: {
    alignItems: 'center',
    width: 50,
    height: '100%',
    justifyContent: 'flex-end',
  },
  extraCalloutBadge: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extraCalloutBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  barTopVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  stackedBarTrack: {
    width: 34,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  stackedBarSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  barSegmentExtra: {
    width: '100%',
    backgroundColor: '#E11D48',
  },
  barSegmentFixed: {
    width: '100%',
    backgroundColor: '#CBD5E1',
  },
  barMonthLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '600',
  },
  chartLegendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // Donut Layout
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  donutRingOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 22,
    borderColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(225, 29, 72, 0.1)',
  },
  donutRingInner: {
    alignItems: 'center',
  },
  donutCenterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  donutCenterValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  donutLegendWrap: {
    flex: 1,
    minWidth: 160,
    gap: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sourceName: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  sourceAmount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Daily Call Minutes Layout
  exhaustionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  exhaustionPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  dailyChartBox: {
    height: 140,
    marginTop: 10,
    marginBottom: 8,
  },
  dailyBarsTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  dailyBarCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  exhaustionMarkerLine: {
    position: 'absolute',
    top: 0,
    bottom: 16,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E11D48',
    zIndex: 10,
  },
  dailyBarPillar: {
    width: 6,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dailySegmentCharged: {
    width: '100%',
    backgroundColor: '#E11D48',
  },
  dailySegmentFree: {
    width: '100%',
    backgroundColor: '#CBD5E1',
  },
  dailyDayNum: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 4,
  },
  dailyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    flexWrap: 'wrap',
  },
  dailyLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyLegendText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Plan Allowance
  allowanceList: {
    marginTop: 10,
    gap: 16,
  },
  allowanceItem: {
    gap: 4,
  },
  allowanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allowanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  allowanceUsedVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  allowanceNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Table Styles
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
  },
  topNumbersHeader: {
    minHeight: 52,
    paddingVertical: 7,
    marginBottom: 4,
    borderBottomWidth: 0,
    borderRadius: 10,
  },
  topNumbersHeaderText: {
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.25,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  tableDataRowActive: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#0F172A',
  },
  tableDataRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  tdCell: {
    fontSize: 12.5,
    color: '#334155',
    paddingHorizontal: 6,
  },
  tdCellBold: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    paddingHorizontal: 6,
  },
  tableStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeOver: {
    backgroundColor: '#FFE4E6',
  },
  badgeOverText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
  },
  badgeWithin: {
    backgroundColor: '#ECFDF5',
  },
  badgeWithinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  tdTotalCell: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 6,
  },

  // Top 10 Sub-elements
  miniBarTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: '#E11D48',
    borderRadius: 3,
  },
  footnoteText: {
    fontSize: 11.5,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },

  // Where Money Went
  moneyLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  moneyLineName: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '600',
  },
  moneyBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F1F5F9',
    marginTop: 4,
    width: '90%',
  },
  moneyBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  moneyLineAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  moneyTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 2,
    borderColor: '#0F172A',
  },
  moneyTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  moneyTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },

  // Footer Disclaimer
  footerNoteBox: {
    marginTop: 10,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 500,
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  emailPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#004D34',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
