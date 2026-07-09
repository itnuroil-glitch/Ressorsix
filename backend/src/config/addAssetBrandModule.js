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
        }

        // 2. Insert Asset Brand
        const insertQuery = `
            INSERT INTO module (module_name, parent_id, status, is_deleted, route)
            VALUES ($1, $2, $3, false, $4)
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            'Asset Brand',
            parentId,
            'active',
            'assetbrand'
        ]);

        const moduleId = result.rows[0].id;
        console.log("Asset Brand module added successfully! ID:", moduleId);

        // 3. Grant full permissions to all roles so it shows up in the sidebar immediately
        const permQuery = `
            INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control)
            SELECT id, $1, true, true, true, true, true FROM role
            ON CONFLICT (role_id, module_id) DO UPDATE 
            SET can_view=true, can_create=true, can_edit=true, can_delete=true, full_control=true
        `;
        await pool.query(permQuery, [moduleId]);
        console.log("Permissions granted to all roles!");

    } catch (err) {
        console.error("Error inserting module:", err.message);
    } finally {
        pool.end();
    }
};

insertModule();
