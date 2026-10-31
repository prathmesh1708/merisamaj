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
  }
}, {
  timestamps: true
});

const ReferralConfig = mongoose.model('ReferralConfig', referralConfigSchema);

module.exports = ReferralConfig;
