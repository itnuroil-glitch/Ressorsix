const db = require('./db');

async function migrate() {
  try {
    console.log('Creating role_permission table in PostgreSQL database...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS role_permission (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL REFERENCES module(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        full_control BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, module_id)
      );
    `;

    await db.query(createTableQuery);
    console.log('- role_permission table created successfully.');
    console.log('Role permission table migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
