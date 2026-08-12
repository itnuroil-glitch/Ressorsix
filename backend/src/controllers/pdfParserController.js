const { PDFDocument } = require('pdf-lib');
const pdfParseReq = require('pdf-parse');
const db = require('../config/db');

const getPdfParseFn = () => {
  if (typeof pdfParseReq === 'function') return pdfParseReq;
  if (pdfParseReq && typeof pdfParseReq.pdfParse === 'function') return pdfParseReq.pdfParse;
  if (pdfParseReq && typeof pdfParseReq.default === 'function') return pdfParseReq.default;
  if (pdfParseReq && typeof pdfParseReq.PDFParse === 'function') return pdfParseReq.PDFParse;
  return null;
};

exports.parsePdfDocument = async (req, res) => {
  try {
    let buffer;
    let file_name = (req.body && req.body.file_name) || 'document.pdf';

    // 1. Check if uploaded via Multer (multipart form data)
    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
      file_name = req.file.originalname || file_name;
    } else if (req.body && req.body.file_base64) {
      // 2. Check if uploaded via Base64 JSON
      const file_base64 = req.body.file_base64;
      const matches = file_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(file_base64, 'base64');
      }
    }

    if (!buffer) {
      return res.status(400).json({ message: 'No PDF file provided.' });
    }

    // 3. Extract interactive PDF AcroForm fields using pdf-lib
    const pdfLibFieldsMap = {};
    try {
      const pdfLibDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const form = pdfLibDoc.getForm();
      const fields = form.getFields();
      fields.forEach(field => {
        const type = field.constructor.name;
        const name = field.getName();
        let value = '';
        if (type === 'PDFTextField') {
          value = field.getText() || '';
        } else if (type === 'PDFDropdown') {
          const selected = field.getSelected();
          value = Array.isArray(selected) ? selected.join(', ') : (selected || '');
        } else if (type === 'PDFCheckBox') {
          value = field.isChecked() ? 'Yes' : 'No';
        }
        if (name && value) {
          const cleanName = name.trim();
          const lowerName = cleanName.toLowerCase();
          const snakeName = lowerName.replace(/[\s\-_]+/g, '_');
          pdfLibFieldsMap[cleanName] = value;
          pdfLibFieldsMap[lowerName] = value;
          pdfLibFieldsMap[snakeName] = value;
        }
      });
      console.log('--- PDF-LIB EXTRACTED FIELDS COUNT ---', Object.keys(pdfLibFieldsMap).length);
    } catch (pdfLibErr) {
      console.log('pdf-lib extraction note (non-interactive or standard PDF):', pdfLibErr.message);
    }

    // 4. Extract full text content using pdf-parse
    let rawText = '';
    try {
      if (pdfParseReq && typeof pdfParseReq.PDFParse === 'function') {
        try {
          const instance = new pdfParseReq.PDFParse({ data: buffer });
          const res = await instance.getText();
          if (res && res.text) rawText = res.text;
          else if (typeof res === 'string') rawText = res;
        } catch (clsErr) {
          console.log('PDFParse class extraction note:', clsErr.message);
        }
      }

      if (!rawText) {
        let fn = null;
        if (typeof pdfParseReq === 'function') fn = pdfParseReq;
        else if (pdfParseReq && typeof pdfParseReq.pdfParse === 'function') fn = pdfParseReq.pdfParse;
        else if (pdfParseReq && typeof pdfParseReq.default === 'function') fn = pdfParseReq.default;

        if (fn) {
          const parsedPdf = await fn(buffer);
          rawText = parsedPdf ? (parsedPdf.text || parsedPdf.data || String(parsedPdf)) : '';
        }
      }
    } catch (pdfParseErr) {
      console.log('pdf-parse extraction note:', pdfParseErr.message);
    }

    console.log('--- EXTRACTED PDF TEXT SNIPPET ---');
    console.log(rawText ? rawText.slice(0, 500) : '(No text extracted)');

    // 1. Fetch DB Lookup Tables for Intelligent Matching
    const companiesRes = await db.query('SELECT id, name FROM company').catch(() => ({ rows: [] }));
    const docTypesRes = await db.query('SELECT id, doc_type_name FROM tbl_tele_doc_type').catch(() => ({ rows: [] }));
    const simDetailsRes = await db.query('SELECT id, sim_number, phone_number, account_number FROM tbl_sim_details').catch(() => ({ rows: [] }));

    let matchedCompanyId = '';
    let matchedDocTypeId = '';
    let matchedMobileAccount = '';
    let matchedDocNumber = '';
    let matchedIssueDate = '';
    let matchedExpiryDate = '';
    let matchedRemarks = '';

    // A. Match Company Name in PDF text
    for (const comp of companiesRes.rows) {
      if (comp.name && rawText.toLowerCase().includes(comp.name.toLowerCase())) {
        matchedCompanyId = String(comp.id);
        break;
      }
    }

    // B. Match Document Type in PDF text
    for (const dt of docTypesRes.rows) {
      if (dt.doc_type_name && rawText.toLowerCase().includes(dt.doc_type_name.toLowerCase())) {
        matchedDocTypeId = String(dt.id);
        break;
      }
    }

    // Helper to format raw date string to YYYY-MM-DD
    const parseToStandardDate = (dateStr) => {
      if (!dateStr) return '';
      const cleaned = dateStr.trim();
      const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };

      // Match "01 Aug 2026" or "15 AUG 2026" or "1 Aug 2026"
      const matchWords = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})/);
      if (matchWords) {
        const day = matchWords[1].padStart(2, '0');
        const mKey = matchWords[2].toLowerCase().slice(0, 3);
        const month = monthMap[mKey] || '01';
        let year = matchWords[3];
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
      }

      // Match "01/08/2026" or "2026-08-01" or "01-08-2026" or "01.08.2026"
      const parts = cleaned.split(/[\/\.-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }

      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return cleaned;
    };

    // Helper to find all valid dates in rawText
    const allFoundDates = [];
    const globalDateRegex = /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})/gi;
    let dateMatch;
    while ((dateMatch = globalDateRegex.exec(rawText)) !== null) {
      const std = parseToStandardDate(dateMatch[1]);
      if (std && !allFoundDates.includes(std) && std.length === 10) {
        allFoundDates.push(std);
      }
    }

    // C. Match Document / Bill Number Regex
    const docNoPatterns = [
      /(?:bill\s*number|invoice\s*number|doc(?:ument)?\s*number|contract\s*no|ref(?:erence)?|agreement|inv\s*no|tax\s*invoice\s*no|invoice\s*#|bill\s*#|tax\s*invoice\s*#)\s*[:.-]?\s*[\r\n]*\s*([A-Z0-9/-]{4,35})/i,
      /(?:invoice|bill|tax\s*invoice)\s*:\s*([A-Z0-9/-]{4,35})/i,
      /\b(INV[-/A-Z0-9]{4,25}|BILL[-/A-Z0-9]{4,25}|100\d{7,12}|\d{8,14})\b/i
    ];
    for (const pat of docNoPatterns) {
      const m = rawText.match(pat);
      if (m && m[1] && m[1].trim().length > 3) {
        matchedDocNumber = m[1].trim();
        break;
      }
    }

    // D. Match Account Number / Mobile Number Regex
    const accNoPatterns = [
      /(?:account\s*number|acc\s*no|mobile\s*number|phone\s*no|customer\s*account|subscriber\s*no|cust\s*acc|service\s*no|account\s*id|service\s*id)\s*[:.-]?\s*[\r\n]*\s*([\d\s-]{7,25})/i,
      /(?:account|mobile|phone|service)\s*:\s*([\d\s-]{7,25})/i
    ];
    for (const pat of accNoPatterns) {
      const m = rawText.match(pat);
      if (m && m[1]) {
        matchedMobileAccount = m[1].replace(/\s+/g, ' ').trim();
        break;
      }
    }
    if (!matchedMobileAccount) {
      for (const sim of simDetailsRes.rows) {
        if (sim.phone_number && rawText.includes(sim.phone_number)) {
          matchedMobileAccount = sim.phone_number;
          break;
        }
        if (sim.account_number && rawText.includes(sim.account_number)) {
          matchedMobileAccount = sim.account_number;
          break;
        }
      }
      if (!matchedMobileAccount) {
        const phoneMatch = rawText.match(/\b(05[024568]\s*[-]?\s*\d{7}|971\d{9})\b/);
        if (phoneMatch) matchedMobileAccount = phoneMatch[1].replace(/\s+/g, '').trim();
      }
    }

    // E. Match Bill Issue Date
    const issueDatePatterns = [
      /(?:bill\s*issue\s*date|issue\s*date|billing\s*date|invoice\s*date|statement\s*date|tax\s*invoice\s*date|date)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})/i,
      /(?:date\s*of\s*issue)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})/i
    ];
    for (const pat of issueDatePatterns) {
      const m = rawText.match(pat);
      if (m && m[1]) {
        matchedIssueDate = parseToStandardDate(m[1].trim());
        break;
      }
    }
    if (!matchedIssueDate && allFoundDates.length > 0) {
      matchedIssueDate = allFoundDates[0];
    }

    // F. Match Due Date / Expiry Date / Pay Before
    let matchedDueDate = '';
    const dueDatePatterns = [
      /(?:pay\s*before|due\s*date|payment\s*due|expir(?:y|ation)\s*date|valid\s*until|payment\s*due\s*date)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})/i
    ];
    for (const pat of dueDatePatterns) {
      const m = rawText.match(pat);
      if (m && m[1]) {
        matchedDueDate = parseToStandardDate(m[1].trim());
        matchedExpiryDate = matchedDueDate;
        break;
      }
    }
    if (!matchedDueDate && allFoundDates.length > 1) {
      matchedDueDate = allFoundDates[1];
      matchedExpiryDate = matchedDueDate;
    }

    // G. Match Bill Period From & To
    let matchedPeriodFrom = '';
    let matchedPeriodTo = '';
    const periodPatterns = [
      /(?:bill\s*period|billing\s*period|period|duration)\s*[:.-]?\s*[\r\n]*\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})\s*(?:-|to|until)\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}|\d{1,4}[\/\.-]\d{1,2}[\/\.-]\d{1,4})/i
    ];
    for (const pat of periodPatterns) {
      const m = rawText.match(pat);
      if (m) {
        matchedPeriodFrom = parseToStandardDate(m[1].trim());
        matchedPeriodTo = parseToStandardDate(m[2].trim());
        break;
      }
    }
    if (!matchedPeriodFrom && matchedIssueDate) matchedPeriodFrom = matchedIssueDate;
    if (!matchedPeriodTo && matchedDueDate) matchedPeriodTo = matchedDueDate;

    // H. Match Service Rentals
    let matchedServiceRental = '';
    const rentalRegex = /(?:service\s*rentals?|rental\s*charges?|monthly\s*rental|plan\s*charges?|monthly\s*plan|rentals?)\s*[:.-]?\s*[\r\n]*\s*(?:AED|\$)?\s*([\d,]+\.?\d{0,2})/i;
    const rentalMatch = rawText.match(rentalRegex);
    if (rentalMatch) matchedServiceRental = rentalMatch[1].replace(/,/g, '').trim();

    // I. Match Usage Charges
    let matchedUsageCharges = '';
    const usageRegex = /(?:usage\s*charges?|usage|call\s*charges?|extra\s*usage)\s*[:.-]?\s*[\r\n]*\s*(?:AED|\$)?\s*([\d,]+\.?\d{0,2})/i;
    const usageMatch = rawText.match(usageRegex);
    if (usageMatch) matchedUsageCharges = usageMatch[1].replace(/,/g, '').trim();

    // J. Match One-Time Charges
    let matchedOneTimeCharges = '';
    const oneTimeRegex = /(?:one-time\s*charges?|one\s*time|activation\s*fee|setup\s*fee)\s*[:.-]?\s*[\r\n]*\s*(?:AED|\$)?\s*([\d,]+\.?\d{0,2})/i;
    const oneTimeMatch = rawText.match(oneTimeRegex);
    if (oneTimeMatch) matchedOneTimeCharges = oneTimeMatch[1].replace(/,/g, '').trim();

    // K. Match Other Charges / Credits
    let matchedOtherCharges = '';
    const otherRegex = /(?:other\s*credits?\s*&\s*charges?|other\s*charges?|discounts?|adjustments?)\s*[:.-]?\s*[\r\n]*\s*(?:AED|\$)?\s*([\d,]+\.?\d{0,2})/i;
    const otherMatch = rawText.match(otherRegex);
    if (otherMatch) matchedOtherCharges = otherMatch[1].replace(/,/g, '').trim();

    // L. Match VAT Amount
    let matchedVat = '';
    const vatPatterns = [
      /(?:vat\s*(?:on\s*taxable\s*services)?\s*(?:[-–]?\s*current\s*period)?|vat\s*amount|tax\s*amount|5%\s*vat|vat\s*\(5%\)|tax\s*\(5%\))\s*[:.-]?\s*[\r\n]*\s*(?:AED|\$)?\s*([\d,]+\.?\d{2})/i,
      /VAT\s*(?:[^\n\r\d]*?)\s*([\d,]+\.\d{2})/i
    ];
    for (const pat of vatPatterns) {
      const vatMatch = rawText.match(pat);
      if (vatMatch && vatMatch[1]) {
        matchedVat = vatMatch[1].replace(/,/g, '').trim();
        break;
      }
    }

    // M. Match Telecom Provider
    let matchedTelecomProvider = '';
    if (/\b(?:etisalat|e&)\b/i.test(rawText) || /etisalat/i.test(rawText)) {
      matchedTelecomProvider = 'Etisalat';
    } else if (/\bdu\b/i.test(rawText)) {
      matchedTelecomProvider = 'du';
    } else if (/\bvirgin\b/i.test(rawText)) {
      matchedTelecomProvider = 'Virgin';
    } else if (/\bvodafone\b/i.test(rawText)) {
      matchedTelecomProvider = 'Vodafone';
    } else if (/\bstc\b/i.test(rawText)) {
      matchedTelecomProvider = 'STC';
    } else if (/\booredoo\b/i.test(rawText)) {
      matchedTelecomProvider = 'Ooredoo';
    } else if (/\bzain\b/i.test(rawText)) {
      matchedTelecomProvider = 'Zain';
    } else if (/\bmobily\b/i.test(rawText)) {
      matchedTelecomProvider = 'Mobily';
    } else {
      matchedTelecomProvider = 'Etisalat';
    }

    // N. Match Total / Bill Amount Regex
    let matchedTotalAmount = '';
    const amountPatterns = [
      /(?:current\s*month\s*charges|total\s*bill|net\s*amount|grand\s*total|total\s*due|amount\s*due|total\s*amount|total\s*current\s*charges|amount\s*payable|total\s*payable)\s*[:.-]?\s*[\r\n]*\s*(?:AED|USD|\$|SAR|QAR)?\s*([\d,]+\.?\d{2})/i,
      /(?:AED|USD|\$)\s*([\d,]+\.\d{2})/i,
      /\b([\d,]+\.\d{2})\s*(?:AED|USD|\$)/i
    ];
    for (const pat of amountPatterns) {
      const m = rawText.match(pat);
      if (m && m[1] && parseFloat(m[1].replace(/,/g, '')) > 0) {
        matchedTotalAmount = m[1].replace(/,/g, '').trim();
        break;
      }
    }

    // Universal Fallback for Decimal Amounts (Find all decimal numbers in rawText)
    const allDecimals = [];
    const decRegex = /\b(\d{1,6}\.\d{2})\b/g;
    let decMatch;
    while ((decMatch = decRegex.exec(rawText)) !== null) {
      const val = parseFloat(decMatch[1]);
      if (val > 0 && !allDecimals.includes(val)) {
        allDecimals.push(val);
      }
    }
    allDecimals.sort((a, b) => b - a); // Sort descending

    if (!matchedTotalAmount && allDecimals.length > 0) {
      matchedTotalAmount = allDecimals[0].toFixed(2);
    }

    if (!matchedServiceRental) {
      if (allDecimals.length > 1) {
        matchedServiceRental = allDecimals[1].toFixed(2);
      } else if (matchedTotalAmount) {
        matchedServiceRental = matchedTotalAmount;
      }
    }

    const totNum = parseFloat(matchedTotalAmount || 0);
    const vatNum = parseFloat(matchedVat || 0);
    const netCharges = parseFloat(matchedServiceRental || 0) + parseFloat(matchedUsageCharges || 0) + parseFloat(matchedOneTimeCharges || 0) + parseFloat(matchedOtherCharges || 0);

    // Sanity Check: VAT cannot exceed total bill or 30% of total bill
    if (!matchedVat || (totNum > 0 && vatNum >= totNum) || (totNum > 0 && vatNum > totNum * 0.3)) {
      if (netCharges > 0) {
        matchedVat = (netCharges * 0.05).toFixed(2);
      } else if (totNum > 0) {
        matchedVat = (totNum * 0.05 / 1.05).toFixed(2);
      }
    }

    // Universal Fallback for Document / Bill Number
    if (!matchedDocNumber) {
      const allTokens = rawText.match(/\b([A-Z0-9/-]{6,25})\b/g) || [];
      for (const tok of allTokens) {
        const cleanedTok = tok.trim();
        if (/^(?!\d+$)[A-Z0-9/-]{6,25}$/i.test(cleanedTok) && !/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|AED|USD|TEL|FAX|HTTP|WWW)/i.test(cleanedTok)) {
          matchedDocNumber = cleanedTok;
          break;
        }
      }
      if (!matchedDocNumber && allTokens.length > 0) {
        const numTok = allTokens.find(t => /^\d{8,15}$/.test(t));
        if (numTok) matchedDocNumber = numTok;
      }
    }

    // Universal Fallback for Mobile / Account Number
    if (!matchedMobileAccount) {
      const phoneCandidate = rawText.match(/\b(05\d{8}|9715\d{8}|04\d{7}|02\d{7}|03\d{7}|06\d{7}|07\d{7}|09\d{7})\b/);
      if (phoneCandidate) {
        matchedMobileAccount = phoneCandidate[1];
      }
    }

    // Universal Fallback for Dates if empty
    if (!matchedIssueDate && allFoundDates.length > 0) {
      matchedIssueDate = allFoundDates[0];
    }
    if (!matchedDueDate) {
      if (allFoundDates.length > 1) {
        matchedDueDate = allFoundDates[1];
      } else if (matchedIssueDate) {
        // Fallback: 30 days after issue date
        const d = new Date(matchedIssueDate);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 30);
          matchedDueDate = d.toISOString().split('T')[0];
        }
      }
    }
    if (!matchedPeriodFrom) matchedPeriodFrom = matchedIssueDate;
    if (!matchedPeriodTo) matchedPeriodTo = matchedDueDate || matchedIssueDate;

    // O. Match Dynamic Key-Value Pairs from PDF Text Lines & PDF-Lib AcroForms
    const dynamicFieldMap = { ...pdfLibFieldsMap };
    const textLines = rawText.split(/\r?\n/);
    for (const line of textLines) {
      const parts = line.split(/[:=]/);
      if (parts.length === 2) {
        const k = parts[0].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
        const v = parts[1].trim();
        if (k.length > 2 && k.length < 50 && v.length > 0 && v.length < 150) {
          const lowerK = k.toLowerCase();
          const snakeK = lowerK.replace(/[\s\-_]+/g, '_');
          if (!dynamicFieldMap[k]) dynamicFieldMap[k] = v;
          if (!dynamicFieldMap[lowerK]) dynamicFieldMap[lowerK] = v;
          if (!dynamicFieldMap[snakeK]) dynamicFieldMap[snakeK] = v;
        }
      }
    }

    // G. Generate Remarks Snippet
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const titleSnippet = lines.slice(0, 3).join(' | ');
    matchedRemarks = `Auto-extracted from PDF: ${file_name || 'document'}. (${titleSnippet.slice(0, 80)})`;

    res.status(200).json({
      message: 'PDF data extracted successfully.',
      extractedData: {
        company_id: matchedCompanyId,
        doc_type_id: matchedDocTypeId,
        telecom_provider: matchedTelecomProvider,
        mobile_account: matchedMobileAccount,
        doc_number: matchedDocNumber,
        bill_number: matchedDocNumber,
        issue_date: matchedIssueDate,
        expiry_date: matchedExpiryDate,
        due_date: matchedDueDate || matchedExpiryDate,
        period_from: matchedPeriodFrom,
        period_to: matchedPeriodTo,
        service_rental: matchedServiceRental,
        usage_charges: matchedUsageCharges,
        one_time_charges: matchedOneTimeCharges,
        other_charges: matchedOtherCharges,
        vat: matchedVat,
        total_amount: matchedTotalAmount,
        remarks: matchedRemarks,
        dynamic_field_map: dynamicFieldMap
      },
      rawTextSnippet: rawText.slice(0, 500)
    });
  } catch (error) {
    console.error('Error parsing PDF document:', error);
    res.status(422).json({
      message: 'Could not extract text from this PDF document. Please make sure it is a valid digital PDF file.'
    });
  }
};
