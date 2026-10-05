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
  }
}, {
  timestamps: true
});

const ReferralConfig = mongoose.model('ReferralConfig', referralConfigSchema);

module.exports = ReferralConfig;
