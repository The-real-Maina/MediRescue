const pool = require('../config/db');


// ==========================================
// CREATE EMERGENCY CASE
// ==========================================
exports.createCase = async (req, res) => {
  const patientId = req.user.id;

  const {
    hospital_id,
    emergency_type,
    emergency_desc,
    pickup_lat,
    pickup_lng,
    severity
  } = req.body;

  if (
    !hospital_id ||
    !emergency_type ||
    pickup_lat === undefined ||
    pickup_lng === undefined
  ) {
    return res.status(400).json({
      error:
        'hospital_id, emergency_type, pickup_lat and pickup_lng are required'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO \`case\`
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
      VALUES (?, ?, ?, 'requested', ?, ?, ?, NOW())`,
      [
        patientId,
        hospital_id,
        emergency_desc || emergency_type,
        severity || 'moderate',
        pickup_lat,
        pickup_lng
      ]
    );

    const caseId = result.insertId;

    // Initial status is created by the patient,
    // so there is no staff member yet.
    await connection.query(
      `INSERT INTO case_status_log
      (
        case_id,
        status,
        changed_by,
        changed_at
      )
      VALUES (?, 'requested', NULL, NOW())`,
      [caseId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Case created successfully',
      case_id: caseId,
      status: 'requested'
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    console.error('Create case error:', err);

    res.status(500).json({
      error: err.message
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
      `SELECT
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
      JOIN hospital h ON c.hospital_id = h.id
      WHERE c.patient_id = ?
      ORDER BY c.requested_at DESC`,
      [patientId]
    );

    res.status(200).json(rows);

  } catch (err) {

    console.error('Get patient cases error:', err);

    res.status(500).json({
      error: err.message
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
      `SELECT
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
      ORDER BY c.requested_at DESC`,
      [hospitalId]
    );

    res.status(200).json(rows);

  } catch (err) {

    console.error('Get hospital cases error:', err);

    res.status(500).json({
      error: err.message
    });
  }
};


// ==========================================
// UPDATE EMERGENCY CASE STATUS
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
    'arrived',
    'closed'
  ];

  // Check status was provided
  if (!status) {
    return res.status(400).json({
      error: 'status is required'
    });
  }

  // Check status is valid
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid case status'
    });
  }

  // Staff must belong to a hospital
  if (!hospitalId) {
    return res.status(400).json({
      error: 'Staff account is not assigned to a hospital'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find the case and ensure it belongs
    // to the logged-in staff member's hospital.
    const [cases] = await connection.query(
      `SELECT
        id,
        status,
        hospital_id
      FROM \`case\`
      WHERE id = ?
      AND hospital_id = ?`,
      [
        caseId,
        hospitalId
      ]
    );

    if (cases.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Case not found for this hospital'
      });
    }

    // Update case status and assign the staff member.
    // arrival_at is recorded when patient arrives.
    // closed_at is recorded when case is closed.
    await connection.query(
      `UPDATE \`case\`
      SET
        status = ?,
        staff_id = ?,

        arrival_at = CASE
          WHEN ? = 'arrived'
          THEN NOW()
          ELSE arrival_at
        END,

        closed_at = CASE
          WHEN ? = 'closed'
          THEN NOW()
          ELSE closed_at
        END

      WHERE id = ?`,
      [
        status,
        staffId,
        status,
        status,
        caseId
      ]
    );

    // Save status change in history
    await connection.query(
      `INSERT INTO case_status_log
      (
        case_id,
        status,
        changed_by,
        changed_at
      )
      VALUES (?, ?, ?, NOW())`,
      [
        caseId,
        status,
        staffId
      ]
    );

    await connection.commit();

    res.status(200).json({
      message: 'Case status updated successfully',
      case_id: Number(caseId),
      status: status,
      changed_by: staffId
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    console.error('Update case status error:', err);

    res.status(500).json({
      error: err.message
    });

  } finally {

    if (connection) {
      connection.release();
    }
  }
};