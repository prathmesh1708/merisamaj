const mongoose = require('mongoose');
const Voting = require('../../models/Voting');
const { notifyElectionCreated } = require('../../services/notificationService');
const { ADMIN_ROLES, findEligibleUsers, deriveStatus, idOf, roleKeyOf } = require('../../utils/electionEngine');
const { electionAnalytics, isLocalLevel } = require('../../utils/electionAdmin');

// Admin: any election. Head: elections of their community. Local Head / Sub-Head: only
// elections for their own city (or ones they created), never another location's.
const findManageable = async (req) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return null;
  const election = await Voting.findById(req.params.id);
  if (!election) return null;
  if (ADMIN_ROLES.includes((req.user?.role || '').toLowerCase())) return election;

  const mine = new Set([req.communityId, req.user?.communityId, ...(req.user?.assignedCommunityIds || [])].map(idOf).filter(Boolean));
  const inCommunity = mine.has(idOf(election.communityId));
  if (!inCommunity) return null;

  if (isLocalLevel(req.user)) {
    const city = (req.user.city || '').trim().toLowerCase();
    const cities = (election.targetCities || []).map(c => c.trim().toLowerCase());
    const legacyCity = (election.targetCity || election.city || '').trim().toLowerCase();
    const mineCreated = idOf(election.createdBy) === idOf(req.user._id);
    if (!(mineCreated || cities.includes(city) || legacyCity === city)) return null;
  }
  return election;
};

exports.getAnalytics = async (req, res) => {
  try {
    const election = await findManageable(req);
    if (!election) return res.status(404).json({ status: 'error', message: 'Election not found or access denied' });
    res.status(200).json({ status: 'success', data: await electionAnalytics(election) });
  } catch (error) {
    console.error('election analytics error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load analytics' });
  }
};

// Declare the result now instead of waiting for the scheduled result time.
exports.declareResult = async (req, res) => {
  try {
    const election = await findManageable(req);
    if (!election) return res.status(404).json({ status: 'error', message: 'Election not found or access denied' });
    const status = deriveStatus(election);
    if (!['ResultPending', 'ResultDeclared'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Voting must be closed before declaring results.' });
    }
    if (status === 'ResultDeclared') {
      return res.status(200).json({ status: 'success', message: 'Result already declared', data: election });
    }
    election.resultsPublished = true;
    election.resultDate = new Date();
    await election.save();

    const eligible = await findEligibleUsers(election);
    notifyElectionCreated(eligible.map(u => u._id), election.title, election._id, {
      message: `Results for "${election.title}" have been declared. Tap to view.`
    });
    res.status(200).json({ status: 'success', message: 'Result declared', data: election });
  } catch (error) {
    console.error('declareResult error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to declare result' });
  }
};

exports.cancelElection = async (req, res) => {
  try {
    const election = await findManageable(req);
    if (!election) return res.status(404).json({ status: 'error', message: 'Election not found or access denied' });
    election.status = 'Cancelled';
    election.cancelledAt = new Date();
    election.cancelledBy = req.user._id;
    await election.save();
    res.status(200).json({ status: 'success', message: 'Election cancelled', data: election });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to cancel election' });
  }
};

// Reopen a cancelled election as an unpublished draft so it can be fixed and republished.
exports.reopenElection = async (req, res) => {
  try {
    const election = await findManageable(req);
    if (!election) return res.status(404).json({ status: 'error', message: 'Election not found or access denied' });
    if (election.status !== 'Cancelled') {
      return res.status(400).json({ status: 'error', message: 'Only cancelled elections can be reopened.' });
    }
    election.status = 'Upcoming';
    election.isPublished = false;
    election.notifiedAt = undefined;
    election.cancelledAt = undefined;
    await election.save();
    res.status(200).json({ status: 'success', message: 'Election reopened as draft', data: election });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to reopen election' });
  }
};
