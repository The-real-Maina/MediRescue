const express = require('express');

const router = express.Router();

const caseController = require('../controllers/caseController');

const { authenticate, authorize } = require('../middleware/auth');


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


module.exports = router;