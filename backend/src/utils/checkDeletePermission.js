const db = require('../config/db');

const checkDeletePermission = (tabId) => {
  return async (req, res, next) => {
    try {
      const roleId = req.headers['roleid'] || req.query.roleid || req.body.roleid;
      
      // Super Admin bypass: Role ID 1 has full permissions
      if (roleId && String(roleId).split(',').includes('1')) {
        return next();
      }

      if (!roleId) {
        return res.status(403).json({ message: 'Access Denied: Missing role information.' });
      }

      // Get all modules from db
      const modulesRes = await db.query("SELECT id, module_name, route FROM module WHERE status = 'active' AND is_deleted = false");
      
      // Filter modules that map to this tabId using the same logic as the frontend
      const getTabIdByRoute = (name, route) => {
        let r = route ? route.toLowerCase().trim() : '';
        let n = name ? name.toLowerCase().trim() : '';
        if (r === '/dashboard' || n.includes('dashboard')) return 'dashboard';
        if (r === '/shipments' || n.includes('shipment')) return 'shipments';
        if (r === '/analytics' || n.includes('analytic')) return 'analytics';
        if (r === '/settings' || r === '/modules' || n === 'settings' || n === 'modules') return 'settings';
        if (r === '/plans' || n === 'plans' || n === 'plan') return 'plans';
        if (r === '/role' || r === '/roles' || n === 'role' || n === 'roles') return 'roles';
        if (r === '/department' || r === '/departments' || n === 'department' || n === 'departments') return 'departments';
        if (r === '/smtp' || n === 'smtp') return 'smtp';
        if (r === '/client' || r === '/clients' || n === 'client' || n === 'clients') return 'client';
        if (r === '/country' || r === '/countries' || n === 'country' || n === 'countries') return 'country';
        if (r === '/state' || r === '/states' || n === 'state' || n === 'states') return 'state';
        if (r === '/permissions' || r === '/permission' || n === 'role permissions' || n === 'permissions') return 'permissions';
        if (r === '/company' || r === '/companies' || n === 'company' || n === 'companies') return 'company';
        if (r === '/employee' || r === '/employees' || n === 'employee' || n === 'employees') return 'employees';
        if (r.includes('custom') && r.includes('field') || n.includes('custom') && n.includes('field')) return 'custom_fields';
        if (r.includes('field') && r.includes('permission') || n.includes('field') && n.includes('permission')) return 'field_permissions';
        if (r.includes('feild') && r.includes('permision') || n.includes('feild') && n.includes('permision')) return 'field_permissions';
        if (r.includes('vehicle') && r.includes('insurance') || n.includes('vehicle') && n.includes('insurance')) return 'vehicle_insurance';
        if (r.includes('vehicle') && r.includes('detail') || n.includes('vehicle') && n.includes('detail')) return 'vehicle_details';
        if (r.includes('vehicle') && r.includes('purchase') || n.includes('vehicle') && n.includes('purchase') || r.includes('vehile') && r.includes('purchase') || n.includes('vehile') && n.includes('purchase')) return 'vehicle_purchase';
        if (r.includes('primise') && r.includes('detail') || n.includes('primise') && n.includes('detail') || r.includes('premise') && r.includes('detail') || n.includes('premise') && n.includes('detail')) return 'premises_details';
        if (r.includes('asset') && r.includes('detail') || n.includes('asset') && n.includes('detail')) return 'asset_details';
        if (r.includes('asset') && r.includes('category') || n.includes('asset') && n.includes('category')) return 'asset_category';
        if (r.includes('asset') && r.includes('brand') || n.includes('asset') && n.includes('brand')) return 'asset_brand';
        if (r.includes('asset') && r.includes('assignment') || n.includes('asset') && n.includes('assignment')) return 'asset_assignment';
        return '';
      };

      const matchedModules = modulesRes.rows.filter(m => getTabIdByRoute(m.module_name, m.route) === tabId);
      if (matchedModules.length === 0) {
        console.warn(`No module mapping found for tabId: ${tabId}`);
        return next();
      }

      const moduleIds = matchedModules.map(m => m.id);
      const companyId = req.headers['companyid'] || req.query.companyid || req.body.companyid || req.headers['company_id'] || req.query.company_id || req.body.company_id || null;

      const roleIds = String(roleId).split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);

      let permRes;
      if (companyId && companyId !== 'null' && companyId !== '') {
        permRes = await db.query(
          'SELECT can_delete, full_control FROM role_permission WHERE role_id = ANY($1) AND module_id = ANY($2) AND company_id = $3',
          [roleIds, moduleIds, companyId]
        );
        // If no company-specific permissions exist, fall back to global
        if (permRes.rows.length === 0) {
          permRes = await db.query(
            'SELECT can_delete, full_control FROM role_permission WHERE role_id = ANY($1) AND module_id = ANY($2) AND company_id IS NULL',
            [roleIds, moduleIds]
          );
        }
      } else {
        permRes = await db.query(
          'SELECT can_delete, full_control FROM role_permission WHERE role_id = ANY($1) AND module_id = ANY($2) AND company_id IS NULL',
          [roleIds, moduleIds]
        );
      }

      const hasDeletePermission = permRes.rows.some(p => p.can_delete || p.full_control);
      if (!hasDeletePermission) {
        return res.status(403).json({ message: 'Access Denied: You do not have permission to delete records in this module.' });
      }

      next();
    } catch (error) {
      console.error('Error in checkDeletePermission middleware:', error);
      res.status(500).json({ message: 'Internal Server Error during permission verification.' });
    }
  };
};

module.exports = checkDeletePermission;
