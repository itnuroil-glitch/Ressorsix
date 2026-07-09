const employeeController = require('./src/controllers/employeeController');

const req = {
  body: {
    full_name: 'Test Controller Employee',
    email: 'vishnupriya@nurac.com',
    phone: '123456',
    roleid: 4,
    status: 1,
    clientid: 6,
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

console.log('Invoking createEmployee controller directly...');
employeeController.createEmployee(req, res).catch(err => {
  console.error('Unhandled Controller Error:', err);
  process.exit(1);
});
