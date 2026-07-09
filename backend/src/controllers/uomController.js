const db = require('../config/db');

exports.getAllUOMs = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tbl_uom WHERE isdelete = false ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching UOMs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createUOM = async (req, res) => {
  try {
    const { uom_names, uom_name } = req.body;
    
    // Support both single name (uom_name) or array of names (uom_names)
    let namesToInsert = [];
    if (uom_names && Array.isArray(uom_names)) {
      namesToInsert = uom_names;
    } else if (uom_name) {
      namesToInsert = [uom_name];
    }

    // Filter out empty strings
    namesToInsert = namesToInsert.map(n => n.trim()).filter(n => n);

    if (namesToInsert.length === 0) {
      return res.status(400).json({ message: 'UOM name(s) required' });
    }

    const queries = namesToInsert.map(name => {
      return db.query(
        `INSERT INTO tbl_uom (uom_name) VALUES ($1) RETURNING *`,
        [name]
      );
    });

    const results = await Promise.all(queries);
    const createdRecords = results.map(r => r.rows[0]);

    res.status(201).json(createdRecords);
  } catch (error) {
    console.error('Error creating UOM:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const { uom_name } = req.body;
    const result = await db.query(
      `UPDATE tbl_uom
       SET uom_name = $1
       WHERE id = $2 AND isdelete = false RETURNING *`,
      [uom_name.trim(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'UOM not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating UOM:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteUOM = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE tbl_uom SET isdelete = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'UOM not found' });
    res.json({ message: 'UOM deleted successfully' });
  } catch (error) {
    console.error('Error deleting UOM:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
