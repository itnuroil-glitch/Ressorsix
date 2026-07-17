const fs = require('fs');
let dashboard = fs.readFileSync('c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\DashboardScreen.js', 'utf8');

const renderEmployeesTab = fs.readFileSync('c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\renderEmployeesTab.snippet.js', 'utf8');
const employeeModal = fs.readFileSync('c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\employeeModal.snippet.js', 'utf8');

dashboard = dashboard.replace('  const renderCompanyTab = () => {', renderEmployeesTab + '\n\n  const renderCompanyTab = () => {');
dashboard = dashboard.replace('      {/* Add/Edit Company Modal */}', employeeModal + '\n\n      {/* Add/Edit Company Modal */}');
dashboard = dashboard.replace('      case \'permissions\':\n        return renderPermissionsTab();', '      case \'employees\':\n        return renderEmployeesTab();\n      case \'permissions\':\n        return renderPermissionsTab();');

fs.writeFileSync('c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\DashboardScreen.js', dashboard);
console.log('Successfully injected employees tab and modal into DashboardScreen.js');
