const db = require('../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

exports.getAllEmployees = async (req, res) => {
  try {
    const { clientid } = req.query;

    let queryText = `
      SELECT e.*, 
             (SELECT string_agg(role, ', ') FROM role WHERE id = ANY(string_to_array(e.roleid::text, ',')::int[])) as role_name, 
             d.department_name
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.id
      WHERE e.is_deleted = false
    `;
    const params = [];

    if (clientid) {
      queryText += ` AND e.clientid = $1`;
      params.push(clientid);
    }

    queryText += ` ORDER BY e.id DESC`;

    const result = await db.query(queryText, params);

    // Fetch associated companies for each employee
    if (result.rows.length > 0) {
      const empIds = result.rows.map(row => row.id);
      const companiesQuery = `
        SELECT ec.employee_id, c.id, c.company_name, c.short_code
        FROM employee_company ec
        JOIN company c ON ec.company_id = c.id
        WHERE ec.employee_id = ANY($1)
      `;
      const companiesResult = await db.query(companiesQuery, [empIds]);

      const compMap = {};
      companiesResult.rows.forEach(row => {
        if (!compMap[row.employee_id]) compMap[row.employee_id] = [];
        compMap[row.employee_id].push({
          id: row.id,
          company_name: row.company_name,
          short_code: row.short_code
        });
      });

      result.rows.forEach(row => {
        row.companies = compMap[row.id] || [];
      });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createEmployee = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      full_name,
      email,
      phone,
      roleid,
      status,
      clientid,
      department_id,
      companies,
      auto_generate_password
    } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ message: 'Full name and email are required.' });
    }

    const finalRoleId = roleid ? (Array.isArray(roleid) ? roleid.join(',') : String(roleid)) : null;

    await client.query('BEGIN');

    // Create the employee
    const insertEmployee = `
      INSERT INTO employee (full_name, email, phone, roleid, status, clientid, department_id, is_deleted)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *
    `;
    const empResult = await client.query(insertEmployee, [
      full_name,
      email,
      phone,
      finalRoleId,
      status !== undefined ? parseInt(status) : 1,
      clientid ? parseInt(clientid) : null,
      department_id ? parseInt(department_id) : null
    ]);
    const newEmployee = empResult.rows[0];

    // Associate companies
    if (companies && Array.isArray(companies) && companies.length > 0) {
      for (const compId of companies) {
        await client.query(
          'INSERT INTO employee_company (employee_id, company_id) VALUES ($1, $2)',
          [newEmployee.id, compId]
        );
      }
    }

    // Generate user account if security is on
    if (auto_generate_password) {
      // Check if user exists
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      if (userCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO users (email, password, roleid, clientid) VALUES ($1, $2, $3, $4)',
          [email, hashedPassword, finalRoleId, clientid ? parseInt(clientid) : null]
        );
      } else {
        await client.query(
          'UPDATE users SET password = $1, roleid = $2, clientid = $3 WHERE email = $4',
          [hashedPassword, finalRoleId, clientid ? parseInt(clientid) : null, email]
        );
      }
      newEmployee.tempPassword = tempPassword; // Return it so admin can give it to the user

      // Send email with the generated password if clientid is present
      if (clientid) {
        try {
          const { sendEmail } = require('../config/mailer');
          await sendEmail({
            to: email,
            subject: `Welcome to the team, ${full_name}!`,
            text: `Hello ${full_name},\n\nWelcome to our team portal. Your user account has been successfully initialized.\n\nTo log in, please use the details below:\nPortal Login Email: ${email}\nSecurity Key: ${tempPassword}\n\nPlease remember to change your password upon your first login.\n\nWarm regards,\nSystem Administrator`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Welcome to the team, ${full_name}!</h2>
                <p>Your user portal account has been successfully set up.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #475569;">Login Information:</p>
                  <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0 0 0;"><strong>One-time Passkey:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${tempPassword}</code></p>
                </div>
                <p style="color: #64748b; font-size: 13px;">For security reasons, you will be prompted to update this password upon your first sign-in.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated security notification.</p>
              </div>
            `,
            clientid: clientid
          });
        } catch (err) {
          console.error('Error sending password email to employee:', err);
          try { require('fs').writeFileSync('smtp_error.log', 'CREATE ERROR: ' + (err.stack || err.message || String(err))); } catch(e){}
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json(newEmployee);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating employee:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

exports.updateEmployee = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      roleid,
      status,
      department_id,
      companies,
      auto_generate_password
    } = req.body;

    const finalRoleId = roleid ? (Array.isArray(roleid) ? roleid.join(',') : String(roleid)) : null;

    await client.query('BEGIN');

    const updateEmployee = `
      UPDATE employee
      SET full_name = COALESCE($1, full_name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          roleid = $4,
          status = COALESCE($5, status),
          department_id = $6
      WHERE id = $7 AND is_deleted = false
      RETURNING *
    `;
    const empResult = await client.query(updateEmployee, [
      full_name,
      email,
      phone,
      finalRoleId,
      status !== undefined ? parseInt(status) : null,
      department_id ? parseInt(department_id) : null,
      id
    ]);

    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const updatedEmployee = empResult.rows[0];

    // Update associated companies
    if (companies && Array.isArray(companies)) {
      await client.query('DELETE FROM employee_company WHERE employee_id = $1', [id]);
      for (const compId of companies) {
        await client.query(
          'INSERT INTO employee_company (employee_id, company_id) VALUES ($1, $2)',
          [id, compId]
        );
      }
    }

    // Check if a user account exists for this email
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [updatedEmployee.email]);
    if (userCheck.rows.length === 0 || auto_generate_password) {
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      if (userCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO users (email, password, roleid, clientid) VALUES ($1, $2, $3, $4)',
          [
            updatedEmployee.email,
            hashedPassword,
            updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
            updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null
          ]
        );
      } else {
        await client.query(
          'UPDATE users SET password = $1, roleid = $2, clientid = $3 WHERE email = $4',
          [
            hashedPassword,
            updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
            updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null,
            updatedEmployee.email
          ]
        );
      }
      updatedEmployee.tempPassword = tempPassword;

      // Send email with the generated password if clientid is present
      if (updatedEmployee.clientid) {
        try {
          const { sendEmail } = require('../config/mailer');
          await sendEmail({
            to: updatedEmployee.email,
            subject: `Welcome to the team, ${updatedEmployee.full_name}!`,
            text: `Hello ${updatedEmployee.full_name},\n\nWelcome to our team portal. Your user account has been successfully initialized.\n\nTo log in, please use the details below:\nPortal Login Email: ${updatedEmployee.email}\nSecurity Key: ${tempPassword}\n\nPlease remember to change your password upon your first login.\n\nWarm regards,\nSystem Administrator`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0f172a;">Welcome to the team, ${updatedEmployee.full_name}!</h2>
                <p>Your user portal account has been successfully set up.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #475569;">Login Information:</p>
                  <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${updatedEmployee.email}</p>
                  <p style="margin: 5px 0 0 0;"><strong>One-time Passkey:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${tempPassword}</code></p>
                </div>
                <p style="color: #64748b; font-size: 13px;">For security reasons, you will be prompted to update this password upon your first sign-in.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated security notification.</p>
              </div>
            `,
            clientid: updatedEmployee.clientid
          });
        } catch (err) {
          console.error('Error sending password email to employee on update:', err);
          try { require('fs').writeFileSync('smtp_error.log', 'UPDATE ERROR: ' + (err.stack || err.message || String(err))); } catch(e){}
        }
      }
    } else {
      // ALWAYS sync the roleid and clientid in users table when employee is updated
      await client.query(
        'UPDATE users SET roleid = $1, clientid = $2 WHERE email = $3',
        [
          updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
          updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null,
          updatedEmployee.email
        ]
      );
    }

    await client.query('COMMIT');
    res.status(200).json(updatedEmployee);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE employee SET is_deleted = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee soft deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.bulkImportEmployees = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { employees, clientid } = req.body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: 'No employee records found in payload.' });
    }

    await client.query('BEGIN');

    let count = 0;
    for (const emp of employees) {
      const {
        full_name,
        email,
        phone,
        roleid,
        status,
        department_id,
        companies,
        auto_generate_password = true
      } = emp;

      if (!full_name || !email) continue;

      const finalClientId = emp.clientid ? parseInt(emp.clientid) : (clientid ? parseInt(clientid) : null);
      const finalRoleId = roleid ? (Array.isArray(roleid) ? roleid.join(',') : String(roleid)) : null;

      // Insert into employee
      const insertEmp = `
        INSERT INTO employee (full_name, email, phone, roleid, status, clientid, department_id, is_deleted)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        RETURNING *
      `;
      const empRes = await client.query(insertEmp, [
        full_name,
        email,
        phone || '',
        finalRoleId,
        status !== undefined ? parseInt(status) : 1,
        finalClientId,
        department_id ? parseInt(department_id) : null
      ]);

      const newEmp = empRes.rows[0];

      // Associate companies
      if (companies && Array.isArray(companies) && companies.length > 0) {
        for (const compId of companies) {
          await client.query(
            'INSERT INTO employee_company (employee_id, company_id) VALUES ($1, $2)',
            [newEmp.id, parseInt(compId)]
          );
        }
      }

      // Generate user account if requested
      if (auto_generate_password) {
        const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        if (userCheck.rows.length === 0) {
          await client.query(
            'INSERT INTO users (email, password, roleid, clientid) VALUES ($1, $2, $3, $4)',
            [email, hashedPassword, finalRoleId, finalClientId]
          );
        } else {
          await client.query(
            'UPDATE users SET password = $1, roleid = $2, clientid = $3 WHERE email = $4',
            [hashedPassword, finalRoleId, finalClientId, email]
          );
        }
      }

      count++;
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Bulk employee import successful', importedCount: count });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk importing employees:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  } finally {
    client.release();
  }
};

