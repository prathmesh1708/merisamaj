const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['credit', 'debit', 'expiry', 'reversal'], required: true },
  eventType: { type: String, required: true, index: true },
  points: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'posted', 'cancelled'], default: 'pending', index: true },
  idempotencyKey: { type: String, required: true, unique: true },
  sourceReference: { type: mongoose.Schema.Types.Mixed, default: null },
  description: { type: String, default: '' },
  expiresAt: { type: Date, default: null },
  postedAt: { type: Date, default: null }
}, { timestamps: true });

rewardTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RewardTransaction', rewardTransactionSchema);
