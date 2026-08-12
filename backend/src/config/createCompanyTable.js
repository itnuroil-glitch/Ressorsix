const db = require('./db');

async function migrate() {
  try {
    console.log('Creating company table in PostgreSQL database...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS company (
        id SERIAL PRIMARY KEY,
        clientid INTEGER REFERENCES client(id) ON DELETE SET NULL,
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
    `;

    await db.query(createTableQuery);
    console.log('- company table created successfully with all specified UAE Master Data fields.');

    console.log('Company table migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
