const User = require('../models/User');
const Event = require('../models/Event');
const CensusUpdateRequest = require('../models/CensusUpdateRequest');
const { applyScopeFilter, inheritTenantPayload } = require('../utils/queryScopeHelper');
const { createNotification } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');
const cacheService = require('../utils/cacheService');

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
  return 30; // sensible default fallback
};

// Helper to classify marital status into distinct categories
const classifyMaritalStatus = (status) => {
  if (!status || typeof status !== 'string' || !status.trim()) {
    return 'Not Specified';
  }
  const s = status.trim();
  if (/^single$|^unmarried$/i.test(s)) return 'Single';
  if (/^married$/i.test(s)) return 'Married';
  if (/^divorced$|^widowed$|^widower$|^separated$/i.test(s)) return 'Other';
  return 'Not Specified';
};

// Joint vs Nuclear classification helper
const isJointFamily = (user) => {
  const familyMembers = Array.isArray(user.familyMembers) ? user.familyMembers : [];
  const totalCount = 1 + familyMembers.length;

  if (totalCount >= 5) return true;

  const jointRelationRegex = /brother|sister-in-law|father|mother|grandfather|grandmother|uncle|aunt|daughter-in-law|paternal/i;
  const hasJointRelation = familyMembers.some(fm => fm.relation && jointRelationRegex.test(fm.relation));

  return hasJointRelation;
};

