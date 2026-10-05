const SuccessStory = require('../../models/SuccessStory');
const MatrimonialProfile = require('../../models/MatrimonialProfile');

// ─── Get Published Stories ─────────────────────────────────────────────────
exports.getPublishedStories = async (req, res) => {
  try {
    const stories = await SuccessStory.find({ status: 'published' })
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
    const story = await SuccessStory.findOne({ _id: req.params.id, status: 'published' })
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
