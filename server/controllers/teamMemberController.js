
const pool = require('../config/db');

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'other'];
const MAX_RANGE_DAYS = 62;
const MAX_LEAVE_DAYS = 60;
const ABSENCE_LOOKBACK_DAYS = 7;

// HELPERS

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return [y, m, d].join('-');
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);

  return parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d;
}

function addDays(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  return formatDate(new Date(y, m - 1, d + days));
}

function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
  return Math.round(ms / 86400000);
}

function getHospitalId(req) {
  const hospitalId = Number(req.user?.hospital_id);
  return Number.isSafeInteger(hospitalId) && hospitalId > 0
    ? hospitalId
    : null;
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function noHospital(res) {
  return res.status(403).json({
    error: 'Your account is not linked to a hospital'
  });
}

// MY HOSPITAL
// GET /api/team-member/hospital

exports.getMyHospital = async (req, res) => {
  const hospitalId = getHospitalId(req);

  if (!hospitalId) {
    return noHospital(res);
  }

  try {
    const [hospitals] = await pool.query(
      `SELECT id, name, location
       FROM hospital
       WHERE id = ?
       LIMIT 1`,
      [hospitalId]
    );

    if (hospitals.length === 0) {
      return res.status(404).json({
        error: 'Your hospital could not be found'
      });
    }

    return res.status(200).json({
      hospital: hospitals[0]
    });
  } catch (err) {
    console.error('Get my hospital error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve your hospital'
    });
  }
};

// MY SHIFTS
// GET /api/team-member/shifts?from=&to=

exports.getMyShifts = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const staffId = Number(req.user.id);
  const from = req.query.from || formatDate(new Date());
  const to = req.query.to || addDays(from, 13);

  if (!isValidDate(from) || !isValidDate(to)) {
    return res.status(400).json({
      error: 'Invalid date. Use the format YYYY-MM-DD'
    });
  }

  const span = daysBetween(from, to);

  if (span < 0) {
    return res.status(400).json({
      error: '"to" date cannot be before "from" date'
    });
  }

  if (span > MAX_RANGE_DAYS) {
    return res.status(400).json({
      error: `Date range cannot be longer than ${MAX_RANGE_DAYS} days`
    });
  }

  try {
    const [shifts] = await pool.query(`
      SELECT
        DATE_FORMAT(shift_date, '%Y-%m-%d') AS shift_date,
        shift_type
      FROM staff_shift
      WHERE staff_id = ?
        AND hospital_id = ?
        AND shift_date BETWEEN ? AND ?
      ORDER BY shift_date
    `, [staffId, hospitalId, from, to]);

    const [leave] = await pool.query(`
      SELECT
        id,
        leave_type,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
      FROM leave_request
      WHERE staff_id = ?
        AND status = 'approved'
        AND start_date <= ?
        AND end_date >= ?
      ORDER BY start_date
    `, [staffId, to, from]);

    return res.status(200).json({ from, to, shifts, leave });
  } catch (err) {
    console.error('Get my shifts error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve your shifts'
    });
  }
};

// REQUEST LEAVE
// POST /api/team-member/leave

