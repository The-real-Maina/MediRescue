
require('dotenv').config();

const pool = require('./config/db');

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_password_reset_otp (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(30) NOT NULL,
        code_hash VARCHAR(255) NULL,
        expires_at DATETIME NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reset_phone_created (phone, created_at),
        INDEX idx_reset_phone_status (phone, used, expires_at)
      )
    `);

    console.log(
      'SUCCESS: patient_password_reset_otp table created or already exists.'
    );
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createTable();
