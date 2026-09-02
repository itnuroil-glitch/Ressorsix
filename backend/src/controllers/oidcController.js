const crypto = require('crypto');
const db = require('../config/db');

// Helper to calculate base64url S256 code challenge
function base64urlURLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

// Styled 403 Access Denied HTML Page Generator
function render403Page(res, detailMessage) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Access Denied - Trakio</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: #f4f6f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #ffffff; width: 100%; max-width: 480px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); overflow: hidden; text-align: center; }
        .card-header { background: #1B3E30; padding: 24px; color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .card-header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
        .card-body { padding: 32px 24px; }
        .icon-container { width: 64px; height: 64px; background: #FFEBEB; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #DC2626; font-size: 32px; font-weight: bold; }
        .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 12px; }
        .message { font-size: 15px; color: #4B5563; line-height: 1.5; margin-bottom: 24px; }
        .btn { display: inline-block; background: #1B3E30; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
        .btn:hover { background: #143025; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-header">
          <h1>Trakio Access Management</h1>
        </div>
        <div class="card-body">
          <div class="icon-container">🚫</div>
          <div class="title">Access Denied</div>
          <div class="message">Access to this application has not been provisioned. Contact your administrator.</div>
          ${detailMessage ? `<p style="font-size: 12px; color: #9CA3AF; margin-bottom: 20px;">(${detailMessage})</p>` : ''}
          <a href="/auth/login" class="btn">Return to Sign In</a>
        </div>
      </div>
    </body>
    </html>
  `;
  return res.status(403).send(html);
}

// OIDC Config Discovery Cache
let oidcConfigCache = null;
let oidcConfigFetchedAt = 0;

async function getOidcConfig() {
  const issuerUrl = (process.env.AUTHENTIK_ISSUER_URL || 'https://auth.orbisai.ae/application/o/asset/').replace(/\/+$/, '');
  
  // Return cached config if less than 1 hour old
  if (oidcConfigCache && (Date.now() - oidcConfigFetchedAt < 3600000)) {
    return oidcConfigCache;
  }

  try {
    const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
    const res = await fetch(discoveryUrl);
    if (!res.ok) {
      throw new Error(`Discovery failed with status ${res.status}`);
    }
    const config = await res.json();
    oidcConfigCache = config;
    oidcConfigFetchedAt = Date.now();
    return config;
  } catch (err) {
    console.warn('[OIDC] Discovery fetch failed, falling back to process.env URLs:', err.message);
    return {
      authorization_endpoint: process.env.AUTHENTIK_AUTHORIZE_URL || `${issuerUrl}/authorize/`,
      token_endpoint: process.env.AUTHENTIK_TOKEN_URL || `${issuerUrl}/token/`,
      userinfo_endpoint: process.env.AUTHENTIK_USERINFO_URL || `${issuerUrl}/userinfo/`,
      end_session_endpoint: process.env.AUTHENTIK_LOGOUT_URL || `${issuerUrl}/end-session/`,
      issuer: issuerUrl,
    };
  }
}

// @desc Initiate OIDC Login Flow with PKCE
// @route GET /auth/login
exports.login = async (req, res) => {
  try {
    const config = await getOidcConfig();
    
    // Generate PKCE code verifier and challenge
    const verifierBytes = crypto.randomBytes(32);
    const codeVerifier = base64urlURLEncode(verifierBytes);
    const codeChallenge = base64urlURLEncode(sha256(Buffer.from(codeVerifier)));

    const state = crypto.randomBytes(24).toString('hex');
    const nonce = crypto.randomBytes(24).toString('hex');

    // Store verifier, state, nonce in short-lived HttpOnly cookie (10 min)
    const oidcStateData = JSON.stringify({ codeVerifier, state, nonce });
    res.cookie('trakio_oidc_state', oidcStateData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/',
    });

    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = process.env.AUTHENTIK_REDIRECT_URI || `${appBaseUrl}/auth/callback`;
    const clientId = process.env.AUTHENTIK_CLIENT_ID || 'client_id_placeholder';

    const authUrl = new URL(config.authorization_endpoint);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'openid email profile groups');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('[OIDC Login Error]:', error);
    res.status(500).send('Failed to initiate login with Authentik SSO.');
  }
};

// @desc OIDC Callback Handling
// @route GET /auth/callback
exports.callback = async (req, res) => {
  try {
    const { code, state, error: authError, error_description } = req.query;

    if (authError) {
      console.error('[OIDC Callback Authorization Error]:', authError, error_description);
      return render403Page(res, error_description || authError);
    }

    if (!code || !state) {
      return render403Page(res, 'Missing code or state parameter');
    }

    // Retrieve state cookie
    const stateCookie = req.cookies ? req.cookies.trakio_oidc_state : null;
    res.clearCookie('trakio_oidc_state', { path: '/' });

    if (!stateCookie) {
      return render403Page(res, 'Authentication state expired or invalid cookie');
    }

    let savedState = {};
    try {
      savedState = JSON.parse(stateCookie);
    } catch (e) {
      return render403Page(res, 'Malformed state cookie');
    }

    if (savedState.state !== state) {
      return render403Page(res, 'State parameter mismatch');
    }

    const config = await getOidcConfig();
    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = process.env.AUTHENTIK_REDIRECT_URI || `${appBaseUrl}/auth/callback`;
    const clientId = process.env.AUTHENTIK_CLIENT_ID || '';
    const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET || '';

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('code', code);
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('code_verifier', savedState.codeVerifier);

    const tokenRes = await fetch(config.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('[OIDC Token Exchange Error]:', tokenRes.status, errorText);
      return render403Page(res, 'Failed to exchange authorization code');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    // Fetch userinfo if claims are inside userinfo endpoint
    let claims = {};
    if (idToken) {
      try {
        const parts = idToken.split('.');
        const payloadDecoded = Buffer.from(parts[1], 'base64url').toString('utf8');
        claims = JSON.parse(payloadDecoded);
      } catch (e) {
        console.warn('[OIDC] ID Token parse warning:', e.message);
      }
    }

    if (accessToken && config.userinfo_endpoint) {
      try {
        const userInfoRes = await fetch(config.userinfo_endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoRes.ok) {
          const userInfoData = await userInfoRes.json();
          claims = { ...claims, ...userInfoData };
        }
      } catch (err) {
        console.warn('[OIDC] Userinfo fetch warning:', err.message);
      }
    }

    const rawEmail = claims.email;
    const authentikSub = claims.sub;
    const rawGroups = claims.groups;

    if (!rawEmail || !authentikSub) {
      return render403Page(res, 'Missing email or subject claim in token');
    }

    const email = String(rawEmail).toLowerCase().trim();
    const requiredGroup = process.env.REQUIRED_AUTHENTIK_GROUP || `${process.env.APP_SLUG || 'asset'}-access`;

    // Validate Groups Membership
    let groupsArray = [];
    if (Array.isArray(rawGroups)) {
      groupsArray = rawGroups;
    } else if (typeof rawGroups === 'string') {
      groupsArray = [rawGroups];
    }

    if (!groupsArray.includes(requiredGroup)) {
      console.warn(`[OIDC Authorization Denied] User ${email} lacking group ${requiredGroup}. Present groups:`, groupsArray);
      return render403Page(res);
    }

    // Local User Matching & Permanent Subject Linking via shared sessionHelper
    const { resolveUserAndLinkSub, createAppSession } = require('../utils/sessionHelper');
    const { localUser, errorReason } = await resolveUserAndLinkSub(authentikSub, email);

    if (!localUser) {
      if (errorReason === 'unprovisioned') {
        console.warn(`[OIDC Authorization Denied] User ${email} not pre-provisioned in local database.`);
      } else if (errorReason === 'sub_mismatch') {
        console.warn(`[OIDC Authorization Denied] User ${email} already linked to different subject.`);
      }
      return render403Page(res);
    }

    // Create Server-Side Session via shared sessionHelper
    await createAppSession(res, localUser, authentikSub, email, groupsArray);

    // Redirect to main application
    res.redirect('/');
  } catch (error) {
    console.error('[OIDC Callback Error]:', error);
    return render403Page(res, 'Unexpected server error during authentication');
  }
};

// @desc Get Current Authenticated Session Payload
// @route GET /api/auth/me
exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Parse Name for dashboard preview
  const name = req.user.email.split('@')[0]
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  res.status(200).json({
    message: 'Authenticated session active',
    user: {
      id: req.user.id,
      email: req.user.email,
      name: name,
      roleId: req.user.roleId,
      clientid: req.user.clientid,
      companyid: req.user.companyid,
      associatedCompanyIds: req.user.associatedCompanyIds || [],
      authentikSub: req.user.authentik_sub,
    },
    session: req.session,
  });
};

// @desc Logout & Destroy Session
// @route POST /auth/logout or GET /auth/logout
exports.logout = async (req, res) => {
  try {
    let rawToken = null;
    if (req.cookies && req.cookies.trakio_session) {
      rawToken = req.cookies.trakio_session;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      rawToken = req.headers.authorization.substring(7).trim();
    }

    if (rawToken) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await db.query('DELETE FROM tbl_sessions WHERE session_token_hash = $1', [tokenHash]);
    }

    res.clearCookie('trakio_session', { path: '/' });
    res.clearCookie('trakio_oidc_state', { path: '/' });

    const logoutUrl = process.env.AUTHENTIK_LOGOUT_URL || 'https://auth.orbisai.ae/application/o/asset/end-session/';

    if (req.accepts('html')) {
      return res.redirect(logoutUrl);
    }

    return res.status(200).json({ message: 'Logged out successfully', logoutUrl });
  } catch (error) {
    console.error('[OIDC Logout Error]:', error);
    res.clearCookie('trakio_session', { path: '/' });
    res.status(500).json({ message: 'Error during logout' });
  }
};
