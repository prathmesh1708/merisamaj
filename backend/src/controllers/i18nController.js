const User = require('../models/User');
const { translateTexts, validateBatch } = require('../services/translationService');

const LANGS = ['en', 'hi'];

// @desc    Translate a batch of on-screen texts for display (originals are untouched)
// @route   POST /api/v1/i18n/translate   { lang: 'hi', texts: [...] }
// @access  Public (rate limited) — also used on the login and registration screens
exports.translate = async (req, res) => {
  const problem = validateBatch(req.body);
  if (problem) return res.status(400).json({ success: false, message: problem });
  try {
    const translations = await translateTexts(req.body.texts, req.body.lang);
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: { lang: req.body.lang, translations } });
  } catch (err) {
    // Never fail the page: the app shows English when translations are missing
    console.error('i18n translate error:', err.message);
    res.json({ success: true, data: { lang: req.body.lang, translations: req.body.texts.map(() => null) } });
  }
};

// @desc    The signed-in user's saved language
// @route   GET /api/v1/i18n/preference
// @access  Private (member, Head, admin)
exports.getPreference = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferredLanguage').lean();
    res.json({ success: true, data: { language: user?.preferredLanguage || null } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not load the language setting.' });
  }
};

// @desc    Save the signed-in user's language so it is restored on their next login
// @route   PUT /api/v1/i18n/preference   { language: 'en' | 'hi' }
// @access  Private
exports.setPreference = async (req, res) => {
  const { language } = req.body || {};
  if (!LANGS.includes(language)) return res.status(400).json({ success: false, message: 'Unsupported language.' });
  try {
    await User.updateOne({ _id: req.user._id }, { $set: { preferredLanguage: language } });
    res.json({ success: true, data: { language } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not save the language setting.' });
  }
};
