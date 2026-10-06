const mongoose = require('mongoose');

/**
 * FundLedgerEntry — one credit or debit against a FundAccount. A cash
 * deposit into the bank is two entries sharing a transferGroup (debit on
 * the Cash account, credit on the Bank account) with kind 'Deposit', which
 * summary code must NOT count as income or expense.
 */
const fundLedgerEntrySchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  city: { type: String, trim: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAccount', required: true, index: true },

  direction: { type: String, enum: ['Credit', 'Debit'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  kind: {
    type: String,
    enum: ['Income', 'Expense', 'Deposit', 'Transfer', 'Refund', 'Adjustment'],
    required: true
  },
  description: { type: String, trim: true },
  date: { type: Date, default: Date.now },

  transactionId: { type: String, unique: true },
  transferGroup: { type: String, index: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: { type: String },

  status: { type: String, enum: ['Posted', 'Cancelled'], default: 'Posted' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String }
}, { timestamps: true });

fundLedgerEntrySchema.index({ account: 1, date: -1 });

module.exports = mongoose.model('FundLedgerEntry', fundLedgerEntrySchema);