// GET /api/v1/member/census/summary (or /head/census/summary, /admin/census/summary)
exports.getCensusSummary = async (req, res) => {
  try {
    const commId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || 'global').toString();
    const cacheKey = `census_summary_${commId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const filter = applyScopeFilter(req, { accountStatus: { $ne: 'deleted' } });

    const users = await User.find(filter)
      .select('name gender dob city maritalStatus qualification profession phone role communityId familyMembers accountStatus profileImage avatar')
      .lean();

    let totalUsers = users.length;
    let totalEmbeddedMembers = 0;

    let males = [];
    let females = [];
    let kids = [];
    let jointFamilies = [];
    let nuclearFamilies = [];
    const cityMap = {};
    const ageBrackets = { '18-25': 0, '26-35': 0, '36-50': 0, '50+': 0, '0-17': 0 };

    users.forEach(u => {
      const uAge = computeAge(u.dob, u.age);
      const uCity = u.city || 'Indore';
      cityMap[uCity] = (cityMap[uCity] || 0) + 1;

      const rawStatus = u.maritalStatus ? u.maritalStatus.trim() : '';
      const primaryMemberObj = {
        id: u._id,
        name: u.name,
        fatherName: `${u.name}'s Family`,
        age: uAge,
        city: uCity,
        phone: u.phone || '',
        avatar: u.profileImage || u.avatar || null,
        maritalStatus: rawStatus ? classifyMaritalStatus(rawStatus) : (uAge < 18 ? 'Single' : 'Not Specified'),
        active: u.accountStatus === 'active',
        relation: 'Head',
        education: u.qualification || 'Graduate',
        profession: u.profession || 'Professional'
      };

      if (uAge < 18) {
        kids.push({ ...primaryMemberObj, gender: u.gender === 'Female' ? 'Girl' : 'Boy' });
        ageBrackets['0-17']++;
      } else if (u.gender === 'Female' || u.gender === 'F') {
        females.push(primaryMemberObj);
        if (uAge >= 18 && uAge <= 25) ageBrackets['18-25']++;
        else if (uAge >= 26 && uAge <= 35) ageBrackets['26-35']++;
        else if (uAge >= 36 && uAge <= 50) ageBrackets['36-50']++;
        else ageBrackets['50+']++;
      } else {
        males.push(primaryMemberObj);
        if (uAge >= 18 && uAge <= 25) ageBrackets['18-25']++;
        else if (uAge >= 26 && uAge <= 35) ageBrackets['26-35']++;
        else if (uAge >= 36 && uAge <= 50) ageBrackets['36-50']++;
        else ageBrackets['50+']++;
      }

      // Process embedded family members
      const famMembers = Array.isArray(u.familyMembers) ? u.familyMembers : [];
      totalEmbeddedMembers += famMembers.length;

      const famMales = [];
      const famFemales = [];
      const famKids = [];

      famMembers.forEach((fm, idx) => {
        const fmAge = computeAge(fm.dob, fm.age);
        const isChild = fmAge < 18 || /son|daughter|grandson|granddaughter|child/i.test(fm.relation || '');
        const isFemale = fm.gender === 'Female' || /wife|mother|daughter|sister|grandmother|aunt/i.test(fm.relation || '');
        const fmRawStatus = fm.maritalStatus ? fm.maritalStatus.trim() : (isChild ? 'Single' : '');

        const fmObj = {
          id: `fm_${u._id}_${idx}`,
          name: fm.name,
          fatherName: u.name,
          age: fmAge,
          city: uCity,
          phone: fm.phone || fm.mobile || u.phone || '',
          maritalStatus: fmRawStatus ? classifyMaritalStatus(fmRawStatus) : 'Not Specified',
          active: true,
          relation: fm.relation || 'Family Member',
          education: 'Graduate',
          profession: 'Family Member'
        };

        if (isChild && fmAge < 18) {
          kids.push({ ...fmObj, gender: isFemale ? 'Girl' : 'Boy' });
          famKids.push({ name: fm.name, age: fmAge, gender: isFemale ? 'Girl' : 'Boy', relation: fm.relation });
          ageBrackets['0-17']++;
        } else if (isFemale) {
          females.push(fmObj);
          famFemales.push({ name: fm.name, age: fmAge, relation: fm.relation });
          if (fmAge >= 18 && fmAge <= 25) ageBrackets['18-25']++;
          else if (fmAge >= 26 && fmAge <= 35) ageBrackets['26-35']++;
          else if (fmAge >= 36 && fmAge <= 50) ageBrackets['36-50']++;
          else ageBrackets['50+']++;
        } else {
          males.push(fmObj);
          famMales.push({ name: fm.name, age: fmAge, relation: fm.relation });
          if (fmAge >= 18 && fmAge <= 25) ageBrackets['18-25']++;
          else if (fmAge >= 26 && fmAge <= 35) ageBrackets['26-35']++;
          else if (fmAge >= 36 && fmAge <= 50) ageBrackets['36-50']++;
          else ageBrackets['50+']++;
        }
      });

      // Classify Family Unit
      const joint = isJointFamily(u);
      const familyUnit = {
        id: `fam_${u._id}`,
        name: `${u.name} परिवार`,
        headId: u._id,
        headName: u.name,
        city: uCity,
        type: joint ? 'Joint' : 'Nuclear',
        membersCount: 1 + famMembers.length,
        malesCount: 1 + famMales.length,
        femalesCount: famFemales.length,
        kidsCount: famKids.length,
        phone: u.phone || '',
        members: {
          males: [{ name: u.name, age: uAge, relation: 'Self (मुखिया)' }, ...famMales],
          females: famFemales,
          kids: famKids
        }
      };

      if (joint) {
        jointFamilies.push(familyUnit);
      } else {
        nuclearFamilies.push(familyUnit);
      }
    });

    const totalMembers = totalUsers + totalEmbeddedMembers;

    // Active Cities Breakdown list
    const citiesBreakdown = Object.keys(cityMap).map(cityName => ({
      name: cityName,
      count: cityMap[cityName]
    })).sort((a, b) => b.count - a.count);

    // Active Events Count from Event model
    const eventFilter = applyScopeFilter(req, { isDeleted: { $ne: true } });
    const eventsCount = await Event.countDocuments(eventFilter).catch(() => 0);

    // Aggregate Marital Status Breakdown across all members
    const maritalStatusBreakdown = {
      single: 0,
      married: 0,
      other: 0,
      notSpecified: 0
    };

    [...males, ...females, ...kids].forEach(m => {
      const cat = classifyMaritalStatus(m.maritalStatus);
      if (cat === 'Single') maritalStatusBreakdown.single++;
      else if (cat === 'Married') maritalStatusBreakdown.married++;
      else if (cat === 'Other') maritalStatusBreakdown.other++;
      else maritalStatusBreakdown.notSpecified++;
    });

    const payload = {
      success: true,
      status: 'success',
      data: {
        summary: {
          totalMembers,
          totalUsers,
          totalEmbeddedMembers,
          malesCount: males.length,
          femalesCount: females.length,
          kidsCount: kids.length,
          totalFamiliesCount: jointFamilies.length + nuclearFamilies.length,
          jointFamiliesCount: jointFamilies.length,
          nuclearFamiliesCount: nuclearFamilies.length,
          activeCitiesCount: citiesBreakdown.length,
          eventsCount,
          maritalStatusBreakdown
        },
        males,
        females,
        kids,
        families: [...jointFamilies, ...nuclearFamilies],
        citiesBreakdown,
        ageBrackets
      }
    };

    cacheService.set(cacheKey, payload, 120);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Census Summary Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/member/census/members — Get filtered member list for Census sub-views
exports.getCensusMembers = async (req, res) => {
  try {
    const { gender, city, ageGroup, maritalStatus, search } = req.query;

    const baseFilter = { accountStatus: { $ne: 'deleted' } };
    if (gender && gender !== 'all') {
      baseFilter.gender = gender === 'male' || gender === 'Male' ? 'Male' : 'Female';
    }
    if (city && city !== 'all') {
      baseFilter.city = city;
    }
    if (maritalStatus && maritalStatus !== 'all') {
      baseFilter.maritalStatus = maritalStatus;
    }

    const filter = applyScopeFilter(req, baseFilter);

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { phone: regex },
        { city: regex },
        { profession: regex }
      ];
    }

    const users = await User.find(filter)
      .select('name gender dob city maritalStatus qualification profession phone role communityId familyMembers accountStatus')
      .lean();

    const members = [];
    users.forEach(u => {
      const uAge = computeAge(u.dob, u.age);
      members.push({
        id: u._id,
        name: u.name,
        fatherName: `${u.name}'s Family`,
        gender: u.gender || 'Male',
        age: uAge,
        city: u.city || 'Indore',
        phone: u.phone || '',
        maritalStatus: u.maritalStatus || 'Married',
        active: u.accountStatus === 'active',
        relation: 'Head',
        education: u.qualification || 'Graduate',
        profession: u.profession || 'Professional'
      });
    });

    res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/member/census/update-request — Submit Census Data Update Request
