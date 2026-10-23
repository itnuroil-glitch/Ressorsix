const { durationToSeconds, callDurationSeconds } = require('./telecomBilling');

const CALL_CATEGORIES = Object.freeze([
  'Calls to Mobile',
  'Calls to Telephone / Landline',
  'Calls to Special Numbers',
  'International Calls',
  'Incoming Roaming Calls',
  'Outgoing Roaming Calls',
  'Unclassified',
]);

const roundMoney = value => Number((Number(value || 0) + Number.EPSILON).toFixed(2));
const cleanLine = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const canonicalCallCategory = (value) => {
  const text = cleanLine(value).toLowerCase();
  if (/incoming\s+roaming/.test(text)) return 'Incoming Roaming Calls';
  if (/outgoing\s+roaming/.test(text)) return 'Outgoing Roaming Calls';
  if (/special/.test(text)) return 'Calls to Special Numbers';
  if (/telephone|landline|fixed\s*line/.test(text)) return 'Calls to Telephone / Landline';
  if (/calls?\s+to\s+mobile|mobile\s+calls?/.test(text)) return 'Calls to Mobile';
  if (/international/.test(text)) return 'International Calls';
  return 'Unclassified';
};

// A destination prefix is deliberately not used here. The invoice section is the
// authoritative category; ambiguous provider headings stay reviewable.
const providerKey = value => /\bdu\b|emirates integrated/i.test(String(value || '')) ? 'du'
  : /etisalat|e&/i.test(String(value || '')) ? 'etisalat' : 'generic';

const categoryHeading = (line, provider = '') => {
  const text = cleanLine(line);
  if (/^incoming\s+roaming\s+calls?\b/i.test(text)) return 'Incoming Roaming Calls';
  if (/^outgoing\s+roaming\s+calls?\b/i.test(text)) return 'Outgoing Roaming Calls';
  if (/^calls?\s+to\s+special\s+numbers?\b/i.test(text)) return 'Calls to Special Numbers';
  if (/^calls?\s+to\s+(?:telephone|landline)\b/i.test(text)) return 'Calls to Telephone / Landline';
  if (/^calls?\s+to\s+mobile\b/i.test(text)) return 'Calls to Mobile';
  if (/^international\s+calls?(?:\s+and\s+usages?)?\b/i.test(text)) return 'International Calls';
  // du's "National calls" contains both mobile and fixed-line destinations, so
  // it cannot be split further without guessing. Other providers also remain
  // reviewable unless their section explicitly names mobile or landline.
  if (/^national\s+calls?\b/i.test(text) && ['du', 'generic', 'etisalat'].includes(providerKey(provider))) return 'Unclassified';
  return null;
};

const isRepeatedPageFurniture = line => (
  /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)
  || /^page\s+\d+\s+of\s+\d+/i.test(line)
  || /^date\s+(?:uae\s+)?time\s+to\b/i.test(line)
  || /^date\s+time\s+number\b/i.test(line)
  || /^usage\s*&\s*services\s+details$/i.test(line)
  || /^account\s+number:/i.test(line)
);

