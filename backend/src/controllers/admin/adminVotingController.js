const Voting = require('../../models/Voting');
const Vote = require('../../models/Vote');
const mongoose = require('mongoose');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');
const { createBroadcastNotification } = require('../../services/notificationService');

// GET /api/v1/admin/voting — Platform-wide list of elections and polls with filters
exports.getAllElections = async (req, res) => {
  try {
    const { status, search } = req.query;

    const baseFilter = {};
    if (status && status !== 'all' && status !== 'All') {
      baseFilter.status = status;
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
        type: elec.type || 'Community Election',
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
        community: comm.name || 'Samaj Community',
        communityId: comm._id || elec.communityId || null,
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

// PATCH /api/v1/admin/voting/:id/status — Update election status ('Upcoming', 'Active', 'Completed', 'Closed')
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
      { $set: { status } },
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
