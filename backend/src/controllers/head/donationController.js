const Donation = require('../../models/Donation');
const Expense = require('../../models/Expense');
const DonationCategory = require('../../models/DonationCategory');
const User = require('../../models/User');
const { notifyCampaignCreated, createBroadcastNotification } = require('../../services/notificationService');
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
      createdDate: c.createdAt,
      lastUpdated: c.updatedAt,
      coverImage: c.coverImage || '',
      bannerImage: c.coverImage || ''
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


