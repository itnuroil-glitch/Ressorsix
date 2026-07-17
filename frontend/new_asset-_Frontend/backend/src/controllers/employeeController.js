const db = require('../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

exports.getAllEmployees = async (req, res) => {
  try {
    const { clientid } = req.query;

    let queryText = `
      SELECT e.*, r.role as role_name, d.department_name
      FROM employee e
      LEFT JOIN role r ON e.roleid = r.id
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
      roleid ? parseInt(roleid) : null,
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
      if (userCheck.rows.length === 0) {
        // Generate a random temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        await client.query(
          'INSERT INTO users (email, password, roleid, clientid) VALUES ($1, $2, $3, $4)',
          [email, hashedPassword, roleid ? parseInt(roleid) : null, clientid ? parseInt(clientid) : null]
        );
        newEmployee.tempPassword = tempPassword; // Return it so admin can give it to the user

        // Send email with the generated password if clientid is present
        if (clientid) {
          try {
            const clientUserRes = await client.query('SELECT id FROM users WHERE clientid = $1 ORDER BY id ASC LIMIT 1', [clientid]);
            if (clientUserRes.rows.length > 0) {
              const clientUserId = clientUserRes.rows[0].id;
              const smtpRes = await client.query('SELECT * FROM smtp_configuration WHERE userid = $1 AND is_deleted = false AND status = 1 LIMIT 1', [clientUserId]);
              if (smtpRes.rows.length > 0) {
                const smtpConfig = smtpRes.rows[0];
                const transporter = nodemailer.createTransport({
                  host: smtpConfig.smtp_host,
                  port: smtpConfig.smtp_port,
                  secure: smtpConfig.smtp_port === 465,
                  auth: { user: smtpConfig.smtp_usename, pass: smtpConfig.smtp_password }
                });
                const mailOptions = {
                  from: `"${smtpConfig.from_name || 'System'}" <${smtpConfig.from_email || smtpConfig.smtp_usename}>`,
                  to: email,
                  subject: 'Your New Employee Account Credentials',
                  text: `Hello ${full_name},\n\nYour employee account has been created successfully.\n\nYour temporary login credentials are:\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and update your password.\n\nBest regards,\nSystem Administrator`
                };
                await transporter.sendMail(mailOptions);
                console.log('Password email sent to employee:', email);
              }
            }
          } catch (err) {
            console.error('Error sending password email to employee:', err);
          }
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
      companies
    } = req.body;

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
      roleid ? parseInt(roleid) : null,
      status !== undefined ? parseInt(status) : null,
      department_id ? parseInt(department_id) : null,
      id
    ]);

    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Employee not found.' });
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

    await client.query('COMMIT');
    res.status(200).json(empResult.rows[0]);
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
