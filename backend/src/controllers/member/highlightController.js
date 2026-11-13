const Highlight = require('../../models/Highlight');
const Story = require('../../models/Story');
const { uploadDataUri } = require('../../utils/uploadDataUri');

// @desc    Get user highlights (or specific member's highlights)
// @route   GET /api/v1/member/social/highlights
// @access  Private
exports.getUserHighlights = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;

    const highlights = await Highlight.find({
      authorId: targetUserId,
      isDeleted: false
    })
      .populate('storyIds')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: highlights
    });
  } catch (error) {
    console.error('getUserHighlights error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching highlights' });
  }
};

// @desc    Get current user's past and active stories for selecting highlight items
// @route   GET /api/v1/member/social/highlights/past-stories
// @access  Private
exports.getPastStoriesForHighlight = async (req, res) => {
  try {
    const stories = await Story.find({
      userId: req.user._id,
      isDeleted: false
    })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('getPastStoriesForHighlight error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching past stories' });
  }
};

// @desc    Create a new highlight
// @route   POST /api/v1/member/social/highlights
// @access  Private
exports.createHighlight = async (req, res) => {
  try {
    const { title, coverImage, storyIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Highlight title is required' });
    }

    if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one story must be selected' });
    }

    // Verify all selected stories belong to current user
    const validStories = await Story.find({
      _id: { $in: storyIds },
      userId: req.user._id,
      isDeleted: false
    }).select('_id media');

    if (validStories.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid stories selected' });
    }

    let defaultCover = coverImage || validStories[0].media;
    try {
      defaultCover = await uploadDataUri(defaultCover, 'merisamaj/highlights', 'auto');
    } catch (uploadErr) {
      console.error('Highlight cover upload failed:', uploadErr.message);
      return res.status(502).json({ success: false, message: 'Could not upload highlight cover. Please try again.' });
    }

    const highlight = await Highlight.create({
      authorId: req.user._id,
      communityId: req.user.communityId,
      title: title.trim(),
      coverImage: defaultCover,
      storyIds: validStories.map(s => s._id)
    });

    const populated = await Highlight.findById(highlight._id).populate('storyIds');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (error) {
    console.error('createHighlight error:', error);
    res.status(500).json({ success: false, message: 'Server error creating highlight' });
  }
};

// @desc    Delete a highlight
// @route   DELETE /api/v1/member/social/highlights/:id
// @access  Private
exports.deleteHighlight = async (req, res) => {
  try {
    const highlight = await Highlight.findOne({
      _id: req.params.id,
      authorId: req.user._id
    });

    if (!highlight) {
      return res.status(404).json({ success: false, message: 'Highlight not found' });
    }

    highlight.isDeleted = true;
    await highlight.save();

    res.json({
      success: true,
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    console.error('deleteHighlight error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting highlight' });
  }
};
