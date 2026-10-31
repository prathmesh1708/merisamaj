const mongoose = require('mongoose');

// A member's request to cash out referral points. Points are taken from the
// member's balance when the request is made, and given back if it is rejected
// or cancelled, so the same points can never be requested twice.
const redemptionRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  points: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },       // ₹ value at the rate when requested
  rupeesPerPoint: { type: Number, required: true },

  method: { type: String, enum: ['UPI', 'BANK'], required: true },
  accountHolderName: { type: String, trim: true, default: '' },
  upiId: { type: String, trim: true, default: '' },
  bankName: { type: String, trim: true, default: '' },
  accountNumber: { type: String, trim: true, default: '' },
  ifscCode: { type: String, trim: true, uppercase: true, default: '' },

  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Payment proof filled by admin when marking paid
  transactionRef: { type: String, trim: true, default: '' },
  paymentMode: { type: String, trim: true, default: '' },
  paidAt: { type: Date, default: null },
  adminNote: { type: String, trim: true, default: '' },
  rejectionReason: { type: String, trim: true, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  history: [{
    status: String,
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

redemptionRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('RedemptionRequest', redemptionRequestSchema);
