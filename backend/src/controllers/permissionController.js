const db = require('../config/db');

// @desc    Get permissions for a given role ID
// @route   GET /api/roles/:roleId/permissions
// @access  Public
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const companyId = req.query.company_id || req.query.companyid || null;

    const roleIds = String(roleId).split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);
    if (roleIds.length === 0) {
      return res.status(400).json({ message: 'Valid role ID(s) required.' });
    }

    // Verify if role(s) exist and are active
    const roleCheck = await db.query('SELECT id, role, clientid FROM role WHERE id = ANY($1) AND is_deleted = false', [roleIds]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role(s) not found or have been deleted.' });
    }

    // Retrieve all active modules and left join with their aggregated permission settings for these roles and company
    let queryText;
    let queryParams;

    if (companyId && companyId !== 'null' && companyId !== '') {
      queryText = `
        SELECT 
          m.id AS module_id,
          m.module_name,
          m.parent_id,
          0 AS permission_id,
          MAX(rp.client_id) AS client_id,
          bool_or(COALESCE(rp.can_view, false)) AS can_view,
          bool_or(COALESCE(rp.can_create, false)) AS can_create,
          bool_or(COALESCE(rp.can_edit, false)) AS can_edit,
          bool_or(COALESCE(rp.can_delete, false)) AS can_delete,
          bool_or(COALESCE(rp.all_record_view, false)) AS all_record_view,
          bool_or(COALESCE(rp.full_control, false)) AS full_control
        FROM module m
        LEFT JOIN LATERAL (
          SELECT 
            rp_sub.client_id,
            rp_sub.can_view,
            rp_sub.can_create,
            rp_sub.can_edit,
            rp_sub.can_delete,
            rp_sub.all_record_view,
            rp_sub.full_control
          FROM role_permission rp_sub
          WHERE rp_sub.module_id = m.id 
            AND rp_sub.role_id = ANY($1)
            AND (
              rp_sub.company_id = ANY(string_to_array($2, ',')::int[])
              OR (
                rp_sub.company_id IS NULL 
                AND NOT EXISTS (
                  SELECT 1 FROM role_permission rp_chk 
                  WHERE rp_chk.module_id = m.id 
                    AND rp_chk.role_id = ANY($1) 
                    AND rp_chk.company_id = ANY(string_to_array($2, ',')::int[])
                )
              )
            )
        ) rp ON true
        WHERE m.status = 'active' AND m.is_deleted = false
        GROUP BY m.id, m.module_name, m.parent_id
        ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
      `;
      queryParams = [roleIds, String(companyId)];
    } else {
      queryText = `
        SELECT 
          m.id AS module_id,
          m.module_name,
          m.parent_id,
          0 AS permission_id,
          MAX(rp.client_id) AS client_id,
          bool_or(COALESCE(rp.can_view, false)) AS can_view,
          bool_or(COALESCE(rp.can_create, false)) AS can_create,
          bool_or(COALESCE(rp.can_edit, false)) AS can_edit,
          bool_or(COALESCE(rp.can_delete, false)) AS can_delete,
          bool_or(COALESCE(rp.all_record_view, false)) AS all_record_view,
          bool_or(COALESCE(rp.full_control, false)) AS full_control
        FROM module m
        LEFT JOIN role_permission rp ON rp.module_id = m.id AND rp.role_id = ANY($1)
        WHERE m.status = 'active' AND m.is_deleted = false
        GROUP BY m.id, m.module_name, m.parent_id
        ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
      `;
      queryParams = [roleIds];
    }

    const result = await db.query(queryText, queryParams);

    // Fetch all company-specific permissions for these roles
    const companyPermRes = await db.query(
      `SELECT 
         rp.module_id,
         rp.company_id,
         rp.client_id,
         bool_or(rp.can_view) AS can_view,
         bool_or(rp.can_create) AS can_create,
         bool_or(rp.can_edit) AS can_edit,
         bool_or(rp.can_delete) AS can_delete,
         bool_or(rp.all_record_view) AS all_record_view,
         bool_or(rp.full_control) AS full_control
       FROM role_permission rp 
       JOIN module m ON rp.module_id = m.id 
       WHERE rp.role_id = ANY($1) AND rp.company_id IS NOT NULL
       GROUP BY rp.module_id, rp.company_id, rp.client_id`,
      [roleIds]
    );

    // If client role, filter modules based on subscription plan
    let clientId = req.query.clientid;
    if (!clientId && roleCheck.rows[0].clientid) {
      const compRes = await db.query('SELECT clientid FROM company WHERE id = $1', [roleCheck.rows[0].clientid]);
      clientId = compRes.rows[0]?.clientid;
    }
    if (clientId) {
      const clientRes = await db.query('SELECT plan_id FROM client WHERE id = $1', [clientId]);
      const planId = clientRes.rows[0]?.plan_id;

      if (planId) {
        const planModRes = await db.query('SELECT enabled_module FROM tbl_plan_modules WHERE plan_id = $1', [planId]);
        const enabledModuleIds = planModRes.rows.map(r => r.enabled_module);
        const filteredPermissions = result.rows
          .filter(row => enabledModuleIds.includes(row.module_id))
          .map(row => ({
            ...row,
            can_view: row.can_view,
            can_create: row.can_create,
            can_edit: row.can_edit,
            can_delete: row.can_delete,
            full_control: row.full_control
          }));
        
        const filteredCompanyPermissions = companyPermRes.rows
          .filter(row => enabledModuleIds.includes(row.module_id));

        return res.status(200).json({
          role: roleCheck.rows[0],
          roles: roleCheck.rows,
          permissions: filteredPermissions,
          companyPermissions: filteredCompanyPermissions
        });
      } else {
        return res.status(200).json({
          role: roleCheck.rows[0],
          roles: roleCheck.rows,
          permissions: [],
          companyPermissions: []
        });
      }
    }

    res.status(200).json({
      role: roleCheck.rows[0],
      roles: roleCheck.rows,
      permissions: result.rows,
      companyPermissions: companyPermRes.rows
    });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching permissions.' });
  }
};

