const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const pricingController = require('../controllers/pricingController'); 

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
// PRICING APPROVALS
// ==========================================

router.get('/pricing/pending', pricingController.getPendingRequests);
router.put('/pricing/:id/review', pricingController.reviewPriceChange);

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
      pool.query("SELECT COUNT(*) AS total FROM ambulance WHERE status = 'available'"),
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'completed'), 0) AS completed,
          COALESCE(SUM(status = 'pending'), 0) AS pending,
          COALESCE(SUM(status = 'failed'), 0) AS failed,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS totalRevenue
        FROM payment
      `)
    ]);

    return res.json({
      hospitals: hospitalRows[0].total,
      patients: patientRows[0].total,
      staff: staffRows[0].total,
      emergencies: caseRows[0].total,
      ambulances: ambulanceRows[0].total,
      availableAmbulances: availableRows[0].total,
      payments: paymentRows[0].total,
      completedPayments: Number(paymentRows[0].completed),
      pendingPayments: Number(paymentRows[0].pending),
      failedPayments: Number(paymentRows[0].failed),
      totalRevenue: Number(paymentRows[0].totalRevenue)
    });

  } catch (error) {
    console.error('Admin statistics error:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// ==========================================
// SYSTEM ANALYTICS
// ==========================================

router.get('/analytics', async (req, res) => {
  try {
    const [casesByHospital] = await pool.query(`
      SELECT h.name AS hospital_name, COUNT(c.id) AS total_cases
      FROM hospital h
      LEFT JOIN \`case\` c ON c.hospital_id = h.id
      GROUP BY h.id, h.name
      ORDER BY total_cases DESC
    `);

    const [responseTimes] = await pool.query(`
      SELECT 
        h.name AS hospital_name,
        COALESCE(ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.requested_at, c.arrival_at)), 1), 0) AS avg_minutes,
        COUNT(c.id) AS completed_cases
      FROM hospital h
      LEFT JOIN \`case\` c ON c.hospital_id = h.id 
        AND c.arrival_at IS NOT NULL
        AND c.status IN ('arrived_at_hospital', 'handed_over', 'in_treatment', 'payment_pending', 'paid', 'closed')
      GROUP BY h.id, h.name
      HAVING completed_cases > 0
      ORDER BY avg_minutes ASC
    `);

    const [revenueByHospital] = await pool.query(`
      SELECT 
        h.name AS hospital_name,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM hospital h
      LEFT JOIN payment p ON p.hospital_id = h.id AND p.status = 'completed'
      GROUP BY h.id, h.name
      ORDER BY total_revenue DESC
    `);

    return res.json({ casesByHospital, responseTimes, revenueByHospital });

  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// ==========================================
// SETTLEMENTS OWED TO HOSPITALS
// ==========================================

router.get('/settlements', async (req, res) => {
  try {
    const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform cut

    const [settlements] = await pool.query(`
      SELECT 
        h.id AS hospital_id,
        h.name AS hospital_name,
        COUNT(p.id) AS total_transactions,
        COALESCE(SUM(p.amount), 0) AS total_collected,
        COALESCE(SUM(p.amount) * ?, 0) AS platform_fee,
        COALESCE(SUM(p.amount) * (1 - ?), 0) AS amount_owed_to_hospital
      FROM hospital h
      LEFT JOIN payment p ON p.hospital_id = h.id AND p.status = 'completed'
      GROUP BY h.id, h.name
      HAVING total_collected > 0
      ORDER BY amount_owed_to_hospital DESC
    `, [PLATFORM_FEE_PERCENTAGE, PLATFORM_FEE_PERCENTAGE]);

    res.json(settlements);
  } catch (err) {
    console.error('Settlements error:', err);
    res.status(500).json({ error: 'Failed to retrieve settlements' });
  }
});

