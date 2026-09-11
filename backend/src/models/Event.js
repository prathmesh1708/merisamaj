const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleEn: { type: String },
  description: { type: String, required: true },
  descriptionEn: { type: String },
  category: { 
    type: String, 
    required: true,
    enum: ['Cultural', 'Education', 'Matrimonial', 'Health', 'Sports'],
    default: 'Cultural' 
  },
  categoryEn: { type: String },
  image: { type: String }, // Banner Image URL only
  venue: { type: String, required: true },
  venueEn: { type: String },
  address: { type: String },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    index: true
  },
  
  // Date and Time fields
  startDate: { type: Date },
  endDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  date: { type: String, required: true },
  day: { type: String, required: true },
  month: { type: String, required: true },
  monthShort: { type: String, required: true },
  weekday: { type: String },
  time: { type: String, required: true },
  timeEn: { type: String },

  entryFee: { type: String, default: 'Free' },
  contact: { type: String },
  capacity: { type: Number, default: 0 }, // 0 = unlimited
  registrationRequired: { type: Boolean, default: false },

  // Scoping & Ownership
  createdByRole: {
    type: String,
    enum: ['ADMIN', 'COMMUNITY_HEAD'],
    required: true,
    default: 'ADMIN'
  },
  visibility: {
    type: String,
    enum: ['GLOBAL', 'COMMUNITY'],
    default: 'GLOBAL',
    index: true
  },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: false,
    index: true
  },
  isGlobal: {
    type: Boolean,
    default: false,
    index: true
  },

  // Lifecycle Status & Flagging
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Archived', 'Deleted'],
    default: 'Published',
    index: true
  },
  isFeatured: { type: Boolean, default: false, index: true },
  featuredPriority: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },

  // Audit Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },

  // Organizer Details
  organizer: {
    name: { type: String },
    role: { type: String },
    avatar: { type: String },
    initials: { type: String }
  },

  // Structured Info
  objectiveEn: { type: String },
  programsEn: [{ type: String }],
  importantInfoEn: { type: String },
  tagsEn: [{ type: String }],

  // Event Gallery Media
  gallery: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

// Compound indexes for multi-tenant community scoping & global admin events
eventSchema.index({ communityId: 1, isDeleted: 1, status: 1, createdAt: -1 });
eventSchema.index({ isGlobal: 1, isDeleted: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
