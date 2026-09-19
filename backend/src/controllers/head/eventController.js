const mongoose = require('mongoose');
const Event = require('../../models/Event');
const EventResponse = require('../../models/EventResponse');
const EventActivityLog = require('../../models/EventActivityLog');
const Community = require('../../models/Community');
const User = require('../../models/User');
const { notifyEventCreated, notifyEventCancelled, notifyEventDeleted } = require('../../services/notificationService');

const getEventCommunityId = async (req) => {
  let communityId = req.communityId || req.user?.communityId;
  if (communityId && mongoose.Types.ObjectId.isValid(communityId)) return communityId;

  if (req.user?.role === 'head' && req.user.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
    return req.user.assignedCommunityIds[0];
  }

  if (req.user?.community) {
    const comm = await Community.findOne({ name: req.user.community });
    if (comm) return comm._id;
  }

  return null;
};

const getHeadCommunityFilter = (req) => {
  if (req.user?.role === 'head' && req.user.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
    return { communityId: { $in: req.user.assignedCommunityIds } };
  }
  const commId = req.communityId || req.user?.communityId;
  if (commId && mongoose.Types.ObjectId.isValid(commId)) {
    return { communityId: commId };
  }
  return { communityId: new mongoose.Types.ObjectId('000000000000000000000000') };
};

const hasHeadEventAccess = (req, eventCommunityId, eventVisibility) => {
  if (eventVisibility === 'GLOBAL' || !eventCommunityId) return true;
  if (req.user?.role === 'head' && req.user.assignedCommunityIds && req.user.assignedCommunityIds.length > 0) {
    return req.user.assignedCommunityIds.some(id => id.toString() === eventCommunityId.toString());
  }
  const commId = req.communityId || req.user?.communityId;
  if (commId) {
    return eventCommunityId.toString() === commId.toString();
  }
  return true;
};

const attachEventStats = async (events) => {
  if (!events || events.length === 0) return [];
  const eventIds = events.map(e => e._id);

  const stats = await EventResponse.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: '$eventId',
        interestedCount: {
          $sum: { $cond: [{ $or: [{ $eq: ['$isInterested', true] }, { $eq: ['$response', 'Interested'] }] }, 1, 0] }
        },
        goingCount: {
          $sum: { $cond: [{ $or: [{ $eq: ['$isGoing', true] }, { $eq: ['$registered', true] }, { $eq: ['$response', 'Going'] }] }, 1, 0] }
        },
        notGoingCount: {
          $sum: { $cond: [{ $eq: ['$response', 'Not Going'] }, 1, 0] }
        },
        registeredCount: {
          $sum: { $cond: [{ $or: [{ $eq: ['$registered', true] }, { $eq: ['$isGoing', true] }] }, 1, 0] }
        }
      }
    }
  ]);

  const statsMap = {};
  stats.forEach(s => {
    statsMap[s._id.toString()] = s;
  });

  return events.map(e => {
    const s = statsMap[e._id.toString()] || {};
    return {
      ...e,
      interestedCount: s.interestedCount || 0,
      goingCount: s.goingCount || 0,
      notGoingCount: s.notGoingCount || 0,
      registeredCount: s.registeredCount || 0
    };
  });
};

// @desc    Get head events for their community
// @route   GET /api/v1/head/events
// @access  Head
exports.getHeadEvents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      category = 'all', 
      status = 'all'
    } = req.query;

    const commFilter = getHeadCommunityFilter(req);
    const query = { ...commFilter, isDeleted: { $ne: true } };

    if (search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleEn: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } }
      ];
    }

    if (category !== 'all') {
      query.category = category;
    }

    if (status !== 'all') {
      query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Event.countDocuments(query);
    const rawEvents = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const events = await attachEventStats(rawEvents);

    res.status(200).json({
      status: 'success',
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: events
    });
  } catch (error) {
    console.error('Get Head Events Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch events' });
  }
};

