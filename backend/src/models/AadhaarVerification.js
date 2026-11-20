const mongoose = require('mongoose');

/**
 * One Aadhaar OTP attempt for a member. The Aadhaar number itself is never
 * stored — only a keyed hash (to stop one Aadhaar verifying two accounts) and
 * the last 4 digits for display. Documents remove themselves a day after expiry.
 */
const aadhaarVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, default: 'quickekyc' },
  mode: { type: String, enum: ['live', 'sandbox', 'mock'], required: true },
  requestId: { type: String, required: true },                 // QuickeKYC request_id for submit-otp
  aadhaarHash: { type: String, required: true },
  aadhaarLast4: { type: String, required: true },
  attempts: { type: Number, default: 0 },                       // wrong OTPs entered
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date, default: null }
}, { timestamps: true });

aadhaarVerificationSchema.index({ userId: 1, createdAt: -1 });
aadhaarVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('AadhaarVerification', aadhaarVerificationSchema);
