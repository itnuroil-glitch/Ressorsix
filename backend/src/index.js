const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const roleRoutes = require('./routes/roleRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const smtpRoutes = require('./routes/smtpRoutes');
const clientRoutes = require('./routes/clientRoutes');
const countryRoutes = require('./routes/countryRoutes');
const stateRoutes = require('./routes/stateRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const customFieldRoutes = require('./routes/customFieldRoutes');
const fieldPermissionRoutes = require('./routes/fieldPermissionRoutes');
const vehicleInsuranceRoutes = require('./routes/vehicleInsuranceRoutes');
const vehicleDetailsRoutes = require('./routes/vehicleDetailsRoutes');
const vehiclePurchaseRoutes = require('./routes/vehiclePurchaseRoutes');
const vehicleTollRoutes = require('./routes/vehicleTollRoutes');
const premisesDetailsRoutes = require('./routes/premisesDetailsRoutes');
const premisesTypeRoutes = require('./routes/premisesTypeRoutes');
const assetDetailsRoutes = require('./routes/assetDetailsRoutes');
const assetCategoryRoutes = require('./routes/assetCategoryRoutes');
const assetBrandRoutes = require('./routes/assetBrandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const uomRoutes = require('./routes/uomRoutes');
const vatRoutes = require('./routes/vatRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const planRoutes = require('./routes/planRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL === '*') {
      return callback(null, true);
    }
    const allowedOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

// Serve static attachment & upload files
app.use('/upload', express.static(path.join(__dirname, '../upload')));
app.use('/backend/upload', express.static(path.join(__dirname, '../upload')));
app.use('/Attachment', express.static(path.join(__dirname, '../Attachment')));
app.use('/backend/Attachment', express.static(path.join(__dirname, '../Attachment')));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Base health check route
app.get('/', (req, res) => {
  res.json({
    status: 'Healthy',
    message: 'Trakio Backend Service is active and running.',
    timestamp: new Date()
  });
});

// Mounting authentication routes
app.use('/api/auth', authRoutes);

// Mounting module CRUD routes
app.use('/api/modules', moduleRoutes);

// Mounting role permission routes
const permissionRoutes = require('./routes/permissionRoutes');
app.use('/api/roles/:roleId/permissions', permissionRoutes);

// Mounting role CRUD routes
app.use('/api/roles', roleRoutes);

// Mounting department CRUD routes
app.use('/api/departments', departmentRoutes);

// Mounting company CRUD routes
app.use('/api/companies', companyRoutes);
app.use('/api/company/view/all', companyRoutes);
app.use('/api/company', companyRoutes);

// Mounting SMTP CRUD routes
app.use('/api/smtp', smtpRoutes);

// Mounting client CRUD routes
app.use('/api/clients', clientRoutes);
app.use('/api/client/view/all', clientRoutes);
app.use('/api/client', clientRoutes);

// Mounting country CRUD routes
app.use('/api/countries', countryRoutes);

// Mounting state CRUD routes
app.use('/api/states', stateRoutes);

// Mounting employee CRUD routes
app.use('/api/employees', employeeRoutes);

// Mounting custom fields CRUD routes
app.use('/api/custom-fields', customFieldRoutes);

// Mounting field permissions CRUD routes
app.use('/api/field-permissions', fieldPermissionRoutes);
app.use('/api/vehicle-insurance', vehicleInsuranceRoutes);
app.use('/api/vehicleInsurance', vehicleInsuranceRoutes);
const vehicleMaintenanceRoutes = require('./routes/vehicleMaintenanceRoutes');
app.use('/api/vehicle-maintenance', vehicleMaintenanceRoutes);
app.use('/api/vehicleMaintenance', vehicleMaintenanceRoutes);
app.use('/api/vehicle-details', vehicleDetailsRoutes);
app.use('/api/vehicle-purchase', vehiclePurchaseRoutes);
app.use('/api/vehile-purchase', vehiclePurchaseRoutes);
app.use('/api/vehicle-toll', vehicleTollRoutes);
app.use('/api/vehile-toll', vehicleTollRoutes);
const serviceDetailsRoutes = require('./routes/serviceDetailsRoutes');
app.use('/api/service-details', serviceDetailsRoutes);
app.use('/api/serviceDetails', serviceDetailsRoutes);
app.use('/api/service-detail', serviceDetailsRoutes);
app.use('/api/serviceDetail', serviceDetailsRoutes);
const tollOverviewRoutes = require('./routes/tollOverviewRoutes');
app.use('/api/vehicle-toll-overview', tollOverviewRoutes);
app.use('/api/toll-overview', tollOverviewRoutes);
const tollTransactionRoutes = require('./routes/tollTransactionRoutes');
app.use('/api/vehicle-toll-transaction', tollTransactionRoutes);
app.use('/api/vehicle-toll-transactions', tollTransactionRoutes);
app.use('/api/toll-transactions', tollTransactionRoutes);
app.use('/api/toll-transaction', tollTransactionRoutes);
const tollGateRoutes = require('./routes/tollGateRoutes');
app.use('/api/toll-gate', tollGateRoutes);
app.use('/api/toll-gates', tollGateRoutes);
app.use('/api/premises-details', premisesDetailsRoutes);
app.use('/api/premises-types', premisesTypeRoutes);
app.use('/api/asset-details', assetDetailsRoutes);
app.use('/api/asset-categories', assetCategoryRoutes);
app.use('/api/asset-brands', assetBrandRoutes);
const assetOpeningRoutes = require('./routes/assetOpeningRoutes');
app.use('/api/asset-opening', assetOpeningRoutes);
const assetAssignmentRoutes = require('./routes/assetAssignmentRoutes');
app.use('/api/asset-assignment', assetAssignmentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/uom', uomRoutes);
app.use('/api/vat', vatRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/plans', planRoutes);
const simPlanRoutes = require('./routes/simPlanRoutes');
app.use('/api/sim-plans', simPlanRoutes);
app.use('/api/sim-plan', simPlanRoutes);
const telecomProviderRoutes = require('./routes/telecomProviderRoutes');
app.use('/api/telecom-providers', telecomProviderRoutes);
app.use('/api/telecom-provider', telecomProviderRoutes);
app.use('/api/telecome-providers', telecomProviderRoutes);
app.use('/api/telecome-provider', telecomProviderRoutes);
const teleCategoryRoutes = require('./routes/teleCategoryRoutes');
app.use('/api/tele-categories', teleCategoryRoutes);
app.use('/api/tele-category', teleCategoryRoutes);
app.use('/api/telecome-categories', teleCategoryRoutes);
app.use('/api/telecome-category', teleCategoryRoutes);
const teleChargeTypeRoutes = require('./routes/teleChargeTypeRoutes');
app.use('/api/tele-charge-types', teleChargeTypeRoutes);
app.use('/api/tele-charge-types.', teleChargeTypeRoutes);
app.use('/api/tele-charge-type', teleChargeTypeRoutes);
app.use('/api/telecome-charge-types', teleChargeTypeRoutes);
app.use('/api/telecome-charge-type', teleChargeTypeRoutes);
const simDetailsRoutes = require('./routes/simDetailsRoutes');
app.use('/api/sim-details', simDetailsRoutes);
app.use('/api/sim-detail', simDetailsRoutes);
const telecomDataRoutes = require('./routes/telecomDataRoutes');
app.use('/api/telecom-data', telecomDataRoutes);
app.use('/api/telecome-data', telecomDataRoutes);
const telecomBillRoutes = require('./routes/telecomBillRoutes');
app.use('/api/telecom-bills', telecomBillRoutes);
app.use('/api/telecom-bill', telecomBillRoutes);
app.use('/api/telecome-bills', telecomBillRoutes);
app.use('/api/telecome-bill', telecomBillRoutes);
const usageChargeRoutes = require('./routes/usageChargeRoutes');
app.use('/api/usage-charges', usageChargeRoutes);
app.use('/api/usage-charge', usageChargeRoutes);
app.use('/api/tele-usage-charges', usageChargeRoutes);
app.use('/api/tele-usage-charge', usageChargeRoutes);
const teleDocumentRoutes = require('./routes/teleDocumentRoutes');
app.use('/api/tele-documents', teleDocumentRoutes);
app.use('/api/tele-document', teleDocumentRoutes);
app.use('/api/telecom-documents', teleDocumentRoutes);
app.use('/api/telecom-document', teleDocumentRoutes);
const teleDocTypeRoutes = require('./routes/teleDocTypeRoutes');
app.use('/api/tele-doc-types', teleDocTypeRoutes);
app.use('/api/tele-doc-types.', teleDocTypeRoutes);
app.use('/api/tele-doc-type', teleDocTypeRoutes);
app.use('/api/tele-document-types', teleDocTypeRoutes);
const companyLegalFormRoutes = require('./routes/companyLegalFormRoutes');
app.use('/api/company-legal-forms', companyLegalFormRoutes);
app.use('/api/company-legal-form', companyLegalFormRoutes);
app.use('/api/company-legal-forms.', companyLegalFormRoutes);
const companyLicenseAuthRoutes = require('./routes/companyLicenseAuthRoutes');
app.use('/api/company-license-auth', companyLicenseAuthRoutes);
app.use('/api/company-license-authorities', companyLicenseAuthRoutes);
app.use('/api/company-license-auth.', companyLicenseAuthRoutes);
const companyDefCurrencyRoutes = require('./routes/companyDefCurrencyRoutes');
app.use('/api/company-def-currency', companyDefCurrencyRoutes);
app.use('/api/company-default-currencies', companyDefCurrencyRoutes);
app.use('/api/company-def-currencies', companyDefCurrencyRoutes);
const pdfParserRoutes = require('./routes/pdfParserRoutes');
app.use('/api/pdf', pdfParserRoutes);
app.use('/api', pdfParserRoutes);
const systemSettingRoutes = require('./routes/systemSettingRoutes');
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/system-setting', systemSettingRoutes);
// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong on the server!',
    error: err.message || String(err),
    stack: err.stack
  });
});

// Launch server
app.listen(PORT, () => {
  console.log(`Trakio Server is running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}`);
});
