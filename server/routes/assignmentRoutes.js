const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  availableAmbulances,
  assignAmbulance,
  acceptCase,
  declineCase,
  myOffers,
} = require('../controllers/assignmentController');

// TODO: confirm with  SELECT DISTINCT role FROM staff;
const DRIVER_ROLE = 'driver';

// Fixed paths first, '/:id' paths after
router.get('/my-offers', authenticate, authorize(DRIVER_ROLE), myOffers);
router.get('/available-ambulances', authenticate, authorize('hospital_staff'), availableAmbulances);

router.post('/:id/assign', authenticate, authorize('hospital_staff'), assignAmbulance);
router.post('/:id/accept', authenticate, authorize(DRIVER_ROLE), acceptCase);
router.post('/:id/decline', authenticate, authorize(DRIVER_ROLE), declineCase);

module.exports = router;