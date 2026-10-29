
const db = require('./config/db');

async function checkTestAccounts() {
  try {
    const [hospitals] = await db.query(`
      SELECT id, name
      FROM hospital
      WHERE id = 13
    `);

    console.log('\n--- Test hospital ---');
    console.table(hospitals);

    const [drivers] = await db.query(`
      SELECT id, email, role, hospital_id
      FROM staff
      WHERE id = 28
    `);

    console.log('\n--- Candidate driver account ---');
    console.table(drivers);

    const [staff] = await db.query(`
      SELECT id, role, hospital_id
      FROM staff
      WHERE hospital_id = 13
      ORDER BY id
    `);

    console.log('\n--- Staff at hospital 13 ---');
    console.table(staff);

  } catch (error) {
    console.error('Account check failed:', error.message);
  } finally {
    await db.end();
  }
}

checkTestAccounts();
