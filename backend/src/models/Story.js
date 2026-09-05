const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      index: true,
    },
    media: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    textPosition: {
      x: { type: Number, default: 50 }, // percentage 0 - 100
      y: { type: Number, default: 50 }, // percentage 0 - 100
    },
    textStyle: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        color: '#ffffff',
        fontSize: 'base',
        align: 'center',
        bgStyle: 'pill-dark'
      })
    },
    background: {
      type: String, // hex, rgb, or css gradient code
    },
    visibility: {
      type: String,
      enum: ['followers', 'community', 'public'],
      default: 'community',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Expirable in 24 hours
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['published', 'hidden', 'reported'],
      default: 'published',
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

storySchema.index({ communityId: 1, expiresAt: 1 });

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
