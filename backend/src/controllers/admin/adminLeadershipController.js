const User = require('../../models/User');
const Leadership = require('../../models/Leadership');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');
const { createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');

// Helper to compute age from dob or static age field
const computeAge = (dob, staticAge) => {
  if (dob) {
    const dobDate = new Date(dob);
    if (!isNaN(dobDate.getTime())) {
      const ageDiff = Date.now() - dobDate.getTime();
      const ageDate = new Date(ageDiff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
  }
  if (staticAge !== undefined && staticAge !== null && staticAge !== '') {
    const parsed = parseInt(staticAge, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 35;
};

// GET /api/v1/admin/leadership — Get global leadership directory (All communities or filtered by ?communityId)
exports.getGlobalLeadership = async (req, res) => {
  try {
    const { communityId, city, designation, search } = req.query;

    const baseUserFilter = {
      role: { $in: ['head', 'sub_head'] },
      accountStatus: { $in: ['active', 'inactive'] }
    };

    if (designation && designation !== 'all') {
      baseUserFilter.designation = designation;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      baseUserFilter.$or = [
        { name: regex },
        { designation: regex },
        { phone: regex },
        { city: regex }
      ];
    }

    const userFilter = applyScopeFilter(req, baseUserFilter, { overrideCity: (city && city !== 'all') ? city : null });

    const userLeaders = await User.find(userFilter)
      .select('name email phone city state designation department avatar communityId accountStatus role headPermissions termYears createdAt')
      .populate('communityId', 'name code')
      .sort({ role: 1, createdAt: -1 })
      .lean();

    const formattedUserLeaders = userLeaders.map(u => ({
      _id: u._id,
      id: u._id,
      name: u.name,
      initials: u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LD',
      designation: u.designation || (u.role === 'head' ? 'Community Head' : 'Executive Sub-Head'),
      role: u.designation || (u.role === 'head' ? 'President' : 'Executive Member'),
      department: u.department || 'General Governance',
      city: u.city || 'Indore',
      state: u.state || 'Madhya Pradesh',
      phone: u.phone || '',
      email: u.email || '',
      avatar: u.avatar || '',
      community: u.communityId?.name || 'Samaj Member',
      communityId: u.communityId?._id || u.communityId || null,
      status: u.accountStatus || 'active',
      isActive: u.accountStatus === 'active',
      termYears: u.termYears || '2024-2027',
      isAppUser: true,
      userRole: u.role
    }));

    // Fetch entries from Leadership collection
    const baseDocFilter = {};
    if (designation && designation !== 'all') {
      baseDocFilter.role = designation;
    }

    const docFilter = applyScopeFilter(req, baseDocFilter, { overrideCity: (city && city !== 'all') ? city : null });

    const docLeaders = await Leadership.find(docFilter)
      .populate('communityId', 'name code')
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const formattedDocLeaders = docLeaders.map(l => ({
      _id: l._id,
      id: l._id,
      name: l.name,
      initials: l.initials || (l.name ? l.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LD'),
      designation: l.role || 'Committee Member',
      role: l.role || 'Committee Member',
      city: l.city || 'Indore',
      state: l.state || 'Madhya Pradesh',
      phone: l.phone || '',
      email: l.email || '',
      avatar: l.avatar || '',
      community: l.communityId?.name || 'Samaj Member',
      communityId: l.communityId?._id || l.communityId || null,
      status: l.isActive ? 'active' : 'inactive',
      isActive: l.isActive !== false,
      termYears: l.termYears || '2024-2027',
      isAppUser: false
    }));

    // Deduplicate on GET response level ONLY (Read-time suppression, zero DB writes)
    const combinedLeaders = [...formattedUserLeaders];
    formattedDocLeaders.forEach(doc => {
      const isDuplicate = combinedLeaders.some(u => 
        (u.phone && doc.phone && u.phone.trim() === doc.phone.trim()) ||
        (u.email && doc.email && u.email.trim().toLowerCase() === doc.email.trim().toLowerCase()) ||
        (u.name.toLowerCase() === doc.name.toLowerCase() && u.city.toLowerCase() === doc.city.toLowerCase())
      );
      if (!isDuplicate) {
        combinedLeaders.push(doc);
      }
    });

    const summary = {
      totalLeaders: combinedLeaders.length,
      appUserLeadersCount: formattedUserLeaders.length,
      offlineBoardLeadersCount: combinedLeaders.length - formattedUserLeaders.length,
      activeCount: combinedLeaders.filter(l => l.isActive).length,
      inactiveCount: combinedLeaders.filter(l => !l.isActive).length
    };

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        summary,
        leaders: combinedLeaders
      }
    });
  } catch (error) {
    console.error('Admin getGlobalLeadership error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/admin/leadership — Add a new Leader (App Leader or Offline Board Member)
exports.createLeader = async (req, res) => {
  try {
    const { isAppUser, name, email, phone, password, designation, department, communityId, city, state, termYears, role, level } = req.body;

    if (!name || !designation || !communityId) {
      return res.status(400).json({ success: false, message: 'Name, designation, and communityId are required.' });
    }

    if (isAppUser) {
      // ── Security Safeguard: Passwords hashed via bcrypt ──
      if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Phone and password are required for App Leaders.' });
      }

      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'Phone number already registered to an existing User account.' });
      }

      const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
      const cleanPhone = phone.trim();

      const newUserLeader = new User({
        name: name.trim(),
        email: normalizedEmail,
        loginId: normalizedEmail || cleanPhone,
        phone: cleanPhone,
        password: password, // raw — hashed once by User's pre('save') hook
        plainPassword: password,
        role: role === 'President' || role === 'Community Head' ? 'head' : 'sub_head',
        communityId,
        assignedCommunityIds: [communityId],
        city: city || 'Indore',
        state: state || 'Madhya Pradesh',
        designation: designation || 'Executive Member',
        department: department || 'General Governance',
        termYears: termYears || '2024-2027',
        accountStatus: 'active',
        verificationStatus: 'verified',
        isPhoneVerified: true,
        isEmailVerified: true
      });

      await newUserLeader.save();

      // Trigger In-App + Push Notification for Leadership Appointment
      const notifTitle = 'Leadership Role Assigned 👑';
      const notifMessage = `You have been appointed as ${designation || 'Executive Member'} in your community.`;
      const notification = await createNotification({
        userId: newUserLeader._id,
        communityId,
        module: 'leadership',
        type: 'leadership_claim_approved',
        title: notifTitle,
        message: notifMessage,
        icon: '👑',
        priority: 'high',
        actionUrl: '/member/leadership'
      });

      if (notification) {
        sendPushNotification({
          userId: newUserLeader._id,
          notificationId: notification._id,
          type: 'leadership_claim_approved',
          title: notifTitle,
          message: notifMessage,
          icon: '👑',
          actionUrl: '/member/leadership'
        }).catch(err => console.error('[LeadershipPushError]', err.message));
      }

      return res.status(201).json({
        success: true,
        message: 'App Leader account created successfully with secure credentials.',
        data: newUserLeader
      });
    } else {
      // Create Offline Board Member (Leadership doc)
      const newDocLeader = new Leadership({
        communityId,
        name,
        email: email || '',
        phone: phone || '',
        role: designation || 'Committee Member',
        level: level || 'City',
        city: city || 'Indore',
        state: state || 'Madhya Pradesh',
        termYears: termYears || '2024-2027',
        isActive: true
      });

      await newDocLeader.save();

      return res.status(201).json({
        success: true,
        message: 'Offline Board Leader recorded successfully.',
        data: newDocLeader
      });
    }
  } catch (error) {
    console.error('Admin createLeader error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/v1/admin/leadership/:id/status — Toggle status safely (accountStatus for User, isActive for Leadership)
exports.toggleLeaderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAppUser } = req.body;

    if (isAppUser) {
      const userLeader = await User.findById(id);
      if (!userLeader) {
        return res.status(404).json({ success: false, message: 'App Leader not found.' });
      }

      userLeader.accountStatus = userLeader.accountStatus === 'active' ? 'inactive' : 'active';
      await userLeader.save();

      return res.status(200).json({
        success: true,
        message: `App Leader account status updated to ${userLeader.accountStatus}`,
        data: { id: userLeader._id, status: userLeader.accountStatus, isActive: userLeader.accountStatus === 'active' }
      });
    } else {
      const docLeader = await Leadership.findById(id);
      if (!docLeader) {
        return res.status(404).json({ success: false, message: 'Offline Board Leader not found.' });
      }

      docLeader.isActive = !docLeader.isActive;
      await docLeader.save();

      return res.status(200).json({
        success: true,
        message: `Board Leader active status updated to ${docLeader.isActive}`,
        data: { id: docLeader._id, status: docLeader.isActive ? 'active' : 'inactive', isActive: docLeader.isActive }
      });
    }
  } catch (error) {
    console.error('Admin toggleLeaderStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/admin/leadership/:id — Safe soft-deactivation
exports.deleteLeader = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAppUser } = req.query;

    if (isAppUser === 'true') {
      // Option A: Soft-deactivate User account
      const userLeader = await User.findByIdAndUpdate(
        id,
        { $set: { accountStatus: 'inactive' } },
        { new: true }
      );
      if (!userLeader) {
        return res.status(404).json({ success: false, message: 'App Leader not found.' });
      }

      // Trigger Notification & Push for Role Revocation
      const notification = await createNotification({
        userId: userLeader._id,
        communityId: userLeader.communityId,
        module: 'leadership',
        type: 'leadership_role_revoked',
        title: 'Leadership Role Revoked ℹ️',
        message: 'Your leadership position status has been updated by an administrator.',
        icon: 'ℹ️',
        priority: 'high',
        actionUrl: '/member/leadership'
      });

      if (notification) {
        sendPushNotification({
          userId: userLeader._id,
          notificationId: notification._id,
          type: 'leadership_role_revoked',
          title: 'Leadership Role Revoked ℹ️',
          message: 'Your leadership position status has been updated by an administrator.',
          icon: 'ℹ️',
          actionUrl: '/member/leadership'
        }).catch(err => console.error('[LeadershipRevokePushError]', err.message));
      }

      return res.status(200).json({
        success: true,
        message: 'App Leader deactivated successfully.'
      });
    } else {
      const docLeader = await Leadership.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );
      if (!docLeader) {
        return res.status(404).json({ success: false, message: 'Board Leader not found.' });
      }
      return res.status(200).json({
        success: true,
        message: 'Board Leader deactivated successfully.'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
