const Event = require('../../models/Event');
const EventResponse = require('../../models/EventResponse');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// Helper to format event for member with user's specific EventResponse state
const formatMemberEvents = async (events, userId) => {
  if (!events || events.length === 0) return [];
  const eventIds = events.map(e => e._id);
  const uIdStr = userId ? userId.toString() : null;

  // Aggregate global response stats for each event
  const stats = await EventResponse.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: '$eventId',
        interestedCount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$isInterested', true] }, { $eq: ['$response', 'Interested'] }] },
              1,
              0
            ]
          }
        },
        goingCount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$isGoing', true] }, { $eq: ['$registered', true] }, { $eq: ['$response', 'Going'] }] },
              1,
              0
            ]
          }
        },
        registeredCount: {
          $sum: { $cond: [{ $eq: ['$registered', true] }, 1, 0] }
        }
      }
    }
  ]);

  const statsMap = {};
  stats.forEach(s => {
    statsMap[s._id.toString()] = s;
  });

  // Fetch current user's responses for these events
  let userResponsesMap = {};
  if (uIdStr) {
    const userResponses = await EventResponse.find({
      eventId: { $in: eventIds },
      memberId: userId
    }).lean();

    userResponses.forEach(ur => {
      userResponsesMap[ur.eventId.toString()] = ur;
    });
  }

  return events.map(event => {
    const s = statsMap[event._id.toString()] || {};
    const ur = userResponsesMap[event._id.toString()] || {};

    const isInterested = !!(ur.isInterested || ur.response === 'Interested');
    const isGoing = !!(ur.isGoing || ur.registered || ur.response === 'Going');
    const isRegistered = !!(ur.registered || ur.isGoing || ur.response === 'Going');
    const isBookmarked = !!ur.bookmarked;
    const isReminderSet = !!ur.reminderEnabled;

    let userResponse = 'None';
    if (isGoing) userResponse = 'Going';
    else if (isInterested) userResponse = 'Interested';

    let daysRemaining = '–';
    const targetDateStr = event.startDate || event.date;
    if (targetDateStr) {
      let targetDate = new Date(targetDateStr);
      if (isNaN(targetDate.getTime()) && typeof targetDateStr === 'string') {
        const parts = targetDateStr.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          targetDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
      if (!isNaN(targetDate.getTime())) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = diffDays < 0 ? 'Ended' : (diffDays === 0 ? 'Today' : diffDays);
      }
    }

    return {
      id: event._id,
      _id: event._id,
      title: event.title,
      titleEn: event.titleEn,
      startDate: event.startDate,
      date: event.date,
      daysRemaining,
      day: event.day,
      month: event.month,
      monthShort: event.monthShort,
      weekday: event.weekday,
      time: event.time,
      timeEn: event.timeEn,
      venue: event.venue,
      venueEn: event.venueEn,
      address: event.address,
      description: event.description,
      descriptionEn: event.descriptionEn,
      category: event.category,
      categoryEn: event.categoryEn || event.category,
      image: event.image,
      isFeatured: event.isFeatured,
      status: event.status,
      entryFee: event.entryFee,
      contact: event.contact,
      communityId: event.communityId,
      visibility: event.visibility,
      createdByRole: event.createdByRole,
      organizer: event.organizer || { name: 'Samaj President', role: 'President', initials: 'SP' },
      objectiveEn: event.objectiveEn,
      programsEn: event.programsEn || [],
      audienceEn: event.audienceEn,
      importantInfoEn: event.importantInfoEn,
      tagsEn: event.tagsEn || [],

      // Dynamic counts from EventResponse collection
      interested: s.interestedCount || 0,
      attendees: s.goingCount || 0,
      goingCount: s.goingCount || 0,
      registeredCount: s.registeredCount || 0,

      // Member specific flags
      userResponse,
      isInterested,
      isGoing,
      isRegistered,
      isBookmarked,
      isReminderSet
    };
  });
};

