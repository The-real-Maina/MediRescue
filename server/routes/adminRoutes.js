const bcrypt = require('bcryptjs');

const express = require('express');
const router = express.Router();

const pool = require('../config/db');

const {
  authenticate,
  authorize
} = require('../middleware/auth');

// ==========================================
// SUPER ADMIN AUTHENTICATION
// ==========================================

router.use(authenticate);
router.use(authorize('super_admin'));

// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

router.get('/stats', async (req, res) => {
  try {
    const [
      [hospitalRows],
      [patientRows],
      [staffRows],
      [caseRows],
      [ambulanceRows],
      [availableRows],
      [paymentRows]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM hospital'),
      pool.query('SELECT COUNT(*) AS total FROM patient'),
      pool.query('SELECT COUNT(*) AS total FROM staff'),
      pool.query('SELECT COUNT(*) AS total FROM `case`'),
      pool.query('SELECT COUNT(*) AS total FROM ambulance'),
      pool.query(
        "SELECT COUNT(*) AS total FROM ambulance WHERE status = 'available'"
      ),
      pool.query('SELECT COUNT(*) AS total FROM payment')
    ]);

    res.json({
      hospitals: hospitalRows[0].total,
      patients: patientRows[0].total,
      staff: staffRows[0].total,
      emergencies: caseRows[0].total,
      ambulances: ambulanceRows[0].total,
      availableAmbulances: availableRows[0].total,
      payments: paymentRows[0].total
    });

  } catch (error) {
    console.error('Admin statistics error:', error);

    res.status(500).json({
      error: 'Failed to retrieve dashboard statistics'
    });
  }
});

// ==========================================
// VALIDATE HOSPITAL DETAILS
// ==========================================

function validateHospital(data) {
  const { name, location, latitude, longitude } = data;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof location !== 'string' ||
    !location.trim() ||
    location.trim().length > 150
  ) {
    return {
      error: 'Valid hospital name and location are required'
    };
  }

  if (
    latitude === null ||
    latitude === undefined ||
    latitude === '' ||
    longitude === null ||
    longitude === undefined ||
    longitude === ''
  ) {
    return {
      error: 'Latitude and longitude are required'
    };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return {
      error: 'Invalid GPS coordinates'
    };
  }

  return {
    hospital: {
      name: name.trim(),
      location: location.trim(),
      latitude: lat,
      longitude: lng
    }
  };
}

// ==========================================
// GET ALL HOSPITALS
// ==========================================

router.get('/hospitals', async (req, res) => {
  try {
    const [hospitals] = await pool.query(
      `SELECT
        id,
        name,
        location,
        latitude,
        longitude
       FROM hospital
       ORDER BY id ASC`
    );

    res.json(hospitals);

  } catch (error) {
    console.error('Get hospitals error:', error);

    res.status(500).json({
      error: 'Failed to retrieve hospitals'
    });
  }
});

// ==========================================
// ADD NEW HOSPITAL
// ==========================================

router.post('/hospitals', async (req, res) => {
  try {
    const validation = validateHospital(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error
      });
    }

    const {
      name,
      location,
      latitude,
      longitude
    } = validation.hospital;

    const [result] = await pool.query(
      `INSERT INTO hospital
       (name, location, latitude, longitude)
       VALUES (?, ?, ?, ?)`,
      [name, location, latitude, longitude]
    );

    res.status(201).json({
      message: 'Hospital added successfully',
      hospital: {
        id: result.insertId,
        name,
        location,
        latitude,
        longitude
      }
    });

  } catch (error) {
    console.error('Add hospital error:', error);

    res.status(500).json({
      error: 'Failed to add hospital'
    });
  }
});

// ==========================================
// UPDATE EXISTING HOSPITAL
// ==========================================

