const fs = require('fs');
const file = 'src/components/DashboardScreen.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>`;
const replacement = `<ScrollView horizontal={true} showsHorizontalScrollIndicator={true} style={{ width: '100%' }} contentContainerStyle={{ minWidth: '100%' }}>`;

content = content.split(target).join(replacement);

fs.writeFileSync(file, content);
console.log('Successfully patched ScrollViews!');
