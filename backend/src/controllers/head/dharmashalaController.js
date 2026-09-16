const Dharmashala = require('../../models/Dharmashala');
const DharmashalaRoom = require('../../models/DharmashalaRoom');
const DharmashalaBooking = require('../../models/DharmashalaBooking');
const DharmashalaMaintenance = require('../../models/DharmashalaMaintenance');
const { notifyBookingStatusChanged, createBroadcastNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter, inheritTenantPayload } = require('../../utils/queryScopeHelper');

// 1. Dashboard Analytics Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const communityFilter = applyScopeFilter(req, {});
    
    // Find all Dharmashalas in community
    const properties = await Dharmashala.find(communityFilter);
    const propertyIds = properties.map(p => p._id);
    
    const totalDharmashalas = properties.length;
    const activeDharmashalas = properties.filter(p => p.status === 'Active').length;
    
    // Room Inventory Stats
    const rooms = await DharmashalaRoom.find({ dharmashala: { $in: propertyIds } });
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    const occupiedRooms = rooms.filter(r => r.status === 'Booked' || r.status === 'Occupied').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'Maintenance').length;
    const blockedRooms = rooms.filter(r => r.status === 'Blocked').length;
    
    // Booking count stats
    const bookings = await DharmashalaBooking.find({ dharmashala: { $in: propertyIds } });
    
    const pendingRequests = bookings.filter(b => b.status === 'pending_approval').length;
    const confirmedBookings = bookings.filter(b => b.status === 'approved' || b.status === 'upcoming').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    
    // Today check-ins/outs
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    
    const todayCheckIns = bookings.filter(b => 
      b.checkIn >= todayStart && b.checkIn <= todayEnd && 
      ['approved', 'pending_approval', 'checked_in'].includes(b.status)
    ).length;
    
    const todayCheckOuts = bookings.filter(b => 
      b.checkOut >= todayStart && b.checkOut <= todayEnd && 
      ['checked_in', 'checked_out', 'completed'].includes(b.status)
    ).length;
    
    const currentGuests = bookings.filter(b => b.status === 'checked_in').length;
    
    const upcomingCheckIns = bookings.filter(b => b.checkIn > todayEnd && b.status === 'approved').length;
    
    // Occupancy Rate
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    
    // Revenue calculations (current month)
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyBookings = bookings.filter(b => b.createdAt >= currentMonthStart);
    const monthlyRevenue = monthlyBookings
      .filter(b => b.paymentStatus === 'Paid' || ['checked_in', 'checked_out', 'completed'].includes(b.status))
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
    // Find most booked property
    const bookingCounts = {};
    bookings.forEach(b => {
      bookingCounts[b.dharmashala.toString()] = (bookingCounts[b.dharmashala.toString()] || 0) + 1;
    });
    let mostBookedId = null;
    let maxCount = 0;
    Object.keys(bookingCounts).forEach(id => {
      if (bookingCounts[id] > maxCount) {
        maxCount = bookingCounts[id];
        mostBookedId = id;
      }
    });
    const mostBookedProp = mostBookedId ? properties.find(p => p._id.toString() === mostBookedId) : null;
    const mostBookedDharmashala = mostBookedProp ? mostBookedProp.name : 'N/A';

    res.status(200).json({
      status: 'success',
      data: {
        totalDharmashalas,
        activeDharmashalas,
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        blockedRooms,
        pendingRequests,
        confirmedBookings,
        cancelledBookings,
        todayCheckIns,
        todayCheckOuts,
        currentGuests,
        upcomingCheckIns,
        occupancyRate,
        monthlyRevenue,
        mostBookedDharmashala
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. CRUD Properties
exports.getProperties = async (req, res) => {
  try {
    const communityFilter = applyScopeFilter(req, {});
    const properties = await Dharmashala.find(communityFilter).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: properties });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getFilePath = (file) => {
  if (!file) return null;
  if (file.path) return file.path;
  if (file.buffer) return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  return null;
};

exports.createProperty = async (req, res) => {
  try {
    const payload = inheritTenantPayload(req, req.body);
    if (!payload.communityId) {
      return res.status(400).json({ status: 'error', message: 'Community context missing for property creation' });
    }
    
    // Parse amenities list if passed as stringified JSON array
    let amenities = payload.amenities;
    if (typeof amenities === 'string') {
      try { amenities = JSON.parse(amenities); } catch (e) { amenities = []; }
    }
    
    // Retrieve cover photo and galleries files
    let image = payload.image || '';
    let galleryImages = [];
    
    if (payload.galleryImages) {
      if (typeof payload.galleryImages === 'string') {
        try { galleryImages = JSON.parse(payload.galleryImages); } catch (e) { galleryImages = [payload.galleryImages]; }
      } else if (Array.isArray(payload.galleryImages)) {
        galleryImages = payload.galleryImages;
      }
    }
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const uploadedPath = getFilePath(req.files.image[0]);
        if (uploadedPath) image = uploadedPath;
      }
      if (req.files.galleryImages) {
        const newUploaded = req.files.galleryImages.map(file => getFilePath(file)).filter(Boolean);
        galleryImages = [...galleryImages, ...newUploaded];
      }
    }

    const property = new Dharmashala({
      ...payload,
      community: req.user?.community || payload.community || 'General',
      amenities,
      image,
      galleryImages,
      status: payload.status || 'Active'
    });
    
    await property.save();

    // ── Broadcast notification to members about new Dharmashala ─────────────────────
    try {
      if (property.communityId) {
        createBroadcastNotification({
          communityId: property.communityId,
          module: 'dharmashala',
          type: 'dharmashala_created',
          title: 'New Dharmashala Added 🏠',
          message: `New property "${property.name}" in ${property.city || 'community'} is now open for booking.`,
          icon: '🏠',
          priority: 'high',
          actionUrl: `/member/dharmashala`,
          referenceId: property._id,
          referenceType: 'Dharmashala'
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] createProperty notification failed:', notifErr.message);
    }

    res.status(201).json({ status: 'success', data: property });
  } catch (error) {
    console.error('dharmashala createProperty error:', error);
    res.status(400).json({ status: 'error', message: error.message || 'Validation error while saving property.' });
  }
};

exports.updateProperty = async (req, res) => {
  try {
    const existingProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: req.params.id }));
    if (!existingProp) return res.status(404).json({ status: 'error', message: 'Property not found' });

    const updateData = { ...req.body };
    
    if (typeof updateData.amenities === 'string') {
      try { updateData.amenities = JSON.parse(updateData.amenities); } catch (e) { updateData.amenities = []; }
    }

    let existingGallery = [];
    if (updateData.galleryImages) {
      if (typeof updateData.galleryImages === 'string') {
        try { existingGallery = JSON.parse(updateData.galleryImages); } catch (e) { existingGallery = [updateData.galleryImages]; }
      } else if (Array.isArray(updateData.galleryImages)) {
        existingGallery = updateData.galleryImages;
      }
    }
    
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const uploadedPath = getFilePath(req.files.image[0]);
        if (uploadedPath) updateData.image = uploadedPath;
      }
      if (req.files.galleryImages) {
        const newUploaded = req.files.galleryImages.map(file => getFilePath(file)).filter(Boolean);
        updateData.galleryImages = [...existingGallery, ...newUploaded];
      }
    }
    
    const property = await Dharmashala.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!property) return res.status(404).json({ status: 'error', message: 'Property not found' });
    
    // ── Broadcast notification to members about Dharmashala update ─────────────────────
    try {
      if (property.communityId) {
        createBroadcastNotification({
          communityId: property.communityId,
          module: 'dharmashala',
          type: 'dharmashala_updated',
          title: 'Dharmashala Updated 🏠',
          message: `Details and room availability for "${property.name}" have been updated.`,
          icon: '🏠',
          priority: 'normal',
          actionUrl: `/member/dharmashala`,
          referenceId: property._id,
          referenceType: 'Dharmashala'
        });
      }
    } catch (notifErr) {
      console.warn('[Notify] updateProperty notification failed:', notifErr.message);
    }

    res.status(200).json({ status: 'success', data: property });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteProperty = async (req, res) => {
  try {
    const existingProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: req.params.id }));
    if (!existingProp) return res.status(404).json({ status: 'error', message: 'Property not found' });

    const property = await Dharmashala.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ status: 'error', message: 'Property not found' });
    
    // Cascade delete rooms and bookings
    await DharmashalaRoom.deleteMany({ dharmashala: req.params.id });
    await DharmashalaBooking.deleteMany({ dharmashala: req.params.id });
    
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. CRUD Rooms
exports.getDharmashalaRooms = async (req, res) => {
  try {
    const property = await Dharmashala.findOne(applyScopeFilter(req, { _id: req.params.id }));
    if (!property) return res.status(404).json({ status: 'error', message: 'Property not found or unauthorized' });

    const rooms = await DharmashalaRoom.find({ dharmashala: req.params.id });
    res.status(200).json({ status: 'success', data: rooms });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { dharmashala } = req.body;
    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: dharmashala }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Target property not found or unauthorized' });
    
    // Handle image file arrays
    let images = [];
    if (req.files && req.files.images) {
      images = req.files.images.map(file => file.path);
    }
    
    const room = new DharmashalaRoom({
      ...req.body,
      images
    });
    
    await room.save();
    
    // Update property counts
    const dharamshalaDoc = await Dharmashala.findById(dharmashala);
    if (dharamshalaDoc) {
      dharamshalaDoc.totalRooms += 1;
      if (room.isAc) dharamshalaDoc.acRooms += 1;
      else dharamshalaDoc.generalRooms += 1;
      await dharamshalaDoc.save();
    }
    
    res.status(201).json({ status: 'success', data: room });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const oldRoom = await DharmashalaRoom.findById(req.params.roomId);
    if (!oldRoom) return res.status(404).json({ status: 'error', message: 'Room not found' });

    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: oldRoom.dharmashala }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Target property not found or unauthorized' });
    
    const updateData = { ...req.body };
    if (req.files && req.files.images) {
      updateData.images = req.files.images.map(file => file.path);
    }
    
    const room = await DharmashalaRoom.findByIdAndUpdate(req.params.roomId, updateData, { new: true });
    
    // Adjust total/ac counts if categories changed
    if (oldRoom.isAc !== room.isAc) {
      const dhDoc = await Dharmashala.findById(room.dharmashala);
      if (dhDoc) {
        if (room.isAc) {
          dhDoc.acRooms += 1;
          dhDoc.generalRooms -= 1;
        } else {
          dhDoc.acRooms -= 1;
          dhDoc.generalRooms += 1;
        }
        await dhDoc.save();
      }
    }
    
    res.status(200).json({ status: 'success', data: room });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await DharmashalaRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ status: 'error', message: 'Room not found' });

    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: room.dharmashala }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Target property not found or unauthorized' });

    await DharmashalaRoom.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ status: 'error', message: 'Room not found' });
    
    // Adjust counts
    const dhDoc = await Dharmashala.findById(room.dharmashala);
    if (dhDoc) {
      dhDoc.totalRooms -= 1;
      if (room.isAc) dhDoc.acRooms -= 1;
      else dhDoc.generalRooms -= 1;
      await dhDoc.save();
    }
    
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Bookings Management
exports.getAllBookings = async (req, res) => {
  try {
    const communityFilter = applyScopeFilter(req, {});
    const properties = await Dharmashala.find(communityFilter);
    const propertyIds = properties.map(p => p._id);
    
    const { propertyId, status, search, checkInDate, checkOutDate } = req.query;
    
    let filter = { dharmashala: { $in: propertyIds } };
    
    if (propertyId && propertyId !== 'all') {
      filter.dharmashala = propertyId;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { bookedBy: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { bookingId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (checkInDate) {
      filter.checkIn = { $gte: new Date(checkInDate) };
    }
    
    if (checkOutDate) {
      filter.checkOut = { $lte: new Date(checkOutDate) };
    }
    
    const bookings = await DharmashalaBooking.find(filter)
      .populate('dharmashala')
      .populate('user', 'name phone email avatar communityId')
      .populate('rooms')
      .sort({ createdAt: -1 });
      
    res.status(200).json({ status: 'success', data: bookings });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rooms, remarks, paymentStatus } = req.body;
    
    const booking = await DharmashalaBooking.findById(id).populate('dharmashala');
    if (!booking) return res.status(404).json({ status: 'error', message: 'Booking request not found.' });

    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: booking.dharmashala?._id || booking.dharmashala }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Booking request not found or unauthorized.' });
    
    const oldStatus = booking.status;
    const terminalStatuses = ['completed', 'cancelled', 'rejected', 'expired'];
    if (terminalStatuses.includes(oldStatus) && status === 'pending_approval') {
      return res.status(400).json({ status: 'error', message: `Cannot transition booking from terminal status "${oldStatus}" back to pending_approval.` });
    }

    // Re-verify real-time availability upon approval
    if (status === 'approved') {
      const activeStatuses = ['approved', 'reserved', 'payment_pending', 'paid', 'confirmed', 'upcoming', 'checked_in'];
      const conflictingBookings = await DharmashalaBooking.find({
        _id: { $ne: booking._id },
        dharmashala: booking.dharmashala._id || booking.dharmashala,
        status: { $in: activeStatuses },
        checkIn: { $lt: booking.checkOut },
        checkOut: { $gt: booking.checkIn }
      });

      const conflictRoomIds = new Set();
      conflictingBookings.forEach(cb => (cb.rooms || []).forEach(rId => conflictRoomIds.add(rId.toString())));
      
      const targetRooms = (rooms && rooms.length > 0) ? rooms : (booking.rooms || []);
      const isOverlapped = targetRooms.some(rId => conflictRoomIds.has(rId.toString()));
      if (isOverlapped) {
        return res.status(400).json({
          status: 'error',
          message: 'Double booking conflict! The selected room is already booked for these dates.'
        });
      }

      booking.reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      booking.approvedBy = req.user?._id;
      booking.approvedByRole = (req.user?.role || 'HEAD').toUpperCase();
      booking.approvedAt = new Date();
      booking.paymentStatus = 'Pending';

      if (req.body.finalAmount !== undefined && req.body.finalAmount !== null) {
        booking.totalAmount = Number(req.body.finalAmount);
      }
      if (req.body.baseAmount !== undefined) booking.baseAmount = Number(req.body.baseAmount);
      if (req.body.additionalCharges !== undefined) booking.additionalCharges = Number(req.body.additionalCharges);
      if (req.body.discount !== undefined) booking.discount = Number(req.body.discount);
      if (req.body.pricingNote !== undefined) booking.pricingNote = req.body.pricingNote;
    } else if (status === 'rejected') {
      booking.rejectedBy = req.user?._id;
      booking.rejectedAt = new Date();
      booking.rejectionReason = remarks || 'Request rejected by Head';
    }
    
    booking.status = status;
    if (remarks) booking.remarks = remarks;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    // Room assignments
    if (rooms && rooms.length > 0) {
      booking.rooms = rooms;
      
      const targetRoomStatus = status === 'checked_in' ? 'Occupied' : 'Booked';
      await DharmashalaRoom.updateMany(
        { _id: { $in: rooms } },
        { status: targetRoomStatus }
      );
    }
    
    // Free rooms if checked out, completed, cancelled or rejected
    if (['checked_out', 'completed', 'cancelled', 'rejected', 'no_show', 'expired'].includes(status) && booking.rooms && booking.rooms.length > 0) {
      await DharmashalaRoom.updateMany(
        { _id: { $in: booking.rooms } },
        { status: 'Available' }
      );
    }
    
    // Append Structured Audit History
    booking.statusHistory.push({
      action: status.toUpperCase(),
      previousStatus: oldStatus,
      newStatus: status,
      status,
      performedBy: req.user?._id,
      performedByRole: (req.user?.role || 'HEAD').toUpperCase(),
      amount: booking.totalAmount,
      notes: remarks || booking.pricingNote || `Status updated to ${status}`,
      updatedAt: new Date(),
      updatedBy: req.user?.name || 'Head'
    });
    
    await booking.save();

    // Socket.io Broadcast for real-time synchronization between Head and Admin
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dharmashala:booking_status_updated', {
          bookingId: booking._id,
          status,
          reservedUntil: booking.reservedUntil,
          updatedByRole: 'HEAD'
        });
      }
    } catch (sErr) {}
    
    // Notify Member on Status Change
    try {
      const dName = parentProp.name || 'Dharmashala';
      if (booking.user && oldStatus !== status) {
        const notifObj = await notifyBookingStatusChanged(booking.user, status, dName, booking._id, {
          amount: booking.totalAmount,
          reason: booking.rejectionReason
        });

        if (notifObj && ['approved', 'rejected'].includes(status)) {
          sendPushNotification({
            userId: booking.user,
            notificationId: notifObj._id,
            type: status === 'approved' ? 'booking_approved' : 'booking_rejected',
            title: status === 'approved' ? 'Booking Approved ✅' : 'Booking Declined ❌',
            message: status === 'approved'
              ? `Your booking for "${dName}" has been approved! Please complete payment.`
              : `Your booking for "${dName}" was declined.`,
            actionUrl: '/member/dharmashala/my-bookings'
          }).catch(err => console.error('[DharmashalaPushError]', err.message));
        }
      }
    } catch (notifErr) {
      console.warn('[Notify] updateBookingStatus booking_status_changed warning:', notifErr.message);
    }

    const updatedPopulated = await DharmashalaBooking.findById(booking._id)
      .populate('dharmashala')
      .populate('user', 'name phone email avatar communityId')
      .populate('rooms');

    res.status(200).json({ status: 'success', data: updatedPopulated });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Maintenance Operations
exports.logMaintenance = async (req, res) => {
  try {
    const { dharmashalaId, roomId, startDate, endDate, reason, remarks } = req.body;
    
    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: dharmashalaId }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Property not found or unauthorized' });
    
    const log = new DharmashalaMaintenance({
      dharmashala: dharmashalaId,
      room: roomId || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || 'Cleaning',
      remarks
    });
    
    await log.save();
    
    // Update room status
    if (roomId) {
      await DharmashalaRoom.findByIdAndUpdate(roomId, { status: 'Maintenance' });
    } else {
      // Block entire property rooms
      await DharmashalaRoom.updateMany(
        { dharmashala: dharmashalaId },
        { status: 'Blocked' }
      );
    }
    
    res.status(201).json({ status: 'success', data: log });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

exports.getMaintenanceLogs = async (req, res) => {
  try {
    const parentProp = await Dharmashala.findOne(applyScopeFilter(req, { _id: req.query.dharmashalaId }));
    if (!parentProp) return res.status(404).json({ status: 'error', message: 'Property not found or unauthorized' });

    const logs = await DharmashalaMaintenance.find({ dharmashala: req.query.dharmashalaId })
      .populate('room')
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
