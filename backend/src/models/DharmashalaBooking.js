const mongoose = require('mongoose');

const dharmashalaBookingSchema = new mongoose.Schema({
  /**
   * communityId — Community isolation key.
   * Inherited from parent Dharmashala document's communityId on booking creation.
   */
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true,
    default: null,
  },
  bookingId: { type: String, required: true, unique: true },
  dharmashala: { type: mongoose.Schema.Types.ObjectId, ref: 'Dharmashala', required: true },
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DharmashalaRoom' }],
  // Not required — a manually/offline-created booking for a walk-in guest
  // often has no registered member account; bookedBy/phone are the
  // authoritative customer identity in that case.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Who originated this booking — the online member-request flow (createBooking)
  // always sets 'Online'; a Head/Admin creating it directly for a walk-in/phone
  // guest sets 'Offline'.
  bookingSource: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
  status: { 
    type: String, 
    enum: [
      'pending_approval', 
      'approved', 
      'reserved', 
      'payment_pending', 
      'paid', 
      'confirmed', 
      'upcoming', 
      'checked_in', 
      'checked_out', 
      'completed', 
      'cancelled', 
      'rejected', 
      'expired', 
      'no_show'
    ], 
    default: 'pending_approval' 
  },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  nights: { type: Number, required: true },
  roomType: { type: String, enum: ['AC', 'General'] },
  checkInTime: { type: String, default: '10:00' },
  checkOutTime: { type: String, default: '10:00' },
  totalAmount: { type: Number, required: true },
  bookedBy: { type: String, required: true },
  phone: { type: String, required: true },
  guestCount: { type: Number, default: 1 },
  purpose: { type: String },
  memberNotes: { type: String },
  specialRequests: { type: String },
  paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },

  // How this booking's payment was/is being collected, and by whom (for
  // offline/manual bookings — mirrors Contribution's transaction audit fields).
  paymentMode: { type: String, default: 'Online' }, // 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Online' | 'Cheque'
  amountReceived: { type: Number, default: 0 },      // running total actually collected so far
  advanceAmount: { type: Number, default: 0 },        // what was collected at booking time (offline flow)
  receiptNo: { type: String },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collectedByName: { type: String },
  collectedByRole: { type: String },
  staffNotes: { type: String }, // internal note added by the Head/Admin who created/handled the booking

  // 15-Minute Temporary Reservation Lock
  reservedUntil: { type: Date },

  // Razorpay Transaction Details
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  paidAt: { type: Date },

  // Pricing Breakdown Snapshot
  baseAmount: { type: Number },
  additionalCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  pricingNote: { type: String },

  // Approval & Rejection Audit
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedByRole: { type: String, enum: ['ADMIN', 'HEAD', 'SUB_HEAD', 'LOCAL_HEAD', 'COMMUNITY_HEAD', 'SUPER_ADMIN', 'MASTER_ADMIN', 'MASTER', 'HEAD_ADMIN'] },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },

  // Cancellation & Refund
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  refundAmount: { type: Number, default: 0 },
  refundTxnId: { type: String },
  refundedAt: { type: Date },

  // Verification QR Code Data
  qrCodeData: { type: String },

  // Enterprise specific fields
  enterpriseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enterprise' },
  isEnterpriseBooking: { type: Boolean, default: false },

  remarks: { type: String },
  statusHistory: [{
    action: { type: String },
    previousStatus: { type: String },
    newStatus: { type: String },
    status: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByRole: { type: String },
    amount: { type: Number },
    notes: { type: String },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('DharmashalaBooking', dharmashalaBookingSchema);
