const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Add State Variable
if (!content.includes('const [companyWizardStep, setCompanyWizardStep]')) {
    content = content.replace(
        "const [companyInsuranceAlertDays, setCompanyInsuranceAlertDays] = useState('30');",
        "const [companyInsuranceAlertDays, setCompanyInsuranceAlertDays] = useState('30');\n  const [companyWizardStep, setCompanyWizardStep] = useState(1);"
    );
}

// 2. Add to startEditCompany
if (!content.includes('setCompanyWizardStep(1);', content.indexOf('const startEditCompany = '))) {
    content = content.replace(
        "setCompanyInsuranceAlertDays(item.insurance_alert_days ? String(item.insurance_alert_days) : '30');",
        "setCompanyInsuranceAlertDays(item.insurance_alert_days ? String(item.insurance_alert_days) : '30');\n    setCompanyWizardStep(1);"
    );
}

// 3. Add to "Add Company" onPress
if (!content.includes('setCompanyWizardStep(1);', content.indexOf('setIsCompanyModalOpen(true)'))) {
    content = content.replace(
        "setCompanyInsuranceAlertDays('30');\n              setIsCompanyModalOpen(true);",
        "setCompanyInsuranceAlertDays('30');\n              setCompanyWizardStep(1);\n              setIsCompanyModalOpen(true);"
    );
}

// 4. Wizard JSX
const buildTextInput = (label, stateVar, setter, extra = '') => 
`                      <View style={styles.modalInputGroup}>
                        <Text style={styles.modalLabel}>${label}</Text>
                        <TextInput style={styles.modalInput} placeholder="${label === 'Trade License Issue Date' || label === 'Trade License Expiry Date' || label === 'Establishment Card Expiry Date' ? 'YYYY-MM-DD' : label}" placeholderTextColor={COLORS.textMuted} value={${stateVar}} onChangeText={${setter}} ${extra} />
                      </View>
`;

const buildToggle = (label, stateVar, setter) => 
`                      <View style={styles.modalInputGroup}>
                        <Text style={styles.modalLabel}>${label}</Text>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => ${setter}(prev => !prev)} activeOpacity={0.8}>
                          <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: ${stateVar} ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: ${stateVar} ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: ${stateVar} ? '#065F46' : '#64748B' }}>{${stateVar} ? 'Yes' : 'No'}</Text>
                        </TouchableOpacity>
                      </View>
`;

const buildStatusToggle = () => 
`                      <View style={styles.modalInputGroup}>
                        <Text style={styles.modalLabel}>Company Status</Text>
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12, marginBottom: 16 }} onPress={() => setCompanyStatus(prev => (prev === 'Active' ? 'Inactive' : 'Active'))} activeOpacity={0.8}>
                          <View style={{ width: 52, height: 28, borderRadius: 14, backgroundColor: companyStatus === 'Active' ? '#10B981' : '#CBD5E1', justifyContent: 'center', paddingHorizontal: 3 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: companyStatus === 'Active' ? 'flex-end' : 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 2 }} />
                          </View>
                          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: companyStatus === 'Active' ? '#D1FAE5' : '#F1F5F9' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: companyStatus === 'Active' ? '#065F46' : '#64748B', fontFamily: 'Roboto' }}>{companyStatus === 'Active' ? 'Active' : 'Inactive'}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
`;

const step1 = `
                    {companyWizardStep === 1 && (
                      <>
${buildTextInput('Company Name *', 'companyNameInput', 'setCompanyNameInput')}
${buildTextInput('Short Code', 'companyShortCode', 'setCompanyShortCode')}
${buildTextInput('Client ID', 'companyClientId', 'setCompanyClientId', 'keyboardType="numeric"')}
${buildTextInput('Industry', 'companyIndustry', 'setCompanyIndustry')}
${buildTextInput('Legal Form', 'companyLegalForm', 'setCompanyLegalForm')}
${buildTextInput('Business Activity', 'companyBusinessActivity', 'setCompanyBusinessActivity')}
${buildStatusToggle()}
                      </>
                    )}
`;

