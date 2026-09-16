const Fund = require('../../models/Fund');
const Contribution = require('../../models/Contribution');
const FundExpense = require('../../models/FundExpense');
const User = require('../../models/User');
const { notifyFundCreated, createNotification, createBroadcastNotification } = require('../../services/notificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

const getCommunityId = (req) => {
  let communityId = req.communityId || req.user?.communityId;
  if (communityId) return communityId;
  if (req.user?.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
    return req.user.assignedCommunityIds[0];
  }
  // Legacy fallback: string-name community kept for backward compatibility with unmigrated user records
  if (req.user?.community) {
    return req.user.community;
  }
  return null;
};

// 1. Get Head Panel Funds (Scoped by role: Community Head vs Local Head vs Admin)
exports.getFunds = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = {};
    if (isAdmin) {
      if (req.query.communityId) {
        query.communityId = req.query.communityId;
      }
    } else if (isLocalHead) {
      // Local Head sees COMMUNITY-level funds + LOCAL funds created by themselves
      query = {
        communityId,
        $or: [
          { scope: 'COMMUNITY' },
          { scope: 'LOCAL', createdBy: req.user._id },
          { scope: 'LOCAL', localHeadId: req.user._id }
        ]
      };
    } else {
      // Community Head sees all funds under their community (both COMMUNITY & LOCAL)
      query = { communityId };
    }

    const funds = await Fund.find(query)
      .populate('createdBy', 'name role city')
      .populate('localHeadId', 'name city')
      .sort({ createdAt: -1 });

    const formatted = [];
    for (const f of funds) {
      const contributions = await Contribution.find({ fundId: f._id });
      const totalCollected = contributions.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const totalContributors = contributions.filter(c => c.paidAmount > 0).length;

      const expenses = await FundExpense.find({ fundId: f._id });
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const creatorName = f.createdBy?.name || (f.creatorType === 'LOCAL_HEAD' ? 'Local Head' : 'Community Head');
      const creatorCity = f.city || f.localHeadId?.city || f.createdBy?.city || '';

      formatted.push({
        id: f._id.toString(),
        name: f.name,
        purpose: f.purpose || '',
        description: f.description || '',
        scope: f.scope,
        creatorRole: f.creatorRole || 'head',
        creatorType: f.creatorType || 'COMMUNITY_HEAD',
        localHeadId: f.localHeadId ? f.localHeadId._id || f.localHeadId : null,
        city: creatorCity,
        communityId: f.communityId,
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
        createdBy: creatorName,
        createdDate: f.createdAt
      });
    }

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('getHeadFunds error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Get Fund Details by ID
exports.getFundById = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = { _id: req.params.id };
    if (!isAdmin) {
      query.communityId = communityId;
      if (isLocalHead) {
        query.$or = [
          { scope: 'COMMUNITY' },
          { scope: 'LOCAL', createdBy: req.user._id },
          { scope: 'LOCAL', localHeadId: req.user._id }
        ];
      }
    }

    const fund = await Fund.findOne(query)
      .populate('createdBy', 'name role city')
      .populate('localHeadId', 'name city');

    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied or Fund not found.' });
    }

    const contributions = await Contribution.find({ fundId: fund._id });
    const totalCollected = contributions.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const totalContributors = contributions.filter(c => c.paidAmount > 0).length;

    const expenses = await FundExpense.find({ fundId: fund._id });
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const creatorName = fund.createdBy?.name || (fund.creatorType === 'LOCAL_HEAD' ? 'Local Head' : 'Community Head');
    const creatorCity = fund.city || fund.localHeadId?.city || fund.createdBy?.city || '';

    const data = {
      id: fund._id.toString(),
      name: fund.name,
      purpose: fund.purpose || '',
      description: fund.description || '',
      scope: fund.scope,
      creatorRole: fund.creatorRole || 'head',
      creatorType: fund.creatorType || 'COMMUNITY_HEAD',
      localHeadId: fund.localHeadId ? fund.localHeadId._id || fund.localHeadId : null,
      city: creatorCity,
      communityId: fund.communityId,
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
      createdBy: creatorName,
      createdDate: fund.createdAt
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getHeadFundById error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Create Fund (Community Head vs Local Head)
exports.createFund = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    const communityId = payload.communityId || getCommunityId(req);
    if (!communityId) {
      return res.status(403).json({ success: false, message: 'Access Denied. No community assigned.' });
    }

    const { name, purpose, description, targetAmount, contributionPerMember, startDate, endDate, dueDate, city } = req.body;

    if (!name || !targetAmount || !contributionPerMember) {
      return res.status(400).json({ success: false, message: 'Required fields missing: Fund Name, Target Goal, and Contribution Amount are mandatory.' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let scope = 'COMMUNITY';
    let creatorRole = 'head';
    let creatorType = 'COMMUNITY_HEAD';
    let localHeadId = null;
    let targetCity = null;

    if (isLocalHead) {
      scope = 'LOCAL';
      creatorRole = 'sub_head';
      creatorType = 'LOCAL_HEAD';
      localHeadId = req.user._id;
      targetCity = city || req.user.city || null;
    } else if (isAdmin) {
      scope = req.body.scope || 'COMMUNITY';
      creatorRole = 'admin';
      creatorType = 'ADMIN';
      targetCity = city || null;
    } else {
      scope = 'COMMUNITY';
      creatorRole = 'head';
      creatorType = 'COMMUNITY_HEAD';
      targetCity = null;
    }

    // Safely parse dates to prevent CastError from empty string ""
    const parsedStartDate = (startDate && !isNaN(new Date(startDate).getTime())) ? new Date(startDate) : new Date();
    const parsedEndDate = (endDate && !isNaN(new Date(endDate).getTime())) ? new Date(endDate) : null;
    const parsedDueDate = (dueDate && !isNaN(new Date(dueDate).getTime())) ? new Date(dueDate) : null;

    const fund = new Fund({
      name: name.trim(),
      purpose: purpose ? purpose.trim() : '',
      description: description ? description.trim() : '',
      targetAmount: Number(targetAmount),
      contributionPerMember: Number(contributionPerMember),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      dueDate: parsedDueDate,
      scope,
      creatorRole,
      creatorType,
      localHeadId,
      city: targetCity ? targetCity.trim() : null,
      communityId,
      createdBy: req.user._id
    });

    await fund.save();

    // Seed contributions ledger for members
    // For LOCAL funds, assign to members in the same city (or fallback to community users)
    let memberQuery = { communityId, role: 'user', accountStatus: { $ne: 'deleted' } };
    if (scope === 'LOCAL' && targetCity) {
      const escapedCity = targetCity.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      memberQuery.city = new RegExp(`^${escapedCity}$`, 'i');
    }

    let members = await User.find(memberQuery);
    // If no members in that specific city query, seed with all community members so ledger is usable
    if (members.length === 0 && scope === 'LOCAL') {
      members = await User.find({ communityId, role: 'user', accountStatus: { $ne: 'deleted' } });
    }

    const contributions = members.map(m => ({
      fundId: fund._id,
      memberId: m._id,
      communityId,
      assignedAmount: fund.contributionPerMember,
      paidAmount: 0,
      transactions: []
    }));

    if (contributions.length > 0) {
      await Contribution.insertMany(contributions);
      fund.assignedMembers = members.map(m => m._id);
      await fund.save();
    }

    // ── Notification: notify members about new fund ─────────────────────
    try {
      if (members.length > 0) {
        notifyFundCreated(members.map(m => m._id), fund.name, fund._id);
      }
    } catch (notifErr) {
      console.warn('[Notify] createFund fund_created failed:', notifErr.message);
    }

    res.status(201).json({ success: true, data: fund });
  } catch (error) {
    console.error('createHeadFund error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// 4. Update Fund
exports.updateFund = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = { _id: req.params.id };
    if (!isAdmin) {
      query.communityId = communityId;
      if (isLocalHead) {
        query.createdBy = req.user._id;
      }
    }

    const fund = await Fund.findOne(query);
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied or Fund not found.' });
    }

    const { name, purpose, description, targetAmount, contributionPerMember, startDate, endDate, dueDate, status } = req.body;

    // Check if payments exist
    const hasPayments = await Contribution.exists({ fundId: fund._id, paidAmount: { $gt: 0 } });
    if (hasPayments) {
      if (contributionPerMember && Number(contributionPerMember) !== fund.contributionPerMember) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update contribution fees because members have already made payments.'
        });
      }
    }

    if (name) fund.name = name;
    if (purpose !== undefined) fund.purpose = purpose;
    if (description !== undefined) fund.description = description;
    if (targetAmount) fund.targetAmount = Number(targetAmount);
    if (startDate) fund.startDate = startDate;
    if (endDate !== undefined) fund.endDate = endDate;
    if (dueDate !== undefined) fund.dueDate = dueDate;
    if (status) fund.status = status;

    if (!hasPayments && contributionPerMember) {
      fund.contributionPerMember = Number(contributionPerMember);
    }

    await fund.save();

    // Sync ledgers if the contribution fee changed
    if (!hasPayments && contributionPerMember && Number(contributionPerMember) !== fund.contributionPerMember) {
      await Contribution.updateMany(
        { fundId: fund._id },
        { assignedAmount: Number(contributionPerMember) }
      );
    }

    // ── Broadcast notification to members about fund update ─────────────────────
    try {
      if (communityId) {
        createBroadcastNotification({
          communityId,
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
      console.warn('[Notify] updateHeadFund notification failed:', notifErr.message);
    }

    res.status(200).json({ success: true, data: fund });
  } catch (error) {
    console.error('updateHeadFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Delete Fund
exports.deleteFund = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = { _id: req.params.id };
    if (!isAdmin) {
      query.communityId = communityId;
      if (isLocalHead) {
        query.createdBy = req.user._id;
      }
    }

    const fund = await Fund.findOne(query);
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied or Fund not found.' });
    }

    const hasPayments = await Contribution.exists({ fundId: fund._id, paidAmount: { $gt: 0 } });
    if (hasPayments) {
      fund.status = 'Closed';
      await fund.save();
      return res.status(400).json({
        success: false,
        message: 'Fund has transaction records. It has been closed/archived instead of deleted.'
      });
    }

    await Fund.findByIdAndDelete(req.params.id);
    await Contribution.deleteMany({ fundId: req.params.id });
    await FundExpense.deleteMany({ fundId: req.params.id });

    res.status(200).json({ success: true, message: 'Fund deleted successfully.' });
  } catch (error) {
    console.error('deleteHeadFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Get contributions ledger
exports.getFundContributions = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const fund = await Fund.findOne({ _id: req.params.id, communityId });
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const contributions = await Contribution.find({ fundId: fund._id })
      .populate('memberId', 'name email phone avatar city');

    const formatted = contributions.map(c => ({
      memberId: c.memberId ? c.memberId._id : null,
      name: c.memberId ? c.memberId.name : 'Unknown Member',
      email: c.memberId ? c.memberId.email : '',
      phone: c.memberId ? c.memberId.phone : '',
      avatar: c.memberId ? c.memberId.avatar : '',
      city: c.memberId ? c.memberId.city : '',
      assignedAmount: c.assignedAmount,
      paidAmount: c.paidAmount,
      remainingAmount: Math.max(0, c.assignedAmount - c.paidAmount),
      status: c.paidAmount >= c.assignedAmount ? 'Paid' : c.paidAmount > 0 ? 'Partial' : 'Pending',
      lastPaymentDate: c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString('en-GB') : '-',
      transactionsCount: c.transactions ? c.transactions.length : 0
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('getHeadFundContributions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. Get expenses
exports.getFundExpenses = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const fund = await Fund.findOne({ _id: req.params.id, communityId });
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const expenses = await FundExpense.find({ fundId: fund._id }).sort({ date: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    console.error('getHeadFundExpenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Add Expense
exports.addExpense = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    const communityId = payload.communityId || getCommunityId(req);
    const fund = await Fund.findOne({ _id: req.params.id, communityId });
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const { title, description, amount, category, date, receiptAttached } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    const expense = new FundExpense({
      fundId: fund._id,
      communityId,
      title,
      description,
      amount: Number(amount),
      category: category || 'General',
      date: date || new Date(),
      addedBy: req.user.name || (req.user.role === 'sub_head' ? 'Local Head' : 'Community Head'),
      receiptAttached: receiptAttached || false
    });

    await expense.save();
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    console.error('addHeadFundExpense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 9. Get transactions list
exports.getFundTransactions = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const fund = await Fund.findOne({ _id: req.params.id, communityId });
    if (!fund) {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const contributions = await Contribution.find({ fundId: fund._id })
      .populate('memberId', 'name phone avatar')
      .populate('transactions.collectedBy', 'name');

    const list = [];
    contributions.forEach(c => {
      (c.transactions || []).forEach(t => {
        list.push({
          id: t._id,
          txnId: t.txnId,
          memberName: c.memberId ? c.memberId.name : 'Unknown Member',
          memberPhone: c.memberId ? c.memberId.phone : '',
          memberAvatar: c.memberId ? c.memberId.avatar : '',
          amount: t.amount,
          paymentMode: t.paymentMode || 'Online',
          status: t.status,
          date: t.date || t.paidAt,
          collectedBy: t.collectedByName || (t.collectedBy ? t.collectedBy.name : null),
          receiptNo: t.receiptNo || null,
          notes: t.notes || null
        });
      });
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error('getHeadFundTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 10. Record Cash Payment (Executed by Local Head or Community Head)
exports.recordCashPayment = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    const fund = await Fund.findOne({ _id: req.params.id, communityId });
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found or unauthorized.' });
    }

    const { memberId, amount: rawAmount, receiptNo, notes, date } = req.body;
    const amount = Number(rawAmount || 0);

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required.' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const member = await User.findOne({ _id: memberId, communityId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found in this community.' });
    }

    let contribution = await Contribution.findOne({ fundId: fund._id, memberId });
    if (!contribution) {
      contribution = new Contribution({
        fundId: fund._id,
        memberId,
        communityId,
        assignedAmount: fund.contributionPerMember,
        paidAmount: 0,
        transactions: []
      });
    }

    const collectorRole = req.user.role === 'sub_head' ? 'Local Head' : 'Community Head';
    const collectorName = req.user.name ? `${req.user.name} (${collectorRole})` : collectorRole;
    const txnId = `CASH_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentDate = date ? new Date(date) : new Date();

    contribution.transactions.push({
      txnId,
      amount,
      paymentMode: 'Cash',
      paymentMethod: 'Cash',
      currency: 'INR',
      status: 'Approved',
      paidAt: paymentDate,
      date: paymentDate,
      collectedBy: req.user._id,
      collectedByName: collectorName,
      receiptNo: receiptNo || null,
      notes: notes || null
    });

    contribution.paidAmount = contribution.transactions
      .filter(t => t.status === 'Approved')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    contribution.lastPaymentDate = paymentDate;
    await contribution.save();

    // ── Send Notification to Member ──────────────────────────────────────────
    try {
      await createNotification({
        userId: member._id,
        communityId: fund.communityId,
        module: 'fund',
        type: 'fund_cash_collected',
        title: 'Cash Contribution Recorded',
        message: `₹${amount.toLocaleString('en-IN')} cash payment for ${fund.name} was successfully recorded and verified by ${collectorName}.`,
        icon: '💵',
        priority: 'high',
        actionUrl: `/member/fund/${fund._id}`,
        referenceId: fund._id,
        referenceType: 'Fund'
      });
    } catch (notifErr) {
      console.warn('[Notify] recordCashPayment notification warning:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `₹${amount} cash contribution recorded successfully for ${member.name}.`,
      data: {
        txnId,
        memberId: member._id,
        memberName: member.name,
        amount,
        paidAmount: contribution.paidAmount,
        remainingAmount: Math.max(0, contribution.assignedAmount - contribution.paidAmount),
        collectedBy: collectorName,
        paymentDate
      }
    });

  } catch (error) {
    console.error('recordCashPayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record cash payment.' });
  }
};

// 11. Get overall stats (Role-scoped for Head / Local Head)
exports.getStats = async (req, res) => {
  try {
    const communityId = getCommunityId(req);
    if (!communityId) {
      return res.status(403).json({ success: false, message: 'Access Denied.' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isLocalHead = userRole === 'sub_head' || req.user?.accountType === 'local_head';
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);

    let query = {};
    if (isAdmin) {
      if (req.query.communityId) query.communityId = req.query.communityId;
    } else if (isLocalHead) {
      query = {
        communityId,
        $or: [
          { scope: 'COMMUNITY' },
          { scope: 'LOCAL', createdBy: req.user._id },
          { scope: 'LOCAL', localHeadId: req.user._id }
        ]
      };
    } else {
      query = { communityId };
    }

    const funds = await Fund.find(query);
    const totalFunds = funds.length;
    const activeCount = funds.filter(f => f.status === 'Active').length;
    const completedCount = funds.filter(f => f.status === 'Completed').length;

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
        activeCount,
        completedCount,
        overallTarget,
        overallCollected,
        overallExpenses,
        overallPending: Math.max(0, overallTarget - overallCollected),
        availableBalance: overallCollected - overallExpenses
      }
    });
  } catch (error) {
    console.error('getHeadFundStats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
