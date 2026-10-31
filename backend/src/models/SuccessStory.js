const mongoose = require('mongoose');

const successStorySchema = new mongoose.Schema(
  {
    // Couple who met on the app (from the "Eligible" list) — optional, because the
    // admin can also publish a story for a couple who are not app users; then the
    // names below are used instead.
    groomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    brideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    groomName: { type: String, trim: true, default: '' },
    brideName: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
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
    // The couple's own community (shown on the story)
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      index: true
    },
    // Who sees the story: every community, or only the ones listed. Each community
    // has its own wedding customs, so admins can keep a story to its own samaj.
    // Default true keeps stories made before this setting visible everywhere.
    visibleToAllCommunities: {
      type: Boolean,
      default: true
    },
    visibleCommunityIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
      default: [],
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
