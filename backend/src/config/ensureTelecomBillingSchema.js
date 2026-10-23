const fs = require('fs');
const path = require('path');
const db = require('./db');
const { PDFParse } = require('pdf-parse');
const { extractTelecomFinancials } = require('../utils/telecomBilling');
const { extractTelecomUsage } = require('../utils/telecomUsage');

const BILL_COLUMNS = [
  ['account_number', 'VARCHAR(100)'],
  ['current_period_excl_vat', 'NUMERIC(14,2)'],
  ['current_period_vat', 'NUMERIC(14,2)'],
  ['current_period_incl_vat', 'NUMERIC(14,2)'],
  ['plan_excl_vat', 'NUMERIC(14,2)'],
  ['usage_charges', 'NUMERIC(14,2)'],
  ['one_time_charges', 'NUMERIC(14,2)'],
  ['third_party_charges', 'NUMERIC(14,2)'],
  ['credits_adjustments', 'NUMERIC(14,2)'],
  ['previous_balance', 'NUMERIC(14,2)'],
  ['payments', 'NUMERIC(14,2)'],
  ['balance_carried_forward', 'NUMERIC(14,2)'],
  ['total_amount_due', 'NUMERIC(14,2)'],
  ['vat_treatments', "JSONB DEFAULT '[]'::jsonb"],
  ['financial_source', 'VARCHAR(40)'],
  ['calculation_status', 'VARCHAR(30)'],
  ['reconciliation_status', 'VARCHAR(30)'],
  ['reconciliation_difference', 'NUMERIC(14,2)'],
  ['source_financials', "JSONB DEFAULT '{}'::jsonb"],
  ['financials_extracted_at', 'TIMESTAMP'],
  ['calculation_version', 'INTEGER DEFAULT 0'],
  ['call_category_summaries', "JSONB DEFAULT '[]'::jsonb"],
  ['call_category_reconciliation', "JSONB DEFAULT '[]'::jsonb"],
  ['charge_components', "JSONB DEFAULT '[]'::jsonb"],
  ['allowance_eligible_categories', "JSONB DEFAULT '[]'::jsonb"],
  ['allowance_categories_verified', 'BOOLEAN DEFAULT false'],
];

const CALL_LOG_COLUMNS = [
  ['duration_seconds', 'INTEGER'],
  ['provider_billing_units', 'NUMERIC(14,4)'],
  ['billing_rounding_rule', 'VARCHAR(80)'],
  ['category_source', 'VARCHAR(40)'],
  ['source_section', 'VARCHAR(160)'],
  ['unit_type', 'VARCHAR(30)'],
  ['unit_count', 'NUMERIC(14,4)'],
];

const SMS_LOG_COLUMNS = [
  ['unit_type', 'VARCHAR(30)'],
  ['unit_count', 'NUMERIC(14,4)'],
];

const resolvePdf = (value) => {
  if (!value) return null;
  const base = path.basename(String(value));
  const candidates = [
    path.resolve(__dirname, '../../Attachment', base),
    path.resolve(__dirname, '../..', String(value).replace(/^[/\\]*(?:backend[/\\])?/, '')),
  ];
  const exact = candidates.find(file => fs.existsSync(file));
  if (exact) return exact;
  const attachmentDir = path.resolve(__dirname, '../../Attachment');
  if (!fs.existsSync(attachmentDir)) return null;
  const suffix = base.toLowerCase();
  const matches = fs.readdirSync(attachmentDir)
    .filter(name => name.toLowerCase() === suffix || name.toLowerCase().endsWith(`-${suffix}`))
    .map(name => path.join(attachmentDir, name));
  matches.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
};

