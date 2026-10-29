
const db = require('./config/db');

async function fixAmbulanceStatusEnum() {
  try {
    console.log('Updating ambulance.status column...');

    await db.query(`
      ALTER TABLE ambulance
      MODIFY COLUMN status ENUM(
        'available',
        'dispatched',
        'en_route',
        'returning',
        'under_repair',
        'out_of_service'
      ) DEFAULT 'available'
    `);

    console.log('SUCCESS: ambulance.status column updated.');

    const [columns] = await db.query(
      "SHOW COLUMNS FROM ambulance LIKE 'status'"
    );

    console.table(columns);
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await db.end();
  }
}

fixAmbulanceStatusEnum();

