const Leadership = require('../../models/Leadership');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');
const { createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');

// @desc    Get leadership directory for member's community (Dynamic Head + Sub-Leaders)
// @route   GET /api/v1/member/leadership
// @access  Private
exports.getCommunityLeadership = async (req, res) => {
  try {
    const { city, designation, search } = req.query;
    const rawCommunityId = req.communityId || req.user?.communityId;
    const targetCommunityId = (rawCommunityId && mongoose.Types.ObjectId.isValid(rawCommunityId))
      ? new mongoose.Types.ObjectId(rawCommunityId.toString())
      : (rawCommunityId ? rawCommunityId : new mongoose.Types.ObjectId('000000000000000000000000'));

    // 1. Fetch Main Community Head (Strictly scoped to targetCommunityId, NO city restriction)
    const headQuery = {
      role: 'head',
      accountStatus: 'active',
      $or: [
        { communityId: targetCommunityId },
        { assignedCommunityIds: targetCommunityId }
      ]
    };

    const communityHeadUser = await User.findOne(headQuery)
      .select('name email phone city state designation bio avatar cover socialLinks termYears createdAt')
      .lean();

    const headDesignation = (!communityHeadUser?.designation || communityHeadUser.designation.toLowerCase() === 'member')
      ? 'Community Head'
      : communityHeadUser.designation;

    const formattedHead = communityHeadUser ? {
      _id: communityHeadUser._id,
      name: communityHeadUser.name,
      initials: communityHeadUser.name ? communityHeadUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CH',
      designation: headDesignation,
      role: headDesignation,
      city: communityHeadUser.city || '',
      state: communityHeadUser.state || '',
      phone: communityHeadUser.phone || '',
      email: communityHeadUser.email || '',
      bio: communityHeadUser.bio || '',
      avatar: communityHeadUser.avatar || '',
      cover: communityHeadUser.cover || '',
      socialLinks: communityHeadUser.socialLinks || {},
      termYears: communityHeadUser.termYears || '',
      isHead: true
    } : null;

    // 2. Fetch Sub-Leaders from User collection (unconditionally scoped via applyScopeFilter)
    const baseSubFilter = { role: 'sub_head', accountStatus: 'active' };
    if (designation && designation !== 'all') {
      baseSubFilter.designation = designation;
    }
    if (search && search.trim()) {
      const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      baseSubFilter.$or = [
        { name: searchRegex },
        { designation: searchRegex },
        { department: searchRegex }
      ];
    }
    const activeCity = (city && city !== 'all') ? city : null;
    const subLeadersQuery = applyScopeFilter(req, baseSubFilter, { overrideCity: activeCity });

    const subHeadUsers = await User.find(subLeadersQuery)
      .select('name email phone city state designation department bio avatar socialLinks termYears joiningDate')
      .sort({ createdAt: -1 })
      .lean();

    const formattedSubHeads = subHeadUsers.map(u => ({
      _id: u._id,
      name: u.name,
      initials: u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SL',
      designation: u.designation || 'Executive Member',
      role: u.designation || 'Executive Member',
      department: u.department || '',
      city: u.city || '',
      state: u.state || '',
      phone: u.phone || '',
      email: u.email || '',
      bio: u.bio || '',
      avatar: u.avatar || '',
      socialLinks: u.socialLinks || {},
      termYears: u.termYears || '2024-2027',
      joiningDate: u.joiningDate,
      isHead: false
    }));

    // 3. Fetch entries from Leadership collection (unconditionally scoped via applyScopeFilter)
    const baseLegacyFilter = { isActive: true };
    if (designation && designation !== 'all') {
      baseLegacyFilter.role = designation;
    }
    const leadershipFilter = applyScopeFilter(req, baseLegacyFilter, { overrideCity: activeCity });

    const legacyLeaders = await Leadership.find(leadershipFilter).lean();
    const formattedLegacy = legacyLeaders.map(l => ({
      _id: l._id,
      name: l.name,
      initials: l.initials || (l.name ? l.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'LD'),
      designation: l.role || 'Committee Member',
      role: l.role || 'Committee Member',
      city: l.city || '',
      state: l.state || '',
      phone: l.phone || '',
      email: l.email || '',
      bio: l.bio || '',
      avatar: l.avatar || '',
      termYears: l.termYears || '',
      isHead: false
    }));

    // Combine subordinate leaders (User sub_heads + Leadership docs) with read-time deduplication (zero DB writes)
    const allSubLeaders = [...formattedSubHeads];
    formattedLegacy.forEach(leg => {
      const isDuplicate = allSubLeaders.some(s => 
        (s.phone && leg.phone && s.phone.trim() === leg.phone.trim()) ||
        (s.email && leg.email && s.email.trim().toLowerCase() === leg.email.trim().toLowerCase()) ||
        (s.name.toLowerCase() === leg.name.toLowerCase() && (s.city || '').toLowerCase() === (leg.city || '').toLowerCase())
      );
      if (!isDuplicate) {
        allSubLeaders.push(leg);
      }
    });

    // Extract unique designations for filtering
    const designationsSet = new Set(['Vice President', 'Secretary', 'Treasurer', 'Coordinator', 'Executive Member', 'Committee Member']);
    allSubLeaders.forEach(l => { if (l.designation) designationsSet.add(l.designation); });

    // Calculate real dynamic stats matching the 4 metrics (Total Members, States, Districts, Village Units)
    const statsUserFilter = applyScopeFilter(req, { accountStatus: { $ne: 'deleted' } });
    
    const primaryUsersCount = await User.countDocuments(statsUserFilter).catch(() => 0);
    const usersWithFam = await User.find(statsUserFilter).select('familyMembers').lean();
    let familyMembersCount = 0;
    usersWithFam.forEach(u => {
      if (Array.isArray(u.familyMembers)) familyMembersCount += u.familyMembers.length;
    });

    const totalMembersCount = primaryUsersCount + familyMembersCount;
    const distinctStates = await User.distinct('state', statsUserFilter).catch(() => []);
    const distinctDistricts = await User.distinct('district', statsUserFilter).catch(() => []);
    const distinctCities = await User.distinct('city', statsUserFilter).catch(() => []);

    const validStatesCount = distinctStates.filter(Boolean).length;
    const validDistrictsCount = distinctDistricts.filter(Boolean).length;
    const validCitiesCount = distinctCities.filter(Boolean).length;

    const stats = {
      totalMembers: totalMembersCount > 0 ? totalMembersCount : 1,
      totalStates: validStatesCount > 0 ? validStatesCount : 1,
      totalDistricts: validDistrictsCount > 0 ? validDistrictsCount : Math.max(validCitiesCount, 1),
      totalVillageUnits: Math.max(validCitiesCount, 1)
    };

    res.json({
      success: true,
      status: 'success',
      data: {
        communityHead: formattedHead,
        subLeaders: allSubLeaders,
        designations: Array.from(designationsSet),
        stats
      }
    });
  } catch (error) {
    console.error('getCommunityLeadership error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching leadership directory' });
  }
};

