const Donation = require('../../models/Donation');
const paymentService = require('../../services/paymentService');
const { notifyDonationReceived, notifyDonationReceipt } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const crypto = require('crypto');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// Get all active campaigns — community-scoped
exports.getCampaigns = async (req, res) => {
  try {
    let baseFilter = {
      isDeleted: { $ne: true },
      status: { $nin: ['Completed', 'Closed', 'Suspended', 'Archived', 'Deleted'] }
    };

    // Apply Centralized 2-Level Multi-Tenancy Scope
    const filter = applyScopeFilter(req, baseFilter, { includeCampaignTargeting: true });

    const donationDocs = await Donation.find({ ...filter, title: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .lean();

    const formattedCampaigns = donationDocs.map(d => {
      const rAmount = d.raisedAmount || 0;
      const tAmount = d.targetAmount || 0;
      const dCount = d.donorCount || (Array.isArray(d.recentDonations) ? d.recentDonations.length : 0);
      return {
        id: d._id,
        _id: d._id,
        title: d.title,
        titleEn: d.title,
        raised: rAmount,
        raisedAmount: rAmount,
        collectedAmount: rAmount,
        target: tAmount,
        targetAmount: tAmount,
        donorCount: dCount,
        recentDonations: d.recentDonations || [],
        percentage: tAmount > 0 ? Math.min(Math.round((rAmount / tAmount) * 100), 100) : 0,
        desc: d.description || d.shortDescription || '',
        description: d.description || d.shortDescription || '',
        city: d.city || 'Indore',
        category: d.category || 'General',
        visibility: d.isGlobalCampaign ? 'All Members' : (d.targetedCommunities?.length ? 'Selected Communities' : (d.visibility || 'Entire Community')),
        isGlobalCampaign: d.isGlobalCampaign || false,
        targetedCommunities: d.targetedCommunities || [],
        status: d.status || 'Active',
        bannerImage: d.coverImage || null,
        coverImage: d.coverImage || null,
        startDate: d.startDate || d.createdAt,
        endDate: d.endDate || null
      };
    });

    res.status(200).json({ success: true, status: 'success', data: formattedCampaigns });
  } catch (error) {
    console.error('Get Member Campaigns Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

// Get single campaign details
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Donation.findById(req.params.id)
      .populate('createdBy', 'name avatar role')
      .populate('communityId');
    if (!campaign) {
      return res.status(404).json({ success: false, status: 'error', message: 'Campaign not found' });
    }

    // Community Isolation & Scope Guard
    if (req.communityId) {
      const isGlobal = campaign.isGlobalCampaign === true;
      const isTargeted = Array.isArray(campaign.targetedCommunities) && campaign.targetedCommunities.some(cId => {
        const idStr = cId?._id ? cId._id.toString() : cId?.toString();
        return idStr === req.communityId.toString();
      });
      const campaignCommId = campaign.communityId ? (campaign.communityId._id ?? campaign.communityId) : null;
      const matchesOwnCommunity = campaignCommId && campaignCommId.equals ? campaignCommId.equals(req.communityId) : (campaignCommId?.toString() === req.communityId.toString());

      if (!matchesOwnCommunity && !isGlobal && !isTargeted && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, status: 'error', message: 'Access denied. You cannot view a campaign of another community.' });
      }
    }

    // Fetch all real donations for this campaign to calculate supporters list & counts
    const realDonations = await Donation.find({
      campaign: campaign._id,
      status: { $in: ['Active', 'Approved', 'Success'] }
    })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });

    const realRaisedSum = realDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const raised = Math.max(campaign.raisedAmount || 0, realRaisedSum);
    const target = campaign.targetAmount || 0;

    const formattedRealDonors = realDonations.map(d => {
      const dName = d.user ? d.user.name : (d.donorName || 'Anonymous');
      return {
        donorName: dName,
        amount: d.amount,
        date: d.createdAt || d.paidAt || d.date || Date.now(),
        avatar: d.user ? d.user.avatar : null,
        paymentMode: d.paymentMode || 'Online (UPI)'
      };
    });

    // Merge recentDonations from campaign document if any
    const existingRecent = Array.isArray(campaign.recentDonations) ? campaign.recentDonations : [];
    const combinedRecentDonations = formattedRealDonors.length > 0 ? formattedRealDonors : existingRecent;
    const donorCount = Math.max(campaign.donorCount || 0, combinedRecentDonations.length);

    const formattedCampaign = {
      id: campaign._id,
      _id: campaign._id,
      title: campaign.title,
      shortDescription: campaign.shortDescription || '',
      description: campaign.description || campaign.shortDescription || campaign.desc || '',
      desc: campaign.description || campaign.shortDescription || campaign.desc || '',
      category: campaign.category || 'General',
      priority: campaign.priority || 'Medium',
      target,
      targetAmount: target,
      raised,
      raisedAmount: raised,
      collectedAmount: raised,
      expenseAmount: campaign.expenseAmount || 0,
      availableBalance: raised - (campaign.expenseAmount || 0),
      minDonation: campaign.minDonation || 1,
      maxDonation: campaign.maxDonation || null,
      currency: campaign.currency || 'INR',
      city: campaign.city || 'Indore',
      locations: campaign.locations || [],
      visibility: campaign.visibility || 'All Members',
      status: campaign.status || 'Active',
      startDate: campaign.startDate || campaign.createdAt,
      endDate: campaign.endDate || null,
      bannerImage: campaign.coverImage || null,
      coverImage: campaign.coverImage || null,
      documents: campaign.documents || [],
      createdBy: campaign.createdBy ? (typeof campaign.createdBy === 'object' ? campaign.createdBy : { name: 'Community Admin' }) : null,
      communityId: campaign.communityId || null,
      donorCount,
      contributorsCount: donorCount,
      recentDonations: combinedRecentDonations,
      percentage: target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0
    };

    res.status(200).json({
      success: true,
      status: 'success',
      data: formattedCampaign
    });
  } catch (error) {
    console.error('Get Campaign By ID Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get user's donation history
exports.getHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ user: req.user._id })
      .populate('campaign', 'title')
      .sort({ date: -1 });

    const formattedHistory = donations.map(d => {
      const dDate = new Date(d.date || d.createdAt || Date.now());
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedDate = `${dDate.getDate()} ${months[dDate.getMonth()]} ${dDate.getFullYear()}`;
      const formattedTime = dDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: d._id,
        purposeId: d.campaign ? d.campaign._id : null,
        purposeTitle: d.campaign ? d.campaign.title : (d.title || d.purpose || 'Unknown Campaign'),
        amount: d.amount,
        type: d.type,
        date: formattedDate,
        time: formattedTime,
        txnId: d.txnId
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedHistory
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get recent donors for a campaign
exports.getRecentDonors = async (req, res) => {
  try {
    const { id } = req.params;

    const campaignFilter = applyScopeFilter(req, { _id: id });
    const campaign = await Donation.findOne(campaignFilter);

    if (!campaign) {
      return res.status(404).json({ status: 'error', message: 'Campaign not found or access denied' });
    }

    const filter = applyScopeFilter(req, { campaign: id, status: { $in: ['Approved', 'Active', 'Success'] } });
    const donations = await Donation.find(filter)
      .populate('user', 'name avatar')
      .sort({ createdAt: -1, date: -1 })
      .limit(20);
      
    const formattedDonors = donations.map(d => {
      const uName = d.user ? d.user.name : (d.donorName || 'Anonymous');
      const uInitials = uName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
      const dDate = new Date(d.createdAt || d.date || Date.now());
      return {
        id: d._id,
        name: uName,
        amount: d.amount,
        date: dDate.toISOString(),
        initials: uInitials,
        avatar: d.user ? d.user.avatar : ''
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedDonors
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create manual/online donation
exports.createDonation = async (req, res) => {
  try {
    const targetId = req.params.id || req.body.purposeId || req.body.campaignId;
    const amount = Number(req.body.amount || 0);
    const type = req.body.type || 'One-time';
    const donorName = req.body.name || req.user?.name || 'Anonymous';

    if (!targetId) {
      return res.status(400).json({ success: false, status: 'error', message: 'Campaign ID is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, status: 'error', message: 'Valid donation amount is required' });
    }

    const campaign = await Donation.findById(targetId);
    if (!campaign) {
      return res.status(404).json({ success: false, status: 'error', message: 'Campaign not found' });
    }

    // Community Isolation Guard
    if (req.communityId && campaign.communityId) {
      const c1 = (campaign.communityId._id || campaign.communityId).toString();
      const c2 = (req.communityId._id || req.communityId).toString();
      if (c1 !== c2 && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, status: 'error', message: 'Cannot donate to a campaign outside your community' });
      }
    }

    const txnId = req.body.txnId || `TXN${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // Save individual payment record in DB with full title & purpose
    const paymentRecord = new Donation({
      user: req.user._id,
      campaign: campaign._id,
      title: campaign.title,
      purpose: campaign.title || campaign.purpose,
      description: campaign.description || campaign.shortDescription,
      communityId: campaign.communityId || req.communityId,
      amount,
      donorName: donorName,
      paymentMode: type === 'One-time' ? 'Online (UPI)' : 'Bank Transfer',
      txnId,
      status: 'Approved'
    });
    await paymentRecord.save().catch((err) => console.warn('Payment record save notice:', err.message));

    // Update target campaign collected amount and donor count
    campaign.raisedAmount = (campaign.raisedAmount || 0) + amount;
    campaign.donorCount = (campaign.donorCount || 0) + 1;
    if (!Array.isArray(campaign.recentDonations)) {
      campaign.recentDonations = [];
    }
    campaign.recentDonations.unshift({
      donorName,
      amount,
      date: new Date(),
      paymentStatus: 'success'
    });
    await campaign.save();

    // Process Referral Side-Effect (Non-blocking)
    if (req.user?._id) {
      const { processReferralEvent } = require('../../services/referralService');
      processReferralEvent('DONATION', req.user._id, paymentRecord._id).catch(err => console.error('[DonationReferralError]', err.message));
    }

    const dDate = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${dDate.getDate()} ${months[dDate.getMonth()]} ${dDate.getFullYear()}`;
    const formattedTime = dDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    res.status(201).json({
      success: true,
      status: 'success',
      message: 'Thank you! Your donation was processed successfully.',
      data: {
        id: txnId,
        purposeId: campaign._id,
        purposeTitle: campaign.title,
        amount,
        type,
        date: formattedDate,
        time: formattedTime,
        txnId
      }
    });
  } catch (error) {
    console.error('Create Donation Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

// ─── Razorpay Order Creation ──────────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const targetId = req.params.id || req.body.donationId || req.body.purposeId || req.body.campaignId;
    const amount = Number(req.body.amount || 0);
    const donorName = req.body.donorName || req.body.name || req.user?.name || 'Anonymous';
    const type = req.body.type || 'One-time';

    if (!targetId) {
      return res.status(400).json({ success: false, status: 'error', message: 'Campaign ID is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, status: 'error', message: 'Valid donation amount is required' });
    }

    const campaign = await Donation.findById(targetId);
    if (!campaign) {
      return res.status(404).json({ success: false, status: 'error', message: 'Campaign not found' });
    }

    const receipt = `don_${campaign._id.toString().slice(-12)}_${Date.now().toString().slice(-8)}`;
    const order = await paymentService.initiatePayment({
      gateway: 'razorpay',
      amount,
      currency: 'INR',
      receipt,
      notes: {
        campaignId: campaign._id.toString(),
        userId: req.user?._id ? req.user._id.toString() : 'anonymous',
        donorName
      }
    });

    const pendingDonation = new Donation({
      user: req.user?._id,
      campaign: campaign._id,
      communityId: campaign.communityId || req.communityId,
      amount,
      currency: 'INR',
      paymentMode: 'Razorpay',
      paymentMethod: 'Razorpay',
      orderId: order.id,
      status: 'Pending',
      donorName
    });
    await pendingDonation.save().catch(err => console.warn('Pending donation record notice:', err.message));

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Create Razorpay Order Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message || 'Failed to create payment order' });
  }
};

// ─── Razorpay Payment Verification & Fulfillment ─────────────────────────────
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      donationId,
      campaignId,
      purposeId,
      amount: reqAmount,
      donorName: reqDonorName
    } = req.body;

    const paymentId = razorpay_payment_id;
    const orderId = razorpay_order_id;
    const signature = razorpay_signature;
    const targetId = donationId || campaignId || purposeId;

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ success: false, status: 'error', message: 'Missing Razorpay payment verification parameters' });
    }

    const isValidSignature = paymentService.verifyPayment({
      gateway: 'razorpay',
      orderId,
      paymentId,
      signature
    });

    if (!isValidSignature) {
      await Donation.findOneAndUpdate({ orderId }, { status: 'Failed' }).catch(() => {});
      return res.status(400).json({ success: false, status: 'error', message: 'Invalid payment signature. Verification failed.' });
    }

    const existingApproved = await Donation.findOne({
      $or: [{ orderId }, { paymentId }, { txnId: paymentId }],
      status: { $in: ['Approved', 'Success', 'Active'] }
    });

    if (existingApproved) {
      return res.status(200).json({
        success: true,
        status: 'success',
        message: 'Payment already processed and verified.',
        data: {
          id: existingApproved.txnId || paymentId,
          amount: existingApproved.amount,
          status: 'Approved'
        }
      });
    }

    const campaign = await Donation.findById(targetId || existingApproved?.campaign);
    const finalAmount = Number(reqAmount) || 0;
    const finalDonorName = reqDonorName || req.user?.name || 'Anonymous';

    let donationRecord = await Donation.findOne({ orderId });
    if (!donationRecord) {
      donationRecord = new Donation({
        user: req.user?._id,
        campaign: campaign?._id,
        communityId: campaign?.communityId || req.communityId,
        amount: finalAmount,
        currency: 'INR',
        donorName: finalDonorName
      });
    }

    donationRecord.status = 'Approved';
    donationRecord.txnId = paymentId;
    donationRecord.paymentId = paymentId;
    donationRecord.orderId = orderId;
    donationRecord.signature = signature;
    donationRecord.paidAt = new Date();
    donationRecord.paymentMode = 'Razorpay';
    donationRecord.paymentMethod = 'Razorpay';
    if (finalAmount > 0) donationRecord.amount = finalAmount;
    await donationRecord.save();

    if (campaign && finalAmount > 0) {
      await Donation.findByIdAndUpdate(campaign._id, {
        $inc: { raisedAmount: finalAmount, donorCount: 1 },
        $push: {
          recentDonations: {
            $each: [{ donorName: finalDonorName, amount: finalAmount, date: new Date(), paymentStatus: 'success' }],
            $position: 0
          }
        }
      });
    }

    // Process Referral Side-Effect (Non-blocking)
    if (req.user?._id) {
      const { processReferralEvent } = require('../../services/referralService');
      processReferralEvent('DONATION', req.user._id, donationRecord._id).catch(err => console.error('[DonationReferralError]', err.message));
    }

    if (campaign && req.user) {
      try {
        notifyDonationReceived(campaign.headId, [], finalDonorName, finalAmount, campaign.title, campaign._id);
        const receiptNotif = await notifyDonationReceipt(req.user._id, finalAmount, campaign.title, campaign._id);

        if (receiptNotif) {
          sendPushNotification({
            userId: req.user._id,
            notificationId: receiptNotif._id,
            type: 'donation_receipt',
            title: 'Donation Receipt ✅',
            message: `Thank you! Your donation of ₹${finalAmount} to "${campaign.title}" was received.`,
            icon: '✅',
            actionUrl: '/member/donations'
          }).catch(err => console.error('[DonationPushError]', err.message));
        }
      } catch (nErr) {
        console.warn('Donation notification notice:', nErr.message);
      }
    }

    res.status(200).json({
      success: true,
      status: 'success',
      message: 'Payment verified and donation updated successfully!',
      data: {
        id: paymentId,
        txnId: paymentId,
        orderId,
        amount: donationRecord.amount,
        status: 'Approved'
      }
    });
  } catch (error) {
    console.error('Verify Razorpay Payment Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message || 'Payment verification failed' });
  }
};

// ─── Razorpay Webhook Listener ────────────────────────────────────────────────
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (secret && signature) {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        console.warn('Webhook signature mismatch');
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    const payload = req.body?.payload?.payment?.entity;

    if (event === 'payment.captured' && payload) {
      const { id: paymentId, order_id: orderId, amount: amountPaise, notes } = payload;
      const amount = (amountPaise || 0) / 100;

      const existing = await Donation.findOne({
        $or: [{ orderId }, { paymentId }, { txnId: paymentId }],
        status: { $in: ['Approved', 'Success', 'Active'] }
      });

      if (!existing) {
        let donationRecord = await Donation.findOne({ orderId });
        const campaignId = notes?.campaignId || donationRecord?.campaign;

        if (!donationRecord) {
          donationRecord = new Donation({
            campaign: campaignId,
            amount,
            currency: 'INR',
            donorName: notes?.donorName || 'Anonymous'
          });
        }

        donationRecord.status = 'Approved';
        donationRecord.txnId = paymentId;
        donationRecord.paymentId = paymentId;
        donationRecord.orderId = orderId;
        donationRecord.paidAt = new Date();
        donationRecord.paymentMode = 'Razorpay';
        donationRecord.paymentMethod = 'Razorpay';
        if (amount > 0) donationRecord.amount = amount;
        await donationRecord.save();

        if (campaignId && amount > 0) {
          await Donation.findByIdAndUpdate(campaignId, {
            $inc: { raisedAmount: amount, donorCount: 1 },
            $push: {
              recentDonations: {
                $each: [{ donorName: notes?.donorName || 'Anonymous', amount, date: new Date(), paymentStatus: 'success' }],
                $position: 0
              }
            }
          });
        }
      }
    } else if (event === 'payment.failed' && payload) {
      const { order_id: orderId } = payload;
      if (orderId) {
        await Donation.findOneAndUpdate({ orderId }, { status: 'Failed' }).catch(() => {});
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get stats and top donors
exports.getStats = async (req, res) => {
  try {
    const scopeFilter = applyScopeFilter(req, {});

    const uniqueDonorsList = await Donation.distinct('user', scopeFilter);
    const totalDonors = uniqueDonorsList.filter(Boolean).length;

    const matchQuery = applyScopeFilter(req, { amount: { $exists: true, $gt: 0 } });
    const amountAggr = await Donation.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);
    const totalDonatedAmount = amountAggr.length > 0 ? (amountAggr[0].totalAmount || 0) : 0;

    const completedPurposesFilter = applyScopeFilter(req, { status: { $in: ['Completed', 'Closed'] } });
    const completedPurposes = await Donation.countDocuments(completedPurposesFilter);

    const impactStats = [
      { id: "st1", label: "Total Contributors", value: `${totalDonors || 0}+` },
      { id: "st2", label: "Total Donated Amount", value: `₹${totalDonatedAmount.toLocaleString('en-IN')}+` },
      { id: "st3", label: "Completed Purposes", value: `${completedPurposes || 0}+` },
      { id: "st4", label: "People Benefited", value: "5000+" }
    ];

    const topFilter = applyScopeFilter(req, { amount: { $exists: true, $gt: 0 } });
    let topDonations = await Donation.find(topFilter)
      .sort({ amount: -1 })
      .limit(5)
      .populate('user', 'name avatar')
      .populate('campaign', 'title')
      .lean();

    let topDonors = [];
    if (topDonations.length > 0) {
      topDonors = topDonations.map((d) => {
        const uName = d.user ? d.user.name : (d.donorName || 'Anonymous');
        const uInitials = uName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const dDate = new Date(d.createdAt || d.date || Date.now());
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return {
          id: `td_${d._id}`,
          name: uName,
          amount: d.amount,
          initials: uInitials,
          purpose: d.campaign ? d.campaign.title : (d.purpose || 'General Relief'),
          date: `${dDate.getDate()} ${months[dDate.getMonth()]} ${dDate.getFullYear()}`,
          paymentMode: d.paymentMode || 'Online (UPI)',
          avatar: d.user ? d.user.avatar : ''
        };
      });
    }

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        impactStats,
        topDonors
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

// Get all recent donors across all community campaigns (Recent first)
exports.getAllDonors = async (req, res) => {
  try {
    const scopeFilter = applyScopeFilter(req, { amount: { $exists: true, $gt: 0 } });
    
    let donations = await Donation.find(scopeFilter)
      .sort({ createdAt: -1, date: -1 })
      .populate('user', 'name avatar city community')
      .populate({ path: 'campaign', select: 'title name' })
      .lean();

    let donors = donations.map((d) => {
      const uName = d.user ? d.user.name : (d.donorName || 'Anonymous');
      const uInitials = uName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const dDate = new Date(d.createdAt || d.paidAt || d.date || Date.now());
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const cObj = d.campaign;
      const cTitle = (cObj && typeof cObj === 'object' && cObj.title) ? cObj.title : null;
      const finalPurpose = cTitle || d.title || d.purpose || d.campaignTitle || 'General Samaj Fund';

      return {
        id: `don_${d._id}`,
        name: uName,
        amount: d.amount,
        initials: uInitials,
        purpose: finalPurpose,
        date: `${dDate.getDate()} ${months[dDate.getMonth()]} ${dDate.getFullYear()}`,
        rawDate: dDate,
        paymentMode: d.paymentMode || 'Online (UPI)',
        avatar: d.user ? d.user.avatar : ''
      };
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: donors
    });
  } catch (error) {
    console.error('Get All Donors Error:', error);
    res.status(500).json({ success: false, status: 'error', message: error.message });
  }
};

