const mongoose = require('mongoose');

/**
 * Family — one household unit, similar to a Samagra Family ID.
 * Every person in it is a FamilyMember with their own Member ID (MSM-xxxxxx).
 */
const familySchema = new mongoose.Schema({
  familyCode: { type: String, required: true, unique: true }, // MSF-100001

  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', index: true, default: null },
  city: { type: String, trim: true }, // routes approval requests to the matching Local Head

  // The registered user who manages the family (मुखिया)
  headUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status: { type: String, enum: ['active', 'dissolved'], default: 'active', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Family', familySchema);
