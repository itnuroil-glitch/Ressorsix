require('dotenv').config();
const db = require('./db');

const addTollOverviewModule = async () => {
  try {
    console.log("Checking and registering 'Vehicle Toll Overview' module in database...");

    // 0. Ensure required tables exist before querying
    await db.query(`
      CREATE TABLE IF NOT EXISTS module (
        id SERIAL PRIMARY KEY,
        module_name VARCHAR(255) NOT NULL,
        parent_id INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        is_deleted BOOLEAN DEFAULT false,
        route VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS role (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS role_permission (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        can_view BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        all_record_view BOOLEAN DEFAULT false,
        full_control BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1. Find parent module 'Vehicle'
    const parentQuery = await db.query(`SELECT id FROM module WHERE (module_name = 'Vehicle' OR module_name = 'Vehicle Toll') AND is_deleted = false LIMIT 1`);
    let parentId = parentQuery.rows.length > 0 ? parentQuery.rows[0].id : 18;

    // 2. Insert or update Vehicle Toll Overview module
    const checkModule = await db.query(`SELECT id FROM module WHERE module_name = 'Vehicle Toll Overview' OR id = 70 LIMIT 1`);
    let moduleId = 70;

    if (checkModule.rows.length === 0) {
      const insertQuery = `
        INSERT INTO module (id, module_name, parent_id, status, is_deleted, route)
        VALUES (70, 'Vehicle Toll Overview', $1, 'active', false, '/vehicle-toll-overview')
        RETURNING id;
      `;
      const res = await db.query(insertQuery, [parentId]);
      moduleId = res.rows[0].id;
      console.log("Module 'Vehicle Toll Overview' created with ID:", moduleId);
    } else {
      moduleId = checkModule.rows[0].id;
      await db.query(`
        UPDATE module 
        SET module_name = 'Vehicle Toll Overview', parent_id = $1, status = 'active', is_deleted = false, route = '/vehicle-toll-overview'
        WHERE id = $2
      `, [parentId, moduleId]);
      console.log("Module 'Vehicle Toll Overview' updated with ID:", moduleId);
    }

    // Adjust primary key sequence if needed so future auto-increment inserts don't collide
    await db.query(`SELECT setval(pg_get_serial_sequence('module', 'id'), GREATEST((SELECT MAX(id) FROM module), 70), true)`).catch(() => {});

    // 3. Grant permissions idempotently to all existing roles
    const checkCol = await db.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'role_permission' AND column_name = 'company_id'
    `);
    const hasCompanyId = checkCol.rows.length > 0;

    const rolesRes = await db.query(`SELECT id FROM role`);
    for (const role of rolesRes.rows) {
      if (hasCompanyId) {
        const checkPerm = await db.query(
          `SELECT id FROM role_permission WHERE role_id = $1 AND module_id = $2 AND company_id IS NULL`,
          [role.id, moduleId]
        );
        if (checkPerm.rows.length === 0) {
          await db.query(
            `INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control) VALUES ($1, $2, true, true, true, true, true)`,
            [role.id, moduleId]
          );
        } else {
          await db.query(
            `UPDATE role_permission SET can_view=true, can_create=true, can_edit=true, can_delete=true, full_control=true WHERE id = $1`,
            [checkPerm.rows[0].id]
          );
        }
      } else {
        const checkPerm = await db.query(
          `SELECT id FROM role_permission WHERE role_id = $1 AND module_id = $2`,
          [role.id, moduleId]
        );
        if (checkPerm.rows.length === 0) {
          await db.query(
            `INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control) VALUES ($1, $2, true, true, true, true, true)`,
            [role.id, moduleId]
          );
        } else {
          await db.query(
            `UPDATE role_permission SET can_view=true, can_create=true, can_edit=true, can_delete=true, full_control=true WHERE id = $1`,
            [checkPerm.rows[0].id]
          );
        }
      }
    }
    console.log("Permissions granted to all roles for Vehicle Toll Overview!");

    process.exit(0);
  } catch (err) {
    console.error("Error setting up Vehicle Toll Overview module:", err);
    process.exit(1);
  }
};

addTollOverviewModule();
