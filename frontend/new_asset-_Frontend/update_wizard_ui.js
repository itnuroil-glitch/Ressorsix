const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Replace the Wizard Header Progress
const wizardHeaderRegex = /\{\/\* Wizard Header Progress \*\/\}.*?\{\/\* Progress Bar \*\/\}.*?<\/View>\s*<\/View>/s;

const newWizardHeader = `{/* Wizard Header Progress */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      {[
                        { id: 1, label: 'Identity', icon: 'business-outline' },
                        { id: 2, label: 'License', icon: 'card-outline' },
                        { id: 3, label: 'Location', icon: 'location-outline' },
                        { id: 4, label: 'Modules', icon: 'grid-outline' },
                        { id: 5, label: 'Limits', icon: 'options-outline' }
                      ].map((step, index, arr) => {
                        // Map our 6 logic steps into the 5 visual steps requested
                        // Logical Step 1 -> Visual Step 1 (Identity)
                        // Logical Step 2 -> Visual Step 2 (License)
                        // Logical Step 3 -> Visual Step 3 (Location)
                        // Logical Step 4 -> Visual Step 4 (Modules / Tax)
                        // Logical Step 5 & 6 -> Visual Step 5 (Limits / Configs)
                        
                        let mappedStep = companyWizardStep;
                        if (mappedStep === 6) mappedStep = 5;

                        const isActive = mappedStep === step.id;
                        const isPast = mappedStep > step.id;
                        
                        return (
                          <React.Fragment key={step.id}>
                            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isPast ? '#0F172A' : '#E2E8F0', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name={step.icon} size={14} color={isActive || isPast ? '#FFFFFF' : '#64748B'} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: isActive || isPast ? '#0F172A' : '#64748B' }}>{step.label}</Text>
                            </View>
                            {index < arr.length - 1 && (
                              <View style={{ flex: 1, height: 2, backgroundColor: mappedStep > step.id ? '#0F172A' : '#E2E8F0', marginHorizontal: 4 }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>`;

content = content.replace(wizardHeaderRegex, newWizardHeader);

// 2. Replace Client ID text input with Select
const oldClientIdInput = `<TextInput style={styles.modalInput} placeholder="Client ID" placeholderTextColor={COLORS.textMuted} value={companyClientId} onChangeText={setCompanyClientId} keyboardType="numeric" />`;
const newClientIdInput = `<select
                          value={companyClientId}
                          onChange={(e) => setCompanyClientId(e.target.value)}
                          style={{
                            height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,
                            paddingHorizontal: 12, backgroundColor: '#F8FAFC', color: '#1E293B',
                            fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%'
                          }}
                        >
                          <option value="">-- Select Client --</option>
                          {clients.filter(c => c.is_deleted !== 1).map(c => (
                            <option key={c.id} value={c.id}>{c.client_name}</option>
                          ))}
                        </select>`;
content = content.replace(oldClientIdInput, newClientIdInput);

// 3. Replace Country text input with Select
const oldCountryInput = `<TextInput style={styles.modalInput} placeholder="Country" placeholderTextColor={COLORS.textMuted} value={companyCountry} onChangeText={setCompanyCountry}  />`;
const newCountryInput = `<select
                          value={companyCountry}
                          onChange={(e) => setCompanyCountry(e.target.value)}
                          style={{
                            height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,
                            paddingHorizontal: 12, backgroundColor: '#F8FAFC', color: '#1E293B',
                            fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%'
                          }}
                        >
                          <option value="">-- Select Country --</option>
                          {countries.filter(c => c.is_deleted !== 1).map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>`;
content = content.replace(oldCountryInput, newCountryInput);

// 4. Replace Emirate text input with Select
const oldEmirateInput = `<TextInput style={styles.modalInput} placeholder="Emirate" placeholderTextColor={COLORS.textMuted} value={companyEmirate} onChangeText={setCompanyEmirate}  />`;
const newEmirateInput = `<select
                          value={companyEmirate}
                          onChange={(e) => setCompanyEmirate(e.target.value)}
                          disabled={!companyCountry}
                          style={{
                            height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,
                            paddingHorizontal: 12, backgroundColor: !companyCountry ? '#F1F5F9' : '#F8FAFC', color: !companyCountry ? '#94A3B8' : '#1E293B',
                            fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%'
                          }}
                        >
                          {!companyCountry ? (
                            <option value="">-- Select Country First --</option>
                          ) : (
                            <>
                              <option value="">-- Select Emirate --</option>
                              {states.filter(s => {
                                const selectedCountryObj = countries.find(
                                  c => c.name && c.name.trim().toLowerCase() === companyCountry.trim().toLowerCase()
                                );
                                return selectedCountryObj && Number(s.country_id) === Number(selectedCountryObj.id);
                              }).map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </>
                          )}
                        </select>`;
content = content.replace(oldEmirateInput, newEmirateInput);

// 5. Replace Date Inputs
const replaceDateInput = (placeholder, valueVar, setterVar) => {
    const oldInput = `<TextInput style={styles.modalInput} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} value={${valueVar}} onChangeText={${setterVar}}  />`;
    const newInput = `<input
                          type="date"
                          value={${valueVar} ? ${valueVar}.split('T')[0] : ''}
                          onChange={(e) => ${setterVar}(e.target.value)}
                          style={{
                            height: 40, borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 6,
                            paddingHorizontal: 12, backgroundColor: '#F8FAFC', color: '#1E293B',
                            fontSize: 14, fontFamily: 'Roboto', outline: 'none', width: '100%',
                            boxSizing: 'border-box'
                          }}
                        />`;
    content = content.replace(oldInput, newInput);
};

replaceDateInput('Trade License Issue Date', 'companyTradeLicenseIssueDate', 'setCompanyTradeLicenseIssueDate');
replaceDateInput('Trade License Expiry Date', 'companyTradeLicenseExpiryDate', 'setCompanyTradeLicenseExpiryDate');
replaceDateInput('Establishment Card Expiry Date', 'companyEstablishmentCardExpiryDate', 'setCompanyEstablishmentCardExpiryDate');

fs.writeFileSync(path, content, 'utf8');
console.log('Wizard UI & Inputs Updated successfully!');
