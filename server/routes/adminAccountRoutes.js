const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const pool = require('../config/db');

const {
  authenticate,
  authorize
} = require('../middleware/auth');

// ==========================================
// SUPER ADMIN: STAFF LIST, HOSPITAL ADMIN
// ACCOUNTS, PASSWORD RESETS, RELEASE AND DELETE
//
// Mounted at /api/admin (see index.js) before
// adminRoutes.js, so the routes here answer
// first. Each route checks authentication
// itself, so requests for other /api/admin
// paths simply continue on to adminRoutes.js.
// ==========================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseStaffId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ==========================================
// LIST ALL STAFF (includes is_active)
// GET /api/admin/staff
// ==========================================

router.get(
  '/staff',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const [staff] = await pool.query(`
        SELECT
          s.id,
          s.name,
          s.email,
          s.role,
          s.is_active,
          s.hospital_id,
          h.name AS hospital_name
        FROM staff AS s
        LEFT JOIN hospital AS h
          ON s.hospital_id = h.id
        ORDER BY s.hospital_id ASC, s.id ASC
      `);

      res.json(staff);

    } catch (error) {
      console.error('Get staff error:', error);

      res.status(500).json({
        error: 'Failed to retrieve staff records'
      });
    }
  }
);

// ==========================================
// CREATE A HOSPITAL ADMIN
// POST /api/admin/hospital-admins
// { name, email, password, hospital_id }
// ==========================================

router.post(
  '/hospital-admins',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const { name, email, password, hospital_id } = req.body || {};

      const adminName =
        typeof name === 'string' ? name.trim() : '';

      const adminEmail =
        typeof email === 'string'
          ? email.trim().toLowerCase()
          : '';

      const hospitalId = Number(hospital_id);

      if (!adminName || adminName.length > 100) {
        return res.status(400).json({
          error: 'Valid admin name is required'
        });
      }

      if (
        !adminEmail ||
        adminEmail.length > 100 ||
        !EMAIL_PATTERN.test(adminEmail)
      ) {
        return res.status(400).json({
          error: 'Valid email address is required'
        });
      }

      if (
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 72
      ) {
        return res.status(400).json({
          error: 'Password must contain 8 to 72 characters'
        });
      }

      if (
        hospital_id === null ||
        hospital_id === undefined ||
        hospital_id === '' ||
        !Number.isSafeInteger(hospitalId) ||
        hospitalId <= 0
      ) {
        return res.status(400).json({
          error: 'Valid hospital ID is required'
        });
      }

      const [hospitals] = await pool.query(
        'SELECT id FROM hospital WHERE id = ?',
        [hospitalId]
      );

      if (hospitals.length === 0) {
        return res.status(404).json({
          error: 'Hospital not found'
        });
      }

      const [existing] = await pool.query(
        'SELECT id FROM staff WHERE email = ?',
        [adminEmail]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          error: 'A staff member with this email already exists'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `INSERT INTO staff
         (hospital_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'hospital_admin')`,
        [hospitalId, adminName, adminEmail, passwordHash]
      );

      return res.status(201).json({
        message: 'Hospital admin registered successfully',
        admin: {
          id: result.insertId,
          name: adminName,
          email: adminEmail,
          hospital_id: hospitalId,
          role: 'hospital_admin'
        }
      });

    } catch (error) {
      console.error('Register hospital admin error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'A staff member with this email already exists'
        });
      }

      return res.status(500).json({
        error: 'Failed to register hospital admin'
      });
    }
  }
);

// ==========================================
// RESET A STAFF MEMBER'S PASSWORD
// POST /api/admin/staff/:id/password
// { password }
// Works for hospital staff, drivers and
// hospital admins.
// ==========================================

