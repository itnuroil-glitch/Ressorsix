const db = require('../config/db');

const resolveVehicleId = async (fieldData, clientId, plateVal, tagNumberVal) => {
  try {
    const cleanPlate = plateVal ? String(plateVal).trim().toLowerCase() : null;
    const cleanTag = tagNumberVal ? String(tagNumberVal).trim().toLowerCase() : null;

    if (!cleanPlate && !cleanTag && !fieldData) return null;
    if (cleanPlate && (cleanPlate.includes('total') || cleanPlate.includes('amount'))) return null;

    let query = 'SELECT vehicle_id, id, field_data FROM tbl_vehicle_details';
    const params = [];
    if (clientId) {
      query += ' WHERE clientid::text = $1';
      params.push(String(clientId));
    }

    const vehiclesRes = await db.query(query, params);
    if (vehiclesRes.rows.length === 0) return null;

    // Phase 1: Exact match against vehicle fields
    for (const row of vehiclesRes.rows) {
      if (!row.field_data) continue;
      const vValues = Object.values(row.field_data).map(v => String(v).trim().toLowerCase());

      if (cleanPlate && vValues.includes(cleanPlate)) {
        return row.vehicle_id || row.id;
      }
      if (cleanTag && vValues.includes(cleanTag)) {
        return row.vehicle_id || row.id;
      }
    }

    // Phase 2: Suffix/Prefix match (e.g. "AD 21772" vs "21772")
    if (cleanPlate && cleanPlate.length >= 3) {
      for (const row of vehiclesRes.rows) {
        if (!row.field_data) continue;
        const vValues = Object.values(row.field_data).map(v => String(v).trim().toLowerCase());
        const hasMatch = vValues.some(vVal => vVal.length >= 3 && (vVal.endsWith(cleanPlate) || cleanPlate.endsWith(vVal)));
        if (hasMatch) {
          return row.vehicle_id || row.id;
        }
      }
    }
  } catch (err) {
    console.error('Error resolving vehicle_id in tollTransactionController:', err);
  }
  return null;
};

const resolveTollOverviewId = async (fieldData, clientId, tollNameVal, accountNoVal) => {
  try {
    const fd = fieldData || {};
    const accNo = accountNoVal || fd['Account No'] || fd['ACCOUNT NO'] || fd.account_no || fd['1786629206891'] || null;
    const tollName = tollNameVal || fd['Toll Name'] || fd['TOLL NAME'] || fd.toll_name || fd['1786629185586'] || null;

    let query = 'SELECT id, field_data FROM tbl_toll_overview WHERE (is_deleted = false OR is_deleted IS NULL)';
    const params = [];
    if (clientId) {
      query += ' AND clientid::text = $1';
      params.push(String(clientId));
    }

    const res = await db.query(query, params);
    if (res.rows.length === 0) return null;

    // 1. Match by Account No
    if (accNo) {
      const cleanAcc = String(accNo).trim().toLowerCase();
      for (const row of res.rows) {
        const rowFd = row.field_data || {};
        const rowAcc = String(rowFd['1786629206891'] || rowFd['Account No'] || rowFd['ACCOUNT NO'] || rowFd.account_no || '').trim().toLowerCase();
        if (rowAcc && (rowAcc === cleanAcc || cleanAcc.includes(rowAcc) || rowAcc.includes(cleanAcc))) {
          return row.id;
        }
      }
    }

    // 2. Match by Toll Name (Salik vs Darb)
    if (tollName) {
      const cleanName = String(tollName).trim().toLowerCase();
      for (const row of res.rows) {
        const rowFd = row.field_data || {};
        const rowName = String(rowFd['1786629185586'] || rowFd['Toll Name'] || rowFd['TOLL NAME'] || rowFd.toll_name || '').trim().toLowerCase();
        if (rowName && (rowName === cleanName || cleanName.includes(rowName) || rowName.includes(cleanName))) {
          return row.id;
        }
      }
    }

    // 3. Fallback Heuristics
    const isDarb = tollName && String(tollName).toLowerCase().includes('darb');
    for (const row of res.rows) {
      const rowFd = row.field_data || {};
      const rowStr = JSON.stringify(rowFd).toLowerCase();
      if (isDarb && rowStr.includes('darb')) return row.id;
      if (!isDarb && rowStr.includes('salik')) return row.id;
    }
  } catch (err) {
    console.error('Error resolving toll_overview_id in tollTransactionController:', err);
  }
  return null;
};

