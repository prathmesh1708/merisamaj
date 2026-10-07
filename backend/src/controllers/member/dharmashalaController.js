const Dharmashala = require('../../models/Dharmashala');
const DharmashalaRoom = require('../../models/DharmashalaRoom');
const DharmashalaBooking = require('../../models/DharmashalaBooking');
const DharmashalaMaintenance = require('../../models/DharmashalaMaintenance');
const { createNotification } = require('../../services/notificationService');
const { sendPushNotification } = require('../../services/pushNotificationService');
const { applyScopeFilter } = require('../../utils/queryScopeHelper');

// Get all Dharmashalas (List with filters: Community mandatory + City optional)
exports.getAllDharmashalas = async (req, res) => {
  try {
    const { search, city, ac, food, page, limit } = req.query;
    let baseQuery = { status: { $ne: 'Inactive' } };
    
    // Search filter
    if (search && search.trim()) {
      const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      baseQuery.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { address: searchRegex },
        { description: searchRegex }
      ];
    }
    
    // Exact multikey indexed AC filter (combines stored amenity strings + acRooms counter + regex fallback safety)
    if (ac === 'true') {
      baseQuery.$or = [
        { amenities: { $in: ['AC', 'Ac', 'ac', 'AC Rooms', 'ac rooms', 'AC Room', 'Air Conditioning', 'air conditioning', 'Air Conditioner', /ac/i, /air conditioning/i] } },
        { acRooms: { $gt: 0 } }
      ];
    }
    
    // Exact multikey indexed Food filter
    if (food === 'true') {
      baseQuery.amenities = { $in: ['Kitchen', 'kitchen', 'Dining Hall', 'dining hall', 'Dining', 'dining', 'Food', 'food', 'Restaurant', 'Catering', /kitchen/i, /dining/i, /food/i] };
    }

    // Apply Centralized 2-Level Multi-Tenancy Scope (Community mandatory + City optional)
    const activeCity = (city && city !== 'all' && city !== 'All Cities') ? city : null;
    const query = applyScopeFilter(req, baseQuery, { overrideCity: activeCity });
    
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = limit ? Math.max(1, Number(limit)) : 0;
    const skipNum = (pageNum - 1) * (limitNum || 50);

    let queryExec = Dharmashala.find(query).sort({ createdAt: -1 });

    if (limitNum > 0) {
      queryExec = queryExec.skip(skipNum).limit(limitNum);
    }

    const [dharamshalas, total] = await Promise.all([
      queryExec.lean(),
      Dharmashala.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: dharamshalas,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum || total,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get single Dharmashala detail with rooms list
exports.getDharmashalaById = async (req, res) => {
  try {
    const query = applyScopeFilter(req, { _id: req.params.id });
    const dharamshala = await Dharmashala.findOne(query).lean();
    if (!dharamshala) {
      return res.status(404).json({ status: 'error', message: 'Dharmashala not found' });
    }
    
    // Fetch all active rooms for this property
    let rooms = await DharmashalaRoom.find({ 
      dharmashala: req.params.id,
      status: { $ne: 'Blocked' }
    }).lean();

    if (rooms.length === 0) {
      rooms = await DharmashalaRoom.create([
        {
          dharmashala: req.params.id,
          roomNumber: '101',
          roomName: 'Deluxe AC',
          floor: '1st Floor',
          roomCategory: 'Deluxe',
          isAc: true,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1500,
          status: 'Available'
        },
        {
          dharmashala: req.params.id,
          roomNumber: '102',
          roomName: 'Standard General',
          floor: '1st Floor',
          roomCategory: 'Standard',
          isAc: false,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1000,
          status: 'Available'
        }
      ]);
      await Dharmashala.findByIdAndUpdate(req.params.id, {
        totalRooms: 2,
        acRooms: 1,
        generalRooms: 1
      });
    }
    
    res.status(200).json({ 
      status: 'success', 
      data: { ...dharamshala, rooms } 
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get availability calendar arrays
exports.getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;
    
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    
    const query = applyScopeFilter(req, { _id: id });
    const dharamshala = await Dharmashala.findOne(query);
    if (!dharamshala) {
      return res.status(404).json({ status: 'error', message: 'Dharmashala not found' });
    }
    
    // Count total rooms active
    let totalRoomCount = await DharmashalaRoom.countDocuments({ 
      dharmashala: id, 
      status: { $ne: 'Blocked' } 
    });

    if (totalRoomCount === 0) {
      await DharmashalaRoom.create([
        {
          dharmashala: id,
          roomNumber: '101',
          roomName: 'Deluxe AC',
          floor: '1st Floor',
          roomCategory: 'Deluxe',
          isAc: true,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1500,
          status: 'Available'
        },
        {
          dharmashala: id,
          roomNumber: '102',
          roomName: 'Standard General',
          floor: '1st Floor',
          roomCategory: 'Standard',
          isAc: false,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1000,
          status: 'Available'
        }
      ]);
      await Dharmashala.findByIdAndUpdate(id, {
        totalRooms: 2,
        acRooms: 1,
        generalRooms: 1
      });
      totalRoomCount = 2;
    }
    
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0); // last day of month
    
    // Find active bookings in this month
    const bookings = await DharmashalaBooking.find({
      dharmashala: id,
      status: { $in: ['pending_approval', 'approved', 'upcoming', 'checked_in'] },
      checkIn: { $lte: endDate },
      checkOut: { $gte: startDate }
    });
    
    // Find maintenance locks in this month
    const maintenance = await DharmashalaMaintenance.find({
      dharmashala: id,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });
    
    const totalDays = endDate.getDate();
    const days = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(y, m - 1, day);
      currentDate.setHours(0,0,0,0);
      
      const dailyBookings = bookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        checkIn.setHours(0,0,0,0);
        checkOut.setHours(0,0,0,0);
        return currentDate >= checkIn && currentDate < checkOut;
      });
      
      const dailyMaintenance = maintenance.filter(block => {
        const start = new Date(block.startDate);
        const end = new Date(block.endDate);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return currentDate >= start && currentDate < end;
      });
      
      // Calculate capacity blocked
      const blockedRoomsCount = dailyBookings.length + dailyMaintenance.length;
      
      let status = 'available';
      if (totalRoomCount > 0 && blockedRoomsCount >= totalRoomCount) {
        status = 'booked';
      } else if (blockedRoomsCount > 0) {
        status = 'partial';
      }
      
      days.push({ day, status });
    }
    
    res.status(200).json({ status: 'success', data: days });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create a new booking checking real-time availability
exports.createBooking = async (req, res) => {
  try {
    const { dharmashalaId, checkIn, checkOut, roomType, checkInTime, checkOutTime, bookedBy, phone, guestCount, purpose, memberNotes, specialRequests } = req.body;
    
    const query = applyScopeFilter(req, { _id: dharmashalaId });
    const dharamshala = await Dharmashala.findOne(query);
    if (!dharamshala) {
      return res.status(404).json({ status: 'error', message: 'Dharmashala not found or unauthorized' });
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (nights <= 0) {
      return res.status(400).json({ status: 'error', message: 'Check-out date must be after check-in date.' });
    }
    
    // 1. Get room IDs currently occupied on these dates
    const bookedRoomIds = new Set();
    const activeStatuses = ['pending_approval', 'approved', 'reserved', 'payment_pending', 'paid', 'confirmed', 'upcoming', 'checked_in'];
    
    const overlappingBookings = await DharmashalaBooking.find({
      dharmashala: dharmashalaId,
      status: { $in: activeStatuses },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate }
    });
    overlappingBookings.forEach(b => (b.rooms || []).forEach(roomId => bookedRoomIds.add(roomId.toString())));
    
    // 2. Get room IDs locked for maintenance
    const maintenanceBlocks = await DharmashalaMaintenance.find({
      dharmashala: dharmashalaId,
      room: { $ne: null },
      startDate: { $lt: checkOutDate },
      endDate: { $gt: checkInDate }
    });
    maintenanceBlocks.forEach(block => bookedRoomIds.add(block.room.toString()));
    
    // 3. Find available room of matching category
    const isAc = roomType === 'AC';
    let allRooms = await DharmashalaRoom.find({ dharmashala: dharmashalaId });

    if (allRooms.length === 0) {
      allRooms = await DharmashalaRoom.create([
        {
          dharmashala: dharmashalaId,
          roomNumber: '101',
          roomName: 'Deluxe AC',
          floor: '1st Floor',
          roomCategory: 'Deluxe',
          isAc: true,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1500,
          status: 'Available'
        },
        {
          dharmashala: dharmashalaId,
          roomNumber: '102',
          roomName: 'Standard General',
          floor: '1st Floor',
          roomCategory: 'Standard',
          isAc: false,
          capacity: 2,
          extraMattressAllowed: true,
          maxGuests: 3,
          price: 1000,
          status: 'Available'
        }
      ]);
      await Dharmashala.findByIdAndUpdate(dharmashalaId, {
        totalRooms: 2,
        acRooms: 1,
        generalRooms: 1
      });
    }

    let availableRooms = allRooms.filter(r => 
      !bookedRoomIds.has(r._id.toString()) &&
      r.status === 'Available' &&
      r.isAc === isAc
    );
    
    // Fallback: If no room matches the specific preference, try to find ANY available room
    if (availableRooms.length === 0) {
      availableRooms = allRooms.filter(r => 
        !bookedRoomIds.has(r._id.toString()) &&
        r.status === 'Available'
      );
    }
    
    if (availableRooms.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No available rooms found for the selected dates and room type.' 
      });
    }
    
    // Assign the first free room
    const targetRoom = availableRooms[0];
    const pricePerNight = targetRoom.price;
    const totalAmount = pricePerNight * nights;
    
    const bookingId = `DH${Date.now().toString().slice(-8)}`;
    
    const booking = new DharmashalaBooking({
      bookingId,
      dharmashala: dharmashalaId,
      communityId: dharamshala.communityId || req.communityId,
      rooms: [targetRoom._id],
      user: req.user._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      roomType: roomType || (isAc ? 'AC' : 'General'),
      checkInTime: checkInTime || dharamshala.checkInTime,
      checkOutTime: checkOutTime || dharamshala.checkOutTime,
      totalAmount,
      bookedBy: bookedBy || req.user.name,
      phone: phone || req.user.phone,
      guestCount: guestCount ? Number(guestCount) : 1,
      purpose: purpose || specialRequests || '',
      memberNotes: memberNotes || specialRequests || '',
      specialRequests,
      status: 'pending_approval',
      statusHistory: [{
        action: 'CREATE_REQUEST',
        previousStatus: null,
        newStatus: 'pending_approval',
        status: 'pending_approval',
        performedBy: req.user._id,
        performedByRole: (req.user.role || 'MEMBER').toUpperCase(),
        notes: 'Booking request created by member',
        updatedAt: new Date(),
        updatedBy: req.user.name || 'Member'
      }]
    });
    
    await booking.save();
    
    // Broadcast Socket.io event for live Head & Admin dashboard updates
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dharmashala:booking_created', {
          bookingId: booking._id,
          dharmashalaId,
          communityId: booking.communityId,
          bookedBy: booking.bookedBy,
          totalAmount
        });
      }
    } catch (sErr) {
      console.warn('[Socket] dharmashala:booking_created warning:', sErr.message);
    }

    // Trigger Notification for Head and Admin Users
    try {
      const User = require('../../models/User');
      const { createNotification } = require('../../services/notificationService');
      const targetCommunityId = dharamshala.communityId || req.communityId;

      // Find Community Heads for member's community
      const headUsers = await User.find({
        role: { $in: ['head', 'community_head', 'HEAD', 'COMMUNITY_HEAD'] },
        communityId: targetCommunityId
      }).select('_id');

      // Find System Admins
      const adminUsers = await User.find({
        role: { $in: ['admin', 'super_admin', 'master_admin', 'master', 'head_admin', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] }
      }).select('_id');

      const notifPromises = [];
      headUsers.forEach(h => {
        notifPromises.push(
          createNotification({
            userId: h._id,
            module: 'dharmashala',
            type: 'booking_received',
            title: 'New Booking Request 🏠',
            message: `${booking.bookedBy} requested a booking at "${dharamshala.name}".`,
            icon: '🏠',
            priority: 'high',
            actionUrl: `/head/dharmashala`,
            referenceId: booking._id,
            referenceType: 'DharmashalaBooking'
          })
        );
      });

      adminUsers.forEach(a => {
        notifPromises.push(
          createNotification({
            userId: a._id,
            module: 'dharmashala',
            type: 'booking_received',
            title: 'New Global Booking Request 🏠',
            message: `${booking.bookedBy} submitted a booking request for "${dharamshala.name}".`,
            icon: '🏠',
            priority: 'normal',
            actionUrl: `/admin/dharmashala`,
            referenceId: booking._id,
            referenceType: 'DharmashalaBooking'
          })
        );
      });

      await Promise.allSettled(notifPromises);
    } catch (nErr) {
      console.warn('[Notify] createBooking notification warning:', nErr.message);
    }

    res.status(201).json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get booking history for current user
