export const EXCESS_MARGIN_FILS = 1000;

export const durationToSeconds = (value) => {
  if (Number.isInteger(value) && value >= 0) return value;
  const match = /^(\d+):(\d{2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return 0;
  return (hours * 3600) + (minutes * 60) + seconds;
};

export const callDurationSeconds = (call = {}) => {
  const stored = Number(call.duration_seconds);
  return Number.isInteger(stored) && stored >= 0 ? stored : durationToSeconds(call.duration);
};

export const secondsToDisplayMinutes = (seconds, decimals = 2) => {
  const value = Number(seconds);
  return Number.isFinite(value) ? Number((value / 60).toFixed(decimals)) : null;
};

export const toFils = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(number) ? Math.round(number * 100) : null;
};

export const fromFils = (value) => value === null ? null : Number((value / 100).toFixed(2));

const pickFils = (record, keys) => {
  for (const key of keys) {
    if (record && Object.prototype.hasOwnProperty.call(record, key)) {
      const value = toFils(record[key]);
      if (value !== null) return value;
    }
  }
  return null;
};

export const getTelecomBillCalculation = (bill = {}) => {
  const server = bill.calculation || {};
  const hasServerCalculation = bill.calculation && Object.keys(server).length > 0;
  let billExcl = pickFils(server, ['bill_excl_vat']);
  let vat = pickFils(server, ['vat']);
  let billIncl = pickFils(server, ['bill_incl_vat']);
  let plan = pickFils(server, ['plan_excl_vat']);

  if (!hasServerCalculation) {
    if (billExcl === null) billExcl = pickFils(bill, ['current_period_excl_vat', 'bill_excl_vat']);
    if (vat === null) vat = pickFils(bill, ['current_period_vat', 'vat_current_period', 'vat_amount', 'VAT']);
    if (billIncl === null) billIncl = pickFils(bill, ['current_period_incl_vat', 'bill_incl_vat', 'total_bill', 'Total Bill', 'total_amount']);
    if (plan === null) plan = pickFils(bill, ['plan_excl_vat', 'plan_rental', 'Monthly Plan Amount', 'Service Rental']);
  }

  if (billExcl === null && billIncl !== null && vat !== null) billExcl = billIncl - vat;
  if (billIncl === null && billExcl !== null && vat !== null) billIncl = billExcl + vat;

  const excess = billExcl !== null && plan !== null ? Math.max(0, billExcl - plan) : null;
  const difference = billExcl !== null && billIncl !== null && vat !== null ? billExcl - (billIncl - vat) : null;
  const needsReview = billExcl === null || billIncl === null || vat === null || plan === null;

  return {
    planExclVat: fromFils(plan),
    billExclVat: fromFils(billExcl),
    vat: fromFils(vat),
    billInclVat: fromFils(billIncl),
    excessExclVat: fromFils(excess),
    isExcess: excess !== null && excess > EXCESS_MARGIN_FILS,
    status: needsReview ? 'needs_review' : 'ready',
    reconciliationStatus: difference === null ? 'needs_review' : (Math.abs(difference) <= 1 ? 'reconciled' : 'difference'),
    reconciliationDifference: fromFils(difference),
  };
};

export const getChargeExplanations = (bill = {}) => {
  const asArray = value => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (e) { return []; }
    }
    return [];
  };
  const raw = asArray(bill.charge_components || bill.source_financials?.charge_components);
  const grouped = new Map();
  raw.forEach(component => {
    const amount = toFils(component.amount_excl_vat ?? component.amount);
    if (amount === null || amount <= 0) return; // zero-charge usage belongs in usage details
    const label = String(component.label || component.category || 'Other charge').trim();
    const parent = String(component.parent_subtotal || '').trim();
    const key = `${label.toLowerCase()}|${parent.toLowerCase()}`;
    const current = grouped.get(key) || { label, parent, amountFils: 0, count: 0, unitType: component.unit_type || 'units' };
    current.amountFils += amount;
    const count = Number(component.unit_count);
    if (Number.isFinite(count)) current.count += count;
    grouped.set(key, current);
  });

  const labelFor = part => {
    const value = part.label.toLowerCase();
    if (/special/.test(value)) return 'Special-number calls';
    if (/calls?\s+to\s+mobile|mobile\s+calls?/.test(value)) return 'Mobile call charges';
    if (/telephone|landline/.test(value)) return 'Telephone / landline call charges';
    if (/incoming\s+roaming/.test(value)) return 'Incoming roaming call charges';
    if (/outgoing\s+roaming/.test(value)) return 'Outgoing roaming call charges';
    if (/international\s+calls?/.test(value)) return 'International call charges';
    if (/premium\s+sms/.test(value)) return 'Premium SMS';
    if (/mparking/.test(value)) return 'mParking';
    return part.label;
  };

  const parts = Array.from(grouped.values()).map(part => ({
    label: labelFor(part),
    amount: fromFils(part.amountFils),
    count: part.count || null,
    unitType: part.unitType,
    parent: part.parent,
  }));

  const calc = getTelecomBillCalculation(bill);
  const explainedFils = parts.reduce((sum, part) => sum + (toFils(part.amount) || 0), 0);
  const creditFils = toFils(bill.credits_adjustments);
  if (creditFils !== null && creditFils !== 0) {
    parts.push({ label: 'Credits and adjustments', amount: fromFils(creditFils), count: null, unitType: 'adjustment', parent: '' });
  }
  const excessFils = toFils(calc.excessExclVat);
  const accountedFils = explainedFils + (creditFils || 0);
  if (excessFils !== null && Math.abs(excessFils - accountedFils) > 1) {
    parts.push({
      label: excessFils > accountedFils ? 'Other invoice charges' : 'Unallocated credit / adjustment',
      amount: fromFils(excessFils - accountedFils), count: null, unitType: 'reconciliation', parent: '',
    });
  }
  if (parts.length === 0 && excessFils > 0) {
    parts.push({ label: 'Charges above plan', amount: fromFils(excessFils), count: null, unitType: 'charge', parent: '' });
  }
  return parts;
};

export const formatAed = (value, fallback = 'Needs review') => value === null || value === undefined
  ? fallback
  : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
