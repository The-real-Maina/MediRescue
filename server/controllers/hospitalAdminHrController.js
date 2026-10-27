const pool = require('../config/db');

// ==========================================
// HOSPITAL ADMIN: LEAVE, ABSENCES, ATTENDANCE
// AND ANNOUNCEMENTS
//
// - Only hospital_admin reaches these handlers
//   (see hospitalAdminHrRoutes.js).
// - Every query is limited to the admin's own
//   hospital, taken from the database through the
//   auth middleware, never from the request body.
// ==========================================

const MANAGED_ROLES = ['hospital_staff', 'driver'];
const MAX_RANGE_DAYS = 62;
const LEAVE_FILTERS = ['pending', 'approved', 'rejected', 'cancelled', 'all'];
const ABSENCE_FILTERS = ['reported', 'excused', 'unexcused', 'all'];
const AUDIENCES = ['all', 'hospital_staff', 'driver'];

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

function daysBetween(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const ms = new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd);
  return Math.round(ms / 86400000);
}

function getHospitalId(req) {
  const hospitalId = Number(req.user.hospital_id);
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

// ==========================================
// LIST LEAVE REQUESTS
// GET /api/hospital-admin/leave?status=pending
// status: pending | approved | rejected | cancelled | all
// ==========================================

exports.getLeaveRequests = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const status = req.query.status || 'pending';

  if (!LEAVE_FILTERS.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${LEAVE_FILTERS.join(', ')}`
    });
  }

  try {
    const params = [hospitalId];
    let statusClause = '';

    if (status !== 'all') {
      statusClause = 'AND lr.status = ?';
      params.push(status);
    }

    // same_role_on_leave helps the admin judge cover: how many people
    // in the same role are already on approved leave in those dates.
    const [requests] = await pool.query(`
      SELECT
        lr.id,
        lr.staff_id,
        s.name AS staff_name,
        s.role AS staff_role,
        lr.leave_type,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
        DATEDIFF(lr.end_date, lr.start_date) + 1 AS days,
        lr.reason,
        lr.status,
        lr.review_note,
        rv.name AS reviewed_by_name,
        DATE_FORMAT(lr.reviewed_at, '%Y-%m-%d %H:%i') AS reviewed_at,
        DATE_FORMAT(lr.created_at, '%Y-%m-%d %H:%i') AS requested_at,
        (
          SELECT COUNT(*)
          FROM leave_request o
          JOIN staff os ON os.id = o.staff_id
          WHERE o.hospital_id = lr.hospital_id
            AND o.status = 'approved'
            AND o.id <> lr.id
            AND os.role = s.role
            AND o.start_date <= lr.end_date
            AND o.end_date >= lr.start_date
        ) AS same_role_on_leave
      FROM leave_request lr
      JOIN staff s ON s.id = lr.staff_id
      LEFT JOIN staff rv ON rv.id = lr.reviewed_by
      WHERE lr.hospital_id = ?
        ${statusClause}
      ORDER BY lr.created_at DESC
      LIMIT 200
    `, params);

    return res.status(200).json({
      hospital_id: hospitalId,
      status,
      requests
    });

  } catch (err) {
    console.error('Get leave requests error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve leave requests'
    });
  }
};

// ==========================================
// APPROVE OR REJECT A LEAVE REQUEST
// POST /api/hospital-admin/leave/:id/review
// { decision: "approve" | "reject", note }
// A note is required when rejecting.
// Approving removes the person's shifts in those dates.
// ==========================================

exports.reviewLeave = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const leaveId = parseId(req.params.id);
  const decision = req.body?.decision;
  const note =
    typeof req.body?.note === 'string' ? req.body.note.trim() : '';

  if (!leaveId) {
    return res.status(400).json({ error: 'Invalid leave request ID' });
  }

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({
      error: 'decision must be "approve" or "reject"'
    });
  }

  if (note.length > 500) {
    return res.status(400).json({
      error: 'Note cannot be longer than 500 characters'
    });
  }

  if (decision === 'reject' && !note) {
    return res.status(400).json({
      error: 'Please give a reason when rejecting leave'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(`
      SELECT
        id,
        staff_id,
        status,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
      FROM leave_request
      WHERE id = ?
        AND hospital_id = ?
      FOR UPDATE
    `, [leaveId, hospitalId]);

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    const request = rows[0];

    if (request.status !== 'pending') {
      await connection.rollback();

      return res.status(409).json({
        error: `This request was already ${request.status}`
      });
    }

    if (decision === 'approve') {
      const [people] = await connection.query(
        `SELECT id FROM staff
         WHERE id = ? AND hospital_id = ? AND is_active = 1`,
        [request.staff_id, hospitalId]
      );

      if (people.length === 0) {
        await connection.rollback();

        return res.status(409).json({
          error: 'This person is no longer an active member of your team'
        });
      }
    }

    await connection.query(`
      UPDATE leave_request
      SET status = ?,
          reviewed_by = ?,
          reviewed_at = NOW(),
          review_note = ?
      WHERE id = ?
    `, [
      decision === 'approve' ? 'approved' : 'rejected',
      Number(req.user.id),
      note || null,
      leaveId
    ]);

    let removedShifts = 0;

    if (decision === 'approve') {
      const [removed] = await connection.query(`
        DELETE FROM staff_shift
        WHERE staff_id = ?
          AND hospital_id = ?
          AND shift_date BETWEEN ? AND ?
      `, [request.staff_id, hospitalId, request.start_date, request.end_date]);

      removedShifts = removed.affectedRows;
    }

    await connection.commit();

    return res.status(200).json({
      message:
        decision === 'approve'
          ? 'Leave approved' +
            (removedShifts > 0
              ? ` and ${removedShifts} shift(s) removed`
              : '')
          : 'Leave rejected',
      removed_shifts: removedShifts
    });

  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error('Review leave error:', err);

    return res.status(500).json({
      error: 'Failed to review leave request'
    });

  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// LIST ABSENCE REPORTS
// GET /api/hospital-admin/absences?status=reported&from=&to=
// status: reported | excused | unexcused | all
// ==========================================

exports.getAbsences = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const status = req.query.status || 'reported';
  const from = req.query.from;
  const to = req.query.to;

  if (!ABSENCE_FILTERS.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ABSENCE_FILTERS.join(', ')}`
    });
  }

  if (
    (from !== undefined && !isValidDate(from)) ||
    (to !== undefined && !isValidDate(to))
  ) {
    return res.status(400).json({
      error: 'Invalid date. Use the format YYYY-MM-DD'
    });
  }

  try {
    const params = [hospitalId];
    let filters = '';

    if (status !== 'all') {
      filters += ' AND ab.status = ?';
      params.push(status);
    }

    if (from) {
      filters += ' AND ab.absence_date >= ?';
      params.push(from);
    }

    if (to) {
      filters += ' AND ab.absence_date <= ?';
      params.push(to);
    }

    const [absences] = await pool.query(`
      SELECT
        ab.id,
        ab.staff_id,
        s.name AS staff_name,
        s.role AS staff_role,
        DATE_FORMAT(ab.absence_date, '%Y-%m-%d') AS absence_date,
        ab.reason,
        ab.status,
        ab.review_note,
        rv.name AS reviewed_by_name,
        DATE_FORMAT(ab.reviewed_at, '%Y-%m-%d %H:%i') AS reviewed_at,
        DATE_FORMAT(ab.created_at, '%Y-%m-%d %H:%i') AS reported_at,
        sh.shift_type AS scheduled_shift
      FROM absence_report ab
      JOIN staff s ON s.id = ab.staff_id
      LEFT JOIN staff rv ON rv.id = ab.reviewed_by
      LEFT JOIN staff_shift sh
        ON sh.staff_id = ab.staff_id
        AND sh.shift_date = ab.absence_date
      WHERE ab.hospital_id = ?
        ${filters}
      ORDER BY ab.absence_date DESC, ab.created_at DESC
      LIMIT 200
    `, params);

    return res.status(200).json({
      hospital_id: hospitalId,
      status,
      absences
    });

  } catch (err) {
    console.error('Get absences error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve absence reports'
    });
  }
};

