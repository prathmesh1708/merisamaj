const User = require('../../models/User');

// @desc    Get all Admin Sub-Heads
// @route   GET /api/v1/admin/sub-heads
// @access  Private (Admin / Admin Sub-Head with canManageSubHeads)
exports.getAdminSubHeads = async (req, res) => {
  try {
    const { search, status } = req.query;

    const query = {
      $or: [
        { role: 'admin_sub_head' },
        { role: 'sub_head', subHeadType: 'admin' },
        { accountType: 'admin_sub_head' }
      ]
    };

    if (status && status !== 'all') {
      query.accountStatus = status;
    } else {
      query.accountStatus = { $ne: 'deleted' };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { designation: searchRegex },
          { department: searchRegex }
        ]
      });
    }

    const subHeads = await User.find(query)
      .select('name email phone loginId designation department avatar adminPermissions accountStatus joiningDate createdAt plainPassword')
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments({
      $or: [
        { role: 'admin_sub_head' },
        { role: 'sub_head', subHeadType: 'admin' },
        { accountType: 'admin_sub_head' }
      ],
      accountStatus: { $ne: 'deleted' }
    });

    const active = await User.countDocuments({
      $or: [
        { role: 'admin_sub_head' },
        { role: 'sub_head', subHeadType: 'admin' },
        { accountType: 'admin_sub_head' }
      ],
      accountStatus: 'active'
    });

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
    console.error('getAdminSubHeads error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch Admin Sub-Heads' });
  }
};

// @desc    Create a new Admin Sub-Head
// @route   POST /api/v1/admin/sub-heads
// @access  Private (Admin only)
exports.createAdminSubHead = async (req, res) => {
  try {
    const { name, email, phone, password, designation, department, adminPermissions } = req.body;

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

    // Sanitize permissions
    const sanitizedAdminPermissions = {
      canViewDashboard: true,
      canViewUsers: false,
      canAddUsers: false,
      canEditUsers: false,
      canDeleteUsers: false,
      canManageCommunities: false,
      canManageCommunityHeads: false,
      canManageCities: false,
      canManageMatrimonial: false,
      canManageEvents: false,
      canManageProfessionals: false,
      canManageDonations: false,
      canManageFunds: false,
      canManageDharmashala: false,
      canManageObituaries: false,
      canManageCensus: false,
      canManageLeadership: false,
      canManageInvitations: false,
      canManageVoting: false,
      canManageSocial: false,
      canManageSubscriptions: false,
      canManageReferrals: false,
      canViewReports: false,
      canSendNotifications: false,
      canManageShortcuts: false,
      canManageAppContent: false,
      canManageSubHeads: false,
      canManageConfig: false
    };

    if (adminPermissions && typeof adminPermissions === 'object') {
      Object.keys(adminPermissions).forEach(key => {
        if (adminPermissions[key] === true) {
          sanitizedAdminPermissions[key] = true;
        }
      });
    }

    const subHead = new User({
      name: name.trim(),
      email: normalizedEmail,
      loginId: normalizedEmail || cleanPhone,
      phone: cleanPhone || `sub_${Date.now()}`,
      password, // hashed by pre('save') hook
      plainPassword: password, // preserved for Admin credential visibility
      role: 'admin_sub_head',
      subHeadType: 'admin',
      accountType: 'admin_sub_head',
      parentHeadId: req.user._id,
      designation: designation || 'Admin Sub-Head',
      department: department || 'Operations',
      joiningDate: new Date(),
      adminPermissions: sanitizedAdminPermissions,
      accountStatus: 'active',
      verificationStatus: 'verified',
      isPhoneVerified: true,
      isEmailVerified: true
    });

    await subHead.save();

    res.status(201).json({
      status: 'success',
      message: 'Admin Sub-Head created successfully.',
      data: {
        id: subHead._id,
        name: subHead.name,
        email: subHead.email,
        phone: subHead.phone,
        loginId: subHead.loginId,
        plainPassword: subHead.plainPassword,
        designation: subHead.designation,
        department: subHead.department,
        adminPermissions: subHead.adminPermissions,
        accountStatus: subHead.accountStatus
      }
    });
  } catch (error) {
    console.error('createAdminSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create Admin Sub-Head' });
  }
};

// @desc    Update an Admin Sub-Head
// @route   PUT /api/v1/admin/sub-heads/:id
// @access  Private (Admin only)
exports.updateAdminSubHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, designation, department, adminPermissions } = req.body;

    const subHead = await User.findOne({
      _id: id,
      $or: [
        { role: 'admin_sub_head' },
        { role: 'sub_head', subHeadType: 'admin' },
        { accountType: 'admin_sub_head' }
      ]
    });

    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Admin Sub-Head not found' });
    }

    if (name) subHead.name = name.trim();
    if (designation) subHead.designation = designation.trim();
    if (department) subHead.department = department.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== subHead.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existingEmail) {
          return res.status(400).json({ status: 'fail', message: 'Email address already registered to another user' });
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
          return res.status(400).json({ status: 'fail', message: 'Phone number already registered to another user' });
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

    if (adminPermissions && typeof adminPermissions === 'object') {
      subHead.adminPermissions = {
        ...subHead.adminPermissions,
        ...adminPermissions
      };
      // Mark modified if necessary
      subHead.markModified('adminPermissions');
    }

    await subHead.save();

    res.status(200).json({
      status: 'success',
      message: 'Admin Sub-Head updated successfully.',
      data: {
        id: subHead._id,
        name: subHead.name,
        email: subHead.email,
        phone: subHead.phone,
        designation: subHead.designation,
        department: subHead.department,
        adminPermissions: subHead.adminPermissions,
        accountStatus: subHead.accountStatus
      }
    });
  } catch (error) {
    console.error('updateAdminSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update Admin Sub-Head' });
  }
};

// @desc    Toggle Admin Sub-Head Active/Inactive status
// @route   PATCH /api/v1/admin/sub-heads/:id/status
// @access  Private (Admin only)
exports.toggleAdminSubHeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subHead = await User.findOne({
      _id: id,
      $or: [
        { role: 'admin_sub_head' },
        { role: 'sub_head', subHeadType: 'admin' },
        { accountType: 'admin_sub_head' }
      ]
    });

    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Admin Sub-Head not found' });
    }

    subHead.accountStatus = subHead.accountStatus === 'active' ? 'inactive' : 'active';
    await subHead.save();

    res.status(200).json({
      status: 'success',
      message: `Admin Sub-Head status changed to ${subHead.accountStatus}.`,
      data: { id: subHead._id, accountStatus: subHead.accountStatus }
    });
  } catch (error) {
    console.error('toggleAdminSubHeadStatus error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Delete / Deactivate Admin Sub-Head
// @route   DELETE /api/v1/admin/sub-heads/:id
// @access  Private (Admin only)
exports.deleteAdminSubHead = async (req, res) => {
  try {
    const { id } = req.params;
    const subHead = await User.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { role: 'admin_sub_head' },
          { role: 'sub_head', subHeadType: 'admin' },
          { accountType: 'admin_sub_head' }
        ]
      },
      { $set: { accountStatus: 'deleted' } },
      { new: true }
    );

    if (!subHead) {
      return res.status(404).json({ status: 'fail', message: 'Admin Sub-Head not found' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Admin Sub-Head removed successfully.'
    });
  } catch (error) {
    console.error('deleteAdminSubHead error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
