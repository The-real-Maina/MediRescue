const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/hospitalAdminController');
const pricingController = require('../controllers/pricingController');
const pool = require('../config/db');

// All routes require hospital_admin role
router.use(authenticate, authorize('hospital_admin'));

// ==========================================
// PRICING ROUTES
// ==========================================

router.get('/pricing/current', async (req, res) => {
  console.log("--> HIT: /api/hospital-admin/pricing/current"); // DEBUG LOG
  try {
    const [prices] = await pool.query(
      'SELECT service_name, severity, amount FROM hospital_service_prices WHERE hospital_id = ?', 
      [req.user.hospital_id]
    );
    res.status(200).json(prices);
  } catch (err) {
    console.error('Fetch prices error:', err);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

router.post('/pricing/request', pricingController.proposePriceChange);

// ==========================================
// EXISTING HR & SHIFT ROUTES
// ==========================================

router.get('/hospital', controller.getHospitalDetails);
router.get('/team', controller.getTeam);
router.get('/shifts', controller.getShifts);
router.put('/shifts', controller.assignShift);
router.delete('/shifts/:staffId/:date', controller.removeShift);

router.get('/accounts', controller.getAccounts);
router.post('/accounts', controller.createAccount);
router.post('/accounts/:id/password', controller.resetPassword);
router.post('/accounts/:id/deactivate', controller.deactivateAccount);
router.post('/accounts/:id/reactivate', controller.reactivateAccount);

module.exports = router;