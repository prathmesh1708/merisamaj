const SuccessStory = require('../../models/SuccessStory');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const { getIO } = require('../../services/socketRegistry');

// ─── Get All Stories ───────────────────────────────────────────────────────
exports.getAllStories = async (req, res) => {
  try {
    const { status, featured, search } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (featured === 'true') query.featured = true;

    // We can expand search later to populate and filter, but for now simple title match
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const stories = await SuccessStory.find(query)
      .populate('groomId', 'name email avatar')
      .populate('brideId', 'name email avatar')
      .populate('communityId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { stories }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get Eligible Couples ──────────────────────────────────────────────────
exports.getEligibleCouples = async (req, res) => {
  try {
    // Find all profiles that are closed and allowed public story
    const optedInProfiles = await MatrimonialProfile.find({
      isClosed: true,
      allowPublicStory: true,
      marriageConfirmedWith: { $exists: true, $ne: null }
    }).populate('userId', 'name avatar email').populate('communityId', 'name');

    const eligibleCouples = [];
    const processedPairs = new Set();

    for (const p of optedInProfiles) {
      // Check if partner also opted in
      const partnerProfile = await MatrimonialProfile.findOne({
        userId: p.marriageConfirmedWith,
        isClosed: true,
        allowPublicStory: true
      }).populate('userId', 'name avatar email');

      if (partnerProfile) {
        // We have a matched pair. 
        // Ensure we don't process them twice (A->B and B->A)
        const pairKey = [p.userId._id.toString(), partnerProfile.userId._id.toString()].sort().join('_');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Check if a story already exists for this pair
        const existingStory = await SuccessStory.findOne({
          $or: [
            { groomId: p.userId._id, brideId: partnerProfile.userId._id },
            { groomId: partnerProfile.userId._id, brideId: p.userId._id }
          ]
        });

        if (!existingStory) {
          // Identify groom/bride based on gender (fallback)
          let groom = p.personal?.gender === 'male' ? p : partnerProfile;
          let bride = p.personal?.gender === 'female' ? p : partnerProfile;
          
          if (!groom) groom = p;
          if (!bride) bride = partnerProfile;

          eligibleCouples.push({
            groom: groom.userId,
            bride: bride.userId,
            marriageRequestId: p.marriageRequestId,
            marriageDate: p.closedAt,
            community: p.communityId
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: { eligibleCouples }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Create Story ──────────────────────────────────────────────────────────
exports.createStory = async (req, res) => {
  try {
    const story = await SuccessStory.create({
      ...req.body,
      createdBy: req.user._id
    });

    res.status(201).json({
      status: 'success',
      message: 'Story created successfully',
      data: { story }
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── Update Story ──────────────────────────────────────────────────────────
exports.updateStory = async (req, res) => {
  try {
    const story = await SuccessStory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!story) return res.status(404).json({ status: 'error', message: 'Story not found' });

    const io = getIO();
    if (io) io.emit('successStory:updated', { storyId: story._id });

    res.status(200).json({
      status: 'success',
      message: 'Story updated successfully',
      data: { story }
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── Update Status (Publish, Archive) ──────────────────────────────────────
const updateStatus = async (req, res, status) => {
  try {
    const updates = { status, updatedBy: req.user._id };
    if (status === 'published') updates.publishedAt = new Date();

    const story = await SuccessStory.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!story) return res.status(404).json({ status: 'error', message: 'Story not found' });

    const io = getIO();
    if (io) {
      if (status === 'published') io.emit('successStory:published', { story });
      if (status === 'archived') io.emit('successStory:archived', { storyId: story._id });
    }

    res.status(200).json({
      status: 'success',
      message: `Story marked as ${status}`,
      data: { story }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.publishStory = (req, res) => updateStatus(req, res, 'published');
exports.archiveStory = (req, res) => updateStatus(req, res, 'archived');

// ─── Toggle Feature ────────────────────────────────────────────────────────
exports.toggleFeature = async (req, res) => {
  try {
    const { featured } = req.body;
    const story = await SuccessStory.findByIdAndUpdate(
      req.params.id,
      { featured, updatedBy: req.user._id },
      { new: true }
    );
    if (!story) return res.status(404).json({ status: 'error', message: 'Story not found' });

    const io = getIO();
    if (io) io.emit('successStory:updated', { storyId: story._id });

    res.status(200).json({
      status: 'success',
      message: `Story ${featured ? 'featured' : 'unfeatured'}`,
      data: { story }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Delete Story ──────────────────────────────────────────────────────────
exports.deleteStory = async (req, res) => {
  try {
    const story = await SuccessStory.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ status: 'error', message: 'Story not found' });

    res.status(200).json({
      status: 'success',
      message: 'Story permanently deleted'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
