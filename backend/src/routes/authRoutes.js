const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  logoutAdmin,
  logoutHead,
  refreshAuth,
  refreshAdmin,
  refreshHead,
  updateProfile,
  sendOtp,
  verifyOtp,
  resetPassword,
  getPublicCommunities,
  getPublicCities,
  sendAadhaarOtp,
  verifyAadhaarOtp
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateForgotPassword,
  validateResetPassword,
} = require('../validators/authValidator');
const { loginLimiter, otpLimiter, forgotLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/communities', getPublicCommunities);
router.get('/cities', getPublicCities);
router.post('/register', validateRegister, registerUser);
router.post('/login', loginLimiter, validateLogin, loginUser);
router.post('/logout', logoutUser);
router.post('/logout/admin', logoutAdmin);
router.post('/logout/head', logoutHead);
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/refresh', refreshAuth);
router.post('/refresh/admin', refreshAdmin);
router.post('/refresh/head', refreshHead);

// Aadhaar verification routes (public — no token required for OTP send; verify marks user)
router.post('/aadhaar/send-otp', otpLimiter, sendAadhaarOtp);
router.post('/aadhaar/verify-otp', verifyAadhaarOtp);

// Private routes
router.get('/me', protect, getMe);

// Profile update handles avatar upload via Cloudinary
router.put('/update-profile', protect, upload.single('avatarFile'), validateUpdateProfile, updateProfile);

module.exports = router;
