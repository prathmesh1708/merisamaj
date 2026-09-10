const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url:        { type: String, required: true },
  publicId:   { type: String },           // Cloudinary public_id for deletion
  isPrimary:  { type: Boolean, default: false },
  isVerified: { type: Boolean, default: true },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const matrimonialProfileSchema = new mongoose.Schema(
  {
    // ─── Core Reference ───────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,  // One profile per user
      index: true
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      index: true
    },

    // ─── Profile Status & Visibility ──────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending', 'active', 'hidden', 'suspended', 'married', 'deleted'],
      default: 'active',
      index: true
    },
    visibility: {
      type: String,
      enum: ['public', 'all_members', 'my_community', 'private'],
      default: 'all_members',
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'verified',
      index: true
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:  { type: Date },

    // ─── Profile Completion Tracking ─────────────────────────────────────────
    profileCompletion: {
      percentage:        { type: Number, default: 0 },
      completedSections: { type: [String], default: [] }
      // Possible sections: personal, education, family, lifestyle, location, preferences, horoscope, photos, about
    },

    // ─── Contact Sharing Preferences (post-acceptance) ───────────────────────
    contactSharing: {
      phone: { type: Boolean, default: false },
      email: { type: Boolean, default: false }
    },

    // ─── Personal Details ─────────────────────────────────────────────────────
    personal: {
      fullName:      { type: String, index: true },
      gender:        { type: String, enum: ['male', 'female', 'other'], index: true },
      dateOfBirth:   { type: Date, index: true },   // Age is always calculated dynamically
      height:        { type: Number },               // in cm
      weight:        { type: Number },               // in kg
      maritalStatus: { type: String, index: true },  // Single, Divorced, Widowed…
      religion:      { type: String, index: true },
      community:     { type: String, index: true },
      gotra:         { type: String },
      motherTongue:  { type: String }
    },

    // ─── Photos ───────────────────────────────────────────────────────────────
    photos: { type: [photoSchema], default: [] },

    // ─── Education & Profession ───────────────────────────────────────────────
    education: {
      highestQualification: { type: String, index: true },
      college:              { type: String },
      profession:           { type: String, index: true },
      occupation:           { type: String },
      company:              { type: String },
      annualIncome:         { type: String, index: true }
    },

    // ─── Family Details ───────────────────────────────────────────────────────
    family: {
      fatherName:       { type: String },
      fatherOccupation: { type: String },
      motherName:       { type: String },
      motherOccupation: { type: String },
      brothers:         { type: Number, default: 0 },
      sisters:          { type: Number, default: 0 },
      familyType:       { type: String },   // Nuclear, Joint, Extended
      familyValues:     { type: String }    // Traditional, Moderate, Liberal
    },

    // ─── Lifestyle ────────────────────────────────────────────────────────────
    lifestyle: {
      diet:         { type: String },  // Vegetarian, Non-Vegetarian, Vegan…
      smoking:      { type: String },  // Never, Occasionally, Regularly
      drinking:     { type: String },  // Never, Occasionally, Regularly
      disabilities: { type: String },
      hobbies:      { type: [String], default: [] }
    },

    // ─── Location ─────────────────────────────────────────────────────────────
    location: {
      country:  { type: String, default: 'India' },
      state:    { type: String, index: true },
      city:     { type: String, index: true },
      address:  { type: String }
    },

    // ─── Partner Preferences ─────────────────────────────────────────────────
    preferences: {
      ageMin:        { type: Number },
      ageMax:        { type: Number },
      heightMin:     { type: Number },
      heightMax:     { type: Number },
      religion:      { type: String },
      community:     { type: String },
      occupation:    { type: String },
      education:     { type: String },
      incomeMin:     { type: String },
      city:          { type: String },
      maritalStatus: { type: String }
    },

    // ─── Horoscope (Optional) ─────────────────────────────────────────────────
    horoscope: {
      manglik:             { type: String },   // Yes, No, Anshik
      isHoroscopeAvailable:{ type: Boolean, default: false },
      birthTime:           { type: String },
      birthPlace:          { type: String }
    },

    // ─── About ────────────────────────────────────────────────────────────────
    about: {
      biography:           { type: String },
      partnerExpectations: { type: String }
    },

    // ─── Activity & Analytics ─────────────────────────────────────────────────
    lastActiveAt:    { type: Date, default: Date.now, index: true },
    totalProfileViews:   { type: Number, default: 0 },
    monthlyProfileViews: { type: Number, default: 0 },
    weeklyProfileViews:  { type: Number, default: 0 },

    // ─── Marital Lifecycle ────────────────────────────────────────────────────────
    // Tracks progress: single → connected → married
    maritalLifecycle: {
      type: String,
      enum: ['single', 'connected', 'married'],
      default: 'single',
      index: true
    },

    // ─── Marriage / Closure Fields ────────────────────────────────────────────
    isClosed: { type: Boolean, default: false, index: true },   // Removed from all matchmaking
    closedAt: { type: Date },
    marriageConfirmedWith: {                                     // Partner's userId
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    marriageRequestId: {                                         // The MarriageRequest that closed this profile
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarriageRequest'
    },
    allowPublicStory: { type: Boolean, default: false, index: true },

    // ─── Soft Delete ─────────────────────────────────────────────────────────
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date },

    // ─── Audit ───────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// ─── Compound Indexes for Search Performance ──────────────────────────────────
matrimonialProfileSchema.index({ status: 1, visibility: 1, isDeleted: 1 });
matrimonialProfileSchema.index({ status: 1, isDeleted: 1, isClosed: 1, 'personal.gender': 1, createdAt: -1 });
matrimonialProfileSchema.index({ 'personal.community': 1, 'personal.gender': 1 });
matrimonialProfileSchema.index({ 'personal.gender': 1, 'personal.community': 1, status: 1 });
matrimonialProfileSchema.index({ 'location.city': 1, 'location.state': 1 });
matrimonialProfileSchema.index({ 'personal.gender': 1, 'location.state': 1, 'location.city': 1 });
matrimonialProfileSchema.index({ 'personal.dateOfBirth': 1, 'personal.gender': 1 });
matrimonialProfileSchema.index({ lastActiveAt: -1, status: 1 });
matrimonialProfileSchema.index({ verificationStatus: 1, status: 1 });
matrimonialProfileSchema.index({ 'personal.gender': 1, 'lifestyle.diet': 1 });

// ─── Virtual: Age (calculated dynamically) ────────────────────────────────────
matrimonialProfileSchema.virtual('age').get(function () {
  if (!this.personal || !this.personal.dateOfBirth) return null;
  const today = new Date();
  const birth  = new Date(this.personal.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
});

matrimonialProfileSchema.set('toJSON',   { virtuals: true });
matrimonialProfileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MatrimonialProfile', matrimonialProfileSchema);
