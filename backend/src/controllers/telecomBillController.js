// Telecom Bill Controller - Parity & Analytics Sync 2026-08-24 17:58
const db = require('../config/db');

let billPkCol = null;

async function getBillPkCol() {
  if (billPkCol) return billPkCol;
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill' 
        AND column_name IN ('tele_bill_id', 'bill_id', 'id')
      LIMIT 1
    `);
    if (res.rows.length > 0) {
      billPkCol = res.rows[0].column_name;
    } else {
      billPkCol = 'tele_bill_id';
    }
  } catch (e) {
    billPkCol = 'tele_bill_id';
  }
  return billPkCol;
}

async function getLogFkCol() {
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_call_logs' 
        AND column_name IN ('tele_bill_id', 'bill_id')
      LIMIT 1
    `);
    if (res.rows.length > 0) return res.rows[0].column_name;
  } catch (e) {}
  return 'tele_bill_id';
}

async function getItemFkCol() {
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill_items' 
        AND column_name IN ('tele_bill_id', 'bill_id')
      LIMIT 1
    `);
    if (res.rows.length > 0) return res.rows[0].column_name;
  } catch (e) {}
  return 'tele_bill_id';
}

async function getBillColAliases() {
  try {
    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `).catch(() => ({ rows: [] }));
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const totalSelect = existingCols.has('total_amount') && existingCols.has('total_bill')
      ? 'COALESCE(tb.total_amount, tb.total_bill, 0)'
      : (existingCols.has('total_amount') ? 'COALESCE(tb.total_amount, 0)' : (existingCols.has('total_bill') ? 'COALESCE(tb.total_bill, 0)' : '0'));

    const vatSelect = existingCols.has('vat_amount') && existingCols.has('vat_current_period')
      ? 'COALESCE(tb.vat_amount, tb.vat_current_period, 0)'
      : (existingCols.has('vat_amount') ? 'COALESCE(tb.vat_amount, 0)' : (existingCols.has('vat_current_period') ? 'COALESCE(tb.vat_current_period, 0)' : '0'));

    const providerSelect = existingCols.has('provider') && existingCols.has('telecom_provider')
      ? "COALESCE(tb.provider, tb.telecom_provider, '')"
      : (existingCols.has('provider') ? "COALESCE(tb.provider, '')" : (existingCols.has('telecom_provider') ? "COALESCE(tb.telecom_provider, '')" : "''"));

    return { totalSelect, vatSelect, providerSelect };
  } catch (e) {
    return { totalSelect: '0', vatSelect: '0', providerSelect: "''" };
  }
}