exports.saveTollTransaction = async (req, res) => {
  try {
    let { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, toll_overview_id } = req.body;
    const jsonData = JSON.stringify(field_data || {});

    // Helper for case-insensitive lookup in field_data
    const getFdVal = (fd, keys) => {
      if (!fd || typeof fd !== 'object') return null;
      for (const k of keys) {
        if (fd[k] !== undefined && fd[k] !== null && String(fd[k]).trim() !== '') return fd[k];
      }
      const fdKeys = Object.keys(fd);
      for (const k of keys) {
        const target = k.toLowerCase().trim();
        const matchedKey = fdKeys.find(fk => fk.toLowerCase().trim() === target);
        if (matchedKey && fd[matchedKey] !== undefined && fd[matchedKey] !== null && String(fd[matchedKey]).trim() !== '') {
          return fd[matchedKey];
        }
      }
      return null;
    };

    const fd = field_data || {};
    const transactionIdVal = req.body.transaction_id || getFdVal(fd, ['Transaction ID', 'transaction_id', 'Toll ID', 'toll_id', 'Trip ID', 'trip_id', 'ID', 'id']) || null;
    const tripDateVal = req.body.trip_date || getFdVal(fd, ['Trip Date', 'trip_date', 'Date', 'date']) || null;
    const tripTimeVal = req.body.trip_time || getFdVal(fd, ['Trip Time', 'trip_time', 'Time', 'time']) || null;
    const tollGateVal = req.body.toll_gate || getFdVal(fd, ['Toll Gate', 'toll_gate', 'Gate', 'gate', 'Toll Name', 'toll_name']) || null;
    const directionVal = req.body.direction || getFdVal(fd, ['Direction', 'direction']) || null;
    const tagNumberVal = req.body.tag_number || getFdVal(fd, ['Tag Number', 'tag_number', 'Tag No', 'tag_no', 'Tag', 'tag']) || null;
    const plateVal = req.body.plate || getFdVal(fd, ['Plate', 'plate', 'Plate Number', 'plate_number', 'Plate No', 'plate_no']) || null;
    const rawAmount = req.body.amount !== undefined && req.body.amount !== null ? req.body.amount : getFdVal(fd, ['Amount(AED)', 'amount(aed)', 'Amount', 'amount', 'Fee', 'fee']);
    const amountVal = rawAmount !== null && rawAmount !== undefined && !isNaN(parseFloat(rawAmount)) ? parseFloat(rawAmount) : null;
    const tollNameVal = req.body.toll_name || getFdVal(fd, ['Toll Name', 'toll_name', 'Toll Type', 'toll_type', '1786629185586']) || null;

    // Ignore Excel summary/total footer rows
    const isSummaryRow = 
      (plateVal && (String(plateVal).toLowerCase().includes('total') || String(plateVal).toLowerCase().includes('amount'))) ||
      (directionVal && String(directionVal).toLowerCase().includes('totaltrips')) ||
      (tollNameVal && String(tollNameVal).toLowerCase().includes('totaltrips'));

    if (isSummaryRow) {
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'summary_footer_ignored',
        message: 'Summary footer row ignored'
      });
    }

    let finalVehicleId = vehicle_id || null;
    if (!finalVehicleId) {
      finalVehicleId = await resolveVehicleId(field_data, clientid, plateVal, tagNumberVal);
    }

    let finalOverviewId = toll_overview_id || null;
    if (!finalOverviewId) {
      const accountNoVal = fd['Account No'] || fd['ACCOUNT NO'] || fd.account_no || fd['1786629206891'] || null;
      finalOverviewId = await resolveTollOverviewId(field_data, clientid, tollNameVal, accountNoVal);
    }

    // Insert row directly without duplicate checking
    const insertQuery = `
      INSERT INTO tbl_vehicle_toll_transaction (
        vehicle_id, custom_field_id, clientid, country_id, moduleid, roleid, user_id, company_id,
        transaction_id, trip_date, trip_time, toll_gate, direction, tag_number, plate, amount, toll_name, toll_overview_id,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
      const insertValues = [
        finalVehicleId,
        custom_field_id || null,
        clientid || null,
        country_id || null,
        moduleid || 53,
        roleid || null,
        user_id || null,
        company_id || null,
        transactionIdVal ? String(transactionIdVal).trim() : null,
        tripDateVal ? String(tripDateVal).trim() : null,
        tripTimeVal ? String(tripTimeVal).trim() : null,
        tollGateVal ? String(tollGateVal).trim() : null,
        directionVal ? String(directionVal).trim() : null,
        tagNumberVal ? String(tagNumberVal).trim() : null,
        plateVal ? String(plateVal).trim() : null,
        amountVal,
        tollNameVal ? String(tollNameVal).trim() : null,
        finalOverviewId
      ];
      const result = await db.query(insertQuery, insertValues);
      return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505' || (error.message && (error.message.includes('unique') || error.message.includes('duplicate')))) {
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_entry_exists',
        message: 'Duplicate entry exists'
      });
    }
    console.error('Error saving toll transaction:', error);
    res.status(500).json({ message: 'Error saving toll transaction', error: error.message });
  }
};

exports.getTollTransactionRecords = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        vd.field_data as vehicle_field_data,
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_toll_transaction v
      LEFT JOIN tbl_vehicle_details vd ON (v.vehicle_id IS NOT NULL AND (v.vehicle_id = vd.vehicle_id OR v.vehicle_id = vd.id))
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
      WHERE (v.is_deleted = false OR v.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND v.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);

    // Fetch all vehicles for dynamic lookup matching
    const allVehiclesRes = await db.query('SELECT vehicle_id, id, clientid, field_data FROM tbl_vehicle_details');
    const vehiclesList = allVehiclesRes.rows;

    const enrichedRows = result.rows.map(row => {
      let matchedV = null;

      if (row.vehicle_field_data) {
        matchedV = { field_data: row.vehicle_field_data };
      } else {
        const cleanPlate = row.plate ? String(row.plate).trim().toLowerCase() : '';
        const cleanTag = row.tag_number ? String(row.tag_number).trim().toLowerCase() : '';

        if (cleanPlate || cleanTag) {
          matchedV = vehiclesList.find(v => {
            if (row.clientid && String(v.clientid) !== String(row.clientid)) return false;
            if (!v.field_data) return false;
            const vals = Object.values(v.field_data).map(val => String(val).trim().toLowerCase());
            return (cleanPlate && vals.includes(cleanPlate)) || (cleanTag && vals.includes(cleanTag));
          });
        }
      }

      let vName = null;
      if (matchedV && matchedV.field_data) {
        const fd = matchedV.field_data;
        // Search field values for vehicle name / model or key '1780558935557'
        vName = fd['1780558935557'] || fd['vehicle_name'] || fd['name'] || Object.values(fd)[0] || null;
      }

      return {
        ...row,
        vehicle_name: vName || null
      };
    });

    res.status(200).json(enrichedRows);
  } catch (error) {
    console.error('Error fetching toll transaction records:', error);
    res.status(500).json({ message: 'Error fetching toll transaction records' });
  }
};

exports.deleteTollTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE tbl_vehicle_toll_transaction SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll transaction record not found' });
    }

    res.status(200).json({ message: 'Toll transaction record deleted successfully' });
  } catch (error) {
    console.error('Error deleting toll transaction:', error);
    res.status(500).json({ message: 'Error deleting toll transaction' });
  }
};

exports.updateTollTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, toll_overview_id } = req.body;

    const fd = field_data || {};
    const transactionIdVal = fd['Transaction ID'] || fd.transaction_id || fd['Toll ID'] || fd.toll_id || fd['Tag Number'] || fd.trip_id || fd.ID || fd.id || null;
    const tripDateVal = fd['Trip Date'] || fd.trip_date || null;
    const tripTimeVal = fd['Trip Time'] || fd.trip_time || null;
    const tollGateVal = fd['Toll Gate'] || fd.toll_gate || null;
    const directionVal = fd['Direction'] || fd.direction || null;
    const tagNumberVal = fd['Tag Number'] || fd.tag_number || null;
    const plateVal = fd['Plate'] || fd.plate || null;
    const rawAmount = fd['Amount(AED)'] || fd.amount || fd['Amount'] || null;
    const amountVal = rawAmount !== null && rawAmount !== undefined && !isNaN(parseFloat(rawAmount)) ? parseFloat(rawAmount) : null;
    const tollNameVal = fd['Toll Name'] || fd.toll_name || fd['Toll Type'] || null;

    const query = `
      UPDATE tbl_vehicle_toll_transaction
      SET vehicle_id = $1, custom_field_id = $2,
          clientid = $3, country_id = $4, moduleid = $5, roleid = $6, user_id = $7, company_id = $8,
          transaction_id = $9, trip_date = $10, trip_time = $11, toll_gate = $12, direction = $13,
          tag_number = $14, plate = $15, amount = $16, toll_name = $17, toll_overview_id = $18,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *
    `;

    const values = [
      vehicle_id || null,
      custom_field_id || null,
      clientid || null,
      country_id || null,
      moduleid || 53,
      roleid || null,
      user_id || null,
      company_id || null,
      transactionIdVal ? String(transactionIdVal).trim() : null,
      tripDateVal ? String(tripDateVal).trim() : null,
      tripTimeVal ? String(tripTimeVal).trim() : null,
      tollGateVal ? String(tollGateVal).trim() : null,
      directionVal ? String(directionVal).trim() : null,
      tagNumberVal ? String(tagNumberVal).trim() : null,
      plateVal ? String(plateVal).trim() : null,
      amountVal,
      tollNameVal ? String(tollNameVal).trim() : null,
      toll_overview_id || null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Toll transaction record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating toll transaction:', error);
    res.status(500).json({ message: 'Error updating toll transaction', error: error.message });
  }
};
