const Post = require('../../models/Post');
const Community = require('../../models/Community');
const User = require('../../models/User');
const City = require('../../models/City');

// @desc    Get City Feed — all posts across the platform, grouped/filterable by author's city
// @route   GET /api/v1/admin/social/city-feed
// @query   city (optional exact city name filter), page, limit, search
// @access  Private/Admin
exports.getCityFeedPosts = async (req, res) => {
  try {
    const { city, communityId, subCommunity, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status === 'deleted') {
      filter.isDeleted = true;
    } else if (status === 'all') {
      // return both active and deleted
    } else {
      filter.isDeleted = { $ne: true };
    }
    filter.feedType = { $ne: 'community' };

    const hasCommunityFilter = communityId && communityId !== 'all' && communityId !== 'undefined';
    const hasSubCommunityFilter = subCommunity && subCommunity !== 'all';
    const hasCityFilter = city && city.trim() && city !== 'all';
    if (hasCommunityFilter || hasSubCommunityFilter || hasCityFilter) {
      const authorFilter = {};
      if (hasCommunityFilter) authorFilter.communityId = communityId.trim();
      if (hasSubCommunityFilter) {
        const escapedSubCommunity = String(subCommunity).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        authorFilter.subCommunity = new RegExp(`^${escapedSubCommunity}$`, 'i');
      }
      if (hasCityFilter) {
        const escapedCity = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        authorFilter.city = new RegExp(`^${escapedCity}$`, 'i');
      }

      const authorIds = await User.distinct('_id', authorFilter);
      const scopeConditions = [
        { authorId: { $in: authorIds } },
        { userId: { $in: authorIds } }
      ];
      if (hasCommunityFilter && !hasSubCommunityFilter && !hasCityFilter) {
        scopeConditions.push({ communityId: communityId.trim() });
      }
      if (hasCityFilter && !hasCommunityFilter && !hasSubCommunityFilter) {
        const escapedCity = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const cityIds = await City.distinct('_id', { name: new RegExp(`^${escapedCity}$`, 'i'), isActive: { $ne: false } });
        if (cityIds.length) scopeConditions.push({ cityId: { $in: cityIds } });
      }
      filter.$and = [...(filter.$and || []), { $or: scopeConditions }];
    }

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
    const { communityId, subCommunity, city, status, search, page = 1, limit = 20 } = req.query;

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
    if ((subCommunity && subCommunity !== 'all') || (city && city !== 'all')) {
      const authorFilter = {};
      if (communityId && communityId !== 'all' && communityId !== 'undefined') {
        authorFilter.communityId = communityId.trim();
      }
      if (subCommunity && subCommunity !== 'all') {
        const escapedSubCommunity = String(subCommunity).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        authorFilter.subCommunity = new RegExp(`^${escapedSubCommunity}$`, 'i');
      }
      if (city && city !== 'all') {
        const escapedCity = String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        authorFilter.city = new RegExp(`^${escapedCity}$`, 'i');
      }
      const authorIds = await User.distinct('_id', authorFilter);
      const authorScopeConditions = [
        { authorId: { $in: authorIds } },
        { userId: { $in: authorIds } }
      ];
      if (city && city !== 'all' && !(subCommunity && subCommunity !== 'all')) {
        const cityRegex = new RegExp(`^${String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const cityIds = await City.distinct('_id', { name: cityRegex, isActive: { $ne: false } });
        if (cityIds.length) authorScopeConditions.push({ cityId: { $in: cityIds } });
      }
      filter.$and = [...(filter.$and || []), { $or: authorScopeConditions }];
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
      .select('name slug city cityIds subCommunities')
      .populate('cityIds', 'name state isActive')
      .populate('subCommunities.cityIds', 'name state isActive')
      .sort({ name: 1 })
      .lean();

    const communityIds = communities.map(community => community._id);
    const cityGroups = await User.aggregate([
      { $match: { communityId: { $in: communityIds }, city: { $exists: true, $nin: ['', null] } } },
      { $group: { _id: { communityId: '$communityId', subCommunity: '$subCommunity' }, cities: { $addToSet: '$city' } } }
    ]);
    const cityGroupsByCommunity = new Map();
    cityGroups.forEach(group => {
      const communityKey = String(group._id.communityId);
      if (!cityGroupsByCommunity.has(communityKey)) cityGroupsByCommunity.set(communityKey, []);
      cityGroupsByCommunity.get(communityKey).push({ subCommunity: group._id.subCommunity || '', cities: group.cities || [] });
    });

    const enrichedCommunities = communities.map(community => {
      const groups = cityGroupsByCommunity.get(String(community._id)) || [];
      const configuredCommunityCities = (community.cityIds || []).map(city => city?.name).filter(Boolean);
      const communityMemberCities = groups.flatMap(group => group.cities);
      const cityOptions = [...new Map([...configuredCommunityCities, ...(community.city ? [community.city] : []), ...communityMemberCities]
        .map(name => [String(name).toLowerCase(), { name }])).values()];
      return {
        ...community,
        cityOptions,
        subCommunities: (community.subCommunities || []).map(sub => {
          const subGroup = groups.find(group => String(group.subCommunity).toLowerCase() === String(sub.name).toLowerCase());
          const configuredSubCities = (sub.cityIds || []).map(city => city?.name).filter(Boolean);
          const subCities = subGroup?.cities || [];
          return {
            ...sub,
            cityOptions: [...new Map([...configuredSubCities, ...subCities]
              .map(name => [String(name).toLowerCase(), { name }])).values()]
          };
        })
      };
    });

    res.status(200).json({ status: 'success', success: true, data: enrichedCommunities });
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
