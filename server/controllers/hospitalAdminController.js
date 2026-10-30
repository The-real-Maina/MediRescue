const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// ==========================================
// HOSPITAL ADMIN: TEAM, ACCOUNTS AND SHIFTS
// ==========================================

const MANAGED_ROLES = ['hospital_staff', 'driver'];
const SHIFT_TYPES = ['day', 'night'];
const MAX_RANGE_DAYS = 62;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DRIVER_ACTIVE_CASE_STATUSES = [
  'assigned',
  'dispatched',
  'picked_up',
  'arrived_at_hospital'
];

// ==========================================
// HELPERS
// ==========================================

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);

  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

function addDays(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  return formatDate(new Date(y, m - 1, d + days));
}

function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const ms = new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd);
  return Math.round(ms / 86400000);
}

function getAdminHospitalId(req) {
  const hospitalId = Number(req.user.hospital_id);
  return Number.isSafeInteger(hospitalId) && hospitalId > 0
    ? hospitalId
    : null;
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ==========================================
// LIST THE ACTIVE HOSPITAL TEAM WITH THEIR SHIFT
// GET /api/hospital-admin/team?date=YYYY-MM-DD
// ==========================================

exports.getTeam = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);

  if (!hospitalId) {
    return res.status(403).json({
      error: 'Your account is not linked to a hospital'
    });
  }

  const date = req.query.date || formatDate(new Date());

  if (!isValidDate(date)) {
    return res.status(400).json({
      error: 'Invalid date. Use the format YYYY-MM-DD'
    });
  }

  try {
    const [team] = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.role,
        a.id AS ambulance_id,
        sh.shift_type
      FROM staff s
      LEFT JOIN ambulance a
        ON a.driver_id = s.id
        AND a.hospital_id = s.hospital_id
      LEFT JOIN staff_shift sh
        ON sh.staff_id = s.id
        AND sh.shift_date = ?
      WHERE s.hospital_id = ?
        AND s.role IN (?, ?)
        AND s.is_active = 1
      ORDER BY s.role, s.name
    `, [date, hospitalId, ...MANAGED_ROLES]);

    return res.status(200).json({
      hospital_id: hospitalId,
      date,
      team
    });

  } catch (err) {
    console.error('Get team error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve hospital team'
    });
  }
};

// ==========================================
// LIST SHIFTS IN A DATE RANGE & SHIFT COVERAGE WARNINGS
// GET /api/hospital-admin/shifts?from=&to=
// ==========================================

exports.getShifts = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'From and To dates are required' });
    }

    // 1. Fetch the actual shifts from your staff_shift table
    const [shifts] = await pool.query(`
      SELECT s.id, s.staff_id, s.shift_date, s.shift_type, st.name AS staff_name, st.role
      FROM staff_shift s
      JOIN staff st ON s.staff_id = st.id
      WHERE st.hospital_id = ? AND s.shift_date BETWEEN ? AND ?
      ORDER BY s.shift_date ASC
    `, [hospitalId, from, to]);

    // 2. Fetch all hospital staff
    const [staff] = await pool.query(`
      SELECT id, name, role FROM staff 
      WHERE hospital_id = ? AND role IN ('driver', 'hospital_staff') AND is_active = 1
    `, [hospitalId]);

    // 3. Calculate Coverage Warnings
    const MIN_DRIVERS_DAY = 2;
    const MIN_DRIVERS_NIGHT = 1;
    const MIN_STAFF_DAY = 2;
    const MIN_STAFF_NIGHT = 1;

    const warnings = [];
    const shiftMap = {};
    
    shifts.forEach(s => {
      // Ensure date is a clean YYYY-MM-DD string
      const date = new Date(s.shift_date).toISOString().split('T')[0];
      if (!shiftMap[date]) {
        shiftMap[date] = { 
          day: { drivers: 0, staff: 0 }, 
          night: { drivers: 0, staff: 0 } 
        };
      }
      
      if (s.role === 'driver') {
        shiftMap[date][s.shift_type].drivers += 1;
      } else {
        shiftMap[date][s.shift_type].staff += 1;
      }
    });

    const current = new Date(from);
    const end = new Date(to);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = shiftMap[dateStr] || { 
        day: { drivers: 0, staff: 0 }, 
        night: { drivers: 0, staff: 0 } 
      };

      if (dayData.day.drivers < MIN_DRIVERS_DAY) {
        warnings.push({ date: dateStr, type: 'day', role: 'driver', count: dayData.day.drivers, min: MIN_DRIVERS_DAY });
      }
      if (dayData.night.drivers < MIN_DRIVERS_NIGHT) {
        warnings.push({ date: dateStr, type: 'night', role: 'driver', count: dayData.night.drivers, min: MIN_DRIVERS_NIGHT });
      }
      if (dayData.day.staff < MIN_STAFF_DAY) {
        warnings.push({ date: dateStr, type: 'day', role: 'staff', count: dayData.day.staff, min: MIN_STAFF_DAY });
      }
      if (dayData.night.staff < MIN_STAFF_NIGHT) {
        warnings.push({ date: dateStr, type: 'night', role: 'staff', count: dayData.night.staff, min: MIN_STAFF_NIGHT });
      }

      current.setDate(current.getDate() + 1);
    }

    res.json({ shifts, staff, warnings });

  } catch (err) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to retrieve shifts' });
  }
};

// ==========================================
// ASSIGN OR CHANGE A SHIFT
// PUT /api/hospital-admin/shifts
// ==========================================

exports.assignShift = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);

  if (!hospitalId) {
    return res.status(403).json({ error: 'Your account is not linked to a hospital' });
  }

  const staffId = Number(req.body?.staff_id);
  const shiftDate = req.body?.shift_date;
  const shiftType = req.body?.shift_type;

  if (!Number.isSafeInteger(staffId) || staffId <= 0) {
    return res.status(400).json({ error: 'A valid staff_id is required' });
  }

  if (!isValidDate(shiftDate)) {
    return res.status(400).json({ error: 'Invalid shift_date. Use YYYY-MM-DD' });
  }

  if (!SHIFT_TYPES.includes(shiftType)) {
    return res.status(400).json({ error: 'shift_type must be "day" or "night"' });
  }

  try {
    const [people] = await pool.query(`
      SELECT id, name, role FROM staff
      WHERE id = ? AND hospital_id = ? AND role IN (?, ?) AND is_active = 1
    `, [staffId, hospitalId, ...MANAGED_ROLES]);

    if (people.length === 0) {
      return res.status(404).json({ error: 'That person is not on your hospital team' });
    }

    const [onLeave] = await pool.query(`
      SELECT id FROM leave_request
      WHERE staff_id = ? AND status = 'approved' AND ? BETWEEN start_date AND end_date LIMIT 1
    `, [staffId, shiftDate]);

    if (onLeave.length > 0) {
      return res.status(409).json({ error: 'This person is on approved leave on that date' });
    }

    await pool.query(`
      INSERT INTO staff_shift (staff_id, hospital_id, shift_date, shift_type, assigned_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE shift_type = VALUES(shift_type), assigned_by = VALUES(assigned_by)
    `, [staffId, hospitalId, shiftDate, shiftType, Number(req.user.id)]);

    return res.status(200).json({
      message: 'Shift saved',
      shift: { staff_id: staffId, staff_name: people[0].name, shift_date: shiftDate, shift_type: shiftType }
    });

  } catch (err) {
    console.error('Assign shift error:', err);
    return res.status(500).json({ error: 'Failed to save shift' });
  }
};

// ==========================================
// REMOVE A SHIFT
// DELETE /api/hospital-admin/shifts/:staffId/:date
// ==========================================

exports.removeShift = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);

  if (!hospitalId) {
    return res.status(403).json({ error: 'Your account is not linked to a hospital' });
  }

  const staffId = Number(req.params.staffId);
  const shiftDate = req.params.date;

  if (!Number.isSafeInteger(staffId) || staffId <= 0) {
    return res.status(400).json({ error: 'Invalid staff ID' });
  }

  if (!isValidDate(shiftDate)) {
    return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD' });
  }

  try {
    const [result] = await pool.query(`
      DELETE FROM staff_shift WHERE staff_id = ? AND hospital_id = ? AND shift_date = ?
    `, [staffId, hospitalId, shiftDate]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No shift found for that person on that date' });
    }

    return res.status(200).json({ message: 'Shift removed' });

  } catch (err) {
    console.error('Remove shift error:', err);
    return res.status(500).json({ error: 'Failed to remove shift' });
  }
};

// ==========================================
// LIST ALL ACCOUNTS (ACTIVE AND RELEASED)
// GET /api/hospital-admin/accounts
// ==========================================

exports.getAccounts = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);

  if (!hospitalId) {
    return res.status(403).json({ error: 'Your account is not linked to a hospital' });
  }

  try {
    const [accounts] = await pool.query(`
      SELECT s.id, s.name, s.email, s.role, s.is_active, a.id AS ambulance_id, a.plate_number
      FROM staff s
      LEFT JOIN ambulance a ON a.driver_id = s.id AND a.hospital_id = s.hospital_id
      WHERE s.hospital_id = ? AND s.role IN (?, ?)
      ORDER BY s.is_active DESC, s.role, s.name
    `, [hospitalId, ...MANAGED_ROLES]);

    return res.status(200).json({ hospital_id: hospitalId, accounts });

  } catch (err) {
    console.error('Get accounts error:', err);
    return res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
};

// ==========================================
// CREATE A STAFF OR DRIVER ACCOUNT
// POST /api/hospital-admin/accounts
// ==========================================

exports.createAccount = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);

  if (!hospitalId) {
    return res.status(403).json({ error: 'Your account is not linked to a hospital' });
  }

  try {
    const { name, email, password, account_type } = req.body || {};
    const personName = typeof name === 'string' ? name.trim() : '';
    const personEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!personName || personName.length > 100) return res.status(400).json({ error: 'Valid name is required' });
    if (!personEmail || personEmail.length > 100 || !EMAIL_PATTERN.test(personEmail)) return res.status(400).json({ error: 'Valid email address is required' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must contain 8 to 72 characters' });
    if (!MANAGED_ROLES.includes(account_type)) return res.status(400).json({ error: 'Account type must be hospital staff or driver' });

    const [existing] = await pool.query('SELECT id FROM staff WHERE email = ?', [personEmail]);
    if (existing.length > 0) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(`
      INSERT INTO staff (hospital_id, name, email, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [hospitalId, personName, personEmail, passwordHash, account_type]);

    return res.status(201).json({
      message: account_type === 'driver' ? 'Driver account created' : 'Hospital staff account created',
      account: { id: result.insertId, name: personName, email: personEmail, role: account_type }
    });

  } catch (err) {
    console.error('Create account error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists' });
    return res.status(500).json({ error: 'Failed to create account' });
  }
};

