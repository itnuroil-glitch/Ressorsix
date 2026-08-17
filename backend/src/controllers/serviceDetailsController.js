const db = require('../config/db');

exports.saveServiceDetail = async (req, res) => {
  try {
    const { service_name, service_names, description, status } = req.body;

    if (service_names && Array.isArray(service_names) && service_names.length > 0) {
      const inserted = [];
      for (const name of service_names) {
        if (!name || !name.trim()) continue;
        const query = `
          INSERT INTO tbl_service_details (service_name, description, status, isdelete, is_deleted, created_at, updated_at)
          VALUES ($1, $2, $3, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const result = await db.query(query, [name.trim(), description || '', status || 'Active']);
        inserted.push(result.rows[0]);
      }
      return res.status(201).json(inserted);
    }

    if (!service_name || !service_name.trim()) {
      return res.status(400).json({ message: 'Service Name is required' });
    }

    const query = `
      INSERT INTO tbl_service_details (service_name, description, status, isdelete, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await db.query(query, [service_name.trim(), description || '', status || 'Active']);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving service detail:', error);
    res.status(500).json({ message: 'Error saving service detail', error: error.message });
  }
};

exports.getServiceDetails = async (req, res) => {
  try {
    const query = `
      SELECT * FROM tbl_service_details
      WHERE (is_deleted = false OR is_deleted IS NULL) AND (isdelete = false OR isdelete IS NULL)
      ORDER BY id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching service details:', error);
    if (error.code === '42P01') {
      return res.status(200).json([]);
    }
    res.status(500).json({ message: 'Error fetching service details' });
  }
};

exports.updateServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, description, status } = req.body;

    if (!service_name || !service_name.trim()) {
      return res.status(400).json({ message: 'Service Name is required' });
    }

    const query = `
      UPDATE tbl_service_details
      SET service_name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [service_name.trim(), description || '', status || 'Active', id]);
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
