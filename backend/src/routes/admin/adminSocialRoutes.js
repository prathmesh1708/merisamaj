const express = require('express');
const router = express.Router();
const adminSocialController = require('../../controllers/admin/adminSocialController');
const {
  getCityFeedPosts,
  getCommunityFeedPosts,
  getCommunitiesForFilter,
  deletePostByAdmin,
} = require('../../controllers/admin/adminPostController');
const authMiddleware = require('../../middleware/authMiddleware');

// Secure all admin social routes under master admin protect and authorize
router.use(authMiddleware.protect);
router.use(authMiddleware.authorize('admin'));

// Member reports (child-safety reports first)
const safetyReportCtrl = require('../../controllers/safetyReportController');
router.get('/safety-reports', safetyReportCtrl.listReports);
router.put('/safety-reports/:id', safetyReportCtrl.resolveReport);

// Dedicated City Feed & Community Feed Moderation Endpoints
router.get('/city-feed', getCityFeedPosts);
router.get('/community-feed', getCommunityFeedPosts);
router.get('/communities', getCommunitiesForFilter);

// DELETE /api/v1/admin/social/posts/:id (Bug 1 Fix: added :id dynamic param)
router.delete('/posts/:id', deletePostByAdmin);

// POSTS ROUTES
router.route('/posts')
  .get(adminSocialController.getPosts)
  .post(adminSocialController.createPost);

router.post('/posts/bulk-action', adminSocialController.bulkPostsAction);

router.route('/posts/:id')
  .get(adminSocialController.getPostById)
  .patch(adminSocialController.updatePost);

router.post('/posts/:id/restore', adminSocialController.restorePost);
router.post('/posts/:id/pin', adminSocialController.togglePinPost);
router.post('/posts/:id/feature', adminSocialController.toggleFeaturePost);
router.post('/posts/:id/hide', adminSocialController.toggleHidePost);

// STORIES ROUTES
router.route('/stories')
  .get(adminSocialController.getStories);

router.post('/stories/bulk-action', adminSocialController.bulkStoriesAction);

router.route('/stories/:id')
  .delete(adminSocialController.deleteStory);

router.post('/stories/:id/hide', adminSocialController.toggleStoryHide);
router.post('/stories/:id/feature', adminSocialController.toggleStoryFeature);
router.get('/stories/:id/analytics', adminSocialController.getStoryAnalytics);

// COMMENTS ROUTES
router.route('/comments')
  .get(adminSocialController.getComments);

router.post('/comments/bulk-action', adminSocialController.bulkCommentsAction);

router.route('/comments/:id')
  .delete(adminSocialController.deleteComment);

router.post('/comments/:id/hide', adminSocialController.toggleCommentHide);
router.post('/comments/:id/approve', adminSocialController.approveComment);
router.post('/comments/:id/reject', adminSocialController.rejectComment);

// LIKES, SHARES & SAVES ROUTES
router.route('/likes')
  .get(adminSocialController.getLikes);
router.route('/likes/:id')
  .delete(adminSocialController.removeLike);

router.route('/shares')
  .get(adminSocialController.getShares);

router.route('/saves')
  .get(adminSocialController.getSavedPosts);
router.route('/saves/:id')
  .delete(adminSocialController.removeSave);

// FOLLOWERS ROUTES
router.route('/followers')
  .get(adminSocialController.getFollowers);
router.route('/followers/:id/action')
  .post(adminSocialController.manageFollower);

// CATEGORIES ROUTES
router.route('/categories')
  .get(adminSocialController.getCategories)
  .post(adminSocialController.createCategory);
router.route('/categories/:id')
  .put(adminSocialController.updateCategory)
  .delete(adminSocialController.deleteCategory);

// REPORTS, ANALYTICS & SETTINGS
router.route('/reports')
  .get(adminSocialController.getReports);
router.post('/reports/resolve', adminSocialController.resolveReport);
router.post('/reports/warn', adminSocialController.warnUser);

router.route('/analytics')
  .get(adminSocialController.getAnalytics);

router.route('/settings')
  .get(adminSocialController.getSettings)
  .put(adminSocialController.updateSettings);

module.exports = router;
