const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/admin/adminCommunityPlanController');

router.get('/plans', ctrl.listPlans);
router.post('/plans', ctrl.createPlan);
router.put('/plans/:id', ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);

router.get('/communities', ctrl.listCommunitiesWithPlans);
router.post('/assign', ctrl.assignPlanToCommunity);

module.exports = router;
