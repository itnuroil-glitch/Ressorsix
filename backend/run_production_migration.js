require('dotenv').config();
const db = require('./src/config/db');

async function runProductionMigration() {
  try {
    console.log('====================================================');
    console.log('  Starting Production Maintenance Database Migration');
    console.log('====================================================\n');

    // 1. Fetch & Map Service Details
    const serviceRes = await db.query(
      'SELECT id, service_name FROM tbl_service_details WHERE (isdelete = false OR isdelete IS NULL) AND (is_deleted = false OR is_deleted IS NULL)'
    );
    const serviceMap = {};
    serviceRes.rows.forEach(s => {
      serviceMap[String(s.id)] = s.service_name;
    });
    console.log(`[1/4] Loaded ${Object.keys(serviceMap).length} service details types from tbl_service_details.`);

    // 2. Fetch Custom Fields Definitions by Schema ID
    const customFieldsRes = await db.query('SELECT custom_fieldsid, field_id, field_name, field_type FROM tbl_customfield_details');
    const fieldsBySchema = {};
    customFieldsRes.rows.forEach(f => {
      const schemaId = String(f.custom_fieldsid);
      if (!fieldsBySchema[schemaId]) fieldsBySchema[schemaId] = [];
      fieldsBySchema[schemaId].push(f);
    });
    console.log(`[2/4] Loaded custom field definitions for schemas: ${Object.keys(fieldsBySchema).join(', ')}`);

    // 3. Fetch Vehicles for vehicle_id Resolution
    const vehiclesRes = await db.query('SELECT id, vehicle_id, field_data FROM tbl_vehicle_details');
    const vehicleMap = {};
    vehiclesRes.rows.forEach(v => {
      let vFd = v.field_data;
      if (typeof vFd === 'string') { try { vFd = JSON.parse(vFd); } catch(e) { vFd = {}; } }
      vFd = vFd || {};

      if (v.id) vehicleMap[String(v.id)] = v.vehicle_id || v.id;
      if (v.vehicle_id) vehicleMap[String(v.vehicle_id)] = v.vehicle_id || v.id;
    });
    console.log(`[3/4] Loaded ${Object.keys(vehicleMap).length} vehicle mappings for ID resolution.`);

    // 4. Migrate Records in tbl_vehicle_maintenance
    const recordsRes = await db.query(
      'SELECT id, vehicle_id, custom_field_id, field_data FROM tbl_vehicle_maintenance WHERE (is_deleted = false OR is_deleted IS NULL)'
    );
    console.log(`[4/4] Found ${recordsRes.rows.length} maintenance records in database.\n`);

    const defaultDate = new Date().toISOString().split('T')[0];

    for (const rec of recordsRes.rows) {
      let parsed = rec.field_data;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
      }
      parsed = parsed || {};

      const schemaId = String(rec.custom_field_id || '37');
      const schemaFields = fieldsBySchema[schemaId] || fieldsBySchema['37'] || fieldsBySchema['42'] || [];

      // Identify date & service field IDs for this schema
      const dateFids = schemaFields
        .filter(f => (f.field_name || '').toLowerCase().includes('date') || f.field_type === 'Date')
        .map(f => String(f.field_id).trim());

      // 4a. Resolve vehicle_id if missing or null
      let resolvedVId = rec.vehicle_id;
      if (!resolvedVId) {
        for (const val of Object.values(parsed)) {
          if (val && typeof val !== 'object' && vehicleMap[String(val)]) {
            resolvedVId = vehicleMap[String(val)];
            break;
          }
        }
      }

      // 4b. Resolve option IDs to text service names
      Object.keys(parsed).forEach(k => {
        const val = parsed[k];
        if (val && typeof val !== 'object') {
          const strVal = String(val).trim();
          if (serviceMap[strVal]) {
            parsed[k] = serviceMap[strVal];
          } else if (strVal.includes(',')) {
            const parts = strVal.split(',').map(p => p.trim());
            const resolved = parts.map(p => serviceMap[p] || p);
            if (resolved.some((r, idx) => r !== parts[idx])) {
              parsed[k] = resolved.join(', ');
            }
          }
        }
      });

      // 4c. Fill missing layout fields (dates and text/number/dropdown fields)
      schemaFields.forEach(f => {
        const fid = String(f.field_id).trim();
        if (fid && parsed[fid] === undefined) {
          const isDate = (f.field_type === 'Date') || (f.field_name || '').toLowerCase().includes('date');
          parsed[fid] = isDate ? defaultDate : '';
        }
      });

      // 4d. Sanitize JSON (keep numeric or f_ keys)
      const cleanFieldData = {};
      Object.keys(parsed).forEach(k => {
        const trimmedKey = String(k).trim();
        if (/^\d+$/.test(trimmedKey) || trimmedKey.startsWith('f_')) {
          cleanFieldData[trimmedKey] = parsed[k];
        }
      });

      // 4e. Perform SQL Update
      await db.query(
        'UPDATE tbl_vehicle_maintenance SET vehicle_id = $1, field_data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [resolvedVId || rec.vehicle_id || null, JSON.stringify(cleanFieldData), rec.id]
      );

      console.log(`  -> Row #${rec.id}: Updated vehicle_id to '${resolvedVId || rec.vehicle_id || 'null'}' & enriched field_data JSON.`);
    }

    console.log('\n====================================================');
    console.log('  Production Migration Completed Successfully!');
    console.log('====================================================');
  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    process.exit(0);
  }
}

runProductionMigration();
