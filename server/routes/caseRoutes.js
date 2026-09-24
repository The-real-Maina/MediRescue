const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('patient'), caseController.createCase);

module.exports = router;