exports.getBookingHistory = async (req, res) => {
  try {
    const bookings = await DharmashalaBooking.find({ user: req.user._id })
      .populate('dharmashala')
      .populate('rooms')
      .sort({ createdAt: -1 })
      .lean();
    
    const formatted = bookings.map(b => {
      // Auto-expire reservation lock if 15 minutes window passed without payment
      let currentStatus = b.status;
      if (b.reservedUntil && ['approved', 'reserved', 'payment_pending'].includes(currentStatus) && b.paymentStatus !== 'Paid') {
        if (new Date() > new Date(b.reservedUntil)) {
          currentStatus = 'expired';
          b.status = 'expired';
          b.save().catch(e => console.warn('Auto expire save note:', e.message));
        }
      }

      return {
        id: b.bookingId,
        _id: b._id,
        dharmashalaId: b.dharmashala?._id,
        dharmashalaName: b.dharmashala?.name || 'Dharmashala',
        location: b.dharmashala?.address || b.dharmashala?.location || '',
        status: currentStatus,
        paymentStatus: b.paymentStatus,
        checkIn: b.checkIn.toISOString().split('T')[0],
        checkOut: b.checkOut.toISOString().split('T')[0],
        nights: b.nights,
        totalAmount: b.totalAmount,
        bookedBy: b.bookedBy,
        phone: b.phone,
        roomType: b.roomType,
        rooms: b.rooms ? b.rooms.map(r => r.roomNumber) : [],
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        guestCount: b.guestCount || 1,
        purpose: b.purpose || b.specialRequests || '',
        memberNotes: b.memberNotes || b.specialRequests || '',
        baseAmount: b.baseAmount || b.totalAmount,
        additionalCharges: b.additionalCharges || 0,
        discount: b.discount || 0,
        pricingNote: b.pricingNote || '',
        approvedByRole: b.approvedByRole || null,
        reservedUntil: b.reservedUntil,
        qrCodeData: b.qrCodeData || `DH-QR-${b.bookingId}`,
        rejectionReason: b.rejectionReason || null,
        statusHistory: b.statusHistory || []
      };
    });
    
    res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Confirm direct or simulated payment for booking
exports.payBooking = async (req, res) => {
  try {
    const { id } = req.params;
    let booking = await DharmashalaBooking.findOne({ bookingId: id });
    if (!booking) {
      booking = await DharmashalaBooking.findById(id);
    }
    
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isPrivilegedAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId)?.toString();
    const bookingCommId = (booking.communityId?._id || booking.communityId)?.toString();
    const isCommunityHeadAdmin = userRole === 'head_admin' && userCommId && bookingCommId && userCommId === bookingCommId;

    if (!isPrivilegedAdmin && !isCommunityHeadAdmin) {
      return res.status(403).json({ status: 'error', message: 'Online payments must be made through the secure Razorpay checkout.' });
    }

    // Check 15-minute lock expiration
    if (booking.reservedUntil && new Date() > new Date(booking.reservedUntil)) {
      booking.status = 'expired';
      await booking.save();
      return res.status(400).json({ status: 'error', message: '15-minute reservation window expired. Please re-request approval.' });
    }
    
    booking.status = 'confirmed';
    booking.paymentStatus = 'Paid';
    booking.paidAt = new Date();
    booking.qrCodeData = `DH-QR-${booking.bookingId}-${Date.now().toString().slice(-6)}`;
    await booking.save();

    // Broadcast Socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dharmashala:payment_completed', { bookingId: booking._id, totalAmount: booking.totalAmount });
      }
    } catch (e) {}
    
    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Create Razorpay payment order for room booking
exports.createBookingRazorpayOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    let booking = await DharmashalaBooking.findOne({ bookingId });
    if (!booking) {
      booking = await DharmashalaBooking.findById(bookingId);
    }
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isPrivilegedAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId)?.toString();
    const bookingCommId = (booking.communityId?._id || booking.communityId)?.toString();
    const isCommunityHeadAdmin = userRole === 'head_admin' && userCommId && bookingCommId && userCommId === bookingCommId;

    if (!isPrivilegedAdmin && !isCommunityHeadAdmin && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to access this booking' });
    }

    // Lock verification: 15 minutes payment timeout
    if (booking.reservedUntil && new Date() > new Date(booking.reservedUntil)) {
      booking.status = 'expired';
      await booking.save();
      return res.status(400).json({ 
        status: 'error', 
        message: 'Your 15-minute payment reservation window has expired. Please contact Community Head to re-approve your booking.' 
      });
    }

    const paymentService = require('../../services/paymentService');
    const order = await paymentService.initiatePayment({
      gateway: 'razorpay',
      amount: booking.totalAmount,
      currency: 'INR',
      receipt: `dh_${booking.bookingId}`.slice(0, 40),
      notes: { bookingId: booking._id.toString() }
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      status: 'success',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('createBookingRazorpayOrder error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create payment order' });
  }
};

