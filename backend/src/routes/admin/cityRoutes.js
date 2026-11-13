const express = require('express');
const { protect, authorize } = require('../../middleware/authMiddleware');
const {
  getCities,
  createCity,
  updateCity,
  toggleCityStatus,
  getCityStatistics,
  getCityDetails
} = require('../../controllers/admin/cityController');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('admin')); // Only Admin can manage cities

router.route('/')
  .get(getCities)
  .post(createCity);

router.route('/:id')
  .put(updateCity);

router.route('/:id/status')
  .patch(toggleCityStatus);

router.route('/:id/details')
  .get(getCityDetails);

router.route('/:id/statistics')
  .get(getCityStatistics);

module.exports = router;
