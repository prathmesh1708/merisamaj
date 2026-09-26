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
  education: { type: String }
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
    enum: ['Upcoming', 'Active', 'Completed', 'Closed'],
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
