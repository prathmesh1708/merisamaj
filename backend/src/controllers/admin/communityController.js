const mongoose = require('mongoose');
const Community = require('../../models/Community');
const User = require('../../models/User');
const { notifyHeadAssigned } = require('../../services/notificationService');
const { resolveAvatarUpload } = require('../../utils/avatarUploadHelper');

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
          // 'local_head' / 'sub_local_head' / 'volunteer' / 'coordinator' are never
          // actual `role` values (role is one of user/admin/head/sub_head/admin_sub_head) —
          // these used to always match everyone-or-no-one. Local/Sub-Community Heads are
          // distinguished by `accountType`, not `role`.
          User.countDocuments({
            communityId: comm._id,
            role: 'sub_head',
            accountType: 'local_head',
            accountStatus: { $ne: 'deleted' },
          }),
          User.countDocuments({
            communityId: comm._id,
            role: 'sub_head',
            accountType: { $in: ['community_sub_head', 'local_sub_head'] },
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

    // Real Community Heads & Sub-Community Heads tagged to a sub-community, for the
    // "Total Groups" Group N cards — replaces the previous hardcoded 1/2/0/0 mock.
    const groupableLeaders = await User.find({
      communityId: community._id,
      accountStatus: { $ne: 'deleted' },
      $or: [
        { role: 'head' },
        { role: 'sub_head', accountType: 'community_sub_head' }
      ]
    })
      .select('name phone email avatar accountStatus plainPassword headPermissions subCommunity group groupVisibleOnHome role accountType')
      .lean();

    const groupSortValue = (label) => {
      const match = /(\d+)/.exec(label || '');
      return match ? parseInt(match[1], 10) : 0;
    };
    const groupColorClasses = ['grp-header-blue', 'grp-header-pink', 'grp-header-green', 'grp-header-yellow'];

    const enriched = subCommunities.map(sub => {
      const key = String(sub.name || '').trim().toLowerCase();
      const found = statsByName.get(key);

      // When a community has only one sub-community, there's nothing to disambiguate —
      // every Head/Sub-Community-Head in the community belongs here, even ones created
      // (e.g. via the top-level "Appoint Community Head" wizard) without a subCommunity
      // tag, or tagged to some other string. With multiple sub-communities, keep strict
      // tag matching so heads land under the right one.
      const leadersForSub = subCommunities.length <= 1
        ? groupableLeaders
        : groupableLeaders.filter(u => String(u.subCommunity || '').trim().toLowerCase() === key);
      const groupLabels = Array.from(new Set(leadersForSub.map(u => u.group || 'Group 1')))
        .sort((a, b) => groupSortValue(a) - groupSortValue(b));

      const groups = groupLabels.map((label, idx) => {
        const groupLeaders = leadersForSub.filter(u => (u.group || 'Group 1') === label);
        const heads = groupLeaders.filter(u => u.role === 'head');
        const subHeads = groupLeaders.filter(u => u.accountType === 'community_sub_head');
        // The group's own Head is the authoritative source for visibility; default true.
        const isVisibleOnHome = heads[0]?.groupVisibleOnHome !== false;
        return {
          id: `g-${idx + 1}`,
          name: label,
          colorClass: groupColorClasses[idx % groupColorClasses.length],
          heads: heads.length,
          subHeads: subHeads.length,
          isVisibleOnHome,
          leaderList: [
            ...heads.map(h => ({ ...h, accountType: 'community_head' })),
            ...subHeads.map(sh => ({ ...sh, accountType: 'community_sub_head' }))
          ]
        };
      });

      return {
        _id: sub._id,
        name: sub.name,
        isActive: sub.isActive !== false,
        createdAt: sub.createdAt || null,
        memberCount: found?.memberCount || 0,
        locationCount: found?.locationCount || 0,
        groups
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
      // 'local_head' / 'sub_local_head' / 'volunteer' / 'coordinator' are never actual
      // `role` values — Local/Sub-Community Heads are distinguished by `accountType`.
      User.countDocuments({
        communityId: community._id,
        role: 'sub_head',
        accountType: 'local_head',
        accountStatus: { $ne: 'deleted' },
      }),
      User.countDocuments({
        communityId: community._id,
        role: 'sub_head',
        accountType: { $in: ['community_sub_head', 'local_sub_head'] },
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
      $or: [
        { communityId: community._id },
        { assignedCommunityId: community._id },
        { assignedCommunityIds: community._id }
      ],
      accountStatus: { $ne: 'deleted' }
    })
      .select('name email phone role accountType subHeadType city state gotra subCommunity avatar joiningDate plainPassword accountStatus createdAt headPermissions group groupVisibleOnHome designation mantriMandal')
      .populate('mantriMandal.userId', 'name phone avatar city')
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
      (u.role === 'sub_head' && (u.accountType === 'local_head' || (!u.accountType && u.subHeadType === 'local')))
    );

    // Real Local Sub Community Heads created in this community.
    // IMPORTANT: this must NOT match 'community_sub_head' — a Sub-Community Head
    // (reports to a Community Head) and a Local Sub-Head (reports to a Local Head)
    // are different roles. An earlier, overly broad version of this filter
    // ("any sub_head that isn't local_head") caught community_sub_head users too,
    // which made one real account appear as — and share its delete action with —
    // both a "Sub Community Head" and a "Local Sub Community Head" at once.
    const localSubHeads = allUsers.filter(u =>
      u.accountType === 'local_sub_head' ||
      // Legacy fallback: old records created before accountType was reliably set,
      // identifiable only by their subHeadType.
      (u.role === 'sub_head' && !u.accountType && u.subHeadType === 'local')
    );

    // Locations = ONLY the cities actually assigned to this community (Community.cityIds,
    // or the legacy single `city` field when no cityIds exist). Cities that members or
    // heads merely live in, and the old hard-coded showcase cities, are NOT locations.
    const cityMap = new Map();
    const inactiveCityIdSet = new Set((community.inactiveCityIds || []).map(String));
    if (Array.isArray(community.cityIds)) {
      community.cityIds.forEach(c => {
        if (c && c.name) {
          const key = c.name.trim().toLowerCase();
          cityMap.set(key, {
            cityId: c._id,
            name: c.name.trim(),
            state: c.state || '',
            isActive: c.isActive !== false && !inactiveCityIdSet.has(String(c._id))
          });
        }
      });
    }
    if (cityMap.size === 0 && community.city && community.city.trim()) {
      cityMap.set(community.city.trim().toLowerCase(), { cityId: null, name: community.city.trim(), state: '', isActive: true });
    }

    // People living in cities that are not (yet) a location — reported so the UI can
    // tell the admin/head instead of silently hiding them.
    const unlistedMap = new Map();
    const countUnlisted = (u, field) => {
      const key = (u.city || '').trim().toLowerCase();
      if (!key || cityMap.has(key)) return;
      if (!unlistedMap.has(key)) unlistedMap.set(key, { name: u.city.trim(), users: 0, localHeads: 0, localSubHeads: 0 });
      unlistedMap.get(key)[field]++;
    };
    effectiveUsers.forEach(u => countUnlisted(u, 'users'));
    localHeads.forEach(u => countUnlisted(u, 'localHeads'));
    localSubHeads.forEach(u => countUnlisted(u, 'localSubHeads'));
    const unlistedCities = Array.from(unlistedMap.values()).sort((a, b) => a.name.localeCompare(b.name));

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

      // Groups are matched by their exact label (a missing label counts as "Group 1",
      // same as assignment). Renamed groups keep their own card; the standard
      // "Group 1..N" slots pad the matrix to at least 4 cards.
      const labelOf = (u) => (u.group && u.group.trim()) || 'Group 1';
      const usedLabels = Array.from(new Set(cityLocalHeads.concat(cityLocalSubHeads).map(labelOf)));
      const groupLabels = [...usedLabels];
      for (let n = 1; groupLabels.length < 4; n++) {
        if (!groupLabels.some(l => l.toLowerCase() === `group ${n}`)) groupLabels.push(`Group ${n}`);
      }
      const groupNumber = (label) => { const m = /^group\s+(\d+)$/i.exec(label); return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER; };
      groupLabels.sort((a, b) => groupNumber(a) - groupNumber(b) || a.localeCompare(b));

      const groups = groupLabels.map((gName, gIdx) => {
        const colorClass = colorClasses[gIdx % colorClasses.length];
        const grpHeads = cityLocalHeads.filter(h => labelOf(h) === gName);
        const grpSubHeads = cityLocalSubHeads.filter(sh => labelOf(sh) === gName);

        return {
          id: `g-${gName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: gName,
          colorClass,
          heads: grpHeads.length,
          subHeads: grpSubHeads.length,
          isVisibleOnHome: grpHeads[0]?.groupVisibleOnHome !== false,
          localHeadsList: grpHeads.map(h => ({
            id: h._id,
            name: h.name,
            phone: h.phone,
            email: h.email,
            avatar: h.avatar,
            accountStatus: h.accountStatus || 'active',
            plainPassword: h.plainPassword || '******',
            headPermissions: h.headPermissions || {},
            designation: h.designation,
            mantriMandal: (h.mantriMandal || []).map(m => ({
              userId: m.userId?._id || m.userId,
              name: m.userId?.name || 'Unknown',
              phone: m.userId?.phone || '',
              avatar: m.userId?.avatar || '',
              city: m.userId?.city || '',
              designation: m.designation || ''
            }))
          })),
          subHeadsList: grpSubHeads.map(sh => ({
            id: sh._id,
            name: sh.name,
            phone: sh.phone,
            email: sh.email,
            avatar: sh.avatar,
            accountStatus: sh.accountStatus || 'active',
            plainPassword: sh.plainPassword || '******',
            headPermissions: sh.headPermissions || {}
          }))
        };
      });

      return {
        id: `loc-${cLower.replace(/\s+/g, '-')}`,
        name: cityName,
        cityId: cityObj.cityId,
        state: cityObj.state,
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
          plainPassword: h.plainPassword || '******',
          headPermissions: h.headPermissions || {}
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
        unlistedCities,
        allLocalHeads: localHeads.map(h => ({
          id: h._id,
          name: h.name,
          phone: h.phone,
          email: h.email,
          city: h.city,
          state: h.state,
          accountStatus: h.accountStatus,
          plainPassword: h.plainPassword,
          headPermissions: h.headPermissions || {},
          createdAt: h.createdAt
        })),
        allSubHeads: localSubHeads.map(sh => ({
          id: sh._id,
          name: sh.name,
          phone: sh.phone,
          email: sh.email,
          city: sh.city,
          state: sh.state,
          group: sh.group,
          accountStatus: sh.accountStatus,
          plainPassword: sh.plainPassword,
          headPermissions: sh.headPermissions || {},
          createdAt: sh.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('getSubCommunityLocationBreakdown error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Admin / Head: Assign or Create Local Head / Sub-Head for a Location & Group
// @route   POST /api/v1/admin/communities/:id/sub-communities/:subName/assign-head
// @access  Admin / Head
// ─────────────────────────────────────────────
exports.assignLocalHeadToLocationGroup = async (req, res) => {
  try {
    const { id, subName } = req.params;
    const { userId, name, email, phone, password, city, state, group, accountType, designation } = req.body;
    // headPermissions arrives as a JSON string when the form is submitted as
    // multipart/form-data (i.e. a profile photo was attached).
    let { headPermissions } = req.body;
    if (typeof headPermissions === 'string') {
      try { headPermissions = JSON.parse(headPermissions); } catch (e) { headPermissions = {}; }
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ status: 'error', message: 'Community not found' });
    }

    const decodedSubName = decodeURIComponent(subName || '').trim();
    const effectiveGroup = (group && group.trim()) || 'Group 1';

    let targetRole = 'sub_head';
    let targetAccountType = 'local_head';
    let subHeadType = 'local';

    if (accountType === 'community_head') {
      targetRole = 'head';
      targetAccountType = 'community_head';
      subHeadType = 'community';
    } else if (accountType === 'sub_community_head' || accountType === 'community_sub_head') {
      targetRole = 'sub_head';
      targetAccountType = 'community_sub_head';
      subHeadType = 'community';
    } else if (accountType === 'local_sub_head') {
      targetRole = 'sub_head';
      targetAccountType = 'local_sub_head';
      subHeadType = 'local';
    } else {
      targetRole = 'sub_head';
      targetAccountType = 'local_head';
      subHeadType = 'local';
    }

    // Default permissions setup
    let finalPermissions = headPermissions || {};
    if (targetRole === 'head' || targetAccountType === 'community_head') {
      finalPermissions = {
        canViewDashboard: true,
        canViewMembers: true,
        canAddMembers: true,
        canEditMembers: true,
        canRemoveMembers: true,
        canApproveProfiles: true,
        canViewProfiles: true,
        canEditProfiles: true,
        canViewEvents: true,
        canCreateEvents: true,
        canEditEvents: true,
        canDeleteEvents: true,
        canViewFunds: true,
        canManageFunds: true,
        canViewDonations: true,
        canCreateDonationCampaigns: true,
        canViewSocial: true,
        canManageSocial: true,
        canViewDharmashala: true,
        canManageDharmashala: true,
        canViewDirectory: true,
        canManageDirectory: true,
        canViewInvitations: true,
        canCreateInvitations: true,
        canViewObituary: true,
        canManageObituary: true,
        canSendNotifications: true,
        canViewCensus: true,
        canManageLeadership: true,
        canManageSubHeads: true,
        canManageLocalCommunity: true,
        ...(headPermissions || {})
      };
    } else if (targetAccountType === 'local_head') {
      finalPermissions = {
        canViewDashboard: true,
        canViewMembers: true,
        canAddMembers: true,
        canEditMembers: true,
        canApproveProfiles: true,
        canViewProfiles: true,
        canViewEvents: true,
        canCreateEvents: true,
        canViewFunds: true,
        canManageFunds: true,
        canViewDonations: true,
        canViewSocial: true,
        canViewDharmashala: true,
        canSendNotifications: true,
        canViewCensus: true,
        canManageSubHeads: true,
        canManageLocalCommunity: true,
        ...(headPermissions || {})
      };
    } else {
      // Local Sub-Head default permissions if none specified
      finalPermissions = {
        canViewDashboard: true,
        canViewMembers: true,
        ...(headPermissions || {})
      };
    }

    const roleTitle = targetRole === 'head' ? 'Community Head' : (targetAccountType === 'community_sub_head' ? 'Sub-Community Head' : (targetAccountType === 'local_sub_head' ? 'Local Sub-Head' : 'Local Head'));
    // Admin can set a custom designation (e.g. "Adhyaksh", "President") instead of
    // the generic role title — falls back to the generic title when left blank.
    const effectiveDesignation = (designation && designation.trim()) || roleTitle;

    // Heads created before the Group field existed have no `group` stored at all
    // (not even "Group 1") — so a strict { group: "Group 1" } match would never find
    // them. Treat a missing/empty group as equivalent to "Group 1" when matching.
    const groupMatchCondition = (targetGroup) => targetGroup === 'Group 1'
      ? { $or: [{ group: 'Group 1' }, { group: { $in: [null, ''] } }, { group: { $exists: false } }] }
      : { group: targetGroup };

    // Resolve the specific parent Head this Sub-Head reports to, so the member-facing
    // leadership directory can nest them under the right Community Head / Local Head
    // banner instead of just grouping by matching Group label.
    let parentHead = null;
    if (targetAccountType === 'community_sub_head') {
      parentHead = await User.findOne({
        communityId: community._id,
        role: 'head',
        accountStatus: { $ne: 'deleted' },
        subCommunity: new RegExp(`^${decodedSubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        ...groupMatchCondition(effectiveGroup)
      });
      // Fall back to any Head in this Group if none matches the sub-community exactly
      if (!parentHead) {
        parentHead = await User.findOne({
          communityId: community._id,
          role: 'head',
          accountStatus: { $ne: 'deleted' },
          ...groupMatchCondition(effectiveGroup)
        }).sort({ createdAt: 1 });
      }
    } else if (targetAccountType === 'local_sub_head') {
      const cityRegex = city ? new RegExp(`^${city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null;
      parentHead = await User.findOne({
        communityId: community._id,
        role: 'sub_head',
        accountType: 'local_head',
        accountStatus: { $ne: 'deleted' },
        ...groupMatchCondition(effectiveGroup),
        ...(cityRegex ? { city: cityRegex } : {})
      }).sort({ createdAt: 1 });
      if (!parentHead && cityRegex) {
        parentHead = await User.findOne({
          communityId: community._id,
          role: 'sub_head',
          accountType: 'local_head',
          accountStatus: { $ne: 'deleted' },
          city: cityRegex
        }).sort({ createdAt: 1 });
      }
    }

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
      user.subHeadType = subHeadType;
      user.designation = effectiveDesignation;
      user.accountStatus = 'active';
      user.group = effectiveGroup;
      if (parentHead) user.parentHeadId = parentHead._id;
      user.headPermissions = finalPermissions;
      user.markModified('headPermissions');
      if (password && password.length >= 6) {
        user.password = password;
        user.plainPassword = password;
      }

      user.assignedCommunityId = community._id;
      if (!user.assignedCommunityIds || user.assignedCommunityIds.length === 0) {
        user.assignedCommunityIds = [community._id];
      }

      // Optional profile photo upload (multipart form via `upload.uploadProfileMedia`)
      const promotedAvatarUrl = await resolveAvatarUpload(req, user._id.toString());
      if (promotedAvatarUrl) {
        user.avatar = promotedAvatarUrl;
      }

      await user.save();

      // If assigned as community head and community has no head, link them
      if (targetRole === 'head' && !community.headId) {
        community.headId = user._id;
        await community.save();
      }

      return res.status(200).json({
        success: true,
        message: `${user.name} has been assigned as ${effectiveDesignation} successfully.`,
        data: user
      });
    }

    // Create fresh user account
    if (!name || !phone) {
      return res.status(400).json({ status: 'error', message: 'Name and phone are required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'A login password of at least 6 characters is required.' });
    }

    const cleanPhone = phone.trim();
    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'Phone number already registered. Please select user to promote.' });
    }

    const rawPassword = password;
    const userLoginId = (req.body.loginId && req.body.loginId.trim()) ? req.body.loginId.trim() : cleanPhone;

    const newUser = new User({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.toLowerCase().trim() : undefined,
      loginId: userLoginId,
      password: rawPassword,
      plainPassword: rawPassword,
      communityId: community._id,
      assignedCommunityId: community._id,
      assignedCommunityIds: [community._id],
      subCommunity: decodeURIComponent(subName || ''),
      city: city || community.city || 'Indore',
      state: state || 'Madhya Pradesh',
      role: targetRole,
      accountType: targetAccountType,
      subHeadType: subHeadType,
      designation: effectiveDesignation,
      accountStatus: 'active',
      verificationStatus: 'verified',
      isPhoneVerified: true,
      isEmailVerified: true,
      group: effectiveGroup,
      parentHeadId: parentHead ? parentHead._id : null,
      headPermissions: finalPermissions
    });

    // Optional profile photo upload (multipart form via `upload.uploadProfileMedia`)
    const avatarUrl = await resolveAvatarUpload(req, newUser._id.toString());
    if (avatarUrl) {
      newUser.avatar = avatarUrl;
    }

    await newUser.save();

    if (targetRole === 'head' && !community.headId) {
      community.headId = newUser._id;
      await community.save();
    }

    res.status(201).json({
      success: true,
      message: `${newUser.name} created as ${effectiveDesignation} successfully.`,
      data: newUser
    });
  } catch (error) {
    console.error('assignLocalHeadToLocationGroup error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────
// @desc    Search existing community members to add to a Head's Mantri Mandal —
//          excludes anyone already a Head/Sub-Head so only plain members show up.
// @route   GET /admin/communities/:id/mantri-mandal/search?q=...
exports.searchMantriMandalCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    const q = (req.query.q || '').trim();
    const query = {
      communityId: id,
      role: 'user',
      accountStatus: { $ne: 'deleted' }
    };
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }
    const users = await User.find(query)
      .select('name phone email avatar city')
      .sort({ name: 1 })
      .limit(30)
      .lean();
    res.json({ status: 'success', data: users });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Add an existing member to a Head's Mantri Mandal (display-only — no
//          role/permission change for that member).
// @route   POST /admin/communities/heads/:headId/mantri-mandal
exports.addMantriMandalMember = async (req, res) => {
  try {
    const { headId } = req.params;
    const { userId, designation } = req.body;
    if (!userId) return res.status(400).json({ status: 'error', message: 'userId is required.' });

    const head = await User.findById(headId);
    if (!head) return res.status(404).json({ status: 'error', message: 'Head not found.' });

    const member = await User.findById(userId).select('name phone avatar city');
    if (!member) return res.status(404).json({ status: 'error', message: 'Member not found.' });

    const alreadyIn = (head.mantriMandal || []).some(m => m.userId?.toString() === userId);
    if (alreadyIn) {
      return res.status(400).json({ status: 'error', message: `${member.name} is already in the Mantri Mandal.` });
    }

    head.mantriMandal = [...(head.mantriMandal || []), { userId, designation: (designation || '').trim() }];
    await head.save();

    res.status(201).json({
      status: 'success',
      message: `${member.name} added to Mantri Mandal.`,
      data: { userId, name: member.name, phone: member.phone, avatar: member.avatar, city: member.city, designation: (designation || '').trim() }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Remove a member from a Head's Mantri Mandal.
// @route   DELETE /admin/communities/heads/:headId/mantri-mandal/:userId
exports.removeMantriMandalMember = async (req, res) => {
  try {
    const { headId, userId } = req.params;
    const head = await User.findById(headId);
    if (!head) return res.status(404).json({ status: 'error', message: 'Head not found.' });

    head.mantriMandal = (head.mantriMandal || []).filter(m => m.userId?.toString() !== userId);
    await head.save();

    res.json({ status: 'success', message: 'Removed from Mantri Mandal.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Rename a Group and/or toggle whether it's shown on the member-facing
//          Home/Leadership page. A "Group" isn't its own stored entity — it's a
//          label shared by a Head and their Sub-Heads — so this bulk-updates every
//          User currently carrying that label (scoped to this community, and
//          optionally to one sub-community / city to disambiguate Local Head groups
//          that reuse the same "Group 1" name in different cities).
// @route   PATCH /api/v1/admin/communities/:id/groups/:groupName
// @access  Admin / Head
// ─────────────────────────────────────────────
exports.updateGroupMeta = async (req, res) => {
  try {
    const { id, groupName } = req.params;
    const { subCommunity, city, newName, isVisibleOnHome, scope } = req.body;
    const decodedGroupName = decodeURIComponent(groupName || '').trim();

    if (!decodedGroupName) {
      return res.status(400).json({ status: 'error', message: 'Group name is required.' });
    }

    // `group` is a generic field every User has (default "Group 1"), including plain
    // members and the *other* hierarchy's heads — without this, renaming/hiding a
    // Community Head group would also silently rename regular members' own `group`
    // value, and Local Head groups, just because they happened to share the same
    // label. `scope` restricts the bulk update to exactly the role/accountType set
    // the admin is actually looking at.
    const SCOPE_ROLE_CONDITIONS = {
      community_head: [
        { role: 'head' },
        { role: 'sub_head', accountType: 'community_sub_head' }
      ],
      local_head: [
        { role: 'sub_head', accountType: 'local_head' },
        { role: 'sub_head', accountType: 'local_sub_head' }
      ]
    };
    const roleCondition = SCOPE_ROLE_CONDITIONS[scope];
    if (!roleCondition) {
      return res.status(400).json({ status: 'error', message: 'A valid scope ("community_head" or "local_head") is required.' });
    }

    const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Heads created before the Group field existed have no `group` stored — they are
    // shown under "Group 1", so renaming/hiding "Group 1" must include them too.
    const groupCondition = decodedGroupName === 'Group 1'
      ? { $or: [{ group: 'Group 1' }, { group: { $in: [null, ''] } }, { group: { $exists: false } }] }
      : { group: decodedGroupName };
    const matchQuery = {
      communityId: id,
      $and: [groupCondition, { $or: roleCondition }]
    };

    if (city && city.trim()) {
      // A Local Head group card — getSubCommunityLocationBreakdown scopes these by
      // city only (never subCommunity), so the write must match that exactly or it
      // could silently rename/hide the wrong person.
      matchQuery.city = new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
    } else if (subCommunity && subCommunity.trim()) {
      // A Community Head group card — getSubCommunityStats only scopes by
      // subCommunity when the community actually has more than one; with just one,
      // every Head/Sub-Community-Head in the community is shown there regardless of
      // their own subCommunity tag, so the write must match that same behavior.
      const community = await Community.findById(id).select('subCommunities').lean();
      const subCommunityCount = Array.isArray(community?.subCommunities) ? community.subCommunities.length : 0;
      if (subCommunityCount > 1) {
        matchQuery.subCommunity = new RegExp(`^${escapeRegex(subCommunity.trim())}$`, 'i');
      }
    }

    const update = {};
    const trimmedNewName = (newName || '').trim();
    if (trimmedNewName && trimmedNewName !== decodedGroupName) {
      update.group = trimmedNewName;
    }
    if (typeof isVisibleOnHome === 'boolean') {
      update.groupVisibleOnHome = isVisibleOnHome;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ status: 'error', message: 'Nothing to update — provide a new name and/or visibility.' });
    }

    const result = await User.updateMany(matchQuery, { $set: update });
    if (result.matchedCount === 0) {
      return res.status(404).json({ status: 'error', message: 'No members found in this group.' });
    }

    res.status(200).json({
      status: 'success',
      message: update.group
        ? `Group renamed to "${update.group}" successfully.`
        : `Group visibility updated successfully.`,
      data: { matched: result.matchedCount, modified: result.modifiedCount, ...update }
    });
  } catch (error) {
    console.error('updateGroupMeta error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};


// ─────────────────────────────────────────────
// Locations of a Community = its assigned Cities (Community.cityIds).
// City records are shared master data (Admin → Cities); these endpoints only
// attach/detach them to ONE community and switch them on/off for that community.
// ─────────────────────────────────────────────

const escapeCityRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Active cities that can still be added as a location of this community
// @route   GET /api/v1/admin/communities/:id/locations/available
exports.getAvailableLocationCities = async (req, res) => {
  try {
    const City = mongoose.model('City');
    const community = await Community.findById(req.params.id).select('cityIds').lean();
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found' });

    const cities = await City.find({ isActive: true, _id: { $nin: community.cityIds || [] } })
      .select('name state')
      .sort({ state: 1, name: 1 })
      .lean();
    res.status(200).json({ success: true, data: cities.map(c => ({ id: c._id, name: c.name, state: c.state || '' })) });
  } catch (error) {
    console.error('getAvailableLocationCities error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// @desc    Add an existing City as a location of this community
// @route   POST /api/v1/admin/communities/:id/locations  { cityId }
exports.addLocation = async (req, res) => {
  try {
    const City = mongoose.model('City');
    const { cityId } = req.body;
    if (!cityId || !mongoose.Types.ObjectId.isValid(cityId)) {
      return res.status(400).json({ status: 'error', message: 'Please select a city.' });
    }
    const city = await City.findOne({ _id: cityId, isActive: true }).select('name').lean();
    if (!city) return res.status(404).json({ status: 'error', message: 'City not found or inactive.' });

    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found' });
    if ((community.cityIds || []).some(c => String(c) === String(cityId))) {
      return res.status(409).json({ status: 'error', message: `${city.name} is already a location of this community.` });
    }

    community.cityIds.push(cityId);
    await community.save();
    res.status(201).json({ success: true, message: `${city.name} added as a location.` });
  } catch (error) {
    console.error('addLocation error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// @desc    Activate / deactivate a location for this community only
// @route   PATCH /api/v1/admin/communities/:id/locations/:cityId/toggle
exports.toggleLocation = async (req, res) => {
  try {
    const { cityId } = req.params;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found' });
    if (!(community.cityIds || []).some(c => String(c) === String(cityId))) {
      return res.status(404).json({ status: 'error', message: 'This location is not part of the community.' });
    }

    const inactive = (community.inactiveCityIds || []).map(String);
    const nowActive = inactive.includes(String(cityId));
    community.inactiveCityIds = nowActive
      ? community.inactiveCityIds.filter(c => String(c) !== String(cityId))
      : [...(community.inactiveCityIds || []), cityId];
    await community.save();
    res.status(200).json({ success: true, isActive: nowActive, message: `Location ${nowActive ? 'activated' : 'deactivated'}.` });
  } catch (error) {
    console.error('toggleLocation error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

// @desc    Remove a location from this community (blocked while heads are assigned there)
// @route   DELETE /api/v1/admin/communities/:id/locations/:cityId
exports.removeLocation = async (req, res) => {
  try {
    const City = mongoose.model('City');
    const { cityId } = req.params;
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found' });
    if (!(community.cityIds || []).some(c => String(c) === String(cityId))) {
      return res.status(404).json({ status: 'error', message: 'This location is not part of the community.' });
    }

    const city = await City.findById(cityId).select('name').lean();
    if (city) {
      const headsThere = await User.countDocuments({
        communityId: community._id,
        role: 'sub_head',
        accountType: { $in: ['local_head', 'local_sub_head'] },
        accountStatus: { $ne: 'deleted' },
        city: new RegExp(`^${escapeCityRegex(city.name)}$`, 'i')
      });
      if (headsThere > 0) {
        return res.status(409).json({
          status: 'error',
          message: `${city.name} still has ${headsThere} Local Head/Sub-Head account(s). Remove or move them before deleting this location.`
        });
      }
    }

    community.cityIds = community.cityIds.filter(c => String(c) !== String(cityId));
    community.inactiveCityIds = (community.inactiveCityIds || []).filter(c => String(c) !== String(cityId));
    await community.save();
    res.status(200).json({ success: true, message: `${city?.name || 'Location'} removed from this community.` });
  } catch (error) {
    console.error('removeLocation error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};
