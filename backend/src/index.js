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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend local development (React Native Web, iOS, Android)
app.use(cors());

// Serve static attachment files
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

// Mounting role CRUD routes
app.use('/api/roles', roleRoutes);

// Mounting role permission routes
const permissionRoutes = require('./routes/permissionRoutes');
app.use('/api/roles/:roleId/permissions', permissionRoutes);

// Mounting department CRUD routes
app.use('/api/departments', departmentRoutes);

// Mounting company CRUD routes
app.use('/api/companies', companyRoutes);

// Mounting SMTP CRUD routes
app.use('/api/smtp', smtpRoutes);

// Mounting client CRUD routes
app.use('/api/clients', clientRoutes);

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
app.use('/api/vehicle-details', vehicleDetailsRoutes);
app.use('/api/vehicle-purchase', vehiclePurchaseRoutes);
app.use('/api/vehile-purchase', vehiclePurchaseRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server!' });
});

// Launch server
app.listen(PORT, () => {
  console.log(`Trakio Server is running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}`);
});
