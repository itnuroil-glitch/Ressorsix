const db = require('./src/config/db');

const fieldData = [
  {
    id: 'sec_extra_1',
    name: 'Premium & Extra Charge Specification',
    sort: '1',
    fields: [
      { id: 'f_bill_no', name: 'Bill Number', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '0', optionSource: 'dynamic', dynamicPath: '/api/telecom-bills', options: '', optionsArr: [] },
      { id: 'f_mobile', name: 'Mobile Number', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '1', optionSource: 'dynamic', dynamicPath: '/api/sim-details', options: '', optionsArr: [] },
      { id: 'f_date', name: 'Charge Date', type: 'Date', isRequired: true, isActive: true, sort: '2', options: '', optionsArr: [] },
      { id: 'f_time', name: 'Time', type: 'Time', isRequired: false, isActive: true, sort: '3', options: '', optionsArr: [] },
      { id: 'f_premium_type', name: 'Extra Charge Category', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '4', optionSource: 'static', options: 'Premium SMS,Roaming Pass,VAS Subscription,Third Party App,Out of Bundle Data,Late Payment Fee,Disconnection Fee,Other Extra Charge', optionsArr: ['Premium SMS','Roaming Pass','VAS Subscription','Third Party App','Out of Bundle Data','Late Payment Fee','Disconnection Fee','Other Extra Charge'] },
      { id: 'f_dest', name: 'Service / Content Provider', type: 'Textbox', isRequired: false, isActive: true, sort: '5', options: '', optionsArr: [] },
      { id: 'f_country', name: 'Country', type: 'Dropdown', isRequired: false, isActive: true, isSearchable: true, sort: '6', optionSource: 'dynamic', dynamicPath: '/api/countries', options: '', optionsArr: [] },
      { id: 'f_units', name: 'Units / Qty', type: 'Number', isRequired: false, isActive: true, sort: '7', options: '', optionsArr: [] },
      { id: 'f_base_amount', name: 'Base Rate', type: 'Number', isRequired: false, isActive: true, sort: '8', options: '', optionsArr: [] },
      { id: 'f_extra_amount', name: 'Extra / Surcharge Amount', type: 'Number', isRequired: true, isActive: true, sort: '9', options: '', optionsArr: [] },
      { id: 'f_amount', name: 'Total Charged Amount', type: 'Number', isRequired: true, isActive: true, sort: '10', options: '', optionsArr: [] },
      { id: 'f_remarks', name: 'Justification / Remarks', type: 'Textarea', isRequired: false, isActive: true, sort: '11', options: '', optionsArr: [] }
    ]
  }
];

async function run() {
  try {
    const jsonStr = JSON.stringify(fieldData);
    const res = await db.query(
      `INSERT INTO tbl_customfields (country_id, moduleid, status, isdelete, field_data) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [1, 58, 'Active', false, jsonStr]
    );
    console.log('Created custom fields for moduleid 58:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
