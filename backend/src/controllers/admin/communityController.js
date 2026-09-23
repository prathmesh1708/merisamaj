const mongoose = require('mongoose');
const Community = require('../../models/Community');
const User = require('../../models/User');
const { notifyHeadAssigned, notifyLocalHeadNewMember } = require('../../services/notificationService');
const cacheService = require('../../utils/cacheService');
const { getIO } = require('../../services/socketRegistry');

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

    // Attach member count for each community
    const communitiesWithStats = await Promise.all(
      communities.map(async (comm) => {
        const memberCount = await User.countDocuments({
          communityId: comm._id,
          role: 'user',
          accountStatus: { $ne: 'deleted' },
        });
        return {
          ...comm.toObject(),
          memberCount,
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
    const sanitizedSubCommunities = Array.isArray(subCommunities)
      ? Array.from(new Set(subCommunities.map(s => String(s || '').trim()).filter(Boolean)))
      : [];

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
      community.subCommunities = Array.from(new Set(subCommunities.map(s => String(s || '').trim()).filter(Boolean)));
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

    // Optional: Admin can move all members into another community on delete
    let transferTarget = null;
    const { transferTo } = req.query;
    if (transferTo) {
      if (!mongoose.Types.ObjectId.isValid(transferTo) || transferTo === String(community._id)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ status: 'error', message: 'Invalid transfer community.' });
      }
      transferTarget = await Community.findById(transferTo).session(session);
      if (!transferTarget) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ status: 'error', message: 'Transfer community not found' });
      }
    }

    // Permanent Hard Deletion:
    // 1. Regular members → force logout + back to pending approval.
    //    Membership / premium fields are intentionally kept so access is restored on approval.
    const memberFilter = {
      role: { $in: ['user', 'member'] },
      $or: [
        { communityId: community._id },
        { communityId: null, community: community.name },
      ],
    };
    const affectedMembers = await User.find(memberFilter).select('_id').session(session).lean();
    const affectedMemberIds = affectedMembers.map(m => m._id);

    const memberUpdate = transferTarget
      ? {
          communityId: transferTarget._id,
          community: transferTarget.name,
          subCommunity: null,
          verificationStatus: 'pending',
          accountStatus: 'pending verification',
          communityRemoved: false,
          removedCommunityName: community.name,
        }
      : {
          communityId: null,
          community: null,
          subCommunity: null,
          verificationStatus: 'pending',
          accountStatus: 'community removed',
          communityRemoved: true,
          removedCommunityName: community.name,
        };
    await User.updateMany(
      { _id: { $in: affectedMemberIds } },
      { $set: memberUpdate, $inc: { sessionVersion: 1 } },
      { session }
    );

    // 2. Local Heads / Sub-Heads of this community lose their scope → deactivate + force logout
    const affectedSubHeads = await User.find({ role: 'sub_head', communityId: community._id })
      .select('_id').session(session).lean();
    const affectedSubHeadIds = affectedSubHeads.map(u => u._id);
    await User.updateMany(
      { _id: { $in: affectedSubHeadIds } },
      { $set: { communityId: null, community: null, accountStatus: 'inactive' }, $inc: { sessionVersion: 1 } },
      { session }
    );

    // 3. Unset head assignments
    const affectedHeads = await User.find({
      $or: [{ _id: community.headId }, { assignedCommunityIds: community._id }, { communityId: community._id }],
    }).select('_id').session(session).lean();

    await User.updateMany(
      { communityId: community._id },
      { $set: { communityId: null, community: null } },
      { session }
    );
    await User.updateMany(
      { assignedCommunityIds: community._id },
      { $pull: { assignedCommunityIds: community._id } },
      { session }
    );

    // 4. Delete community document
    await Community.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    // ── Post-commit side effects (non-blocking) ──
    const loggedOutIds = [...affectedMemberIds, ...affectedSubHeadIds];
    [...loggedOutIds, ...affectedHeads.map(h => h._id)].forEach(id => cacheService.del(`auth_user_${id}`));

    const io = getIO();
    if (io) {
      const payload = {
        reason: 'community_deleted',
        communityName: community.name,
        transferredTo: transferTarget ? transferTarget.name : null,
      };
      loggedOutIds.forEach(id => io.to(`user:${id}`).emit('auth:force_logout', payload));
      io.in(`community:${community._id}`).socketsLeave(`community:${community._id}`);
    }

    if (transferTarget && affectedMemberIds.length > 0) {
      User.find({ _id: { $in: affectedMemberIds } })
        .select('_id name city communityId')
        .lean()
        .then(async (members) => {
          for (const m of members) {
            await notifyLocalHeadNewMember(m, { previousCommunityName: community.name });
          }
        })
        .catch(err => console.warn('[deleteCommunity notify transfer error]:', err.message));
    }

    res.json({
      success: true,
      message: transferTarget
        ? `Community "${community.name}" deleted. ${affectedMemberIds.length} member(s) moved to "${transferTarget.name}" pending approval.`
        : `Community "${community.name}" deleted permanently. ${affectedMemberIds.length} member(s) logged out and must re-select a community.`,
      data: { affectedMembers: affectedMemberIds.length, transferredTo: transferTarget?._id || null },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('deleteCommunity error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  }
};

