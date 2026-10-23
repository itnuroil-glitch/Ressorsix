const {
  extractTelecomFinancials,
  calculateTelecomBill,
  durationToSeconds,
  sumCallSeconds,
  secondsToDisplayMinutes,
} = require('../src/utils/telecomBilling');
const {
  parseCallRows,
  parseCategorySummaries,
  aggregateCallCategories,
  reconcileCategorySummaries,
  parseUsageComponents,
} = require('../src/utils/telecomUsage');

describe('Telecom call durations', () => {
  test('sums exact seconds and rounds only the final display value', () => {
    const calls = [
      { duration: '00:00:35' },
      { duration: '00:02:34' },
      { duration: '20:48:09' },
    ];
    const totalSeconds = sumCallSeconds(calls);
    expect(totalSeconds).toBe(75078);
    expect(secondsToDisplayMinutes(totalSeconds)).toBe(1251.3);
    expect(calls.reduce((sum, call) => sum + Math.ceil(durationToSeconds(call.duration) / 60), 0)).not.toBe(1251.3);
  });

  test('prefers preserved duration_seconds and rejects invalid clock values', () => {
    expect(sumCallSeconds([{ duration: '00:01:00', duration_seconds: 59 }])).toBe(59);
    expect(durationToSeconds('00:60:00')).toBe(0);
  });
});

