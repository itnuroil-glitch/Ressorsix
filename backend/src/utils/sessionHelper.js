const crypto = require('crypto');
const db = require('../config/db');

/**
 * Resolves local user record by authentik_sub first, then by normalized email.
 * Links authentik_sub permanently on first match if missing.
 */
async function resolveUserAndLinkSub(authentikSub, rawEmail) {
  if (!rawEmail || !authentikSub) {
    return { localUser: null, errorReason: 'missing_claims' };
  }

  const email = String(rawEmail).toLowerCase().trim();

  // 1. Match by authentik_sub first
  let userRes = await db.query(
    'SELECT id, email, authentik_sub, isdelete, roleid, clientid, companyid FROM users WHERE authentik_sub = $1',
    [authentikSub]
  );

  let localUser = userRes.rows[0];

  if (!localUser) {
    // 2. Match by email
    userRes = await db.query(
      'SELECT id, email, authentik_sub, isdelete, roleid, clientid, companyid FROM users WHERE LOWER(email) = $1',
      [email]
    );
    localUser = userRes.rows[0];

    if (!localUser) {
      return { localUser: null, errorReason: 'unprovisioned' };
    }

    if (localUser.authentik_sub && localUser.authentik_sub !== authentikSub) {
      return { localUser: null, errorReason: 'sub_mismatch' };
    }

    // Link Authentik subject permanently
    if (!localUser.authentik_sub) {
      await db.query('UPDATE users SET authentik_sub = $1 WHERE id = $2', [authentikSub, localUser.id]);
      localUser.authentik_sub = authentikSub;
    }
  }

  if (localUser.isdelete) {
    return { localUser: null, errorReason: 'deactivated' };
  }

  return { localUser, errorReason: null };
}

/**
 * Shared session creation helper for Authentik OIDC & OrbisHub Push Approval.
 * Generates 256-bit random session token, stores SHA-256 hash in tbl_sessions,
 * and sets HttpOnly cookie (15-min expiry).
 */
async function createAppSession(res, localUser, authentikSub, email, groupsArray = []) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  // Expire session after 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Delete any old sessions for this user
  await db.query('DELETE FROM tbl_sessions WHERE user_id = $1', [localUser.id]);

  // Insert new session
  await db.query(
    `INSERT INTO tbl_sessions (session_token_hash, user_id, authentik_sub, email, groups, entitlement_checked_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
    [sessionTokenHash, localUser.id, authentikSub, email.toLowerCase().trim(), JSON.stringify(groupsArray), expiresAt]
  );

  // Set HttpOnly, SameSite=Lax, Path=/, Secure cookie
  res.cookie('trakio_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  return sessionToken;
}

module.exports = {
  resolveUserAndLinkSub,
  createAppSession,
};
