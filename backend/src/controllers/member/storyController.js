const Story = require('../../models/Story');
const StoryView = require('../../models/StoryView');
const StoryLike = require('../../models/StoryLike');
const Follower = require('../../models/Follower');
const City = require('../../models/City');

const getCityId = async (cityName) => {
  if (!cityName) return null;
  const cityDoc = await City.findOne({ name: new RegExp('^' + cityName.trim() + '$', 'i') });
  return cityDoc ? cityDoc._id : null;
};

// @desc    Get active, visible stories
// @route   GET /api/v1/member/social/stories
// @access  Private
exports.getStories = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get accepting following list
    const following = await Follower.find({ followerId: userId, status: 'accepted' });
    const followingUserIds = following.map(f => f.followingId);

    // Always include user's own stories
    followingUserIds.push(userId);

    const now = new Date();

    // Query active (non-expired) stories from followed users OR public/community stories in this community
    const stories = await Story.find({
      expiresAt: { $gt: now },
      $or: [
        { userId: { $in: followingUserIds } },
        { communityId: req.user.communityId, visibility: 'community' },
        { visibility: 'public' }
      ]
    })
    .populate('userId', 'name avatar role')
    .sort({ createdAt: -1 })
    .lean();

    // View / like counts for every story, plus whether *I* viewed / liked each one
    const ids = stories.map(s => s._id);
    const [viewCounts, likeCounts, myViews, myLikes] = await Promise.all([
      StoryView.aggregate([{ $match: { storyId: { $in: ids } } }, { $group: { _id: '$storyId', n: { $sum: 1 } } }]),
      StoryLike.aggregate([{ $match: { storyId: { $in: ids } } }, { $group: { _id: '$storyId', n: { $sum: 1 } } }]),
      StoryView.find({ storyId: { $in: ids }, userId }).select('storyId').lean(),
      StoryLike.find({ storyId: { $in: ids }, userId }).select('storyId').lean()
    ]);
    const toMap = (rows) => new Map(rows.map(r => [String(r._id), r.n]));
    const views = toMap(viewCounts), likes = toMap(likeCounts);
    const viewedSet = new Set(myViews.map(v => String(v.storyId)));
    const likedSet = new Set(myLikes.map(l => String(l.storyId)));

    // City-only stories are meant for the author's city, so hide them from other cities
    const myCityId = await getCityId(req.user.city);
    const isSameCity = (s) => Boolean(myCityId && s.cityId && String(s.cityId) === String(myCityId));
    const isMine = (s) => String(s.userId?._id || s.userId) === String(userId);
    const visibleStories = stories.filter(s => s.feedType !== 'city' || isMine(s) || isSameCity(s));

    const data = visibleStories.map(s => ({
      ...s,
      feedType: s.feedType || 'both',
      sameCity: isMine(s) || isSameCity(s),
      viewCount: views.get(String(s._id)) || 0,
      likeCount: likes.get(String(s._id)) || 0,
      viewedByMe: viewedSet.has(String(s._id)),
      likedByMe: likedSet.has(String(s._id))
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getStories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create a new story
// @route   POST /api/v1/member/social/stories
// @access  Private
exports.createStory = async (req, res) => {
  try {
    const { media, mediaType, text, textPosition, textStyle, background, visibility, feedType } = req.body;

    if (!media) {
      return res.status(400).json({ success: false, message: 'Media attachment is required' });
    }

    const cityId = await getCityId(req.user.city);

    const story = await Story.create({
      userId: req.user._id,
      communityId: req.user.communityId,
      cityId,
      media,
      mediaType: mediaType || 'image',
      text,
      textPosition: textPosition || { x: 50, y: 50 },
      textStyle: textStyle || {
        color: '#ffffff',
        fontSize: 'base',
        align: 'center',
        bgStyle: 'pill-dark'
      },
      background,
      visibility: visibility || 'community',
      feedType: ['city', 'community', 'both'].includes(feedType) ? feedType : 'both',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // strict 24 hours expiry
    });

    const populated = await Story.findById(story._id).populate('userId', 'name avatar role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('createStory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete story
// @route   DELETE /api/v1/member/social/stories/:id
// @access  Private
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Only owner can delete their story
    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Promise.all([
      Story.deleteOne({ _id: story._id }),
      StoryView.deleteMany({ storyId: story._id }),
      StoryLike.deleteMany({ storyId: story._id })
    ]);
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('deleteStory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Record unique view on story
// @route   POST /api/v1/member/social/stories/:id/view
// @access  Private
exports.viewStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    // The owner looking at their own story is not a "view"
    if (story.userId.toString() === userId.toString()) return res.json({ success: true });

    const viewLogged = await StoryView.findOne({ storyId, userId });
    if (!viewLogged) {
      await StoryView.create({ storyId, userId });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('viewStory error:', error);
    res.status(500).json({ success: false });
  }
};

// @desc    Like a story
// @route   POST /api/v1/member/social/stories/:id/like
// @access  Private
exports.likeStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    const alreadyLiked = await StoryLike.findOne({ storyId, userId });
    if (alreadyLiked) {
      await StoryLike.deleteOne({ _id: alreadyLiked._id });
    } else {
      await StoryLike.create({ storyId, userId });
    }
    const likeCount = await StoryLike.countDocuments({ storyId });
    res.json({ success: true, liked: !alreadyLiked, likeCount });
  } catch (error) {
    console.error('likeStory error:', error);
    res.status(500).json({ success: false });
  }
};

// @desc    Get story viewers (Only story owner can call)
// @route   GET /api/v1/member/social/stories/:id/viewers
// @access  Private
exports.getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    if (story.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Everyone who viewed (newest first), marked if they also liked; likers who
    // somehow have no view record are listed too.
    const [views, likes] = await Promise.all([
      StoryView.find({ storyId: story._id }).sort({ createdAt: -1 }).populate('userId', 'name avatar').lean(),
      StoryLike.find({ storyId: story._id }).populate('userId', 'name avatar').lean()
    ]);
    const likedIds = new Set(likes.map(l => String(l.userId?._id || l.userId)));
    const seen = new Set();
    const viewers = [];
    views.forEach(v => {
      if (!v.userId || seen.has(String(v.userId._id))) return;
      seen.add(String(v.userId._id));
      viewers.push({ _id: v.userId._id, name: v.userId.name, avatar: v.userId.avatar, liked: likedIds.has(String(v.userId._id)), viewedAt: v.createdAt });
    });
    likes.forEach(l => {
      if (!l.userId || seen.has(String(l.userId._id))) return;
      seen.add(String(l.userId._id));
      viewers.push({ _id: l.userId._id, name: l.userId.name, avatar: l.userId.avatar, liked: true, viewedAt: l.createdAt });
    });

    res.json({ success: true, data: viewers, viewCount: views.length, likeCount: likes.length });
  } catch (error) {
    console.error('getStoryViewers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
