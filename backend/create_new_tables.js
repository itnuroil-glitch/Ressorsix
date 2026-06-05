const db = require('./src/config/db');

async function createTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_customfields (
        id SERIAL PRIMARY KEY,
        clientid INT,
        country_id INT,
        moduleid INT,
        status VARCHAR(50),
        isdelete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created tbl_customfields');

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_customfield_details (
        id SERIAL PRIMARY KEY,
        custom_fieldsid INT REFERENCES tbl_customfields(id),
        section_id VARCHAR(100),
        section_name VARCHAR(255),
        field_id VARCHAR(100),
        field_name VARCHAR(255),
        field_type VARCHAR(100),
        is_required BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        options TEXT,
        allow_multiple BOOLEAN DEFAULT FALSE,
        parent_fieldid VARCHAR(100), 
        subsection_id VARCHAR(100),
        subsection_name VARCHAR(255),
        isdelete BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Created tbl_customfield_details');

    await db.query(`
      CREATE TABLE IF NOT EXISTS tbl_customfieldsvalues (
        id SERIAL PRIMARY KEY,
        custom_fieldsid INT REFERENCES tbl_customfields(id),
        fieldid INT REFERENCES tbl_customfield_details(id),
        values TEXT,
        isdelete BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('Created tbl_customfieldsvalues');

  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    process.exit();
  }
}

createTables();
