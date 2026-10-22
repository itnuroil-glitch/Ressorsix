const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/DashboardScreen.js', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (
    l.includes('modalPermissionCompanyId') ||
    l.includes('All Companies') ||
    l.includes('all companies') ||
    l.includes('company_id') ||
    l.includes('companyPermissionDrafts') ||
    l.includes('applyToAll') ||
    l.includes('all company')
  ) {
    console.log(`${i + 1}: ${l.trim().slice(0, 110)}`);
  }
});
