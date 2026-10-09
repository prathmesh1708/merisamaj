const mongoose = require('mongoose');
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

// Only these fields can be set from the admin form. Empty strings for the ObjectId
// fields (the form sends '' when no app couple is linked) become null instead of
// failing with a cast error.
const STORY_FIELDS = ['title', 'shortDescription', 'story', 'coverImage', 'gallery', 'weddingDate',
  'groomName', 'brideName', 'location', 'groomId', 'brideId', 'marriageRequestId', 'communityId', 'displayOrder'];
const ID_FIELDS = ['groomId', 'brideId', 'marriageRequestId', 'communityId'];

const pickStoryFields = (body = {}) => {
  const data = {};
  STORY_FIELDS.forEach(f => { if (body[f] !== undefined) data[f] = body[f]; });
  ID_FIELDS.forEach(f => {
    if (data[f] === '' || (data[f] && !mongoose.Types.ObjectId.isValid(data[f]))) data[f] = null;
  });
  if (data.weddingDate === '') data.weddingDate = null;
  ['title', 'shortDescription', 'groomName', 'brideName', 'location'].forEach(f => {
    if (typeof data[f] === 'string') data[f] = data[f].trim();
  });
  return data;
};

const coupleError = (data) => {
  if (!data.title) return 'Title is required.';
  if (!data.groomId && !data.groomName) return "Groom's name is required.";
  if (!data.brideId && !data.brideName) return "Bride's name is required.";
  return null;
};

// ─── Create Story ──────────────────────────────────────────────────────────
// Either from an eligible app couple (groomId/brideId) or written by the admin
// directly (groomName/brideName). `publishNow: true` makes it visible to members at once.
exports.createStory = async (req, res) => {
  try {
    const data = pickStoryFields(req.body);
    const error = coupleError(data);
    if (error) return res.status(400).json({ status: 'error', message: error });

    const publishNow = req.body.publishNow === true || req.body.publishNow === 'true';
    const story = await SuccessStory.create({
      ...data,
      status: publishNow ? 'published' : 'draft',
      publishedAt: publishNow ? new Date() : undefined,
      createdBy: req.user._id
    });

    if (publishNow) {
      const io = getIO();
      if (io) io.emit('successStory:published', { story });
    }

    res.status(201).json({
      status: 'success',
      message: publishNow ? 'Story published — members can see it now.' : 'Story saved as draft.',
      data: { story }
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── Upload a story photo ──────────────────────────────────────────────────
// @route POST /api/v1/admin/matrimonial/success-stories/upload-image  (multipart field: image)
exports.uploadStoryImage = async (req, res) => {
  try {
    const { resolveAvatarUpload } = require('../../utils/avatarUploadHelper');
    const url = await resolveAvatarUpload(req, 'success_stories');
    if (!url) return res.status(400).json({ status: 'error', message: 'Please choose an image to upload.' });
    res.status(200).json({ status: 'success', data: { url } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Update Story ──────────────────────────────────────────────────────────
exports.updateStory = async (req, res) => {
  try {
    const data = pickStoryFields(req.body);
    const existing = await SuccessStory.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ status: 'error', message: 'Story not found' });
    const error = coupleError({ ...existing, ...data });
    if (error) return res.status(400).json({ status: 'error', message: error });

    const story = await SuccessStory.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedBy: req.user._id },
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
