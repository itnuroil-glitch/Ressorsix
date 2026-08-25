const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const resolveVehicleId = async (fieldData, clientId) => {
  if (!fieldData || !clientId) return null;
  try {
    const purchaseValues = Object.values(fieldData)
      .map(v => String(v).trim().toLowerCase())
      .filter(v => v.length > 0 && v !== 'true' && v !== 'false');

    if (purchaseValues.length === 0) return null;

    const vehiclesRes = await db.query(
      'SELECT vehicle_id, field_data FROM tbl_vehicle_details WHERE clientid = $1',
      [clientId]
    );

    for (const row of vehiclesRes.rows) {
      if (row.field_data) {
        const vehicleValues = Object.values(row.field_data)
          .map(v => String(v).trim().toLowerCase())
          .filter(v => v.length > 0);

        const hasMatch = purchaseValues.some(val => vehicleValues.includes(val));
        if (hasMatch) {
          return row.vehicle_id;
        }
      }
    }
  } catch (err) {
    console.error('Error resolving vehicle_id:', err);
  }
  return null;
};

exports.saveVehicleToll = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    
    // Resolve vehicle_id automatically from field_data if not provided
    let resolvedVehicleId = vehicle_id;
    if (!resolvedVehicleId && field_data) {
      resolvedVehicleId = await resolveVehicleId(field_data, clientid);
    }
    
    // Convert field_data to JSON string
    const jsonData = JSON.stringify(field_data || {});

    // Extract Toll ID value from field_data to check for duplicates
    let tollIdVal = null;
    if (field_data) {
      tollIdVal = field_data['1786629206891'] || field_data.toll_id || field_data.ID || field_data.id || null;
      if (!tollIdVal) {
        const keys = Object.keys(field_data);
        for (const k of keys) {
          if (k !== '1786629185586' && k !== 'toll_name' && String(field_data[k]).trim().length > 0) {
            tollIdVal = field_data[k];
            break;
          }
        }
      }
    }

    let existingRecordId = null;
    if (tollIdVal && String(tollIdVal).trim() !== '') {
      const checkQuery = `
        SELECT id FROM tbl_vehicle_toll
        WHERE (is_deleted = false OR is_deleted IS NULL)
          AND (
            field_data->>'1786629206891' = $1
            OR field_data->>'toll_id' = $1
            OR field_data->>'ID' = $1
          )
        LIMIT 1
      `;
      const existingRes = await db.query(checkQuery, [String(tollIdVal).trim()]);
      if (existingRes.rows.length > 0) {
        existingRecordId = existingRes.rows[0].id;
      }
    }

    if (existingRecordId) {
      // Rule 3: Skip row if toll_id already exists in database
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_entry_exists',
        toll_id: tollIdVal,
        message: 'Duplicate entry exists'
      });
    } else {
      const insertQuery = `
        INSERT INTO tbl_vehicle_toll (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const insertValues = [
        resolvedVehicleId || null,
        custom_field_id || null,
        jsonData,
        clientid || null,
        country_id || null,
        moduleid || 50,
        roleid || null,
        user_id || null,
        company_id || null
      ];
      const result = await db.query(insertQuery, insertValues);
      return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    // Catch unique constraint violation (code 23505) as duplicate skipped
    if (error.code === '23505' || (error.message && (error.message.includes('unique') || error.message.includes('duplicate')))) {
      return res.status(200).json({
        status: 'skipped',
        skipped: true,
        reason: 'duplicate_entry_exists',
        message: 'Duplicate entry exists'
      });
    }
    console.error('Error saving vehicle toll:', error);
    res.status(500).json({ message: 'Error saving vehicle toll', error: error.message });
  }
};

exports.getVehicleTolls = async (req, res) => {
  try {
    const { clientid, company_id } = req.query;
    let query = `
      SELECT 
        v.*, 
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          (SELECT full_name FROM employee e WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(u.email)) AND (e.is_deleted = false OR e.is_deleted IS NULL) ORDER BY e.id DESC LIMIT 1), 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = v.roleid::text AND e_fallback.clientid::text = v.clientid::text AND (e_fallback.is_deleted = false OR e_fallback.is_deleted IS NULL) ORDER BY e_fallback.id DESC LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_toll v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE (v.is_deleted = false OR v.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      params.push(clientid);
      query += ` AND v.clientid::text = $${params.length}`;
    }
    if (company_id) {
      params.push(company_id);
      query += ` AND v.company_id::text = $${params.length}`;
    }
    query += ' ORDER BY v.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicle tolls:', error);
    res.status(500).json({ message: 'Error fetching vehicle tolls' });
  }
};

