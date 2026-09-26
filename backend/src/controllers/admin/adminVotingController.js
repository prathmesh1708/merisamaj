const Voting = require('../../models/Voting');
const Vote = require('../../models/Vote');
const Community = require('../../models/Community');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');
const { createBroadcastNotification } = require('../../services/notificationService');

// GET /api/v1/admin/voting — Platform-wide list of elections and polls with filters
exports.getAllElections = async (req, res) => {
  try {
    const { status, search, communityId } = req.query;

    const baseFilter = {};
    if (status && status !== 'all' && status !== 'All') {
      baseFilter.status = status;
    }

    if (communityId && communityId !== 'all') {
      baseFilter.communityId = communityId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      baseFilter.$or = [
        { title: regex },
        { description: regex },
        { type: regex }
      ];
    }

    // Apply scope filter (Admin bypasses community filter unless explicitly passed)
    const filter = applyScopeFilter(req, baseFilter);

    const elections = await Voting.find(filter)
      .populate('createdBy', 'name avatar role email phone')
      .populate('communityId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch total votes per election across all retrieved elections
    const electionIds = elections.map(e => e._id);
    const voteCounts = await Vote.aggregate([
      { $match: { voting: { $in: electionIds } } },
      { $group: { _id: '$voting', totalVotes: { $sum: 1 } } }
    ]);

    const voteCountMap = {};
    voteCounts.forEach(vc => {
      voteCountMap[vc._id.toString()] = vc.totalVotes;
    });

    const formatted = elections.map(elec => {
      const creator = elec.createdBy || {};
      const comm = elec.communityId || {};
      const totalVotesCast = voteCountMap[elec._id.toString()] || 0;

      return {
        id: elec._id,
        _id: elec._id,
        title: elec.title,
        description: elec.description,
        type: elec.type || 'Platform Election',
        category: elec.category || 'General',
        status: elec.status || 'Active',
        startDate: elec.startDate,
        endDate: elec.endDate,
        candidatesCount: Array.isArray(elec.candidates) ? elec.candidates.length : 0,
        candidates: elec.candidates || [],
        totalVotesCast,
        creator: {
          id: creator._id || creator.id || null,
          name: creator.name || 'Community Admin',
          initials: creator.name ? creator.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CA',
          email: creator.email || '',
          phone: creator.phone || ''
        },
        community: comm.name || (elec.targetAudience === 'ALL' || elec.scope === 'GLOBAL' ? 'All Communities (Global)' : 'Samaj Community'),
        communityId: comm._id || elec.communityId || null,
        targetAudience: elec.targetAudience || 'ALL',
        targetCity: elec.targetCity || elec.city || null,
        targetUsersCount: Array.isArray(elec.targetUsers) ? elec.targetUsers.length : 0,
        targetUsers: elec.targetUsers || [],
        createdAt: elec.createdAt || new Date()
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    console.error('Admin getAllElections Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/admin/voting/stats — Aggregate platform metrics for voting and polls
exports.getVotingStats = async (req, res) => {
  try {
    const filter = applyScopeFilter(req, {});
    if (req.query.communityId && req.query.communityId !== 'all') {
      filter.communityId = req.query.communityId;
    }

    const elections = await Voting.find(filter).lean();
    const electionIds = elections.map(e => e._id);

    const totalElections = elections.length;
    const activeElections = elections.filter(e => e.status === 'Active').length;
    const upcomingElections = elections.filter(e => e.status === 'Upcoming').length;
    const completedElections = elections.filter(e => e.status === 'Completed').length;
    const closedElections = elections.filter(e => e.status === 'Closed').length;

    let totalCandidates = 0;
    elections.forEach(e => {
      if (Array.isArray(e.candidates)) {
        totalCandidates += e.candidates.length;
      }
    });

    const totalVotesCast = await Vote.countDocuments({ voting: { $in: electionIds } });

    res.status(200).json({
      success: true,
      data: {
        totalElections,
        activeElections,
        upcomingElections,
        completedElections,
        closedElections,
        totalCandidates,
        totalVotesCast
      }
    });
  } catch (error) {
    console.error('Admin getVotingStats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/admin/voting/:id — Single election details with candidate vote tallies
exports.getElectionById = async (req, res) => {
  try {
    const election = await Voting.findById(req.params.id)
      .populate('createdBy', 'name avatar role email phone')
      .populate('communityId', 'name code')
      .populate('targetUsers', 'name phone city role avatar')
      .lean();

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election / Poll not found' });
    }

    // Aggregate votes per candidate for this election
    const candidateVoteCounts = await Vote.aggregate([
      { $match: { voting: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: '$candidateId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    candidateVoteCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    let totalVotes = 0;
    const candidatesWithVotes = (election.candidates || []).map(cand => {
      const votes = countMap[cand._id.toString()] || 0;
      totalVotes += votes;
      return {
        ...cand,
        votesCount: votes
      };
    });

    res.status(200).json({
      success: true,
      data: {
        ...election,
        candidates: candidatesWithVotes,
        totalVotesCast: totalVotes
      }
    });
  } catch (error) {
    console.error('Admin getElectionById Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/v1/admin/voting/:id/status — Update election status
exports.updateElectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Upcoming', 'Active', 'Completed', 'Closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const election = await Voting.findByIdAndUpdate(
      req.params.id,
      { $set: { status, ...(status === 'Closed' ? { resultsPublished: true } : {}) } },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election / Poll not found' });
    }

    // ── Broadcast notification to members about election status change ─────────────────────
    try {
      if (election.communityId) {
        createBroadcastNotification({
          communityId: election.communityId,
          module: 'voting',
          type: 'election_updated',
          title: `Election Status: ${status} 🗳️`,
          message: `The election "${election.title}" status has been updated to ${status}.`,
          icon: '🗳️',
          priority: 'normal',
          actionUrl: `/member/voting/${election._id}`,
          referenceId: election._id,
          referenceType: 'Voting'
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] Admin updateElectionStatus notification failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Election status updated to ${status}`,
      data: election
    });
  } catch (error) {
    console.error('Admin updateElectionStatus Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/admin/voting/target-options — Fetch targeting options (communities, cities, heads, local heads, sub heads, users)
exports.getTargetOptions = async (req, res) => {
  try {
    const [communities, users] = await Promise.all([
      Community.find({ isActive: { $ne: false } }).select('_id name city state code').sort({ name: 1 }).lean(),
      User.find({ accountStatus: { $ne: 'deleted' } })
        .select('_id name phone avatar role accountType subHeadType city state communityId')
        .populate('communityId', 'name')
        .lean()
    ]);

    const citiesSet = new Set();
    const communityHeads = [];
    const localHeads = [];
    const subHeads = [];
    const memberUsers = [];

    users.forEach(u => {
      if (u.city && u.city.trim()) {
        citiesSet.add(u.city.trim());
      }
      if (u.role === 'head') {
        communityHeads.push({
          id: u._id,
          _id: u._id,
          name: u.name,
          phone: u.phone,
          city: u.city || '',
          avatar: u.avatar || '',
          community: u.communityId?.name || '',
          communityId: u.communityId?._id || u.communityId || null,
          role: 'Community Head'
        });
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
          community: u.communityId?.name || '',
          communityId: u.communityId?._id || u.communityId || null,
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
          community: u.communityId?.name || '',
          communityId: u.communityId?._id || u.communityId || null,
          role: isLocalHeadUser ? 'Local Head' : 'Sub Head'
        });
      }

      if (u.role !== 'admin' && u.role !== 'super_admin') {
        memberUsers.push({
          id: u._id,
          _id: u._id,
          name: u.name,
          phone: u.phone,
          city: u.city || '',
          avatar: u.avatar || '',
          community: u.communityId?.name || '',
          communityId: u.communityId?._id || u.communityId || null,
          role: u.role
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        communities,
        cities: Array.from(citiesSet).sort(),
        communityHeads,
        localHeads,
        subHeads,
        users: memberUsers
      }
    });
  } catch (error) {
    console.error('Admin getTargetOptions Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/admin/voting — Admin creation of elections with audience & community targeting
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
      communityId,
      city,
      scope,
      targetAudience,
      targetCity,
      targetUsers
    } = req.body;

    if (!title || !description || !startDate || !endDate || !candidates || candidates.length < 2) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields and at least 2 candidates' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    const now = new Date();
    let initialStatus = 'Upcoming';
    if (start <= now && end > now) {
      initialStatus = 'Active';
    } else if (end <= now) {
      initialStatus = 'Completed';
    }

    const processedCandidates = candidates.map(c => {
      const initials = c.initials || (c.name && c.name.trim() ? c.name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C');
      const candData = { ...c, initials };
      if (candData.age === '' || candData.age === null || candData.age === undefined) {
        delete candData.age;
      }
      return candData;
    });

    let finalTargetAudience = targetAudience || 'ALL';
    let finalCity = targetCity || city || null;
    let finalCommunityId = communityId || null;
    let finalScope = 'GLOBAL';

    if (finalTargetAudience === 'SPECIFIC_COMMUNITY' || finalTargetAudience === 'ALL_MEMBERS') {
      finalScope = 'COMMUNITY';
    } else if (finalTargetAudience === 'COMMUNITY_LOCATION' || finalTargetAudience === 'USERS_BY_LOCATION' || finalTargetAudience === 'LOCAL_HEADS_BY_LOCATION' || finalTargetAudience === 'LOCAL_AND_SUB_HEADS_BY_LOCATION') {
      finalScope = 'LOCAL';
    } else if (finalTargetAudience === 'SPECIFIC_USERS') {
      finalScope = 'CUSTOM';
    } else if (['ALL', 'COMMUNITY_HEADS', 'LOCAL_HEADS', 'LOCAL_AND_SUB_HEADS'].includes(finalTargetAudience) && !finalCommunityId) {
      finalScope = 'GLOBAL';
      finalCommunityId = null; // platform-wide across all communities
    }

    const newVoting = await Voting.create({
      title,
      description,
      type: type || 'Platform Election',
      category: category || 'General',
      status: initialStatus,
      startDate: start,
      endDate: end,
      candidates: processedCandidates,
      communityId: finalCommunityId,
      city: finalCity,
      scope: finalScope,
      targetAudience: finalTargetAudience,
      targetCity: finalCity,
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
      createdBy: req.user._id
    });

    // Real-time broadcast
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('election:created', {
          _id: newVoting._id,
          id: newVoting._id.toString(),
          title: newVoting.title,
          targetAudience: finalTargetAudience,
          communityId: finalCommunityId ? finalCommunityId.toString() : null
        });
      }
    } catch (socketErr) {
      console.warn('[Socket.io] Admin election:created broadcast warning:', socketErr.message);
    }

    // Broadcast notifications to relevant members
    try {
      if (finalCommunityId) {
        createBroadcastNotification({
          communityId: finalCommunityId,
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
      }
    } catch (notifErr) {
      console.warn('[Notify] Admin createElection notification warning:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: newVoting
    });
  } catch (error) {
    console.error('Admin createElection Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create election' });
  }
};

// PUT /api/v1/admin/voting/:id — Admin update election
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
      communityId,
      city,
      targetAudience,
      targetCity,
      targetUsers,
      status
    } = req.body;

    const election = await Voting.findById(electionId);
    if (!election) {
      return res.status(404).json({ success: false, message: 'Election / Poll not found' });
    }

    const voteCount = await Vote.countDocuments({ voting: electionId });
    const hasVotes = voteCount > 0;

    if (title) election.title = title.trim();
    if (description) election.description = description.trim();
    if (type) election.type = type;
    if (category) election.category = category;
    if (status) election.status = status;
    if (communityId !== undefined) election.communityId = communityId || null;

    if (startDate) election.startDate = new Date(startDate);
    if (endDate) election.endDate = new Date(endDate);

    if (targetAudience) election.targetAudience = targetAudience;
    if (targetCity !== undefined || city !== undefined) {
      election.targetCity = targetCity || city || null;
      election.city = targetCity || city || null;
    }
    if (Array.isArray(targetUsers)) election.targetUsers = targetUsers;

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
    if (['USERS_BY_LOCATION', 'COMMUNITY_LOCATION', 'LOCAL_HEADS_BY_LOCATION', 'LOCAL_AND_SUB_HEADS_BY_LOCATION', 'ALL_LOCAL_USERS'].includes(election.targetAudience)) {
      election.scope = 'LOCAL';
    } else if (election.targetAudience === 'SPECIFIC_COMMUNITY' || (election.communityId && election.targetAudience === 'ALL_MEMBERS')) {
      election.scope = 'COMMUNITY';
    } else if (election.targetAudience === 'SPECIFIC_USERS') {
      election.scope = 'CUSTOM';
    } else {
      election.scope = election.communityId ? 'COMMUNITY' : 'GLOBAL';
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
      console.warn('[Socket.io] Admin election:updated broadcast warning:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Election updated successfully',
      data: election
    });
  } catch (error) {
    console.error('Admin updateElection Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/admin/voting/:id — Moderation deletion (removes election and associated vote records)
exports.deleteElection = async (req, res) => {
  try {
    const electionId = req.params.id;
    const election = await Voting.findByIdAndDelete(electionId);

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election / Poll not found' });
    }

    // Clean up vote records associated with this election
    await Vote.deleteMany({ voting: electionId });

    res.status(200).json({
      success: true,
      message: 'Election and related votes deleted successfully',
      data: { id: electionId }
    });
  } catch (error) {
    console.error('Admin deleteElection Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
