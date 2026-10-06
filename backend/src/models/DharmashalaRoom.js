const mongoose = require('mongoose');

const dharmashalaRoomSchema = new mongoose.Schema({
  dharmashala: { type: mongoose.Schema.Types.ObjectId, ref: 'Dharmashala', required: true },
  roomNumber: { type: String, required: true },
  roomName: { type: String },
  floor: { type: String },
  roomCategory: { type: String, default: 'Standard' }, // Standard, Deluxe, Suite
  isAc: { type: Boolean, default: false },
  capacity: { type: Number, default: 2 },
  extraMattressAllowed: { type: Boolean, default: true },
  maxGuests: { type: Number, default: 3 },
  price: { type: Number, required: true },
  weekendPrice: { type: Number },
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['Available', 'Booked', 'Occupied', 'Maintenance', 'Blocked'],
    default: 'Available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DharmashalaRoom', dharmashalaRoomSchema);
