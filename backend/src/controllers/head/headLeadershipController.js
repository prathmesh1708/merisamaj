const User = require('../../models/User');
const Leadership = require('../../models/Leadership');
const bcrypt = require('bcryptjs');
const { inheritTenantPayload } = require('../../utils/queryScopeHelper');

// @desc    Create a new Sub-Leader (App Leader with login OR Offline Board Leader)
// @route   POST /api/v1/head/leadership/sub-leaders
// @access  Private (Head/Admin)
exports.createSubLeader = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    if (!payload.communityId) {
      return res.status(400).json({ status: 'error', message: 'No community context found.' });
    }

    const { isAppUser, name, email, phone, password, designation, department, termYears, socialLinks, headPermissions, city, state } = payload;

    if (!name || !designation) {
      return res.status(400).json({ status: 'error', message: 'Name and designation are required' });
    }

    // ── Protection: Head cannot create or mutate Community Head / President accounts ──
    if (designation === 'President' || designation === 'Community Head') {
      return res.status(403).json({ status: 'error', message: 'Only Master Admin can manage Community Head / President accounts.' });
    }

    if (isAppUser !== false) {
      // ── TYPE 1: App Leader (User account with login credentials) ──
      if (!phone || !password) {
        return res.status(400).json({ status: 'error', message: 'Phone and password are required for App Leaders' });
      }

      // Check duplicate phone/email
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ status: 'error', message: 'Phone number already registered' });
      }

      if (email) {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ status: 'error', message: 'Email address already registered' });
        }
      }

      // ── PERMISSION INHERITANCE SAFEGUARD ───────────────────────────────────────
      // Head can ONLY assign module permissions that Master Admin has granted to the Head!
      const headGrantedPermissions = req.user.headPermissions || {};
      const sanitizedPermissions = {};

      if (headPermissions && typeof headPermissions === 'object') {
        Object.keys(headPermissions).forEach(permKey => {
          if (headPermissions[permKey] === true) {
            if (req.user.role === 'admin' || headGrantedPermissions[permKey] === true) {
              sanitizedPermissions[permKey] = true;
            } else {
              console.warn(`[Permission Safeguard] Head '${req.user.name}' tried to assign ungranted permission '${permKey}' to Sub-Leader '${name}'. Stripped.`);
              sanitizedPermissions[permKey] = false;
            }
          } else {
            sanitizedPermissions[permKey] = false;
          }
        });
      }

      const resolvedCity = city || req.user?.city || (req.user?.workAddress ? req.user.workAddress.split(',').pop().trim() : 'Indore');
      const hashedPassword = await bcrypt.hash(password, 10);

      const subLeader = new User({
        name,
        email: email || undefined,
        phone,
        password: hashedPassword,
        plainPassword: undefined,
        role: 'sub_head',
        parentHeadId: req.user._id,
        communityId: payload.communityId,
        assignedCommunityIds: req.user?.assignedCommunityIds || [payload.communityId],
        city: resolvedCity,
        state: state || req.user?.state || 'Madhya Pradesh',
        designation: designation || 'Executive Member',
        department: department || 'General Governance',
        termYears: termYears || '2024-2027',
        joiningDate: new Date(),
        socialLinks: socialLinks || {},
        headPermissions: sanitizedPermissions,
        accountStatus: 'active'
      });

      await subLeader.save();

      return res.status(201).json({
        status: 'success',
        message: 'Sub-leader created successfully with secure credentials.',
        data: {
          id: subLeader._id,
          name: subLeader.name,
          email: subLeader.email,
          phone: subLeader.phone,
          designation: subLeader.designation,
          permissions: subLeader.headPermissions,
          isAppUser: true
        }
      });
    } else {
      // ── TYPE 2: Offline Board Member (Leadership document, no login) ──
      const docLeader = new Leadership({
        communityId: payload.communityId,
        name,
        email: email || '',
        phone: phone || '',
        role: designation || 'Committee Member',
        city: city || req.user?.city || 'Indore',
        state: state || req.user?.state || 'Madhya Pradesh',
        termYears: termYears || '2024-2027',
        isActive: true
      });

      await docLeader.save();

      return res.status(201).json({
        status: 'success',
        message: 'Offline Board Leader recorded successfully.',
        data: {
          id: docLeader._id,
          name: docLeader.name,
          designation: docLeader.role,
          isAppUser: false
        }
      });
    }
  } catch (error) {
    console.error('createSubLeader error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create sub-leader' });
  }
};

