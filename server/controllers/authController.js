
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// REGISTER PATIENT
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
        name,
        phone,
        password_hash,
        blood_type,
        allergies,
        chronic_conditions,
        next_of_kin_name,
        next_of_kin_phone
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
      patient: {
        id: result.insertId,
        name,
        phone
      }
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
// PATIENT, HOSPITAL STAFF, SUPER ADMIN, DRIVER
// ==========================================

exports.login = async (req, res) => {
  const {
    email,
    phone,
    password,
    role
  } = req.body || {};

  // VALIDATE PASSWORD
  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Password is required'
    });
  }

  // VALIDATE ROLE
  const allowedRoles = [
    'patient',
    'hospital_staff',
    'super_admin',
    'driver'
  ];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid login role'
    });
  }

  // PATIENT USES PHONE
  if (role === 'patient' && !phone) {
    return res.status(400).json({
      error: 'Phone number is required'
    });
  }

  // STAFF, ADMIN AND DRIVER USE EMAIL
  if (role !== 'patient' && !email) {
    return res.status(400).json({
      error: 'Email address is required'
    });
  }

  try {
    let rows = [];

    // ======================================
    // PATIENT LOGIN
    // ======================================

    if (role === 'patient') {
      [rows] = await pool.query(
        'SELECT * FROM patient WHERE phone = ?',
        [phone]
      );
    }

    // ======================================
    // HOSPITAL STAFF LOGIN
    // ======================================

    else if (role === 'hospital_staff') {
      [rows] = await pool.query(
        `SELECT * FROM staff
         WHERE email = ?
         AND role = 'hospital_staff'`,
        [email]
      );
    }

    // ======================================
    // AMBULANCE DRIVER LOGIN
    // ======================================

    else if (role === 'driver') {
      [rows] = await pool.query(
        `SELECT * FROM staff
         WHERE email = ?
         AND role = 'driver'`,
        [email]
      );
    }

    // ======================================
    // SUPER ADMIN LOGIN
    // ======================================

    else if (role === 'super_admin') {
      [rows] = await pool.query(
        `SELECT * FROM admin
         WHERE email = ?
         AND role = 'super_admin'`,
        [email]
      );
    }

    // ======================================
    // CHECK ACCOUNT
    // ======================================

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // ======================================
    // VERIFY PASSWORD
    // ======================================

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!match) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // ======================================
    // DETERMINE USER ROLE
    // ======================================

    const userRole =
      role === 'patient'
        ? 'patient'
        : user.role;

    // ======================================
    // DETERMINE HOSPITAL
    // ======================================

    const hospitalId =
      ['hospital_staff', 'driver'].includes(userRole)
        ? user.hospital_id
        : null;

    // ======================================
    // GENERATE JWT TOKEN
    // ======================================

    const token = jwt.sign(
      {
        id: user.id,
        role: userRole,
        hospital_id: hospitalId
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    );

    // ======================================
    // LOGIN RESPONSE
    // ======================================

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: userRole,
        hospital_id: hospitalId
      }
    });

  } catch (err) {
    console.error('Login error:', err);

    return res.status(500).json({
      error: 'Login failed. Please try again.'
    });
  }
};