router.put('/hospitals/:id', async (req, res) => {
  try {
    const hospitalId = Number(req.params.id);

    if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({
        error: 'Invalid hospital ID'
      });
    }

    const validation = validateHospital(req.body || {});

    if (validation.error) {
      return res.status(400).json({
        error: validation.error
      });
    }

    const {
      name,
      location,
      latitude,
      longitude
    } = validation.hospital;

    const [result] = await pool.query(
      `UPDATE hospital
       SET
         name = ?,
         location = ?,
         latitude = ?,
         longitude = ?
       WHERE id = ?`,
      [name, location, latitude, longitude, hospitalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    res.json({
      message: 'Hospital updated successfully'
    });

  } catch (error) {
    console.error('Update hospital error:', error);

    res.status(500).json({
      error: 'Failed to update hospital'
    });
  }
});

// ==========================================
// EMERGENCY CASE MONITORING
// ==========================================

router.get('/emergencies', async (req, res) => {
  try {
    const [cases] = await pool.query(`
      SELECT
        c.id,
        c.patient_id,
        p.name AS patient_name,
        c.hospital_id,
        h.name AS hospital_name,
        c.ambulance_id,
        a.plate_number AS ambulance_plate,
        c.staff_id,
        c.emergency_desc,
        c.severity,
        c.status,
        c.requested_at,
        c.arrival_at,
        c.closed_at
      FROM \`case\` AS c
      LEFT JOIN patient AS p
        ON c.patient_id = p.id
      LEFT JOIN hospital AS h
        ON c.hospital_id = h.id
      LEFT JOIN ambulance AS a
        ON c.ambulance_id = a.id
      ORDER BY c.requested_at DESC, c.id DESC
    `);

    res.json(cases);

  } catch (error) {
    console.error(
      'Admin emergency monitoring error:',
      error
    );

    res.status(500).json({
      error: 'Failed to retrieve emergency cases'
    });
  }
});

// ==========================================
// GET ALL REGISTERED AMBULANCES
// ==========================================

router.get('/ambulances', async (req, res) => {
  try {
    const [ambulances] = await pool.query(`
      SELECT
        a.id,
        a.plate_number,
        a.hospital_id,
        h.name AS hospital_name,
        a.driver_id,
        s.name AS driver_name,
        a.status,
        a.current_lat,
        a.current_lng
      FROM ambulance AS a
      LEFT JOIN hospital AS h
        ON a.hospital_id = h.id
      LEFT JOIN staff AS s
        ON a.driver_id = s.id
      ORDER BY a.id ASC
    `);

    res.json(ambulances);

  } catch (error) {
    console.error(
      'Admin ambulance management error:',
      error
    );

    res.status(500).json({
      error: 'Failed to retrieve ambulances'
    });
  }
});

// ==========================================
// REGISTER NEW AMBULANCE
// ==========================================

router.post('/ambulances', async (req, res) => {
  try {
    const { plate_number, hospital_id } = req.body || {};

    const plate = typeof plate_number === 'string'
      ? plate_number.trim().toUpperCase()
      : '';

    const hospitalId = Number(hospital_id);

    // Validate plate number
    if (!plate || plate.length > 20) {
      return res.status(400).json({
        error: 'Valid ambulance plate number is required'
      });
    }

    // Validate hospital ID
    if (
      hospital_id === null ||
      hospital_id === undefined ||
      hospital_id === '' ||
      !Number.isSafeInteger(hospitalId) ||
      hospitalId <= 0
    ) {
      return res.status(400).json({
        error: 'Valid hospital ID is required'
      });
    }

    // Check that hospital exists
    const [hospitals] = await pool.query(
      'SELECT id FROM hospital WHERE id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Prevent duplicate plate numbers
    const [existing] = await pool.query(
      'SELECT id FROM ambulance WHERE plate_number = ?',
      [plate]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Ambulance plate number already registered'
      });
    }

    // Register new ambulance
    const [result] = await pool.query(
      `INSERT INTO ambulance
       (plate_number, hospital_id, status)
       VALUES (?, ?, 'available')`,
      [plate, hospitalId]
    );

    return res.status(201).json({
      message: 'Ambulance registered successfully',
      ambulance: {
        id: result.insertId,
        plate_number: plate,
        hospital_id: hospitalId,
        driver_id: null,
        status: 'available'
      }
    });

  } catch (error) {
    console.error('Register ambulance error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Ambulance already registered'
      });
    }

    return res.status(500).json({
      error: 'Failed to register ambulance'
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

// ==========================================
// GET REGISTERED AMBULANCE DRIVERS
// SUPER ADMIN ONLY
// ==========================================

router.get('/drivers', async (req, res) => {
  try {
    const [drivers] = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.hospital_id,
        h.name AS hospital_name
      FROM staff AS s
      INNER JOIN hospital AS h
        ON s.hospital_id = h.id
      WHERE s.role = 'driver'
      ORDER BY h.name ASC, s.name ASC
    `);

    res.json(drivers);

  } catch (error) {
    console.error('Get ambulance drivers error:', error);

    res.status(500).json({
      error: 'Failed to retrieve ambulance drivers'
    });
  }
});

// ==========================================
// UPDATE AMBULANCE DETAILS
// SUPER ADMIN ONLY
// ==========================================

router.put('/ambulances/:id', async (req, res) => {
  let connection;

  try {
    const ambulanceId = Number(req.params.id);
    const { plate_number, hospital_id, driver_id } = req.body || {};

    const plate = typeof plate_number === 'string'
      ? plate_number.trim().toUpperCase()
      : '';

    const hospitalId = Number(hospital_id);

    const driverId =
      driver_id === null ||
      driver_id === undefined ||
      driver_id === ''
        ? null
        : Number(driver_id);

    if (!Number.isSafeInteger(ambulanceId) || ambulanceId <= 0) {
      return res.status(400).json({
        error: 'Invalid ambulance ID'
      });
    }

    if (!plate || plate.length > 20) {
      return res.status(400).json({
        error: 'Valid plate number is required'
      });
    }

    if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
      return res.status(400).json({
        error: 'Valid hospital ID is required'
      });
    }

    if (
      driverId !== null &&
      (!Number.isSafeInteger(driverId) || driverId <= 0)
    ) {
      return res.status(400).json({
        error: 'Invalid driver ID'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock ambulance while checking its status
    const [ambulances] = await connection.query(
      'SELECT * FROM ambulance WHERE id = ? FOR UPDATE',
      [ambulanceId]
    );

    if (ambulances.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Ambulance not found'
      });
    }

    const ambulance = ambulances[0];

    // Prevent editing ambulances currently on duty
    if (ambulance.status !== 'available') {
      await connection.rollback();

      return res.status(409).json({
        error: 'Cannot edit an ambulance during an active dispatch'
      });
    }

    // Verify hospital
    const [hospitals] = await connection.query(
      'SELECT id FROM hospital WHERE id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Check duplicate plate number
    const [duplicates] = await connection.query(
      'SELECT id FROM ambulance WHERE plate_number = ? AND id <> ?',
      [plate, ambulanceId]
    );

    if (duplicates.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        error: 'Plate number already registered'
      });
    }

    // Validate driver assignment
    if (driverId !== null) {
      const [drivers] = await connection.query(
        `SELECT id
         FROM staff
         WHERE id = ?
           AND hospital_id = ?
           AND role = 'driver'`,
        [driverId, hospitalId]
      );

      if (drivers.length === 0) {
        await connection.rollback();

        return res.status(400).json({
          error: 'Driver must belong to the selected hospital'
        });
      }

      // Prevent assigning one driver to multiple ambulances
      const [assigned] = await connection.query(
        `SELECT id
         FROM ambulance
         WHERE driver_id = ?
           AND id <> ?`,
        [driverId, ambulanceId]
      );

      if (assigned.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          error: 'Driver is already assigned to another ambulance'
        });
      }
    }

    // Update ambulance
    await connection.query(
      `UPDATE ambulance
       SET plate_number = ?,
           hospital_id = ?,
           driver_id = ?
       WHERE id = ?`,
      [plate, hospitalId, driverId, ambulanceId]
    );

    await connection.commit();

    return res.json({
      message: 'Ambulance updated successfully'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Update ambulance error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate ambulance or driver assignment'
      });
    }

    return res.status(500).json({
      error: 'Failed to update ambulance'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// REGISTER NEW AMBULANCE DRIVER
// SUPER ADMIN ONLY
// ==========================================

router.post('/drivers', async (req, res) => {
  try {
    const { name, email, password, hospital_id } = req.body || {};

    const driverName =
      typeof name === 'string' ? name.trim() : '';

    const driverEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const hospitalId = Number(hospital_id);

    // Validate details
    if (!driverName || driverName.length > 100) {
      return res.status(400).json({
        error: 'Valid driver name is required'
      });
    }

    if (
      !driverEmail ||
      driverEmail.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverEmail)
    ) {
      return res.status(400).json({
        error: 'Valid email address is required'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Password must contain at least 8 characters'
      });
    }

    if (
      hospital_id === null ||
      hospital_id === undefined ||
      hospital_id === '' ||
      !Number.isSafeInteger(hospitalId) ||
      hospitalId <= 0
    ) {
      return res.status(400).json({
        error: 'Valid hospital ID is required'
      });
    }

    // Check hospital exists
    const [hospitals] = await pool.query(
      'SELECT id FROM hospital WHERE id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Check existing staff email
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE email = ?',
      [driverEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'A staff member with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create driver account
    const [result] = await pool.query(
      `INSERT INTO staff
       (hospital_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'driver')`,
      [
        hospitalId,
        driverName,
        driverEmail,
        passwordHash
      ]
    );

    return res.status(201).json({
      message: 'Driver registered successfully',
      driver: {
        id: result.insertId,
        name: driverName,
        email: driverEmail,
        hospital_id: hospitalId,
        role: 'driver'
      }
    });

  } catch (error) {
    console.error('Register driver error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A staff member with this email already exists'
      });
    }

    return res.status(500).json({
      error: 'Failed to register driver'
    });
  }
});

// ==========================================
// SUPER ADMIN - GET ALL STAFF
// ==========================================

router.get('/staff', async (req, res) => {
  try {
    const [staff] = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.role,
        s.hospital_id,
        h.name AS hospital_name
      FROM staff AS s
      LEFT JOIN hospital AS h
        ON s.hospital_id = h.id
      ORDER BY s.hospital_id ASC, s.id ASC
    `);

    res.json(staff);

  } catch (error) {
    console.error('Get staff error:', error);

    res.status(500).json({
      error: 'Failed to retrieve staff records'
    });
  }
});

 // ==========================================
 // REGISTER NEW HOSPITAL STAFF
 // SUPER ADMIN ONLY
 // ==========================================

router.post('/staff', async (req, res) => {
  try {
    const { name, email, password, hospital_id } = req.body || {};

    const staffName =
      typeof name === 'string' ? name.trim() : '';

    const staffEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const hospitalId = Number(hospital_id);

    // Validate staff name
    if (!staffName || staffName.length > 100) {
      return res.status(400).json({
        error: 'Valid staff name is required'
      });
    }

    // Validate email
    if (
      !staffEmail ||
      staffEmail.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)
    ) {
      return res.status(400).json({
        error: 'Valid email address is required'
      });
    }

    // Validate password
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        error: 'Password must contain 8 to 72 characters'
      });
    }

    // Validate hospital ID
    if (
      hospital_id === null ||
      hospital_id === undefined ||
      hospital_id === '' ||
      !Number.isSafeInteger(hospitalId) ||
      hospitalId <= 0
    ) {
      return res.status(400).json({
        error: 'Valid hospital ID is required'
      });
    }

    // Verify hospital exists
    const [hospitals] = await pool.query(
      'SELECT id FROM hospital WHERE id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    // Prevent duplicate staff email
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE email = ?',
      [staffEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'A staff member with this email already exists'
      });
    }

    // Hash password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Create hospital staff account
    const [result] = await pool.query(
      `INSERT INTO staff
       (hospital_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'hospital_staff')`,
      [
        hospitalId,
        staffName,
        staffEmail,
        passwordHash
      ]
    );

    return res.status(201).json({
      message: 'Hospital staff registered successfully',
      staff: {
        id: result.insertId,
        name: staffName,
        email: staffEmail,
        hospital_id: hospitalId,
        role: 'hospital_staff'
      }
    });

  } catch (error) {
    console.error('Register hospital staff error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'A staff member with this email already exists'
      });
    }

    return res.status(500).json({
      error: 'Failed to register hospital staff'
    });
  }
});

