const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { changePassword } = require('../controllers/authPasswordController');
const { authenticate } = require('../middleware/auth');

// Patient registration — OTP verification required
router.post('/register/request-otp', authController.requestRegistrationOtp);
router.post('/register/verify-otp', authController.verifyRegistrationOtp);

// Patient / staff login
router.post('/login', authController.login);

// Existing patient OTP login
router.post('/otp/request', authController.requestOtp);
router.post('/otp/verify', authController.verifyOtp);

// Change own password (staff, drivers, hospital admins)
router.post('/change-password', authenticate, changePassword);

module.exports = router;