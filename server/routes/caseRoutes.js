const express = require('express');

const router = express.Router();

const caseController = require('../controllers/caseController');

const { authenticate, authorize } = require('../middleware/auth');


// ==========================================
// PATIENT ROUTES
// ==========================================

// Create a new emergency case
router.post(
  '/',
  authenticate,
  authorize('patient'),
  caseController.createCase
);


// Get logged-in patient's emergency cases
router.get(
  '/',
  authenticate,
  authorize('patient'),
  caseController.getMyCases
);


// ==========================================
// HOSPITAL STAFF ROUTES
// ==========================================

// Get emergency cases belonging to staff's hospital
router.get(
  '/hospital',
  authenticate,
  authorize('hospital_staff'),
  caseController.getHospitalCases
);


module.exports = router;