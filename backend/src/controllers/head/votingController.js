const Voting = require('../../models/Voting');
const Vote = require('../../models/Vote');
const Community = require('../../models/Community');
const User = require('../../models/User');
const { notifyElectionCreated, createBroadcastNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

// Helper to resolve the community ID for write/bind operations
const resolveCommunityId = async (req) => {
  let communityId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId);
  if (communityId) {
    return communityId;
  }
  
  if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
    const first = req.user.assignedCommunityIds[0];
    return first?._id || first;
  }
  
  if (req.user?.community) {
    const comm = await Community.findOne({ name: req.user.community });
    if (comm) return comm._id;
  }
  
  return null;
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
 * Get all elections for the Head's community (or Local Head's jurisdiction)
 */
exports.getElections = async (req, res) => {
  try {
    const rawCommId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId) || await resolveCommunityId(req);

    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);
    const isLocalHead = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || (userRole === 'sub_head' && req.user?.accountType !== 'head');
    const userCity = (req.user?.city || '').trim().toLowerCase();

    let query = {};
    if (!isAdmin) {
      if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
        query.communityId = { $in: req.user.assignedCommunityIds.map(c => c._id || c) };
      } else if (rawCommId) {
        query.communityId = rawCommId;
      }
    } else if (req.query.communityId) {
      query.communityId = req.query.communityId;
    }

    const votings = await Voting.find(query)
      .populate('createdBy', 'name avatar role accountType subHeadType city')
      .populate('communityId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Get vote counts for stats
    const matchStage = query.communityId ? { communityId: query.communityId } : {};
    const voteCounts = await Vote.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: {
          _id: { voting: "$voting", candidateId: "$candidateId" },
          count: { $sum: 1 }
      }}
    ]);

    const countsMap = {};
    voteCounts.forEach(vc => {
      const vId = vc._id.voting.toString();
      const cId = vc._id.candidateId.toString();
      if (!countsMap[vId]) countsMap[vId] = { total: 0 };
      countsMap[vId][cId] = vc.count;
      countsMap[vId].total += vc.count;
    });

    const formattedVotings = votings.map(v => {
      const vId = v._id.toString();
      const counts = countsMap[vId] || { total: 0 };
      
      const candidatesWithVotes = (v.candidates || []).map(c => ({
        ...c,
        id: c._id ? c._id.toString() : c.id,
        _id: c._id ? c._id.toString() : c.id,
        votes: counts[c._id ? c._id.toString() : c.id] || 0
      }));

      const effectiveStatus = deriveVotingStatus(v);
      const isCreator = req.user?._id && v.createdBy?._id && v.createdBy._id.toString() === req.user._id.toString();

      return {
        ...v,
        id: vId,
        _id: vId,
        status: effectiveStatus,
        totalVotes: counts.total,
        candidates: candidatesWithVotes,
        communityName: v.communityId?.name || '',
        isCreator,
        startDateFormatted: new Date(v.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endDateFormatted: new Date(v.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedVotings,
    });
  } catch (error) {
    console.error('Error fetching head elections:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch elections' });
  }
};

/**
 * Get targeting options for Head / Local Head (cities, local heads, sub heads, members)
 */