const parseCallRows = (text, options = {}) => {
  const lines = String(text || '').split(/\r?\n/);
  const rows = [];
  let activeCategory = null;
  let activeSection = null;
  let activeRecordType = 'unknown';
  let activeSourceNumber = options.sourceNumber || '';

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    const usageFrom = /^usage\s+from\s*:\s*(\d{7,15})$/i.exec(line);
    const standaloneNumber = /^(0[2-9](?:\s*\d){7,9})$/.exec(line);
    if (usageFrom || standaloneNumber) {
      activeSourceNumber = (usageFrom ? usageFrom[1] : standaloneNumber[1]).replace(/\s/g, '');
      continue;
    }

    const heading = categoryHeading(line, options.provider);
    if (heading) {
      activeCategory = heading;
      activeSection = line.replace(/\s+\d{2}:\d{2}:\d{2}\s+[\d,.]+\s*$/, '').trim();
      activeRecordType = 'call';
      continue;
    }
    if (/^(?:sms|text messages?|mobile data|data usage|mparking)\b/i.test(line)) {
      activeCategory = null;
      activeSection = line;
      activeRecordType = 'non_call';
      continue;
    }
    // Page furniture must not reset the section. This preserves category state
    // when a detailed table continues on the next page without repeating its title.
    if (isRepeatedPageFurniture(line)) continue;

    if (activeRecordType === 'non_call') continue;
    const match = /^(\d{2}\/\d{2}|\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)\s+(\d{2}:\d{2}(?::\d{2})?)\s+[ÌI]?([+\d]{7,20})[ÍI]?(?:\s+.*?)?\s+(\d{2}:\d{2}:\d{2})\s+([\d,]+(?:\.\d{1,4})?)$/.exec(line);
    if (!match) continue;

    let callDate = match[1];
    if (callDate.includes('/') && options.periodTo) {
      const [day, month] = callDate.split('/').map(Number);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthNames[month - 1]) callDate = `${String(day).padStart(2, '0')} ${monthNames[month - 1]} ${String(options.periodTo).slice(0, 4)}`;
    }
    rows.push({
      bill_number: options.billNumber || '',
      source_number: activeSourceNumber,
      call_date: callDate,
      call_time: match[2],
      destination_number: match[3],
      duration: match[4],
      duration_seconds: durationToSeconds(match[4]),
      category: activeCategory || 'Unclassified',
      category_source: activeCategory ? 'invoice_section' : 'unclassified',
      source_section: activeSection || null,
      unit_type: 'calls',
      unit_count: 1,
      amount: Number(String(match[5]).replace(/,/g, '')) || 0,
    });
  }
  return rows;
};

const parseCategorySummaries = (text) => {
  const summaries = [];
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = cleanLine(raw);
    const match = /^(Calls?\s+to\s+(?:Mobile|Telephone|Landline|Special\s+Numbers?)|International\s+Calls?|Incoming\s+Roaming\s+Calls?|Outgoing\s+Roaming\s+Calls?)\s*\*?\s+(\d+)\s+(\d{2}:\d{2}:\d{2}|-)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i.exec(line);
    if (!match) return;
    summaries.push({
      category: canonicalCallCategory(match[1]),
      call_count: Number(match[2]),
      total_duration_seconds: match[3] === '-' ? null : durationToSeconds(match[3]),
      amount_excl_vat: roundMoney(String(match[4]).replace(/,/g, '')),
      vat_amount: roundMoney(String(match[5]).replace(/,/g, '')),
      unit_type: 'calls',
      source: 'invoice_category_summary',
    });
  });
  const grouped = new Map();
  summaries.forEach(summary => {
    const current = grouped.get(summary.category);
    if (!current) { grouped.set(summary.category, { ...summary }); return; }
    current.call_count += summary.call_count;
    current.total_duration_seconds = current.total_duration_seconds === null || summary.total_duration_seconds === null
      ? null : current.total_duration_seconds + summary.total_duration_seconds;
    current.amount_excl_vat = roundMoney(current.amount_excl_vat + summary.amount_excl_vat);
    current.vat_amount = roundMoney(current.vat_amount + summary.vat_amount);
  });
  return Array.from(grouped.values());
};

