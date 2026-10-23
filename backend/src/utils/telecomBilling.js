const UNKNOWN = null;

const durationToSeconds = (value) => {
  if (Number.isInteger(value) && value >= 0) return value;
  const match = /^(\d+):(\d{2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return 0;
  return (hours * 3600) + (minutes * 60) + seconds;
};

const callDurationSeconds = (call = {}) => {
  const stored = Number(call.duration_seconds);
  return Number.isInteger(stored) && stored >= 0 ? stored : durationToSeconds(call.duration);
};

const sumCallSeconds = (calls = [], predicate = () => true) => (calls || []).reduce(
  (total, call) => total + (predicate(call) ? callDurationSeconds(call) : 0),
  0
);

const secondsToDisplayMinutes = (seconds, decimals = 2) => {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return null;
  return Number((value / 60).toFixed(decimals));
};

const moneyToFils = (value) => {
  if (value === null || value === undefined || value === '') return UNKNOWN;
  const cleaned = String(value)
    .replace(/[\s,]/g, '')
    .replace(/[\u2212\u2012\u2013\u2014]/g, '-')
    .replace(/[^0-9.+-]/g, '');
  if (!cleaned || !/[-+]?\d/.test(cleaned)) return UNKNOWN;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) : UNKNOWN;
};

const filsToMoney = (value) => value === UNKNOWN ? null : Number((value / 100).toFixed(2));

const abovePlanPercent = (excessExclVat, planExclVat) => {
  const excess = moneyToFils(excessExclVat);
  const plan = moneyToFils(planExclVat);
  if (excess === UNKNOWN || plan === UNKNOWN || plan <= 0) return null;
  return Number(((excess / plan) * 100).toFixed(2));
};

const firstAmount = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] !== undefined) {
      const fils = moneyToFils(match[1]);
      if (fils !== UNKNOWN) return fils;
    }
  }
  return UNKNOWN;
};

const lineAmount = (text, label) => firstAmount(text, [
  new RegExp(`${label}\\s*[:.]?\\s*(?:AED\\s*)?([+\\-\\u2212]?[\\d,]+(?:\\s*\\.\\s*\\d{1,2})?)`, 'i'),
]);