// ==========================================
// REVIEW AN ABSENCE REPORT
// POST /api/hospital-admin/absences/:id/review
// { decision: "excused" | "unexcused", note }
// ==========================================

exports.reviewAbsence = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const absenceId = parseId(req.params.id);
  const decision = req.body?.decision;
  const note =
    typeof req.body?.note === 'string' ? req.body.note.trim() : '';

  if (!absenceId) {
    return res.status(400).json({ error: 'Invalid absence ID' });
  }

  if (!['excused', 'unexcused'].includes(decision)) {
    return res.status(400).json({
      error: 'decision must be "excused" or "unexcused"'
    });
  }

  if (note.length > 500) {
    return res.status(400).json({
      error: 'Note cannot be longer than 500 characters'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM absence_report WHERE id = ? AND hospital_id = ?',
      [absenceId, hospitalId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Absence report not found'
      });
    }

    await pool.query(`
      UPDATE absence_report
      SET status = ?,
          reviewed_by = ?,
          reviewed_at = NOW(),
          review_note = ?
      WHERE id = ?
        AND hospital_id = ?
    `, [decision, Number(req.user.id), note || null, absenceId, hospitalId]);

    return res.status(200).json({
      message: `Absence marked as ${decision}`
    });

  } catch (err) {
    console.error('Review absence error:', err);

    return res.status(500).json({
      error: 'Failed to review absence report'
    });
  }
};

// ==========================================
// ATTENDANCE SUMMARY: ACTIVE DAYS AND DAYS OFF
// GET /api/hospital-admin/attendance?from=&to=
// Defaults to the current month.
//
// For each active team member:
//   active_days = days with a scheduled shift
//   leave_days  = days of approved leave in the range
//   absent_days = reported absences (unexcused counted separately)
//   off_days    = remaining days with no shift and no leave
// ==========================================

