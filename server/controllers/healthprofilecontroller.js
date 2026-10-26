const pool = require('../config/db');

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const text = (v, max) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const num = (v, min, max) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
};
const list = (v, fields, maxItems = 20) => {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems)
    .map(item => Object.fromEntries(fields.map(f => [f, text(item?.[f], 120)])))
    .filter(item => item[fields[0]]);
};
const parseJson = v => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
};

// GET /api/health-profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.name, p.phone, p.blood_type, p.allergies, p.chronic_conditions,
              p.next_of_kin_name, p.next_of_kin_phone,
              h.date_of_birth, h.gender, h.height_cm, h.weight_kg, h.medications,
              h.past_surgeries, h.family_history, h.mobility_needs,
              h.pregnancy_status, h.home_landmark, h.insurance_provider,
              h.insurance_member_no, h.preferred_hospital_id, h.extra_contacts,
              h.share_with_responders, h.updated_at
       FROM patient p
       LEFT JOIN patient_health_profile h ON h.patient_id = p.id
       WHERE p.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });

    const r = rows[0];
    return res.status(200).json({
      ...r,
      date_of_birth: r.date_of_birth
        ? new Date(r.date_of_birth).toISOString().slice(0, 10) : '',
      medications: parseJson(r.medications),
      past_surgeries: parseJson(r.past_surgeries),
      extra_contacts: parseJson(r.extra_contacts),
      share_with_responders: Boolean(r.share_with_responders)
    });
  } catch (err) {
    console.error('Get health profile error:', err);
    return res.status(500).json({ error: 'Failed to load health profile' });
  }
};

