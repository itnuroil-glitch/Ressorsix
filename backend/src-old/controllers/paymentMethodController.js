const db = require('../config/db');

exports.getAllPaymentMethods = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tbl_payment_method WHERE isdelete = false ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createPaymentMethod = async (req, res) => {
  try {
    const { payment_name, status } = req.body;
    const result = await db.query(
      `INSERT INTO tbl_payment_method (payment_name, status) 
       VALUES ($1, $2) RETURNING *`,
      [payment_name, status || 'Active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment method:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_name, status } = req.body;
    const result = await db.query(
      `UPDATE tbl_payment_method 
       SET payment_name = $1, status = $2 
       WHERE id = $3 AND isdelete = false RETURNING *`,
      [payment_name, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment method not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE tbl_payment_method SET isdelete = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment method not found' });
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
