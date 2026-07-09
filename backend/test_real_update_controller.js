const employeeController = require('./src/controllers/employeeController');

const req = {
  params: {
    id: 13
  },
  body: {
    full_name: 'Updated Test Employee',
    email: 'vishnupriya@nurac.com',
    phone: '987654',
    roleid: 4,
    status: 1,
    department_id: 4,
    companies: [],
    auto_generate_password: true
  }
};

const res = {
  status: function(code) {
    console.log('Response Status:', code);
    return this;
  },
  json: function(data) {
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    process.exit(0);
  }
};

console.log('Invoking updateEmployee controller directly...');
employeeController.updateEmployee(req, res).catch(err => {
  console.error('Unhandled Controller Error:', err);
  process.exit(1);
});
