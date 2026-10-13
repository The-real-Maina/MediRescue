const express = require('express');
const router = express.Router();

const hospitalPricingController = require('../controllers/hospitalPricingController');

const {
  authenticate,
  authorize
} = require('../middleware/auth');

// ==========================================
// GET HOSPITAL SERVICE PRICES
// ==========================================

router.get(
  '/',
  authenticate,
  authorize('hospital_staff'),
  hospitalPricingController.getPrices
);

// ==========================================
// UPDATE HOSPITAL SERVICE PRICE
// ==========================================

router.put(
  '/:id',
  authenticate,
  authorize('hospital_staff'),
  hospitalPricingController.updatePrice
);

module.exports = router;