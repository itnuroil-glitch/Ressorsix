const db = require('./db');

async function createTollOverviewTable() {
  try {
    console.log('Creating tbl_toll_overview table in PostgreSQL database...');

    const query = `
      CREATE TABLE IF NOT EXISTS tbl_toll_overview (
        id SERIAL PRIMARY KEY,
        vehicle_id INT,
        custom_field_id INT,
        field_data JSONB,
        clientid INT,
        country_id INT,
        moduleid INT DEFAULT 70,
        roleid INT,
        user_id INT,
        company_id INT,
        status INT DEFAULT 1,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(query);
    console.log('Table tbl_toll_overview created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tbl_toll_overview table:', error);
    process.exit(1);
  }
}

createTollOverviewTable();