// ==========================================
// CHANGE USER ROLE
// ==========================================
router.put('/users/:id/role', async (req, res) => {
  const userId = Number(req.params.id);
  const { role } = req.body;
  
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const validRoles = ['hospital_staff', 'driver', 'hospital_admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be hospital_staff, driver, or hospital_admin.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query('SELECT id, name, role, hospital_id FROM staff WHERE id = ? FOR UPDATE', [userId]);
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.role === 'super_admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Cannot change the role of a Super Admin' });
    }

    if (user.role === role) {
      await connection.rollback();
      return res.status(400).json({ error: `User is already a ${role}` });
    }

    // If demoting a driver, make sure they are not assigned to an ambulance
    if (user.role === 'driver' && role !== 'driver') {
      const [ambulances] = await connection.query('SELECT id FROM ambulance WHERE driver_id = ? LIMIT 1', [userId]);
      if (ambulances.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Cannot change role. This driver is currently assigned to an ambulance. Unassign them first.' });
      }
    }

    await connection.query('UPDATE staff SET role = ? WHERE id = ?', [role, userId]);
    await connection.commit();

    // Add to Audit Log
    await pool.query(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, [
      req.user.id,
      req.user.name || 'Super Admin',
      'super_admin',
      'ROLE_CHANGE',
      `Changed role for ${user.name} from ${user.role} to ${role}.`
    ]);

    return res.json({ message: `Role for ${user.name} successfully updated to ${role}.` });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Role change error:', err);
    return res.status(500).json({ error: 'Failed to update user role' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// HOSPITAL MANAGEMENT
// ==========================================

function validateHospital(data) {
  const { name, location, latitude, longitude } = data;

  if (
    typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
    typeof location !== 'string' || !location.trim() || location.trim().length > 150
  ) {
    return { error: 'Valid hospital name and location are required' };
  }

  if (
    latitude === null || latitude === undefined || latitude === '' ||
    longitude === null || longitude === undefined || longitude === ''
  ) {
    return { error: 'Latitude and longitude are required' };
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: 'Invalid GPS coordinates' };
  }

  return { hospital: { name: name.trim(), location: location.trim(), latitude: lat, longitude: lng } };
}

router.get('/hospitals', async (req, res) => {
  try {
    const [hospitals] = await pool.query(`
      SELECT id, name, location, latitude, longitude
      FROM hospital
      ORDER BY id ASC
    `);
    res.json(hospitals);
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ error: 'Failed to retrieve hospitals' });
  }
});

router.post('/hospitals', async (req, res) => {
  try {
    const validation = validateHospital(req.body || {});
    if (validation.error) return res.status(400).json({ error: validation.error });

    const { name, location, latitude, longitude } = validation.hospital;

    const [result] = await pool.query(
      `INSERT INTO hospital (name, location, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [name, location, latitude, longitude]
    );

    res.status(201).json({
      message: 'Hospital added successfully',
      hospital: { id: result.insertId, name, location, latitude, longitude }
    });
  } catch (error) {
    console.error('Add hospital error:', error);
    res.status(500).json({ error: 'Failed to add hospital' });
  }
});

router.put('/hospitals/:id', async (req, res) => {
  try {
    const hospitalId = Number(req.params.id);
    if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Invalid hospital ID' });

    const validation = validateHospital(req.body || {});
    if (validation.error) return res.status(400).json({ error: validation.error });

    const { name, location, latitude, longitude } = validation.hospital;

    const [result] = await pool.query(
      `UPDATE hospital SET name = ?, location = ?, latitude = ?, longitude = ? WHERE id = ?`,
      [name, location, latitude, longitude, hospitalId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Hospital not found' });

    res.json({ message: 'Hospital updated successfully' });
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
});

// ==========================================
// EMERGENCY MONITORING
// ==========================================

router.get('/emergencies', async (req, res) => {
  try {
    const [cases] = await pool.query(`
      SELECT
        c.id, c.patient_id, p.name AS patient_name, c.hospital_id, h.name AS hospital_name,
        c.ambulance_id, a.plate_number AS ambulance_plate, c.staff_id, c.emergency_desc,
        c.severity, c.status, c.requested_at, c.arrival_at, c.closed_at
      FROM \`case\` AS c
      LEFT JOIN patient AS p ON c.patient_id = p.id
      LEFT JOIN hospital AS h ON c.hospital_id = h.id
      LEFT JOIN ambulance AS a ON c.ambulance_id = a.id
      ORDER BY c.requested_at DESC, c.id DESC
    `);
    res.json(cases);
  } catch (error) {
    console.error('Admin emergency monitoring error:', error);
    res.status(500).json({ error: 'Failed to retrieve emergency cases' });
  }
});

