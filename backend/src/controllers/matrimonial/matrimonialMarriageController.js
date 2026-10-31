/**
 * matrimonialMarriageController.js
 * Handles the Marriage Lifecycle — the final stage of the Matrimonial journey.
 * Extends the existing Matrimonial module. Does NOT duplicate any existing logic.
 *
 * Flow:
 *   Connected → sendMarriageRequest → respondToMarriageRequest (accept/reject)
 *   On Accept: Both profiles set to status:married, isClosed:true, removed from matchmaking.
 *   On Reject: Stays Connected. User A notified.
 */
const MarriageRequest    = require('../../models/MarriageRequest');
const MatrimonialProfile = require('../../models/MatrimonialProfile');
const InterestRequest    = require('../../models/InterestRequest');
const Conversation       = require('../../models/Conversation');
const {
  notifyMarriageRequestReceived,
  notifyMarriageAccepted,
  notifyMarriageRejected,
  notifyProfileClosed
} = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { getIO } = require('../../services/socketRegistry');
const { createNotification } = require('../../services/notificationService');
const SuccessStory       = require('../../models/SuccessStory');

// Statuses a member can choose when their marriage has ended
const REOPEN_STATUSES = ['Divorced', 'Separated', 'Awaiting Divorce', 'Widowed', 'Never Married'];
exports.REOPEN_STATUSES = REOPEN_STATUSES;

