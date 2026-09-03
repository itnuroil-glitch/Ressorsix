const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { resolveUserAndLinkSub, createAppSession } = require('../utils/sessionHelper');

// Helper to calculate base64url S256 code challenge
function base64urlURLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

// In-Memory Replay Cache for JTI (Prevent JWT Replay Attacks)
const usedJtiSet = new Set();
const jtiCleanupInterval = setInterval(() => {
  usedJtiSet.clear(); // Clear replay cache periodically
}, 15 * 60 * 1000);
if (jtiCleanupInterval.unref) {
  jtiCleanupInterval.unref();
}

// Remote JWKS Cache for OrbisHub ES256 Signature Verification
let cachedJwks = null;
let jwksFetchedAt = 0;

async function getOrbisHubJwks() {
  // Cache JWKS for 1 hour
  if (cachedJwks && (Date.now() - jwksFetchedAt < 3600000)) {
    return cachedJwks;
  }

  const jwksUrl = process.env.APPROVAL_JWKS_URL || 'https://hub.orbisai.ae/.well-known/jwks.json';
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}. Status: ${res.status}`);
  }

  const data = await res.json();
  cachedJwks = data;
  jwksFetchedAt = Date.now();
  return cachedJwks;
}

// Convert JWK to PEM using Node.js built-in crypto module
function getPemFromJwk(jwk) {
  try {
    const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return keyObject.export({ type: 'spki', format: 'pem' });
  } catch (err) {
    throw new Error(`Failed to convert JWK to PEM: ${err.message}`);
  }
}

// @desc Initiate Mobile Push-Approval Flow with OrbisHub Broker
// @route POST /api/auth/approval/start
exports.startApproval = async (req, res) => {
  try {
    const { email: rawEmail } = req.body;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ message: 'Valid email address is required.' });
    }

    const email = rawEmail.toLowerCase().trim();

    // 1. Generate PKCE code verifier & S256 challenge
    const verifierBytes = crypto.randomBytes(32);
    const codeVerifier = base64urlURLEncode(verifierBytes);
    const codeChallenge = base64urlURLEncode(sha256(Buffer.from(codeVerifier)));

    // 2. Generate state (at least 16 hex chars for Zod validation)
    const state = crypto.randomBytes(16).toString('hex');

    // 3. Store state & PKCE verifier in short-lived HttpOnly cookie (120 sec)
    const statePayload = JSON.stringify({ codeVerifier, state, email });
    res.cookie('trakio_approval_state', statePayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 120 * 1000, // 2 minutes
      path: '/',
    });

    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = process.env.APPROVAL_REDIRECT_URI || `${appBaseUrl}/auth/orbishub/callback`;
    const clientId = process.env.APPROVAL_CLIENT_ID || process.env.APP_SLUG || 'asset';

    const brokerUrl = (process.env.APPROVAL_ISSUER || 'https://hub.orbisai.ae').replace(/\/+$/, '');

    // 4. Call OrbisHub Broker /api/approval/authorize
    const authorizeRes = await fetch(`${brokerUrl}/api/approval/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        email,
        redirectUri,
        state,
        codeChallenge,
      }),
    });

    const authData = await authorizeRes.json().catch(() => ({}));

    if (!authorizeRes.ok) {
      console.warn('[Approval Authorize Failed]:', authorizeRes.status, authData);
      const errorMessage = authData.message || authData.error || 'Failed to initiate push approval. Please ensure your device is enrolled.';
      return res.status(authorizeRes.status >= 400 && authorizeRes.status < 500 ? authorizeRes.status : 400).json({
        message: errorMessage,
        error: authData.error || 'authorization_failed',
      });
    }

    const challengeId = authData.challengeId || authData.id;
    const matchCode = authData.matchCode || authData.code || authData.twoDigitCode;

    return res.status(200).json({
      success: true,
      challengeId,
      matchCode,
      message: 'Approval request dispatched to mobile device.',
    });
  } catch (error) {
    console.error('[Start Approval Error]:', error);
    return res.status(500).json({ message: 'Internal server error while starting approval flow.' });
  }
};

// @desc Poll Status of Push Approval Challenge
// @route GET /api/auth/approval/status/:challengeId
exports.checkStatus = async (req, res) => {
  try {
    const { challengeId } = req.params;
    if (!challengeId) {
      return res.status(400).json({ message: 'Challenge ID is required.' });
    }

    const brokerUrl = (process.env.APPROVAL_ISSUER || 'https://hub.orbisai.ae').replace(/\/+$/, '');
    const statusRes = await fetch(`${brokerUrl}/api/approval/status/${encodeURIComponent(challengeId)}`);

    if (!statusRes.ok) {
      const errData = await statusRes.json().catch(() => ({}));
      return res.status(statusRes.status).json({
        status: 'error',
        message: errData.message || 'Failed to query status from broker.',
      });
    }

    const data = await statusRes.json();

    // Priority extraction for 'code'
    let code = data.code || data.authorizationCode || null;

    if (!code && data.redirectUrl) {
      try {
        const parsedUrl = new URL(data.redirectUrl);
        code = parsedUrl.searchParams.get('code');
      } catch (err) {
        // Fall through if URL parsing fails
      }
    }

    if (!code) {
      code = challengeId;
    }

    // Priority extraction for 'state'
    let state = data.state || null;
    if (!state && data.redirectUrl) {
      try {
        const parsedUrl = new URL(data.redirectUrl);
        state = parsedUrl.searchParams.get('state');
      } catch (err) {
        // Fall through if URL parsing fails
      }
    }

    return res.status(200).json({
      status: data.status,
      code: code,
      state: state,
    });
  } catch (error) {
    console.error('[Check Approval Status Error]:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to poll status.' });
  }
};

