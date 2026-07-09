const db = require('./src/config/db');

// Duplicate the logic from mailer.js to test selection
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

function selectConfig(allConfigs, provider, clientid) {
  let selectedConfig = null;

  // If clientid is provided, look within client-specific configurations first
  if (clientid) {
    const targetClientId = parseInt(clientid, 10);
    const clientConfigs = allConfigs.filter(c => c.clientid === targetClientId);
    
    // Look for matching provider within client's configs
    selectedConfig = clientConfigs.find(c => isConfigMatch(c, provider));
  }

  // If no client-specific match, look globally for a provider match
  if (!selectedConfig) {
    selectedConfig = allConfigs.find(c => isConfigMatch(c, provider));
  }

  // Fallback to default configuration
  if (!selectedConfig) {
    if (clientid) {
      const targetClientId = parseInt(clientid, 10);
      const clientConfigs = allConfigs.filter(c => c.clientid === targetClientId);
      if (clientConfigs.length > 0) {
        selectedConfig = clientConfigs[0];
      }
    }
    if (!selectedConfig) {
      selectedConfig = allConfigs[0];
    }
  }

  return selectedConfig;
}

async function testSelection() {
  console.log("\n=== TESTING SMTP SELECTION LOGIC WITH DB DATA ===");
  const query = `
    SELECT s.*, u.clientid, u.roleid
    FROM smtp_configuration s
    LEFT JOIN users u ON s.userid = u.id
    WHERE s.is_deleted = false AND s.status = 1
    ORDER BY CASE WHEN u.roleid = 2 THEN 0 ELSE 1 END ASC, s.id ASC
  `;
  const dbRes = await db.query(query);
  const allConfigs = dbRes.rows;

  console.log(`Loaded ${allConfigs.length} active configurations from DB.`);

  // Test Case A: Recipient is Gmail, clientid is null
  const configA = selectConfig(allConfigs, 'Gmail', null);
  console.log(`Test A (Gmail, no client): Expected Gmail match. Selected Config ID: ${configA ? configA.id : 'None'} (Name: "${configA ? configA.stmpconfiguration_name : ''}")`);

  // Test Case B: Recipient is Microsoft 365, clientid is null
  const configB = selectConfig(allConfigs, 'Microsoft 365', null);
  console.log(`Test B (Microsoft 365, no client): Expected Microsoft/Office 365 match. Selected Config ID: ${configB ? configB.id : 'None'} (Name: "${configB ? configB.stmpconfiguration_name : ''}")`);

  // Test Case C: Recipient has no matching provider, clientid is null
  const configC = selectConfig(allConfigs, 'default', null);
  console.log(`Test C (default/no match, no client): Expected fallback to default (ID 1). Selected Config ID: ${configC ? configC.id : 'None'} (Name: "${configC ? configC.stmpconfiguration_name : ''}")`);
}

testSelection().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
