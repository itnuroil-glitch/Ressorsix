// One-time: read the PDFs of bills that are already saved and store their plan allowances / usage totals
// in tbl_telecome_usage_summary (the PDF parser does this automatically for new uploads).
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const db = require('./src/config/db');
const { extractUsageSummaries, saveUsageSummaries } = require('./src/utils/usageSummaryExtractor');

(async () => {
  try {
    const bills = (await db.query(`SELECT bill_number, mobile_number, pdf_filename FROM tbl_telecome_bill`)).rows;
    const dir = path.join(__dirname, 'Attachment');
    const done = new Set();
    let saved = 0;
    for (const b of bills) {
      const key = String(b.bill_number || '').trim();
      if (!key || done.has(key) || !b.pdf_filename) continue;
      // stored names carry a timestamp prefix that can differ between copies, so match on the rest of the name
      const wanted = path.basename(String(b.pdf_filename)).replace(/^\d+-/, '');
      const match = fs.readdirSync(dir).filter(f => f.replace(/^\d+-/, '') === wanted).sort().pop();
      if (!match) { console.log(`skip ${key}: file not found (${b.pdf_filename})`); continue; }
      const file = path.join(dir, match);
      const r = await new pdfParse.PDFParse({ data: fs.readFileSync(file) }).getText();
      const sums = extractUsageSummaries(r.text || '', { mobile: b.mobile_number });
      const n = await saveUsageSummaries(key, sums);
      done.add(key);
      saved += n;
      console.log(`bill ${key}: ${n} number(s) saved`);
    }
    console.log(`Done. ${saved} usage summary row(s) saved.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  }
})();
