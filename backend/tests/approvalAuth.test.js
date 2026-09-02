const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Mock db module
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

const db = require('../src/config/db');

// Import Express App & Controllers
const express = require('express');
const cookieParser = require('cookie-parser');
const authMiddleware = require('../src/middleware/authMiddleware');
const approvalController = require('../src/controllers/approvalController');
const oidcController = require('../src/controllers/oidcController');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.post('/api/auth/approval/start', approvalController.startApproval);
  app.get('/api/auth/approval/status/:challengeId', approvalController.checkStatus);
  app.post('/api/auth/approval/verify', approvalController.verifyApprovalToken);

  app.get('/auth/login', oidcController.login);
  app.get('/auth/callback', oidcController.callback);
  app.all('/auth/logout', oidcController.logout);
  app.get('/api/auth/me', authMiddleware, oidcController.me);

  return app;
}

describe('OrbisHub Mobile Push-Approval Broker Integration Test Suite', () => {
  let app;
  let keyPair;
  let publicJwks;

  beforeAll(() => {
    // Generate EC P-256 (ES256) key pair using built-in crypto
    keyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const publicJwk = crypto.createPublicKey(keyPair.publicKey).export({ format: 'jwk' });
    publicJwk.kid = 'test-key-id-1';
    publicJwk.alg = 'ES256';
    publicJwk.use = 'sig';

    publicJwks = { keys: [publicJwk] };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APPROVAL_CLIENT_ID = 'asset';
    process.env.APPROVAL_CLIENT_SECRET = 'test_approval_secret';
    process.env.APPROVAL_ISSUER = 'https://hub.orbisai.ae';
    process.env.APPROVAL_REDIRECT_URI = 'http://localhost:5000/auth/orbishub/callback';
    process.env.APPROVAL_JWKS_URL = 'https://hub.orbisai.ae/.well-known/jwks.json';
    process.env.APP_SLUG = 'asset';
    app = createTestApp();
  });

  // Test 1: Successful flow (authorize -> status approved -> token exchange -> JWT verified -> session created)
  it('1. Successful approval flow creates server session', async () => {
    const token = jwt.sign(
      {
        sub: 'push_user_sub_123',
        email: 'Jane.Doe@Company.com',
        groups: ['asset-access'],
        amr: ['push', 'biometric'],
        jti: 'jti_unique_1',
      },
      keyPair.privateKey,
      {
        algorithm: 'ES256',
        keyid: 'test-key-id-1',
        issuer: 'https://hub.orbisai.ae',
        audience: 'asset',
        expiresIn: '5m',
      }
    );

    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/jwks.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(publicJwks),
        });
      }
      if (url.includes('/api/approval/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token }),
        });
      }
      return Promise.reject(new Error('Unknown URL ' + url));
    });

    const stateCookie = JSON.stringify({
      codeVerifier: 'test_verifier_123',
      state: 'state_123',
      email: 'jane.doe@company.com',
    });

    // Mock DB user lookup & session insertion
    db.query.mockResolvedValueOnce({ rows: [] }); // by sub -> not found
    db.query.mockResolvedValueOnce({
      rows: [{ id: 42, email: 'jane.doe@company.com', authentik_sub: null, isdelete: false }],
    }); // by email -> found
    db.query.mockResolvedValueOnce({ rowCount: 1 }); // update authentik_sub
    db.query.mockResolvedValueOnce({ rowCount: 0 }); // delete old sessions
    db.query.mockResolvedValueOnce({ rowCount: 1 }); // insert session

    const res = await request(app)
      .post('/api/auth/approval/verify')
      .set('Cookie', [`trakio_approval_state=${encodeURIComponent(stateCookie)}`])
      .send({ code: 'approval_auth_code_123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('jane.doe@company.com');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'].some(c => c.startsWith('trakio_session='))).toBe(true);
  });

  // Test 2: Denied approval handled cleanly
  it('2. Denied approval challenge status returns denied status', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'denied' }),
      })
    );

    const res = await request(app).get('/api/auth/approval/status/challenge_denied_123');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('denied');
  });

  // Test 3: Expired challenge handled cleanly
  it('3. Expired challenge status returns expired status', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'expired' }),
      })
    );

    const res = await request(app).get('/api/auth/approval/status/challenge_expired_123');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('expired');
  });

  // Test 4: Invalid / Tampered JWT signature rejected
  it('4. Invalid or tampered JWT signature is rejected with 401', async () => {
    const otherKeyPair = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const tamperedJwt = jwt.sign(
      {
        sub: 'attacker_sub',
        email: 'target@company.com',
      },
      otherKeyPair.privateKey,
      {
        algorithm: 'ES256',
        keyid: 'test-key-id-1',
        issuer: 'https://hub.orbisai.ae',
        audience: 'asset',
        expiresIn: '5m',
      }
    );

    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/jwks.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(publicJwks),
        });
      }
      if (url.includes('/api/approval/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: tamperedJwt }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const stateCookie = JSON.stringify({ codeVerifier: 'ver', state: 'st', email: 'target@company.com' });

    const res = await request(app)
      .post('/api/auth/approval/verify')
      .set('Cookie', [`trakio_approval_state=${encodeURIComponent(stateCookie)}`])
      .send({ code: 'auth_code' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('JWT verification failed');
  });

  // Test 5: Wrong audience claim rejected
  it('5. Wrong audience claim is rejected with 401', async () => {
    const wrongAudJwt = jwt.sign(
      {
        sub: 'user_sub',
        email: 'user@company.com',
      },
      keyPair.privateKey,
      {
        algorithm: 'ES256',
        keyid: 'test-key-id-1',
        issuer: 'https://hub.orbisai.ae',
        audience: 'unrelated_other_app',
        expiresIn: '5m',
      }
    );

    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/jwks.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(publicJwks) });
      }
      if (url.includes('/api/approval/token')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: wrongAudJwt }) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const stateCookie = JSON.stringify({ codeVerifier: 'ver', state: 'st' });

    const res = await request(app)
      .post('/api/auth/approval/verify')
      .set('Cookie', [`trakio_approval_state=${encodeURIComponent(stateCookie)}`])
      .send({ code: 'code' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Audience mismatch');
  });

  // Test 6: Expired JWT exp rejected
  it('6. Expired JWT exp is rejected with 401', async () => {
    const expiredJwt = jwt.sign(
      {
        sub: 'user_sub',
        email: 'user@company.com',
      },
      keyPair.privateKey,
      {
        algorithm: 'ES256',
        keyid: 'test-key-id-1',
        issuer: 'https://hub.orbisai.ae',
        audience: 'asset',
        expiresIn: '-10s',
      }
    );

    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/jwks.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(publicJwks) });
      }
      if (url.includes('/api/approval/token')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token: expiredJwt }) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const stateCookie = JSON.stringify({ codeVerifier: 'ver', state: 'st' });

    const res = await request(app)
      .post('/api/auth/approval/verify')
      .set('Cookie', [`trakio_approval_state=${encodeURIComponent(stateCookie)}`])
      .send({ code: 'code' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('JWT verification failed');
  });

  // Test 7: Unprovisioned email rejected
  it('7. Unprovisioned email is rejected with 403', async () => {
    const token = jwt.sign(
      {
        sub: 'unprovisioned_sub',
        email: 'notfound@company.com',
      },
      keyPair.privateKey,
      {
        algorithm: 'ES256',
        keyid: 'test-key-id-1',
        issuer: 'https://hub.orbisai.ae',
        audience: 'asset',
        expiresIn: '5m',
      }
    );

    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/jwks.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(publicJwks) });
      }
      if (url.includes('/api/approval/token')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ token }) });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Mock DB queries -> user not found
    db.query.mockResolvedValueOnce({ rows: [] });
    db.query.mockResolvedValueOnce({ rows: [] });

    const stateCookie = JSON.stringify({ codeVerifier: 'ver', state: 'st' });

    const res = await request(app)
      .post('/api/auth/approval/verify')
      .set('Cookie', [`trakio_approval_state=${encodeURIComponent(stateCookie)}`])
      .send({ code: 'code' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access to this application has not been provisioned');
  });

  // Test 8: PKCE mismatch on token exchange rejected
  it('8. Missing or mismatched state cookie is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/auth/approval/verify')
      .send({ code: 'code_no_cookie' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Approval transaction state expired or invalid');
  });

  // Test 9: Polling status terminal states
  it('9. Status polling returns terminal states cleanly', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'approved', code: 'valid_auth_code' }),
      })
    );

    const res = await request(app).get('/api/auth/approval/status/challenge_999');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.code).toBe('valid_auth_code');
  });

  // Test 10: Existing Authentik login path regression check
  it('10. Existing Authentik login flow continues working unchanged', async () => {
    global.fetch = jest.fn((url) => {
      if (url.includes('.well-known/openid-configuration')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authorization_endpoint: 'https://auth.orbisai.ae/application/o/authorize/',
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const res = await request(app).get('/auth/login');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://auth.orbisai.ae/application/o/authorize/');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
