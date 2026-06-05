require('dotenv').config({ path: 'backend/.env' });
const db = require('./backend/src/config/db');

async function createTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS tbl_field_permissions (
        id SERIAL PRIMARY KEY,
        clientid INTEGER REFERENCES client(id) ON DELETE CASCADE,
        country_id INTEGER REFERENCES country(id) ON DELETE CASCADE,
        moduleid INTEGER REFERENCES module(id) ON DELETE CASCADE,
        permitted_fields JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(query);
    console.log("Table tbl_field_permissions created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
}

createTable();
