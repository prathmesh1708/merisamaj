const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  initials: { type: String, required: true },
  age: { type: Number },
  profession: { type: String },
  avatar: { type: String }, // URL
  shortIntro: { type: String },
  bio: { type: String },
  manifesto: [{ type: String }],
  experience: { type: String },
  education: { type: String },
  // Added for the structured election flow
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // the real member this candidate is
  position: { type: String, trim: true },
  location: { type: String, trim: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
});

const votingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    default: 'Community Election'
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Active', 'Completed', 'Closed', 'Cancelled'],
    default: 'Active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  candidates: [candidateSchema],

  bannerImage: { type: String },
  // When results become visible to voters. Defaults to endDate when not set.
  resultDate: { type: Date },
  // Draft elections (false) are invisible to voters. Existing elections default to published.
  isPublished: { type: Boolean, default: true },
  publishedAt: { type: Date },
  notifiedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  /**
   * Structured eligibility (preferred over the legacy targetAudience enum).
   * allowedRoles: any of community_head | community_sub_head | local_head | local_sub_head | member
   *   (empty = every role). targetCities / targetCommunityIds: empty = no restriction.
   * targetUsers (below) = individually selected members who are always eligible.
   */
  allowedRoles: [{
    type: String,
    enum: ['community_head', 'community_sub_head', 'local_head', 'local_sub_head', 'member']
  }],
  targetCities: [{ type: String, trim: true }],
  targetCommunityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  
  /**
   * Community Isolation Key
   * MANDATORY on community-bound elections.
   * Server sets this from req.user.communityId for Head / Local Head — client cannot override.
   * Nullable for Admin platform-wide elections.
   */
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: false,
    index: true,
  },
  city: {
    type: String,
    trim: true,
    default: null
  },
  scope: {
    type: String,
    enum: ['GLOBAL', 'COMMUNITY', 'LOCAL', 'CUSTOM'],
    default: 'COMMUNITY'
  },
  targetAudience: {
    type: String,
    enum: [
      'ALL_MEMBERS',
      'ALL',
      'COMMUNITY_HEADS',
      'LOCAL_HEADS',
      'LOCAL_HEADS_BY_LOCATION',
      'LOCAL_AND_SUB_HEADS',
      'LOCAL_AND_SUB_HEADS_BY_LOCATION',
      'USERS_BY_LOCATION',
      'ALL_LOCAL_USERS',
      'LOCAL_SUB_HEADS',
      'SPECIFIC_COMMUNITY',
      'COMMUNITY_LOCATION',
      'SPECIFIC_USERS'
    ],
    default: 'ALL_MEMBERS'
  },
  targetCity: {
    type: String,
    trim: true,
    default: null
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: {
    type: String,
    default: 'General'
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

const Voting = mongoose.model('Voting', votingSchema);

module.exports = Voting;
