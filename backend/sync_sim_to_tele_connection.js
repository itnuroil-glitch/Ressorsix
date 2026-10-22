/**
 * Script: sync_sim_to_tele_connection.js
 * Description: Extracts SIM details from tbl_sim_details.field_data JSON 
 *              and migrates/populates them into tbl_tele_connection.
 * 
 * Usage:
 *   node sync_sim_to_tele_connection.js
 */

require('dotenv').config();
const db = require('./src/config/db');

async function syncSimDetailsToTelecomConnections() {
  console.log('====================================================');
  console.log(' Starting Migration: tbl_sim_details -> tbl_tele_connection');
  console.log('====================================================\n');

  try {
    // 1. Fetch Custom Field Definitions
    const cfRes = await db.query(
      `SELECT field_id, field_name FROM tbl_customfield_details`
    );
    const idToName = {};
    cfRes.rows.forEach(r => {
      idToName[String(r.field_id).trim()] = (r.field_name || '').trim();
    });
    console.log(`[1/4] Loaded ${cfRes.rows.length} custom field definitions.`);

    // 2. Fetch Companies
    const compRes = await db.query(`SELECT id, company_name FROM company`);
    const companyMap = {};
    compRes.rows.forEach(c => {
      companyMap[String(c.id)] = c.company_name;
    });
    console.log(`[2/4] Loaded ${compRes.rows.length} companies for name resolution.`);

    // 3. Clean up empty/broken rows that have no connection number and unknown provider
    const deleteBrokenRes = await db.query(`
      DELETE FROM tbl_tele_connection 
      WHERE (connection_number IS NULL OR TRIM(connection_number) = '')
        AND (provider IS NULL OR provider = 'Unknown' OR provider = '')
    `);
    if (deleteBrokenRes.rowCount > 0) {
      console.log(`[3/4] Cleaned up ${deleteBrokenRes.rowCount} empty/blank rows in tbl_tele_connection.`);
    } else {
      console.log(`[3/4] No broken/blank rows needed cleanup.`);
    }

    // 4. Fetch Active SIM Details
    const simRes = await db.query(`
      SELECT * FROM tbl_sim_details 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY tele_id ASC
    `);
    console.log(`[4/4] Found ${simRes.rows.length} active SIM records in tbl_sim_details.\n`);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of simRes.rows) {
      let fd = row.field_data;
      if (typeof fd === 'string') {
        try { fd = JSON.parse(fd); } catch (e) { fd = {}; }
      }
      if (!fd || typeof fd !== 'object') fd = {};
      if (fd.field_data && typeof fd.field_data === 'object') {
        fd = { ...fd, ...fd.field_data };
      }

      // Resolve Company Name
      let companyName = 'ASAS Gen Tr LLC';
      if (row.company_id) {
        const firstId = String(row.company_id).split(',')[0].trim();
        if (companyMap[firstId]) companyName = companyMap[firstId];
      } else if (fd.company_name || fd.company) {
        companyName = fd.company_name || fd.company;
      }

      // Fields to extract
      let connectionType = 'SIM';
      let provider = null;
      let connectionNumber = null;
      let accountNumber = null;
      let iccid = null;
      let contractNo = null;
      let contractFrom = null;
      let contractTo = null;
      let planName = null;
      let monthlyPlanAmount = 0.00;
      let dataAllowance = null;
      let dataUnit = 'GB';
      let localMinutes = null;
      let intlMinutes = null;
      let localSms = null;
      let intlSms = null;
      let cug = null;
      let employeeName = null;
      let notes = null;
      let status = row.status || 'ACTIVE';

      // Iterate over fd to extract fields
      for (const [k, v] of Object.entries(fd)) {
        if (v === undefined || v === null || typeof v === 'object') continue;
        const sv = String(v).trim();
        if (!sv || sv === 'null' || sv === 'undefined') continue;

        const fn = (idToName[k] || k).trim().toLowerCase();

        // Specific Known Field IDs (Schema 39)
        if (k === '1786100933533') provider = sv;
        else if (k === '1786109523942') connectionType = sv;
        else if (k === '1786109549415') {
          // If 9+ digits, it's the mobile number
          const digits = sv.replace(/\D/g, '');
          if (digits.length >= 9 || /^05\d+/.test(digits) || /^\+?971/.test(sv)) {
            connectionNumber = sv;
          } else {
            accountNumber = sv;
          }
        }
        else if (k === '1786100950188') contractNo = sv;
        else if (k === '1786109466050') iccid = sv;
        else if (k === '1786100976800') contractFrom = sv;
        else if (k === '1786100994987') contractTo = sv;
        else if (k === '1787404908551') cug = sv;
        else if (k === '1786100996941') planName = sv;
        else if (k === '1786101020492') monthlyPlanAmount = parseFloat(sv) || 0;
        else if (k === '1786101036847') dataAllowance = sv;
        else if (k === '1786101047955') localMinutes = sv;
        else if (k === '1786101605611') intlMinutes = sv;
        else if (k === '1786101746621') localSms = sv;
        else if (k === '1786101767786') intlSms = sv;
        else if (k === '1786101777997') employeeName = sv;
        else if (k === '1787397263477') notes = sv;

        // Fallback by Field Names
        else if (!provider && (fn.includes('provider') || fn.includes('telecom'))) provider = sv;
        else if (!connectionType && fn.includes('type')) connectionType = sv;
        else if (!connectionNumber && (fn.includes('mobile') || fn.includes('phone') || fn.includes('connection number'))) connectionNumber = sv;
        else if (!accountNumber && fn.includes('account')) accountNumber = sv;
        else if (!iccid && (fn.includes('iccid') || (fn.includes('sim') && fn.includes('number')))) iccid = sv;
        else if (!contractNo && fn.includes('contract no')) contractNo = sv;
        else if (!contractFrom && fn.includes('contract from')) contractFrom = sv;
        else if (!contractTo && fn.includes('contract to')) contractTo = sv;
        else if (!planName && (fn.includes('plan') || fn.includes('package')) && !fn.includes('amount') && !fn.includes('cost')) planName = sv;
        else if (!monthlyPlanAmount && (fn.includes('monthly') || fn.includes('rental') || (fn.includes('plan') && fn.includes('amount')))) {
          monthlyPlanAmount = parseFloat(sv) || 0;
        }
        else if (!employeeName && (fn.includes('employee') || fn.includes('assigned'))) employeeName = sv;
      }

      // Fallback: If connectionNumber is still missing, look for UAE mobile phone pattern (e.g. 05x or 971x)
      if (!connectionNumber) {
        for (const val of Object.values(fd)) {
          if (typeof val === 'string') {
            const clean = val.replace(/\D/g, '');
            if (clean.length === 10 && clean.startsWith('05')) {
              connectionNumber = val.trim();
              break;
            }
          }
        }
      }

      // If still no connection number, use iccid or fallback
      if (!connectionNumber) {
        if (iccid) {
          connectionNumber = iccid;
        } else {
          console.warn(`[SKIP] SIM tele_id ${row.tele_id} has no valid mobile number or ICCID.`);
          skippedCount++;
          continue;
        }
      }

      // Normalize status and provider
      if (!provider) provider = 'e& (Etisalat)';
      if (!employeeName || employeeName.trim() === '') employeeName = 'Unassigned';
      if (status.toUpperCase() === 'ACTIVE' && employeeName === 'Unassigned') {
        status = 'UNASSIGNED';
      }

      // Check if connection already exists in tbl_tele_connection
      const existing = await db.query(
        `SELECT id FROM tbl_tele_connection 
         WHERE connection_number = $1 OR (iccid IS NOT NULL AND iccid = $2)`,
        [connectionNumber, iccid || '']
      );

      if (existing.rows.length > 0) {
        // UPDATE existing
        await db.query(
          `UPDATE tbl_tele_connection SET
            connection_type = COALESCE($1, connection_type),
            company_name = COALESCE($2, company_name),
            provider = COALESCE($3, provider),
            account_number = COALESCE($4, account_number),
            iccid = COALESCE($5, iccid),
            contract_no = COALESCE($6, contract_no),
            contract_from = COALESCE($7, contract_from),
            contract_to = COALESCE($8, contract_to),
            plan_name = COALESCE($9, plan_name),
            monthly_plan_amount = COALESCE($10, monthly_plan_amount),
            data_allowance = COALESCE($11, data_allowance),
            data_unit = COALESCE($12, data_unit),
            local_minutes = COALESCE($13, local_minutes),
            international_minutes = COALESCE($14, international_minutes),
            local_sms = COALESCE($15, local_sms),
            international_sms = COALESCE($16, international_sms),
            cug = COALESCE($17, cug),
            employee_name = COALESCE($18, employee_name),
            status = COALESCE($19, status),
            notes = COALESCE($20, notes),
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $21`,
          [
            connectionType, companyName, provider, accountNumber, iccid,
            contractNo, contractFrom, contractTo, planName, monthlyPlanAmount,
            dataAllowance, dataUnit, localMinutes, intlMinutes, localSms,
            intlSms, cug, employeeName, status, notes, existing.rows[0].id
          ]
        );
        updatedCount++;
        console.log(`[UPDATE] Updated connection: ${connectionNumber} (${companyName} - ${employeeName})`);
      } else {
        // INSERT new
        await db.query(
          `INSERT INTO tbl_tele_connection (
            connection_type, company_name, sub_company, provider,
            connection_number, account_number, iccid, contract_no,
            contract_from, contract_to, plan_name, monthly_plan_amount,
            data_allowance, data_unit, local_minutes, international_minutes,
            local_sms, international_sms, cug, employee_name, assigned_from,
            notes, status, client_id, is_deleted, created_at, updated_at
          ) VALUES (
            $1, $2, 'Krish', $3,
            $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, $22, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )`,
          [
            connectionType, companyName, provider,
            connectionNumber, accountNumber, iccid, contractNo,
            contractFrom, contractTo, planName, monthlyPlanAmount,
            dataAllowance, dataUnit, localMinutes, intlMinutes,
            localSms, intlSms, cug, employeeName, contractFrom,
            notes, status
          ]
        );
        insertedCount++;
        console.log(`[INSERT] Added connection: ${connectionNumber} (${companyName} - ${employeeName})`);
      }
    }

    console.log('\n====================================================');
    console.log(` Migration Finished:`);
    console.log(`   - Inserted : ${insertedCount}`);
    console.log(`   - Updated  : ${updatedCount}`);
    console.log(`   - Skipped  : ${skippedCount}`);
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed with error:', error);
    process.exit(1);
  }
}

syncSimDetailsToTelecomConnections();
