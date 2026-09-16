const User = require('../../models/User');
const { inheritTenantPayload } = require('../../utils/queryScopeHelper');

// @desc    Get Sub-Heads created by the current Head or Local Head
// @route   GET /api/v1/head/sub-heads
// @access  Private (Head / Local Head / Admin)
exports.getSubHeads = async (req, res) => {
  try {
    const { search, status } = req.query;

    const isMasterAdmin = req.user?.role === 'admin';
    const query = isMasterAdmin ? {} : { parentHeadId: req.user._id };

    query.role = 'sub_head';
    query.accountType = { $in: ['community_sub_head', 'local_sub_head', 'leadership'] };

    if (status && status !== 'all') {
      query.accountStatus = status;
    } else {
      query.accountStatus = { $ne: 'deleted' };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { designation: searchRegex },
        { department: searchRegex },
        { city: searchRegex }
      ];
    }

    const subHeads = await User.find(query)
      .select('name email phone loginId designation department avatar city state subHeadType accountType headPermissions accountStatus joiningDate createdAt plainPassword communityId')
      .populate('communityId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const baseCountQuery = isMasterAdmin ? {} : { parentHeadId: req.user._id };
    baseCountQuery.role = 'sub_head';
    baseCountQuery.accountType = { $in: ['community_sub_head', 'local_sub_head', 'leadership'] };
    baseCountQuery.accountStatus = { $ne: 'deleted' };

    const total = await User.countDocuments(baseCountQuery);
    const active = await User.countDocuments({ ...baseCountQuery, accountStatus: 'active' });

    res.status(200).json({
      status: 'success',
      count: subHeads.length,
      stats: {
        total,
        active,
        inactive: total - active
      },
      data: subHeads
    });
  } catch (error) {
    console.error('getSubHeads error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch Sub-Heads' });
  }
};

// @desc    Create a new Sub-Head under Community Head or Local Head
// @route   POST /api/v1/head/sub-heads
// @access  Private (Head / Local Head / Admin)
exports.createSubHead = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    const { name, email, phone, password, designation, department, headPermissions, city, state } = payload;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'fail', message: 'Name is required' });
    }
    if (!phone && !email) {
      return res.status(400).json({ status: 'fail', message: 'Phone or Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters' });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

    if (cleanPhone) {
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({ status: 'fail', message: 'Phone number already registered' });
      }
    }

    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ status: 'fail', message: 'Email address already registered' });
      }
    }

    // Determine sub-head type based on creator role and accountType
    const isLocalHeadCreator = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local';
    const subHeadType = isLocalHeadCreator ? 'local' : 'community';
    const accountType = isLocalHeadCreator ? 'local_sub_head' : 'community_sub_head';

    // Permission Inheritance Safeguard:
    // Sub-Head cannot receive permissions that the parent creator does not have
    const parentPermissions = req.user?.headPermissions || {};
    const isCreatorHead = req.user?.role === 'head' || req.user?.role === 'admin';

    const sanitizedHeadPermissions = {
      canViewDashboard: true,
      canViewMembers: true,
      canAddMembers: false,
      canEditMembers: false,
      canRemoveMembers: false,
      canExportMembers: false,
      canViewProfiles: false,
      canApproveProfiles: false,
      canEditProfiles: false,
      canViewEvents: false,
      canCreateEvents: false,
      canEditEvents: false,
      canDeleteEvents: false,
      canManageBookings: false,
      canViewDonations: false,
      canCreateDonationCampaigns: false,
      canManageExpenses: false,
      canViewFunds: false,
      canManageFunds: false,
      canViewLeadership: false,
      canManageLeadership: false,
      canManageSubHeads: false,
      canManageLocalCommunity: false,
      canViewDharmashala: false,
      canManageDharmashala: false,
      canViewSocial: false,
      canManageSocial: false,
      canViewKitchen: false,
      canManageKitchen: false,
      canViewDirectory: false,
      canManageDirectory: false,
      canViewInvitations: false,
      canCreateInvitations: false,
      canManageInvitations: false,
      canViewObituary: false,
      canManageObituary: false,
      canViewElections: false,
      canManageElections: false,
      canViewHomeContent: false,
      canManageHomeContent: false,
      canViewCensus: false,
      canManageCensus: false,
      canSendNotifications: false,
      canViewReports: false
    };

    if (headPermissions && typeof headPermissions === 'object') {
      Object.keys(headPermissions).forEach(key => {
        if (headPermissions[key] === true) {
          // If creator is main Head/Admin or has that permission
          if (isCreatorHead || parentPermissions[key] === true) {
            sanitizedHeadPermissions[key] = true;
          }
        }
      });
    }

    const resolvedCity = isLocalHeadCreator ? req.user.city : (city || req.user?.city || 'Indore');
    const resolvedState = isLocalHeadCreator ? req.user.state : (state || req.user?.state || 'Madhya Pradesh');
    const resolvedCommunityId = req.communityId || req.user?.communityId?._id || req.user?.communityId;

    const subHead = new User({
      name: name.trim(),
      email: normalizedEmail,
      loginId: normalizedEmail || cleanPhone,
      phone: cleanPhone || `sub_${Date.now()}`,
      password, // hashed by pre('save') hook
      plainPassword: password, // preserved for Head visibility
      role: 'sub_head',
      subHeadType,
      accountType,
      parentHeadId: req.user._id,
      communityId: resolvedCommunityId,
      assignedCommunityIds: req.user?.assignedCommunityIds?.length ? req.user.assignedCommunityIds : (resolvedCommunityId ? [resolvedCommunityId] : []),
      city: resolvedCity,
      state: resolvedState,
      designation: designation || (isLocalHeadCreator ? 'Local Sub-Head' : 'Community Sub-Head'),
      department: department || 'Operations',
      joiningDate: new Date(),
      headPermissions: sanitizedHeadPermissions,
      accountStatus: 'active',
      verificationStatus: 'verified',
      isPhoneVerified: true,
      isEmailVerified: true
    });

    await subHead.save();

    res.status(201).json({
      status: 'success',
      message: `${isLocalHeadCreator ? 'Local' : 'Community'} Sub-Head created successfully.`,
      data: {
        id: subHead._id,
        name: subHead.name,
        email: subHead.email,
        phone: subHead.phone,
        loginId: subHead.loginId,
        plainPassword: subHead.plainPassword,
        designation: subHead.designation,
        department: subHead.department,
        subHeadType: subHead.subHeadType,
        city: subHead.city,
        state: subHead.state,
        headPermissions: subHead.headPermissions,
        accountStatus: subHead.accountStatus
      }
    });
  } catch (error) {
    console.error('createSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create Sub-Head' });
  }
};

