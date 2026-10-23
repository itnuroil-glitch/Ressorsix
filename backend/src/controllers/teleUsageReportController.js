const db = require('../config/db');
const {
  calculateTelecomBill,
  callDurationSeconds,
  sumCallSeconds,
  secondsToDisplayMinutes,
  abovePlanPercent,
} = require('../utils/telecomBilling');
const { canonicalCallCategory, aggregateCallCategories } = require('../utils/telecomUsage');
const { createUsageReportPdf } = require('../utils/usageReportPdf');

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
const nullableNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const callGroup = (call) => {
  const category = canonicalCallCategory(call && call.category);
  if (category === 'Calls to Special Numbers') return 'special';
  if (/Roaming/.test(category)) return 'roaming';
  if (category === 'International Calls') return 'international';
  if (category === 'Calls to Mobile' || category === 'Calls to Telephone / Landline') return 'local';
  return 'unclassified';
};
const jsonArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; } }
  return [];
};
const iso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


// ---- charges printed on the bill PDF itself ("Usage charges" section) ----
// Lines look like:  Calls to Special Number 5 00:25:12 7.57 0.38  |  Premium SMS 28 - 9.28 0.46  |  mParking * 18 - 55.35 0.00
// Only used when the printed lines add up to the extra usage, so a mis-read PDF can never change the totals.
const fs = require('fs');
const path = require('path');
const pdfLinesCache = new Map();
const findBillPdf = (row, billNumber) => {
  const dir = path.join(__dirname, '../../Attachment');
  if (!fs.existsSync(dir)) return null;
  const base = path.basename(String(row.pdf_filename || ''));
  if (base && fs.existsSync(path.join(dir, base))) return path.join(dir, base);
  const bd = digits(billNumber);
  if (bd.length < 6) return null;
  const files = fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f) && f.includes(bd));
  if (!files.length) return null;
  files.sort((a, b) => fs.statSync(path.join(dir, b)).mtimeMs - fs.statSync(path.join(dir, a)).mtimeMs);
  return path.join(dir, files[0]);
};
const parseUsageSection = (text) => {
  const start = text.search(/Usage charges\s+[\d,]+\.\d{2}\s*AED/i);
  if (start < 0) return [];
  let body = text.slice(start);
  const end = body.search(/One-time charges\s+[\d,]+\.\d{2}\s*AED/i);
  if (end > 0) body = body.slice(0, end);
  const out = [];
  body.split(/\r?\n/).forEach(line => {
    const l = line.trim();
    if (/\b\d{9,}\b/.test(l.replace(/\d+\s*KB/i, ''))) return; // group headers carry the account number
    const m = /^(.+?)\s*\*?\s+(\d+)\s+(\d{2}:\d{2}:\d{2}|-)\s+([\d,]+\.\d{2})\s+[\d,]+\.\d{2}$/.exec(l);
    if (!m) return;
    const amount = parseFloat(m[4].replace(/,/g, ''));
    if (amount > 0.004) out.push({ name: m[1].replace(/\s*\*$/, '').trim(), amount: round2(amount), units: Number(m[2]), duration: m[3] === '-' ? '' : m[3] });
  });
  return out;
};
// du bills print one block per number: "Plan monthly fees 315.00 / Add-on fees 0.00 / Usage & one-time fees 188.36".
// The saved plan_rental of such bills is unreliable (it can hold last month's amount), so the printed blocks are used.
const duCache = new Map();
const getDuFees = async (row, billNumber) => {
  if (!/\bdu\b|emirates integrated/i.test(String(row.telecom_provider || ''))) return null;
  const key = String(billNumber);
  if (duCache.has(key)) return duCache.get(key);
  let out = null;
  try {
    const file = findBillPdf(row, billNumber);
    if (file) {
      const { PDFParse } = require('pdf-parse');
      const res = await new PDFParse({ data: fs.readFileSync(file) }).getText();
      const text = (res && res.text) || '';
      const re = /Plan monthly fees\s+([\d,]+\.\d{2})\s+Add-on fees\s+([\d,]+\.\d{2})\s+Usage & one-time fees\s+([\d,]+\.\d{2})/g;
      let m, plan = 0, addon = 0, usage = 0, n = 0;
      while ((m = re.exec(text))) { plan += parseFloat(m[1].replace(/,/g, '')); addon += parseFloat(m[2].replace(/,/g, '')); usage += parseFloat(m[3].replace(/,/g, '')); n++; }
      if (n) out = { plan: round2(plan + addon), usage: round2(usage), numbers: n };
    }
  } catch (e) { out = null; }
  if (out) duCache.set(key, out);
  return out;
};
const getPdfCharges = async (row, billNumber) => {
  const key = String(billNumber);
  if (pdfLinesCache.has(key)) return pdfLinesCache.get(key);
  let lines = [];
  try {
    const file = findBillPdf(row, billNumber);
    if (file) {
      const { PDFParse } = require('pdf-parse');
      const inst = new PDFParse({ data: fs.readFileSync(file) });
      const res = await inst.getText();
      lines = parseUsageSection((res && res.text) || '');
    }
  } catch (e) { lines = []; }
  if (lines.length) pdfLinesCache.set(key, lines);
  return lines;
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
// POST /api/telecom-bills/usage-report/pdf -> downloadable PDF for the report
// currently displayed in Tele Report.
// ---------------------------------------------------------------------------
exports.downloadUsageReportPdf = async (req, res) => {
  try {
    const report = req.body && req.body.report;
    if (!report || !report.selected) {
      return res.status(400).json({ message: 'A selected usage report is required.' });
    }
    const bytes = await createUsageReportPdf(report);
    const phone = digits(report.number || report.connection?.number) || 'number';
    const month = String(report.selected.month || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Tele_Report_${phone}_${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', bytes.length);
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error('Error generating usage report PDF:', error);
    return res.status(500).json({ message: 'Could not generate the PDF report.' });
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
    const callCols = await getCols('tbl_telecome_call_logs');
    const durationSecondsSelect = callCols.has('duration_seconds') ? 'duration_seconds' : 'NULL AS duration_seconds';
    const billingUnitsSelect = callCols.has('provider_billing_units') ? 'provider_billing_units' : 'NULL AS provider_billing_units';
    const roundingRuleSelect = callCols.has('billing_rounding_rule') ? 'billing_rounding_rule' : 'NULL AS billing_rounding_rule';
    const [itemsRes, callsRes, smsRes, usageRes] = await Promise.all([
      db.query(`SELECT * FROM tbl_telecome_bill_items WHERE ${itemFk} = ANY($1) ORDER BY item_id ASC`, [pks]).catch(() => ({ rows: [] })),
      db.query(
        `SELECT bill_number, call_date, call_time, destination_number, duration,
                ${durationSecondsSelect}, ${billingUnitsSelect}, ${roundingRuleSelect}, category, amount
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

    const NOT_USAGE = /previous|payment|balance|carried|brought|adjust/i; // balance brought forward / payments are not usage
    const sumAmt = (arr) => arr.reduce((t, x) => t + x.amount, 0);

    // One bill, analysed from the PDF-extracted data.
    //   Ground truth = the bill header: total, VAT and plan rental.
    //   Extra usage (excl. VAT) = total - VAT - plan.
    //   The extra is then explained by the most reliable breakdown that really adds up to it:
    //     1. the charge lines printed on the bill, when they add up to the extra
    //     2. otherwise the charged calls grouped by category (each call carries its own charge),
    //        plus an "Other charges" remainder for anything the call log does not show
    const analyseBill = (bl) => {
      const row = bl.row;
      const du = duByBill.get(bl.billNumber); // du prints the real plan per number; the saved plan can hold last month's amount
      const canonical = calculateTelecomBill(du ? { ...row, plan_excl_vat: du.plan, plan_rental: du.plan } : row);
      let total = canonical.bill_incl_vat;
      const vat = canonical.vat;
      const planRental = canonical.plan_excl_vat;
      const plan = du ? du.plan : planRental;
      const billExcl = canonical.bill_excl_vat;
      // The invoice totals are authoritative. Never replace them with a recomputed
      // sum merely because rounded detail lines differ.
      const extra = canonical.excess_excl_vat;
      const bItems = itemsByPk.get(String(bl.pk)) || [];
      const bCalls = callsByBill.get(bl.billNumber) || [];
      const bSms = smsByBill.get(bl.billNumber) || [];
      const bUsage = usageByBill.get(bl.billNumber) || null;
      const tol = Math.max(0.05, (extra || 0) * 0.005);

      const itemExtra = bItems
        .filter(i => ['CHARGE', 'PARKING'].includes(String(i.record_type || '').toUpperCase()) && !NOT_USAGE.test(i.category || ''))
        .map(i => ({ name: i.category, amount: round2(num(i.amount)) }))
        .filter(x => x.amount > 0.004 && !/^(total\s+)?usage\s+charges?$/i.test(String(x.name || '').trim())); // a lump total explains nothing

      const catMap = new Map();
      bCalls.forEach(c => {
        const amt = num(c.amount);
        if (amt > 0) catMap.set(c.category || 'Calls', (catMap.get(c.category || 'Calls') || 0) + amt);
      });
      const toList = (m) => Array.from(m.entries()).map(([name, amount]) => ({ name, amount: round2(amount) }));
      let callExtra = toList(catMap);
      // SMS charges join the breakdown only when they still fit inside the extra usage on the bill
      const smsMap = new Map(catMap);
      bSms.forEach(x => {
        const amt = num(x.amount);
        if (amt > 0) smsMap.set(x.sms_type || 'SMS', (smsMap.get(x.sms_type || 'SMS') || 0) + amt);
      });
      const withSms = toList(smsMap);
      if (sumAmt(withSms) <= extra + tol) callExtra = withSms;

      let sources = [];
      let method = 'none';
      const pdfLines = pdfByBill.get(bl.billNumber) || [];
      const storedComponents = jsonArray(row.charge_components)
        .map(component => ({
          name: component.label || component.category || 'Other charge',
          amount: round2(num(component.amount_excl_vat ?? component.amount)),
          units: nullableNum(component.unit_count),
          unit_type: component.unit_type || null,
          parent_subtotal: component.parent_subtotal || null,
        }))
        .filter(component => component.amount > 0.004);
      if (extra !== null && extra > tol && storedComponents.length) {
        sources = storedComponents;
        const componentTotal = round2(sumAmt(sources));
        const adjustment = round2(extra - componentTotal);
        if (Math.abs(adjustment) > tol) sources.push({
          name: adjustment < 0 ? 'Credits / adjustments' : 'Other invoice charges',
          amount: adjustment, units: null, unit_type: 'reconciliation', parent_subtotal: null,
        });
        method = 'invoice charge components';
      } else if (extra !== null && extra > tol && du) {
        sources = [{ name: `Usage & one-time fees (${du.numbers} number${du.numbers > 1 ? 's' : ''})`, amount: round2(extra) }];
        method = 'du bill subtotal';
      } else if (extra !== null && extra > tol) {
        if (pdfLines.length > 1 && Math.abs(sumAmt(pdfLines) - extra) <= tol) {
          sources = pdfLines.map(x => ({ name: x.name, amount: x.amount })); method = 'bill pdf';
        } else if (itemExtra.length && Math.abs(sumAmt(itemExtra) - extra) <= tol) {
          sources = itemExtra; method = 'bill lines';
        } else {
          const callsSum = sumAmt(callExtra);
          sources = callExtra.slice();
          method = 'call log';
          if (callsSum <= extra + tol) {
            const rest = round2(extra - callsSum);
            if (rest > tol) { sources.push({ name: '3rd party / other charges', amount: rest }); method = 'call log + other'; }
          } else {
            method = 'call log (more than the bill shows)';
          }
        }
      }
      sources.sort((x, y) => y.amount - x.amount);

      const premiumAmount = round2(sources.filter(x => /premium/i.test(x.name || '')).reduce((t, x) => t + x.amount, 0));
      const parkingAmount = round2(sources.filter(x => /parking/i.test(x.name || '')).reduce((t, x) => t + x.amount, 0));
      const premiumRows = bSms.filter(x => /premium/i.test(x.sms_type || ''));
      const pdfPremium = pdfLines.find(x => /premium/i.test(x.name));
      const componentPremium = storedComponents.find(x => /premium/i.test(x.name || '') && x.units !== null);
      const premiumCount = componentPremium ? componentPremium.units
        : pdfPremium && method === 'bill pdf' ? pdfPremium.units
          : premiumAmount > 0 ? premiumRows.reduce((n, x) => n + (Number(x.sms_count) || 1), 0) : 0;

      return { row, total, billExcl, vat, plan, extra, canonical, items: bItems, calls: bCalls, smsLogs: bSms, usage: bUsage, sources, method, premiumAmount, parkingAmount, premiumCount };
    };
    const duByBill = new Map();
    for (const bl of bills) duByBill.set(bl.billNumber, await getDuFees(bl.row, bl.billNumber));
    const pdfByBill = new Map();
    for (const bl of bills) pdfByBill.set(bl.billNumber, await getPdfCharges(bl.row, bl.billNumber));
    const analyses = bills.map(analyseBill);

    // ---- month-wise rows for every bill of this number ----
    const months = bills.map((bl, idx) => {
      const A = analyses[idx];
      const callSecs = sumCallSeconds(A.calls);
      return {
        key: bl.monthKey,
        label: monthLabelOf(bl.monthKey),
        bill_id: bl.pk,
        bill_number: bl.billNumber,
        total: A.total === null ? null : round2(A.total),
        bill_excl_vat: A.billExcl === null ? null : round2(A.billExcl),
        vat: A.vat === null ? null : round2(A.vat),
        plan: A.plan === null ? null : round2(A.plan),
        extra: A.extra === null ? null : round2(A.extra),
        extra_pct: abovePlanPercent(A.extra, A.plan),
        call_minutes: round2(callSecs / 60),
        calls: A.calls.length,
        data_gb: A.usage ? nullableNum(A.usage.data_used_gb) : null,
        premium_sms: A.premiumCount,
        status: A.canonical.calculation_status === 'needs_review' ? 'needs_review' : (A.extra > EXCESS_MARGIN_AED ? 'over' : 'within'),
      };
    });

    // ---- the selected month ----
    let sel = bills.find(bl => bl.monthKey === wantedMonth);
    if (!sel) sel = bills[bills.length - 1];
    const selIdx = bills.indexOf(sel);
    const m = months[selIdx];
    const prev = selIdx > 0 ? months[selIdx - 1] : null;
    const A = analyses[selIdx];
    const r = A.row;
    const calls = A.calls;
    const smsLogs = A.smsLogs;
    const usage = A.usage;
    const total = A.total;
    const vat = A.vat;
    const sources = A.sources;
    const chargeComponents = jsonArray(r.charge_components);
    const dataChargeComponents = chargeComponents.filter(component => String(component.unit_type || '').toLowerCase() === 'data');
    const invoiceDataCharge = dataChargeComponents.length
      ? round2(dataChargeComponents.reduce((sum, component) => sum + (nullableNum(component.amount_excl_vat ?? component.amount) || 0), 0))
      : null;

    // "Where the money went": plan + each extra source + VAT, so the lines add up to the bill total
    const lines = [
      { description: 'Plan — excluding VAT', type: 'SERVICE', part: 'Plan', amount: A.plan === null ? null : round2(A.plan) },
      ...sources.map(x => ({ description: x.name, type: 'CHARGE', part: 'Extra usage', amount: x.amount })),
      { description: 'VAT', type: 'VAT', part: 'VAT', amount: vat === null ? null : round2(vat) },
    ].filter(l => l.amount !== null && Math.abs(l.amount) > 0.004);
    const listedTotal = round2(lines.reduce((t, l) => t + l.amount, 0));
    const reconcile = {
      method: A.method,
      bill_total: total === null ? null : round2(total),
      lines_total: listedTotal,
      difference: total === null ? null : round2(total - listedTotal),
      matches: total !== null && Math.abs(total - listedTotal) <= Math.max(0.05, total * 0.002),
      plan_known: A.plan !== null,
      calculation_status: A.canonical.calculation_status,
    };

    // calls: free vs charged, per day
    const parsed = calls.map(c => ({
      c, ts: Date.parse(`${c.call_date} ${c.call_time || ''}`.trim()) || Date.parse(c.call_date) || 0,
      secs: callDurationSeconds(c), amt: num(c.amount),
    })).sort((a, b) => a.ts - b.ts);
    const perDay = new Map();
    let unchargedCalls = 0; let unchargedSecs = 0; let chargedCalls = 0; let chargedSecs = 0; let chargedAmount = 0;
    let firstChargedCall = null;
    parsed.forEach(p => {
      const d = new Date(p.ts);
      const dayKey = p.ts ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'unknown';
      if (!perDay.has(dayKey)) perDay.set(dayKey, { date: dayKey, day: p.ts ? d.getDate() : 0, uncharged_min: 0, charged_call_min: 0 });
      const slot = perDay.get(dayKey);
      if (p.amt > 0) {
        slot.charged_call_min += p.secs / 60; chargedCalls += 1; chargedSecs += p.secs; chargedAmount += p.amt;
        if (!firstChargedCall) firstChargedCall = { date: dayKey, time: p.c.call_time || '' };
      } else {
        slot.uncharged_min += p.secs / 60; unchargedCalls += 1; unchargedSecs += p.secs;
      }
    });
    const daily = Array.from(perDay.values())
      .filter(x => x.date !== 'unknown')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(x => ({ ...x, uncharged_min: round2(x.uncharged_min), charged_call_min: round2(x.charged_call_min) }));

    // top numbers called
    const dest = new Map();
    parsed.forEach(p => {
      const k = String(p.c.destination_number || '').trim() || 'Unknown';
      if (!dest.has(k)) dest.set(k, { number: k, calls: 0, total_min: 0, uncharged_min: 0, charged_call_min: 0, charged_amount: 0 });
      const d = dest.get(k);
      d.calls += 1; d.total_min += p.secs / 60;
      if (p.amt > 0) { d.charged_call_min += p.secs / 60; d.charged_amount += p.amt; } else { d.uncharged_min += p.secs / 60; }
    });
    const destAll = Array.from(dest.values()).map(d => ({
      ...d,
      total_min: round2(d.total_min),
      uncharged_min: round2(d.uncharged_min),
      charged_call_min: round2(d.charged_call_min),
      charged_amount: round2(d.charged_amount),
    }));
    const top = (sorter) => destAll.slice().sort(sorter).slice(0, 10);
    const topNumbers = {
      by_calls: top((a, b) => b.calls - a.calls || b.total_min - a.total_min),
      by_time: top((a, b) => b.total_min - a.total_min),
      by_extra: top((a, b) => b.charged_amount - a.charged_amount || b.charged_call_min - a.charged_call_min).filter(d => d.charged_amount > 0),
    };

    // SMS and parking come from the same reconciled breakdown, so they never exceed the bill
    const premiumCount = A.premiumCount;
    const premiumAmount = A.premiumAmount;
    const normalSms = smsLogs.filter(x => !/premium/i.test(x.sms_type || '')).reduce((n, x) => n + (Number(x.sms_count) || 1), 0);
    const parkingAmount = A.parkingAmount;

    const plan = m.plan;
    const extra = m.extra;
    const actualTotalSeconds = unchargedSecs + chargedSecs;
    const actualLocalSeconds = sumCallSeconds(calls, c => callGroup(c) === 'local');
    const localAllowanceMinutes = nullableNum(usage && usage.local_minutes_limit) ?? nullableNum(conn && conn.local_minutes);
    const eligibleCategories = jsonArray(r.allowance_eligible_categories);
    const allowanceCategoriesVerified = r.allowance_categories_verified === true && eligibleCategories.length > 0;
    const eligibleLocalSeconds = allowanceCategoriesVerified
      ? sumCallSeconds(calls, c => eligibleCategories.includes(c.category) && callGroup(c) === 'local')
      : null;
    const durationAboveAllowanceSeconds = localAllowanceMinutes === null || eligibleLocalSeconds === null
      ? null
      : Math.max(0, eligibleLocalSeconds - Math.round(localAllowanceMinutes * 60));
    const billingUnits = calls.some(c => nullableNum(c.provider_billing_units) !== null)
      ? calls.reduce((sum, c) => sum + (nullableNum(c.provider_billing_units) || 0), 0)
      : null;
    const billingRoundingRules = Array.from(new Set(calls.map(c => c.billing_rounding_rule).filter(Boolean)));
    const delta = (cur, before) => (cur === null || cur === undefined || before === null || before === undefined ? null : round2(cur - before));

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
        numbers: String(r.mobile_number || '').split(/[,|\n]+/).map(x => x.trim()).filter(Boolean),
        multi_number: String(r.mobile_number || '').split(/[,|\n]+/).map(x => x.trim()).filter(Boolean).length > 1,
      },
      kpis: {
        total: m.total,
        bill_excl_vat: m.bill_excl_vat,
        bill_incl_vat: m.total,
        plan,
        extra,
        extra_pct: m.extra_pct,
        vat: m.vat,
        duration_of_calls_with_charges: secondsToDisplayMinutes(chargedSecs),
        premium_sms: premiumCount,
        premium_sms_amount: round2(premiumAmount),
        data_gb: usage ? nullableNum(usage.data_used_gb) : null,
        data_charge_excl_vat: invoiceDataCharge,
        deltas: prev ? {
          total: delta(m.total, prev.total), plan: delta(plan, prev.plan), extra: delta(extra, prev.extra),
          call_minutes: delta(m.call_minutes, prev.call_minutes), data_gb: delta(m.data_gb, prev.data_gb),
          premium_sms: delta(m.premium_sms, prev.premium_sms), prev_label: prev.label, prev_total: prev.total,
        } : null,
      },
      status: m.status,
      reconcile,
      sources,
      lines,
      calls: {
        actual_total_seconds: actualTotalSeconds,
        actual_total_minutes: secondsToDisplayMinutes(actualTotalSeconds),
        actual_local_seconds: actualLocalSeconds,
        actual_local_minutes: secondsToDisplayMinutes(actualLocalSeconds),
        uncharged_calls: unchargedCalls,
        uncharged_seconds: unchargedSecs,
        uncharged_minutes: secondsToDisplayMinutes(unchargedSecs),
        calls_with_charges: chargedCalls,
        duration_of_calls_with_charges_seconds: chargedSecs,
        duration_of_calls_with_charges_minutes: secondsToDisplayMinutes(chargedSecs),
        charged_amount: round2(chargedAmount),
        total_calls: unchargedCalls + chargedCalls,
        first_call_with_charge: firstChargedCall,
        provider_reported_minutes: usage ? {
          local: nullableNum(usage.local_minutes_used),
          international: nullableNum(usage.intl_minutes_used),
          roaming: nullableNum(usage.roaming_minutes_used),
        } : null,
        provider_billing_units: billingUnits,
        billing_rounding_rules: billingRoundingRules,
        applicable_local_allowance_minutes: localAllowanceMinutes,
        duration_above_allowance_seconds: durationAboveAllowanceSeconds,
        duration_above_allowance_minutes: durationAboveAllowanceSeconds === null ? null : secondsToDisplayMinutes(durationAboveAllowanceSeconds),
        duration_above_allowance_verified_chargeable: false,
        allowance_categories_verified: allowanceCategoriesVerified,
        allowance_eligible_categories: eligibleCategories,
        category_aggregates: aggregateCallCategories(calls),
        category_reconciliation: jsonArray(r.call_category_reconciliation),
      },
      daily,
      top_numbers: topNumbers,
      allowance: {
        actual_local_minutes: secondsToDisplayMinutes(actualLocalSeconds),
        provider_reported_local_minutes: usage ? nullableNum(usage.local_minutes_used) : null,
        local_minutes_limit: localAllowanceMinutes,
        intl_minutes_used: usage ? nullableNum(usage.intl_minutes_used) : null,
        roaming_minutes_used: usage ? nullableNum(usage.roaming_minutes_used) : null,
        data_used_gb: usage ? nullableNum(usage.data_used_gb) : null,
        data_limit_gb: usage ? nullableNum(usage.data_limit_gb) : null,
        data_difference_gb: usage && nullableNum(usage.data_used_gb) !== null && nullableNum(usage.data_limit_gb) !== null
          ? round2(nullableNum(usage.data_used_gb) - nullableNum(usage.data_limit_gb))
          : null,
        invoice_data_charge_excl_vat: invoiceDataCharge,
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
