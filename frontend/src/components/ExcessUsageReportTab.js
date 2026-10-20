import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as XLSX from 'xlsx';
import { API_URL } from '../config';

// A bill counts as excess when it is more than this many AED above the plan amount
const EXCESS_MARGIN_AED = 10;

const num = (v) => {
  const n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};
const keyOf = (v) => String(v || '').replace(/\D/g, '').slice(-9);
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// month key "YYYY-MM" of a bill (period end, else period start, else issue date, pdf filename or created date)
const billMonthKey = (b) => {
  if (!b) return null;
  const parseStr = (val) => {
    if (!val) return null;
    const str = String(val).trim();
    // 1. Matches YYYY-MM or YYYY-MM-DD
    const iso = str.match(/\b(20\d{2})[-/](\d{1,2})\b/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;
    // 2. Matches DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}`;
    // 3. Matches Month Name + Year e.g. "Aug 2026", "August 2026", "2026-August"
    const mNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (let i = 0; i < mNames.length; i++) {
      const reg = new RegExp(`\\b${mNames[i]}[a-z]*\\b`, 'i');
      if (reg.test(str)) {
        const yMatch = str.match(/\b(20\d{2})\b/);
        const y = yMatch ? yMatch[1] : '2026';
        return `${y}-${String(i + 1).padStart(2, '0')}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return null;
  };

  const raw = b.period_to || b.period_from || b['Bill Period To'] || b['Bill Period From'] || b.bill_date || b.issue_date;
  const parsed = parseStr(raw);
  if (parsed) return parsed;

  if (b.pdf_filename) {
    const fnParsed = parseStr(b.pdf_filename);
    if (fnParsed) return fnParsed;
  }

  if (b.created_at) {
    const crParsed = parseStr(b.created_at);
    if (crParsed) return crParsed;
  }
  return null;
};

const monthLabel = (key) => {
  if (!key) return '';
  if (key === 'All Months') return 'All Months';
  const parts = key.split('-');
  if (parts.length < 2) return key;
  const [y, m] = parts;
  const mNum = Number(m);
  if (isNaN(mNum) || mNum < 1 || mNum > 12) return key;
  return `${MONTHS[mNum - 1]} ${y}`;
};

const toMin = (d) => {
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(String(d || '').trim());
  return m ? Math.ceil((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) / 60) : 0;
};

// What pushed the bill over the plan: call-log overages first, then the extra charges on the bill
const usageReasons = (bill, conn) => {
  const reasons = [];
  const logs = Array.isArray(bill.call_logs) ? bill.call_logs : [];
  if (logs.length > 0) {
    const agg = { local: 0, intl: 0, special: 0, roaming: 0 }; // roaming calls are not part of the plan limits
    const cnt = { special: 0 };
    logs.forEach(l => {
      const c = String(l.category || '').toLowerCase();
      const g = /special|premium/.test(c) ? 'special' : /roaming/.test(c) ? 'roaming' : /international/.test(c) ? 'intl' : 'local';
      agg[g] += toMin(l.duration);
      if (g === 'special') cnt.special += 1;
    });
    const localLimit = parseFloat(conn?.local_minutes);
    const intlLimit = parseFloat(conn?.international_minutes);
    if (!isNaN(localLimit) && agg.local > localLimit) reasons.push(`Local minutes +${agg.local - localLimit}`);
    if (!isNaN(intlLimit) && agg.intl > intlLimit) reasons.push(`Intl minutes +${agg.intl - intlLimit}`);
    if (cnt.special > 0) reasons.push(`Special numbers ${cnt.special} calls`);
  }
  const items = Array.isArray(bill.items) ? bill.items : [];
  items.forEach(it => {
    const t = String(it.record_type || '').toUpperCase();
    const amt = num(it.amount);
    if (t === 'CHARGE' && amt > 0) reasons.push(`${it.category || 'Extra charge'} ${fmt(amt)}`);
  });
  if (reasons.length === 0) {
    const usage = num(bill.usage_charges);
    if (usage > 0) reasons.push(`Usage charges ${fmt(usage)}`);
  }
  return reasons;
};

export default function ExcessUsageReportTab({ user, showToast, onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 900;

  const [bills, setBills] = useState([]);
  const [connections, setConnections] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState('All Companies');
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [openMenu, setOpenMenu] = useState(null); // 'company' | 'month' | null

  useEffect(() => {
    (async () => {
      try {
        const [b, c, e] = await Promise.all([
          fetch(`${API_URL}/api/telecom-bills`).then(r => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/api/tele-connections`).then(r => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/api/employees`).then(r => (r.ok ? r.json() : [])),
        ]);
        setBills(Array.isArray(b) ? b : (b && Array.isArray(b.data) ? b.data : []));
        setConnections(Array.isArray(c) ? c : []);
        setEmployees(Array.isArray(e) ? e : []);
      } catch (err) {
        console.warn('Excess usage report: could not load data', err);
        if (showToast) showToast('Could not load excess usage data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // every month that has at least one bill, plus 'All Months'
  const monthOptions = useMemo(() => {
    const keys = bills.map(billMonthKey).filter(Boolean);
    const unique = Array.from(new Set(keys)).sort().reverse();
    return ['All Months', ...unique];
  }, [bills]);

  // Smart initial default: pick the newest month that actually has excess records, or 'All Months'
  useEffect(() => {
    if (!monthFilter && monthOptions.length > 0) {
      const validMonths = monthOptions.filter(m => m !== 'All Months');
      const connByKey = new Map();
      connections.forEach(c => { const k = keyOf(c.connection_number); if (k && !connByKey.has(k)) connByKey.set(k, c); });

      const monthWithExcess = validMonths.find(m => {
        return bills.some(b => {
          if (billMonthKey(b) !== m) return false;
          const total = num(b.total_bill ?? b['Total Bill'] ?? b.total_amount);
          const vat = num(b.vat_current_period ?? b.vat_amount ?? b['VAT']);
          const billExcl = vat > 0 && total > vat ? total - vat : total;
          const conn = connByKey.get(keyOf(b.mobile_number || b['Mobile Number / Account']));
          const connPlan = conn ? num(conn.monthly_plan_amount) : 0;
          const billPlan = num(b.plan_rental ?? b['Monthly Plan Amount'] ?? b['Service Rental']);
          const plan = connPlan > 0 ? connPlan : billPlan;
          return (billExcl - plan) > EXCESS_MARGIN_AED;
        });
      });

      if (monthWithExcess) {
        setMonthFilter(monthWithExcess);
      } else {
        setMonthFilter(validMonths.length > 0 ? validMonths[0] : 'All Months');
      }
    }
  }, [monthOptions, monthFilter, bills, connections]);

  // companies that have a connection or a bill
  const companyOptions = useMemo(() => {
    const names = [
      ...connections.map(c => c.company_name),
      ...bills.map(b => b.company_name || b.Company),
    ].filter(Boolean);
    return ['All Companies', ...Array.from(new Set(names)).sort()];
  }, [connections, bills]);

  // one row per number + company for the selected month (or all months when 'All Months' selected)
  const { rows, billedCount } = useMemo(() => {
    const connByKey = new Map();
    connections.forEach(c => { const k = keyOf(c.connection_number); if (k && !connByKey.has(k)) connByKey.set(k, c); });

    const latest = new Map();
    bills.forEach(b => {
      const bMonth = billMonthKey(b);
      if (monthFilter && monthFilter !== 'All Months' && bMonth !== monthFilter) return;
      const rawNo = b.mobile_number || b['Mobile Number / Account'];
      const k = keyOf(rawNo);
      if (!k) return;
      const conn = connByKey.get(k) || null;
      const company = (conn && conn.company_name) || b.company_name || b.Company || '';
      const gk = (monthFilter === 'All Months')
        ? `${k}|${bMonth || 'unknown'}|${company.toLowerCase()}`
        : `${k}|${company.toLowerCase()}`;
      const prev = latest.get(gk);
      const id = Number(b.tele_bill_id || b.id || 0);
      if (!prev || id > prev.id) latest.set(gk, { id, gk, bill: b, conn, company, rawNo, month: bMonth });
    });

    const inferType = (no) => {
      const d = String(no || '').replace(/\D/g, '');
      return /^(0?5\d{8}|9715\d{8})$/.test(d) ? 'SIM' : 'Landline';
    };

    const all = Array.from(latest.values())
      .filter(x => companyFilter === 'All Companies' || x.company === companyFilter)
      .map(({ gk, bill, conn, company, rawNo, month }) => {
        const total = num(bill.total_bill ?? bill['Total Bill'] ?? bill.total_amount);
        const vat = num(bill.vat_current_period ?? bill.vat_amount ?? bill['VAT']);
        const billExcl = vat > 0 && total > vat ? total - vat : total;
        const connPlan = conn ? num(conn.monthly_plan_amount) : 0;
        const billPlan = num(bill.plan_rental ?? bill['Monthly Plan Amount'] ?? bill['Service Rental']);
        const plan = connPlan > 0 ? connPlan : billPlan;
        const excess = billExcl - plan;
        const emp = conn ? employees.find(e => (e.full_name || e.name) === conn.employee_name) : null;
        const empName = conn ? (conn.employee_name || '').trim() : '';
        const reasons = usageReasons(bill, conn || {});
        if (reasons.length === 0 && excess > 0) {
          reasons.push(`+AED ${fmt(excess)} over plan`);
        }
        return {
          key: gk,
          month: month ? monthLabel(month) : '',
          number: conn ? conn.connection_number : String(rawNo || ''),
          employee: !conn ? 'Not in system' : (empName && empName.toLowerCase() !== 'unassigned' ? empName : 'Unassigned'),
          sub: !conn ? 'Add it in Telecom Connection' : (emp && emp.department_name ? emp.department_name : (conn.sub_company || '')),
          company,
          type: conn ? (conn.connection_type || 'SIM') : inferType(rawNo),
          provider: (conn && conn.provider) || bill.telecom_provider || '',
          plan, billExcl, excess,
          reasons,
        };
      });
    return { rows: all.filter(r => r.excess > EXCESS_MARGIN_AED).sort((a, b) => b.excess - a.excess), billedCount: all.length };
  }, [bills, connections, employees, monthFilter, companyFilter]);

  const typeOptions = useMemo(() => ['All', ...Array.from(new Set(rows.map(r => r.type)))], [rows]);
  const visible = rows.filter(r => typeFilter === 'All' || r.type === typeFilter);
  const totalExcess = rows.reduce((s, r) => s + r.excess, 0);
  const highest = rows[0];
  const byType = rows.reduce((m, r) => { m[r.type] = (m[r.type] || 0) + 1; return m; }, {});

  const handleExport = () => {
    if (visible.length === 0) {
      if (showToast) showToast('Nothing to export for this month and filter', 'info');
      return;
    }
    try {
      const data = visible.map(r => ({
        Number: r.number, Employee: r.employee, Department: r.sub, Company: r.company, Type: r.type,
        Provider: r.provider, 'Plan Amount (AED)': r.plan, 'Bill Amount excl. VAT (AED)': r.billExcl,
        'Excess (AED)': r.excess, 'Usage Over Limit': r.reasons.join('; '),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Excess_Usage');
      XLSX.writeFile(wb, `Excess_Usage_Report_${monthFilter || 'all'}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
      if (showToast) showToast('Export failed', 'error');
    }
  };

  const headerBg = Platform.OS === 'web'
    ? { backgroundImage: 'linear-gradient(100deg, #5C0F24 0%, #8E1F2E 45%, #D9691F 100%)' }
    : { backgroundColor: '#8E1F2E' };

  const Menu = ({ id, label, options, onPick, render }) => (
    <View style={{ position: 'relative', zIndex: openMenu === id ? 50 : 1 }}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => setOpenMenu(openMenu === id ? null : id)}>
        <Text style={styles.headerBtnText}>{label}</Text>
      </TouchableOpacity>
      {openMenu === id && (
        <View style={styles.menuBox}>
          <ScrollView style={{ maxHeight: 240 }}>
            {options.map(o => (
              <TouchableOpacity key={o} style={styles.menuItem} onPress={() => { onPick(o); setOpenMenu(null); }}>
                <Text style={styles.menuItemText}>{render ? render(o) : o}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={{ padding: 60, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8E1F2E" />
        <Text style={{ color: '#64748B', marginTop: 12 }}>Loading excess usage report...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: isMobile ? 12 : 24, gap: 18 }}>
      {/* HEADER BANNER */}
      <View style={[styles.banner, headerBg, { zIndex: 20 }]}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Text style={styles.bannerTitle}>Excess Usage Report</Text>
          <Text style={styles.bannerSub}>Numbers whose monthly bill went over the plan amount, with the usage that caused it</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Menu id="company" label={companyFilter} options={companyOptions} onPick={setCompanyFilter} />
          <Menu id="month" label={monthFilter ? monthLabel(monthFilter) : 'No bills'} options={monthOptions} onPick={setMonthFilter} render={monthLabel} />
          <TouchableOpacity style={styles.headerBtn} onPress={handleExport}>
            <Text style={styles.headerBtnText}>Export Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI CARDS */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <View style={[styles.kpi, { borderLeftColor: '#B91C1C' }]}>
          <Text style={styles.kpiLabel}>NUMBERS OVER LIMIT</Text>
          <Text style={[styles.kpiBig, { color: '#B91C1C' }]}>{rows.length}</Text>
          <Text style={styles.kpiNote}>of {billedCount} numbers billed</Text>
        </View>
        <View style={[styles.kpi, { borderLeftColor: '#D9691F' }]}>
          <Text style={styles.kpiLabel}>TOTAL EXCESS AMOUNT</Text>
          <Text style={[styles.kpiBig, { color: '#0F172A' }]}>AED {fmt(totalExcess)}</Text>
          <Text style={styles.kpiNote}>Excl. VAT, above plan amounts</Text>
        </View>
        <View style={[styles.kpi, { borderLeftColor: '#7F1D1D' }]}>
          <Text style={styles.kpiLabel}>HIGHEST EXCESS</Text>
          <Text style={[styles.kpiBig, { color: '#B91C1C' }]}>{highest ? highest.number : '–'}</Text>
          <Text style={styles.kpiNote}>{highest ? `${highest.employee} · AED ${fmt(highest.excess)}` : 'No excess this month'}</Text>
        </View>
        <View style={[styles.kpi, { borderLeftColor: '#1D4ED8' }]}>
          <Text style={styles.kpiLabel}>BY TYPE</Text>
          <Text style={[styles.kpiBig, { fontSize: 20, color: '#0F172A' }]}>
            {Object.keys(byType).length ? Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(' · ') : '–'}
          </Text>
          <Text style={styles.kpiNote}>Click a type below to filter</Text>
        </View>
      </View>

      {/* TABLE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Numbers With Excess Usage</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {typeOptions.map(t => (
              <TouchableOpacity key={t} onPress={() => setTypeFilter(t)} style={[styles.pill, typeFilter === t && styles.pillActive]}>
                <Text style={[styles.pillText, typeFilter === t && { color: '#FFFFFF' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}>
          <View style={{ minWidth: 1100, flex: 1, width: '100%' }}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { flex: 1.3 }]}>NUMBER</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>EMPLOYEE</Text>
              <Text style={[styles.th, { flex: 1.7 }]}>COMPANY</Text>
              <Text style={[styles.th, { flex: 0.9 }]}>TYPE</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>PROVIDER</Text>
              <Text style={[styles.th, { flex: 1.35, textAlign: 'right' }]}>PLAN AMOUNT</Text>
              <Text style={[styles.th, { flex: 1.35, textAlign: 'right' }]}>BILL AMOUNT</Text>
              <Text style={[styles.th, { flex: 1.35, textAlign: 'right' }]}>EXCESS (AED)</Text>
              <Text style={[styles.th, { flex: 2.4 }]}>USAGE OVER LIMIT</Text>
            </View>
            {visible.length === 0 ? (
              <Text style={{ padding: 28, color: '#64748B', fontSize: 14 }}>
                {monthFilter && monthFilter !== 'All Months'
                  ? `No numbers went over their plan amount in ${monthLabel(monthFilter)}.`
                  : 'No numbers went over their plan amount.'}
              </Text>
            ) : visible.map(r => (
              <View key={r.key} style={styles.tr}>
                <TouchableOpacity style={{ flex: 1.3 }} onPress={() => onNavigate && onNavigate('telecom_bill')}>
                  <Text style={styles.numberLink}>{r.number}</Text>
                  {monthFilter === 'All Months' && !!r.month && (
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 }}>{r.month}</Text>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.empName}>{r.employee}</Text>
                  {!!r.sub && <Text style={styles.empSub}>{r.sub}</Text>}
                </View>
                <Text style={[styles.td, { flex: 1.7 }]}>{r.company}</Text>
                <View style={{ flex: 0.9, alignItems: 'flex-start' }}>
                  <View style={styles.tagGrey}><Text style={styles.tagGreyText}>{r.type}</Text></View>
                </View>
                <View style={{ flex: 1.4, alignItems: 'flex-start' }}>
                  <View style={styles.tagRed}><Text style={styles.tagRedText}>{r.provider || '—'}</Text></View>
                </View>
                <Text style={[styles.td, { flex: 1.35, textAlign: 'right' }]}>{fmt(r.plan)}</Text>
                <Text style={[styles.td, { flex: 1.35, textAlign: 'right' }]}>{fmt(r.billExcl)}</Text>
                <Text style={[styles.td, { flex: 1.1, textAlign: 'right', fontWeight: '800', color: '#B91C1C', fontSize: 15 }]}>{fmt(r.excess)}</Text>
                <View style={{ flex: 2.4, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {r.reasons.length === 0
                    ? <Text style={{ color: '#94A3B8', fontSize: 12 }}>–</Text>
                    : r.reasons.map((x, i) => (
                      <View key={i} style={styles.reasonPill}><Text style={styles.reasonText}>{x}</Text></View>
                    ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bill amount excludes VAT. A bill counts as excess when it is more than AED {EXCESS_MARGIN_AED} above the plan amount.</Text>
          <Text style={styles.footerText}>Click a number to open its bill</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  bannerSub: { fontSize: 13, color: '#FDE7E0', marginTop: 4 },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  headerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  menuBox: { position: 'absolute', top: 44, right: 0, minWidth: 190, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, zIndex: 100 },
  menuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  menuItemText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  kpi: { flex: 1, minWidth: 220, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, padding: 18 },
  kpiLabel: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  kpiBig: { fontSize: 30, fontWeight: '800', marginTop: 8 },
  kpiNote: { fontSize: 12, color: '#64748B', marginTop: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingVertical: 20, paddingHorizontal: 24 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  pill: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  pillActive: { backgroundColor: '#4A0E1C', borderColor: '#4A0E1C' },
  pillText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  thRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 24, columnGap: 16 },
  th: { fontSize: 11, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  tr: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F6', borderBottomWidth: 1, borderBottomColor: '#F5E1DE', paddingVertical: 18, paddingHorizontal: 24, columnGap: 16 },
  td: { fontSize: 14, color: '#334155' },
  numberLink: { fontSize: 15, fontWeight: '800', color: '#B91C1C', textDecorationLine: 'underline' },
  empName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  empSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  tagGrey: { backgroundColor: '#EEF2F6', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tagGreyText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  tagRed: { backgroundColor: '#FDE2E2', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  tagRedText: { fontSize: 11, fontWeight: '700', color: '#B91C1C' },
  reasonPill: { backgroundColor: '#FDE2E2', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14 },
  reasonText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerText: { fontSize: 12, color: '#475569' },
});
