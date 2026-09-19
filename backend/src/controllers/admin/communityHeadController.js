const User = require('../../models/User');
const Community = require('../../models/Community');
const HeadActivityLog = require('../../models/HeadActivityLog');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// @desc    Get all community heads
// @route   GET /api/v1/admin/community-heads
// @access  Private/Admin
exports.getCommunityHeads = async (req, res) => {
  try {
    const heads = await User.find({ role: 'head' })
      .populate('assignedCommunityIds', 'name _id city')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: heads.length,
      data: heads
    });
  } catch (error) {
    console.error('Get Community Heads Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch community heads' });
  }
};

// @desc    Get community head stats
// @route   GET /api/v1/admin/community-heads/stats
// @access  Private/Admin
exports.getHeadStats = async (req, res) => {
  try {
    const totalHeads = await User.countDocuments({ role: 'head' });
    const activeHeads = await User.countDocuments({ role: 'head', accountStatus: 'active' });
    const inactiveHeads = await User.countDocuments({ role: 'head', accountStatus: { $ne: 'active' } });
    const unassignedHeads = await User.countDocuments({ role: 'head', assignedCommunityIds: { $size: 0 } });
    
    // Total distinct communities assigned across all heads
    const headsWithCommunities = await User.find({ role: 'head', assignedCommunityIds: { $exists: true, $not: {$size: 0} } }).select('assignedCommunityIds');
    const assignedSet = new Set();
    headsWithCommunities.forEach(h => {
      h.assignedCommunityIds.forEach(id => assignedSet.add(id.toString()));
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalHeads,
        activeHeads,
        inactiveHeads,
        unassignedHeads,
        totalManagedCommunities: assignedSet.size
      }
    });
  } catch (error) {
    console.error('Get Head Stats Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch head statistics' });
  }
};

// @desc    Get single community head
// @route   GET /api/v1/admin/community-heads/:id
// @access  Private/Admin
exports.getCommunityHeadById = async (req, res) => {
  try {
    const head = await User.findOne({ _id: req.params.id, role: 'head' })
      .populate('assignedCommunityIds', 'name _id city')
      .select('-password');
      
    if (!head) {
      return res.status(404).json({ status: 'fail', message: 'Community head not found' });
    }

    res.status(200).json({
      status: 'success',
      data: head
    });
  } catch (error) {
    console.error('Get Single Head Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch community head details' });
  }
};

// @desc    Create new community head
// @route   POST /api/v1/admin/community-heads
// @access  Private/Admin
exports.createCommunityHead = async (req, res) => {
  try {
    const { name, email, phone, loginId, password, assignedCommunityIds, headPermissions } = req.body;

    if (!name || !phone || !loginId || !password) {
      return res.status(400).json({ status: 'fail', message: 'Name, phone, login ID, and password are required' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ status: 'fail', message: 'User with this phone number already exists' });
    }

    const loginIdExists = await User.findOne({ loginId });
    if (loginIdExists) {
      return res.status(400).json({ status: 'fail', message: 'Login ID is already in use by another Community Head' });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ status: 'fail', message: 'User with this email already exists' });
      }
    }

    const newHead = await User.create({
      name,
      email: email || undefined,
      phone,
      loginId,
      password, // Password hashed via model middleware
      plainPassword: password, // Save for admin visibility
      role: 'head',
      designation: req.body.designation || 'Community Head',
      accountStatus: 'active',
      assignedCommunityIds: assignedCommunityIds || [],
      communityId: (assignedCommunityIds && assignedCommunityIds.length > 0) ? assignedCommunityIds[0] : null,
      headPermissions: headPermissions || {},
      createdBy: req.user.id
    });

    // Bidirectional sync: assign this new head to the selected communities
    if (assignedCommunityIds && assignedCommunityIds.length > 0) {
      await Community.updateMany(
        { _id: { $in: assignedCommunityIds } },
        { $set: { headId: newHead._id } }
      );
    }

    // Remove password from response
    const headResponse = newHead.toObject();
    delete headResponse.password;

    res.status(201).json({
      status: 'success',
      data: headResponse
    });
  } catch (error) {
    console.error('Create Head Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create community head' });
  }
};