// @desc    Create new community event
// @route   POST /api/v1/head/events
// @access  Head
exports.createEvent = async (req, res) => {
  try {
    const communityId = await getEventCommunityId(req);
    if (!communityId) {
      return res.status(400).json({ status: 'fail', message: 'No community associated with this account.' });
    }

    const {
      title,
      subtitle,
      titleEn,
      category,
      categoryEn,
      description,
      descriptionEn,
      bannerImage,
      thumbnailImage,
      image,
      venue,
      venueEn,
      address,
      city,
      cityId,
      locationScope,
      isAllLocations,
      startDate,
      endDate,
      startTime,
      endTime,
      time,
      timeEn,
      entryFee,
      contact,
      capacity,
      registrationRequired,
      objectiveEn,
      programsEn,
      audienceEn,
      importantInfoEn,
      tagsEn,
      tags,
      isFeatured,
      status
    } = req.body;

    let parsedDate = {
      date: 'TBA',
      day: '01',
      month: 'Month',
      monthShort: 'MON',
      weekday: 'Day'
    };
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        const daysHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
        const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
        const monthsShortHi = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'];
        parsedDate = {
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          day: String(d.getDate()).padStart(2, '0'),
          month: monthsHi[d.getMonth()],
          monthShort: monthsShortHi[d.getMonth()],
          weekday: daysHi[d.getDay()]
        };
      }
    }

    const isAllLoc = locationScope === 'ALL' || isAllLocations === true || !city || city === 'All Locations' || city === 'all' || city === 'All';
    const finalLocationScope = isAllLoc ? 'ALL' : 'SPECIFIC';
    const finalCity = isAllLoc ? 'All Locations' : (city ? String(city).trim() : 'All Locations');
    const validCityId = (!isAllLoc && cityId && mongoose.Types.ObjectId.isValid(cityId)) ? cityId : undefined;
    const userId = req.user?._id || req.user?.id;

    const event = new Event({
      title,
      titleEn: titleEn || subtitle,
      date: parsedDate.date,
      day: parsedDate.day,
      month: parsedDate.month,
      monthShort: parsedDate.monthShort,
      weekday: parsedDate.weekday,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      startTime: startTime || 'TBA',
      endTime: endTime || 'TBA',
      time: time || startTime || 'TBA',
      timeEn: timeEn || startTime || 'TBA',
      venue: venue || address || 'TBA',
      venueEn: venueEn || address || 'TBA',
      address,
      city: finalCity,
      cityId: validCityId,
      locationScope: finalLocationScope,
      isAllLocations: isAllLoc,
      description,
      descriptionEn: descriptionEn || description,
      category: category || 'Cultural',
      categoryEn: categoryEn || category || 'Cultural',
      image: image || bannerImage || thumbnailImage,
      capacity: capacity ? parseInt(capacity) : 0,
      registrationRequired: !!registrationRequired,
      isFeatured: !!isFeatured,
      visibility: 'COMMUNITY',
      isGlobal: false,
      communityId,
      status: status || 'Published',
      createdByRole: 'COMMUNITY_HEAD',
      createdBy: userId,
      entryFee: entryFee || 'Free',
      contact: contact || req.user?.phone || 'N/A',
      organizer: {
        name: req.user?.name || 'Community Head',
        role: 'Community Head',
        avatar: req.user?.avatar,
        initials: req.user?.name ? req.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CH'
      },
      objectiveEn,
      programsEn: Array.isArray(programsEn) ? programsEn : (programsEn ? [programsEn] : []),
      audienceEn,
      importantInfoEn,
      tagsEn: Array.isArray(tagsEn) ? tagsEn : (tags ? tags.split(',').map(t => t.trim()) : [])
    });

    await event.save();

    try {
      await EventActivityLog.create({
        actor: { id: userId, name: req.user?.name || 'Community Head', role: 'head' },
        action: 'Create',
        event: { id: event._id, title: event.title },
        community: { id: event.communityId },
        description: `Community Head ${req.user?.name || ''} created event "${event.title}"`
      });
    } catch (logErr) {
      console.warn('Log warning:', logErr.message);
    }

    try {
      const memberIds = await User.find({ communityId: event.communityId, accountStatus: { $ne: 'blocked' } }).distinct('_id');
      await notifyEventCreated(memberIds, event.title, event._id);
    } catch (notifyErr) {
      console.warn('[Notify] notifyEventCreated failed:', notifyErr.message);
    }

    res.status(201).json({
      status: 'success',
      data: event
    });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create event' });
  }
};