// @desc    Submit a leadership role claim / application
// @route   POST /api/v1/member/leadership/claim
// @access  Private
exports.submitLeadershipClaim = async (req, res) => {
  try {
    const { designation, department, reason } = req.body;
    const communityId = req.communityId || req.user?.communityId;

    if (!designation) {
      return res.status(400).json({ success: false, message: 'Designation is required for leadership claim.' });
    }

    // Find Community Head to notify
    const headUser = await User.findOne({ communityId, role: 'head', accountStatus: 'active' }).select('_id').lean();
    if (headUser) {
      const notification = await createNotification({
        userId: headUser._id,
        communityId,
        module: 'leadership',
        type: 'leadership_claim_submitted',
        title: 'Leadership Claim Submitted 📜',
        message: `${req.user?.name || 'A member'} applied for "${designation}" in ${department || 'General Governance'}.`,
        icon: '📜',
        priority: 'high',
        actionUrl: '/head/leadership',
        referenceId: req.user._id,
        referenceType: 'User'
      });

      if (notification) {
        sendPushNotification({
          userId: headUser._id,
          notificationId: notification._id,
          type: 'leadership_claim_submitted',
          title: 'Leadership Claim Submitted 📜',
          message: `${req.user?.name || 'A member'} applied for "${designation}".`,
          icon: '📜',
          actionUrl: '/head/leadership'
        }).catch(err => console.error('[LeadershipClaimPushError]', err.message));
      }
    }

    res.status(201).json({
      success: true,
      message: 'Leadership claim submitted successfully for review.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