// @desc Code Exchange & JWT Verification to Create Session
// @route POST /api/auth/approval/verify
exports.verifyApprovalToken = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required.' });
    }

    // 1. Read state cookie
    const stateCookie = req.cookies ? req.cookies.trakio_approval_state : null;
    res.clearCookie('trakio_approval_state', { path: '/'});

    if (!stateCookie) {
      return res.status(400).json({ message: 'Approval transaction state expired or invalid. Please try again.' });
    }

    let savedState = {};
    try {
      savedState = JSON.parse(stateCookie);
    } catch (e) {
      return res.status(400).json({ message: 'Malformed approval state payload.' });
    }

    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = process.env.APPROVAL_REDIRECT_URI || `${appBaseUrl}/auth/orbishub/callback`;
    const clientId = process.env.APPROVAL_CLIENT_ID || process.env.APP_SLUG || 'asset';
    const clientSecret = process.env.APPROVAL_CLIENT_SECRET || '';

    const brokerUrl = (process.env.APPROVAL_ISSUER || 'https://hub.orbisai.ae').replace(/\/+$/, '');

    // 2. Call OrbisHub Broker POST /api/approval/token
    const tokenRes = await fetch(`${brokerUrl}/api/approval/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        code,
        codeVerifier: savedState.codeVerifier,
        redirectUri,
      }),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok) {
      console.warn('[Approval Token Exchange Error]:', tokenRes.status, tokenData);
      return res.status(400).json({
        message: tokenData.message || tokenData.error || 'Failed to exchange authorization code for token.',
      });
    }

    const jwtToken = tokenData.token || tokenData.id_token || tokenData.access_token;
    if (!jwtToken) {
      return res.status(400).json({ message: 'No signed token received from approval broker.' });
    }

    // 3. Decode Unverified Token Header to Find Key ID (kid)
    const unverifiedDecoded = jwt.decode(jwtToken, { complete: true });
    if (!unverifiedDecoded || !unverifiedDecoded.header) {
      return res.status(401).json({ message: 'JWT verification failed: Invalid token format.' });
    }

    const kid = unverifiedDecoded.header.kid;
    const jwks = await getOrbisHubJwks();

    // Match JWK by kid or default to first key
    let matchingJwk = jwks.keys.find(k => k.kid === kid);
    if (!matchingJwk && jwks.keys.length > 0) {
      matchingJwk = jwks.keys[0];
    }

    if (!matchingJwk) {
      return res.status(401).json({ message: 'JWT verification failed: No matching JWK found in JWKS.' });
    }

    const publicKeyPem = getPemFromJwk(matchingJwk);

    // 4. Verify Signature (ES256), Issuer, Audience, Expiration
    const expectedIssuer = process.env.APPROVAL_ISSUER || 'https://hub.orbisai.ae';
    const expectedAudience = [clientId, process.env.APP_SLUG || 'asset'];

    let jwtPayload;
    try {
      jwtPayload = jwt.verify(jwtToken, publicKeyPem, {
        algorithms: ['ES256'],
        issuer: expectedIssuer,
      });

      // Validate Audience
      const audClaim = Array.isArray(jwtPayload.aud) ? jwtPayload.aud : [jwtPayload.aud];
      const hasValidAud = audClaim.some(aud => expectedAudience.includes(aud));
      if (!hasValidAud) {
        throw new Error(`Audience mismatch. Received: ${JSON.stringify(jwtPayload.aud)}, Expected one of: ${JSON.stringify(expectedAudience)}`);
      }

      // Validate JTI for Replay Protection
      if (jwtPayload.jti) {
        if (usedJtiSet.has(jwtPayload.jti)) {
          throw new Error('JWT JTI replay detected.');
        }
        usedJtiSet.add(jwtPayload.jti);
      }
    } catch (verifyError) {
      console.error('[Approval JWT Verification Failed]:', verifyError.message);
      return res.status(401).json({ message: `JWT verification failed: ${verifyError.message}` });
    }

    const sub = jwtPayload.sub;
    const email = jwtPayload.email || savedState.email;

    if (!sub || !email) {
      return res.status(400).json({ message: 'Token missing required subject or email claims.' });
    }

    // 5. Bind User & Check Pre-Provisioning
    const { localUser, errorReason } = await resolveUserAndLinkSub(sub, email);

    if (!localUser) {
      if (errorReason === 'unprovisioned') {
        return res.status(403).json({ message: 'Access to this application has not been provisioned. Contact your administrator.' });
      }
      if (errorReason === 'sub_mismatch') {
        return res.status(403).json({ message: 'Subject identity mismatch for this user account.' });
      }
      return res.status(403).json({ message: 'Access denied.' });
    }

    // 6. Create Server-Side Session (100% Identical Code Path to Authentik SSO)
    const groupsArray = jwtPayload.groups || [`${process.env.APP_SLUG || 'asset'}-access`];
    await createAppSession(res, localUser, sub, email, groupsArray);

    const name = email.split('@')[0]
      .split('.')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return res.status(200).json({
      success: true,
      message: 'Mobile approval verified successfully.',
      user: {
        id: localUser.id,
        email: localUser.email,
        name: name,
        roleId: localUser.roleid,
        clientid: localUser.clientid,
        companyid: localUser.companyid,
      },
    });
  } catch (error) {
    console.error('[Verify Approval Token Error]:', error);
    return res.status(500).json({ message: 'Server error during token verification.' });
  }
};
