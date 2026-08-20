const db = require('../config/db');

exports.getAllTelecomBills = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        tb.*, 
        tb.tele_bill_id AS id,
        c.client_name,
        co.name as country_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON tb.country_id = co.id
      WHERE 1=1
    `;
    let params = [];
    if (clientid) {
      query += ' AND tb.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ' ORDER BY tb.tele_bill_id DESC';
    const result = await db.query(query, params);

    // Fetch child line items from tbl_telecome_bill_items
    const itemsRes = await db.query('SELECT * FROM tbl_telecome_bill_items ORDER BY item_id ASC').catch(() => ({ rows: [] }));
    const itemsMap = new Map();
    (itemsRes.rows || []).forEach(item => {
      const bId = String(item.tele_bill_id);
      if (!itemsMap.has(bId)) itemsMap.set(bId, []);
      itemsMap.get(bId).push(item);
    });

    // Fetch call logs from tbl_telecome_call_logs
    const logsRes = await db.query('SELECT * FROM tbl_telecome_call_logs ORDER BY log_id ASC').catch(() => ({ rows: [] }));
    const logsMap = new Map();
    (logsRes.rows || []).forEach(log => {
      const bId = String(log.tele_bill_id);
      if (!logsMap.has(bId)) logsMap.set(bId, []);
      logsMap.get(bId).push(log);
    });

    const formattedRows = result.rows.map(row => {
      const bId = String(row.tele_bill_id);
      const childItems = itemsMap.get(bId) || [];
      const callLogs = logsMap.get(bId) || [];

      return {
        ...row,
        Company: row.company_name,
        'Bill Number': row.bill_number,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': row.telecom_provider,
        'Total Bill': row.total_bill,
        'VAT': row.vat_current_period,
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
          'Telecom Provider': row.telecom_provider,
          'Total Bill': row.total_bill,
          'VAT': row.vat_current_period,
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
    const { id } = req.params;
    const query = `
      SELECT tb.*, tb.tele_bill_id AS id, c.client_name, co.name as country_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      LEFT JOIN country co ON tb.country_id = co.id
      WHERE tb.tele_bill_id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }
    const row = result.rows[0];

    const itemsRes = await db.query('SELECT * FROM tbl_telecome_bill_items WHERE tele_bill_id = $1 ORDER BY item_id ASC', [id]).catch(() => ({ rows: [] }));
    const logsRes = await db.query('SELECT * FROM tbl_telecome_call_logs WHERE tele_bill_id = $1 ORDER BY log_id ASC', [id]).catch(() => ({ rows: [] }));

    res.status(200).json({
      ...row,
      items: itemsRes.rows,
      call_logs: logsRes.rows,
      field_data: {
        Company: row.company_name,
        'Bill Number': row.bill_number,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': row.telecom_provider,
        'Total Bill': row.total_bill,
        'VAT': row.vat_current_period,
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
    const { id } = req.params;
    const logsRes = await db.query('SELECT * FROM tbl_telecome_call_logs WHERE tele_bill_id = $1 ORDER BY log_id ASC', [id]);
    res.status(200).json(logsRes.rows || []);
  } catch (err) {
    console.error('Error fetching Call Logs by bill id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTelecomBill = async (req, res) => {
  try {
    const body = req.body || {};
    const fd = body.field_data || {};

    const bill_number = body.bill_number || fd['Bill Number'] || fd.f_billno || '';
    const mobile_number = body.mobile_number || fd['Mobile Number / Account'] || fd.f_account || '';
    const company_name = body.company_name || body.company_id || fd.Company || fd.f_company || '';
    const telecom_provider = body.telecom_provider || fd['Telecom Provider'] || fd.f_provider || '';
    
    const total_bill = parseFloat(body.total_bill || fd['Total Bill'] || fd.f_total || 0) || 0;
    const plan_rental = parseFloat(body.plan_rental || fd['Service Rental'] || fd['Monthly Plan Amount'] || fd.f_rental || 0) || 0;
    const usage_charges = parseFloat(body.usage_charges || fd['Usage Charges'] || fd.f_usage || 0) || 0;
    const special_number = parseFloat(body.special_number || 0) || 0;
    const premium_sms = parseFloat(body.premium_sms || 0) || 0;
    const mparking_total = parseFloat(body.mparking_total || 0) || 0;
    const vat_current_period = parseFloat(body.vat_current_period || fd.VAT || fd.f_vat || 0) || 0;
    const previous_bill = parseFloat(body.previous_bill || 0) || 0;
    const payment_received = parseFloat(body.payment_received || 0) || 0;
    const balance_carried_forward = parseFloat(body.balance_carried_forward || 0.00) || 0;
    const local_mobile_call = parseFloat(body.local_mobile_call || 0.00) || 0;
    const local_telephone_call = parseFloat(body.local_telephone_call || 0.00) || 0;
    const international_call = parseFloat(body.international_call || 0.00) || 0;
    const incoming_roaming_call = parseFloat(body.incoming_roaming_call || 0.00) || 0;
    const local_data = parseFloat(body.local_data || 0.00) || 0;
    const roaming_data = parseFloat(body.roaming_data || 0.00) || 0;

    const clientid = body.clientid ? String(body.clientid) : null;
    const country_id = body.country_id ? parseInt(body.country_id, 10) : 1;
    const status = body.status || fd['Payment Status'] || fd.f_status || 'Pending';
    const pdf_filename = body.pdf_filename || fd['Invoice PDF'] || null;

    // 1. Insert Parent Record into tbl_telecome_bill
    const query = `
      INSERT INTO tbl_telecome_bill (
        bill_number, mobile_number, company_name, telecom_provider,
        total_bill, plan_rental, usage_charges, special_number, premium_sms, mparking_total,
        vat_current_period, previous_bill, payment_received, balance_carried_forward,
        local_mobile_call, local_telephone_call, international_call, incoming_roaming_call,
        local_data, roaming_data, clientid, country_id, status, pdf_filename,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *, tele_bill_id AS id
    `;

    const params = [
      bill_number, mobile_number, company_name, telecom_provider,
      total_bill, plan_rental, usage_charges, special_number, premium_sms, mparking_total,
      vat_current_period, previous_bill, payment_received, balance_carried_forward,
      local_mobile_call, local_telephone_call, international_call, incoming_roaming_call,
      local_data, roaming_data, clientid, country_id, status, pdf_filename
    ];

    const result = await db.query(query, params);
    const parentRow = result.rows[0];
    const parentId = parentRow.tele_bill_id;

    // 2. Insert Child Items into tbl_telecome_bill_items
    const rawItems = body.items || body.rows || fd.items || fd.rows || [
      { record_type: 'BILL', bill_number, mobile_number, category: 'Total Bill', amount: total_bill },
      { record_type: 'SERVICE', bill_number, mobile_number, category: 'Plan Rental', amount: plan_rental },
      { record_type: 'CHARGE', bill_number, mobile_number, category: 'Usage Charges', amount: usage_charges },
      { record_type: 'CHARGE', bill_number, mobile_number, category: 'Special Number', amount: special_number },
      { record_type: 'CHARGE', bill_number, mobile_number, category: 'Premium SMS', amount: premium_sms },
      { record_type: 'PARKING', bill_number, mobile_number, category: 'mParking Total', amount: mparking_total },
      { record_type: 'VAT', bill_number, mobile_number, category: 'VAT Current Period', amount: vat_current_period },
      { record_type: 'PAYMENT', bill_number, mobile_number, category: 'Previous Bill', amount: previous_bill },
      { record_type: 'PAYMENT', bill_number, mobile_number, category: 'Payment Received', amount: payment_received }
    ];

    const insertedItems = [];
    for (const item of rawItems) {
      try {
        const itemRes = await db.query(
          `INSERT INTO tbl_telecome_bill_items 
            (tele_bill_id, bill_number, mobile_number, record_type, category, amount, created_at)
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
        );
        insertedItems.push(itemRes.rows[0]);
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
            (tele_bill_id, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount, created_at)
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
        );
        insertedLogs.push(logRes.rows[0]);
      } catch (logErr) {
        console.error('Error inserting call log:', logErr);
      }
    }

    res.status(201).json({
      ...parentRow,
      items: insertedItems,
      call_logs: insertedLogs,
      Company: parentRow.company_name,
      'Bill Number': parentRow.bill_number,
      'Mobile Number / Account': parentRow.mobile_number,
      'Telecom Provider': parentRow.telecom_provider,
      'Total Bill': parentRow.total_bill,
      field_data: {
        Company: parentRow.company_name,
        'Bill Number': parentRow.bill_number,
        'Mobile Number / Account': parentRow.mobile_number,
        'Telecom Provider': parentRow.telecom_provider,
        'Total Bill': parentRow.total_bill,
        'VAT': parentRow.vat_current_period,
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

    const query = `
      UPDATE tbl_telecome_bill 
      SET bill_number = COALESCE($1, bill_number),
          mobile_number = COALESCE($2, mobile_number),
          company_name = COALESCE($3, company_name),
          telecom_provider = COALESCE($4, telecom_provider),
          total_bill = COALESCE($5, total_bill),
          plan_rental = COALESCE($6, plan_rental),
          usage_charges = COALESCE($7, usage_charges),
          vat_current_period = COALESCE($8, vat_current_period),
          status = COALESCE($9, status),
          clientid = COALESCE($10, clientid),
          updated_at = CURRENT_TIMESTAMP
      WHERE tele_bill_id = $11
      RETURNING *, tele_bill_id AS id
    `;

    const result = await db.query(query, [
      bill_number || null,
      mobile_number || null,
      company_name || null,
      telecom_provider || null,
      total_bill ? parseFloat(total_bill) : null,
      plan_rental ? parseFloat(plan_rental) : null,
      usage_charges ? parseFloat(usage_charges) : null,
      vat_current_period ? parseFloat(vat_current_period) : null,
      status || null,
      clientid ? String(clientid) : null,
      id
    ]);

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
    const { id } = req.params;
    
    // Delete child items and call logs first
    await db.query('DELETE FROM tbl_telecome_bill_items WHERE tele_bill_id = $1', [id]).catch(() => {});
    await db.query('DELETE FROM tbl_telecome_call_logs WHERE tele_bill_id = $1', [id]).catch(() => {});

    // Delete parent bill
    const result = await db.query(
      `DELETE FROM tbl_telecome_bill WHERE tele_bill_id = $1 RETURNING *, tele_bill_id AS id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    res.status(200).json({ message: 'Telecom Bill record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomReportAnalytics = async (req, res) => {
  try {
    const summaryRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM tbl_telecome_bill) AS total_bills,
        (SELECT COALESCE(SUM(total_bill), 0) FROM tbl_telecome_bill) AS total_expenses,
        (SELECT COUNT(*) FROM tbl_telecome_call_logs) AS total_call_logs,
        (SELECT COUNT(*) FROM tbl_telecome_call_logs WHERE category = 'International Call') AS total_intl_calls,
        (SELECT COALESCE(SUM(amount), 0) FROM tbl_telecome_call_logs WHERE category = 'International Call') AS total_intl_cost
    `);

    const categoryRes = await db.query(`
      SELECT category, COUNT(*) as count, SUM(amount) as total_amount 
      FROM tbl_telecome_call_logs 
      GROUP BY category 
      ORDER BY count DESC
    `);

    const topCallersRes = await db.query(`
      SELECT source_number, COUNT(*) as call_count, SUM(amount) as total_spent 
      FROM tbl_telecome_call_logs 
      GROUP BY source_number 
      ORDER BY call_count DESC
    `);

    const topDestRes = await db.query(`
      SELECT destination_number, category, COUNT(*) as call_count, SUM(amount) as total_spent 
      FROM tbl_telecome_call_logs 
      GROUP BY destination_number, category 
      ORDER BY call_count DESC 
      LIMIT 10
    `);

    const intlLogsRes = await db.query(`
      SELECT destination_number, amount 
      FROM tbl_telecome_call_logs 
      WHERE category = 'International Call'
    `);

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

    intlLogsRes.rows.forEach(r => {
      const cName = resolveCountry(r.destination_number);
      const amt = parseFloat(r.amount || 0);
      if (!countryMap[cName]) {
        countryMap[cName] = { country_name: cName, call_count: 0, total_spent: 0 };
      }
      countryMap[cName].call_count += 1;
      countryMap[cName].total_spent += amt;
    });

    const countryBreakdown = Object.values(countryMap).sort((a, b) => b.call_count - a.call_count);

    const providerRes = await db.query(`
      SELECT COALESCE(b.telecom_provider, 'Etisalat') AS provider, COUNT(*) as call_count, SUM(c.amount) as total_spent
      FROM tbl_telecome_call_logs c
      LEFT JOIN tbl_telecome_bill b ON c.tele_bill_id = b.tele_bill_id
      GROUP BY COALESCE(b.telecom_provider, 'Etisalat')
      ORDER BY call_count DESC
    `);

    const recentLogsRes = await db.query(`
      SELECT c.*, COALESCE(b.telecom_provider, 'Etisalat') AS provider 
      FROM tbl_telecome_call_logs c 
      LEFT JOIN tbl_telecome_bill b ON c.tele_bill_id = b.tele_bill_id 
      ORDER BY c.log_id DESC LIMIT 1000
    `);

    res.status(200).json({
      summaryStats: summaryRes.rows[0],
      categoryBreakdown: categoryRes.rows,
      topCallers: topCallersRes.rows,
      topDestinations: topDestRes.rows,
      countryBreakdown: countryBreakdown,
      providerBreakdown: providerRes.rows,
      recentCallLogs: recentLogsRes.rows
    });
  } catch (err) {
    console.error('Error fetching telecom report analytics:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
