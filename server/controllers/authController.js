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
  } = req.body;

  try {
    // Required fields
    if (!name || !phone || !password) {
      return res.status(400).json({
        error: 'Name, phone and password are required'
      });
    }

    // Password length
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if patient already exists
    const [existing] = await pool.query(
      'SELECT id FROM patient WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'A patient with this phone number already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert patient
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

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        id: result.insertId,
        name,
        phone
      }
    });

  } catch (err) {
    console.error('Registration error:', err);

    res.status(500).json({
      error: err.message
    });
  }
};


// ==========================================
// LOGIN
// ==========================================
exports.login = async (req, res) => {
  const { email, phone, password, role } = req.body;

  try {
    let rows;

    if (role === 'patient') {
      [rows] = await pool.query(
        'SELECT * FROM patient WHERE phone = ?',
        [phone]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM staff WHERE email = ?',
        [email]
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const user = rows[0];

    const match = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!match) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: role === 'patient' ? 'patient' : user.role,
        hospital_id: user.hospital_id || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: role === 'patient' ? 'patient' : user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);

    res.status(500).json({
      error: err.message
    });
  }
};