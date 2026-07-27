const db = require('../config/db');

// @desc    Get all active roles
// @route   GET /api/roles
// @access  Public
exports.getAllRoles = async (req, res) => {
  try {
    const { clientid, roleid } = req.query;

    let queryText = `
      SELECT r.*, 
             r.companyids AS clientids,
             (SELECT string_agg(cl.client_name, ', ') FROM company c LEFT JOIN client cl ON c.clientid = cl.id WHERE c.id = ANY(r.companyids)) as client_name,
             (SELECT string_agg(c.company_name, ', ') FROM company c WHERE c.id = ANY(r.companyids)) as companyname
      FROM role r
      WHERE r.is_deleted = false 
    `;
    const params = [];

    if (roleid && String(roleid).split(',').includes('1')) {
      // Superadmin sees all roles, do not filter by clientid
    } else if (clientid) {
      // Client sees ONLY roles associated with their companies
      queryText += ` AND EXISTS (
        SELECT 1 FROM company comp 
        WHERE comp.id = ANY(r.companyids) AND comp.clientid = $1
      ) `;
      params.push(parseInt(clientid, 10));
    } else {
      queryText += ` AND r.companyids IS NULL `;
    }
    
    queryText += ` ORDER BY r.id ASC`;
    
    const result = await db.query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching roles.' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const rawCompanyIds = req.body.companyids || req.body.company_ids || req.body.clientids;
    const { role, status } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'Role name is required.' });
    }

    const firstClientId = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? parseInt(rawCompanyIds[0], 10) : null;
    const parsedCompanyIds = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? rawCompanyIds.map(id => parseInt(id, 10)) : null;

    // Check if a role with the exact same name already exists
    const existingCheck = await db.query(
      'SELECT * FROM role WHERE LOWER(TRIM(role)) = LOWER(TRIM($1)) AND is_deleted = false',
      [role.trim()]
    );

    if (existingCheck.rows.length > 0) {
      const existingRole = existingCheck.rows[0];
      const existingCompanyIds = Array.isArray(existingRole.companyids)
        ? existingRole.companyids
        : (Array.isArray(existingRole.clientids) ? existingRole.clientids : (existingRole.clientid ? [existingRole.clientid] : []));
      const newCompanyIds = parsedCompanyIds || [];
      const mergedCompanyIds = [...new Set([...existingCompanyIds, ...newCompanyIds])].map(Number).filter(Boolean);
      const mergedFirstClientId = mergedCompanyIds.length > 0 ? mergedCompanyIds[0] : existingRole.clientid;

      const updateQuery = `
        UPDATE role
        SET companyids = $1,
            clientid = $2,
            status = COALESCE($3, status)
        WHERE id = $4 AND is_deleted = false
        RETURNING *, companyids AS clientids
      `;
      const updateRes = await db.query(updateQuery, [
        mergedCompanyIds.length > 0 ? mergedCompanyIds : null,
        mergedFirstClientId,
        status !== undefined ? parseInt(status, 10) : null,
        existingRole.id
      ]);

      return res.status(200).json({
        message: 'Role updated with associated company.',
        role: updateRes.rows[0]
      });
    }

    const queryText = `
      INSERT INTO role (role, status, clientid, companyids, is_deleted)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *, companyids AS clientids
    `;
    const result = await db.query(queryText, [
      role.trim(),
      status !== undefined ? parseInt(status, 10) : 1,
      firstClientId,
      parsedCompanyIds
    ]);

    res.status(201).json({
      message: 'Role created successfully.',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Internal Server Error while creating role.' });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Public
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const rawCompanyIds = req.body.companyids || req.body.company_ids || req.body.clientids;
    const { role, status } = req.body;

    // Check if role exists
    const checkQuery = 'SELECT id FROM role WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    const firstClientId = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? parseInt(rawCompanyIds[0], 10) : null;
    const parsedCompanyIds = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? rawCompanyIds.map(id => parseInt(id, 10)) : null;

    const queryText = `
      UPDATE role
      SET role = COALESCE($1, role),
          status = COALESCE($2, status),
          companyids = $3,
          clientid = $4
      WHERE id = $5 AND is_deleted = false
      RETURNING *, companyids AS clientids
    `;
    const result = await db.query(queryText, [
      role ? role.trim() : null,
      status !== undefined ? parseInt(status, 10) : null,
      parsedCompanyIds,
      firstClientId,
      id
    ]);

    res.status(200).json({
      message: 'Role updated successfully.',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Internal Server Error while updating role.' });
  }
};

// @desc    Soft delete a role
// @route   DELETE /api/roles/:id
// @access  Public
exports.softDeleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const checkQuery = 'SELECT id FROM role WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or already deleted.' });
    }

    // Soft delete
    const deleteQuery = `
      UPDATE role
      SET is_deleted = true
      WHERE id = $1
      RETURNING id, role, is_deleted
    `;
    const result = await db.query(deleteQuery, [id]);

    res.status(200).json({
      message: 'Role deleted successfully (soft delete).',
      role: result.rows[0]
    });
  } catch (error) {
    console.error('Error soft-deleting role:', error);
    res.status(500).json({ message: 'Internal Server Error during role soft-deletion.' });
  }
};
