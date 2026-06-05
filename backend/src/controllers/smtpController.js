const db = require('../config/db');

// Get all active SMTP configurations
exports.getAllSmtp = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM smtp_configuration WHERE is_deleted = false ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error in getAllSmtp:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new SMTP configuration
exports.createSmtp = async (req, res) => {
  try {
    const {
      stmpconfiguration_name,
      status,
      smtp_host,
      smtp_port,
      smtp_usename,
      smtp_password,
      from_email,
      from_name,
      reply_to_adress,
      security_protocol,
      userid,
    } = req.body;

    if (!stmpconfiguration_name) {
      return res.status(400).json({ message: 'SMTP configuration name is required.' });
    }

    const query = `
      INSERT INTO smtp_configuration (
        stmpconfiguration_name,
        status,
        smtp_host,
        smtp_port,
        smtp_usename,
        smtp_password,
        from_email,
        from_name,
        reply_to_adress,
        security_protocol,
        userid,
        is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
      RETURNING *
    `;

    const values = [
      stmpconfiguration_name,
      status !== undefined ? parseInt(status, 10) : 1,
      smtp_host || null,
      smtp_port !== undefined && smtp_port !== null ? parseInt(smtp_port, 10) : null,
      smtp_usename || null,
      smtp_password || null,
      from_email || null,
      from_name || null,
      reply_to_adress || null,
      security_protocol || null,
      userid !== undefined && userid !== null ? parseInt(userid, 10) : null,
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in createSmtp:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update SMTP configuration
exports.updateSmtp = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stmpconfiguration_name,
      status,
      smtp_host,
      smtp_port,
      smtp_usename,
      smtp_password,
      from_email,
      from_name,
      reply_to_adress,
      security_protocol,
      userid,
    } = req.body;

    const checkResult = await db.query(
      'SELECT * FROM smtp_configuration WHERE id = $1 AND is_deleted = false',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'SMTP Configuration not found.' });
    }

    const query = `
      UPDATE smtp_configuration
      SET
        stmpconfiguration_name = COALESCE($1, stmpconfiguration_name),
        status = COALESCE($2, status),
        smtp_host = COALESCE($3, smtp_host),
        smtp_port = COALESCE($4, smtp_port),
        smtp_usename = COALESCE($5, smtp_usename),
        smtp_password = COALESCE($6, smtp_password),
        from_email = COALESCE($7, from_email),
        from_name = COALESCE($8, from_name),
        reply_to_adress = COALESCE($9, reply_to_adress),
        security_protocol = COALESCE($10, security_protocol),
        userid = COALESCE($11, userid)
      WHERE id = $12 AND is_deleted = false
      RETURNING *
    `;

    const values = [
      stmpconfiguration_name,
      status !== undefined ? parseInt(status, 10) : null,
      smtp_host,
      smtp_port !== undefined && smtp_port !== null ? parseInt(smtp_port, 10) : null,
      smtp_usename,
      smtp_password,
      from_email,
      from_name,
      reply_to_adress,
      security_protocol,
      userid !== undefined && userid !== null ? parseInt(userid, 10) : null,
      id,
    ];

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in updateSmtp:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Soft delete SMTP configuration
exports.deleteSmtp = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE smtp_configuration SET is_deleted = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SMTP Configuration not found.' });
    }

    res.json({ message: 'SMTP Configuration soft-deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteSmtp:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
