const mongoose = require('mongoose');

/**
 * SamajIncome — a generic manual collection record, for money that isn't
 * tied to a specific Fund campaign, Donation campaign, or Dharmashala
 * booking (e.g. a cash donation handed over in person with no campaign
 * behind it, a membership fee, a sponsorship). Mirrors the collector-audit
 * fields already used on Contribution/Donation/DharmashalaBooking
 * (collectedBy/collectedByName/paymentMode/receiptNo) so every income
 * source in the app records accountability the same way.
 *
 * This does NOT replace Fund/Donation/Dharmashala income — the
 * Samaj-wide income aggregation (getIncomeSources) reads from all four
 * sources side by side.
 */
const samajIncomeSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  city: { type: String, trim: true, index: true },

  incomeCategory: {
    type: String,
    default: 'Other Income',
    trim: true
    // Free text by design (matches Donation.category) so a Head/Admin can
    // type a new category on the fly — e.g. 'Donation', 'Membership',
    // 'Sponsorship', 'Event Registration', 'Property Income', 'Interest Income'.
  },
  purpose: { type: String, trim: true },

  payerName: { type: String, required: true, trim: true },
  payerPhone: { type: String, trim: true },
  payerAddress: { type: String, trim: true },

  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, default: 'Cash' }, // 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque' | 'Online'
  date: { type: Date, default: Date.now },

  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  collectedByName: { type: String },
  collectedByRole: { type: String },

  receiptNo: { type: String, unique: true },
  documentUrl: { type: String }, // optional supporting photo/document
  notes: { type: String },

  status: { type: String, enum: ['Recorded', 'Cancelled'], default: 'Recorded' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String }
}, {
  timestamps: true
});

samajIncomeSchema.index({ communityId: 1, city: 1, date: -1 });
samajIncomeSchema.index({ collectedBy: 1, date: -1 });

module.exports = mongoose.model('SamajIncome', samajIncomeSchema);
