const Invitation = require('../../models/Invitation');
const { notifyInvitationReceived, createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

/**
 * Fields the creator's analytics view needs for every member it lists
 * (avatar + name for the card, phone for the one-tap call button).
 */
const MEMBER_ANALYTICS_FIELDS = 'name email avatar phone city profession';

const withAnalyticsPopulate = (query) => query
  .populate('creatorId', 'name email')
  .populate('rsvps.memberId', MEMBER_ANALYTICS_FIELDS)
  .populate('openedBy.memberId', MEMBER_ANALYTICS_FIELDS);

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

    // Handle uploaded images from Cloudinary
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path); // Cloudinary URL is in file.path
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
      /**
       * communityId is ALWAYS set server-side from the authenticated user's community.
       * Client body.communityId is intentionally ignored for security.
       */
      communityId: req.communityId,
      invitedMemberIds: parsedMemberIds,
      invitedGroupIds: parsedGroupIds,
      groomName,
      brideName,
      familyName,
      customFields: parsedCustomFields
    });

    const createdInvitation = await invitation.save();

    // ── Notification: notify invited members ──────────────────────────────────────
    try {
      if (parsedMemberIds && parsedMemberIds.length > 0) {
        notifyInvitationReceived(parsedMemberIds, hostName || req.user.name || 'A member', title, createdInvitation._id);

        parsedMemberIds.forEach(mId => {
          sendPushNotification({
            userId: mId,
            type: 'invitation_received',
            title: `You're Invited! 🎉`,
            message: `${hostName || req.user.name || 'A member'} has invited you to "${title}".`,
            icon: '🎉',
            actionUrl: `/member/invitations/${createdInvitation._id}`
          }).catch(err => console.error('[InvitationPushError]', err.message));
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] createInvitation invitation_received failed:', notifErr.message);
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
    const filter = applyScopeFilter(req, {});

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
    const filter = applyScopeFilter(req, { _id: req.params.id });
    const invitation = await withAnalyticsPopulate(Invitation.findOne(filter));

    if (invitation) {
      res.json(invitation);
    } else {
      res.status(404).json({ message: 'Invitation not found or access denied' });
    }
  } catch (error) {
    console.error('Error fetching invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update RSVP status
// @route   PUT /api/member/invitations/:id/rsvp
// @access  Private
exports.updateRSVP = async (req, res) => {
  try {
    const { status } = req.body;
    const filter = applyScopeFilter(req, { _id: req.params.id });
    const invitation = await Invitation.findOne(filter);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
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
    const filter = applyScopeFilter(req, { _id: req.params.id });
    const invitation = await Invitation.findOne(filter);

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
    const filter = applyScopeFilter(req, { _id: req.params.id });
    const invitation = await Invitation.findOne(filter);

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
    const filter = applyScopeFilter(req, { _id: req.params.id });
    const invitation = await Invitation.findOne(filter);

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

    // Handle newly uploaded images from Cloudinary
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
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
    const updated = await withAnalyticsPopulate(Invitation.findById(invitation._id));
    res.json(updated);
  } catch (error) {
    console.error('Error updating invitation:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
