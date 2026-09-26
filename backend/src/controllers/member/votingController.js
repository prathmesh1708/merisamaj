const Voting = require('../../models/Voting');
const Vote = require('../../models/Vote');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

const ADMIN_ROLES = ['admin', 'super_admin', 'master_admin', 'master'];

// Helper to check if a voting election belongs to requester and matches audience criteria
const isUserEligibleForVoting = (doc, req) => {
  if (!doc) return false;
  const userRole = (req?.user?.role || '').toLowerCase();
  if (ADMIN_ROLES.includes(userRole)) return true; // Admin: global access

  const docCommId = doc.communityId?._id ? doc.communityId._id.toString() : (doc.communityId ? doc.communityId.toString() : null);
  const userCommIds = [];
  if (req?.communityId) userCommIds.push(req.communityId.toString());
  if (req?.user?.communityId) {
    const cId = req.user.communityId._id || req.user.communityId;
    if (cId) userCommIds.push(cId.toString());
  }
  if (Array.isArray(req?.user?.assignedCommunityIds)) {
    req.user.assignedCommunityIds.forEach(c => {
      const cId = c?._id || c;
      if (cId) userCommIds.push(cId.toString());
    });
  }

  // 1. Strict Community Isolation:
  // If the election is associated with a specific community, the member MUST belong to that community.
  if (docCommId) {
    if (!userCommIds.includes(docCommId)) {
      return false; // Member of another community can NEVER view or vote
    }
  } else {
    // If no communityId (Admin platform-wide), check if platform-level audience matches
    const isGlobalAudience = doc.scope === 'GLOBAL' || doc.targetAudience === 'ALL' || doc.targetAudience === 'COMMUNITY_HEADS' || doc.targetAudience === 'LOCAL_HEADS' || doc.targetAudience === 'LOCAL_AND_SUB_HEADS' || doc.targetAudience === 'SPECIFIC_USERS';
    if (!isGlobalAudience) return false;
  }

  // 2. Audience / Role / Location Targeting Criteria:
  const audience = doc.targetAudience || 'ALL_MEMBERS';
  if (audience === 'ALL_MEMBERS' || audience === 'ALL' || audience === 'SPECIFIC_COMMUNITY' || (doc.scope === 'GLOBAL' && !docCommId)) return true;

  const isHead = userRole === 'head';
  const isSubHead = userRole === 'sub_head' || req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || req.user?.subHeadType === 'community';
  const isLocalHead = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || (userRole === 'sub_head' && !req.user?.subHeadType);
  const userCity = (req.user?.city || '').trim().toLowerCase();
  const docCity = (doc.targetCity || doc.city || '').trim().toLowerCase();

  if (audience === 'COMMUNITY_HEADS') return isHead;
  
  if (audience === 'LOCAL_HEADS') return isLocalHead;
  
  if (audience === 'LOCAL_HEADS_BY_LOCATION') {
    return isLocalHead && (!docCity || docCity === userCity || docCity === 'all');
  }

  if (audience === 'LOCAL_AND_SUB_HEADS') {
    return isHead || isSubHead || isLocalHead;
  }

  if (audience === 'LOCAL_AND_SUB_HEADS_BY_LOCATION' || audience === 'LOCAL_SUB_HEADS') {
    return (isSubHead || isLocalHead || isHead) && (!docCity || docCity === userCity || docCity === 'all');
  }

  if (audience === 'USERS_BY_LOCATION' || audience === 'ALL_LOCAL_USERS' || audience === 'COMMUNITY_LOCATION') {
    return !docCity || docCity === userCity || docCity === 'all';
  }

  if (audience === 'SPECIFIC_USERS') {
    const uId = req.user?._id ? req.user._id.toString() : '';
    return Array.isArray(doc.targetUsers) && doc.targetUsers.some(tu => (tu?._id ? tu._id.toString() : tu.toString()) === uId);
  }

  return true;
};

/**
 * Derive election status dynamically based on start/end dates
 */
const deriveVotingStatus = (voting) => {
  if (!voting) return 'Upcoming';
  if (voting.status === 'Cancelled' || voting.status === 'Closed') return voting.status;
  const now = new Date();
  const start = new Date(voting.startDate);
  const end = new Date(voting.endDate);
  if (now < start) return 'Upcoming';
  if (now > end) return 'Completed';
  return 'Active';
};

/**
 * Get all votings for the user's community (or global for Admin)
 */
