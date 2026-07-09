const db = require('../config/db');

exports.getAllVats = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tbl_vat WHERE isdelete = false ORDER BY vat ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching VATs:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createVat = async (req, res) => {
  try {
    const { vats, vat } = req.body;
    let vatsToInsert = [];

    // Support both single rate (vat) or array of rates (vats)
    if (vats && Array.isArray(vats)) {
      vatsToInsert = vats;
    } else if (vat !== undefined && vat !== null) {
      vatsToInsert = [vat];
    }

    if (vatsToInsert.length === 0) {
      return res.status(400).json({ message: 'VAT rate(s) required' });
    }

    const insertedRows = [];
    for (const val of vatsToInsert) {
      const stringVal = String(val).trim();
      if (!stringVal) continue;

      const result = await db.query(
        `INSERT INTO tbl_vat (vat) VALUES ($1) RETURNING *`,
        [stringVal]
      );
      insertedRows.push(result.rows[0]);
    }

    res.status(201).json(insertedRows);
  } catch (error) {
    console.error('Error creating VAT:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateVat = async (req, res) => {
  try {
    const { id } = req.params;
    const { vat } = req.body;
    const stringVal = String(vat).trim();

    if (!stringVal) {
      return res.status(400).json({ message: 'Valid VAT rate is required' });
    }

    const result = await db.query(
      `UPDATE tbl_vat
       SET vat = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [stringVal, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'VAT record not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating VAT:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteVat = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE tbl_vat SET isdelete = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'VAT record not found' });
    res.json({ message: 'VAT record deleted successfully' });
  } catch (error) {
    console.error('Error deleting VAT:', error);
    res.status(500).json({ error: error.message });
  }
};
