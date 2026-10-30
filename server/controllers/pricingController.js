const pool = require('../config/db');

// ==========================================
// HOSPITAL ADMIN: PROPOSE NEW PRICE
// ==========================================
exports.proposePriceChange = async (req, res) => {
  const hospitalId = req.user.hospital_id;
  const adminId = req.user.id;
  const { service_name, severity, proposed_price } = req.body;

  if (!hospitalId) return res.status(403).json({ error: 'Not authorized for a hospital' });
  if (!service_name || !severity || !proposed_price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [currentPrices] = await connection.query(`
      SELECT amount FROM hospital_service_prices 
      WHERE hospital_id = ? AND service_name = ? AND severity = ?
    `, [hospitalId, service_name, severity]);

    if (currentPrices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Current price not found for this service.' });
    }

    const oldPrice = currentPrices[0].amount;

    const [pending] = await connection.query(`
      SELECT id FROM price_change_requests 
      WHERE hospital_id = ? AND service_name = ? AND severity = ? AND status = 'pending'
    `, [hospitalId, service_name, severity]);

    if (pending.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'A pending request already exists for this service.' });
    }

    await connection.query(`
      INSERT INTO price_change_requests 
      (hospital_id, service_name, severity, old_price, proposed_price, requested_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [hospitalId, service_name, severity, oldPrice, proposed_price, adminId]);

    await connection.commit();
    return res.status(201).json({ message: 'Price change requested successfully. Awaiting approval.' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit price request' });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// SUPER ADMIN: GET PENDING REQUESTS
// ==========================================
exports.getPendingRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, h.name AS hospital_name, s.name AS admin_name
      FROM price_change_requests r
      JOIN hospital h ON r.hospital_id = h.id
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

// ==========================================
// SUPER ADMIN: APPROVE/DECLINE
// ==========================================
exports.reviewPriceChange = async (req, res) => {
  const requestId = Number(req.params.id);
  const superAdminId = req.user.id;
  const { action, decline_reason } = req.body;

  if (!['approve', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [requests] = await connection.query(`
      SELECT * FROM price_change_requests WHERE id = ? AND status = 'pending' FOR UPDATE
    `, [requestId]);

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Pending request not found' });
    }

    const request = requests[0];

    if (action === 'approve') {
      await connection.query(`
        UPDATE hospital_service_prices 
        SET amount = ? 
        WHERE hospital_id = ? AND service_name = ? AND severity = ?
      `, [request.proposed_price, request.hospital_id, request.service_name, request.severity]);

      await connection.query(`
        INSERT INTO price_history (hospital_id, service_name, severity, price, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `, [request.hospital_id, request.service_name, request.severity, request.proposed_price, superAdminId]);

      await connection.query(`
        UPDATE price_change_requests 
        SET status = 'approved', reviewed_by = ?, resolved_at = NOW() 
        WHERE id = ?
      `, [superAdminId, requestId]);

    } else {
      await connection.query(`
        UPDATE price_change_requests 
        SET status = 'declined', decline_reason = ?, reviewed_by = ?, resolved_at = NOW() 
        WHERE id = ?
      `, [decline_reason || 'No reason provided', superAdminId, requestId]);
    }

    await connection.commit();

    // ADD AUDIT LOG
    const actionText = action === 'approve' ? 'APPROVED' : 'DECLINED';
    await pool.query(`
      INSERT INTO audit_logs (actor_id, actor_name, actor_role, action_type, description)
      VALUES (?, ?, ?, ?, ?)
    `, [
      superAdminId, 
      req.user.name || 'Super Admin', 
      'super_admin', 
      'PRICE_CHANGE', 
      `Super Admin ${actionText} price change for ${request.service_name} (${request.severity}) from KSh ${request.old_price} to KSh ${request.proposed_price}.`
    ]);

    return res.status(200).json({ message: `Request ${action}d successfully.` });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Failed to process request' });
  } finally {
    if (connection) connection.release();
  }
};