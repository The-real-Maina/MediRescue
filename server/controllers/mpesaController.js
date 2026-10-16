
const pool = require('../config/db');

const {
  initiateStkPush,
  queryStkPushStatus
} = require('../services/mpesaService');

// ==========================================
// INITIATE M-PESA PAYMENT
// ==========================================

exports.initiatePayment = async (req, res) => {
  const patientId = req.user.id;
  const { case_id, phone_number } = req.body || {};

  const caseId = Number(case_id);
  const phone = String(phone_number || '').replace(/\D/g, '');

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (!/^254[71]\d{8}$/.test(phone)) {
    return res.status(400).json({
      error: 'Phone must be in format 2547XXXXXXXX or 2541XXXXXXXX'
    });
  }

  try {
    const [cases] = await pool.query(
      `SELECT id, hospital_id, status, payment_amount
       FROM \`case\`
       WHERE id = ? AND patient_id = ?`,
      [caseId, patientId]
    );

    if (cases.length === 0) {
      return res.status(404).json({
        error: 'Emergency case not found'
      });
    }

    const emergencyCase = cases[0];

    if (emergencyCase.status !== 'payment_pending') {
      return res.status(409).json({
        error: 'This case is not ready for payment'
      });
    }

    const paymentAmount = Number(
      emergencyCase.payment_amount
    );

    if (
      !Number.isSafeInteger(paymentAmount) ||
      paymentAmount <= 0
    ) {
      return res.status(400).json({
        error: 'No valid payment amount assigned to this case'
      });
    }

    const [existing] = await pool.query(
      `SELECT id, status
       FROM payment
       WHERE case_id = ?
         AND status IN ('pending', 'completed')
       LIMIT 1`,
      [caseId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'A pending or completed payment already exists for this case'
      });
    }

    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    if (!callbackUrl) {
      return res.status(500).json({
        error: 'M-Pesa callback URL is not configured'
      });
    }

    let parsedCallbackUrl;

    try {
      parsedCallbackUrl = new URL(callbackUrl);
    } catch {
      return res.status(500).json({
        error: 'Invalid M-Pesa callback URL'
      });
    }

    if (
      parsedCallbackUrl.protocol !== 'https:' ||
      !parsedCallbackUrl.hostname ||
      parsedCallbackUrl.username ||
      parsedCallbackUrl.password
    ) {
      return res.status(500).json({
        error: 'A valid HTTPS M-Pesa callback URL is required'
      });
    }

    const result = await initiateStkPush(
      phone,
      paymentAmount,
      `CASE${caseId}`,
      callbackUrl
    );

    if (
      String(result.ResponseCode) !== '0' ||
      !result.CheckoutRequestID
    ) {
      return res.status(502).json({
        error: 'Safaricom did not accept the payment request'
      });
    }

    await pool.query(
      `INSERT INTO payment
       (
         case_id,
         hospital_id,
         amount,
         phone_number,
         checkout_request_id,
         status
       )
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        caseId,
        emergencyCase.hospital_id,
        paymentAmount,
        phone,
        result.CheckoutRequestID
      ]
    );

    return res.status(202).json({
      message: 'M-Pesa payment request initiated',
      case_id: caseId,
      amount: paymentAmount,
      checkout_request_id: result.CheckoutRequestID,
      status: 'pending'
    });
  } catch (error) {
    console.error(
      'M-Pesa initiation error:',
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: 'Failed to initiate M-Pesa payment'
    });
  }
};

// ==========================================
// QUERY AND VERIFY PAYMENT STATUS
// ==========================================

exports.checkPaymentStatus = async (req, res) => {
  const patientId = req.user.id;
  const caseId = Number(req.params.caseId);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  try {
    const [payments] = await pool.query(
      `SELECT
         p.id,
         p.case_id,
         p.status,
         p.checkout_request_id
       FROM payment p
       INNER JOIN \`case\` c
         ON c.id = p.case_id
       WHERE p.case_id = ?
         AND c.patient_id = ?
       ORDER BY p.id DESC
       LIMIT 1`,
      [caseId, patientId]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    const payment = payments[0];

    if (payment.status !== 'pending') {
      return res.status(200).json({
        case_id: caseId,
        status: payment.status
      });
    }

    const result = await queryStkPushStatus(
      payment.checkout_request_id
    );

    if (String(result.ResponseCode) !== '0') {
      return res.status(200).json({
        case_id: caseId,
        status: 'pending',
        message: 'Safaricom has not confirmed the payment'
      });
    }

    if (
      result.ResultCode === undefined ||
      result.ResultCode === null ||
      String(result.ResultCode).trim() === ''
    ) {
      return res.status(200).json({
        case_id: caseId,
        status: 'pending',
        message: 'Payment result is not available yet'
      });
    }

    const resultCode = Number(result.ResultCode);

    if (!Number.isInteger(resultCode)) {
      return res.status(200).json({
        case_id: caseId,
        status: 'pending',
        message: 'Safaricom returned an invalid result code'
      });
    }

    const newStatus =
      resultCode === 0 ? 'completed' : 'failed';

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [lockedPayments] = await connection.query(
        `SELECT id, status
         FROM payment
         WHERE id = ?
         FOR UPDATE`,
        [payment.id]
      );

      if (lockedPayments.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: 'Payment record not found'
        });
      }

      if (lockedPayments[0].status !== 'pending') {
        await connection.rollback();

        return res.status(200).json({
          case_id: caseId,
          status: lockedPayments[0].status
        });
      }

      await connection.query(
        `UPDATE payment
         SET status = ?,
             paid_at = CASE
               WHEN ? = 'completed' THEN NOW()
               ELSE NULL
             END
         WHERE id = ?
           AND status = 'pending'`,
        [newStatus, newStatus, payment.id]
      );

      if (newStatus === 'completed') {
        const [caseUpdate] = await connection.query(
          `UPDATE \`case\`
           SET status = 'paid'
           WHERE id = ?
             AND status = 'payment_pending'`,
          [caseId]
        );

        if (caseUpdate.affectedRows !== 1) {
          throw new Error(
            'Emergency case is not awaiting payment'
          );
        }

        await connection.query(
          `INSERT INTO case_status_log
           (
             case_id,
             status,
             changed_by,
             changed_at
           )
           VALUES (?, 'paid', NULL, NOW())`,
          [caseId]
        );
      }

      await connection.commit();

      return res.status(200).json({
        case_id: caseId,
        status: newStatus,
        result_code: resultCode
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      'M-Pesa status query error:',
      error.response?.data || error.message
    );

    return res.status(502).json({
      error: 'Unable to verify payment with Safaricom'
    });
  }
};

// ==========================================
// RECEIVE SAFARICOM CALLBACK
// ==========================================

exports.handleCallback = async (req, res) => {
  const callback = req.body?.Body?.stkCallback;

  if (
    !callback ||
    typeof callback.CheckoutRequestID !== 'string' ||
    !callback.CheckoutRequestID.trim()
  ) {
    return res.status(400).json({
      ResultCode: 1,
      ResultDesc: 'Invalid callback'
    });
  }

  // Do not trust a callback alone as proof of payment.
  // Payment is verified through the Safaricom status query.

  console.log(
    'M-Pesa callback received for checkout:',
    callback.CheckoutRequestID
  );

  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: 'Callback received'
  });
};