// @desc    Update a Sub-Head
// @route   PUT /api/v1/head/sub-heads/:id
// @access  Private (Head / Local Head / Admin)
exports.updateSubHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, designation, department, headPermissions, city, state } = req.body;

    const isMasterAdmin = req.user?.role === 'admin';
    const query = {
      _id: id,
      role: 'sub_head',
      accountType: { $in: ['community_sub_head', 'local_sub_head', 'leadership'] }
    };
    if (!isMasterAdmin) {
      query.parentHeadId = req.user._id;
    }

    const subHead = await User.findOne(query);
    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Sub-Head not found or unauthorized' });
    }

    if (name) subHead.name = name.trim();
    if (designation) subHead.designation = designation.trim();
    if (department) subHead.department = department.trim();
    if (city && subHead.subHeadType !== 'local') subHead.city = city.trim();
    if (state && subHead.subHeadType !== 'local') subHead.state = state.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== subHead.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existingEmail) {
          return res.status(400).json({ status: 'fail', message: 'Email address already registered' });
        }
        subHead.email = normalizedEmail;
        subHead.loginId = normalizedEmail;
      }
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone !== subHead.phone) {
        const existingPhone = await User.findOne({ phone: cleanPhone, _id: { $ne: id } });
        if (existingPhone) {
          return res.status(400).json({ status: 'fail', message: 'Phone number already registered' });
        }
        subHead.phone = cleanPhone;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters' });
      }
      subHead.password = password; // hashed on save
      subHead.plainPassword = password;
    }

    if (headPermissions && typeof headPermissions === 'object') {
      const parentPermissions = req.user?.headPermissions || {};
      const isCreatorHead = req.user?.role === 'head' || req.user?.role === 'admin';
      const updatedPermissions = { ...(subHead.headPermissions || {}) };

      Object.keys(headPermissions).forEach(key => {
        if (isCreatorHead || parentPermissions[key] === true || headPermissions[key] === false) {
          updatedPermissions[key] = Boolean(headPermissions[key]);
        }
      });

      subHead.headPermissions = updatedPermissions;
      subHead.markModified('headPermissions');
    }

    await subHead.save();

    res.status(200).json({
      status: 'success',
      message: 'Sub-Head updated successfully.',
      data: {
        id: subHead._id,
        name: subHead.name,
        email: subHead.email,
        phone: subHead.phone,
        designation: subHead.designation,
        department: subHead.department,
        city: subHead.city,
        state: subHead.state,
        headPermissions: subHead.headPermissions,
        accountStatus: subHead.accountStatus
      }
    });
  } catch (error) {
    console.error('updateSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update Sub-Head' });
  }
};

// @desc    Toggle Sub-Head Active/Inactive status
// @route   PATCH /api/v1/head/sub-heads/:id/status
// @access  Private (Head / Local Head / Admin)
exports.toggleSubHeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const isMasterAdmin = req.user?.role === 'admin';
    const query = {
      _id: id,
      role: 'sub_head',
      accountType: { $in: ['community_sub_head', 'local_sub_head', 'leadership'] }
    };
    if (!isMasterAdmin) {
      query.parentHeadId = req.user._id;
    }

    const subHead = await User.findOne(query);
    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Sub-Head not found or unauthorized' });
    }

    subHead.accountStatus = subHead.accountStatus === 'active' ? 'inactive' : 'active';
    await subHead.save();

    res.status(200).json({
      status: 'success',
      message: `Sub-Head status changed to ${subHead.accountStatus}.`,
      data: { id: subHead._id, accountStatus: subHead.accountStatus }
    });
  } catch (error) {
    console.error('toggleSubHeadStatus error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete / Deactivate Sub-Head
// @route   DELETE /api/v1/head/sub-heads/:id
// @access  Private (Head / Local Head / Admin)
exports.deleteSubHead = async (req, res) => {
  try {
    const { id } = req.params;
    const isMasterAdmin = req.user?.role === 'admin';
    const query = {
      _id: id,
      role: 'sub_head',
      accountType: { $in: ['community_sub_head', 'local_sub_head', 'leadership'] }
    };
    if (!isMasterAdmin) {
      query.parentHeadId = req.user._id;
    }

    const subHead = await User.findOneAndUpdate(
      query,
      { $set: { accountStatus: 'deleted' } },
      { new: true }
    );

    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Sub-Head not found or unauthorized' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Sub-Head removed successfully.'
    });
  } catch (error) {
    console.error('deleteSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
