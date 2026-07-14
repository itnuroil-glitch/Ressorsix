const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

const buildTextInput = (label, stateVar, setter, extra = '') => 
'                      <View style={styles.modalInputGroup}>\n' +
'                        <Text style={styles.modalLabel}>' + label + '</Text>\n' +
'                        <TextInput\n' +
'                          style={styles.modalInput}\n' +
'                          placeholder="' + label + '"\n' +
'                          placeholderTextColor={COLORS.textMuted}\n' +
'                          value={' + stateVar + '}\n' +
'                          onChangeText={' + setter + '}\n' +
'                          ' + extra + '\n' +
'                        />\n' +
'                      </View>\n';

const buildToggle = (label, stateVar, setter) => 
'                      <View style={styles.modalInputGroup}>\n' +
'                        <Text style={styles.modalLabel}>' + label + '</Text>\n' +
'                        <TouchableOpacity\n' +
'                          style={{\n' +
'                            flexDirection: "row",\n' +
'                            alignItems: "center",\n' +
'                            marginTop: 6,\n' +
'                            gap: 12,\n' +
'                            marginBottom: 16,\n' +
'                          }}\n' +
'                          onPress={() => ' + setter + '(prev => !prev)}\n' +
'                          activeOpacity={0.8}\n' +
'                        >\n' +
'                          <View\n' +
'                            style={{\n' +
'                              width: 52,\n' +
'                              height: 28,\n' +
'                              borderRadius: 14,\n' +
'                              backgroundColor: ' + stateVar + ' ? "#10B981" : "#CBD5E1",\n' +
'                              justifyContent: "center",\n' +
'                              paddingHorizontal: 3,\n' +
'                            }}\n' +
'                          >\n' +
'                            <View\n' +
'                              style={{\n' +
'                                width: 22,\n' +
'                                height: 22,\n' +
'                                borderRadius: 11,\n' +
'                                backgroundColor: "#FFFFFF",\n' +
'                                alignSelf: ' + stateVar + ' ? "flex-end" : "flex-start",\n' +
'                                shadowColor: "#000",\n' +
'                                shadowOffset: { width: 0, height: 1 },\n' +
'                                shadowOpacity: 0.2,\n' +
'                                shadowRadius: 1.5,\n' +
'                                elevation: 2,\n' +
'                              }}\n' +
'                            />\n' +
'                          </View>\n' +
'                          <Text style={{ fontSize: 13, fontWeight: "700", color: ' + stateVar + ' ? "#065F46" : "#64748B" }}>\n' +
'                            {' + stateVar + ' ? "Yes" : "No"}\n' +
'                          </Text>\n' +
'                        </TouchableOpacity>\n' +
'                      </View>\n';

