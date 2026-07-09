const db = require('./src/config/db');

db.query(`
  CREATE TABLE IF NOT EXISTS tbl_vat (
    id SERIAL PRIMARY KEY,
    vat NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    isdelete BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => {
  console.log('tbl_vat created successfully');
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