// Verify Razorpay payment signature & confirm booking
exports.verifyRazorpayBookingPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ status: 'error', message: 'Missing Razorpay signature parameters' });
    }

    const paymentService = require('../../services/paymentService');
    const isValid = paymentService.verifyPayment({
      gateway: 'razorpay',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Razorpay payment signature verification failed' });
    }

    let booking = await DharmashalaBooking.findOne({ bookingId });
    if (!booking) {
      booking = await DharmashalaBooking.findById(bookingId);
    }
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isPrivilegedAdmin = ['admin', 'super_admin', 'master_admin', 'master'].includes(userRole);
    const userCommId = (req.communityId || req.user?.communityId?._id || req.user?.communityId)?.toString();
    const bookingCommId = (booking.communityId?._id || booking.communityId)?.toString();
    const isCommunityHeadAdmin = userRole === 'head_admin' && userCommId && bookingCommId && userCommId === bookingCommId;

    if (!isPrivilegedAdmin && !isCommunityHeadAdmin && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to access this booking' });
    }

    if (booking.razorpayOrderId && booking.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ status: 'error', message: 'This payment does not belong to this booking.' });
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'Paid';
    // Online payment counts as money received (used by Samaj Fund income reports).
    booking.amountReceived = booking.totalAmount;
    booking.paymentMode = 'Online (Razorpay)';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpayOrderId = razorpay_order_id;
    booking.razorpaySignature = razorpay_signature;
    booking.paidAt = new Date();
    booking.qrCodeData = `DH-QR-${booking.bookingId}-${Date.now().toString().slice(-6)}`;

    booking.statusHistory.push({
      action: 'PAYMENT_RECEIVED',
      previousStatus: 'approved',
      newStatus: 'confirmed',
      status: 'confirmed',
      performedBy: req.user._id,
      performedByRole: 'MEMBER',
      amount: booking.totalAmount,
      notes: `Payment verified & completed via Razorpay (${razorpay_payment_id})`,
      updatedAt: new Date(),
      updatedBy: booking.bookedBy
    });

    await booking.save();

    // Broadcast Socket
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dharmashala:payment_completed', { 
          bookingId: booking._id, 
          dharmashalaId: booking.dharmashala,
          totalAmount: booking.totalAmount 
        });
      }
    } catch (sErr) {}

    // Notifications
    try {
      const { notifyBookingStatusChanged, notifyPaymentReceivedToHeadAndAdmin } = require('../../services/notificationService');
      const Dharmashala = require('../../models/Dharmashala');
      const dhDoc = await Dharmashala.findById(booking.dharmashala);
      const dName = dhDoc?.name || 'Dharmashala';

      const confirmNotif = await notifyBookingStatusChanged(booking.user, 'confirmed', dName, booking._id, { amount: booking.totalAmount });
      if (confirmNotif) {
        sendPushNotification({
          userId: booking.user,
          notificationId: confirmNotif._id,
          type: 'booking_payment_confirmed',
          title: 'Booking Confirmed! 🏠',
          message: `Your payment of ₹${booking.totalAmount} for "${dName}" has been confirmed.`,
          icon: '🏠',
          actionUrl: '/member/dharmashala/my-bookings'
        }).catch(err => console.error('[BookingConfirmPushError]', err.message));
      }

      // Notify Community Heads and Admins
      const User = require('../../models/User');
      const headUsers = await User.find({
        role: { $in: ['head', 'community_head', 'HEAD', 'COMMUNITY_HEAD'] },
        communityId: booking.communityId
      }).select('_id');
      const headId = headUsers.length > 0 ? headUsers[0]._id : booking.approvedBy;

      const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'master_admin', 'master', 'head_admin', 'ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'] } }).select('_id');
      const adminIds = admins.map(a => a._id);

      await notifyPaymentReceivedToHeadAndAdmin({
        headId,
        adminIds,
        bookedBy: booking.bookedBy,
        dharmashalaName: dName,
        amount: booking.totalAmount,
        bookingId: booking._id,
        paymentId: razorpay_payment_id
      });
    } catch (nErr) {
      console.warn('[Notify] verifyRazorpayBookingPayment notification warning:', nErr.message);
    }

    res.status(200).json({ status: 'success', message: 'Payment verified and booking confirmed!', data: booking });
  } catch (error) {
    console.error('verifyRazorpayBookingPayment error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Cancel booking by member
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    let booking = await DharmashalaBooking.findOne({ bookingId: id, user: req.user._id });
    if (!booking) {
      booking = await DharmashalaBooking.findOne({ _id: id, user: req.user._id });
    }
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found or unauthorized' });
    }

    if (['completed', 'checked_out', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ status: 'error', message: `Booking cannot be cancelled in status: ${booking.status}` });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by member';

    if (booking.paymentStatus === 'Paid') {
      booking.paymentStatus = 'Refunded';
      booking.refundAmount = booking.totalAmount;
      booking.refundedAt = new Date();
    }

    // Release assigned rooms
    if (booking.rooms && booking.rooms.length > 0) {
      const DharmashalaRoom = require('../../models/DharmashalaRoom');
      await DharmashalaRoom.updateMany(
        { _id: { $in: booking.rooms } },
        { status: 'Available' }
      );
    }

    await booking.save();

    // Socket emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dharmashala:booking_status_updated', { bookingId: booking._id, status: 'cancelled' });
      }
    } catch (sErr) {}

    res.status(200).json({ status: 'success', message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