const parseSmsRows = (text, options = {}) => {
  const rows = [];
  let smsType = null;
  let subHeading = null;
  let activeSourceNumber = options.sourceNumber || '';
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (!line) continue;
    const usageFrom = /^usage\s+from\s*:\s*(\d{7,15})$/i.exec(line);
    const standaloneNumber = /^(0[2-9](?:\s*\d){7,9})$/.exec(line);
    if (usageFrom || standaloneNumber) {
      activeSourceNumber = (usageFrom ? usageFrom[1] : standaloneNumber[1]).replace(/\s/g, '');
      continue;
    }
    if (/^premium\s+sms\b/i.test(line)) { smsType = 'Premium SMS'; subHeading = 'Premium SMS'; continue; }
    if (/^mparking\b/i.test(line)) { smsType = 'Premium SMS'; subHeading = 'mParking'; continue; }
    if (/^(?:national|local)\s+sms\b/i.test(line)) { smsType = 'National SMS'; subHeading = 'National SMS'; continue; }
    if (/^international\s+sms\b/i.test(line)) { smsType = 'International SMS'; subHeading = 'International SMS'; continue; }
    if (/^roaming\s+sms\b/i.test(line)) { smsType = 'Roaming SMS'; subHeading = 'Roaming SMS'; continue; }
    if (categoryHeading(line) || /^(?:mobile data|one[- ]time charges?|other credits?|refunds?)\b/i.test(line)) {
      smsType = null; subHeading = null; continue;
    }
    if (!smsType || /\d{2}:\d{2}:\d{2}\s+[\d,]+\.\d{2}$/.test(line)) continue;
    const match = /^(\d{2}\/\d{2}|\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)\s+(\d{2}:\d{2}(?::\d{2})?)\s+[ÌI]?(.+?)[ÍI]?\s+([\d,]+(?:\.\d{1,4})?)$/.exec(line);
    if (!match) continue;
    rows.push({
      bill_number: options.billNumber || '', source_number: activeSourceNumber,
      call_date: match[1], call_time: match[2], destination_number: cleanLine(match[3]).replace(/^[ÌI]|[ÍI]$/g, ''),
      duration: '00:00:00', duration_seconds: 0, category: smsType, sub_heading: subHeading || smsType,
      unit_type: subHeading === 'mParking' ? 'service' : 'messages', unit_count: 1,
      amount: Number(String(match[4]).replace(/,/g, '')) || 0,
    });
  }
  return rows;
};

