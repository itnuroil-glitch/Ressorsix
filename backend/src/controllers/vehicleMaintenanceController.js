const db = require('../config/db');

exports.saveVehicleMaintenance = async (req, res) => {
  try {
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const jsonData = typeof field_data === 'object' ? JSON.stringify(field_data) : field_data;

    const query = `
      INSERT INTO tbl_vehicle_maintenance (vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      vehicle_id || null,
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || 75,
      roleid || null,
      user_id || null,
      company_id || null
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving vehicle maintenance:', error);
    res.status(500).json({ message: 'Error saving vehicle maintenance', error: error.message });
  }
};

exports.getMaintenanceRecords = async (req, res) => {
  try {
    const { clientid } = req.query;
    let query = `
      SELECT 
        m.*, 
        c.company_name,
        COALESCE(
          (SELECT full_name FROM employee e WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(u.email)) AND (e.is_deleted = false OR e.is_deleted IS NULL) ORDER BY e.id DESC LIMIT 1), 
          u.email, 
          (SELECT full_name FROM employee e_fallback WHERE e_fallback.roleid::text = m.roleid::text AND e_fallback.clientid::text = m.clientid::text AND (e_fallback.is_deleted = false OR e_fallback.is_deleted IS NULL) ORDER BY e_fallback.id DESC LIMIT 1)
        ) AS employee_name
      FROM tbl_vehicle_maintenance m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN company c ON m.company_id::text = c.id::text
      WHERE (m.is_deleted = false OR m.is_deleted IS NULL)
    `;
    const params = [];
    if (clientid) {
      query += ' AND m.clientid::text = $1';
      params.push(clientid);
    }
    query += ' ORDER BY m.id DESC';

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    // If table doesn't exist yet, return empty array gracefully
    if (error.code === '42P01') {
      return res.status(200).json([]);
    }
    res.status(500).json({ message: 'Error fetching maintenance records' });
  }
};

exports.deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE tbl_vehicle_maintenance SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    res.status(200).json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ message: 'Error deleting maintenance record' });
  }
};

exports.updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, custom_field_id, field_data, clientid, country_id, moduleid, roleid, user_id, company_id } = req.body;
    const jsonData = typeof field_data === 'object' ? JSON.stringify(field_data) : field_data;

    const query = `
      UPDATE tbl_vehicle_maintenance
      SET vehicle_id = $1, custom_field_id = $2, field_data = $3,
          clientid = $4, country_id = $5, moduleid = $6, roleid = $7, user_id = $8, company_id = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;

    const values = [
      vehicle_id || null,
      custom_field_id || null,
      jsonData,
      clientid || null,
      country_id || null,
      moduleid || 75,
      roleid || null,
      user_id || null,
      company_id || null,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    res.status(500).json({ message: 'Error updating maintenance record', error: error.message });
  }
};
