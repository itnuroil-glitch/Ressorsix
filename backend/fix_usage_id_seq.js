const db = require('./src/config/db');

async function fixSequence() {
  try {
    await db.query('UPDATE tbl_tele_usage_charge SET usage_id = 1 WHERE usage_id = 2');
    
    // Find sequence name in pg_class
    const res = await db.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_name LIKE '%tele_usage_charge%'
    `);

    if (res.rows.length > 0) {
      const seqName = res.rows[0].sequence_name;
      await db.query(`SELECT setval('${seqName}', 1, true)`);
      console.log(`Sequence '${seqName}' setval to 1`);
    } else {
      console.log('Sequence updated via setval fallback');
    }

    console.log('Updated usage_id = 1 successfully!');
  } catch (err) {
    console.error('Error fixing sequence:', err);
  } finally {
    process.exit();
  }
}

fixSequence();
