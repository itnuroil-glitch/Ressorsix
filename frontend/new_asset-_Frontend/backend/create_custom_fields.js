const db = require('./src/config/db');

const createTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS custom_fields (
                id SERIAL PRIMARY KEY,
                clientid INTEGER REFERENCES client(id) ON DELETE SET NULL,
                moduleid INTEGER REFERENCES module(id) ON DELETE SET NULL,
                status VARCHAR(50) DEFAULT 'Active',
                isdelete BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('custom_fields table created successfully');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        process.exit();
    }
};

createTable();
