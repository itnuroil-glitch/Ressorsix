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
    const query = `
        CREATE TABLE IF NOT EXISTS tbl_asset_category (
            cid SERIAL PRIMARY KEY,
            category_name VARCHAR(255) NOT NULL,
            parent_id INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Active',
            is_deleted INT DEFAULT 0
        );
    `;
    
    try {
        await pool.query(query);
        console.log("Table 'tbl_asset_category' created successfully!");
    } catch (err) {
        console.error("Error creating table:", err.message);
    } finally {
        pool.end();
    }
};

createTable();
