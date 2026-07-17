const fs = require('fs');

const user = { roleId: 2 };
const modules = [
  { id: 5, module_name: 'nirmal', parent_id: 4 },
  { id: 1, module_name: 'Dashboard', parent_id: null },
  { id: 2, module_name: 'Shipments', parent_id: null },
  { id: 3, module_name: 'Analytics', parent_id: null },
  { id: 8, module_name: 'Smtp', parent_id: 4 },
  { id: 11, module_name: 'cvxcv', parent_id: 10 },
  { id: 10, module_name: 'bnmbvnm', parent_id: null },
  { id: 12, module_name: 'Country', parent_id: 4 },
  { id: 13, module_name: 'State', parent_id: 4 },
  { id: 4, module_name: 'Settings', parent_id: null },
  { id: 6, module_name: 'Role', parent_id: 4 },
  { id: 9, module_name: 'Client', parent_id: null },
  { id: 7, module_name: 'Department', parent_id: 4 },
  { id: 15, module_name: 'Company', parent_id: null },
  { id: 16, module_name: 'Role Permissions', parent_id: 4 }
];

const userPermissions = [
  { module_id: 4, can_view: false },
  { module_id: 6, can_view: false },
  { module_id: 7, can_view: false },
  { module_id: 8, can_view: false },
  { module_id: 12, can_view: false },
  { module_id: 13, can_view: false },
  { module_id: 16, can_view: false },
  { module_id: 9, can_view: false },
  { module_id: 15, can_view: true }
];

const userPermissionsLoading = false;

const hasViewPermission = (moduleId) => {
  if (user?.roleId === 1) return true;
  const perm = userPermissions.find(p => p.module_id === moduleId);
  return perm ? perm.can_view : false;
};

const visibleModules = userPermissionsLoading
  ? modules
  : modules.filter(m => {
      if (hasViewPermission(m.id)) return true;
      const hasVisibleChildren = modules.some(child => child.parent_id === m.id && hasViewPermission(child.id));
      return hasVisibleChildren;
    });

const effectiveModules = (!userPermissionsLoading && visibleModules.length === 0 && modules.length > 0) ? modules : visibleModules;

const activeModuleIds = new Set(effectiveModules.map(m => m.id));
const parentModules = effectiveModules.filter(m => m.parent_id === null || m.parent_id === undefined || !activeModuleIds.has(m.parent_id));

console.log('visibleModules:', visibleModules.map(m => m.module_name));
console.log('effectiveModules:', effectiveModules.map(m => m.module_name));
console.log('parentModules:', parentModules.map(m => m.module_name));