const step2 = `
                    {companyWizardStep === 2 && (
                      <>
${buildTextInput('Jurisdiction', 'companyJurisdiction', 'setCompanyJurisdiction')}
${buildTextInput('Licensing Authority', 'companyLicensingAuthority', 'setCompanyLicensingAuthority')}
${buildTextInput('Trade License Number', 'companyTradeLicenseNumber', 'setCompanyTradeLicenseNumber')}
${buildTextInput('Trade License Issue Date', 'companyTradeLicenseIssueDate', 'setCompanyTradeLicenseIssueDate')}
${buildTextInput('Trade License Expiry Date', 'companyTradeLicenseExpiryDate', 'setCompanyTradeLicenseExpiryDate')}
                      </>
                    )}
`;

const step3 = `
                    {companyWizardStep === 3 && (
                      <>
${buildTextInput('Country', 'companyCountry', 'setCompanyCountry')}
${buildTextInput('Emirate', 'companyEmirate', 'setCompanyEmirate')}
${buildTextInput('Registered Address', 'companyRegisteredAddress', 'setCompanyRegisteredAddress')}
${buildTextInput('PO Box', 'companyPoBox', 'setCompanyPoBox')}
${buildTextInput('Contact Person', 'companyContactPerson', 'setCompanyContactPerson')}
${buildTextInput('Contact Email', 'companyContactEmail', 'setCompanyContactEmail')}
${buildTextInput('Contact Phone', 'companyContactPhone', 'setCompanyContactPhone')}
${buildTextInput('Website', 'companyWebsite', 'setCompanyWebsite')}
                      </>
                    )}
`;

const step4 = `
                    {companyWizardStep === 4 && (
                      <>
${buildToggle('VAT Registered', 'companyVatRegistered', 'setCompanyVatRegistered')}
${buildTextInput('TRN', 'companyTrn', 'setCompanyTrn')}
${buildTextInput('Corporate Tax Reg. No.', 'companyCorporateTaxRegistrationNumber', 'setCompanyCorporateTaxRegistrationNumber')}
${buildTextInput('Establishment Card Number', 'companyEstablishmentCardNumber', 'setCompanyEstablishmentCardNumber')}
${buildTextInput('Establishment Card Expiry Date', 'companyEstablishmentCardExpiryDate', 'setCompanyEstablishmentCardExpiryDate')}
${buildTextInput('MOHRE Number', 'companyMohreNumber', 'setCompanyMohreNumber')}
${buildToggle('WPS Registered', 'companyWpsRegistered', 'setCompanyWpsRegistered')}
${buildToggle('NAFIS Emiratisation Applicable', 'companyNafisEmiratisationApplicable', 'setCompanyNafisEmiratisationApplicable')}
${buildToggle('GPSSA Applicable', 'companyGpssaApplicable', 'setCompanyGpssaApplicable')}
                      </>
                    )}
`;

const step5 = `
                    {companyWizardStep === 5 && (
                      <>
${buildTextInput('Authorized Signatory Name', 'companyAuthorizedSignatoryName', 'setCompanyAuthorizedSignatoryName')}
${buildTextInput('Authorized Signatory Designation', 'companyAuthorizedSignatoryDesignation', 'setCompanyAuthorizedSignatoryDesignation')}
${buildTextInput('Default Bank', 'companyDefaultBank', 'setCompanyDefaultBank')}
${buildTextInput('Default Currency', 'companyDefaultCurrency', 'setCompanyDefaultCurrency')}
                      </>
                    )}
`;

