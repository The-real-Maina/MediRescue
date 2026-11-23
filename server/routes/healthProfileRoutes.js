const express = require('express');
const router = express.Router();
const controller = require('../controllers/healthProfileController');
const { authenticate, authorize } = require('../middleware/auth');

// Patient: own profile
router.get('/', authenticate, authorize('patient'), controller.getProfile);
router.put('/', authenticate, authorize('patient'), controller.saveProfile);

// Driver / hospital staff: summary for one active case.
// The controller checks the role, the case and the patient's consent.
router.get('/case/:caseId', authenticate, controller.getProfileForCase);

module.exports = router;