// @desc    Get all sub-leaders created by current Head (User sub-heads + Leadership docs for head's community)
// @route   GET /api/v1/head/leadership/sub-leaders
// @access  Private (Head/Admin)
exports.getSubLeaders = async (req, res) => {
  try {
    const communityId = req.user.communityId || req.communityId;

    // Fetch User sub-heads linked to head (excluding Local Heads, managed in their own module)
    const subHeadUsers = await User.find({ parentHeadId: req.user._id, role: 'sub_head', accountType: { $ne: 'local_head' } })
      .select('name email phone city state designation department avatar headPermissions accountStatus joiningDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const formattedUserSubLeaders = subHeadUsers.map(u => ({
      _id: u._id,
      id: u._id,
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      city: u.city || 'Indore',
      state: u.state || 'Madhya Pradesh',
      designation: u.designation || 'Executive Member',
      department: u.department || 'General Governance',
      avatar: u.avatar || '',
      headPermissions: u.headPermissions || {},
      accountStatus: u.accountStatus || 'active',
      isActive: u.accountStatus === 'active',
      joiningDate: u.joiningDate,
      isAppUser: true
    }));

    // Fetch Leadership docs for head's community
    const docLeaders = await Leadership.find({ communityId })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const formattedDocSubLeaders = docLeaders.map(l => ({
      _id: l._id,
      id: l._id,
      name: l.name,
      email: l.email || '',
      phone: l.phone || '',
      city: l.city || 'Indore',
      state: l.state || 'Madhya Pradesh',
      designation: l.role || 'Committee Member',
      department: 'Offline Board',
      avatar: l.avatar || '',
      accountStatus: l.isActive ? 'active' : 'inactive',
      isActive: l.isActive !== false,
      isAppUser: false
    }));

    // Read-time deduplication
    const combinedSubLeaders = [...formattedUserSubLeaders];
    formattedDocSubLeaders.forEach(doc => {
      const isDup = combinedSubLeaders.some(u => 
        (u.phone && doc.phone && u.phone.trim() === doc.phone.trim()) ||
        (u.name.toLowerCase() === doc.name.toLowerCase() && u.city.toLowerCase() === doc.city.toLowerCase())
      );
      if (!isDup) {
        combinedSubLeaders.push(doc);
      }
    });

    res.status(200).json({
      status: 'success',
      count: combinedSubLeaders.length,
      data: combinedSubLeaders
    });
  } catch (error) {
    console.error('getSubLeaders error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Update Sub-Leader details and permissions
// @route   PUT /api/v1/head/leadership/sub-leaders/:id
// @access  Private (Head/Admin)
exports.updateSubLeader = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAppUser, name, email, phone, designation, department, headPermissions, password, city, state } = req.body;

    if (designation === 'President' || designation === 'Community Head') {
      return res.status(403).json({ status: 'error', message: 'Only Master Admin can manage Community Head / President accounts.' });
    }

    if (isAppUser !== false) {
      const subLeader = await User.findOne({ _id: id, parentHeadId: req.user._id, role: 'sub_head' });
      if (!subLeader) {
        return res.status(404).json({ status: 'error', message: 'Sub-leader not found or unauthorized' });
      }

      if (name) subLeader.name = name;
      if (email) subLeader.email = email;
      if (phone) subLeader.phone = phone;
      if (designation) subLeader.designation = designation;
      if (department) subLeader.department = department;
      if (city) subLeader.city = city;
      if (state) subLeader.state = state;
      if (password) {
        subLeader.password = await bcrypt.hash(password, 10);
        subLeader.plainPassword = undefined;
      }

      // Permission Inheritance Safeguard
      if (headPermissions && typeof headPermissions === 'object') {
        const headGrantedPermissions = req.user.headPermissions || {};
        const updatedPermissions = { ...subLeader.headPermissions };

        Object.keys(headPermissions).forEach(permKey => {
          if (headPermissions[permKey] === true) {
            if (req.user.role === 'admin' || headGrantedPermissions[permKey] === true) {
              updatedPermissions[permKey] = true;
            } else {
              updatedPermissions[permKey] = false;
            }
          } else {
            updatedPermissions[permKey] = false;
          }
        });
        subLeader.headPermissions = updatedPermissions;
      }

      await subLeader.save();

      return res.status(200).json({
        status: 'success',
        message: 'Sub-leader updated successfully',
        data: subLeader
      });
    } else {
      const docLeader = await Leadership.findOne({ _id: id, communityId: req.user.communityId });
      if (!docLeader) {
        return res.status(404).json({ status: 'error', message: 'Board Leader not found or unauthorized' });
      }

      if (name) docLeader.name = name;
      if (email) docLeader.email = email;
      if (phone) docLeader.phone = phone;
      if (designation) docLeader.role = designation;
      if (city) docLeader.city = city;
      if (state) docLeader.state = state;

      await docLeader.save();

      return res.status(200).json({
        status: 'success',
        message: 'Board Leader updated successfully',
        data: docLeader
      });
    }
  } catch (error) {
    console.error('updateSubLeader error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Enable/Disable Sub-Leader status (type-aware)
// @route   PATCH /api/v1/head/leadership/sub-leaders/:id/status
// @access  Private (Head/Admin)
exports.toggleSubLeaderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAppUser } = req.body;

    if (isAppUser !== false) {
      const subLeader = await User.findOne({ _id: id, parentHeadId: req.user._id, role: 'sub_head' });
      if (!subLeader) {
        return res.status(404).json({ status: 'error', message: 'Sub-leader not found or unauthorized' });
      }

      subLeader.accountStatus = subLeader.accountStatus === 'active' ? 'inactive' : 'active';
      await subLeader.save();

      return res.status(200).json({
        status: 'success',
        message: `Sub-leader account status updated to ${subLeader.accountStatus}`,
        data: { id: subLeader._id, status: subLeader.accountStatus, isActive: subLeader.accountStatus === 'active' }
      });
    } else {
      const docLeader = await Leadership.findOne({ _id: id, communityId: req.user.communityId });
      if (!docLeader) {
        return res.status(404).json({ status: 'error', message: 'Board Leader not found or unauthorized' });
      }

      docLeader.isActive = !docLeader.isActive;
      await docLeader.save();

      return res.status(200).json({
        status: 'success',
        message: `Board Leader active status updated to ${docLeader.isActive}`,
        data: { id: docLeader._id, status: docLeader.isActive ? 'active' : 'inactive', isActive: docLeader.isActive }
      });
    }
  } catch (error) {
    console.error('toggleSubLeaderStatus error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Safe Soft-Deactivation of Sub-Leader
// @route   DELETE /api/v1/head/leadership/sub-leaders/:id
// @access  Private (Head/Admin)
exports.deleteSubLeader = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAppUser } = req.query;

    if (isAppUser === 'true') {
      const subLeader = await User.findOneAndUpdate(
        { _id: id, parentHeadId: req.user._id, role: 'sub_head' },
        { $set: { accountStatus: 'inactive' } },
        { new: true }
      );
      if (!subLeader) {
        return res.status(404).json({ status: 'error', message: 'Sub-leader not found or unauthorized' });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Sub-leader account deactivated successfully'
      });
    } else {
      const docLeader = await Leadership.findOneAndUpdate(
        { _id: id, communityId: req.user.communityId },
        { $set: { isActive: false } },
        { new: true }
      );
      if (!docLeader) {
        return res.status(404).json({ status: 'error', message: 'Board Leader not found or unauthorized' });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Board Leader deactivated successfully'
      });
    }
  } catch (error) {
    console.error('deleteSubLeader error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
