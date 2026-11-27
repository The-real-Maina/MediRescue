const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authPasswordController = require('../controllers/authPasswordController');
const { authenticate } = require('../middleware/auth');

// Patient registration — OTP verification required
router.post('/register/request-otp', authController.requestRegistrationOtp);
router.post('/register/verify-otp', authController.verifyRegistrationOtp);

// Login — password verification
router.post('/login', authController.login);

// Second login step — hospital staff, hospital admins and drivers
router.post('/staff-otp/verify', authController.verifyStaffLoginOtp);

// Existing patient OTP login — unchanged
router.post('/otp/request', authController.requestOtp);
router.post('/otp/verify', authController.verifyOtp);

// Patient forgot password — request recovery OTP
router.post(
  '/forgot-password/request-otp',
  authPasswordController.requestPasswordResetOtp
);

// Patient forgot password — verify OTP and reset password
router.post(
  '/forgot-password/reset',
  authPasswordController.resetPatientPassword
);

// Change own password — authenticated users
router.post('/change-password', authenticate, authPasswordController.changePassword);

// Update own profile — authenticated users
router.put('/profile', authenticate, authController.updateProfile);

// Toggle 2FA — authenticated users
router.put('/toggle-2fa', authenticate, authController.toggle2FA);

module.exports = router;