exports.getVotings = async (req, res) => {
  try {
    const rawCommId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId);
    const userId = req.user?._id;
    const userRole = (req.user?.role || '').toLowerCase();
    const isHeadRole = userRole === 'head';
    const isSubHeadRole = userRole === 'sub_head' || req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local';
    const isLocalHeadRole = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || (userRole === 'sub_head' && !req.user?.subHeadType);
    const userCity = (req.user?.city || '').trim().toLowerCase();
    const isAdmin = ADMIN_ROLES.includes(userRole);

    let query = {};
    if (!isAdmin) {
      const commIds = [];
      if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
        req.user.assignedCommunityIds.forEach(c => {
          const id = c?._id || c;
          if (id) commIds.push(id);
        });
      }
      if (rawCommId) commIds.push(rawCommId);

      const audienceConditions = [
        { targetAudience: { $in: ['ALL_MEMBERS', 'SPECIFIC_COMMUNITY', null, undefined] } },
        { targetAudience: { $exists: false } },
        { targetAudience: 'ALL' },
        { scope: 'GLOBAL' }
      ];

      if (isHeadRole) {
        audienceConditions.push({ targetAudience: 'COMMUNITY_HEADS' });
        audienceConditions.push({ targetAudience: 'LOCAL_AND_SUB_HEADS' });
      }

      if (isSubHeadRole || isLocalHeadRole) {
        audienceConditions.push({ targetAudience: 'LOCAL_HEADS' });
        audienceConditions.push({ targetAudience: 'LOCAL_AND_SUB_HEADS' });
        
        if (userCity) {
          audienceConditions.push({
            targetAudience: { $in: ['LOCAL_HEADS_BY_LOCATION', 'LOCAL_AND_SUB_HEADS_BY_LOCATION', 'LOCAL_SUB_HEADS'] },
            $or: [
              { targetCity: new RegExp(`^${userCity}$`, 'i') },
              { city: new RegExp(`^${userCity}$`, 'i') }
            ]
          });
        } else {
          audienceConditions.push({
            targetAudience: { $in: ['LOCAL_HEADS_BY_LOCATION', 'LOCAL_AND_SUB_HEADS_BY_LOCATION', 'LOCAL_SUB_HEADS'] }
          });
        }
      }

      if (userCity) {
        audienceConditions.push({
          targetAudience: { $in: ['USERS_BY_LOCATION', 'ALL_LOCAL_USERS', 'COMMUNITY_LOCATION'] },
          $or: [
            { targetCity: new RegExp(`^${userCity}$`, 'i') },
            { city: new RegExp(`^${userCity}$`, 'i') }
          ]
        });
      } else {
        audienceConditions.push({
          targetAudience: { $in: ['USERS_BY_LOCATION', 'ALL_LOCAL_USERS', 'COMMUNITY_LOCATION'] }
        });
      }

      if (userId) {
        audienceConditions.push({
          targetAudience: 'SPECIFIC_USERS',
          targetUsers: userId
        });
      }

      query = {
        $and: [
          {
            $or: [
              { communityId: { $in: commIds } },
              { communityId: { $in: [null, undefined] }, scope: 'GLOBAL' },
              { communityId: { $in: [null, undefined] }, targetAudience: { $in: ['ALL', 'COMMUNITY_HEADS', 'LOCAL_HEADS', 'LOCAL_AND_SUB_HEADS', 'SPECIFIC_USERS'] } }
            ]
          },
          { $or: audienceConditions }
        ]
      };
    } else if (req.query.communityId) {
      query.communityId = req.query.communityId;
    }

    const votings = await Voting.find(query)
      .populate('communityId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch user's votes to return which ones they've voted on
    const userVoteFilter = { user: req.user._id };
    if (query.communityId) {
      userVoteFilter.communityId = query.communityId;
    }
    const userVotes = await Vote.find(userVoteFilter).lean();
    const userVotedMap = userVotes.reduce((acc, vote) => {
      acc[vote.voting.toString()] = vote.candidateId;
      return acc;
    }, {});

    // Aggregate vote counts matching query.communityId if scoped
    const matchStage = query.communityId ? { communityId: query.communityId } : {};
    const voteCounts = await Vote.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: {
          _id: { voting: "$voting", candidateId: "$candidateId" },
          count: { $sum: 1 }
      }}
    ]);

    // Format vote counts: { votingId: { candidateId: count, total: sum } }
    const countsMap = {};
    voteCounts.forEach(vc => {
      const vId = vc._id.voting.toString();
      const cId = vc._id.candidateId.toString();
      if (!countsMap[vId]) countsMap[vId] = { total: 0 };
      countsMap[vId][cId] = vc.count;
      countsMap[vId].total += vc.count;
    });

    // Map to frontend expected structure
    const formattedVotings = votings.map(v => {
      const vId = v._id.toString();
      const counts = countsMap[vId] || { total: 0 };
      
      const candidatesWithVotes = (v.candidates || []).map(c => ({
        ...c,
        id: c._id ? c._id.toString() : c.id,
        _id: c._id ? c._id.toString() : c.id,
        initialVotes: counts[c._id ? c._id.toString() : c.id] || 0
      }));

      const effectiveStatus = deriveVotingStatus(v);

      return {
        ...v,
        id: vId,
        _id: vId,
        status: effectiveStatus,
        communityName: v.communityId?.name || '',
        startDate: new Date(v.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDate: new Date(v.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        closesIn: effectiveStatus === 'Completed' ? 'Ended' : effectiveStatus,
        totalVotesCast: counts.total,
        candidates: candidatesWithVotes,
        userVotedCandidateId: userVotedMap[vId] || null
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedVotings,
    });
  } catch (error) {
    console.error('Error fetching votings:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch votings' });
  }
};

