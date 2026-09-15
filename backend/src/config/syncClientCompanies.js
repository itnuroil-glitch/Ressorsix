const db = require('./db');

async function syncClientCompanies() {
  try {
    console.log('Starting sync of client companies...');
    const clientRes = await db.query(
      `SELECT id, client_name, companyname, company_shortname, industry, address, country, state, email, trn_no, phone_no, website, trade_licenseno 
       FROM client 
       WHERE (isdelete = false OR isdelete IS NULL)`
    );

    console.log(`Found ${clientRes.rows.length} client(s).`);

    for (const cl of clientRes.rows) {
      if (!cl.companyname || !cl.companyname.trim()) continue;

      const compCheck = await db.query(
        'SELECT id, company_name FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) LIMIT 1',
        [cl.id]
      );

      let targetCompanyId = null;

      if (compCheck.rows.length > 0) {
        targetCompanyId = compCheck.rows[0].id;
        console.log(`Updating company ID ${targetCompanyId} for client "${cl.client_name}" (${cl.companyname})...`);
        await db.query(
          `UPDATE company 
           SET company_name = $1, 
               short_code = COALESCE($2, short_code),
               industry = COALESCE($3, industry),
               registered_address = COALESCE($4, registered_address),
               country = COALESCE($5, country),
               emirate = COALESCE($6, emirate)
           WHERE id = $7`,
          [
            cl.companyname.trim(),
            cl.company_shortname ? cl.company_shortname.trim() : null,
            cl.industry ? cl.industry.trim() : null,
            cl.address ? cl.address.trim() : null,
            cl.country ? cl.country.trim() : null,
            cl.state ? cl.state.trim() : null,
            targetCompanyId
          ]
        );
      } else {
        console.log(`Creating company for client "${cl.client_name}" (${cl.companyname})...`);
        const insComp = await db.query(
          `INSERT INTO company (
            clientid, company_name, short_code, industry, registered_address, 
            country, emirate, contact_email, trn, contact_phone, website, 
            trade_license_number, company_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Active')
          RETURNING id`,
          [
            cl.id,
            cl.companyname.trim(),
            cl.company_shortname ? cl.company_shortname.trim() : null,
            cl.industry ? cl.industry.trim() : null,
            cl.address ? cl.address.trim() : null,
            cl.country ? cl.country.trim() : null,
            cl.state ? cl.state.trim() : null,
            cl.email ? cl.email.toLowerCase().trim() : null,
            cl.trn_no ? cl.trn_no.toString() : null,
            cl.phone_no ? cl.phone_no.toString() : null,
            cl.website ? cl.website.trim() : null,
            cl.trade_licenseno ? cl.trade_licenseno.trim() : null
          ]
        );
        if (insComp.rows.length > 0) {
          targetCompanyId = insComp.rows[0].id;
        }
      }

      if (targetCompanyId) {
        const userUpdateRes = await db.query(
          'UPDATE users SET companyid = $1 WHERE clientid = $2 AND (companyid IS NULL OR companyid = 0)',
          [targetCompanyId, cl.id]
        );
        console.log(`Linked company ID ${targetCompanyId} to ${userUpdateRes.rowCount} user(s) of client "${cl.client_name}".`);
      }
    }

    console.log('Sync completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during client company sync:', err);
    process.exit(1);
  }
}

syncClientCompanies();
