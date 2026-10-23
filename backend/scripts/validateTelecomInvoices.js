const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const {
  extractTelecomFinancials,
  calculateTelecomBill,
  durationToSeconds,
  secondsToDisplayMinutes,
} = require('../src/utils/telecomBilling');
const { extractTelecomUsage } = require('../src/utils/telecomUsage');

async function inspect(file) {
  const parsed = await new PDFParse({ data: fs.readFileSync(file) }).getText();
  const text = parsed && parsed.text || '';
  const financials = extractTelecomFinancials(text);
  const calculation = calculateTelecomBill(financials);
  const usage = extractTelecomUsage(text, { provider: /\bdu\b|Emirates Integrated/i.test(text) ? 'du' : 'Etisalat' });
  const calls = usage.call_logs.length;
  const totalSeconds = usage.call_logs.reduce((sum, call) => sum + durationToSeconds(call.duration), 0);
  const charged = usage.call_logs.filter(call => Number(call.amount) > 0);
  const chargedSeconds = charged.reduce((sum, call) => sum + durationToSeconds(call.duration), 0);
  const chargedAmount = charged.reduce((sum, call) => sum + Number(call.amount || 0), 0);
  return {
    file: path.basename(file),
    account: financials.account_number,
    invoice: financials.invoice_number,
    plan_excl_vat: calculation.plan_excl_vat,
    bill_excl_vat: calculation.bill_excl_vat,
    vat: calculation.vat,
    bill_incl_vat: calculation.bill_incl_vat,
    excess_excl_vat: calculation.excess_excl_vat,
    excess_flagged: calculation.is_excess,
    reconciliation: calculation.reconciliation_status,
    calls,
    actual_call_seconds: totalSeconds,
    actual_call_minutes: secondsToDisplayMinutes(totalSeconds),
    duration_of_calls_with_charges_minutes: secondsToDisplayMinutes(chargedSeconds),
    actual_call_charges: Number(chargedAmount.toFixed(2)),
    categories: usage.call_category_aggregates,
    category_summary_reconciliation: usage.call_category_reconciliation.map(row => ({
      category: row.category, status: row.status, mismatches: row.mismatches,
    })),
    charge_components: usage.charge_components.filter(component => component.amount_excl_vat > 0),
  };
}

async function main() {
  const files = process.argv.slice(2).map(file => path.resolve(file));
  if (!files.length) throw new Error('Pass one or more invoice PDF paths.');
  const results = [];
  for (const file of files) results.push(await inspect(file));
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
