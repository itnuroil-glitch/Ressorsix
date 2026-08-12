const db = require('../config/db');

async function seedTelecomDocumentCustomFields() {
  try {
    const fieldData = [
      {
        id: 'sec_telecom_doc_1',
        name: 'Telecom Document Details',
        sort: '1',
        fields: [
          {
            id: 'f_company',
            name: 'Company',
            type: 'Dropdown',
            isRequired: true,
            isActive: true,
            isSearchable: true,
            sort: '0',
            optionSource: 'dynamic',
            dynamicPath: '/api/companies',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_mobile_account',
            name: 'Mobile Number / Account',
            type: 'Dropdown',
            isRequired: false,
            isActive: true,
            isSearchable: true,
            sort: '1',
            optionSource: 'dynamic',
            dynamicPath: '/api/sim-details',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_doc_type',
            name: 'Document Type',
            type: 'Dropdown',
            isRequired: true,
            isActive: true,
            isSearchable: true,
            sort: '2',
            optionSource: 'static',
            options: 'Telecom Invoice,SIM Contract,Device Warranty,SIM Handover,Employee Acknowledgement,Provider Agreement,Other',
            optionsArr: [
              'Telecom Invoice',
              'SIM Contract',
              'Device Warranty',
              'SIM Handover',
              'Employee Acknowledgement',
              'Provider Agreement',
              'Other'
            ],
            subsections: []
          },
          {
            id: 'f_doc_number',
            name: 'Document Number',
            type: 'Textbox',
            isRequired: false,
            isActive: true,
            sort: '3',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_issue_date',
            name: 'Issue Date',
            type: 'Date',
            isRequired: false,
            isActive: true,
            sort: '4',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_expiry_date',
            name: 'Expiry Date',
            type: 'Date',
            isRequired: false,
            isActive: true,
            sort: '5',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_file_upload',
            name: 'File Upload',
            type: 'File',
            isRequired: true,
            isActive: true,
            sort: '6',
            options: '',
            optionsArr: [],
            subsections: []
          },
          {
            id: 'f_remarks',
            name: 'Remarks',
            type: 'Textarea',
            isRequired: false,
            isActive: true,
            sort: '7',
            options: '',
            optionsArr: [],
            subsections: []
          }
        ]
      }
    ];

    // 1. Delete any existing custom fields for moduleid = 61
    await db.query('DELETE FROM tbl_customfields WHERE moduleid = 61');

    // 2. Insert into tbl_customfields
    const insertRes = await db.query(
      `INSERT INTO tbl_customfields (clientid, country_id, moduleid, status, isdelete, field_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [null, 1, 61, 'Active', false, JSON.stringify(fieldData)]
    );
    const cfId = insertRes.rows[0].id;
    console.log(`Inserted tbl_customfields record ID: ${cfId} for moduleid 61`);

    // 3. Populate tbl_customfield_details and tbl_customfieldsvalues
    for (const sec of fieldData) {
      for (const field of sec.fields) {
        const detailRes = await db.query(
          `INSERT INTO tbl_customfield_details
           (custom_fieldsid, section_id, section_name, field_id, field_name, field_type, is_required, is_active, sort_order, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            cfId,
            sec.id,
            sec.name,
            field.id,
            field.name,
            field.type,
            field.isRequired,
            field.isActive,
            parseInt(field.sort, 10),
            field.options || null
          ]
        );
        const detailId = detailRes.rows[0].id;

        if (field.optionsArr && field.optionsArr.length > 0) {
          for (const opt of field.optionsArr) {
            await db.query(
              `INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)`,
              [cfId, detailId, opt]
            );
          }
        }
      }
    }
    console.log('Populated tbl_customfield_details and tbl_customfieldsvalues.');

    // 4. Seed tbl_feild_permision for all clients for moduleid 61
    const permittedObj = {
      f_company: true,
      f_mobile_account: true,
      f_doc_type: true,
      f_doc_number: true,
      f_issue_date: true,
      f_expiry_date: true,
      f_file_upload: true,
      f_remarks: true
    };

    const clientsRes = await db.query('SELECT id FROM client');
    for (const row of clientsRes.rows) {
      const cId = row.id;
      const checkRes = await db.query(
        'SELECT id FROM tbl_feild_permision WHERE clientid = $1 AND moduleid = 61 AND country_id = 1',
        [cId]
      );
      if (checkRes.rows.length === 0) {
        await db.query(
          'INSERT INTO tbl_feild_permision (clientid, moduleid, country_id, permitted_fields) VALUES ($1, 61, 1, $2)',
          [cId, JSON.stringify(permittedObj)]
        );
      } else {
        await db.query(
          'UPDATE tbl_feild_permision SET permitted_fields = $1 WHERE id = $2',
          [JSON.stringify(permittedObj), checkRes.rows[0].id]
        );
      }
    }
    console.log('Seeded field permissions for Module 61 (Telecom Document) across all clients.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding Telecom Document custom fields:', err);
    process.exit(1);
  }
}

seedTelecomDocumentCustomFields();
