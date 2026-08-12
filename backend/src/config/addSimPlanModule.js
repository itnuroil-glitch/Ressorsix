const db = require('./db');

const insertModule = async () => {
    try {
        // 1. Find the parent module (Settings)
        const parentQuery = await db.query(`SELECT id FROM module WHERE module_name = 'Settings' AND is_deleted = false LIMIT 1`);
        let parentId = null;
        
        if (parentQuery.rows.length > 0) {
            parentId = parentQuery.rows[0].id;
        }

        // Check if Sim Plan Name module already exists
        const checkExisting = await db.query(`SELECT id FROM module WHERE LOWER(module_name) = LOWER($1) AND is_deleted = false`, ['Sim Plan Name']);
        let moduleId;

        if (checkExisting.rows.length > 0) {
            moduleId = checkExisting.rows[0].id;
            console.log("Sim Plan Name module exists! ID:", moduleId);
        } else {
            // 2. Insert Sim Plan Name module
            const insertQuery = `
                INSERT INTO module (module_name, parent_id, status, is_deleted, route)
                VALUES ($1, $2, $3, false, $4)
                RETURNING *
            `;
            const result = await db.query(insertQuery, [
                'Sim Plan Name',
                parentId,
                'active',
                'simplan'
            ]);

            moduleId = result.rows[0].id;
            console.log("Sim Plan Name module added successfully! ID:", moduleId);
        }

        // 3. Grant full permissions to all roles
        const rolesRes = await db.query(`SELECT id FROM role`);
        for (const role of rolesRes.rows) {
            const checkPerm = await db.query(`SELECT id FROM role_permission WHERE role_id = $1 AND module_id = $2`, [role.id, moduleId]);
            if (checkPerm.rows.length === 0) {
                await db.query(`
                    INSERT INTO role_permission (role_id, module_id, can_view, can_create, can_edit, can_delete, full_control)
                    VALUES ($1, $2, true, true, true, true, true)
                `, [role.id, moduleId]);
            } else {
                await db.query(`
                    UPDATE role_permission 
                    SET can_view=true, can_create=true, can_edit=true, can_delete=true, full_control=true
                    WHERE role_id = $1 AND module_id = $2
                `, [role.id, moduleId]);
            }
        }
        console.log("Permissions granted to all roles!");

    } catch (err) {
        console.error("Error inserting module:", err.message);
    } finally {
        if (db.pool) db.pool.end();
    }
};

insertModule();
