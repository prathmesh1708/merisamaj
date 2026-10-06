const mongoose = require('mongoose');

/**
 * DharmashalaAccessPolicy — set by Admin only. Decides which head role may
 * (a) create/edit properties and rooms and (b) make manual/offline bookings.
 * Everything defaults to false: nobody but Admin can do these until Admin
 * grants it. A policy with city = null applies community-wide; a policy for
 * a specific city overrides the community-wide one for that location only
 * (per action, and only where the city policy sets a value).
 */
const roleAccess = {
  createProperty: { type: Boolean },
  manualBooking: { type: Boolean }
};

const dharmashalaAccessPolicySchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  city: { type: String, trim: true, default: null }, // null = whole community
  roles: {
    community_head: roleAccess,
    community_sub_head: roleAccess,
    local_head: roleAccess,
    local_sub_head: roleAccess
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

dharmashalaAccessPolicySchema.index({ communityId: 1, city: 1 }, { unique: true });

module.exports = mongoose.model('DharmashalaAccessPolicy', dharmashalaAccessPolicySchema);
