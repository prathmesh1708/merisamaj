/**
 * adminCommunityPlanController.js
 * Admin CRUD for platform-tier CommunityPlans, and assigning a plan to a Community.
 * Assigning a plan writes its module-access features straight into
 * Community.settings so the existing per-module enabled flags (and the new
 * checkModuleEnabled middleware) take effect immediately — no separate
 * enforcement path to keep in sync.
 */
const CommunityPlan = require('../../models/CommunityPlan');
const Community = require('../../models/Community');

exports.listPlans = async (req, res) => {
  try {
    const plans = await CommunityPlan.find().sort({ displayOrder: 1 });
    res.json({ status: 'success', data: { plans } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await CommunityPlan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ status: 'success', data: { plan } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'A plan with this name already exists.' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await CommunityPlan.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    res.json({ status: 'success', data: { plan } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const plan = await CommunityPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    plan.isActive = false;
    await plan.save();
    res.json({ status: 'success', message: 'Plan deactivated.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Assign a plan to a community — pushes module flags into Community.settings ──
exports.assignPlanToCommunity = async (req, res) => {
  try {
    const { communityId, planId } = req.body;
    if (!communityId || !planId) {
      return res.status(400).json({ status: 'error', message: 'communityId and planId are required.' });
    }

    const plan = await CommunityPlan.findById(planId);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found.' });

    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ status: 'error', message: 'Community not found.' });

    community.planId = plan._id;
    community.planAssignedAt = new Date();
    community.settings.matrimonialEnabled = true; // Matrimonial is always available to everyone
    community.settings.directoryEnabled = !!plan.features.professionalDirectory;
    await community.save();

    res.json({ status: 'success', message: `${plan.name} assigned to ${community.name}.`, data: { community } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List communities with their assigned plan (for the Assign modal) ───────
exports.listCommunitiesWithPlans = async (req, res) => {
  try {
    const communities = await Community.find({ isActive: true })
      .select('name city planId planAssignedAt')
      .populate('planId', 'name')
      .sort({ name: 1 })
      .lean();
    res.json({ status: 'success', data: { communities } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