// Helper to verify if user can access/interact with an event based on visibility and community scope
const canAccessEvent = (event, req) => {
  if (!event || event.isDeleted || ['Draft', 'Deleted', 'Archived'].includes(event.status)) {
    return false;
  }

  // Admin roles retain global access
  const userRole = (req.user?.role || '').toLowerCase();
  if (['admin', 'super_admin', 'master_admin', 'master'].includes(userRole)) {
    return true;
  }

  // GLOBAL events are accessible by any authenticated member
  if (event.visibility === 'GLOBAL' || event.isGlobal) {
    return true;
  }

  // COMMUNITY events require exact communityId match (neither can be missing/falsy)
  const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId)?.toString();
  const eventCommId = event.communityId ? event.communityId.toString() : null;

  if (!userCommId || !eventCommId) {
    return false;
  }

  return userCommId === eventCommId;
};

// @desc    Get member events (GLOBAL Admin events + Member Community events)
// @route   GET /api/v1/member/events
// @access  Member
exports.getEvents = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 20 } = req.query;

    let baseQuery = { 
      isDeleted: { $ne: true },
      status: { $nin: ['Draft', 'Deleted', 'Archived'] }
    };

    // Apply Centralized 2-Level Multi-Tenancy Scope (Community mandatory + City optional with All Locations inclusion)
    const query = applyScopeFilter(req, baseQuery, { cityField: 'city', includeUnassignedCity: true });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formattedEvents = await formatMemberEvents(events, userId);
    const totalCount = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      status: 'success',
      data: formattedEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore: skip + events.length < totalCount
      }
    });
  } catch (error) {
    console.error('Get Member Events Fatal Error:', error);
    res.status(500).json({ 
      success: false, 
      status: 'error', 
      message: 'Failed to fetch events' 
    });
  }
};

const mongoose = require('mongoose');

// @desc    Get single event by ID with dynamic response state
// @route   GET /api/v1/member/events/:eventId
// @access  Member
exports.getEventById = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;

    if (!eventId || eventId === 'undefined' || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, status: 'fail', message: 'Invalid Event ID' });
    }

    const event = await Event.findById(eventId).lean();

    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, status: 'fail', message: 'Event not found or has been removed.' });
    }

    const formattedList = await formatMemberEvents([event], userId);
    const formatted = formattedList[0];

    // Fetch Going/Attending attendees profiles for event details display
    const goingResponses = await EventResponse.find({ 
      eventId, 
      $or: [{ isGoing: true }, { registered: true }, { response: 'Going' }] 
    })
      .populate('memberId', 'name avatar')
      .limit(10)
      .lean();

    const attendeeProfiles = goingResponses.map(r => {
      const u = r.memberId || {};
      const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M';
      return {
        id: u._id,
        name: u.name || 'Member',
        avatar: u.avatar || null,
        initials
      };
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        ...formatted,
        attendeeProfiles
      }
    });
  } catch (error) {
    console.error('Get Event By ID Error:', error);
    res.status(500).json({ success: false, status: 'error', message: 'Failed to fetch event details' });
  }
};

