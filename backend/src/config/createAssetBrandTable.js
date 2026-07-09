require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const createTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS tbl_asset_brand (
                bid SERIAL PRIMARY KEY,
                brand_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'Active',
                is_deleted INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await pool.query(query);
        console.log("tbl_asset_brand created successfully!");
    } catch (err) {
        console.error("Error creating table:", err.message);
    } finally {
        pool.end();
    }
};

createTable();