// ==========================================
// AMBULANCE MANAGEMENT
// ==========================================

router.get('/ambulances', async (req, res) => {
  try {
    const [ambulances] = await pool.query(`
      SELECT
        a.id, a.plate_number, a.hospital_id, h.name AS hospital_name,
        a.driver_id, s.name AS driver_name, a.status, a.current_lat, a.current_lng
      FROM ambulance AS a
      LEFT JOIN hospital AS h ON a.hospital_id = h.id
      LEFT JOIN staff AS s ON a.driver_id = s.id
      ORDER BY a.id ASC
    `);
    res.json(ambulances);
  } catch (error) {
    console.error('Admin ambulance management error:', error);
    res.status(500).json({ error: 'Failed to retrieve ambulances' });
  }
});

router.post('/ambulances', async (req, res) => {
  try {
    const { plate_number, hospital_id } = req.body || {};
    const plate = typeof plate_number === 'string' ? plate_number.trim().toUpperCase() : '';
    const hospitalId = Number(hospital_id);

    if (!plate || plate.length > 20) return res.status(400).json({ error: 'Valid ambulance plate number is required' });
    if (hospital_id === null || hospital_id === undefined || hospital_id === '' || !Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Valid hospital ID is required' });

    const [hospitals] = await pool.query('SELECT id FROM hospital WHERE id = ?', [hospitalId]);
    if (hospitals.length === 0) return res.status(404).json({ error: 'Hospital not found' });

    const [existing] = await pool.query('SELECT id FROM ambulance WHERE plate_number = ?', [plate]);
    if (existing.length > 0) return res.status(409).json({ error: 'Ambulance plate number already registered' });

    const [result] = await pool.query(`INSERT INTO ambulance (plate_number, hospital_id, status) VALUES (?, ?, 'available')`, [plate, hospitalId]);

    return res.status(201).json({
      message: 'Ambulance registered successfully',
      ambulance: { id: result.insertId, plate_number: plate, hospital_id: hospitalId, driver_id: null, status: 'available' }
    });
  } catch (error) {
    console.error('Register ambulance error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ambulance already registered' });
    return res.status(500).json({ error: 'Failed to register ambulance' });
  }
});

