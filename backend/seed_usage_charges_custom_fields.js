const db = require('./src/config/db');

async function seedUsageChargesFields() {
  try {
    const timestamp = Date.now();
    const sectionId = `${timestamp}`;

    const usageTypeOptions = [
      'Local Call',
      'International Call',
      'Roaming Call',
      'Local Data',
      'Roaming Data',
      'SMS',
      'Premium SMS',
      'Special Number',
      'Third Party Service',
      'Other'
    ];

    const fields = [
      {
        id: `${sectionId}_1`,
        name: 'Bill Number',
        type: 'Dropdown',
        isRequired: true,
        isActive: true,
        isSearchable: true,
        sort: 0,
        optionSource: 'dynamic',
        dynamicPath: '/api/telecom-bills',
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_2`,
        name: 'Mobile Number',
        type: 'Dropdown',
        isRequired: true,
        isActive: true,
        isSearchable: true,
        sort: 1,
        optionSource: 'dynamic',
        dynamicPath: '/api/sim-details',
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_3`,
        name: 'Usage Date',
        type: 'Date',
        isRequired: true,
        isActive: true,
        isSearchable: false,
        sort: 2,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_4`,
        name: 'Time',
        type: 'Time',
        isRequired: false,
        isActive: true,
        isSearchable: false,
        sort: 3,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_5`,
        name: 'Usage Type',
        type: 'Dropdown',
        isRequired: true,
        isActive: true,
        isSearchable: true,
        sort: 4,
        optionSource: 'static',
        dynamicPath: '',
        options: usageTypeOptions.join(','),
        optionsArr: usageTypeOptions,
        subsections: []
      },
      {
        id: `${sectionId}_6`,
        name: 'Called / Destination Number',
        type: 'Textbox',
        isRequired: false,
        isActive: true,
        isSearchable: false,
        sort: 5,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_7`,
        name: 'Country',
        type: 'Dropdown',
        isRequired: false,
        isActive: true,
        isSearchable: true,
        sort: 6,
        optionSource: 'dynamic',
        dynamicPath: '/api/countries',
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_8`,
        name: 'Duration',
        type: 'Textbox',
        isRequired: false,
        isActive: true,
        isSearchable: false,
        sort: 7,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_9`,
        name: 'Units',
        type: 'Number',
        isRequired: false,
        isActive: true,
        isSearchable: false,
        sort: 8,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_10`,
        name: 'Amount',
        type: 'Number',
        isRequired: true,
        isActive: true,
        isSearchable: false,
        sort: 9,
        options: '',
        optionsArr: [],
        subsections: []
      },
      {
        id: `${sectionId}_11`,
        name: 'Remarks',
        type: 'Textarea',
        isRequired: false,
        isActive: true,
        isSearchable: false,
        sort: 10,
        options: '',
        optionsArr: [],
        subsections: []
      }
    ];

    const fieldData = [
      {
        id: sectionId,
        name: 'Usage Charges Form Details',
        sort: 1,
        fields: fields
      }
    ];

    // Check if record for moduleid 57 exists
    const checkRes = await db.query('SELECT * FROM tbl_customfields WHERE moduleid::text = \'57\'');
    
    if (checkRes.rows.length > 0) {
      await db.query(
        `UPDATE tbl_customfields SET field_data = $1, isdelete = false WHERE moduleid::text = '57'`,
        [JSON.stringify(fieldData)]
      );
      console.log('Successfully updated Usage Charges (moduleid 57) custom fields schema in tbl_customfields!');
    } else {
      await db.query(
        `INSERT INTO tbl_customfields (clientid, country_id, moduleid, status, isdelete, created_at, field_data) 
         VALUES (NULL, 1, 57, 'Active', false, CURRENT_TIMESTAMP, $1)`,
        [JSON.stringify(fieldData)]
      );
      console.log('Successfully inserted Usage Charges (moduleid 57) custom fields schema in tbl_customfields!');
    }
  } catch (err) {
    console.error('Error seeding Usage Charges custom fields:', err);
  } finally {
    process.exit();
  }
}

seedUsageChargesFields();
