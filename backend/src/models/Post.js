const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    // Author
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Community Scope Reference
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: false,
      index: true,
    },

    // Optional images array for backwards compatibility
    images: [String],

    // City Scope Reference
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      index: true,
    },

    // Content Text
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Category Scope
    category: {
      type: String,
      enum: ['Normal', 'Announcement', 'Event', 'Blood Donation', 'Emergency', 'Notice', 'Matrimony', 'Business', 'Obituary', 'Achievement', 'Youth', 'General'],
      index: true,
      default: 'Normal'
    },

    // Feed Visibility: city or community
    feedType: {
      type: String,
      enum: ['city', 'community', 'both'],
      default: 'city',
      index: true,
    },

    // Generic Media Attachments Schema
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'gif', 'youtube', 'instagram'],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        thumbnail: String,
        duration: Number,
        width: Number,
        height: Number,
        provider: {
          type: String,
          enum: ['upload', 'youtube', 'instagram', 'external'],
          required: true,
        }
      }
    ],

    // Cached engagement counters for O(1) read operations
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },

    // Status & Flag Fields
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'reported'],
      default: 'published',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    // Set when a member pins with an App plan: the pin ends at this time (leaders' pins have none)
    pinnedUntil: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },

    // Post Audit & Scheduling
    scheduledAt: Date,
    editedAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// High-speed index configuration for feed query performance
postSchema.index({ communityId: 1, status: 1, isDeleted: 1, feedType: 1, createdAt: -1 });
postSchema.index({ cityId: 1, status: 1, isDeleted: 1, feedType: 1, createdAt: -1 });
postSchema.index({ communityId: 1, cityId: 1, createdAt: -1 });
postSchema.index({ feedType: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ cityId: 1, feedType: 1, createdAt: -1 });
postSchema.index({ communityId: 1, feedType: 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
