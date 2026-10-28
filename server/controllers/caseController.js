const pool = require('../config/db');

// Must match hospital_service_prices.service_name exactly.
const EMERGENCY_SERVICE_NAME = 'Emergency Medical Response';

// ==========================================
// HELPER: FIND NEAREST HOSPITAL
// ==========================================

function findNearestHospital(hospitals, patientLat, patientLng) {
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

  return { nearestHospital, shortestDistance };
}

// ==========================================
// PREVIEW NEAREST HOSPITAL
// ==========================================

exports.getNearestHospital = async (req, res) => {
  const { pickup_lat, pickup_lng } = req.body || {};

  if (
    pickup_lat === undefined ||
    pickup_lng === undefined ||
    pickup_lat === null ||
    pickup_lng === null ||
    pickup_lat === '' ||
    pickup_lng === ''
  ) {
    return res.status(400).json({
      error: 'Patient GPS coordinates are required'
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
      error: 'Invalid patient GPS coordinates'
    });
  }

  try {
    const [hospitals] = await pool.query(`
      SELECT id, name, location, latitude, longitude
      FROM hospital
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
    `);

    if (hospitals.length === 0) {
      return res.status(404).json({
        error: 'No hospitals with location information were found'
      });
    }

    const { nearestHospital, shortestDistance } =
      findNearestHospital(hospitals, patientLat, patientLng);

    return res.status(200).json({
      message: 'Nearest hospital identified',
      hospital: {
        id: nearestHospital.id,
        name: nearestHospital.name,
        location: nearestHospital.location
      },
      distance_km: Number(shortestDistance.toFixed(2))
    });

  } catch (err) {
    console.error('Nearest hospital preview error:', err);

    return res.status(500).json({
      error: 'Failed to identify nearest hospital'
    });
  }
};

