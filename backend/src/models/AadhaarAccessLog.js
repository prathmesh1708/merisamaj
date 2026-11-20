const mongoose = require('mongoose');

/**
 * Audit trail: every time an Admin opens a member's full Aadhaar details or
 * Aadhaar photo. Written by controllers/admin/adminAadhaarController.js.
 */
const aadhaarAccessLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['view_details', 'view_photo'], required: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false } });

aadhaarAccessLogSchema.index({ userId: 1, createdAt: -1 });
aadhaarAccessLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AadhaarAccessLog', aadhaarAccessLogSchema);