const step6 = `
                    {companyWizardStep === 6 && (
                      <>
${buildTextInput('Asset Prefix', 'companyAssetPrefix', 'setCompanyAssetPrefix')}
${buildTextInput('Vehicle Prefix', 'companyVehiclePrefix', 'setCompanyVehiclePrefix')}
${buildTextInput('Employee Prefix', 'companyEmployeePrefix', 'setCompanyEmployeePrefix')}
${buildTextInput('Trade License Alert Days', 'companyTradeLicenseAlertDays', 'setCompanyTradeLicenseAlertDays', 'keyboardType="numeric"')}
${buildTextInput('Establishment Card Alert Days', 'companyEstablishmentCardAlertDays', 'setCompanyEstablishmentCardAlertDays', 'keyboardType="numeric"')}
${buildTextInput('Insurance Alert Days', 'companyInsuranceAlertDays', 'setCompanyInsuranceAlertDays', 'keyboardType="numeric"')}
                      </>
                    )}
`;

const wizardHeader = `
                    {/* Wizard Header Progress */}
                    <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 }}>
                        Step {companyWizardStep} of 6
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {companyWizardStep === 1 && 'Basic Information'}
                        {companyWizardStep === 2 && 'License Details'}
                        {companyWizardStep === 3 && 'Contact & Address'}
                        {companyWizardStep === 4 && 'Tax, Labor & Establishment'}
                        {companyWizardStep === 5 && 'Signatory & Banking'}
                        {companyWizardStep === 6 && 'Configuration & Alerts'}
                      </Text>
                      {/* Progress Bar */}
                      <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: \`\${(companyWizardStep / 6) * 100}%\`, backgroundColor: COLORS.primary, borderRadius: 2 }} />
                      </View>
                    </View>
`;

const modalFormBody = `                    <View style={styles.modalForm}>
${wizardHeader}
${step1}
${step2}
${step3}
${step4}
${step5}
${step6}
                    </View>`;

const modalFooter = `                  {/* Modal Footer Controls */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => {
                        setIsCompanyModalOpen(false);
                      }}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {companyWizardStep > 1 && (
                        <TouchableOpacity
                          style={[styles.modalCancelBtn, { backgroundColor: '#F1F5F9', borderWidth: 0, paddingHorizontal: 16 }]}
                          onPress={() => setCompanyWizardStep(prev => prev - 1)}
                        >
                          <Text style={[styles.modalCancelText, { color: '#64748B' }]}>Previous</Text>
                        </TouchableOpacity>
                      )}
                      
                      {companyWizardStep < 6 ? (
                        <TouchableOpacity
                          style={styles.modalSaveBtn}
                          onPress={() => setCompanyWizardStep(prev => prev + 1)}
                        >
                          <Text style={styles.modalSaveText}>Next Step</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.modalSaveBtn}
                          onPress={handleSaveCompany}
                        >
                          <Text style={styles.modalSaveText}>Save Company</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>`;

// Now find the modal block and replace it
// Since it's huge, I'll extract from <View style={styles.modalForm}> to </View> \n </ScrollView> \n {/* Modal Footer Controls */} ... </View>

// First, find the exact start and end in the current content
const companyModalStartStr = '{/* ADD/EDIT COMPANY MODAL OVERLAY */}';
const companyModalStartIdx = content.indexOf(companyModalStartStr);

const modalFormStart = content.indexOf('<View style={styles.modalForm}>', companyModalStartIdx);

// The footer ends right before the closing of the modal card
// Let's find "Save Company</Text>"
const saveCompanyTextIdx = content.indexOf('Save Company</Text>', modalFormStart);
const closingFooterTags = '                    </TouchableOpacity>\n                  </View>';
const footerEndIdx = content.indexOf(closingFooterTags, saveCompanyTextIdx) + closingFooterTags.length;

if (modalFormStart > -1 && footerEndIdx > -1) {
  content = content.substring(0, modalFormStart) + modalFormBody + '\n                  </ScrollView>\n\n' + modalFooter + content.substring(footerEndIdx);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Wizard modifications applied successfully');
} else {
  console.log('Could not find modal body block', modalFormStart, footerEndIdx);
}
