const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Roles stored in the staff table. For these, the account is
// checked against the database on every request so that:
//  - a released or deleted account loses access immediately
//  - a password reset ends all older sessions
//  - role and hospital come from the database, not the token
const STAFF_ROLES = ['hospital_staff', 'hospital_admin', 'driver'];

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (STAFF_ROLES.includes(decoded.role)) {
    try {
      const [rows] = await pool.query(
        `SELECT is_active, role, hospital_id, must_change_password,
                UNIX_TIMESTAMP(password_changed_at) AS pwd_changed
         FROM staff
         WHERE id = ?`,
        [decoded.id]
      );

      if (rows.length === 0 || Number(rows[0].is_active) === 0) {
        return res.status(401).json({
          error: 'This account is no longer active'
        });
      }

      const acct = rows[0];

      // Password was reset after this token was issued
      if (acct.pwd_changed && decoded.iat < Number(acct.pwd_changed)) {
        return res.status(401).json({
          error: 'Session expired. Please log in again.'
        });
      }

      // Role changed since the token was issued
      if (acct.role !== decoded.role) {
        return res.status(401).json({
          error: 'Session expired. Please log in again.'
        });
      }

      // Trust the database, not the token, for the hospital
      decoded.hospital_id = acct.hospital_id;
      decoded.must_change_password = Number(acct.must_change_password) === 1;

      // Forced first-login password change: nothing else works until done
      if (
        decoded.must_change_password &&
        !req.originalUrl.startsWith('/api/auth/change-password')
      ) {
        return res.status(403).json({
          error: 'You must change your password before continuing',
          must_change_password: true
        });
      }
    } catch (err) {
      console.error('Account status check failed:', err);

      return res.status(500).json({
        error: 'Could not verify your account. Please try again.'
      });
    }
  }

  req.user = decoded;
  next();
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    next();
  };
};