require('dotenv').config();
const db = require('./db');

const addTollOverviewModule = async () => {
  try {
    console.log("Checking and registering 'Vehicle Toll Overview' module in database...");

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

    // 3. Delete existing role permissions for this module to avoid duplicate conflict, then insert
    await db.query(`DELETE FROM role_permission WHERE module_id = $1`, [moduleId]);
    const permQuery = `
      INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control)
      SELECT id, $1, true, true, true, true, true FROM role;
    `;
    await db.query(permQuery, [moduleId]);
    console.log("Permissions granted to all roles for Vehicle Toll Overview!");

    process.exit(0);
  } catch (err) {
    console.error("Error setting up Vehicle Toll Overview module:", err);
    process.exit(1);
  }
};

addTollOverviewModule();
