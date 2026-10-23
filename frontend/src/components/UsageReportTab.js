import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const C = {
  green: '#0B4A35', greenMid: '#166534', greenSoft: '#E8F3EE', red: '#C8372D', redSoft: '#FEE4E2', redLine: '#F3C9C4',
  grey: '#C3C9D1', greyDark: '#7D878F', blue: '#4A6FA5', blueSoft: '#E6EEF8', amber: '#D9902F', amberSoft: '#FDF1DC',
  purple: '#8A63B8', purpleSoft: '#F0EAF8', ink: '#1E293B', muted: '#64748B', line: '#E5EAF0', bg: '#F4F6F8', grid: '#EDF1F5',
};
const SOURCE_COLORS = ['#C8372D', '#E07A5F', '#D9902F', '#4A6FA5', '#8A63B8', '#2F9E6E'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHADOW = Platform.OS === 'web' ? { boxShadow: '0 1px 2px rgba(15,23,42,0.05), 0 6px 20px rgba(15,23,42,0.04)' } : {};

const fmt = (n) => n === null || n === undefined ? 'Needs review' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt1 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt0 = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const prettyDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d} ${MONTHS[Number(m) - 1] || m} ${y}`;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const prettyNumber = (n) => {
  const d = String(n || '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('05') ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : String(n || '');
};
// a round axis maximum (1, 2, 2.5, 5 or 10 times a power of ten)
const niceMax = (v) => {
  if (!v || v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const axisLabel = (v) => (v >= 1000 ? `${fmt0(v / 1000)}k` : fmt0(v));

function Delta({ value, unit = '' }) {
  if (value === null || value === undefined) return <View style={[st.delta, st.deltaFlat]}><Text style={[st.deltaText, { color: '#475569' }]}>first month</Text></View>;
  if (Math.abs(value) < 0.005) return <View style={[st.delta, st.deltaFlat]}><Text style={[st.deltaText, { color: '#475569' }]}>no change</Text></View>;
  const up = value > 0;
  return (
    <View style={[st.delta, up ? st.deltaUp : st.deltaDown]}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={11} color={up ? '#912018' : C.green} />
      <Text style={[st.deltaText, { color: up ? '#912018' : C.green }]}>{fmt(Math.abs(value)).replace(/\.00$/, '')}{unit}</Text>
    </View>
  );
}

// A chart area with y-axis labels and horizontal grid lines
function Plot({ height, max, children, format = axisLabel }) {
  const ticks = [0, 1, 2, 3, 4].map(i => (max / 4) * i);
  return (
    <View style={{ flexDirection: 'row' }}>
      <View style={{ width: 44, height }}>
        {ticks.map((t, i) => (
          <Text key={i} style={[st.axisText, { position: 'absolute', right: 8, bottom: (i / 4) * height - 7 }]}>{format(t)}</Text>
        ))}
      </View>
      <View style={{ flex: 1, height, borderBottomWidth: 1, borderBottomColor: '#AAB4C0' }}>
        {ticks.slice(1).map((t, i) => (
          <View key={i} style={[st.gridLine, { bottom: ((i + 1) / 4) * height }]} />
        ))}
        {children}
      </View>
    </View>
  );
}

export default function UsageReportTab({ user, showToast, request, onRequestHandled, onNavigate }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1100;

  const [options, setOptions] = useState([]);
  const [company, setCompany] = useState('');
  const [numberKey, setNumberKey] = useState('');
  const [month, setMonth] = useState('');
  const [openList, setOpenList] = useState(null); // 'company' | 'number' | null
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [metric, setMetric] = useState('amount');
  const [topTab, setTopTab] = useState('by_extra');
  const [backTo, setBackTo] = useState(null); // only set when opened from a bill
  const [viewYear, setViewYear] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const clientQuery = user?.clientid ? `clientid=${user.clientid}` : '';

  // companies + numbers for the filters
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/telecom-bills/usage-report/options${clientQuery ? `?${clientQuery}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          setOptions(Array.isArray(data.companies) ? data.companies : []);
        }
      } catch (err) {
        console.warn('Could not load usage report filters', err);
      } finally {
        setOptionsLoading(false);
      }
    })();
  }, []);

  // arriving from a bill (View Usage Report button)
  useEffect(() => {
    if (!request) return;
    setBackTo(request.origin || 'telecom_bill');
    const key = String(request.number || '').replace(/\D/g, '').slice(-9);
    setCompany(request.company || '');
    setNumberKey(key);
    setMonth(request.month || '');
    if (onRequestHandled) onRequestHandled();
  }, [request]);

  // default company / number once the options are known
  useEffect(() => {
    if (optionsLoading || options.length === 0) return;
    if (!company || !options.find(o => o.name === company)) {
      const owner = numberKey ? options.find(o => o.numbers.some(n => n.key === numberKey)) : null;
      setCompany(owner ? owner.name : options[0].name);
    }
  }, [optionsLoading, options, company, numberKey]);

  const companyNumbers = useMemo(() => {
    const c = options.find(o => o.name === company);
    return c ? c.numbers : [];
  }, [options, company]);

  useEffect(() => {
    if (!company || companyNumbers.length === 0) return;
    if (!companyNumbers.find(n => n.key === numberKey)) {
      const withBills = companyNumbers.find(n => n.bills > 0) || companyNumbers[0];
      setNumberKey(withBills.key);
      setMonth('');
    }
  }, [company, companyNumbers]);

  // the report itself
  const loadReport = async () => {
    const num = companyNumbers.find(n => n.key === numberKey);
    if (!num) return;
    setLoading(true);
    try {
      const qs = [`number=${encodeURIComponent(num.number)}`, `company=${encodeURIComponent(company)}`];
      if (month) qs.push(`month=${encodeURIComponent(month)}`);
      if (clientQuery) qs.push(clientQuery);
      const res = await fetch(`${API_URL}/api/telecom-bills/usage-report?${qs.join('&')}`);
      if (!res.ok) throw new Error('Failed to load the usage report');
      setReport(await res.json());
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Could not load the usage report', 'error');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadReport(); }, [company, numberKey, month, companyNumbers.length]);

  const months = report?.months || [];
  const sel = report?.selected || null;
  const selNumber = companyNumbers.find(n => n.key === numberKey);

  // the month strip follows the selected month's year
  useEffect(() => { if (sel) setViewYear(sel.month.slice(0, 4)); }, [sel?.month]);

  const stepMonth = (dir) => {
    if (!sel || months.length === 0) return;
    const i = months.findIndex(m => m.key === sel.month);
    const next = months[i + dir];
    if (next) setMonth(next.key);
  };

  const stripYear = viewYear || String(new Date().getFullYear());
  const years = Array.from(new Set(months.map(m => m.key.slice(0, 4)))).sort();
  const yearIdx = years.indexOf(stripYear);
  const strip = MONTHS.map((label, idx) => {
    const key = `${stripYear}-${String(idx + 1).padStart(2, '0')}`;
    return { label, key, row: months.find(m => m.key === key) || null };
  });
  const lastBillKey = months.length ? months[months.length - 1].key : '';

  const downloadPdf = async () => {
    if (!report?.selected || downloadingPdf) {
      if (!report?.selected && showToast) showToast('Select a bill month before downloading the PDF', 'info');
      return;
    }
    setDownloadingPdf(true);
    try {
      const response = await fetch(`${API_URL}/api/telecom-bills/usage-report/pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report }),
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const fallbackNumber = String(report.number || 'number').replace(/\D/g, '') || 'number';
      const filename = match?.[1] || `Tele_Report_${fallbackNumber}_${report.selected.month}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (showToast) showToast('PDF report downloaded successfully', 'success');
    } catch (error) {
      console.error('Could not download usage report PDF:', error);
      if (showToast) showToast('Could not download the PDF report', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ---------------------------------------------------------------- pieces
  const Picker = ({ label, icon, value, sub, options: list, onPick, listKey, placeholder }) => {
    const isOpen = openList === listKey;
    return (
      <View style={{ flex: 1, minWidth: 240, zIndex: isOpen ? 30 : 1 }}>
        <Text style={st.filterLabel}>{label}</Text>
        <TouchableOpacity style={[st.select, isOpen && st.selectOpen]} onPress={() => setOpenList(isOpen ? null : listKey)} activeOpacity={0.8}>
          <View style={st.selectIcon}><Ionicons name={icon} size={15} color={C.green} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={[st.selectText, !value && { color: '#94A3B8' }]} numberOfLines={1}>{value || placeholder}</Text>
            {!!sub && <Text style={st.selectSub} numberOfLines={1}>{sub}</Text>}
          </View>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#64748B" />
        </TouchableOpacity>
        {isOpen && (
          <View style={st.pickList}>
            <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
              {list.length === 0 ? <Text style={st.pickEmpty}>No options available.</Text> : list.map(o => (
                <TouchableOpacity key={o.id} style={[st.pickItem, o.active && st.pickItemActive]} onPress={() => { onPick(o.id); setOpenList(null); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.pickText, o.active && { color: C.green, fontWeight: '800' }]} numberOfLines={1}>{o.label}</Text>
                    {!!o.sub && <Text style={st.pickSub}>{o.sub}</Text>}
                  </View>
                  {o.active && <Ionicons name="checkmark-circle" size={16} color={C.green} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const Card = ({ children, style }) => <View style={[st.card, style]}>{children}</View>;
  const SectionHead = ({ icon, tint, title, caption, right }) => (
    <View style={st.sectionHead}>
      <View style={[st.sectionIcon, { backgroundColor: tint || C.greenSoft }]}>
        <Ionicons name={icon} size={17} color={tint ? C.ink : C.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.h2}>{title}</Text>
        {!!caption && <Text style={st.cap}>{caption}</Text>}
      </View>
      {right}
    </View>
  );
  const Tabs = ({ items, value, onChange }) => (
    <View style={st.tabs}>
      {items.map(([id, label]) => (
        <TouchableOpacity key={id} onPress={() => onChange(id)} style={[st.tab, value === id && st.tabOn]}>
          <Text style={[st.tabText, value === id && { color: C.green }]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ---- history chart ----
  const histMonths = months.slice(-8);
  const metricOf = (m) => (metric === 'amount' ? m.bill_excl_vat : metric === 'minutes' ? m.call_minutes : metric === 'data' ? m.data_gb : m.premium_sms);
  const histMax = niceMax(Math.max(1, ...histMonths.map(metricOf)));
  const HIST_H = 240;
  const unitOf = metric === 'amount' ? '' : metric === 'minutes' ? ' min' : metric === 'data' ? ' GB' : '';

  // ---- donut ----
  const sources = sel?.sources || [];
  const srcTotal = sources.reduce((s, x) => s + x.amount, 0);
  const donutBg = (() => {
    if (!srcTotal) return '#EEF2F6';
    let acc = 0;
    const stops = sources.map((s, i) => {
      const from = (acc / srcTotal) * 100; acc += s.amount; const to = (acc / srcTotal) * 100;
      return `${SOURCE_COLORS[i % SOURCE_COLORS.length]} ${from}% ${to}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  })();

  // ---- daily chart ----
  const daily = sel?.daily || [];
  const dailyMax = niceMax(Math.max(10, ...daily.map(d => d.uncharged_min + d.charged_call_min)));
  const DAILY_H = 220;
  const firstCharged = sel?.calls?.first_call_with_charge;
  const firstChargedIndex = firstCharged ? daily.findIndex(d => d.date === firstCharged.date) : -1;

  const top = sel?.top_numbers?.[topTab] || [];
  const topMax = Math.max(1, ...top.map(t => (topTab === 'by_extra' ? t.charged_amount : topTab === 'by_time' ? t.total_min : t.calls)));

  const lines = sel?.lines || [];
  const lineMax = Math.max(1, ...lines.map(l => Math.abs(l.amount)));
  const total = sel?.kpis?.total || 0;

  const a = sel?.allowance;
  const chargedMin = sel?.calls?.duration_of_calls_with_charges_minutes || 0;
  const unchargedMin = sel?.calls?.uncharged_minutes || 0;
  const callTotalMin = sel?.calls?.actual_total_minutes || 0;
  const categoryIssues = (sel?.calls?.category_reconciliation || []).filter(item => item.status !== 'matched');

  const over = sel?.status === 'over';
  const deltas = sel?.kpis?.deltas || null;

  const kpiCards = sel ? [
    { icon: 'ribbon-outline', tint: C.greenSoft, iconColor: C.green, label: 'Plan — excluding VAT', value: `AED ${fmt(sel.kpis.plan)}`, delta: deltas ? deltas.plan : null, sub: 'applicable billing period' },
    { icon: 'wallet-outline', tint: C.blueSoft, iconColor: C.blue, label: 'Bill — excluding VAT', value: `AED ${fmt(sel.kpis.bill_excl_vat)}`, delta: undefined, sub: 'current period' },
    { icon: 'receipt-outline', tint: '#EEF2F6', iconColor: '#475569', label: 'VAT', value: `AED ${fmt(sel.kpis.vat)}`, delta: undefined, sub: 'invoice-stated' },
    { icon: 'card-outline', tint: C.blueSoft, iconColor: C.blue, label: 'Bill — including VAT', value: `AED ${fmt(sel.kpis.bill_incl_vat)}`, delta: deltas ? deltas.total : null, sub: 'current period' },
    { icon: 'flame-outline', tint: C.redSoft, iconColor: C.red, label: 'Excess — excluding VAT', value: `AED ${fmt(sel.kpis.extra)}`, delta: deltas ? deltas.extra : null, sub: 'flagged only above AED 10.00', alert: sel.status === 'over' },
    { icon: 'chatbubble-ellipses-outline', tint: C.amberSoft, iconColor: C.amber, label: 'Premium SMS', value: `${sel.kpis.premium_sms}`, delta: deltas ? deltas.premium_sms : null, sub: `AED ${fmt(sel.kpis.premium_sms_amount)}` },
    { icon: 'cellular-outline', tint: C.blueSoft, iconColor: C.blue, label: 'Data used', value: `${fmt(sel.kpis.data_gb)} GB`, delta: deltas ? deltas.data_gb : null, unit: ' GB', sub: a?.data_limit_gb != null ? `plan ${fmt(a.data_limit_gb)} GB · difference ${fmt(a.data_difference_gb)} GB · data charge AED ${fmt(a.invoice_data_charge_excl_vat)}` : 'plan limit needs review' },
  ] : [];

  // ----------------------------------------------------------------- render
  return (
    <ScrollView style={st.page} contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
      {/* title row */}
      <View style={[st.between, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <View style={st.titleIcon}><Ionicons name="stats-chart" size={24} color={C.green} /></View>
          <View style={{ flex: 1 }}>
            {!!backTo && (
              <TouchableOpacity onPress={() => { const t = backTo; setBackTo(null); if (onNavigate) onNavigate(t); }} style={st.backLink} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={14} color={C.muted} />
                <Text style={st.backText}>Back</Text>
              </TouchableOpacity>
            )}
            <Text style={st.h1}>Monthly Usage Report</Text>
            <Text style={st.sub}>One number at a time. Pick the company, the number and the month.</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={[st.btn, st.btnGreen, downloadingPdf && { opacity: 0.65 }]} onPress={downloadPdf} disabled={downloadingPdf} activeOpacity={0.8}>
              {downloadingPdf
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="download-outline" size={16} color="#fff" />}
              <Text style={[st.btnText, { color: '#fff' }]}>{downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* filters */}
      <Card style={{ zIndex: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', zIndex: 40 }}>
          <Picker
            label="COMPANY" icon="business-outline" listKey="company" value={company} sub={companyNumbers.length ? plural(companyNumbers.length, 'number') : ''}
            placeholder={optionsLoading ? 'Loading...' : 'Select company'}
            options={options.map(o => ({ id: o.name, label: o.name, sub: plural(o.numbers.length, 'number'), active: o.name === company }))}
            onPick={(id) => { setCompany(id); setMonth(''); }}
          />
          <Picker
            label="NUMBER" icon="call-outline" listKey="number" value={selNumber ? prettyNumber(selNumber.number) : ''} sub={selNumber?.type || ''}
            placeholder="Select number"
            options={companyNumbers.map(n => ({ id: n.key, label: prettyNumber(n.number), sub: `${n.type || ''}${n.employee ? ` · ${n.employee}` : ''} · ${plural(n.bills, 'bill')}`, active: n.key === numberKey }))}
            onPick={(id) => { setNumberKey(id); setMonth(''); }}
          />
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={st.filterLabel}>MONTH</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={st.sq} onPress={() => stepMonth(-1)} activeOpacity={0.7}><Ionicons name="chevron-back" size={16} color="#475569" /></TouchableOpacity>
              <View style={[st.select, { flex: 1 }]}>
                <View style={st.selectIcon}><Ionicons name="calendar-outline" size={15} color={C.green} /></View>
                <Text style={[st.selectText, { flex: 1 }]}>{sel ? sel.label : '—'}</Text>
              </View>
              <TouchableOpacity style={st.sq} onPress={() => stepMonth(1)} activeOpacity={0.7}><Ionicons name="chevron-forward" size={16} color="#475569" /></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* month timeline */}
        <View style={st.timelineWrap}>
          <View style={st.yearBox}>
            <TouchableOpacity disabled={yearIdx <= 0} onPress={() => setViewYear(years[yearIdx - 1])} style={[st.yearBtn, yearIdx <= 0 && { opacity: 0.3 }]}><Ionicons name="chevron-back" size={13} color="#475569" /></TouchableOpacity>
            <Text style={st.yearLabel}>{stripYear}</Text>
            <TouchableOpacity disabled={yearIdx < 0 || yearIdx >= years.length - 1} onPress={() => setViewYear(years[yearIdx + 1])} style={[st.yearBtn, (yearIdx < 0 || yearIdx >= years.length - 1) && { opacity: 0.3 }]}><Ionicons name="chevron-forward" size={13} color="#475569" /></TouchableOpacity>
          </View>
          {strip.map(s => {
            const on = sel && s.key === sel.month;
            const disabled = !s.row;
            return (
              <TouchableOpacity
                key={s.key} disabled={disabled} onPress={() => setMonth(s.key)} activeOpacity={0.8}
                style={[st.mChip, on && st.mChipOn, disabled && st.mChipDis]}
              >
                {!disabled && <View style={[st.mDot, { backgroundColor: s.row.status === 'over' ? (on ? '#FFB4AC' : C.red) : (on ? '#9FE0C2' : '#2F9E6E') }]} />}
                <Text style={[st.mChipText, on && { color: '#fff' }, disabled && { color: '#A8B3C0' }]}>{s.label}</Text>
                <Text style={[st.mChipSub, on && { color: '#CDE8DC' }, disabled && { color: '#B7C0CB' }]}>{s.row ? fmt(s.row.total) : (s.key <= lastBillKey ? 'no bill' : '—')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={st.keyRow}>
          <View style={st.keyItem}><View style={[st.keyDot, { backgroundColor: '#2F9E6E' }]} /><Text style={st.keyText}>within plan</Text></View>
          <View style={st.keyItem}><View style={[st.keyDot, { backgroundColor: C.red }]} /><Text style={st.keyText}>over plan</Text></View>
          <View style={st.keyItem}><View style={[st.keyDot, { borderWidth: 1, borderColor: '#B7C0CB', borderStyle: 'dashed', backgroundColor: '#F8FAFC' }]} /><Text style={st.keyText}>no bill imported</Text></View>
        </View>
      </Card>

      {loading && !report ? (
        <View style={st.centerBox}><ActivityIndicator size="large" color={C.green} /><Text style={st.cap}>Loading the report...</Text></View>
      ) : !sel ? (
        <Card><View style={st.centerBox}>
          <View style={st.emptyIcon}><Ionicons name="document-text-outline" size={34} color="#94A3B8" /></View>
          <Text style={st.emptyTitle}>No bills found for this number</Text>
          <Text style={[st.cap, { textAlign: 'center' }]}>Import a bill for {selNumber ? prettyNumber(selNumber.number) : 'this number'} and its report appears here automatically.</Text>
        </View></Card>
      ) : (
        <>
          {/* identity */}
          <Card style={[{ opacity: loading ? 0.6 : 1, borderLeftWidth: 5, borderLeftColor: over ? C.red : '#2F9E6E', paddingLeft: 22 }]}>
            <View style={[st.between, !wide && { flexDirection: 'column' }]}>
              <View style={{ flex: 1.3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Text style={st.bigNum}>{prettyNumber(report.number)}</Text>
                  <View style={[st.tag, over ? st.tagRed : st.tagGreen]}>
                    <Ionicons name={over ? 'alert-circle' : 'checkmark-circle'} size={15} color={over ? '#912018' : C.green} />
                    <Text style={[st.tagText, { color: over ? '#912018' : C.green }]}>
                      {over ? `Over plan · AED ${fmt(sel.kpis.extra)} extra` : 'Within plan'}
                    </Text>
                  </View>
                </View>
                <View style={st.metaRow}>
                  {!!(report.connection?.plan_name) && <View style={st.metaChip}><Ionicons name="ribbon-outline" size={14} color={C.muted} /><Text style={st.meta}>Plan <Text style={st.metaB}>{report.connection.plan_name}</Text></Text></View>}
                  <View style={st.metaChip}><Ionicons name="business-outline" size={14} color={C.muted} /><Text style={st.meta}><Text style={st.metaB}>{sel.bill.company || company}</Text></Text></View>
                  {!!(report.connection?.employee) && <View style={st.metaChip}><Ionicons name="person-outline" size={14} color={C.muted} /><Text style={st.meta}><Text style={st.metaB}>{report.connection.employee}</Text></Text></View>}
                  <View style={st.metaChip}><Ionicons name="receipt-outline" size={14} color={C.muted} /><Text style={st.meta}>Bill <Text style={st.metaB}>{sel.bill.bill_number}</Text></Text></View>
                  <View style={st.metaChip}><Ionicons name="calendar-outline" size={14} color={C.muted} /><Text style={st.meta}><Text style={st.metaB}>{prettyDate(sel.bill.period_from)} – {prettyDate(sel.bill.period_to)}</Text></Text></View>
                  {!!sel.bill.due_date && <View style={st.metaChip}><Ionicons name="hourglass-outline" size={14} color={C.muted} /><Text style={st.meta}>Due <Text style={st.metaB}>{prettyDate(sel.bill.due_date)}</Text></Text></View>}
                  <View style={st.metaChip}><Ionicons name="cellular-outline" size={14} color={C.muted} /><Text style={st.meta}><Text style={st.metaB}>{sel.bill.provider || '—'}</Text></Text></View>
                </View>
              </View>
              <View style={[st.short, over ? st.shortOver : st.shortOk, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Ionicons name="bulb-outline" size={16} color={over ? '#912018' : C.green} />
                  <Text style={[st.shortTitle, { color: over ? '#912018' : C.green }]}>In short</Text>
                </View>
                <Text style={st.shortText}>
                  Bill excluding VAT is AED {fmt(sel.kpis.bill_excl_vat)} against a plan excluding VAT of AED {fmt(sel.kpis.plan)}.
                  {sel.status === 'needs_review'
                    ? ' Some invoice values are missing, so this bill needs review.'
                    : sel.kpis.extra > 0
                      ? ` Excess excluding VAT is AED ${fmt(sel.kpis.extra)}${sources.length ? `, explained mainly by ${sources.slice().sort((x, y) => y.amount - x.amount)[0].name.toLowerCase()}` : ''}.`
                      : ' No excess this month.'}
                </Text>
              </View>
            </View>
            {sel.bill.multi_number && (
              <View style={st.multiBanner}>
                <Ionicons name="information-circle-outline" size={17} color="#1E40AF" />
                <Text style={st.multiText}>
                  This bill covers {sel.bill.numbers.length} numbers ({sel.bill.numbers.join(', ')}). The amounts above are for the whole bill, not for this number alone; call details below are for this number.
                </Text>
              </View>
            )}
          </Card>

          {/* KPIs */}
          <View style={st.kpis}>
            {kpiCards.map(k => (
              <View key={k.label} style={[st.kpi, k.alert && st.kpiEx]}>
                <View style={st.kpiTop}>
                  <View style={[st.kpiIcon, { backgroundColor: k.tint }]}><Ionicons name={k.icon} size={17} color={k.iconColor} /></View>
                  <Text style={st.kpiL}>{k.label}</Text>
                </View>
                <Text style={[st.kpiV, k.alert && { color: C.red }]} numberOfLines={1}>{k.value}</Text>
                <View style={st.kpiS}>
                  {k.delta !== undefined && <Delta value={k.delta} unit={k.unit} />}
                  <Text style={st.kpiSub} numberOfLines={1}>{k.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* history + sources */}
          <View style={[st.row, !wide && { flexDirection: 'column' }]}>
            <Card style={{ flex: 2 }}>
              <SectionHead
                icon="bar-chart-outline" title="Bill history — month wise"
                caption={`${metric === 'amount' ? 'Plan and bill on the same excluding-VAT basis. ' : 'Per month for this number. '}Click a bar to open that month.`}
                right={<Tabs items={[['amount', 'Amount'], ['minutes', 'Minutes'], ['data', 'Data'], ['sms', 'SMS']]} value={metric} onChange={setMetric} />}
              />
              <View style={{ marginTop: 22 }}>
                <Plot height={HIST_H} max={histMax}>
                  <View style={st.barsRow}>
                    {histMonths.map(m => {
                      const v = metricOf(m);
                      const h = Math.max(3, (v / histMax) * HIST_H);
                      const isSel = sel && m.key === sel.month;
                      const planH = metric === 'amount' ? Math.min(h, (Math.min(m.plan || 0, m.bill_excl_vat || 0) / histMax) * HIST_H) : 0;
                      return (
                        <TouchableOpacity key={m.key} style={st.barSlot} onPress={() => setMonth(m.key)} activeOpacity={0.8}>
                          <Text style={[st.barVal, { bottom: h + 4 }]}>{metric === 'amount' ? fmt(v) : `${fmt1(v)}${unitOf}`}</Text>
                          <View style={[st.bar, isSel && st.barSel, { height: h }]}>
                            {metric === 'amount' ? (
                              <>
                                <View style={{ flex: 1, backgroundColor: (m.bill_excl_vat || 0) - (m.plan || 0) > 0.5 ? C.red : C.grey }} />
                                <View style={{ height: planH, backgroundColor: isSel ? C.greyDark : C.grey }} />
                              </>
                            ) : <View style={{ flex: 1, backgroundColor: isSel ? '#2F5588' : C.blue }} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Plot>
                <View style={st.xRow}>
                  {histMonths.map(m => {
                    const isSel = sel && m.key === sel.month;
                    return <Text key={m.key} style={[st.xLbl, isSel && { color: C.green, fontWeight: '800' }]}>{m.label.split(' ')[0]}</Text>;
                  })}
                </View>
              </View>
              <View style={st.legend}>
                {metric === 'amount' ? (
                  <>
                    <View style={st.legendItem}><View style={[st.dot, { backgroundColor: C.grey }]} /><Text style={st.legendText}>Fixed plan</Text></View>
                    <View style={st.legendItem}><View style={[st.dot, { backgroundColor: C.red }]} /><Text style={st.legendText}>Above plan</Text></View>
                  </>
                ) : <View style={st.legendItem}><View style={[st.dot, { backgroundColor: C.blue }]} /><Text style={st.legendText}>{metric === 'minutes' ? 'Call minutes' : metric === 'data' ? 'Data (GB)' : 'Premium SMS'}</Text></View>}
                <View style={st.legendItem}><View style={[st.dot, { borderWidth: 2, borderColor: C.green, backgroundColor: '#fff' }]} /><Text style={st.legendText}>Selected month</Text></View>
              </View>
            </Card>

            <Card style={{ flex: 1 }}>
              <SectionHead icon="pie-chart-outline" tint={C.redSoft} title="Extra by source" caption="Charges on top of the fixed plan (AED excl. VAT)." />
              {sources.length === 0 ? (
                <View style={[st.centerBox, { paddingVertical: 40 }]}><Ionicons name="checkmark-circle-outline" size={38} color="#2F9E6E" /><Text style={st.cap}>No extra charge this month</Text></View>
              ) : (
                <View style={{ alignItems: 'center', gap: 18, marginTop: 18 }}>
                  <View style={[st.donut, { backgroundImage: donutBg }]}>
                    <View style={st.donutHole}>
                      <Text style={st.donutCap}>Extra</Text>
                      <Text style={st.donutVal}>{fmt(srcTotal)}</Text>
                      <Text style={st.donutCap}>AED</Text>
                    </View>
                  </View>
                  <View style={{ alignSelf: 'stretch' }}>
                    {sources.map((s, i) => (
                      <View key={`${s.name}-${i}`} style={st.srcRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[st.dot, { backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length], marginRight: 9 }]} />
                          <Text style={st.srcName} numberOfLines={1}>{s.name}</Text>
                        </View>
                        <Text style={st.srcVal}>{fmt(s.amount)}</Text>
                        <Text style={st.srcPct}>{Math.round((s.amount / srcTotal) * 100)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Card>
          </View>

          {/* daily minutes + allowance */}
          <View style={[st.row, !wide && { flexDirection: 'column' }]}>
            <Card style={{ flex: 2 }}>
              <SectionHead
                icon="call-outline" tint={C.blueSoft} title="Call minutes per day"
                caption="Grey = calls with no invoice charge. Red = calls with an invoice charge; no tariff rate is inferred."
                right={firstCharged ? (
                  <View style={[st.tag, st.tagRed]}>
                    <Ionicons name="alert-circle" size={14} color="#912018" />
                    <Text style={[st.tagText, { color: '#912018' }]}>First call with charge {prettyDate(firstCharged.date)}{firstCharged.time ? `, ${firstCharged.time.slice(0, 5)}` : ''}</Text>
                  </View>
                ) : null}
              />
              {daily.length === 0 ? (
                <View style={[st.centerBox, { paddingVertical: 40 }]}><Ionicons name="call-outline" size={36} color="#94A3B8" /><Text style={st.cap}>No call log for this bill</Text></View>
              ) : (
                <View style={{ marginTop: 22 }}>
                  <Plot height={DAILY_H} max={dailyMax}>
                    <View style={[st.barsRow, { gap: 3, paddingHorizontal: 6 }]}>
                      {daily.map((d, i) => {
                        const hf = (d.uncharged_min / dailyMax) * DAILY_H;
                        const hc = (d.charged_call_min / dailyMax) * DAILY_H;
                        return (
                          <View key={d.date} style={st.dailyCol}>
                            {i === firstChargedIndex && <View style={st.ranOutLine} />}
                            {d.charged_call_min > 0 && <View style={{ height: Math.max(2, hc), backgroundColor: C.red, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />}
                            {d.uncharged_min > 0 && <View style={{ height: Math.max(2, hf), backgroundColor: C.grey, borderTopLeftRadius: d.charged_call_min > 0 ? 0 : 3, borderTopRightRadius: d.charged_call_min > 0 ? 0 : 3 }} />}
                          </View>
                        );
                      })}
                    </View>
                  </Plot>
                  <View style={[st.xRow, { gap: 3, paddingHorizontal: 6 }]}>
                    {daily.map(d => <Text key={d.date} style={st.dayLbl}>{d.day}</Text>)}
                  </View>
                </View>
              )}
              <View style={st.legend}>
                <View style={st.legendItem}><View style={[st.dot, { backgroundColor: C.grey }]} /><Text style={st.legendText}>Calls without charges · {fmt0(sel.calls.uncharged_calls)} calls · {fmt1(sel.calls.uncharged_minutes)} min</Text></View>
                <View style={st.legendItem}><View style={[st.dot, { backgroundColor: C.red }]} /><Text style={st.legendText}>Calls with charges · {fmt0(sel.calls.calls_with_charges)} calls · {fmt1(sel.calls.duration_of_calls_with_charges_minutes)} min · AED {fmt(sel.calls.charged_amount)}</Text></View>
              </View>
            </Card>

            <Card style={{ flex: 1 }}>
              <SectionHead icon="speedometer-outline" tint={C.amberSoft} title="Usage and allowance" caption={`What this number used in ${sel.label}.`} />
              <View style={{ marginTop: 18 }}>
                <View style={st.meter}>
                  <View style={st.meterTop}><View style={st.meterNameRow}><Ionicons name="call-outline" size={14} color={C.muted} /><Text style={st.meterName}>Call minutes</Text></View><Text style={[st.meterVal, chargedMin > 0 && { color: C.red }]}>{fmt0(callTotalMin)} min</Text></View>
                  <View style={st.track}>
                    <View style={{ flex: Math.max(unchargedMin, 0.001), backgroundColor: C.grey }} />
                    <View style={{ flex: Math.max(chargedMin, 0.001), backgroundColor: C.red }} />
                  </View>
                  <Text style={st.meterSub}>{fmt1(unchargedMin)} min without charges · {fmt1(chargedMin)} min from calls with charges</Text>
                  <Text style={st.meterSub}>
                    Actual talk time {fmt1(sel.calls.actual_total_minutes)} min
                    {' · includes incoming roaming where present'}
                    {sel.calls.provider_reported_minutes?.local == null ? '' : ` · provider reports ${fmt1(sel.calls.provider_reported_minutes.local)} local min`}
                    {sel.calls.duration_above_allowance_minutes == null
                      ? ' · duration above allowance not calculated (allowance or eligible categories unknown)'
                      : ` · duration above allowance ${fmt1(sel.calls.duration_above_allowance_minutes)} min (not verified chargeable minutes)`}
                  </Text>
                  {categoryIssues.length > 0 ? <Text style={[st.meterSub, { color: C.red }]}>Needs review: {categoryIssues.map(item => `${item.category} (${(item.mismatches || []).join(', ')})`).join('; ')}</Text> : null}
                </View>
                <View style={st.meter}>
                  <View style={st.meterTop}><View style={st.meterNameRow}><Ionicons name="cellular-outline" size={14} color={C.muted} /><Text style={st.meterName}>Data</Text></View><Text style={st.meterVal}>{fmt(a.data_used_gb)}{a.data_limit_gb ? ` of ${fmt(a.data_limit_gb)}` : ''} GB</Text></View>
                  <View style={st.track}>
                    <View style={{ flex: a.data_limit_gb ? Math.min(a.data_used_gb, a.data_limit_gb) : Math.max(a.data_used_gb, 0.001), backgroundColor: a.data_limit_gb && a.data_used_gb > a.data_limit_gb ? C.red : C.blue }} />
                    {a.data_limit_gb ? <View style={{ flex: Math.max(a.data_limit_gb - a.data_used_gb, 0.001), backgroundColor: '#EEF2F6' }} /> : null}
                  </View>
                  <Text style={st.meterSub}>{a.data_unlimited ? 'Unlimited data plan' : a.data_limit_gb != null ? `${fmt(a.data_difference_gb)} GB difference · invoice data charge AED ${fmt(a.invoice_data_charge_excl_vat)} (usage difference is not assumed chargeable)` : 'Plan data limit not recorded'}</Text>
                </View>
                <View style={st.meter}>
                  <View style={st.meterTop}><View style={st.meterNameRow}><Ionicons name="chatbubble-ellipses-outline" size={14} color={C.muted} /><Text style={st.meterName}>Premium SMS</Text></View><Text style={[st.meterVal, a.premium_sms > 0 && { color: C.red }]}>{a.premium_sms} sent</Text></View>
                  <View style={st.track}><View style={{ flex: 1, backgroundColor: a.premium_sms > 0 ? C.amber : '#EEF2F6' }} /></View>
                  <Text style={st.meterSub}>{a.premium_sms > 0 ? `Not in plan · AED ${fmt(a.premium_sms_amount)}` : 'None this month'}{a.normal_sms ? ` · ${a.normal_sms} normal SMS` : ''}</Text>
                </View>
                <View style={[st.meter, { marginBottom: 0 }]}>
                  <View style={st.meterTop}><View style={st.meterNameRow}><Ionicons name="car-outline" size={14} color={C.muted} /><Text style={st.meterName}>mParking</Text></View><Text style={[st.meterVal, a.parking_amount > 0 && { color: C.red }]}>AED {fmt(a.parking_amount)}</Text></View>
                  <View style={st.track}><View style={{ flex: 1, backgroundColor: a.parking_amount > 0 ? C.purple : '#EEF2F6' }} /></View>
                  <Text style={st.meterSub}>{a.parking_amount > 0 ? '3rd-party charge on the bill' : 'None this month'}</Text>
                </View>
              </View>
            </Card>
          </View>

          {/* month-wise table */}
          <Card>
            <SectionHead
              icon="list-outline" tint={C.greenSoft} title="Month-wise report for this number"
              caption={`${prettyNumber(report.number)} · ${company} · tap a row to open that month.`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
              <View style={{ minWidth: 1000, flexGrow: 1, marginTop: 14 }}>
                <View style={st.thead}>
                  {[['Month', 1.4], ['Bill no.', 1.6], ['Bill incl. VAT', 1], ['Plan excl. VAT', 1], ['Excess excl. VAT', 1], ['Above plan %', 0.9], ['Call min', 1], ['Data GB', 0.9], ['Premium SMS', 1.1], ['Status', 1.3]].map(([h, f], i) => (
                    <Text key={h} style={[st.th, { flex: f }, i >= 2 && i <= 8 && { textAlign: 'right' }, i === 9 && { textAlign: 'right', paddingLeft: 14 }]}>{h}</Text>
                  ))}
                </View>
                {months.map(m => {
                  const isSel = sel && m.key === sel.month;
                  return (
                    <TouchableOpacity key={m.key} onPress={() => setMonth(m.key)} activeOpacity={0.8} style={[st.tr, isSel && st.trSel]}>
                      <Text style={[st.td, { flex: 1.4 }, isSel && st.bold]}>{isSel ? '▸ ' : ''}{m.label}</Text>
                      <Text style={[st.td, { flex: 1.6, color: C.muted }]}>{m.bill_number}</Text>
                      <Text style={[st.td, st.r, { flex: 1 }, isSel && st.bold]}>{fmt(m.total)}</Text>
                      <Text style={[st.td, st.r, { flex: 1 }]}>{fmt(m.plan)}</Text>
                      <Text style={[st.td, st.r, { flex: 1 }, m.extra > 0 && { color: C.red, fontWeight: '800' }]}>{fmt(m.extra)}</Text>
                      <Text style={[st.td, st.r, { flex: 0.9 }, m.extra > 0 && { color: C.red }]}>{m.extra_pct == null ? 'N/A' : `${Number(m.extra_pct).toFixed(2)}%`}</Text>
                      <Text style={[st.td, st.r, { flex: 1 }]}>{fmt0(m.call_minutes)}</Text>
                      <Text style={[st.td, st.r, { flex: 0.9 }]}>{fmt1(m.data_gb)}</Text>
                      <Text style={[st.td, st.r, { flex: 1.1 }]}>{m.premium_sms}</Text>
                      <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
                        <View style={[st.pill, m.status === 'over' ? st.pillOver : st.pillOk]}>
                          <View style={[st.pillDot, { backgroundColor: m.status === 'over' ? C.red : '#2F9E6E' }]} />
                          <Text style={[st.pillText, { color: m.status === 'over' ? '#912018' : C.green }]}>{m.status === 'over' ? 'Over plan' : 'Within plan'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <View style={st.trTot}>
                  <Text style={[st.td, st.bold, { flex: 1.4 }]}>Total</Text>
                  <Text style={[st.td, { flex: 1.6 }]} />
                  <Text style={[st.td, st.r, st.bold, { flex: 1 }]}>{fmt(months.reduce((s, m) => s + m.total, 0))}</Text>
                  <Text style={[st.td, st.r, st.bold, { flex: 1 }]}>{fmt(months.reduce((s, m) => s + m.plan, 0))}</Text>
                  <Text style={[st.td, st.r, st.bold, { flex: 1, color: C.red }]}>{fmt(months.reduce((s, m) => s + m.extra, 0))}</Text>
                  <Text style={[st.td, { flex: 0.9 }]} />
                  <Text style={[st.td, st.r, st.bold, { flex: 1 }]}>{fmt0(months.reduce((s, m) => s + m.call_minutes, 0))}</Text>
                  <Text style={[st.td, st.r, st.bold, { flex: 0.9 }]}>{fmt1(months.reduce((s, m) => s + m.data_gb, 0))}</Text>
                  <Text style={[st.td, st.r, st.bold, { flex: 1.1 }]}>{months.reduce((s, m) => s + m.premium_sms, 0)}</Text>
                  <View style={{ flex: 1.3 }} />
                </View>
              </View>
            </ScrollView>
          </Card>

          {/* top numbers + bill lines */}
          <View style={[st.row, !wide && { flexDirection: 'column' }]}>
            <Card style={{ flex: 1.25 }}>
              <SectionHead
                icon="trophy-outline" tint={C.amberSoft} title="Top 10 numbers called"
                caption={`${sel.label} · extra charge excl. VAT.`}
                right={<Tabs items={[['by_calls', 'Most calls'], ['by_time', 'Longest time'], ['by_extra', 'Highest extra']]} value={topTab} onChange={setTopTab} />}
              />
              {top.length === 0 ? (
                <View style={[st.centerBox, { paddingVertical: 34 }]}><Text style={st.cap}>{topTab === 'by_extra' ? 'No charged calls this month' : 'No calls recorded'}</Text></View>
              ) : (
                <View style={{ marginTop: 14 }}>
                  <View style={st.thead}>
                    <Text style={[st.th, { width: 34 }]}>#</Text>
                    <Text style={[st.th, { flex: 1.5 }]}>Number</Text>
                    <Text style={[st.th, st.r, { flex: 0.8 }]}>Calls</Text>
                    <Text style={[st.th, st.r, { flex: 0.9 }]}>Total min</Text>
                    <Text style={[st.th, st.r, { flex: 0.9 }]}>No-charge min</Text>
                    <Text style={[st.th, st.r, { flex: 0.9 }]}>Charged-call min</Text>
                    <View style={{ flex: 1.1 }} />
                    <Text style={[st.th, st.r, { flex: 1 }]}>Extra AED</Text>
                  </View>
                  {top.map((t, i) => {
                    const v = topTab === 'by_extra' ? t.charged_amount : topTab === 'by_time' ? t.total_min : t.calls;
                    return (
                      <View key={`${t.number}-${i}`} style={st.tr}>
                        <View style={{ width: 34 }}><View style={[st.rank, i < 3 && st.rankTop]}><Text style={[st.rankText, i < 3 && { color: '#7A4B00' }]}>{i + 1}</Text></View></View>
                        <Text style={[st.td, st.bold, { flex: 1.5 }]}>{t.number}</Text>
                        <Text style={[st.td, st.r, { flex: 0.8 }]}>{t.calls}</Text>
                        <Text style={[st.td, st.r, { flex: 0.9 }]}>{fmt1(t.total_min)}</Text>
                        <Text style={[st.td, st.r, { flex: 0.9 }]}>{fmt1(t.uncharged_min)}</Text>
                        <Text style={[st.td, st.r, { flex: 0.9 }]}>{fmt1(t.charged_call_min)}</Text>
                        <View style={{ flex: 1.1, paddingHorizontal: 8, justifyContent: 'center' }}>
                          <View style={st.barTrack}><View style={{ height: 8, borderRadius: 4, width: `${Math.max(4, (v / topMax) * 100)}%`, backgroundColor: topTab === 'by_extra' ? C.red : C.blue }} /></View>
                        </View>
                        <Text style={[st.td, st.r, { flex: 1 }, t.charged_amount > 0 && { color: C.red, fontWeight: '800' }]}>{fmt(t.charged_amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <Card style={{ flex: 1 }}>
              <SectionHead icon="receipt-outline" tint={C.greenSoft} title="Where the money went" caption="Each charge line of the bill. Red lines are on top of the fixed plan." />
              <View style={{ marginTop: 14 }}>
                <View style={st.thead}>
                  <Text style={[st.th, { flex: 2 }]}>Bill line</Text>
                  <View style={{ flex: 1.4 }} />
                  <Text style={[st.th, st.r, { flex: 0.9 }]}>AED</Text>
                </View>
                {lines.map((l, i) => (
                  <View key={`${l.description}-${i}`} style={st.tr}>
                    <Text style={[st.td, { flex: 2 }]} numberOfLines={1}>{l.description}</Text>
                    <View style={{ flex: 1.4, paddingHorizontal: 8, justifyContent: 'center' }}>
                      <View style={st.barTrack}><View style={{ height: 8, borderRadius: 4, width: `${Math.max(3, (Math.abs(l.amount) / lineMax) * 100)}%`, backgroundColor: l.part === 'Extra usage' ? C.red : (l.part === 'Plan' ? C.grey : '#D5DBE3') }} /></View>
                    </View>
                    <Text style={[st.td, st.r, { flex: 0.9 }, l.part === 'Extra usage' && { color: C.red, fontWeight: '800' }]}>{fmt(l.amount)}</Text>
                  </View>
                ))}
                <View style={st.trTot}>
                  <Text style={[st.td, st.bold, { flex: 2 }]}>Total amount due</Text>
                  <View style={{ flex: 1.4 }} />
                  <Text style={[st.td, st.r, st.bold, { flex: 0.9 }]}>{fmt(total)}</Text>
                </View>
                {!!sel.reconcile && (
                  <View style={[st.recon, sel.reconcile.matches ? st.reconOk : st.reconWarn]}>
                    <Ionicons name={sel.reconcile.matches ? 'checkmark-circle' : 'alert-circle'} size={16} color={sel.reconcile.matches ? C.green : '#92580A'} />
                    <Text style={[st.reconText, { color: sel.reconcile.matches ? C.green : '#92580A' }]}>
                      {sel.reconcile.matches
                        ? `Lines add up to the bill total (AED ${fmt(sel.reconcile.bill_total)}).`
                        : `Lines add up to AED ${fmt(sel.reconcile.lines_total)}, the bill total is AED ${fmt(sel.reconcile.bill_total)} (difference ${fmt(Math.abs(sel.reconcile.difference))}).`}
                      {' '}Excess excluding VAT = max(0, bill excluding VAT − applicable plan excluding VAT). Invoice totals are preserved; detail lines only explain them.
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 22, ...SHADOW },
  row: { flexDirection: 'row', gap: 18 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  titleIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 27, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  sub: { fontSize: 13.5, color: C.muted, marginTop: 3 },
  h2: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.1 },
  cap: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sectionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontWeight: '700', color: C.muted },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 11, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' },
  btnGreen: { backgroundColor: C.green, borderColor: C.green },
  btnText: { fontSize: 14, fontWeight: '700', color: C.ink },
  filterLabel: { fontSize: 11.5, fontWeight: '800', color: C.muted, letterSpacing: 0.8, marginBottom: 7 },
  select: { height: 46, borderWidth: 1, borderColor: '#D6DDE5', borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectOpen: { borderColor: C.green, ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 3px #D9EFE6' } : {}) },
  selectIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  selectText: { fontSize: 14.5, fontWeight: '700', color: C.ink },
  selectSub: { fontSize: 12.5, color: C.muted, marginLeft: 8, fontWeight: '600', flexShrink: 1 },
  sq: { width: 46, height: 46, borderWidth: 1, borderColor: '#D6DDE5', borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  pickList: { position: 'absolute', top: 76, left: 0, right: 0, borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', zIndex: 50, ...(Platform.OS === 'web' ? { boxShadow: '0 12px 28px rgba(15,23,42,0.16)' } : {}) },
  pickItem: { paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickItemActive: { backgroundColor: '#F0FDF4' },
  pickText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  pickSub: { fontSize: 11.5, color: C.muted, marginTop: 2 },
  pickEmpty: { padding: 14, fontSize: 12, color: '#94A3B8' },
  timelineWrap: { zIndex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, alignItems: 'center', paddingTop: 18, borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  yearBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 6, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 4, height: 46 },
  yearBtn: { width: 24, height: 30, alignItems: 'center', justifyContent: 'center' },
  yearLabel: { fontSize: 14, fontWeight: '800', color: C.ink, minWidth: 40, textAlign: 'center' },
  mChip: { minWidth: 84, height: 50, borderRadius: 11, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  mChipOn: { backgroundColor: C.green, borderColor: C.green, ...(Platform.OS === 'web' ? { boxShadow: '0 4px 12px rgba(11,74,53,0.28)' } : {}) },
  mChipDis: { backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderColor: '#D5DCE5' },
  mChipText: { fontSize: 13.5, fontWeight: '800', color: '#475569' },
  mChipSub: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 1 },
  mDot: { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4 },
  keyRow: { zIndex: 1, flexDirection: 'row', gap: 18, marginTop: 12 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyDot: { width: 9, height: 9, borderRadius: 5 },
  keyText: { fontSize: 12, color: C.muted },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  bigNum: { fontSize: 34, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  tagRed: { backgroundColor: C.redSoft },
  tagGreen: { backgroundColor: C.greenSoft },
  tagText: { fontSize: 13, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4F6F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  meta: { fontSize: 13, color: C.muted },
  metaB: { color: C.ink, fontWeight: '700' },
  short: { borderRadius: 14, padding: 16, borderWidth: 1 },
  shortOver: { backgroundColor: '#FCF4F3', borderColor: '#F3D4D0' },
  shortOk: { backgroundColor: '#F2FAF6', borderColor: '#CDE8DC' },
  shortTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  shortText: { fontSize: 14, lineHeight: 22, color: '#334155' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpi: { flexGrow: 1, flexBasis: 175, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, ...SHADOW },
  kpiEx: { borderColor: C.redLine, backgroundColor: '#FFFAF9' },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiL: { fontSize: 13, color: C.muted, fontWeight: '700', flexShrink: 1 },
  kpiV: { fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 14, marginBottom: 8, letterSpacing: -0.5 },
  kpiS: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  kpiSub: { fontSize: 12.5, color: C.muted, flexShrink: 1 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  deltaUp: { backgroundColor: C.redSoft },
  deltaDown: { backgroundColor: '#E6F4EE' },
  deltaFlat: { backgroundColor: '#EEF2F6' },
  deltaText: { fontSize: 11.5, fontWeight: '800' },
  tabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 11, padding: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  tabOn: { backgroundColor: '#fff', ...(Platform.OS === 'web' ? { boxShadow: '0 1px 3px rgba(15,23,42,0.12)' } : {}) },
  tabText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  axisText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.grid },
  barsRow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barSlot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', maxWidth: 120 },
  barVal: { position: 'absolute', fontSize: 12.5, fontWeight: '800', color: C.ink },
  bar: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  barSel: { borderWidth: 2, borderColor: C.green },
  xRow: { flexDirection: 'row', marginLeft: 44, marginTop: 8 },
  xLbl: { flex: 1, textAlign: 'center', fontSize: 13, color: '#475569', fontWeight: '600', maxWidth: 120 },
  dayLbl: { flex: 1, textAlign: 'center', fontSize: 10.5, color: '#64748B' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendText: { fontSize: 13, color: '#475569' },
  dot: { width: 12, height: 12, borderRadius: 4 },
  donut: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center' },
  donutHole: { width: 122, height: 122, borderRadius: 61, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  donutCap: { fontSize: 12, color: C.muted, fontWeight: '600' },
  donutVal: { fontSize: 22, fontWeight: '800', color: C.red, letterSpacing: -0.4 },
  srcRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEF2F6', gap: 10 },
  srcName: { fontSize: 13.5, color: C.ink, flexShrink: 1 },
  srcVal: { fontSize: 13.5, fontWeight: '800', color: C.ink },
  srcPct: { fontSize: 12.5, color: C.muted, fontWeight: '700', width: 38, textAlign: 'right' },
  dailyCol: { flex: 1, height: '100%', justifyContent: 'flex-end', position: 'relative' },
  ranOutLine: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: C.green, opacity: 0.85 },
  meter: { marginBottom: 20 },
  meterTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  meterNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  meterName: { fontSize: 13.5, color: C.ink, fontWeight: '600' },
  meterVal: { fontSize: 13.5, fontWeight: '800', color: C.ink },
  track: { height: 10, borderRadius: 99, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#EEF2F6' },
  meterSub: { fontSize: 12.5, color: C.muted, marginTop: 7 },
  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#F6F8FA', borderRadius: 10 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#EEF2F6' },
  trSel: { backgroundColor: '#EEF7F2', borderRadius: 10, borderBottomColor: 'transparent' },
  trTot: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#94A3B8', marginTop: 4 },
  th: { fontSize: 11.5, fontWeight: '800', color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  td: { fontSize: 13.5, color: C.ink },
  r: { textAlign: 'right' },
  bold: { fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillOver: { backgroundColor: C.redSoft },
  pillOk: { backgroundColor: C.greenSoft },
  pillText: { fontSize: 12, fontWeight: '800' },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  rankTop: { backgroundColor: '#FDEBC8' },
  rankText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  recon: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1 },
  reconOk: { backgroundColor: '#F2FAF6', borderColor: '#CDE8DC' },
  reconWarn: { backgroundColor: '#FEF6E7', borderColor: '#F6DDA8' },
  reconText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  multiBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#C7D8FA' },
  multiText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 19 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
});
