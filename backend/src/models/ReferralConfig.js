const mongoose = require('mongoose');

const referralConfigSchema = new mongoose.Schema({
  registrationReferrerPoints: {
    type: Number,
    default: 100
  },
  registrationReferredPoints: {
    type: Number,
    default: 50
  },
  subscriptionPoints: {
    type: Number,
    default: 100
  },
  rewardAllocation: { type: String, enum: ['one_time', 'daily'], default: 'one_time' },
  dailyRewardDays: { type: Number, default: 7, min: 1, max: 365 },
  referralDiscountEnabled: { type: Boolean, default: false },
  referralDiscountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  referralDiscountValue: { type: Number, default: 0, min: 0 },
  referralDiscountMaxAmount: { type: Number, default: 0, min: 0 },
  membershipPoints: {
    type: Number,
    default: 150
  },
  donationPoints: {
    type: Number,
    default: 75
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Subscription / membership points only for the referred member's FIRST purchase
  rewardFirstPurchaseOnly: {
    type: Boolean,
    default: true
  },
  // ─── Cash redemption ───
  redemptionEnabled: {
    type: Boolean,
    default: true
  },
  rupeesPerPoint: {
    type: Number,
    default: 1,
    min: 0
  },
  minRedeemPoints: {
    type: Number,
    default: 500,
    min: 1
  },
  subscriptionPointsEnabled: { type: Boolean, default: true },
  rupeesPerSubscriptionPoint: { type: Number, default: 0.1, min: 0 },
  minSubscriptionRedeemPoints: { type: Number, default: 100, min: 1 },
  maxSubscriptionRedeemPoints: { type: Number, default: 1000, min: 0 }
}, {
  timestamps: true
});

const ReferralConfig = mongoose.model('ReferralConfig', referralConfigSchema);

module.exports = ReferralConfig;
