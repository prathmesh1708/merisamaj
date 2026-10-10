const mongoose = require('mongoose');

/**
 * One-time passwords sent by SMS. Only a hash of the code is stored.
 * Documents remove themselves (TTL index) a day after they expire.
 */
const otpCodeSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },        // 10 digits
  purpose: { type: String, enum: ['register', 'reset_password'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },                      // wrong guesses
  verifiedAt: { type: Date, default: null },                   // set when the right code is entered
  consumedAt: { type: Date, default: null }                    // set when registration / reset used it
}, { timestamps: true });

otpCodeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('OtpCode', otpCodeSchema);
