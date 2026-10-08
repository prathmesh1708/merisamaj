const User = require('../../models/User');
const familyService = require('../../services/familyService');

// req.user comes from a 60s auth cache — family writes need the live document
const loadUser = (req) => User.findById(req.user._id);

const handleError = (res, error) => {
  if (error instanceof familyService.FamilyError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error('[familyController]', error);
  return res.status(500).json({ success: false, message: error.message });
};

// GET /api/v1/member/family — my Family ID, my Member ID and the family members
exports.getMyFamily = async (req, res) => {
  try {
    const user = await loadUser(req);
    const [view, invitations] = await Promise.all([
      familyService.getFamilyView(user),
      familyService.listInvitations(user)
    ]);
    res.status(200).json({ success: true, data: { ...view, invitations: invitations.map(formatInvitation) } });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/v1/member/family/members — add a relative (goes to Local/Community Head for approval)
exports.addMember = async (req, res) => {
  try {
    const user = await loadUser(req);
    const record = await familyService.addMember(user, req.body);
    const view = await familyService.getFamilyView(user);
    res.status(201).json({
      success: true,
      message: record.linkStatus === 'invited'
        ? `${record.name} is registered on MeriSamaj — an invitation was sent. Approval is pending with your Samaj Head.`
        : `${record.name} added. Approval is pending with your Samaj Head.`,
      data: view
    });
  } catch (error) {
    handleError(res, error);
  }
};

// PUT /api/v1/member/family/members/:id
exports.updateMember = async (req, res) => {
  try {
    const user = await loadUser(req);
    await familyService.updateMember(user, req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Family member updated.', data: await familyService.getFamilyView(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// DELETE /api/v1/member/family/members/:id
exports.removeMember = async (req, res) => {
  try {
    const user = await loadUser(req);
    await familyService.removeMember(user, req.params.id);
    res.status(200).json({ success: true, message: 'Family member removed.', data: await familyService.getFamilyView(user) });
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/v1/member/family/invitations — families that added my mobile number
exports.getInvitations = async (req, res) => {
  try {
    const user = await loadUser(req);
    const invitations = await familyService.listInvitations(user);
    res.status(200).json({ success: true, data: invitations.map(formatInvitation) });
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/v1/member/family/invitations/:id/accept | /reject
exports.respondToInvitation = (accept) => async (req, res) => {
  try {
    const user = await loadUser(req);
    await familyService.respondToInvitation(user, req.params.id, accept);
    res.status(200).json({
      success: true,
      message: accept ? 'You are now linked to this family.' : 'Invitation declined.',
      data: await familyService.getFamilyView(user)
    });
  } catch (error) {
    handleError(res, error);
  }
};

const formatInvitation = (r) => ({
  id: r._id,
  familyCode: r.familyId?.familyCode || '',
  headName: r.familyId?.headUserId?.name || '',
  headAvatar: r.familyId?.headUserId?.avatar || null,
  addedByName: r.addedBy?.name || '',
  name: r.name,
  memberCode: r.memberCode,
  relationToHead: r.relationToHead === 'Relative' && r.relationNote ? r.relationNote : r.relationToHead,
  approvalStatus: r.approvalStatus,
  createdAt: r.createdAt
});
