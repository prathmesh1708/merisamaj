const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['REGISTRATION', 'SUBSCRIPTION', 'MEMBERSHIP', 'DONATION'],
    required: true
  },
  pointsAwarded: {
    type: Number,
    required: true
  },
  sourceReference: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referredUser: 1, eventType: 1 });

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;
