const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'trakio',
  password: '2965',
  port: 5432
});

const query = `
  CREATE TABLE IF NOT EXISTS attachment (
    id SERIAL PRIMARY KEY,
    clientid INTEGER REFERENCES client(id),
    companyid INTEGER REFERENCES company(id),
    attachment TEXT,
    type VARCHAR(100),
    expire_date DATE,
    status INTEGER DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.query(query)
  .then(res => {
    console.log('Table created successfully');
    pool.end();
  })
  .catch(err => {
    console.error('Error creating table:', err);
    pool.end();
  });
