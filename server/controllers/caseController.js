
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

  if (
    !emergency_type ||
    pickup_lat === undefined ||
    pickup_lng === undefined
  ) {
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

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [hospitals] = await connection.query(`
      SELECT
        id,
        name,
        location,
        latitude,
        longitude
      FROM hospital
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
    `);

    if (hospitals.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'No hospitals with location information were found'
      });
    }

    const toRadians = (degrees) => {
      return degrees * (Math.PI / 180);
    };

    const earthRadiusKm = 6371;

    let nearestHospital = null;
    let shortestDistance = Infinity;

    for (const hospital of hospitals) {
      const hospitalLat = Number(hospital.latitude);
      const hospitalLng = Number(hospital.longitude);

      const latDifference = toRadians(
        hospitalLat - patientLat
      );

      const lngDifference = toRadians(
        hospitalLng - patientLng
      );

      const a =
        Math.sin(latDifference / 2) *
          Math.sin(latDifference / 2) +
        Math.cos(toRadians(patientLat)) *
          Math.cos(toRadians(hospitalLat)) *
          Math.sin(lngDifference / 2) *
          Math.sin(lngDifference / 2);

      const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

      const distance = earthRadiusKm * c;

      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestHospital = hospital;
      }
    }

    if (!nearestHospital) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Unable to determine the nearest hospital'
      });
    }

    const [result] = await connection.query(
      `
      INSERT INTO \`case\`
      (
        patient_id,
        hospital_id,
        emergency_desc,
        status,
        severity,
        pickup_lat,
        pickup_lng,
        requested_at
      )
      VALUES (?, ?, ?, 'requested', ?, ?, ?, NOW())
      `,
      [
        patientId,
        nearestHospital.id,
        emergency_desc || emergency_type,
        severity || 'moderate',
        patientLat,
        patientLng
      ]
    );

    const caseId = result.insertId;

    await connection.query(
      `
      INSERT INTO case_status_log
      (
        case_id,
        status,
        changed_by,
        changed_at
      )
      VALUES (?, 'requested', NULL, NOW())
      `,
      [caseId]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Emergency request sent successfully',
      case_id: caseId,
      status: 'requested',
      hospital: {
        id: nearestHospital.id,
        name: nearestHospital.name,
        location: nearestHospital.location
      },
      distance_km: Number(shortestDistance.toFixed(2))
    });

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Create case error:', err);

    return res.status(500).json({
      error: 'Failed to create emergency case'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ==========================================
// GET LOGGED-IN PATIENT'S CASES
// ==========================================

exports.getMyCases = async (req, res) => {
  const patientId = req.user.id;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.emergency_desc,
        c.status,
        c.severity,
        c.pickup_lat,
        c.pickup_lng,
        c.requested_at,
        h.id AS hospital_id,
        h.name AS hospital_name,
        h.location AS hospital_location
      FROM \`case\` c
      JOIN hospital h
        ON c.hospital_id = h.id
      WHERE c.patient_id = ?
      ORDER BY c.requested_at DESC
      `,
      [patientId]
    );

    return res.status(200).json(rows);

  } catch (err) {
    console.error('Get patient cases error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve patient cases'
    });
  }
};

// ==========================================
// GET CASES FOR LOGGED-IN HOSPITAL STAFF
// ==========================================

exports.getHospitalCases = async (req, res) => {
  const hospitalId = req.user.hospital_id;

  if (!hospitalId) {
    return res.status(400).json({
      error: 'Staff account is not assigned to a hospital'
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.patient_id,
        p.name AS patient_name,
        p.phone AS patient_phone,
        c.emergency_desc,
        c.status,
        c.severity,
        c.pickup_lat,
        c.pickup_lng,
        c.requested_at,
        c.arrival_at,
        c.closed_at,
        c.ambulance_id,
        c.staff_id
      FROM \`case\` c
      JOIN patient p
        ON c.patient_id = p.id
      WHERE c.hospital_id = ?
      ORDER BY c.requested_at DESC
      `,
      [hospitalId]
    );

    return res.status(200).json(rows);

  } catch (err) {
    console.error('Get hospital cases error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve hospital cases'
    });
  }
};

// ==========================================
// UPDATE EMERGENCY CASE STATUS
// PAYMENT-PROTECTED WORKFLOW
// ==========================================

