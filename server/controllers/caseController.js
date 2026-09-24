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

  // Validate required fields
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

    // Create emergency case
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

    // Record initial case status
    // changed_by is NULL because no staff member
    // has handled the emergency yet
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

    // Save both operations
    await connection.commit();

    res.status(201).json({
      message: 'Case created successfully',
      case_id: caseId,
      status: 'requested'
    });

  } catch (err) {

    // Undo database changes if something failed
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