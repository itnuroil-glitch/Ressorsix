const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// Use regex for flexible replacement of the Country block
const countryRegex = /<select\s*value=\{companyCountry\}\s*onChange=\{\(e\) => setCompanyCountry\(e\.target\.value\)\}\s*style=\{\{.*?\}\}\s*>\s*<option value="">-- Select Country --<\/option>\s*\{countries\.filter\(c => c\.is_deleted !== 1\)\.map\(c => \(\s*<option key=\{c\.id\} value=\{c\.name\}>\{c\.name\}<\/option>\s*\)\)\}\s*<\/select>/g;

const newCountrySelect = `<select
                          value={companyCountry}
                          onChange={(e) => {
                            setCompanyCountry(e.target.value);
                            setCompanyEmirate('');
                          }}
                          style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: '#FAFAFA', color: '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
                        >
                          <option value="">-- Select Country --</option>
                          {countries.filter(c => c.is_deleted !== 1).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>`;

content = content.replace(countryRegex, newCountrySelect);

// Use regex for flexible replacement of the Emirate block
const emirateRegex = /<select\s*value=\{companyEmirate\}\s*onChange=\{\(e\) => setCompanyEmirate\(e\.target\.value\)\}\s*disabled=\{!companyCountry\}\s*style=\{\{.*?\}\}\s*>\s*\{!companyCountry \? \(\s*<option value="">-- Select Country First --<\/option>\s*\) : \(\s*<>\s*<option value="">-- Select Emirate --<\/option>\s*\{states\.filter\(s => \{\s*const selectedCountryObj = countries\.find\(\s*c => c\.name && c\.name\.trim\(\)\.toLowerCase\(\) === companyCountry\.trim\(\)\.toLowerCase\(\)\s*\);\s*return selectedCountryObj && Number\(s\.country_id\) === Number\(selectedCountryObj\.id\);\s*\}\)\.map\(s => \(\s*<option key=\{s\.id\} value=\{s\.name\}>\{s\.name\}<\/option>\s*\)\)\}\s*<\/>\s*\)\}\s*<\/select>/g;

const newEmirateSelect = `<select
                          value={companyEmirate}
                          onChange={(e) => setCompanyEmirate(e.target.value)}
                          disabled={!companyCountry}
                          style={{ height: 44, borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, backgroundColor: !companyCountry ? '#F1F5F9' : '#FAFAFA', color: !companyCountry ? '#94A3B8' : '#1E293B', fontSize: 14, fontFamily: 'Inter_400Regular, Roboto, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 24 }}
                        >
                          {!companyCountry ? (
                            <option value="">-- Select Country First --</option>
                          ) : (
                            <>
                              <option value="">-- Select Emirate --</option>
                              {states.filter(s => Number(s.country_id) === Number(companyCountry) && s.is_deleted !== 1).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </>
                          )}
                        </select>`;

content = content.replace(emirateRegex, newEmirateSelect);

fs.writeFileSync(path, content, 'utf8');
console.log('Country and State updated to store ID instead of name!');
