const pool = require('../config/db');

// ==========================================
// PATIENT <-> DRIVER CASE CHAT
//
// - Only the patient who owns the case and the
//   driver assigned to its ambulance can use it.
// - Sending is allowed only while the ambulance
//   is on its way (case status "dispatched").
// - History stays readable afterwards.
// ==========================================

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_PER_MINUTE = 20;
const MAX_HISTORY = 200;
const CHAT_OPEN_STATUSES = ['dispatched'];

// ==========================================
// HELPER: LOAD CASE AND CHECK PARTICIPANT
// Returns null when the case does not exist or
// the user is not one of its two participants.
// ==========================================

async function getChatContext(caseId, user) {
  const [rows] = await pool.query(`
    SELECT
      c.id,
      c.status,
      c.patient_id,
      c.ambulance_id,
      a.driver_id,
      p.name AS patient_name,
      s.name AS driver_name
    FROM \`case\` c
    JOIN patient p
      ON p.id = c.patient_id
    LEFT JOIN ambulance a
      ON a.id = c.ambulance_id
    LEFT JOIN staff s
      ON s.id = a.driver_id
      AND s.role = 'driver'
    WHERE c.id = ?
  `, [caseId]);

  if (rows.length === 0) {
    return null;
  }

  const emergencyCase = rows[0];
  const userId = Number(user.id);

  let senderRole = null;

  if (
    user.role === 'patient' &&
    Number(emergencyCase.patient_id) === userId
  ) {
    senderRole = 'patient';
  } else if (
    user.role === 'driver' &&
    emergencyCase.driver_id &&
    Number(emergencyCase.driver_id) === userId
  ) {
    senderRole = 'driver';
  }

  if (!senderRole) {
    return null;
  }

  return {
    emergencyCase,
    senderRole,
    chatOpen: CHAT_OPEN_STATUSES.includes(emergencyCase.status)
  };
}

// ==========================================
// GET MESSAGES FOR A CASE
// GET /api/messages/case/:caseId?after=<messageId>
// ==========================================

exports.getMessages = async (req, res) => {
  const caseId = Number(req.params.caseId);
  const afterId = Math.max(0, Number(req.query.after) || 0);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  try {
    const context = await getChatContext(caseId, req.user);

    // Same answer for "no such case" and "not your case",
    // so the endpoint does not reveal which cases exist.
    if (!context) {
      return res.status(404).json({
        error: 'Chat is not available for this case'
      });
    }

    const [messages] = await pool.query(`
      SELECT id, sender_role, body, created_at
      FROM case_message
      WHERE case_id = ? AND id > ?
      ORDER BY id ASC
      LIMIT ?
    `, [caseId, afterId, MAX_HISTORY]);

    const partnerName =
      context.senderRole === 'patient'
        ? context.emergencyCase.driver_name
        : context.emergencyCase.patient_name;

    return res.status(200).json({
      case_id: caseId,
      case_status: context.emergencyCase.status,
      chat_open: context.chatOpen,
      my_role: context.senderRole,
      partner_name: partnerName || null,
      messages
    });

  } catch (err) {
    console.error('Get messages error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve messages'
    });
  }
};

// ==========================================
// SEND A MESSAGE
// POST /api/messages/case/:caseId   { body }
// ==========================================

exports.sendMessage = async (req, res) => {
  const caseId = Number(req.params.caseId);
  const rawBody = req.body?.body;

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({
      error: 'Invalid case ID'
    });
  }

  if (typeof rawBody !== 'string') {
    return res.status(400).json({
      error: 'Message text is required'
    });
  }

  const body = rawBody.trim();

  if (body.length === 0) {
    return res.status(400).json({
      error: 'Message cannot be empty'
    });
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters`
    });
  }

  try {
    const context = await getChatContext(caseId, req.user);

    if (!context) {
      return res.status(404).json({
        error: 'Chat is not available for this case'
      });
    }

    if (!context.chatOpen) {
      return res.status(409).json({
        error:
          'Chat is closed. It is only available while ' +
          'the ambulance is on its way.'
      });
    }

    // Simple flood protection per sender.
    const [recent] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM case_message
      WHERE sender_role = ?
        AND sender_id = ?
        AND created_at > (NOW() - INTERVAL 1 MINUTE)
    `, [context.senderRole, Number(req.user.id)]);

    if (Number(recent[0].total) >= MAX_MESSAGES_PER_MINUTE) {
      return res.status(429).json({
        error: 'You are sending messages too quickly. Please wait a moment.'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO case_message
        (case_id, sender_role, sender_id, body)
      VALUES (?, ?, ?, ?)
    `, [
      caseId,
      context.senderRole,
      Number(req.user.id),
      body
    ]);

    const [saved] = await pool.query(`
      SELECT id, sender_role, body, created_at
      FROM case_message
      WHERE id = ?
    `, [result.insertId]);

    return res.status(201).json({
      message: saved[0]
    });

  } catch (err) {
    console.error('Send message error:', err);

    return res.status(500).json({
      error: 'Failed to send message'
    });
  }
};