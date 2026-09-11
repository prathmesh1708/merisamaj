const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const PostLike = require('../../models/PostLike');
const SavedPost = require('../../models/SavedPost');
const PostView = require('../../models/PostView');
const PostShare = require('../../models/PostShare');
const Notification = require('../../models/Notification');
const City = require('../../models/City');
const User = require('../../models/User');
const Community = require('../../models/Community');
const Follower = require('../../models/Follower');
const UserNotification = require('../../models/UserNotification');
const { findOrCreateConversation } = require('../../services/conversationService');
const { createMessage } = require('../../services/messageService');
const { notifyOfficialPost } = require('../../services/notificationService');
const { applyScopeFilter, inheritTenantPayload, adminRoles } = require('../../utils/queryScopeHelper');
const cloudinary = require('cloudinary').v2;
const config = require('../../config/config');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

// In-memory cache for resolved city string to cityId
const cityIdCache = new Map();

const getCityId = async (cityName) => {
  if (!cityName) return null;
  const trimmed = cityName.trim();
  const cacheKey = trimmed.toLowerCase();
  if (cityIdCache.has(cacheKey)) {
    return cityIdCache.get(cacheKey);
  }
  let cityDoc = await City.findOne({ name: new RegExp('^' + trimmed + '$', 'i') }).lean();
  if (!cityDoc) {
    try {
      cityDoc = await City.create({ name: trimmed });
    } catch (e) {
      cityDoc = await City.findOne({ name: new RegExp('^' + trimmed + '$', 'i') }).lean();
    }
  }
  const resultId = cityDoc ? cityDoc._id : null;
  if (resultId) {
    cityIdCache.set(cacheKey, resultId);
  }
  return resultId;
};

// Helper to verify if user has community access to a post
const verifyPostCommunityAccess = (req, post) => {
  if (adminRoles.includes(req.user?.role)) {
    return true;
  }
  const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
  const postCommId = (post?.communityId?._id || post?.communityId || '').toString();
  return !!(userCommId && postCommId && userCommId === postCommId);
};