/**
 * Get single voting by ID
 */
exports.getVotingById = async (req, res) => {
  try {
    const votingId = req.params.id;

    const voting = await Voting.findOne({ _id: votingId })
      .populate('communityId', 'name code')
      .lean();

    if (!voting) {
      return res.status(404).json({ status: 'error', message: 'Voting not found' });
    }

    // Eligibility Guard with Admin Bypass
    if (!isUserEligibleForVoting(voting, req)) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not in the targeted audience or community for this election.' });
    }

    const userVote = await Vote.findOne({ voting: votingId, user: req.user._id }).lean();

    const voteCounts = await Vote.aggregate([
      { $match: { voting: voting._id } },
      { $group: {
          _id: "$candidateId",
          count: { $sum: 1 }
      }}
    ]);

    let totalVotes = 0;
    const countsMap = {};
    voteCounts.forEach(vc => {
      countsMap[vc._id.toString()] = vc.count;
      totalVotes += vc.count;
    });

    const candidatesWithVotes = (voting.candidates || []).map(c => ({
      ...c,
      id: c._id ? c._id.toString() : c.id,
      _id: c._id ? c._id.toString() : c.id,
      initialVotes: countsMap[c._id ? c._id.toString() : c.id] || 0
    }));

    const effectiveStatus = deriveVotingStatus(voting);

    const formattedVoting = {
      ...voting,
      id: voting._id.toString(),
      _id: voting._id.toString(),
      status: effectiveStatus,
      communityName: voting.communityId?.name || '',
      startDate: new Date(voting.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      endDate: new Date(voting.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      closesIn: effectiveStatus === 'Completed' ? 'Ended' : effectiveStatus,
      totalVotesCast: totalVotes,
      candidates: candidatesWithVotes,
      userVotedCandidateId: userVote ? userVote.candidateId : null
    };

    res.status(200).json({
      status: 'success',
      data: formattedVoting,
    });
  } catch (error) {
    console.error('Error fetching voting:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch voting' });
  }
};

/**
 * Cast a vote
 */
exports.castVote = async (req, res) => {
  try {
    const votingId = req.params.id;
    const { candidateId } = req.body;
    const userId = req.user._id;
    const communityId = req.communityId || req.user?.communityId?._id || req.user?.communityId;

    if (!communityId) {
      return res.status(403).json({ status: 'error', message: 'User is not assigned to a community' });
    }

    const voting = await Voting.findOne({ _id: votingId });
    if (!voting) {
      return res.status(404).json({ status: 'error', message: 'Voting not found' });
    }

    // Community Isolation & Audience Eligibility Guard
    if (!isUserEligibleForVoting(voting, req)) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You are not eligible or not in the targeted audience for this election.' });
    }

    if (voting.communityId && voting.communityId.toString() !== communityId.toString()) {
      return res.status(403).json({ status: 'error', message: 'Access denied. You cannot vote in an election of another community.' });
    }

    const effectiveStatus = deriveVotingStatus(voting);
    if (effectiveStatus !== 'Active') {
      return res.status(400).json({ status: 'error', message: 'Voting is not active' });
    }

    const candidateExists = voting.candidates.id(candidateId);
    if (!candidateExists) {
      return res.status(400).json({ status: 'error', message: 'Invalid candidate' });
    }

    // Check if user already voted
    const existingVote = await Vote.findOne({ voting: votingId, user: userId });
    if (existingVote) {
      return res.status(400).json({ status: 'error', message: 'You have already voted in this election' });
    }

    const newVote = await Vote.create({
      user: userId,
      voting: votingId,
      candidateId,
      communityId
    });

    // Broadcast real-time Socket event to update live election Commission charts
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('vote:cast', { 
          votingId, 
          candidateId,
          communityId: communityId.toString()
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.io] vote:cast broadcast warning:', socketErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Vote cast successfully',
      data: newVote
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'You have already voted' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to cast vote' });
  }
};