// ==========================================
// CREATE EMERGENCY CASE WITH REROUTING
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

    // Find hospitals with valid GPS coordinates.
    const [hospitals] = await connection.query(`
      SELECT id, name, location, latitude, longitude
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

    // A hospital is dispatch-ready when it has an available
    // ambulance and a valid driver assigned to that hospital.
    const [readyHospitals] = await connection.query(`
      SELECT DISTINCT h.id
      FROM hospital h
      INNER JOIN ambulance a
        ON a.hospital_id = h.id
       AND a.status = 'available'
       AND a.driver_id IS NOT NULL
      INNER JOIN staff s
        ON s.id = a.driver_id
       AND s.hospital_id = h.id
       AND s.role = 'driver'
      WHERE h.latitude IS NOT NULL
        AND h.longitude IS NOT NULL
    `);

    const readyHospitalIds = new Set(
      readyHospitals.map(row => Number(row.id))
    );

    const {
      nearestHospital: originallyNearestHospital,
      shortestDistance: originalDistance
    } = findNearestHospital(hospitals, patientLat, patientLng);

    // Prefer the nearest hospital that can dispatch an ambulance.
    // If none can, record the case at the geographically nearest
    // hospital so the control room can intervene.
    const dispatchReadyOptions = hospitals.filter(hospital =>
      readyHospitalIds.has(Number(hospital.id))
    );

    let selectedHospital = originallyNearestHospital;
    let selectedDistance = originalDistance;

    const noAvailableAmbulanceAnywhere =
      dispatchReadyOptions.length === 0;

    if (dispatchReadyOptions.length > 0) {
      const nearestReady = findNearestHospital(
        dispatchReadyOptions,
        patientLat,
        patientLng
      );

      selectedHospital = nearestReady.nearestHospital;
      selectedDistance = nearestReady.shortestDistance;
    }

    const wasRerouted =
      Number(selectedHospital.id) !==
      Number(originallyNearestHospital.id);

    // Use the price belonging to the selected hospital.
    const [prices] = await connection.query(`
      SELECT amount
      FROM hospital_service_prices
      WHERE hospital_id = ?
        AND service_name = ?
        AND severity = ?
      LIMIT 1
    `, [
      selectedHospital.id,
      EMERGENCY_SERVICE_NAME,
      normalizedSeverity
    ]);

    if (prices.length === 0) {
      console.warn(
        `No "${EMERGENCY_SERVICE_NAME}" price found for hospital ` +
        `${selectedHospital.id} and severity "${normalizedSeverity}". ` +
        'Case will be created without a payment amount.'
      );
    }

    const paymentAmount = prices.length > 0
      ? Number(prices[0].amount)
      : null;

    const [result] = await connection.query(`
      INSERT INTO \`case\` (
        patient_id,
        hospital_id,
        emergency_desc,
        status,
        severity,
        payment_amount,
        pickup_lat,
        pickup_lng,
        requested_at
      )
      VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, NOW())
    `, [
      patientId,
      selectedHospital.id,
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

    let message = 'Emergency request sent successfully';

    if (wasRerouted) {
      message =
        'The nearest hospital has no dispatch-ready ambulance. ' +
        'Your request was rerouted to the nearest hospital with ' +
        'an available ambulance and driver.';
    } else if (noAvailableAmbulanceAnywhere) {
      message =
        'Emergency request recorded at the nearest hospital, but ' +
        'no hospital currently has a dispatch-ready ambulance. ' +
        'Urgent control-room assistance is required.';
    }

    return res.status(201).json({
      message,
      case_id: caseId,
      status: 'requested',
      severity: normalizedSeverity,
      payment_amount: paymentAmount,

      hospital: {
        id: selectedHospital.id,
        name: selectedHospital.name,
        location: selectedHospital.location
      },

      distance_km: Number(selectedDistance.toFixed(2)),
      rerouted: wasRerouted,

      original_nearest_hospital: {
        id: originallyNearestHospital.id,
        name: originallyNearestHospital.name,
        location: originallyNearestHospital.location,
        distance_km: Number(originalDistance.toFixed(2))
      },

      no_available_ambulance: noAvailableAmbulanceAnywhere
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
        c.id,
        c.emergency_desc,
        c.status,
        c.severity,
        c.payment_amount,
        c.pickup_lat,
        c.pickup_lng,
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

  const rawStatus = req.body?.status;
  const status = typeof rawStatus === 'string'
    ? rawStatus.trim()
    : rawStatus;

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
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
      error: 'Invalid status for this endpoint',
      received_status: status ?? null,
      allowed_statuses: allowedStatuses
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
      SELECT id, status, hospital_id, ambulance_id, severity, payment_amount
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

    // Ensure a valid payment amount exists before payment_pending.
    let amountToSet = null;

    if (status === 'payment_pending') {
      const currentAmount = Number(emergencyCase.payment_amount);

      if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
        const [prices] = await connection.query(`
          SELECT amount
          FROM hospital_service_prices
          WHERE hospital_id = ?
            AND service_name = ?
            AND severity = ?
          LIMIT 1
        `, [
          hospitalId,
          EMERGENCY_SERVICE_NAME,
          emergencyCase.severity
        ]);

        if (prices.length === 0) {
          await connection.rollback();

          return res.status(409).json({
            error:
              'No price is set for this hospital and severity. ' +
              'Set the price before moving the case to payment pending.'
          });
        }

        amountToSet = Number(prices[0].amount);
      }
    }

    // A case cannot close without an eligible completed payment.
    if (status === 'closed') {
      const allowSimulation =
        process.env.NODE_ENV === 'development' &&
        process.env.PAYMENT_SIMULATION_ENABLED === 'true';

      const allowedPaymentModes = allowSimulation
        ? ['mpesa', 'simulation']
        : ['mpesa'];

      const placeholders = allowedPaymentModes
        .map(() => '?')
        .join(', ');

      const [payments] = await connection.query(`
        SELECT id, payment_mode
        FROM payment
        WHERE case_id = ?
          AND hospital_id = ?
          AND status = 'completed'
          AND payment_mode IN (${placeholders})
        LIMIT 1
      `, [
        caseId,
        hospitalId,
        ...allowedPaymentModes
      ]);

      if (payments.length === 0) {
        await connection.rollback();

        return res.status(403).json({
          error: 'No eligible completed payment exists for this case'
        });
      }
    }

    await connection.query(`
      UPDATE \`case\`
      SET
        status = ?,
        staff_id = ?,
        payment_amount = COALESCE(?, payment_amount),
        closed_at = CASE
          WHEN ? = 'closed'
          THEN COALESCE(closed_at, NOW())
          ELSE closed_at
        END
      WHERE id = ? AND hospital_id = ?
    `, [
      status,
      staffId,
      amountToSet,
      status,
      caseId,
      hospitalId
    ]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, ?, ?, NOW())
    `, [
      caseId,
      status,
      staffId
    ]);

    // Release the ambulance when the case is closed.
    if (status === 'closed' && emergencyCase.ambulance_id) {
      await connection.query(`
        UPDATE ambulance
        SET status = 'available'
        WHERE id = ? AND hospital_id = ?
      `, [
        emergencyCase.ambulance_id,
        hospitalId
      ]);
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Case status updated successfully',
      case_id: caseId,
      status,
      changed_by: staffId,
      ambulance_released:
        status === 'closed' &&
        Boolean(emergencyCase.ambulance_id)
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
    return res.status(400).json({
      error: 'Invalid case ID'
    });
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
      SELECT id
      FROM staff
      WHERE id = ?
        AND hospital_id = ?
        AND role = 'driver'
    `, [
      ambulance.driver_id,
      hospitalId
    ]);

    if (drivers.length === 0) {
      await connection.rollback();

      return res.status(409).json({
        error: 'Invalid ambulance driver'
      });
    }

    await connection.query(`
      UPDATE \`case\`
      SET
        ambulance_id = ?,
        staff_id = ?,
        status = 'dispatched'
      WHERE id = ? AND hospital_id = ?
    `, [
      ambulance_id,
      staffId,
      caseId,
      hospitalId
    ]);

    await connection.query(`
      UPDATE ambulance
      SET status = 'dispatched'
      WHERE id = ? AND hospital_id = ?
    `, [
      ambulance_id,
      hospitalId
    ]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'dispatched', ?, NOW())
    `, [
      caseId,
      staffId
    ]);

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
    !Number.isSafeInteger(driverId) ||
    driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) ||
    hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid driver hospital assignment'
    });
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.emergency_desc,
        c.severity,
        c.status,
        c.pickup_lat,
        c.pickup_lng,
        c.requested_at,
        c.arrival_at,
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
      INNER JOIN patient p
        ON p.id = c.patient_id
      INNER JOIN hospital h
        ON h.id = c.hospital_id
      WHERE a.driver_id = ?
        AND a.hospital_id = ?
        AND c.status IN (
          'dispatched',
          'picked_up',
          'arrived_at_hospital'
        )
      ORDER BY c.requested_at DESC
    `, [
      driverId,
      hospitalId
    ]);

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
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (
    !Number.isSafeInteger(driverId) ||
    driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) ||
    hospitalId <= 0
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
    `, [
      caseId,
      hospitalId,
      driverId
    ]);

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
    `, [
      caseId,
      hospitalId
    ]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'picked_up', ?, NOW())
    `, [
      caseId,
      driverId
    ]);

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
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (
    !Number.isSafeInteger(driverId) ||
    driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) ||
    hospitalId <= 0
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
    `, [
      caseId,
      hospitalId,
      driverId
    ]);

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
      SET
        status = 'arrived_at_hospital',
        arrival_at = NOW()
      WHERE id = ? AND hospital_id = ?
    `, [
      caseId,
      hospitalId
    ]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'arrived_at_hospital', ?, NOW())
    `, [
      caseId,
      driverId
    ]);

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
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (
    !Number.isSafeInteger(staffId) ||
    staffId <= 0 ||
    !Number.isSafeInteger(hospitalId) ||
    hospitalId <= 0
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
    `, [
      caseId,
      hospitalId
    ]);

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
      SET
        status = 'handed_over',
        staff_id = ?
      WHERE id = ? AND hospital_id = ?
    `, [
      staffId,
      caseId,
      hospitalId
    ]);

    await connection.query(`
      INSERT INTO case_status_log
        (case_id, status, changed_by, changed_at)
      VALUES (?, 'handed_over', ?, NOW())
    `, [
      caseId,
      staffId
    ]);

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

 
 // ==========================================
 // DRIVER: UPDATE OWN AMBULANCE STATUS
 // ==========================================

