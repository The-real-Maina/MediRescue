const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOtpSms } = require('../services/smsService');

// ==========================================
// OTP DEMO MODE
// Set OTP_DEMO_MODE=true ONLY on the public demo server.
// When on, one-time codes are returned in the API response
// (field "demoOtp") instead of being sent by SMS or printed in
// the server terminal, so visitors can complete login and
// registration without a paid SMS service.
// When it is not set (local development), nothing changes.
// ==========================================

const isOtpDemoMode = () => process.env.OTP_DEMO_MODE === 'true';

// ==========================================
// PATIENT REGISTRATION (DIRECT)
// ==========================================

exports.registerPatient = async (req, res) => {
  const {
    name,
    phone,
    password,
    blood_type,
    allergies,
    chronic_conditions,
    next_of_kin_name,
    next_of_kin_phone
  } = req.body || {};

  try {
    if (!name || !phone || !password) {
      return res.status(400).json({
        error: 'Name, phone and password are required'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM patient WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'A patient with this phone number already exists'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO patient
       (
         name, phone, password_hash, blood_type, allergies,
         chronic_conditions, next_of_kin_name, next_of_kin_phone
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        phone,
        password_hash,
        blood_type || null,
        allergies || null,
        chronic_conditions || null,
        next_of_kin_name || null,
        next_of_kin_phone || null
      ]
    );

    return res.status(201).json({
      message: 'Patient registered successfully',
      patient: { id: result.insertId, name, phone }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: 'Patient registration failed'
    });
  }
};

// ==========================================
// LOGIN
// Patients and super admins use password login.
// Staff, hospital admins and drivers require OTP.
// ==========================================

exports.login = async (req, res) => {
  const { email, phone, password, role } = req.body || {};

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const allowedRoles = [
    'patient',
    'hospital_staff',
    'hospital_admin',
    'super_admin',
    'driver'
  ];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid login role' });
  }

  if (role === 'patient' && !phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (role !== 'patient' && !email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    let rows = [];

    if (role === 'patient') {
      [rows] = await pool.query(
        'SELECT * FROM patient WHERE phone = ?',
        [phone]
      );
    } else if (role === 'super_admin') {
      [rows] = await pool.query(
        `SELECT * FROM admin
         WHERE email = ? AND role = 'super_admin'`,
        [email]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM staff WHERE email = ? AND role = ?',
        [email, role]
      );
    }

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (
      ['hospital_staff', 'hospital_admin', 'driver'].includes(role) &&
      Number(user.is_active) !== 1
    ) {
      return res.status(403).json({
        error: 'This account has been deactivated. Please contact your administrator.'
      });
    }

    // Second authentication step for staff, hospital admins and drivers.
    if (['hospital_staff', 'hospital_admin', 'driver'].includes(role)) {
      const demoOtp = isOtpDemoMode();

      if (
        !demoOtp &&
        (process.env.NODE_ENV === 'production' ||
          process.env.OTP_DELIVERY_MODE !== 'terminal')
      ) {
        return res.status(503).json({
          error: 'Staff OTP delivery is not configured.'
        });
      }

      const [recentRequests] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM staff_login_otp
         WHERE staff_id = ?
           AND role = ?
           AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
        [user.id, role]
      );

      if (Number(recentRequests[0].total) >= 3) {
        return res.status(429).json({
          error: 'Too many OTP requests. Please wait 10 minutes before trying again.'
        });
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = await bcrypt.hash(code, 10);

      await pool.query(
        `UPDATE staff_login_otp
         SET used = 1
         WHERE staff_id = ? AND role = ? AND used = 0`,
        [user.id, role]
      );

      const [result] = await pool.query(
        `INSERT INTO staff_login_otp
         (staff_id, role, code_hash, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
        [user.id, role, codeHash]
      );

      console.log('\n========================================');
      console.log('MEDIRESCUE STAFF LOGIN OTP');
      console.log(`Role: ${role}`);
      console.log(`Challenge ID: ${result.insertId}`);
      console.log(`OTP: ${code}`);
      console.log('Expires in: 5 minutes');
      console.log('========================================\n');

      if (demoOtp) {
        return res.status(200).json({
          message: `Demo mode: your OTP is ${code}. It expires in 5 minutes.`,
          requiresOtp: true,
          challengeId: result.insertId,
          demoOtp: code
        });
      }

      return res.status(200).json({
        message: 'Password accepted. Enter the OTP shown in the development server terminal.',
        requiresOtp: true,
        challengeId: result.insertId
      });
    }

    // Existing direct-login path for patients and super admins.
    const userRole = role === 'patient' ? 'patient' : user.role;
    const hospitalId = null;

    const token = jwt.sign(
      {
        id: user.id,
        role: userRole,
        hospital_id: hospitalId
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: userRole,
        hospital_id: hospitalId,
        must_change_password: Number(user.must_change_password) === 1
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
};

// ==========================================
// VERIFY STAFF LOGIN OTP
// POST /api/auth/staff-otp/verify
// Body: { challengeId, code }
// ==========================================

exports.verifyStaffLoginOtp = async (req, res) => {
  const { challengeId, code } = req.body || {};

  if (
    !Number.isSafeInteger(Number(challengeId)) ||
    Number(challengeId) < 1 ||
    typeof code !== 'string' ||
    !/^\d{6}$/.test(code.trim())
  ) {
    return res.status(400).json({
      error: 'A valid challenge ID and six-digit OTP are required.'
    });
  }

  if (
    !isOtpDemoMode() &&
    (process.env.NODE_ENV === 'production' ||
      process.env.OTP_DELIVERY_MODE !== 'terminal')
  ) {
    return res.status(503).json({
      error: 'Staff OTP delivery is not configured.'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT *
       FROM staff_login_otp
       WHERE id = ?
       FOR UPDATE`,
      [Number(challengeId)]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    const otp = rows[0];
    const allowedRoles = ['hospital_staff', 'hospital_admin', 'driver'];

    if (
      !allowedRoles.includes(otp.role) ||
      Number(otp.used) === 1 ||
      new Date(otp.expires_at) <= new Date()
    ) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    if (Number(otp.attempts) >= 5) {
      await connection.query(
        'UPDATE staff_login_otp SET used = 1 WHERE id = ?',
        [otp.id]
      );
      await connection.commit();

      return res.status(429).json({
        error: 'Too many incorrect attempts. Please log in again to request a new OTP.'
      });
    }

    const matches = await bcrypt.compare(code.trim(), otp.code_hash);

    if (!matches) {
      const attempts = Number(otp.attempts) + 1;

      await connection.query(
        'UPDATE staff_login_otp SET attempts = ?, used = ? WHERE id = ?',
        [attempts, attempts >= 5 ? 1 : 0, otp.id]
      );

      await connection.commit();

      return res.status(attempts >= 5 ? 429 : 401).json({
        error: attempts >= 5
          ? 'Too many incorrect attempts. Please log in again to request a new OTP.'
          : 'Invalid or expired OTP.'
      });
    }

    await connection.query(
      'UPDATE staff_login_otp SET used = 1 WHERE id = ?',
      [otp.id]
    );

    await connection.commit();

    const [staffRows] = await pool.query(
      'SELECT * FROM staff WHERE id = ? AND role = ?',
      [otp.staff_id, otp.role]
    );

    if (!staffRows.length || Number(staffRows[0].is_active) !== 1) {
      return res.status(403).json({
        error: 'This account is unavailable or deactivated. Please contact your administrator.'
      });
    }

    const user = staffRows[0];
    const hospitalId = user.hospital_id ?? null;

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        hospital_id: hospitalId
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        hospital_id: hospitalId,
        must_change_password: Number(user.must_change_password) === 1
      }
    });
  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error('Staff OTP verification error:', err);

    return res.status(500).json({
      error: 'OTP verification failed. Please try again.'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// PATIENT REGISTRATION OTP
// ==========================================

const REGISTRATION_OTP_EXPIRY_MINUTES = 5;
const REGISTRATION_OTP_MAX_ATTEMPTS = 5;

exports.requestRegistrationOtp = async (req, res) => {
  const { name, phone, password, confirmPassword } = req.body || {};

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof phone !== 'string' ||
    !phone.trim() ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    return res.status(400).json({
      error: 'Name, phone and a password of at least 6 characters are required.'
    });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const cleanName = name.trim();
  const cleanPhone = phone.trim();

  try {
    const [existing] = await pool.query(
      'SELECT id FROM patient WHERE phone = ?',
      [cleanPhone]
    );

    if (existing.length) {
      return res.status(409).json({
        error: 'An account with this phone number already exists. Please log in.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);

    await pool.query(
      'DELETE FROM pending_patient_registration WHERE phone = ?',
      [cleanPhone]
    );

    await pool.query(
      `INSERT INTO pending_patient_registration
       (name, phone, password_hash, code_hash, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [
        cleanName,
        cleanPhone,
        passwordHash,
        codeHash,
        REGISTRATION_OTP_EXPIRY_MINUTES
      ]
    );

    // Demo mode: skip the SMS and hand the code back to the browser.
    if (isOtpDemoMode()) {
      return res.status(200).json({
        message: `Demo mode: your verification code is ${code}.`,
        demoOtp: code
      });
    }

    try {
      await sendOtpSms(cleanPhone, code);

      return res.status(200).json({
        message: 'Verification code requested. Check your SMS and enter the code to finish registration.'
      });
    } catch (smsError) {
      console.error('Registration OTP delivery failed:', smsError.message);

      await pool.query(
        'DELETE FROM pending_patient_registration WHERE phone = ?',
        [cleanPhone]
      );

      return res.status(502).json({
        error: 'The verification SMS could not be sent. Please try again later.'
      });
    }
  } catch (err) {
    console.error('Registration OTP request failed:', err.message);

    return res.status(500).json({
      error: 'Could not start registration. Please try again.'
    });
  }
};

exports.verifyRegistrationOtp = async (req, res) => {
  const { phone, code } = req.body || {};

  if (
    typeof phone !== 'string' ||
    !phone.trim() ||
    !/^\d{6}$/.test(String(code || '').trim())
  ) {
    return res.status(400).json({
      error: 'Enter your phone number and the six-digit verification code.'
    });
  }

  const cleanPhone = phone.trim();
  const cleanCode = String(code).trim();

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [pendingRows] = await connection.query(
      `SELECT *
       FROM pending_patient_registration
       WHERE phone = ?
       FOR UPDATE`,
      [cleanPhone]
    );

    if (!pendingRows.length) {
      await connection.rollback();
      return res.status(400).json({
        error: 'No pending registration was found. Please request a new code.'
      });
    }

    const pending = pendingRows[0];

    if (new Date(pending.expires_at) <= new Date()) {
      await connection.query(
        'DELETE FROM pending_patient_registration WHERE id = ?',
        [pending.id]
      );
      await connection.commit();

      return res.status(400).json({
        error: 'Your code has expired. Please request a new code.'
      });
    }

    if (Number(pending.attempts) >= REGISTRATION_OTP_MAX_ATTEMPTS) {
      await connection.query(
        'DELETE FROM pending_patient_registration WHERE id = ?',
        [pending.id]
      );
      await connection.commit();

      return res.status(429).json({
        error: 'Too many incorrect attempts. Please restart registration.'
      });
    }

    const matches = await bcrypt.compare(cleanCode, pending.code_hash);

    if (!matches) {
      const attempts = Number(pending.attempts) + 1;

      if (attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
        await connection.query(
          'DELETE FROM pending_patient_registration WHERE id = ?',
          [pending.id]
        );
      } else {
        await connection.query(
          'UPDATE pending_patient_registration SET attempts = ? WHERE id = ?',
          [attempts, pending.id]
        );
      }

      await connection.commit();

      return res.status(400).json({
        error: attempts >= REGISTRATION_OTP_MAX_ATTEMPTS
          ? 'Too many incorrect attempts. Please restart registration.'
          : 'Incorrect verification code. Please try again.'
      });
    }

    const [existing] = await connection.query(
      'SELECT id FROM patient WHERE phone = ?',
      [cleanPhone]
    );

    if (existing.length) {
      await connection.query(
        'DELETE FROM pending_patient_registration WHERE id = ?',
        [pending.id]
      );
      await connection.commit();

      return res.status(409).json({
        error: 'An account with this phone number already exists. Please log in.'
      });
    }

    const [result] = await connection.query(
      `INSERT INTO patient (name, phone, password_hash)
       VALUES (?, ?, ?)`,
      [pending.name, pending.phone, pending.password_hash]
    );

    await connection.query(
      'DELETE FROM pending_patient_registration WHERE id = ?',
      [pending.id]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Phone verified and patient account created successfully.',
      patient: {
        id: result.insertId,
        name: pending.name,
        phone: pending.phone
      }
    });
  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error('Registration OTP verification failed:', err.message);

    return res.status(500).json({
      error: 'Could not verify registration. Please try again.'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// PATIENT OTP LOGIN
// ==========================================

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_REQUESTS = 3;
const OTP_REQUEST_WINDOW_MIN = 10;

exports.requestOtp = async (req, res) => {
  const { phone } = req.body || {};

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanPhone = phone.trim();
  const genericReply = {
    message: 'If this number is registered, a code has been sent.'
  };

  try {
    const [recent] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM otp_code
       WHERE phone = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [cleanPhone, OTP_REQUEST_WINDOW_MIN]
    );

    if (Number(recent[0].total) >= OTP_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too many code requests. Please wait a few minutes and try again.'
      });
    }

    const [patients] = await pool.query(
      'SELECT id FROM patient WHERE phone = ?',
      [cleanPhone]
    );

    if (!patients.length) {
      return res.status(200).json(genericReply);
    }

    await pool.query(
      'UPDATE otp_code SET used = 1 WHERE phone = ? AND used = 0',
      [cleanPhone]
    );

    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);

    const [insertResult] = await pool.query(
      `INSERT INTO otp_code (phone, code_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [cleanPhone, codeHash, OTP_EXPIRY_MINUTES]
    );

    // Demo mode: skip the SMS and hand the code back to the browser.
    if (isOtpDemoMode()) {
      return res.status(200).json({
        message: `Demo mode: your login code is ${code}.`,
        demoOtp: code
      });
    }

    try {
      await sendOtpSms(cleanPhone, code);

      console.log(
        `Patient OTP SMS submitted for phone ending ${cleanPhone.slice(-4)}`
      );

      return res.status(200).json(genericReply);
    } catch (smsError) {
      console.error('OTP SMS sending failed:', smsError.message);

      await pool.query(
        'UPDATE otp_code SET used = 1 WHERE id = ?',
        [insertResult.insertId]
      );

      return res.status(502).json({
        error: 'Could not send verification SMS. Please try again later.'
      });
    }
  } catch (err) {
    console.error('OTP request error:', err);

    return res.status(500).json({
      error: 'Could not send code. Please try again.'
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { phone, code } = req.body || {};

  if (
    !phone ||
    typeof phone !== 'string' ||
    !code ||
    !/^\d{6}$/.test(String(code).trim())
  ) {
    return res.status(400).json({
      error: 'A valid phone number and six-digit code are required'
    });
  }

  const cleanPhone = phone.trim();
  const cleanCode = String(code).trim();

  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM otp_code
       WHERE phone = ?
         AND used = 0
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [cleanPhone]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    const otp = rows[0];

    if (Number(otp.attempts) >= OTP_MAX_ATTEMPTS) {
      await pool.query(
        'UPDATE otp_code SET used = 1 WHERE id = ?',
        [otp.id]
      );

      return res.status(429).json({
        error: 'Too many wrong attempts. Please request a new code.'
      });
    }

    const matches = await bcrypt.compare(cleanCode, otp.code_hash);

    if (!matches) {
      const attempts = Number(otp.attempts) + 1;

      await pool.query(
        'UPDATE otp_code SET attempts = ?, used = ? WHERE id = ?',
        [attempts, attempts >= OTP_MAX_ATTEMPTS ? 1 : 0, otp.id]
      );

      return res.status(401).json({
        error: 'Invalid or expired code'
      });
    }

    await pool.query(
      'UPDATE otp_code SET used = 1 WHERE id = ?',
      [otp.id]
    );

    const [patients] = await pool.query(
      'SELECT * FROM patient WHERE phone = ?',
      [cleanPhone]
    );

    if (!patients.length) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    const user = patients[0];

    const token = jwt.sign(
      {
        id: user.id,
        role: 'patient',
        hospital_id: null
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: 'patient',
        hospital_id: null
      }
    });
  } catch (err) {
    console.error('OTP verify error:', err);

    return res.status(500).json({
      error: 'Verification failed. Please try again.'
    });
  }
};