describe('Telecom invoice financials', () => {
  test('uses stated fully taxable current-period values', () => {
    const parsed = extractTelecomFinancials(`
      Service Rentals 100.00
      Usage Charges 20.00
      VAT on taxable services -Current Period 6.00
      Current month charges (including VAT)\n126.00
      VAT on Current Month Charges 120.00 120.00 6.00
    `);
    expect(calculateTelecomBill(parsed)).toMatchObject({
      plan_excl_vat: 100, bill_excl_vat: 120, vat: 6, bill_incl_vat: 126,
      excess_excl_vat: 20, is_excess: true, calculation_status: 'ready',
    });
  });

  test('preserves mixed VAT and non-taxable one-time charges', () => {
    const parsed = extractTelecomFinancials(`
      Service Rentals 110.00
      Usage Charges 10.46
      One-Time Charges 125.00
      VAT on taxable services -Current Period 6.03
      Current month charges (including VAT)\n251.49
      Total Charges Charges Subject to VAT VAT AMOUNT (5%)
      VAT on Current Month Charges 245.46 120.46 6.03
      Service Rental 110.00 110.00 5.50
      Usage Charges 10.46 10.46 0.53
      One-Time Charges 125.00 0.00 0.00
      *All charges
    `);
    expect(parsed.current_period_excl_vat).toBe(245.46);
    expect(parsed.vat_treatments.find(x => x.category === 'One-Time Charges')).toMatchObject({
      amount: 125, taxable_amount: 0, vat_amount: 0,
      treatment: 'zero-rated-exempt-or-out-of-scope',
    });
    expect(calculateTelecomBill(parsed).excess_excl_vat).toBe(135.46);
  });

  test('distinguishes an explicit zero-VAT bill from missing VAT', () => {
    const zeroVat = calculateTelecomBill({
      current_period_excl_vat: 75, current_period_vat: 0,
      current_period_incl_vat: 75, plan_excl_vat: 75,
    });
    expect(zeroVat).toMatchObject({ vat: 0, calculation_status: 'ready', excess_excl_vat: 0 });

    const missingVat = calculateTelecomBill({ current_period_incl_vat: 75, plan_excl_vat: 60 });
    expect(missingVat).toMatchObject({ vat: null, bill_excl_vat: null, calculation_status: 'needs_review' });
  });

  test.each([
    [109.99, false],
    [110.00, false],
    [110.01, true],
  ])('applies the strict AED 10 threshold to %p', (bill, flagged) => {
    const result = calculateTelecomBill({
      current_period_excl_vat: bill,
      current_period_vat: 0,
      current_period_incl_vat: bill,
      plan_excl_vat: 100,
    });
    expect(result.is_excess).toBe(flagged);
  });

  test('keeps previous balance and payment outside current-period analysis', () => {
    const parsed = extractTelecomFinancials(`
      Service Rentals 100.00
      Usage Charges 5.00
      VAT on taxable services -Current Period 5.25
      Current month charges (including VAT)\n110.25
      VAT on Current Month Charges 105.00 105.00 5.25
      Previous month bill 500.00
      Payments received −500.00
      Total Amount Due 110.25
    `);
    expect(parsed).toMatchObject({ previous_balance: 500, payments: -500, total_amount_due: 110.25 });
    expect(calculateTelecomBill(parsed).excess_excl_vat).toBe(5);
  });

  test('keeps one-time charges, add-ons and credits in their stated breakdown', () => {
    const parsed = extractTelecomFinancials(`
      Service Rentals 100.00
      Usage Charges 8.00
      One-Time Charges 20.00
      Add-on fees 15.00
      Other Credits & Charges -5.00
      Refunds & Adjustments -2.00
      VAT on taxable services -Current Period 6.80
      Current month charges (including VAT)\n142.80
      VAT on Current Month Charges 136.00 136.00 6.80
    `);
    expect(parsed).toMatchObject({
      one_time_charges: 35,
      credits_adjustments: -7,
      current_period_excl_vat: 136,
    });
  });

  test('preserves stated VAT and flags a reconciliation difference', () => {
    const result = calculateTelecomBill({
      current_period_excl_vat: 100.02,
      current_period_vat: 5.01,
      current_period_incl_vat: 105,
      plan_excl_vat: 90,
    });
    expect(result.vat).toBe(5.01);
    expect(result.reconciliation_status).toBe('difference');
    expect(result.reconciliation_difference).toBe(0.03);
  });

  test('extracts third-party charges as a subset without adding them to the bill', () => {
    const parsed = extractTelecomFinancials(`
      Service Rentals 100.00
      Usage Charges 123.64
      3rd party charges 0543051035 29.00 +0.00
      VAT on taxable services -Current Period 9.73
      Current month charges (including VAT)\n233.37
      VAT on Current Month Charges 223.64 194.64 9.73
    `);
    expect(parsed.third_party_charges).toBe(29);
    expect(calculateTelecomBill(parsed).bill_excl_vat).toBe(223.64);
  });

  test('extracts a multi-number du bill without duplicating repeated summary values', () => {
    const parsed = extractTelecomFinancials(`
      Emirates Integrated Telecommunications Company PJSC
      Your bill number I4008352339
      Your account number 2829856782
      Your bill for this month For account number 2829856782 AED 1,013.98
      Sub-total of non-taxable services 177.00
      Sub-total of taxable services 797.13
      5% VAT 39.86
      Plan monthly fees 315.00 Add-on fees 0.00 Usage & one-time fees 188.36
      Plan monthly fees 315.00 Add-on fees 0.00 Usage & one-time fees 195.62
    `);
    expect(parsed).toMatchObject({
      account_number: '2829856782', invoice_number: 'I4008352339',
      current_period_excl_vat: 974.13, current_period_vat: 39.86,
      current_period_incl_vat: 1013.98, plan_excl_vat: 630,
    });
    expect(calculateTelecomBill(parsed).excess_excl_vat).toBe(344.13);
  });
});

