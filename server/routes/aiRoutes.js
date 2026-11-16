const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { chat } = require('../controllers/aiController');

router.post('/chat', authenticate, authorize('patient'), chat);

module.exports = router;