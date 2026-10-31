const SuccessStory = require('../../models/SuccessStory');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const Community = require('../../models/Community');

// Stories this member may see: ones shown to all communities, plus ones the admin
// limited to the member's community. Matched by community name as well, since the
// same samaj can exist as a separate community record in each city.
const visibilityFilter = async (user) => {
  const anyCommunity = { visibleToAllCommunities: { $ne: false } };
  let name = user?.community || '';
  if (user?.communityId) {
    const own = await Community.findById(user.communityId).select('name').lean();
    if (own?.name) name = own.name;
  }
  const ids = user?.communityId ? [user.communityId] : [];
  if (name) {
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sameName = await Community.find({ name: new RegExp(`^${escaped}$`, 'i') }).select('_id').lean();
    ids.push(...sameName.map(c => c._id));
  }
  if (!ids.length) return anyCommunity;
  return { $or: [anyCommunity, { visibleCommunityIds: { $in: ids } }] };
};

// ─── Get Published Stories ─────────────────────────────────────────────────
exports.getPublishedStories = async (req, res) => {
  try {
    const stories = await SuccessStory.find({ status: 'published', ...(await visibilityFilter(req.user)) })
      .populate('groomId', 'name avatar')
      .populate('brideId', 'name avatar')
      .populate('communityId', 'name')
      .sort({ featured: -1, displayOrder: 1, publishedAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { stories }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Single Story ──────────────────────────────────────────────────────
exports.getStoryDetails = async (req, res) => {
  try {
    const story = await SuccessStory.findOne({ _id: req.params.id, status: 'published', ...(await visibilityFilter(req.user)) })
      .populate('groomId', 'name avatar')
      .populate('brideId', 'name avatar')
      .populate('communityId', 'name');

    if (!story) {
      return res.status(404).json({ status: 'error', message: 'Story not found or not published' });
    }

    res.status(200).json({
      status: 'success',
      data: { story }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Update Consent (Opt-in/Opt-out) ───────────────────────────────────────
exports.updateConsent = async (req, res) => {
  try {
    const { allowPublicStory } = req.body;
    
    if (typeof allowPublicStory !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'allowPublicStory must be a boolean' });
    }

    const myProfile = await MatrimonialProfile.findOne({ userId: req.user._id });
    if (!myProfile) {
      return res.status(404).json({ status: 'error', message: 'Matrimonial profile not found' });
    }

    myProfile.allowPublicStory = allowPublicStory;
    await myProfile.save();

    // If they opt in, and they are married, make sure they have a SuccessStory document initialized or marked eligible
    // The admin panel checks if BOTH users have allowPublicStory = true
    // If BOTH have it true, admin sees them as eligible. 
    // We don't need to create the story here, admin creates it.

    res.status(200).json({
      status: 'success',
      message: 'Consent updated successfully',
      data: { allowPublicStory: myProfile.allowPublicStory }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
