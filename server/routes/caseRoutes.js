const express = require('express');
const router = express.Router();

const caseController = require('../controllers/caseController');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// ==========================================
// PATIENT ROUTES
// ==========================================

router.post('/nearest-hospital', authenticate, authorize('patient'), caseController.getNearestHospital);
router.post('/', authenticate, authorize('patient'), caseController.createCase);
router.get('/', authenticate, authorize('patient'), caseController.getMyCases);

// ==========================================
// HOSPITAL STAFF ROUTES
// ==========================================

router.get('/hospital', authenticate, authorize('hospital_staff'), caseController.getHospitalCases);
router.patch('/:id/status', authenticate, authorize('hospital_staff'), caseController.updateCaseStatus);
router.patch('/:id/assign', authenticate, authorize('hospital_staff'), caseController.assignAmbulance);
router.patch('/:id/handover', authenticate, authorize('hospital_staff'), caseController.confirmPatientHandover);

// ==========================================
// DRIVER ROUTES
// ==========================================

router.get('/driver/assigned', authenticate, authorize('driver'), caseController.getDriverAssignedCases);
router.patch('/driver/ambulance/status', authenticate, authorize('driver'), caseController.updateDriverAmbulanceStatus);
router.patch('/:id/accept', authenticate, authorize('driver'), caseController.acceptCase);
router.patch('/:id/pickup', authenticate, authorize('driver'), caseController.confirmDriverPickup);
router.patch('/:id/arrive', authenticate, authorize('driver'), caseController.confirmHospitalArrival);

// ==========================================
// PATIENT: REPORT A DISPUTE
// ==========================================
router.post('/:id/dispute', authenticate, authorize('patient'), async (req, res) => {
  const caseId = Number(req.params.id);
  const patientId = req.user.id;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Please provide a reason for the dispute.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [cases] = await connection.query(`
      SELECT id, status FROM \`case\` WHERE id = ? AND patient_id = ?
    `, [caseId, patientId]);

    if (cases.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Case not found.' });
    }

    if (!['paid', 'closed'].includes(cases[0].status)) {
      await connection.rollback();
      return res.status(400).json({ error: 'You can only dispute a paid or closed case.' });
    }

    const [existing] = await connection.query(`
      SELECT id FROM disputes WHERE case_id = ? AND status = 'open'
    `, [caseId]);

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: 'You already have an open dispute for this case.' });
    }

    await connection.query(`
      INSERT INTO disputes (case_id, patient_id, reason, status)
      VALUES (?, ?, ?, 'open')
    `, [caseId, patientId, reason.trim()]);

    await connection.commit();
    return res.status(201).json({ message: 'Your issue has been reported. Our team will review it.' });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Dispute error:', err);
    return res.status(500).json({ error: 'Failed to submit dispute.' });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// HOSPITAL ADMIN: GET DISPUTES
// ==========================================
router.get('/hospital-admin/disputes', authenticate, authorize('hospital_admin'), async (req, res) => {
  const hospitalId = req.user.hospital_id; 

  try {
    // REMOVED emergency_type AND payment_amount TO PREVENT CRASHES
    const [disputes] = await pool.query(`
      SELECT d.id, d.reason, d.status, d.created_at, 
             c.id AS case_id,
             p.name AS patient_name, p.phone AS patient_phone
      FROM disputes d
      JOIN \`case\` c ON d.case_id = c.id
      JOIN patient p ON d.patient_id = p.id
      WHERE c.hospital_id = ?
      ORDER BY d.created_at DESC
    `, [hospitalId]);
    
    res.json(disputes);
  } catch (err) {
    console.error('Fetch disputes error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes.' });
  }
});

// ==========================================
// HOSPITAL ADMIN: RESOLVE A DISPUTE
// ==========================================
router.patch('/hospital-admin/disputes/:id', authenticate, authorize('hospital_admin'), async (req, res) => {
  const disputeId = Number(req.params.id);
  const hospitalId = req.user.hospital_id;

  try {
    const [dispute] = await pool.query(`
      SELECT d.id 
      FROM disputes d
      JOIN \`case\` c ON d.case_id = c.id
      WHERE d.id = ? AND c.hospital_id = ?
    `, [disputeId, hospitalId]);

    if (dispute.length === 0) {
      return res.status(403).json({ error: 'You do not have permission to resolve this dispute.' });
    }

    await pool.query(`
      UPDATE disputes SET status = 'resolved' WHERE id = ?
    `, [disputeId]);
    
    res.json({ message: 'Dispute marked as resolved.' });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    res.status(500).json({ error: 'Failed to resolve dispute.' });
  }
});

// ==========================================
// SUPER ADMIN: GET ALL DISPUTES
// ==========================================
router.get('/admin/disputes', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [disputes] = await pool.query(`
      SELECT d.id, d.reason, d.status, d.created_at, 
             c.id AS case_id,
             p.name AS patient_name, p.phone AS patient_phone
      FROM disputes d
      JOIN \`case\` c ON d.case_id = c.id
      JOIN patient p ON d.patient_id = p.id
      ORDER BY d.created_at DESC
    `);
    res.json(disputes);
  } catch (err) {
    console.error('Fetch disputes error:', err);
    res.status(500).json({ error: 'Failed to fetch disputes.' });
  }
});

// ==========================================
// SUPER ADMIN: RESOLVE A DISPUTE
// ==========================================
router.patch('/admin/disputes/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const disputeId = Number(req.params.id);
  try {
    await pool.query(`
      UPDATE disputes SET status = 'resolved' WHERE id = ?
    `, [disputeId]);
    res.json({ message: 'Dispute marked as resolved.' });
  } catch (err) {
    console.error('Resolve dispute error:', err);
    res.status(500).json({ error: 'Failed to resolve dispute.' });
  }
});

module.exports = router;