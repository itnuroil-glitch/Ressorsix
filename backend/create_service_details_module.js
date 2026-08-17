const db = require('./src/config/db');

async function ensureServiceDetailsModule() {
  try {
    // Check if 'Service Details' module exists
    const checkRes = await db.query(`SELECT * FROM module WHERE LOWER(module_name) LIKE '%service detail%' AND is_deleted = false`);
    
    if (checkRes.rows.length === 0) {
      // Find parent_id for Settings (#4)
      const settingsRes = await db.query(`SELECT id FROM module WHERE LOWER(module_name) = 'settings' AND is_deleted = false LIMIT 1`);
      const parentId = settingsRes.rows.length > 0 ? settingsRes.rows[0].id : 4;

      const insertRes = await db.query(`
        INSERT INTO module (module_name, parent_id, status, is_deleted, route)
        VALUES ('Service Details', $1, 'active', false, '/service-details')
        RETURNING *
      `, [parentId]);

      console.log('Registered Service Details module:', insertRes.rows[0]);
    } else {
      console.log('Service Details module already exists:', checkRes.rows[0]);
    }
  } catch (err) {
    console.error('Error ensuring Service Details module:', err);
  } finally {
    process.exit();
  }
}

ensureServiceDetailsModule();
