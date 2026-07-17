require('dotenv').config({ path: '.env' });
const db = require('./src/config/db');

async function migrate() {
  try {
    console.log("Starting migration for tbl_plan...");

    // 1. Create tbl_plan table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tbl_plan (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL UNIQUE,
        plan_code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        enabled_modules JSONB NOT NULL DEFAULT '[]',
        status INT DEFAULT 1,
        isdelete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createTableQuery);
    console.log("Table 'tbl_plan' created or already exists.");

    // 2. Add comments/descriptions to columns (PostgreSQL specific)
    const commentsQueries = [
      `COMMENT ON TABLE tbl_plan IS 'Stores subscription plans and their allowed features/modules';`,
      `COMMENT ON COLUMN tbl_plan.id IS 'Primary key identifier for the plan';`,
      `COMMENT ON COLUMN tbl_plan.plan_name IS 'The display name of the plan shown to the user';`,
      `COMMENT ON COLUMN tbl_plan.plan_code IS 'Machine-readable plan code/slug used in logic checks';`,
      `COMMENT ON COLUMN tbl_plan.description IS 'Detailed description of the plan contents and limits';`,
      `COMMENT ON COLUMN tbl_plan.price IS 'The billing cost of the subscription plan';`,
      `COMMENT ON COLUMN tbl_plan.enabled_modules IS 'JSONB array listing the specific modules activated for this plan';`,
      `COMMENT ON COLUMN tbl_plan.status IS 'Determines availability: 1 = Active, 0 = Inactive';`,
      `COMMENT ON COLUMN tbl_plan.isdelete IS 'Soft delete flag to preserve integrity: TRUE = Deleted, FALSE = Active';`
    ];

    for (const q of commentsQueries) {
      try {
        await db.query(q);
      } catch (err) {
        console.warn("Could not set database comment: ", err.message);
      }
    }
    console.log("Database comments set on tbl_plan columns.");

    // 3. Seed initial plans (Basic, Standard, Advance) if they do not exist
    const checkPlans = await db.query("SELECT COUNT(*) FROM tbl_plan");
    if (parseInt(checkPlans.rows[0].count, 10) === 0) {
      console.log("Seeding default plans (Basic, Standard, Advance)...");
      const seedQuery = `
        INSERT INTO tbl_plan (plan_name, plan_code, description, price, enabled_modules, status)
        VALUES 
          (
            'Basic Plan', 
            'basic', 
            'Access to core dashboard and basic asset management.', 
            49.00, 
            '["dashboard", "assets"]'::jsonb, 
            1
          ),
          (
            'Standard Plan', 
            'standard', 
            'Standard package including suppliers and purchase records.', 
            99.00, 
            '["dashboard", "assets", "suppliers", "purchases"]'::jsonb, 
            1
          ),
          (
            'Advance Plan', 
            'advance', 
            'All-inclusive plan with vehicle details, supplier registers, and advanced analytics.', 
            249.00, 
            '["dashboard", "assets", "suppliers", "purchases", "vehicles", "analytics"]'::jsonb, 
            1
          );
      `;
      await db.query(seedQuery);
      console.log("Plans seeded successfully.");
    } else {
      console.log("Plans already exist in database. Skipping seeding.");
    }

    // 4. Alter client table to link it to tbl_plan
    console.log("Checking if 'plan_id' column exists in 'client' table...");
    const checkColQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client' AND column_name = 'plan_id';
    `;
    const checkColRes = await db.query(checkColQuery);

    if (checkColRes.rows.length === 0) {
      console.log("Adding 'plan_id' column to 'client' table...");
      const alterTableQuery = `
        ALTER TABLE client 
        ADD COLUMN plan_id INTEGER REFERENCES tbl_plan(id);
      `;
      await db.query(alterTableQuery);
      console.log("'plan_id' column successfully added to 'client' table.");
    } else {
      console.log("'plan_id' column already exists in 'client' table.");
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
