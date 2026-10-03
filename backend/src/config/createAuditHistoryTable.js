const pool = require('./db');

async function createAuditHistoryTable() {
  try {
    console.log('[MIGRATION] Checking/creating tbl_audit_history table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tbl_audit_history (
        id SERIAL PRIMARY KEY,
        clientid INT,
        company_id INT,
        module_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(100) NOT NULL,
        record_title VARCHAR(255),
        action_type VARCHAR(50) NOT NULL,
        action_summary TEXT,
        changed_fields JSONB DEFAULT '[]'::jsonb,
        full_snapshot JSONB,
        user_id INT,
        user_name VARCHAR(150),
        user_email VARCHAR(150),
        user_role VARCHAR(100),
        ip_address VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_module_record 
        ON tbl_audit_history (module_name, record_id);

      CREATE INDEX IF NOT EXISTS idx_audit_client_company 
        ON tbl_audit_history (clientid, company_id);

      CREATE INDEX IF NOT EXISTS idx_audit_created_at 
        ON tbl_audit_history (created_at DESC);
    `);

    console.log('[MIGRATION] tbl_audit_history table and indexes verified successfully.');
    return true;
  } catch (err) {
    console.error('[MIGRATION ERROR] Failed to create tbl_audit_history:', err.message);
    return false;
  }
}

// Auto-run if executed directly via node
if (require.main === module) {
  createAuditHistoryTable().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = createAuditHistoryTable;
