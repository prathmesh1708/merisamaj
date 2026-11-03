const mongoose = require('mongoose');

const rewardScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral', default: null },
  eventKey: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  totalPoints: { type: Number, required: true, min: 1 },
  totalDays: { type: Number, required: true, min: 1, max: 365 },
  issuedDays: { type: Number, default: 0, min: 0 },
  nextRewardAt: { type: Date, default: Date.now, index: true },
  sourceSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription', default: null },
  status: { type: String, enum: ['pending', 'complete', 'cancelled'], default: 'pending', index: true },
  cancelledAt: { type: Date, default: null }
}, { timestamps: true });

rewardScheduleSchema.index({ status: 1, nextRewardAt: 1 });

module.exports = mongoose.model('RewardSchedule', rewardScheduleSchema);
