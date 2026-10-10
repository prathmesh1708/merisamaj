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

// GET /api/v1/head/family-requests?status=pending|approved|rejected|all
// Local Heads see their city's requests awaiting the Local Head stage;
// Community Heads see every request in their community.
exports.getRequests = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const baseFilter = { isRemoved: false, relationToHead: { $ne: 'Self' } };
    if (status !== 'all') baseFilter.approvalStatus = status;

    const level = familyService.reviewerLevel(req.user);
    // Pending queue for a Local Head = only requests still waiting on the Local Head stage
    if (level === 'local' && status === 'pending') baseFilter['approvals.localHead.status'] = 'pending';

    // Scopes to the reviewer's community, and to their city for Local Heads
    const filter = applyScopeFilter(req, baseFilter);
    const data = await familyService.listRequests(req.user, filter);

    res.status(200).json({
      success: true,
      reviewerLevel: level,
      count: data.length,
      data: data.map(r => ({
        id: r._id,
        memberCode: r.memberCode,
        familyCode: r.familyId?.familyCode || '',
        name: r.name,
        relationToHead: r.relationToHead === 'Relative' && r.relationNote ? r.relationNote : r.relationToHead,
        gender: r.gender,
        dob: r.dob,
        phone: r.phone,
        city: r.city,
        maritalStatus: r.maritalStatus,
        occupation: r.occupation,
        addedBy: r.addedBy ? { id: r.addedBy._id, name: r.addedBy.name, phone: r.addedBy.phone, avatar: r.addedBy.avatar } : null,
        linkedUser: r.userId ? { id: r.userId._id, name: r.userId.name, phone: r.userId.phone } : null,
        linkStatus: r.linkStatus,
        activityStatus: familyService.activityStatusOf(r),
        approvalStatus: r.approvalStatus,
        approvals: r.approvals,
        createdAt: r.createdAt
      }))
    });
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
    const [activeMembers, inactiveRecords, totalFamilies, pendingRequests] = await Promise.all([
      User.countDocuments(applyScopeFilter(req, { accountStatus: { $ne: 'deleted' } })), // same base as the census
      FamilyMember.find(recordFilter).select('phone approvalStatus').lean(),
      Family.countDocuments(applyScopeFilter(req, { status: 'active' })),
      FamilyMember.countDocuments(applyScopeFilter(req, { isRemoved: false, approvalStatus: 'pending', relationToHead: { $ne: 'Self' } }))
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
