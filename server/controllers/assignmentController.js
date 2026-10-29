// MySQL version, matched to the MediRescue schema:
//   case(id, ambulance_id, status, hospital_id, ...)   ambulance(id, driver_id -> staff.id, status, ...)
// Flow:  requested -> assigned (offered to driver, 60s) -> dispatched (driver accepted)
const pool = require('../config/db');

const ACCEPT_WINDOW_SECONDS = 60;

// STAFF: list ambulances that can be offered a case (available + has a driver)
exports.availableAmbulances = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.plate_number, s.name AS driver_name
         FROM ambulance a
         JOIN staff s ON s.id = a.driver_id
        WHERE a.status = 'available'
          AND a.hospital_id = (SELECT hospital_id FROM staff WHERE id = ?)`,
      [req.user.id] // TODO: confirm req.user.id is the logged-in staff id
    );
    res.json(rows);
  } catch (err) {
    console.error('availableAmbulances failed:', err.message);
    res.status(500).json({ error: 'Failed to load ambulances' });
  }
};

// STAFF: offer the case to an ambulance's driver, or re-offer after a timeout
exports.assignAmbulance = async (req, res) => {
  try {
    const { ambulanceId } = req.body;
    if (!ambulanceId) return res.status(400).json({ error: 'ambulanceId is required' });

    const [result] = await pool.query(
      `UPDATE \`case\` c
         JOIN ambulance a
           ON a.id = ?
          AND a.hospital_id = c.hospital_id
          AND a.driver_id IS NOT NULL
          AND a.status = 'available'
          SET c.status = 'assigned',
              c.ambulance_id = a.id,
              c.assigned_at = NOW(),
              c.accept_deadline = DATE_ADD(NOW(), INTERVAL ? SECOND),
              c.accepted_at = NULL
        WHERE c.id = ?
          AND (c.status = 'requested'
               OR (c.status = 'assigned' AND c.accept_deadline <= NOW()))`,
      [ambulanceId, ACCEPT_WINDOW_SECONDS, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        error:
          'Cannot assign: case not open, driver still has time to respond, or ambulance not available',
      });
    }

    const [rows] = await pool.query('SELECT * FROM `case` WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('assignAmbulance failed:', err.message);
    res.status(500).json({ error: 'Failed to assign ambulance' });
  }
};

// DRIVER: accept. Only the driver of the assigned ambulance, and only before the deadline
exports.acceptCase = async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE \`case\` c
         JOIN ambulance a ON a.id = c.ambulance_id
          SET c.status = 'dispatched',
              c.accepted_at = NOW(),
              a.status = 'dispatched'
        WHERE c.id = ?
          AND c.status = 'assigned'
          AND a.driver_id = ?
          AND c.accept_deadline > NOW()`,
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({
        error: 'This request expired, was reassigned, or is no longer available',
      });
    }

    const [rows] = await pool.query('SELECT * FROM `case` WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('acceptCase failed:', err.message);
    res.status(500).json({ error: 'Failed to accept case' });
  }
};

// DRIVER: decline, which puts the case back to "requested" so staff can pick another ambulance
exports.declineCase = async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE \`case\` c
         JOIN ambulance a ON a.id = c.ambulance_id
          SET c.status = 'requested',
              c.ambulance_id = NULL,
              c.assigned_at = NULL,
              c.accept_deadline = NULL
        WHERE c.id = ?
          AND c.status = 'assigned'
          AND a.driver_id = ?`,
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Cannot decline this request' });
    }

    const [rows] = await pool.query('SELECT * FROM `case` WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('declineCase failed:', err.message);
    res.status(500).json({ error: 'Failed to decline case' });
  }
};

// DRIVER: requests currently offered to me (driver dashboard polls this)
exports.myOffers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.status, c.emergency_desc, c.severity,
              c.pickup_lat, c.pickup_lng, c.accept_deadline
         FROM \`case\` c
         JOIN ambulance a ON a.id = c.ambulance_id
        WHERE c.status = 'assigned'
          AND a.driver_id = ?
          AND c.accept_deadline > NOW()`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('myOffers failed:', err.message);
    res.status(500).json({ error: 'Failed to load offers' });
  }
};