const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/i18nController');

const router = express.Router();

// Pages send their texts in batches and the browser caches results, so a normal
// session makes only a handful of calls; this stops abuse of the public endpoint.
const translateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many translation requests. Showing English for now.' }
});

router.post('/translate', translateLimiter, ctrl.translate);
router.get('/preference', protect, ctrl.getPreference);
router.put('/preference', protect, ctrl.setPreference);

module.exports = router;
