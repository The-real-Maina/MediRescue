
const pool = require('./config/db');

async function checkAmbulanceStatus() {
  try {
    const [columns] = await pool.query(
      "SHOW COLUMNS FROM ambulance LIKE 'status'"
    );

    console.log('\n--- Ambulance status column ---');
    console.table(columns);

    const [table] = await pool.query(
      'SHOW CREATE TABLE ambulance'
    );

    console.log('\n--- Ambulance table definition ---');
    console.log(table[0]['Create Table']);
  } catch (error) {
    console.error('Database inspection failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkAmbulanceStatus();
