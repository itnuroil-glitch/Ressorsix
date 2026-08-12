const db = require('./src/config/db');

const fieldData = [
  {
    id: 'sec_usage_1',
    name: 'Usage & Extra Charges Details',
    sort: '1',
    fields: [
      { id: 'f_bill_no', name: 'Bill Number', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '0', optionSource: 'dynamic', dynamicPath: '/api/telecom-bills', options: '', optionsArr: [] },
      { id: 'f_mobile', name: 'Mobile Number', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '1', optionSource: 'dynamic', dynamicPath: '/api/sim-details', options: '', optionsArr: [] },
      { id: 'f_date', name: 'Usage Date', type: 'Date', isRequired: true, isActive: true, sort: '2', options: '', optionsArr: [] },
      { id: 'f_time', name: 'Time', type: 'Time', isRequired: false, isActive: true, sort: '3', options: '', optionsArr: [] },
      { id: 'f_type', name: 'Usage Type', type: 'Dropdown', isRequired: true, isActive: true, isSearchable: true, sort: '4', optionSource: 'static', options: 'Local Call,International Call,Roaming Call,Local Data,Roaming Data,SMS,Premium SMS,Special Number,Third Party Service,Other Extra Charge', optionsArr: ['Local Call','International Call','Roaming Call','Local Data','Roaming Data','SMS','Premium SMS','Special Number','Third Party Service','Other Extra Charge'] },
      { id: 'f_premium_type', name: 'Premium / Extra Charge Type', type: 'Dropdown', isRequired: false, isActive: true, isSearchable: true, sort: '5', optionSource: 'static', options: 'None,Premium SMS,Roaming Pass,VAS Subscription,Third Party App,Out of Bundle Data,Late Payment Fee,Disconnection Fee,Other Extra Charge', optionsArr: ['None','Premium SMS','Roaming Pass','VAS Subscription','Third Party App','Out of Bundle Data','Late Payment Fee','Disconnection Fee','Other Extra Charge'] },
      { id: 'f_dest', name: 'Called / Destination Number', type: 'Textbox', isRequired: false, isActive: true, sort: '6', options: '', optionsArr: [] },
      { id: 'f_country', name: 'Country', type: 'Dropdown', isRequired: false, isActive: true, isSearchable: true, sort: '7', optionSource: 'dynamic', dynamicPath: '/api/countries', options: '', optionsArr: [] },
      { id: 'f_duration', name: 'Duration', type: 'Textbox', isRequired: false, isActive: true, sort: '8', options: '', optionsArr: [] },
      { id: 'f_units', name: 'Units', type: 'Number', isRequired: false, isActive: true, sort: '9', options: '', optionsArr: [] },
      { id: 'f_base_amount', name: 'Standard Charge Amount', type: 'Number', isRequired: false, isActive: true, sort: '10', options: '', optionsArr: [] },
      { id: 'f_extra_amount', name: 'Premium / Extra Charge Amount', type: 'Number', isRequired: false, isActive: true, sort: '11', options: '', optionsArr: [] },
      { id: 'f_amount', name: 'Total Amount', type: 'Number', isRequired: true, isActive: true, sort: '12', options: '', optionsArr: [] },
      { id: 'f_remarks', name: 'Remarks', type: 'Textarea', isRequired: false, isActive: true, sort: '13', options: '', optionsArr: [] }
    ]
  }
];

async function run() {
  try {
    const jsonStr = JSON.stringify(fieldData);
    const res = await db.query('UPDATE tbl_customfields SET field_data = $1, status = $2 WHERE moduleid = 57 RETURNING id', [jsonStr, 'Active']);
    console.log('Updated tbl_customfields for moduleid 57:', res.rows);
    
    if (res.rows.length > 0) {
      const cfId = res.rows[0].id;
      await db.query('DELETE FROM tbl_customfieldsvalues WHERE custom_fieldsid = $1', [cfId]);
      await db.query('DELETE FROM tbl_customfield_details WHERE custom_fieldsid = $1', [cfId]);
      
      const section = fieldData[0];
      for (const field of section.fields) {
        const fRes = await db.query(
          `INSERT INTO tbl_customfield_details 
           (custom_fieldsid, section_id, section_name, field_id, field_name, field_type, is_required, is_active, sort_order, options)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [cfId, section.id, section.name, field.id, field.name, field.type, field.isRequired, field.isActive, parseInt(field.sort), field.options || null]
        );
        const detailId = fRes.rows[0].id;
        if (field.options) {
          const opts = field.options.split(',').map(o => o.trim()).filter(Boolean);
          for (const opt of opts) {
            await db.query('INSERT INTO tbl_customfieldsvalues (custom_fieldsid, fieldid, values) VALUES ($1, $2, $3)', [cfId, detailId, opt]);
          }
        }
      }
      console.log('Successfully inserted customfield details & values!');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