const extractVatTreatments = (text) => {
  const treatments = [];
  const table = /Total Charges\s+Charges Subject to VAT\s+VAT AMOUNT[^\n\r]*([\s\S]{0,1200}?)(?=\*All charges|PAGE\s+\d+|Bill breakdown)/i.exec(text);
  if (table) {
    table[1].split(/\r?\n/).forEach((line) => {
      const match = /^(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/.exec(line.trim());
      if (!match || /current month/i.test(match[1])) return;
      const total = moneyToFils(match[2]);
      const taxable = moneyToFils(match[3]);
      const vat = moneyToFils(match[4]);
      const label = match[1].trim();
      const treatment = /out[- ]of[- ]scope/i.test(line) ? 'out-of-scope'
        : /exempt/i.test(line) ? 'exempt'
          : /zero[- ]rated/i.test(line) ? 'zero-rated'
            : taxable > 0 ? 'standard-rated' : 'zero-rated-exempt-or-out-of-scope';
      treatments.push({
        category: label,
        amount: filsToMoney(total),
        taxable_amount: filsToMoney(taxable),
        vat_amount: filsToMoney(vat),
        treatment,
        vat_rate: taxable > 0 ? Number(((vat / taxable) * 100).toFixed(4)) : null,
      });
    });
  }
  return treatments;
};

const extractTelecomFinancials = (rawText) => {
  const text = String(rawText || '').replace(/\u00a0/g, ' ');
  const isDu = /Emirates Integrated Telecommunications|du\.ae\/billpayment/i.test(text);
  const currentVat = firstAmount(text, [
    /VAT on taxable services\s*-?\s*Current Period\s+([\d,]+(?:\.\d{1,2})?)/i,
    /VAT on Current Month Charges\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}\s+([\d,]+\.\d{2})/i,
    /current[- ]period VAT(?: amount)?\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
    /5% VAT\s+([\d,]+\.\d{2})/i,
  ]);
  let directExcl = firstAmount(text, [
    /VAT on Current Month Charges\s+([\d,]+\.\d{2})\s+[\d,]+\.\d{2}\s+[\d,]+\.\d{2}/i,
    /current[- ]period charges excluding VAT\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
    /current month charges excluding VAT\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
  ]);
  if (directExcl === UNKNOWN && isDu) {
    const nonTaxable = firstAmount(text, [/Sub-total of non-taxable services\s+([\d,]+\.\d{2})/i]);
    const taxable = firstAmount(text, [/Sub-total of taxable services\s+([\d,]+\.\d{2})/i]);
    if (nonTaxable !== UNKNOWN && taxable !== UNKNOWN) directExcl = nonTaxable + taxable;
  }
  let currentIncl = firstAmount(text, [
    /Current month charges\s*\(including VAT\)[\s\S]{0,100}?\n\s*([\d,]+\.\d{2})\s*(?:AED)?/i,
    /current[- ]period charges including VAT\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
    /Your bill for this month[\s\S]{0,120}?AED\s*([\d,]+\.\d{2})/i,
  ]);
  let currentExcl = directExcl;
  let exclSource = directExcl === UNKNOWN ? null : 'invoice';
  if (currentExcl === UNKNOWN && currentIncl !== UNKNOWN && currentVat !== UNKNOWN) {
    currentExcl = currentIncl - currentVat;
    exclSource = 'derived-from-invoice-total-and-vat';
  }
  if (currentIncl === UNKNOWN && currentExcl !== UNKNOWN && currentVat !== UNKNOWN) {
    currentIncl = currentExcl + currentVat;
  }

  let plan = lineAmount(text, '(?:Service Rentals?|Plan monthly fees|Monthly plan amount)');
  if (isDu) {
    const planBlocks = [];
    const block = /Plan monthly fees\s+([\d,]+\.\d{2})\s+Add-on fees\s+([\d,]+\.\d{2})\s+Usage & one-time fees\s+[\d,]+\.\d{2}/gi;
    let blockMatch;
    while ((blockMatch = block.exec(text))) {
      planBlocks.push(moneyToFils(blockMatch[1]) + moneyToFils(blockMatch[2]));
    }
    if (planBlocks.length) plan = planBlocks.reduce((sum, value) => sum + value, 0);
  }
  const usage = lineAmount(text, 'Usage Charges?');
  const oneTimeCharge = lineAmount(text, '(?:One-Time Charges?|One Time Charges?)');
  const addOns = lineAmount(text, '(?:Add-on fees?|Add-ons?)');
  const oneTimeParts = [oneTimeCharge, addOns].filter(v => v !== UNKNOWN);
  const oneTime = oneTimeParts.length ? oneTimeParts.reduce((sum, v) => sum + v, 0) : UNKNOWN;
  const otherCredits = lineAmount(text, 'Other Credits? & Charges?');
  const refunds = lineAmount(text, 'Refunds? & Adjustments?');
  const previous = lineAmount(text, 'Previous month bill');
  const payments = lineAmount(text, 'Payments received');
  const balance = lineAmount(text, 'Balance Carried Forward');
  const totalDue = firstAmount(text, [
    /Total Amount Due\s+([\d,]+(?:\s*\.\s*\d{1,2})?)/i,
    /amount due\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
  ]);
  const thirdParty = firstAmount(text, [
    /3rd party charges(?:\s+\d{7,})?\s+([\d,]+\.\d{2})/i,
    /third[- ]party charges\s*[:.-]?\s*(?:AED\s*)?([\d,]+\.\d{2})/i,
  ]);
  const account = /Account Number:\s*([\d .-]{6,25})/i.exec(text)
    || /Your account number\s+(\d{6,20})/i.exec(text)
    || /Account Number\s+Bill period[\s\S]{0,200}?\b(0?5\d{8})\b/i.exec(text);
  const invoice = /(?:Bill number|Invoice number)\s+([A-Z0-9/-]{5,35})/i.exec(text);

  const reconciliationFils = currentExcl !== UNKNOWN && currentIncl !== UNKNOWN && currentVat !== UNKNOWN
    ? currentExcl - (currentIncl - currentVat)
    : UNKNOWN;
  const status = currentExcl !== UNKNOWN && currentIncl !== UNKNOWN && currentVat !== UNKNOWN
    ? (Math.abs(reconciliationFils) <= 1 ? 'reconciled' : 'difference')
    : 'needs_review';

  const creditParts = [otherCredits, refunds].filter(v => v !== UNKNOWN);
  const creditsTotal = creditParts.length ? creditParts.reduce((sum, v) => sum + v, 0) : UNKNOWN;
  const values = {
    current_period_excl_vat: filsToMoney(currentExcl),
    current_period_vat: filsToMoney(currentVat),
    current_period_incl_vat: filsToMoney(currentIncl),
    plan_excl_vat: filsToMoney(plan),
    usage_charges: filsToMoney(usage),
    one_time_charges: filsToMoney(oneTime),
    third_party_charges: filsToMoney(thirdParty),
    credits_adjustments: filsToMoney(creditsTotal),
    previous_balance: filsToMoney(previous),
    payments: filsToMoney(payments),
    balance_carried_forward: filsToMoney(balance),
    total_amount_due: filsToMoney(totalDue),
  };

  return {
    ...values,
    account_number: account ? account[1].replace(/\D/g, '') : null,
    invoice_number: invoice ? invoice[1].trim() : null,
    vat_treatments: extractVatTreatments(text),
    reconciliation_status: status,
    reconciliation_difference: filsToMoney(reconciliationFils),
    current_period_excl_source: exclSource,
    calculation_status: currentExcl !== UNKNOWN && plan !== UNKNOWN ? 'ready' : 'needs_review',
  };
};