exports.deleteVehicleToll = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE tbl_vehicle_toll SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle toll record not found' });
    }

    res.status(200).json({ message: 'Vehicle toll record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle toll:', error);
    res.status(500).json({ message: 'Error deleting vehicle toll' });
  }
};

exports.updateVehicleToll = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;

    let resolvedVehicleId = vehicle_id;
    if (!resolvedVehicleId && field_data) {
      resolvedVehicleId = await resolveVehicleId(field_data, clientid);
    }

    const jsonData = JSON.stringify(field_data || {});

    const query = `
      UPDATE tbl_vehicle_toll
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      resolvedVehicleId || null,
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || null,
      roleid || null,
      user_id || null,
      company_id || null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle toll record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle toll:', error);
    res.status(500).json({ message: 'Error updating vehicle toll', error: error.message });
  }
};

exports.getAccountNumbers = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT field_data 
      FROM tbl_vehicle_toll 
      WHERE (is_deleted = false OR is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND clientid::text = $1';
      params.push(String(clientid));
    }
    const result = await db.query(query, params);

    const accountNumbers = new Set();
    result.rows.forEach(row => {
      if (row.field_data) {
        let parsed = row.field_data;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
        }
        Object.values(parsed).forEach(val => {
          if (val && typeof val !== 'object' && String(val).trim().length > 0 && String(val) !== 'true' && String(val) !== 'false') {
            accountNumbers.add(String(val).trim());
          }
        });
      }
    });

    res.status(200).json(Array.from(accountNumbers).map(acc => ({ label: acc, value: acc })));
  } catch (error) {
    console.error('Error fetching account numbers:', error);
    res.status(500).json({ message: 'Error fetching account numbers', error: error.message });
  }
};

exports.getAccountNumbersByClient = async (req, res) => {
  try {
    let clientId = req.params.clientId || req.params.clientid || req.query.clientId || req.query.clientid;
    if (!clientId || clientId.trim() === '') {
      const clientRes = await db.query('SELECT id FROM client WHERE isdelete = false ORDER BY id ASC LIMIT 1');
      if (clientRes.rows.length > 0) {
        clientId = clientRes.rows[0].id;
      }
    }

    let query = `
      SELECT field_data 
      FROM tbl_vehicle_toll 
      WHERE (is_deleted = false OR is_deleted IS NULL)
    `;
    const params = [];
    if (clientId) {
      query += ' AND clientid::text = $1';
      params.push(String(clientId));
    }
    const result = await db.query(query, params);

    const accountNumbers = new Set();
    result.rows.forEach(row => {
      if (row.field_data) {
        let parsed = row.field_data;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
        }
        Object.values(parsed).forEach(val => {
          if (val && typeof val !== 'object' && String(val).trim().length > 0 && String(val) !== 'true' && String(val) !== 'false') {
            accountNumbers.add(String(val).trim());
          }
        });
      }
    });

    const list = Array.from(accountNumbers).map(acc => ({
      AccNo: acc,
      accNo: acc,
      label: acc,
      value: acc
    }));

    res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching account numbers by client:', error);
    res.status(500).json({ message: 'Error fetching account numbers by client', error: error.message });
  }
};
