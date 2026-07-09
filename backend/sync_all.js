const db = require('./src/config/db');
const { recalculateAssetInventory } = require('./src/utils/inventorySync');

const runSync = async () => {
  try {
    const assetsRes = await db.query('SELECT id, clientid, country_id FROM tbl_asset');
    console.log(`Syncing ${assetsRes.rows.length} assets...`);
    for (const asset of assetsRes.rows) {
      await recalculateAssetInventory(asset.id, asset.clientid, asset.country_id);
    }
    console.log('All assets successfully synced with tbl_inventory!');
    process.exit(0);
  } catch (e) {
    console.error('Error during sync:', e);
    process.exit(1);
  }
};

runSync();
