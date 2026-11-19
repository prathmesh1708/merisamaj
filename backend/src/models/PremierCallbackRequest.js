const mongoose = require('mongoose');

const premierCallbackRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  city: { type: String, default: '' },
  community: { type: String, default: '' },
  currentPlanName: { type: String, default: 'Free' },
  currentPlanEndDate: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'contacted', 'completed', 'cancelled'], default: 'pending', index: true },
  adminNote: { type: String, trim: true, default: '' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null }
}, { timestamps: true });

premierCallbackRequestSchema.index({ status:  1, createdAt: -1 });

module.exports = mongoose.model('PremierCallbackRequest', premierCallbackRequestSchema);