const valueInFils = (record, keys) => {
  for (const key of keys) {
    if (record && Object.prototype.hasOwnProperty.call(record, key)) {
      const value = moneyToFils(record[key]);
      if (value !== UNKNOWN) return value;
    }
  }
  return UNKNOWN;
};

const calculateTelecomBill = (record = {}) => {
  let excl = valueInFils(record, ['current_period_excl_vat']);
  const vat = valueInFils(record, ['current_period_vat', 'vat_current_period', 'vat_amount']);
  let incl = valueInFils(record, ['current_period_incl_vat']);
  const plan = valueInFils(record, ['plan_excl_vat', 'plan_rental']);

  if (excl === UNKNOWN && incl !== UNKNOWN && vat !== UNKNOWN) excl = incl - vat;
  if (incl === UNKNOWN && excl !== UNKNOWN && vat !== UNKNOWN) incl = excl + vat;

  const excess = excl !== UNKNOWN && plan !== UNKNOWN ? Math.max(0, excl - plan) : UNKNOWN;
  const difference = excl !== UNKNOWN && incl !== UNKNOWN && vat !== UNKNOWN ? excl - (incl - vat) : UNKNOWN;
  const needsReview = excl === UNKNOWN || incl === UNKNOWN || vat === UNKNOWN || plan === UNKNOWN;

  return {
    plan_excl_vat: filsToMoney(plan),
    bill_excl_vat: filsToMoney(excl),
    vat: filsToMoney(vat),
    bill_incl_vat: filsToMoney(incl),
    excess_excl_vat: filsToMoney(excess),
    is_excess: excess !== UNKNOWN ? excess > 1000 : false,
    calculation_status: needsReview ? 'needs_review' : 'ready',
    reconciliation_status: difference === UNKNOWN ? 'needs_review' : (Math.abs(difference) <= 1 ? 'reconciled' : 'difference'),
    reconciliation_difference: filsToMoney(difference),
  };
};

module.exports = {
  moneyToFils,
  filsToMoney,
  durationToSeconds,
  callDurationSeconds,
  sumCallSeconds,
  secondsToDisplayMinutes,
  abovePlanPercent,
  extractTelecomFinancials,
  calculateTelecomBill,
};
