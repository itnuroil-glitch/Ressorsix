const db = require('../config/db');
const { logAudit, ensureAuditTable } = require('../utils/auditLogger');

// @desc    Get audit history with filtering and pagination
// @route   GET /api/audit-history
// @access  Protected / Internal
exports.getAuditHistory = async (req, res) => {
  try {
    await ensureAuditTable();

    const {
      module_name,
      module: moduleAlias,
      record_id,
      action_type,
      search,
      clientid,
      company_id,
      limit = 50,
      page = 1,
    } = req.query;

    const targetModule = module_name || moduleAlias;

    // Auto-seed initial history for companies if none exist yet
    if (targetModule && String(targetModule).toUpperCase() === 'COMPANY') {
      try {
        const countComp = await db.query("SELECT COUNT(*) FROM tbl_audit_history WHERE module_name = 'COMPANY'");
        if (parseInt(countComp.rows[0].count, 10) === 0) {
          const compResult = await db.query("SELECT * FROM company WHERE is_deleted = false OR is_deleted IS NULL ORDER BY id ASC");
          for (const c of compResult.rows) {
            await logAudit({
              clientid: c.clientid,
              company_id: c.id,
              module_name: 'COMPANY',
              record_id: c.id,
              record_title: c.company_name,
              action_type: 'CREATED',
              action_summary: `Company profile registered: "${c.company_name}"`,
              new_data: c,
            });
          }
        }
      } catch (seedErr) {
        console.warn('[AuditHistory] Note: Failed to backfill company initial audit entries:', seedErr.message);
      }
    }

    // Auto-seed initial history or backfill missing history for active employees
    if (targetModule && ['EMPLOYEE', 'EMPLOYEES', 'EMPLOYEE_MANAGEMENT'].includes(String(targetModule).toUpperCase())) {
      try {
        const empResult = await db.query(`
          SELECT e.* 
          FROM employee e
          WHERE (e.is_deleted = false OR e.is_deleted IS NULL)
            AND NOT EXISTS (
              SELECT 1 FROM tbl_audit_history a 
              WHERE a.module_name IN ('EMPLOYEE', 'EMPLOYEES', 'EMPLOYEE_MANAGEMENT')
                AND a.record_id::text = e.id::text
                AND a.action_type = 'CREATED'
            )
          ORDER BY e.id ASC
        `);
        for (const emp of empResult.rows) {
          await logAudit({
            clientid: emp.clientid,
            company_id: emp.basecompany_id,
            module_name: 'EMPLOYEE',
            record_id: emp.id,
            record_title: emp.full_name || `Employee #${emp.id}`,
            action_type: 'CREATED',
            action_summary: `Employee profile registered: "${emp.full_name || `Employee #${emp.id}`}"`,
            new_data: emp,
          });
        }
      } catch (seedErr) {
        console.warn('[AuditHistory] Note: Failed to backfill employee initial audit entries:', seedErr.message);
      }
    }

    // Auto-seed initial history or backfill missing history for active clients
    if (targetModule && ['CLIENT', 'CLIENTS', 'CLIENT_MANAGEMENT'].includes(String(targetModule).toUpperCase())) {
      try {
        const clientResult = await db.query(`
          SELECT c.* 
          FROM client c
          WHERE (c.isdelete = false OR c.isdelete IS NULL)
            AND NOT EXISTS (
              SELECT 1 FROM tbl_audit_history a 
              WHERE a.module_name IN ('CLIENT', 'CLIENTS', 'CLIENT_MANAGEMENT')
                AND a.record_id::text = c.id::text
                AND a.action_type = 'CREATED'
            )
          ORDER BY c.id ASC
        `);
        for (const cl of clientResult.rows) {
          await logAudit({
            clientid: cl.id,
            module_name: 'CLIENT',
            record_id: cl.id,
            record_title: cl.client_name || `Client #${cl.id}`,
            action_type: 'CREATED',
            action_summary: `Client enterprise registered: "${cl.client_name || `Client #${cl.id}`}"${cl.companyname ? ` (${cl.companyname})` : ''}`,
            new_data: cl,
          });
        }
      } catch (seedErr) {
        console.warn('[AuditHistory] Note: Failed to backfill client initial audit entries:', seedErr.message);
      }
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const params = [];
    let whereClauses = [];

    if (targetModule) {
      const modUpper = String(targetModule).toUpperCase();
      if (modUpper === 'SUPPLIER' || modUpper === 'SUPPLIER_DETAILS') {
        whereClauses.push(`module_name IN ('SUPPLIER', 'SUPPLIER_DETAILS')`);
      } else if (modUpper === 'PURCHASE' || modUpper === 'PURCHASE_DETAILS') {
        whereClauses.push(`module_name IN ('PURCHASE', 'PURCHASE_DETAILS')`);
      } else if (modUpper === 'EMPLOYEE' || modUpper === 'EMPLOYEES' || modUpper === 'EMPLOYEE_MANAGEMENT') {
        whereClauses.push(`module_name IN ('EMPLOYEE', 'EMPLOYEES', 'EMPLOYEE_MANAGEMENT')`);
      } else if (modUpper === 'CLIENT' || modUpper === 'CLIENTS' || modUpper === 'CLIENT_MANAGEMENT') {
        whereClauses.push(`module_name IN ('CLIENT', 'CLIENTS', 'CLIENT_MANAGEMENT')`);
      } else {
        params.push(modUpper);
        whereClauses.push(`module_name = $${params.length}`);
      }
    }

    if (record_id) {
      params.push(String(record_id));
      whereClauses.push(`record_id = $${params.length}`);
    }

    if (action_type) {
      params.push(String(action_type).toUpperCase());
      whereClauses.push(`action_type = $${params.length}`);
    }

    if (clientid) {
      const parsedCid = parseInt(clientid, 10);
      if (!isNaN(parsedCid)) {
        params.push(parsedCid);
        whereClauses.push(`(clientid = $${params.length} OR clientid IS NULL)`);
      }
    }

    if (company_id) {
      const parsedCompId = parseInt(company_id, 10);
      if (!isNaN(parsedCompId)) {
        params.push(parsedCompId);
        whereClauses.push(`(company_id = $${params.length} OR company_id IS NULL)`);
      }
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        action_summary ILIKE $${params.length} 
        OR user_name ILIKE $${params.length} 
        OR record_title ILIKE $${params.length}
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) FROM tbl_audit_history ${whereSql}`;
    const countRes = await db.query(countSql, params);
    const totalRecords = parseInt(countRes.rows[0].count, 10);

    // Data query
    params.push(parseInt(limit, 10));
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const query = `
      SELECT 
        id, clientid, company_id, module_name, record_id, record_title,
        action_type, action_summary, changed_fields, user_id, user_name,
        user_email, user_role, ip_address, created_at
      FROM tbl_audit_history
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const result = await db.query(query, params);

    res.status(200).json({
      success: true,
      total: totalRecords,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ message: 'Error retrieving audit history records', error: error.message });
  }
};

// @desc    Manually record an audit entry
// @route   POST /api/audit-history
// @access  Protected
exports.recordAuditEntry = async (req, res) => {
  try {
    const { module_name, record_id, record_title, action_type, action_summary, old_data, new_data, custom_diff } = req.body;

    if (!module_name || !record_id || !action_type) {
      return res.status(400).json({ message: 'module_name, record_id, and action_type are required.' });
    }

    const entry = await logAudit({
      req,
      module_name,
      record_id,
      record_title,
      action_type,
      action_summary,
      old_data,
      new_data,
      custom_diff,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error recording audit entry:', error);
    res.status(500).json({ message: 'Error recording audit entry', error: error.message });
  }
};
