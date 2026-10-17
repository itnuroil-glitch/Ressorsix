const db = require('../config/db');

// Keep tbl_tele_reassignment in step with the connection's employee (used by add / edit connection)
const syncAssignmentRow = async (connectionId, prevEmployee, newEmployee, assignedFrom, performedBy) => {
  try {
    const isFree = (n) => !n || !String(n).trim() || String(n).toLowerCase().includes('unassigned');
    await ensureAssignmentTable();
    const active = await db.query(
      `SELECT id, employee_name FROM tbl_tele_reassignment WHERE connection_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [connectionId]
    );
    const activeName = active.rows.length ? active.rows[0].employee_name : null;
    if (!isFree(newEmployee) && activeName && activeName.trim() === String(newEmployee).trim()) return;
    if (active.rows.length) {
      await db.query(
        `UPDATE tbl_tele_reassignment SET assigned_to = $1, status = 'INACTIVE' WHERE id = $2`,
        [assignedFrom || null, active.rows[0].id]
      );
    }
    if (!isFree(newEmployee)) {
      await db.query(
        `INSERT INTO tbl_tele_reassignment (connection_id, employee_name, assigned_from, performed_by, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`,
        [connectionId, String(newEmployee).trim(), assignedFrom || null, performedBy || 'Admin']
      );
    }
  } catch (err) {
    console.error('Error syncing reassignment history:', err);
  }
};

// 1. GET ALL CONNECTIONS (with optional filters: company, type, status, search, client_id)
exports.getAllConnections = async (req, res) => {
  try {
    const clientId = req.query.client_id || req.query.clientid;
    const { company, type, status, search } = req.query;

    let queryText = `
      SELECT * FROM tbl_tele_connection
      WHERE is_deleted = 0
    `;
    const params = [];

    if (clientId) {
      params.push(clientId);
      queryText += ` AND (client_id = $${params.length} OR client_id IS NULL)`;
    }

    if (company && company !== 'All Companies') {
      params.push(company);
      queryText += ` AND company_name = $${params.length}`;
    }

    if (type && type !== 'All Types') {
      params.push(type);
      queryText += ` AND connection_type = $${params.length}`;
    }

    if (status && status !== 'All') {
      if (status === 'Assigned') {
        queryText += ` AND status = 'ACTIVE' AND LOWER(employee_name) != 'unassigned'`;
      } else if (status === 'Unassigned') {
        queryText += ` AND (status = 'UNASSIGNED' OR LOWER(employee_name) = 'unassigned')`;
      } else {
        params.push(status);
        queryText += ` AND status = $${params.length}`;
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term);
      queryText += ` AND (
        LOWER(connection_number) LIKE $${params.length} OR
        LOWER(employee_name) LIKE $${params.length} OR
        LOWER(provider) LIKE $${params.length} OR
        LOWER(company_name) LIKE $${params.length} OR
        LOWER(COALESCE(plan_name, '')) LIKE $${params.length}
      )`;
    }

    queryText += ` ORDER BY id DESC`;

    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching telecom connections:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 2. GET SINGLE CONNECTION BY ID
exports.getConnectionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT * FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching connection by ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 3. CREATE CONNECTION (INSERT)
exports.createConnection = async (req, res) => {
  try {
    const {
      connection_type,
      company_name,
      sub_company,
      provider,
      connection_number,
      account_number,
      iccid,
      contract_no,
      contract_from,
      contract_to,
      plan_name,
      monthly_plan_amount,
      data_allowance,
      data_unit,
      local_minutes,
      international_minutes,
      local_sms,
      international_sms,
      cug,
      employee_name,
      assigned_from,
      notes,
      status,
    } = req.body;

    const clientId = req.body.client_id || req.body.clientid || 1;
    const createdBy = req.body.created_by || 'Admin';

    if (!connection_number || !connection_number.trim()) {
      return res.status(400).json({ message: 'Connection / Mobile number is required.' });
    }
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ message: 'Company name is required.' });
    }
    if (!provider || !provider.trim()) {
      return res.status(400).json({ message: 'Telecom provider is required.' });
    }

    // Duplicate check for active line number under this client
    const checkDuplicate = await db.query(
      `SELECT id FROM tbl_tele_connection 
       WHERE LOWER(connection_number) = LOWER($1) AND is_deleted = 0 AND (client_id = $2 OR client_id IS NULL)`,
      [connection_number.trim(), clientId]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        message: `Connection number '${connection_number.trim()}' is already registered.`
      });
    }

    const isUnassigned = !employee_name || !employee_name.trim() || employee_name.toLowerCase().includes('unassigned');
    const finalStatus = status || (isUnassigned ? 'UNASSIGNED' : 'ACTIVE');

    const insertQuery = `
      INSERT INTO tbl_tele_connection (
        connection_type, company_name, sub_company, provider,
        connection_number, account_number, iccid, contract_no,
        contract_from, contract_to, plan_name, monthly_plan_amount,
        data_allowance, data_unit, local_minutes, international_minutes,
        local_sms, international_sms, cug, employee_name, assigned_from,
        notes, status, client_id, created_by, is_deleted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, 0
      )
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      connection_type || 'SIM',
      company_name.trim(),
      sub_company || null,
      provider.trim(),
      connection_number.trim(),
      account_number || null,
      iccid || null,
      contract_no || null,
      contract_from || null,
      contract_to || null,
      plan_name || null,
      parseFloat(monthly_plan_amount) || 0.00,
      data_allowance || null,
      data_unit || 'GB',
      local_minutes || null,
      international_minutes || null,
      local_sms || null,
      international_sms || null,
      cug || null,
      isUnassigned ? 'Unassigned' : employee_name.trim(),
      assigned_from || null,
      notes || null,
      finalStatus,
      clientId,
      createdBy
    ]);

    if (!isUnassigned) {
      await syncAssignmentRow(result.rows[0].id, null, employee_name, assigned_from, createdBy);
    }

    res.status(201).json({
      message: 'Telecom connection created successfully.',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 4. UPDATE CONNECTION (EDIT)
exports.updateConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      connection_type,
      company_name,
      sub_company,
      provider,
      connection_number,
      account_number,
      iccid,
      contract_no,
      contract_from,
      contract_to,
      plan_name,
      monthly_plan_amount,
      data_allowance,
      data_unit,
      local_minutes,
      international_minutes,
      local_sms,
      international_sms,
      cug,
      employee_name,
      assigned_from,
      notes,
      status,
      updated_by
    } = req.body;

    // Check record existence
    const existing = await db.query(
      `SELECT * FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    // Check duplicate line number if updated
    if (connection_number && connection_number.trim()) {
      const checkDuplicate = await db.query(
        `SELECT id FROM tbl_tele_connection 
         WHERE LOWER(connection_number) = LOWER($1) AND id != $2 AND is_deleted = 0`,
        [connection_number.trim(), id]
      );

      if (checkDuplicate.rows.length > 0) {
        return res.status(409).json({
          message: `Connection number '${connection_number.trim()}' is already used by another connection.`
        });
      }
    }

    const current = existing.rows[0];
    const isUnassigned = employee_name !== undefined 
      ? (!employee_name || !employee_name.trim() || employee_name.toLowerCase().includes('unassigned'))
      : (current.employee_name === 'Unassigned');

    const updateQuery = `
      UPDATE tbl_tele_connection
      SET
        connection_type = COALESCE($1, connection_type),
        company_name = COALESCE($2, company_name),
        sub_company = COALESCE($3, sub_company),
        provider = COALESCE($4, provider),
        connection_number = COALESCE($5, connection_number),
        account_number = COALESCE($6, account_number),
        iccid = COALESCE($7, iccid),
        contract_no = COALESCE($8, contract_no),
        contract_from = COALESCE($9, contract_from),
        contract_to = COALESCE($10, contract_to),
        plan_name = COALESCE($11, plan_name),
        monthly_plan_amount = COALESCE($12, monthly_plan_amount),
        data_allowance = COALESCE($13, data_allowance),
        data_unit = COALESCE($14, data_unit),
        local_minutes = COALESCE($15, local_minutes),
        international_minutes = COALESCE($16, international_minutes),
        local_sms = COALESCE($17, local_sms),
        international_sms = COALESCE($18, international_sms),
        cug = COALESCE($19, cug),
        employee_name = COALESCE($20, employee_name),
        assigned_from = COALESCE($21, assigned_from),
        notes = COALESCE($22, notes),
        status = COALESCE($23, status),
        updated_by = COALESCE($24, updated_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $25 AND is_deleted = 0
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      connection_type || null,
      company_name ? company_name.trim() : null,
      sub_company !== undefined ? sub_company : null,
      provider ? provider.trim() : null,
      connection_number ? connection_number.trim() : null,
      account_number !== undefined ? account_number : null,
      iccid !== undefined ? iccid : null,
      contract_no !== undefined ? contract_no : null,
      contract_from !== undefined ? contract_from : null,
      contract_to !== undefined ? contract_to : null,
      plan_name !== undefined ? plan_name : null,
      monthly_plan_amount !== undefined ? (parseFloat(monthly_plan_amount) || 0) : null,
      data_allowance !== undefined ? data_allowance : null,
      data_unit !== undefined ? data_unit : null,
      local_minutes !== undefined ? local_minutes : null,
      international_minutes !== undefined ? international_minutes : null,
      local_sms !== undefined ? local_sms : null,
      international_sms !== undefined ? international_sms : null,
      cug !== undefined ? cug : null,
      employee_name !== undefined ? (isUnassigned ? 'Unassigned' : employee_name.trim()) : null,
      assigned_from !== undefined ? assigned_from : null,
      notes !== undefined ? notes : null,
      status || (isUnassigned ? 'UNASSIGNED' : 'ACTIVE'),
      updated_by || 'Admin',
      id
    ]);

    if (employee_name !== undefined && result.rows.length > 0) {
      const newName = isUnassigned ? 'Unassigned' : employee_name.trim();
      if (newName !== (current.employee_name || '')) {
        await syncAssignmentRow(id, current.employee_name, newName, assigned_from, updated_by);
      }
    }

    res.status(200).json({
      message: 'Telecom connection updated successfully.',
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 5. DELETE CONNECTION (SOFT DELETE)
exports.deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE tbl_tele_connection 
       SET is_deleted = 1, status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = 0
       RETURNING id, connection_number`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found or already deleted.' });
    }

    res.status(200).json({
      message: `Connection '${result.rows[0].connection_number}' deleted successfully.`,
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ---------------------------------------------------------------------------
// NUMBER ASSIGNMENT (history, assign to another employee, release number)
// ---------------------------------------------------------------------------
const ensureAssignmentTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tbl_tele_reassignment (
      id SERIAL PRIMARY KEY,
      connection_id INTEGER NOT NULL REFERENCES tbl_tele_connection(id) ON DELETE CASCADE,
      employee_name VARCHAR(255) NOT NULL,
      assigned_from VARCHAR(20),
      assigned_to VARCHAR(20),
      reason VARCHAR(100),
      performed_by VARCHAR(255),
      status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Make sure the current holder has an open history row (older lines were assigned before history existed)
const ensureOpenAssignment = async (conn) => {
  if (!conn.employee_name || conn.employee_name.toLowerCase().includes('unassigned')) return;
  const open = await db.query(
    `SELECT id FROM tbl_tele_reassignment WHERE connection_id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [conn.id]
  );
  if (open.rows.length === 0) {
    await db.query(
      `INSERT INTO tbl_tele_reassignment (connection_id, employee_name, assigned_from, performed_by, status)
       VALUES ($1, $2, $3, 'System', 'ACTIVE')`,
      [conn.id, conn.employee_name, conn.assigned_from || null]
    );
  }
};

exports.getAssignmentHistory = async (req, res) => {
  try {
    await ensureAssignmentTable();
    const { id } = req.params;
    const conn = await db.query(`SELECT * FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0`, [id]);
    if (conn.rows.length === 0) return res.status(404).json({ message: 'Connection not found.' });
    await ensureOpenAssignment(conn.rows[0]);
    const result = await db.query(
      `SELECT * FROM tbl_tele_reassignment WHERE connection_id = $1 ORDER BY id DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Assign the line to another employee: closes the current holder's row and opens a new one
exports.assignConnection = async (req, res) => {
  try {
    await ensureAssignmentTable();
    const { id } = req.params;
    const { employee_name, assigned_from, performed_by } = req.body;
    if (!employee_name || !employee_name.trim()) return res.status(400).json({ message: 'Employee is required.' });
    if (!assigned_from) return res.status(400).json({ message: 'Assigned From date is required.' });

    const conn = await db.query(`SELECT * FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0`, [id]);
    if (conn.rows.length === 0) return res.status(404).json({ message: 'Connection not found.' });

    await ensureOpenAssignment(conn.rows[0]);
    await db.query(
      `UPDATE tbl_tele_reassignment SET assigned_to = $1, status = 'INACTIVE' WHERE connection_id = $2 AND status = 'ACTIVE'`,
      [assigned_from, id]
    );
    await db.query(
      `INSERT INTO tbl_tele_reassignment (connection_id, employee_name, assigned_from, performed_by, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [id, employee_name.trim(), assigned_from, performed_by || 'Admin']
    );
    const updated = await db.query(
      `UPDATE tbl_tele_connection
       SET employee_name = $1, assigned_from = $2, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [employee_name.trim(), assigned_from, id]
    );
    res.status(200).json({ message: 'Number assigned successfully.', connection: updated.rows[0] });
  } catch (error) {
    console.error('Error assigning connection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Employee leaving: close the current row and move the line to the Unassigned list
exports.releaseConnection = async (req, res) => {
  try {
    await ensureAssignmentTable();
    const { id } = req.params;
    const { last_working_day, reason, performed_by } = req.body;
    if (!last_working_day) return res.status(400).json({ message: 'Last Working Day is required.' });
    if (!reason) return res.status(400).json({ message: 'Reason is required.' });

    const conn = await db.query(`SELECT * FROM tbl_tele_connection WHERE id = $1 AND is_deleted = 0`, [id]);
    if (conn.rows.length === 0) return res.status(404).json({ message: 'Connection not found.' });

    await ensureOpenAssignment(conn.rows[0]);
    await db.query(
      `UPDATE tbl_tele_reassignment
       SET assigned_to = $1, reason = $2, performed_by = $3, status = 'INACTIVE'
       WHERE connection_id = $4 AND status = 'ACTIVE'`,
      [last_working_day, reason, performed_by || 'Admin', id]
    );
    const updated = await db.query(
      `UPDATE tbl_tele_connection
       SET employee_name = 'Unassigned', status = 'UNASSIGNED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );
    res.status(200).json({ message: 'Number moved to the Unassigned list.', connection: updated.rows[0] });
  } catch (error) {
    console.error('Error releasing connection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
