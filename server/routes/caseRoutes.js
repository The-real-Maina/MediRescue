
const express = require('express');
const router = express.Router();

const caseController = require('../controllers/caseController');
const { authenticate, authorize } = require('../middleware/auth');

// ==========================================
// PATIENT ROUTES
// ==========================================

// Preview nearest hospital without creating a case
router.post(
  '/nearest-hospital',
  authenticate,
  authorize('patient'),
  caseController.getNearestHospital
);

// Create emergency request
router.post(
  '/',
  authenticate,
  authorize('patient'),
  caseController.createCase
);

// Get patient's emergency cases
router.get(
  '/',
  authenticate,
  authorize('patient'),
  caseController.getMyCases
);

// ==========================================
// HOSPITAL STAFF ROUTES
// ==========================================

router.get(
  '/hospital',
  authenticate,
  authorize('hospital_staff'),
  caseController.getHospitalCases
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('hospital_staff'),
  caseController.updateCaseStatus
);

router.patch(
  '/:id/ambulance',
  authenticate,
  authorize('hospital_staff'),
  caseController.assignAmbulance
);

router.patch(
  '/:id/handover',
  authenticate,
  authorize('hospital_staff'),
  caseController.confirmPatientHandover
);

// ==========================================
// DRIVER ROUTES
// ==========================================

// Get emergencies assigned to the logged-in driver
router.get(
  '/driver/assigned',
  authenticate,
  authorize('driver'),
  caseController.getDriverAssignedCases
);

// Update the logged-in driver's assigned ambulance status
router.patch(
  '/driver/ambulance/status',
  authenticate,
  authorize('driver'),
  caseController.updateDriverAmbulanceStatus
);

// Confirm patient pickup
router.patch(
  '/:id/pickup',
  authenticate,
  authorize('driver'),
  caseController.confirmDriverPickup
);

// Confirm arrival at hospital
router.patch(
  '/:id/arrive',
  authenticate,
  authorize('driver'),
  caseController.confirmHospitalArrival
);

module.exports = router;
