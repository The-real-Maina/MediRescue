
const pool = require('../config/db');

// Simulation must be explicitly enabled in development.
const simulationEnabled = () =>
  process.env.NODE_ENV === 'development' &&
  process.env.PAYMENT_SIMULATION_ENABLED === 'true';

exports.simulatePayment = async (req, res) => {
  if (!simulationEnabled()) {
    return res.status(404).json({
      error: 'Payment simulation is unavailable'
    });
  }

  const caseId = Number(req.body?.case_id);
  const outcome = req.body?.outcome;
  const patientId = req.user.id;

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (!['success', 'failed', 'timeout'].includes(outcome)) {
    return res.status(400).json({
      error: 'Outcome must be success, failed or timeout'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(
      `SELECT id, hospital_id, payment_amount, status
       FROM \`case\`
       WHERE id = ? AND patient_id = ?
       FOR UPDATE`,
      [caseId, patientId]
    );

    if (!cases.length) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Patient emergency case not found'
      });
    }

    const emergencyCase = cases[0];

    if (emergencyCase.status !== 'payment_pending') {
      await connection.rollback();
      return res.status(409).json({
        error: 'Case is not awaiting payment'
      });
    }

    const amount = Number(emergencyCase.payment_amount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      await connection.rollback();
      return res.status(400).json({
        error: 'Invalid case payment amount'
      });
    }

    const [existing] = await connection.query(
      `SELECT id FROM payment
       WHERE case_id = ?
         AND status IN ('pending', 'completed')
       LIMIT 1
       FOR UPDATE`,
      [caseId]
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({
        error: 'A pending or completed payment already exists'
      });
    }

    const paymentStatus =
      outcome === 'success'
        ? 'completed'
        : outcome === 'failed'
          ? 'failed'
          : 'pending';

    const [insert] = await connection.query(
      `INSERT INTO payment
       (case_id, hospital_id, amount, status,
        payment_mode, paid_at)
       VALUES (?, ?, ?, ?, 'simulation',
         CASE WHEN ? = 'completed' THEN NOW()
              ELSE NULL END)`,
      [
        caseId,
        emergencyCase.hospital_id,
        amount,
        paymentStatus,
        paymentStatus
      ]
    );

    if (outcome === 'success') {
      await connection.query(
        `UPDATE \`case\`
         SET status = 'paid'
         WHERE id = ?`,
        [caseId]
      );

      await connection.query(
        `INSERT INTO case_status_log
         (case_id, status, changed_by, changed_at)
         VALUES (?, 'paid', NULL, NOW())`,
        [caseId]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Development payment simulation completed',
      simulated: true,
      payment_id: insert.insertId,
      case_id: caseId,
      amount,
      payment_mode: 'simulation',
      payment_status: paymentStatus,
      case_status:
        outcome === 'success' ? 'paid' : 'payment_pending',
      money_transferred: false
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Payment simulation error:', error.message);

    return res.status(500).json({
      error: 'Payment simulation failed'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
