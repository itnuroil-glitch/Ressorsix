const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// Replace the date wrapper to include margin bottom
content = content.replace(/<View style=\{\{\s*position: 'relative',\s*width: '100%',\s*justifyContent: 'center'\s*\}\}>/g, `<View style={{ position: 'relative', width: '100%', justifyContent: 'center', marginBottom: 24 }}>`);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed margin bottom for date fields!');
