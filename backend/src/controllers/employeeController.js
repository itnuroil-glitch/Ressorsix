const db = require('../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

exports.getAllEmployees = async (req, res) => {
  try {
    const { clientid } = req.query;

    let queryText = `
      SELECT e.*, 
             (SELECT string_agg(role, ', ') FROM role WHERE id = ANY(string_to_array(e.roleid::text, ',')::int[])) as role_name, 
             d.department_name,
             bc.company_name as base_company_name
      FROM employee e
      LEFT JOIN department d ON e.department_id = d.id
      LEFT JOIN company bc ON e.basecompany_id = bc.id
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
      basecompany_id,
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
      INSERT INTO employee (full_name, email, phone, roleid, status, clientid, department_id, basecompany_id, is_deleted)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
      RETURNING *
    `;
    const empResult = await client.query(insertEmployee, [
      full_name,
      email,
      phone,
      finalRoleId,
      status !== undefined ? parseInt(status) : 1,
      clientid ? parseInt(clientid) : null,
      department_id ? parseInt(department_id) : null,
      basecompany_id ? parseInt(basecompany_id) : null
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

      const parsedBaseCompId = basecompany_id ? parseInt(basecompany_id) : null;

      if (userCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO users (email, password, roleid, clientid, companyid) VALUES ($1, $2, $3, $4, $5)',
          [email, hashedPassword, finalRoleId, clientid ? parseInt(clientid) : null, parsedBaseCompId]
        );
      } else {
        await client.query(
          'UPDATE users SET password = $1, roleid = $2, clientid = $3, companyid = $4 WHERE email = $5',
          [hashedPassword, finalRoleId, clientid ? parseInt(clientid) : null, parsedBaseCompId, email]
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
      basecompany_id,
      companies,
      auto_generate_password
    } = req.body;

    const finalRoleId = roleid !== undefined ? (roleid ? (Array.isArray(roleid) ? roleid.join(',') : String(roleid)) : null) : undefined;

    await client.query('BEGIN');

    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    if (full_name !== undefined) { setClauses.push(`full_name = $${paramIndex++}`); params.push(full_name); }
    if (email !== undefined) { setClauses.push(`email = $${paramIndex++}`); params.push(email); }
    if (phone !== undefined) { setClauses.push(`phone = $${paramIndex++}`); params.push(phone); }
    if (finalRoleId !== undefined) { setClauses.push(`roleid = $${paramIndex++}`); params.push(finalRoleId); }
    if (status !== undefined) { setClauses.push(`status = $${paramIndex++}`); params.push(parseInt(status)); }
    if (department_id !== undefined) { setClauses.push(`department_id = $${paramIndex++}`); params.push(department_id ? parseInt(department_id) : null); }
    if (basecompany_id !== undefined) { setClauses.push(`basecompany_id = $${paramIndex++}`); params.push(basecompany_id ? parseInt(basecompany_id) : null); }

    let updatedEmployee;
    if (setClauses.length > 0) {
      params.push(id);
      const updateEmployeeQuery = `
        UPDATE employee
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND is_deleted = false
        RETURNING *
      `;
      const empResult = await client.query(updateEmployeeQuery, params);
      if (empResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Employee not found.' });
      }
      updatedEmployee = empResult.rows[0];
    } else {
      const getEmpResult = await client.query('SELECT * FROM employee WHERE id = $1 AND is_deleted = false', [id]);
      if (getEmpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Employee not found.' });
      }
      updatedEmployee = getEmpResult.rows[0];
    }

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
    const parsedBaseCompId = updatedEmployee.basecompany_id ? parseInt(updatedEmployee.basecompany_id) : null;

    if (userCheck.rows.length === 0 || auto_generate_password) {
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      if (userCheck.rows.length === 0) {
        await client.query(
          'INSERT INTO users (email, password, roleid, clientid, companyid) VALUES ($1, $2, $3, $4, $5)',
          [
            updatedEmployee.email,
            hashedPassword,
            updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
            updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null,
            parsedBaseCompId
          ]
        );
      } else {
        await client.query(
          'UPDATE users SET password = $1, roleid = $2, clientid = $3, companyid = $4 WHERE email = $5',
          [
            hashedPassword,
            updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
            updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null,
            parsedBaseCompId,
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
      // ALWAYS sync the roleid, clientid, and companyid in users table when employee is updated
      await client.query(
        'UPDATE users SET roleid = $1, clientid = $2, companyid = $3 WHERE email = $4',
        [
          updatedEmployee.roleid ? String(updatedEmployee.roleid) : null,
          updatedEmployee.clientid ? parseInt(updatedEmployee.clientid) : null,
          parsedBaseCompId,
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
        basecompany_id,
        companies,
        auto_generate_password = true
      } = emp;

      if (!full_name || !email) continue;

      const finalClientId = emp.clientid ? parseInt(emp.clientid) : (clientid ? parseInt(clientid) : null);
      const finalRoleId = roleid ? (Array.isArray(roleid) ? roleid.join(',') : String(roleid)) : null;

      // Check if employee already exists by email
      const empCheck = await client.query('SELECT id FROM employee WHERE email = $1 AND is_deleted = false', [email]);
      let newEmp;

      const parsedBaseCompId = basecompany_id ? parseInt(basecompany_id) : null;

      if (empCheck.rows.length === 0) {
        const insertEmp = `
          INSERT INTO employee (full_name, email, phone, roleid, status, clientid, department_id, basecompany_id, is_deleted)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
          RETURNING *
        `;
        const empRes = await client.query(insertEmp, [
          full_name,
          email,
          phone || '',
          finalRoleId,
          status !== undefined ? parseInt(status) : 1,
          finalClientId,
          department_id ? parseInt(department_id) : null,
          parsedBaseCompId
        ]);
        newEmp = empRes.rows[0];
      } else {
        newEmp = empCheck.rows[0];
        await client.query(`
          UPDATE employee
          SET full_name = COALESCE($1, full_name),
              phone = COALESCE($2, phone),
              roleid = COALESCE($3, roleid),
              status = COALESCE($4, status),
              department_id = COALESCE($5, department_id),
              basecompany_id = COALESCE($6, basecompany_id)
          WHERE id = $7
        `, [
          full_name,
          phone || null,
          finalRoleId,
          status !== undefined ? parseInt(status) : null,
          department_id ? parseInt(department_id) : null,
          parsedBaseCompId,
          newEmp.id
        ]);
      }

      // Associate companies (including basecompany_id) into employee_company
      const allCompIds = [...new Set([
        ...(parsedBaseCompId ? [parsedBaseCompId] : []),
        ...(companies && Array.isArray(companies) ? companies.map(c => parseInt(c)).filter(Boolean) : [])
      ])];

      for (const compId of allCompIds) {
        const compCheck = await client.query(
          'SELECT employee_id FROM employee_company WHERE employee_id = $1 AND company_id = $2',
          [newEmp.id, compId]
        );
        if (compCheck.rows.length === 0) {
          await client.query(
            'INSERT INTO employee_company (employee_id, company_id) VALUES ($1, $2)',
            [newEmp.id, compId]
          );
        }
      }

      // Generate or update user account
      if (auto_generate_password) {
        const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        if (userCheck.rows.length === 0) {
          await client.query(
            'INSERT INTO users (email, password, roleid, clientid, companyid) VALUES ($1, $2, $3, $4, $5)',
            [email, hashedPassword, finalRoleId, finalClientId, parsedBaseCompId]
          );
        } else {
          await client.query(
            'UPDATE users SET roleid = COALESCE($1, roleid), clientid = COALESCE($2, clientid), companyid = COALESCE($3, companyid) WHERE email = $4',
            [finalRoleId, finalClientId, parsedBaseCompId, email]
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

