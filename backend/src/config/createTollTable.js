const db = require('./db');

async function createTollTable() {
  try {
    console.log('Creating tbl_vehicle_toll table in PostgreSQL database...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS tbl_vehicle_toll (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(100) UNIQUE,
        trip_date DATE,
        trip_time TIME,
        transaction_post_date DATE,
        toll_gate VARCHAR(150),
        direction VARCHAR(100),
        tag_number VARCHAR(100),
        plate_number VARCHAR(100),
        amount NUMERIC(10, 2) DEFAULT 0.00,
        vehicle_id INT,
        company_id INT,
        clientid INT,
        status INT DEFAULT 1,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(query);
    console.log('Table tbl_vehicle_toll created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tbl_vehicle_toll table:', error);
    process.exit(1);
  }
}

createTollTable();
