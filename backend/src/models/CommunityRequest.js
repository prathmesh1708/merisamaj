const mongoose = require('mongoose');

/**
 * A community a member typed under "Other" at registration that doesn't exist yet.
 * Members never create communities themselves: the admin sees these requests in
 * Admin → Communities → Requested communities and creates the community, adds the
 * requesters to an existing one, or dismisses the request.
 */
const communityRequestSchema = new mongoose.Schema(
  {
    // 'community' = a new community; 'subCommunity' = a new sub-community of parentCommunityId
    kind: { type: String, enum: ['community', 'subCommunity'], default: 'community', index: true },
    parentCommunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    name: { type: String, required: true, trim: true, maxlength: 80 },      // as first typed
    nameKey: { type: String, required: true, lowercase: true, trim: true }, // for matching
    requesters: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      typedName: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      at: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['pending', 'created', 'merged', 'dismissed'], default: 'pending', index: true },
    resolvedCommunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// One request per name: per community for sub-communities
communityRequestSchema.index({ kind: 1, parentCommunityId: 1, nameKey: 1 }, { unique: true });

// "Rajput", "Rajput Samaj", "rajput  samaj" (and "गुर्जर" / "गुर्जर समाज") are the same
// request. \p{M} keeps Devanagari vowel signs (ु, ्, ा …) as part of the word.
communityRequestSchema.statics.keyOf = (name) => String(name || '')
  .toLowerCase()
  .replace(/(^|\s)(samaj|समाज)(?=\s|$)/gu, ' ')
  .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
  .trim();

module.exports = mongoose.model('CommunityRequest', communityRequestSchema);
