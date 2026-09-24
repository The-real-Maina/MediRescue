const pool = require('../config/db');

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

    // Record initial case status.
    // changed_by is NULL because no staff member
    // has handled the emergency yet.
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

    // Everything succeeded
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