exports.createUpdateRequest = async (req, res) => {
  try {
    const { memberName, relation, phone, fieldToUpdate, newValue, reason } = req.body;

    if (!memberName || !newValue || !reason) {
      return res.status(400).json({ success: false, message: 'Member name, new value, and reason are required.' });
    }

    const payload = inheritTenantPayload(req, {
      applicantId: req.user._id,
      memberName,
      relation: relation || 'Self',
      phone: phone || req.user.phone || '',
      fieldToUpdate: fieldToUpdate || 'Name',
      newValue,
      reason,
      status: 'Pending'
    });

    const updateReq = new CensusUpdateRequest(payload);
    await updateReq.save();

    // Notify Community Head of pending census update request
    if (payload.communityId) {
      const headUser = await User.findOne({ communityId: payload.communityId, role: 'head', isBlocked: { $ne: true } }).select('_id').lean();
      if (headUser) {
        await createNotification({
          userId: headUser._id,
          communityId: payload.communityId,
          module: 'census',
          type: 'census_update_submitted',
          title: 'Census Update Request 📋',
          message: `${req.user?.name || 'A member'} submitted a census update request for "${memberName}".`,
          icon: '📋',
          priority: 'high',
          actionUrl: '/head/census',
          referenceId: updateReq._id,
          referenceType: 'CensusUpdateRequest'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Census data update request submitted successfully for review.',
      data: updateReq
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/v1/head/census/update-requests (or /admin/census/update-requests)
exports.getUpdateRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const baseFilter = {};
    if (status && status !== 'all') {
      baseFilter.status = status;
    }

    const filter = applyScopeFilter(req, baseFilter);

    const requests = await CensusUpdateRequest.find(filter)
      .populate('applicantId', 'name phone avatar role')
      .populate('communityId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/v1/head/census/update-requests/:id — Review/Moderate request status
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
    }

    const updateReq = await CensusUpdateRequest.findById(req.params.id);
    if (!updateReq) {
      return res.status(404).json({ success: false, message: 'Update request not found.' });
    }

    updateReq.status = status;
    updateReq.reviewedBy = req.user._id;
    if (reviewNote) updateReq.reviewNote = reviewNote;

    await updateReq.save();

    // Trigger In-App Notification + Push Notification to Member
    const notifType = status === 'Approved' ? 'census_request_approved' : 'census_request_rejected';
    const notifTitle = status === 'Approved' ? 'Census Request Approved ✅' : 'Census Request Declined ❌';
    const notifMessage = status === 'Approved'
      ? `Your census update request for "${updateReq.memberName}" has been approved.`
      : `Your census update request for "${updateReq.memberName}" was declined. Reason: ${reviewNote || 'Contact Head'}`;

    const notification = await createNotification({
      userId: updateReq.applicantId,
      communityId: updateReq.communityId,
      module: 'census',
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      icon: status === 'Approved' ? '✅' : '❌',
      priority: 'high',
      actionUrl: '/member/census',
      referenceId: updateReq._id,
      referenceType: 'CensusUpdateRequest'
    });

    // Send FCM Push Notification (Push-Eligible Event)
    if (notification) {
      sendPushNotification({
        userId: updateReq.applicantId,
        notificationId: notification._id,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        icon: status === 'Approved' ? '✅' : '❌',
        actionUrl: '/member/census'
      }).catch(err => console.error('[CensusPushError]', err.message));
    }

    res.status(200).json({
      success: true,
      message: `Census update request ${status.toLowerCase()} successfully.`,
      data: updateReq
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/member/census/family-link-request — Send family link request
exports.requestFamilyLink = async (req, res) => {
  try {
    const { targetUserId, relation } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const notification = await createNotification({
      userId: targetUserId,
      communityId: targetUser.communityId || req.communityId,
      module: 'census',
      type: 'family_link_request',
      title: 'Family Link Request 👨‍👩‍👧',
      message: `${req.user?.name || 'A member'} sent a request to link as your ${relation || 'Family Member'}.`,
      icon: '👨‍👩‍👧',
      priority: 'high',
      actionUrl: '/member/census/family',
      referenceId: req.user._id,
      referenceType: 'User'
    });

    if (notification) {
      sendPushNotification({
        userId: targetUserId,
        notificationId: notification._id,
        type: 'family_link_request',
        title: 'Family Link Request 👨‍👩‍👧',
        message: `${req.user?.name || 'A member'} sent a request to link as your ${relation || 'Family Member'}.`,
        icon: '👨‍👩‍👧',
        actionUrl: '/member/census/family'
      }).catch(err => console.error('[FamilyLinkPushError]', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Family link request sent successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
