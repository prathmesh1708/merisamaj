const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const DonationCategory = require('../models/DonationCategory');
const { applyScopeFilter } = require('../utils/queryScopeHelper');

const resolveTargeting = (body) => {
  const { targetScope, isGlobalCampaign, targetedCommunities, visibility } = body;

  let isGlobal = false;
  let targetCommunities = [];
  let finalVisibility = visibility || 'All Members';

  if (targetScope === 'All Communities' || targetScope === 'All Communities / All Members' || isGlobalCampaign === true || isGlobalCampaign === 'true') {
    isGlobal = true;
    targetCommunities = [];
    finalVisibility = 'All Members';
  } else if (targetScope === 'Selected Communities' || (Array.isArray(targetedCommunities) && targetedCommunities.length > 0)) {
    isGlobal = false;
    finalVisibility = 'Selected Communities';
    if (Array.isArray(targetedCommunities)) {
      targetCommunities = targetedCommunities
        .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
        .map(id => new mongoose.Types.ObjectId(id.toString()));
    }
  }

  return {
    isGlobalCampaign: isGlobal,
    targetedCommunities: targetCommunities,
    visibility: finalVisibility
  };
};

// GET /admin/donations — List all donation campaigns (Admin global view with optional status, category, communityId filters)
exports.getAllDonations = async (req, res) => {
  try {
    const { includeDeleted, status, category, communityId } = req.query;

    let baseFilter = {};
    if (includeDeleted !== 'true') {
      baseFilter.isDeleted = { $ne: true };
    }

    if (status && status !== 'all') {
      if (status === 'Active') {
        baseFilter.status = { $in: ['Active', 'Published'] };
      } else {
        baseFilter.status = status;
      }
    }

    if (category && category !== 'all') {
      baseFilter.category = category;
    }

    if (communityId && communityId !== 'all') {
      if (communityId === 'global') {
        baseFilter.$or = [
          { isGlobalCampaign: true },
          { visibility: 'All Members' }
        ];
      } else if (mongoose.Types.ObjectId.isValid(communityId)) {
        const commObjId = new mongoose.Types.ObjectId(communityId);
        baseFilter.$or = [
          { communityId: commObjId },
          { targetedCommunities: commObjId }
        ];
      }
    }

    const donationDocs = await Donation.find(baseFilter)
      .populate('targetedCommunities', 'name code')
      .populate('communityId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Normalize Donation docs with consistent DTO shape
    const normalizedDonations = donationDocs.map(d => ({
      _id: d._id,
      id: d._id,
      source: 'donation',
      title: d.title || '',
      shortDescription: d.shortDescription || d.description || '',
      description: d.description || d.shortDescription || '',
      targetAmount: d.targetAmount || 0,
      raisedAmount: d.raisedAmount || 0,
      collectedAmount: d.raisedAmount || 0,
      donorCount: d.donorCount || (Array.isArray(d.recentDonations) ? d.recentDonations.length : 0),
      contributorsCount: d.donorCount || 0,
      category: d.category || 'General',
      status: d.status || 'Active',
      city: d.city || '',
      communityId: d.communityId || null,
      targetedCommunities: d.targetedCommunities || [],
      isGlobalCampaign: d.isGlobalCampaign || d.visibility === 'All Members',
      visibility: d.visibility || (d.isGlobalCampaign ? 'All Members' : 'Selected Communities'),
      coverImage: d.coverImage || '',
      bannerImage: d.coverImage || '',
      createdAt: d.createdAt || new Date(),
      updatedAt: d.updatedAt || new Date()
    }));

    res.status(200).json({
      success: true,
      data: normalizedDonations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/donations — Create new donation campaign (Admin source)
exports.createDonation = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      description,
      targetAmount,
      minDonation,
      category,
      priority,
      city,
      startDate,
      endDate,
      coverImage,
      bannerImage,
      status
    } = req.body;

    if (!title || !targetAmount) {
      return res.status(400).json({ success: false, message: 'Title and target amount are required' });
    }

    const { isGlobalCampaign, targetedCommunities, visibility } = resolveTargeting(req.body);
    const imgUrl = coverImage || bannerImage || '';

    const donation = new Donation({
      txnId: `CAMP_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      title,
      shortDescription: shortDescription || '',
      description: description || '',
      targetAmount: Number(targetAmount),
      minDonation: minDonation ? Number(minDonation) : 1,
      category: category || 'General',
      priority: priority || 'Medium',
      city: city || '',
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      coverImage: imgUrl,
      status: status || 'Active',
      isGlobalCampaign,
      targetedCommunities,
      visibility,
      raisedAmount: 0,
      donorCount: 0,
      recentDonations: []
    });

    try {
      await donation.save();
    } catch (saveErr) {
      if (saveErr.code === 11000 && saveErr.message?.includes('txnId')) {
        try {
          await Donation.collection.dropIndex('txnId_1');
          await donation.save();
        } catch (retryErr) {
          throw saveErr;
        }
      } else {
        throw saveErr;
      }
    }

    const populatedDonation = await Donation.findById(donation._id)
      .populate('targetedCommunities', 'name code')
      .populate('communityId', 'name code');

    const resultData = populatedDonation.toObject();
    resultData.source = 'donation';
    resultData.bannerImage = resultData.coverImage || '';

    res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: resultData
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /admin/donations/:id — Update donation fields
exports.updateDonation = async (req, res) => {
  try {
    const { isGlobalCampaign, targetedCommunities, visibility } = resolveTargeting(req.body);

    const updatePayload = {
      ...req.body,
      isGlobalCampaign,
      targetedCommunities,
      visibility
    };

    if (req.body.coverImage || req.body.bannerImage) {
      updatePayload.coverImage = req.body.coverImage || req.body.bannerImage;
    }

    delete updatePayload.source;
    delete updatePayload.targetScope;
    delete updatePayload.raisedAmount;
    delete updatePayload.collectedAmount;
    delete updatePayload.donorCount;
    delete updatePayload.contributorsCount;
    delete updatePayload.recentDonations;
    delete updatePayload.isDeleted;

    const doc = await Donation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).populate('targetedCommunities', 'name code').populate('communityId', 'name code');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    const resObj = doc.toObject();
    resObj.source = 'donation';
    resObj.bannerImage = resObj.coverImage || '';

    res.status(200).json({
      success: true,
      message: 'Donation updated successfully',
      data: resObj
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PATCH /admin/donations/:id/close — Close donation drive
exports.closeDonation = async (req, res) => {
  try {
    const doc = await Donation.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { status: 'Closed' } },
      { new: true }
    ).populate('targetedCommunities', 'name code').populate('communityId', 'name code');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Donation drive closed successfully',
      data: doc
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /admin/donations/:id — Soft delete donation
exports.deleteDonation = async (req, res) => {
  try {
    const doc = await Donation.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Donation record not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Donation deleted successfully',
      data: doc
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const DEFAULT_CATEGORIES = [
  { name: 'General Relief', key: 'general-relief', isDefault: true, icon: 'ShieldAlert' },
  { name: 'Health & Medical', key: 'health-medical', isDefault: true, icon: 'HeartPulse' },
  { name: 'Education & Scholarships', key: 'education-scholarships', isDefault: true, icon: 'GraduationCap' },
  { name: 'Temple & Infrastructure', key: 'temple-infrastructure', isDefault: true, icon: 'Building2' },
  { name: 'Social Welfare', key: 'social-welfare', isDefault: true, icon: 'Users' },
  { name: 'Event Funding', key: 'event-funding', isDefault: true, icon: 'Calendar' }
];

const ensureDefaultCategories = async () => {
  const count = await DonationCategory.countDocuments();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await DonationCategory.findOneAndUpdate(
        { key: cat.key },
        { ...cat },
        { upsert: true, new: true }
      );
    }
  }
};

// GET /admin/donations/categories — List all donation categories
exports.getCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await DonationCategory.find().sort({ isDefault: -1, createdAt: 1 });
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/donations/categories — Create new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const key = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await DonationCategory.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
        { key }
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }

    const newCategory = new DonationCategory({
      name: trimmedName,
      key: key || `cat-${Date.now()}`,
      description: description?.trim() || '',
      icon: icon || 'Heart',
      isDefault: false,
      createdBy: req.user?._id
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /admin/donations/categories/:id — Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await DonationCategory.findById(id);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await DonationCategory.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