describe('Telecom invoice call categories', () => {
  test('keeps telephone calls separate and preserves the section across page breaks', () => {
    const rows = parseCallRows(`
      Calls To Telephone 00:01:00 0.00
      01 Sep 2026 10:00:00 Ì043524888Í 00:00:25 0.00
      PAGE 4 OF 5
      -- 4 of 5 --
      Usage & Services Details
      DATE UAE TIME TO DURATION AMOUNT
      01 Sep 2026 10:01:00 Ì065995922Í 00:00:35 0.00
    `);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.category === 'Calls to Telephone / Landline')).toBe(true);
    expect(aggregateCallCategories(rows)[0]).toMatchObject({ call_count: 2, total_duration_seconds: 60, amount_excl_vat: 0 });
  });

  test('does not guess a special number from a non-mobile destination', () => {
    const rows = parseCallRows(`
      National calls
      Date Time Number Duration Cost
      01/07 10:00 600123456 00:00:30 0.00
    `, { periodTo: '2026-07-31' });
    expect(rows[0]).toMatchObject({ category: 'Unclassified', category_source: 'invoice_section' });
  });

  test('tracks provider service numbers in multi-number bills', () => {
    const rows = parseCallRows(`
      052 480 64 01
      National calls
      01/07 10:00 0500000001 00:00:30 0.00
      056 993 61 02
      National calls
      01/07 10:01 0500000002 00:00:20 0.00
    `, { provider: 'du', periodTo: '2026-07-31', sourceNumber: '2829856782' });
    expect(rows.map(row => row.source_number)).toEqual(['0524806401', '0569936102']);
    expect(rows.every(row => row.category === 'Unclassified')).toBe(true);
  });

  test('keeps special, mobile, international and roaming categories independent', () => {
    const rows = parseCallRows(`
      Calls to Mobile
      01 Sep 2026 10:00:00 Ì0500000001Í 00:00:10 0.00
      Calls to Special Number
      01 Sep 2026 10:01:00 Ì600000001Í 00:00:20 1.00
      International Calls
      01 Sep 2026 10:02:00 Ì+919000000001Í India 00:00:30 2.00
      Incoming Roaming Calls
      01 Sep 2026 10:03:00 Ì0500000002Í India 00:00:40 0.00
      Outgoing Roaming Calls
      01 Sep 2026 10:04:00 Ì0500000003Í India 00:00:50 3.00
    `);
    expect(rows.map(row => row.category)).toEqual([
      'Calls to Mobile', 'Calls to Special Numbers', 'International Calls',
      'Incoming Roaming Calls', 'Outgoing Roaming Calls',
    ]);
  });

  test('compares detail records to category summaries without adding the summary', () => {
    const text = `
      Calls to Mobile 2 00:01:00 0.00 0.00
      Calls to Mobile 00:01:00 0.00
      01 Sep 2026 10:00:00 Ì0500000001Í 00:00:20 0.00
      01 Sep 2026 10:01:00 Ì0500000002Í 00:00:30 0.00
    `;
    const rows = parseCallRows(text);
    const summaries = parseCategorySummaries(text);
    expect(rows).toHaveLength(2);
    expect(summaries).toHaveLength(1);
    expect(reconcileCategorySummaries(rows, summaries)[0]).toMatchObject({ status: 'mismatch', mismatches: ['duration_seconds'] });
  });

  test('retains unit meanings, VAT and actual add-on names in charge components', () => {
    const components = parseUsageComponents(`
      Usage charges 15.00 AED
      Calls to Special Number 2 00:01:00 5.00 0.25
      Premium SMS 3 - 4.00 0.20
      mParking * 2 - 6.00 0.00
      One-time charges 125.00 AED
      200 Roaming Flexi Minutes (Monthly
      Roaming Voice) - One-Time - AED125/
      Month*
    `);
    expect(components.find(x => /Special/.test(x.label))).toMatchObject({ unit_count: 2, unit_type: 'calls', amount_excl_vat: 5, vat_amount: 0.25 });
    expect(components.find(x => /Premium/.test(x.label))).toMatchObject({ unit_count: 3, unit_type: 'messages' });
    expect(components.find(x => x.category === 'Add-on / package')).toMatchObject({ label: '200 Roaming Flexi Minutes (Monthly Roaming Voice)', amount_excl_vat: 125 });
  });
});
