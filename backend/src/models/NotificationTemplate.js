const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['General', 'Event', 'Matrimonial', 'Emergency', 'Meeting', 'Festival', 'Census', 'Donation'],
      default: 'General'
    },
    titleTemplate: {
      type: String,
      required: [true, 'Title template is required'],
      trim: true
    },
    bodyTemplate: {
      type: String,
      required: [true, 'Body template is required'],
      trim: true
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: false,
      index: true
    },
    isSystemDefault: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

notificationTemplateSchema.index({ communityId: 1, category: 1 });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
