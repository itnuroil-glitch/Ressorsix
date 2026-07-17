const db = require('./src/config/db');
db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%subsection%'").then(res => {
  console.log(res.rows);
  return db.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name LIKE '%subsection%'");
}).then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(console.error);
