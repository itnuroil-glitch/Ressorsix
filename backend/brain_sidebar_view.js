const fs = require('fs');
const content = fs.readFileSync('../frontend/src/components/DashboardScreen.js', 'utf8');
const lines = content.split('\n');
for (let i = 2050; i <= 2150; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}
