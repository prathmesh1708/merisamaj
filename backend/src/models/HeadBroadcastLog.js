const mongoose = require('mongoose');

const headBroadcastLogSchema = new mongoose.Schema(
  {
    broadcastId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['General', 'Event', 'Matrimonial', 'Emergency', 'Meeting', 'Festival', 'Census', 'Donation'],
      default: 'General'
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    audienceFilter: {
      city: { type: String, default: 'all' },
      verificationStatus: { type: String, default: 'all' }, // 'all', 'verified', 'pending'
      gender: { type: String, default: 'all' }
    },
    recipientCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sent', 'failed', 'cancelled'],
      default: 'sent',
      index: true
    },
    scheduledFor: {
      type: Date,
      index: true
    },
    sentAt: {
      type: Date
    }
  },
  { timestamps: true }
);

headBroadcastLogSchema.index({ communityId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('HeadBroadcastLog', headBroadcastLogSchema);
