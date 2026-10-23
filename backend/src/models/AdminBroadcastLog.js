const mongoose = require('mongoose');

const adminBroadcastLogSchema = new mongoose.Schema({
  broadcastId: { type: String, required: true, unique: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String },
  senderRole: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  imageUrl: { type: String, default: null }, // Optional poster shown in the push and in-app
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null }, // Null = All Communities
  communityName: { type: String, default: 'All Communities' },
  targetRole: { type: String, enum: ['ALL', 'HEAD', 'MEMBER'], default: 'ALL' },
  channel: { type: String, enum: ['in_app', 'in_app_push'], default: 'in_app' },
  recipientCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AdminBroadcastLog', adminBroadcastLogSchema);