exports.getAttendance = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const now = new Date();
  const from =
    req.query.from || formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const to =
    req.query.to || formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

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

  const rangeDays = span + 1;

  try {
    const [team] = await pool.query(`
      SELECT id, name, role
      FROM staff
      WHERE hospital_id = ?
        AND role IN (?, ?)
        AND is_active = 1
      ORDER BY role, name
    `, [hospitalId, ...MANAGED_ROLES]);

    const [shiftRows] = await pool.query(`
      SELECT
        staff_id,
        COUNT(*) AS active_days,
        SUM(shift_type = 'day') AS day_shifts,
        SUM(shift_type = 'night') AS night_shifts
      FROM staff_shift
      WHERE hospital_id = ?
        AND shift_date BETWEEN ? AND ?
      GROUP BY staff_id
    `, [hospitalId, from, to]);

    const [leaveRows] = await pool.query(`
      SELECT
        staff_id,
        SUM(DATEDIFF(LEAST(end_date, ?), GREATEST(start_date, ?)) + 1) AS leave_days
      FROM leave_request
      WHERE hospital_id = ?
        AND status = 'approved'
        AND start_date <= ?
        AND end_date >= ?
      GROUP BY staff_id
    `, [to, from, hospitalId, to, from]);

    const [absenceRows] = await pool.query(`
      SELECT
        staff_id,
        COUNT(*) AS absent_days,
        SUM(status = 'unexcused') AS unexcused_days,
        SUM(status = 'reported') AS unreviewed_days
      FROM absence_report
      WHERE hospital_id = ?
        AND absence_date BETWEEN ? AND ?
      GROUP BY staff_id
    `, [hospitalId, from, to]);

    const shiftsById = new Map(shiftRows.map((r) => [r.staff_id, r]));
    const leaveById = new Map(leaveRows.map((r) => [r.staff_id, r]));
    const absenceById = new Map(absenceRows.map((r) => [r.staff_id, r]));

    const summary = team.map((person) => {
      const shifts = shiftsById.get(person.id);
      const leave = leaveById.get(person.id);
      const absence = absenceById.get(person.id);

      const activeDays = Number(shifts?.active_days || 0);
      const leaveDays = Number(leave?.leave_days || 0);

      return {
        staff_id: person.id,
        name: person.name,
        role: person.role,
        active_days: activeDays,
        day_shifts: Number(shifts?.day_shifts || 0),
        night_shifts: Number(shifts?.night_shifts || 0),
        leave_days: leaveDays,
        absent_days: Number(absence?.absent_days || 0),
        unexcused_days: Number(absence?.unexcused_days || 0),
        unreviewed_days: Number(absence?.unreviewed_days || 0),
        off_days: Math.max(rangeDays - activeDays - leaveDays, 0)
      };
    });

    return res.status(200).json({
      hospital_id: hospitalId,
      from,
      to,
      range_days: rangeDays,
      summary
    });

  } catch (err) {
    console.error('Get attendance error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve attendance summary'
    });
  }
};

// ==========================================
// ANNOUNCEMENTS
// GET    /api/hospital-admin/announcements
// POST   /api/hospital-admin/announcements
//        { title, message, audience }
// DELETE /api/hospital-admin/announcements/:id
// audience: all | hospital_staff | driver
// ==========================================

exports.getAnnouncements = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  try {
    const [announcements] = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.message,
        a.audience,
        s.name AS created_by_name,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at
      FROM announcement a
      LEFT JOIN staff s ON s.id = a.created_by
      WHERE a.hospital_id = ?
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 100
    `, [hospitalId]);

    return res.status(200).json({
      hospital_id: hospitalId,
      announcements
    });

  } catch (err) {
    console.error('Get announcements error:', err);

    return res.status(500).json({
      error: 'Failed to retrieve announcements'
    });
  }
};

exports.createAnnouncement = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const title =
    typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const message =
    typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const audience = req.body?.audience || 'all';

  if (!title || title.length > 150) {
    return res.status(400).json({
      error: 'Title is required (up to 150 characters)'
    });
  }

  if (!message || message.length > 2000) {
    return res.status(400).json({
      error: 'Message is required (up to 2000 characters)'
    });
  }

  if (!AUDIENCES.includes(audience)) {
    return res.status(400).json({
      error: 'audience must be "all", "hospital_staff" or "driver"'
    });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO announcement
        (hospital_id, title, message, audience, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [hospitalId, title, message, audience, Number(req.user.id)]);

    return res.status(201).json({
      message: 'Announcement posted',
      announcement: {
        id: result.insertId,
        title,
        message,
        audience
      }
    });

  } catch (err) {
    console.error('Create announcement error:', err);

    return res.status(500).json({
      error: 'Failed to post announcement'
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  const hospitalId = getHospitalId(req);
  if (!hospitalId) return noHospital(res);

  const announcementId = parseId(req.params.id);

  if (!announcementId) {
    return res.status(400).json({ error: 'Invalid announcement ID' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM announcement WHERE id = ? AND hospital_id = ?',
      [announcementId, hospitalId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Announcement not found'
      });
    }

    return res.status(200).json({
      message: 'Announcement deleted'
    });

  } catch (err) {
    console.error('Delete announcement error:', err);

    return res.status(500).json({
      error: 'Failed to delete announcement'
    });
  }
};