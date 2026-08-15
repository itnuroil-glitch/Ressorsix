const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const db = require('./db');

/**
 * Detects the email provider for a given recipient email.
 * Returns 'Gmail', 'Microsoft 365', or 'default'.
 */
async function detectEmailProvider(email) {
  if (!email || typeof email !== 'string') return 'default';
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return 'default';

  // 1. Static check for common domains
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return 'Gmail';
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'office365.com'].includes(domain)) {
    return 'Microsoft 365';
  }

  // 2. MX lookup for custom domain
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      for (const record of mxRecords) {
        const exchange = record.exchange.toLowerCase();
        if (exchange.includes('google.com') || exchange.includes('googlemail.com')) {
          return 'Gmail';
        }
        if (exchange.includes('outlook.com') || exchange.includes('mail.protection.outlook.com') || exchange.includes('office365.com')) {
          return 'Microsoft 365';
        }
      }
    }
  } catch (err) {
    console.warn(`[Mailer] MX lookup failed for domain "${domain}":`, err.message);
  }

  return 'default';
}

/**
 * Checks if a given SMTP configuration matches the detected provider.
 */
function isConfigMatch(config, provider) {
  if (!provider || provider === 'default') return false;

  const host = (config.smtp_host || '').toLowerCase();
  const name = (config.stmpconfiguration_name || '').toLowerCase();

  if (provider === 'Gmail') {
    return host.includes('gmail') || host.includes('google') || name.includes('gmail') || name.includes('google');
  }
  if (provider === 'Microsoft 365') {
    return host.includes('outlook') || host.includes('office365') || host.includes('microsoft') || host.includes('hotmail') ||
           name.includes('outlook') || name.includes('office') || name.includes('365') || name.includes('microsoft') || name.includes('hotmail');
  }

  return false;
}

/**
 * Sends an email using the automatically detected SMTP configuration.
 *
 * @param {Object} params
 * @param {string} params.to Recipient's email address
 * @param {string} params.subject Subject of the email
 * @param {string} [params.text] Plain text version of the email
 * @param {string} [params.html] HTML version of the email
 * @param {number|string|null} [params.clientid] Optional client ID for client-specific SMTP scoping
 */
