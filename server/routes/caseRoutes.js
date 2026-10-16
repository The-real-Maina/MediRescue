
const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate, authorize } = require('../middleware/auth');

// Patient routes
router.post('/', authenticate, authorize('patient'), caseController.createCase);
router.get('/', authenticate, authorize('patient'), caseController.getMyCases);

// Hospital staff routes
router.get('/hospital', authenticate, authorize('hospital_staff'), caseController.getHospitalCases);
router.patch('/:id/status', authenticate, authorize('hospital_staff'), caseController.updateCaseStatus);
router.patch('/:id/ambulance', authenticate, authorize('hospital_staff'), caseController.assignAmbulance);
router.patch('/:id/handover', authenticate, authorize('hospital_staff'), caseController.confirmPatientHandover);

// Driver routes
router.get('/driver/assigned', authenticate, authorize('driver'), caseController.getDriverAssignedCases);
router.patch('/:id/pickup', authenticate, authorize('driver'), caseController.confirmDriverPickup);
router.patch('/:id/arrive', authenticate, authorize('driver'), caseController.confirmHospitalArrival);

module.exports = router;
