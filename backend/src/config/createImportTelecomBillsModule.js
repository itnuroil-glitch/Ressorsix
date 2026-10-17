const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('./db');

async function run() {
  try {
    // 1. Check if Import Telecom Bills module already exists
    let modRes = await db.query("SELECT * FROM module WHERE route = '/import-telecom-bills' OR module_name ILIKE '%import tel%'");
    let moduleId;
    if (modRes.rows.length === 0) {
      const insRes = await db.query(`
        INSERT INTO module (module_name, route, parent_id, is_deleted)
        VALUES ('Import Telecom Bills', '/import-telecom-bills', 57, false)
        RETURNING *
      `);
      moduleId = insRes.rows[0].id;
      console.log('Inserted Import Telecom Bills module with ID:', moduleId);
    } else {
      moduleId = modRes.rows[0].id;
      console.log('Import Telecom Bills module already exists with ID:', moduleId);
    }

    // 2. Add to tbl_plan_modules for all plans that have module 57
    const plansWithTele = await db.query("SELECT DISTINCT plan_id FROM tbl_plan_modules WHERE enabled_module = 57");
    for (const r of plansWithTele.rows) {
      const exists = await db.query("SELECT id FROM tbl_plan_modules WHERE plan_id = $1 AND enabled_module = $2", [r.plan_id, moduleId]);
      if (exists.rows.length === 0) {
        await db.query("INSERT INTO tbl_plan_modules (plan_id, enabled_module) VALUES ($1, $2)", [r.plan_id, moduleId]);
        console.log(`Added module ${moduleId} to plan ${r.plan_id}`);
      }
    }

    // 3. Grant full permissions to all roles that have access to telecom modules (57, 58, 59, 60)
    const permsRes = await db.query("SELECT DISTINCT role_id, company_id, client_id FROM role_permission WHERE module_id IN (57, 58, 59, 60)");
    for (const p of permsRes.rows) {
      const permExists = await db.query(
        "SELECT id FROM role_permission WHERE role_id = $1 AND module_id = $2 AND (company_id = $3 OR (company_id IS NULL AND $3 IS NULL))",
        [p.role_id, moduleId, p.company_id]
      );
      if (permExists.rows.length === 0) {
        await db.query(`
          INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control, all_record_view, company_id, client_id, created_at, updated_at)
          VALUES ($1, $2, true, true, true, true, true, true, $3, $4, NOW(), NOW())
        `, [p.role_id, moduleId, p.company_id, p.client_id]);
        console.log(`Granted permissions to role ${p.role_id} for module ${moduleId}`);
      }
    }

    console.log('Import Telecom Bills module setup complete!');
  } catch (err) {
    console.error('Error setting up Import Telecom Bills module:', err);
  } finally {
    process.exit(0);
  }
}

run();
