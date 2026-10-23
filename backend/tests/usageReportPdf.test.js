const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { createUsageReportPdf } = require('../src/utils/usageReportPdf');

const destination = (number, calls, minutes, amount = 0) => ({
  number, calls, total_min: minutes, uncharged_min: amount ? 0 : minutes,
  charged_call_min: amount ? minutes : 0, charged_amount: amount,
});

const fixture = {
  number: '0501070455',
  connection: { company: 'Nuragro FZE', employee: 'Sukrishn Suresh', plan_name: 'Sajenna plan 1', provider: 'e& (Etisalat)' },
  months: Array.from({ length: 15 }, (_, index) => ({
    key: `2025-${String(index + 1).padStart(2, '0')}`, label: `Month ${index + 1} 2025`, bill_number: `INV${1000 + index}`,
    plan: 110, bill_excl_vat: 120 + index, vat: 6, total: 126 + index, extra: 10 + index,
    call_minutes: 300 + index, data_gb: 7.5, premium_sms: index % 3, status: 'over',
  })),
  selected: {
    label: 'Aug 2026', month: '2026-08', status: 'over',
    bill: { bill_number: 'INV2048764537', period_from: '2026-08-01', period_to: '2026-08-31', provider: 'e& (Etisalat)', company: 'Nuragro FZE' },
    kpis: { plan: 110, bill_excl_vat: 245.46, vat: 6.03, bill_incl_vat: 251.49, extra: 135.46, extra_pct: 123.15, premium_sms: 0, premium_sms_amount: 0, data_gb: 7.78 },
    sources: [
      { name: '200 Roaming Flexi Minutes (Monthly Roaming Voice package with a deliberately long invoice label)', amount: 125 },
      { name: 'Calls to Special Number', amount: 10.46 },
      { name: 'A third detailed invoice component that must wrap instead of being clipped', amount: 2.25 },
      { name: 'A fourth component that must remain available in the complete breakdown', amount: -2.25 },
    ],
    lines: Array.from({ length: 18 }, (_, index) => ({ description: `Invoice line ${index + 1} with complete provider wording`, part: index ? 'Extra usage' : 'Plan', amount: index ? 1.25 : 110 })),
    reconcile: { matches: true, method: 'invoice components', difference: 0 },
    calls: {
      total_calls: 409, actual_total_seconds: 29028, actual_total_minutes: 483.8,
      actual_local_seconds: 28968, actual_local_minutes: 482.8,
      uncharged_calls: 406, uncharged_minutes: 448.97, calls_with_charges: 3,
      duration_of_calls_with_charges_minutes: 34.83, charged_amount: 10.46,
      provider_reported_minutes: { local: 484, international: 0, roaming: 1 },
      provider_billing_units: 410, billing_rounding_rules: ['Per-second billing'],
      applicable_local_allowance_minutes: 900, duration_above_allowance_seconds: null,
      allowance_categories_verified: false, allowance_eligible_categories: [],
      category_aggregates: [
        { category: 'Calls to Mobile', call_count: 350, total_duration_seconds: 25000, amount_excl_vat: 0, vat_amount: 0, unit_type: 'calls' },
        { category: 'Calls to Telephone / Landline', call_count: 56, total_duration_seconds: 1938, amount_excl_vat: 0, vat_amount: 0, unit_type: 'calls' },
        { category: 'Calls to Special Numbers', call_count: 3, total_duration_seconds: 2090, amount_excl_vat: 10.46, vat_amount: 0.52, unit_type: 'calls' },
      ],
      category_reconciliation: [
        { category: 'Calls to Mobile', status: 'matched', mismatches: [] },
        { category: 'Calls to Telephone / Landline', status: 'matched', mismatches: [] },
        { category: 'Calls to Special Numbers', status: 'mismatch', mismatches: ['duration_seconds'] },
      ],
    },
    allowance: { intl_minutes_used: 0, roaming_minutes_used: 1, data_used_gb: 7.78, data_limit_gb: 7.5, data_difference_gb: 0.28, invoice_data_charge_excl_vat: 0, data_unlimited: false, premium_sms: 0, premium_sms_amount: 0, normal_sms: 12, parking_amount: 0 },
    daily: Array.from({ length: 28 }, (_, index) => ({ day: `${index + 1}`, uncharged_min: 10 + (index % 4), charged_call_min: index === 9 ? 34.83 : 0 })),
    top_numbers: {
      by_calls: Array.from({ length: 10 }, (_, index) => destination(`05000000${index}`, 20 - index, 35 - index)),
      by_time: Array.from({ length: 10 }, (_, index) => destination(`06000000${index}`, 4 + index, 80 - index)),
      by_extra: [destination('0600521506', 3, 34.83, 10.46)],
    },
  },
};

test('creates a complete paginated usage report without fixed-row data loss', async () => {
  const bytes = await createUsageReportPdf(fixture);
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThanOrEqual(3);
  expect(document.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
  expect(document.getTitle()).toContain('0501070455');
});

test('keeps a normal monthly report to exactly two pages', async () => {
  const normal = JSON.parse(JSON.stringify(fixture));
  normal.months = normal.months.slice(0, 1);
  normal.selected.lines = normal.selected.lines.slice(0, 4);
  normal.selected.sources = normal.selected.sources.slice(0, 2);
  const bytes = await createUsageReportPdf(normal);
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBe(2);
  if (process.env.USAGE_REPORT_PDF_FIXTURE) fs.writeFileSync(process.env.USAGE_REPORT_PDF_FIXTURE, Buffer.from(bytes));
});
