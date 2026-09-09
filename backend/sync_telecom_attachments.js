require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function syncExistingTelecomAttachments() {
  try {
    const attachmentDir = path.join(__dirname, 'Attachment');
    if (!fs.existsSync(attachmentDir)) {
      fs.mkdirSync(attachmentDir, { recursive: true });
    }

    // Ensure sample files exist under their bill names
    const etisalatSource = path.join(attachmentDir, 'etisalat bill.pdf');
    const targetSample = path.join(attachmentDir, '0522486345_2045264801_2026-07-01.pdf');
    if (fs.existsSync(etisalatSource) && !fs.existsSync(targetSample)) {
      fs.copyFileSync(etisalatSource, targetSample);
      console.log('Copied etisalat bill.pdf to 0522486345_2045264801_2026-07-01.pdf');
    }

    // Check records in tbl_telecome_bill
    const res = await db.query('SELECT * FROM tbl_telecome_bill');
    console.log(`Found ${res.rows.length} telecom bill records.`);

    for (const row of res.rows) {
      const billId = row.tele_bill_id || row.bill_id || row.id;
      const pdfFile = row.pdf_filename || (row.field_data && typeof row.field_data === 'object' ? row.field_data['Invoice PDF'] : null);
      if (pdfFile) {
        let cleanPath = pdfFile;
        if (!cleanPath.startsWith('/')) {
          cleanPath = `/backend/Attachment/${cleanPath}`;
        }
        // Check if already in attachment table
        const existing = await db.query('SELECT id FROM attachment WHERE attachment = $1', [cleanPath]);
        if (existing.rows.length === 0) {
          const clientId = row.clientid ? parseInt(row.clientid, 10) : null;
          let companyId = null;
          if (row.company_name) {
            const compRes = await db.query('SELECT id FROM company WHERE company_name ILIKE $1 OR name ILIKE $1 LIMIT 1', [row.company_name.trim()]);
            if (compRes.rows.length > 0) companyId = compRes.rows[0].id;
          }
          await db.query(
            `INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
             VALUES ($1, $2, $3, 'Telecom Bill', NULL, 1, false, NOW(), NOW())`,
            [isNaN(clientId) ? null : clientId, companyId, cleanPath]
          );
          console.log(`Registered attachment for bill #${billId}: ${cleanPath}`);
        }
      }
    }
    console.log('Sync complete.');
  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    process.exit(0);
  }
}

syncExistingTelecomAttachments();