// @desc    Update event details
// @route   PUT /api/v1/head/events/:eventId
// @access  Head
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId });
    if (!event || event.isDeleted) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    if (!hasHeadEventAccess(req, event.communityId)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    const updates = req.body;
    updates.updatedBy = req.user?._id || req.user?.id;

    if (updates.locationScope !== undefined || updates.isAllLocations !== undefined || updates.city !== undefined) {
      const isAllLoc = updates.locationScope === 'ALL' || updates.isAllLocations === true || !updates.city || updates.city === 'All Locations' || updates.city === 'all' || updates.city === 'All';
      updates.locationScope = isAllLoc ? 'ALL' : 'SPECIFIC';
      updates.isAllLocations = isAllLoc;
      updates.city = isAllLoc ? 'All Locations' : (updates.city ? String(updates.city).trim() : 'All Locations');
      if (isAllLoc) {
        updates.cityId = undefined;
      } else if (updates.cityId && !mongoose.Types.ObjectId.isValid(updates.cityId)) {
        updates.cityId = undefined;
      }
    } else if (updates.cityId && !mongoose.Types.ObjectId.isValid(updates.cityId)) {
      updates.cityId = undefined;
    }

    if (updates.startDate) {
      const d = new Date(updates.startDate);
      if (!isNaN(d.getTime())) {
        const daysHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
        const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
        const monthsShortHi = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'];
        updates.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        updates.day = String(d.getDate()).padStart(2, '0');
        updates.month = monthsHi[d.getMonth()];
        updates.monthShort = monthsShortHi[d.getMonth()];
        updates.weekday = daysHi[d.getDay()];
      }
    }

    if (updates.bannerImage || updates.thumbnailImage) {
      updates.image = updates.bannerImage || updates.thumbnailImage;
    }

    Object.assign(event, updates);
    await event.save();

    try {
      await EventActivityLog.create({
        actor: { id: req.user?._id || req.user?.id, name: req.user?.name || 'Community Head', role: 'head' },
        action: 'Update',
        event: { id: event._id, title: event.title },
        community: { id: event.communityId },
        description: `Community Head ${req.user?.name || ''} updated event "${event.title}"`
      });
    } catch (logErr) {
      console.warn('Log warning:', logErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: event
    });
  } catch (error) {
    console.error('Update Event Error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to update event' });
  }
};

// @desc    Soft-delete event
// @route   DELETE /api/v1/head/events/:eventId
// @access  Head
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId });
    if (!event || event.isDeleted) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    if (!hasHeadEventAccess(req, event.communityId)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    const userId = req.user?._id || req.user?.id;
    event.isDeleted = true;
    event.status = 'Deleted';
    event.deletedBy = userId;
    event.deletedAt = new Date();
    await event.save();

    try {
      await EventActivityLog.create({
        actor: { id: userId, name: req.user?.name || 'Community Head', role: 'head' },
        action: 'Delete',
        event: { id: event._id, title: event.title },
        community: { id: event.communityId },
        description: `Community Head ${req.user?.name || ''} deleted event "${event.title}"`
      });
    } catch (logErr) {
      console.warn('Log warning:', logErr.message);
    }

    try {
      const respondedMemberIds = await EventResponse.find({
        eventId: event._id,
        $or: [{ response: { $in: ['Going', 'Interested'] } }, { isGoing: true }, { isInterested: true }]
      }).distinct('memberId');
      await notifyEventDeleted(respondedMemberIds, event.title, event._id);
    } catch (notifyErr) {
      console.warn('[Notify] notifyEventDeleted failed:', notifyErr.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete event' });
  }
};

// @desc    Cancel event
// @route   PATCH /api/v1/head/events/:eventId/cancel
// @access  Head
exports.cancelEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
    if (!event) {
      return res.status(404).json({ status: 'fail', message: 'Event not found' });
    }

    if (!hasHeadEventAccess(req, event.communityId)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    const userId = req.user?._id || req.user?.id;
    event.status = 'Cancelled';
    event.cancelledBy = userId;
    event.cancelledAt = new Date();
    await event.save();

    try {
      const respondedMemberIds = await EventResponse.find({
        eventId: event._id,
        $or: [{ response: { $in: ['Going', 'Interested'] } }, { isGoing: true }, { isInterested: true }]
      }).distinct('memberId');
      await notifyEventCancelled(respondedMemberIds, event.title, event._id);
    } catch (notifyErr) {
      console.warn('[Notify] notifyEventCancelled failed:', notifyErr.message);
    }

    res.status(200).json({ status: 'success', data: event });
  } catch (error) {
    console.error('Head Cancel Event Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cancel event' });
  }
};

