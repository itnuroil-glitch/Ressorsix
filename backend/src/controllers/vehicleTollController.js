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
    
    const query = `
      INSERT INTO tbl_vehicle_toll (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      company_id || null
    ];
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle toll:', error);
    res.status(500).json({ message: 'Error saving vehicle toll', error: error.message });
  }
};

exports.getVehicleTolls = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        v.*, 
        (SELECT string_agg(role, ', ') FROM role WHERE v.roleid IS NOT NULL AND id::text = ANY(string_to_array(v.roleid::text, ','))) AS role_name, 
        COALESCE(
          e.full_name, 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid = v.roleid::text AND e_fallback.clientid = v.clientid LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_toll v
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN employee e ON u.email = e.email
      WHERE (v.is_deleted = false OR v.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND v.clientid = $1';
      params.push(clientid);
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