// Helper to sanitize base64 data URIs from avatars to prevent 6MB+ payload bursts
const sanitizeUserAvatar = (u) => {
  if (!u) return u;
  if (typeof u.avatar === 'string' && u.avatar.startsWith('data:') && u.avatar.length > 2048) {
    u.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=6B21A8&color=fff`;
  }
  return u;
};

// Helper to extract raw ObjectIds for communityIds
const getCommunityIds = async (req) => {
  const ids = [];

  let primaryId = req.communityId || req.user?.communityId;
  if (primaryId && primaryId._id) primaryId = primaryId._id;
  if (primaryId) ids.push(primaryId);

  if (req.user?.assignedCommunityIds && Array.isArray(req.user.assignedCommunityIds)) {
    req.user.assignedCommunityIds.forEach(item => {
      const id = item._id ? item._id : item;
      if (id && !ids.some(existing => existing.toString() === id.toString())) {
        ids.push(id);
      }
    });
  }

  // Fallback: if user.communityId is missing, resolve by user.community string name
  if (ids.length === 0 && req.user?.community) {
    const commDoc = await Community.findOne({ name: new RegExp('^' + req.user.community.trim() + '$', 'i') });
    if (commDoc) ids.push(commDoc._id);
  }

  // Final fallback to default community if still empty
  if (ids.length === 0) {
    const defaultComm = await Community.findOne({});
    if (defaultComm) ids.push(defaultComm._id);
  }

  return ids;
};

// Legacy single community ID helper for backwards compatibility
const getCommunityId = (req) => {
  if (req.communityId) return req.communityId;
  if (req.user?.communityId) {
    return req.user.communityId._id ? req.user.communityId._id : req.user.communityId;
  }
  return null;
};

// @desc    Get Feed posts dynamically (2-Level Scope: Mandatory Community + Optional City)
// @route   GET /api/v1/member/social/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    const { feed, category, limit = 10, cursor } = req.query;

    // Base filter: active, non-deleted published posts
    let baseFilter = {
      status: 'published',
      isDeleted: false
    };

    // Category filter
    if (category) {
      baseFilter.category = category;
    }

    // Determine optional city filter
    let cityName = req.query.city;
    if (feed === 'city' && (!cityName || cityName === 'all' || cityName === 'All')) {
      cityName = req.user?.city;
    }

    // Apply Centralized 2-Level Multi-Tenancy Scope (Community mandatory)
    const filter = applyScopeFilter(req, baseFilter);

    // Resolve cityId for city feed queries
    if (feed === 'city' && cityName && cityName !== 'all' && cityName !== 'All') {
      const cityId = await getCityId(cityName);
      if (cityId) {
        filter.cityId = cityId;
      }
    }

    // Handle feed-type specific sub-filter within the community
    if (feed === 'community') {
      filter.feedType = { $in: ['community', 'both'] };
    } else if (feed === 'city') {
      filter.feedType = { $in: ['city', 'both'] };
    }

    // Cursor Pagination (O(1) database keyset scans)
    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(filter)
      .populate('userId', 'name avatar role city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(Number(limit) + 1)
      .lean();

    const hasMore = posts.length > Number(limit);
    if (hasMore) {
      posts.pop();
    }

    // Look up whether the logged-in user liked or saved these posts
    const postIds = posts.map(p => p._id);
    const [likes, saves] = await Promise.all([
      PostLike.find({ postId: { $in: postIds }, userId: req.user._id }).lean(),
      SavedPost.find({ postId: { $in: postIds }, userId: req.user._id }).lean()
    ]);

    const likedPostIds = new Set(likes.map(l => l.postId.toString()));
    const savedPostIds = new Set(saves.map(s => s.postId.toString()));

    const formattedPosts = posts.map(p => {
      const author = sanitizeUserAvatar(p.userId);
      return {
        ...p,
        userId: author,
        authorId: p.authorId || author,
        isLiked: likedPostIds.has(p._id.toString()),
        isSaved: savedPostIds.has(p._id.toString())
      };
    });

    res.json({
      success: true,
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt : null
    });
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single post by ID
// @route   GET /api/v1/member/social/posts/:id
// @access  Private
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
      .populate('userId', 'name avatar role');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Verify community matches
    if (!['admin', 'super_admin', 'master_admin', 'master'].includes(req.user?.role)) {
      const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
      const postCommId = (post.communityId?._id || post.communityId || '').toString();
      if (!userCommId || !postCommId || userCommId !== postCommId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const [likeDoc, saveDoc] = await Promise.all([
      PostLike.findOne({ postId: post._id, userId: req.user._id }),
      SavedPost.findOne({ postId: post._id, userId: req.user._id })
    ]);

    res.json({
      success: true,
      data: {
        ...post.toObject(),
        isLiked: !!likeDoc,
        isSaved: !!saveDoc
      }
    });
  } catch (error) {
    console.error('getPostById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper to fan-out notifications to community members who follow announcements
const dispatchAnnouncementNotifications = async (communityId, author, postCategory, contentPreview, postId) => {
  try {
    if (!communityId) return;
    const subscribers = await User.find({
      communityId,
      _id: { $ne: author._id },
      accountStatus: 'active',
      isBlocked: { $ne: true },
      'notificationPreferences.announcements': { $ne: false }
    }).select('_id').lean();

    if (subscribers && subscribers.length > 0) {
      const subscriberIds = subscribers.map(s => s._id);
      await notifyOfficialPost(
        subscriberIds,
        postCategory,
        author.name || 'Community Admin',
        contentPreview,
        postId,
        communityId
      );
    }
  } catch (err) {
    console.error('[AnnouncementNotification] Failed to notify subscribers:', err.message);
  }
};

// @desc    Create proper social post
// @route   POST /api/v1/member/social/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content, category, media = [], location } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // 1. Guaranteed City Resolution
    const locationCity = (location && location.trim()) || req.user.city || 'Indore';
    let cityId = await getCityId(locationCity);
    if (!cityId) {
      cityId = await getCityId('Indore');
    }

    // 2. Tenant Payload Inheritance & Verification
    const tenantPayload = inheritTenantPayload(req, {
      content: content.trim(),
      category: category || 'Notice',
      feedType: req.body.feedType || 'city',
      status: 'published'
    });

    if (!tenantPayload.communityId) {
      return res.status(400).json({ success: false, message: 'User is not assigned to any community' });
    }
    const targetCommunityId = tenantPayload.communityId;

    // 3. Format Media structures safely (validate enum types and providers)
    const validMedia = [];
    if (Array.isArray(media) && media.length > 0) {
      for (const m of media) {
        if (!m || !m.url) continue;
        let type = m.type || 'image';
        let provider = m.provider || 'external';
        let url = m.url;

        // Skip unhandled browser blob URLs if upload failed to avoid broken media links
        if (url.startsWith('blob:')) {
          try {
            const uploadRes = await cloudinary.uploader.upload(url, {
              folder: 'merisamaj_social',
              resource_type: type === 'video' ? 'video' : 'auto'
            });
            url = uploadRes.secure_url;
            provider = 'upload';
          } catch (err) {
            console.warn('Cloudinary upload skipped for blob URL:', err.message);
            // Ignore raw un-uploaded blob: URLs to avoid database schema rejection
            continue;
          }
        } else if (url.startsWith('data:')) {
          try {
            const uploadRes = await cloudinary.uploader.upload(url, {
              folder: 'merisamaj_social',
              resource_type: type === 'video' ? 'video' : 'auto'
            });
            url = uploadRes.secure_url;
            provider = 'upload';
          } catch (err) {
            console.warn('Cloudinary upload error for data URI:', err.message);
          }
        }

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          type = 'youtube';
          provider = 'youtube';
        } else if (url.includes('instagram.com/')) {
          type = 'instagram';
          provider = 'instagram';
        } else if (url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video') || (url.includes('res.cloudinary.com') && url.includes('/video/'))) {
          type = 'video';
          provider = url.includes('cloudinary') ? 'upload' : 'external';
        } else if (url.includes('cloudinary')) {
          provider = 'upload';
        }

        const validTypes = ['image', 'video', 'gif', 'youtube', 'instagram'];
        const validProviders = ['upload', 'youtube', 'instagram', 'external'];

        validMedia.push({
          type: validTypes.includes(type) ? type : 'image',
          url,
          thumbnail: m.thumbnail,
          duration: m.duration,
          width: m.width,
          height: m.height,
          provider: validProviders.includes(provider) ? provider : 'external'
        });
      }
    }

    const requestedFeedType = req.body.feedType;

    if (requestedFeedType === 'both') {
      const cityPost = await Post.create({
        userId: req.user._id,
        authorId: req.user._id,
        communityId: targetCommunityId,
        cityId,
        content: content.trim(),
        category: category || 'Notice',
        media: validMedia,
        images: validMedia.map(m => m.url),
        feedType: 'city',
        status: 'published'
      });

      const communityPost = await Post.create({
        userId: req.user._id,
        authorId: req.user._id,
        communityId: targetCommunityId,
        cityId,
        content: content.trim(),
        category: category || 'Notice',
        media: validMedia,
        images: validMedia.map(m => m.url),
        feedType: 'community',
        status: 'published'
      });

      const populatedCity = await Post.findById(cityPost._id)
        .populate('userId', 'name avatar role city community communityId')
        .populate('communityId', 'name slug city')
        .populate('cityId', 'name')
        .lean();

      const populatedCommunity = await Post.findById(communityPost._id)
        .populate('userId', 'name avatar role city community communityId')
        .populate('communityId', 'name slug city')
        .populate('cityId', 'name')
        .lean();

      if (category === 'Announcement' || category === 'Emergency') {
        dispatchAnnouncementNotifications(
          targetCommunityId,
          req.user,
          category,
          content.trim(),
          populatedCommunity._id
        );
      }

      if (populatedCity) {
        populatedCity.userId = sanitizeUserAvatar(populatedCity.userId);
        populatedCity.authorId = populatedCity.authorId || populatedCity.userId;
      }
      if (populatedCommunity) {
        populatedCommunity.userId = sanitizeUserAvatar(populatedCommunity.userId);
        populatedCommunity.authorId = populatedCommunity.authorId || populatedCommunity.userId;
      }

      return res.status(201).json({
        success: true,
        data: populatedCity,
        posts: [populatedCity, populatedCommunity]
      });
    }

    const post = await Post.create({
      userId: req.user._id,
      authorId: req.user._id,
      communityId: targetCommunityId,
      cityId,
      content: content.trim(),
      category: category || 'Notice',
      media: validMedia,
      images: validMedia.map(m => m.url),
      feedType: requestedFeedType || 'city',
      status: 'published'
    });

    const populated = await Post.findById(post._id)
      .populate('userId', 'name avatar role city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name')
      .lean();

    if (populated) {
      populated.userId = sanitizeUserAvatar(populated.userId);
      populated.authorId = populated.authorId || populated.userId;
    }

    if (category === 'Announcement' || category === 'Emergency') {
      dispatchAnnouncementNotifications(
        targetCommunityId,
        req.user,
        category,
        content.trim(),
        populated._id
      );
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating post' });
  }
};

// @desc    Toggle unique like on a post
// @route   POST /api/v1/member/social/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const alreadyLiked = await PostLike.findOne({ postId, userId });

    if (alreadyLiked) {
      await PostLike.deleteOne({ _id: alreadyLiked._id });
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
      res.json({ success: true, liked: false });
    } else {
      await PostLike.create({ postId, userId });
      await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

      // Create notification for author
      if (post.userId.toString() !== userId.toString()) {
        await Notification.create({
          recipientId: post.userId,
          senderId: userId,
          type: 'like',
          entityType: 'Post',
          entityId: postId
        });
      }

      res.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('toggleLike error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get comments for a post
// @route   GET /api/v1/member/social/posts/:id/comments
// @access  Private
exports.getComments = async (req, res) => {
  try {
    const { parentCommentId } = req.query;

    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const filter = {
      postId: req.params.id
    };

    if (parentCommentId !== undefined) {
      filter.parentCommentId = parentCommentId || null;
    }

    const comments = await Comment.find(filter)
      .populate('userId', 'name avatar')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('getComments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add comment to a post
// @route   POST /api/v1/member/social/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text, parentCommentId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const comment = await Comment.create({
      postId,
      userId: req.user._id,
      parentCommentId: parentCommentId || null,
      text: text.trim()
    });

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const populated = await Comment.findById(comment._id).populate('userId', 'name avatar');

    // Create Notification
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment && parentComment.userId && parentComment.userId.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipientId: parentComment.userId,
          senderId: req.user._id,
          type: 'reply',
          entityType: 'Comment',
          entityId: comment._id
        }).catch(err => console.warn('Reply notification error:', err.message));
      }
    } else {
      const postOwnerId = post.userId || post.authorId;
      if (postOwnerId && postOwnerId.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipientId: postOwnerId,
          senderId: req.user._id,
          type: 'comment',
          entityType: 'Post',
          entityId: postId
        }).catch(err => console.warn('Comment notification error:', err.message));
      }
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle like for a comment
// @route   POST /api/v1/member/social/comments/:id/like
// @access  Private
exports.toggleCommentLike = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const likedIndex = (comment.likes || []).findIndex(id => id.toString() === userId.toString());
    let isLiked = false;

    if (likedIndex > -1) {
      comment.likes.splice(likedIndex, 1);
    } else {
      comment.likes.push(userId);
      isLiked = true;
    }

    comment.likesCount = comment.likes.length;
    await comment.save();

    res.status(200).json({
      success: true,
      data: {
        isLiked,
        likesCount: comment.likesCount
      }
    });
  } catch (error) {
    console.error('toggleCommentLike error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle save post
// @route   POST /api/v1/member/social/posts/:id/save
// @access  Private
exports.toggleSave = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const alreadySaved = await SavedPost.findOne({ postId, userId });

    if (alreadySaved) {
      await SavedPost.deleteOne({ _id: alreadySaved._id });
      res.json({ success: true, saved: false });
    } else {
      await SavedPost.create({ postId, userId });
      res.json({ success: true, saved: true });
    }
  } catch (error) {
    console.error('toggleSave error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Record unique view metrics on a post
// @route   POST /api/v1/member/social/posts/:id/view
// @access  Private
exports.recordView = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { duration } = req.body;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!verifyPostCommunityAccess(req, post)) return res.status(403).json({ success: false, message: 'Access denied' });

    const viewLogged = await PostView.findOne({ postId, userId });
    let currentViews = post.viewsCount || 0;

    if (!viewLogged) {
      await PostView.create({ postId, userId, duration });
      const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { viewsCount: 1 } }, { new: true });
      currentViews = updatedPost?.viewsCount || (currentViews + 1);
    }

    res.json({ success: true, viewsCount: currentViews });
  } catch (error) {
    console.error('recordView error:', error);
    res.status(500).json({ success: false });
  }
};

// @desc    Track post share counts
// @route   POST /api/v1/member/social/posts/:id/share
// @access  Private
exports.recordShare = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { platform } = req.body;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (!verifyPostCommunityAccess(req, post)) return res.status(403).json({ success: false, message: 'Access denied' });

    await PostShare.create({ postId, userId, platform: platform || 'copy_link' });
    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });

    res.json({ success: true });
  } catch (error) {
    console.error('recordShare error:', error);
    res.status(500).json({ success: false });
  }
};

// @desc    Get community members with connection status for sharing
// @route   GET /api/v1/member/social/share-recipients
// @access  Private
exports.getShareRecipients = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { search } = req.query;

    const baseFilter = {
      accountStatus: { $ne: 'deleted' },
      _id: { $ne: currentUserId }
    };
    const filter = applyScopeFilter(req, baseFilter);

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { profession: { $regex: q, $options: 'i' } }
      ];
    }

    const [members, followRecords] = await Promise.all([
      User.find(filter)
        .select('name avatar city profession role verificationStatus isPrivate')
        .sort({ name: 1 })
        .limit(100)
        .lean(),
      Follower.find({
        $or: [
          { followerId: currentUserId },
          { followingId: currentUserId }
        ]
      }).lean()
    ]);

    // Build lookup maps for fast access
    const followingMap = new Map(); // targetId -> status
    const followerMap = new Map();  // sourceId -> status

    for (const rel of followRecords) {
      if (rel.followerId && rel.followerId.toString() === currentUserId.toString()) {
        followingMap.set(rel.followingId.toString(), rel.status);
      }
      if (rel.followingId && rel.followingId.toString() === currentUserId.toString()) {
        followerMap.set(rel.followerId.toString(), rel.status);
      }
    }

    const recipients = members.map(m => {
      const mid = m._id.toString();
      const followStatus = followingMap.get(mid);
      const isFollowedByThem = followerMap.get(mid) === 'accepted';
      const isFollowing = followStatus === 'accepted';
      const isPending = followStatus === 'pending';
      const isConnected = isFollowing || isFollowedByThem;

      return {
        _id: m._id,
        id: m._id,
        name: m.name,
        avatar: m.avatar,
        city: m.city,
        profession: m.profession,
        role: m.role,
        verificationStatus: m.verificationStatus,
        isPrivate: !!m.isPrivate,
        isFollowing,
        isFollower: isFollowedByThem,
        isPending,
        isConnected
      };
    });

    // Sort: Connected members first, then others alphabetically
    recipients.sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      data: recipients
    });
  } catch (error) {
    console.error('getShareRecipients error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Share a post directly to another community member via 1-to-1 chat & notification
// @route   POST /api/v1/member/social/posts/:id/share-to-user
// @access  Private
exports.sharePostToUser = async (req, res) => {
  try {
    const postId = req.params.id;
    const senderId = req.user._id;
    const { recipientId, note } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required' });
    }

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot share a post with yourself' });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false }).populate('userId', 'name avatar');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied to post' });
    }

    const recipient = await User.findOne({ _id: recipientId, accountStatus: { $ne: 'deleted' } }).select('name avatar communityId');
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found' });
    }

    // Check same community
    const myCommId = req.user.communityId?._id || req.user.communityId;
    const theirCommId = recipient.communityId?._id || recipient.communityId;
    if (!myCommId || !theirCommId || myCommId.toString() !== theirCommId.toString()) {
      return res.status(403).json({ success: false, message: 'Can only share with members of your community' });
    }

    // 1. Find or create 1-to-1 conversation
    const { conversation } = await findOrCreateConversation(senderId, recipientId, 'member');

    // 2. Prepare message text
    const clientUrl = process.env.CLIENT_URL || req.get('origin') || 'http://localhost:5173';
    const postUrl = `${clientUrl}/member/social/${postId}`;
    const postSnippet = post.title || (post.content ? post.content.substring(0, 100) : 'Check out this post');
    
    let messageText = '';
    if (note && note.trim()) {
      messageText = `${note.trim()}\n\nShared a post:\n"${postSnippet}"\n${postUrl}`;
    } else {
      messageText = `Shared a post with you:\n"${postSnippet}"\n${postUrl}`;
    }

    // 3. Create Message in conversation
    const populatedMsg = await createMessage({
      conversationId: conversation._id,
      senderId,
      type: 'text',
      message: messageText,
      metadata: {
        sharedPostId: post._id,
        postTitle: post.title || '',
        postSnippet,
        postMedia: post.media?.[0]?.url || post.image || null,
        authorName: post.userId?.name || 'Member',
        postUrl
      }
    });

    // 4. Emit real-time Socket.IO events if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversation._id}`).emit('chat:new_message', populatedMsg);
      io.to(`user:${recipientId.toString()}`).emit('chat:new_message', populatedMsg);
    }

    // 5. Trigger in-app UserNotification
    try {
      await UserNotification.create({
        userId: recipientId,
        title: `${req.user.name} shared a post with you 📢`,
        message: post.title || (post.content ? `"${post.content.substring(0, 60)}..."` : 'Check out this post'),
        module: 'social',
        type: 'post_share',
        actionUrl: `/member/social/${postId}`,
        data: {
          postId: post._id,
          conversationId: conversation._id,
          senderId,
          senderName: req.user.name,
          senderAvatar: req.user.avatar
        },
        isRead: false
      });
    } catch (notifErr) {
      console.warn('Share notification warning:', notifErr.message);
    }

    // 6. Record PostShare and increment sharesCount
    await PostShare.create({
      postId,
      userId: senderId,
      platform: 'internal',
      sharedWithUserId: recipientId
    });
    await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });

    res.json({
      success: true,
      message: 'Post shared successfully',
      data: {
        conversationId: conversation._id,
        message: populatedMsg
      }
    });
  } catch (error) {
    console.error('sharePostToUser error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Search social posts / tags
// @route   GET /api/v1/member/social/search
// @access  Private
exports.searchSocial = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }

    const baseFilter = {
      status: 'published',
      isDeleted: false,
      $text: { $search: query }
    };
    const filter = applyScopeFilter(req, baseFilter);

    const posts = await Post.find(filter)
      .populate('userId', 'name avatar role')
      .limit(30);

    res.json({ success: true, data: posts });
  } catch (error) {
    try {
      const baseFilter = {
        status: 'published',
        isDeleted: false,
        content: new RegExp(query, 'i')
      };
      const filter = applyScopeFilter(req, baseFilter);

      const posts = await Post.find(filter)
        .populate('userId', 'name avatar role')
        .limit(30);
      return res.json({ success: true, data: posts });
    } catch (e) {
      console.error('searchSocial error:', e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

// @desc    Get user profile social statistics (posts count, followers, following, saved count)
// @route   GET /api/v1/member/social/profile-stats
// @access  Private
exports.getProfileStats = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const isOwner = targetUserId.toString() === req.user._id.toString();

    const postFilter = applyScopeFilter(req, { authorId: targetUserId, isDeleted: false });

    const [postsCount, followersCount, followingCount, savedCount] = await Promise.all([
      Post.countDocuments(postFilter),
      Follower.countDocuments({ followingId: targetUserId, status: 'accepted' }),
      Follower.countDocuments({ followerId: targetUserId, status: 'accepted' }),
      SavedPost.countDocuments({ userId: targetUserId })
    ]);

    res.json({
      success: true,
      data: {
        postsCount,
        followersCount,
        followingCount,
        savedCount: isOwner ? savedCount : 0
      }
    });
  } catch (error) {
    console.error('getProfileStats error:', error);
    res.status(500).json({ success: false, message: 'Server error loading stats' });
  }
};

// @desc    Get current user saved posts list
// @route   GET /api/v1/member/social/posts/saved
// @access  Private
exports.getMySavedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(req.user?.role);

    const savedRecords = await SavedPost.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'postId',
        populate: [
          { path: 'userId', select: 'name avatar role city community' },
          { path: 'communityId', select: 'name slug city' },
          { path: 'cityId', select: 'name' }
        ]
      })
      .lean();

    const validPosts = savedRecords
      .map(r => {
        const p = r.postId;
        if (!p) return null;
        p.userId = sanitizeUserAvatar(p.userId);
        p.authorId = p.authorId || p.userId;
        return p;
      })
      .filter(post => {
        if (!post || post.isDeleted) return false;
        if (isAdmin) return true;
        const postCommId = (post.communityId?._id || post.communityId || '').toString();
        return userCommId && postCommId && userCommId === postCommId;
      });

    res.json({
      success: true,
      data: validPosts
    });
  } catch (error) {
    console.error('getMySavedPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error loading saved posts' });
  }
};

