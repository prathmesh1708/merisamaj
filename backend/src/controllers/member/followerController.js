const mongoose = require('mongoose');
const Follower = require('../../models/Follower');
const User = require('../../models/User');
const Notification = require('../../models/Notification');

// @desc    Follow/Unfollow user toggle
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

    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const alreadyFollowing = await Follower.findOne({ followerId, followingId });
    let isFollowing = false;

    if (alreadyFollowing) {
      await Follower.deleteOne({ _id: alreadyFollowing._id });
      isFollowing = false;
    } else {
      await Follower.create({
        followerId,
        followingId,
        status: 'accepted'
      });
      isFollowing = true;

      // Send Notifications (non-blocking)
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

          const UserNotification = require('../../models/UserNotification');
          await UserNotification.create({
            userId: followingId,
            title: 'New Follower 👤',
            message: `${followerName} has started following you.`,
            module: 'social',
            type: 'follow',
            data: { followerId, followerName, avatar: followerUser?.avatar },
            isRead: false
          });
        } catch (err) {
          console.warn('Follow notification creation error:', err.message);
        }
      })();
    }

    // Compute fresh real counts from DB for target user and logged-in user
    const [targetFollowers, targetFollowing, myFollowers, myFollowing] = await Promise.all([
      Follower.countDocuments({ followingId, status: 'accepted' }),
      Follower.countDocuments({ followerId: followingId, status: 'accepted' }),
      Follower.countDocuments({ followingId: followerId, status: 'accepted' }),
      Follower.countDocuments({ followerId, status: 'accepted' })
    ]);

    res.json({
      success: true,
      status: isFollowing ? 'accepted' : 'unfollowed',
      isFollowing,
      targetStats: { followersCount: targetFollowers, followingCount: targetFollowing },
      myStats: { followersCount: myFollowers, followingCount: myFollowing }
    });
  } catch (error) {
    console.error('toggleFollow error:', error);
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
