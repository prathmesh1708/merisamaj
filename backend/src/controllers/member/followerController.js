const mongoose = require('mongoose');
const Follower = require('../../models/Follower');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const UserNotification = require('../../models/UserNotification');
const cacheService = require('../../utils/cacheService');
const { adminRoles } = require('../../utils/queryScopeHelper');
const { isHiddenOnSocial } = require('../../services/socialVisibilityService');

// Sends the bell notification for a new follower or a follow request (non-blocking)
const notifyFollow = (followerId, followingId, isRequest) => {
  (async () => {
    try {
      const followerUser = await User.findById(followerId).select('name avatar');
      const followerName = followerUser?.name || 'Someone';

      await Notification.create({
        recipientId: followingId,
        senderId: followerId,
        type: 'follow',
        entityType: 'User',
        entityId: followerId
      });

      await UserNotification.create({
        userId: followingId,
        title: isRequest ? 'Follow Request 🔒' : 'New Follower 👤',
        message: isRequest
          ? `${followerName} wants to follow you. Accept the request to let them see your posts.`
          : `${followerName} has started following you.`,
        module: 'social',
        type: isRequest ? 'follow_request' : 'follow',
        data: { followerId, followerName, avatar: followerUser?.avatar },
        isRead: false
      });
    } catch (err) {
      console.warn('Follow notification creation error:', err.message);
    }
  })();
};

const followCounts = async (targetId, myId) => {
  const [targetFollowers, targetFollowing, myFollowers, myFollowing] = await Promise.all([
    Follower.countDocuments({ followingId: targetId, status: 'accepted' }),
    Follower.countDocuments({ followerId: targetId, status: 'accepted' }),
    Follower.countDocuments({ followingId: myId, status: 'accepted' }),
    Follower.countDocuments({ followerId: myId, status: 'accepted' })
  ]);
  return {
    targetStats: { followersCount: targetFollowers, followingCount: targetFollowing },
    myStats: { followersCount: myFollowers, followingCount: myFollowing }
  };
};