exports.getTargetOptions = async (req, res) => {
  try {
    const rawCommId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId) || await resolveCommunityId(req);

    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || (userRole === 'sub_head' && req.user?.accountType !== 'head');
    const userCity = (req.user?.city || '').trim();

    // Community info
    let communityName = '';
    if (rawCommId) {
      const commDoc = await Community.findById(rawCommId).select('name').lean();
      if (commDoc) communityName = commDoc.name;
    }

    // Community filter
    let commFilter = {};
    if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
      commFilter = { communityId: { $in: req.user.assignedCommunityIds.map(c => c._id || c) } };
    } else if (rawCommId) {
      commFilter = { communityId: rawCommId };
    }

    if (isLocalHead && userCity) {
      commFilter.city = new RegExp(`^${userCity}$`, 'i');
    }

    const users = await User.find({
      ...commFilter,
      accountStatus: { $ne: 'deleted' }
    })
      .select('_id name phone avatar role accountType subHeadType city state')
      .lean();

    const citiesSet = new Set();
    const localHeads = [];
    const subHeads = [];
    const members = [];

    users.forEach(u => {
      if (u.city && u.city.trim()) {
        citiesSet.add(u.city.trim());
      }
      
      const isSubHeadUser = u.role === 'sub_head' || u.accountType === 'local_head' || u.subHeadType === 'local' || u.subHeadType === 'community';
      const isLocalHeadUser = u.accountType === 'local_head' || u.subHeadType === 'local' || (u.role === 'sub_head' && !u.subHeadType);

      if (isLocalHeadUser) {
        localHeads.push({
          id: u._id,
          _id: u._id,
          name: u.name,
          phone: u.phone,
          city: u.city || '',
          avatar: u.avatar || '',
          role: 'Local Head'
        });
      }

      if (isSubHeadUser) {
        subHeads.push({
          id: u._id,
          _id: u._id,
          name: u.name,
          phone: u.phone,
          city: u.city || '',
          avatar: u.avatar || '',
          role: isLocalHeadUser ? 'Local Head' : 'Sub Head'
        });
      }

      members.push({
        id: u._id,
        _id: u._id,
        name: u.name,
        phone: u.phone,
        city: u.city || '',
        avatar: u.avatar || '',
        role: u.role
      });
    });

    res.status(200).json({
      status: 'success',
      data: {
        isLocalHead,
        userCity,
        communityName,
        communityId: rawCommId,
        cities: Array.from(citiesSet).sort(),
        localHeads,
        subHeads,
        members
      }
    });
  } catch (error) {
    console.error('Error fetching target options:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch targeting options' });
  }
};

/**
 * Create a new election
 */
exports.createElection = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      category,
      startDate, 
      endDate, 
      candidates, 
      city, 
      scope,
      targetAudience,
      targetCity,
      targetUsers 
    } = req.body;

    const communityId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId) || await resolveCommunityId(req);
    const createdBy = req.user._id;

    if (!communityId) {
      return res.status(400).json({ status: 'error', message: 'No valid community context found for creating election' });
    }

    if (!title || !description || !startDate || !endDate || !candidates || candidates.length < 2) {
      return res.status(400).json({ status: 'error', message: 'Please provide all required fields and at least 2 candidates' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ status: 'error', message: 'End date must be after start date' });
    }

    // Determine initial status based on date
    const now = new Date();
    let initialStatus = 'Upcoming';
    if (start <= now && end > now) {
      initialStatus = 'Active';
    } else if (end <= now) {
      initialStatus = 'Completed';
    }

    // Process candidates (generate initials if missing and handle empty age)
    const processedCandidates = candidates.map(c => {
      const initials = c.initials || (c.name && c.name.trim() ? c.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C');
      const candData = { ...c, initials };
      if (candData.age === '' || candData.age === null || candData.age === undefined) {
        delete candData.age;
      }
      return candData;
    });

    const isLocalHead = req.user?.accountType === 'local_head' || req.user?.subHeadType === 'local' || (req.user?.role === 'sub_head' && req.user?.accountType !== 'head');
    
    // Resolve target audience and location
    let finalTargetAudience = targetAudience || (isLocalHead ? 'ALL_LOCAL_USERS' : 'ALL_MEMBERS');
    let finalTargetCity = targetCity || city || (isLocalHead ? req.user?.city : null);
    let finalScope = scope || (finalTargetCity ? 'LOCAL' : 'COMMUNITY');

    if (['USERS_BY_LOCATION', 'LOCAL_HEADS_BY_LOCATION', 'LOCAL_AND_SUB_HEADS_BY_LOCATION', 'ALL_LOCAL_USERS', 'LOCAL_SUB_HEADS'].includes(finalTargetAudience)) {
      finalScope = 'LOCAL';
    } else if (finalTargetAudience === 'SPECIFIC_USERS') {
      finalScope = 'CUSTOM';
    }

    const newVoting = await Voting.create({
      title,
      description,
      type: type || 'Community Election',
      category: category || 'General',
      status: initialStatus,
      startDate: start,
      endDate: end,
      candidates: processedCandidates,
      communityId,
      city: finalTargetCity,
      scope: finalScope,
      targetAudience: finalTargetAudience,
      targetCity: finalTargetCity,
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
      createdBy
    });

    // ── Broadcast realtime socket event so members receive updates immediately ──
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('election:created', {
          _id: newVoting._id,
          id: newVoting._id.toString(),
          title: newVoting.title,
          communityId: communityId.toString(),
          targetAudience: finalTargetAudience,
          targetCity: finalTargetCity
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.io] election:created broadcast warning:', socketErr.message);
    }

    // ── Notification: notify targeted community members about new election ───────
    try {
      createBroadcastNotification({
        communityId,
        module: 'voting',
        type: 'election_created',
        title: 'New Election 🗳️',
        message: `A new election "${title}" has been launched. Cast your vote!`,
        icon: '🗳️',
        priority: 'high',
        actionUrl: `/member/voting/${newVoting._id}`,
        referenceId: newVoting._id,
        referenceType: 'Voting'
      });
    } catch (notifErr) {
      console.warn('[Notify] createElection election_created failed:', notifErr.message);
    }

    res.status(201).json({
      status: 'success',
      message: 'Election created successfully',
      data: newVoting
    });
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create election' });
  }
};

