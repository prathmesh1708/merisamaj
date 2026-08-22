const User = require('../../models/User');
const { inheritTenantPayload } = require('../../utils/queryScopeHelper');

// @desc    Get eligible community users for promoting to Local Head
// @route   GET /api/v1/head/local-community/community-users
// @access  Private (Head/Admin)
exports.getCommunityUsers = async (req, res) => {
  try {
    const communityId = req.user.communityId || (req.user.assignedCommunityIds && req.user.assignedCommunityIds[0]);
    if (!communityId) {
      return res.status(400).json({ status: 'error', message: 'No community context found.' });
    }

    const query = {
      communityId,
      accountStatus: { $ne: 'deleted' }
    };

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    const users = await User.find(query)
      .select('name email phone avatar city state role accountType gotra')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('getCommunityUsers error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Create a new Local Head login account or appoint an existing user
// @route   POST /api/v1/head/local-community/local-heads
// @access  Private (Head/Admin)
exports.createLocalHead = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    if (!payload.communityId) {
      return res.status(400).json({ status: 'error', message: 'No community context found.' });
    }

    const { userId, name, email, phone, password } = payload;

    if (!password || password.length < 6) {
      return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters.' });
    }

    // CASE 1: Promote an existing community user to Local Head
    if (userId) {
      const existingUser = await User.findOne({ _id: userId, communityId: payload.communityId });
      if (!existingUser) {
        return res.status(404).json({ status: 'fail', message: 'User not found in this community.' });
      }

      if (existingUser.role === 'sub_head' && existingUser.accountType === 'local_head') {
        return res.status(400).json({ status: 'fail', message: 'User is already a Local Head.' });
      }

      const normalizedEmail = email ? email.toLowerCase().trim() : existingUser.email;
      const targetPhone = phone || existingUser.phone;

      if (normalizedEmail && normalizedEmail !== existingUser.email) {
        const dupEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
        if (dupEmail) {
          return res.status(400).json({ status: 'fail', message: 'Email address already registered by another user.' });
        }
        existingUser.email = normalizedEmail;
      }

      if (targetPhone && targetPhone !== existingUser.phone) {
        const dupPhone = await User.findOne({ phone: targetPhone, _id: { $ne: userId } });
        if (dupPhone) {
          return res.status(400).json({ status: 'fail', message: 'Phone number already registered by another user.' });
        }
        existingUser.phone = targetPhone;
      }

      if (name) existingUser.name = name;
      existingUser.password = password; // raw — hashed by User's pre('save') hook
      existingUser.plainPassword = password;
      existingUser.role = 'sub_head';
      existingUser.accountType = 'local_head';
      existingUser.parentHeadId = req.user._id;
      existingUser.designation = 'Local Head';
      existingUser.department = 'Local Community';
      existingUser.joiningDate = existingUser.joiningDate || new Date();
      existingUser.accountStatus = 'active';

      await existingUser.save();

      return res.status(201).json({
        status: 'success',
        message: `${existingUser.name} has been made a Local Head successfully.`,
        data: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          accountStatus: existingUser.accountStatus
        }
      });
    }

    // CASE 2: Create a new Local Head account from scratch
    if (!name || !email || !phone) {
      return res.status(400).json({ status: 'fail', message: 'Name, email, phone and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ status: 'fail', message: 'Phone number already registered.' });
    }
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ status: 'fail', message: 'Email address already registered.' });
    }

    const localHead = new User({
      name,
      email: normalizedEmail,
      phone,
      password, // raw — hashed once by User's pre('save') hook
      plainPassword: password, // kept for Head panel credential visibility, matching existing convention
      role: 'sub_head',
      accountType: 'local_head',
      parentHeadId: req.user._id,
      communityId: payload.communityId,
      assignedCommunityIds: req.user?.assignedCommunityIds?.length ? req.user.assignedCommunityIds : [payload.communityId],
      city: req.user?.city || 'Indore',
      state: req.user?.state || 'Madhya Pradesh',
      designation: 'Local Head',
      department: 'Local Community',
      joiningDate: new Date(),
      accountStatus: 'active'
    });

    await localHead.save();

    return res.status(201).json({
      status: 'success',
      message: 'Local Head account created. Share the email and password with them to log in.',
      data: {
        id: localHead._id,
        name: localHead.name,
        email: localHead.email,
        phone: localHead.phone,
        accountStatus: localHead.accountStatus
      }
    });
  } catch (error) {
    console.error('createLocalHead error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create Local Head' });
  }
};

