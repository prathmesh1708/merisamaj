const mongoose = require('mongoose');
const Voting = require('../../models/Voting');
const Vote = require('../../models/Vote');
const {
  ADMIN_ROLES, isEligible, deriveStatus, resultAtOf, findEligibleUsers, idOf
} = require('../../utils/electionEngine');

const NULL_ID = '000000000000000000000000';

const userCommunityObjectIds = (req) => {
  const ids = new Set();
  [req.communityId, req.user?.communityId, ...(req.user?.assignedCommunityIds || [])].forEach(c => {
    const i = idOf(c);
    if (i && mongoose.Types.ObjectId.isValid(i)) ids.add(i);
  });
  return [...ids].map(i => new mongoose.Types.ObjectId(i));
};

// Shape one election for the voter. Counts and winners are only included once
// the result has been declared, so nothing leaks while voting is open.
const formatElection = async (election, req, voteDoc) => {
  const status = deriveStatus(election);
  const base = {
    id: String(election._id),
    _id: String(election._id),
    title: election.title,
    description: election.description,
    bannerImage: election.bannerImage || '',
    category: election.category,
    communityName: election.communityId?.name || '',
    location: (election.targetCities || []).join(', ') || election.targetCity || election.city || '',
    startDate: election.startDate,
    endDate: election.endDate,
    resultDate: resultAtOf(election),
    status,
    candidateCount: (election.candidates || []).filter(c => c.isActive !== false).length,
    hasVoted: !!voteDoc,
    userVotedCandidateId: voteDoc ? String(voteDoc.candidateId) : null
  };

  const candidates = (election.candidates || [])
    .filter(c => c.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(c => ({
      id: String(c._id), _id: String(c._id),
      name: c.name, initials: c.initials, avatar: c.avatar || '',
      position: c.position || '', location: c.location || '',
      profession: c.profession || '', shortIntro: c.shortIntro || '', bio: c.bio || '',
      manifesto: c.manifesto || [], experience: c.experience || '', education: c.education || '', age: c.age
    }));

  if (status !== 'ResultDeclared') return { ...base, candidates };

  const counts = await Vote.aggregate([
    { $match: { voting: election._id } },
    { $group: { _id: '$candidateId', count: { $sum: 1 } } }
  ]);
  const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
  const total = counts.reduce((s, c) => s + c.count, 0);
  const eligibleVoters = (await findEligibleUsers(election)).length;
  const withVotes = candidates.map(c => ({
    ...c,
    votes: countMap[c.id] || 0,
    percentage: total > 0 ? Math.round(((countMap[c.id] || 0) / total) * 1000) / 10 : 0
  }));
  const top = Math.max(0, ...withVotes.map(c => c.votes));
  return {
    ...base,
    candidates: withVotes,
    result: {
      totalVotes: total,
      eligibleVoters,
      turnoutPercentage: eligibleVoters > 0 ? Math.round((total / eligibleVoters) * 1000) / 10 : 0,
      winners: top > 0 ? withVotes.filter(c => c.votes === top).map(c => c.id) : [],
      declaredAt: resultAtOf(election)
    }
  };
};

/**
 * Every published election the signed-in user is eligible for, newest first.
 * Eligibility is evaluated once, in electionEngine, from role + community + location.
 */
exports.getVotings = async (req, res) => {
  try {
    const isAdmin = ADMIN_ROLES.includes((req.user?.role || '').toLowerCase());
    let filter = { isPublished: { $ne: false }, status: { $ne: 'Cancelled' } };

    if (!isAdmin) {
      const commIds = userCommunityObjectIds(req);
      filter.$or = [
        { communityId: { $in: commIds } },
        { targetCommunityIds: { $in: commIds } },
        { communityId: null },
        { communityId: { $exists: false } },
        { communityId: new mongoose.Types.ObjectId(NULL_ID) }
      ];
    } else if (req.query.communityId) {
      filter.communityId = req.query.communityId;
    }

    const elections = await Voting.find(filter).populate('communityId', 'name').sort({ createdAt: -1 });
    const eligible = elections.filter(e => isEligible(e, req.user, req.communityId));

    const votes = await Vote.find({ user: req.user._id, voting: { $in: eligible.map(e => e._id) } }).lean();
    const voteByElection = Object.fromEntries(votes.map(v => [String(v.voting), v]));

    const data = await Promise.all(eligible.map(e => formatElection(e, req, voteByElection[String(e._id)])));
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('Error fetching votings:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch votings' });
  }
};

exports.getVotingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ status: 'error', message: 'Election not found' });
    }
    const election = await Voting.findById(req.params.id).populate('communityId', 'name');
    if (!election || election.isPublished === false || election.status === 'Cancelled') {
      return res.status(404).json({ status: 'error', message: 'Election not found' });
    }
    if (!isEligible(election, req.user, req.communityId)) {
      return res.status(403).json({ status: 'error', message: 'You are not eligible for this election.' });
    }
    const voteDoc = await Vote.findOne({ voting: election._id, user: req.user._id }).lean();
    res.status(200).json({ status: 'success', data: await formatElection(election, req, voteDoc) });
  } catch (error) {
    console.error('Error fetching voting:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch voting' });
  }
};

/**
 * Cast a vote. Every rule is enforced here, not in the UI: eligibility, open
 * window, valid candidate and one vote per user (also backed by a unique index).
 */
exports.castVote = async (req, res) => {
  try {
    const { candidateId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid election or candidate' });
    }
    const election = await Voting.findById(req.params.id);
    if (!election || election.isPublished === false || election.status === 'Cancelled') {
      return res.status(404).json({ status: 'error', message: 'Election not found' });
    }
    if (ADMIN_ROLES.includes((req.user?.role || '').toLowerCase())) {
      return res.status(403).json({ status: 'error', message: 'Administrators cannot vote.' });
    }
    if (!isEligible(election, req.user, req.communityId)) {
      return res.status(403).json({ status: 'error', message: 'You are not eligible to vote in this election.' });
    }
    if (deriveStatus(election) !== 'Active') {
      return res.status(400).json({ status: 'error', message: 'Voting is not open for this election.' });
    }
    const candidate = election.candidates.id(candidateId);
    if (!candidate || candidate.isActive === false) {
      return res.status(400).json({ status: 'error', message: 'Invalid candidate' });
    }
    if (await Vote.exists({ voting: election._id, user: req.user._id })) {
      return res.status(400).json({ status: 'error', message: 'You have already voted in this election.' });
    }

    const communityId = idOf(election.communityId) && idOf(election.communityId) !== NULL_ID
      ? election.communityId
      : (req.communityId || req.user?.communityId?._id || req.user?.communityId);
    if (!communityId) {
      return res.status(403).json({ status: 'error', message: 'User is not assigned to a community' });
    }

    await Vote.create({ user: req.user._id, voting: election._id, candidateId, communityId });

    try {
      const io = req.app.get('io');
      if (io) io.emit('vote:cast', { votingId: String(election._id) });
    } catch (e) { /* realtime is best-effort */ }

    res.status(201).json({
      status: 'success',
      message: 'Your vote has been successfully recorded.',
      data: { votingId: String(election._id), resultDate: resultAtOf(election) }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'You have already voted in this election.' });
    }
    console.error('Error casting vote:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cast vote' });
  }
};
