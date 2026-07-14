const fs = require('fs');
const path = 'c:/asset-nuroil-main/asset-nuroil-main/frontend/src/components/DashboardScreen.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Add State Variables
const stateRegex = /const \[companyStatus, setCompanyStatus\] = useState\('Active'\);/;
const additionalStates = `
  const [companyLegalForm, setCompanyLegalForm] = useState('');
  const [companyBusinessActivity, setCompanyBusinessActivity] = useState('');
  const [companyJurisdiction, setCompanyJurisdiction] = useState('');
  const [companyLicensingAuthority, setCompanyLicensingAuthority] = useState('');
  const [companyTradeLicenseNumber, setCompanyTradeLicenseNumber] = useState('');
  const [companyTradeLicenseIssueDate, setCompanyTradeLicenseIssueDate] = useState('');
  const [companyTradeLicenseExpiryDate, setCompanyTradeLicenseExpiryDate] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyEmirate, setCompanyEmirate] = useState('');
  const [companyRegisteredAddress, setCompanyRegisteredAddress] = useState('');
  const [companyPoBox, setCompanyPoBox] = useState('');
  const [companyContactPerson, setCompanyContactPerson] = useState('');
  const [companyContactEmail, setCompanyContactEmail] = useState('');
  const [companyContactPhone, setCompanyContactPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyVatRegistered, setCompanyVatRegistered] = useState(false);
  const [companyTrn, setCompanyTrn] = useState('');
  const [companyCorporateTaxRegistrationNumber, setCompanyCorporateTaxRegistrationNumber] = useState('');
  const [companyEstablishmentCardNumber, setCompanyEstablishmentCardNumber] = useState('');
  const [companyEstablishmentCardExpiryDate, setCompanyEstablishmentCardExpiryDate] = useState('');
  const [companyMohreNumber, setCompanyMohreNumber] = useState('');
  const [companyWpsRegistered, setCompanyWpsRegistered] = useState(false);
  const [companyNafisEmiratisationApplicable, setCompanyNafisEmiratisationApplicable] = useState(false);
  const [companyGpssaApplicable, setCompanyGpssaApplicable] = useState(false);
  const [companyAuthorizedSignatoryName, setCompanyAuthorizedSignatoryName] = useState('');
  const [companyAuthorizedSignatoryDesignation, setCompanyAuthorizedSignatoryDesignation] = useState('');
  const [companyDefaultBank, setCompanyDefaultBank] = useState('');
  const [companyDefaultCurrency, setCompanyDefaultCurrency] = useState('');
  const [companyAssetPrefix, setCompanyAssetPrefix] = useState('');
  const [companyVehiclePrefix, setCompanyVehiclePrefix] = useState('');
  const [companyEmployeePrefix, setCompanyEmployeePrefix] = useState('');
  const [companyTradeLicenseAlertDays, setCompanyTradeLicenseAlertDays] = useState('30');
  const [companyEstablishmentCardAlertDays, setCompanyEstablishmentCardAlertDays] = useState('30');
  const [companyInsuranceAlertDays, setCompanyInsuranceAlertDays] = useState('30');
`;
content = content.replace(stateRegex, "$&\n" + additionalStates);

// 2. Add to startEditCompany
const startEditRegex = /setCompanyStatus\(item\.company_status \|\| 'Active'\);/;
const startEditAdditions = `
    setCompanyLegalForm(item.legal_form || '');
    setCompanyBusinessActivity(item.business_activity || '');
    setCompanyJurisdiction(item.jurisdiction || '');
    setCompanyLicensingAuthority(item.licensing_authority || '');
    setCompanyTradeLicenseNumber(item.trade_license_number || '');
    setCompanyTradeLicenseIssueDate(item.trade_license_issue_date ? item.trade_license_issue_date.split('T')[0] : '');
    setCompanyTradeLicenseExpiryDate(item.trade_license_expiry_date ? item.trade_license_expiry_date.split('T')[0] : '');
    setCompanyCountry(item.country || '');
    setCompanyEmirate(item.emirate || '');
    setCompanyRegisteredAddress(item.registered_address || '');
    setCompanyPoBox(item.po_box || '');
    setCompanyContactPerson(item.contact_person || '');
    setCompanyContactEmail(item.contact_email || '');
    setCompanyContactPhone(item.contact_phone || '');
    setCompanyWebsite(item.website || '');
    setCompanyVatRegistered(!!item.vat_registered);
    setCompanyTrn(item.trn || '');
    setCompanyCorporateTaxRegistrationNumber(item.corporate_tax_registration_number || '');
    setCompanyEstablishmentCardNumber(item.establishment_card_number || '');
    setCompanyEstablishmentCardExpiryDate(item.establishment_card_expiry_date ? item.establishment_card_expiry_date.split('T')[0] : '');
    setCompanyMohreNumber(item.mohre_number || '');
    setCompanyWpsRegistered(!!item.wps_registered);
    setCompanyNafisEmiratisationApplicable(!!item.nafis_emiratisation_applicable);
    setCompanyGpssaApplicable(!!item.gpssa_applicable);
    setCompanyAuthorizedSignatoryName(item.authorized_signatory_name || '');
    setCompanyAuthorizedSignatoryDesignation(item.authorized_signatory_designation || '');
    setCompanyDefaultBank(item.default_bank || '');
    setCompanyDefaultCurrency(item.default_currency || '');
    setCompanyAssetPrefix(item.asset_prefix || '');
    setCompanyVehiclePrefix(item.vehicle_prefix || '');
    setCompanyEmployeePrefix(item.employee_prefix || '');
    setCompanyTradeLicenseAlertDays(item.trade_license_alert_days ? String(item.trade_license_alert_days) : '30');
    setCompanyEstablishmentCardAlertDays(item.establishment_card_alert_days ? String(item.establishment_card_alert_days) : '30');
    setCompanyInsuranceAlertDays(item.insurance_alert_days ? String(item.insurance_alert_days) : '30');
`;
content = content.replace(startEditRegex, "$&\n" + startEditAdditions);

