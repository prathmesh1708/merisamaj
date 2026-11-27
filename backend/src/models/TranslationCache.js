const mongoose = require('mongoose');

/**
 * Display-only machine translations, cached so each distinct text is sent to the
 * translation service once. Original content (posts, profiles, community data) is
 * never modified — this is a lookup table keyed by a hash of language + source text.
 */
const translationCacheSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  lang: { type: String, required: true },
  source: { type: String, required: true },
  text: { type: String, required: true },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Entries not used for 180 days are dropped (texts that no longer appear anywhere)
translationCacheSchema.index({ lastUsedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model('TranslationCache', translationCacheSchema);
