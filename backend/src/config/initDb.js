const db = require('./db');

async function runSafeQuery(description, queryText) {
  try {
    console.log(`[DB INIT] Executing: ${description}...`);
    await db.query(queryText);
    console.log(`[DB INIT] Success: ${description}`);
  } catch (err) {
    console.error(`[DB INIT WARNING] ${description}:`, err.message);
  }
}

async function initDb() {
  console.log('====================================================');
  console.log('  Running Automated Trakio Database Initialization');
  console.log('====================================================');

  try {
    // 1. Company table
    await runSafeQuery('Create Company Table', `
      CREATE TABLE IF NOT EXISTS company (
        id SERIAL PRIMARY KEY,
        clientid INTEGER,
        company_name VARCHAR(255) NOT NULL,
        short_code VARCHAR(100),
        traffic_file_number VARCHAR(100),
        legal_form VARCHAR(255),
        industry VARCHAR(255),
        business_activity TEXT,
        jurisdiction VARCHAR(255),
        licensing_authority VARCHAR(255),
        trade_license_number VARCHAR(100),
        trade_license_issue_date VARCHAR(100),
        trade_license_expiry_date VARCHAR(100),
        company_status VARCHAR(100) DEFAULT 'Active',
        country VARCHAR(255),
        emirate VARCHAR(255),
        registered_address TEXT,
        po_box VARCHAR(100),
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(100),
        website VARCHAR(255),
        vat_registered VARCHAR(100) DEFAULT 'No',
        trn VARCHAR(100),
        corporate_tax_registration_number VARCHAR(100),
        establishment_card_number VARCHAR(100),
        establishment_card_expiry_date VARCHAR(100),
        mohre_number VARCHAR(100),
        wps_registered VARCHAR(100) DEFAULT 'No',
        nafis_emiratisation_applicable VARCHAR(100) DEFAULT 'No',
        gpssa_applicable VARCHAR(100) DEFAULT 'No',
        authorized_signatory_name VARCHAR(255),
        authorized_signatory_designation VARCHAR(255),
        default_bank VARCHAR(255),
        default_currency VARCHAR(100) DEFAULT 'AED',
        asset_prefix VARCHAR(100),
        vehicle_prefix VARCHAR(100),
        employee_prefix VARCHAR(100),
        trade_license_alert_days INTEGER DEFAULT 30,
        establishment_card_alert_days INTEGER DEFAULT 30,
        insurance_alert_days INTEGER DEFAULT 30,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 1b. Module table
    await runSafeQuery('Create Module Table', `
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

    // 1c. Role table
    await runSafeQuery('Create Role Table', `
      CREATE TABLE IF NOT EXISTS role (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Role permission table
    await runSafeQuery('Create Role Permission Table', `
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

    // 3. Vehicle Toll table
    await runSafeQuery('Create Vehicle Toll Table', `
      CREATE TABLE IF NOT EXISTS tbl_vehicle_toll (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Toll Overview table
    await runSafeQuery('Create Toll Overview Table', `
      CREATE TABLE IF NOT EXISTS tbl_toll_overview (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Asset Brands table
    await runSafeQuery('Create Asset Brands Table', `
      CREATE TABLE IF NOT EXISTS tbl_asset_brands (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Asset Categories table
    await runSafeQuery('Create Asset Categories Table', `
      CREATE TABLE IF NOT EXISTS tbl_asset_categories (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Sim Plans table
    await runSafeQuery('Create Sim Plans Table', `
      CREATE TABLE IF NOT EXISTS tbl_sim_plans (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. System Setting table
    await runSafeQuery('Create System Setting Table', `
      CREATE TABLE IF NOT EXISTS tbl_system_setting (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        custom_field_id INT,
        field_data JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Check and add company_id to role_permission
    const checkCol = await db.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'role_permission' AND column_name = 'company_id'
    `);
    if (checkCol.rows.length === 0) {
      await runSafeQuery('Add company_id column to role_permission', `
        ALTER TABLE role_permission 
        ADD COLUMN company_id INTEGER
      `);
    }

    // 10. Check and add authentik_sub to users table
    const checkSub = await db.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'authentik_sub'
    `);
    if (checkSub.rows.length === 0) {
      await runSafeQuery('Add authentik_sub column to users', `
        ALTER TABLE users 
        ADD COLUMN authentik_sub VARCHAR(255) UNIQUE
      `);
    }

    // 11. Create tbl_sessions for Server-Side Session storage
    await runSafeQuery('Create Server-Side Session Table', `
      CREATE TABLE IF NOT EXISTS tbl_sessions (
        id SERIAL PRIMARY KEY,
        session_token_hash VARCHAR(255) NOT NULL UNIQUE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        authentik_sub VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        groups JSONB NOT NULL,
        entitlement_checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_hash ON tbl_sessions(session_token_hash);
    `);

    console.log('====================================================');
    console.log('  Database Initialization Completed Successfully!');
    console.log('====================================================');
  } catch (err) {
    console.error('Database Initialization encountered an error:', err);
  }
}

if (require.main === module) {
  initDb().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  module.exports = initDb;
}