// @desc    List Local Heads created by the current Head
// @route   GET /api/v1/head/local-community/local-heads
// @access  Private (Head/Admin)
exports.getLocalHeads = async (req, res) => {
  try {
    const localHeads = await User.find({ parentHeadId: req.user._id, role: 'sub_head', accountType: 'local_head' })
      .select('name email phone city state accountStatus joiningDate createdAt plainPassword')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      count: localHeads.length,
      data: localHeads
    });
  } catch (error) {
    console.error('getLocalHeads error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update a Local Head's details or reset their password
// @route   PUT /api/v1/head/local-community/local-heads/:id
// @access  Private (Head/Admin)
exports.updateLocalHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password } = req.body;

    const localHead = await User.findOne({ _id: id, parentHeadId: req.user._id, role: 'sub_head', accountType: 'local_head' });
    if (!localHead) {
      return res.status(404).json({ status: 'fail', message: 'Local Head not found or unauthorized.' });
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== localHead.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
        if (existingEmail) {
          return res.status(400).json({ status: 'fail', message: 'Email address already registered.' });
        }
        localHead.email = normalizedEmail;
      }
    }
    if (phone && phone !== localHead.phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: id } });
      if (existingPhone) {
        return res.status(400).json({ status: 'fail', message: 'Phone number already registered.' });
      }
      localHead.phone = phone;
    }
    if (name) localHead.name = name;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ status: 'fail', message: 'Password must be at least 6 characters.' });
      }
      localHead.password = password; // hashed by pre('save') hook
      localHead.plainPassword = password;
    }

    await localHead.save();

    res.status(200).json({
      status: 'success',
      message: 'Local Head updated successfully.',
      data: {
        id: localHead._id,
        name: localHead.name,
        email: localHead.email,
        phone: localHead.phone,
        accountStatus: localHead.accountStatus
      }
    });
  } catch (error) {
    console.error('updateLocalHead error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Toggle a Local Head account active/inactive
// @route   PATCH /api/v1/head/local-community/local-heads/:id/status
// @access  Private (Head/Admin)
exports.toggleLocalHeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const localHead = await User.findOne({ _id: id, parentHeadId: req.user._id, role: 'sub_head', accountType: 'local_head' });
    if (!localHead) {
      return res.status(404).json({ status: 'fail', message: 'Local Head not found or unauthorized.' });
    }

    localHead.accountStatus = localHead.accountStatus === 'active' ? 'inactive' : 'active';
    await localHead.save();

    res.status(200).json({
      status: 'success',
      message: `Local Head account status updated to ${localHead.accountStatus}.`,
      data: { id: localHead._id, accountStatus: localHead.accountStatus }
    });
  } catch (error) {
    console.error('toggleLocalHeadStatus error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Deactivate a Local Head account
// @route   DELETE /api/v1/head/local-community/local-heads/:id
// @access  Private (Head/Admin)
exports.deleteLocalHead = async (req, res) => {
  try {
    const { id } = req.params;
    const localHead = await User.findOneAndUpdate(
      { _id: id, parentHeadId: req.user._id, role: 'sub_head', accountType: 'local_head' },
      { $set: { accountStatus: 'inactive' } },
      { new: true }
    );
    if (!localHead) {
      return res.status(404).json({ status: 'fail', message: 'Local Head not found or unauthorized.' });
    }

    res.status(200).json({ status: 'success', message: 'Local Head account deactivated successfully.' });
  } catch (error) {
    console.error('deleteLocalHead error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
