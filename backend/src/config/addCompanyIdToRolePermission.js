const db = require('./db');

async function migrate() {
  try {
    console.log('Running database schema updates for role permissions...');

    // 1. Add company_id if not present
    const checkCol = await db.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'role_permission' AND column_name = 'company_id'
    `);

    if (checkCol.rows.length === 0) {
      console.log('Adding company_id column...');
      await db.query(`
        ALTER TABLE role_permission 
        ADD COLUMN company_id INTEGER REFERENCES company(id) ON DELETE CASCADE
      `);
      console.log('company_id column added.');
    } else {
      console.log('company_id column already exists.');
    }

    // 2. Drop the old UNIQUE constraint
    console.log('Dropping old unique constraint if exists...');
    await db.query(`
      ALTER TABLE role_permission 
      DROP CONSTRAINT IF EXISTS role_permission_role_id_module_id_key
    `);
    console.log('Old UNIQUE constraint dropped.');

    // 3. Create company-specific unique index
    console.log('Creating role_permission_role_module_company_idx...');
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS role_permission_role_module_company_idx 
      ON role_permission (role_id, module_id, company_id) 
      WHERE company_id IS NOT NULL
    `);

    // 4. Create global unique index
    console.log('Creating role_permission_role_module_global_idx...');
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS role_permission_role_module_global_idx 
      ON role_permission (role_id, module_id) 
      WHERE company_id IS NULL
    `);

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
