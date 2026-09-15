const mongoose = require('mongoose');
const crypto   = require('crypto');
const Fund         = require('../../models/Fund');
const Contribution = require('../../models/Contribution');
const FundExpense  = require('../../models/FundExpense');
const User         = require('../../models/User');
const paymentService = require('../../services/paymentService');
const { notifyContributionRecorded } = require('../../services/notificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

// Helper: Format Date as DD MMM YYYY (e.g. "12 Jun 2024")
const formatDisplayDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// 1. Unified Funds Loader (Community & Local Head scoped)
// Fetches funds, contributions, expenses, and community users
exports.getFundsData = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);
    const communityId = req.communityId || req.user?.communityId;
    const userCity = req.user?.city || '';
    const myId = req.user._id;

    let fundQuery = {};
    if (isAdmin) {
      if (req.query.communityId) fundQuery.communityId = req.query.communityId;
    } else {
      const conditions = [
        { scope: 'GLOBAL' }
      ];

      if (communityId) {
        // Return all Community Master funds AND Local Chapter funds for this community
        conditions.push({ communityId });
      }

      fundQuery = { $or: conditions };
    }

    // 1. Fetch all matching funds
    const fundsList = await Fund.find(fundQuery)
      .populate('createdBy', 'name role city designation')
      .populate('localHeadId', 'name city designation')
      .sort({ createdAt: -1 })
      .lean();

    const fundIds = fundsList.map(f => f._id);

    // 2. Bulk self-healing check: Ensure the current user has a contribution ledger for each fund
    if (communityId && myId && fundIds.length > 0) {
      const existingMyContribs = await Contribution.find({
        fundId: { $in: fundIds },
        memberId: myId
      }).select('fundId').lean();

      const existingFundIdSet = new Set(existingMyContribs.map(c => c.fundId.toString()));
      const missingContribs = [];

      for (let i = 0; i < fundsList.length; i++) {
        const f = fundsList[i];
        if (!existingFundIdSet.has(f._id.toString())) {
          missingContribs.push({
            fundId: f._id,
            memberId: myId,
            communityId,
            assignedAmount: f.contributionPerMember,
            paidAmount: 0,
            transactions: []
          });
        }
      }

      if (missingContribs.length > 0) {
        await Contribution.insertMany(missingContribs);
      }
    }

    // 3. Fetch all community members
    const memberQuery = communityId
      ? { communityId, accountStatus: { $ne: 'deleted' } }
      : { accountStatus: { $ne: 'deleted' } };

    const membersList = await User.find(memberQuery)
      .select('name phone avatar city')
      .lean();

    // 4. Fetch all contributions and expenses for these funds
    const contributionsList = fundIds.length > 0
      ? await Contribution.find({ fundId: { $in: fundIds } }).lean()
      : [];
    const expensesList = fundIds.length > 0
      ? await FundExpense.find({ fundId: { $in: fundIds } }).sort({ date: -1 }).lean()
      : [];

    // 5. Format output
    const memberIdsStr = membersList.map(m => m._id.toString());
    const formattedFunds = fundsList.map(f => {
      const creatorName = f.createdBy?.name || (f.creatorType === 'LOCAL_HEAD' ? 'Local Head' : 'Community Head');
      const creatorCity = f.city || f.localHeadId?.city || f.createdBy?.city || '';

      return {
        id: f._id.toString(),
        name: f.name,
        purpose: f.purpose || '',
        description: f.description || '',
        scope: f.scope || 'COMMUNITY',
        creatorRole: f.creatorRole || 'head',
        creatorType: f.creatorType || 'COMMUNITY_HEAD',
        localHeadId: f.localHeadId ? (f.localHeadId._id || f.localHeadId).toString() : null,
        city: creatorCity,
        createdBy: creatorName,
        targetAmount: f.targetAmount,
        contributionPerMember: f.contributionPerMember,
        dueDate: f.dueDate ? new Date(f.dueDate).toISOString().split('T')[0] : '',
        startDate: f.startDate ? new Date(f.startDate).toISOString().split('T')[0] : '',
        endDate: f.endDate ? new Date(f.endDate).toISOString().split('T')[0] : '',
        status: f.status,
        assignedMembers: (f.assignedMembers && f.assignedMembers.length > 0) ? f.assignedMembers.map(m => m.toString()) : memberIdsStr
      };
    });

    // Build HashMap for O(1) contribution matrix lookups
    const contribMap = new Map();
    for (let i = 0; i < contributionsList.length; i++) {
      const c = contributionsList[i];
      contribMap.set(`${c.fundId.toString()}_${c.memberId.toString()}`, c);
    }

    const formattedContributions = {};
    for (let i = 0; i < fundIds.length; i++) {
      const fIdStr = fundIds[i].toString();
      formattedContributions[fIdStr] = membersList.map(m => {
        const mIdStr = m._id.toString();
        const found = contribMap.get(`${fIdStr}_${mIdStr}`);

        return {
          memberId: mIdStr,
          name: m.name,
          phone: m.phone,
          avatar: m.avatar,
          city: m.city,
          assignedAmount: found ? found.assignedAmount : 0,
          paidAmount: found ? found.paidAmount : 0,
          lastPaymentDate: found && found.lastPaymentDate ? formatDisplayDate(found.lastPaymentDate) : null
        };
      });
    }

    // Group expenses by fundId
    const formattedExpenses = {};
    for (let i = 0; i < fundIds.length; i++) {
      formattedExpenses[fundIds[i].toString()] = [];
    }

    for (let i = 0; i < expensesList.length; i++) {
      const e = expensesList[i];
      const key = e.fundId.toString();
      if (formattedExpenses[key]) {
        formattedExpenses[key].push({
          id: e._id.toString(),
          title: e.title,
          category: e.category || 'General',
          amount: e.amount,
          date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
          addedBy: e.addedBy || 'Admin',
          receiptAttached: e.receiptAttached || false
        });
      }
    }

    const formattedUsers = membersList.map(m => ({
      id: m._id.toString(),
      name: m.name || 'Member',
      phone: m.phone || '',
      avatar: m.avatar || '',
      city: m.city || '',
      profilePic: m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M'
    }));

    res.status(200).json({
      success: true,
      data: {
        funds: formattedFunds,
        contributions: formattedContributions,
        expenses: formattedExpenses,
        mockUsers: formattedUsers
      }
    });

  } catch (error) {
    console.error('getFundsData error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// 2. Submit a payment/contribution
// ⚠️  DEPRECATED: This route only handles online/gateway verified payments. Direct cash payments are blocked for members.
exports.makePayment = async (req, res) => {
  try {
    const { fundId } = req.params;
    const { amount, paymentMethod } = req.body;
    const myId = req.user._id;

    if (paymentMethod && paymentMethod.toLowerCase() === 'cash') {
      return res.status(400).json({
        success: false,
        message: 'Cash payments cannot be self-submitted. Please give physical cash to your Local Head or Community Head, who will update your verified digital receipt.'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const fund = await Fund.findById(fundId);
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found' });
    }

    // Find or create ledger
    let contribution = await Contribution.findOne({ fundId, memberId: myId });
    if (!contribution) {
      contribution = new Contribution({
        fundId,
        memberId: myId,
        communityId: req.communityId,
        assignedAmount: fund.contributionPerMember,
        paidAmount: 0,
        transactions: []
      });
    }

    // Deduplication check: verify we don't process a duplicate txnId if passed
    const txnId = req.body.txnId || `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const duplicate = contribution.transactions.some(t => t.txnId === txnId);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Transaction already processed.' });
    }

    // Add transaction record
    contribution.transactions.push({
      txnId,
      amount: Number(amount),
      paymentMode: paymentMethod || 'Online (UPI)',
      status: 'Approved',
      date: new Date()
    });

    // Update paidAmount sum
    contribution.paidAmount = contribution.transactions
      .filter(t => t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    contribution.lastPaymentDate = new Date();

    await contribution.save();

    // ── Notification: notify head about contribution ─────────────────────────────
    try {
      const Community = require('../../models/Community');
      const comm = await Community.findById(fund.communityId || req.communityId).select('headId').lean();
      if (comm?.headId) {
        notifyContributionRecorded(comm.headId, req.user.name || 'A member', amount, fund.name, fund._id);
      }
    } catch (notifErr) {
      console.warn('[Notify] makePayment contribution_recorded failed:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        memberId: myId.toString(),
        assignedAmount: contribution.assignedAmount,
        paidAmount: contribution.paidAmount,
        lastPaymentDate: formatDisplayDate(contribution.lastPaymentDate)
      }
    });

  } catch (error) {
    console.error('makePayment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Create Fund (Head/Admin role)
exports.createFund = async (req, res) => {
  try {
    // Only head/admin can create funds
    if (!['head', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const payload = inheritTenantPayload(req, req.body);
    const { name, purpose, description, targetAmount, contributionPerMember, startDate, endDate, dueDate, scope } = req.body;
    const communityId = payload.communityId;

    if (!name || !targetAmount || !contributionPerMember) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    // Secure Scoping: Head can ONLY create COMMUNITY-scoped funds for their own chapter.
    // Admin can create either GLOBAL or COMMUNITY-scoped funds.
    const resolvedScope = req.user.role === 'admin' ? (scope || 'GLOBAL') : 'COMMUNITY';
    const resolvedCommunityId = resolvedScope === 'GLOBAL' ? null : communityId;

    const fund = new Fund({
      name,
      purpose,
      description,
      targetAmount: Number(targetAmount),
      contributionPerMember: Number(contributionPerMember),
      startDate: startDate || new Date(),
      endDate: endDate || null,
      dueDate: dueDate || null,
      scope: resolvedScope,
      communityId: resolvedCommunityId,
      createdBy: req.user._id
    });

    await fund.save();

    // Seed contributions ledger for all matching members
    let memberQuery = { role: 'user', accountStatus: { $ne: 'deleted' } };
    if (resolvedScope === 'COMMUNITY') {
      memberQuery.communityId = resolvedCommunityId;
    }
    const members = await User.find(memberQuery);
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
    }

    res.status(201).json({ success: true, data: fund });

  } catch (error) {
    console.error('createFund error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Add Fund Expense (Head/Admin role)
exports.addExpense = async (req, res) => {
  try {
    if (!['head', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const { fundId } = req.params;
    const { title, description, amount, category, date, receiptAttached } = req.body;
    const communityId = req.communityId || req.user.communityId;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    const expense = new FundExpense({
      fundId,
      communityId,
      title,
      description,
      amount: Number(amount),
      category: category || 'General',
      date: date || new Date(),
      addedBy: req.user.name || 'Admin',
      receiptAttached: receiptAttached || false
    });

    await expense.save();
    res.status(201).json({ success: true, data: expense });

  } catch (error) {
    console.error('addExpense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Get My Fund History (Logged-in member history of transactions across all funds)
exports.getHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const contributions = await Contribution.find({ memberId: myId })
      .populate('fundId', 'name')
      .lean();

    const history = [];
    contributions.forEach(c => {
      c.transactions.forEach(t => {
        if (t.status === 'Approved') {
          history.push({
            id: t._id,
            fundName: c.fundId ? c.fundId.name : 'Unknown Fund',
            fundId: c.fundId ? c.fundId._id : null,
            amount: t.amount,
            paymentMode: t.paymentMode,
            date: formatDisplayDate(t.date),
            txnId: t.txnId
          });
        }
      });
    });

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('getHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Razorpay Order Creation ──────────────────────────────────────────────────
exports.createFundOrder = async (req, res) => {
  try {
    const { fundId, amount: rawAmount } = req.body;
    const amount = Number(rawAmount || 0);
    const myId   = req.user._id;

    // ── Server-side validation ─────────────────────────────────────────────
    if (!fundId) {
      return res.status(400).json({ success: false, message: 'Fund ID is required.' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid contribution amount is required.' });
    }

    const fund = await Fund.findById(fundId);
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found.' });
    }
    if (!['Active'].includes(fund.status)) {
      return res.status(400).json({ success: false, message: `Fund is ${fund.status} and cannot accept contributions.` });
    }

    // Find the member's contribution ledger for remaining-amount validation
    const contribution = await Contribution.findOne({ fundId, memberId: myId });
    if (contribution) {
      const remaining = contribution.assignedAmount - contribution.paidAmount;
      if (amount > remaining + 0.01) { // +0.01 float guard
        return res.status(400).json({
          success: false,
          message: `Amount cannot exceed remaining due amount of ₹${remaining}.`
        });
      }
    }

    // ── Create Razorpay Order ──────────────────────────────────────────────
    const receipt = `fund_${fund._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`;
    const order = await paymentService.initiatePayment({
      gateway: 'razorpay',
      amount,
      currency: 'INR',
      receipt,
      notes: {
        fundId:     fund._id.toString(),
        userId:     myId.toString(),
        memberName: req.user.name || 'Member'
      }
    });

    // ── Pending Audit Record ───────────────────────────────────────────────
    // Create a Pending transaction inside the Contribution ledger.
    // This gives a full audit trail even if frontend disconnects.
    let ledger = await Contribution.findOne({ fundId, memberId: myId });
    if (!ledger) {
      ledger = new Contribution({
        fundId,
        memberId:       myId,
        communityId:    req.communityId,
        assignedAmount: fund.contributionPerMember,
        paidAmount:     0,
        transactions:   []
      });
    }
    const pendingTxnId = `PENDING_${order.id}`;
    const alreadyPending = ledger.transactions.some(t => t.orderId === order.id && t.status === 'Pending');
    if (!alreadyPending) {
      ledger.transactions.push({
        txnId:         pendingTxnId,
        amount,
        paymentMode:   'Razorpay',
        paymentMethod: 'Razorpay',
        orderId:       order.id,
        currency:      'INR',
        status:        'Pending',
        date:          new Date()
      });
      await ledger.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        order_id: order.id,
        amount:   order.amount,
        currency: order.currency || 'INR',
        key:      process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('[Fund] createFundOrder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create payment order.' });
  }
};

// ─── Razorpay Payment Verification & Fulfillment ─────────────────────────────
exports.verifyFundPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      fundId,
      amount: reqAmount
    } = req.body;

    const paymentId = razorpay_payment_id;
    const orderId   = razorpay_order_id;
    const signature = razorpay_signature;
    const amount    = Number(reqAmount || 0);
    const myId      = req.user._id;

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment verification parameters.' });
    }
    if (!fundId) {
      return res.status(400).json({ success: false, message: 'Fund ID is required.' });
    }

    // ── 1. HMAC Signature Verification ────────────────────────────────────
    const isValidSignature = paymentService.verifyPayment({
      gateway: 'razorpay',
      orderId,
      paymentId,
      signature
    });
    if (!isValidSignature) {
      // Mark pending txn as Failed
      await Contribution.findOneAndUpdate(
        { fundId, memberId: myId, 'transactions.orderId': orderId },
        { $set: { 'transactions.$.status': 'Failed' } }
      );
      return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
    }

    // ── 2. Idempotency Guard ───────────────────────────────────────────────
    const ledger = await Contribution.findOne({ fundId, memberId: myId });
    if (ledger) {
      const alreadyApproved = ledger.transactions.some(
        t => (t.orderId === orderId || t.paymentId === paymentId) && t.status === 'Approved'
      );
      if (alreadyApproved) {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed and verified.',
          data: { paymentId, orderId, status: 'Approved' }
        });
      }
    }

    // ── 3. Razorpay API Double-Verification (status must be captured) ──────
    try {
      const paymentDetails = await paymentService.fetchRazorpayPaymentDetails(paymentId);
      if (paymentDetails && paymentDetails.status && !['captured', 'authorized'].includes(paymentDetails.status)) {
        await Contribution.findOneAndUpdate(
          { fundId, memberId: myId, 'transactions.orderId': orderId },
          { $set: { 'transactions.$.status': 'Failed' } }
        );
        return res.status(400).json({
          success: false,
          message: `Payment status is "${paymentDetails.status}", expected "captured". Please retry.`
        });
      }
    } catch (apiErr) {
      console.warn('[Fund] Razorpay API direct fetch notice (proceeding with verified signature):', apiErr.message);
    }

    // ── 4. MongoDB Transaction: All-or-nothing DB updates ─────────────────
    const fund = await Fund.findById(fundId);
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Fund not found.' });
    }

    let finalPaidAmount = 0;
    let resultData;

    session.startTransaction();
    try {
      // 4a. Find or create contribution ledger
      let contrib = await Contribution.findOne({ fundId, memberId: myId }).session(session);
      if (!contrib) {
        contrib = new Contribution({
          fundId,
          memberId:       myId,
          communityId:    req.communityId,
          assignedAmount: fund.contributionPerMember,
          paidAmount:     0,
          transactions:   []
        });
      }

      // 4b. Update or create the transaction record
      const pendingIdx = contrib.transactions.findIndex(
        t => t.orderId === orderId && t.status === 'Pending'
      );
      const txnId = paymentId;
      const now   = new Date();

      if (pendingIdx !== -1) {
        // Upgrade the pending record to Approved
        contrib.transactions[pendingIdx].txnId         = txnId;
        contrib.transactions[pendingIdx].paymentId     = paymentId;
        contrib.transactions[pendingIdx].signature     = signature;
        contrib.transactions[pendingIdx].paymentMode   = 'Razorpay';
        contrib.transactions[pendingIdx].paymentMethod = 'Razorpay';
        contrib.transactions[pendingIdx].status        = 'Approved';
        contrib.transactions[pendingIdx].paidAt        = now;
        contrib.transactions[pendingIdx].date          = now;
        if (amount > 0) contrib.transactions[pendingIdx].amount = amount;
      } else {
        // No pending record found — create a fresh Approved transaction
        contrib.transactions.push({
          txnId,
          amount:        amount,
          paymentMode:   'Razorpay',
          paymentMethod: 'Razorpay',
          orderId,
          paymentId,
          signature,
          currency:      'INR',
          status:        'Approved',
          paidAt:        now,
          date:          now
        });
      }

      // 4c. Recompute paidAmount from all Approved transactions
      finalPaidAmount = contrib.transactions
        .filter(t => t.status === 'Approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      contrib.paidAmount         = finalPaidAmount;
      contrib.lastPaymentDate    = now;
      await contrib.save({ session });

      await session.commitTransaction();

      resultData = {
        paymentId,
        orderId,
        txnId,
        amount,
        paidAmount:  finalPaidAmount,
        status:      'Approved',
        paidAt:      now
      };
    } catch (txnError) {
      await session.abortTransaction();
      throw txnError;
    } finally {
      session.endSession();
    }

    // ── 5. Notifications (outside transaction — non-critical) ──────────────
    try {
      const Community = require('../../models/Community');
      const comm      = await Community.findById(fund.communityId || req.communityId).select('headId adminId createdBy').lean();
      const recipientId = comm?.headId || fund.createdBy || null;
      if (recipientId) {
        const memberName = req.user.name || 'A member';
        const txnIdStr   = resultData.txnId;
        const paidAt     = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        notifyContributionRecorded(recipientId, memberName, amount, fund.name, fund._id);
      }
    } catch (notifErr) {
      console.warn('[Fund] Notification dispatch warning:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and contribution recorded successfully!',
      data:    resultData
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('[Fund] verifyFundPayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment verification failed.' });
  }
};

// ─── Razorpay Webhook Listener (Fallback path) ────────────────────────────────
exports.handleFundWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    // Validate webhook signature
    if (secret && signature) {
      const digest = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      if (digest !== signature) {
        console.warn('[Fund] Webhook signature mismatch');
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature.' });
      }
    }

    const event = req.body?.event;
    if (event === 'payment.captured') {
      const payment = req.body?.payload?.payment?.entity;
      if (payment) {
        const orderId   = payment.order_id;
        const paymentId = payment.id;
        const amount    = payment.amount / 100; // paise → ₹

        // Find the contribution ledger that has a Pending txn for this orderId
        const ledger = await Contribution.findOne({ 'transactions.orderId': orderId, 'transactions.status': 'Pending' });
        if (ledger) {
          const pendingIdx = ledger.transactions.findIndex(
            t => t.orderId === orderId && t.status === 'Pending'
          );
          if (pendingIdx !== -1) {
            const alreadyApproved = ledger.transactions.some(
              t => (t.orderId === orderId || t.paymentId === paymentId) && t.status === 'Approved'
            );
            if (!alreadyApproved) {
              const now = new Date();
              ledger.transactions[pendingIdx].txnId         = paymentId;
              ledger.transactions[pendingIdx].paymentId     = paymentId;
              ledger.transactions[pendingIdx].paymentMode   = 'Razorpay';
              ledger.transactions[pendingIdx].paymentMethod = 'Razorpay';
              ledger.transactions[pendingIdx].status        = 'Approved';
              ledger.transactions[pendingIdx].paidAt        = now;
              if (amount > 0) ledger.transactions[pendingIdx].amount = amount;

              ledger.paidAmount = ledger.transactions
                .filter(t => t.status === 'Approved')
                .reduce((sum, t) => sum + (t.amount || 0), 0);
              ledger.lastPaymentDate = now;
              await ledger.save();
              console.log(`[Fund] Webhook: Contribution approved for orderId=${orderId}, paymentId=${paymentId}`);
            }
          }
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Fund] handleFundWebhook error:', error);
    res.status(500).json({ status: 'error', message: 'Webhook processing failed.' });
  }
};