async function sendEmail({ to, subject, text, html, clientid = null }) {
  if (process.env.DISABLE_SMTP === 'true' || process.env.ENABLE_SMTP === 'false') {
    console.log(`[Mailer] SMTP is temporarily disabled (DISABLE_SMTP=true). Skipping email to: ${to}`);
    return { status: 'skipped', message: 'SMTP is temporarily disabled.' };
  }

  // Check tbl_system_setting table for smtp_enabled setting scoped by clientid
  try {
    let settingQuery = "SELECT setting_value FROM tbl_system_setting WHERE setting_key = 'smtp_enabled'";
    const queryParams = [];

    if (clientid) {
      settingQuery += " AND (clientid = $1 OR clientid IS NULL) ORDER BY clientid DESC NULLS LAST LIMIT 1";
      queryParams.push(parseInt(clientid, 10));
    } else {
      settingQuery += " AND clientid IS NULL LIMIT 1";
    }

    const sysSettingRes = await db.query(settingQuery, queryParams);
    if (sysSettingRes.rows.length > 0 && sysSettingRes.rows[0].setting_value === '0') {
      console.log(`[Mailer] SMTP is disabled in System Settings for Client ID ${clientid || 'Global'} (smtp_enabled = 0). Skipping email to: ${to}`);
      return { status: 'disabled', message: 'SMTP is disabled in System Settings for this client.' };
    }
  } catch (settingErr) {
    console.warn('[Mailer] Could not query tbl_system_setting:', settingErr.message);
  }

  console.log(`\n[Mailer] Initiating email sending process to: ${to}`);

  // 1. Detect provider
  const provider = await detectEmailProvider(to);
  console.log(`[Mailer] Detected provider: ${provider}`);

  // 2. Fetch active SMTP configurations
  const query = `
    SELECT s.*, u.clientid, u.roleid
    FROM smtp_configuration s
    LEFT JOIN users u ON s.userid::text = u.id::text
    WHERE (s.is_deleted::text = 'false' OR s.is_deleted::text = '0' OR s.is_deleted = false)
      AND (s.status::text = '1' OR s.status::text = 'true' OR s.status = 1)
    ORDER BY CASE WHEN u.roleid::text = '2' THEN 0 ELSE 1 END ASC, s.id ASC
  `;
  const dbRes = await db.query(query);
  const allConfigs = dbRes.rows;

  if (allConfigs.length === 0) {
    const errMsg = 'No active SMTP configurations found in the database.';
    console.error(`[Mailer] Error: ${errMsg}`);
    throw new Error(errMsg);
  }

  let selectedConfig = null;

  // Filter configurations to separate global (superadmin) and client-specific ones
  const globalConfigs = allConfigs.filter(c => !c.clientid || c.roleid === 1);

  if (clientid) {
    const targetClientId = parseInt(clientid, 10);
    const clientConfigs = allConfigs.filter(c => c.clientid === targetClientId);
    console.log(`[Mailer] Found ${clientConfigs.length} active SMTP configs for Client ID: ${targetClientId}`);

    // 1. Try to find provider match in client's own configs
    selectedConfig = clientConfigs.find(c => isConfigMatch(c, provider));
    if (selectedConfig) {
      console.log(`[Mailer] Match found: Client SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name}) matches provider "${provider}"`);
    }

    // 2. If no provider match but it's a default provider, try to use client's first config
    if (!selectedConfig && provider === 'default' && clientConfigs.length > 0) {
      selectedConfig = clientConfigs[0];
      console.log(`[Mailer] Using client default SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name})`);
    }

    // 3. Fallback: if no matching client config, try to find provider match in global configs
    if (!selectedConfig) {
      selectedConfig = globalConfigs.find(c => isConfigMatch(c, provider));
      if (selectedConfig) {
        console.log(`[Mailer] Match found: Global SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name}) matches provider "${provider}"`);
      }
    }

    // 4. Fallback: if still no config, use client's first config
    if (!selectedConfig && clientConfigs.length > 0) {
      selectedConfig = clientConfigs[0];
      console.log(`[Mailer] Fallback to client first SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name})`);
    }
  } else {
    // System-wide/global emails (no clientid scoped) must ONLY match global configs
    selectedConfig = globalConfigs.find(c => isConfigMatch(c, provider));
    if (selectedConfig) {
      console.log(`[Mailer] Match found: Global SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name}) matches provider "${provider}"`);
    }
  }

  // Final fallback to system/superadmin configuration
  if (!selectedConfig) {
    selectedConfig = globalConfigs[0];
    if (selectedConfig) {
      console.log(`[Mailer] Fallback selected: Global SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name})`);
    }
  }

  // Absolute last resort (any active config)
  if (!selectedConfig) {
    selectedConfig = allConfigs[0];
    console.log(`[Mailer] Fallback selected: First available SMTP Config ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name})`);
  }


  // 3. Build transporter
  const port = parseInt(selectedConfig.smtp_port, 10) || 587;
  const isSecure = selectedConfig.security_protocol === 'SSL' || port === 465;

  console.log(`[Mailer] Configuring transporter with SMTP ID ${selectedConfig.id} (${selectedConfig.stmpconfiguration_name}):
    - Host: ${selectedConfig.smtp_host}
    - Port: ${port}
    - Security: ${isSecure ? 'SSL/TLS' : 'STARTTLS/None'}
    - Authenticated Account: ${selectedConfig.smtp_usename}
  `);

  const transporter = nodemailer.createTransport({
    host: selectedConfig.smtp_host,
    port: port,
    secure: isSecure,
    auth: {
      user: selectedConfig.smtp_usename,
      pass: selectedConfig.smtp_password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Ensure the From email matches the authenticated SMTP account username
  const mailOptions = {
    from: `"${selectedConfig.from_name || 'System'}" <${selectedConfig.smtp_usename}>`,
    to: to,
    subject: subject,
    text: text,
    html: html
  };

  // 4. Send email and log delivery status
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] DELIVERY SUCCESS: Email to "${to}" successfully sent. Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Mailer] DELIVERY FAILURE: Failed to send email to "${to}" using SMTP config ID ${selectedConfig.id}. Error:`, err);
    throw err;
  }
}

module.exports = {
  detectEmailProvider,
  sendEmail
};
