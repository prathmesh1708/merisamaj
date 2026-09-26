const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema(
  {
    groomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    brideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    marriageRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarriageRequest'
    },
    title: {
      type: String,
      trim: true
    },
    shortDescription: {
      type: String,
      trim: true
    },
    story: {
      type: String
    },
    coverImage: {
      type: String
    },
    gallery: {
      type: [String],
      default: []
    },
    weddingDate: {
      type: Date
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      index: true
    },
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    publishedAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Search indexes
successStorySchema.index({ status: 1, featured: 1, displayOrder: 1, publishedAt: -1 });

module.exports = mongoose.model('SuccessStory', successStorySchema);
