// Telecom Bill Controller - Parity & Analytics Sync 2026-08-24 17:58
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const pdfParseReq = require('pdf-parse');

const getPdfParseFn = () => {
  if (typeof pdfParseReq === 'function') return pdfParseReq;
  if (pdfParseReq && typeof pdfParseReq.pdfParse === 'function') return pdfParseReq.pdfParse;
  if (pdfParseReq && typeof pdfParseReq.default === 'function') return pdfParseReq.default;
  if (pdfParseReq && typeof pdfParseReq.PDFParse === 'function') return pdfParseReq.PDFParse;
  return null;
};

// In-memory cache for resolved PDF dates to keep API responses ultra fast (< 1ms)
const pdfDatesCache = new Map();

const parseOrdinalDate = (dayStr, monthStr, yearStr) => {
  if (!dayStr || !monthStr || !yearStr) return null;
  const cleanDay = String(dayStr).replace(/\D/g, '').padStart(2, '0');
  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const mKey = String(monthStr).toLowerCase().slice(0, 3);
  const month = monthMap[mKey] || '01';
  let year = String(yearStr).trim();
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${cleanDay}`;
};

const resolveDatesFromPdfFile = async (rawPdfFilename, billNumber) => {
  if (!rawPdfFilename && !billNumber) return null;
  const cacheKey = String(rawPdfFilename || billNumber);
  if (pdfDatesCache.has(cacheKey)) {
    return pdfDatesCache.get(cacheKey);
  }

  const attachmentDir = path.join(__dirname, '../../Attachment');
  if (!fs.existsSync(attachmentDir)) return null;

  let targetPath = null;
  if (rawPdfFilename) {
    const baseName = path.basename(rawPdfFilename);
    const directPath = path.join(attachmentDir, baseName);
    if (fs.existsSync(directPath)) {
      targetPath = directPath;
    } else {
      const cleanBase = baseName.replace(/^(\d+-)+/, '');
      const altPath = path.join(attachmentDir, cleanBase);
      if (fs.existsSync(altPath)) {
        targetPath = altPath;
      }
    }
  }

  if (!targetPath) {
    try {
      const files = fs.readdirSync(attachmentDir);
      const billDigits = String(billNumber || '').replace(/\D/g, '');
      const rawBase = path.basename(String(rawPdfFilename || '')).replace(/^(\d+-)+/, '');
      const searchKey = String(billNumber || rawPdfFilename || '').replace(/[^a-zA-Z0-9]/g, '');

      const found = files.find(f => {
        const cleanF = f.replace(/[^a-zA-Z0-9]/g, '');
        if (rawBase && f.includes(rawBase)) return true;
        if (billDigits && billDigits.length >= 6 && f.includes(billDigits)) return true;
        if (searchKey.length >= 4 && cleanF.includes(searchKey)) return true;
        return false;
      });
      if (found) targetPath = path.join(attachmentDir, found);
    } catch (e) {}
  }

  if (!targetPath || !fs.existsSync(targetPath)) {
    return null;
  }

  try {
    let rawText = '';
    const buffer = fs.readFileSync(targetPath);

    if (pdfParseReq && typeof pdfParseReq.PDFParse === 'function') {
      try {
        const instance = new pdfParseReq.PDFParse({ data: buffer });
        const res = await instance.getText();
        if (res && res.text) rawText = res.text;
        else if (typeof res === 'string') rawText = res;
      } catch (e1) {}
    }

    if (!rawText) {
      let fn = null;
      if (typeof pdfParseReq === 'function') fn = pdfParseReq;
      else if (pdfParseReq && typeof pdfParseReq.pdfParse === 'function') fn = pdfParseReq.pdfParse;
      else if (pdfParseReq && typeof pdfParseReq.default === 'function') fn = pdfParseReq.default;

      if (fn) {
        try {
          const res = await fn(buffer, { max: 2 });
          rawText = res ? (res.text || res.data || String(res)) : '';
        } catch (fnErr) {
          try {
            const instance = new fn({ data: buffer });
            const res = await instance.getText();
            if (res && res.text) rawText = res.text;
          } catch (e2) {}
        }
      }
    }

    let periodFrom = null;
    let periodTo = null;
    let issueDate = null;
    let dueDate = null;
    let billNumberResolved = null;
    let accountNumberResolved = null;

    if (rawText) {
      // 1. du Specific Pattern: Matches "Your bill cycle: 1st Aug - 31st Aug 2026" or "1st - 31st Jul 2026"
      const duCycleRegex = /(?:your\s*bill\s*cycle|bill\s*cycle)[^\w\n\r]*[\r\n\s]*(\d{1,2}(?:st|nd|rd|th)?)(?:\s+([A-Za-z]{3,9}))?\s*[\u2010-\u2015\-–—−~to\s]+\s*(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Za-z]{3,9})\s+(\d{4})/i;
      const duCycleMatch = rawText.match(duCycleRegex);
      if (duCycleMatch) {
        const sDay = duCycleMatch[1];
        const eMonth = duCycleMatch[4];
        const sMonth = duCycleMatch[2] || eMonth;
        const eDay = duCycleMatch[3];
        const yr = duCycleMatch[5];
        periodFrom = parseOrdinalDate(sDay, sMonth, yr);
        periodTo = parseOrdinalDate(eDay, eMonth, yr);
      }

      // 2. du General Cycle Regex
      if (!periodFrom || !periodTo) {
        const generalCycleRegex = /\b(\d{1,2}(?:st|nd|rd|th)?)(?:\s+([A-Za-z]{3,9}))?\s*[\u2010-\u2015\-–—−~to\s]+\s*(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Za-z]{3,9})\s+(\d{4})\b/i;
        const gMatch = rawText.match(generalCycleRegex);
        if (gMatch) {
          const sDay = gMatch[1];
          const eMonth = gMatch[4];
          const sMonth = gMatch[2] || eMonth;
          const eDay = gMatch[3];
          const yr = gMatch[5];
          periodFrom = parseOrdinalDate(sDay, sMonth, yr);
          periodTo = parseOrdinalDate(eDay, eMonth, yr);
        }
      }

      // 3. Standard Period Patterns (Etisalat etc.)
      if (!periodFrom || !periodTo) {
        const standardPeriodRegex = /(?:bill\s*period|billing\s*period|statement\s*period|period)[^\w\n\r]*[\r\n\s]*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*[\u2010-\u2015\-–—−~to\s]+\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i;
        const spMatch = rawText.match(standardPeriodRegex);
        if (spMatch) {
          const parseD = (s) => {
            const m = s.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
            return m ? parseOrdinalDate(m[1], m[2], m[3]) : null;
          };
          periodFrom = parseD(spMatch[1]);
          periodTo = parseD(spMatch[2]);
        }
      }

      // 3b. Full Date Range anywhere in text (e.g. 01 Apr 2026 - 30 Apr 2026)
      if (!periodFrom || !periodTo) {
        const fullRangeRegex = /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*[\u2010-\u2015\-–—−~to\s]+\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/i;
        const frMatch = rawText.match(fullRangeRegex);
        if (frMatch) {
          const parseD = (s) => {
            const m = s.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
            return m ? parseOrdinalDate(m[1], m[2], m[3]) : null;
          };
          periodFrom = parseD(frMatch[1]);
          periodTo = parseD(frMatch[2]);
        }
      }

      // 4. Match Issue Date
      const issueDateRegex = /(?:your\s*bill\s*issue\s*date|bill\s*issue\s*date|issue\s*date|billing\s*date|invoice\s*date)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Za-z]{3,9})\s+(\d{2,4})/i;
      const issueMatch = rawText.match(issueDateRegex);
      if (issueMatch) {
        issueDate = parseOrdinalDate(issueMatch[1], issueMatch[2], issueMatch[3]);
      }

      // 5. Match Due Date
      const dueDateRegex = /(?:your\s*due\s*date|due\s*date|payment\s*due)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}(?:st|nd|rd|th)?)\s+([A-Za-z]{3,9})\s+(\d{2,4})/i;
      const dueMatch = rawText.match(dueDateRegex);
      if (dueMatch) {
        dueDate = parseOrdinalDate(dueMatch[1], dueMatch[2], dueMatch[3]);
      }

      // 6. Match Bill Number
      const duBillNoMatch = rawText.match(/(?:your\s*bill\s*number|bill\s*number|tax\s*invoice\s*(?:no|number)|invoice\s*(?:no|number)|tax\s*invoice)[^\w\d]*[\r\n\s]*([0-9]{7,12}|0191\d{6}|0185\d{6}|018\d{7}|I400\d+|1400\d+)/i) ||
                            rawText.match(/\b(0191\d{6}|0185\d{6}|018\d{7}|I400\d{6,12}|1400\d{6,12})\b/i);
      if (duBillNoMatch) {
        billNumberResolved = duBillNoMatch[1].trim();
      }

      // 7. Match Account Number
      const duAccNoMatch = rawText.match(/(?:your\s*account\s*number|account\s*number)\s*[:.-]?\s*[\r\n\s]*([\d.]{6,20})/i);
      if (duAccNoMatch) {
        accountNumberResolved = duAccNoMatch[1].trim();
      }
    }

    // Fallback: Check filename for date pattern (e.g. 0501070455_2027529957_2026-04-01.pdf)
    if (!periodFrom || !periodTo) {
      const fnDateMatch = String(targetPath || rawPdfFilename || '').match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
      if (fnDateMatch) {
        const y = parseInt(fnDateMatch[1], 10);
        const m = parseInt(fnDateMatch[2], 10);
        const lastDay = new Date(y, m, 0).getDate();
        if (!periodFrom) periodFrom = `${y}-${String(m).padStart(2, '0')}-01`;
        if (!periodTo) periodTo = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Fallback: If dates not found in text, deduce from month name in filename (e.g. Du_warehouse_August_0191049864.pdf)
    if (!periodFrom || !periodTo) {
      const monthNames = {
        january: '01', feb: '02', february: '02', mar: '03', march: '03',
        apr: '04', april: '04', may: '05', jun: '06', june: '06',
        jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
        oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
      };
      const baseFn = path.basename(targetPath);
      const mMatch = baseFn.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/i);
      if (mMatch) {
        const mNum = monthNames[mMatch[1].toLowerCase()];
        if (mNum) {
          const yrMatch = baseFn.match(/(20\d{2})/);
          const y = yrMatch ? yrMatch[1] : '2026';
          const lastDay = new Date(parseInt(y, 10), parseInt(mNum, 10), 0).getDate();
          if (!periodFrom) periodFrom = `${y}-${mNum}-01`;
          if (!periodTo) periodTo = `${y}-${mNum}-${String(lastDay).padStart(2, '0')}`;
        }
      }
    }

    // Correct inverted dates if from > to
    if (periodFrom && periodTo) {
      const d1 = new Date(periodFrom);
      const d2 = new Date(periodTo);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1 > d2) {
        const y = d2.getFullYear();
        const m = String(d2.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, d2.getMonth() + 1, 0).getDate();
        periodFrom = `${y}-${m}-01`;
        periodTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Fallback: Check filename for bill number if not resolved
    if (!billNumberResolved) {
      const fnBillMatch = path.basename(targetPath).match(/(0191\d{6}|0185\d{6}|018\d{7}|I400\d{6,12}|1400\d{6,12})/i);
      if (fnBillMatch) {
        billNumberResolved = fnBillMatch[1];
      }
    }

    const resObj = { periodFrom, periodTo, issueDate, dueDate, billNumber: billNumberResolved, accountNumber: accountNumberResolved };
    pdfDatesCache.set(cacheKey, resObj);
    return resObj;
  } catch (err) {
    console.error('Error in resolveDatesFromPdfFile:', err.message);
    return null;
  }
};

const saveAttachmentLocally = (base64String, fileName) => {
  if (!base64String) return null;
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let buffer;
  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64String, 'base64');
  }

  const attachmentDir = path.join(__dirname, '../../Attachment');
  if (!fs.existsSync(attachmentDir)) {
    fs.mkdirSync(attachmentDir, { recursive: true });
  }

  const cleanName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'telecom_bill.pdf';
  const uniqueName = `${Date.now()}-${cleanName}`;
  const filePath = path.join(attachmentDir, uniqueName);

  fs.writeFileSync(filePath, buffer);
  return `/backend/Attachment/${uniqueName}`;
};

const saveToAttachmentTable = async ({ clientid, companyid, company_name, savedPath, attachmentType = 'Telecom Bill' }) => {
  if (!savedPath) return;
  try {
    let finalClientId = null;
    if (clientid) {
      const parsedClient = parseInt(clientid, 10);
      if (!isNaN(parsedClient)) finalClientId = parsedClient;
    }

    let finalCompanyId = null;
    if (companyid) {
      const parsedComp = parseInt(companyid, 10);
      if (!isNaN(parsedComp)) finalCompanyId = parsedComp;
    }

    if (!finalCompanyId && company_name) {
      try {
        const compRes = await db.query(
          'SELECT id FROM company WHERE company_name ILIKE $1 OR name ILIKE $1 LIMIT 1',
          [String(company_name).trim()]
        );
        if (compRes.rows.length > 0) {
          finalCompanyId = compRes.rows[0].id;
        }
      } catch (e) {}
    }

    if (!finalCompanyId && finalClientId) {
      try {
        const compRes = await db.query(
          'SELECT id FROM company WHERE clientid = $1 AND (is_deleted = false OR is_deleted IS NULL) ORDER BY id ASC LIMIT 1',
          [finalClientId]
        );
        if (compRes.rows.length > 0) {
          finalCompanyId = compRes.rows[0].id;
        }
      } catch (e) {}
    }

    const insertQuery = `
      INSERT INTO attachment (clientid, companyid, attachment, type, expire_date, status, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NULL, 1, false, NOW(), NOW())
      RETURNING *
    `;
    await db.query(insertQuery, [finalClientId, finalCompanyId, savedPath, attachmentType]);
    console.log(`[ATTACHMENT SYNC] Successfully saved attachment record to table for ${savedPath}`);
  } catch (e) {
    console.error('Error inserting into attachment table:', e);
  }
};

let billPkCol = null;

async function getBillPkCol() {
  if (billPkCol) return billPkCol;
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill' 
        AND column_name IN ('tele_bill_id', 'bill_id', 'id')
      LIMIT 1
    `);
    if (res.rows.length > 0) {
      billPkCol = res.rows[0].column_name;
    } else {
      billPkCol = 'tele_bill_id';
    }
  } catch (e) {
    billPkCol = 'tele_bill_id';
  }
  return billPkCol;
}

