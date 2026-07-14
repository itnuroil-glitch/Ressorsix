const db = require('../config/db');

const resolveExpireDate = async (currentFieldId, fieldData, customFieldId) => {
  if (!currentFieldId || !fieldData || !customFieldId) return null;
  try {
    const fileFieldRes = await db.query(
      'SELECT section_id, parent_fieldid FROM tbl_customfield_details WHERE field_id = $1 AND custom_fieldsid = $2 LIMIT 1',
      [currentFieldId, customFieldId]
    );
    if (fileFieldRes.rows.length === 0) return null;
    const { section_id, parent_fieldid } = fileFieldRes.rows[0];

    let dateFieldsRes;
    if (parent_fieldid) {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND parent_fieldid = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [customFieldId, parent_fieldid]
      );
    } else {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND parent_fieldid IS NULL AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [customFieldId, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) {
      dateFieldsRes = await db.query(
        "SELECT field_id, field_name FROM tbl_customfield_details WHERE custom_fieldsid = $1 AND section_id = $2 AND field_type IN ('Date', 'DateTime') AND is_active = true AND isdelete = false",
        [customFieldId, section_id]
      );
    }

    if (dateFieldsRes.rows.length === 0) return null;

    let bestCandidate = dateFieldsRes.rows.find(row => {
      const name = row.field_name.toLowerCase();
      return name.includes('expire') || name.includes('expiry') || name.includes('end');
    });

    if (!bestCandidate) {
      bestCandidate = dateFieldsRes.rows[0];
    }

    if (bestCandidate && fieldData[bestCandidate.field_id]) {
      const dateStr = String(fieldData[bestCandidate.field_id]).split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
    }
  } catch (err) {
    console.error('Error resolving expire_date:', err);
  }
  return null;
};

const findFieldContainingPath = (fieldData, path) => {
  if (!fieldData || typeof fieldData !== 'object') return null;

  // Search flat fieldData
  for (const [key, value] of Object.entries(fieldData)) {
    if (value && typeof value === 'object') {
      // Check if it's a file descriptor containing the path
      if (value.data === path) {
        return key;
      }
      // If array of files
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && item.data === path) {
            return key;
          }
        }
      }
    } else if (typeof value === 'string' && value === path) {
      return key;
    }
  }
  return null;
};

const runMigration = async () => {
  console.log('Starting migration of expire_date for existing attachments...');
  
  try {
    // 1. Fetch all attachments that have null expire_date
    const attachmentsRes = await db.query(
      'SELECT id, attachment FROM attachment WHERE expire_date IS NULL AND is_deleted = false'
    );
    console.log(`Found ${attachmentsRes.rows.length} attachments with NULL expire_date.`);

    if (attachmentsRes.rows.length === 0) {
      console.log('No attachments to migrate.');
      process.exit(0);
    }

    // 2. Fetch all records from details, insurance, and purchase
    const insuranceRes = await db.query('SELECT custom_field_id, field_data FROM tbl_vehicle_insurance');
    const purchaseRes = await db.query('SELECT custom_field_id, field_data FROM tbl_vehicle_purchase');
    const detailsRes = await db.query('SELECT custom_field_id, field_data FROM tbl_vehicle_details');

    const allRecords = [
      ...insuranceRes.rows.map(r => ({ ...r, source: 'Insurance' })),
      ...purchaseRes.rows.map(r => ({ ...r, source: 'Purchase' })),
      ...detailsRes.rows.map(r => ({ ...r, source: 'Details' }))
    ];

    let updatedCount = 0;

    for (const attachment of attachmentsRes.rows) {
      const path = attachment.attachment;
      let matchedRecord = null;
      let matchedFieldId = null;

      // Find which record's field_data contains this attachment path
      for (const rec of allRecords) {
        if (rec.field_data) {
          matchedFieldId = findFieldContainingPath(rec.field_data, path);
          if (matchedFieldId) {
            matchedRecord = rec;
            break;
          }
        }
      }

      if (matchedRecord && matchedFieldId) {
        // Resolve expiry date
        const expireDate = await resolveExpireDate(
          matchedFieldId,
          matchedRecord.field_data,
          matchedRecord.custom_field_id
        );

        if (expireDate) {
          await db.query(
            'UPDATE attachment SET expire_date = $1, updated_at = NOW() WHERE id = $2',
            [expireDate, attachment.id]
          );
          console.log(`Updated attachment ID ${attachment.id} (${path}) with expire_date ${expireDate} (Source: ${matchedRecord.source})`);
          updatedCount++;
        } else {
          console.log(`No expiry date found in field data for attachment ID ${attachment.id} (${path})`);
        }
      } else {
        console.log(`Could not find corresponding form record for attachment ID ${attachment.id} (${path})`);
      }
    }

    console.log(`Migration completed successfully. Updated ${updatedCount} attachments.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