// ─── Reopen My Profile (marriage ended) ───────────────────────────────────────
// A member whose profile was closed as married (through the app or by an admin)
// can mark the marriage as ended. The profile goes back into matchmaking with the
// new marital status; what they can search/see is then governed by their plan,
// exactly like any other active profile. The former partner's profile is not touched.
exports.reopenMyProfile = async (req, res) => {
  try {
    const { maritalStatus, note } = req.body;
    if (!REOPEN_STATUSES.includes(maritalStatus)) {
      return res.status(400).json({ status: 'error', message: `Choose your current marital status: ${REOPEN_STATUSES.join(', ')}.` });
    }

    const profile = await MatrimonialProfile.findOne({ userId: req.user._id, isDeleted: false });
    if (!profile) return res.status(404).json({ status: 'error', message: 'You do not have a matrimonial profile.' });
    if (!profile.isClosed && profile.status !== 'married') {
      return res.status(400).json({ status: 'error', message: 'Your profile is already open for matchmaking.' });
    }
    if (['suspended', 'deleted'].includes(profile.status)) {
      return res.status(400).json({ status: 'error', message: `Your profile is ${profile.status}. Please contact support.` });
    }

    const formerPartner = profile.marriageConfirmedWith;
    profile.previousMarriages.push({
      partnerUserId:     formerPartner || undefined,
      marriageRequestId: profile.marriageRequestId || undefined,
      marriedAt:         profile.closedAt || undefined,
      endedAt:           new Date(),
      newMaritalStatus:  maritalStatus,
      note:              typeof note === 'string' ? note.trim().slice(0, 500) : undefined
    });

    profile.personal.maritalStatus = maritalStatus;
    profile.status                 = 'active';
    profile.maritalLifecycle       = 'single';
    profile.isClosed               = false;
    profile.closedAt               = undefined;
    profile.marriageConfirmedWith  = undefined;
    profile.marriageRequestId      = undefined;
    profile.allowPublicStory       = false;
    profile.updatedBy              = req.user._id;
    await profile.save();

    // A published success story about this marriage shouldn't stay up
    if (formerPartner) {
      await SuccessStory.updateMany(
        {
          status: 'published',
          $or: [
            { groomId: req.user._id, brideId: formerPartner },
            { groomId: formerPartner, brideId: req.user._id }
          ]
        },
        { status: 'archived', updatedBy: req.user._id }
      );
    }

    createNotification({
      userId:   req.user._id,
      module:   'matrimonial',
      type:     'matrimonial_profile_reopened',
      title:    'Profile Reopened',
      message:  `Your matrimonial profile is active again with marital status "${maritalStatus}". You can now find new matches as per your plan.`,
      icon:     '🔓',
      actionUrl:'/member/matrimonial'
    }).catch(() => {});

    res.json({
      status:  'success',
      message: 'Your profile is active again. You can now see new matches as per your plan.',
      data:    { status: profile.status, maritalStatus, maritalLifecycle: profile.maritalLifecycle }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Send Marriage Confirmation Request ───────────────────────────────────────
// Either connected partner can initiate.
exports.sendMarriageRequest = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { partnerProfileId, message }  = req.body;

    if (!partnerProfileId) {
      return res.status(400).json({ status: 'error', message: 'Partner profile ID is required.' });
    }

    // ─── Requester must have a matrimonial profile and be Connected ───────────
    const myProfile = await MatrimonialProfile.findOne({
      userId:    requesterId,
      isDeleted: false
    });
    if (!myProfile) {
      return res.status(404).json({ status: 'error', message: 'You do not have a matrimonial profile.' });
    }
    if (myProfile.maritalLifecycle !== 'connected') {
      return res.status(400).json({ status: 'error', message: 'You must be Connected with someone before sending a marriage confirmation.' });
    }
    if (myProfile.isClosed) {
      return res.status(400).json({ status: 'error', message: 'Your profile is already closed.' });
    }

    // Get partner's userId
    const partnerProfile = await MatrimonialProfile.findOne({ _id: partnerProfileId, isDeleted: false });
    if (!partnerProfile) {
      return res.status(404).json({ status: 'error', message: 'Partner profile not found.' });
    }
    const receiverId = partnerProfile.userId;

    // ─── Find the accepted InterestRequest that links both users ─────────────
    const acceptedInterest = await InterestRequest.findOne({
      $or: [
        { senderId: requesterId, receiverId: receiverId, status: 'accepted' },
        { senderId: receiverId, receiverId: requesterId, status: 'accepted' }
      ]
    });
    if (!acceptedInterest) {
      return res.status(400).json({ status: 'error', message: 'No accepted interest found with this user. Cannot send marriage request.' });
    }

    // ─── Block duplicate pending requests (Transaction for safety) ─────────────
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();
    let marriageRequest;

    try {
      const existing = await MarriageRequest.findOne({
        $or: [
          { requesterId, status: 'pending' },
          { receiverId: requesterId, status: 'pending' }
        ]
      }).session(session);

      if (existing) {
        throw new Error('HAS_PENDING_REQUEST');
      }

      // ─── Receiver must also be Connected ──────────────────────────────────────
      const receiverProfile = await MatrimonialProfile.findOne({
        userId:    receiverId,
        isDeleted: false
      }).session(session);

      if (!receiverProfile || receiverProfile.maritalLifecycle !== 'connected') {
        throw new Error('NOT_CONNECTED');
      }
      if (receiverProfile.isClosed) {
        throw new Error('ALREADY_CLOSED');
      }

      // ─── Create Marriage Request ───────────────────────────────────────────────
      const created = await MarriageRequest.create([{
        requesterId,
        receiverId,
        interestRequestId: acceptedInterest._id,
        message:           message || '',
        requestedAt:       new Date()
      }], { session });
      
      marriageRequest = created[0];

      await session.commitTransaction();
      session.endSession();
    } catch (txErr) {
      await session.abortTransaction();
      session.endSession();
      if (txErr.message === 'HAS_PENDING_REQUEST') {
        return res.status(400).json({ status: 'error', message: 'You already have a pending marriage confirmation request. Please resolve it first.' });
      } else if (txErr.message === 'NOT_CONNECTED') {
        return res.status(400).json({ status: 'error', message: 'The other user is not in Connected status.' });
      } else if (txErr.message === 'ALREADY_CLOSED') {
        return res.status(400).json({ status: 'error', message: 'The other user\'s profile is already closed.' });
      }
      throw txErr;
    }

    // ─── Notify receiver ───────────────────────────────────────────────────────
    const notifReceived = await notifyMarriageRequestReceived(receiverId, req.user.name, marriageRequest._id);
    if (notifReceived) {
      sendPushNotification({
        userId: receiverId,
        notificationId: notifReceived._id,
        type: 'matrimonial_marriage_request_received',
        title: 'Marriage Request Received 💍',
        message: `${req.user.name} sent you a marriage confirmation request.`,
        icon: '💍',
        actionUrl: '/member/matrimonial/requests'
      }).catch(err => console.error('[MarriagePushError]', err.message));
    }

    // ─── Socket.IO: real-time notification ────────────────────────────────────
    const io = getIO();
    if (io) {
      io.to(`user:${receiverId}`).emit('matrimonial:marriageRequest', {
        requestId:   marriageRequest._id,
        requesterName: req.user.name,
        message:     message || ''
      });
    }

    res.status(201).json({
      status:  'success',
      message: 'Marriage confirmation request sent successfully.',
      data:    { request: marriageRequest }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Respond to Marriage Request (Accept / Reject) ────────────────────────────
exports.respondToMarriageRequest = async (req, res) => {
  try {
    const { id }     = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const receiverId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be accept or reject.' });
    }

    // ─── Find the pending request addressed to this user ─────────────────────
    const marriageRequest = await MarriageRequest.findOne({
      _id:      id,
      receiverId,
      status:   'pending'
    });
    if (!marriageRequest) {
      return res.status(404).json({ status: 'error', message: 'Marriage request not found or already processed.' });
    }

    marriageRequest.respondedAt = new Date();

    if (action === 'reject') {
      // ─── REJECT: keep Connected status, notify requester ─────────────────
      marriageRequest.status = 'rejected';
      await marriageRequest.save();

      notifyMarriageRejected(marriageRequest.requesterId, req.user.name);

      const io = getIO();
      if (io) {
        io.to(`user:${marriageRequest.requesterId}`).emit('matrimonial:marriageRejected', {
          requestId: marriageRequest._id
        });
      }

      return res.json({
        status:  'success',
        message: 'Marriage confirmation request declined. You remain Connected.',
        data:    { request: marriageRequest }
      });
    }

    // ─── ACCEPT: close both profiles ─────────────────────────────────────────
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Re-verify both profiles are still valid, active, and connected INSIDE the transaction phase
      const profiles = await MatrimonialProfile.find({
        userId: { $in: [marriageRequest.requesterId, receiverId] },
        isDeleted: false,
        status: 'active'
      }).session(session);

      if (profiles.length !== 2) {
        throw new Error('One or both profiles are no longer active or have been deleted/suspended.');
      }
      if (profiles.some(p => p.maritalLifecycle !== 'connected')) {
        throw new Error('Both users must be in a Connected state to finalize marriage.');
      }

      marriageRequest.status = 'accepted';
      await marriageRequest.save({ session });

      const now = new Date();

      // Update BOTH matrimonial profiles atomically
      await MatrimonialProfile.updateMany(
        {
          userId:    { $in: [marriageRequest.requesterId, receiverId] },
          isDeleted: false
        },
        {
          $set: {
            status:               'married',
            maritalLifecycle:     'married',
            isClosed:             true,
            closedAt:             now,
            marriageRequestId:    marriageRequest._id
          }
        },
        { session }
      );

      // Set marriageConfirmedWith cross-reference for each user
      await MatrimonialProfile.findOneAndUpdate(
        { userId: marriageRequest.requesterId, isDeleted: false },
        { $set: { marriageConfirmedWith: receiverId } },
        { session }
      );
      await MatrimonialProfile.findOneAndUpdate(
        { userId: receiverId, isDeleted: false },
        { $set: { marriageConfirmedWith: marriageRequest.requesterId } },
        { session }
      );

      // ─── Archive the matrimonial chat: mark conversation as read-only ─────────
      await Conversation.updateMany(
        {
          type:         'matrimonial',
          participants: { $all: [marriageRequest.requesterId, receiverId] }
        },
        {
          $set: {
            isArchived:   true,
            isReadOnly:   true,
            archivedAt:   now
          }
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
    } catch (txErr) {
      await session.abortTransaction();
      session.endSession();
      throw txErr;
    }

    // ─── Notifications to both users ──────────────────────────────────────────
    const notifAccepted = await notifyMarriageAccepted(marriageRequest.requesterId, req.user.name);
    if (notifAccepted) {
      sendPushNotification({
        userId: marriageRequest.requesterId,
        notificationId: notifAccepted._id,
        type: 'matrimonial_marriage_accepted',
        title: 'Marriage Confirmed! 🎉💍',
        message: `${req.user.name} accepted your marriage confirmation request! Congratulations!`,
        icon: '💍',
        actionUrl: '/member/matrimonial/my-profile'
      }).catch(err => console.error('[MarriageAcceptedPushError]', err.message));
    }
    notifyProfileClosed(marriageRequest.requesterId);
    notifyProfileClosed(receiverId);

    // ─── Socket.IO: real-time update to both users, admin, and head ────────────
    const io = getIO();
    if (io) {
      const payload = { requestId: marriageRequest._id, status: 'married' };
      
      // Update participants
      io.to(`user:${marriageRequest.requesterId}`).emit('matrimonial:marriageAccepted', payload);
      io.to(`user:${receiverId}`).emit('matrimonial:marriageAccepted', payload);
      io.to(`user:${marriageRequest.requesterId}`).emit('matrimonial:profileClosed', { status: 'married' });
      io.to(`user:${receiverId}`).emit('matrimonial:profileClosed', { status: 'married' });

      // Update Dashboards (trigger refetch)
      io.emit('admin:matrimonial_update');
      
      // Look up community of either user for head update (assuming both in same community)
      const userProfile = await MatrimonialProfile.findOne({ userId: receiverId, isDeleted: false });
      if (userProfile && userProfile.personal && userProfile.personal.community) {
        io.emit('head:matrimonial_update'); // We can broadcast globally to all heads or specific ones
      } else {
        io.emit('head:matrimonial_update'); // fallback
      }
    }

    res.json({
      status:  'success',
      message: 'Marriage confirmed! Both profiles are now closed. Congratulations! 🎊',
      data:    { request: marriageRequest }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get My Marriage Requests (sent + received) ───────────────────────────────
exports.getMyMarriageRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const [sent, received] = await Promise.all([
      MarriageRequest.find({ requesterId: userId })
        .populate('receiverId', 'name avatar')
        .sort({ createdAt: -1 })
        .lean(),
      MarriageRequest.find({ receiverId: userId })
        .populate('requesterId', 'name avatar')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Enrich with matrimonial profile basics
    const enrichSide = async (requests, idField) => Promise.all(
      requests.map(async (r) => {
        const otherId = r[idField]?._id || r[idField];
        const profile = await MatrimonialProfile.findOne({ userId: otherId, isDeleted: false })
          .select('personal.fullName personal.gender photos location profileCompletion')
          .lean({ virtuals: true });
        return { ...r, partnerProfile: profile };
      })
    );

    const enrichedSent     = await enrichSide(sent, 'receiverId');
    const enrichedReceived = await enrichSide(received, 'requesterId');

    res.json({
      status: 'success',
      data:   { sent: enrichedSent, received: enrichedReceived }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── Get My Marriage Status ───────────────────────────────────────────────────
exports.getMarriageStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    const myProfile = await MatrimonialProfile.findOne({ userId, isDeleted: false })
      .select('status maritalLifecycle isClosed closedAt marriageConfirmedWith marriageRequestId')
      .lean();

    if (!myProfile) {
      return res.json({ status: 'success', data: { hasProfile: false } });
    }

    // If connected, check if there's a pending marriage request
    let pendingRequest = null;
    if (myProfile.maritalLifecycle === 'connected' && !myProfile.isClosed) {
      pendingRequest = await MarriageRequest.findOne({
        $or: [
          { requesterId: userId, status: 'pending' },
          { receiverId:  userId, status: 'pending' }
        ]
      }).lean();
    }

    res.json({
      status: 'success',
      data:   {
        hasProfile:       true,
        profileStatus:    myProfile.status,
        maritalLifecycle: myProfile.maritalLifecycle,
        isClosed:         myProfile.isClosed,
        closedAt:         myProfile.closedAt,
        marriageConfirmedWith: myProfile.marriageConfirmedWith,
        pendingMarriageRequest: pendingRequest
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
