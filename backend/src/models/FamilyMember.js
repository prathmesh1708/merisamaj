const mongoose = require('mongoose');

const approvalStageSchema = new mongoose.Schema({
  // skipped = no Local Head exists for the city; overridden = Community Head approved first
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped', 'overridden'], default: 'pending' },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: null },
  note: { type: String, trim: true, default: '' }
}, { _id: false });

/**
 * FamilyMember — one record per PERSON (registered on the app or not).
 * The Member ID belongs to the person for life: when an invited relative registers
 * and accepts, they take over this record instead of getting a second one, so the
 * Jangana never counts them twice.
 */
const familyMemberSchema = new mongoose.Schema({
  memberCode: { type: String, required: true, unique: true }, // MSM-100001
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', index: true, default: null },
  city: { type: String, trim: true },

  // Linked app account (null until the person registers and accepts the invitation)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  name: { type: String, required: true, trim: true },
  gender: { type: String, default: '' },
  dob: { type: Date, default: null },
  age: { type: String, default: '' },
  phone: { type: String, trim: true, default: '', index: true }, // normalized 10 digits
  gotra: { type: String, default: '' },
  maritalStatus: { type: String, default: '' },
  occupation: { type: String, default: '' },
  avatar: { type: String, default: null },

  // Relation is stored relative to the family head so it stays correct for every viewer;
  // labels relative to other members are derived (see utils/familyRelations.js).
  relationToHead: { type: String, default: 'Relative' }, // 'Self' for the head's own record
  relationNote: { type: String, default: '' },           // e.g. "Uncle of Suresh" when not derivable

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  approvals: {
    localHead: { type: approvalStageSchema, default: () => ({}) },
    communityHead: { type: approvalStageSchema, default: () => ({}) }
  },

  // not_registered → invited → linked | declined ; 'self' for the head's own record
  linkStatus: {
    type: String,
    enum: ['self', 'not_registered', 'invited', 'linked', 'declined'],
    default: 'not_registered',
    index: true
  },

  isRemoved: { type: Boolean, default: false, index: true }
}, { timestamps: true });

familyMemberSchema.index({ communityId: 1, approvalStatus: 1, createdAt: -1 });
familyMemberSchema.index({ phone: 1, userId: 1, linkStatus: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
