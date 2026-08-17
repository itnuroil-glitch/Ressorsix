const db = require('../config/db');

exports.saveServiceDetail = async (req, res) => {
  try {
    const { service_name, service_names, description, status, clientid, client_id } = req.body;
    const effectiveClientId = clientid || client_id || req.query.clientid || null;

    if (service_names && Array.isArray(service_names) && service_names.length > 0) {
      const inserted = [];
      for (const name of service_names) {
        if (!name || !name.trim()) continue;
        const query = `
          INSERT INTO tbl_service_details (service_name, description, status, clientid, client_id, isdelete, is_deleted, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $4, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const result = await db.query(query, [name.trim(), description || '', status || 'Active', effectiveClientId]);
        inserted.push(result.rows[0]);
      }
      return res.status(201).json(inserted);
    }

    if (!service_name || !service_name.trim()) {
      return res.status(400).json({ message: 'Service Name is required' });
    }

    const query = `
      INSERT INTO tbl_service_details (service_name, description, status, clientid, client_id, isdelete, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $4, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await db.query(query, [service_name.trim(), description || '', status || 'Active', effectiveClientId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving service detail:', error);
    res.status(500).json({ message: 'Error saving service detail', error: error.message });
  }
};

exports.getServiceDetails = async (req, res) => {
  try {
    const clientId = req.query.clientid || req.query.client_id || req.params.clientid || null;
    let query;
    let params = [];

    if (clientId) {
      query = `
        SELECT * FROM tbl_service_details
        WHERE (is_deleted = false OR is_deleted IS NULL) 
          AND (isdelete = false OR isdelete IS NULL)
          AND (clientid = $1 OR client_id = $1 OR clientid IS NULL)
        ORDER BY id DESC
      `;
      params = [clientId];
    } else {
      query = `
        SELECT * FROM tbl_service_details
        WHERE (is_deleted = false OR is_deleted IS NULL) 
          AND (isdelete = false OR isdelete IS NULL)
        ORDER BY id DESC
      `;
    }

    const result = await db.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching service details:', error);
    if (error.code === '42P01') {
      return res.status(200).json([]);
    }
    res.status(500).json({ message: 'Error fetching service details' });
  }
};

exports.getServiceDetailsByClient = async (req, res) => {
  try {
    const clientId = req.params.clientid;
    const query = `
      SELECT * FROM tbl_service_details
      WHERE (is_deleted = false OR is_deleted IS NULL) 
        AND (isdelete = false OR isdelete IS NULL)
        AND (clientid = $1 OR client_id = $1 OR clientid IS NULL)
      ORDER BY id DESC
    `;
    const result = await db.query(query, [clientId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching service details by client:', error);
    res.status(500).json({ message: 'Error fetching service details by client' });
  }
};

exports.updateServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, status, clientid, client_id } = req.body;
    const effectiveClientId = clientid || client_id || null;

    if (!service_name || !service_name.trim()) {
      return res.status(400).json({ message: 'Service Name is required' });
    }

    const query = `
      UPDATE tbl_service_details
      SET service_name = $1, description = $2, status = $3, clientid = COALESCE($4, clientid), client_id = COALESCE($4, client_id), updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(query, [service_name.trim(), description || '', status || 'Active', effectiveClientId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service detail not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating service detail:', error);
    res.status(500).json({ message: 'Error updating service detail', error: error.message });
  }
};

exports.deleteServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'UPDATE tbl_service_details SET is_deleted = true, isdelete = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Service detail record not found' });
    }

    res.status(200).json({ message: 'Service detail deleted successfully' });
  } catch (error) {
    console.error('Error deleting service detail:', error);
    res.status(500).json({ message: 'Error deleting service detail' });
  }
};
