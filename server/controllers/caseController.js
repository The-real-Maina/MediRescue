
const pool = require('../config/db');

// ==========================================
// CREATE EMERGENCY CASE
// AUTOMATICALLY SELECT NEAREST HOSPITAL
// ==========================================

exports.createCase = async (req, res) => {
  const patientId = req.user.id;

  const {
    emergency_type,
    emergency_desc,
    pickup_lat,
    pickup_lng,
    severity
  } = req.body;

  if (!emergency_type || pickup_lat === undefined || pickup_lng === undefined) {
    return res.status(400).json({
      error: 'emergency_type, pickup_lat and pickup_lng are required'
    });
  }

  const patientLat = Number(pickup_lat);
  const patientLng = Number(pickup_lng);

  if (
    !Number.isFinite(patientLat) ||
    !Number.isFinite(patientLng) ||
    patientLat < -90 ||
    patientLat > 90 ||
    patientLng < -180 ||
    patientLng > 180
  ) {
    return res.status(400).json({
      error: 'Invalid patient location coordinates'
    });
  }

  const normalizedSeverity = severity || 'moderate';
  const validSeverities = ['low', 'moderate', 'high', 'critical'];

  if (!validSeverities.includes(normalizedSeverity)) {
    return res.status(400).json({
      error: 'Invalid emergency severity'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [hospitals] = await connection.query(`
      SELECT id, name, location, latitude, longitude
      FROM hospital
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    if (hospitals.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'No hospitals with location information were found'
      });
    }

    const toRadians = degrees => degrees * (Math.PI / 180);
    const earthRadiusKm = 6371;

    let nearestHospital = null;
    let shortestDistance = Infinity;

    for (const hospital of hospitals) {
      const hospitalLat = Number(hospital.latitude);
      const hospitalLng = Number(hospital.longitude);

      const latDifference = toRadians(hospitalLat - patientLat);
      const lngDifference = toRadians(hospitalLng - patientLng);

      const a =
        Math.sin(latDifference / 2) ** 2 +
        Math.cos(toRadians(patientLat)) *
        Math.cos(toRadians(hospitalLat)) *
        Math.sin(lngDifference / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = earthRadiusKm * c;

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestHospital = hospital;
      }
    }

    const [prices] = await connection.query(`
      SELECT amount
      FROM hospital_service_prices
      WHERE hospital_id = ?
        AND service_name = 'Emergency Response'
        AND severity = ?
      LIMIT 1
    `, [nearestHospital.id, normalizedSeverity]);

    const paymentAmount = prices.length > 0
      ? Number(prices[0].amount)
      : null;

    const [result] = await connection.query(`
      INSERT INTO \`case\` (
        patient_id, hospital_id, emergency_desc, status,
        severity, payment_amount, pickup_lat, pickup_lng, requested_at
      )
      VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, NOW())
    `, [
      patientId,
      nearestHospital.id,
      emergency_desc || emergency_type,
      normalizedSeverity,
      paymentAmount,
      patientLat,
      patientLng
    ]);

    const caseId = result.insertId;

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'requested', NULL, NOW())
    `, [caseId]);

    await connection.commit();

    return res.status(201).json({
      message: 'Emergency request sent successfully',
      case_id: caseId,
      status: 'requested',
      severity: normalizedSeverity,
      payment_amount: paymentAmount,
      hospital: {
        id: nearestHospital.id,
        name: nearestHospital.name,
        location: nearestHospital.location
      },
      distance_km: Number(shortestDistance.toFixed(2))
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Create case error:', err);
    return res.status(500).json({
      error: 'Failed to create emergency case'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// PATIENT: GET MY CASES
// ==========================================

exports.getMyCases = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.emergency_desc, c.status, c.severity,
        c.payment_amount, c.pickup_lat, c.pickup_lng,
        c.requested_at,
        h.id AS hospital_id,
        h.name AS hospital_name,
        h.location AS hospital_location
      FROM \`case\` c
      JOIN hospital h ON c.hospital_id = h.id
      WHERE c.patient_id = ?
      ORDER BY c.requested_at DESC
    `, [req.user.id]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Get patient cases error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve patient cases'
    });
  }
};