// ==========================================
// SUPER ADMIN - UPDATE STAFF DETAILS
// ==========================================

router.put('/staff/:id', async (req, res) => {
  let connection;

  try {
    const staffId = Number(req.params.id);
    const { name, email, hospital_id } = req.body || {};

    const staffName =
      typeof name === 'string' ? name.trim() : '';

    const staffEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    const hospitalId = Number(hospital_id);

    if (!Number.isSafeInteger(staffId) || staffId <= 0) {
      return res.status(400).json({
        error: 'Invalid staff ID'
      });
    }

    if (!staffName || staffName.length > 100) {
      return res.status(400).json({
        error: 'Valid staff name is required'
      });
    }

    if (
      !staffEmail ||
      staffEmail.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)
    ) {
      return res.status(400).json({
        error: 'Valid email address is required'
      });
    }

    if (
      hospital_id === null ||
      hospital_id === undefined ||
      hospital_id === '' ||
      !Number.isSafeInteger(hospitalId) ||
      hospitalId <= 0
    ) {
      return res.status(400).json({
        error: 'Valid hospital ID is required'
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [staffRows] = await connection.query(
      'SELECT id, role, hospital_id FROM staff WHERE id = ? FOR UPDATE',
      [staffId]
    );

    if (staffRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Staff member not found'
      });
    }

    const [hospitals] = await connection.query(
      'SELECT id FROM hospital WHERE id = ?',
      [hospitalId]
    );

    if (hospitals.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Hospital not found'
      });
    }

    const [duplicates] = await connection.query(
      'SELECT id FROM staff WHERE email = ? AND id <> ?',
      [staffEmail, staffId]
    );

    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Email address is already registered'
      });
    }

    // Do not move staff assigned to an active emergency.
    const [activeCases] = await connection.query(
      `SELECT id FROM \`case\`
       WHERE staff_id = ?
       AND status <> 'closed'
       LIMIT 1`,
      [staffId]
    );

    if (
      staffRows[0].hospital_id !== hospitalId &&
      activeCases.length > 0
    ) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Cannot transfer staff during an active emergency'
      });
    }

    // Do not transfer drivers assigned to ambulances.
    if (
      staffRows[0].role === 'driver' &&
      staffRows[0].hospital_id !== hospitalId
    ) {
      const [assigned] = await connection.query(
        'SELECT id FROM ambulance WHERE driver_id = ? LIMIT 1',
        [staffId]
      );

      if (assigned.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          error: 'Unassign the driver from their ambulance before transferring hospitals'
        });
      }
    }

    await connection.query(
      `UPDATE staff
       SET name = ?, email = ?, hospital_id = ?
       WHERE id = ?`,
      [staffName, staffEmail, hospitalId, staffId]
    );

    await connection.commit();

    return res.json({
      message: 'Staff details updated successfully'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Update staff error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Email address is already registered'
      });
    }

    return res.status(500).json({
      error: 'Failed to update staff details'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// SUPER ADMIN - PATIENT MANAGEMENT
// ==========================================

router.get('/patients', async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT
        id,
        name,
        phone
      FROM patient
      ORDER BY id DESC
    `);

    res.json(patients);

  } catch (error) {
    console.error('Admin patient management error:', error);

    res.status(500).json({
      error: 'Failed to retrieve patient records'
    });
  }
});


// ==========================================
// SUPER ADMIN - PAYMENT MANAGEMENT
// ==========================================

router.get('/payments', async (req, res) => {
  try {
    const [payments] = await pool.query(`
      SELECT
        pay.id,
        pay.case_id,
        pay.hospital_id,
        h.name AS hospital_name,
        pay.mpesa_ref,
        pay.amount,
        pay.status,
        pay.phone_number,
        pay.paid_at
      FROM payment AS pay
      LEFT JOIN hospital AS h
        ON pay.hospital_id = h.id
      ORDER BY pay.id DESC
    `);

    res.json(payments);

  } catch (error) {
    console.error('Admin payment monitoring error:', error);

    res.status(500).json({
      error: 'Failed to retrieve payment records'
    });
  }
});

module.exports = router;
