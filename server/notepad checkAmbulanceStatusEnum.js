
const db = require('./config/db');

async function checkStatusEnum() {
  try {
    const [columns] = await db.query(`
      SHOW COLUMNS FROM ambulance LIKE 'status'
    `);

    console.log('\n--- Current ambulance.status definition ---');
    console.table(columns);

  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await db.end();
  }
}

checkStatusEnum();
