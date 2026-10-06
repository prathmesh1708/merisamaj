const Donation = require('../../models/Donation');
const Expense = require('../../models/Expense');
const DonationCategory = require('../../models/DonationCategory');
const User = require('../../models/User');
const { notifyCampaignCreated, createBroadcastNotification, createNotification } = require('../../services/notificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

// 1. Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const campaignFilter = applyScopeFilter(req, {
      isDeleted: { $ne: true },
      $or: [{ campaign: { $exists: false } }, { campaign: null }],
      txnId: { $exists: false }
    });

    const campaigns = await Donation.find(campaignFilter);
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'Published' || c.status === 'Active' || c.status === 'Approved').length;
    const scheduledCampaigns = campaigns.filter(c => c.status === 'Scheduled').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'Completed' || c.status === 'Closed').length;

    const amountAggr = await Donation.aggregate([
      { $match: campaignFilter },
      { $group: { _id: null, totalTarget: { $sum: '$targetAmount' }, totalRaised: { $sum: '$raisedAmount' }, totalExpenses: { $sum: '$expenseAmount' } } }
    ]);
    const totalTargetAmount = amountAggr.length > 0 ? (amountAggr[0].totalTarget || 0) : 0;
    const totalRaisedAmount = amountAggr.length > 0 ? (amountAggr[0].totalRaised || 0) : 0;
    const totalExpenseAmount = amountAggr.length > 0 ? (amountAggr[0].totalExpenses || 0) : 0;

    // Count non-empty donor contributions or unique users
    const campaignIds = campaigns.map(c => c._id);
    const donationsCount = await Donation.countDocuments({
      isDeleted: { $ne: true },
      $or: [
        { campaign: { $in: campaignIds } },
        { txnId: { $exists: true, $ne: null } }
      ]
    });
    const uniqueDonorsList = await Donation.distinct('user', {
      isDeleted: { $ne: true },
      campaign: { $in: campaignIds }
    });
    const totalDonors = uniqueDonorsList.length || campaigns.reduce((sum, c) => sum + (c.donorCount || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        totalCampaigns,
        activeCampaigns,
        scheduledCampaigns,
        completedCampaigns,
        expiredCampaigns: 0,
        totalTargetAmount,
        totalRaisedAmount,
        totalExpenseAmount,
        availableBalance: totalRaisedAmount - totalExpenseAmount,
        totalDonors,
        averageDonation: donationsCount > 0 ? Math.round(totalRaisedAmount / donationsCount) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Get All Campaigns (Data Table) — community-scoped
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaignFilter = applyScopeFilter(req, {
      isDeleted: { $ne: true },
      $or: [{ campaign: { $exists: false } }, { campaign: null }],
      txnId: { $exists: false }
    });
    const campaigns = await Donation.find(campaignFilter).sort({ createdAt: -1 }).populate('createdBy', 'name');

    const formatted = campaigns.map(c => ({
      id: c._id,
      _id: c._id,
      title: c.title || 'Untitled Campaign',
      category: c.category || 'General',
      targetAmount: c.targetAmount || 0,
      raisedAmount: c.raisedAmount || 0,
      collectedAmount: c.raisedAmount || 0,
      expenseAmount: c.expenseAmount || 0,
      availableBalance: (c.raisedAmount || 0) - (c.expenseAmount || 0),
      remainingAmount: Math.max(0, (c.targetAmount || 0) - (c.raisedAmount || 0)),
      progress: (c.targetAmount || 0) > 0 ? Math.min(Math.round(((c.raisedAmount || 0) / c.targetAmount) * 100), 100) : 0,
      totalDonors: c.donorCount || 0,
      contributorsCount: c.donorCount || 0,
      startDate: c.startDate || c.createdAt,
      endDate: c.endDate,
      visibility: c.visibility || 'All Members',
      status: c.status || 'Active',
      createdBy: c.createdBy ? c.createdBy.name : 'Admin',
      createdById: c.createdBy ? c.createdBy._id : null,
      createdDate: c.createdAt,
      lastUpdated: c.updatedAt,
      coverImage: c.coverImage || '',
      bannerImage: c.coverImage || '',
      creatorCanCollect: c.creatorCanCollect !== false,
      cashCollectors: c.cashCollectors || []
    }));

    res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const parseCampaignBody = (body, file) => {
  const data = { ...body };
  if (file) {
    data.coverImage = file.path;
  } else if (data.bannerImage) {
    data.coverImage = data.bannerImage;
  }
  
  // Clean up coverImage if invalid string
  if (data.coverImage !== undefined && data.coverImage !== null) {
    if (typeof data.coverImage !== 'string' || data.coverImage === '[object Object]' || data.coverImage === '') {
      delete data.coverImage;
    }
  }
  
  if (typeof data.locations === 'string') {
    try { data.locations = JSON.parse(data.locations); } catch (e) { data.locations = []; }
  }
  if (typeof data.targetedMembers === 'string') {
    try { data.targetedMembers = JSON.parse(data.targetedMembers); } catch (e) { data.targetedMembers = []; }
  }
  if (typeof data.targetAudiences === 'string') {
    try { data.targetAudiences = JSON.parse(data.targetAudiences); } catch (e) { data.targetAudiences = []; }
  }
  if (typeof data.accountDetails === 'string') {
    try { data.accountDetails = JSON.parse(data.accountDetails); } catch (e) { data.accountDetails = {}; }
  }
  if (data.bankName || data.accountNumber || data.ifscCode || data.upiId || data.accountHolderName) {
    data.accountDetails = {
      bankName: data.bankName || data.accountDetails?.bankName || '',
      accountNumber: data.accountNumber || data.accountDetails?.accountNumber || '',
      ifscCode: data.ifscCode || data.accountDetails?.ifscCode || '',
      upiId: data.upiId || data.accountDetails?.upiId || '',
      accountHolderName: data.accountHolderName || data.accountDetails?.accountHolderName || '',
      qrCode: data.qrCode || data.accountDetails?.qrCode || ''
    };
  }
  if (data.visibility === 'All Members' || data.visibility === 'All Communities' || data.visibility === 'Global' || data.isGlobalCampaign === true || data.isGlobalCampaign === 'true') {
    data.isGlobalCampaign = true;
  }
  return data;
};

// 3. Create Campaign (Using inheritTenantPayload helper)
exports.createCampaign = async (req, res) => {
  try {
    const parsedData = parseCampaignBody(req.body, req.file);
    const campaignPayload = inheritTenantPayload(req, {
      ...parsedData,
      community: req.user?.community,
      status: parsedData.status || 'Active',
      createdBy: req.user?._id
    });

    // If campaign specific accountDetails not provided, auto inherit from Community or User
    if (!campaignPayload.accountDetails || (!campaignPayload.accountDetails.accountNumber && !campaignPayload.accountDetails.upiId)) {
      const Community = require('../../models/Community');
      const comm = await Community.findById(req.communityId || req.user?.communityId);
      if (comm && comm.accountDetails && (comm.accountDetails.accountNumber || comm.accountDetails.upiId)) {
        campaignPayload.accountDetails = comm.accountDetails;
      } else if (req.user?.accountDetails && (req.user.accountDetails.accountNumber || req.user.accountDetails.upiId)) {
        campaignPayload.accountDetails = req.user.accountDetails;
      }
    }

    const newCampaign = new Donation(campaignPayload);
    await newCampaign.save();

    // ── Non-critical: notify active community members ──────────────────────
    try {
      if (newCampaign.communityId) {
        createBroadcastNotification({
          communityId: newCampaign.communityId,
          module: 'donations',
          type: 'campaign_created',
          title: 'New Community Campaign 💚',
          message: `A new donation campaign "${newCampaign.title}" has been launched.`,
          icon: '💚',
          priority: 'high',
          actionUrl: `/member/donations/${newCampaign._id}`,
          referenceId: newCampaign._id,
          referenceType: 'Donation'
        });
      }
    } catch (notifyErr) {
      console.warn('[Notify] notifyCampaignCreated failed:', notifyErr.message);
    }

    res.status(201).json({ status: 'success', data: newCampaign });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Update Campaign
exports.updateCampaign = async (req, res) => {
  try {
    const parsedData = parseCampaignBody(req.body, req.file);
    const campaign = await Donation.findByIdAndUpdate(req.params.id, parsedData, { new: true });
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    res.status(200).json({ status: 'success', data: campaign });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Delete / Soft Delete Campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Donation.findByIdAndUpdate(
      req.params.id,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    res.status(200).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. Get Campaign By ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Donation.findById(req.params.id).populate('createdBy', 'name');
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    
    const obj = campaign.toObject();
    obj.bannerImage = obj.coverImage || '';
    res.status(200).json({ status: 'success', data: obj });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 7. Get Campaign Donors
exports.getCampaignDonors = async (req, res) => {
  try {
    const donations = await Donation.find({
      campaign: req.params.id,
      isDeleted: { $ne: true }
    })
      .populate('user', 'name memberId')
      .sort({ createdAt: -1 });

    const formatted = donations.map(d => ({
      id: d._id,
      name: d.donorName || d.user?.name || 'Anonymous',
      memberId: d.user?.memberId || 'N/A',
      family: 'N/A',
      mobile: 'N/A',
      amount: d.amount || d.raisedAmount || 0,
      paymentMethod: d.paymentMode || d.paymentMethod || 'Razorpay',
      txnId: d.txnId || '',
      date: d.paidAt || d.createdAt || new Date(),
      status: d.status || 'Active'
    }));

    res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 8. Update Campaign Status
exports.updateCampaignStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const campaign = await Donation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    res.status(200).json({ status: 'success', data: campaign });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 9. Add Expense to Campaign
exports.addExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, amount, category, date, notes } = req.body;
    
    const campaign = await Donation.findById(id);
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found' });
    
    const availableBalance = (campaign.raisedAmount || 0) - (campaign.expenseAmount || 0);
    if (amount > availableBalance) {
      return res.status(400).json({ status: 'error', message: 'Expense amount cannot exceed available balance' });
    }
    
    const expense = new Expense({
      campaign: id,
      communityId: campaign.communityId || req.communityId,
      title,
      description,
      amount,
      category,
      date: date || Date.now(),
      notes,
      createdBy: req.user?._id
    });
    
    await expense.save();
    
    // Update campaign expense amount
    campaign.expenseAmount = (campaign.expenseAmount || 0) + Number(amount);
    await campaign.save();
    
    res.status(201).json({ status: 'success', data: expense });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 10. Get Expenses for Campaign
exports.getCampaignExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ campaign: req.params.id }).sort({ date: -1 }).populate('createdBy', 'name');
    res.status(200).json({ status: 'success', data: expenses });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 11. Get Full Ledger — community-scoped
exports.getLedger = async (req, res) => {
  try {
    const campaignFilter = applyScopeFilter(req, {
      isDeleted: { $ne: true },
      $or: [{ campaign: { $exists: false } }, { campaign: null }],
      txnId: { $exists: false }
    });
    
    // Fetch all campaigns in the Head's community
    const campaigns = await Donation.find(campaignFilter, 'title raisedAmount expenseAmount coverImage');
    
    // Fetch all expenses in the community
    const campaignIds = campaigns.map(c => c._id);
    const expenses = await Expense.find({ campaign: { $in: campaignIds } })
      .populate('campaign', 'title category')
      .sort({ date: -1 });
      
    // Fetch all individual donation transactions
    const donationQuery = { 
      isDeleted: { $ne: true },
      $or: [
        { campaign: { $in: campaignIds } },
        { txnId: { $exists: true, $ne: null } }
      ]
    };

    const donations = await Donation.find(donationQuery)
      .populate('campaign', 'title category')
      .populate('user', 'name memberId')
      .sort({ createdAt: -1 });
      
    const transactions = [
      ...donations.map(d => ({
        id: `don_${d._id}`,
        type: 'INCOME',
        title: d.donorName || (d.user?.name ? `Donation from ${d.user.name}` : 'Anonymous Donation'),
        campaignTitle: d.campaign?.title || d.title || 'General Community Donation',
        amount: d.amount || d.raisedAmount || 0,
        date: d.paidAt || d.createdAt || new Date(),
        txnId: d.txnId || ''
      })),
      ...expenses.map(e => ({
        id: `exp_${e._id}`,
        type: 'EXPENSE',
        title: e.title || 'Expense',
        campaignTitle: e.campaign?.title || 'Unknown',
        amount: e.amount || 0,
        date: e.date || e.createdAt || new Date(),
        category: e.category || 'General'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort all by date descending
    
    const totalIncome = campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0);
    const totalExpenses = campaigns.reduce((sum, c) => sum + (c.expenseAmount || 0), 0);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalIncome,
        totalExpenses,
        availableBalance: totalIncome - totalExpenses,
        campaignsBalance: campaigns.map(c => ({
          id: c._id,
          title: c.title || 'Untitled Campaign',
          collected: c.raisedAmount || 0,
          expenses: c.expenseAmount || 0,
          balance: (c.raisedAmount || 0) - (c.expenseAmount || 0)
        })),
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
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

// GET /head/donations/categories — List all donation categories
exports.getCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await DonationCategory.find().sort({ isDefault: -1, createdAt: 1 });
    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /head/donations/categories — Create new donation category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Category name is required' });
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
      return res.status(400).json({ status: 'error', message: 'A category with this name already exists' });
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
      status: 'success',
      message: 'Category created successfully',
      data: newCategory
    });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// DELETE /head/donations/categories/:id — Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const cat = await DonationCategory.findById(id);
    if (!cat) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    await DonationCategory.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────
// Cash Payment Collection — scoped to the donor's own Community Head / Local
// Head hierarchy (see utils/donationCollectorHelper.js), never a flat
// "anyone with the permission" check. Admin bypasses via authorizeModule.
// ─────────────────────────────────────────────
const { isEligibleCollector, getEligibleCollectors, describeRole } = require('../../utils/donationCollectorHelper');


// @desc    List pending cash donations the requesting Head/Sub-Head is eligible to collect
// @route   GET /api/v1/head/donations/cash-pending
exports.getPendingCashDonations = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const pending = await Donation.find({
      paymentMode: 'Cash',
      collectionStatus: 'pending',
      isDeleted: { $ne: true },
      ...(isAdmin ? {} : { communityId: req.communityId || req.user?.communityId?._id || req.user?.communityId })
    })
      .populate('user', 'name city communityId')
      .populate('campaign', 'title createdBy creatorCanCollect cashCollectors')
      .sort({ createdAt: -1 })
      .lean();

    const visible = [];
    for (const d of pending) {
      const eligible = isAdmin || (d.user && await isEligibleCollector(req.user, d.user, d.campaign));
      if (eligible) {
        visible.push({
          id: d._id,
          donationId: d._id,
          donorName: d.donorName || d.user?.name || 'Anonymous',
          donorCity: d.user?.city || '',
          campaignTitle: d.campaign?.title || d.title || d.purpose || '',
          amount: d.amount || 0,
          paymentMethod: 'Cash',
          collectionStatus: d.collectionStatus,
          createdAt: d.createdAt
        });
      }
    }

    res.status(200).json({ status: 'success', data: visible });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Mark a pending cash donation as collected
// @route   PUT /api/v1/head/donations/:id/collect-cash
exports.collectCashDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).populate('user', 'name city communityId');
    if (!donation) return res.status(404).json({ status: 'error', message: 'Donation not found.' });
    if (donation.paymentMode !== 'Cash') {
      return res.status(400).json({ status: 'error', message: 'This donation is not a cash payment.' });
    }
    if (donation.collectionStatus === 'collected') {
      return res.status(400).json({ status: 'error', message: 'This donation has already been collected.' });
    }
    if (!donation.user) {
      return res.status(400).json({ status: 'error', message: 'This donation has no linked donor to verify hierarchy against.' });
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      // Fetch the campaign so we can check campaign-level collector access
      const campaign = donation.campaign
        ? await Donation.findById(donation.campaign).select('createdBy creatorCanCollect cashCollectors').lean()
        : null;

      const eligible = await isEligibleCollector(req.user, donation.user, campaign);
      if (!eligible) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to collect this donation — either it is outside your hierarchy, or you do not have Cash Collection access.'
        });
      }
    }

    donation.collectionStatus = 'collected';
    donation.status = 'Approved';
    donation.collectedBy = req.user._id;
    donation.collectedByName = req.user.name;
    donation.collectedByRole = isAdmin ? 'Admin' : describeRole(req.user);
    donation.collectedAt = new Date();
    await donation.save();

    // Now that cash is actually in hand, count it toward the campaign total.
    if (donation.campaign) {
      const campaign = await Donation.findById(donation.campaign);
      if (campaign) {
        campaign.raisedAmount = (campaign.raisedAmount || 0) + (donation.amount || 0);
        campaign.donorCount = (campaign.donorCount || 0) + 1;
        if (!Array.isArray(campaign.recentDonations)) campaign.recentDonations = [];
        campaign.recentDonations.unshift({
          donorName: donation.donorName,
          amount: donation.amount,
          date: new Date(),
          paymentStatus: 'success'
        });
        await campaign.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Cash donation marked as collected.',
      data: {
        id: donation._id,
        collectionStatus: donation.collectionStatus,
        collectedByName: donation.collectedByName,
        collectedByRole: donation.collectedByRole,
        collectedAt: donation.collectedAt,
        amount: donation.amount,
        donationId: donation._id
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Get sub-heads under the requester + their campaign-level cash-collector grant status
// @route   GET /api/v1/head/donations/campaigns/:id/collectors
exports.getCampaignCollectors = async (req, res) => {
  try {
    const campaign = await Donation.findById(req.params.id).select('createdBy creatorCanCollect cashCollectors').lean();
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found.' });

    // Only the creator or an admin may manage collectors
    const isAdmin = req.user.role === 'admin';
    const isCreator = campaign.createdBy && campaign.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ status: 'error', message: 'Only the campaign creator or an admin can manage collectors.' });
    }

    // Fetch sub-heads created by this head
    const subHeads = await User.find({
      parentHeadId: req.user._id,
      role: 'sub_head',
      accountStatus: { $ne: 'deleted' }
    }).select('_id name designation accountType city headPermissions accountStatus').lean();

    const grantedIds = (campaign.cashCollectors || []).map(id => id.toString());

    const result = subHeads.map(s => ({
      id: s._id,
      name: s.name,
      designation: s.designation || 'Sub-Head',
      accountType: s.accountType,
      city: s.city || '',
      accountStatus: s.accountStatus,
      hasGlobalPermission: s.headPermissions?.canCollectCashDonations === true,
      grantedForCampaign: grantedIds.includes(s._id.toString())
    }));

    res.status(200).json({
      status: 'success',
      data: {
        creatorCanCollect: campaign.creatorCanCollect !== false,
        subHeads: result
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// @desc    Grant or revoke cash-collection access for a sub-head on a specific campaign
// @route   PUT /api/v1/head/donations/campaigns/:id/collectors
// @body    { subHeadId, grant: true|false }
exports.updateCampaignCollectors = async (req, res) => {
  try {
    const campaign = await Donation.findById(req.params.id);
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found.' });

    const isAdmin = req.user.role === 'admin';
    const isCreator = campaign.createdBy && campaign.createdBy.toString() === req.user._id.toString();
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ status: 'error', message: 'Only the campaign creator or an admin can manage collectors.' });
    }

    const { subHeadId, grant } = req.body;
    if (!subHeadId) return res.status(400).json({ status: 'error', message: 'subHeadId is required.' });

    // Verify the sub-head actually belongs to this head
    const subHead = await User.findOne({
      _id: subHeadId,
      parentHeadId: req.user._id,
      role: 'sub_head',
      accountStatus: { $ne: 'deleted' }
    }).lean();

    if (!subHead && !isAdmin) {
      return res.status(403).json({ status: 'error', message: 'This sub-head does not belong to you.' });
    }

    if (!Array.isArray(campaign.cashCollectors)) campaign.cashCollectors = [];

    const idStr = subHeadId.toString();
    const alreadyGranted = campaign.cashCollectors.some(id => id.toString() === idStr);

    if (grant === true || grant === 'true') {
      if (!alreadyGranted) campaign.cashCollectors.push(subHeadId);
    } else {
      campaign.cashCollectors = campaign.cashCollectors.filter(id => id.toString() !== idStr);
    }

    await campaign.save();

    res.status(200).json({
      status: 'success',
      message: grant ? 'Cash collection access granted.' : 'Cash collection access revoked.',
      data: { cashCollectors: campaign.cashCollectors }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─── Manual (in-person) donation ──────────────────────────────────────────────
// A Community Head, Local Head or Admin records a donation handed over in person
// (cash, UPI, bank transfer, cheque). It is stored already collected, counted
// toward the campaign total, and, when the donor is a member, linked to their
// account so it appears in their own donation history with who collected it.
const MANUAL_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

exports.createManualDonation = async (req, res) => {
  try {
    const role = (req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(role);
    const isCommunityHead = role === 'head';
    const isLocalHead = req.user?.accountType === 'local_head';
    if (!isAdmin && !isCommunityHead && !isLocalHead) {
      return res.status(403).json({ status: 'error', message: 'Only Community Heads, Local Heads and Admins can record manual donations.' });
    }

    const { campaignId, donorName, donorPhone, donorAddress, amount, paymentMode, notes, donorUserId, date } = req.body;
    const amt = Number(amount);
    if (!campaignId || !donorName || !donorName.trim() || !(amt > 0)) {
      return res.status(400).json({ status: 'error', message: 'Campaign, donor name and a valid amount are required.' });
    }
    const mode = MANUAL_MODES.includes(paymentMode) ? paymentMode : 'Cash';

    const campaign = await Donation.findOne({ _id: campaignId, isDeleted: { $ne: true }, txnId: { $exists: false } });
    if (!campaign) return res.status(404).json({ status: 'error', message: 'Campaign not found.' });
    if (!isAdmin) {
      const mine = new Set([req.communityId, req.user?.communityId, ...(req.user?.assignedCommunityIds || [])]
        .map(c => (c ? String(c._id || c) : null)).filter(Boolean));
      const cid = campaign.communityId ? String(campaign.communityId._id || campaign.communityId) : null;
      if (cid && !mine.has(cid)) {
        return res.status(403).json({ status: 'error', message: 'This campaign is outside your community.' });
      }
    }

    // Link the donor to a member account when we can: an explicit pick, else a matching phone in the community.
    let donor = null;
    const communityId = campaign.communityId || req.communityId;
    if (donorUserId) {
      donor = await User.findOne({ _id: donorUserId, communityId, accountStatus: { $ne: 'deleted' } }).select('_id name city phone');
    }
    const phone = (donorPhone || '').replace(/\D/g, '').slice(-10);
    if (!donor && phone.length === 10) {
      donor = await User.findOne({ communityId, phone: new RegExp(`${phone}$`), accountStatus: { $ne: 'deleted' } }).select('_id name city phone');
    }

    const stamp = Date.now().toString().slice(-8);
    const txnId = `MAN${stamp}${Math.floor(100 + Math.random() * 900)}`;
    const receiptNo = `DON-${stamp}`;
    const collectorRole = isAdmin ? 'Admin' : describeRole(req.user);

    const record = await Donation.create({
      user: donor ? donor._id : undefined,
      campaign: campaign._id,
      title: campaign.title,
      purpose: campaign.title || campaign.purpose,
      communityId,
      city: req.user?.city || donor?.city || campaign.city,
      amount: amt,
      donorName: donorName.trim(),
      donorPhone: donorPhone || donor?.phone || '',
      donorAddress: donorAddress || '',
      paymentMode: mode,
      paymentMethod: mode,
      txnId,
      receiptNo,
      status: 'Approved',
      collectionStatus: 'collected',
      collectedBy: req.user._id,
      collectedByName: req.user.name,
      collectedByRole: collectorRole,
      collectedAt: date ? new Date(date) : new Date(),
      isManual: true,
      manualNotes: notes || ''
    });

    campaign.raisedAmount = (campaign.raisedAmount || 0) + amt;
    campaign.donorCount = (campaign.donorCount || 0) + 1;
    if (!Array.isArray(campaign.recentDonations)) campaign.recentDonations = [];
    campaign.recentDonations.unshift({ donorName: record.donorName, amount: amt, date: new Date(), paymentStatus: 'success' });
    await campaign.save();

    if (donor) {
      createNotification({
        userId: donor._id,
        communityId,
        module: 'donations',
        type: 'donation_recorded',
        title: 'Donation received',
        message: `Your ${mode.toLowerCase()} donation of ₹${amt.toLocaleString('en-IN')} to "${campaign.title}" was recorded by ${req.user.name}. Receipt ${receiptNo}.`,
        icon: '🙏',
        priority: 'normal',
        actionUrl: '/member/donation',
        referenceId: record._id,
        referenceType: 'Donation'
      });
    }

    res.status(201).json({
      status: 'success',
      message: donor ? 'Donation recorded and linked to the donor account.' : 'Donation recorded.',
      data: { id: record._id, txnId, receiptNo, amount: amt, donorLinked: !!donor, donorMemberName: donor ? donor.name : null }
    });
  } catch (error) {
    console.error('createManualDonation error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Manual donations visible to the requester (Admin: all; Heads: their community; Local Head: their city).
exports.getManualDonations = async (req, res) => {
  try {
    const filter = applyScopeFilter(req, { isManual: true, isDeleted: { $ne: true } });
    const rows = await Donation.find(filter).sort({ collectedAt: -1 }).limit(300).lean();
    res.status(200).json({
      status: 'success',
      data: rows.map(d => ({
        id: d._id, receiptNo: d.receiptNo, txnId: d.txnId, donorName: d.donorName, donorPhone: d.donorPhone,
        campaignTitle: d.title, amount: d.amount, paymentMode: d.paymentMode, city: d.city,
        collectedByName: d.collectedByName, collectedByRole: d.collectedByRole, collectedAt: d.collectedAt,
        donorLinked: !!d.user
      }))
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
