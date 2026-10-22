const fs = require('fs');

const content = fs.readFileSync('frontend/src/components/DashboardScreen.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes("telecom_report") || line.includes("TelecomReportTab") || line.includes("RolePermissions") || line.includes("role_permission") || line.includes("permission_modules")) {
    console.log(`Line ${idx + 1}: ${line.trim().slice(0, 120)}`);
  }
});
