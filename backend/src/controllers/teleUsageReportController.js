const db = require('../config/db');

// Monthly usage report for ONE telecom number: month-wise history plus the full breakdown of the selected month.
// Built from tbl_telecome_bill and its children (items, call logs, SMS logs, usage summary) and the connection record.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EXCESS_MARGIN_AED = 10; // same "over plan" margin as the Excess Usage report and the Connections list

const digits = (v) => String(v || '').replace(/\D/g, '');
const last9 = (v) => digits(v).slice(-9);
const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const durSec = (s) => {
  const m = /^(\d+):(\d{2}):(\d{2})$/.exec(String(s || '').trim());
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
};
const iso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let colCache = null;
const getCols = async (table) => {
  const r = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]
  ).catch(() => ({ rows: [] }));
  return new Set(r.rows.map(x => x.column_name));
};

// Bill period from the saved columns, then field_data, then the PDF file name, then the created date
const periodOf = (row) => {
  let fd = {};
  try { fd = typeof row.field_data === 'string' ? JSON.parse(row.field_data || '{}') : (row.field_data || {}); } catch (e) { fd = {}; }
  let from = iso(row.period_from || row.bill_period_from || fd['Bill Period From'] || fd.period_from || fd.f_from);
  let to = iso(row.period_to || row.bill_period_to || fd['Bill Period To'] || fd.period_to || fd.f_to);
  if (!to && row.pdf_filename) {
    const m = String(row.pdf_filename).match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]);
      const last = new Date(y, mo, 0).getDate();
      from = from || `${y}-${String(mo).padStart(2, '0')}-01`;
      to = `${y}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
    }
  }
  if (!to && row.created_at) {
    const c = iso(row.created_at);
    if (c) to = c;
  }
  return { from, to: to || from };
};

const monthKeyOf = (period) => {
  const ref = period.to || period.from;
  return ref ? ref.slice(0, 7) : null;
};

const monthLabelOf = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1] || m} ${y}`;
};

