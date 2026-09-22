const mongoose = require('mongoose');

// A Sub-Community (gotra/category) belonging to a Community — has its own
// timestamps so the admin UI can show "Created" per sub-community, same as
// the parent Community card.
const subCommunitySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

/**
 * Community Model — Core of Multi-Tenant Architecture
 *
 * Every piece of community data (Posts, Invitations, Donations, Events, etc.)
 * references this model via `communityId`. This enables strict data isolation
 * across communities on a shared database.
 */
const communitySchema = new mongoose.Schema(
  {
    // Display Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      trim: true,
    },
    
    // Modern multi-city mapping
    cityIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City'
      }
    ],

    // Sub-Communities / Gotras / Categories
    // Each entry is its own lightweight record (stable _id, name, active flag,
    // createdAt) so the admin can toggle/rename/delete one sub-community without
    // touching the others. Member/location counts are NOT stored here — they're
    // computed live from User documents (communityId + subCommunity match)
    // whenever the admin views them.
    subCommunities: [subCommunitySchema],

    // Assigned Community Head (single head per community)
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    /**
     * Per-Community Module Settings
     * Master Admin can enable/disable specific features for each community.
     * Frontend + backend both check these flags before exposing a module.
     */
    settings: {
      matrimonialEnabled: { type: Boolean, default: true },
      donationEnabled:    { type: Boolean, default: true },
      invitationEnabled:  { type: Boolean, default: true },
      eventEnabled:       { type: Boolean, default: true },
      directoryEnabled:   { type: Boolean, default: true },
      dharmashalaEnabled: { type: Boolean, default: true },
      obituaryEnabled:    { type: Boolean, default: true },
      socialFeedEnabled:  { type: Boolean, default: true },

      // ─── Chat & Group Settings ─────────────────────────────────────────────
      chatEnabled:                { type: Boolean, default: true },
      announcementChannelEnabled: { type: Boolean, default: true },

      /**
       * groupCreationPolicy — controls who can create groups in this community.
       *  'head_only'              — Only Community Head
       *  'head_admin'             — Head + Admins
       *  'verified_with_approval' — Any verified member (requires Head approval)
       *  'verified_instant'       — Any verified member (instant creation)
       */
      groupCreationPolicy: {
        type: String,
        enum: ['head_only', 'head_admin', 'verified_with_approval', 'verified_instant', 'verified_members_approval', 'verified_members_instant'],
        default: 'head_admin'
      }
    },
    accountDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
      accountHolderName: { type: String, default: '' }
    }
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug from name before saving (if slug not provided)
communitySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')          // spaces → hyphens
      .replace(/[^\w-]+/g, '')       // remove non-word chars
      .replace(/--+/g, '-')          // collapse multiple hyphens
      .trim();
  }
  next();
});

const Community = mongoose.model('Community', communitySchema);

module.exports = Community;
