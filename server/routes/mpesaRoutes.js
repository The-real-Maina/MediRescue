
const express = require('express');
const router = express.Router();

const mpesaController = require('../controllers/mpesaController');

const {
  authenticate,
  authorize
} = require('../middleware/auth');

// Patient initiates M-Pesa payment
router.post(
  '/initiate',
  authenticate,
  authorize('patient'),
  mpesaController.initiatePayment
);

// Patient checks payment status
router.get(
  '/status/:caseId',
  authenticate,
  authorize('patient'),
  mpesaController.checkPaymentStatus
);

// Safaricom callback
router.post(
  '/callback',
  mpesaController.handleCallback
);

module.exports = router;
