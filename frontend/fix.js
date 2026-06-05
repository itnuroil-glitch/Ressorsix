const fs = require('fs');
const file = 'c:\\asset-nuroil-main\\asset-nuroil-main\\frontend\\src\\components\\DashboardScreen.js';
let dashboard = fs.readFileSync(file, 'utf8');

const rolePickerRegex = /<Picker\s+selectedValue={empRoleId}[\s\S]*?<\/Picker>/;
const depPickerRegex = /<Picker\s+selectedValue={empDepartmentId}[\s\S]*?<\/Picker>/;

const roleSelect = `<select value={empRoleId} onChange={(e) => setEmpRoleId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', outline: 'none' }}>
  <option value="">Select Role</option>
  {roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
</select>`;

const depSelect = `<select value={empDepartmentId} onChange={(e) => setEmpDepartmentId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', outline: 'none' }}>
  <option value="">Select Department</option>
  {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
</select>`;

dashboard = dashboard.replace(rolePickerRegex, roleSelect);
dashboard = dashboard.replace(depPickerRegex, depSelect);

// Replace Switch for status
const statusSwitchRegex = /<Switch\s+value={empStatus === 1}[\s\S]*?thumbColor=\{COLORS.white\}\s+\/>/;
const statusToggle = `<TouchableOpacity
  style={{
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: empStatus === 1 ? '#34D399' : '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  }}
  onPress={() => setEmpStatus(empStatus === 1 ? 0 : 1)}
  activeOpacity={0.8}
>
  <View style={{
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: empStatus === 1 ? 20 : 0 }]
  }} />
</TouchableOpacity>`;
dashboard = dashboard.replace(statusSwitchRegex, statusToggle);

// Replace Switch for Security
const securitySwitchRegex = /<Switch\s+value={empAutoGeneratePassword}[\s\S]*?thumbColor=\{COLORS.white\}\s+\/>/;
const securityToggle = `<TouchableOpacity
  style={{
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: empAutoGeneratePassword ? '#34D399' : '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  }}
  onPress={() => setEmpAutoGeneratePassword(!empAutoGeneratePassword)}
  activeOpacity={0.8}
>
  <View style={{
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: empAutoGeneratePassword ? 20 : 0 }]
  }} />
</TouchableOpacity>`;
dashboard = dashboard.replace(securitySwitchRegex, securityToggle);

fs.writeFileSync(file, dashboard);
console.log('Fixed React Native unsupported elements');
