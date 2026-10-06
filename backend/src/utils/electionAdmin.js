const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const { notifyElectionCreated } = require('../services/notificationService');
const { ROLE_KEYS, roleKeyOf, deriveStatus, resultAtOf, findEligibleUsers, idOf } = require('./electionEngine');

const isLocalLevel = (user) => ['local_head', 'local_sub_head'].includes(roleKeyOf(user));
const cleanIds = (arr) => (Array.isArray(arr) ? arr : []).map(idOf).filter(i => i && mongoose.Types.ObjectId.isValid(i));

/**
 * Reads the structured election fields from a request body.
 * A Local Head / Local Sub-Head can only run elections for their own city, whatever the client sends.
 */
const electionFieldsFromBody = (body, user) => {
  const fields = {};
  if (body.bannerImage !== undefined) fields.bannerImage = body.bannerImage;
  if (body.resultDate !== undefined) fields.resultDate = body.resultDate ? new Date(body.resultDate) : undefined;
  if (body.isPublished !== undefined) fields.isPublished = !!body.isPublished;
  if (Array.isArray(body.allowedRoles)) fields.allowedRoles = body.allowedRoles.filter(r => ROLE_KEYS.includes(r));
  if (Array.isArray(body.targetCities)) fields.targetCities = body.targetCities.map(c => String(c).trim()).filter(Boolean);
  if (Array.isArray(body.targetCommunityIds)) fields.targetCommunityIds = cleanIds(body.targetCommunityIds);
  if (Array.isArray(body.targetUsers)) fields.targetUsers = cleanIds(body.targetUsers);

  if (isLocalLevel(user) && user.city) {
    fields.targetCities = [user.city];
    fields.targetCommunityIds = [];
  }
  return fields;
};

// Candidates keep their order, and their initials are generated when missing.
const normaliseCandidates = (candidates) => (candidates || []).map((c, i) => {
  const initials = c.initials || (c.name && c.name.trim()
    ? c.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'C');
  const out = { ...c, initials, order: i };
  if (out.age === '' || out.age === null || out.age === undefined) delete out.age;
  if (!out.memberId || !mongoose.Types.ObjectId.isValid(out.memberId)) delete out.memberId;
  return out;
});

/**
 * When an election is published, notify exactly the users who are eligible for it
 * (same rule as the voter list) and tell any open apps to refresh. Runs once.
 */
const publishAndNotify = async (election, req) => {
  if (election.isPublished === false || election.status === 'Cancelled' || election.notifiedAt) return 0;
  const eligible = await findEligibleUsers(election);
  const creatorId = idOf(election.createdBy);
  const recipientIds = eligible.map(u => u._id).filter(id => idOf(id) !== creatorId);
  const deadline = new Date(election.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const where = (election.targetCities || []).join(', ');
  notifyElectionCreated(recipientIds, election.title, election._id, {
    message: `${election.title} is now open${where ? ` in ${where}` : ''}. Cast your vote before ${deadline}.`
  });
  election.notifiedAt = new Date();
  election.publishedAt = election.publishedAt || new Date();
  await election.save();
  try {
    const io = req.app.get('io');
    if (io) io.emit('election:created', { id: String(election._id), title: election.title });
  } catch (e) { /* best-effort */ }
  return recipientIds.length;
};

// Eligible voters vs votes, overall and by city. Individual votes are never exposed.
const electionAnalytics = async (election) => {
  const eligible = await findEligibleUsers(election);
  const eligibleIds = new Set(eligible.map(u => idOf(u._id)));
  const votes = await Vote.find({ voting: election._id }).select('user candidateId').lean();
  const cityOf = Object.fromEntries(eligible.map(u => [idOf(u._id), u.city || 'Unknown']));

  const candidateVotes = {};
  const byCity = {};
  eligible.forEach(u => {
    const c = u.city || 'Unknown';
    byCity[c] = byCity[c] || { city: c, eligible: 0, voted: 0 };
    byCity[c].eligible += 1;
  });
  votes.forEach(v => {
    candidateVotes[idOf(v.candidateId)] = (candidateVotes[idOf(v.candidateId)] || 0) + 1;
    const c = cityOf[idOf(v.user)];
    if (c && byCity[c]) byCity[c].voted += 1;
  });
  const totalVotes = votes.length;
  return {
    status: deriveStatus(election),
    resultDate: resultAtOf(election),
    eligibleVoters: eligible.length,
    totalVotes,
    notVoted: Math.max(0, eligible.length - votes.filter(v => eligibleIds.has(idOf(v.user))).length),
    turnoutPercentage: eligible.length ? Math.round((totalVotes / eligible.length) * 1000) / 10 : 0,
    candidates: (election.candidates || []).map(c => ({
      id: idOf(c._id), name: c.name, votes: candidateVotes[idOf(c._id)] || 0
    })),
    byLocation: Object.values(byCity)
  };
};

module.exports = { electionFieldsFromBody, normaliseCandidates, publishAndNotify, electionAnalytics, isLocalLevel };
