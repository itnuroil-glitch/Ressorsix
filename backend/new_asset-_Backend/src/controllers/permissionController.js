const db = require('../config/db');

// @desc    Get permissions for a given role ID
// @route   GET /api/roles/:roleId/permissions
// @access  Public
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const companyId = req.query.company_id || req.query.companyid || null;

    // Verify if role exists and is active
    const roleCheck = await db.query('SELECT id, role FROM role WHERE id = $1 AND is_deleted = false', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    // Retrieve all active modules and left join with their permission settings for this role and company
    let queryText;
    let queryParams;

    if (companyId && companyId !== 'null' && companyId !== '') {
      // Check if there are any company-specific permissions
      const checkCompPerm = await db.query(
        'SELECT 1 FROM role_permission WHERE role_id = $1 AND company_id = $2 LIMIT 1',
        [roleId, companyId]
      );

      if (checkCompPerm.rows.length > 0) {
        queryText = `
          SELECT 
            m.id AS module_id,
            m.module_name,
            m.parent_id,
            COALESCE(rp.id, 0) AS permission_id,
            COALESCE(rp.can_view, false) AS can_view,
            COALESCE(rp.can_create, false) AS can_create,
            COALESCE(rp.can_edit, false) AS can_edit,
            COALESCE(rp.can_delete, false) AS can_delete,
            COALESCE(rp.all_record_view, false) AS all_record_view,
            COALESCE(rp.full_control, false) AS full_control
          FROM module m
          LEFT JOIN role_permission rp ON rp.module_id = m.id AND rp.role_id = $1 AND rp.company_id = $2
          WHERE m.status = 'active' AND m.is_deleted = false
          ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
        `;
        queryParams = [roleId, companyId];
      } else {
        queryText = `
          SELECT 
            m.id AS module_id,
            m.module_name,
            m.parent_id,
            COALESCE(rp.id, 0) AS permission_id,
            COALESCE(rp.can_view, false) AS can_view,
            COALESCE(rp.can_create, false) AS can_create,
            COALESCE(rp.can_edit, false) AS can_edit,
            COALESCE(rp.can_delete, false) AS can_delete,
            COALESCE(rp.all_record_view, false) AS all_record_view,
            COALESCE(rp.full_control, false) AS full_control
          FROM module m
          LEFT JOIN role_permission rp ON rp.module_id = m.id AND rp.role_id = $1 AND rp.company_id IS NULL
          WHERE m.status = 'active' AND m.is_deleted = false
          ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
        `;
        queryParams = [roleId];
      }
    } else {
      queryText = `
        SELECT 
          m.id AS module_id,
          m.module_name,
          m.parent_id,
          COALESCE(rp.id, 0) AS permission_id,
          COALESCE(rp.can_view, false) AS can_view,
          COALESCE(rp.can_create, false) AS can_create,
          COALESCE(rp.can_edit, false) AS can_edit,
          COALESCE(rp.can_delete, false) AS can_delete,
          COALESCE(rp.all_record_view, false) AS all_record_view,
          COALESCE(rp.full_control, false) AS full_control
        FROM module m
        LEFT JOIN role_permission rp ON rp.module_id = m.id AND rp.role_id = $1 AND rp.company_id IS NULL
        WHERE m.status = 'active' AND m.is_deleted = false
        ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
      `;
      queryParams = [roleId];
    }

    const result = await db.query(queryText, queryParams);

    // Fetch all company-specific permissions for this role
    const companyPermRes = await db.query(
      `SELECT rp.*
       FROM role_permission rp 
       JOIN module m ON rp.module_id = m.id 
       WHERE rp.role_id = $1 AND rp.company_id IS NOT NULL`,
      [roleId]
    );

    res.status(200).json({
      role: roleCheck.rows[0],
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
    const { permissions, company_id, company_ids } = req.body; // Array of permissions, plus optional company_id / company_ids

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions array is required.' });
    }

    // Verify role exists and is active
    const roleCheck = await client.query('SELECT id FROM role WHERE id = $1 AND is_deleted = false', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    // Determine which company IDs to save for
    let targetCompanyIds = [];
    if (Array.isArray(company_ids)) {
      targetCompanyIds = company_ids.map(id => (id && id !== 'null') ? parseInt(id, 10) : null);
    } else if (company_ids && company_ids !== 'null' && company_ids !== '') {
      targetCompanyIds = [parseInt(company_ids, 10)];
    } else if (company_id && company_id !== 'null' && company_id !== '') {
      targetCompanyIds = Array.isArray(company_id)
        ? company_id.map(id => (id && id !== 'null') ? parseInt(id, 10) : null)
        : [parseInt(company_id, 10)];
    } else {
      targetCompanyIds = [null];
    }

    if (targetCompanyIds.length === 0) {
      targetCompanyIds = [null];
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

    const insertQuery = `
      INSERT INTO role_permission (role_id, module_id, company_id, can_view, can_create, can_edit, can_delete, all_record_view, full_control, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const savedPermissions = [];
    for (const compId of targetCompanyIds) {
      for (const perm of permissions) {
        const { module_id, can_view, can_create, can_edit, can_delete, all_record_view, full_control } = perm;
        const res = await client.query(insertQuery, [
          roleId,
          module_id,
          compId,
          !!can_view,
          !!can_create,
          !!can_edit,
          !!can_delete,
          !!all_record_view,
          !!full_control
        ]);
        savedPermissions.push(res.rows[0]);
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
    res.status(500).json({ message: 'Internal Server Error while saving permissions.' });
  } finally {
    client.release();
  }
};
