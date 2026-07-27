const fs = require('fs');
const content = fs.readFileSync('../frontend/src/components/DashboardScreen.js', 'utf8');

// Find all lines containing "parent_id" or "sidebar" or "Role" in a sidebar context
const lines = content.split('\n');
console.log("Total lines:", lines.length);

// Let's find lines containing "parent_id"
lines.forEach((line, i) => {
  if (line.includes('parent_id') || line.includes('parentId')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
