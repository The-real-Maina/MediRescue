const express = require('express');
const router = express.Router();

const mpesaController = require('../controllers/mpesaController');

const simulationController = require(
  '../controllers/paymentSimulationController'
);

const {
  authenticate,
  authorize
} = require('../middleware/auth');

// ======================================
// REAL M-PESA PAYMENT
// ======================================

router.post(
  '/initiate',
  authenticate,
  authorize('patient'),
  mpesaController.initiatePayment
);

// ======================================
// REAL M-PESA PAYMENT STATUS
// ======================================

router.get(
  '/status/:caseId',
  authenticate,
  authorize('patient'),
  mpesaController.checkPaymentStatus
);

// ======================================
// SAFARICOM CALLBACK
// ======================================

router.post(
  '/callback',
  mpesaController.handleCallback
);

// ======================================
// DEVELOPMENT PAYMENT SIMULATION
// ======================================

router.post(
  '/simulate',
  authenticate,
  authorize('patient'),
  simulationController.simulatePayment
);

module.exports = router;