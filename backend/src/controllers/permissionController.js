const db = require('../config/db');

// @desc    Get permissions for a given role ID
// @route   GET /api/roles/:roleId/permissions
// @access  Public
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

    // Verify if role exists and is active
    const roleCheck = await db.query('SELECT id, role, clientid FROM role WHERE id = $1 AND is_deleted = false', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    // Retrieve all active modules and left join with their permission settings for this role
    const queryText = `
      SELECT 
        m.id AS module_id,
        m.module_name,
        m.parent_id,
        COALESCE(rp.id, 0) AS permission_id,
        COALESCE(rp.can_view, false) AS can_view,
        COALESCE(rp.can_create, false) AS can_create,
        COALESCE(rp.can_edit, false) AS can_edit,
        COALESCE(rp.can_delete, false) AS can_delete,
        COALESCE(rp.full_control, false) AS full_control
      FROM module m
      LEFT JOIN role_permission rp ON rp.module_id = m.id AND rp.role_id = $1
      WHERE m.status = 'active' AND m.is_deleted = false
      ORDER BY m.parent_id ASC NULLS FIRST, m.id ASC
    `;
    const result = await db.query(queryText, [roleId]);

    // If client role, filter modules based on subscription plan
    const clientId = req.query.clientid || roleCheck.rows[0].clientid;
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
        return res.status(200).json({
          role: roleCheck.rows[0],
          permissions: filteredPermissions
        });
      } else {
        return res.status(200).json({
          role: roleCheck.rows[0],
          permissions: []
        });
      }
    }

    res.status(200).json({
      role: roleCheck.rows[0],
      permissions: result.rows
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
    const { permissions } = req.body; // Array of { module_id, can_view, can_create, can_edit, can_delete, full_control }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions array is required.' });
    }

    // Verify role exists and is active
    const roleCheck = await client.query('SELECT id FROM role WHERE id = $1 AND is_deleted = false', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found or has been deleted.' });
    }

    await client.query('BEGIN');

    const upsertQuery = `
      INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (role_id, module_id)
      DO UPDATE SET
        can_view = EXCLUDED.can_view,
        can_create = EXCLUDED.can_create,
        can_edit = EXCLUDED.can_edit,
        can_delete = EXCLUDED.can_delete,
        full_control = EXCLUDED.full_control,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const savedPermissions = [];
    for (const perm of permissions) {
      const { module_id, can_view, can_create, can_edit, can_delete, full_control } = perm;
      const res = await client.query(upsertQuery, [
        roleId,
        module_id,
        !!can_view,
        !!can_create,
        !!can_edit,
        !!can_delete,
        !!full_control
      ]);
      savedPermissions.push(res.rows[0]);
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
