const crypto = require('crypto');
const mongoose = require('mongoose');
const FundAccount = require('../../models/FundAccount');
const FundLedgerEntry = require('../../models/FundLedgerEntry');
const { applyScopeFilter, inheritTenantPayload, adminRoles } = require('../../utils/queryScopeHelper');

// Shared by the head and admin routers; applyScopeFilter already gives admin a
// global view and heads their own community.
const isAdminReq = (req) => adminRoles.includes((req.user?.role || '').toLowerCase());
const newTxnId = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}${crypto.randomInt(100, 999)}`;
const maskAccountNo = (n) => (n ? `${'X'.repeat(Math.max(0, n.length - 4))}${n.slice(-4)}` : '');

// Local heads are limited to accounts in their own city.
const accountScope = (req, extra = {}) => {
  const filter = applyScopeFilter(req, extra);
  if (!isAdminReq(req) && req.user?.accountType === 'local_head' && req.user.city) filter.city = req.user.city;
  return filter;
};

const balancesFor = async (accountIds) => {
  const rows = await FundLedgerEntry.aggregate([
    { $match: { account: { $in: accountIds }, status: 'Posted' } },
    { $group: { _id: { account: '$account', direction: '$direction' }, total: { $sum: '$amount' } } }
  ]);
  const map = {};
  rows.forEach(r => {
    const key = r._id.account.toString();
    map[key] = map[key] || { credits: 0, debits: 0 };
    if (r._id.direction === 'Credit') map[key].credits = r.total; else map[key].debits = r.total;
  });
  return map;
};

const currentBalance = async (account) => {
  const bal = (await balancesFor([account._id]))[account._id.toString()] || { credits: 0, debits: 0 };
  return (account.openingBalance || 0) + bal.credits - bal.debits;
};

const withBalance = (acc, bal = { credits: 0, debits: 0 }) => {
  const o = acc.toObject ? acc.toObject() : acc;
  return {
    ...o,
    accountNumber: maskAccountNo(o.accountNumber),
    totalCredits: bal.credits,
    totalDebits: bal.debits,
    currentBalance: (o.openingBalance || 0) + bal.credits - bal.debits
  };
};

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await FundAccount.find(accountScope(req)).sort({ type: 1, name: 1 });
    const balances = await balancesFor(accounts.map(a => a._id));
    const data = accounts.map(a => withBalance(a, balances[a._id.toString()]));

    const sum = (type) => data.filter(a => a.type === type && a.status === 'Active').reduce((s, a) => s + a.currentBalance, 0);
    const byCityMap = {};
    data.filter(a => a.status === 'Active').forEach(a => {
      const c = a.city || 'Unassigned';
      byCityMap[c] = (byCityMap[c] || 0) + a.currentBalance;
    });
    const summary = {
      cash: sum('Cash'),
      bank: sum('Bank'),
      online: sum('Online'),
      total: sum('Cash') + sum('Bank') + sum('Online'),
      byLocation: Object.entries(byCityMap).map(([city, balance]) => ({ city, balance })),
      lowBalanceAccounts: data
        .filter(a => a.status === 'Active' && a.lowBalanceLimit > 0 && a.currentBalance < a.lowBalanceLimit)
        .map(a => ({ _id: a._id, name: a.name, currentBalance: a.currentBalance, lowBalanceLimit: a.lowBalanceLimit }))
    };
    res.status(200).json({ success: true, data, summary });
  } catch (error) {
    console.error('getAccounts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const b = req.body;
    if (!b.name || !['Cash', 'Bank', 'Online'].includes(b.type)) {
      return res.status(400).json({ success: false, message: 'Account name and a valid type (Cash/Bank/Online) are required.' });
    }
    const payload = inheritTenantPayload(req, {});
    const communityId = isAdminReq(req) ? b.communityId : payload.communityId;
    if (!communityId) return res.status(403).json({ success: false, message: 'Community context missing.' });

    const account = await FundAccount.create({
      communityId,
      city: isAdminReq(req) ? b.city : (payload.city || b.city),
      name: b.name.trim(),
      type: b.type,
      bankName: b.bankName, branch: b.branch, ifsc: b.ifsc,
      accountNumber: b.accountNumber, accountHolder: b.accountHolder, accountType: b.accountType,
      responsiblePersonName: b.responsiblePersonName,
      openingBalance: Number(b.openingBalance) || 0,
      lowBalanceLimit: Number(b.lowBalanceLimit) || 0,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: withBalance(account) });
  } catch (error) {
    console.error('createAccount error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const account = await FundAccount.findOne(accountScope(req, { _id: req.params.id }));
    if (!account) return res.status(404).json({ success: false, message: 'Account not found.' });
    ['name', 'bankName', 'branch', 'ifsc', 'accountHolder', 'accountType', 'responsiblePersonName', 'status'].forEach(k => {
      if (req.body[k] !== undefined) account[k] = req.body[k];
    });
    if (req.body.accountNumber) account.accountNumber = req.body.accountNumber;
    if (req.body.lowBalanceLimit !== undefined) account.lowBalanceLimit = Number(req.body.lowBalanceLimit) || 0;
    await account.save();
    const balances = await balancesFor([account._id]);
    res.status(200).json({ success: true, data: withBalance(account, balances[account._id.toString()]) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getLedger = async (req, res) => {
  try {
    const accountIds = (await FundAccount.find(accountScope(req)).select('_id')).map(a => a._id);
    const filter = { account: { $in: accountIds } };
    if (req.query.accountId) {
      filter.account = { $in: accountIds.filter(id => id.toString() === req.query.accountId) };
    }
    if (req.query.kind) filter.kind = req.query.kind;
    const entries = await FundLedgerEntry.find(filter)
      .populate('account', 'name type city')
      .sort({ date: -1, createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 200, 1000))
      .lean();
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    console.error('getLedger error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manual credit/debit on one account (e.g. cash refund, bank charge, adjustment).
exports.addEntry = async (req, res) => {
  try {
    const { accountId, direction, amount, kind, description, date } = req.body;
    const amt = Number(amount);
    if (!['Credit', 'Debit'].includes(direction) || !(amt > 0)) {
      return res.status(400).json({ success: false, message: 'Direction and a positive amount are required.' });
    }
    if (!['Income', 'Expense', 'Refund', 'Adjustment'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'Invalid entry kind.' });
    }
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ success: false, message: 'Select an account.' });
    }
    const account = await FundAccount.findOne(accountScope(req, { _id: accountId, status: 'Active' }));
    if (!account) return res.status(404).json({ success: false, message: 'Account not found or inactive.' });

    if (direction === 'Debit' && (await currentBalance(account)) < amt) {
      return res.status(400).json({ success: false, message: 'Insufficient balance in this account.' });
    }
    const entry = await FundLedgerEntry.create({
      communityId: account.communityId, city: account.city, account: account._id,
      direction, amount: amt, kind, description, date: date ? new Date(date) : new Date(),
      transactionId: newTxnId('TXN'), createdBy: req.user._id, createdByName: req.user.name
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('addEntry error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Move money between two accounts (cash -> bank deposit, or account-to-account).
// Both legs share a transferGroup and are kind Deposit/Transfer, never income.
exports.transfer = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description, date } = req.body;
    const amt = Number(amount);
    if (!(amt > 0) || !mongoose.Types.ObjectId.isValid(fromAccountId) || !mongoose.Types.ObjectId.isValid(toAccountId)
        || fromAccountId === toAccountId) {
      return res.status(400).json({ success: false, message: 'Pick two different accounts and a positive amount.' });
    }
    const [from, to] = await Promise.all([
      FundAccount.findOne(accountScope(req, { _id: fromAccountId, status: 'Active' })),
      FundAccount.findOne(accountScope(req, { _id: toAccountId, status: 'Active' }))
    ]);
    if (!from || !to) return res.status(404).json({ success: false, message: 'Account not found or inactive.' });

    if ((await currentBalance(from)) < amt) {
      return res.status(400).json({ success: false, message: `Insufficient balance in ${from.name}.` });
    }
    const kind = from.type === 'Cash' && to.type === 'Bank' ? 'Deposit' : 'Transfer';
    const group = newTxnId('TRF');
    const base = {
      amount: amt, kind, date: date ? new Date(date) : new Date(), transferGroup: group,
      createdBy: req.user._id, createdByName: req.user.name
    };
    const [debit, credit] = await FundLedgerEntry.create([
      { ...base, communityId: from.communityId, city: from.city, account: from._id, direction: 'Debit',
        description: description || `${kind} to ${to.name}`, transactionId: `${group}-D` },
      { ...base, communityId: to.communityId, city: to.city, account: to._id, direction: 'Credit',
        description: description || `${kind} from ${from.name}`, transactionId: `${group}-C` }
    ]);
    res.status(201).json({ success: true, data: { transferGroup: group, debit, credit } });
  } catch (error) {
    console.error('transfer error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Soft-cancel; for a transfer both legs are cancelled together.
exports.cancelEntry = async (req, res) => {
  try {
    const accountIds = (await FundAccount.find(accountScope(req)).select('_id')).map(a => a._id);
    const entry = await FundLedgerEntry.findOne({ _id: req.params.id, account: { $in: accountIds }, status: 'Posted' });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found.' });
    const filter = entry.transferGroup ? { transferGroup: entry.transferGroup } : { _id: entry._id };
    await FundLedgerEntry.updateMany(filter, {
      status: 'Cancelled', cancelledBy: req.user._id, cancelledAt: new Date(), cancellationReason: req.body.reason || ''
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