const aggregateCallCategories = (rows = []) => CALL_CATEGORIES.map(category => {
  const matching = rows.filter(row => canonicalCallCategory(row.category) === category);
  return {
    category,
    call_count: matching.length,
    total_duration_seconds: matching.reduce((sum, row) => sum + callDurationSeconds(row), 0),
    amount_excl_vat: roundMoney(matching.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
    vat_amount: null,
    unit_type: 'calls',
    source: 'detail_rows',
  };
}).filter(row => row.call_count > 0);

const reconcileCategorySummaries = (details = [], summaries = []) => {
  const detailAgg = aggregateCallCategories(details);
  const detailMap = new Map(detailAgg.map(row => [row.category, row]));
  const summaryMap = new Map(summaries.map(row => [row.category, row]));
  const categories = new Set([...detailMap.keys(), ...summaryMap.keys()]);
  return Array.from(categories).map(category => {
    const detail = detailMap.get(category) || null;
    const summary = summaryMap.get(category) || null;
    const mismatches = [];
    if (!detail) mismatches.push('detail_missing');
    if (!summary) mismatches.push('summary_missing');
    if (detail && summary) {
      if (detail.call_count !== summary.call_count) mismatches.push('call_count');
      if (summary.total_duration_seconds !== null && detail.total_duration_seconds !== summary.total_duration_seconds) mismatches.push('duration_seconds');
      if (Math.abs(detail.amount_excl_vat - summary.amount_excl_vat) > 0.01) mismatches.push('amount_excl_vat');
    }
    return { category, status: mismatches.length ? 'mismatch' : 'matched', mismatches, detail, summary };
  });
};

const parseUsageComponents = (text) => {
  const lines = String(text || '').split(/\r?\n/).map(cleanLine);
  const components = [];
  let inUsage = false;
  for (const line of lines) {
    if (/^usage\s+charges?\s+[\d,]+\.\d{2}\s+AED$/i.test(line)) { inUsage = true; continue; }
    if (inUsage && /^(?:one[- ]time\s+charges?|other\s+credits?|refunds?\s*&\s*adjustments?)\b/i.test(line)) break;
    if (!inUsage || /\b\d{9,}\b/.test(line.replace(/\d+\s*KB/i, ''))) continue;
    const match = /^(.+?)\s*\*?\s+(\d+(?:\.\d+)?)\s+(\d{2}:\d{2}:\d{2}|-|KB)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i.exec(line);
    if (!match) continue;
    const label = match[1].replace(/\s*\*$/, '').trim();
    components.push({
      label,
      category: categoryHeading(label) || label,
      unit_count: Number(match[2]),
      unit_type: /sms/i.test(label) ? 'messages' : /mparking/i.test(label) ? 'service' : /data/i.test(label) ? 'data' : categoryHeading(label) ? 'calls' : 'units',
      total_duration_seconds: match[3] === '-' || /^kb$/i.test(match[3]) ? null : durationToSeconds(match[3]),
      amount_excl_vat: roundMoney(String(match[4]).replace(/,/g, '')),
      vat_amount: roundMoney(String(match[5]).replace(/,/g, '')),
      parent_subtotal: 'Usage charges',
      source: 'invoice_usage_summary',
    });
  }

  const compact = cleanLine(text);
  for (let index = 0; index < lines.length; index += 1) {
    if (!/-\s*One-Time\s*-\s*AED/i.test(lines[index])) continue;
    const candidate = cleanLine(`${lines[index - 1] || ''} ${lines[index]} ${lines[index + 1] || ''}`);
    const addOn = /^(.+?)\s*-\s*One-Time\s*-\s*AED\s*([\d,]+(?:\.\d{1,2})?)\s*\/\s*Month\*?$/i.exec(candidate);
    if (!addOn) continue;
    components.push({
      label: cleanLine(addOn[1]),
      category: 'Add-on / package',
      unit_count: 1,
      unit_type: 'package',
      total_duration_seconds: null,
      amount_excl_vat: roundMoney(String(addOn[2]).replace(/,/g, '')),
      vat_amount: null,
      parent_subtotal: 'One-time charges',
      source: 'invoice_charge_detail',
    });
  }

  // du prints the component name, its quantity/usage, then the amount. Aggregate
  // the repeated per-number blocks while retaining the provider's actual labels.
  const duRegex = /SMS\s+(\d+)\s+text messages\s+([\d,]+\.\d{2})\s+International calls\s+\d+\s+minutes?\s+\d+\s+seconds?\s+([\d,]+\.\d{2})/gi;
  let du;
  while ((du = duRegex.exec(compact))) {
    components.push({ label: 'SMS', category: 'SMS', unit_count: Number(du[1]), unit_type: 'messages', total_duration_seconds: null, amount_excl_vat: roundMoney(String(du[2]).replace(/,/g, '')), vat_amount: null, parent_subtotal: 'Usage & one-time fees', source: 'invoice_charge_detail' });
    components.push({ label: 'International calls', category: 'International Calls', unit_count: null, unit_type: 'calls', total_duration_seconds: null, amount_excl_vat: roundMoney(String(du[3]).replace(/,/g, '')), vat_amount: null, parent_subtotal: 'Usage & one-time fees', source: 'invoice_charge_detail' });
  }
  return components;
};

const extractTelecomUsage = (text, options = {}) => {
  const callLogs = parseCallRows(text, options);
  const categorySummaries = parseCategorySummaries(text);
  return {
    call_logs: callLogs,
    sms_logs: parseSmsRows(text, options),
    call_category_summaries: categorySummaries,
    call_category_aggregates: aggregateCallCategories(callLogs),
    call_category_reconciliation: reconcileCategorySummaries(callLogs, categorySummaries),
    charge_components: parseUsageComponents(text),
  };
};

module.exports = {
  CALL_CATEGORIES,
  canonicalCallCategory,
  categoryHeading,
  parseCallRows,
  parseCategorySummaries,
  parseSmsRows,
  aggregateCallCategories,
  reconcileCategorySummaries,
  parseUsageComponents,
  extractTelecomUsage,
};