exports.getAllTelecomBills = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { totalSelect, vatSelect, providerSelect } = await getBillColAliases();
    const { clientid } = req.query;

    let query = `
      SELECT 
        tb.*, 
        tb.${pkCol} AS id,
        tb.${pkCol} AS tele_bill_id,
        tb.${pkCol} AS bill_id,
        ${totalSelect} AS total_bill,
        ${vatSelect} AS vat_current_period,
        ${providerSelect} AS telecom_provider,
        c.client_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      WHERE 1=1
    `;
    let params = [];
    if (clientid) {
      query += ' AND tb.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ` ORDER BY tb.${pkCol} DESC`;
    const result = await db.query(query, params);

    // Fetch child line items from tbl_telecome_bill_items
    const itemsRes = await db.query(`SELECT *, ${itemFk} AS tele_bill_id FROM tbl_telecome_bill_items ORDER BY item_id ASC`).catch(() => ({ rows: [] }));
    const itemsMap = new Map();
    (itemsRes.rows || []).forEach(item => {
      const bId = String(item[itemFk] || item.tele_bill_id || item.bill_id);
      if (!itemsMap.has(bId)) itemsMap.set(bId, []);
      itemsMap.get(bId).push(item);
    });

    // Fetch call logs from tbl_telecome_call_logs
    const logsRes = await db.query(`SELECT *, ${logFk} AS tele_bill_id FROM tbl_telecome_call_logs ORDER BY log_id ASC`).catch(() => ({ rows: [] }));
    const logsMap = new Map();
    (logsRes.rows || []).forEach(log => {
      const bId = String(log[logFk] || log.tele_bill_id || log.bill_id);
      if (!logsMap.has(bId)) logsMap.set(bId, []);
      logsMap.get(bId).push(log);
    });

    const formattedRows = result.rows.map(row => {
      const bId = String(row[pkCol] || row.bill_id || row.tele_bill_id || row.id);
      const childItems = itemsMap.get(bId) || [];
      const callLogs = logsMap.get(bId) || [];

      const providerVal = row.telecom_provider || row.provider || '';
      const totalAmt = row.total_bill || row.total_amount || 0;
      const vatAmt = row.vat_current_period || row.vat_amount || 0;

      return {
        ...row,
        id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        tele_bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        Company: row.company_name,
        'Bill Number': row.bill_number,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': providerVal,
        'Total Bill': totalAmt,
        'VAT': vatAmt,
        'Monthly Plan Amount': row.plan_rental,
        'Service Rental': row.plan_rental,
        'Usage Charges': row.usage_charges,
        'Payment Status': row.status,
        items: childItems,
        call_logs: callLogs,
        field_data: {
          Company: row.company_name,
          'Bill Number': row.bill_number,
          'Mobile Number / Account': row.mobile_number,
          'Telecom Provider': providerVal,
          'Total Bill': totalAmt,
          'VAT': vatAmt,
          'Service Rental': row.plan_rental,
          'Usage Charges': row.usage_charges,
          'Payment Status': row.status,
          items: childItems,
          call_logs: callLogs
        }
      };
    });

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Error fetching Telecom Bills:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomBillById = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { totalSelect, vatSelect, providerSelect } = await getBillColAliases();
    const { id } = req.params;
    const query = `
      SELECT tb.*, 
        tb.${pkCol} AS id, 
        tb.${pkCol} AS tele_bill_id, 
        tb.${pkCol} AS bill_id,
        ${totalSelect} AS total_bill,
        ${vatSelect} AS vat_current_period,
        ${providerSelect} AS telecom_provider,
        c.client_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      WHERE tb.${pkCol} = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }
    const row = result.rows[0];

    const itemsRes = await db.query(`SELECT * FROM tbl_telecome_bill_items WHERE ${itemFk} = $1 ORDER BY item_id ASC`, [id]).catch(() => ({ rows: [] }));
    const logsRes = await db.query(`SELECT * FROM tbl_telecome_call_logs WHERE ${logFk} = $1 ORDER BY log_id ASC`, [id]).catch(() => ({ rows: [] }));

    res.status(200).json({
      ...row,
      id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      tele_bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      items: itemsRes.rows,
      call_logs: logsRes.rows,
      field_data: {
        Company: row.company_name,
        'Bill Number': row.bill_number,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': row.telecom_provider || row.provider,
        'Total Bill': row.total_bill || row.total_amount,
        'VAT': row.vat_current_period || row.vat_amount,
        'Service Rental': row.plan_rental,
        'Usage Charges': row.usage_charges,
        'Payment Status': row.status,
        items: itemsRes.rows,
        call_logs: logsRes.rows
      }
    });
  } catch (err) {
    console.error('Error fetching Telecom Bill by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getCallLogsByBillId = async (req, res) => {
  try {
    const logFk = await getLogFkCol();
    const { id } = req.params;
    const logsRes = await db.query(`SELECT * FROM tbl_telecome_call_logs WHERE ${logFk} = $1 ORDER BY log_id ASC`, [id]);
    res.status(200).json(logsRes.rows || []);
  } catch (err) {
    console.error('Error fetching Call Logs by bill id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();

    const body = req.body || {};
    const fd = body.field_data || {};

    const bill_number = body.bill_number || fd['Bill Number'] || fd.f_billno || '';
    const mobile_number = body.mobile_number || fd['Mobile Number / Account'] || fd.f_account || '';
    const company_name = body.company_name || body.company_id || fd.Company || fd.f_company || '';
    const telecom_provider = body.telecom_provider || fd['Telecom Provider'] || fd.f_provider || '';

    const total_bill = parseFloat(body.total_bill || fd['Total Bill'] || fd.f_total || 0) || 0;
    const plan_rental = parseFloat(body.plan_rental || fd['Service Rental'] || fd['Monthly Plan Amount'] || fd.f_rental || 0) || 0;
    const usage_charges = parseFloat(body.usage_charges || fd['Usage Charges'] || fd.f_usage || 0) || 0;
    const vat_current_period = parseFloat(body.vat_current_period || fd.VAT || fd.f_vat || 0) || 0;

    const clientid = body.clientid ? String(body.clientid) : null;
    const status = body.status || fd['Payment Status'] || fd.f_status || 'Pending';
    const pdf_filename = body.pdf_filename || fd['Invoice PDF'] || null;

    // Check if table uses provider/total_amount/vat_amount column names
    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `);
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const insertCols = ['bill_number', 'mobile_number', 'company_name'];
    const values = [bill_number, mobile_number, company_name];

    if (existingCols.has('telecom_provider')) {
      insertCols.push('telecom_provider');
      values.push(telecom_provider);
    } else if (existingCols.has('provider')) {
      insertCols.push('provider');
      values.push(telecom_provider);
    }

    if (existingCols.has('total_bill')) {
      insertCols.push('total_bill');
      values.push(total_bill);
    } else if (existingCols.has('total_amount')) {
      insertCols.push('total_amount');
      values.push(total_bill);
    }

    if (existingCols.has('plan_rental')) {
      insertCols.push('plan_rental');
      values.push(plan_rental);
    }

    if (existingCols.has('usage_charges')) {
      insertCols.push('usage_charges');
      values.push(usage_charges);
    }

    if (existingCols.has('vat_current_period')) {
      insertCols.push('vat_current_period');
      values.push(vat_current_period);
    } else if (existingCols.has('vat_amount')) {
      insertCols.push('vat_amount');
      values.push(vat_current_period);
    }

    if (existingCols.has('clientid')) {
      insertCols.push('clientid');
      values.push(clientid);
    }

    if (existingCols.has('status')) {
      insertCols.push('status');
      values.push(status);
    }

    if (existingCols.has('pdf_filename')) {
      insertCols.push('pdf_filename');
      values.push(pdf_filename);
    }

    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
    const query = `
      INSERT INTO tbl_telecome_bill (${insertCols.join(', ')})
      VALUES (${placeholders})
      RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id
    `;

    const result = await db.query(query, values);
    const parentRow = result.rows[0];
    const parentId = parentRow[pkCol] || parentRow.bill_id || parentRow.tele_bill_id || parentRow.id;

    // 2. Insert Child Items into tbl_telecome_bill_items
    const rawItems = body.items || body.rows || fd.items || fd.rows || [
      { record_type: 'BILL', bill_number, mobile_number, category: 'Total Bill', amount: total_bill },
      { record_type: 'SERVICE', bill_number, mobile_number, category: 'Plan Rental', amount: plan_rental },
      { record_type: 'CHARGE', bill_number, mobile_number, category: 'Usage Charges', amount: usage_charges },
      { record_type: 'VAT', bill_number, mobile_number, category: 'VAT Current Period', amount: vat_current_period }
    ];

    const insertedItems = [];
    for (const item of rawItems) {
      try {
        const itemRes = await db.query(
          `INSERT INTO tbl_telecome_bill_items 
            (${itemFk}, bill_number, mobile_number, record_type, category, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            parentId,
            item.bill_number || bill_number,
            item.mobile_number || mobile_number,
            item.record_type || 'CHARGE',
            item.category || 'Service Line Item',
            parseFloat(item.amount || 0)
          ]
        ).catch(() => null);
        if (itemRes && itemRes.rows[0]) insertedItems.push(itemRes.rows[0]);
      } catch (itemErr) {
        console.error('Error inserting child item:', itemErr);
      }
    }

    // 3. Insert Call Logs into tbl_telecome_call_logs if present
    const rawLogs = body.call_logs || body.logs || fd.call_logs || [];
    const insertedLogs = [];
    for (const log of rawLogs) {
      try {
        const logRes = await db.query(
          `INSERT INTO tbl_telecome_call_logs
            (${logFk}, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            parentId,
            log.bill_number || bill_number,
            log.source_number || mobile_number,
            log.call_date || 'N/A',
            log.call_time || 'N/A',
            log.destination_number || 'N/A',
            log.duration || '00:00:00',
            log.category || 'Calls to Mobile',
            parseFloat(log.amount || 0)
          ]
        ).catch(() => null);
        if (logRes && logRes.rows[0]) insertedLogs.push(logRes.rows[0]);
      } catch (logErr) {
        console.error('Error inserting call log:', logErr);
      }
    }

    res.status(201).json({
      ...parentRow,
      id: parentId,
      tele_bill_id: parentId,
      bill_id: parentId,
      items: insertedItems,
      call_logs: insertedLogs,
      Company: parentRow.company_name,
      'Bill Number': parentRow.bill_number,
      'Mobile Number / Account': parentRow.mobile_number,
      'Telecom Provider': parentRow.telecom_provider || parentRow.provider,
      'Total Bill': parentRow.total_bill || parentRow.total_amount,
      field_data: {
        Company: parentRow.company_name,
        'Bill Number': parentRow.bill_number,
        'Mobile Number / Account': parentRow.mobile_number,
        'Telecom Provider': parentRow.telecom_provider || parentRow.provider,
        'Total Bill': parentRow.total_bill || parentRow.total_amount,
        'VAT': parentRow.vat_current_period || parentRow.vat_amount,
        'Payment Status': parentRow.status,
        items: insertedItems,
        call_logs: insertedLogs
      }
    });
  } catch (err) {
    console.error('Error creating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const { id } = req.params;
    const body = req.body || {};
    const fd = body.field_data || {};

    const bill_number = body.bill_number || fd['Bill Number'] || fd.f_billno;
    const mobile_number = body.mobile_number || fd['Mobile Number / Account'] || fd.f_account;
    const company_name = body.company_name || body.company_id || fd.Company || fd.f_company;
    const telecom_provider = body.telecom_provider || fd['Telecom Provider'] || fd.f_provider;

    const total_bill = body.total_bill || fd['Total Bill'] || fd.f_total;
    const plan_rental = body.plan_rental || fd['Service Rental'] || fd['Monthly Plan Amount'];
    const usage_charges = body.usage_charges || fd['Usage Charges'];
    const vat_current_period = body.vat_current_period || fd.VAT || fd.f_vat;
    const status = body.status || fd['Payment Status'] || fd.f_status;
    const clientid = body.clientid;

    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `);
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const setClauses = [];
    const params = [];
    let pIdx = 1;

    if (bill_number) { setClauses.push(`bill_number = $${pIdx++}`); params.push(bill_number); }
    if (mobile_number) { setClauses.push(`mobile_number = $${pIdx++}`); params.push(mobile_number); }
    if (company_name) { setClauses.push(`company_name = $${pIdx++}`); params.push(company_name); }

    if (telecom_provider) {
      if (existingCols.has('telecom_provider')) { setClauses.push(`telecom_provider = $${pIdx++}`); params.push(telecom_provider); }
      else if (existingCols.has('provider')) { setClauses.push(`provider = $${pIdx++}`); params.push(telecom_provider); }
    }

    if (total_bill) {
      if (existingCols.has('total_bill')) { setClauses.push(`total_bill = $${pIdx++}`); params.push(parseFloat(total_bill)); }
      else if (existingCols.has('total_amount')) { setClauses.push(`total_amount = $${pIdx++}`); params.push(parseFloat(total_bill)); }
    }

    if (plan_rental && existingCols.has('plan_rental')) {
      setClauses.push(`plan_rental = $${pIdx++}`); params.push(parseFloat(plan_rental));
    }

    if (usage_charges && existingCols.has('usage_charges')) {
      setClauses.push(`usage_charges = $${pIdx++}`); params.push(parseFloat(usage_charges));
    }

    if (vat_current_period) {
      if (existingCols.has('vat_current_period')) { setClauses.push(`vat_current_period = $${pIdx++}`); params.push(parseFloat(vat_current_period)); }
      else if (existingCols.has('vat_amount')) { setClauses.push(`vat_amount = $${pIdx++}`); params.push(parseFloat(vat_current_period)); }
    }

    if (status && existingCols.has('status')) { setClauses.push(`status = $${pIdx++}`); params.push(status); }
    if (clientid && existingCols.has('clientid')) { setClauses.push(`clientid = $${pIdx++}`); params.push(String(clientid)); }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    params.push(id);
    const query = `
      UPDATE tbl_telecome_bill 
      SET ${setClauses.join(', ')}
      WHERE ${pkCol} = $${pIdx}
      RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { id } = req.params;

    // Fetch bill details first to get bill_number
    const billRes = await db.query(`SELECT * FROM tbl_telecome_bill WHERE ${pkCol} = $1`, [id]).catch(() => ({ rows: [] }));
    const billNum = billRes.rows[0]?.bill_number;

    // Delete child items, call logs, and SMS logs first by FK and bill_number
    await db.query(`DELETE FROM tbl_telecome_bill_items WHERE ${itemFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    await db.query(`DELETE FROM tbl_telecome_call_logs WHERE ${logFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    await db.query(`DELETE FROM tbl_telecome_sms_logs WHERE ${logFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    if (billNum) {
      await db.query(`DELETE FROM tbl_telecome_bill_items WHERE bill_number = $1`, [billNum]).catch(() => { });
      await db.query(`DELETE FROM tbl_telecome_call_logs WHERE bill_number = $1`, [billNum]).catch(() => { });
      await db.query(`DELETE FROM tbl_telecome_sms_logs WHERE bill_number = $1`, [billNum]).catch(() => { });
    }

    // Delete parent bill
    const result = await db.query(
      `DELETE FROM tbl_telecome_bill WHERE ${pkCol} = $1 RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    // Clean up orphaned records if no bills remain
    const countRes = await db.query('SELECT COUNT(*) FROM tbl_telecome_bill').catch(() => ({ rows: [{ count: '1' }] }));
    if (parseInt(countRes.rows[0]?.count || 0) === 0) {
      await db.query('DELETE FROM tbl_telecome_call_logs').catch(() => { });
      await db.query('DELETE FROM tbl_telecome_sms_logs').catch(() => { });
      await db.query('DELETE FROM tbl_telecome_bill_items').catch(() => { });
    }

    res.status(200).json({ message: 'Telecom Bill record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomReportAnalytics = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const logFk = await getLogFkCol();

    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `).catch(() => ({ rows: [] }));
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));
    const providerCol = existingCols.has('telecom_provider') ? 'b.telecom_provider' : (existingCols.has('provider') ? 'b.provider' : "''");
    const totalCol = existingCols.has('total_bill') ? 'total_bill' : (existingCols.has('total_amount') ? 'total_amount' : '0');

    // Check existing tables
    const tblsRes = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tbl_telecome_bill', 'tbl_telecome_bill_items', 'tbl_telecome_call_logs', 'tbl_telecome_sms_logs')
    `).catch(() => ({ rows: [] }));
    const existingTbls = new Set(tblsRes.rows.map(r => r.table_name));

    const hasCallLogs = existingTbls.has('tbl_telecome_call_logs');
    const hasSmsLogs = existingTbls.has('tbl_telecome_sms_logs');

    // 1. Summary Stats
    let summaryStats = {
      total_bills: 0,
      total_expenses: 0,
      total_call_logs: 0,
      total_sms_logs: 0,
      total_intl_calls: 0,
      total_intl_cost: 0,
      total_active_lines: 0
    };

    try {
      const summaryRes = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM tbl_telecome_bill) AS total_bills,
          (SELECT COALESCE(SUM(${totalCol}), 0) FROM tbl_telecome_bill) AS total_expenses,
          ${hasCallLogs ? `(SELECT COUNT(*) FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol})` : '0'} + 
          ${hasSmsLogs ? `(SELECT COUNT(*) FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol})` : '0'} AS total_call_logs,
          ${hasSmsLogs ? `(SELECT COUNT(*) FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol})` : '0'} AS total_sms_logs,
          ${hasCallLogs ? `(SELECT COUNT(*) FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol} WHERE c.category = 'International Call')` : '0'} AS total_intl_calls,
          ${hasCallLogs ? `(SELECT COALESCE(SUM(c.amount), 0) FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol} WHERE c.category = 'International Call')` : '0'} AS total_intl_cost,
          (SELECT COUNT(DISTINCT mobile_number) FROM tbl_telecome_bill) AS total_active_lines
      `);
      if (summaryRes.rows.length > 0) {
        summaryStats = summaryRes.rows[0];
      }
    } catch (e) {
      console.error('Summary stats query error:', e);
    }

    // If total_bills is 0, return empty zeroed analytics immediately
    if (parseInt(summaryStats.total_bills || 0) === 0) {
      return res.status(200).json({
        summaryStats: {
          total_bills: 0,
          total_expenses: 0,
          total_call_logs: 0,
          total_sms_logs: 0,
          total_intl_calls: 0,
          total_intl_cost: 0,
          total_active_lines: 0
        },
        categoryBreakdown: [],
        topCallers: [],
        topDestinations: [],
        countryBreakdown: [],
        providerBreakdown: [],
        recentCallLogs: []
      });
    }

    // 2. Categories
    let categoryBreakdown = [];
    try {
      const catSubQueries = [];
      if (hasCallLogs) catSubQueries.push(`SELECT c.category, c.amount FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol}`);
      if (hasSmsLogs) catSubQueries.push(`SELECT s.sms_type AS category, s.amount FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol}`);

      if (catSubQueries.length > 0) {
        const catRes = await db.query(`
          SELECT category, COUNT(*) as count, SUM(amount) as total_amount 
          FROM (${catSubQueries.join(' UNION ALL ')}) combined_cats
          GROUP BY category 
          ORDER BY count DESC
        `);
        categoryBreakdown = catRes.rows;
      }
    } catch (e) {
      console.error('Category breakdown query error:', e);
    }

    // 3. Top Callers
    let topCallers = [];
    try {
      const callerSubQueries = [];
      if (hasCallLogs) callerSubQueries.push(`SELECT c.source_number, c.amount FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol}`);
      if (hasSmsLogs) callerSubQueries.push(`SELECT s.source_number, s.amount FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol}`);

      if (callerSubQueries.length > 0) {
        const callersRes = await db.query(`
          SELECT source_number, COUNT(*) as call_count, SUM(amount) as total_spent 
          FROM (${callerSubQueries.join(' UNION ALL ')}) combined_sources
          GROUP BY source_number 
          ORDER BY call_count DESC
        `);
        topCallers = callersRes.rows;
      }
    } catch (e) {
      console.error('Top callers query error:', e);
    }

    // 4. Top Destinations
    let topDestinations = [];
    try {
      const destSubQueries = [];
      if (hasCallLogs) destSubQueries.push(`SELECT c.destination_number, c.category, c.amount FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol}`);
      if (hasSmsLogs) destSubQueries.push(`SELECT s.destination_number, s.sms_type AS category, s.amount FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol}`);

      if (destSubQueries.length > 0) {
        const destRes = await db.query(`
          SELECT destination_number, category, COUNT(*) as call_count, SUM(amount) as total_spent 
          FROM (${destSubQueries.join(' UNION ALL ')}) combined_dests
          GROUP BY destination_number, category 
          ORDER BY call_count DESC 
          LIMIT 10
        `);
        topDestinations = destRes.rows;
      }
    } catch (e) {
      console.error('Top destinations query error:', e);
    }

    // 5. Country Breakdown
    const countryMap = {};
    const resolveCountry = (num) => {
      if (!num) return 'Overseas';
      const clean = num.replace(/^00/, '+').trim();
      if (clean.startsWith('+91') || clean.startsWith('0091')) return 'India';
      if (clean.startsWith('+254') || clean.startsWith('00254')) return 'Kenya';
      if (clean.startsWith('+98') || clean.startsWith('0098')) return 'Iran';
      if (clean.startsWith('+39') || clean.startsWith('0039')) return 'Italy';
      if (clean.startsWith('+49') || clean.startsWith('0049')) return 'Germany';
      if (clean.startsWith('+960') || clean.startsWith('00960')) return 'Maldives';
      if (clean.startsWith('+84') || clean.startsWith('0084')) return 'Vietnam';
      if (clean.startsWith('+60') || clean.startsWith('0060')) return 'Malaysia';
      if (clean.startsWith('+62') || clean.startsWith('0062')) return 'Indonesia';
      if (clean.startsWith('+261') || clean.startsWith('00261')) return 'Madagascar';
      return 'Overseas';
    };

    try {
      const intlSubQueries = [];
      if (hasCallLogs) intlSubQueries.push(`SELECT c.destination_number, c.amount FROM tbl_telecome_call_logs c INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol} WHERE c.category = 'International Call'`);
      if (hasSmsLogs) intlSubQueries.push(`SELECT s.destination_number, s.amount FROM tbl_telecome_sms_logs s INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol} WHERE s.sms_type = 'International SMS'`);

      if (intlSubQueries.length > 0) {
        const intlLogsRes = await db.query(intlSubQueries.join(' UNION ALL '));
        intlLogsRes.rows.forEach(r => {
          const cName = resolveCountry(r.destination_number);
          const amt = parseFloat(r.amount || 0);
          if (!countryMap[cName]) {
            countryMap[cName] = { country_name: cName, call_count: 0, total_spent: 0 };
          }
          countryMap[cName].call_count += 1;
          countryMap[cName].total_spent += amt;
        });
      }
    } catch (e) {
      console.error('Country breakdown error:', e);
    }

    const countryBreakdown = Object.values(countryMap).sort((a, b) => b.call_count - a.call_count);

    // Check existing SMS log columns
    const smsColsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_sms_logs'
    `).catch(() => ({ rows: [] }));
    const existingSmsCols = new Set(smsColsRes.rows.map(r => r.column_name));
    const smsSubHeading = existingSmsCols.has('sub_heading') ? 'COALESCE(s.sub_heading, s.sms_type)' : 's.sms_type';
    const smsProviderCheck = existingSmsCols.has('provider') ? "OR s.provider ILIKE 'du%'" : "";

    // 6. Provider Breakdown
    let providerBreakdown = [];
    try {
      const provSubQueries = [];
      if (hasCallLogs) {
        provSubQueries.push(`
          SELECT 
            CASE 
              WHEN c.bill_number = 'I4008352339' OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du Telecom'
              ELSE 'Etisalat'
            END AS provider, 
            c.amount
          FROM tbl_telecome_call_logs c
          INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol}
        `);
      }
      if (hasSmsLogs) {
        provSubQueries.push(`
          SELECT 
            CASE 
              WHEN s.bill_number = 'I4008352339' ${smsProviderCheck} OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du Telecom'
              ELSE 'Etisalat'
            END AS provider, 
            s.amount
          FROM tbl_telecome_sms_logs s
          INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol}
        `);
      }

      if (provSubQueries.length > 0) {
        const provRes = await db.query(`
          SELECT provider, COUNT(*) as call_count, SUM(amount) as total_spent
          FROM (${provSubQueries.join(' UNION ALL ')}) combined_providers
          GROUP BY provider
          ORDER BY call_count DESC
        `);
        providerBreakdown = provRes.rows;
      }
    } catch (e) {
      console.error('Provider breakdown query error:', e);
    }

    // 7. Recent Call Logs
    let recentCallLogs = [];
    try {
      const recentSubQueries = [];
      if (hasCallLogs) {
        recentSubQueries.push(`
          SELECT 
            c.log_id,
            c.${logFk} AS tele_bill_id,
            c.${logFk} AS bill_id,
            c.bill_number,
            c.source_number,
            c.call_date,
            c.call_time,
            c.destination_number,
            c.duration,
            c.category,
            c.category AS sub_heading,
            c.amount,
            c.created_at,
            CASE 
              WHEN c.bill_number = 'I4008352339' OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du'
              ELSE 'Etisalat'
            END AS provider
          FROM tbl_telecome_call_logs c
          INNER JOIN tbl_telecome_bill b ON c.${logFk} = b.${pkCol}
        `);
      }
      if (hasSmsLogs) {
        recentSubQueries.push(`
          SELECT 
            s.sms_log_id AS log_id,
            s.${logFk} AS tele_bill_id,
            s.${logFk} AS bill_id,
            s.bill_number,
            s.source_number,
            s.sms_date AS call_date,
            s.sms_time AS call_time,
            s.destination_number,
            '00:00:00' AS duration,
            s.sms_type AS category,
            ${smsSubHeading} AS sub_heading,
            s.amount,
            s.created_at,
            CASE 
              WHEN s.bill_number = 'I4008352339' ${smsProviderCheck} OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du'
              ELSE 'Etisalat'
            END AS provider
          FROM tbl_telecome_sms_logs s
          INNER JOIN tbl_telecome_bill b ON s.${logFk} = b.${pkCol}
        `);
      }

      if (recentSubQueries.length > 0) {
        const recentRes = await db.query(`
          SELECT * FROM (${recentSubQueries.join(' UNION ALL ')}) combined_recent
          ORDER BY log_id DESC LIMIT 5000
        `);
        recentCallLogs = recentRes.rows;
      }
    } catch (e) {
      console.error('Recent call logs query error:', e);
    }

    res.status(200).json({
      summaryStats,
      categoryBreakdown,
      topCallers,
      topDestinations,
      countryBreakdown,
      providerBreakdown,
      recentCallLogs
    });
  } catch (err) {
    console.error('Error fetching telecom report analytics:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
