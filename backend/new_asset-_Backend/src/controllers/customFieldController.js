const db = require('../config/db');

exports.getAllCustomFields = async (req, res) => {
  try {
    const query = `
      SELECT cf.id, cf.clientid, cf.moduleid, cf.country_id as countryid, cf.status, cf.isdelete, cf.created_at, cf.field_data,
             c.client_name, m.module_name, co.name as country_name
      FROM tbl_customfields cf
      LEFT JOIN client c ON cf.clientid = c.id
      LEFT JOIN module m ON cf.moduleid = m.id
      LEFT JOIN country co ON cf.country_id = co.id
      WHERE cf.isdelete = false
      ORDER BY cf.id DESC
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ message: 'Error fetching custom fields' });
  }
};

exports.createCustomField = async (req, res) => {
  try {
    const { clientid, moduleid, countryid, status, field_data } = req.body;

    // 1. Insert into tbl_customfields
    const query = `
      INSERT INTO tbl_customfields (clientid, moduleid, country_id, status, field_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [clientid, moduleid, countryid, status || 'Active', field_data ? JSON.stringify(field_data) : '[]']);
    const customField = result.rows[0];
    const custom_fieldsid = customField.id;

    // 2. Parse field_data and insert into tbl_customfield_details and tbl_customfieldsvalues
    if (Array.isArray(field_data)) {
      for (const section of field_data) {
        for (const field of section.fields || []) {
          const fQuery = `
            INSERT INTO tbl_customfield_details 
            (custom_fieldsid, section_id, section_name, field_id, field_name, field_type, is_required, is_active, sort_order, options, allow_multiple)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;
          const fRes = await db.query(fQuery, [
            custom_fieldsid, section.id, section.name, field.id, field.name, field.type,
            field.isRequired || false, field.isActive !== false, parseInt(field.sort || 0, 10),
            field.options || null, field.allowMultiple || false
          ]);
          const fieldDetailsId = fRes.rows[0].id;

          // Insert individual comma-separated options into tbl_customfieldsvalues
          if (field.options && typeof field.options === 'string') {
            const optionsArr = field.options.split(',').map(opt => opt.trim()).filter(Boolean);
            for (const opt of optionsArr) {
              await db.query(`INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)`, [custom_fieldsid, fieldDetailsId, opt]);
            }
          }

          for (const sub of field.subsections || []) {
            const subQuery = `
              INSERT INTO tbl_subsection 
              (custom_fieldsid, section_id, parent_fieldid, subsection_id, subsection_name, is_active, sort_order, trigger_value)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id
            `;
            const subRes = await db.query(subQuery, [
              custom_fieldsid, section.id, field.id, sub.id, sub.name,
              sub.isActive !== false, parseInt(sub.sort || 0, 10), sub.triggerValue || null
            ]);
            const tblSubsectionId = subRes.rows[0].id;

            for (const sf of sub.fields || []) {
              const sfQuery = `
                INSERT INTO tbl_customfield_details 
                (custom_fieldsid, section_id, section_name, parent_fieldid, subsection_id, subsection_name, field_id, field_name, field_type, is_required, is_active, sort_order, options, allow_multiple)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
              `;
              const sfRes = await db.query(sfQuery, [
                custom_fieldsid, section.id, section.name, field.id, tblSubsectionId.toString(), sub.name, sf.id, sf.name, sf.type,
                sf.isRequired || false, sf.isActive !== false, parseInt(sf.sort || 0, 10),
                sf.options || null, sf.allowMultiple || false
              ]);
              const sfDetailsId = sfRes.rows[0].id;

              // Insert individual comma-separated options into tbl_customfieldsvalues for subsection fields
              if (sf.options && typeof sf.options === 'string') {
                const sfOptionsArr = sf.options.split(',').map(opt => opt.trim()).filter(Boolean);
                for (const opt of sfOptionsArr) {
                  await db.query(`INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)`, [custom_fieldsid, sfDetailsId, opt]);
                }
              }
            }
          }
        }
      }
    }

    res.status(201).json(customField);
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(500).json({ message: 'Error creating custom field' });
  }
};

exports.updateCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientid, moduleid, countryid, status, field_data } = req.body;
    const query = `
      UPDATE tbl_customfields
      SET clientid = COALESCE($1, clientid),
          moduleid = COALESCE($2, moduleid),
          country_id = COALESCE($3, country_id),
          status = COALESCE($4, status),
          field_data = COALESCE($5, field_data)
      WHERE id = $6
      RETURNING *
    `;
    const result = await db.query(query, [clientid, moduleid, countryid, status, field_data ? JSON.stringify(field_data) : null, id]);
    const customField = result.rows[0];

    // Delete existing details and values, then recreate
    if (field_data && Array.isArray(field_data)) {
      await db.query('DELETE FROM tbl_customfieldsvalues WHERE custom_fieldsid = $1', [id]);
      await db.query('DELETE FROM tbl_customfield_details WHERE custom_fieldsid = $1', [id]);
      await db.query('DELETE FROM tbl_subsection WHERE custom_fieldsid = $1', [id]);

      for (const section of field_data) {
        for (const field of section.fields || []) {
          const fQuery = `
            INSERT INTO tbl_customfield_details 
            (custom_fieldsid, section_id, section_name, field_id, field_name, field_type, is_required, is_active, sort_order, options, allow_multiple)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;
          const fRes = await db.query(fQuery, [
            id, section.id, section.name, field.id, field.name, field.type,
            field.isRequired || false, field.isActive !== false, parseInt(field.sort || 0, 10),
            field.options || null, field.allowMultiple || false
          ]);
          const fieldDetailsId = fRes.rows[0].id;

          // Insert individual comma-separated options into tbl_customfieldsvalues
          if (field.options && typeof field.options === 'string') {
            const optionsArr = field.options.split(',').map(opt => opt.trim()).filter(Boolean);
            for (const opt of optionsArr) {
              await db.query(`INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)`, [id, fieldDetailsId, opt]);
            }
          }

          for (const sub of field.subsections || []) {
            const subQuery = `
              INSERT INTO tbl_subsection 
              (custom_fieldsid, section_id, parent_fieldid, subsection_id, subsection_name, is_active, sort_order, trigger_value)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id
            `;
            const subRes = await db.query(subQuery, [
              id, section.id, field.id, sub.id, sub.name,
              sub.isActive !== false, parseInt(sub.sort || 0, 10), sub.triggerValue || null
            ]);
            const tblSubsectionId = subRes.rows[0].id;

            for (const sf of sub.fields || []) {
              const sfQuery = `
                INSERT INTO tbl_customfield_details 
                (custom_fieldsid, section_id, section_name, parent_fieldid, subsection_id, subsection_name, field_id, field_name, field_type, is_required, is_active, sort_order, options, allow_multiple)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
              `;
              const sfRes = await db.query(sfQuery, [
                id, section.id, section.name, field.id, tblSubsectionId.toString(), sub.name, sf.id, sf.name, sf.type,
                sf.isRequired || false, sf.isActive !== false, parseInt(sf.sort || 0, 10),
                sf.options || null, sf.allowMultiple || false
              ]);
              const sfDetailsId = sfRes.rows[0].id;

              // Insert individual comma-separated options into tbl_customfieldsvalues for subsection fields
              if (sf.options && typeof sf.options === 'string') {
                const sfOptionsArr = sf.options.split(',').map(opt => opt.trim()).filter(Boolean);
                for (const opt of sfOptionsArr) {
                  await db.query(`INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)`, [id, sfDetailsId, opt]);
                }
              }
            }
          }
        }
      }
    }

    res.status(200).json(customField);
  } catch (error) {
    console.error('Error updating custom field:', error);
    res.status(500).json({ message: 'Error updating custom field' });
  }
};

exports.deleteCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE tbl_customfields
      SET isdelete = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ message: 'Error deleting custom field' });
  }
};

exports.getFieldValues = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'id is required' });
    }

    const query = `
      SELECT cd.field_id, cfv.values
      FROM tbl_customfieldsvalues cfv
      JOIN tbl_customfield_details cd ON cfv.fieldid = cd.id
      WHERE cfv.custom_fieldsid = $1
        AND cfv.isdelete = false
        AND cd.isdelete = false
      ORDER BY cd.field_id, cfv.id
    `;
    const result = await db.query(query, [id]);

    // Group values by field UUID: { "uuid": ["opt1", "opt2"] }
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.field_id]) {
        grouped[row.field_id] = [];
      }
      grouped[row.field_id].push(row.values);
    }

    res.status(200).json(grouped);
  } catch (error) {
    console.error('Error fetching field values:', error);
    res.status(500).json({ message: 'Error fetching field values' });
  }
};

