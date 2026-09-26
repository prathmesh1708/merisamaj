const Post = require('../../models/Post');
const Community = require('../../models/Community');

// @desc    Get City Feed — all posts across the platform, grouped/filterable by author's city
// @route   GET /api/v1/admin/social/city-feed
// @query   city (optional exact city name filter), page, limit, search
// @access  Private/Admin
exports.getCityFeedPosts = async (req, res) => {
  try {
    const { city, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status === 'deleted') {
      filter.isDeleted = true;
    } else if (status === 'all') {
      // return both active and deleted
    } else {
      filter.isDeleted = { $ne: true };
    }
    filter.feedType = { $ne: 'community' };

    if (search && search.trim()) {
      filter.content = new RegExp(search.trim(), 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);

    const postsQuery = Post.find(filter)
      .populate('authorId', 'name avatar city community communityId')
      .populate('userId', 'name avatar city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    let posts = await postsQuery;

    // Resolve author city / community city safely
    posts = posts.map((p) => {
      const authorDoc = p.authorId || p.userId;
      const resolvedCity = p.cityId?.name || authorDoc?.city || p.communityId?.city || 'Unknown';
      return {
        ...p,
        authorId: authorDoc,
        resolvedCity,
      };
    });

    if (city && city.trim() && city !== 'all') {
      posts = posts.filter(
        (p) => p.resolvedCity.toLowerCase() === city.trim().toLowerCase()
      );
    }

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      success: true,
      count: posts.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: posts,
    });
  } catch (error) {
    console.error('getCityFeedPosts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch city feed posts' });
  }
};

// @desc    Get Community Feed — all posts across the platform, filterable by community
// @route   GET /api/v1/admin/social/community-feed
// @query   communityId (optional filter), page, limit, search
// @access  Private/Admin
exports.getCommunityFeedPosts = async (req, res) => {
  try {
    const { communityId, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status === 'deleted') {
      filter.isDeleted = true;
    } else if (status === 'all') {
      // return both active and deleted
    } else {
      filter.isDeleted = { $ne: true };
    }
    filter.feedType = 'community';

    if (communityId && communityId.trim() && communityId !== 'undefined' && communityId !== 'all') {
      filter.communityId = communityId.trim();
    }
    if (search && search.trim()) {
      filter.content = new RegExp(search.trim(), 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);

    const posts = await Post.find(filter)
      .populate('authorId', 'name avatar city community communityId')
      .populate('userId', 'name avatar city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const mappedPosts = posts.map((p) => {
      const authorDoc = p.authorId || p.userId;
      const resolvedCity = p.cityId?.name || authorDoc?.city || p.communityId?.city || 'Unknown';
      return {
        ...p,
        authorId: authorDoc,
        resolvedCity,
      };
    });

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      success: true,
      count: mappedPosts.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: mappedPosts,
    });
  } catch (error) {
    console.error('getCommunityFeedPosts error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch community feed posts' });
  }
};

// @desc    List all communities (for the Community Feed filter dropdown)
// @route   GET /api/v1/admin/social/communities
// @access  Private/Admin
exports.getCommunitiesForFilter = async (req, res) => {
  try {
    const communities = await Community.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    })
      .select('name slug city')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({ status: 'success', success: true, data: communities });
  } catch (error) {
    console.error('getCommunitiesForFilter error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch communities' });
  }
};

// @desc    Delete a post (moderation action — admin only, e.g. spam/inappropriate content)
// @route   DELETE /api/v1/admin/social/posts/:id
// @access  Private/Admin
exports.deletePostByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'Post ID is required' });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    await Post.findByIdAndDelete(id);

    res.status(200).json({ status: 'success', success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePostByAdmin error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete post' });
  }
};
