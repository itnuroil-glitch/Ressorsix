const fs = require('fs');
const path = require('path');
const pdfParseReq = require('pdf-parse');
const db = require('./src/config/db');

async function importAttachedPdfs() {
  try {
    console.log('--- STARTING DUAL-LAYER BULK PARSE OF ATTACHED PDF STATEMENTS ---');

    await db.query('DELETE FROM tbl_telecome_call_logs');
    console.log('Cleared existing test records from tbl_telecome_call_logs');

    const files = [
      { filename: 'etisalat bill.pdf', bill_id: 3, default_bill_no: 'INV2045264801', default_source: '0522486345' },
      { filename: 'I4008352339-du.pdf', bill_id: 4, default_bill_no: 'I4008352339', default_source: '0524806401' }
    ];

    const detectCategoryByPrefix = (destNum) => {
      if (!destNum) return 'National Call';
      const clean = destNum.trim();
      if (/^(0600|600|800)/.test(clean)) return 'Calls to Special Number';
      if (/^(\+971|00971|05|02|03|04|06|07|09)/.test(clean)) return 'National Call';
      if (/^(\+|00)/.test(clean)) return 'International Call';
      return 'National Call';
    };

    for (const item of files) {
      const filePath = path.join(__dirname, 'Attachment', item.filename);
      if (!fs.existsSync(filePath)) {
        console.log('File not found:', item.filename);
        continue;
      }

      const buf = fs.readFileSync(filePath);
      const inst = new pdfParseReq.PDFParse({ data: buf });
      const res = await inst.getText();
      const rawText = res.text;

      const callLogRegex = /(\d{2}\/\d{2}|\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)\s+(\d{2}:\d{2}(?::\d{2})?)\s+[ÌI]?([+\d]{7,20})[ÍI]?\s+(?:([A-Za-z\s]{2,20})\s+)?(\d{2}:\d{2}:\d{2})\s+([\d.]+)/i;
      
      const rawLines = rawText.split(/\r?\n/);
      let activeBannerCategory = null;
      let count = 0;

      for (const rawLine of rawLines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (/incoming\s*roaming/i.test(line)) {
          activeBannerCategory = 'Incoming Roaming Call';
        } else if (/outgoing\s*roaming/i.test(line)) {
          activeBannerCategory = 'Outgoing Roaming Call';
        } else if (/international\s*calls?/i.test(line)) {
          activeBannerCategory = 'International Call';
        } else if (/special\s*numbers?/i.test(line)) {
          activeBannerCategory = 'Calls to Special Number';
        } else if (/premium\s*sms|sms\s*&\s*messaging|text\s*message/i.test(line)) {
          activeBannerCategory = 'Premium SMS';
        } else if (/national\s*calls?|calls?\s*to\s*mobile|local\s*calls?/i.test(line)) {
          activeBannerCategory = 'National Call';
        }

        const logMatch = line.match(callLogRegex);
        if (logMatch) {
          let callDate = logMatch[1];
          if (callDate.includes('/')) {
            const [d, m] = callDate.split('/');
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mIdx = parseInt(m, 10) - 1;
            if (months[mIdx]) callDate = `${d} ${months[mIdx]} 2026`;
          }

          const destNum = logMatch[3];
          const finalCategory = activeBannerCategory || detectCategoryByPrefix(destNum);

          await db.query(
            `INSERT INTO tbl_telecome_call_logs 
              (tele_bill_id, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              item.bill_id,
              item.default_bill_no,
              item.default_source,
              callDate,
              logMatch[2],
              destNum,
              logMatch[5],
              finalCategory,
              parseFloat(logMatch[6] || 0)
            ]
          );
          count++;
        }
      }

      console.log(`Inserted ${count} itemized call logs for ${item.filename} (Bill #${item.bill_id})`);
    }

    const totalCount = await db.query('SELECT COUNT(*) FROM tbl_telecome_call_logs');
    const breakdown = await db.query('SELECT category, COUNT(*) FROM tbl_telecome_call_logs GROUP BY category ORDER BY count DESC');
    console.log('SUCCESS! TOTAL CALL LOGS IN tbl_telecome_call_logs:', totalCount.rows[0].count);
    console.log('CATEGORY BREAKDOWN IN POSTGRESQL:');
    console.table(breakdown.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error importing attached PDFs:', err);
    process.exit(1);
  }
}

importAttachedPdfs();
