const mongoose = require('mongoose');

/**
 * FundAccount — a place the Samaj's money physically sits: a bank account,
 * a cash-in-hand box held by a person, or an online/UPI wallet. The balance
 * is never stored; it is always opening + credits - debits from FundLedgerEntry.
 */
const fundAccountSchema = new mongoose.Schema({
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  city: { type: String, trim: true, index: true },

  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Cash', 'Bank', 'Online'], required: true },

  bankName: { type: String, trim: true },
  branch: { type: String, trim: true },
  ifsc: { type: String, trim: true, uppercase: true },
  accountNumber: { type: String, trim: true },
  accountHolder: { type: String, trim: true },
  accountType: { type: String, trim: true }, // Savings / Current

  responsiblePersonName: { type: String, trim: true }, // who holds the cash

  openingBalance: { type: Number, default: 0 },
  lowBalanceLimit: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

fundAccountSchema.index({ communityId: 1, city: 1, type: 1 });

module.exports = mongoose.model('FundAccount', fundAccountSchema);