async function backfillFromOriginalPdfs() {
  const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_bill'`);
  const have = new Set(cols.rows.map(row => row.column_name));
  const pk = ['tele_bill_id', 'bill_id', 'id'].find(column => have.has(column));
  if (!pk || !have.has('pdf_filename')) return;

  const rows = await db.query(
    `SELECT ${pk} AS id, pdf_filename, bill_number, mobile_number, telecom_provider FROM tbl_telecome_bill
     WHERE pdf_filename IS NOT NULL
       AND (financials_extracted_at IS NULL OR calculation_status = 'needs_review' OR COALESCE(calculation_version, 0) < 6)`
  );
  const callColsResult = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_call_logs'`).catch(() => ({ rows: [] }));
  const callCols = new Set(callColsResult.rows.map(row => row.column_name));
  const callFk = ['tele_bill_id', 'bill_id'].find(column => callCols.has(column));
  const smsColsResult = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_sms_logs'`).catch(() => ({ rows: [] }));
  const smsCols = new Set(smsColsResult.rows.map(row => row.column_name));
  let updated = 0;
  let missingPdf = 0;
  let failed = 0;
  for (const row of rows.rows) {
    const file = resolvePdf(row.pdf_filename);
    if (!file) {
      missingPdf += 1;
      continue;
    }
    try {
      const parsed = await new PDFParse({ data: fs.readFileSync(file) }).getText();
      const values = extractTelecomFinancials(parsed && parsed.text);
      const usage = extractTelecomUsage(parsed && parsed.text, {
        provider: row.telecom_provider,
        billNumber: row.bill_number,
        sourceNumber: row.mobile_number,
      });
      await db.query(
        `UPDATE tbl_telecome_bill SET
           account_number = COALESCE($1, account_number),
           current_period_excl_vat = $2,
           current_period_vat = $3,
           current_period_incl_vat = $4,
           plan_excl_vat = $5,
           usage_charges = COALESCE($6, usage_charges),
           one_time_charges = $7,
           third_party_charges = $8,
           credits_adjustments = $9,
           previous_balance = $10,
           payments = $11,
           balance_carried_forward = $12,
           total_amount_due = $13,
           vat_treatments = $14::jsonb,
           financial_source = 'invoice_pdf',
           calculation_status = $15,
           reconciliation_status = $16,
           reconciliation_difference = $17,
           source_financials = $18::jsonb,
           call_category_summaries = $19::jsonb,
           call_category_reconciliation = $20::jsonb,
           charge_components = $21::jsonb,
           financials_extracted_at = CURRENT_TIMESTAMP,
           calculation_version = 6
         WHERE ${pk} = $22`,
        [
          values.account_number, values.current_period_excl_vat, values.current_period_vat,
          values.current_period_incl_vat, values.plan_excl_vat, values.usage_charges,
          values.one_time_charges, values.third_party_charges, values.credits_adjustments,
          values.previous_balance, values.payments, values.balance_carried_forward,
          values.total_amount_due, JSON.stringify(values.vat_treatments || []),
          values.calculation_status, values.reconciliation_status,
          values.reconciliation_difference, JSON.stringify(values),
          JSON.stringify(usage.call_category_summaries || []),
          JSON.stringify(usage.call_category_reconciliation || []),
          JSON.stringify(usage.charge_components || []), row.id,
        ]
      );

      if (callFk && callCols.size) {
        await db.query(`DELETE FROM tbl_telecome_call_logs WHERE ${callFk} = $1`, [row.id]);
        await db.query(
          `DELETE FROM tbl_telecome_call_logs
           WHERE ${callFk} IS NULL AND bill_number = $1
             AND RIGHT(REGEXP_REPLACE(COALESCE(source_number, ''), '\\D', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(COALESCE($2, ''), '\\D', '', 'g'), 9)`,
          [row.bill_number, row.mobile_number]
        );
        for (const call of usage.call_logs) {
          await db.query(
            `INSERT INTO tbl_telecome_call_logs
              (${callFk}, bill_number, source_number, call_date, call_time, destination_number,
               duration, duration_seconds, category, category_source, source_section, unit_type, unit_count, amount, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CURRENT_TIMESTAMP)`,
            [row.id, call.bill_number, call.source_number, call.call_date, call.call_time,
              call.destination_number, call.duration, call.duration_seconds, call.category,
              call.category_source, call.source_section, call.unit_type, call.unit_count, call.amount]
          );
        }
      }

      if (smsCols.has('tele_bill_id') || smsCols.has('bill_id')) {
        const smsFk = smsCols.has('tele_bill_id') ? 'tele_bill_id' : 'bill_id';
        await db.query(`DELETE FROM tbl_telecome_sms_logs WHERE ${smsFk} = $1`, [row.id]);
        for (const sms of usage.sms_logs) {
          await db.query(
            `INSERT INTO tbl_telecome_sms_logs
              (${smsFk}, provider, bill_number, source_number, destination_number, sms_date, sms_time,
               sms_type, sub_heading, sms_count, unit_type, unit_count, amount, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP)`,
            [row.id, row.telecom_provider, sms.bill_number, sms.source_number, sms.destination_number,
              sms.call_date, sms.call_time, sms.category, sms.sub_heading, sms.unit_count || 1,
              sms.unit_type, sms.unit_count || 1, sms.amount]
          );
        }
      }
      updated += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[MIGRATION] Could not re-extract Telecom bill ${row.id}: ${error.message}`);
    }
  }
  console.log(`[MIGRATION] Telecom invoice backfill: ${updated} recalculated, ${missingPdf} missing original PDF, ${failed} failed, ${rows.rows.length} eligible.`);
}

async function deduplicateTelecomBills() {
  const billCols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_bill'`);
  const have = new Set(billCols.rows.map(row => row.column_name));
  const pk = ['tele_bill_id', 'bill_id', 'id'].find(column => have.has(column));
  if (!pk || !have.has('bill_number') || !have.has('mobile_number')) return 0;
  const clientKey = have.has('clientid') ? "COALESCE(clientid::text, '')" : "''";
  const duplicates = await db.query(`
    SELECT ${pk} AS duplicate_id, MIN(${pk}) OVER (
      PARTITION BY bill_number,
        RIGHT(REGEXP_REPLACE(COALESCE(mobile_number, ''), '\\D', '', 'g'), 9),
        ${clientKey}
    ) AS canonical_id
    FROM tbl_telecome_bill
    WHERE NULLIF(TRIM(COALESCE(bill_number, '')), '') IS NOT NULL
  `);
  const mappings = duplicates.rows.filter(row => String(row.duplicate_id) !== String(row.canonical_id));
  if (!mappings.length) return 0;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (const mapping of mappings) {
      await client.query('UPDATE tbl_telecom_bill_logs SET bill_id = $1 WHERE bill_id = $2', [mapping.canonical_id, mapping.duplicate_id]).catch(() => null);
      for (const table of ['tbl_telecome_bill_items', 'tbl_telecome_call_logs', 'tbl_telecome_sms_logs']) {
        const cols = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [table]);
        const fk = ['tele_bill_id', 'bill_id'].find(column => cols.rows.some(row => row.column_name === column));
        if (fk) await client.query(`DELETE FROM ${table} WHERE ${fk} = $1`, [mapping.duplicate_id]);
      }
      await client.query(`DELETE FROM tbl_telecome_bill WHERE ${pk} = $1`, [mapping.duplicate_id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return mappings.length;
}

async function ensureTelecomBillingSchema() {
  try {
    const exists = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_telecome_bill'`);
    if (!exists.rows.length) return;
    for (const [name, type] of BILL_COLUMNS) {
      await db.query(`ALTER TABLE tbl_telecome_bill ADD COLUMN IF NOT EXISTS ${name} ${type}`);
    }
    const callLogExists = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_telecome_call_logs'`);
    if (callLogExists.rows.length) {
      for (const [name, type] of CALL_LOG_COLUMNS) {
        await db.query(`ALTER TABLE tbl_telecome_call_logs ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      }
      await db.query(`
        UPDATE tbl_telecome_call_logs
        SET duration_seconds =
          split_part(duration, ':', 1)::integer * 3600 +
          split_part(duration, ':', 2)::integer * 60 +
          split_part(duration, ':', 3)::integer
        WHERE duration_seconds IS NULL
          AND duration ~ '^\\d+:([0-5]\\d):([0-5]\\d)$'
      `);
    }
    const smsLogExists = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_telecome_sms_logs'`);
    if (smsLogExists.rows.length) {
      for (const [name, type] of SMS_LOG_COLUMNS) {
        await db.query(`ALTER TABLE tbl_telecome_sms_logs ADD COLUMN IF NOT EXISTS ${name} ${type}`);
      }
    }
    const itemExists = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_telecome_bill_items'`);
    if (itemExists.rows.length) {
      await db.query(`ALTER TABLE tbl_telecome_bill_items ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(14,2)`);
      await db.query(`ALTER TABLE tbl_telecome_bill_items ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14,2)`);
      await db.query(`ALTER TABLE tbl_telecome_bill_items ADD COLUMN IF NOT EXISTS vat_treatment VARCHAR(40)`);
      await db.query(`ALTER TABLE tbl_telecome_bill_items ADD COLUMN IF NOT EXISTS source_level VARCHAR(30)`);
      await db.query(`ALTER TABLE tbl_telecome_bill_items ADD COLUMN IF NOT EXISTS included_in_current_total BOOLEAN DEFAULT true`);
    }
    const removedDuplicates = await deduplicateTelecomBills();
    const uniqueCols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tbl_telecome_bill'`);
    const uniqueClientKey = uniqueCols.rows.some(row => row.column_name === 'clientid') ? "COALESCE(clientid::text, '')" : "''";
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_telecome_bill_invoice_number_client
      ON tbl_telecome_bill (
        bill_number,
        RIGHT(REGEXP_REPLACE(COALESCE(mobile_number, ''), '\\D', '', 'g'), 9),
        ${uniqueClientKey}
      )
      WHERE NULLIF(TRIM(COALESCE(bill_number, '')), '') IS NOT NULL
    `).catch(error => console.warn(`[MIGRATION] Could not create Telecom bill idempotency index: ${error.message}`));
    if (removedDuplicates) console.log(`[MIGRATION] Telecom invoice deduplication: ${removedDuplicates} duplicate record(s) merged.`);
    await backfillFromOriginalPdfs();
  } catch (error) {
    console.error('[MIGRATION] ensureTelecomBillingSchema failed:', error.message);
  }
}

module.exports = ensureTelecomBillingSchema;

if (require.main === module) {
  ensureTelecomBillingSchema().then(() => process.exit(0)).catch(() => process.exit(1));
}