exports.requestLeave = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const staffId = Number(req.user.id);
  const leaveType = req.body?.leave_type;
  const startDate = req.body?.start_date;
  const endDate = req.body?.end_date;
  const reason = typeof req.body?.reason === 'string'
    ? req.body.reason.trim()
    : '';

  if (!LEAVE_TYPES.includes(leaveType)) {
    return res.status(400).json({
      error: `leave_type must be one of: ${LEAVE_TYPES.join(', ')}`
    });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      error: 'Invalid date. Use the format YYYY-MM-DD'
    });
  }

  const today = formatDate(new Date());

  if (startDate < today) {
    return res.status(400).json({
      error: 'Leave cannot start in the past. Use "Report absence" instead.'
    });
  }

  const span = daysBetween(startDate, endDate);

  if (span < 0) {
    return res.status(400).json({
      error: 'End date cannot be before the start date'
    });
  }

  if (span + 1 > MAX_LEAVE_DAYS) {
    return res.status(400).json({
      error: `Leave cannot be longer than ${MAX_LEAVE_DAYS} days`
    });
  }

  if (reason.length > 500) {
    return res.status(400).json({
      error: 'Reason cannot be longer than 500 characters'
    });
  }

  if (leaveType === 'other' && !reason) {
    return res.status(400).json({
      error: 'Please give a reason for this leave'
    });
  }

  try {
    const [overlap] = await pool.query(`
      SELECT id
      FROM leave_request
      WHERE staff_id = ?
        AND status IN ('pending', 'approved')
        AND start_date <= ?
        AND end_date >= ?
      LIMIT 1
    `, [staffId, endDate, startDate]);

    if (overlap.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending or approved leave in those dates'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO leave_request
        (staff_id, hospital_id, leave_type, start_date, end_date, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [staffId, hospitalId, leaveType, startDate, endDate, reason || null]);

    return res.status(201).json({
      message: 'Leave request sent to your hospital admin',
      request: {
        id: result.insertId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('Request leave error:', err);
    return res.status(500).json({
      error: 'Failed to send leave request'
    });
  }
};

// MY LEAVE REQUESTS
// GET /api/team-member/leave

exports.getMyLeave = async (req, res) => {
  const staffId = Number(req.user.id);

  try {
    const [requests] = await pool.query(`
      SELECT
        lr.id,
        lr.leave_type,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
        DATEDIFF(lr.end_date, lr.start_date) + 1 AS days,
        lr.reason,
        lr.status,
        lr.review_note,
        rv.name AS reviewed_by_name,
        DATE_FORMAT(lr.reviewed_at, '%Y-%m-%d %H:%i') AS reviewed_at,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i') AS requested_at
      FROM leave_request lr
      LEFT JOIN staff rv ON rv.id = lr.reviewed_by
      WHERE lr.staff_id = ?
      ORDER BY lr.created_at DESC
      LIMIT 100
    `, [staffId]);

    return res.status(200).json({ requests });
  } catch (err) {
    console.error('Get my leave error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve your leave requests'
    });
  }
};

// CANCEL A PENDING LEAVE REQUEST
// POST /api/team-member/leave/:id/cancel

exports.cancelLeave = async (req, res) => {
  const staffId = Number(req.user.id);
  const leaveId = parseId(req.params.id);

  if (!leaveId) {
    return res.status(400).json({
      error: 'Invalid leave request ID'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, status FROM leave_request WHERE id = ? AND staff_id = ?',
      [leaveId, staffId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    if (rows[0].status !== 'pending') {
      return res.status(409).json({
        error: `Only pending requests can be cancelled. This one is ${rows[0].status}.`
      });
    }

    await pool.query(
      `UPDATE leave_request
       SET status = 'cancelled'
       WHERE id = ? AND staff_id = ? AND status = 'pending'`,
      [leaveId, staffId]
    );

    return res.status(200).json({
      message: 'Leave request cancelled'
    });
  } catch (err) {
    console.error('Cancel leave error:', err);
    return res.status(500).json({
      error: 'Failed to cancel leave request'
    });
  }
};

// REPORT AN ABSENCE
// POST /api/team-member/absences

exports.reportAbsence = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const staffId = Number(req.user.id);
  const absenceDate = req.body?.absence_date;
  const reason = typeof req.body?.reason === 'string'
    ? req.body.reason.trim()
    : '';

  if (!isValidDate(absenceDate)) {
    return res.status(400).json({
      error: 'Invalid date. Use the format YYYY-MM-DD'
    });
  }

  const today = formatDate(new Date());
  const earliest = addDays(today, -ABSENCE_LOOKBACK_DAYS);

  if (absenceDate > today) {
    return res.status(400).json({
      error: 'You cannot report an absence in the future. Request leave instead.'
    });
  }

  if (absenceDate < earliest) {
    return res.status(400).json({
      error: `Absences can only be reported for the last ${ABSENCE_LOOKBACK_DAYS} days`
    });
  }

  if (reason.length < 3 || reason.length > 500) {
    return res.status(400).json({
      error: 'Please give a reason (3 to 500 characters)'
    });
  }

  try {
    await pool.query(`
      INSERT INTO absence_report
        (staff_id, hospital_id, absence_date, reason)
      VALUES (?, ?, ?, ?)
    `, [staffId, hospitalId, absenceDate, reason]);

    return res.status(201).json({
      message: 'Absence reported to your hospital admin'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'You have already reported an absence for that date'
      });
    }

    console.error('Report absence error:', err);
    return res.status(500).json({
      error: 'Failed to report absence'
    });
  }
};

// MY ABSENCE REPORTS
// GET /api/team-member/absences

exports.getMyAbsences = async (req, res) => {
  const staffId = Number(req.user.id);

  try {
    const [absences] = await pool.query(`
      SELECT
        ab.id,
        DATE_FORMAT(ab.absence_date, '%Y-%m-%d') AS absence_date,
        ab.reason,
        ab.status,
        ab.review_note,
        DATE_FORMAT(ab.created_at, '%Y-%m-%d %H:%i') AS reported_at
      FROM absence_report ab
      WHERE ab.staff_id = ?
      ORDER BY ab.absence_date DESC
      LIMIT 100
    `, [staffId]);

    return res.status(200).json({ absences });
  } catch (err) {
    console.error('Get my absences error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve your absence reports'
    });
  }
};

// ANNOUNCEMENTS FOR ME
// GET /api/team-member/announcements

exports.getMyAnnouncements = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  try {
    const [announcements] = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.message,
        s.name AS posted_by,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM announcement a
      LEFT JOIN staff s ON s.id = a.created_by
      WHERE a.hospital_id = ?
        AND a.audience IN ('all', ?)
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 50
    `, [hospitalId, req.user.role]);

    return res.status(200).json({ announcements });
  } catch (err) {
    console.error('Get my announcements error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve announcements'
    });
  }
};
