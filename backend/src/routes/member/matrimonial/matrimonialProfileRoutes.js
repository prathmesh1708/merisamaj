const express = require('express');
const router  = express.Router();

const profileCtrl = require('../../../controllers/matrimonial/matrimonialProfileController');
const photoCtrl   = require('../../../controllers/matrimonial/matrimonialPhotoController');
const { attachSubscription } = require('../../../middleware/subscriptionMiddleware');
const upload = require('../../../middleware/uploadMiddleware');
const { body, query, validationResult } = require('express-validator');

// ─── Validation middleware ─────────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }
  next();
};

// ─── Static Routes MUST come before /:id to avoid param capture ───────────────

// Profile CRUD
router.post('/',
  [
    body('personal.fullName').notEmpty().withMessage('Full name is required'),
    body('personal.gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    body('personal.dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  ],
  validate,
  profileCtrl.createProfile
);

router.put('/', profileCtrl.updateProfile);
router.delete('/', profileCtrl.deleteProfile);

// Static sub-paths: must come before /:id
router.get('/me', profileCtrl.getMyProfile);
router.get('/communities', profileCtrl.getAvailableCommunities);

router.get('/search',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('ageMin').optional().isInt({ min: 18 }),
    query('ageMax').optional().isInt({ max: 70 }),
  ],
  validate,
  attachSubscription,
  profileCtrl.searchProfiles
);

// ─── Photo Routes (must be before /:id) ───────────────────────────────────────
router.get('/photos/all', photoCtrl.getPhotos);
router.post('/photos/upload', upload.uploadMultiplePhotos, photoCtrl.uploadPhotos);
router.put('/photos/:photoId/primary', photoCtrl.setPrimaryPhoto);
router.delete('/photos/:photoId', photoCtrl.deletePhoto);

// ─── Dynamic profile by ID (last — catches everything else) ───────────────────
router.get('/:id', attachSubscription, profileCtrl.getUserProfile);

module.exports = router;
