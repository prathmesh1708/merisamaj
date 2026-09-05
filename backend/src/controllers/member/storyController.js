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
    .sort({ createdAt: -1 });

    res.json({ success: true, data: stories });
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
    const { media, mediaType, text, textPosition, textStyle, background, visibility } = req.body;

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

    await Story.deleteOne({ _id: story._id });
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
      res.json({ success: true, liked: false });
    } else {
      await StoryLike.create({ storyId, userId });
      res.json({ success: true, liked: true });
    }
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

    const views = await StoryView.find({ storyId: story._id }).populate('userId', 'name avatar');
    res.json({ success: true, data: views.map(v => v.userId) });
  } catch (error) {
    console.error('getStoryViewers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
