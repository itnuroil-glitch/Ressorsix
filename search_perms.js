const fs = require('fs');

const content = fs.readFileSync('frontend/src/components/DashboardScreen.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('fetchUserPermissions') || line.includes('/api/roles/') || line.includes('/api/modules') || line.includes('userPermissions')) {
    console.log(`Line ${idx + 1}: ${line.trim().slice(0, 100)}`);
  }
});