// ==========================================
// HOSPITAL STAFF: GET HOSPITAL CASES
// ==========================================

exports.getHospitalCases = async (req, res) => {
  const hospitalId = req.user.hospital_id;

  if (!hospitalId) {
    return res.status(400).json({
      error: 'Staff account is not assigned to a hospital'
    });
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.patient_id,
        p.name AS patient_name,
        p.phone AS patient_phone,
        c.emergency_desc, c.status, c.severity,
        c.pickup_lat, c.pickup_lng,
        c.requested_at, c.arrival_at, c.closed_at,
        c.ambulance_id, c.staff_id
      FROM \`case\` c
      JOIN patient p ON c.patient_id = p.id
      WHERE c.hospital_id = ?
      ORDER BY c.requested_at DESC
    `, [hospitalId]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Get hospital cases error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve hospital cases'
    });
  }
};

// ==========================================
// HOSPITAL STAFF: UPDATE CASE STATUS
// ==========================================

exports.updateCaseStatus = async (req, res) => {
  const caseId = Number(req.params.id);
  const staffId = req.user.id;
  const hospitalId = req.user.hospital_id;
  const { status } = req.body || {};

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  if (!hospitalId) {
    return res.status(400).json({
      error: 'Staff account is not assigned to a hospital'
    });
  }

  if (status === 'paid') {
    return res.status(403).json({
      error: 'Payment must be verified before marking a case as paid'
    });
  }

  const allowedStatuses = [
    'in_treatment',
    'payment_pending',
    'closed'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status for this endpoint'
    });
  }

  const staffTransitions = {
    handed_over: ['in_treatment'],
    in_treatment: ['payment_pending'],
    paid: ['closed']
  };

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT id, status, hospital_id, ambulance_id
      FROM \`case\`
      WHERE id = ? AND hospital_id = ?
      FOR UPDATE
    `, [caseId, hospitalId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Case not found for this hospital'
      });
    }

    const emergencyCase = cases[0];

    if (
      !staffTransitions[emergencyCase.status] ||
      !staffTransitions[emergencyCase.status].includes(status)
    ) {
      await connection.rollback();
      return res.status(409).json({
        error: `Cannot change case status from ${emergencyCase.status} to ${status}`
      });
    }

    if (status === 'closed') {
      const [payments] = await connection.query(`
        SELECT id
        FROM payment
        WHERE case_id = ?
          AND hospital_id = ?
          AND status = 'completed'
        LIMIT 1
      `, [caseId, hospitalId]);

      if (payments.length === 0) {
        await connection.rollback();
        return res.status(403).json({
          error: 'No completed payment record exists for this case'
        });
      }
    }

    await connection.query(`
      UPDATE \`case\`
      SET
        status = ?,
        staff_id = ?,
        closed_at = CASE
          WHEN ? = 'closed'
          THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END
      WHERE id = ? AND hospital_id = ?
    `, [status, staffId, status, caseId, hospitalId]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, ?, ?, NOW())
    `, [caseId, status, staffId]);

    if (status === 'closed' && emergencyCase.ambulance_id) {
      await connection.query(`
        UPDATE ambulance
        SET status = 'available'
        WHERE id = ? AND hospital_id = ?
      `, [emergencyCase.ambulance_id, hospitalId]);
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Case status updated successfully',
      case_id: caseId,
      status,
      changed_by: staffId,
      ambulance_released:
        status === 'closed' && Boolean(emergencyCase.ambulance_id)
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Update case status error:', err);
    return res.status(500).json({
      error: 'Failed to update case status'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// HOSPITAL STAFF: ASSIGN AMBULANCE
// ==========================================

exports.assignAmbulance = async (req, res) => {
  const caseId = Number(req.params.id);
  const staffId = req.user.id;
  const hospitalId = req.user.hospital_id;
  const { ambulance_id } = req.body || {};

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  if (!ambulance_id) {
    return res.status(400).json({
      error: 'ambulance_id is required'
    });
  }

  if (!hospitalId) {
    return res.status(400).json({
      error: 'Staff account is not assigned to a hospital'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT id, hospital_id, ambulance_id, status
      FROM \`case\`
      WHERE id = ? AND hospital_id = ?
      FOR UPDATE
    `, [caseId, hospitalId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Case not found for this hospital'
      });
    }

    const emergencyCase = cases[0];

    if (emergencyCase.ambulance_id) {
      await connection.rollback();
      return res.status(400).json({
        error: 'This case already has an ambulance assigned'
      });
    }

    if (!['requested', 'assigned'].includes(emergencyCase.status)) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Ambulance cannot be assigned at this case stage'
      });
    }

    const [ambulances] = await connection.query(`
      SELECT id, hospital_id, plate_number, status, driver_id
      FROM ambulance
      WHERE id = ? AND hospital_id = ?
      FOR UPDATE
    `, [ambulance_id, hospitalId]);

    if (ambulances.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Ambulance not found for this hospital'
      });
    }

    const ambulance = ambulances[0];

    if (ambulance.status !== 'available') {
      await connection.rollback();
      return res.status(400).json({
        error: 'Ambulance is not available'
      });
    }

    if (!ambulance.driver_id) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Cannot dispatch an ambulance without an assigned driver'
      });
    }

    const [drivers] = await connection.query(`
      SELECT id FROM staff
      WHERE id = ? AND hospital_id = ? AND role = 'driver'
    `, [ambulance.driver_id, hospitalId]);

    if (drivers.length === 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Invalid ambulance driver'
      });
    }

    await connection.query(`
      UPDATE \`case\`
      SET ambulance_id = ?, staff_id = ?, status = 'dispatched'
      WHERE id = ? AND hospital_id = ?
    `, [ambulance_id, staffId, caseId, hospitalId]);

    await connection.query(`
      UPDATE ambulance
      SET status = 'dispatched'
      WHERE id = ? AND hospital_id = ?
    `, [ambulance_id, hospitalId]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'dispatched', ?, NOW())
    `, [caseId, staffId]);

    await connection.commit();

    return res.status(200).json({
      message: 'Ambulance assigned successfully',
      case_id: caseId,
      ambulance_id: Number(ambulance_id),
      ambulance_plate: ambulance.plate_number,
      driver_id: ambulance.driver_id,
      status: 'dispatched'
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Assign ambulance error:', err);
    return res.status(500).json({
      error: 'Failed to assign ambulance'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// DRIVER: GET ASSIGNED CASES
// ==========================================

exports.getDriverAssignedCases = async (req, res) => {
  const driverId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  if (
    !Number.isSafeInteger(driverId) || driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) || hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid driver hospital assignment'
    });
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.emergency_desc, c.severity, c.status,
        c.pickup_lat, c.pickup_lng,
        c.requested_at, c.arrival_at,
        c.ambulance_id,
        a.plate_number AS ambulance_plate,
        p.name AS patient_name,
        p.phone AS patient_phone,
        h.name AS hospital_name,
        h.location AS hospital_location,
        h.latitude AS hospital_lat,
        h.longitude AS hospital_lng
      FROM \`case\` c
      INNER JOIN ambulance a
        ON a.id = c.ambulance_id
        AND a.hospital_id = c.hospital_id
      INNER JOIN staff s
        ON s.id = a.driver_id
        AND s.hospital_id = a.hospital_id
        AND s.role = 'driver'
      INNER JOIN patient p ON p.id = c.patient_id
      INNER JOIN hospital h ON h.id = c.hospital_id
      WHERE a.driver_id = ?
        AND a.hospital_id = ?
        AND c.status IN (
          'dispatched',
          'picked_up',
          'arrived_at_hospital'
        )
      ORDER BY c.requested_at DESC
    `, [driverId, hospitalId]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error('Get driver assigned cases error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve driver cases'
    });
  }
};