// 3. Add to "Add Company" onPress reset
const addPressRegex = /setCompanyStatus\('Active'\);\n([\s]*)setIsCompanyModalOpen\(true\);/;
const addPressAdditions = `
              setCompanyLegalForm('');
              setCompanyBusinessActivity('');
              setCompanyJurisdiction('');
              setCompanyLicensingAuthority('');
              setCompanyTradeLicenseNumber('');
              setCompanyTradeLicenseIssueDate('');
              setCompanyTradeLicenseExpiryDate('');
              setCompanyCountry('');
              setCompanyEmirate('');
              setCompanyRegisteredAddress('');
              setCompanyPoBox('');
              setCompanyContactPerson('');
              setCompanyContactEmail('');
              setCompanyContactPhone('');
              setCompanyWebsite('');
              setCompanyVatRegistered(false);
              setCompanyTrn('');
              setCompanyCorporateTaxRegistrationNumber('');
              setCompanyEstablishmentCardNumber('');
              setCompanyEstablishmentCardExpiryDate('');
              setCompanyMohreNumber('');
              setCompanyWpsRegistered(false);
              setCompanyNafisEmiratisationApplicable(false);
              setCompanyGpssaApplicable(false);
              setCompanyAuthorizedSignatoryName('');
              setCompanyAuthorizedSignatoryDesignation('');
              setCompanyDefaultBank('');
              setCompanyDefaultCurrency('');
              setCompanyAssetPrefix('');
              setCompanyVehiclePrefix('');
              setCompanyEmployeePrefix('');
              setCompanyTradeLicenseAlertDays('30');
              setCompanyEstablishmentCardAlertDays('30');
              setCompanyInsuranceAlertDays('30');
`;
content = content.replace(addPressRegex, (match, p1) => {
    return "setCompanyStatus('Active');\n" + addPressAdditions + p1 + "setIsCompanyModalOpen(true);";
});

// 4. Update payload in handleSaveCompany
const payloadRegex = /company_status: companyStatus,/;
const payloadAdditions = `
      legal_form: companyLegalForm,
      business_activity: companyBusinessActivity,
      jurisdiction: companyJurisdiction,
      licensing_authority: companyLicensingAuthority,
      trade_license_number: companyTradeLicenseNumber,
      trade_license_issue_date: companyTradeLicenseIssueDate || null,
      trade_license_expiry_date: companyTradeLicenseExpiryDate || null,
      country: companyCountry,
      emirate: companyEmirate,
      registered_address: companyRegisteredAddress,
      po_box: companyPoBox,
      contact_person: companyContactPerson,
      contact_email: companyContactEmail,
      contact_phone: companyContactPhone,
      website: companyWebsite,
      vat_registered: companyVatRegistered,
      trn: companyTrn,
      corporate_tax_registration_number: companyCorporateTaxRegistrationNumber,
      establishment_card_number: companyEstablishmentCardNumber,
      establishment_card_expiry_date: companyEstablishmentCardExpiryDate || null,
      mohre_number: companyMohreNumber,
      wps_registered: companyWpsRegistered,
      nafis_emiratisation_applicable: companyNafisEmiratisationApplicable,
      gpssa_applicable: companyGpssaApplicable,
      authorized_signatory_name: companyAuthorizedSignatoryName,
      authorized_signatory_designation: companyAuthorizedSignatoryDesignation,
      default_bank: companyDefaultBank,
      default_currency: companyDefaultCurrency,
      asset_prefix: companyAssetPrefix,
      vehicle_prefix: companyVehiclePrefix,
      employee_prefix: companyEmployeePrefix,
      trade_license_alert_days: parseInt(companyTradeLicenseAlertDays) || 30,
      establishment_card_alert_days: parseInt(companyEstablishmentCardAlertDays) || 30,
      insurance_alert_days: parseInt(companyInsuranceAlertDays) || 30,
`;
content = content.replace(payloadRegex, "$&\n" + payloadAdditions);


// 5. Append JSX fields
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

const jsxRegex = /(<\/\s*View>\s*<\/\s*ScrollView>\s*<\!-- Modal Footer Controls -->)/;
content = content.replace(jsxRegex, appendedJSX + "\n$1");

fs.writeFileSync(path, content, 'utf8');
console.log('Modifications applied successfully');
