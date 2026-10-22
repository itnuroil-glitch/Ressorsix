require('dotenv').config();
const db = require('./src/config/db');

(async () => {
  try {
    const modules = await db.query(
      "SELECT id, module_name, route, parent_id FROM module WHERE module_name ILIKE '%telecom%' OR module_name ILIKE '%tele%' OR route ILIKE '%tele%' ORDER BY id"
    );
    console.log('Telecom modules in DB:');
    console.table(modules.rows);

    const planRows = await db.query(
      "SELECT p.id as plan_id, p.plan_name, pm.enabled_module, m.module_name FROM tbl_plan p LEFT JOIN tbl_plan_modules pm ON p.id = pm.plan_id LEFT JOIN module m ON pm.enabled_module = m.id WHERE m.module_name ILIKE '%tele%' ORDER BY p.id, pm.enabled_module"
    );
    console.log('Telecom modules in Plans:');
    console.table(planRows.rows);

    const clientRows = await db.query("SELECT * FROM client LIMIT 10");
    console.log('Clients:');
    console.table(clientRows.rows.map(c => ({ id: c.id, client_name: c.client_name, plan_id: c.plan_id })));

    const rolePerms = await db.query(
      "SELECT rp.id, rp.role_id, rp.module_id, m.module_name, rp.company_id, rp.client_id, rp.can_view FROM role_permission rp JOIN module m ON rp.module_id = m.id WHERE m.module_name ILIKE '%tele%report%' OR m.route ILIKE '%tele%report%'"
    );
    console.log('Telecom Report Role Permissions:');
    console.table(rolePerms.rows);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
