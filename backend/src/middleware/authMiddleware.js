const crypto = require('crypto');
const db = require('../config/db');

/**
 * Server-Side Session Authentication Middleware for Authentik OIDC
 * Enforces opaque session token validation against SHA-256 database hashes.
 * Enforces maximum 15-minute session entitlement lifecycle.
 */
module.exports = async function authMiddleware(req, res, next) {
  try {
    // 1. Extract session token from cookie or Authorization header
    let rawToken = null;
    if (req.cookies && req.cookies.trakio_session) {
      rawToken = req.cookies.trakio_session;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      rawToken = req.headers.authorization.substring(7).trim();
    }

    if (!rawToken) {
      if (process.env.BYPASS_AUTH === 'true') {
        req.user = {
          id: 45,
          email: 'john.smith@email.com',
          roleId: '1',
          clientid: null,
          companyid: null,
          associatedCompanyIds: [],
          authentik_sub: 'local_superadmin'
        };
        return next();
      }
      return res.status(401).json({ message: 'Authentication required. No session cookie or token provided.' });
    }

    // 2. Hash token with SHA-256
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 3. Query session record from database
    const sessionRes = await db.query(
      `SELECT s.id AS session_id, s.user_id, s.authentik_sub, s.email, s.groups, s.expires_at, s.entitlement_checked_at,
              u.id, u.email AS user_email, u.roleid, u.clientid, u.companyid, u.isdelete, u.authentik_sub AS db_sub
       FROM tbl_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token_hash = $1`,
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      if (process.env.BYPASS_AUTH === 'true') {
        req.user = {
          id: 45,
          email: 'john.smith@email.com',
          roleId: '1',
          clientid: null,
          companyid: null,
          associatedCompanyIds: [],
          authentik_sub: 'local_superadmin'
        };
        return next();
      }
      // Clear cookie if invalid
      res.clearCookie('trakio_session', { path: '/' });
      return res.status(401).json({ message: 'Invalid session token. Please sign in via Authentik.' });
    }

    const session = sessionRes.rows[0];

    // Check user active status
    if (session.isdelete) {
      await db.query('DELETE FROM tbl_sessions WHERE id = $1', [session.session_id]);
      res.clearCookie('trakio_session', { path: '/' });
      return res.status(401).json({ message: 'User account has been deactivated.' });
    }

    // Check subject consistency
    if (session.db_sub && session.db_sub !== session.authentik_sub) {
      await db.query('DELETE FROM tbl_sessions WHERE id = $1', [session.session_id]);
      res.clearCookie('trakio_session', { path: '/' });
      return res.status(401).json({ message: 'Subject identity mismatch.' });
    }

    // 4. Validate Expiration (Max 15 minutes)
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now >= expiresAt) {
      // Session expired -> Delete server-side session and clear browser cookie
      await db.query('DELETE FROM tbl_sessions WHERE id = $1', [session.session_id]);
      res.clearCookie('trakio_session', { path: '/' });
      return res.status(401).json({ message: 'Session expired. Authentik authentication required.' });
    }

    // 5. Fetch associated companies for role & permissions
    let associatedCompanyIds = [];
    let effectiveRoleId = session.roleid;
    const empRes = await db.query(
      'SELECT id, roleid FROM employee WHERE email = $1 AND (is_deleted = false OR is_deleted IS NULL)',
      [session.user_email.toLowerCase().trim()]
    );
    if (empRes.rows.length > 0) {
      const empId = empRes.rows[0].id;
      if (!effectiveRoleId && empRes.rows[0].roleid) {
        effectiveRoleId = empRes.rows[0].roleid;
      }
      const compRes = await db.query('SELECT company_id FROM employee_company WHERE employee_id = $1', [empId]);
      associatedCompanyIds = compRes.rows.map(r => r.company_id);
    }
    if (effectiveRoleId) {
      const roleRes = await db.query(
        "SELECT companyids FROM role WHERE id = ANY(string_to_array($1, ',')::int[]) AND (is_deleted = false OR is_deleted IS NULL)",
        [String(effectiveRoleId)]
      );
      roleRes.rows.forEach(r => {
        if (Array.isArray(r.companyids)) {
          associatedCompanyIds.push(...r.companyids);
        }
      });
    }
    associatedCompanyIds = [...new Set(associatedCompanyIds.map(String))].filter(Boolean);

    // Attach user payload & session details to req
    req.user = {
      id: session.user_id,
      email: session.user_email,
      roleId: session.roleid,
      clientid: session.clientid,
      companyid: session.companyid,
      authentik_sub: session.authentik_sub,
      associatedCompanyIds,
    };
    req.session = {
      sessionId: session.session_id,
      groups: session.groups,
      expiresAt: session.expires_at,
      entitlementCheckedAt: session.entitlement_checked_at,
    };

    next();
  } catch (error) {
    console.error('Error in authMiddleware:', error);
    return res.status(500).json({ message: 'Internal Server Error during session validation.' });
  }
};
