const request = require('supertest');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Mock db module
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/config/db');

// Import App / Controllers
const express = require('express');
const cookieParser = require('cookie-parser');
const authMiddleware = require('../src/middleware/authMiddleware');
const oidcController = require('../src/controllers/oidcController');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/auth/login', oidcController.login);
  app.get('/auth/callback', oidcController.callback);
  app.all('/auth/logout', oidcController.logout);
  app.get('/api/auth/me', authMiddleware, oidcController.me);

  app.get('/api/protected/resource', authMiddleware, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  });

  return app;
}

describe('OrbisHub-Managed Authentik OIDC SSO & Session Test Suite', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTHENTIK_ISSUER_URL = 'https://auth.orbisai.ae/application/o/asset/';
    process.env.AUTHENTIK_CLIENT_ID = 'test_client_id';
    process.env.AUTHENTIK_CLIENT_SECRET = 'test_client_secret';
    process.env.REQUIRED_AUTHENTIK_GROUP = 'asset-access';
    process.env.APP_BASE_URL = 'http://localhost:5000';
    app = createTestApp();
  });

  // Test 1 & 5: Successful OIDC callback with asset-access creates session
  it('1 & 5. Successful OIDC callback with asset-access group creates session in DB', async () => {
    const codeVerifier = 'test_code_verifier_1234567890_1234567890';
    const state = 'valid_state_123';
    const nonce = 'valid_nonce_123';

    const oidcCookie = JSON.stringify({ codeVerifier, state, nonce });

    // Mock fetch for token exchange
    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/openid-configuration')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authorization_endpoint: 'https://auth.orbisai.ae/application/o/authorize/',
            token_endpoint: 'https://auth.orbisai.ae/application/o/token/',
            userinfo_endpoint: 'https://auth.orbisai.ae/application/o/userinfo/',
          }),
        });
      }
      if (url.includes('/token/')) {
        // Build mock ID token with claims
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'auth_sub_user1',
          email: 'John.Smith@Company.com',
          groups: ['asset-access', 'other-group'],
          nonce: nonce,
        })).toString('base64url');
        const mockIdToken = `${header}.${payload}.signature`;

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'mock_access_token',
            id_token: mockIdToken,
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Mock DB queries
    // 1. User lookup by sub -> not found
    db.query.mockResolvedValueOnce({ rows: [] });
    // 2. User lookup by email -> found
    db.query.mockResolvedValueOnce({
      rows: [{ id: 10, email: 'john.smith@company.com', authentik_sub: null, isdelete: false }],
    });
    // 3. Update authentik_sub link
    db.query.mockResolvedValueOnce({ rowCount: 1 });
    // 4. Delete old sessions
    db.query.mockResolvedValueOnce({ rowCount: 0 });
    // 5. Insert new session
    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .get(`/auth/callback?code=mock_code&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(302);
    expect(res.headers['set-cookie']).toBeDefined();
    const sessionCookie = res.headers['set-cookie'].find(c => c.startsWith('trakio_session='));
    expect(sessionCookie).toBeDefined();

    // Verify DB session insertion was called
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tbl_sessions'),
      expect.arrayContaining(['john.smith@company.com', 'auth_sub_user1'])
    );
  });

  // Test 2: Missing groups claim is rejected
  it('2. Missing groups claim is rejected with 403 Access Denied page', async () => {
    const codeVerifier = 'verifier_missing_groups';
    const state = 'state_missing_groups';
    const oidcCookie = JSON.stringify({ codeVerifier, state });

    global.fetch = jest.fn((url) => {
      if (url.includes('/token/')) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'sub_no_groups',
          email: 'user@company.com',
          // NO groups claim
        })).toString('base64url');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: `${header}.${payload}.sig` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const res = await request(app)
      .get(`/auth/callback?code=code_123&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access to this application has not been provisioned. Contact your administrator.');
  });

  // Test 3: Empty groups claim is rejected
  it('3. Empty groups claim is rejected with 403 Access Denied page', async () => {
    const codeVerifier = 'verifier_empty_groups';
    const state = 'state_empty_groups';
    const oidcCookie = JSON.stringify({ codeVerifier, state });

    global.fetch = jest.fn((url) => {
      if (url.includes('/token/')) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'sub_empty_groups',
          email: 'user@company.com',
          groups: [], // Empty groups array
        })).toString('base64url');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: `${header}.${payload}.sig` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const res = await request(app)
      .get(`/auth/callback?code=code_123&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access to this application has not been provisioned. Contact your administrator.');
  });

  // Test 4: Wrong group is rejected
  it('4. Wrong group is rejected with 403 Access Denied page', async () => {
    const codeVerifier = 'verifier_wrong_group';
    const state = 'state_wrong_group';
    const oidcCookie = JSON.stringify({ codeVerifier, state });

    global.fetch = jest.fn((url) => {
      if (url.includes('/token/')) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'sub_wrong_group',
          email: 'user@company.com',
          groups: ['unrelated-group-access'],
        })).toString('base64url');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: `${header}.${payload}.sig` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const res = await request(app)
      .get(`/auth/callback?code=code_123&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access to this application has not been provisioned. Contact your administrator.');
  });

  // Test 6: Unprovisioned local email is rejected
  it('6. Unprovisioned local email is rejected with 403', async () => {
    const codeVerifier = 'verifier_unprovisioned';
    const state = 'state_unprovisioned';
    const oidcCookie = JSON.stringify({ codeVerifier, state });

    global.fetch = jest.fn((url) => {
      if (url.includes('/token/')) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'sub_unprovisioned',
          email: 'unprovisioned@company.com',
          groups: ['asset-access'],
        })).toString('base64url');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: `${header}.${payload}.sig` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Mock DB queries -> user not found by sub or email
    db.query.mockResolvedValueOnce({ rows: [] }); // by sub
    db.query.mockResolvedValueOnce({ rows: [] }); // by email

    const res = await request(app)
      .get(`/auth/callback?code=code_123&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access to this application has not been provisioned. Contact your administrator.');
  });

  // Test 7: Subject/email mismatch is rejected
  it('7. Subject/email mismatch is rejected with 403', async () => {
    const codeVerifier = 'verifier_mismatch';
    const state = 'state_mismatch';
    const oidcCookie = JSON.stringify({ codeVerifier, state });

    global.fetch = jest.fn((url) => {
      if (url.includes('/token/')) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: 'new_sub_attempt',
          email: 'existing@company.com',
          groups: ['asset-access'],
        })).toString('base64url');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id_token: `${header}.${payload}.sig` }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    db.query.mockResolvedValueOnce({ rows: [] }); // by sub -> not found
    db.query.mockResolvedValueOnce({
      // by email -> found, but linked to DIFFERENT sub!
      rows: [{ id: 5, email: 'existing@company.com', authentik_sub: 'original_different_sub' }],
    });

    const res = await request(app)
      .get(`/auth/callback?code=code_123&state=${state}`)
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('Access to this application has not been provisioned. Contact your administrator.');
  });

  // Test 8: Invalid state is rejected
  it('8. Invalid state parameter is rejected', async () => {
    const oidcCookie = JSON.stringify({ codeVerifier: 'ver', state: 'correct_state' });

    const res = await request(app)
      .get('/auth/callback?code=code_123&state=WRONG_STATE')
      .set('Cookie', [`trakio_oidc_state=${encodeURIComponent(oidcCookie)}`]);

    expect(res.status).toBe(403);
    expect(res.text).toContain('State parameter mismatch');
  });

  // Test 9: Invalid/missing state cookie is rejected
  it('9. Missing state cookie is rejected', async () => {
    const res = await request(app)
      .get('/auth/callback?code=code_123&state=some_state');

    expect(res.status).toBe(403);
    expect(res.text).toContain('Authentication state expired or invalid cookie');
  });

  // Test 10: Expired session is rejected and deleted
  it('10. Expired session is rejected and deleted from database', async () => {
    const testToken = 'expired_token_12345';
    const tokenHash = crypto.createHash('sha256').update(testToken).digest('hex');

    const pastDate = new Date(Date.now() - 1000 * 60 * 20); // 20 mins ago (expired)

    db.query.mockResolvedValueOnce({
      rows: [{
        session_id: 99,
        user_id: 1,
        authentik_sub: 'sub1',
        email: 'user@company.com',
        groups: ['asset-access'],
        expires_at: pastDate,
        entitlement_checked_at: pastDate,
        id: 1,
        user_email: 'user@company.com',
        isdelete: false,
        db_sub: 'sub1',
      }],
    });

    // Mock deletion query
    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .get('/api/protected/resource')
      .set('Cookie', [`trakio_session=${testToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Session expired');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM tbl_sessions'),
      [99]
    );
  });

  // Test 11: Logout destroys database session and clears cookie
  it('11. Logout destroys database session and clears cookie', async () => {
    const testToken = 'logout_token_123';
    const tokenHash = crypto.createHash('sha256').update(testToken).digest('hex');

    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .get('/auth/logout')
      .set('Cookie', [`trakio_session=${testToken}`])
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM tbl_sessions'),
      [tokenHash]
    );
  });

  // Test 12: Private API routes reject unauthenticated requests
  it('12. Private API routes reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/protected/resource');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Authentication required');
  });

  // Test 13: Repository-wide search confirms no email_verified requirement exists
  it('13. Repository-wide search confirms no email_verified check exists', () => {
    const repoRoot = path.join(__dirname, '../../');
    
    function scanDir(dir) {
      let matches = [];
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === 'tests') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          matches = matches.concat(scanDir(fullPath));
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('email_verified')) {
            matches.push(fullPath);
          }
        }
      }
      return matches;
    }

    const emailVerifiedFiles = scanDir(repoRoot);
    expect(emailVerifiedFiles).toEqual([]);
  });
});
