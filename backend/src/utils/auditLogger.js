const db = require('../config/db');
const createAuditHistoryTable = require('../config/createAuditHistoryTable');

// Ensure table exists on first module load
let tableInitialized = false;
async function ensureAuditTable() {
  if (tableInitialized) return;
  try {
    await createAuditHistoryTable();
    tableInitialized = true;
  } catch (err) {
    console.error('[AUDIT LOGGER] Initialization error:', err.message);
  }
}
ensureAuditTable();

/**
 * Calculates field-level diff between two objects
 * @param {Object} oldObj 
 * @param {Object} newObj 
 * @param {Array<string>} ignoreKeys 
 * @returns {Array<{field: string, old_value: any, new_value: any}>}
 */
function calculateDiff(oldObj = {}, newObj = {}, ignoreKeys = ['updated_at', 'created_at', 'is_deleted', 'updatedat', 'createdat', 'isdelete', 'password', 'id', 'created_by', 'updated_by']) {
  const changes = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  for (const key of allKeys) {
    if (ignoreKeys.includes(key)) continue;

    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;

    // Normalize for comparison
    const normOld = oldVal === undefined || oldVal === null ? '' : (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal).trim());
    const normNew = newVal === undefined || newVal === null ? '' : (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal).trim());

    if (normOld !== normNew) {
      changes.push({
        field: key,
        old_value: oldVal === undefined ? null : oldVal,
        new_value: newVal === undefined ? null : newVal,
        old: oldVal === undefined ? null : oldVal,
        new: newVal === undefined ? null : newVal,
      });
    }
  }

  return changes;
}

/**
 * Logs an activity into tbl_audit_history
 * @param {Object} options
 * @param {Object} options.req Express request object (optional, for user & IP extraction)
 * @param {string|number} options.clientid Explicit client ID
 * @param {string|number} options.company_id Explicit company ID
 * @param {string} options.module_name Module name e.g. 'PREMISES', 'VEHICLE_DETAILS', 'VEHICLE_INSURANCE'
 * @param {string|number} options.record_id Unique ID of the record
 * @param {string} options.record_title Optional human-readable title (e.g. Vehicle Name)
 * @param {string} options.action_type 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'
 * @param {string} options.action_summary Short human-readable summary
 * @param {Object} options.old_data Previous state of the record (for UPDATE)
 * @param {Object} options.new_data New state of the record (for CREATE / UPDATE)
 * @param {Array} options.custom_diff Optional pre-computed diff array
 */
async function logAudit({
  req = null,
  clientid = null,
  company_id = null,
  module_name,
  record_id,
  record_title = null,
  action_type,
  action_summary = null,
  old_data = null,
  new_data = null,
  custom_diff = null,
  full_snapshot = null,
}) {
  try {
    await ensureAuditTable();

    // 1. Resolve user and client metadata from all available sources
    let userId = req?.user?.id || req?.body?.user_id || req?.headers?.user_id || null;
    let userEmail = req?.user?.email || req?.user?.user_email || req?.body?.user_email || null;
    let userRole = req?.user?.role_name || req?.user?.roleId || req?.user?.roleid || req?.body?.roleid || req?.headers?.roleid || null;
    
    let rawUserName = req?.user?.full_name ||
      req?.user?.name ||
      req?.body?.user_name ||
      (req?.headers?.user_name ? decodeURIComponent(req.headers.user_name) : null) ||
      userEmail ||
      (userId ? `User #${userId}` : 'Admin User');

    let ipAddress = req?.headers ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null) : null;

    let rawClientId = clientid ||
      req?.user?.clientid ||
      req?.body?.clientid ||
      req?.headers?.clientid ||
      req?.query?.clientid ||
      old_data?.clientid ||
      new_data?.clientid ||
      null;

    let rawCompanyId = company_id ||
      req?.user?.companyid ||
      req?.user?.company_id ||
      req?.body?.company_id ||
      req?.body?.companyid ||
      req?.headers?.companyid ||
      old_data?.company_id ||
      new_data?.company_id ||
      null;

    // Convert numeric IDs safely for postgres INT columns
    const parsedClientId = rawClientId && !isNaN(parseInt(rawClientId, 10)) ? parseInt(rawClientId, 10) : null;
    const parsedCompanyId = rawCompanyId && !isNaN(parseInt(rawCompanyId, 10)) ? parseInt(rawCompanyId, 10) : null;
    const parsedUserId = userId && !isNaN(parseInt(userId, 10)) ? parseInt(userId, 10) : null;

    // 2. Compute diffs if action is UPDATE/UPDATED and no custom diff provided
    const actUpper = String(action_type || '').toUpperCase();
    let changedFields = custom_diff || [];
    if (!custom_diff && (actUpper === 'UPDATE' || actUpper === 'UPDATED') && old_data && new_data) {
      changedFields = calculateDiff(old_data, new_data);
    }

    // 3. Fallback summary if not provided
    let summary = action_summary;
    if (!summary || (changedFields.length > 0 && summary.endsWith('profile updated'))) {
      if (actUpper === 'CREATE' || actUpper === 'CREATED') {
        summary = `Created new ${module_name.toLowerCase()} record: ${record_title || record_id}`;
      } else if (actUpper === 'UPDATE' || actUpper === 'UPDATED') {
        if (changedFields.length > 0) {
          summary = `Updated ${changedFields.length} field(s) on ${record_title || record_id}`;
        } else {
          summary = action_summary || `Updated details for ${record_title || record_id}`;
        }
      } else if (actUpper === 'DELETE' || actUpper === 'DELETED') {
        summary = `Deleted ${module_name.toLowerCase()} record: ${record_title || record_id}`;
      }
    }

    const snapshot = full_snapshot || new_data || old_data || null;

    // 4. Insert into database
    const query = `
      INSERT INTO tbl_audit_history (
        clientid, company_id, module_name, record_id, record_title,
        action_type, action_summary, changed_fields, full_snapshot,
        user_id, user_name, user_email, user_role, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      parsedClientId,
      parsedCompanyId,
      String(module_name).toUpperCase(),
      String(record_id),
      record_title,
      String(action_type).toUpperCase(),
      summary,
      JSON.stringify(changedFields),
      snapshot ? JSON.stringify(snapshot) : null,
      parsedUserId,
      rawUserName,
      userEmail,
      userRole ? String(userRole) : null,
      ipAddress,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('[AUDIT LOGGER ERROR] Failed to record audit log:', err.message);
    return null;
  }
}

module.exports = {
  logAudit,
  calculateDiff,
  ensureAuditTable,
};
