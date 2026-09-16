const Fund = require('../../models/Fund');
const Contribution = require('../../models/Contribution');
const FundExpense = require('../../models/FundExpense');
const User = require('../../models/User');
const Community = require('../../models/Community');
const { notifyFundCreated, createBroadcastNotification } = require('../../services/notificationService');

// Helper: Format date
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

// 1. Get All Funds (Administrative Data Table)
exports.getAllFunds = async (req, res) => {
  try {
    const { communityId, scope, status } = req.query;
    const filter = {};
    if (communityId && communityId !== 'All') filter.communityId = communityId;
    if (scope && scope !== 'All') filter.scope = scope;
    if (status && status !== 'All') filter.status = status;

    const funds = await Fund.find(filter)
      .populate('createdBy', 'name')
      .populate('communityId', 'name')
      .sort({ createdAt: -1 });

    const formatted = [];
    for (const f of funds) {
      // Aggregate contributions
      const contributions = await Contribution.find({ fundId: f._id });
      const totalCollected = contributions.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const totalContributors = contributions.filter(c => c.paidAmount > 0).length;
      
      // Aggregate expenses
      const expenses = await FundExpense.find({ fundId: f._id });
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      formatted.push({
        id: f._id.toString(),
        name: f.name,
        purpose: f.purpose || '',
        description: f.description || '',
        scope: f.scope,
        communityName: f.communityId ? f.communityId.name : 'All Communities (Global)',
        communityId: f.communityId ? f.communityId._id : null,
        targetAmount: f.targetAmount,
        contributionPerMember: f.contributionPerMember,
        collectedAmount: totalCollected,
        remainingAmount: Math.max(0, f.targetAmount - totalCollected),
        expenseAmount: totalExpenses,
        availableBalance: totalCollected - totalExpenses,
        totalContributors,
        startDate: formatDate(f.startDate),
        endDate: formatDate(f.endDate),
        dueDate: formatDate(f.dueDate),
        status: f.status,
        createdBy: f.createdBy ? f.createdBy.name : 'System Admin',
        createdDate: f.createdAt
      });
    }

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('getAllFunds error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Get Fund Details By ID
exports.getFundById = async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('communityId', 'name');

    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found' });
    }

    const contributions = await Contribution.find({ fundId: fund._id });
    const totalCollected = contributions.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const totalContributors = contributions.filter(c => c.paidAmount > 0).length;

    const expenses = await FundExpense.find({ fundId: fund._id });
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const data = {
      id: fund._id.toString(),
      name: fund.name,
      purpose: fund.purpose || '',
      description: fund.description || '',
      scope: fund.scope,
      communityName: fund.communityId ? fund.communityId.name : 'All Communities (Global)',
      communityId: fund.communityId ? fund.communityId._id : null,
      targetAmount: fund.targetAmount,
      contributionPerMember: fund.contributionPerMember,
      collectedAmount: totalCollected,
      remainingAmount: Math.max(0, fund.targetAmount - totalCollected),
      expenseAmount: totalExpenses,
      availableBalance: totalCollected - totalExpenses,
      totalContributors,
      startDate: formatDate(fund.startDate),
      endDate: formatDate(fund.endDate),
      dueDate: formatDate(fund.dueDate),
      status: fund.status,
      createdBy: fund.createdBy ? fund.createdBy.name : 'System Admin',
      createdDate: fund.createdAt
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getFundById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Create Fund (Scope: GLOBAL or COMMUNITY)
exports.createFund = async (req, res) => {
  try {
    const { name, purpose, description, targetAmount, contributionPerMember, startDate, endDate, dueDate, scope, communityId } = req.body;

    if (!name || !targetAmount || !contributionPerMember || !scope) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    const fund = new Fund({
      name,
      purpose,
      description,
      targetAmount: Number(targetAmount),
      contributionPerMember: Number(contributionPerMember),
      startDate: startDate || new Date(),
      endDate: endDate || null,
      dueDate: dueDate || null,
      scope,
      communityId: scope === 'COMMUNITY' ? communityId : null,
      createdBy: req.user._id
    });

    await fund.save();

    // Query members to seed contributions ledger
    let memberQuery = { role: 'user', accountStatus: { $ne: 'deleted' } };
    if (scope === 'COMMUNITY') {
      memberQuery.communityId = communityId;
    }

    const members = await User.find(memberQuery);
    const contributions = members.map(m => ({
      fundId: fund._id,
      memberId: m._id,
      communityId: m.communityId || communityId || null,
      assignedAmount: fund.contributionPerMember,
      paidAmount: 0,
      transactions: []
    })).filter(c => c.communityId !== null); // Ensure communityId is resolved for each contribution record

    if (contributions.length > 0) {
      await Contribution.insertMany(contributions);
    }

    // ── Broadcast notification to members about new fund ─────────────────────
    try {
      if (scope === 'COMMUNITY' && communityId) {
        createBroadcastNotification({
          communityId,
          module: 'funds',
          type: 'fund_created',
          title: 'New Samaj Fund 💼',
          message: `A new community fund "${fund.name}" has been created.`,
          icon: '💼',
          priority: 'high',
          actionUrl: '/member/fund',
          referenceId: fund._id,
          referenceType: 'Fund'
        });
      } else if (members.length > 0) {
        notifyFundCreated(members.map(m => m._id), fund.name, fund._id);
      }
    } catch (notifErr) {
      console.warn('[Notify] Admin createFund notification failed:', notifErr.message);
    }

    res.status(201).json({ success: true, data: fund });
  } catch (error) {
    console.error('createFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Update Fund (checks if contributions already exist)
exports.updateFund = async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found' });
    }

    const { name, purpose, description, targetAmount, contributionPerMember, startDate, endDate, dueDate, status, scope, communityId } = req.body;

    // Check if payments already exist
    const hasPayments = await Contribution.exists({ fundId: fund._id, paidAmount: { $gt: 0 } });
    if (hasPayments) {
      // Prevent changing core financial scope/fees to prevent ledger corruption
      if (
        (contributionPerMember && Number(contributionPerMember) !== fund.contributionPerMember) ||
        (scope && scope !== fund.scope) ||
        (communityId && communityId.toString() !== (fund.communityId || '').toString())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update financial properties or scope because members have already made payments.'
        });
      }
    }

    // Apply updates
    if (name) fund.name = name;
    if (purpose !== undefined) fund.purpose = purpose;
    if (description !== undefined) fund.description = description;
    if (targetAmount) fund.targetAmount = Number(targetAmount);
    if (startDate) fund.startDate = startDate;
    if (endDate !== undefined) fund.endDate = endDate;
    if (dueDate !== undefined) fund.dueDate = dueDate;
    if (status) fund.status = status;

    if (!hasPayments) {
      if (contributionPerMember) fund.contributionPerMember = Number(contributionPerMember);
      if (scope) fund.scope = scope;
      if (scope === 'COMMUNITY') {
        fund.communityId = communityId;
      } else {
        fund.communityId = null;
      }
    }

    await fund.save();

    // If financial contribution amount per member has changed and there are no payments, update ledgers!
    if (!hasPayments && contributionPerMember && Number(contributionPerMember) !== fund.contributionPerMember) {
      await Contribution.updateMany(
        { fundId: fund._id },
        { assignedAmount: Number(contributionPerMember) }
      );
    }

    // ── Broadcast notification to members about fund update ─────────────────────
    try {
      const targetCommId = fund.communityId;
      if (targetCommId) {
        createBroadcastNotification({
          communityId: targetCommId,
          module: 'funds',
          type: 'fund_updated',
          title: 'Samaj Fund Updated 💼',
          message: `The fund "${fund.name}" has been updated.`,
          icon: '💼',
          priority: 'normal',
          actionUrl: '/member/fund',
          referenceId: fund._id,
          referenceType: 'Fund'
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] Admin updateFund notification failed:', notifErr.message);
    }

    res.status(200).json({ success: true, data: fund });
  } catch (error) {
    console.error('updateFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Delete Fund
exports.deleteFund = async (req, res) => {
  try {
    const fund = await Fund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found' });
    }

    // Check if payments already exist
    const hasPayments = await Contribution.exists({ fundId: fund._id, paidAmount: { $gt: 0 } });
    if (hasPayments) {
      // Force change status to Closed/Expired instead of hard-delete to preserve history
      fund.status = 'Closed';
      await fund.save();
      return res.status(400).json({
        success: false,
        message: 'Fund has existing transaction history. It cannot be deleted, so it has been archived/closed instead.'
      });
    }

    // Delete fund, expenses, and ledger entries
    await Fund.findByIdAndDelete(req.params.id);
    await Contribution.deleteMany({ fundId: req.params.id });
    await FundExpense.deleteMany({ fundId: req.params.id });

    res.status(200).json({ success: true, message: 'Fund deleted successfully.' });
  } catch (error) {
    console.error('deleteFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Get Member Ledger contributions
exports.getFundContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find({ fundId: req.params.id })
      .populate('memberId', 'name email phone avatar');

    const formatted = contributions.map(c => ({
      memberId: c.memberId ? c.memberId._id : null,
      name: c.memberId ? c.memberId.name : 'Unknown Member',
      email: c.memberId ? c.memberId.email : '',
      phone: c.memberId ? c.memberId.phone : '',
      avatar: c.memberId ? c.memberId.avatar : '',
      assignedAmount: c.assignedAmount,
      paidAmount: c.paidAmount,
      remainingAmount: Math.max(0, c.assignedAmount - c.paidAmount),
      status: c.paidAmount >= c.assignedAmount ? 'Paid' : c.paidAmount > 0 ? 'Partial' : 'Pending',
      lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString('en-GB') : '-'
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('getFundContributions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. Get Fund Expenses
exports.getFundExpenses = async (req, res) => {
  try {
    const expenses = await FundExpense.find({ fundId: req.params.id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('getFundExpenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Get Fund Transactions list
exports.getFundTransactions = async (req, res) => {
  try {
    const contributions = await Contribution.find({ fundId: req.params.id })
      .populate('memberId', 'name phone');

    const list = [];
    contributions.forEach(c => {
      c.transactions.forEach(t => {
        list.push({
          id: t._id,
          txnId: t.txnId,
          memberName: c.memberId ? c.memberId.name : 'Unknown Member',
          memberPhone: c.memberId ? c.memberId.phone : '',
          amount: t.amount,
          paymentMode: t.paymentMode,
          status: t.status,
          date: t.date
        });
      });
    });

    // Sort newest transactions first
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('getFundTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 9. Get Overall Analytics Stats
exports.getFundStats = async (req, res) => {
  try {
    const funds = await Fund.find({});
    const totalFunds = funds.length;
    const globalCount = funds.filter(f => f.scope === 'GLOBAL').length;
    const communityCount = funds.filter(f => f.scope === 'COMMUNITY').length;

    let overallTarget = 0;
    let overallCollected = 0;
    let overallExpenses = 0;

    for (const f of funds) {
      overallTarget += f.targetAmount || 0;
      
      const contributions = await Contribution.find({ fundId: f._id });
      overallCollected += contributions.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

      const expenses = await FundExpense.find({ fundId: f._id });
      overallExpenses += expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    res.status(200).json({
      success: true,
      data: {
        totalFunds,
        globalCount,
        communityCount,
        overallTarget,
        overallCollected,
        overallExpenses,
        availableBalance: overallCollected - overallExpenses
      }
    });
  } catch (error) {
    console.error('getFundStats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
