const db = require('./db');

// Registers menu pages as real modules so they appear in Role Permissions and their permissions are enforced.
//
//   Telecom group  : Tele Report, Excess Usage Report (new) - Telecom Bill Form / Telecom Connection already exist
//   Settings group : Tele Package, Tele Provider, Tele Connection Type, Tele Service Provider
//
// Safe to run on every start: it only adds what is missing.
// So nobody loses access they have today, a new module starts with the permissions of a similar existing module
// (Telecom Bill Form for the Telecom pages, Company Legal Form for the Settings masters). Plans that include the
// template module get the new ones too. Administrators can then adjust everything in Role Permissions.

const GROUPS = [
  {
    parentName: 'telecom',
    templateNames: ['telecom bill form'],
    templateRoutes: ['/telecom-bill-form'],
    modules: [
      { name: 'Tele Report', route: '/tele-report' },
      { name: 'Excess Usage Report', route: '/excess-usage-report' },
    ],
    // existing module that was always shown to everyone: give it the template permissions where it has none
    existing: [{ name: 'telecom connection', route: '/telecom-connection' }],
  },
  {
    parentName: 'settings',
    templateNames: ['company legal form', 'company licensing authority'],
    templateRoutes: [],
    modules: [
      { name: 'Tele Package', route: '/tele-package' },
      { name: 'Tele Provider', route: '/tele-provider' },
      { name: 'Tele Connection Type', route: '/tele-connection-type' },
      { name: 'Tele Service Provider', route: '/tele-service-provider' },
    ],
    existing: [],
  },
];

async function copyPermissions(templateId, targetIds, have) {
  const extra = ['company_id', 'client_id', 'clientid'].filter(c => have.has(c));
  const flags = ['can_view', 'can_create', 'can_edit', 'can_delete', 'all_record_view', 'full_control'].filter(c => have.has(c));
  const colList = ['role_id', 'module_id', ...extra, ...flags];
  const selList = colList.map(c => (c === 'module_id' ? '$1' : `rp.${c}`));
  const stamps = ['created_at', 'updated_at'].filter(c => have.has(c));
  const sameCompany = have.has('company_id') ? 'AND x.company_id IS NOT DISTINCT FROM rp.company_id' : '';

  for (const target of targetIds) {
    const res = await db.query(
      `INSERT INTO role_permission (${[...colList, ...stamps].join(', ')})
       SELECT ${[...selList, ...stamps.map(() => 'CURRENT_TIMESTAMP')].join(', ')}
       FROM role_permission rp
       WHERE rp.module_id = $2
         AND NOT EXISTS (SELECT 1 FROM role_permission x WHERE x.role_id = rp.role_id AND x.module_id = $1 ${sameCompany})`,
      [target, templateId]
    );
    if (res.rowCount) console.log(`[MIGRATION] Copied ${res.rowCount} permission row(s) to module ${target}`);
  }
}

async function ensureGroup(group, have, hasPlanTable) {
  const parentRes = await db.query(
    `SELECT id FROM module WHERE LOWER(module_name) = $1 AND parent_id IS NULL AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id LIMIT 1`,
    [group.parentName]
  );
  if (parentRes.rows.length === 0) return; // this database has no such group
  const parentId = parentRes.rows[0].id;

  // the module whose permissions are copied
  const tplRes = await db.query(
    `SELECT id FROM module
     WHERE parent_id = $1 AND (is_deleted = false OR is_deleted IS NULL)
       AND (LOWER(module_name) = ANY($2) OR route = ANY($3))
     ORDER BY array_position($2::text[], LOWER(module_name)), id LIMIT 1`,
    [parentId, group.templateNames, group.templateRoutes.length ? group.templateRoutes : ['']]
  );
  const templateId = tplRes.rows.length ? tplRes.rows[0].id : null;

  const targets = [];
  for (const m of group.modules) {
    const found = await db.query(
      `SELECT id FROM module WHERE (LOWER(module_name) = LOWER($1) OR route = $2) ORDER BY (is_deleted IS NOT TRUE) DESC, id LIMIT 1`,
      [m.name, m.route]
    );
    if (found.rows.length === 0) {
      const ins = await db.query(
        `INSERT INTO module (id, module_name, parent_id, status, is_deleted, route)
         VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM module), $1, $2, 'active', false, $3) RETURNING id`,
        [m.name, parentId, m.route]
      );
      targets.push(ins.rows[0].id);
      console.log(`[MIGRATION] Module '${m.name}' created with id ${ins.rows[0].id}`);
    } else {
      targets.push(found.rows[0].id);
      await db.query(
        `UPDATE module SET parent_id = $1, status = 'active', is_deleted = false
         WHERE id = $2 AND (parent_id IS DISTINCT FROM $1 OR status IS DISTINCT FROM 'active' OR is_deleted IS NOT FALSE)`,
        [parentId, found.rows[0].id]
      );
    }
  }
  await db.query(`SELECT setval(pg_get_serial_sequence('module', 'id'), (SELECT MAX(id) FROM module), true)`).catch(() => {});

  for (const e of group.existing) {
    const r = await db.query(
      `SELECT id FROM module WHERE parent_id = $1 AND (LOWER(module_name) = $2 OR route = $3) AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id LIMIT 1`,
      [parentId, e.name, e.route]
    );
    if (r.rows.length) targets.push(r.rows[0].id);
  }

  if (!templateId) return;
  await copyPermissions(templateId, targets, have);

  if (hasPlanTable) {
    for (const target of targets) {
      await db.query(
        `INSERT INTO tbl_plan_modules (plan_id, enabled_module)
         SELECT pm.plan_id, $1 FROM tbl_plan_modules pm
         WHERE pm.enabled_module = $2
           AND NOT EXISTS (SELECT 1 FROM tbl_plan_modules y WHERE y.plan_id = pm.plan_id AND y.enabled_module = $1)`,
        [target, templateId]
      ).catch(err => console.warn('[MIGRATION] Could not extend plan modules:', err.message));
    }
  }
}

async function ensureTelecomModules() {
  try {
    const cols = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'role_permission'`);
    const have = new Set(cols.rows.map(c => c.column_name));
    const planTable = await db.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_plan_modules'`);
    for (const group of GROUPS) {
      await ensureGroup(group, have, planTable.rows.length > 0);
    }
  } catch (err) {
    console.error('[MIGRATION] ensureTelecomModules failed:', err.message);
  }
}

module.exports = ensureTelecomModules;

if (require.main === module) {
  ensureTelecomModules().then(() => process.exit(0)).catch(() => process.exit(1));
}
