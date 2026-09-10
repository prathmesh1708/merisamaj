const express = require('express');
const router = express.Router();
const socialController = require('../../controllers/member/socialController');
const storyController = require('../../controllers/member/storyController');
const followerController = require('../../controllers/member/followerController');
const highlightController = require('../../controllers/member/highlightController');
const authMiddleware = require('../../middleware/authMiddleware');

// Secure all endpoints under member authentication middleware
router.use(authMiddleware.protect);

// Profile Statistics & Tab Endpoints
router.get('/profile-stats', socialController.getProfileStats);
router.get('/posts/saved', socialController.getMySavedPosts);
router.get('/posts/liked', socialController.getMyLikedPosts);

// ─────────────────────────────────────────────
// POSTS & FEEDS ROUTES
// ─────────────────────────────────────────────
router.route('/posts')
  .get(socialController.getPosts)
  .post(socialController.createPost);

router.get('/posts/user/:userId', socialController.getUserPosts);

router.route('/posts/:id')
  .get(socialController.getPostById)
  .put(socialController.updatePost)
  .delete(socialController.deletePost);

router.post('/posts/:id/like', socialController.toggleLike);
router.post('/posts/:id/save', socialController.toggleSave);
router.post('/posts/:id/view', socialController.recordView);
router.post('/posts/:id/share', socialController.recordShare);
router.post('/posts/:id/share-to-user', socialController.sharePostToUser);

router.get('/share-recipients', socialController.getShareRecipients);

router.route('/posts/:id/comments')
  .get(socialController.getComments)
  .post(socialController.addComment);

router.route('/comments/:id')
  .put(socialController.updateComment)
  .delete(socialController.deleteComment);

router.post('/comments/:id/like', socialController.toggleCommentLike);

router.get('/search', socialController.searchSocial);

// ─────────────────────────────────────────────
// STORIES & HIGHLIGHTS ROUTES
// ─────────────────────────────────────────────
router.route('/stories')
  .get(storyController.getStories)
  .post(storyController.createStory);

router.delete('/stories/:id', storyController.deleteStory);
router.post('/stories/:id/view', storyController.viewStory);
router.post('/stories/:id/like', storyController.likeStory);
router.get('/stories/:id/viewers', storyController.getStoryViewers);

// Highlights
router.route('/highlights')
  .get(highlightController.getUserHighlights)
  .post(highlightController.createHighlight);

router.get('/highlights/past-stories', highlightController.getPastStoriesForHighlight);
router.delete('/highlights/:id', highlightController.deleteHighlight);

// ─────────────────────────────────────────────
// FOLLOWER RELATIONSHIP ROUTES
// ─────────────────────────────────────────────
router.post('/follow/:id', followerController.toggleFollow);
router.get('/users/:id/followers', followerController.getFollowers);
router.get('/users/:id/following', followerController.getFollowing);

module.exports = router;