router.put('/ambulances/:id', async (req, res) => {
  let connection;
  try {
    const ambulanceId = Number(req.params.id);
    const { plate_number, hospital_id, driver_id } = req.body || {};
    const plate = typeof plate_number === 'string' ? plate_number.trim().toUpperCase() : '';
    const hospitalId = Number(hospital_id);
    const driverId = driver_id === null || driver_id === undefined || driver_id === '' ? null : Number(driver_id);

    if (!Number.isSafeInteger(ambulanceId) || ambulanceId <= 0) return res.status(400).json({ error: 'Invalid ambulance ID' });
    if (!plate || plate.length > 20) return res.status(400).json({ error: 'Valid plate number is required' });
    if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Valid hospital ID is required' });
    if (driverId !== null && (!Number.isSafeInteger(driverId) || driverId <= 0)) return res.status(400).json({ error: 'Invalid driver ID' });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [ambulances] = await connection.query('SELECT * FROM ambulance WHERE id = ? FOR UPDATE', [ambulanceId]);
    if (ambulances.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const ambulance = ambulances[0];
    if (ambulance.status !== 'available') {
      await connection.rollback();
      return res.status(409).json({ error: 'Cannot edit an ambulance during an active dispatch' });
    }

    const [hospitals] = await connection.query('SELECT id FROM hospital WHERE id = ?', [hospitalId]);
    if (hospitals.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const [duplicates] = await connection.query('SELECT id FROM ambulance WHERE plate_number = ? AND id <> ?', [plate, ambulanceId]);
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Plate number already registered' });
    }

    if (driverId !== null) {
      const [drivers] = await connection.query(`SELECT id FROM staff WHERE id = ? AND hospital_id = ? AND role = 'driver'`, [driverId, hospitalId]);
      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Driver must belong to the selected hospital' });
      }

      const [assigned] = await connection.query(`SELECT id FROM ambulance WHERE driver_id = ? AND id <> ?`, [driverId, ambulanceId]);
      if (assigned.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Driver is already assigned to another ambulance' });
      }
    }

    await connection.query(`UPDATE ambulance SET plate_number = ?, hospital_id = ?, driver_id = ? WHERE id = ?`, [plate, hospitalId, driverId, ambulanceId]);
    await connection.commit();

    return res.json({ message: 'Ambulance updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update ambulance error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate ambulance or driver assignment' });
    return res.status(500).json({ error: 'Failed to update ambulance' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// DRIVERS
// ==========================================

router.get('/drivers', async (req, res) => {
  try {
    const [drivers] = await pool.query(`
      SELECT s.id, s.name, s.hospital_id, h.name AS hospital_name
      FROM staff AS s
      INNER JOIN hospital AS h ON s.hospital_id = h.id
      WHERE s.role = 'driver'
      ORDER BY h.name ASC, s.name ASC
    `);
    res.json(drivers);
  } catch (error) {
    console.error('Get ambulance drivers error:', error);
    res.status(500).json({ error: 'Failed to retrieve ambulance drivers' });
  }
});

router.post('/drivers', async (req, res) => {
  try {
    const { name, email, password, hospital_id } = req.body || {};
    const driverName = typeof name === 'string' ? name.trim() : '';
    const driverEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const hospitalId = Number(hospital_id);

    if (!driverName || driverName.length > 100) return res.status(400).json({ error: 'Valid driver name is required' });
    if (!driverEmail || driverEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverEmail)) return res.status(400).json({ error: 'Valid email address is required' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must contain at least 8 characters' });
    if (hospital_id === null || hospital_id === undefined || hospital_id === '' || !Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Valid hospital ID is required' });

    const [hospitals] = await pool.query('SELECT id FROM hospital WHERE id = ?', [hospitalId]);
    if (hospitals.length === 0) return res.status(404).json({ error: 'Hospital not found' });

    const [existing] = await pool.query('SELECT id FROM staff WHERE email = ?', [driverEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'A staff member with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(`INSERT INTO staff (hospital_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'driver')`, [hospitalId, driverName, driverEmail, passwordHash]);

    return res.status(201).json({
      message: 'Driver registered successfully',
      driver: { id: result.insertId, name: driverName, email: driverEmail, hospital_id: hospitalId, role: 'driver' }
    });
  } catch (error) {
    console.error('Register driver error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A staff member with this email already exists' });
    return res.status(500).json({ error: 'Failed to register driver' });
  }
});

// ==========================================
// STAFF MANAGEMENT
// ==========================================

router.get('/staff', async (req, res) => {
  try {
    const [staff] = await pool.query(`
      SELECT s.id, s.name, s.email, s.role, s.hospital_id, h.name AS hospital_name
      FROM staff AS s
      LEFT JOIN hospital AS h ON s.hospital_id = h.id
      ORDER BY s.hospital_id ASC, s.id ASC
    `);
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to retrieve staff records' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const { name, email, password, hospital_id } = req.body || {};
    const staffName = typeof name === 'string' ? name.trim() : '';
    const staffEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const hospitalId = Number(hospital_id);

    if (!staffName || staffName.length > 100) return res.status(400).json({ error: 'Valid staff name is required' });
    if (!staffEmail || staffEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) return res.status(400).json({ error: 'Valid email address is required' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must contain 8 to 72 characters' });
    if (hospital_id === null || hospital_id === undefined || hospital_id === '' || !Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Valid hospital ID is required' });

    const [hospitals] = await pool.query('SELECT id FROM hospital WHERE id = ?', [hospitalId]);
    if (hospitals.length === 0) return res.status(404).json({ error: 'Hospital not found' });

    const [existing] = await pool.query('SELECT id FROM staff WHERE email = ?', [staffEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'A staff member with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(`INSERT INTO staff (hospital_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'hospital_staff')`, [hospitalId, staffName, staffEmail, passwordHash]);

    return res.status(201).json({
      message: 'Hospital staff registered successfully',
      staff: { id: result.insertId, name: staffName, email: staffEmail, hospital_id: hospitalId, role: 'hospital_staff' }
    });
  } catch (error) {
    console.error('Register hospital staff error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A staff member with this email already exists' });
    return res.status(500).json({ error: 'Failed to register hospital staff' });
  }
});

router.put('/staff/:id', async (req, res) => {
  let connection;
  try {
    const staffId = Number(req.params.id);
    const { name, email, hospital_id } = req.body || {};
    const staffName = typeof name === 'string' ? name.trim() : '';
    const staffEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const hospitalId = Number(hospital_id);

    if (!Number.isSafeInteger(staffId) || staffId <= 0) return res.status(400).json({ error: 'Invalid staff ID' });
    if (!staffName || staffName.length > 100) return res.status(400).json({ error: 'Valid staff name is required' });
    if (!staffEmail || staffEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) return res.status(400).json({ error: 'Valid email address is required' });
    if (hospital_id === null || hospital_id === undefined || hospital_id === '' || !Number.isSafeInteger(hospitalId) || hospitalId <= 0) return res.status(400).json({ error: 'Valid hospital ID is required' });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [staffRows] = await connection.query('SELECT id, role, hospital_id FROM staff WHERE id = ? FOR UPDATE', [staffId]);
    if (staffRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const [hospitals] = await connection.query('SELECT id FROM hospital WHERE id = ?', [hospitalId]);
    if (hospitals.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const [duplicates] = await connection.query('SELECT id FROM staff WHERE email = ? AND id <> ?', [staffEmail, staffId]);
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Email address is already registered' });
    }

    const [activeCases] = await connection.query(`SELECT id FROM \`case\` WHERE staff_id = ? AND status <> 'closed' LIMIT 1`, [staffId]);
    if (staffRows[0].hospital_id !== hospitalId && activeCases.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'Cannot transfer staff during an active emergency' });
    }

    if (staffRows[0].role === 'driver' && staffRows[0].hospital_id !== hospitalId) {
      const [assigned] = await connection.query('SELECT id FROM ambulance WHERE driver_id = ? LIMIT 1', [staffId]);
      if (assigned.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'Unassign the driver from their ambulance before transferring hospitals' });
      }
    }

    await connection.query(`UPDATE staff SET name = ?, email = ?, hospital_id = ? WHERE id = ?`, [staffName, staffEmail, hospitalId, staffId]);
    await connection.commit();

    return res.json({ message: 'Staff details updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update staff error:', error);
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email address is already registered' });
    return res.status(500).json({ error: 'Failed to update staff details' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// PATIENTS & PAYMENTS
// ==========================================

router.get('/patients', async (req, res) => {
  try {
    const [patients] = await pool.query(`SELECT id, name, phone FROM patient ORDER BY id DESC`);
    res.json(patients);
  } catch (error) {
    console.error('Admin patient management error:', error);
    res.status(500).json({ error: 'Failed to retrieve patient records' });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const [payments] = await pool.query(`
      SELECT pay.id, pay.case_id, pay.hospital_id, h.name AS hospital_name,
             pay.mpesa_ref, pay.amount, pay.status, pay.phone_number, pay.paid_at
      FROM payment AS pay
      LEFT JOIN hospital AS h ON pay.hospital_id = h.id
      ORDER BY pay.id DESC
    `);
    res.json(payments);
  } catch (error) {
    console.error('Admin payment monitoring error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment records' });
  }
});

// ==========================================
// AUDIT LOGS
// ==========================================
router.get('/audit-logs', async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT id, actor_name, actor_role, action_type, description, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});

module.exports = router;