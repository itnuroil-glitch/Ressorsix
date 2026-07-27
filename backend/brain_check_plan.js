require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function checkPlans() {
  try {
    const clients = await db.query(`
      SELECT *
      FROM client
    `);
    console.log("CLIENT PLANS:");
    clients.rows.forEach(c => {
      console.log(`ID: ${c.id}, Name: ${c.client_name || c.name || c.company_name}, Plan ID: ${c.plan_id}`);
    });

    const planModules = await db.query(`
      SELECT plan_id, enabled_module 
      FROM tbl_plan_modules
    `);
    console.log("\nPLAN MODULES:");
    console.log(planModules.rows);

    const modules = await db.query(`
      SELECT id, module_name, parent_id 
      FROM module
      WHERE is_deleted = false
    `);
    console.log("\nALL MODULES IN DB:");
    console.log(modules.rows);

  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
checkPlans();
