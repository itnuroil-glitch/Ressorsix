const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// Replace select inline styles to include marginBottom: 24
content = content.replace(/outline: 'none', width: '100%', boxSizing: 'border-box' \}\}/g, `outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 24 }}`);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed margin bottom for select fields!');