// ==========================================
// RESET A TEAM MEMBER'S PASSWORD
// ==========================================

exports.resetPassword = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);
  if (!hospitalId) return res.status(403).json({ error: 'Your account is not linked to a hospital' });

  const staffId = parseId(req.params.id);
  const password = req.body?.password;

  if (!staffId) return res.status(400).json({ error: 'Invalid account ID' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must contain 8 to 72 characters' });

  try {
    const [rows] = await pool.query(`
      SELECT id, name FROM staff
      WHERE id = ? AND hospital_id = ? AND role IN (?, ?)
    `, [staffId, hospitalId, ...MANAGED_ROLES]);

    if (rows.length === 0) return res.status(404).json({ error: 'That person is not on your hospital team' });

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(`
      UPDATE staff SET password_hash = ?, password_changed_at = NOW(), must_change_password = 1
      WHERE id = ? AND hospital_id = ? AND role IN (?, ?)
    `, [passwordHash, staffId, hospitalId, ...MANAGED_ROLES]);

    return res.status(200).json({ message: `Password reset for ${rows[0].name || 'team member'}` });

  } catch (err) {
    console.error('Reset team password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};

// ==========================================
// RELEASE (DEACTIVATE) A TEAM MEMBER
// ==========================================

exports.deactivateAccount = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);
  if (!hospitalId) return res.status(403).json({ error: 'Your account is not linked to a hospital' });

  const staffId = parseId(req.params.id);
  if (!staffId) return res.status(400).json({ error: 'Invalid account ID' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT id, name, role, is_active FROM staff
      WHERE id = ? AND hospital_id = ? AND role IN (?, ?) FOR UPDATE
    `, [staffId, hospitalId, ...MANAGED_ROLES]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'That person is not on your hospital team' });
    }

    const person = rows[0];
    if (Number(person.is_active) === 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'This account is already released' });
    }

    let ambulanceFreed = false;

    if (person.role === 'hospital_staff') {
      const [activeCases] = await connection.query(`
        SELECT id FROM \`case\` WHERE staff_id = ? AND (status IS NULL OR status <> 'closed') LIMIT 1
      `, [staffId]);

      if (activeCases.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This staff member is handling an open emergency case.' });
      }
    }

    if (person.role === 'driver') {
      const [ambulances] = await connection.query(`
        SELECT id, status FROM ambulance WHERE driver_id = ? AND hospital_id = ? FOR UPDATE
      `, [staffId, hospitalId]);

      if (ambulances.length > 0) {
        const ambulanceIds = ambulances.map((a) => a.id);
        const [openCases] = await connection.query(`
          SELECT id FROM \`case\` WHERE ambulance_id IN (?) AND status IN (?) LIMIT 1
        `, [ambulanceIds, DRIVER_ACTIVE_CASE_STATUSES]);

        const ambulanceBusy = ambulances.some((a) => a.status && a.status !== 'available');

        if (openCases.length > 0 || ambulanceBusy) {
          await connection.rollback();
          return res.status(409).json({ error: 'This driver\'s ambulance is on an active dispatch.' });
        }

        await connection.query(`
          UPDATE ambulance SET driver_id = NULL WHERE driver_id = ? AND hospital_id = ?
        `, [staffId, hospitalId]);
        ambulanceFreed = true;
      }
    }

    await connection.query(`UPDATE staff SET is_active = 0 WHERE id = ? AND hospital_id = ?`, [staffId, hospitalId]);
    await connection.query(`DELETE FROM staff_shift WHERE staff_id = ? AND hospital_id = ? AND shift_date >= CURDATE()`, [staffId, hospitalId]);
    
    await connection.commit();

    return res.status(200).json({
      message: `${person.name || 'Team member'} has been released` + (ambulanceFreed ? ' and unassigned from their ambulance' : '')
    });

  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Release team member error:', err);
    return res.status(500).json({ error: 'Failed to release account' });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// REACTIVATE A RELEASED TEAM MEMBER
// ==========================================

exports.reactivateAccount = async (req, res) => {
  const hospitalId = getAdminHospitalId(req);
  if (!hospitalId) return res.status(403).json({ error: 'Your account is not linked to a hospital' });

  const staffId = parseId(req.params.id);
  if (!staffId) return res.status(400).json({ error: 'Invalid account ID' });

  try {
    const [rows] = await pool.query(`
      SELECT id, name FROM staff WHERE id = ? AND hospital_id = ? AND role IN (?, ?)
    `, [staffId, hospitalId, ...MANAGED_ROLES]);

    if (rows.length === 0) return res.status(404).json({ error: 'That person is not on your hospital team' });

    await pool.query(`
      UPDATE staff SET is_active = 1 WHERE id = ? AND hospital_id = ? AND role IN (?, ?)
    `, [staffId, hospitalId, ...MANAGED_ROLES]);

    return res.status(200).json({ message: `${rows[0].name || 'Team member'} has been reactivated` });

  } catch (err) {
    console.error('Reactivate team member error:', err);
    return res.status(500).json({ error: 'Failed to reactivate account' });
  }
};

/**
 * GET /api/hospital-admin/hospital
 * Returns the hospital belonging to the logged-in admin.
 */
exports.getHospitalDetails = async (req, res) => {
  const hospitalId = Number(req.user.hospital_id);

  if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
    return res.status(403).json({ error: 'Your account is not linked to a hospital' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT id, name, location FROM hospital WHERE id = ? LIMIT 1
    `, [hospitalId]);

    if (rows.length === 0) return res.status(404).json({ error: 'Hospital not found' });

    return res.status(200).json({ hospital: rows[0] });
  } catch (err) {
    console.error('Get hospital details error:', err);
    return res.status(500).json({ error: 'Failed to retrieve hospital details' });
  }
};