exports.updateDriverAmbulanceStatus = async (req, res) => {
  const driverId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  const requestedStatus =
    typeof req.body?.status === 'string'
      ? req.body.status.trim().toLowerCase()
      : '';

  const validStatuses = [
    'available',
    'on_call',
    'under_repair',
    'out_of_service'
  ];

  if (
    !Number.isSafeInteger(driverId) ||
    driverId <= 0 ||
    !Number.isSafeInteger(hospitalId) ||
    hospitalId <= 0
  ) {
    return res.status(403).json({
      error: 'Invalid driver hospital assignment'
    });
  }

  if (!validStatuses.includes(requestedStatus)) {
    return res.status(400).json({
      error: 'Invalid ambulance status',
      allowed_statuses: validStatuses
    });
  }

  // The database uses "dispatched" to represent "on_call".
  const databaseStatus =
    requestedStatus === 'on_call'
      ? 'dispatched'
      : requestedStatus;

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find and lock the ambulance assigned to this driver.
    const [ambulances] = await connection.query(`
      SELECT id, plate_number, status, driver_id, hospital_id
      FROM ambulance
      WHERE driver_id = ?
        AND hospital_id = ?
      FOR UPDATE
    `, [driverId, hospitalId]);

    if (ambulances.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'No ambulance is assigned to this driver'
      });
    }

    if (ambulances.length > 1) {
      await connection.rollback();

      return res.status(409).json({
        error:
          'Multiple ambulances are assigned to this driver. ' +
          'Please resolve the assignment before changing status.'
      });
    }

    const ambulance = ambulances[0];

    // Check whether this ambulance has an active emergency.
    const [activeCases] = await connection.query(`
      SELECT id, status
      FROM \`case\`
      WHERE ambulance_id = ?
        AND hospital_id = ?
        AND status IN (
          'dispatched',
          'picked_up',
          'arrived_at_hospital',
          'handed_over',
          'in_treatment',
          'payment_pending'
        )
      LIMIT 1
      FOR UPDATE
    `, [ambulance.id, hospitalId]);

    const hasActiveCase = activeCases.length > 0;

    // An active ambulance cannot be marked available or unavailable.
    if (
      hasActiveCase &&
      ['available', 'under_repair', 'out_of_service']
        .includes(requestedStatus)
    ) {
      await connection.rollback();

      return res.status(409).json({
        error:
          'This ambulance has an active emergency case. ' +
          'Its status cannot be changed until the case is completed.',
        active_case_id: activeCases[0].id,
        active_case_status: activeCases[0].status
      });
    }

    // Only hospital staff dispatch an ambulance to a case.
    if (requestedStatus === 'on_call' && !hasActiveCase) {
      await connection.rollback();

      return res.status(409).json({
        error:
          'An ambulance can be marked On Call only when it has ' +
          'an active emergency case. Assign a case through hospital staff.'
      });
    }

    // Detect an inconsistent dispatched status.
    if (
      ambulance.status === 'dispatched' &&
      !hasActiveCase &&
      requestedStatus !== 'available'
    ) {
      await connection.rollback();

      return res.status(409).json({
        error:
          'This ambulance is marked dispatched but has no active case. ' +
          'Please resolve the inconsistent assignment first.'
      });
    }

    // Update only the authenticated driver's assigned ambulance.
    const [updateResult] = await connection.query(`
      UPDATE ambulance
      SET status = ?
      WHERE id = ?
        AND driver_id = ?
        AND hospital_id = ?
    `, [
      databaseStatus,
      ambulance.id,
      driverId,
      hospitalId
    ]);

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();

      return res.status(409).json({
        error: 'Ambulance status was not changed. Please refresh and retry.'
      });
    }

    await connection.commit();

    return res.status(200).json({
      message: 'Ambulance status updated successfully',
      ambulance: {
        id: ambulance.id,
        plate_number: ambulance.plate_number,
        status: requestedStatus,
        database_status: databaseStatus
      }
    });

  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Ambulance status rollback error:',
          rollbackError.message
        );
      }
    }

    // Temporary diagnostics to identify the actual failure.
    console.error('Update driver ambulance status error:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });

    return res.status(500).json({
      error: 'Failed to update ambulance status',
      details: err.sqlMessage || err.message,
      code: err.code || null
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};