/**
 * Update / Edit an existing election
 */
exports.updateElection = async (req, res) => {
  try {
    const electionId = req.params.id;
    const {
      title,
      description,
      type,
      category,
      startDate,
      endDate,
      candidates,
      targetAudience,
      targetCity,
      targetUsers,
      status
    } = req.body;

    const rawCommId = req.communityId || (req.user?.communityId?._id || req.user?.communityId) || (req.user?.assignedCommunityId?._id || req.user?.assignedCommunityId) || await resolveCommunityId(req);
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = { _id: electionId };
    if (!isAdmin) {
      if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
        query.communityId = { $in: req.user.assignedCommunityIds.map(c => c._id || c) };
      } else if (rawCommId) {
        query.communityId = rawCommId;
      }
    }

    const election = await Voting.findOne(query);
    if (!election) {
      return res.status(404).json({ status: 'error', message: 'Election not found or access denied' });
    }

    // Check if votes already cast
    const voteCount = await Vote.countDocuments({ voting: electionId });
    const hasVotes = voteCount > 0;

    // Update allowable fields
    if (title) election.title = title.trim();
    if (description) election.description = description.trim();
    if (type) election.type = type;
    if (category) election.category = category;
    if (status) election.status = status;

    if (startDate) election.startDate = new Date(startDate);
    if (endDate) election.endDate = new Date(endDate);

    if (targetAudience) election.targetAudience = targetAudience;
    if (targetCity !== undefined) {
      election.targetCity = targetCity;
      election.city = targetCity;
    }
    if (Array.isArray(targetUsers)) election.targetUsers = targetUsers;

    // Candidates can only be replaced if no votes have been cast yet, or updated in place
    if (Array.isArray(candidates) && candidates.length >= 2) {
      if (!hasVotes) {
        election.candidates = candidates.map(c => {
          const initials = c.initials || (c.name && c.name.trim() ? c.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C');
          const candData = { ...c, initials };
          if (candData.age === '' || candData.age === null || candData.age === undefined) {
            delete candData.age;
          }
          return candData;
        });
      } else {
        // If votes exist, allow updating text (e.g. bio, name, profession) for existing candidate IDs without breaking vote foreign keys
        candidates.forEach(updatedCand => {
          if (updatedCand._id || updatedCand.id) {
            const candId = updatedCand._id || updatedCand.id;
            const existing = election.candidates.id(candId);
            if (existing) {
              if (updatedCand.name) existing.name = updatedCand.name;
              if (updatedCand.profession !== undefined) existing.profession = updatedCand.profession;
              if (updatedCand.shortIntro !== undefined) existing.shortIntro = updatedCand.shortIntro;
              if (updatedCand.bio !== undefined) existing.bio = updatedCand.bio;
              if (updatedCand.age !== undefined && updatedCand.age !== '') existing.age = updatedCand.age;
            }
          }
        });
      }
    }

    // Determine scope
    if (['USERS_BY_LOCATION', 'LOCAL_HEADS_BY_LOCATION', 'LOCAL_AND_SUB_HEADS_BY_LOCATION', 'ALL_LOCAL_USERS', 'LOCAL_SUB_HEADS'].includes(election.targetAudience)) {
      election.scope = 'LOCAL';
    } else if (election.targetAudience === 'SPECIFIC_USERS') {
      election.scope = 'CUSTOM';
    } else {
      election.scope = 'COMMUNITY';
    }

    await election.save();

    // Broadcast socket event
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('election:updated', {
          _id: election._id,
          id: election._id.toString(),
          title: election.title,
          status: election.status,
          communityId: election.communityId ? election.communityId.toString() : null
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.io] election:updated broadcast warning:', socketErr.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Election updated successfully',
      data: election
    });
  } catch (error) {
    console.error('Error updating election:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update election' });
  }
};