// @desc    Get current user liked posts list
// @route   GET /api/v1/member/social/posts/liked
// @access  Private
exports.getMyLikedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(req.user?.role);

    const likedRecords = await PostLike.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'postId',
        populate: [
          { path: 'userId', select: 'name avatar role city community' },
          { path: 'communityId', select: 'name slug city' },
          { path: 'cityId', select: 'name' }
        ]
      })
      .lean();

    const validPosts = likedRecords
      .map(r => {
        const p = r.postId;
        if (!p) return null;
        p.userId = sanitizeUserAvatar(p.userId);
        p.authorId = p.authorId || p.userId;
        return p;
      })
      .filter(post => {
        if (!post || post.isDeleted) return false;
        if (isAdmin) return true;
        const postCommId = (post.communityId?._id || post.communityId || '').toString();
        return userCommId && postCommId && userCommId === postCommId;
      });

    res.json({
      success: true,
      data: validPosts
    });
  } catch (error) {
    console.error('getMyLikedPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error loading liked posts' });
  }
};

// @desc    Get posts by a specific user (for their profile feed)
// @route   GET /api/v1/member/social/posts/user/:userId
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, cursor } = req.query;

    const baseFilter = {
      authorId: userId,
      status: 'published',
      isDeleted: false
    };

    if (cursor) {
      baseFilter.createdAt = { $lt: new Date(cursor) };
    }

    const filter = applyScopeFilter(req, baseFilter);

    const posts = await Post.find(filter)
      .populate('userId', 'name avatar role city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1)
      .lean();

    const hasMore = posts.length > Number(limit);
    if (hasMore) {
      posts.pop();
    }

    const postIds = posts.map(p => p._id);
    const [likes, saves] = await Promise.all([
      PostLike.find({ postId: { $in: postIds }, userId: req.user._id }).lean(),
      SavedPost.find({ postId: { $in: postIds }, userId: req.user._id }).lean()
    ]);

    const likedPostIds = new Set(likes.map(l => l.postId.toString()));
    const savedPostIds = new Set(saves.map(s => s.postId.toString()));

    const formattedPosts = posts.map(p => {
      const author = sanitizeUserAvatar(p.userId);
      return {
        ...p,
        id: p._id,
        userId: author,
        authorId: p.authorId || author,
        isLiked: likedPostIds.has(p._id.toString()),
        isSaved: savedPostIds.has(p._id.toString())
      };
    });

    res.json({
      success: true,
      data: formattedPosts,
      hasMore,
      nextCursor: hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt : null
    });
  } catch (error) {
    console.error('getUserPosts error:', error);
    res.status(500).json({ success: false, message: 'Server error loading user posts' });
  }
};

