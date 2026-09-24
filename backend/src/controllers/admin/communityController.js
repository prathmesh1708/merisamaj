const mongoose = require('mongoose');
const Community = require('../../models/Community');
const User = require('../../models/User');
const { notifyHeadAssigned } = require('../../services/notificationService');

// ─────────────────────────────────────────────
// Normalize a create/update payload's subCommunities into the sub-document shape.
// Accepts plain strings (from the tag-editor UI) or already-shaped {name, isActive}
// objects. When `existing` (the community's current subCommunities) is passed, an
// entry whose name matches an existing one (case-insensitive) keeps that entry's
// isActive flag and _id instead of resetting it — so editing the tag list doesn't
// silently re-activate something the admin had deactivated from the drill-down view.
// ─────────────────────────────────────────────
const sanitizeSubCommunitiesInput = (subCommunities, existing = []) => {
  if (!Array.isArray(subCommunities)) return [];

  const existingByName = new Map(
    (existing || [])
      .filter(s => s && s.name)
      .map(s => [String(s.name).trim().toLowerCase(), s])
  );

  const seen = new Set();
  const result = [];
  for (const raw of subCommunities) {
    const name = typeof raw === 'string' ? raw.trim() : String(raw?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const match = existingByName.get(key);
    result.push({
      _id: match?._id || new mongoose.Types.ObjectId(),
      name,
      isActive: match ? match.isActive !== false : (typeof raw === 'object' && raw.isActive !== undefined ? Boolean(raw.isActive) : true)
    });
  }
  return result;
};

// ─────────────────────────────────────────────
// @desc    Get all communities
// @route   GET /api/v1/admin/communities
// @access  Admin
// ─────────────────────────────────────────────
exports.getCommunities = async (req, res) => {
  try {
    const communities = await Community.find({})
      .populate('headId', 'name email phone avatar')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Attach detailed stats for each community
    const communitiesWithStats = await Promise.all(
      communities.map(async (comm) => {
        const [
          memberCount,
          communityHeadsCount,
          localHeadsCount,
          subLocalHeadsCount
        ] = await Promise.all([
          User.countDocuments({
            communityId: comm._id,
            accountStatus: { $ne: 'deleted' },
          }),
          User.countDocuments({
            communityId: comm._id,
            role: 'head',
            accountStatus: { $ne: 'deleted' },
          }),
          User.countDocuments({
            communityId: comm._id,
            role: { $in: ['sub_head', 'local_head'] },
            accountStatus: { $ne: 'deleted' },
          }),
          User.countDocuments({
            communityId: comm._id,
            role: { $in: ['sub_local_head', 'volunteer', 'coordinator'] },
            accountStatus: { $ne: 'deleted' },
          })
        ]);

        const activeLocationsCount = (comm.cityIds && comm.cityIds.length > 0)
          ? comm.cityIds.length
          : (comm.city ? 1 : 0);

        return {
          ...comm.toObject(),
          memberCount: memberCount || 0,
          totalUsers: memberCount || 0,
          subCommunitiesCount: comm.subCommunities?.length || 0,
          totalSubCommunities: comm.subCommunities?.length || 0,
          communityHeadsCount: communityHeadsCount || (comm.headId ? 1 : 0),
          totalCommunityHeads: communityHeadsCount || (comm.headId ? 1 : 0),
          localHeadsCount: localHeadsCount || 0,
          subLocalHeadsCount: subLocalHeadsCount || 0,
          activeLocationsCount: activeLocationsCount || 1,
          locationsCount: activeLocationsCount || 1,
        };
      })
    );

    res.json({ success: true, data: communitiesWithStats });
  } catch (error) {
    console.error('getCommunities error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Get single community
// @route   GET /api/v1/admin/communities/:id
// @access  Admin
// ─────────────────────────────────────────────
exports.getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('headId', 'name email phone avatar')
      .populate('createdBy', 'name');

    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const memberCount = await User.countDocuments({
      communityId: community._id,
      role: 'user',
      accountStatus: { $ne: 'deleted' },
    });

    res.json({ success: true, data: { ...community.toObject(), memberCount } });
  } catch (error) {
    console.error('getCommunityById error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new community
// @route   POST /api/v1/admin/communities
// @access  Admin
// ─────────────────────────────────────────────
exports.createCommunity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, description, logoUrl, bannerUrl, settings, city, cityIds, subCommunities, status, headName, headEmail, headPhone, headPassword, headId } = req.body;

    if (!name || !name.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ status: 'error', message: 'Community name is required' });
    }

    // Check duplicate name
    const exists = await Community.findOne({ name: name.trim() }).session(session);
    if (exists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ status: 'error', message: 'A community with this name already exists' });
    }

    let headUser = null;
    if (headEmail || headPhone || headName) {
      // Validate head details
      if (!headName || !headName.trim()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'Head Full Name is required' });
      }
      if (!headEmail || !headEmail.trim()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'Head Email Address is required' });
      }
      if (!headPhone || !headPhone.trim()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'Head Mobile Number is required' });
      }
      if (!headPassword || !headPassword.trim()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'Head Password is required' });
      }

      // Check email and phone uniqueness
      const emailExists = await User.findOne({ email: headEmail.trim().toLowerCase() }).session(session);
      if (emailExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'A user with this email already exists' });
      }

      const phoneExists = await User.findOne({ phone: headPhone.trim() }).session(session);
      if (phoneExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'A user with this mobile number already exists' });
      }
    }

    const communityId = new mongoose.Types.ObjectId();
    const isActVal = status !== undefined ? status === 'Active' : true;
    const sanitizedSubCommunities = sanitizeSubCommunitiesInput(subCommunities);

    // Create Community
    const community = new Community({
      _id: communityId,
      name: name.trim(),
      description,
      logoUrl,
      bannerUrl: bannerUrl || '',
      city: city ? city.trim() : '',
      cityIds: Array.isArray(cityIds) ? cityIds : [],
      subCommunities: sanitizedSubCommunities,
      settings,
      createdBy: req.user._id,
      isActive: isActVal,
    });

    if (headId) {
      // Assign existing selected head
      const existingHead = await User.findById(headId).session(session);
      if (existingHead) {
        community.headId = existingHead._id;
        if (!Array.isArray(existingHead.assignedCommunityIds)) {
          existingHead.assignedCommunityIds = [];
        }
        if (!existingHead.assignedCommunityIds.some(id => String(id) === String(communityId))) {
          existingHead.assignedCommunityIds.push(communityId);
        }
        existingHead.communityId = communityId;
        existingHead.assignedCommunityId = communityId;
        await existingHead.save({ session });
      }
    } else if (headEmail) {
      // Create Community Head User
      headUser = new User({
        name: headName.trim(),
        email: headEmail.trim().toLowerCase(),
        phone: headPhone.trim(),
        password: headPassword, // mongoose model pre-save hook handles hashing
        role: 'head',
        communityId: communityId,
        assignedCommunityId: communityId,
        assignedCommunityIds: [communityId],
        city: city || '',
        accountStatus: 'active',
        verificationStatus: 'verified',
        isVerified: true
      });
      await headUser.save({ session });
      
      community.headId = headUser._id;
    }

    await community.save({ session });

    // --- AUTO-CREATE DEFAULT ANNOUNCEMENT CHANNEL ---
    const AnnouncementChannel = require('../../models/AnnouncementChannel');
    const Conversation = require('../../models/Conversation');

    // Create the conversation first
    const defaultConv = new Conversation({
      participants: [req.user._id],
      type: 'community',
      createdBy: req.user._id
    });
    await defaultConv.save({ session });

    // Create the default announcement channel
    const defaultChannel = new AnnouncementChannel({
      communityId: communityId,
      name: 'Community Announcements',
      description: `Official broadcast channel for ${name.trim()}`,
      whoCanPost: 'head_only',
      whoCanView: 'everyone',
      creator: req.user._id,
      conversationId: defaultConv._id,
      isDefault: true
    });
    await defaultChannel.save({ session });

    // Link conversation referenceId back to channel
    defaultConv.referenceId = defaultChannel._id;
    await defaultConv.save({ session });
    // -------------------------------------------------

    await session.commitTransaction();
    session.endSession();

    // Populate headId for response if head was created
    const finalCommunity = await Community.findById(communityId)
      .populate('headId', 'name email phone avatar')
      .populate('createdBy', 'name');

    res.status(201).json({ success: true, data: finalCommunity });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('createCommunity error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Update community info / settings
// @route   PUT /api/v1/admin/communities/:id
// @access  Admin
// ─────────────────────────────────────────────
exports.updateCommunity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, description, logoUrl, bannerUrl, isActive, settings, city, cityIds, subCommunities, headId } = req.body;

    const community = await Community.findById(req.params.id).session(session);
    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    if (name !== undefined) community.name = name.trim();
    if (description !== undefined) community.description = description;
    if (logoUrl !== undefined) community.logoUrl = logoUrl;
    if (bannerUrl !== undefined) community.bannerUrl = bannerUrl;
    if (city !== undefined) community.city = city.trim();
    if (cityIds !== undefined && Array.isArray(cityIds)) community.cityIds = cityIds;
    if (subCommunities !== undefined && Array.isArray(subCommunities)) {
      community.subCommunities = sanitizeSubCommunitiesInput(subCommunities, community.subCommunities);
    }
    if (isActive !== undefined) community.isActive = isActive;
    if (settings && typeof settings === 'object') {
      community.settings = { ...community.settings.toObject(), ...settings };
    }

    // Check if head assignment is changing
    if (headId !== undefined && String(headId) !== String(community.headId || '')) {
      const oldHeadId = community.headId;

      if (headId) {
        // Validate new head user
        const newHeadUser = await User.findById(headId).session(session);
        if (!newHeadUser) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ status: 'error', message: 'New Head User not found' });
        }
        if (!['head', 'admin'].includes(newHeadUser.role)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ status: 'error', message: 'New Head User must have head or admin role' });
        }

        // STEP 1: Remove new head from any previous community they were head of
        await Community.updateMany(
          { headId: headId },
          { $set: { headId: null } },
          { session }
        );

        // STEP 2: Assign new head to this community
        community.headId = headId;

        // STEP 3: Update new head user's community IDs
        newHeadUser.communityId = community._id;
        newHeadUser.assignedCommunityId = community._id;
        if (!Array.isArray(newHeadUser.assignedCommunityIds)) {
          newHeadUser.assignedCommunityIds = [];
        }
        if (!newHeadUser.assignedCommunityIds.some(id => String(id) === String(community._id))) {
          newHeadUser.assignedCommunityIds.push(community._id);
        }
        await newHeadUser.save({ session });
      } else {
        // Clearing the head
        community.headId = null;
      }

      // STEP 4: Remove old head's assignedCommunityId link
      if (oldHeadId) {
        const oldHeadUser = await User.findById(oldHeadId).session(session);
        if (oldHeadUser) {
          if (String(oldHeadUser.assignedCommunityId) === String(community._id)) {
            oldHeadUser.assignedCommunityId = null;
          }
          if (Array.isArray(oldHeadUser.assignedCommunityIds)) {
            oldHeadUser.assignedCommunityIds = oldHeadUser.assignedCommunityIds.filter(id => String(id) !== String(community._id));
          }
          await oldHeadUser.save({ session });
        }
      }
    }

    await community.save({ session });
    await session.commitTransaction();
    session.endSession();

    const finalCommunity = await Community.findById(req.params.id)
      .populate('headId', 'name email phone avatar')
      .populate('createdBy', 'name');

    res.json({ success: true, data: finalCommunity });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('updateCommunity error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Assign Head to Community — ATOMIC OPERATION
//
// This performs 3 synchronized updates in a MongoDB transaction:
//   1. Remove headId from any previous community this user was head of
//   2. Set headId on the target community
//   3. Update the user's communityId to the target community
//
// @route   PUT /api/v1/admin/communities/:id/assign-head
// @body    { userId: String }
// @access  Admin
// ─────────────────────────────────────────────
exports.assignHead = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId } = req.body;
    const communityId = req.params.id;

    if (!userId) {
      await session.abortTransaction();
      return res.status(400).json({ status: 'error', message: 'userId is required' });
    }

    // Verify community exists
    const community = await Community.findById(communityId).session(session);
    if (!community) {
      await session.abortTransaction();
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    // Verify user exists and has head/admin role
    const headUser = await User.findById(userId).session(session);
    if (!headUser) {
      await session.abortTransaction();
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    if (!['head', 'admin'].includes(headUser.role)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ status: 'error', message: 'User must have head or admin role to be assigned as community head' });
    }

    // STEP 1: Remove this user as head from any previously assigned community
    await Community.updateMany(
      { headId: userId },
      { $set: { headId: null } },
      { session }
    );

    // STEP 2: Assign this user as head of the target community
    community.headId = userId;
    await community.save({ session });

    // STEP 3: Update the user's communityId and assignedCommunityIds
    await User.findByIdAndUpdate(
      userId,
      { 
        $set: { communityId: communityId, assignedCommunityId: communityId },
        $addToSet: { assignedCommunityIds: communityId }
      },
      { session }
    );

    await session.commitTransaction();

    const updated = await Community.findById(communityId).populate('headId', 'name email phone avatar');

    // ── Notification: notify assigned user ────────────────────────────────────────
    try {
      notifyHeadAssigned(userId, updated?.name || community.name);
    } catch (notifErr) {
      console.warn('[Notify] assignHead head_assigned failed:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Head assigned successfully',
      data: updated,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('assignHead error:', error);
    res.status(500).json({ status: 'error', message: 'Server error — transaction rolled back' });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// @desc    Remove Head from Community (unassign)
// @route   DELETE /api/v1/admin/communities/:id/assign-head
// @access  Admin
// ─────────────────────────────────────────────
exports.removeHead = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const communityId = req.params.id;

    const community = await Community.findById(communityId).session(session);
    if (!community) {
      await session.abortTransaction();
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const previousHeadId = community.headId;
    community.headId = null;
    await community.save({ session });

    // Optionally clear the user's assignedCommunityId and pull from assignedCommunityIds
    if (previousHeadId) {
      await User.findByIdAndUpdate(
        previousHeadId,
        { 
          $set: { assignedCommunityId: null },
          $pull: { assignedCommunityIds: communityId }
        },
        { session }
      );
    }

    await session.commitTransaction();
    res.json({ success: true, message: 'Head removed from community' });
  } catch (error) {
    await session.abortTransaction();
    console.error('removeHead error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// @desc    Toggle active/inactive status of a community
// @route   PATCH /api/v1/admin/communities/:id/toggle-status
// @access  Admin
// ─────────────────────────────────────────────
exports.toggleCommunityStatus = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    community.isActive = !community.isActive;
    await community.save();

    res.json({
      success: true,
      message: `Community "${community.name}" ${community.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: community,
    });
  } catch (error) {
    console.error('toggleCommunityStatus error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a community (permanently or soft delete)
// @route   DELETE /api/v1/admin/communities/:id
// @access  Admin
// ─────────────────────────────────────────────
exports.deleteCommunity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const community = await Community.findById(req.params.id).session(session);
    if (!community) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const isSoftDeactivate = req.query.action === 'deactivate';

    if (isSoftDeactivate) {
      community.isActive = false;
      await community.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res.json({
        success: true,
        message: 'Community deactivated successfully.',
        data: community,
      });
    }

    // Permanent Hard Deletion:
    // 1. Unset head assignments
    if (community.headId) {
      await User.findByIdAndUpdate(
        community.headId,
        { 
          $set: { assignedCommunityId: null },
          $pull: { assignedCommunityIds: community._id }
        },
        { session }
      );
    }

    // 2. Clear user references for members
    await User.updateMany(
      { communityId: community._id },
      { $set: { communityId: null } },
      { session }
    );
    await User.updateMany(
      { assignedCommunityId: community._id },
      { $set: { assignedCommunityId: null } },
      { session }
    );
    await User.updateMany(
      { assignedCommunityIds: community._id },
      { $pull: { assignedCommunityIds: community._id } },
      { session }
    );

    // 3. Delete community document
    await Community.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Community "${community.name}" deleted permanently.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('deleteCommunity error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Get one community's sub-communities with REAL member/location stats
//          — computed live from User documents, not stored on the Community.
// @route   GET /api/v1/admin/communities/:id/sub-communities
// @access  Admin
// ─────────────────────────────────────────────
exports.getSubCommunityStats = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).lean();
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const subCommunities = Array.isArray(community.subCommunities) ? community.subCommunities : [];

    // One aggregation for the whole community: group active (non-deleted) members
    // by their subCommunity string, counting members and distinct cities.
    const stats = await User.aggregate([
      {
        $match: {
          communityId: community._id,
          role: 'user',
          accountStatus: { $ne: 'deleted' },
          subCommunity: { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: { $toLower: '$subCommunity' },
          memberCount: { $sum: 1 },
          cities: { $addToSet: { $toLower: { $trim: { input: { $ifNull: ['$city', ''] } } } } }
        }
      }
    ]);

    const statsByName = new Map(
      stats.map(s => [s._id, {
        memberCount: s.memberCount,
        locationCount: s.cities.filter(Boolean).length
      }])
    );

    const enriched = subCommunities.map(sub => {
      const key = String(sub.name || '').trim().toLowerCase();
      const found = statsByName.get(key);
      return {
        _id: sub._id,
        name: sub.name,
        isActive: sub.isActive !== false,
        createdAt: sub.createdAt || null,
        memberCount: found?.memberCount || 0,
        locationCount: found?.locationCount || 0
      };
    });

    const [
      totalUsersCount,
      communityHeadsCount,
      localHeadsCount,
      subLocalHeadsCount
    ] = await Promise.all([
      User.countDocuments({
        communityId: community._id,
        accountStatus: { $ne: 'deleted' },
      }),
      User.countDocuments({
        communityId: community._id,
        role: 'head',
        accountStatus: { $ne: 'deleted' },
      }),
      User.countDocuments({
        communityId: community._id,
        role: { $in: ['sub_head', 'local_head'] },
        accountStatus: { $ne: 'deleted' },
      }),
      User.countDocuments({
        communityId: community._id,
        role: { $in: ['sub_local_head', 'volunteer', 'coordinator'] },
        accountStatus: { $ne: 'deleted' },
      })
    ]);

    const activeLocationsCount = (community.cityIds && community.cityIds.length > 0)
      ? community.cityIds.length
      : (community.city ? 1 : 0);

    res.json({
      success: true,
      data: {
        community: {
          _id: community._id,
          name: community.name,
          slug: community.slug,
          logoUrl: community.logoUrl,
          isActive: community.isActive !== false && community.status !== 'Inactive',
          createdAt: community.createdAt,
          activeLocationsCount: activeLocationsCount || 1,
          communityHeadsCount: communityHeadsCount || (community.headId ? 1 : 0),
          localHeadsCount: localHeadsCount || 0,
          subLocalHeadsCount: subLocalHeadsCount || 0,
          totalUsersCount: totalUsersCount || 0,
        },
        subCommunities: enriched
      }
    });
  } catch (error) {
    console.error('getSubCommunityStats error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Toggle a single sub-community's active/inactive flag
// @route   PATCH /api/v1/admin/communities/:id/sub-communities/:subId/toggle
// @access  Admin
// ─────────────────────────────────────────────
exports.toggleSubCommunityStatus = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const sub = community.subCommunities.find(s => String(s._id) === req.params.subId);
    if (!sub) {
      return res.status(404).json({ status: 'error', message: 'Sub-community not found' });
    }

    sub.isActive = !sub.isActive;
    await community.save();

    res.json({
      success: true,
      message: `"${sub.name}" ${sub.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { _id: sub._id, name: sub.name, isActive: sub.isActive }
    });
  } catch (error) {
    console.error('toggleSubCommunityStatus error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Rename a single sub-community
// @route   PATCH /api/v1/admin/communities/:id/sub-communities/:subId
// @access  Admin
// ─────────────────────────────────────────────
exports.renameSubCommunity = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const sub = community.subCommunities.find(s => String(s._id) === req.params.subId);
    if (!sub) {
      return res.status(404).json({ status: 'error', message: 'Sub-community not found' });
    }

    const duplicate = community.subCommunities.some(
      s => String(s._id) !== req.params.subId && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ status: 'error', message: 'A sub-community with this name already exists.' });
    }

    sub.name = trimmed;
    await community.save();

    res.json({ success: true, message: 'Sub-community renamed successfully.', data: { _id: sub._id, name: sub.name, isActive: sub.isActive } });
  } catch (error) {
    console.error('renameSubCommunity error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Add a single sub-community to a community
// @route   POST /api/v1/admin/communities/:id/sub-communities
// @access  Admin
// ─────────────────────────────────────────────
exports.addSubCommunity = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const duplicate = community.subCommunities.some(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ status: 'error', message: 'A sub-community with this name already exists.' });
    }

    community.subCommunities.push({ name: trimmed, isActive: true });
    await community.save();

    const added = community.subCommunities[community.subCommunities.length - 1];
    res.status(201).json({ success: true, message: 'Sub-community added successfully.', data: { _id: added._id, name: added.name, isActive: added.isActive, memberCount: 0, locationCount: 0 } });
  } catch (error) {
    console.error('addSubCommunity error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a single sub-community
// @route   DELETE /api/v1/admin/communities/:id/sub-communities/:subId
// @access  Admin
// ─────────────────────────────────────────────
exports.deleteSubCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const sub = community.subCommunities.find(s => String(s._id) === req.params.subId);
    if (!sub) {
      return res.status(404).json({ status: 'error', message: 'Sub-community not found' });
    }

    const name = sub.name;
    community.subCommunities = community.subCommunities.filter(s => String(s._id) !== req.params.subId);
    await community.save();

    res.json({ success: true, message: `"${name}" deleted successfully.` });
  } catch (error) {
    console.error('deleteSubCommunity error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Get detailed real location-wise breakdown for a sub-community
// @route   GET /api/v1/admin/communities/:id/sub-communities/:subName/locations
// @access  Admin
// ─────────────────────────────────────────────
exports.getSubCommunityLocationBreakdown = async (req, res) => {
  try {
    const { id, subName } = req.params;
    const decodedSubName = decodeURIComponent(subName || '').trim();

    const community = await Community.findById(id)
      .populate('cityIds', 'name state slug code isActive')
      .populate('headId', 'name email phone avatar')
      .lean();

    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    // Fetch all active users in this community
    const allUsers = await User.find({
      communityId: community._id,
      accountStatus: { $ne: 'deleted' }
    })
      .select('name email phone role accountType subHeadType city state gotra subCommunity avatar joiningDate plainPassword accountStatus createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const subLower = decodedSubName.toLowerCase();
    
    // Sub-community matching users (or all users in community if none tagged specifically)
    const subUsers = allUsers.filter(u => 
      u.subCommunity && u.subCommunity.trim().toLowerCase() === subLower
    );
    const effectiveUsers = subUsers.length > 0 ? subUsers : allUsers;

    // Community Heads
    const communityHeads = allUsers.filter(u => 
      u.role === 'head' || 
      (community.headId && String(community.headId._id || community.headId) === String(u._id))
    );

    // Real Local Heads created in this community
    const localHeads = allUsers.filter(u => 
      u.accountType === 'local_head' || 
      u.role === 'local_head' ||
      (u.role === 'sub_head' && (u.subHeadType === 'local' || u.accountType === 'local_head'))
    );

    // Real Local Sub Community Heads created in this community
    const localSubHeads = allUsers.filter(u => 
      u.accountType === 'local_sub_head' || 
      u.role === 'sub_local_head' || 
      u.accountType === 'community_sub_head' ||
      (u.role === 'sub_head' && u.accountType !== 'local_head')
    );

    // Determine distinct cities from community settings + users + local heads
    const cityMap = new Map();

    // 1. From Community's assigned cities
    if (Array.isArray(community.cityIds)) {
      community.cityIds.forEach(c => {
        if (c && c.name) {
          const key = c.name.trim().toLowerCase();
          cityMap.set(key, { name: c.name.trim(), isActive: c.isActive !== false });
        }
      });
    }
    if (community.city) {
      const key = community.city.trim().toLowerCase();
      if (!cityMap.has(key)) {
        cityMap.set(key, { name: community.city.trim(), isActive: true });
      }
    }

    // 2. From Local Heads & Users
    localHeads.concat(localSubHeads).concat(effectiveUsers).forEach(u => {
      if (u.city && u.city.trim()) {
        const key = u.city.trim().toLowerCase();
        if (!cityMap.has(key)) {
          cityMap.set(key, { name: u.city.trim(), isActive: true });
        }
      }
    });

    // 3. Fallback default showcase cities if still empty
    const defaultCities = ['Indore', 'Bhopal', 'Ujjain', 'Khandwa'];
    defaultCities.forEach(cityName => {
      const key = cityName.toLowerCase();
      if (!cityMap.has(key)) {
        cityMap.set(key, { name: cityName, isActive: true });
      }
    });

    // Illustration types helper
    const getIllustrationType = (cityName) => {
      const lower = (cityName || '').toLowerCase();
      if (lower.includes('ujjain')) return 'temple_orange';
      if (lower.includes('bhopal')) return 'palace';
      if (lower.includes('khandwa')) return 'fort';
      return 'temple'; // Default Indore Rajwada
    };

    const colorClasses = ['grp-header-blue', 'grp-header-pink', 'grp-header-green', 'grp-header-yellow'];

    // Build location objects with real user counts, local heads, and sub heads
    const locations = Array.from(cityMap.values()).map((cityObj) => {
      const cityName = cityObj.name;
      const cLower = cityName.toLowerCase();

      // Filter users in this city
      const cityUsers = effectiveUsers.filter(u => u.city && u.city.trim().toLowerCase() === cLower);
      const cityLocalHeads = localHeads.filter(u => u.city && u.city.trim().toLowerCase() === cLower);
      const cityLocalSubHeads = localSubHeads.filter(u => u.city && u.city.trim().toLowerCase() === cLower);

      // Distribute heads into 4 standard groups (Group 1 - Group 4)
      const groups = [1, 2, 3, 4].map(gNum => {
        const gName = `Group ${gNum}`;
        const colorClass = colorClasses[(gNum - 1) % colorClasses.length];

        // Group-assigned local heads (or distribute evenly if no group specified)
        const grpHeads = cityLocalHeads.filter((h, idx) => {
          if (h.group) return h.group.toLowerCase().includes(String(gNum));
          return idx % 4 === (gNum - 1);
        });

        // Group-assigned sub local heads
        const grpSubHeads = cityLocalSubHeads.filter((sh, idx) => {
          if (sh.group) return sh.group.toLowerCase().includes(String(gNum));
          return idx % 4 === (gNum - 1);
        });

        return {
          id: `g${gNum}`,
          name: gName,
          colorClass,
          heads: grpHeads.length,
          subHeads: grpSubHeads.length,
          localHeadsList: grpHeads.map(h => ({
            id: h._id,
            name: h.name,
            phone: h.phone,
            email: h.email,
            avatar: h.avatar,
            accountStatus: h.accountStatus || 'active',
            plainPassword: h.plainPassword || '******'
          })),
          subHeadsList: grpSubHeads.map(sh => ({
            id: sh._id,
            name: sh.name,
            phone: sh.phone,
            email: sh.email,
            avatar: sh.avatar,
            accountStatus: sh.accountStatus || 'active'
          }))
        };
      });

      return {
        id: `loc-${cLower.replace(/\s+/g, '-')}`,
        name: cityName,
        fullName: `${cityName} Location`,
        illustrationType: getIllustrationType(cityName),
        isActive: cityObj.isActive !== false,
        userCount: cityUsers.length,
        localHeadsCount: cityLocalHeads.length,
        localSubHeadsCount: cityLocalSubHeads.length,
        localHeadsList: cityLocalHeads.map(h => ({
          id: h._id,
          name: h.name,
          phone: h.phone,
          email: h.email,
          city: h.city,
          accountStatus: h.accountStatus || 'active',
          plainPassword: h.plainPassword || '******'
        })),
        groups
      };
    });

    const activeLocationsCount = locations.filter(l => l.isActive).length;
    const totalCommunityHeadsCount = Math.max(communityHeads.length, community.headId ? 1 : 0);
    const totalLocalCommunityHeadsCount = localHeads.length;
    const totalLocalSubCommunityHeadsCount = localSubHeads.length;
    const totalUsersCount = effectiveUsers.length;

    res.json({
      success: true,
      data: {
        community: {
          _id: community._id,
          name: community.name,
          slug: community.slug,
          logoUrl: community.logoUrl,
          createdAt: community.createdAt,
          isActive: community.isActive !== false
        },
        subCommunity: {
          name: decodedSubName,
          isActive: true
        },
        stats: {
          activeLocationsCount,
          totalCommunityHeadsCount,
          totalLocalCommunityHeadsCount,
          totalLocalSubCommunityHeadsCount,
          totalUsersCount
        },
        locations,
        allLocalHeads: localHeads.map(h => ({
          id: h._id,
          name: h.name,
          phone: h.phone,
          email: h.email,
          city: h.city,
          state: h.state,
          accountStatus: h.accountStatus,
          plainPassword: h.plainPassword,
          createdAt: h.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('getSubCommunityLocationBreakdown error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Assign or Create Local Head / Sub-Head for a Location & Group
// @route   POST /api/v1/admin/communities/:id/sub-communities/:subName/assign-head
// @access  Admin
// ─────────────────────────────────────────────
exports.assignLocalHeadToLocationGroup = async (req, res) => {
  try {
    const { id, subName } = req.params;
    const { userId, name, email, phone, password, city, state, group, accountType } = req.body;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const targetAccountType = accountType === 'local_sub_head' ? 'local_sub_head' : 'local_head';
    const targetRole = 'sub_head';

    // Promote existing user
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      user.communityId = community._id;
      user.subCommunity = decodeURIComponent(subName || user.subCommunity || '');
      if (city) user.city = city;
      if (state) user.state = state;
      user.role = targetRole;
      user.accountType = targetAccountType;
      user.subHeadType = 'local';
      user.accountStatus = 'active';
      if (group) user.group = group;
      if (password && password.length >= 6) {
        user.password = password;
        user.plainPassword = password;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: `${user.name} has been assigned as ${targetAccountType === 'local_head' ? 'Local Head' : 'Local Sub-Head'} successfully.`,
        data: user
      });
    }

    // Create fresh user account
    if (!name || !phone) {
      return res.status(400).json({ status: 'error', message: 'Name and phone are required.' });
    }

    const cleanPhone = phone.trim();
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Phone number already registered. Please select user to promote.' });
    }

    const rawPassword = password || '123456';
    const newUser = new User({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : undefined,
      loginId: cleanPhone,
      password: rawPassword,
      plainPassword: rawPassword,
      communityId: community._id,
      subCommunity: decodeURIComponent(subName || ''),
      city: city || community.city || 'Indore',
      state: state || 'Madhya Pradesh',
      role: targetRole,
      accountType: targetAccountType,
      subHeadType: 'local',
      accountStatus: 'active',
      verificationStatus: 'verified',
      isPhoneVerified: true,
      isEmailVerified: true,
      group: group || 'Group 1'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: `${newUser.name} created as ${targetAccountType === 'local_head' ? 'Local Head' : 'Local Sub-Head'} successfully.`,
      data: newUser
    });
  } catch (error) {
    console.error('assignLocalHeadToLocationGroup error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