// @desc    Follow / request / unfollow / cancel request (toggle)
//          Public account  -> follow is accepted straight away.
//          Private account -> a pending request; the owner accepts or rejects it.
//          Calling again   -> unfollows, or cancels the pending request.
// @route   POST /api/v1/member/social/follow/:id
// @access  Private
exports.toggleFollow = async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user._id;

    if (!followingId || followingId === 'undefined' || followingId === 'null' || !mongoose.Types.ObjectId.isValid(followingId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }

    if (followingId.toString() === followerId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(followingId).select('_id role maritalStatus isPrivate');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existing = await Follower.findOne({ followerId, followingId });
    let status;

    if (existing && (existing.status === 'accepted' || existing.status === 'pending')) {
      // Unfollow, or withdraw a request that hasn't been answered yet
      await Follower.deleteOne({ _id: existing._id });
      status = existing.status === 'accepted' ? 'unfollowed' : 'cancelled';
    } else {
      // Non-married members can't be followed on Social (they are hidden there)
      if (isHiddenOnSocial(targetUser) && !adminRoles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'This profile is not available on Social.' });
      }
      if (existing && existing.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'You cannot follow this user.' });
      }

      status = targetUser.isPrivate ? 'pending' : 'accepted';
      if (existing) {
        // A previously rejected request can be sent again
        existing.status = status;
        await existing.save();
      } else {
        await Follower.create({ followerId, followingId, status });
      }
      notifyFollow(followerId, followingId, status === 'pending');
    }

    res.json({
      success: true,
      status,
      isFollowing: status === 'accepted',
      isRequested: status === 'pending',
      ...(await followCounts(followingId, followerId))
    });
  } catch (error) {
    console.error('toggleFollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    My follow relations (people I follow / requested, and people who follow / requested me)
// @route   GET /api/v1/member/social/follow-relations
// @access  Private
exports.getMyFollowRelations = async (req, res) => {
  try {
    const myId = req.user._id;
    const relations = await Follower.find({
      $or: [{ followerId: myId }, { followingId: myId }],
      status: { $in: ['accepted', 'pending'] }
    }).select('followerId followingId status').lean();

    res.json({
      success: true,
      data: relations.map(r => ({
        followerId: String(r.followerId),
        followingId: String(r.followingId),
        status: r.status
      }))
    });
  } catch (error) {
    console.error('getMyFollowRelations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Follow requests waiting for my answer
// @route   GET /api/v1/member/social/follow-requests
// @access  Private
exports.getFollowRequests = async (req, res) => {
  try {
    const requests = await Follower.find({ followingId: req.user._id, status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('followerId', 'name avatar role city community');

    res.json({
      success: true,
      data: requests.filter(r => r.followerId).map(r => ({
        requestedAt: r.createdAt,
        user: r.followerId
      }))
    });
  } catch (error) {
    console.error('getFollowRequests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Accept or reject a follow request
// @route   POST /api/v1/member/social/follow-requests/:followerId/accept | /reject
// @access  Private
const answerFollowRequest = (accept) => async (req, res) => {
  try {
    const { followerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }

    const request = await Follower.findOne({ followerId, followingId: req.user._id, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Follow request not found' });
    }

    if (accept) {
      request.status = 'accepted';
      await request.save();
      UserNotification.create({
        userId: followerId,
        title: 'Follow Request Accepted ✅',
        message: `${req.user.name || 'A member'} accepted your follow request.`,
        module: 'social',
        type: 'follow_accept',
        data: { userId: req.user._id, userName: req.user.name, avatar: req.user.avatar },
        isRead: false
      }).catch(err => console.warn('Follow accept notification error:', err.message));
    } else {
      // Deleting (not marking rejected) lets them send a new request later
      await Follower.deleteOne({ _id: request._id });
    }

    res.json({ success: true, status: accept ? 'accepted' : 'rejected' });
  } catch (error) {
    console.error('answerFollowRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.acceptFollowRequest = answerFollowRequest(true);
exports.rejectFollowRequest = answerFollowRequest(false);

// @desc    Remove someone from my followers
// @route   DELETE /api/v1/member/social/followers/:followerId
// @access  Private
exports.removeFollower = async (req, res) => {
  try {
    const { followerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(400).json({ success: false, message: 'Valid user ID is required' });
    }
    await Follower.deleteOne({ followerId, followingId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    console.error('removeFollower error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Make my account private or public
//          Switching to public accepts every pending request (as Instagram does).
// @route   PUT /api/v1/member/social/privacy   body: { isPrivate: boolean }
// @access  Private
exports.updatePrivacy = async (req, res) => {
  try {
    const isPrivate = req.body?.isPrivate === true || req.body?.isPrivate === 'true';
    await User.updateOne({ _id: req.user._id }, { $set: { isPrivate } });
    cacheService.del(`auth_user_${req.user._id}`);

    let acceptedRequests = 0;
    if (!isPrivate) {
      const result = await Follower.updateMany(
        { followingId: req.user._id, status: 'pending' },
        { $set: { status: 'accepted' } }
      );
      acceptedRequests = result.modifiedCount || 0;
    }

    res.json({ success: true, isPrivate, acceptedRequests });
  } catch (error) {
    console.error('updatePrivacy error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get followers list
// @route   GET /api/v1/member/social/users/:id/followers
// @access  Private
exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId || userId === 'undefined' || userId === 'null' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ success: true, data: [] });
    }

    const followers = await Follower.find({ followingId: userId, status: 'accepted' })
      .populate('followerId', 'name avatar role city community');

    res.json({ success: true, data: followers.map(f => f.followerId).filter(Boolean) });
  } catch (error) {
    console.error('getFollowers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get following list
// @route   GET /api/v1/member/social/users/:id/following
// @access  Private
exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId || userId === 'undefined' || userId === 'null' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.json({ success: true, data: [] });
    }

    const following = await Follower.find({ followerId: userId, status: 'accepted' })
      .populate('followingId', 'name avatar role city community');

    res.json({ success: true, data: following.map(f => f.followingId).filter(Boolean) });
  } catch (error) {
    console.error('getFollowing error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