const dedupeCalls = (rows) => {
  const seen = new Set();
  return rows.filter(r => {
    const k = [r.bill_number, r.call_date, r.call_time, r.destination_number, r.duration, r.category, num(r.amount)].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// ---------------------------------------------------------------------------
// GET /api/telecom-bills/usage-report/options  ->  companies and their numbers
// ---------------------------------------------------------------------------
exports.getUsageReportOptions = async (req, res) => {
  try {
    const clientId = req.query.clientid || req.query.client_id;

    const connParams = [];
    let connSql = `SELECT company_name, connection_number, connection_type, plan_name, employee_name
                   FROM tbl_tele_connection WHERE is_deleted = 0`;
    if (clientId) {
      connParams.push(String(clientId));
      connSql += ` AND (client_id::text = $1 OR client_id IS NULL)`;
    }
    const conns = await db.query(connSql, connParams).catch(() => ({ rows: [] }));

    const billCols = await getCols('tbl_telecome_bill');
    const compCol = billCols.has('company_name') ? 'company_name' : null;
    const billParams = [];
    let billSql = `SELECT mobile_number, ${compCol ? compCol : `NULL`} AS company_name FROM tbl_telecome_bill`;
    if (clientId && billCols.has('clientid')) {
      billParams.push(String(clientId));
      billSql += ` WHERE clientid::text = $1`;
    }
    const bills = await db.query(billSql, billParams).catch(() => ({ rows: [] }));

    const byCompany = new Map();
    const add = (company, number, extra) => {
      const name = String(company || 'Other').trim() || 'Other';
      const d = last9(number);
      if (!d) return;
      if (!byCompany.has(name)) byCompany.set(name, new Map());
      const m = byCompany.get(name);
      if (!m.has(d)) m.set(d, { number: String(number).trim(), key: d, type: '', plan: '', employee: '', bills: 0 });
      Object.assign(m.get(d), Object.fromEntries(Object.entries(extra || {}).filter(([, v]) => v)));
    };

    conns.rows.forEach(c => add(c.company_name, c.connection_number, {
      type: c.connection_type, plan: c.plan_name, employee: c.employee_name,
    }));
    bills.rows.forEach(b => {
      String(b.mobile_number || '').split(/[,|\n]+/).map(s => s.trim()).filter(Boolean).forEach(n => {
        add(b.company_name, n, {});
        const m = byCompany.get(String(b.company_name || 'Other').trim() || 'Other');
        if (m && m.get(last9(n))) m.get(last9(n)).bills += 1;
      });
    });

    const companies = Array.from(byCompany.entries())
      .map(([name, m]) => ({ name, numbers: Array.from(m.values()).sort((a, b) => a.number.localeCompare(b.number)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json({ companies });
  } catch (error) {
    console.error('Error building usage report options:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/telecom-bills/usage-report?number=...&month=YYYY-MM
// ---------------------------------------------------------------------------
exports.getUsageReport = async (req, res) => {
  try {
    const key = last9(req.query.number);
    if (!key) return res.status(400).json({ message: 'A mobile / line number is required.' });
    const wantedMonth = String(req.query.month || '').trim();
    const clientId = req.query.clientid || req.query.client_id;
    const company = String(req.query.company || '').trim();

    const billCols = await getCols('tbl_telecome_bill');
    const pk = ['tele_bill_id', 'bill_id', 'id'].find(c => billCols.has(c)) || 'tele_bill_id';

    const params = [`%${key}%`];
    let sql = `SELECT tb.*, tb.${pk} AS _pk FROM tbl_telecome_bill tb
               WHERE regexp_replace(COALESCE(tb.mobile_number, ''), '\\D', '', 'g') LIKE $1`;
    if (clientId && billCols.has('clientid')) {
      params.push(String(clientId));
      sql += ` AND tb.clientid::text = $2`;
    }
    // The same number can be billed under more than one company, so the company narrows the bills
    if (company && billCols.has('company_name')) {
      params.push(company);
      sql += ` AND LOWER(COALESCE(tb.company_name, '')) = LOWER($${params.length})`;
    }
    sql += ` ORDER BY tb.${pk} DESC`;
    const billRes = await db.query(sql, params);

    // One bill per bill number (newest upload wins)
    const seen = new Set();
    const bills = [];
    billRes.rows.forEach(r => {
      const bn = String(r.bill_number || r._pk);
      if (seen.has(bn)) return;
      seen.add(bn);
      const period = periodOf(r);
      bills.push({ row: r, pk: r._pk, billNumber: r.bill_number, period, monthKey: monthKeyOf(period) });
    });
    bills.sort((a, b) => String(a.period.to || '').localeCompare(String(b.period.to || '')));

    // Connection record for the number
    const connRes = await db.query(
      `SELECT * FROM tbl_tele_connection WHERE is_deleted = 0 AND right(regexp_replace(COALESCE(connection_number,''), '\\D', '', 'g'), 9) = $1
         AND ($2 = '' OR LOWER(company_name) = LOWER($2)) LIMIT 1`,
      [key, company]
    ).catch(() => ({ rows: [] }));
    const conn = connRes.rows[0] || null;

    if (bills.length === 0) {
      return res.status(200).json({
        number: String(req.query.number), key, connection: conn ? shapeConn(conn) : null, months: [], selected: null,
      });
    }

    const billNumbers = bills.map(b => b.billNumber).filter(Boolean);
    const pks = bills.map(b => b.pk);

    const itemFk = (await getCols('tbl_telecome_bill_items')).has('tele_bill_id') ? 'tele_bill_id' : 'bill_id';
    const [itemsRes, callsRes, smsRes, usageRes] = await Promise.all([
      db.query(`SELECT * FROM tbl_telecome_bill_items WHERE ${itemFk} = ANY($1) ORDER BY item_id ASC`, [pks]).catch(() => ({ rows: [] })),
      db.query(
        `SELECT bill_number, call_date, call_time, destination_number, duration, category, amount
         FROM tbl_telecome_call_logs
         WHERE bill_number = ANY($1) AND regexp_replace(COALESCE(source_number,''), '\\D', '', 'g') LIKE $2`,
        [billNumbers, `%${key}`]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT bill_number, sms_date, sms_time, sms_type, sms_count, amount
         FROM tbl_telecome_sms_logs
         WHERE bill_number = ANY($1) AND regexp_replace(COALESCE(source_number,''), '\\D', '', 'g') LIKE $2`,
        [billNumbers, `%${key}`]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT * FROM tbl_telecome_usage_summary
         WHERE bill_number = ANY($1) AND regexp_replace(COALESCE(mobile_number,''), '\\D', '', 'g') LIKE $2`,
        [billNumbers, `%${key}`]
      ).catch(() => ({ rows: [] })),
    ]);

    const itemsByPk = new Map();
    itemsRes.rows.forEach(i => {
      const k = String(i[itemFk]);
      if (!itemsByPk.has(k)) itemsByPk.set(k, []);
      itemsByPk.get(k).push(i);
    });
    const callsByBill = new Map();
    dedupeCalls(callsRes.rows).forEach(c => {
      if (!callsByBill.has(c.bill_number)) callsByBill.set(c.bill_number, []);
      callsByBill.get(c.bill_number).push(c);
    });
    const smsByBill = new Map();
    smsRes.rows.forEach(s => {
      if (!smsByBill.has(s.bill_number)) smsByBill.set(s.bill_number, []);
      smsByBill.get(s.bill_number).push(s);
    });
    const usageByBill = new Map();
    usageRes.rows.forEach(u => { if (!usageByBill.has(u.bill_number)) usageByBill.set(u.bill_number, u); });

    const connPlan = conn ? num(conn.monthly_plan_amount) : 0;

    // ---- month-wise rows for every bill of this number ----
    const months = bills.map(b => {
      const r = b.row;
      const total = num(r.total_amount ?? r.total_bill);
      const vat = num(r.vat_amount ?? r.vat_current_period);
      const planRental = num(r.plan_rental);
      const plan = connPlan > 0 ? connPlan : planRental;
      const exclVat = vat > 0 && total > vat ? total - vat : total;
      const extra = Math.max(0, exclVat - plan);
      const calls = callsByBill.get(b.billNumber) || [];
      const sms = smsByBill.get(b.billNumber) || [];
      const usage = usageByBill.get(b.billNumber);
      const callSecs = calls.reduce((s, c) => s + durSec(c.duration), 0);
      return {
        key: b.monthKey,
        label: monthLabelOf(b.monthKey),
        bill_id: b.pk,
        bill_number: b.billNumber,
        total: round2(total),
        plan: round2(plan),
        extra: round2(extra),
        extra_pct: total > 0 ? Math.round((extra / total) * 100) : 0,
        call_minutes: round2(callSecs / 60),
        calls: calls.length,
        data_gb: usage ? num(usage.data_used_gb) : 0,
        premium_sms: sms.filter(s => /premium/i.test(s.sms_type || '')).reduce((n, s) => n + (Number(s.sms_count) || 1), 0),
        status: extra > EXCESS_MARGIN_AED ? 'over' : 'within',
      };
    });

    // ---- the selected month ----
    let sel = bills.find(b => b.monthKey === wantedMonth);
    if (!sel) sel = bills[bills.length - 1];
    const selIdx = bills.indexOf(sel);
    const m = months[selIdx];
    const prev = selIdx > 0 ? months[selIdx - 1] : null;
    const r = sel.row;
    const items = itemsByPk.get(String(sel.pk)) || [];
    const calls = callsByBill.get(sel.billNumber) || [];
    const smsLogs = smsByBill.get(sel.billNumber) || [];
    const usage = usageByBill.get(sel.billNumber) || null;
    const total = num(r.total_amount ?? r.total_bill);
    const vat = num(r.vat_amount ?? r.vat_current_period);

    // bill lines (everything except the total row); plan / extra / VAT classification
    const lines = items
      .filter(i => String(i.record_type).toUpperCase() !== 'BILL')
      .map(i => {
        const t = String(i.record_type || '').toUpperCase();
        return {
          description: i.category,
          type: t,
          part: t === 'SERVICE' ? 'Plan' : (t === 'VAT' ? 'VAT' : 'Extra usage'),
          amount: round2(num(i.amount)),
        };
      });

    // extra by source (charges and parking, VAT left out)
    const sources = lines.filter(l => l.part === 'Extra usage' && l.amount > 0).map(l => ({ name: l.description, amount: l.amount }));

    // calls: free vs charged, per day
    const parsed = calls.map(c => ({
      c, ts: Date.parse(`${c.call_date} ${c.call_time || ''}`.trim()) || Date.parse(c.call_date) || 0,
      secs: durSec(c.duration), amt: num(c.amount),
    })).sort((a, b) => a.ts - b.ts);
    const perDay = new Map();
    let freeCalls = 0; let freeSecs = 0; let chargedCalls = 0; let chargedSecs = 0; let chargedAmount = 0;
    let freeRanOut = null;
    parsed.forEach(p => {
      const d = new Date(p.ts);
      const dayKey = p.ts ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'unknown';
      if (!perDay.has(dayKey)) perDay.set(dayKey, { date: dayKey, day: p.ts ? d.getDate() : 0, free_min: 0, charged_min: 0 });
      const slot = perDay.get(dayKey);
      if (p.amt > 0) {
        slot.charged_min += p.secs / 60; chargedCalls += 1; chargedSecs += p.secs; chargedAmount += p.amt;
        if (!freeRanOut) freeRanOut = { date: dayKey, time: p.c.call_time || '' };
      } else {
        slot.free_min += p.secs / 60; freeCalls += 1; freeSecs += p.secs;
      }
    });
    const daily = Array.from(perDay.values())
      .filter(x => x.date !== 'unknown')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(x => ({ ...x, free_min: round2(x.free_min), charged_min: round2(x.charged_min) }));

    // top numbers called
    const dest = new Map();
    parsed.forEach(p => {
      const k = String(p.c.destination_number || '').trim() || 'Unknown';
      if (!dest.has(k)) dest.set(k, { number: k, calls: 0, total_min: 0, free_min: 0, extra_min: 0, extra_amount: 0 });
      const d = dest.get(k);
      d.calls += 1; d.total_min += p.secs / 60;
      if (p.amt > 0) { d.extra_min += p.secs / 60; d.extra_amount += p.amt; } else { d.free_min += p.secs / 60; }
    });
    const destAll = Array.from(dest.values()).map(d => ({
      ...d, total_min: round2(d.total_min), free_min: round2(d.free_min), extra_min: round2(d.extra_min), extra_amount: round2(d.extra_amount),
    }));
    const top = (sorter) => destAll.slice().sort(sorter).slice(0, 10);
    const topNumbers = {
      by_calls: top((a, b) => b.calls - a.calls || b.total_min - a.total_min),
      by_time: top((a, b) => b.total_min - a.total_min),
      by_extra: top((a, b) => b.extra_amount - a.extra_amount || b.extra_min - a.extra_min).filter(d => d.extra_amount > 0),
    };

    // SMS and parking
    const premium = smsLogs.filter(s => /premium/i.test(s.sms_type || ''));
    const premiumCount = premium.reduce((n, s) => n + (Number(s.sms_count) || 1), 0);
    const premiumAmount = premium.reduce((s, x) => s + num(x.amount), 0);
    const normalSms = smsLogs.filter(s => !/premium/i.test(s.sms_type || '')).reduce((n, s) => n + (Number(s.sms_count) || 1), 0);
    const parkingAmount = num(r.mparking_total) || lines.filter(l => /parking/i.test(l.description || '')).reduce((s, l) => s + l.amount, 0);

    const plan = m.plan;
    const extra = m.extra;
    const delta = (cur, before) => (before === null || before === undefined ? null : round2(cur - before));

    const selected = {
      month: sel.monthKey,
      label: monthLabelOf(sel.monthKey),
      bill: {
        id: sel.pk,
        bill_number: sel.billNumber,
        period_from: sel.period.from,
        period_to: sel.period.to,
        due_date: iso(r.due_date),
        issue_date: iso(r.issue_date || r.bill_date),
        provider: r.telecom_provider || r.provider || (conn && conn.provider) || '',
        company: r.company_name || (conn && conn.company_name) || '',
        status: r.status || '',
      },
      kpis: {
        total: m.total,
        plan,
        extra,
        extra_pct: m.extra_pct,
        vat: round2(vat),
        extra_minutes: round2(chargedSecs / 60),
        premium_sms: premiumCount,
        premium_sms_amount: round2(premiumAmount),
        data_gb: usage ? num(usage.data_used_gb) : 0,
        deltas: prev ? {
          total: delta(m.total, prev.total), plan: delta(plan, prev.plan), extra: delta(extra, prev.extra),
          call_minutes: delta(m.call_minutes, prev.call_minutes), data_gb: delta(m.data_gb, prev.data_gb),
          premium_sms: delta(m.premium_sms, prev.premium_sms), prev_label: prev.label, prev_total: prev.total,
        } : null,
      },
      status: m.status,
      sources,
      lines,
      calls: {
        free_calls: freeCalls, free_min: round2(freeSecs / 60),
        charged_calls: chargedCalls, charged_min: round2(chargedSecs / 60), charged_amount: round2(chargedAmount),
        total_calls: freeCalls + chargedCalls, total_min: round2((freeSecs + chargedSecs) / 60),
        free_ran_out: freeRanOut,
      },
      daily,
      top_numbers: topNumbers,
      allowance: {
        local_minutes_used: usage ? num(usage.local_minutes_used) : round2((freeSecs + chargedSecs) / 60),
        local_minutes_limit: usage && usage.local_minutes_limit ? num(usage.local_minutes_limit) : null,
        intl_minutes_used: usage ? num(usage.intl_minutes_used) : 0,
        roaming_minutes_used: usage ? num(usage.roaming_minutes_used) : 0,
        data_used_gb: usage ? num(usage.data_used_gb) : 0,
        data_limit_gb: usage && usage.data_limit_gb ? num(usage.data_limit_gb) : null,
        data_unlimited: !!(usage && usage.data_unlimited),
        roaming_data_gb: usage ? num(usage.roaming_data_gb) : 0,
        premium_sms: premiumCount, premium_sms_amount: round2(premiumAmount),
        normal_sms: normalSms,
        parking_amount: round2(parkingAmount),
      },
    };

    res.status(200).json({
      number: String(req.query.number),
      key,
      connection: conn ? shapeConn(conn) : null,
      months,
      selected,
    });
  } catch (error) {
    console.error('Error building usage report:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

function shapeConn(c) {
  return {
    company: c.company_name,
    number: c.connection_number,
    type: c.connection_type,
    provider: c.provider,
    plan_name: c.plan_name,
    plan_type: c.plan_type || 'Recurring',
    monthly_plan_amount: num(c.monthly_plan_amount),
    employee: c.employee_name,
    status: c.status,
  };
}
