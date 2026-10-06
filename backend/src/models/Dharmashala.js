const mongoose = require('mongoose');

const dharmashalaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  googleMapsUrl: { type: String },
  latitude: { type: String },
  longitude: { type: String },
  contactPerson: { type: String, required: true },
  contactNumber: { type: String, required: true },
  alternateContact: { type: String },
  email: { type: String },
  website: { type: String },
  image: { type: String }, // Cover image URL
  galleryImages: [{ type: String }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isFeatured: { type: Boolean, default: false },
  amenities: [{ type: String }], // WiFi, Lift, CCTV, RO Water, etc.
  pricePerDay: { type: Number, default: 0 },
  rules: { type: String },
  checkInTime: { type: String, default: '10:00' },
  checkOutTime: { type: String, default: '10:00' },
  // Room counters — maintained by the room controllers (createRoom/updateRoom/deleteRoom)
  totalRooms: { type: Number, default: 0 },
  acRooms: { type: Number, default: 0 },
  generalRooms: { type: Number, default: 0 },
  /**
   * communityId — PRIMARY community isolation key (ObjectId).
   * @deprecated `community` String field below — will be removed after migration.
   */
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true,
    default: null,
  },
  // @deprecated — use communityId (ObjectId) instead.
  community: { type: String }
}, {
  timestamps: true
});

dharmashalaSchema.index({ communityId: 1, status: 1, createdAt: -1 });
dharmashalaSchema.index({ communityId: 1, status: 1, city: 1, createdAt: -1 });
dharmashalaSchema.index({ communityId: 1, status: 1, amenities: 1 });
dharmashalaSchema.index({ name: 'text', city: 'text', address: 'text', description: 'text' });

module.exports = mongoose.model('Dharmashala', dharmashalaSchema);