const appendedJSX = 
buildTextInput('Legal Form', 'companyLegalForm', 'setCompanyLegalForm') +
buildTextInput('Business Activity', 'companyBusinessActivity', 'setCompanyBusinessActivity') +
buildTextInput('Jurisdiction', 'companyJurisdiction', 'setCompanyJurisdiction') +
buildTextInput('Licensing Authority', 'companyLicensingAuthority', 'setCompanyLicensingAuthority') +
buildTextInput('Trade License Number', 'companyTradeLicenseNumber', 'setCompanyTradeLicenseNumber') +
buildTextInput('Trade License Issue Date', 'companyTradeLicenseIssueDate', 'setCompanyTradeLicenseIssueDate', 'placeholder="YYYY-MM-DD"') +
buildTextInput('Trade License Expiry Date', 'companyTradeLicenseExpiryDate', 'setCompanyTradeLicenseExpiryDate', 'placeholder="YYYY-MM-DD"') +
buildTextInput('Country', 'companyCountry', 'setCompanyCountry') +
buildTextInput('Emirate', 'companyEmirate', 'setCompanyEmirate') +
buildTextInput('Registered Address', 'companyRegisteredAddress', 'setCompanyRegisteredAddress') +
buildTextInput('PO Box', 'companyPoBox', 'setCompanyPoBox') +
buildTextInput('Contact Person', 'companyContactPerson', 'setCompanyContactPerson') +
buildTextInput('Contact Email', 'companyContactEmail', 'setCompanyContactEmail') +
buildTextInput('Contact Phone', 'companyContactPhone', 'setCompanyContactPhone') +
buildTextInput('Website', 'companyWebsite', 'setCompanyWebsite') +
buildToggle('VAT Registered', 'companyVatRegistered', 'setCompanyVatRegistered') +
buildTextInput('TRN', 'companyTrn', 'setCompanyTrn') +
buildTextInput('Corporate Tax Reg. No.', 'companyCorporateTaxRegistrationNumber', 'setCompanyCorporateTaxRegistrationNumber') +
buildTextInput('Establishment Card Number', 'companyEstablishmentCardNumber', 'setCompanyEstablishmentCardNumber') +
buildTextInput('Establishment Card Expiry Date', 'companyEstablishmentCardExpiryDate', 'setCompanyEstablishmentCardExpiryDate', 'placeholder="YYYY-MM-DD"') +
buildTextInput('MOHRE Number', 'companyMohreNumber', 'setCompanyMohreNumber') +
buildToggle('WPS Registered', 'companyWpsRegistered', 'setCompanyWpsRegistered') +
buildToggle('NAFIS Emiratisation Applicable', 'companyNafisEmiratisationApplicable', 'setCompanyNafisEmiratisationApplicable') +
buildToggle('GPSSA Applicable', 'companyGpssaApplicable', 'setCompanyGpssaApplicable') +
buildTextInput('Authorized Signatory Name', 'companyAuthorizedSignatoryName', 'setCompanyAuthorizedSignatoryName') +
buildTextInput('Authorized Signatory Designation', 'companyAuthorizedSignatoryDesignation', 'setCompanyAuthorizedSignatoryDesignation') +
buildTextInput('Default Bank', 'companyDefaultBank', 'setCompanyDefaultBank') +
buildTextInput('Default Currency', 'companyDefaultCurrency', 'setCompanyDefaultCurrency') +
buildTextInput('Asset Prefix', 'companyAssetPrefix', 'setCompanyAssetPrefix') +
buildTextInput('Vehicle Prefix', 'companyVehiclePrefix', 'setCompanyVehiclePrefix') +
buildTextInput('Employee Prefix', 'companyEmployeePrefix', 'setCompanyEmployeePrefix') +
buildTextInput('Trade License Alert Days', 'companyTradeLicenseAlertDays', 'setCompanyTradeLicenseAlertDays', 'keyboardType="numeric"') +
buildTextInput('Establishment Card Alert Days', 'companyEstablishmentCardAlertDays', 'setCompanyEstablishmentCardAlertDays', 'keyboardType="numeric"') +
buildTextInput('Insurance Alert Days', 'companyInsuranceAlertDays', 'setCompanyInsuranceAlertDays', 'keyboardType="numeric"');

// Fix the Regex to match React Native comments {/* ... */}
const jsxRegex = /(<\/\s*View>\s*<\/\s*ScrollView>\s*\{\/\* Modal Footer Controls \*\/})/g;
const matches = [...content.matchAll(jsxRegex)];
if(matches.length > 0) {
  // It will match all modal footer controls. We ONLY want to replace it for the Company Modal.
  // We can locate the company modal by finding where Company Status toggle is, and append right before the ScrollView closes.
  
  const targetRegex = /(<Text style=\{\{.*?\}\s*>\s*\{companyStatus === 'Active' \? 'Active' : 'Inactive'\}\s*<\/Text>\s*<\/View>\s*<\/TouchableOpacity>\s*<\/View>)/;
  
  content = content.replace(targetRegex, "$1\n\n" + appendedJSX);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Modifications applied successfully');
} else {
  console.log('Could not match');
}
