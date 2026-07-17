const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Add CSS trick to the top of the file (or inject it) if not exists
if (!content.includes('::-webkit-calendar-picker-indicator')) {
  const cssInject = `
<style>
  input[type="date"]::-webkit-calendar-picker-indicator {
    background: transparent;
    bottom: 0;
    color: transparent;
    cursor: pointer;
    height: auto;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: auto;
  }
  input[type="date"] {
    position: relative;
  }
  select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg fill='%2364748B' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
    background-repeat: no-repeat;
    background-position-x: 98%;
    background-position-y: center;
  }
</style>
`;
  content = content.replace('export default function DashboardScreen(', cssInject + '\nexport default function DashboardScreen(');
}

// 2. Replace Date Inputs
const replaceDateInputBeautified = (placeholder, valueVar, setterVar) => {
    // Need a regex because previous inline styles might differ due to spacing
    const regexStr = `<input\\s*type="date"\\s*value=\\{${valueVar} \\? ${valueVar}\\.split\\('T'\\)\\[0\\] : ''\\}\\s*onChange=\\{\\(e\\) => ${setterVar}\\(e\\.target\\.value\\)\\}\\s*style=\\{\\{[\\s\\S]*?\\}\\}\\s*\\/>`;
    const regex = new RegExp(regexStr, 'g');
    
    const newInput = `<View style={{ position: 'relative', width: '100%', justifyContent: 'center' }}>
                          <input
                            type="date"
                            value={${valueVar} ? ${valueVar}.split('T')[0] : ''}
                            onChange={(e) => ${setterVar}(e.target.value)}
                            style={{
                              height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8,
                              paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B',
                              fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outline: 'none', width: '100%',
                              boxSizing: 'border-box'
                            }}
                          />
                          <View style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
                            <Ionicons name="calendar-outline" size={18} color="#64748B" />
                          </View>
                        </View>`;
    content = content.replace(regex, newInput);
};

replaceDateInputBeautified('Trade License Issue Date', 'companyTradeLicenseIssueDate', 'setCompanyTradeLicenseIssueDate');
replaceDateInputBeautified('Trade License Expiry Date', 'companyTradeLicenseExpiryDate', 'setCompanyTradeLicenseExpiryDate');
replaceDateInputBeautified('Establishment Card Expiry Date', 'companyEstablishmentCardExpiryDate', 'setCompanyEstablishmentCardExpiryDate');

// 3. Replace Select styles
content = content.replace(/style=\{\{\s*height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,\s*paddingHorizontal: 12, backgroundColor: '#F8FAFC', color: '#1E293B',\s*fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%'\s*\}\}/g, 
`style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }}`);

content = content.replace(/style=\{\{\s*height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,\s*paddingHorizontal: 12, backgroundColor: !companyCountry \? '#F1F5F9' : '#F8FAFC', color: !companyCountry \? '#94A3B8' : '#1E293B',\s*fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%'\s*\}\}/g, 
`style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: !companyCountry ? '#F1F5F9' : '#FAFAFA', color: !companyCountry ? '#94A3B8' : '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }}`);

// 4. Update Header Tabs design for more padding and less squished look
const oldWizardHeader = `paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0'`;
const newWizardHeader = `paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1`;
content = content.replace(oldWizardHeader, newWizardHeader);

fs.writeFileSync(path, content, 'utf8');
console.log('Styles beautified');