// @desc    React to event
// @route   POST /api/v1/member/events/:eventId/react
// @access  Member
exports.reactToEvent = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;
    const { response } = req.body;

    const event = await Event.findById(eventId);
    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
    }

    const existing = await EventResponse.findOne({ eventId, memberId: userId });
    let isInterested = existing ? existing.isInterested : false;
    let isGoing = existing ? existing.isGoing : false;

    if (response === 'Interested') isInterested = !isInterested;
    if (response === 'Going') isGoing = !isGoing;

    const eventResp = await EventResponse.findOneAndUpdate(
      { eventId, memberId: userId },
      { 
        $set: { 
          isInterested,
          isGoing,
          registered: isGoing,
          response: isGoing ? 'Going' : (isInterested ? 'Interested' : 'None'),
          respondedAt: new Date() 
        } 
      },
      { upsert: true, new: true }
    );

    const counts = await EventResponse.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: null,
          interestedCount: {
            $sum: { $cond: [{ $or: [{ $eq: ['$isInterested', true] }, { $eq: ['$response', 'Interested'] }] }, 1, 0] }
          },
          goingCount: {
            $sum: { $cond: [{ $or: [{ $eq: ['$isGoing', true] }, { $eq: ['$registered', true] }, { $eq: ['$response', 'Going'] }] }, 1, 0] }
          }
        }
      }
    ]);

    const resCounts = counts[0] || { interestedCount: 0, goingCount: 0 };

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isInterested: eventResp.isInterested,
        isRegistered: eventResp.isGoing,
        interestedCount: resCounts.interestedCount,
        goingCount: resCounts.goingCount,
        attendeesCount: resCounts.goingCount
      }
    });
  } catch (error) {
    console.error('React To Event Error:', error);
    res.status(500).json({ success: false, message: 'Failed to record event reaction.' });
  }
};

// Toggle Interested
exports.toggleInterested = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
    }

    const existing = await EventResponse.findOne({ eventId, memberId: userId });
    const isInterested = existing ? !existing.isInterested : true;

    const eventResp = await EventResponse.findOneAndUpdate(
      { eventId, memberId: userId },
      { 
        $set: { 
          isInterested,
          response: existing?.isGoing ? 'Going' : (isInterested ? 'Interested' : 'None'),
          respondedAt: new Date() 
        } 
      },
      { upsert: true, new: true }
    );

    const count = await EventResponse.countDocuments({
      eventId,
      $or: [{ isInterested: true }, { response: 'Interested' }]
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isInterested: eventResp.isInterested,
        interestedCount: count
      }
    });
  } catch (error) {
    console.error('Toggle Interested Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update interest status.' });
  }
};

// Toggle Attend / Join
exports.toggleAttend = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
    }

    const existing = await EventResponse.findOne({ eventId, memberId: userId });
    const isGoing = existing ? !existing.isGoing : true;

    const eventResp = await EventResponse.findOneAndUpdate(
      { eventId, memberId: userId },
      { 
        $set: { 
          isGoing,
          registered: isGoing,
          response: isGoing ? 'Going' : (existing?.isInterested ? 'Interested' : 'None'),
          respondedAt: new Date(),
          registeredAt: isGoing ? new Date() : undefined
        } 
      },
      { upsert: true, new: true }
    );

    const count = await EventResponse.countDocuments({
      eventId,
      $or: [{ isGoing: true }, { registered: true }, { response: 'Going' }]
    });

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isRegistered: eventResp.isGoing,
        attendeesCount: count
      }
    });
  } catch (error) {
    console.error('Toggle Attend Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance status.' });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
    }

    const existing = await EventResponse.findOne({ eventId, memberId: userId });
    const isBookmarked = existing ? !existing.bookmarked : true;

    const eventResp = await EventResponse.findOneAndUpdate(
      { eventId, memberId: userId },
      { $set: { bookmarked: isBookmarked } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isBookmarked: eventResp.bookmarked
      }
    });
  } catch (error) {
    console.error('Toggle Bookmark Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bookmark status.' });
  }
};

exports.toggleReminder = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!canAccessEvent(event, req)) {
      return res.status(404).json({ success: false, message: 'Event not found or unavailable.' });
    }

    const existing = await EventResponse.findOne({ eventId, memberId: userId });
    const reminderEnabled = existing ? !existing.reminderEnabled : true;

    const eventResp = await EventResponse.findOneAndUpdate(
      { eventId, memberId: userId },
      { $set: { reminderEnabled } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      status: 'success',
      data: {
        isReminderSet: eventResp.reminderEnabled
      }
    });
  } catch (error) {
    console.error('Toggle Reminder Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update reminder status.' });
  }
};
