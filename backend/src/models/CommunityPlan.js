const mongoose = require('mongoose');

/**
 * CommunityPlan — a platform-tier plan an admin creates/edits/deletes and
<<<<<<< HEAD
 * assigns to a Community (tenant). Controls member cap and which whole app
 * modules are switched on for every member of that community.
=======
 * assigns to a Community (tenant). Controls member cap, storage cap, and
 * which whole app modules are switched on for every member of that community.
>>>>>>> 6df05ea0bf3c06dad40be9ce99bf21932ed04631
 */
const communityPlanSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    description:   { type: String, default: '' },
    monthlyPrice:  { type: Number, required: true, default: 0 },
    badge:         { type: String, default: '', trim: true, maxlength: 40 },
    displayOrder:  { type: Number, default: 0 },
    isActive:      { type: Boolean, default: true },

    // Free-text access/benefit lines the admin writes themselves for this price —
    // shown to communities alongside the structured toggles below. Purely
    // descriptive (not individually enforced, unlike the toggles in `features`).
    customFeatures: { type: [String], default: [] },

    features: {
      maxMembers:            { type: Number, default: 500 },   // -1 = unlimited
      maxHeads:               { type: Number, default: 3 },     // -1 = unlimited
      maxEvents:               { type: Number, default: 5 },     // -1 = unlimited
<<<<<<< HEAD
=======
      storageGB:               { type: Number, default: 5 },     // -1 = unlimited
>>>>>>> 6df05ea0bf3c06dad40be9ce99bf21932ed04631
      professionalDirectory:   { type: Boolean, default: false },
      matrimonial:             { type: Boolean, default: false },
      broadcast:                { type: Boolean, default: false },
      analytics:                { type: Boolean, default: false },
      apiAccess:                { type: Boolean, default: false },
      prioritySupport:          { type: Boolean, default: false },
      customBranding:           { type: Boolean, default: false }
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CommunityPlan', communityPlanSchema);