async function getLogFkCol() {
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_call_logs' 
        AND column_name IN ('tele_bill_id', 'bill_id')
      LIMIT 1
    `);
    if (res.rows.length > 0) return res.rows[0].column_name;
  } catch (e) {}
  return 'tele_bill_id';
}

async function getItemFkCol() {
  try {
    const res = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill_items' 
        AND column_name IN ('tele_bill_id', 'bill_id')
      LIMIT 1
    `);
    if (res.rows.length > 0) return res.rows[0].column_name;
  } catch (e) {}
  return 'tele_bill_id';
}

async function getBillColAliases() {
  try {
    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `).catch(() => ({ rows: [] }));
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const totalSelect = existingCols.has('total_amount') && existingCols.has('total_bill')
      ? 'COALESCE(tb.total_amount, tb.total_bill, 0)'
      : (existingCols.has('total_amount') ? 'COALESCE(tb.total_amount, 0)' : (existingCols.has('total_bill') ? 'COALESCE(tb.total_bill, 0)' : '0'));

    const vatSelect = existingCols.has('vat_amount') && existingCols.has('vat_current_period')
      ? 'COALESCE(tb.vat_amount, tb.vat_current_period, 0)'
      : (existingCols.has('vat_amount') ? 'COALESCE(tb.vat_amount, 0)' : (existingCols.has('vat_current_period') ? 'COALESCE(tb.vat_current_period, 0)' : '0'));

    const providerSelect = existingCols.has('provider') && existingCols.has('telecom_provider')
      ? "COALESCE(tb.provider, tb.telecom_provider, '')"
      : (existingCols.has('provider') ? "COALESCE(tb.provider, '')" : (existingCols.has('telecom_provider') ? "COALESCE(tb.telecom_provider, '')" : "''"));

    return { totalSelect, vatSelect, providerSelect };
  } catch (e) {
    return { totalSelect: '0', vatSelect: '0', providerSelect: "''" };
  }
}

exports.getAllTelecomBills = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { totalSelect, vatSelect, providerSelect } = await getBillColAliases();
    const { clientid } = req.query;

    // Auto-update any pending status records to Active
    await db.query(`UPDATE tbl_telecome_bill SET status = 'Active' WHERE status IS NULL OR LOWER(status) = 'pending'`).catch(() => {});

    // Auto-correct provider name and missing dates for du bills
    await db.query(`
      UPDATE tbl_telecome_bill 
      SET telecom_provider = 'du' 
      WHERE (bill_number ILIKE 'I400%' OR bill_number ILIKE '1400%' OR bill_number ILIKE '0191%' OR mobile_number LIKE '28%' OR mobile_number LIKE '6.%' OR pdf_filename ILIKE '%du%')
        AND (telecom_provider IS NULL OR LOWER(telecom_provider) = 'etisalat' OR telecom_provider = '')
    `).catch(() => {});
    await db.query(`
      UPDATE tbl_telecome_bill 
      SET provider = 'du' 
      WHERE (bill_number ILIKE 'I400%' OR bill_number ILIKE '1400%' OR bill_number ILIKE '0191%' OR mobile_number LIKE '28%' OR mobile_number LIKE '6.%' OR pdf_filename ILIKE '%du%')
        AND (provider IS NULL OR LOWER(provider) = 'etisalat' OR provider = '')
    `).catch(() => {});


    let query = `
      SELECT 
        tb.*, 
        tb.${pkCol} AS id,
        tb.${pkCol} AS tele_bill_id,
        tb.${pkCol} AS bill_id,
        ${totalSelect} AS total_bill,
        ${vatSelect} AS vat_current_period,
        ${providerSelect} AS telecom_provider,
        c.client_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      WHERE 1=1
    `;
    let params = [];
    if (clientid) {
      query += ' AND tb.clientid::text = $1';
      params.push(String(clientid));
    }
    query += ` ORDER BY tb.${pkCol} DESC`;
    const result = await db.query(query, params);

    // Fetch child line items from tbl_telecome_bill_items
    const itemsRes = await db.query(`SELECT *, ${itemFk} AS tele_bill_id FROM tbl_telecome_bill_items ORDER BY item_id ASC`).catch(() => ({ rows: [] }));
    const itemsMap = new Map();
    (itemsRes.rows || []).forEach(item => {
      const bId = String(item[itemFk] || item.tele_bill_id || item.bill_id);
      if (!itemsMap.has(bId)) itemsMap.set(bId, []);
      itemsMap.get(bId).push(item);
    });

    // Fetch call logs from tbl_telecome_call_logs
    const logsRes = await db.query(`SELECT *, ${logFk} AS tele_bill_id FROM tbl_telecome_call_logs ORDER BY log_id ASC`).catch(() => ({ rows: [] }));
    const logsMap = new Map();
    (logsRes.rows || []).forEach(log => {
      const bId = String(log[logFk] || log.tele_bill_id || log.bill_id);
      if (!logsMap.has(bId)) logsMap.set(bId, []);
      logsMap.get(bId).push(log);
    });

    const formattedRows = await Promise.all(result.rows.map(async (row) => {
      const bId = String(row[pkCol] || row.bill_id || row.tele_bill_id || row.id);
      const childItems = itemsMap.get(bId) || [];
      const callLogs = logsMap.get(bId) || [];

      const providerVal = row.telecom_provider || row.provider || '';
      const totalAmt = row.total_bill || row.total_amount || 0;
      const vatAmt = row.vat_current_period || row.vat_amount || 0;

      const rawFd = typeof row.field_data === 'string' ? JSON.parse(row.field_data || '{}') : (row.field_data || {});
      
      let periodFrom = row.period_from || row.bill_period_from || rawFd['Bill Period From'] || rawFd.period_from || rawFd.f_from || null;
      let periodTo = row.period_to || row.bill_period_to || rawFd['Bill Period To'] || rawFd.period_to || rawFd.f_to || null;
      let issueDate = row.issue_date || row.bill_date || row.bill_issue_date || rawFd['Bill Issue Date'] || rawFd.issue_date || rawFd.f_issue || null;
      let dueDate = row.due_date || rawFd['Due Date'] || rawFd.due_date || rawFd.f_due || null;
      let billNumber = row.bill_number;

      // Dynamic period and bill details deduction
      if (row.pdf_filename || row.bill_number) {
        const resolved = await resolveDatesFromPdfFile(row.pdf_filename, row.bill_number);
        if (resolved) {
          if (!periodFrom && resolved.periodFrom) periodFrom = resolved.periodFrom;
          if (!periodTo && resolved.periodTo) periodTo = resolved.periodTo;
          if (!issueDate && resolved.issueDate) issueDate = resolved.issueDate;
          if (!dueDate && resolved.dueDate) dueDate = resolved.dueDate;
          if (resolved.billNumber && (!billNumber || billNumber === 'MULLAH' || !/\d/.test(billNumber))) {
            billNumber = resolved.billNumber;
          }
        }
      }

      if (!periodFrom) {
        // 2. Check pdf_filename for date pattern
        if (!periodFrom && row.pdf_filename) {
          const fnMatch = String(row.pdf_filename).match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
          if (fnMatch) {
            const y = parseInt(fnMatch[1], 10);
            const m = parseInt(fnMatch[2], 10);
            const lastDay = new Date(y, m, 0).getDate();
            periodFrom = `${y}-${String(m).padStart(2, '0')}-01`;
            periodTo = periodTo || `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          }
        }

        // 3. Fallback to issueDate previous month
        if (!periodFrom && issueDate) {
          try {
            const idDate = new Date(issueDate);
            if (!isNaN(idDate.getTime())) {
              const prevMonthLast = new Date(idDate.getFullYear(), idDate.getMonth(), 0);
              const y = prevMonthLast.getFullYear();
              const m = String(prevMonthLast.getMonth() + 1).padStart(2, '0');
              const d = String(prevMonthLast.getDate()).padStart(2, '0');
              periodFrom = `${y}-${m}-01`;
              periodTo = periodTo || `${y}-${m}-${d}`;
            }
          } catch (e) {}
        }
      }

      // Fallback: If call logs exist and no period date is specified, deduce period from call logs
      if (!periodFrom && callLogs.length > 0) {
        const validDates = callLogs
          .map(l => l.call_date)
          .filter(Boolean)
          .map(d => {
            const dt = new Date(d);
            return !isNaN(dt.getTime()) ? dt : null;
          })
          .filter(Boolean)
          .sort((a, b) => a - b);

        if (validDates.length > 0) {
          const earliest = validDates[0];
          const y = earliest.getFullYear();
          const m = String(earliest.getMonth() + 1).padStart(2, '0');
          const lastDay = new Date(y, earliest.getMonth() + 1, 0).getDate();
          periodFrom = `${y}-${m}-01`;
          periodTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        }
      }

      // Inverted check: If start date is after end date (e.g. 18 Apr to 01 Apr)
      if (periodFrom && periodTo) {
        const d1 = new Date(periodFrom);
        const d2 = new Date(periodTo);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1 > d2) {
          const y = d2.getFullYear();
          const m = String(d2.getMonth() + 1).padStart(2, '0');
          const lastDay = new Date(y, d2.getMonth() + 1, 0).getDate();
          periodFrom = `${y}-${m}-01`;
          periodTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
        }
      }

      // Clean up legacy 1114 typo if present
      if (periodFrom && typeof periodFrom === 'string' && periodFrom.includes('1114')) {
        periodFrom = periodFrom.replace(/1114/g, '2026');
      }
      if (periodTo && typeof periodTo === 'string' && periodTo.includes('1114')) {
        periodTo = periodTo.replace(/1114/g, '2026');
      }

      const billStatus = (!row.status || String(row.status).toLowerCase() === 'pending') ? 'Active' : row.status;

      const validCleanBill = (b) => (b && b !== 'MULLAH' && /\d/.test(b)) ? b : null;
      const cleanBillResult = validCleanBill(billNumber) || validCleanBill(row.bill_number) || (String(providerVal).toLowerCase() === 'du' ? `DU-#${bId}` : (billNumber || row.bill_number));

      return {
        ...row,
        status: billStatus,
        id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        tele_bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
        Company: row.company_name,
        'Bill Number': cleanBillResult,
        bill_number: cleanBillResult,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': providerVal,
        'Total Bill': totalAmt,
        'VAT': vatAmt,
        'Monthly Plan Amount': row.plan_rental,
        'Service Rental': row.plan_rental,
        'Usage Charges': row.usage_charges,
        'Payment Status': billStatus,
        period_from: periodFrom,
        period_to: periodTo,
        issue_date: issueDate,
        due_date: dueDate,
        'Bill Period From': periodFrom,
        'Bill Period To': periodTo,
        'Bill Issue Date': issueDate,
        'Due Date': dueDate,
        items: childItems,
        call_logs: callLogs,
        field_data: {
          ...rawFd,
          Company: row.company_name,
          'Bill Number': cleanBillResult,
          bill_number: cleanBillResult,
          'Mobile Number / Account': row.mobile_number,
          'Telecom Provider': providerVal,
          'Total Bill': totalAmt,
          'VAT': vatAmt,
          'Service Rental': row.plan_rental,
          'Usage Charges': row.usage_charges,
          'Payment Status': billStatus,
          status: billStatus,
          'Bill Period From': periodFrom,
          'Bill Period To': periodTo,
          'Bill Issue Date': issueDate,
          'Due Date': dueDate,
          period_from: periodFrom,
          period_to: periodTo,
          issue_date: issueDate,
          due_date: dueDate,
          items: childItems,
          call_logs: callLogs
        }
      };
    }));

    res.status(200).json(formattedRows);
  } catch (err) {
    console.error('Error fetching Telecom Bills:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomBillById = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { totalSelect, vatSelect, providerSelect } = await getBillColAliases();
    const { id } = req.params;
    const query = `
      SELECT tb.*, 
        tb.${pkCol} AS id, 
        tb.${pkCol} AS tele_bill_id, 
        tb.${pkCol} AS bill_id,
        ${totalSelect} AS total_bill,
        ${vatSelect} AS vat_current_period,
        ${providerSelect} AS telecom_provider,
        c.client_name
      FROM tbl_telecome_bill tb
      LEFT JOIN client c ON (
        CASE 
          WHEN tb.clientid ~ '^[0-9]+$' THEN tb.clientid::integer = c.id
          ELSE false 
        END
      )
      WHERE tb.${pkCol} = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }
    const row = result.rows[0];

    const itemsRes = await db.query(`SELECT * FROM tbl_telecome_bill_items WHERE ${itemFk} = $1 ORDER BY item_id ASC`, [id]).catch(() => ({ rows: [] }));
    const logsRes = await db.query(`SELECT * FROM tbl_telecome_call_logs WHERE ${logFk} = $1 ORDER BY log_id ASC`, [id]).catch(() => ({ rows: [] }));

    const rawFd = typeof row.field_data === 'string' ? JSON.parse(row.field_data || '{}') : (row.field_data || {});
    let periodFrom = row.period_from || row.bill_period_from || rawFd['Bill Period From'] || rawFd.period_from || rawFd.f_from || null;
    let periodTo = row.period_to || row.bill_period_to || rawFd['Bill Period To'] || rawFd.period_to || rawFd.f_to || null;
    let issueDate = row.issue_date || row.bill_date || row.bill_issue_date || rawFd['Bill Issue Date'] || rawFd.issue_date || rawFd.f_issue || null;
    let dueDate = row.due_date || rawFd['Due Date'] || rawFd.due_date || rawFd.f_due || null;
    let billNumber = row.bill_number;

    // Dynamic period deduction
    if (row.pdf_filename || row.bill_number) {
      const resolved = await resolveDatesFromPdfFile(row.pdf_filename, row.bill_number);
      if (resolved) {
        if (!periodFrom && resolved.periodFrom) periodFrom = resolved.periodFrom;
        if (!periodTo && resolved.periodTo) periodTo = resolved.periodTo;
        if (!issueDate && resolved.issueDate) issueDate = resolved.issueDate;
        if (!dueDate && resolved.dueDate) dueDate = resolved.dueDate;
        if (resolved.billNumber && (!billNumber || billNumber === 'MULLAH' || !/\d/.test(billNumber))) {
          billNumber = resolved.billNumber;
        }
      }
    }

    if (!periodFrom) {
      // 2. Check pdf_filename for date pattern
      if (!periodFrom && row.pdf_filename) {
        const fnMatch = String(row.pdf_filename).match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
        if (fnMatch) {
          const y = parseInt(fnMatch[1], 10);
          const m = parseInt(fnMatch[2], 10);
          const lastDay = new Date(y, m, 0).getDate();
          periodFrom = `${y}-${String(m).padStart(2, '0')}-01`;
          periodTo = periodTo || `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
      }

      // 3. Fallback to issueDate previous month
      if (!periodFrom && issueDate) {
        try {
          const idDate = new Date(issueDate);
          if (!isNaN(idDate.getTime())) {
            const prevMonthLast = new Date(idDate.getFullYear(), idDate.getMonth(), 0);
            const y = prevMonthLast.getFullYear();
            const m = String(prevMonthLast.getMonth() + 1).padStart(2, '0');
            const d = String(prevMonthLast.getDate()).padStart(2, '0');
            periodFrom = `${y}-${m}-01`;
            periodTo = periodTo || `${y}-${m}-${d}`;
          }
        } catch (e) {}
      }
    }

    if (!periodFrom && logsRes.rows.length > 0) {
      const validDates = logsRes.rows
        .map(l => l.call_date)
        .filter(Boolean)
        .map(d => {
          const dt = new Date(d);
          return !isNaN(dt.getTime()) ? dt : null;
        })
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (validDates.length > 0) {
        const earliest = validDates[0];
        const y = earliest.getFullYear();
        const m = String(earliest.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, earliest.getMonth() + 1, 0).getDate();
        periodFrom = `${y}-${m}-01`;
        periodTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Inverted check: If start date is after end date (e.g. 18 Apr to 01 Apr)
    if (periodFrom && periodTo) {
      const d1 = new Date(periodFrom);
      const d2 = new Date(periodTo);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d1 > d2) {
        const y = d2.getFullYear();
        const m = String(d2.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, d2.getMonth() + 1, 0).getDate();
        periodFrom = `${y}-${m}-01`;
        periodTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      }
    }

    // Clean up legacy 1114 typo if present
    if (periodFrom && typeof periodFrom === 'string' && periodFrom.includes('1114')) {
      periodFrom = periodFrom.replace(/1114/g, '2026');
    }
    if (periodTo && typeof periodTo === 'string' && periodTo.includes('1114')) {
      periodTo = periodTo.replace(/1114/g, '2026');
    }

    const billStatus = (!row.status || String(row.status).toLowerCase() === 'pending') ? 'Active' : row.status;

    const validCleanBill = (b) => (b && b !== 'MULLAH' && /\d/.test(b)) ? b : null;
    const cleanBillResult = validCleanBill(billNumber) || validCleanBill(row.bill_number) || (String(row.telecom_provider || row.provider).toLowerCase() === 'du' ? `DU-#${id}` : (billNumber || row.bill_number));

    res.status(200).json({
      ...row,
      bill_number: cleanBillResult,
      status: billStatus,
      id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      tele_bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      bill_id: row[pkCol] || row.bill_id || row.tele_bill_id || row.id,
      period_from: periodFrom,
      period_to: periodTo,
      issue_date: issueDate,
      due_date: dueDate,
      'Bill Period From': periodFrom,
      'Bill Period To': periodTo,
      'Bill Issue Date': issueDate,
      'Due Date': dueDate,
      items: itemsRes.rows,
      call_logs: logsRes.rows,
      field_data: {
        ...rawFd,
        Company: row.company_name,
        'Bill Number': cleanBillResult,
        bill_number: cleanBillResult,
        'Mobile Number / Account': row.mobile_number,
        'Telecom Provider': row.telecom_provider || row.provider,
        'Total Bill': row.total_bill || row.total_amount,
        'VAT': row.vat_current_period || row.vat_amount,
        'Service Rental': row.plan_rental,
        'Usage Charges': row.usage_charges,
        'Payment Status': billStatus,
        status: billStatus,
        'Bill Period From': periodFrom,
        'Bill Period To': periodTo,
        'Bill Issue Date': issueDate,
        'Due Date': dueDate,
        period_from: periodFrom,
        period_to: periodTo,
        issue_date: issueDate,
        due_date: dueDate,
        items: itemsRes.rows,
        call_logs: logsRes.rows
      }
    });
  } catch (err) {
    console.error('Error fetching Telecom Bill by id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getCallLogsByBillId = async (req, res) => {
  try {
    const logFk = await getLogFkCol();
    const { id } = req.params;
    const logsRes = await db.query(`SELECT * FROM tbl_telecome_call_logs WHERE ${logFk} = $1 ORDER BY log_id ASC`, [id]);
    res.status(200).json(logsRes.rows || []);
  } catch (err) {
    console.error('Error fetching Call Logs by bill id:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.createTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();

    const body = req.body || {};
    const fd = body.field_data || {};

    const bill_number = body.bill_number || fd['Bill Number'] || fd.f_billno || '';
    const mobile_number = body.mobile_number || fd['Mobile Number / Account'] || fd.f_account || '';
    const company_name = body.company_name || body.company_id || fd.Company || fd.f_company || '';
    const telecom_provider = body.telecom_provider || fd['Telecom Provider'] || fd.f_provider || '';

    const total_bill = parseFloat(body.total_bill || fd['Total Bill'] || fd.f_total || 0) || 0;
    const plan_rental = parseFloat(body.plan_rental || fd['Service Rental'] || fd['Monthly Plan Amount'] || fd.f_rental || 0) || 0;
    const usage_charges = parseFloat(body.usage_charges || fd['Usage Charges'] || fd.f_usage || 0) || 0;
    const vat_current_period = parseFloat(body.vat_current_period || fd.VAT || fd.f_vat || 0) || 0;

    const clientid = body.clientid ? String(body.clientid) : null;
    const status = body.status && body.status.toLowerCase() !== 'pending' ? body.status : (fd['Payment Status'] && fd['Payment Status'].toLowerCase() !== 'pending' ? fd['Payment Status'] : 'Active');
    let pdf_filename = body.pdf_filename || fd['Invoice PDF'] || fd.f_pdf || null;
    const pdf_base64 = body.pdf_base64 || body.file_base64 || fd['Invoice PDF_base64'] || fd.pdf_base64 || null;

    if (pdf_base64 && typeof pdf_base64 === 'string') {
      const savedPath = saveAttachmentLocally(pdf_base64, pdf_filename || body.file_name || 'telecom_bill.pdf');
      if (savedPath) {
        pdf_filename = savedPath;
        await saveToAttachmentTable({
          clientid,
          companyid: body.company_id || body.companyid,
          company_name,
          savedPath,
          attachmentType: 'Telecom Bill'
        });
      }
    } else if (pdf_filename) {
      const cleanPath = pdf_filename.startsWith('/') ? pdf_filename : `/backend/Attachment/${pdf_filename}`;
      const chk = await db.query('SELECT id FROM attachment WHERE attachment = $1 OR attachment LIKE $2 LIMIT 1', [cleanPath, `%${pdf_filename}%`]).catch(() => ({ rows: [] }));
      if (chk.rows.length === 0) {
        await saveToAttachmentTable({
          clientid,
          companyid: body.company_id || body.companyid,
          company_name,
          savedPath: cleanPath,
          attachmentType: 'Telecom Bill'
        });
      }
    }

    const period_from = body.period_from || fd['Bill Period From'] || fd.f_from || fd.period_from || null;
    const period_to = body.period_to || fd['Bill Period To'] || fd.f_to || fd.period_to || null;
    const issue_date = body.issue_date || body.bill_date || fd['Bill Issue Date'] || fd.f_issue || fd.issue_date || null;
    const due_date = body.due_date || fd['Due Date'] || fd.f_due || fd.due_date || null;
    const bill_month = body.bill_month || fd['Bill Month'] || fd.f_month || fd.bill_month || null;

    // Check if table uses provider/total_amount/vat_amount column names
    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `);
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const insertCols = ['bill_number', 'mobile_number', 'company_name'];
    const values = [bill_number, mobile_number, company_name];

    if (existingCols.has('telecom_provider')) {
      insertCols.push('telecom_provider');
      values.push(telecom_provider);
    } else if (existingCols.has('provider')) {
      insertCols.push('provider');
      values.push(telecom_provider);
    }

    if (existingCols.has('total_bill')) {
      insertCols.push('total_bill');
      values.push(total_bill);
    } else if (existingCols.has('total_amount')) {
      insertCols.push('total_amount');
      values.push(total_bill);
    }

    if (existingCols.has('plan_rental')) {
      insertCols.push('plan_rental');
      values.push(plan_rental);
    }

    if (existingCols.has('usage_charges')) {
      insertCols.push('usage_charges');
      values.push(usage_charges);
    }

    if (existingCols.has('vat_current_period')) {
      insertCols.push('vat_current_period');
      values.push(vat_current_period);
    } else if (existingCols.has('vat_amount')) {
      insertCols.push('vat_amount');
      values.push(vat_current_period);
    }

    if (existingCols.has('clientid')) {
      insertCols.push('clientid');
      values.push(clientid);
    }

    if (existingCols.has('status')) {
      insertCols.push('status');
      values.push(status);
    }

    if (existingCols.has('pdf_filename')) {
      insertCols.push('pdf_filename');
      values.push(pdf_filename);
    }

    if (period_from && existingCols.has('period_from')) {
      insertCols.push('period_from');
      values.push(period_from);
    }
    if (period_to && existingCols.has('period_to')) {
      insertCols.push('period_to');
      values.push(period_to);
    }
    if (issue_date && existingCols.has('issue_date')) {
      insertCols.push('issue_date');
      values.push(issue_date);
    } else if (issue_date && existingCols.has('bill_date')) {
      insertCols.push('bill_date');
      values.push(issue_date);
    }
    if (due_date && existingCols.has('due_date')) {
      insertCols.push('due_date');
      values.push(due_date);
    }
    if (bill_month && existingCols.has('bill_month')) {
      insertCols.push('bill_month');
      values.push(bill_month);
    }
    if (existingCols.has('field_data')) {
      insertCols.push('field_data');
      values.push(JSON.stringify({
        ...fd,
        'Invoice PDF': pdf_filename,
        f_pdf: pdf_filename,
        pdf_filename: pdf_filename,
        period_from,
        period_to,
        issue_date,
        due_date,
        bill_month,
        'Bill Period From': period_from,
        'Bill Period To': period_to,
        'Bill Issue Date': issue_date,
        'Due Date': due_date
      }));
    }

    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
    const query = `
      INSERT INTO tbl_telecome_bill (${insertCols.join(', ')})
      VALUES (${placeholders})
      RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id
    `;

    const result = await db.query(query, values);
    const parentRow = result.rows[0];
    const parentId = parentRow[pkCol] || parentRow.bill_id || parentRow.tele_bill_id || parentRow.id;

    // 2. Insert Child Items into tbl_telecome_bill_items
    const rawItems = body.items || body.rows || fd.items || fd.rows || [
      { record_type: 'BILL', bill_number, mobile_number, category: 'Total Bill', amount: total_bill },
      { record_type: 'SERVICE', bill_number, mobile_number, category: 'Plan Rental', amount: plan_rental },
      { record_type: 'CHARGE', bill_number, mobile_number, category: 'Usage Charges', amount: usage_charges },
      { record_type: 'VAT', bill_number, mobile_number, category: 'VAT Current Period', amount: vat_current_period }
    ];

    const insertedItems = [];
    for (const item of rawItems) {
      try {
        const itemRes = await db.query(
          `INSERT INTO tbl_telecome_bill_items 
            (${itemFk}, bill_number, mobile_number, record_type, category, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            parentId,
            item.bill_number || bill_number,
            item.mobile_number || mobile_number,
            item.record_type || 'CHARGE',
            item.category || 'Service Line Item',
            parseFloat(item.amount || 0)
          ]
        ).catch(() => null);
        if (itemRes && itemRes.rows[0]) insertedItems.push(itemRes.rows[0]);
      } catch (itemErr) {
        console.error('Error inserting child item:', itemErr);
      }
    }

    // 3. Insert Call Logs into tbl_telecome_call_logs if present
    const rawLogs = body.call_logs || body.logs || fd.call_logs || [];
    const insertedLogs = [];
    for (const log of rawLogs) {
      try {
        const logRes = await db.query(
          `INSERT INTO tbl_telecome_call_logs
            (${logFk}, bill_number, source_number, call_date, call_time, destination_number, duration, category, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            parentId,
            log.bill_number || bill_number,
            log.source_number || mobile_number,
            log.call_date || 'N/A',
            log.call_time || 'N/A',
            log.destination_number || 'N/A',
            log.duration || '00:00:00',
            log.category || 'Calls to Mobile',
            parseFloat(log.amount || 0)
          ]
        ).catch(() => null);
        if (logRes && logRes.rows[0]) insertedLogs.push(logRes.rows[0]);
      } catch (logErr) {
        console.error('Error inserting call log:', logErr);
      }
    }

    res.status(201).json({
      ...parentRow,
      id: parentId,
      tele_bill_id: parentId,
      bill_id: parentId,
      items: insertedItems,
      call_logs: insertedLogs,
      Company: parentRow.company_name,
      'Bill Number': parentRow.bill_number,
      'Mobile Number / Account': parentRow.mobile_number,
      'Telecom Provider': parentRow.telecom_provider || parentRow.provider,
      'Total Bill': parentRow.total_bill || parentRow.total_amount,
      field_data: {
        Company: parentRow.company_name,
        'Bill Number': parentRow.bill_number,
        'Mobile Number / Account': parentRow.mobile_number,
        'Telecom Provider': parentRow.telecom_provider || parentRow.provider,
        'Total Bill': parentRow.total_bill || parentRow.total_amount,
        'VAT': parentRow.vat_current_period || parentRow.vat_amount,
        'Payment Status': parentRow.status,
        items: insertedItems,
        call_logs: insertedLogs
      }
    });
  } catch (err) {
    console.error('Error creating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.updateTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const { id } = req.params;
    const body = req.body || {};
    const fd = body.field_data || {};

    const bill_number = body.bill_number || fd['Bill Number'] || fd.f_billno;
    const mobile_number = body.mobile_number || fd['Mobile Number / Account'] || fd.f_account;
    const company_name = body.company_name || body.company_id || fd.Company || fd.f_company;
    const telecom_provider = body.telecom_provider || fd['Telecom Provider'] || fd.f_provider;

    const total_bill = body.total_bill || fd['Total Bill'] || fd.f_total;
    const plan_rental = body.plan_rental || fd['Service Rental'] || fd['Monthly Plan Amount'];
    const usage_charges = body.usage_charges || fd['Usage Charges'];
    const vat_current_period = body.vat_current_period || fd.VAT || fd.f_vat;
    const status = body.status || fd['Payment Status'] || fd.f_status;
    const clientid = body.clientid;

    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `);
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));

    const setClauses = [];
    const params = [];
    let pIdx = 1;

    if (bill_number) { setClauses.push(`bill_number = $${pIdx++}`); params.push(bill_number); }
    if (mobile_number) { setClauses.push(`mobile_number = $${pIdx++}`); params.push(mobile_number); }
    if (company_name) { setClauses.push(`company_name = $${pIdx++}`); params.push(company_name); }

    if (telecom_provider) {
      if (existingCols.has('telecom_provider')) { setClauses.push(`telecom_provider = $${pIdx++}`); params.push(telecom_provider); }
      else if (existingCols.has('provider')) { setClauses.push(`provider = $${pIdx++}`); params.push(telecom_provider); }
    }

    if (total_bill) {
      if (existingCols.has('total_bill')) { setClauses.push(`total_bill = $${pIdx++}`); params.push(parseFloat(total_bill)); }
      else if (existingCols.has('total_amount')) { setClauses.push(`total_amount = $${pIdx++}`); params.push(parseFloat(total_bill)); }
    }

    if (plan_rental && existingCols.has('plan_rental')) {
      setClauses.push(`plan_rental = $${pIdx++}`); params.push(parseFloat(plan_rental));
    }

    if (usage_charges && existingCols.has('usage_charges')) {
      setClauses.push(`usage_charges = $${pIdx++}`); params.push(parseFloat(usage_charges));
    }

    if (vat_current_period) {
      if (existingCols.has('vat_current_period')) { setClauses.push(`vat_current_period = $${pIdx++}`); params.push(parseFloat(vat_current_period)); }
      else if (existingCols.has('vat_amount')) { setClauses.push(`vat_amount = $${pIdx++}`); params.push(parseFloat(vat_current_period)); }
    }

    if (status && existingCols.has('status')) { setClauses.push(`status = $${pIdx++}`); params.push(status); }
    if (clientid && existingCols.has('clientid')) { setClauses.push(`clientid = $${pIdx++}`); params.push(String(clientid)); }

    let pdf_filename = body.pdf_filename || fd['Invoice PDF'] || fd.f_pdf;
    const pdf_base64 = body.pdf_base64 || body.file_base64 || fd['Invoice PDF_base64'] || fd.pdf_base64;
    if (pdf_base64 && typeof pdf_base64 === 'string') {
      const savedPath = saveAttachmentLocally(pdf_base64, pdf_filename || body.file_name || 'telecom_bill.pdf');
      if (savedPath) {
        pdf_filename = savedPath;
        await saveToAttachmentTable({
          clientid,
          companyid: body.company_id || body.companyid,
          company_name,
          savedPath,
          attachmentType: 'Telecom Bill'
        });
      }
    }
    if (pdf_filename && existingCols.has('pdf_filename')) {
      setClauses.push(`pdf_filename = $${pIdx++}`);
      params.push(pdf_filename);
    }

    const period_from = body.period_from || fd['Bill Period From'] || fd.f_from || fd.period_from;
    const period_to = body.period_to || fd['Bill Period To'] || fd.f_to || fd.period_to;
    const issue_date = body.issue_date || body.bill_date || fd['Bill Issue Date'] || fd.f_issue || fd.issue_date;
    const due_date = body.due_date || fd['Due Date'] || fd.f_due || fd.due_date;
    const bill_month = body.bill_month || fd['Bill Month'] || fd.f_month || fd.bill_month;

    if (period_from && existingCols.has('period_from')) { setClauses.push(`period_from = $${pIdx++}`); params.push(period_from); }
    if (period_to && existingCols.has('period_to')) { setClauses.push(`period_to = $${pIdx++}`); params.push(period_to); }
    if (issue_date && existingCols.has('issue_date')) { setClauses.push(`issue_date = $${pIdx++}`); params.push(issue_date); }
    else if (issue_date && existingCols.has('bill_date')) { setClauses.push(`bill_date = $${pIdx++}`); params.push(issue_date); }
    if (due_date && existingCols.has('due_date')) { setClauses.push(`due_date = $${pIdx++}`); params.push(due_date); }
    if (bill_month && existingCols.has('bill_month')) { setClauses.push(`bill_month = $${pIdx++}`); params.push(bill_month); }
    if (existingCols.has('field_data')) {
      setClauses.push(`field_data = $${pIdx++}`);
      const updatedFd = {
        ...fd,
        period_from,
        period_to,
        issue_date,
        due_date,
        bill_month
      };
      if (pdf_filename) {
        updatedFd['Invoice PDF'] = pdf_filename;
        updatedFd.f_pdf = pdf_filename;
        updatedFd.pdf_filename = pdf_filename;
      }
      params.push(JSON.stringify(updatedFd));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    params.push(id);
    const query = `
      UPDATE tbl_telecome_bill 
      SET ${setClauses.join(', ')}
      WHERE ${pkCol} = $${pIdx}
      RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.deleteTelecomBill = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const itemFk = await getItemFkCol();
    const logFk = await getLogFkCol();
    const { id } = req.params;

    // Fetch bill details first to get bill_number
    const billRes = await db.query(`SELECT * FROM tbl_telecome_bill WHERE ${pkCol} = $1`, [id]).catch(() => ({ rows: [] }));
    const billNum = billRes.rows[0]?.bill_number;

    // Delete child items, call logs, and SMS logs first by FK and bill_number
    await db.query(`DELETE FROM tbl_telecome_bill_items WHERE ${itemFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    await db.query(`DELETE FROM tbl_telecome_call_logs WHERE ${logFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    await db.query(`DELETE FROM tbl_telecome_sms_logs WHERE ${logFk} = $1 OR tele_bill_id = $1 OR bill_id = $1`, [id]).catch(() => { });
    if (billNum) {
      await db.query(`DELETE FROM tbl_telecome_bill_items WHERE bill_number = $1`, [billNum]).catch(() => { });
      await db.query(`DELETE FROM tbl_telecome_call_logs WHERE bill_number = $1`, [billNum]).catch(() => { });
      await db.query(`DELETE FROM tbl_telecome_sms_logs WHERE bill_number = $1`, [billNum]).catch(() => { });
    }

    // Delete parent bill
    const result = await db.query(
      `DELETE FROM tbl_telecome_bill WHERE ${pkCol} = $1 RETURNING *, ${pkCol} AS id, ${pkCol} AS tele_bill_id, ${pkCol} AS bill_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Telecom Bill record not found' });
    }

    // Clean up orphaned records if no bills remain
    const countRes = await db.query('SELECT COUNT(*) FROM tbl_telecome_bill').catch(() => ({ rows: [{ count: '1' }] }));
    if (parseInt(countRes.rows[0]?.count || 0) === 0) {
      await db.query('DELETE FROM tbl_telecome_call_logs').catch(() => { });
      await db.query('DELETE FROM tbl_telecome_sms_logs').catch(() => { });
      await db.query('DELETE FROM tbl_telecome_bill_items').catch(() => { });
    }

    res.status(200).json({ message: 'Telecom Bill record deleted successfully' });
  } catch (err) {
    console.error('Error deleting Telecom Bill:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.getTelecomReportAnalytics = async (req, res) => {
  try {
    const pkCol = await getBillPkCol();
    const logFk = await getLogFkCol();

    const colsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_bill'
    `).catch(() => ({ rows: [] }));
    const existingCols = new Set(colsRes.rows.map(r => r.column_name));
    const providerCol = existingCols.has('telecom_provider') ? 'b.telecom_provider' : (existingCols.has('provider') ? 'b.provider' : "''");
    const totalCol = existingCols.has('total_bill') ? 'total_bill' : (existingCols.has('total_amount') ? 'total_amount' : '0');

    const { company, company_id, clientid } = req.query;
    const compFilter = (company && company !== 'All') ? company : (company_id && company_id !== 'All' ? company_id : null);

    const compParam = compFilter ? [compFilter] : [];

    const hasCompanyId = existingCols.has('company_id');
    const hasClientId = existingCols.has('clientid');
    const hasCompanyName = existingCols.has('company_name');

    const aloneConds = [];
    const joinedConds = [];

    if (hasCompanyName) {
      aloneConds.push('TRIM(company_name) ILIKE TRIM($1)');
      joinedConds.push('TRIM(b.company_name) ILIKE TRIM($1)');
    }
    if (hasCompanyId) {
      aloneConds.push('company_id::text = $1');
      joinedConds.push('b.company_id::text = $1');
    }
    if (hasClientId) {
      aloneConds.push('clientid::text = $1');
      joinedConds.push('b.clientid::text = $1');
    }

    const aloneClause = aloneConds.length > 0 ? aloneConds.join(' OR ') : '1=1';
    const joinedClause = joinedConds.length > 0 ? joinedConds.join(' OR ') : '1=1';

    const compWhereAlone = compFilter ? `WHERE (${aloneClause})` : '';
    const compWhereJoined = compFilter ? `WHERE (${joinedClause})` : '';
    const compAndJoined = compFilter ? `AND (${joinedClause})` : '';

    // Check existing tables
    const tblsRes = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tbl_telecome_bill', 'tbl_telecome_bill_items', 'tbl_telecome_call_logs', 'tbl_telecome_sms_logs')
    `).catch(() => ({ rows: [] }));
    const existingTbls = new Set(tblsRes.rows.map(r => r.table_name));

    const hasCallLogs = existingTbls.has('tbl_telecome_call_logs');
    const hasSmsLogs = existingTbls.has('tbl_telecome_sms_logs');

    // 1. Summary Stats
    let summaryStats = {
      total_bills: 0,
      total_expenses: 0,
      total_call_logs: 0,
      total_sms_logs: 0,
      total_intl_calls: 0,
      total_intl_cost: 0,
      total_active_lines: 0
    };

    try {
      const summaryRes = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM tbl_telecome_bill ${compWhereAlone}) AS total_bills,
          (SELECT COALESCE(SUM(${totalCol}), 0) FROM tbl_telecome_bill ${compWhereAlone}) AS total_expenses,
          ${hasCallLogs ? `(SELECT COUNT(*) FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) ${compWhereJoined})` : '0'} + 
          ${hasSmsLogs ? `(SELECT COUNT(*) FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) ${compWhereJoined})` : '0'} AS total_call_logs,
          ${hasSmsLogs ? `(SELECT COUNT(*) FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) ${compWhereJoined})` : '0'} AS total_sms_logs,
          ${hasCallLogs ? `(SELECT COUNT(*) FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) WHERE c.category = 'International Call' ${compAndJoined})` : '0'} AS total_intl_calls,
          ${hasCallLogs ? `(SELECT COALESCE(SUM(c.amount), 0) FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) WHERE c.category = 'International Call' ${compAndJoined})` : '0'} AS total_intl_cost,
          (SELECT COUNT(DISTINCT mobile_number) FROM tbl_telecome_bill ${compWhereAlone}) AS total_active_lines
      `, compParam);
      if (summaryRes.rows.length > 0) {
        summaryStats = summaryRes.rows[0];
      }
    } catch (e) {
      console.error('Summary stats query error:', e);
    }

    // 2. Categories
    let categoryBreakdown = [];
    try {
      const catSubQueries = [];
      if (hasCallLogs) catSubQueries.push(`SELECT c.category, c.amount FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) ${compWhereJoined}`);
      if (hasSmsLogs) catSubQueries.push(`SELECT s.sms_type AS category, s.amount FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) ${compWhereJoined}`);

      if (catSubQueries.length > 0) {
        const catRes = await db.query(`
          SELECT category, COUNT(*) as count, SUM(amount) as total_amount 
          FROM (${catSubQueries.join(' UNION ALL ')}) combined_cats
          GROUP BY category 
          ORDER BY count DESC
        `, compParam);
        categoryBreakdown = catRes.rows;
      }
    } catch (e) {
      console.error('Category breakdown query error:', e);
    }

    // 3. Top Callers
    let topCallers = [];
    try {
      const callerSubQueries = [];
      if (hasCallLogs) callerSubQueries.push(`SELECT c.source_number, c.amount FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) ${compWhereJoined}`);
      if (hasSmsLogs) callerSubQueries.push(`SELECT s.source_number, s.amount FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) ${compWhereJoined}`);

      if (callerSubQueries.length > 0) {
        const callersRes = await db.query(`
          SELECT source_number, COUNT(*) as call_count, SUM(amount) as total_spent 
          FROM (${callerSubQueries.join(' UNION ALL ')}) combined_sources
          GROUP BY source_number 
          ORDER BY call_count DESC
        `, compParam);
        topCallers = callersRes.rows;
      }
    } catch (e) {
      console.error('Top callers query error:', e);
    }

    // 4. Top Destinations
    let topDestinations = [];
    try {
      const destSubQueries = [];
      if (hasCallLogs) destSubQueries.push(`SELECT c.destination_number, c.category, c.amount FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) ${compWhereJoined}`);
      if (hasSmsLogs) destSubQueries.push(`SELECT s.destination_number, s.sms_type AS category, s.amount FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) ${compWhereJoined}`);

      if (destSubQueries.length > 0) {
        const destRes = await db.query(`
          SELECT destination_number, category, COUNT(*) as call_count, SUM(amount) as total_spent 
          FROM (${destSubQueries.join(' UNION ALL ')}) combined_dests
          GROUP BY destination_number, category 
          ORDER BY call_count DESC 
          LIMIT 10
        `, compParam);
        topDestinations = destRes.rows;
      }
    } catch (e) {
      console.error('Top destinations query error:', e);
    }

    // 5. Country Breakdown
    const countryMap = {};
    const resolveCountry = (num) => {
      if (!num) return 'Overseas';
      const clean = num.replace(/^00/, '+').trim();
      if (clean.startsWith('+91') || clean.startsWith('0091')) return 'India';
      if (clean.startsWith('+254') || clean.startsWith('00254')) return 'Kenya';
      if (clean.startsWith('+98') || clean.startsWith('0098')) return 'Iran';
      if (clean.startsWith('+39') || clean.startsWith('0039')) return 'Italy';
      if (clean.startsWith('+49') || clean.startsWith('0049')) return 'Germany';
      if (clean.startsWith('+960') || clean.startsWith('00960')) return 'Maldives';
      if (clean.startsWith('+84') || clean.startsWith('0084')) return 'Vietnam';
      if (clean.startsWith('+60') || clean.startsWith('0060')) return 'Malaysia';
      if (clean.startsWith('+62') || clean.startsWith('0062')) return 'Indonesia';
      if (clean.startsWith('+261') || clean.startsWith('00261')) return 'Madagascar';
      return 'Overseas';
    };

    try {
      const intlSubQueries = [];
      if (hasCallLogs) intlSubQueries.push(`SELECT c.destination_number, c.amount FROM tbl_telecome_call_logs c LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number) WHERE c.category = 'International Call' ${compAndJoined}`);
      if (hasSmsLogs) intlSubQueries.push(`SELECT s.destination_number, s.amount FROM tbl_telecome_sms_logs s LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number) WHERE s.sms_type = 'International SMS' ${compAndJoined}`);

      if (intlSubQueries.length > 0) {
        const intlLogsRes = await db.query(intlSubQueries.join(' UNION ALL '), compParam);
        intlLogsRes.rows.forEach(r => {
          const cName = resolveCountry(r.destination_number);
          const amt = parseFloat(r.amount || 0);
          if (!countryMap[cName]) {
            countryMap[cName] = { country_name: cName, call_count: 0, total_spent: 0 };
          }
          countryMap[cName].call_count += 1;
          countryMap[cName].total_spent += amt;
        });
      }
    } catch (e) {
      console.error('Country breakdown error:', e);
    }

    const countryBreakdown = Object.values(countryMap).sort((a, b) => b.call_count - a.call_count);

    // Check existing SMS log columns
    const smsColsRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tbl_telecome_sms_logs'
    `).catch(() => ({ rows: [] }));
    const existingSmsCols = new Set(smsColsRes.rows.map(r => r.column_name));
    const smsSubHeading = existingSmsCols.has('sub_heading') ? 'COALESCE(s.sub_heading, s.sms_type)' : 's.sms_type';
    const smsProviderCheck = existingSmsCols.has('provider') ? "OR s.provider ILIKE 'du%'" : "";

    // 6. Provider Breakdown
    let providerBreakdown = [];
    try {
      const provSubQueries = [];
      if (hasCallLogs) {
        provSubQueries.push(`
          SELECT 
            CASE 
              WHEN c.bill_number = 'I4008352339' OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du Telecom'
              ELSE 'Etisalat'
            END AS provider, 
            c.amount
          FROM tbl_telecome_call_logs c
          LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number)
          ${compWhereJoined}
        `);
      }
      if (hasSmsLogs) {
        provSubQueries.push(`
          SELECT 
            CASE 
              WHEN s.bill_number = 'I4008352339' ${smsProviderCheck} OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du Telecom'
              ELSE 'Etisalat'
            END AS provider, 
            s.amount
          FROM tbl_telecome_sms_logs s
          LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number)
          ${compWhereJoined}
        `);
      }

      if (provSubQueries.length > 0) {
        const provRes = await db.query(`
          SELECT provider, COUNT(*) as call_count, SUM(amount) as total_spent
          FROM (${provSubQueries.join(' UNION ALL ')}) combined_providers
          GROUP BY provider
          ORDER BY call_count DESC
        `, compParam);
        providerBreakdown = provRes.rows;
      }
    } catch (e) {
      console.error('Provider breakdown query error:', e);
    }

    // 7. Recent Call Logs
    let recentCallLogs = [];
    try {
      const recentSubQueries = [];
      if (hasCallLogs) {
        recentSubQueries.push(`
          SELECT 
            c.log_id,
            c.${logFk} AS tele_bill_id,
            c.${logFk} AS bill_id,
            c.bill_number,
            b.company_name,
            c.source_number,
            c.call_date,
            c.call_time,
            c.destination_number,
            c.duration,
            c.category,
            c.category AS sub_heading,
            c.amount,
            c.created_at,
            CASE 
              WHEN c.bill_number = 'I4008352339' OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du'
              ELSE 'Etisalat'
            END AS provider
          FROM tbl_telecome_call_logs c
          LEFT JOIN tbl_telecome_bill b ON (c.${logFk} = b.${pkCol} OR c.bill_number = b.bill_number)
          ${compWhereJoined}
        `);
      }
      if (hasSmsLogs) {
        recentSubQueries.push(`
          SELECT 
            s.sms_log_id AS log_id,
            s.${logFk} AS tele_bill_id,
            s.${logFk} AS bill_id,
            s.bill_number,
            b.company_name,
            s.source_number,
            s.sms_date AS call_date,
            s.sms_time AS call_time,
            s.destination_number,
            NULL AS duration,
            s.sms_type AS category,
            ${smsSubHeading} AS sub_heading,
            s.amount,
            s.created_at,
            CASE 
              WHEN s.bill_number = 'I4008352339' ${smsProviderCheck} OR COALESCE(${providerCol}, '') ILIKE 'du%' THEN 'du'
              ELSE 'Etisalat'
            END AS provider
          FROM tbl_telecome_sms_logs s
          LEFT JOIN tbl_telecome_bill b ON (s.${logFk} = b.${pkCol} OR s.bill_number = b.bill_number)
          ${compWhereJoined}
        `);
      }

      if (recentSubQueries.length > 0) {
        const recentRes = await db.query(`
          SELECT * FROM (${recentSubQueries.join(' UNION ALL ')}) combined_recent
          ORDER BY log_id DESC LIMIT 5000
        `, compParam);
        recentCallLogs = recentRes.rows;
      }
    } catch (e) {
      console.error('Recent call logs query error:', e);
    }

    // Fetch distinct available companies for frontend dropdown
    const compListRes = await db.query(`
      SELECT DISTINCT company_name 
      FROM tbl_telecome_bill 
      WHERE company_name IS NOT NULL AND TRIM(company_name) != '' 
      ORDER BY company_name ASC
    `).catch(() => ({ rows: [] }));
    const availableCompanies = compListRes.rows.map(r => r.company_name);

    res.status(200).json({
      summaryStats,
      categoryBreakdown,
      topCallers,
      topDestinations,
      countryBreakdown,
      providerBreakdown,
      recentCallLogs,
      availableCompanies,
      selectedCompany: compFilter || 'All'
    });
  } catch (err) {
    console.error('Error fetching telecom report analytics:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};