// @desc    Save or update permissions for a given role ID
// @route   POST /api/roles/:roleId/permissions
// @access  Public
  exports.saveRolePermissions = async (req, res) => {
    const client = await db.pool.connect();
    try {
      const { roleId } = req.params;
      const { permissions, company_id, company_ids, client_id, clientid } = req.body; // Array of permissions, plus optional company_id / company_ids / client_id

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions array is required.' });
      }

      // Verify role exists and is active
      const roleCheck = await client.query('SELECT id, clientid, companyids FROM role WHERE id = $1 AND is_deleted = false', [roleId]);
      if (roleCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Role not found or has been deleted.' });
      }
      const roleObj = roleCheck.rows[0];

      let targetClientId = client_id || clientid || roleObj.clientid || null;

      // Get all company IDs associated with this role via clientid or companyids
      let allAssociatedCompanyIds = [];
      if (Array.isArray(roleObj.companyids) && roleObj.companyids.length > 0) {
        allAssociatedCompanyIds.push(...roleObj.companyids);
      }
      if (roleObj.clientid) {
        targetClientId = roleObj.clientid;
        const allCompsRes = await client.query('SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL)', [roleObj.clientid]);
        allAssociatedCompanyIds.push(...allCompsRes.rows.map(r => r.id));
      }
      allAssociatedCompanyIds = [...new Set(allAssociatedCompanyIds)].filter(Boolean);

      // Determine which company IDs to save for
      let rawCompInput = company_id !== undefined && company_id !== null ? company_id : company_ids;
      let targetCompanyIds = [];

      if (rawCompInput === 'all' || (Array.isArray(rawCompInput) && rawCompInput.includes('all'))) {
        targetCompanyIds = allAssociatedCompanyIds.length > 0 ? allAssociatedCompanyIds : [null];
      } else if (Array.isArray(rawCompInput)) {
        targetCompanyIds = rawCompInput.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      } else if (typeof rawCompInput === 'string' && rawCompInput.includes(',')) {
        targetCompanyIds = rawCompInput.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      } else if (rawCompInput !== undefined && rawCompInput !== null && rawCompInput !== '' && rawCompInput !== 'null') {
        const parsed = parseInt(rawCompInput, 10);
        if (!isNaN(parsed)) targetCompanyIds = [parsed];
      }

      if (targetCompanyIds.length === 0) {
        targetCompanyIds = allAssociatedCompanyIds.length > 0 ? allAssociatedCompanyIds : [null];
      }

      await client.query('BEGIN');

      // Delete existing entries for this role + company combinations
      for (const compId of targetCompanyIds) {
        if (compId !== null) {
          await client.query(
            'DELETE FROM role_permission WHERE role_id = $1 AND company_id = $2',
            [roleId, compId]
          );
        } else {
          await client.query(
            'DELETE FROM role_permission WHERE role_id = $1 AND company_id IS NULL',
            [roleId]
          );
        }
      }

      // Check if client_id column exists in role_permission
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'role_permission' AND column_name IN ('client_id', 'clientid')
      `);
      const hasClientIdCol = colCheck.rows.some(r => r.column_name === 'client_id');
      const hasClientidCol = colCheck.rows.some(r => r.column_name === 'clientid');

      let insertQuery = `
        INSERT INTO role_permission (role_id, module_id, company_id, can_view, can_create, can_edit, can_delete, all_record_view, full_control, updated_at
      `;
      let valPlaceholders = `$1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP`;
      let paramCount = 9;

      if (hasClientIdCol) {
        paramCount++;
        insertQuery += `, client_id`;
        valPlaceholders += `, $${paramCount}`;
      }
      if (hasClientidCol) {
        paramCount++;
        insertQuery += `, clientid`;
        valPlaceholders += `, $${paramCount}`;
      }

      insertQuery += `) VALUES (${valPlaceholders}) RETURNING *`;

      const savedPermissions = [];
      for (const compId of targetCompanyIds) {
        let finalClientId = targetClientId;
        if (!finalClientId && compId !== null) {
          const cRes = await client.query('SELECT clientid FROM company WHERE id = $1', [compId]);
          if (cRes.rows.length > 0) finalClientId = cRes.rows[0].clientid;
        }

        for (const perm of permissions) {
          const { module_id, can_view, can_create, can_edit, can_delete, all_record_view, full_control } = perm;
          
          let numericModuleId = parseInt(module_id, 10);
          if (isNaN(numericModuleId)) {
            const modRes = await client.query(
              "SELECT id FROM module WHERE LOWER(module_name) = LOWER($1) OR LOWER(route) = LOWER($1)",
              [String(module_id)]
            );
            if (modRes.rows.length > 0) {
              numericModuleId = modRes.rows[0].id;
            }
          }

          if (numericModuleId) {
            const params = [
              roleId,
              numericModuleId,
              compId,
              !!can_view,
              !!can_create,
              !!can_edit,
              !!can_delete,
              !!all_record_view,
              !!full_control
            ];
            if (hasClientIdCol) params.push(finalClientId);
            if (hasClientidCol) params.push(finalClientId);

            const res = await client.query(insertQuery, params);
            savedPermissions.push(res.rows[0]);
          }
        }
      }

      await client.query('COMMIT');
      res.status(200).json({
        message: 'Role permissions saved successfully.',
        permissions: savedPermissions
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving role permissions:', error);
      res.status(500).json({ 
        message: 'Internal Server Error while saving permissions.',
        error: error.message || String(error)
      });
    } finally {
      client.release();
    }
  };
  // Trigger nodemon restart 2