/**
 * Delete an election (Only if no votes cast or still upcoming)
 */
exports.deleteElection = async (req, res) => {
  try {
    const electionId = req.params.id;
    let query = {};
    if (req.user?.role === 'head' && req.user.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
      query = { _id: electionId, communityId: { $in: req.user.assignedCommunityIds } };
    } else {
      const communityId = await resolveCommunityId(req);
      if (!communityId) {
        return res.status(400).json({ status: 'error', message: 'No valid community context found' });
      }
      query = { _id: electionId, communityId };
    }

    const election = await Voting.findOne(query);
    if (!election) {
      return res.status(404).json({ status: 'error', message: 'Election not found' });
    }

    // Check if any votes exist
    const voteCount = await Vote.countDocuments({ voting: electionId });
    if (voteCount > 0) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete an election that already has votes.' });
    }

    if (election.status !== 'Upcoming' && election.status !== 'Draft') {
      return res.status(400).json({ status: 'error', message: 'Can only delete upcoming elections.' });
    }

    await Voting.deleteOne({ _id: electionId });

    res.status(200).json({
      status: 'success',
      message: 'Election deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting election:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete election' });
  }
};

/**
 * Manually close an election
 */
exports.closeElection = async (req, res) => {
  try {
    const electionId = req.params.id;
    let query = {};
    if (req.user?.role === 'head' && req.user.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
      query = { _id: electionId, communityId: { $in: req.user.assignedCommunityIds } };
    } else {
      const communityId = await resolveCommunityId(req);
      if (!communityId) {
        return res.status(400).json({ status: 'error', message: 'No valid community context found' });
      }
      query = { _id: electionId, communityId };
    }

    const election = await Voting.findOneAndUpdate(
      query,
      { status: 'Closed', resultsPublished: true },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ status: 'error', message: 'Election not found' });
    }

    // Broadcast Results Published Notification
    try {
      if (election.communityId) {
        createBroadcastNotification({
          communityId: election.communityId,
          module: 'voting',
          type: 'election_results_published',
          title: 'Election Results Published! 📊',
          message: `Results for election "${election.title}" have been officially published.`,
          icon: '📊',
          priority: 'high',
          actionUrl: `/member/voting/${election._id}`,
          referenceId: election._id,
          referenceType: 'Voting'
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] election_results_published broadcast notice:', notifErr.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Election closed and results published successfully',
      data: election
    });
  } catch (error) {
    console.error('Error closing election:', error);
    res.status(500).json({ status: 'error', message: 'Failed to close election' });
  }
};
