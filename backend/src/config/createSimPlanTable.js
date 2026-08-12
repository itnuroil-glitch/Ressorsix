const db = require('./db');

const createTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS tbl_sim_plan (
                id SERIAL PRIMARY KEY,
                plan_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Active',
                client_id VARCHAR(100),
                is_deleted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await db.query(query);
        console.log("tbl_sim_plan created successfully!");
    } catch (err) {
        console.error("Error creating tbl_sim_plan table:", err.message);
    } finally {
        if (db.pool) db.pool.end();
    }
};

createTable();
