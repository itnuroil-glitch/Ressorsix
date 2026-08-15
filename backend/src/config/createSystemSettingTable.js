const pool = require('./db');

async function createSystemSettingTable() {
  try {
    // Add clientid column if not present
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_system_setting (
        id SERIAL PRIMARY KEY,
        clientid INT,
        setting_key VARCHAR(150) NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(50) DEFAULT 'Boolean',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure clientid column exists if table was previously created without it
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tbl_system_setting' AND column_name='clientid') THEN
          ALTER TABLE tbl_system_setting ADD COLUMN clientid INT;
        END IF;
      END $$;
    `);

    // Remove old strict single-column unique constraint on setting_key if it exists
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tbl_system_setting_setting_key_key') THEN
          ALTER TABLE tbl_system_setting DROP CONSTRAINT tbl_system_setting_setting_key_key;
        END IF;
      END $$;
    `);

    await pool.query(`
      INSERT INTO tbl_system_setting (clientid, setting_key, setting_value, setting_type, description)
      VALUES 
        (NULL, 'smtp_enabled', '1', 'Boolean', 'Enable/disable all system email notifications across the platform.'),
        (NULL, 'inventory_movement_enabled', '1', 'Boolean', 'Enable/disable all inventory movements. When disabled, no data will be entered into inventory_transactions or inventory_stock_batch.')
      ON CONFLICT DO NOTHING;
    `);

    await pool.query("UPDATE module SET module_name = 'System Settings' WHERE id = 68 OR module_name = 'Sytem Settings'");

    console.log('CLIENTID SCOPING MIGRATION FOR TBL_SYSTEM_SETTING COMPLETED!');
  } catch (err) {
    console.error('Error in system setting migration:', err);
  }
}

createSystemSettingTable();