router.post(
  '/staff/:id/password',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const staffId = parseStaffId(req.params.id);
      const { password } = req.body || {};

      if (!staffId) {
        return res.status(400).json({
          error: 'Invalid staff ID'
        });
      }

      if (
        typeof password !== 'string' ||
        password.length < 8 ||
        password.length > 72
      ) {
        return res.status(400).json({
          error: 'Password must contain 8 to 72 characters'
        });
      }

      const [rows] = await pool.query(
        'SELECT id, name FROM staff WHERE id = ?',
        [staffId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Staff member not found'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await pool.query(
        'UPDATE staff SET password_hash = ? WHERE id = ?',
        [passwordHash, staffId]
      );

      return res.json({
        message: `Password reset for ${rows[0].name || 'staff member'}`
      });

    } catch (error) {
      console.error('Reset staff password error:', error);

      return res.status(500).json({
        error: 'Failed to reset password'
      });
    }
  }
);

// ==========================================
// RELEASE (DEACTIVATE) A HOSPITAL ADMIN
// POST /api/admin/staff/:id/deactivate
// The account stays in the database but can
// no longer log in or use any route.
// ==========================================

router.post(
  '/staff/:id/deactivate',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const staffId = parseStaffId(req.params.id);

      if (!staffId) {
        return res.status(400).json({
          error: 'Invalid staff ID'
        });
      }

      const [rows] = await pool.query(
        `SELECT id, name FROM staff
         WHERE id = ? AND role = 'hospital_admin'`,
        [staffId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Hospital admin not found'
        });
      }

      await pool.query(
        'UPDATE staff SET is_active = 0 WHERE id = ?',
        [staffId]
      );

      return res.json({
        message: `${rows[0].name || 'Hospital admin'} has been released`
      });

    } catch (error) {
      console.error('Release hospital admin error:', error);

      return res.status(500).json({
        error: 'Failed to release hospital admin'
      });
    }
  }
);

// ==========================================
// REACTIVATE A RELEASED HOSPITAL ADMIN
// POST /api/admin/staff/:id/reactivate
// ==========================================

router.post(
  '/staff/:id/reactivate',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const staffId = parseStaffId(req.params.id);

      if (!staffId) {
        return res.status(400).json({
          error: 'Invalid staff ID'
        });
      }

      const [rows] = await pool.query(
        `SELECT id, name FROM staff
         WHERE id = ? AND role = 'hospital_admin'`,
        [staffId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Hospital admin not found'
        });
      }

      await pool.query(
        'UPDATE staff SET is_active = 1 WHERE id = ?',
        [staffId]
      );

      return res.json({
        message: `${rows[0].name || 'Hospital admin'} has been reactivated`
      });

    } catch (error) {
      console.error('Reactivate hospital admin error:', error);

      return res.status(500).json({
        error: 'Failed to reactivate hospital admin'
      });
    }
  }
);

// ==========================================
// PERMANENTLY DELETE A HOSPITAL ADMIN
// DELETE /api/admin/staff/:id
// Shifts this admin assigned stay in place;
// they just lose the "assigned by" link.
// ==========================================

router.delete(
  '/staff/:id',
  authenticate,
  authorize('super_admin'),
  async (req, res) => {
    try {
      const staffId = parseStaffId(req.params.id);

      if (!staffId) {
        return res.status(400).json({
          error: 'Invalid staff ID'
        });
      }

      const [rows] = await pool.query(
        `SELECT id, name FROM staff
         WHERE id = ? AND role = 'hospital_admin'`,
        [staffId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Hospital admin not found'
        });
      }

      await pool.query(
        'DELETE FROM staff WHERE id = ?',
        [staffId]
      );

      return res.json({
        message: `${rows[0].name || 'Hospital admin'} has been deleted`
      });

    } catch (error) {
      console.error('Delete hospital admin error:', error);

      if (
        error.code === 'ER_ROW_IS_REFERENCED_2' ||
        error.code === 'ER_ROW_IS_REFERENCED'
      ) {
        return res.status(409).json({
          error:
            'This account is linked to other records and cannot be ' +
            'deleted. Release it instead.'
        });
      }

      return res.status(500).json({
        error: 'Failed to delete hospital admin'
      });
    }
  }
);

module.exports = router;