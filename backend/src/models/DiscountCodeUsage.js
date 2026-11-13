const mongoose = require('mongoose');

const discountCodeUsageSchema = new mongoose.Schema({
  discountCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription', required: true, unique: true },
  code: { type: String, required: true },
  discountAmount: { type: Number, required: true, min: 0 }
}, { timestamps: true });

discountCodeUsageSchema.index({ discountCodeId: 1, userId: 1, createdAt: -1 });

module.exports = mongoose.model('DiscountCodeUsage', discountCodeUsageSchema);
