const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

// The controller checks that the logged-in user is the
// patient who owns the case or the driver assigned to it.

// ======================================
// READ MESSAGES FOR A CASE
// ======================================

router.get(
  '/case/:caseId',
  authenticate,
  messageController.getMessages
);

// ======================================
// SEND A MESSAGE ON A CASE
// ======================================

router.post(
  '/case/:caseId',
  authenticate,
  messageController.sendMessage
);

module.exports = router;