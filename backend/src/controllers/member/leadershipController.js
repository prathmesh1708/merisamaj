const Leadership = require('../../models/Leadership');
const User = require('../../models/User');
const FamilyMember = require('../../models/FamilyMember');
const mongoose = require('mongoose');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');
const { createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');

// Format a raw User leader doc (head, local_head, or any sub-head) into the
// shape the leadership directory UI expects.
const formatLeaderUser = (u, { isHead = false, fallbackDesignation = 'Executive Member' } = {}) => {
  const rawDes = u.designation;
  const designation = (!rawDes || rawDes.toLowerCase() === 'member') ? fallbackDesignation : rawDes;

  return {
    _id: u._id,
    name: u.name,
    initials: u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : (isHead ? 'CH' : 'SL'),
    designation,
    role: designation,
    department: u.department || '',
    group: u.group || 'Group 1',
    groupVisibleOnHome: u.groupVisibleOnHome !== false,
    city: u.city || '',
    state: u.state || '',
    phone: u.phone || '',
    email: u.email || '',
    bio: u.bio || '',
    avatar: u.avatar || '',
    cover: u.cover || '',
    socialLinks: u.socialLinks || {},
    termYears: u.termYears || (isHead ? '' : '2024-2027'),
    joiningDate: u.joiningDate,
    isHead,
    // Mantri Mandal (मंत्री मंडल) — display-only committee this Head curated from
    // existing members; shown nested under the Head, separate from real Sub-Heads.
    mantriMandal: (u.mantriMandal || []).map(m => ({
      _id: m.userId?._id || m.userId,
      name: m.userId?.name || 'Unknown',
      phone: m.userId?.phone || '',
      avatar: m.userId?.avatar || '',
      city: m.userId?.city || '',
      designation: m.designation || ''
    }))
  };
};

// Natural sort for "Group 1", "Group 2", ... "Group 10" labels
const groupSortValue = (label) => {
  const match = /(\d+)/.exec(label || '');
  return match ? parseInt(match[1], 10) : 0;
};

const LEADER_SELECT = 'name email phone city state role accountType designation department group groupVisibleOnHome bio avatar cover socialLinks termYears joiningDate parentHeadId createdAt mantriMandal';

// @desc    Get grouped leadership directory for member's community
//          (Community Head groups + Local Head groups, each with their own sub-heads)
// @route   GET /api/v1/member/leadership
// @access  Private
exports.getCommunityLeadership = async (req, res) => {
  try {
    const { designation, search } = req.query;
    const rawCommunityId = req.communityId || req.user?.communityId;
    const targetCommunityId = (rawCommunityId && mongoose.Types.ObjectId.isValid(rawCommunityId))
      ? new mongoose.Types.ObjectId(rawCommunityId.toString())
      : (rawCommunityId ? rawCommunityId : new mongoose.Types.ObjectId('000000000000000000000000'));

    const communityOrCondition = [
      { communityId: targetCommunityId },
      { assignedCommunityIds: targetCommunityId }
    ];
    const roleOrCondition = [
      { role: 'head' },
      { role: 'sub_head', accountType: { $in: ['community_sub_head', 'local_head', 'local_sub_head'] } }
    ];

    // 1. Fetch ALL Community Heads (one community can have several, one per Group) —
    //    plus ALL Local Heads and ALL their respective sub-heads, in one query.
    const allLeaderUsers = await User.find({
      accountStatus: 'active',
      $and: [
        { $or: communityOrCondition },
        { $or: roleOrCondition }
      ]
    })
      .select(LEADER_SELECT)
      .populate('mantriMandal.userId', 'name phone avatar city')
      .sort({ group: 1, createdAt: 1 })
      .lean();

    const communityHeadsRaw = allLeaderUsers.filter(u => u.role === 'head');
    const localHeadsRaw = allLeaderUsers.filter(u => u.accountType === 'local_head');
    const communitySubHeadsRaw = allLeaderUsers.filter(u => u.accountType === 'community_sub_head');
    const localSubHeadsRaw = allLeaderUsers.filter(u => u.accountType === 'local_sub_head');

    const buildGroups = (heads, subHeads, headFallbackDesignation, subFallbackDesignation) => {
      // How many heads share each group label — used below to safely fall back to
      // group-label matching only when it's unambiguous (exactly one head in that group).
      const headsPerGroup = {};
      heads.forEach(h => {
        const g = h.group || 'Group 1';
        headsPerGroup[g] = (headsPerGroup[g] || 0) + 1;
      });

      return heads
        .map(head => {
          const headGroup = head.group || 'Group 1';
          const matchedSubHeads = subHeads.filter(sh => {
            if (sh.parentHeadId) return String(sh.parentHeadId) === String(head._id);
            // Legacy/unlinked sub-heads (created before parentHeadId tracking) —
            // fall back to matching by Group label, but only when that label maps
            // to exactly one Head, so we never guess between multiple candidates.
            return (sh.group || 'Group 1') === headGroup && headsPerGroup[headGroup] === 1;
          });

          return {
            group: headGroup,
            head: formatLeaderUser(head, { isHead: true, fallbackDesignation: headFallbackDesignation }),
            subHeads: matchedSubHeads.map(sh => formatLeaderUser(sh, { fallbackDesignation: subFallbackDesignation }))
          };
        })
        .sort((a, b) => groupSortValue(a.group) - groupSortValue(b.group));
    };

    // The "Show on Home Page" toggle (User.groupVisibleOnHome) only affects the
    // compact Home widget — the full "View All" leadership directory always shows
    // every group regardless of that flag. So communityHeadGroups/localHeadGroups
    // below are intentionally the UNFILTERED full lists; only the back-compat
    // single-head fields (which the Home widget reads) are scoped to a visible group.
    const communityHeadGroups = buildGroups(communityHeadsRaw, communitySubHeadsRaw, 'Community Head', 'Sub-Community Head');
    const localHeadGroups = buildGroups(localHeadsRaw, localSubHeadsRaw, 'Local Head', 'Local Sub-Head');

    const availableLocalCities = Array.from(new Set(
      localHeadGroups.map(g => g.head.city).filter(Boolean)
    ));

    // Every group (Community Head AND Local Head) whose admin-controlled "Show on
    // Home Page" toggle is on — the Home widget renders ALL of these, tagged with
    // their scope so it can label "Community Head" vs "Local Community Head".
    const homeVisibleCommunityGroups = communityHeadGroups
      .filter(g => g.head.groupVisibleOnHome !== false)
      .map(g => ({ ...g, scope: 'community_head' }));
    const homeVisibleLocalGroups = localHeadGroups
      .filter(g => g.head.groupVisibleOnHome !== false)
      .map(g => ({ ...g, scope: 'local_head' }));

    // Back-compat single-head fields, used by older consumers of this endpoint —
    // the first visible community-head group. If every group has been hidden,
    // this (and the Home widget) correctly fall back to an empty state.
    const homeVisibleGroup = homeVisibleCommunityGroups[0] || null;
    const formattedHead = homeVisibleGroup?.head || null;
    const allSubLeaders = [...(homeVisibleGroup?.subHeads || [])];

    // 2. Optional legacy Leadership-collection entries (e.g. hand-entered committee
    //    members not backed by a User login), folded into the flat back-compat list only.
    const activeCity = (req.query.city && req.query.city !== 'all') ? req.query.city : null;
    const baseLegacyFilter = { isActive: true };
    if (designation && designation !== 'all') {
      baseLegacyFilter.role = designation;
    }
    if (search && search.trim()) {
      const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      baseLegacyFilter.$or = [
        { name: searchRegex },
        { role: searchRegex },
        { department: searchRegex }
      ];
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
    const usersWithFam = await User.find(statsUserFilter).select('familyMembers familyId').lean();
    let familyMembersCount = 0;
    const familyIds = new Set();
    usersWithFam.forEach(u => {
      if (u.familyId) familyIds.add(u.familyId.toString());
      else if (Array.isArray(u.familyMembers)) familyMembersCount += u.familyMembers.length;
    });
    // Family Tree members: approved, not linked to an account (registered users are counted above)
    if (familyIds.size > 0) {
      familyMembersCount += await FamilyMember.countDocuments({
        familyId: { $in: [...familyIds] },
        isRemoved: false,
        approvalStatus: 'approved',
        userId: null,
        linkStatus: { $ne: 'declined' }
      }).catch(() => 0);
    }

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
        // New grouped shape — used by the redesigned leadership directory ("View All" —
        // always the full unfiltered list, regardless of the Home-page visibility toggle).
        communityHeadGroups,
        localHeadGroups,
        availableLocalCities,
        // Groups the admin has switched "Yes" for on the Home page — the Home widget
        // renders every one of these, both Community Head and Local Head groups.
        homeVisibleCommunityGroups,
        homeVisibleLocalGroups,
        // Back-compat flat shape — still used by older consumers of this endpoint.
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
