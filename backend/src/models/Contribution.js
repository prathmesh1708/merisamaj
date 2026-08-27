const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  txnId:         { type: String, required: true },
  amount:        { type: Number, required: true },
  paymentMode:   { type: String, default: 'Online' },
  // ── Razorpay Audit Fields ──────────────────────────────────────────────────
  orderId:       { type: String, default: null },   // Razorpay order_id
  paymentId:     { type: String, default: null },   // Razorpay payment_id
  signature:     { type: String, default: null },   // HMAC signature
  currency:      { type: String, default: 'INR' },
  paymentMethod: { type: String, default: 'Online' },
  paidAt:        { type: Date,   default: null },
  // ── Status ────────────────────────────────────────────────────────────────
  // 'Pending'  → Order created, payment not yet verified
  // 'Approved' → Payment verified & captured
  // 'Failed'   → Payment failed or signature mismatch
  // 'Cancelled'→ User dismissed Razorpay popup
  status:        { type: String, enum: ['Pending', 'Approved', 'Failed', 'Cancelled'], default: 'Approved' },
  date:          { type: Date,   default: Date.now }
});


const contributionSchema = new mongoose.Schema({
  fundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  assignedAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  transactions: [transactionSchema]
}, {
  timestamps: true
});

contributionSchema.index({ fundId: 1, memberId: 1 });
contributionSchema.index({ communityId: 1, fundId: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);