// ==========================================
// DRIVER: CONFIRM PATIENT PICKUP
// ==========================================

exports.confirmDriverPickup = async (req, res) => {
  const caseId = Number(req.params.id);
  const driverId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  if (
    !Number.isSafeInteger(driverId) || driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) || hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid driver hospital assignment'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT c.id, c.status
      FROM \`case\` c
      INNER JOIN ambulance a
        ON a.id = c.ambulance_id
        AND a.hospital_id = c.hospital_id
      INNER JOIN staff s
        ON s.id = a.driver_id
        AND s.hospital_id = a.hospital_id
        AND s.role = 'driver'
      WHERE c.id = ?
        AND c.hospital_id = ?
        AND a.driver_id = ?
      FOR UPDATE
    `, [caseId, hospitalId, driverId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Case not assigned to this driver'
      });
    }

    if (cases[0].status !== 'dispatched') {
      await connection.rollback();
      return res.status(409).json({
        error: 'Only dispatched cases can be marked picked_up'
      });
    }

    await connection.query(`
      UPDATE \`case\`
      SET status = 'picked_up'
      WHERE id = ? AND hospital_id = ?
    `, [caseId, hospitalId]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'picked_up', ?, NOW())
    `, [caseId, driverId]);

    await connection.commit();

    return res.status(200).json({
      message: 'Patient pickup confirmed',
      case_id: caseId,
      status: 'picked_up'
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Confirm driver pickup error:', err);
    return res.status(500).json({
      error: 'Failed to confirm patient pickup'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// DRIVER: CONFIRM HOSPITAL ARRIVAL
// ==========================================

exports.confirmHospitalArrival = async (req, res) => {
  const caseId = Number(req.params.id);
  const driverId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  if (
    !Number.isSafeInteger(driverId) || driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) || hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid driver hospital assignment'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT c.id, c.status
      FROM \`case\` c
      INNER JOIN ambulance a
        ON a.id = c.ambulance_id
        AND a.hospital_id = c.hospital_id
      INNER JOIN staff s
        ON s.id = a.driver_id
        AND s.hospital_id = a.hospital_id
        AND s.role = 'driver'
      WHERE c.id = ?
        AND c.hospital_id = ?
        AND a.driver_id = ?
      FOR UPDATE
    `, [caseId, hospitalId, driverId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Case not assigned to this driver'
      });
    }

    if (cases[0].status !== 'picked_up') {
      await connection.rollback();
      return res.status(409).json({
        error: 'Only picked_up cases can be marked arrived_at_hospital'
      });
    }

    await connection.query(`
      UPDATE \`case\`
      SET status = 'arrived_at_hospital',
          arrival_at = NOW()
      WHERE id = ? AND hospital_id = ?
    `, [caseId, hospitalId]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'arrived_at_hospital', ?, NOW())
    `, [caseId, driverId]);

    await connection.commit();

    return res.status(200).json({
      message: 'Hospital arrival confirmed',
      case_id: caseId,
      status: 'arrived_at_hospital'
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Confirm hospital arrival error:', err);
    return res.status(500).json({
      error: 'Failed to confirm hospital arrival'
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// HOSPITAL STAFF: CONFIRM PATIENT HANDOVER
// ==========================================

exports.confirmPatientHandover = async (req, res) => {
  const caseId = Number(req.params.id);
  const staffId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }

  if (
    !Number.isSafeInteger(staffId) || staffId <= 0 ||
    !Number.isSafeInteger(hospitalId) || hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid hospital staff assignment'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT id, status
      FROM \`case\`
      WHERE id = ? AND hospital_id = ?
      FOR UPDATE
    `, [caseId, hospitalId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Case not found for this hospital'
      });
    }

    if (cases[0].status !== 'arrived_at_hospital') {
      await connection.rollback();
      return res.status(409).json({
        error: 'Patient handover requires confirmed hospital arrival'
      });
    }

    await connection.query(`
      UPDATE \`case\`
      SET status = 'handed_over',
          staff_id = ?
      WHERE id = ? AND hospital_id = ?
    `, [staffId, caseId, hospitalId]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'handed_over', ?, NOW())
    `, [caseId, staffId]);

    await connection.commit();

    return res.status(200).json({
      message: 'Patient handover confirmed',
      case_id: caseId,
      status: 'handed_over'
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Confirm patient handover error:', err);
    return res.status(500).json({
      error: 'Failed to confirm patient handover'
    });
  } finally {
    if (connection) connection.release();
  }
};