exports.updateCaseStatus = async (req, res) => {
  const caseId = req.params.id;
  const staffId = req.user.id;
  const hospitalId = req.user.hospital_id;
  const { status } = req.body;

  const allowedStatuses = [
    'assigned',
    'dispatched',
    'picked_up',
    'in_treatment',
    'payment_pending',
    'closed'
  ];

  // Only the payment verification workflow may set "paid".
  if (status === 'paid') {
    return res.status(403).json({
      error: 'Payment must be verified before marking a case as paid'
    });
  }

  if (!status) {
    return res.status(400).json({
      error: 'status is required'
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid case status'
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

    // Lock the case while updating its status.
    const [cases] = await connection.query(
      `
      SELECT
        id,
        status,
        hospital_id,
        ambulance_id
      FROM \`case\`
      WHERE id = ?
        AND hospital_id = ?
      FOR UPDATE
      `,
      [caseId, hospitalId]
    );

    if (cases.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Case not found for this hospital'
      });
    }

    const emergencyCase = cases[0];

    // A closed case must not be reopened.
    if (emergencyCase.status === 'closed') {
      await connection.rollback();

      return res.status(409).json({
        error: 'This case is already closed'
      });
    }

    // Prevent manual updates from reversing a paid case.
    if (
      emergencyCase.status === 'paid' &&
      status !== 'closed'
    ) {
      await connection.rollback();

      return res.status(409).json({
        error: 'A paid case can only proceed to closure'
      });
    }

    // Avoid duplicate status history entries.
    if (emergencyCase.status === status) {
      await connection.rollback();

      return res.status(409).json({
        error: 'The case already has this status'
      });
    }

    // ======================================
    // VERIFY PAYMENT BEFORE CASE CLOSURE
    // ======================================

    if (status === 'closed') {
      if (emergencyCase.status !== 'paid') {
        await connection.rollback();

        return res.status(409).json({
          error: 'The case must be paid before it can be closed'
        });
      }

      const [payments] = await connection.query(
        `
        SELECT id
        FROM payment
        WHERE case_id = ?
          AND hospital_id = ?
          AND status = 'completed'
        LIMIT 1
        `,
        [caseId, hospitalId]
      );

      if (payments.length === 0) {
        await connection.rollback();

        return res.status(403).json({
          error: 'No completed payment record exists for this case'
        });
      }
    }

    // ======================================
    // UPDATE CASE STATUS
    // ======================================

    await connection.query(
      `
      UPDATE \`case\`
      SET
        status = ?,
        staff_id = ?,
        arrival_at = CASE
          WHEN ? = 'in_treatment'
          THEN COALESCE(arrival_at, NOW())
          ELSE arrival_at
        END,
        closed_at = CASE
          WHEN ? = 'closed'
          THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END
      WHERE id = ?
      `,
      [
        status,
        staffId,
        status,
        status,
        caseId
      ]
    );

    // Record the status change.
    await connection.query(
      `
      INSERT INTO case_status_log
      (
        case_id,
        status,
        changed_by,
        changed_at
      )
      VALUES (?, ?, ?, NOW())
      `,
      [caseId, status, staffId]
    );

    // Release ambulance when a paid case is closed.
    if (
      status === 'closed' &&
      emergencyCase.ambulance_id
    ) {
      await connection.query(
        `
        UPDATE ambulance
        SET status = 'available'
        WHERE id = ?
          AND hospital_id = ?
        `,
        [emergencyCase.ambulance_id, hospitalId]
      );
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Case status updated successfully',
      case_id: Number(caseId),
      status,
      changed_by: staffId,
      ambulance_released:
        status === 'closed' &&
        Boolean(emergencyCase.ambulance_id)
    });

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Update case status error:', err);

    return res.status(500).json({
      error: 'Failed to update case status'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ==========================================
// ASSIGN AMBULANCE TO EMERGENCY CASE
// ==========================================

exports.assignAmbulance = async (req, res) => {
  const caseId = req.params.id;
  const staffId = req.user.id;
  const hospitalId = req.user.hospital_id;
  const { ambulance_id } = req.body;

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

    // ======================================
    // CHECK AND LOCK CASE
    // ======================================

    const [cases] = await connection.query(
      `
      SELECT
        id,
        hospital_id,
        ambulance_id,
        status
      FROM \`case\`
      WHERE id = ?
        AND hospital_id = ?
      FOR UPDATE
      `,
      [caseId, hospitalId]
    );

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

    if (
      emergencyCase.status !== 'requested' &&
      emergencyCase.status !== 'assigned'
    ) {
      await connection.rollback();

      return res.status(409).json({
        error: 'Ambulance cannot be assigned at this case stage'
      });
    }

    // ======================================
    // CHECK AND LOCK AMBULANCE
    // ======================================

    const [ambulances] = await connection.query(
      `
      SELECT
        id,
        hospital_id,
        plate_number,
        status,
        driver_id
      FROM ambulance
      WHERE id = ?
        AND hospital_id = ?
      FOR UPDATE
      `,
      [ambulance_id, hospitalId]
    );

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

    // ======================================
    // ASSIGN AMBULANCE
    // ======================================

    await connection.query(
      `
      UPDATE \`case\`
      SET
        ambulance_id = ?,
        staff_id = ?,
        status = 'dispatched'
      WHERE id = ?
      `,
      [ambulance_id, staffId, caseId]
    );

    await connection.query(
      `
      UPDATE ambulance
      SET status = 'dispatched'
      WHERE id = ?
      `,
      [ambulance_id]
    );

    // Record dispatch history.
    await connection.query(
      `
      INSERT INTO case_status_log
      (
        case_id,
        status,
        changed_by,
        changed_at
      )
      VALUES (?, 'dispatched', ?, NOW())
      `,
      [caseId, staffId]
    );

    await connection.commit();

    return res.status(200).json({
      message: 'Ambulance assigned successfully',
      case_id: Number(caseId),
      ambulance_id: Number(ambulance_id),
      ambulance_plate: ambulance.plate_number,
      driver_id: ambulance.driver_id,
      status: 'dispatched'
    });

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Assign ambulance error:', err);

    return res.status(500).json({
      error: 'Failed to assign ambulance'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};
