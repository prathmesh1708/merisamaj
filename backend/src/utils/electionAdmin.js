const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const Voting = require('../models/Voting');
const UserNotification = require('../models/UserNotification');
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

// ─── Ballot confidentiality ──────────────────────────────────────────────────
// Candidate-wise numbers (votes, percentages, rankings, winners) exist only once the
// result is declared: voting has ended AND the result time has passed (or a manager
// declared/closed it early under the existing rules). Until then every API returns
// aggregate counts only. Who voted for whom is never returned to anyone.
const resultsVisible = (election, now = new Date()) => deriveStatus(election, now) === 'ResultDeclared';

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const cityKey = (c) => (c || '').toString().trim().toLowerCase() || 'unknown';

/**
 * Aggregate-only statistics, safe to show while voting is open:
 * total votes, eligible voters, participation, Samaj Nagar (city)-wise turnout and
 * how many recipients opened the election notification (unique users).
 */
const electionLiveStats = async (election) => {
  const status = deriveStatus(election);
  const eligible = await findEligibleUsers(election);

  // Every stored Vote is a valid, successfully submitted vote (castVote validates
  // and a unique index allows one per voter). Group by the voter's Samaj Nagar.
  const votesByCity = await Vote.aggregate([
    { $match: { voting: election._id } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'voter', pipeline: [{ $project: { city: 1 } }] } },
    { $group: { _id: { $ifNull: [{ $arrayElemAt: ['$voter.city', 0] }, ''] }, voted: { $sum: 1 } } }
  ]);

  const nagars = new Map();
  const nagar = (city) => {
    const key = cityKey(city);
    if (!nagars.has(key)) nagars.set(key, { name: (city || '').toString().trim() || 'Not specified', eligible: 0, voted: 0 });
    return nagars.get(key);
  };
  eligible.forEach(u => { nagar(u.city).eligible += 1; });
  let totalVotes = 0;
  votesByCity.forEach(v => { nagar(v._id).voted += v.voted; totalVotes += v.voted; });

  // Message views: unique recipients of the election notification who opened it
  const [views] = await UserNotification.aggregate([
    { $match: { referenceId: election._id, type: 'election_created' } },
    { $group: { _id: '$userId', opened: { $max: { $cond: ['$isRead', 1, 0] } } } },
    { $group: { _id: null, notified: { $sum: 1 }, viewed: { $sum: '$opened' } } }
  ]);

  return {
    electionId: idOf(election._id),
    title: election.title,
    status,
    startDate: election.startDate,
    endDate: election.endDate,
    resultDate: resultAtOf(election),
    eligibleVoters: eligible.length,
    totalVotes,
    notVoted: Math.max(0, eligible.length - totalVotes),
    participationPercentage: pct(totalVotes, eligible.length),
    bySamajNagar: [...nagars.values()]
      .map(n => ({ ...n, participationPercentage: pct(n.voted, n.eligible) }))
      .sort((a, b) => b.voted - a.voted || a.name.localeCompare(b.name)),
    messageViews: { notified: views?.notified || 0, viewed: views?.viewed || 0 },
    resultsAvailable: resultsVisible(election),
    generatedAt: new Date()
  };
};

/** Final candidate-wise results. Throws RESULTS_NOT_AVAILABLE until declared. */
const electionResults = async (election) => {
  if (!resultsVisible(election)) {
    const err = new Error(`Results will be available after ${resultAtOf(election).toISOString()}.`);
    err.status = 403;
    err.code = 'RESULTS_NOT_AVAILABLE';
    err.resultDate = resultAtOf(election);
    throw err;
  }
  const counts = await Vote.aggregate([
    { $match: { voting: election._id } },
    { $group: { _id: '$candidateId', votes: { $sum: 1 } } }
  ]);
  const countOf = Object.fromEntries(counts.map(c => [idOf(c._id), c.votes]));
  const totalVotes = counts.reduce((s, c) => s + c.votes, 0);
  const candidates = (election.candidates || [])
    .filter(c => c.isActive !== false)
    .map(c => ({
      id: idOf(c._id), name: c.name, initials: c.initials, avatar: c.avatar || '',
      position: c.position || '', profession: c.profession || '',
      votes: countOf[idOf(c._id)] || 0,
      percentage: pct(countOf[idOf(c._id)] || 0, totalVotes)
    }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  candidates.forEach((c, i) => { c.rank = i > 0 && c.votes === candidates[i - 1].votes ? candidates[i - 1].rank : i + 1; });
  const top = candidates[0]?.votes || 0;
  return {
    electionId: idOf(election._id),
    status: deriveStatus(election),
    declaredAt: resultAtOf(election),
    totalVotes,
    candidates,
    winners: top > 0 ? candidates.filter(c => c.votes === top).map(c => c.id) : []
  };
};

// Legacy /analytics: live statistics, plus candidate results only once declared.
const electionAnalytics = async (election) => {
  const stats = await electionLiveStats(election);
  const results = stats.resultsAvailable ? await electionResults(election) : null;
  return { ...stats, turnoutPercentage: stats.participationPercentage, results, candidates: results ? results.candidates : undefined };
};

/**
 * Store "Completed" on elections whose voting time has ended, so lists and admin
 * counts show the right status. Display/access decisions always use deriveStatus
 * (server clock), so an extended end date is honoured immediately.
 */
const syncElectionStatuses = () => Voting.updateMany(
  { status: { $in: ['Active', 'Upcoming'] }, isPublished: { $ne: false }, endDate: { $lt: new Date() } },
  { $set: { status: 'Completed' } }
).catch(err => console.warn('[Elections] status sync failed:', err.message));

let statusRunner = null;
const startElectionStatusRunner = () => {
  if (statusRunner) return;
  syncElectionStatuses();
  statusRunner = setInterval(syncElectionStatuses, 60 * 1000);
  statusRunner.unref?.();
};

// A published election must have at least one eligible voter.
const { findEligibleUsers: findEligible } = require('./electionEngine');
const hasNoVoters = async (electionDoc) =>
  electionDoc.isPublished !== false && electionDoc.status !== 'Cancelled' && (await findEligible(electionDoc)).length === 0;

module.exports = {
  electionFieldsFromBody, normaliseCandidates, publishAndNotify, electionAnalytics, isLocalLevel, hasNoVoters,
  resultsVisible, electionLiveStats, electionResults, syncElectionStatuses, startElectionStatusRunner
};
