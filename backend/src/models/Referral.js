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
  },
  eventKey: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'SUCCESSFUL', 'REWARDED', 'CANCELLED'], default: 'SUCCESSFUL', index: true },
  scheduledPoints: { type: Number, default: 0, min: 0 },
  rewardedAt: { type: Date, default: null }
}, {
  timestamps: true
});

referralSchema.index({ referrer: 1, createdAt: -1 });
referralSchema.index({ referredUser: 1, eventType: 1 });
referralSchema.index({ eventKey: 1 }, { unique: true, name: 'uniq_referral_event_key', partialFilterExpression: { eventKey: { $type: 'string', $gt: '' } } });

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;