// ─── POST EDIT & DELETE (Author / Head / Admin) ─────────────────────────────

// @desc    Update a post (Author ONLY)
// @route   PUT /api/v1/member/social/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'This post has been removed by a moderator' });
    }

    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    // ONLY author can edit post content
    const postAuthorId = (post.authorId?._id || post.authorId || post.userId?._id || post.userId || '').toString();
    const reqUserId = (req.user?._id || req.user?.id || '').toString();
    const isAuthor = !!(postAuthorId && reqUserId && postAuthorId === reqUserId);

    if (!isAuthor) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this post' });
    }

    const { content } = req.body;
    if (content !== undefined) {
      post.content = content.trim();
      post.isEdited = true;
      post.editedAt = new Date();
    }

    await post.save();

    const populated = await Post.findById(post._id)
      .populate('userId', 'name avatar role city community communityId')
      .populate('authorId', 'name avatar role city community communityId')
      .populate('communityId', 'name slug city')
      .populate('cityId', 'name');

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('updatePost error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating post' });
  }
};

// @desc    Delete a post (Soft delete: Author, Head of same community, or Admin)
// @route   DELETE /api/v1/member/social/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const postAuthorId = (post.authorId?._id || post.authorId || post.userId?._id || post.userId || '').toString();
    const reqUserId = (req.user?._id || req.user?.id || '').toString();
    const isAuthor = !!(postAuthorId && reqUserId && postAuthorId === reqUserId);

    const isAdmin = adminRoles.includes(req.user?.role);
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
    const postCommId = (post.communityId?._id || post.communityId || '').toString();
    const isHeadSameCommunity = req.user?.role === 'head' && !!(userCommId && postCommId && userCommId === postCommId);

    if (!isAuthor && !isHeadSameCommunity && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permission to delete this post' });
    }

    // Soft delete post
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    // Cascading soft delete child comments
    await Comment.updateMany({ postId: post._id }, { $set: { isDeleted: true } });

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePost error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting post' });
  }
};

