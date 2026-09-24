const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');

// Patient registration
router.post('/register', authController.registerPatient);

// Patient / Staff login
router.post('/login', authController.login);

module.exports = router;