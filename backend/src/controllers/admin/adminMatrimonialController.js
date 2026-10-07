/**
 * adminMatrimonialController.js
 * Admin panel management of matrimonial module.
 */
const MatrimonialProfile  = require('../../models/MatrimonialProfile');
const SubscriptionPlan    = require('../../models/SubscriptionPlan');
const UserSubscription    = require('../../models/UserSubscription');
const ProfileReport       = require('../../models/ProfileReport');
const MatrimonialSettings = require('../../models/MatrimonialSettings');
const InterestRequest     = require('../../models/InterestRequest');
const MarriageRequest     = require('../../models/MarriageRequest');
const SuccessStory        = require('../../models/SuccessStory');
const { createNotification, notifyReportActioned, notifyProfileSuspended } = require('../../services/notificationService');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo  = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalProfiles, pendingProfiles, activeProfiles, hiddenProfiles, marriedProfiles,
      pendingPhotos, pendingReports, pendingMarriageRequests,
      totalSubscriptions, activeSubscriptions,
      connectedMembers,
      dailyRegistrations, weeklyRegistrations, monthlyRegistrations,
      totalInterests, acceptedInterests,
      publishedStories, eligibleForStories
    ] = await Promise.all([
      MatrimonialProfile.countDocuments({ isDeleted: false }),
      MatrimonialProfile.countDocuments({ isDeleted: false, status: 'pending' }),
      MatrimonialProfile.countDocuments({ isDeleted: false, status: 'active' }),
      MatrimonialProfile.countDocuments({ isDeleted: false, status: 'hidden' }),
      MatrimonialProfile.countDocuments({ isDeleted: false, status: 'married' }),
      MatrimonialProfile.countDocuments({ 'photos.status': 'pending', isDeleted: false }),
      ProfileReport.countDocuments({ status: 'pending' }),
      MarriageRequest.countDocuments({ status: 'pending' }),
      UserSubscription.countDocuments(),
      UserSubscription.countDocuments({ status: 'active' }),
      MatrimonialProfile.countDocuments({ isDeleted: false, maritalLifecycle: 'connected' }),
      MatrimonialProfile.countDocuments({ isDeleted: false, createdAt: { $gte: today } }),
      MatrimonialProfile.countDocuments({ isDeleted: false, createdAt: { $gte: weekAgo } }),
      MatrimonialProfile.countDocuments({ isDeleted: false, createdAt: { $gte: monthAgo } }),
      InterestRequest.countDocuments(),
      InterestRequest.countDocuments({ status: 'accepted' }),
      SuccessStory.countDocuments({ status: 'published' }),
      SuccessStory.countDocuments({ status: 'eligible' })
    ]);

    res.json({
      status: 'success',
      data: {
        totalProfiles,
        pendingProfiles,
        activeProfiles,
        hiddenProfiles,
        marriedProfiles,
        pendingPhotos,
        pendingReports,
        pendingMarriageRequests,
        totalSubscriptions,
        activeSubscriptions,
        connectedMembers,
        dailyRegistrations,
        weeklyRegistrations,
        monthlyRegistrations,
        totalInterests,
        acceptedInterests,
        interestAcceptanceRate: totalInterests > 0
          ? Math.round((acceptedInterests / totalInterests) * 100) : 0,
        publishedStories,
        eligibleForStories
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List All Profiles (with filters) ────────────────────────────────────────
exports.listProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, verificationStatus, communityId, search } = req.query;
    const query = { isDeleted: false };
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (communityId) query.communityId = communityId;
    if (search) query['personal.fullName'] = new RegExp(search, 'i');

    const total = await MatrimonialProfile.countDocuments(query);
    const profiles = await MatrimonialProfile.find(query)
      .populate('userId', 'name phone email')
      .populate('communityId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean({ virtuals: true });

    res.json({ status: 'success', data: { profiles, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Verify Profile ───────────────────────────────────────────────────────────
exports.verifyProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body; // 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Status must be verified or rejected.' });
    }

    const profile = await MatrimonialProfile.findById(id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    profile.verificationStatus = status;
    // ─── Critical: when verified → set status to 'active' so it appears in search
    //          when rejected → keep hidden (not deleted) so user can fix and resubmit
    if (status === 'verified') {
      profile.status = 'active';
    } else if (status === 'rejected') {
      profile.status = 'hidden'; // Hidden but not deleted — user can update and resubmit
      try {
        notifyProfileSuspended(profile.userId, adminNote || 'Profile verification rejected by admin.');
      } catch (notifErr) {
        console.warn('[Notify] verifyProfile profile_suspended failed:', notifErr.message);
      }
    }
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    await profile.save();

    // Notify user
    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     `matrimonial_profile_${status}`,
      title:    status === 'verified' ? 'Profile Verified! ✅' : 'Profile Verification Rejected',
      message:  status === 'verified'
        ? 'Your matrimonial profile has been verified and is now visible in search results.'
        : `Your profile verification was rejected. Reason: ${adminNote || 'Contact admin for details.'}`,
      icon:     status === 'verified' ? '✅' : '❌',
      priority: 'high',
      actionUrl:'/member/matrimonial/profile'
    });

    res.json({ status: 'success', message: `Profile ${status} successfully.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Force Close Profile ──────────────────────────────────────────────────────
exports.adminCloseProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await MatrimonialProfile.findById(id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    profile.status = 'married';
    profile.isClosed = true;
    profile.closedAt = new Date();
    profile.maritalLifecycle = 'married';
    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     'matrimonial_profile_closed',
      title:    'Profile Closed 💍',
      message:  'Your matrimonial profile has been closed by an admin and marked as married.',
      icon:     '💍',
      priority: 'high',
      actionUrl:'/member/matrimonial/profile'
    });

    const socketRegistry = require('../../services/socketRegistry');
    const io = socketRegistry.getIO();
    if (io) {
      io.to(profile.userId.toString()).emit('matrimonial:profileClosed', { profileId: profile._id });
    }

    res.json({ status: 'success', message: 'Profile force closed successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Reopen Profile ───────────────────────────────────────────────────────────
exports.adminReopenProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await MatrimonialProfile.findById(id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    profile.status = 'pending';
    profile.isClosed = false;
    profile.closedAt = null;
    profile.maritalLifecycle = 'active';
    profile.verificationStatus = 'pending';
    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     'matrimonial_profile_reopened',
      title:    'Profile Reopened 🔄',
      message:  'Your matrimonial profile has been reopened by an admin. It requires re-verification before appearing in search.',
      icon:     '🔄',
      priority: 'high',
      actionUrl:'/member/matrimonial/profile'
    });

    res.json({ status: 'success', message: 'Profile reopened successfully (pending verification).' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// ─── List Marriage Requests ─────────────────────────────────────────────────────
exports.listMarriageRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await MarriageRequest.countDocuments(query);
    const requests = await MarriageRequest.find(query)
      .populate({
        path: 'senderId',
        select: 'name phone email'
      })
      .populate({
        path: 'receiverId',
        select: 'name phone email'
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ status: 'success', data: { requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Photo Moderation ─────────────────────────────────────────────────────────
exports.listPendingPhotos = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const profiles = await MatrimonialProfile.find({
      'photos.status': 'pending',
      isDeleted: false
    }).select('userId photos personal.fullName').populate('userId', 'name');

    // Flatten to individual pending photos
    const pendingPhotos = [];
    for (const profile of profiles) {
      for (const photo of profile.photos) {
        if (photo.status === 'pending') {
          pendingPhotos.push({
            profileId: profile._id,
            photoId:   photo._id,
            url:       photo.url,
            uploadedAt:photo.uploadedAt,
            userName:  profile.userId?.name || 'Unknown'
          });
        }
      }
    }

    res.json({ status: 'success', data: { photos: pendingPhotos, total: pendingPhotos.length } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.moderatePhoto = async (req, res) => {
  try {
    const { profileId, photoId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be approve or reject.' });
    }

    const profile = await MatrimonialProfile.findById(profileId);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    const photo = profile.photos.id(photoId);
    if (!photo) return res.status(404).json({ status: 'error', message: 'Photo not found.' });

    photo.status = action === 'approve' ? 'approved' : 'rejected';
    if (action === 'approve' && !profile.photos.some(p => p.isPrimary && p.status === 'approved')) {
      photo.isPrimary = true; // Set as primary if no approved primary exists
    }

    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     'matrimonial_photo_moderated',
      title:    action === 'approve' ? 'Photo Approved ✅' : 'Photo Rejected',
      message:  action === 'approve'
        ? 'Your profile photo has been approved and is now visible.'
        : 'One of your profile photos was rejected. Please upload a clear, appropriate photo.',
      icon:     action === 'approve' ? '✅' : '❌',
      priority: 'normal',
      actionUrl:'/member/matrimonial/profile'
    });

    res.json({ status: 'success', message: `Photo ${action}d successfully.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Reports Management ───────────────────────────────────────────────────────
exports.listReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await ProfileReport.countDocuments(query);
    const reports = await ProfileReport.find(query)
      .populate('reporterId', 'name phone')
      .populate('reportedUserId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ status: 'success', data: { reports, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.actionReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body; // 'actioned' or 'dismissed'

    const report = await ProfileReport.findById(id);
    if (!report) return res.status(404).json({ status: 'error', message: 'Report not found.' });

    report.status     = action;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.adminNotes = adminNotes;
    await report.save();

    // ── Notification: notify reporter about action ────────────────────────────────
    try {
      if (report.reporterId) {
        notifyReportActioned(report.reporterId, action);
      }
    } catch (notifErr) {
      console.warn('[Notify] actionReport report_actioned failed:', notifErr.message);
    }

    // If actioned — optionally deactivate the reported profile
    if (action === 'actioned' && req.body.deactivateProfile) {
      await MatrimonialProfile.findOne({ userId: report.reportedUserId }).then(async p => {
        if (p) {
          p.status = 'hidden';
          await p.save();
          try {
            notifyProfileSuspended(p.userId, adminNotes || 'Profile deactivated due to user report.');
          } catch (notifErr) {
            console.warn('[Notify] actionReport profile_suspended failed:', notifErr.message);
          }
        }
      });
    }

    res.json({ status: 'success', message: `Report marked as ${action}.` });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Subscription Plan CRUD ───────────────────────────────────────────────────
exports.listPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ displayOrder: 1 });
    res.json({ status: 'success', data: { plans } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ status: 'success', data: { plan } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
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
    // Permanently remove the plan. Members who already bought it are not affected:
    // their subscription keeps its own copy of the plan name, price and features.
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    res.json({ status: 'success', message: 'Plan deleted.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Matrimonial Settings ─────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    let settings = await MatrimonialSettings.findOne();
    if (!settings) settings = await MatrimonialSettings.create({});
    res.json({ status: 'success', data: { settings } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await MatrimonialSettings.findOne();
    if (!settings) {
      settings = await MatrimonialSettings.create({ ...req.body, updatedBy: req.user._id });
    } else {
      Object.assign(settings, req.body);
      settings.updatedBy = req.user._id;
      await settings.save();
    }
    res.json({ status: 'success', data: { settings }, message: 'Settings updated.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Analytics ────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const [
      newProfiles, newSubscriptions, newInterests,
      acceptedInterests, revenue
    ] = await Promise.all([
      MatrimonialProfile.countDocuments({ createdAt: { $gte: since }, isDeleted: false }),
      UserSubscription.countDocuments({ createdAt: { $gte: since } }),
      InterestRequest.countDocuments({ createdAt: { $gte: since } }),
      InterestRequest.countDocuments({ createdAt: { $gte: since }, status: 'accepted' }),
      UserSubscription.aggregate([
        { $match: { createdAt: { $gte: since }, paymentStatus: 'success' } },
        { $group: { _id: null, total: { $sum: '$pricePaid' } } }
      ])
    ]);

    res.json({
      status: 'success',
      data: {
        period: `Last ${days} days`,
        newProfiles,
        newSubscriptions,
        newInterests,
        acceptedInterests,
        interestAcceptanceRate: newInterests > 0 ? Math.round((acceptedInterests / newInterests) * 100) : 0,
        revenue: revenue[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Grant Manual Subscription ────────────────────────────────────────────────
exports.grantSubscription = async (req, res) => {
  try {
    const { planId, durationOverrideDays } = req.body;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan not found.' });
    if (!(plan.durationInDays > 0) && !(durationOverrideDays > 0)) {
      return res.status(400).json({ status: 'error', message: 'The free plan already applies to everyone. Pick a paid plan to grant.' });
    }

    // Accept a user id, email or phone number.
    const ident = String(req.body.userId || '').trim();
    const mongoose = require('mongoose');
    const UserModel = require('../../models/User');
    const target = mongoose.Types.ObjectId.isValid(ident)
      ? await UserModel.findById(ident).select('_id')
      : await UserModel.findOne({ $or: [{ email: ident.toLowerCase() }, { phone: new RegExp(`${ident.replace(/\D/g, '').slice(-10) || '^$'}$`) }] }).select('_id');
    if (!target) return res.status(404).json({ status: 'error', message: 'No user found with that ID, email or phone.' });
    const userId = target._id;

    const startDate = new Date();
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() + (durationOverrideDays || plan.durationInDays));

    const sub = await UserSubscription.create({
      userId,
      planId:           plan._id,
      planName:         plan.name,
      pricePaid:        0,
      durationInDays:   durationOverrideDays || plan.durationInDays,
      featuresSnapshot: plan.features.toObject ? plan.features.toObject() : plan.features,
      paymentId:        `ADMIN_GRANT_${Date.now()}`,
      paymentGateway:   'manual',
      paymentStatus:    'success',
      startDate,
      endDate,
      status:           'active',
      createdBy:        req.user._id
    });

    await createNotification({
      userId,
      module:   'matrimonial',
      type:     'matrimonial_subscription_activated',
      title:    'Premium Activated! ✨',
      message:  `Admin has granted you a ${plan.name} subscription until ${endDate.toLocaleDateString()}.`,
      icon:     '✨',
      priority: 'high',
      actionUrl:'/member/matrimonial'
    });

    res.status(201).json({ status: 'success', message: 'Subscription granted.', data: { subscription: sub } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── List All Marriage Requests ───────────────────────────────────────────────
exports.listMarriageRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await MarriageRequest.countDocuments(query);
    const requests = await MarriageRequest.find(query)
      .populate('requesterId', 'name phone email')
      .populate('receiverId', 'name phone email')
      .populate('interestRequestId', 'status acceptedAt')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    res.json({ status: 'success', data: { requests, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Admin Force-Close Profile ────────────────────────────────────────────────
// Admin can close a profile manually (e.g., after confirming a marriage offline)
exports.adminCloseProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const profile = await MatrimonialProfile.findById(id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    profile.status           = 'married';
    profile.maritalLifecycle = 'married';
    profile.isClosed         = true;
    profile.closedAt         = new Date();
    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     'matrimonial_profile_closed',
      title:    'Profile Closed by Admin',
      message:  adminNote || 'Your matrimonial profile has been closed by the administrator.',
      icon:     '🔒',
      priority: 'high',
      actionUrl:'/member/matrimonial'
    });

    res.json({ status: 'success', message: 'Profile force-closed by admin.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Admin Reopen Closed Profile → Returns to Pending for Re-verification ─────
exports.adminReopenProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const profile = await MatrimonialProfile.findById(id);
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found.' });

    if (!profile.isClosed) {
      return res.status(400).json({ status: 'error', message: 'Profile is not currently closed.' });
    }

    // Reopen to PENDING — requires standard re-verification before becoming active
    profile.status                = 'pending';
    profile.maritalLifecycle      = 'single';
    profile.isClosed              = false;
    profile.closedAt              = undefined;
    profile.marriageConfirmedWith = undefined;
    profile.marriageRequestId     = undefined;
    profile.verificationStatus    = 'pending'; // Reset verification — must go through Head/Admin again
    await profile.save();

    await createNotification({
      userId:   profile.userId,
      module:   'matrimonial',
      type:     'matrimonial_profile_reopened',
      title:    'Profile Reopened',
      message:  adminNote || 'Your matrimonial profile has been reopened. It will go through verification before becoming visible again.',
      icon:     '🔓',
      priority: 'high',
      actionUrl:'/member/matrimonial'
    });

    res.json({ status: 'success', message: 'Profile reopened. Status set to pending for re-verification.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// ─── Matrimonial subscribers (who bought which plan) + revenue summary ────────
exports.listSubscriptions = async (req, res) => {
  try {
    const UserSubscriptionModel = require('../../models/UserSubscription');
    const { status, planId } = req.query;
    const now = new Date();
    const filter = {};
    if (planId) filter.planId = planId;
    if (status === 'active') { filter.status = { $in: ['active', 'grace', 'cancelled'] }; filter.endDate = { $gte: now }; }
    else if (status === 'expired') filter.$or = [{ endDate: { $lt: now } }, { status: 'expired' }];
    else if (status === 'cancelled') filter.status = 'cancelled';

    const subs = await UserSubscriptionModel.find(filter)
      .populate('userId', 'name phone email city')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const all = await UserSubscriptionModel.find({}).select('pricePaid status endDate paymentGateway planName').lean();
    const activeCount = all.filter(s => ['active', 'grace', 'cancelled'].includes(s.status) && new Date(s.endDate) >= now).length;
    const revenue = all.filter(s => s.paymentGateway === 'razorpay').reduce((sum, s) => sum + (s.pricePaid || 0), 0);
    const byPlan = {};
    all.forEach(s => { byPlan[s.planName || 'Unknown'] = (byPlan[s.planName || 'Unknown'] || 0) + 1; });

    res.json({
      status: 'success',
      data: {
        summary: { total: all.length, active: activeCount, paidRevenue: revenue, byPlan },
        subscriptions: subs.map(s => ({
          id: s._id,
          user: s.userId ? { id: s.userId._id, name: s.userId.name, phone: s.userId.phone, city: s.userId.city } : null,
          planName: s.planName,
          pricePaid: s.pricePaid,
          gateway: s.paymentGateway,
          status: (['active', 'grace', 'cancelled'].includes(s.status) && new Date(s.endDate) < now) ? 'expired' : s.status,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
