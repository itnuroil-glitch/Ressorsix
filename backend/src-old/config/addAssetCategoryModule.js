require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const insertModule = async () => {
    try {
        // 1. Find the parent module (Settings)
        const parentQuery = await pool.query(`SELECT id FROM module WHERE module_name = 'Settings' AND is_deleted = false LIMIT 1`);
        let parentId = null;
        
        if (parentQuery.rows.length > 0) {
            parentId = parentQuery.rows[0].id;
        } else {
            console.log("Settings module not found. It might be named differently or doesn't exist.");
            // You can optionally create Settings here if it doesn't exist, but we assume it does.
        }

        // 2. Insert Asset Category
        const insertQuery = `
            INSERT INTO module (module_name, parent_id, status, is_deleted, route)
            VALUES ($1, $2, $3, false, $4)
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            'Asset Category',
            parentId,
            'active',
            'assetcategory'
        ]);

        console.log("Asset Category module added successfully!", result.rows[0]);
    } catch (err) {
        console.error("Error inserting module:", err.message);
    } finally {
        pool.end();
    }
};

insertModule();
