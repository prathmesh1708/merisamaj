const fs = require('fs');
const path = require('path');
const Obituary = require('../../models/Obituary');
const User = require('../../models/User');
const { notifyObituaryPosted, notifyObituaryPostedToHead, createBroadcastNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

const ADMIN_ROLES = ['admin', 'super_admin', 'master_admin', 'master'];

// Helper to check if user is a privileged user (head or any admin role)
const isPrivilegedUser = (req) => {
  const role = (req?.user?.role || '').toLowerCase();
  return role === 'head' || ADMIN_ROLES.includes(role);
};

// Helper to check if an obituary belongs to the requester's community (or if requester is admin)
const isSameCommunity = (obituary, req) => {
  if (!obituary) return false;
  const userRole = (req?.user?.role || '').toLowerCase();
  if (ADMIN_ROLES.includes(userRole)) return true;  // Admin: global access

  const obCommunityId = obituary.communityId?._id ?? obituary.communityId;
  if (req?.communityId && obCommunityId) {
    return obCommunityId.toString() === req.communityId.toString();
  }
  // Fallback for pre-migration documents using String community field
  if (req?.user?.community && obituary.community) {
    return obituary.community === req.user.community;
  }
  return false;
};

// @desc    Create a new obituary
// @route   POST /api/member/obituaries
// @access  Private
exports.createObituary = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    if (!payload.communityId) {
      return res.status(400).json({ message: 'No community context found.' });
    }
    const {
      prefix,
      deceasedName,
      age,
      birthDate,
      dateOfPassing,
      ritesType,
      ritesDate,
      ritesTime,
      ritesVenue,
      ceremonies: rawCeremonies,
      message,
      privacy,
      familyContact,
      relation,
      status
    } = req.body;

    // Safe JSON parsing for ceremonies array
    let parsedCeremonies = [];
    if (rawCeremonies) {
      try {
        parsedCeremonies = typeof rawCeremonies === 'string' ? JSON.parse(rawCeremonies) : rawCeremonies;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid ceremonies JSON format' });
      }
    }

    const primaryType = parsedCeremonies[0]?.type || ritesType || 'Funeral / Last Rites';
    const primaryDate = parsedCeremonies[0]?.date || ritesDate;
    const primaryTime = parsedCeremonies[0]?.time !== undefined ? parsedCeremonies[0].time : (ritesTime || '');
    const primaryVenue = parsedCeremonies[0]?.venue || ritesVenue;

    // Validate critical inputs
    if (!deceasedName || !deceasedName.trim()) {
      return res.status(400).json({ message: 'Deceased name is required' });
    }
    if (!dateOfPassing) {
      return res.status(400).json({ message: 'Date of passing is required' });
    }
    if (!primaryDate) {
      return res.status(400).json({ message: 'Primary ceremony date is required' });
    }
    if (!primaryVenue || !primaryVenue.trim()) {
      return res.status(400).json({ message: 'Primary ceremony venue is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Condolence message is required' });
    }

    // Get image path from upload middleware (Cloudinary URL or saved local file)
    let image = '';
    if (req.file) {
      if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
        image = req.file.path;
      } else if (req.file.buffer) {
        try {
          const uploadDir = path.join(__dirname, '../../../uploads/obituaries');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const ext = req.file.mimetype ? (req.file.mimetype.split('/')[1] || 'png') : 'png';
          const filename = `obituary_${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
          image = `/uploads/obituaries/${filename}`;
        } catch (fileErr) {
          console.error('Error saving obituary file buffer:', fileErr);
          image = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
        }
      } else if (req.file.path) {
        image = req.file.path;
      }
    } else if (req.body.image && typeof req.body.image === 'string') {
      image = req.body.image;
    }

    const fullName = `${prefix || ''} ${deceasedName}`.trim();

    const obituary = new Obituary({
      deceasedName: fullName,
      deceasedNameEn: deceasedName,
      prefix: prefix || '',
      age: parseInt(age) || 0,
      birthDate: birthDate || '',
      dateOfPassing,
      funeralDetails: {
        type: primaryType,
        date: primaryDate,
        time: primaryTime,
        venue: primaryVenue
      },
      ceremonies: parsedCeremonies.length > 0 ? parsedCeremonies : [{
        type: primaryType,
        date: primaryDate,
        time: primaryTime,
        venue: primaryVenue
      }],
      message,
      image,
      creatorId: req.user._id,
      relation: relation || 'Family Member',
      communityId: payload.communityId,
      community: req.user.community || '',
      privacy: privacy || 'public',
      familyContact: familyContact || '',
      status: status || 'Approved'
    });

    const savedObituary = await obituary.save();
    
    // ── Notification: notify community members & head ────────────────────────────
    try {
      if (req.communityId) {
        createBroadcastNotification({
          communityId: req.communityId,
          module: 'obituary',
          type: 'obituary_posted',
          title: 'Obituary Notice 🕊️',
          message: `An obituary has been posted for "${fullName}". Please keep the family in your prayers.`,
          icon: '🕊️',
          priority: 'high',
          actionUrl: `/member/shradhanjali/${savedObituary._id}`,
          referenceId: savedObituary._id,
          referenceType: 'Obituary'
        });

        // Find community head(s) and send specific head notification
        const heads = await User.find({
          communityId: req.communityId,
          role: { $in: ['head', 'admin'] },
          _id: { $ne: req.user._id }
        }).select('_id').lean();

        heads.forEach(h => {
          notifyObituaryPostedToHead(h._id, fullName, req.user.name || 'A community member', savedObituary._id);
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] createObituary obituary_posted failed:', notifErr.message);
    }

    // Populate creator info
    const populated = await Obituary.findById(savedObituary._id).populate('creatorId', 'name email avatar initials phone');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating obituary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all obituaries for user's community
// @route   GET /api/member/obituaries
// @access  Private
exports.getObituaries = async (req, res) => {
  try {
    let baseFilter = {};

    // Regular members only see Approved posts and their own submissions
    if (!isPrivilegedUser(req)) {
      baseFilter.$or = [
        { status: 'Approved' },
        { creatorId: req.user._id }
      ];
    }

    // Ceremony type filter (Array-aware via $elemMatch + fallback)
    if (req.query.ceremonyType && req.query.ceremonyType !== 'all') {
      const ceremonyType = req.query.ceremonyType.trim();
      const ceremonyCondition = [
        { 'funeralDetails.type': ceremonyType },
        { ceremonies: { $elemMatch: { type: ceremonyType } } }
      ];
      if (baseFilter.$or) {
        const existingOr = baseFilter.$or;
        delete baseFilter.$or;
        baseFilter.$and = baseFilter.$and || [];
        baseFilter.$and.push({ $or: existingOr }, { $or: ceremonyCondition });
      } else {
        baseFilter.$or = ceremonyCondition;
      }
    }

    const query = applyScopeFilter(req, baseFilter);

    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = req.query.limit ? Math.max(1, Number(req.query.limit)) : 0;
    const skipNum = (pageNum - 1) * (limitNum || 50);

    let queryExec = Obituary.find(query)
      .populate('creatorId', 'name email avatar initials phone')
      .populate('communityId', 'name slug')
      .sort({ createdAt: -1 });

    if (limitNum > 0) {
      queryExec = queryExec.skip(skipNum).limit(limitNum);
    }

    const obituaries = await queryExec.lean();

    res.json(obituaries);
  } catch (error) {
    console.error('Error fetching obituaries:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get obituary by ID
// @route   GET /api/member/obituaries/:id
// @access  Private
exports.getObituaryById = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id)
      .populate('creatorId', 'name email avatar initials phone')
      .lean();

    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }

    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to view obituaries from other communities' });
    }

    res.json(obituary);
  } catch (error) {
    console.error('Error fetching obituary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update obituary details
// @route   PUT /api/member/obituaries/:id
// @access  Private
exports.updateObituary = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);

    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }

    // Verify ownership or community leadership role
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to update obituaries from other communities' });
    }

    const isCreator = obituary.creatorId.toString() === req.user._id.toString();
    const isLeadOrAdmin = isPrivilegedUser(req);

    if (!isCreator && !isLeadOrAdmin) {
      return res.status(401).json({ message: 'Not authorized to update this obituary' });
    }

    const {
      prefix,
      deceasedName,
      age,
      birthDate,
      dateOfPassing,
      ritesType,
      ritesDate,
      ritesTime,
      ritesVenue,
      ceremonies: rawCeremonies,
      message,
      privacy,
      familyContact,
      relation,
      existingImage,
      status
    } = req.body;

    let parsedCeremonies = null;
    if (rawCeremonies) {
      try {
        parsedCeremonies = typeof rawCeremonies === 'string' ? JSON.parse(rawCeremonies) : rawCeremonies;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid ceremonies JSON format' });
      }
    }

    let image = existingImage || obituary.image;
    if (req.file) {
      if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
        image = req.file.path;
      } else if (req.file.buffer) {
        try {
          const uploadDir = path.join(__dirname, '../../../uploads/obituaries');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const ext = req.file.mimetype ? (req.file.mimetype.split('/')[1] || 'png') : 'png';
          const filename = `obituary_${Date.now()}_${Math.round(Math.random() * 1e6)}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
          image = `/uploads/obituaries/${filename}`;
        } catch (fileErr) {
          console.error('Error saving updated obituary file buffer:', fileErr);
          image = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
        }
      } else if (req.file.path) {
        image = req.file.path;
      }
    }

    if (deceasedName && deceasedName.trim()) {
      obituary.deceasedName = `${prefix || obituary.prefix} ${deceasedName}`.trim();
      obituary.deceasedNameEn = deceasedName;
    }

    obituary.prefix = prefix !== undefined ? prefix : obituary.prefix;
    obituary.age = age !== undefined ? parseInt(age) || 0 : obituary.age;
    obituary.birthDate = birthDate !== undefined ? birthDate : obituary.birthDate;
    obituary.dateOfPassing = dateOfPassing || obituary.dateOfPassing;

    if (parsedCeremonies && Array.isArray(parsedCeremonies) && parsedCeremonies.length > 0) {
      obituary.ceremonies = parsedCeremonies;
      obituary.funeralDetails = {
        type: parsedCeremonies[0].type || obituary.funeralDetails?.type,
        date: parsedCeremonies[0].date || obituary.funeralDetails?.date,
        time: parsedCeremonies[0].time !== undefined ? parsedCeremonies[0].time : obituary.funeralDetails?.time,
        venue: parsedCeremonies[0].venue || obituary.funeralDetails?.venue
      };
    } else if (ritesType || ritesDate || ritesVenue) {
      obituary.funeralDetails = {
        type: ritesType || obituary.funeralDetails?.type,
        date: ritesDate || obituary.funeralDetails?.date,
        time: ritesTime !== undefined ? ritesTime : obituary.funeralDetails?.time,
        venue: ritesVenue || obituary.funeralDetails?.venue
      };
      if (!obituary.ceremonies || obituary.ceremonies.length === 0) {
        obituary.ceremonies = [obituary.funeralDetails];
      }
    }
    
    obituary.message = message || obituary.message;
    obituary.image = image;
    obituary.privacy = privacy || obituary.privacy;
    obituary.familyContact = familyContact !== undefined ? familyContact : obituary.familyContact;
    obituary.relation = relation || obituary.relation;

    if (isLeadOrAdmin && status !== undefined) {
      obituary.status = status;
    }

    const updatedObituary = await obituary.save();
    const populated = await Obituary.findById(updatedObituary._id).populate('creatorId', 'name email avatar initials phone');

    res.json(populated);
  } catch (error) {
    console.error('Error updating obituary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an obituary
// @route   DELETE /api/member/obituaries/:id
// @access  Private
exports.deleteObituary = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);

    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }

    // Verify ownership or community leadership role
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to delete obituaries from other communities' });
    }

    const isCreator = obituary.creatorId.toString() === req.user._id.toString();
    const isLeadOrAdmin = isPrivilegedUser(req);

    if (!isCreator && !isLeadOrAdmin) {
      return res.status(401).json({ message: 'Not authorized to delete this obituary' });
    }

    await Obituary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Obituary post deleted successfully' });
  } catch (error) {
    console.error('Error deleting obituary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Toggle Folded Hands (Haath Jode)
// @route   PUT /api/member/obituaries/:id/haathjode
// @access  Private
exports.toggleHaathJode = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    const index = obituary.haathJodeUsers.indexOf(req.user._id);
    if (index >= 0) {
      // Remove folded hand
      obituary.haathJodeUsers.splice(index, 1);
    } else {
      // Add folded hand
      obituary.haathJodeUsers.push(req.user._id);
    }

    await obituary.save();
    res.json({
      haathJodeCount: obituary.haathJodeUsers.length,
      userHasHaathJode: ! (index >= 0)
    });
  } catch (error) {
    console.error('Error toggling haath jode:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Increment Garland offering count (Mala Arpan)
// @route   PUT /api/member/obituaries/:id/malaarpan
// @access  Private
exports.incrementMalaArpan = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    const index = obituary.malaArpanUsers.findIndex(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (index >= 0) {
      // Toggle off - remove user garland offer
      obituary.malaArpanUsers.splice(index, 1);
    } else {
      // Toggle on - add 1 garland offer
      obituary.malaArpanUsers.push({
        user: req.user._id,
        count: 1
      });
    }

    await obituary.save();

    // Calculate total garland count
    const totalGarlands = obituary.malaArpanUsers.reduce((sum, item) => sum + item.count, 0);

    res.json({
      malaArpanCount: totalGarlands,
      userHasMalaArpan: index < 0
    });
  } catch (error) {
    console.error('Error toggling mala arpan:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Toggle Save Obituary
// @route   PUT /api/member/obituaries/:id/save
// @access  Private
exports.toggleSave = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    const index = obituary.saves.indexOf(req.user._id);
    let isSaved = false;
    if (index >= 0) {
      obituary.saves.splice(index, 1);
    } else {
      obituary.saves.push(req.user._id);
      isSaved = true;
    }

    await obituary.save();
    res.json({
      savesCount: obituary.saves.length,
      isSaved
    });
  } catch (error) {
    console.error('Error toggling save:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Increment Views
// @route   PUT /api/member/obituaries/:id/view
// @access  Private
exports.incrementViews = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    if (!obituary.viewedUsers) {
      obituary.viewedUsers = [];
    }

    const userIdStr = req.user._id.toString();
    const alreadyViewed = obituary.viewedUsers.some(id => id.toString() === userIdStr);

    if (!alreadyViewed) {
      obituary.viewedUsers.push(req.user._id);
      obituary.views = obituary.viewedUsers.length;
      await obituary.save();
    } else {
      obituary.views = obituary.viewedUsers.length;
    }

    res.json({ views: obituary.views });
  } catch (error) {
    console.error('Error incrementing views:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add Condolence Comment
// @route   POST /api/member/obituaries/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    // Generate initials
    const name = req.user.name || 'Anonymous';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const newComment = {
      user: req.user._id,
      name,
      initials,
      text: text.trim(),
      likes: [],
      timestamp: new Date()
    };

    obituary.comments.push(newComment);
    await obituary.save();

    res.status(201).json(obituary.comments);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Toggle Comment Like
// @route   PUT /api/member/obituaries/:id/comments/:commentId/like
// @access  Private
exports.toggleCommentLike = async (req, res) => {
  try {
    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to interact with obituaries from other communities' });
    }

    const comment = obituary.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const index = comment.likes.indexOf(req.user._id);
    let isLiked = false;
    if (index >= 0) {
      comment.likes.splice(index, 1);
    } else {
      comment.likes.push(req.user._id);
      isLiked = true;
    }

    await obituary.save();
    res.json(obituary.comments);
  } catch (error) {
    console.error('Error toggling comment like:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update Obituary status (Approve/Reject)
// @route   PUT /api/member/obituaries/:id/status
// @access  Private (Head/Admin only)
exports.updateObituaryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const obituary = await Obituary.findById(req.params.id);
    if (!obituary) {
      return res.status(404).json({ message: 'Obituary not found' });
    }

    // Community security check using standardized helper
    if (!isSameCommunity(obituary, req)) {
      return res.status(403).json({ message: 'Unauthorized to manage obituaries from other communities' });
    }

    // Verify user is head/admin
    if (!isPrivilegedUser(req)) {
      return res.status(403).json({ message: 'Only Samaj Head or Admin can update moderation status' });
    }

    obituary.status = status;
    const saved = await obituary.save();
    const populated = await Obituary.findById(saved._id).populate('creatorId', 'name email avatar initials phone');
    
    res.json(populated);
  } catch (error) {
    console.error('Error updating obituary status:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
