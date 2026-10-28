
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendOtpSms } = require('../services/smsService');

const ACCOUNT_TABLES = {
  patient: 'patient',
  hospital_staff: 'staff',
  hospital_admin: 'staff',
  driver: 'staff',
};

const STAFF_ROLES = ['hospital_staff', 'hospital_admin', 'driver'];

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT_MINUTES = 10;
const MAX_OTP_REQUESTS = 3;
const MAX_OTP_ATTEMPTS = 5;

// Convert common Kenyan phone-number formats to a consistent format.
// Example: 0712345678, +254712345678, and 254712345678
// all become 254712345678.
function normalizePhone(phone) {
  if (typeof phone !== 'string') {
    return null;
  }

  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 10) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('254') && digits.length === 12) {
    // Already in international Kenyan format.
  } else {
    return null;
  }

  if (!/^254[17]\d{8}$/.test(digits)) {
    return null;
  }

  return digits;
}

function phoneVariants(normalizedPhone) {
  const variants = [normalizedPhone, `+${normalizedPhone}`];

  if (normalizedPhone.startsWith('254')) {
    variants.push(`0${normalizedPhone.slice(3)}`);
  }

  return [...new Set(variants)];
}

// POST /api/auth/change-password
// Request body: { current_password, new_password }
exports.changePassword = async (req, res) => {
  const role = req.user?.role;
  const table = ACCOUNT_TABLES[role];

  if (!table) {
    return res.status(403).json({
      error: 'Password change is not available for this account type'
    });
  }

  const currentPassword = req.body?.current_password;
  const newPassword = req.body?.new_password;

  if (
    typeof currentPassword !== 'string' ||
    currentPassword.length === 0
  ) {
    return res.status(400).json({
      error: 'Current password is required'
    });
  }

  if (
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    return res.status(400).json({
      error: 'New password must contain 8 to 72 characters'
    });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({
      error: 'New password must be different from the current one'
    });
  }

  try {
    let rows;

    if (role === 'patient') {
      [rows] = await pool.query(
        `SELECT id, password_hash
         FROM patient
         WHERE id = ?`,
        [req.user.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT id, hospital_id, role, password_hash, is_active
         FROM staff
         WHERE id = ? AND is_active = 1`,
        [req.user.id]
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Account not found or no longer active'
      });
    }

    const account = rows[0];

    const matches = await bcrypt.compare(
      currentPassword,
      account.password_hash
    );

    if (!matches) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (role === 'patient') {
      await pool.query(
        `UPDATE patient
         SET password_hash = ?
         WHERE id = ?`,
        [newHash, account.id]
      );
    } else {
      await pool.query(
        `UPDATE staff
         SET password_hash = ?,
             password_changed_at = NOW(),
             must_change_password = 0
         WHERE id = ?`,
        [newHash, account.id]
      );
    }

    const tokenPayload = {
      id: account.id,
      role
    };

    if (role !== 'patient') {
      tokenPayload.hospital_id = account.hospital_id;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Password changed successfully',
      token
    });
  } catch (err) {
    console.error('Change password error:', err);

    return res.status(500).json({
      error: 'Failed to change password'
    });
  }
};

// POST /api/auth/forgot-password/request-otp
// Request body: { phone }
exports.requestPasswordResetOtp = async (req, res) => {
  const normalizedPhone = normalizePhone(req.body?.phone);

  // Use a generic response so this endpoint does not reveal
  // whether a phone number belongs to a registered patient.
  const genericResponse = {
    message:
      'If a patient account exists for that number, a password-reset code will be sent.'
  };

  if (!normalizedPhone) {
    return res.status(200).json(genericResponse);
  }

  try {
    const variants = phoneVariants(normalizedPhone);
    const placeholders = variants.map(() => '?').join(', ');

    const [patients] = await pool.query(
      `SELECT id, phone
       FROM patient
       WHERE phone IN (${placeholders})
       LIMIT 1`,
      variants
    );

    if (patients.length === 0) {
      return res.status(200).json(genericResponse);
    }

    const [recentRequests] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM patient_password_reset_otp
       WHERE phone = ?
         AND created_at >= DATE_SUB(
           NOW(),
           INTERVAL ${OTP_RATE_LIMIT_MINUTES} MINUTE
         )`,
      [normalizedPhone]
    );

    if (Number(recentRequests[0].total) >= MAX_OTP_REQUESTS) {
      return res.status(429).json({
        error: 'Too many code requests. Please try again later.'
      });
    }

    // Invalidate any previous unused reset codes for this number.
    await pool.query(
      `UPDATE patient_password_reset_otp
       SET used = 1
       WHERE phone = ? AND used = 0`,
      [normalizedPhone]
    );

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);

    await pool.query(
      `INSERT INTO patient_password_reset_otp
         (phone, code_hash, expires_at, attempts, used)
       VALUES
         (?, ?, DATE_ADD(NOW(), INTERVAL ${OTP_EXPIRY_MINUTES} MINUTE), 0, 0)`,
      [normalizedPhone, codeHash]
    );

    try {
      await sendOtpSms(normalizedPhone, code);
    } catch (smsError) {
      console.error('Password-reset SMS error:', smsError.message);

      await pool.query(
        `UPDATE patient_password_reset_otp
         SET used = 1
         WHERE phone = ? AND used = 0`,
        [normalizedPhone]
      );

      return res.status(503).json({
        error: 'Unable to send the reset code right now. Please try again later.'
      });
    }

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('Request password-reset OTP error:', err);

    return res.status(500).json({
      error: 'Unable to process the password-reset request'
    });
  }
};

// POST /api/auth/forgot-password/reset
// Request body:
// { phone, otp, new_password, confirm_password }
exports.resetPatientPassword = async (req, res) => {
  const normalizedPhone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp ?? req.body?.code ?? '').trim();
  const newPassword = req.body?.new_password;
  const confirmPassword =
    req.body?.confirm_password ?? req.body?.confirmPassword;

  if (!normalizedPhone) {
    return res.status(400).json({
      error: 'Enter a valid Kenyan phone number'
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      error: 'Enter the six-digit reset code'
    });
  }

  if (
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    return res.status(400).json({
      error: 'New password must contain 8 to 72 characters'
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      error: 'Passwords do not match'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [otpRows] = await connection.query(
      `SELECT id, code_hash, expires_at, attempts, used
       FROM patient_password_reset_otp
       WHERE phone = ?
         AND used = 0
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedPhone]
    );

    if (otpRows.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        error: 'The reset code is invalid or expired. Request a new code.'
      });
    }

    const resetRecord = otpRows[0];

    if (
      resetRecord.used ||
      new Date(resetRecord.expires_at).getTime() <= Date.now()
    ) {
      await connection.query(
        `UPDATE patient_password_reset_otp
         SET used = 1
         WHERE id = ?`,
        [resetRecord.id]
      );

      await connection.commit();

      return res.status(400).json({
        error: 'The reset code is invalid or expired. Request a new code.'
      });
    }

    if (Number(resetRecord.attempts) >= MAX_OTP_ATTEMPTS) {
      await connection.query(
        `UPDATE patient_password_reset_otp
         SET used = 1
         WHERE id = ?`,
        [resetRecord.id]
      );

      await connection.commit();

      return res.status(400).json({
        error: 'Too many incorrect attempts. Request a new code.'
      });
    }

    const matches = await bcrypt.compare(otp, resetRecord.code_hash);

    if (!matches) {
      const nextAttempts = Number(resetRecord.attempts) + 1;
      const lockCode = nextAttempts >= MAX_OTP_ATTEMPTS ? 1 : 0;

      await connection.query(
        `UPDATE patient_password_reset_otp
         SET attempts = ?, used = ?
         WHERE id = ?`,
        [nextAttempts, lockCode, resetRecord.id]
      );

      await connection.commit();

      return res.status(400).json({
        error: lockCode
          ? 'Too many incorrect attempts. Request a new code.'
          : 'The reset code is incorrect.'
      });
    }

    const variants = phoneVariants(normalizedPhone);
    const placeholders = variants.map(() => '?').join(', ');

    const [patients] = await connection.query(
      `SELECT id
       FROM patient
       WHERE phone IN (${placeholders})
       LIMIT 1
       FOR UPDATE`,
      variants
    );

    if (patients.length === 0) {
      await connection.query(
        `UPDATE patient_password_reset_otp
         SET used = 1
         WHERE id = ?`,
        [resetRecord.id]
      );

      await connection.commit();

      return res.status(400).json({
        error: 'Unable to reset this account. Request a new code.'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await connection.query(
      `UPDATE patient
       SET password_hash = ?
       WHERE id = ?`,
      [newHash, patients[0].id]
    );

    await connection.query(
      `UPDATE patient_password_reset_otp
       SET used = 1
       WHERE phone = ? AND used = 0`,
      [normalizedPhone]
    );

    await connection.commit();

    return res.status(200).json({
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    await connection.rollback();

    console.error('Reset patient password error:', err);

    return res.status(500).json({
      error: 'Failed to reset password'
    });
  } finally {
    connection.release();
  }
};
