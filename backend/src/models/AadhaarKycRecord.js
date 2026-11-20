const mongoose = require('mongoose');

/**
 * The verified Aadhaar KYC result for one member — readable by Admins only
 * (GET /api/v1/admin/users/:id/aadhaar). Kept out of the User document so no
 * member/head/matrimonial query can ever pull it in by accident.
 *
 * DOB, gender, address and the UIDAI photo are AES-256-GCM encrypted
 * (utils/aadhaarCrypto). The Aadhaar number itself is never stored — only its
 * last 4 digits; User.aadhaarHash detects re-use across accounts.
 */
const aadhaarKycRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  provider: { type: String, default: 'quickekyc' },
  method: { type: String, default: 'aadhaar_otp' },        // UIDAI OTP to the Aadhaar-linked mobile
  mode: { type: String, enum: ['live', 'sandbox', 'mock'], required: true },
  referenceId: { type: String, default: '' },              // provider request / client id
  verifiedName: { type: String, default: '' },
  aadhaarLast4: { type: String, default: '' },
  verifiedAt: { type: Date, required: true },
  // { dob, gender, address } — encrypted JSON
  encryptedDetails: { type: String, default: null, select: false },
  // UIDAI e-Aadhaar photo — encrypted base64 image bytes
  encryptedPhoto: { type: String, default: null, select: false },
  photoMimeType: { type: String, default: '' },
  hasPhoto: { type: Boolean, default: false },
  // false when AADHAAR_DATA_KEY was missing at verification time (only the name was kept)
  detailsStored: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('AadhaarKycRecord', aadhaarKycRecordSchema);
