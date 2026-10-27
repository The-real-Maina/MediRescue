const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const STAFF_ROLES = ['hospital_staff', 'hospital_admin', 'driver'];

// POST /api/auth/change-password
// { current_password, new_password }
exports.changePassword = async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Password change is not available for this account type yet'
    });
  }

  const currentPassword = req.body?.current_password;
  const newPassword = req.body?.new_password;

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return res.status(400).json({ error: 'Current password is required' });
  }

  if (
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    newPassword.length > 72
  ) {
    return res.status(400).json({
      error: 'New password must contain 8 to 72 characters'
    });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({
      error: 'New password must be different from the current one'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, hospital_id, role, password_hash
       FROM staff
       WHERE id = ? AND is_active = 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'This account is no longer active' });
    }

    const account = rows[0];

    const matches = await bcrypt.compare(currentPassword, account.password_hash);

    if (!matches) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE staff
       SET password_hash = ?,
           password_changed_at = NOW(),
           must_change_password = 0
       WHERE id = ?`,
      [newHash, account.id]
    );

    // Wait one second so the new token's iat is not earlier
    // than password_changed_at.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const token = jwt.sign(
      {
        id: account.id,
        role: account.role,
        hospital_id: account.hospital_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({ message: 'Password changed', token });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
};