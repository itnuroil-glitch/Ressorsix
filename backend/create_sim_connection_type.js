const db = require('./src/config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS public.tbl_sim_connection_type (
        id SERIAL PRIMARY KEY,
        connection_type_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        client_id VARCHAR(50) DEFAULT NULL,
        is_deleted INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('tbl_sim_connection_type created successfully!');

    await db.query(`
      INSERT INTO public.tbl_sim_connection_type (connection_type_name, status)
      VALUES 
        ('Voice Line', 'Active'),
        ('Data SIM', 'Active'),
        ('Voice & Data', 'Active'),
        ('Prepaid', 'Active'),
        ('Postpaid', 'Active'),
        ('M2M / IoT', 'Active'),
        ('Corporate / Enterprise', 'Active')
      ON CONFLICT DO NOTHING;
    `);
    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Error creating table:', err.message);
  } finally {
    process.exit();
  }
}

run();