// @desc    Get member responses for a community event
// @route   GET /api/v1/head/events/:eventId/responses
// @access  Head
exports.getMemberResponses = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } }).lean();
    if (!event) {
      return res.status(404).json({ status: 'fail', message: 'Event not found' });
    }

    if (!hasHeadEventAccess(req, event.communityId, event.visibility)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    const queryIds = [event._id];
    if (mongoose.Types.ObjectId.isValid(eventId)) queryIds.push(new mongoose.Types.ObjectId(eventId));
    if (typeof eventId === 'string' && !queryIds.some(id => id.toString() === eventId)) queryIds.push(eventId);

    const responses = await EventResponse.find({ eventId: { $in: queryIds } })
      .populate({
        path: 'memberId',
        select: 'name email phone avatar gotra communityId city',
        populate: [
          { path: 'communityId', select: 'name' },
          { path: 'city', select: 'name' }
        ]
      })
      .sort({ updatedAt: -1 })
      .lean();

    const memberResponses = responses.map(r => {
      const u = r.memberId || {};
      const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M';

      let resStatus = r.response || 'None';
      if (r.isGoing || r.registered || r.response === 'Going') {
        resStatus = 'Going';
      } else if (r.isInterested || r.response === 'Interested') {
        resStatus = 'Interested';
      } else if (r.response === 'Not Going') {
        resStatus = 'Not Going';
      }

      return {
        id: r._id,
        memberId: u._id,
        name: u.name || 'Member',
        email: u.email || 'N/A',
        phone: u.phone || 'N/A',
        avatar: u.avatar || null,
        initials,
        gotra: u.gotra || 'N/A',
        communityName: u.communityId?.name || 'N/A',
        cityName: u.city?.name || 'N/A',
        response: resStatus,
        isInterested: !!(r.isInterested || r.response === 'Interested'),
        isGoing: !!(r.isGoing || r.registered || r.response === 'Going'),
        registered: !!r.registered,
        registeredAt: r.registeredAt,
        responseTime: r.updatedAt || r.respondedAt
      };
    });

    const interestedCount = memberResponses.filter(r => r.isInterested).length;
    const goingCount = memberResponses.filter(r => r.isGoing).length;
    const notGoingCount = memberResponses.filter(r => r.response === 'Not Going').length;

    const eventDetails = {
      ...event,
      interestedCount,
      goingCount,
      notGoingCount,
      memberResponses
    };

    res.status(200).json({ status: 'success', data: memberResponses, eventDetails });
  } catch (error) {
    console.error('Get Member Responses Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch member responses' });
  }
};

// @desc    Get real analytics aggregated for Head's community events
// @route   GET /api/v1/head/events/analytics
// @access  Head
exports.getAnalytics = async (req, res) => {
  try {
    const commFilter = getHeadCommunityFilter(req);
    const query = { ...commFilter, isDeleted: { $ne: true } };

    const events = await Event.find(query).lean();
    const eventIds = events.map(e => e._id);

    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => e.status === 'Upcoming' || e.status === 'Published').length;
    const ongoingEvents = events.filter(e => e.status === 'Ongoing').length;
    const completedEvents = events.filter(e => e.status === 'Completed').length;
    const cancelledEvents = events.filter(e => e.status === 'Cancelled').length;

    const responseAgg = await EventResponse.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: null,
          totalInterested: {
            $sum: { $cond: [{ $or: [{ $eq: ['$isInterested', true] }, { $eq: ['$response', 'Interested'] }] }, 1, 0] }
          },
          totalGoing: {
            $sum: { $cond: [{ $or: [{ $eq: ['$isGoing', true] }, { $eq: ['$registered', true] }, { $eq: ['$response', 'Going'] }] }, 1, 0] }
          },
          totalRegistrations: {
            $sum: { $cond: [{ $or: [{ $eq: ['$registered', true] }, { $eq: ['$isGoing', true] }] }, 1, 0] }
          }
        }
      }
    ]);

    const totals = responseAgg[0] || { totalInterested: 0, totalGoing: 0, totalRegistrations: 0 };

    res.status(200).json({
      status: 'success',
      data: {
        totalEvents,
        upcomingEvents,
        ongoingEvents,
        completedEvents,
        cancelledEvents,
        totalInterested: totals.totalInterested,
        totalGoing: totals.totalGoing,
        totalRegistrations: totals.totalRegistrations
      }
    });
  } catch (error) {
    console.error('Get Head Analytics Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch analytics data' });
  }
};

// @desc    Add photo to event gallery
// @route   POST /api/v1/head/events/:eventId/gallery
// @access  Head
exports.addEventGalleryPhoto = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { url, caption } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ status: 'fail', message: 'Photo URL is required.' });
    }

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
    if (!event) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    if (!hasHeadEventAccess(req, event.communityId)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    const photoObj = {
      url,
      caption: caption || '',
      uploadedAt: new Date(),
      uploadedBy: req.user?._id || req.user?.id
    };

    event.gallery = event.gallery || [];
    event.gallery.push(photoObj);
    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Photo added to event gallery.',
      data: event.gallery
    });
  } catch (error) {
    console.error('Add Event Gallery Photo Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add photo to event gallery' });
  }
};

// @desc    Remove photo from event gallery
// @route   DELETE /api/v1/head/events/:eventId/gallery/:photoId
// @access  Head
exports.removeEventGalleryPhoto = async (req, res) => {
  try {
    const { eventId, photoId } = req.params;

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
    if (!event) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    if (!hasHeadEventAccess(req, event.communityId)) {
      return res.status(404).json({ status: 'fail', message: 'Event not found.' });
    }

    event.gallery = (event.gallery || []).filter(p => p._id.toString() !== photoId && p.url !== photoId);
    await event.save();

    res.status(200).json({
      status: 'success',
      message: 'Photo removed from event gallery.',
      data: event.gallery
    });
  } catch (error) {
    console.error('Remove Event Gallery Photo Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove photo from event gallery' });
  }
};
