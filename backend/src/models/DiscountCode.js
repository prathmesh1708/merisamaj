const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 40 },
  description: { type: String, trim: true, default: '', maxlength: 250 },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscountAmount: { type: Number, default: 0, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  maxUses: { type: Number, default: 0, min: 0 }, // zero means unlimited
  maxUsesPerUser: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  reservedCount: { type: Number, default: 0, min: 0 },
  planType: { type: String, enum: ['all', 'matrimonial', 'app'], default: 'all' },
  planIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

discountCodeSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 });

module.exports = mongoose.model('DiscountCode', discountCodeSchema);
