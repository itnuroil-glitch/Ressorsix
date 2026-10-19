// Reads plan allowances and usage totals printed in Etisalat and du bill PDFs.
//   Etisalat: "TOTAL USAGE SUMMARY" row (local / international / roaming minutes, data GB, SMS)
//             and the plan name ("... with 7.5GB Data ...") for the data allowance.
//   du:       "A closer look at your mobile plans" - per number: Flexi Voice <allowance> ... <used>Minutes, Roaming Data ...
const db = require('../config/db');

const toNum = (v) => {
  const n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};
const digits = (v) => String(v || '').replace(/\D/g, '');

function extractUsageSummaries(rawText, defaults = {}) {
  const text = String(rawText || '');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out = [];

  // ---- Etisalat: total usage summary row -----------------------------------------------------
  const hi = lines.findIndex(l => /LOCAL CALLS\s+INTERNATIONAL CALLS\s+ROAMING CALLS\s+LOCAL DATA\s+ROAMING DATA\s+SMS/i.test(l));
  if (hi >= 0) {
    const nums = (lines[hi + 1] || '').match(/[\d.]+/g) || [];
    if (nums.length >= 6) {
      const acc = text.match(/Account Number:\s*(\d{6,12})/i);
      const dataAllow = text.match(/with\s+([\d.]+)\s*GB\s+Data/i);
      out.push({
        provider: 'Etisalat',
        mobile_number: (acc && acc[1]) || digits(defaults.mobile) || '',
        local_minutes_used: toNum(nums[0]),
        intl_minutes_used: toNum(nums[1]),
        roaming_minutes_used: toNum(nums[2]),
        data_used_gb: toNum(nums[3]),
        roaming_data_gb: toNum(nums[4]),
        sms_used: toNum(nums[5]),
        local_minutes_limit: null,
        data_limit_gb: dataAllow ? toNum(dataAllow[1]) : null,
        data_unlimited: false,
      });
    }
  }

  // ---- Etisalat landline / internet: INTERNET | CALLS TO LANDLINE | CALLS TO MOBILE | INTERNATIONAL CALLS ----------
  // Columns that print UNLIMITED come first; the remaining columns print a number (MIN USED / GB USED).
  const vi = lines.findIndex(l => /INTERNET\s+CALLS TO LANDLINE\s+CALLS TO MOBILE\s+INTERNATIONAL CALLS/i.test(l));
  if (vi >= 0 && out.length === 0) {
    const block = lines.slice(vi + 1, vi + 5);
    const numLine = block.find(l => /^[\d.,]+(\s+[\d.,]+)*$/.test(l)) || '';
    const nums = numLine.match(/[\d.,]+/g) || [];
    const unlimitedCount = ((block.find(l => /UNLIMITED/i.test(l)) || '').match(/UNLIMITED/gi) || []).length;
    const cols = ['internet', 'landline', 'mobile', 'intl'];
    const val = {};
    let ni = 0;
    cols.forEach((c, idx) => { val[c] = idx < unlimitedCount ? 'unlimited' : (nums[ni] !== undefined ? toNum(nums[ni++]) : null); });
    const acc = text.match(/Account Number:\s*([\d\- ]{6,14})/i);
    out.push({
      provider: 'Etisalat',
      mobile_number: digits((acc && acc[1]) || defaults.mobile),
      local_minutes_used: typeof val.mobile === 'number' ? val.mobile : null,
      intl_minutes_used: typeof val.intl === 'number' ? val.intl : null,
      roaming_minutes_used: null,
      data_used_gb: typeof val.internet === 'number' ? val.internet : null,
      roaming_data_gb: null,
      sms_used: null,
      local_minutes_limit: null,
      data_limit_gb: null,
      data_unlimited: val.internet === 'unlimited',
    });
  }

  // ---- du: per-number plan block --------------------------------------------------------------
  const start = lines.findIndex(l => /A closer look at your mobile plans/i.test(l));
  if (start >= 0) {
    const numRe = /^0\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;
    let cur = null;
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^Fee Total|^Sub-total|^Your benefits and usage/i.test(l)) break;
      if (numRe.test(l)) {
        cur = {
          provider: 'du', mobile_number: digits(l),
          local_minutes_used: null, intl_minutes_used: null, roaming_minutes_used: null,
          data_used_gb: null, roaming_data_gb: null, sms_used: null,
          local_minutes_limit: null, data_limit_gb: null, data_unlimited: false,
        };
        out.push(cur);
        continue;
      }
      if (!cur) continue;
      let m;
      if ((m = /^Flexi Voice\s+(\d+).*?([\d.,]+)\s*Minutes/i.exec(l))) {
        cur.local_minutes_limit = toNum(m[1]);
        cur.local_minutes_used = toNum(m[2]);
      } else if (/^National Data\s+Unlimited/i.test(l)) {
        cur.data_unlimited = true;
      } else if ((m = /^National Data\s+([\d.]+)\s*GB.*?([\d.,]+)\s*GB\s*$/i.exec(l))) {
        cur.data_limit_gb = toNum(m[1]);
        cur.data_used_gb = toNum(m[2]);
      } else if ((m = /^Roaming Data\s+([\d.]+)\s*GB.*?([\d.,]+)\s*GB\s*$/i.exec(l))) {
        cur.roaming_data_gb = toNum(m[2]);
      }
    }
  }
  return out;
}

async function ensureUsageSummaryTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tbl_telecome_usage_summary (
      id SERIAL PRIMARY KEY,
      bill_number VARCHAR(100) NOT NULL,
      mobile_number VARCHAR(50) NOT NULL,
      provider VARCHAR(50),
      local_minutes_used NUMERIC(12, 2),
      intl_minutes_used NUMERIC(12, 2),
      roaming_minutes_used NUMERIC(12, 2),
      data_used_gb NUMERIC(12, 2),
      roaming_data_gb NUMERIC(12, 2),
      sms_used INTEGER,
      local_minutes_limit NUMERIC(12, 2),
      data_limit_gb NUMERIC(12, 2),
      data_unlimited BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Replaces any earlier summary saved for the same bill number + mobile number
async function saveUsageSummaries(billNumber, summaries) {
  if (!billNumber || !summaries || summaries.length === 0) return 0;
  await ensureUsageSummaryTable();
  let saved = 0;
  for (const s of summaries) {
    if (!s.mobile_number) continue;
    await db.query(`DELETE FROM tbl_telecome_usage_summary WHERE bill_number = $1 AND mobile_number = $2`, [billNumber, s.mobile_number]);
    await db.query(
      `INSERT INTO tbl_telecome_usage_summary
        (bill_number, mobile_number, provider, local_minutes_used, intl_minutes_used, roaming_minutes_used,
         data_used_gb, roaming_data_gb, sms_used, local_minutes_limit, data_limit_gb, data_unlimited)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [billNumber, s.mobile_number, s.provider || null, s.local_minutes_used, s.intl_minutes_used, s.roaming_minutes_used,
        s.data_used_gb, s.roaming_data_gb, s.sms_used, s.local_minutes_limit, s.data_limit_gb, !!s.data_unlimited]
    );
    saved += 1;
  }
  return saved;
}

module.exports = { extractUsageSummaries, ensureUsageSummaryTable, saveUsageSummaries };