// @desc    Update community head
// @route   PUT /api/v1/admin/community-heads/:id
// @access  Private/Admin
exports.updateCommunityHead = async (req, res) => {
  try {
    const { name, email, phone, loginId, password, assignedCommunityIds, headPermissions } = req.body;

    const head = await User.findOne({ _id: req.params.id, role: 'head' });
    if (!head) {
      return res.status(404).json({ status: 'fail', message: 'Community head not found' });
    }

    // Check duplicate phone
    if (phone && phone !== head.phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: head._id } });
      if (phoneExists) {
        return res.status(400).json({ status: 'fail', message: 'Phone number already in use' });
      }
    }

    // Check duplicate loginId
    if (loginId && loginId !== head.loginId) {
      const loginIdExists = await User.findOne({ loginId, _id: { $ne: head._id } });
      if (loginIdExists) {
        return res.status(400).json({ status: 'fail', message: 'Login ID already in use' });
      }
    }

    // Check duplicate email
    if (email && email !== head.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: head._id } });
      if (emailExists) {
        return res.status(400).json({ status: 'fail', message: 'Email already in use' });
      }
    }

    if (name) head.name = name;
    if (email !== undefined) head.email = email;
    if (phone) head.phone = phone;
    if (loginId) head.loginId = loginId;
    if (password) {
      head.password = password; // pre('save') hook will hash this if changed
      head.plainPassword = password;
    }
    if (assignedCommunityIds !== undefined) {
      head.assignedCommunityIds = assignedCommunityIds;
      head.communityId = (assignedCommunityIds && assignedCommunityIds.length > 0) ? assignedCommunityIds[0] : null;

      // Sync Community documents:
      // 1. Remove headId from communities no longer assigned to this head
      await Community.updateMany(
        { headId: head._id, _id: { $nin: assignedCommunityIds || [] } },
        { $set: { headId: null } }
      );

      // 2. Set headId on newly assigned communities
      if (assignedCommunityIds && assignedCommunityIds.length > 0) {
        await Community.updateMany(
          { _id: { $in: assignedCommunityIds } },
          { $set: { headId: head._id } }
        );
      }
    }
    
    // Merge new permissions with existing
    if (headPermissions) {
      head.headPermissions = { ...head.headPermissions, ...headPermissions };
    }

    await head.save();

    const updatedHead = await User.findById(head._id).populate('assignedCommunityIds', 'name _id city').select('-password');

    res.status(200).json({
      status: 'success',
      data: updatedHead
    });
  } catch (error) {
    console.error('Update Head Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update community head' });
  }
};

// @desc    Delete community head completely
// @route   DELETE /api/v1/admin/community-heads/:id
// @access  Private/Admin
exports.deleteCommunityHead = async (req, res) => {
  try {
    const head = await User.findOne({ _id: req.params.id, role: 'head' });
    if (!head) {
      return res.status(404).json({ status: 'fail', message: 'Community head not found' });
    }

    // Clear headId from any communities this head was managing
    await Community.updateMany(
      { headId: head._id },
      { $set: { headId: null } }
    );

    await User.findByIdAndDelete(req.params.id);
    
    // Optionally also remove activity logs tied to this head
    await HeadActivityLog.deleteMany({ headId: req.params.id });

    res.status(200).json({
      status: 'success',
      message: 'Community head permanently deleted'
    });
  } catch (error) {
    console.error('Delete Head Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete community head' });
  }
};

// @desc    Update community head status (deactivate/activate)
// @route   PATCH /api/v1/admin/community-heads/:id/status
// @access  Private/Admin
exports.updateHeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'blocked', 'deleted'].includes(status)) {
      return res.status(400).json({ status: 'fail', message: 'Valid status is required' });
    }

    const head = await User.findOne({ _id: req.params.id, role: 'head' });
    if (!head) {
      return res.status(404).json({ status: 'fail', message: 'Community head not found' });
    }

    head.accountStatus = status;
    await head.save();

    res.status(200).json({
      status: 'success',
      message: `Head status updated to ${status}`,
      data: {
        id: head._id,
        status: head.accountStatus
      }
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update head status' });
  }
};

// @desc    Get activity logs (Admin view)
// @route   GET /api/v1/admin/community-heads/activities
// @access  Private/Admin
exports.getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await HeadActivityLog.find()
      .populate('headId', 'name avatar')
      .populate('communityId', 'name city')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await HeadActivityLog.countDocuments();

    res.status(200).json({
      status: 'success',
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    console.error('Get Activity Logs Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch activity logs' });
  }
};

// @desc    Get sub-leaders created by a specific Community Head (Admin Oversight)
// @route   GET /api/v1/admin/community-heads/:headId/sub-leaders
// @access  Private/Admin
exports.getHeadSubLeaders = async (req, res) => {
  try {
    const { headId } = req.params;
    const subLeaders = await User.find({ parentHeadId: headId, role: 'sub_head' })
      .select('name avatar designation department email phone headPermissions accountStatus joiningDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: subLeaders.length,
      data: subLeaders
    });
  } catch (error) {
    console.error('Get Head Sub Leaders Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch sub-leaders' });
  }
};
