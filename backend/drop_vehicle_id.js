const db = require('./src/config/db');

async function dropVehicleIdColumn() {
  try {
    console.log("Dropping vehicle_id column from tbl_toll_overview...");
    await db.query("ALTER TABLE public.tbl_toll_overview DROP COLUMN IF EXISTS vehicle_id;");
    console.log("Column vehicle_id dropped successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error dropping column:", err);
    process.exit(1);
  }
}

dropVehicleIdColumn();
