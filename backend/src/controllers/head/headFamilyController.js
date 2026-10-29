const mongoose = require('mongoose');
const User = require('../../models/User');
const Family = require('../../models/Family');
const FamilyMember = require('../../models/FamilyMember');
const familyService = require('../../services/familyService');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

const handleError = (res, error) => {
  if (error instanceof familyService.FamilyError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error('[headFamilyController]', error);
  return res.status(500).json({ success: false, message: error.message });
};

// Local Heads' pending queue = only requests still waiting on the Local Head stage;
// Community Heads see every request in their community.
const requestFilter = (status, level) => {
  const filter = { isRemoved: false, relationToHead: { $ne: 'Self' } };
  if (status !== 'all') filter.approvalStatus = status;
  if (level === 'local' && status === 'pending') filter['approvals.localHead.status'] = 'pending';
  return filter;
};

const toRequestDto = (r) => ({
  id: r._id,
  memberCode: r.memberCode,
  familyCode: r.familyId?.familyCode || '',
  familyHead: r.familyId?.headUserId ? { id: r.familyId.headUserId._id, name: r.familyId.headUserId.name } : null,
  name: r.name,
  avatar: r.avatar || r.userId?.avatar || null,
  relationToHead: r.relationToHead === 'Relative' && r.relationNote ? r.relationNote : r.relationToHead,
  gender: r.gender,
  dob: r.dob,
  age: r.age,
  phone: r.phone,
  city: r.city,
  gotra: r.gotra,
  maritalStatus: r.maritalStatus,
  occupation: r.occupation,
  addedBy: r.addedBy ? { id: r.addedBy._id, name: r.addedBy.name, phone: r.addedBy.phone, avatar: r.addedBy.avatar } : null,
  linkedUser: r.userId ? { id: r.userId._id, name: r.userId.name, phone: r.userId.phone } : null,
  linkStatus: r.linkStatus,
  activityStatus: familyService.activityStatusOf(r),
  approvalStatus: r.approvalStatus,
  approvals: r.approvals,
  createdAt: r.createdAt
});

// GET /api/v1/head/family-requests?status=pending|approved|rejected|all
exports.getRequests = async (req, res) => {
  try {
    const status = ['pending', 'approved', 'rejected', 'all'].includes(req.query.status) ? req.query.status : 'pending';
    const level = familyService.reviewerLevel(req.user);

    // Scopes to the reviewer's community, and to their city for Local Heads
    const data = await familyService.listRequests(req.user, applyScopeFilter(req, requestFilter(status, level)));
    const [pending, approved, rejected] = await Promise.all(
      ['pending', 'approved', 'rejected'].map(s => FamilyMember.countDocuments(applyScopeFilter(req, requestFilter(s, level))))
    );

    res.status(200).json({
      success: true,
      reviewerLevel: level,
      count: data.length,
      counts: { all: pending + approved + rejected, pending, approved, rejected },
      data: data.map(toRequestDto)
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/v1/head/family-requests/:id — one request, same scope as the list
exports.getRequest = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID.' });
    }
    const filter = applyScopeFilter(req, { _id: new mongoose.Types.ObjectId(req.params.id), isRemoved: false, relationToHead: { $ne: 'Self' } });
    const [record] = await familyService.listRequests(req.user, filter);
    if (!record) return res.status(404).json({ success: false, message: 'Request not found or outside your area.' });

    res.status(200).json({ success: true, reviewerLevel: familyService.reviewerLevel(req.user), data: toRequestDto(record) });
  } catch (error) {
    handleError(res, error);
  }
};

// PATCH /api/v1/head/family-requests/:id  { action: 'approve' | 'reject', note }
exports.reviewRequest = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (action === 'reject' && !(note || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please give a reason for rejection.' });
    }
    const record = await familyService.reviewMember(req.user, req.params.id, action, (note || '').trim());
    res.status(200).json({
      success: true,
      message: record.approvalStatus === 'approved'
        ? `${record.name} approved — now visible in the Jangana.`
        : record.approvalStatus === 'rejected'
          ? `${record.name} rejected.`
          : `${record.name} approved by Local Head — forwarded to Community Head.`,
      data: { id: record._id, approvalStatus: record.approvalStatus, approvals: record.approvals }
    });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/v1/head/family-requests/stats — KPI cards for the head's scope
// Active = registered on ApniSamaj; Inactive = added by family but not registered
// (Dummy = no mobile number). Jangana = registered members + approved inactive/dummy members.
exports.getStats = async (req, res) => {
  try {
    const recordFilter = applyScopeFilter(req, {
      isRemoved: false,
      userId: null,
      approvalStatus: { $ne: 'rejected' },
      linkStatus: { $ne: 'declined' }
    });
    const pendingFilter = { isRemoved: false, approvalStatus: 'pending', relationToHead: { $ne: 'Self' } };
    if (familyService.reviewerLevel(req.user) === 'local') pendingFilter['approvals.localHead.status'] = 'pending';
    const [activeMembers, inactiveRecords, totalFamilies, pendingRequests] = await Promise.all([
      User.countDocuments(applyScopeFilter(req, { accountStatus: { $ne: 'deleted' } })), // same base as the census
      FamilyMember.find(recordFilter).select('phone approvalStatus').lean(),
      Family.countDocuments(applyScopeFilter(req, { status: 'active' })),
      FamilyMember.countDocuments(applyScopeFilter(req, pendingFilter))
    ]);

    const inactiveMembers = inactiveRecords.filter(r => r.phone).length;
    const dummyMembers = inactiveRecords.length - inactiveMembers;
    const approvedInactive = inactiveRecords.filter(r => r.approvalStatus === 'approved').length;

    res.status(200).json({
      success: true,
      data: {
        totalFamilies,
        activeMembers,
        inactiveMembers,
        dummyMembers,
        pendingRequests,
        janganaCount: activeMembers + approvedInactive
      }
    });
  } catch (error) {
    handleError(res, error);
  }
};
