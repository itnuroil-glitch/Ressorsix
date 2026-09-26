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
             COALESCE(
               (SELECT string_agg(DISTINCT cl.client_name, ', ') FROM company c LEFT JOIN client cl ON c.clientid = cl.id WHERE c.id = ANY(r.companyids)),
               (SELECT string_agg(DISTINCT cl.client_name, ', ') FROM client cl WHERE cl.id = ANY(r.companyids))
             ) as client_name,
             COALESCE(
               (SELECT string_agg(DISTINCT c.company_name, ', ') FROM company c WHERE c.id = ANY(r.companyids)),
               (SELECT string_agg(DISTINCT cl.client_name, ', ') FROM client cl WHERE cl.id = ANY(r.companyids))
             ) as companyname,
             (
               SELECT COALESCE(json_agg(item), '[]'::json)
               FROM (
                 SELECT c.id, c.company_name FROM company c WHERE c.id = ANY(r.companyids)
                 UNION
                 SELECT cl.id, cl.client_name AS company_name FROM client cl WHERE cl.id = ANY(r.companyids) 
                   AND NOT EXISTS (SELECT 1 FROM company c2 WHERE c2.id = cl.id AND c2.id = ANY(r.companyids))
               ) item
             ) as assigned_companies
      FROM role r
      WHERE (r.is_deleted = false OR r.is_deleted IS NULL)
    `;
    const params = [];

    if (roleid && String(roleid).split(',').includes('1')) {
      // Superadmin sees all roles, do not filter by clientid
    } else if (clientid) {
      // Client sees roles associated with their companies OR directly matching their clientid
      queryText += ` AND (
        r.clientid = $1
        OR EXISTS (
          SELECT 1 FROM company comp 
          WHERE comp.id = ANY(r.companyids) AND (comp.clientid = $1 OR comp.clientid::text = $1::text)
        )
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
    let explicitClientId = req.body.clientid ? parseInt(req.body.clientid, 10) : null;

    if (!role) {
      return res.status(400).json({ message: 'Role name is required.' });
    }

    let parsedCompanyIds = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? rawCompanyIds.map(id => parseInt(id, 10)).filter(Boolean) : null;

    // If client ID is provided but no company IDs were selected, auto-associate all active companies of the client
    if ((!parsedCompanyIds || parsedCompanyIds.length === 0) && explicitClientId) {
      const compRes = await db.query(
        'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL)',
        [explicitClientId]
      );
      if (compRes.rows.length > 0) {
        parsedCompanyIds = compRes.rows.map(r => r.id);
      }
    }

    // If company IDs are present but explicit client ID is missing, auto-derive client ID
    if (!explicitClientId && parsedCompanyIds && parsedCompanyIds.length > 0) {
      const compLookup = await db.query('SELECT clientid FROM company WHERE id = $1', [parsedCompanyIds[0]]);
      if (compLookup.rows.length > 0 && compLookup.rows[0].clientid) {
        explicitClientId = compLookup.rows[0].clientid;
      }
    }

    const firstClientId = parsedCompanyIds && parsedCompanyIds.length > 0 ? parsedCompanyIds[0] : null;

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
      const mergedClientId = explicitClientId || (mergedCompanyIds.length > 0 ? mergedCompanyIds[0] : existingRole.clientid);

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
        mergedClientId,
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
      explicitClientId || firstClientId,
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
    let explicitClientId = req.body.clientid ? parseInt(req.body.clientid, 10) : null;

    // Check if role exists
    const checkQuery = 'SELECT id, clientid, companyids FROM role WHERE id = $1 AND is_deleted = false';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    const existingRole = checkResult.rows[0];
    let parsedCompanyIds = Array.isArray(rawCompanyIds) && rawCompanyIds.length > 0 ? rawCompanyIds.map(id => parseInt(id, 10)).filter(Boolean) : null;

    if (!explicitClientId && parsedCompanyIds && parsedCompanyIds.length > 0) {
      const compLookup = await db.query('SELECT clientid FROM company WHERE id = $1', [parsedCompanyIds[0]]);
      if (compLookup.rows.length > 0 && compLookup.rows[0].clientid) {
        explicitClientId = compLookup.rows[0].clientid;
      }
    }

    const finalClientId = explicitClientId || existingRole.clientid;

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
      finalClientId,
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