// PUT /api/health-profile
exports.saveProfile = async (req, res) => {
  const b = req.body || {};

  const bloodType = b.blood_type ? String(b.blood_type) : null;
  if (bloodType && !BLOOD_TYPES.includes(bloodType)) {
    return res.status(400).json({ error: 'Invalid blood group' });
  }
  const height = num(b.height_cm, 30, 260);
  const weight = num(b.weight_kg, 1, 500);
  if (Number.isNaN(height) || Number.isNaN(weight)) {
    return res.status(400).json({ error: 'Enter a realistic height and weight' });
  }
  let dob = null;
  if (b.date_of_birth) {
    const d = new Date(b.date_of_birth);
    if (Number.isNaN(d.getTime()) || d > new Date()) {
      return res.status(400).json({ error: 'Enter a valid date of birth' });
    }
    dob = b.date_of_birth;
  }

  const medications = list(b.medications, ['name', 'dose', 'frequency']);
  const surgeries = list(b.past_surgeries, ['procedure', 'year']);
  const contacts = list(b.extra_contacts, ['name', 'relationship', 'phone'], 5);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `UPDATE patient SET blood_type = ?, allergies = ?, chronic_conditions = ?,
         next_of_kin_name = ?, next_of_kin_phone = ?
       WHERE id = ?`,
      [bloodType, text(b.allergies, 1000), text(b.chronic_conditions, 1000),
       text(b.next_of_kin_name, 100), text(b.next_of_kin_phone, 20), req.user.id]
    );

    await connection.query(
      `INSERT INTO patient_health_profile
        (patient_id, date_of_birth, gender, height_cm, weight_kg, medications,
         past_surgeries, family_history, mobility_needs, pregnancy_status,
         home_landmark, insurance_provider, insurance_member_no,
         preferred_hospital_id, extra_contacts, share_with_responders)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         date_of_birth = VALUES(date_of_birth), gender = VALUES(gender),
         height_cm = VALUES(height_cm), weight_kg = VALUES(weight_kg),
         medications = VALUES(medications), past_surgeries = VALUES(past_surgeries),
         family_history = VALUES(family_history), mobility_needs = VALUES(mobility_needs),
         pregnancy_status = VALUES(pregnancy_status), home_landmark = VALUES(home_landmark),
         insurance_provider = VALUES(insurance_provider),
         insurance_member_no = VALUES(insurance_member_no),
         preferred_hospital_id = VALUES(preferred_hospital_id),
         extra_contacts = VALUES(extra_contacts),
         share_with_responders = VALUES(share_with_responders)`,
      [req.user.id, dob, text(b.gender, 20), height, weight,
       JSON.stringify(medications), JSON.stringify(surgeries),
       text(b.family_history, 2000), text(b.mobility_needs, 1000),
       text(b.pregnancy_status, 20), text(b.home_landmark, 255),
       text(b.insurance_provider, 100), text(b.insurance_member_no, 60),
       Number.isSafeInteger(Number(b.preferred_hospital_id)) && Number(b.preferred_hospital_id) > 0
         ? Number(b.preferred_hospital_id) : null,
       JSON.stringify(contacts), b.share_with_responders ? 1 : 0]
    );

    await connection.commit();
    return res.status(200).json({ message: 'Health profile saved' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Save health profile error:', err);
    return res.status(500).json({ error: 'Failed to save health profile' });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// RESPONDER VIEW
// GET /api/health-profile/case/:caseId
//
// - Assigned driver: while the case is dispatched, picked up or
//   arrived at the hospital.
// - Staff of the case's hospital: from request until payment pending.
// - Only when the patient ticked "share with my response team".
// - Anyone else gets the same 404 as a missing case.
// ==========================================

const DRIVER_STATUSES = ['dispatched', 'picked_up', 'arrived_at_hospital'];
const STAFF_STATUSES = [
  'requested', 'dispatched', 'picked_up', 'arrived_at_hospital',
  'handed_over', 'in_treatment', 'payment_pending'
];

exports.getProfileForCase = async (req, res) => {
  const caseId = Number(req.params.caseId);
  const userId = Number(req.user.id);
  const hospitalId = Number(req.user.hospital_id);

  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    return res.status(400).json({ error: 'Invalid case ID' });
  }
  if (!['driver', 'hospital_staff'].includes(req.user.role)) {
    return res.status(404).json({ error: 'Health summary is not available' });
  }

  try {
    const [cases] = await pool.query(
      `SELECT c.id, c.status, c.patient_id, c.hospital_id, a.driver_id
       FROM \`case\` c
       LEFT JOIN ambulance a ON a.id = c.ambulance_id
       WHERE c.id = ?`,
      [caseId]
    );

    const c = cases[0];
    const allowed = c && Number(c.hospital_id) === hospitalId && (
      (req.user.role === 'driver' &&
        Number(c.driver_id) === userId &&
        DRIVER_STATUSES.includes(c.status)) ||
      (req.user.role === 'hospital_staff' &&
        STAFF_STATUSES.includes(c.status))
    );

    if (!allowed) {
      return res.status(404).json({ error: 'Health summary is not available' });
    }

    const [rows] = await pool.query(
      `SELECT p.name, p.blood_type, p.allergies, p.chronic_conditions,
              p.next_of_kin_name, p.next_of_kin_phone,
              h.date_of_birth, h.gender, h.height_cm, h.weight_kg,
              h.medications, h.past_surgeries, h.family_history,
              h.mobility_needs, h.pregnancy_status, h.home_landmark,
              h.insurance_provider, h.insurance_member_no,
              h.extra_contacts, h.share_with_responders
       FROM patient p
       LEFT JOIN patient_health_profile h ON h.patient_id = p.id
       WHERE p.id = ?`,
      [c.patient_id]
    );

    const r = rows[0];
    if (!r || !r.share_with_responders) {
      return res.status(200).json({ shared: false });
    }

    let age = null;
    if (r.date_of_birth) {
      const dob = new Date(r.date_of_birth);
      const now = new Date();
      age = now.getFullYear() - dob.getFullYear();
      const beforeBirthday =
        now.getMonth() < dob.getMonth() ||
        (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
      if (beforeBirthday) age -= 1;
    }

    const isStaff = req.user.role === 'hospital_staff';

    return res.status(200).json({
      shared: true,
      name: r.name,
      age,
      gender: r.gender,
      height_cm: r.height_cm,
      weight_kg: r.weight_kg,
      blood_type: r.blood_type,
      allergies: r.allergies,
      chronic_conditions: r.chronic_conditions,
      medications: parseJson(r.medications),
      past_surgeries: parseJson(r.past_surgeries),
      pregnancy_status: r.pregnancy_status,
      mobility_needs: r.mobility_needs,
      home_landmark: r.home_landmark,
      next_of_kin_name: r.next_of_kin_name,
      next_of_kin_phone: r.next_of_kin_phone,
      extra_contacts: parseJson(r.extra_contacts),
      // Hospital staff only
      family_history: isStaff ? r.family_history : null,
      insurance_provider: isStaff ? r.insurance_provider : null,
      insurance_member_no: isStaff ? r.insurance_member_no : null
    });
  } catch (err) {
    console.error('Get case health summary error:', err);
    return res.status(500).json({ error: 'Failed to load health summary' });
  }
};