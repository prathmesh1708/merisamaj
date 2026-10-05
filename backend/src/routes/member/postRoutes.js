const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
} = require('../../controllers/member/postController');

// GET  /api/v1/member/posts
router.get('/', getPosts);

// POST /api/v1/member/posts
router.post('/', createPost);

// GET  /api/v1/member/posts/:id
router.get('/:id', getPostById);

// PUT  /api/v1/member/posts/:id
router.put('/:id', updatePost);

// DELETE /api/v1/member/posts/:id
router.delete('/:id', deletePost);

// POST /api/v1/member/posts/:id/like
router.post('/:id/like', toggleLike);

// POST /api/v1/member/posts/:id/comment
router.post('/:id/comment', addComment);

module.exports = router;
