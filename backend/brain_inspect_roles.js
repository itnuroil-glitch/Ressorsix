const db = require('./src/config/db');

async function run() {
  try {
    console.log("--- ROLES 10 & 14 ---");
    const roles = await db.query("SELECT id, role, clientids FROM role WHERE id IN (10, 14)");
    console.table(roles.rows);

    console.log("\n--- VEHICLE MODULES ---");
    const modules = await db.query("SELECT id, module_name, route, status FROM module");
    console.table(modules.rows.filter(m => m.module_name.toLowerCase().includes('vehicle')));

    console.log("\n--- ROLE PERMISSIONS FOR ROLE ID 10 ---");
    const perms10 = await db.query(`
      SELECT rp.id, rp.role_id, r.role as role_name, rp.module_id, m.module_name, rp.company_id, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.full_control 
      FROM role_permission rp
      LEFT JOIN role r ON rp.role_id = r.id
      LEFT JOIN module m ON rp.module_id = m.id
      WHERE rp.role_id = 10
      ORDER BY rp.module_id, rp.company_id
    `);
    console.table(perms10.rows.filter(p => p.module_name && p.module_name.toLowerCase().includes('vehicle')));

    console.log("\n--- ROLE PERMISSIONS FOR ROLE ID 14 ---");
    const perms14 = await db.query(`
      SELECT rp.id, rp.role_id, r.role as role_name, rp.module_id, m.module_name, rp.company_id, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.full_control 
      FROM role_permission rp
      LEFT JOIN role r ON rp.role_id = r.id
      LEFT JOIN module m ON rp.module_id = m.id
      WHERE rp.role_id = 14
      ORDER BY rp.module_id, rp.company_id
    `);
    console.table(perms14.rows.filter(p => p.module_name && p.module_name.toLowerCase().includes('vehicle')));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
