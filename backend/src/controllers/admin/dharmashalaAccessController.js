const mongoose = require('mongoose');
const DharmashalaAccessPolicy = require('../../models/DharmashalaAccessPolicy');
const { resolveAccess, ACTIONS, ROLE_KEYS } = require('../../middleware/dharmashalaAccess');

const blankRoles = () => Object.fromEntries(ROLE_KEYS.map(r => [r, Object.fromEntries(ACTIONS.map(a => [a, false]))]));

// Admin: list the community-wide policy plus every per-location override.
exports.getPolicies = async (req, res) => {
  try {
    const { communityId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({ success: false, message: 'communityId is required.' });
    }
    const policies = await DharmashalaAccessPolicy.find({ communityId }).lean();
    const communityWide = policies.find(p => !p.city);
    res.status(200).json({
      success: true,
      data: {
        communityWide: { roles: { ...blankRoles(), ...(communityWide?.roles || {}) } },
        byLocation: policies.filter(p => p.city).map(p => ({ city: p.city, roles: p.roles }))
      }
    });
  } catch (error) {
    console.error('getPolicies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: save the community-wide policy (city omitted) or one location's override.
// Only known roles/actions with boolean values are stored. For a city override,
// a null value means "inherit the community-wide setting" and is not stored.
exports.savePolicy = async (req, res) => {
  try {
    const { communityId, city, roles } = req.body;
    if (!mongoose.Types.ObjectId.isValid(communityId) || !roles || typeof roles !== 'object') {
      return res.status(400).json({ success: false, message: 'communityId and roles are required.' });
    }
    const cleanCity = city && city !== 'all' ? String(city).trim() : null;
    const clean = {};
    ROLE_KEYS.forEach(r => {
      clean[r] = {};
      ACTIONS.forEach(a => {
        const v = roles[r]?.[a];
        if (typeof v === 'boolean') clean[r][a] = v;
        else if (!cleanCity) clean[r][a] = false;
      });
    });
    const policy = await DharmashalaAccessPolicy.findOneAndUpdate(
      { communityId, city: cleanCity },
      { $set: { roles: clean, updatedBy: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error('savePolicy error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Admin: remove a location override so that location inherits the community-wide policy.
exports.deleteLocationPolicy = async (req, res) => {
  try {
    const { communityId, city } = req.query;
    if (!mongoose.Types.ObjectId.isValid(communityId) || !city) {
      return res.status(400).json({ success: false, message: 'communityId and city are required.' });
    }
    await DharmashalaAccessPolicy.deleteOne({ communityId, city });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Head panel: what may the signed-in user do (used to show/hide buttons).
exports.getMyAccess = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: await resolveAccess(req.user, req.communityId) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
