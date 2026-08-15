const db = require('./src/config/db');

async function fixOverview() {
  try {
    await db.query('UPDATE tbl_toll_overview SET field_data = $1 WHERE id = 3', [JSON.stringify({'1786629185586': 'Darb', '1786629206891': '7821989'})]);
    await db.query('UPDATE tbl_toll_overview SET field_data = $1 WHERE id = 4', [JSON.stringify({'1786629185586': 'Salik', '1786629206891': '34866829'})]);
    await db.query('UPDATE tbl_toll_overview SET field_data = $1 WHERE id = 5', [JSON.stringify({'1786629185586': 'Salik', '1786629206891': '67899'})]);
    await db.query('UPDATE tbl_toll_overview SET field_data = $1 WHERE id = 6', [JSON.stringify({'1786629185586': 'Darb', '1786629206891': '9858954'})]);
    console.log('Successfully updated field_data for overview records 3, 4, 5, 6.');
  } catch (err) {
    console.error('Error updating overview:', err);
  } finally {
    process.exit(0);
  }
}

fixOverview();