// ─── COMMENT EDIT & DELETE (Author / Post Author / Head / Admin) ───────────

// @desc    Update a comment (Author ONLY)
// @route   PUT /api/v1/member/social/comments/:id
// @access  Private
exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // ONLY comment author can edit comment text
    const commentAuthorId = (comment.userId?._id || comment.userId || '').toString();
    const reqUserId = (req.user?._id || req.user?.id || '').toString();
    const isCommentAuthor = !!(commentAuthorId && reqUserId && commentAuthorId === reqUserId);

    if (!isCommentAuthor) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    const { text } = req.body;
    if (text !== undefined) {
      comment.text = text.trim();
      comment.isEdited = true;
      comment.editedAt = new Date();
    }

    await comment.save();

    const populated = await Comment.findById(comment._id).populate('userId', 'name avatar');
    res.json({ success: true, data: populated });
  } catch (error) {
    console.error('updateComment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating comment' });
  }
};

// @desc    Delete a comment (Soft delete with multi-level reply cascade & atomic commentsCount decrement)
// @route   DELETE /api/v1/member/social/comments/:id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.id, isDeleted: false });
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Parent post not found' });
    }

    if (!verifyPostCommunityAccess(req, post)) {
      return res.status(403).json({ success: false, message: 'Access denied: post belongs to another community' });
    }

    const commentAuthorId = (comment.userId?._id || comment.userId || '').toString();
    const postAuthorId = (post.authorId?._id || post.authorId || post.userId?._id || post.userId || '').toString();
    const reqUserId = (req.user?._id || req.user?.id || '').toString();

    const isCommentAuthor = !!(commentAuthorId && reqUserId && commentAuthorId === reqUserId);
    const isPostAuthor = !!(postAuthorId && reqUserId && postAuthorId === reqUserId);
    const isAdmin = adminRoles.includes(req.user?.role);
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId || '').toString();
    const postCommId = (post.communityId?._id || post.communityId || '').toString();
    const isHeadSameCommunity = req.user?.role === 'head' && !!(userCommId && postCommId && userCommId === postCommId);

    if (!isCommentAuthor && !isPostAuthor && !isHeadSameCommunity && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permission to delete this comment' });
    }

    // Recursively collect all descendant comment IDs (multi-level reply cascade)
    const collectDescendantIds = async (parentIds) => {
      const children = await Comment.find({ parentCommentId: { $in: parentIds }, isDeleted: false }).select('_id').lean();
      if (children.length === 0) return [];
      const childIds = children.map(c => c._id);
      const deeperIds = await collectDescendantIds(childIds);
      return [...childIds, ...deeperIds];
    };

    const descendantIds = await collectDescendantIds([comment._id]);
    const allTargetIds = [comment._id, ...descendantIds];

    // Batch soft-delete comment + descendant replies
    const updateResult = await Comment.updateMany(
      { _id: { $in: allTargetIds } },
      { $set: { isDeleted: true } }
    );

    const deletedCount = updateResult.modifiedCount || allTargetIds.length;

    // Atomic decrement of commentsCount on parent Post
    await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: -deletedCount } });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
      deletedCount
    });
  } catch (error) {
    console.error('deleteComment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting comment' });
  }
};

// @desc    Get announcement follow status for logged in member
// @route   GET /api/v1/member/social/announcements/follow-status
// @access  Private
exports.getAnnouncementFollowStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences').lean();
    const isFollowing = user?.notificationPreferences?.announcements !== false;
    res.json({ success: true, isFollowing });
  } catch (error) {
    console.error('getAnnouncementFollowStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle announcement follow status for logged in member
// @route   POST /api/v1/member/social/announcements/toggle-follow
// @access  Private
exports.toggleFollowAnnouncements = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = { email: true, sms: true, push: true, announcements: true };
    }

    const currentStatus = user.notificationPreferences.announcements !== false;
    const newStatus = !currentStatus;

    user.notificationPreferences.announcements = newStatus;
    user.markModified('notificationPreferences');
    await user.save();

    res.json({
      success: true,
      isFollowing: newStatus,
      message: newStatus ? 'Subscribed to community announcements' : 'Muted community announcements'
    });
  } catch (error) {
    console.error('toggleFollowAnnouncements error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

