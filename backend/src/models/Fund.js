const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  purpose: { type: String, trim: true },
  description: { type: String, trim: true },
  targetAmount: { type: Number, required: true },
  contributionPerMember: { type: Number, required: true },
  dueDate: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['Draft', 'Active', 'Completed', 'Closed', 'Expired', 'Cancelled'], default: 'Active' },
  scope: { type: String, enum: ['GLOBAL', 'COMMUNITY', 'LOCAL'], default: 'COMMUNITY', required: true },
  creatorRole: { type: String, enum: ['admin', 'head', 'sub_head'], default: 'head' },
  creatorType: { type: String, enum: ['ADMIN', 'COMMUNITY_HEAD', 'LOCAL_HEAD'], default: 'COMMUNITY_HEAD' },
  localHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  city: { type: String, trim: true, default: null },
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true,
    default: null
  },
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

fundSchema.index({ communityId: 1, createdAt: -1 });
fundSchema.index({ scope: 1, communityId: 1, city: 1 });
fundSchema.index({ localHeadId: 1 });
fundSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Fund', fundSchema);

