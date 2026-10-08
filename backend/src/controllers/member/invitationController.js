const Invitation = require('../../models/Invitation');
const { notifyInvitationReceived, createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

/**
 * Fields the creator's analytics view needs for every member it lists
 * (avatar + name for the card, phone for the one-tap call button).
 */
const MEMBER_ANALYTICS_FIELDS = 'name email avatar phone city profession initials';

const withAnalyticsPopulate = (query) => query
  .populate('creatorId', 'name email avatar phone city profession')
  .populate('rsvps.memberId', MEMBER_ANALYTICS_FIELDS)
  .populate('openedBy.memberId', MEMBER_ANALYTICS_FIELDS)
  .populate('invitedMemberIds', MEMBER_ANALYTICS_FIELDS);

// @desc    Create a new invitation
// @route   POST /api/member/invitations
// @access  Private
exports.createInvitation = async (req, res) => {
  try {
    const {
      title,
      hostName,
      date,
      timeFood,
      timeProgram,
      location,
      mapLink,
      contact,
      message,
      invitedMemberIds,
      invitedGroupIds,
      groomName,
      brideName,
      familyName,
      customFields
    } = req.body;

    // Handle uploaded images from Cloudinary or memory fallback
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path || (file.buffer ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : '')).filter(Boolean);
    }

    // Parse array fields if they are sent as strings
    let parsedMemberIds = [];
    let parsedGroupIds = [];
    try {
      if (invitedMemberIds) {
        parsedMemberIds = typeof invitedMemberIds === 'string' ? JSON.parse(invitedMemberIds) : invitedMemberIds;
      }
      if (invitedGroupIds) {
        parsedGroupIds = typeof invitedGroupIds === 'string' ? JSON.parse(invitedGroupIds) : invitedGroupIds;
      }
    } catch (e) {
      console.error('Error parsing member/group IDs:', e);
    }

    let parsedCustomFields = {};
    try {
      if (customFields) {
        parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : customFields;
      }
    } catch (e) {
      console.error('Error parsing customFields:', e);
    }

    const invitation = new Invitation({
      title,
      hostName,
      date,
      timeFood,
      timeProgram,
      location,
      mapLink,
      contact,
      message,
      images,
      creatorId: req.user._id,
      communityId: req.communityId || req.user.communityId,
      invitedMemberIds: parsedMemberIds,
      invitedGroupIds: parsedGroupIds,
      groomName,
      brideName,
      familyName,
      customFields: parsedCustomFields
    });
    const rsvpSettings = parseRsvpSettings(req.body.rsvpSettings);
    if (rsvpSettings) invitation.rsvpSettings = rsvpSettings;

    const createdInvitation = await invitation.save();

    // ── Notifications: Run in background fire-and-forget without blocking response ──
    if (parsedMemberIds && parsedMemberIds.length > 0) {
      setImmediate(async () => {
        try {
          if (typeof notifyInvitationReceived === 'function') {
            await notifyInvitationReceived(parsedMemberIds, hostName || req.user?.name || 'A member', title, createdInvitation._id, req.communityId);
          }
          parsedMemberIds.forEach(mId => {
            sendPushNotification({
              userId: mId,
              type: 'invitation_received',
              title: `You're Invited! 🎉`,
              message: `${hostName || req.user?.name || 'A member'} has invited you to "${title}".`,
              icon: '🎉',
              actionUrl: `/member/invitations/${createdInvitation._id}`
            }).catch(err => console.error('[InvitationPushError]', err.message));
          });
        } catch (notifErr) {
          console.warn('[Notify] createInvitation background error:', notifErr.message);
        }
      });
    }

    res.status(201).json(createdInvitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all invitations for the logged-in user's community (2-Level Scope)
// @route   GET /api/member/invitations
// @access  Private
exports.getInvitations = async (req, res) => {
  try {
    const userRole = (req?.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin', 'master_admin', 'master', 'head_admin', 'admin_sub_head'].includes(userRole);

    let filter = {};
    if (isAdmin) {
      filter = applyScopeFilter(req, {});
    } else {
      const userCommId = req.communityId || req.user?.communityId;
      const conditions = [
        { creatorId: req.user._id },
        { invitedMemberIds: req.user._id }
      ];
      if (userCommId) {
        conditions.push({ communityId: userCommId });
      }
      filter.$or = conditions;
    }

    const invitations = await withAnalyticsPopulate(Invitation.find(filter))
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get invitation by ID (Community Scoped)
// @route   GET /api/member/invitations/:id
// @access  Private
exports.getInvitationById = async (req, res) => {
  try {
    const invitation = await withAnalyticsPopulate(Invitation.findById(req.params.id));

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Authenticated members are permitted to view community invitations
    return res.json(invitation);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update RSVP status

// Reads the creator's RSVP setup from the form (sent as a JSON string with the photos).
const RSVP_KEYS = ['attending', 'attending_family', 'not_attending'];
const parseRsvpSettings = (raw, current = {}) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  let v = raw;
  try { v = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return undefined; }
  const cur = current && current.toObject ? current.toObject() : (current || {});
  const out = {
    enabled: v.enabled !== undefined ? !!v.enabled : (cur.enabled !== undefined ? cur.enabled : true),
    title: (v.title !== undefined ? String(v.title) : cur.title || '').trim().slice(0, 80) || 'RSVP (आपकी उपस्थिति)',
    message: (v.message !== undefined ? String(v.message) : cur.message || '').trim().slice(0, 200),
    options: {}
  };
  RSVP_KEYS.forEach(k => {
    const o = (v.options || {})[k] || {};
    const c = (cur.options || {})[k] || {};
    out.options[k] = {
      enabled: o.enabled !== undefined ? !!o.enabled : (c.enabled !== undefined ? c.enabled : true),
      label: (o.label !== undefined ? String(o.label) : c.label || '').trim().slice(0, 60)
    };
  });
  // Creator's own answers (up to 6), each with a stable key
  const extrasIn = v.extraOptions !== undefined ? v.extraOptions : (cur.extraOptions || []);
  const seen = new Set();
  out.extraOptions = (Array.isArray(extrasIn) ? extrasIn : [])
    .map(o => ({
      key: /^custom_[a-z0-9]{2,20}$/.test(String(o?.key || '')) ? String(o.key) : `custom_${Math.random().toString(36).slice(2, 10)}`,
      label: String(o?.label || '').trim().slice(0, 60)
    }))
    .filter(o => o.label && !seen.has(o.key) && seen.add(o.key))
    .slice(0, 6);
  // At least one answer must stay available while RSVP is on.
  if (out.enabled && !RSVP_KEYS.some(k => out.options[k].enabled) && out.extraOptions.length === 0) out.options.attending.enabled = true;
  return out;
};

// @route   PUT /api/member/invitations/:id/rsvp
// @access  Private
exports.updateRSVP = async (req, res) => {
  try {
    const { status } = req.body;
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const rs = invitation.rsvpSettings || {};
    if (rs.enabled === false) {
      return res.status(400).json({ message: 'The host has turned off RSVP for this invitation.' });
    }
    const extraKeys = (rs.extraOptions || []).map(o => o.key);
    const builtInOk = RSVP_KEYS.includes(status) && rs.options?.[status]?.enabled !== false;
    if (!builtInOk && !extraKeys.includes(status)) {
      return res.status(400).json({ message: 'This RSVP option is not available for this invitation.' });
    }

    const rsvpIndex = invitation.rsvps.findIndex(
      (r) => r.memberId.toString() === req.user._id.toString()
    );

    if (rsvpIndex >= 0) {
      // Update existing RSVP
      invitation.rsvps[rsvpIndex].status = status;
      invitation.rsvps[rsvpIndex].respondedAt = new Date();
    } else {
      // Add new RSVP
      invitation.rsvps.push({ memberId: req.user._id, status, respondedAt: new Date() });
    }

    await invitation.save();

    // Trigger Notification to Invitation Host
    if (invitation.creatorId && invitation.creatorId.toString() !== req.user._id.toString()) {
      createNotification({
        userId: invitation.creatorId,
        communityId: invitation.communityId || req.communityId,
        module: 'invitations',
        type: 'invitation_rsvp_response',
        title: 'New RSVP Response 💌',
        message: `${req.user?.name || 'A member'} responded "${status}" to your invitation "${invitation.title}".`,
        icon: '💌',
        priority: 'normal',
        actionUrl: `/member/invitations/${invitation._id}`,
        referenceId: invitation._id,
        referenceType: 'Invitation'
      }).catch(err => console.error('[RSVPNotifError]', err.message));
    }

    const populated = await withAnalyticsPopulate(Invitation.findById(invitation._id));
    res.json(populated);
  } catch (error) {
    console.error('Error updating RSVP:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Record that the logged-in member opened this invitation
// @route   POST /api/member/invitations/:id/open
// @access  Private
exports.trackInvitationOpened = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const viewerId = req.user._id.toString();
    const isCreator = invitation.creatorId && invitation.creatorId.toString() === viewerId;

    // A creator browsing their own invitation is not an "open" worth reporting to them.
    if (!isCreator) {
      const now = new Date();
      const existing = invitation.openedBy.find(
        (o) => o.memberId && o.memberId.toString() === viewerId
      );

      if (existing) {
        existing.lastOpenedAt = now;
        existing.openCount = (existing.openCount || 1) + 1;
      } else {
        invitation.openedBy.push({ memberId: req.user._id, openedAt: now, lastOpenedAt: now, openCount: 1 });
      }

      invitation.viewCount = (invitation.viewCount || 0) + 1;
      await invitation.save();
    }

    const populated = await withAnalyticsPopulate(Invitation.findById(invitation._id));
    res.json(populated);
  } catch (error) {
    console.error('Error tracking invitation open:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete invitation
// @route   DELETE /api/member/invitations/:id
// @access  Private
exports.deleteInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if the user is authorized within their community (creator, head, or admin)
    const isCreator = invitation.creatorId && invitation.creatorId.toString() === req.user._id.toString();
    const isHeadOrAdmin = ['head', 'admin', 'head_admin', 'super_admin', 'master_admin'].includes((req.user.role || '').toLowerCase());

    if (!isCreator && !isHeadOrAdmin) {
      return res.status(401).json({ message: 'Not authorized to delete this invitation' });
    }

    await Invitation.deleteOne({ _id: invitation._id });
    res.json({ message: 'Invitation removed' });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update an invitation
// @route   PUT /api/member/invitations/:id
// @access  Private
exports.updateInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if the user is authorized within their community (creator, head, or admin)
    const isCreator = invitation.creatorId && invitation.creatorId.toString() === req.user._id.toString();
    const isHeadOrAdmin = ['head', 'admin', 'head_admin', 'super_admin', 'master_admin'].includes((req.user.role || '').toLowerCase());

    if (!isCreator && !isHeadOrAdmin) {
      return res.status(401).json({ message: 'Not authorized to update this invitation' });
    }

    const {
      title,
      hostName,
      date,
      timeFood,
      timeProgram,
      location,
      mapLink,
      contact,
      message,
      invitedMemberIds,
      invitedGroupIds,
      groomName,
      brideName,
      familyName,
      status,
      existingImages,
      customFields
    } = req.body;

    // Handle existing images
    let images = [];
    if (existingImages) {
      try {
        images = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch (e) {
        console.error('Error parsing existingImages:', e);
        images = invitation.images || [];
      }
    } else {
      images = invitation.images || [];
    }

    // Handle newly uploaded images from Cloudinary or memory fallback
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path || (file.buffer ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : '')).filter(Boolean);
      images = [...images, ...newImages];
    }

    // Parse array fields if they are sent as strings
    let parsedMemberIds = invitation.invitedMemberIds;
    let parsedGroupIds = invitation.invitedGroupIds;
    try {
      if (invitedMemberIds) {
        parsedMemberIds = typeof invitedMemberIds === 'string' ? JSON.parse(invitedMemberIds) : invitedMemberIds;
      }
      if (invitedGroupIds) {
        parsedGroupIds = typeof invitedGroupIds === 'string' ? JSON.parse(invitedGroupIds) : invitedGroupIds;
      }
    } catch (e) {
      console.error('Error parsing member/group IDs:', e);
    }

    let parsedCustomFields = invitation.customFields || {};
    try {
      if (customFields) {
        parsedCustomFields = typeof customFields === 'string' ? JSON.parse(customFields) : customFields;
      }
    } catch (e) {
      console.error('Error parsing customFields:', e);
    }

    const nextRsvp = parseRsvpSettings(req.body.rsvpSettings, invitation.rsvpSettings);
    if (nextRsvp) invitation.rsvpSettings = nextRsvp;
    invitation.title = title || invitation.title;
    invitation.hostName = hostName || invitation.hostName;
    invitation.date = date || invitation.date;
    invitation.timeFood = timeFood !== undefined ? timeFood : invitation.timeFood;
    invitation.timeProgram = timeProgram !== undefined ? timeProgram : invitation.timeProgram;
    invitation.location = location || invitation.location;
    invitation.mapLink = mapLink !== undefined ? mapLink : invitation.mapLink;
    invitation.contact = contact || invitation.contact;
    invitation.message = message !== undefined ? message : invitation.message;
    invitation.images = images;
    invitation.invitedMemberIds = parsedMemberIds;
    invitation.invitedGroupIds = parsedGroupIds;
    invitation.groomName = groomName || invitation.groomName;
    invitation.brideName = brideName || invitation.brideName;
    invitation.familyName = familyName || invitation.familyName;
    invitation.status = status || invitation.status;
    
    if (customFields) {
      invitation.customFields = parsedCustomFields;
      invitation.markModified('customFields');
    }

    await invitation.save();

    // Notify invited members about the update in background
    setImmediate(async () => {
      try {
        const recipientIds = invitation.invitedMemberIds || [];
        if (recipientIds.length > 0) {
          recipientIds.forEach(mId => {
            const mIdStr = (mId?._id || mId).toString();
            if (mIdStr !== req.user._id.toString()) {
              createNotification({
                userId: mId,
                communityId: invitation.communityId || req.communityId,
                module: 'invitations',
                type: 'invitation_updated',
                title: 'Invitation Updated ✏️',
                message: `Details for "${invitation.title}" have been updated by ${invitation.hostName || req.user?.name || 'the host'}.`,
                icon: '✏️',
                priority: 'normal',
                actionUrl: `/member/invitations/${invitation._id}`,
                referenceId: invitation._id,
                referenceType: 'Invitation'
              }).catch(err => console.error('[UpdateNotifError]', err.message));
            }
          });
        }
      } catch (notifErr) {
        console.warn('[Notify] updateInvitation notification failed:', notifErr.message);
      }
    });

    const updated = await withAnalyticsPopulate(Invitation.findById(invitation._id));
    res.json(updated);
  } catch (error) {
    console.error('Error updating invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Cancel an invitation with a reason
// @route   PUT /api/member/invitations/:id/cancel
// @access  Private
exports.cancelInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    const isCreator = invitation.creatorId && invitation.creatorId.toString() === req.user._id.toString();
    const isHeadOrAdmin = ['head', 'admin', 'head_admin', 'super_admin', 'master_admin'].includes((req.user.role || '').toLowerCase());

    if (!isCreator && !isHeadOrAdmin) {
      return res.status(401).json({ message: 'Not authorized to cancel this invitation' });
    }

    const { reason } = req.body;
    const cancellationReason = reason && reason.trim() ? reason.trim() : 'Event cancelled by organizer';

    invitation.status = 'Cancelled';
    invitation.isCancelled = true;
    invitation.cancellationReason = cancellationReason;
    invitation.cancelledAt = new Date();
    invitation.cancelledBy = req.user._id;

    await invitation.save();

    // Notify all invited members about the cancellation
    try {
      const recipientIds = invitation.invitedMemberIds || [];
      if (recipientIds.length > 0) {
        recipientIds.forEach(mId => {
          const mIdStr = mId.toString();
          if (mIdStr !== req.user._id.toString()) {
            createNotification({
              userId: mId,
              communityId: invitation.communityId || req.communityId,
              module: 'invitations',
              type: 'invitation_cancelled',
              title: 'Event Cancelled ❌',
              message: `"${invitation.title}" has been cancelled. Reason: ${cancellationReason}`,
              icon: '❌',
              priority: 'high',
              actionUrl: `/member/invitations/${invitation._id}`,
              referenceId: invitation._id,
              referenceType: 'Invitation'
            }).catch(err => console.error('[CancelNotifError]', err.message));

            sendPushNotification({
              userId: mId,
              type: 'invitation_cancelled',
              title: `Event Cancelled ❌`,
              message: `"${invitation.title}" has been cancelled. Reason: ${cancellationReason}`,
              icon: '❌',
              actionUrl: `/member/invitations/${invitation._id}`
            }).catch(err => console.error('[CancelPushError]', err.message));
          }
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] cancelInvitation notification failed:', notifErr.message);
    }

    const updated = await withAnalyticsPopulate(Invitation.findById(invitation._id));
    res.json(updated);
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
