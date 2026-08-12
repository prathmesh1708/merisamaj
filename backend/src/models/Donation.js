const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    trim: true, 
    required: function() { 
      return !this.txnId && !this.orderId && !this.paymentId; 
    } 
  },
  shortDescription: { type: String, trim: true },
  description: { type: String, trim: true },
  purpose: { type: String, trim: true },
  category: { type: String, default: 'General', trim: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },

  targetAmount: { 
    type: Number, 
    min: 0,
    required: function() { 
      return !this.txnId && !this.orderId && !this.paymentId; 
    } 
  },
  raisedAmount: { type: Number, default: 0, min: 0 },
  expenseAmount: { type: Number, default: 0, min: 0 },
  donorCount: { type: Number, default: 0, min: 0 },
  minDonation: { type: Number, default: 1 },
  maxDonation: { type: Number },
  currency: { type: String, default: 'INR' },

  city: { type: String, trim: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', index: true },
  isGlobalCampaign: { type: Boolean, default: false, index: true },
  targetedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community', index: true }],
  targetedMembers: [{ type: String }],
  targetAudiences: [{ type: String }],
  visibility: { type: String, default: 'All Members' },

  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Scheduled', 'Active', 'Completed', 'Closed', 'Suspended', 'Archived', 'Approved', 'Failed', 'Cancelled'],
    default: 'Active',
    index: true
  },

  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },

  // Single standardized cover image field (Head UI forms will map to this field)
  coverImage: { type: String, trim: true },
  galleryImages: [{ type: String }],
  documents: [{
    fileName: String,
    fileUrl: String,
    fileType: String
  }],

  settings: {
    showDonorNames: { type: Boolean, default: true },
    anonymousAllowed: { type: Boolean, default: true },
    enableProgressBar: { type: Boolean, default: true },
    enableDonationCounter: { type: Boolean, default: true },
    enableCountdown: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },

  // Individual payment transaction fields
  txnId: { type: String, sparse: true, index: true },
  orderId: { type: String, sparse: true, index: true },
  paymentId: { type: String, sparse: true, index: true },
  signature: { type: String, sparse: true },
  paymentMethod: { type: String, default: 'Razorpay' },
  paymentMode: { type: String, default: 'Razorpay' },
  paidAt: { type: Date },
  donorName: { type: String, default: 'Anonymous' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  amount: { type: Number, default: 0 },
  recentDonations: [
    {
      donorName: { type: String, default: 'Anonymous' },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      paymentStatus: { type: String, default: 'success' }
    }
  ]
}, {
  timestamps: true
});

// Compound index for fast multi-tenant donation campaign listing & sorting
donationSchema.index({ status: 1, isDeleted: 1, communityId: 1, category: 1, createdAt: -1 });
donationSchema.index({ title: 'text' });

module.exports = mongoose.model('Donation', donationSchema);

