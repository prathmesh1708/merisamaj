import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { axiosPrivate } from '../../core/api/axiosPrivate';

const inr = (n) => `₹ ${(n || 0).toLocaleString('en-IN')}`;
const emptyAccount = { name: '', type: 'Bank', bankName: '', branch: '', ifsc: '', accountNumber: '', accountHolder: '', accountType: 'Savings', responsiblePersonName: '', openingBalance: '', lowBalanceLimit: '', city: '', communityId: '' };
const emptyEntry = { accountId: '', direction: 'Credit', kind: 'Adjustment', amount: '', description: '' };
const emptyTransfer = { fromAccountId: '', toAccountId: '', amount: '', description: '' };

/**
 * Accounts + Cash-in-Hand + ledger. Shared by the head and admin panels —
 * `base` is the API root ('/head/fund-accounts' or '/admin/fund-accounts'),
 * `isAdmin` shows the community/city fields on account creation.
 */
export default function FundAccountsPage({ base, backTo, isAdmin = false }) {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [ledgerAccount, setLedgerAccount] = useState('');
  const [modal, setModal] = useState(null); // 'account' | 'entry' | 'transfer'
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([
        axiosPrivate.get(base),
        axiosPrivate.get(`${base}/ledger`, { params: ledgerAccount ? { accountId: ledgerAccount } : {} })
      ]);
      setAccounts(a.data.data);
      setSummary(a.data.summary);
      setLedger(l.data.data);
    } catch (e) {
      flash(e.response?.data?.message || 'Failed to load accounts', false);
    }
  }, [base, ledgerAccount]);

  useEffect(() => { load(); }, [load]);

  const open = (type, initial) => { setForm(initial); setModal(type); };
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal === 'account') await axiosPrivate.post(base, form);
      if (modal === 'entry') await axiosPrivate.post(`${base}/entries`, form);
      if (modal === 'transfer') await axiosPrivate.post(`${base}/transfer`, form);
      setModal(null);
      flash('Saved');
      load();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to save', false);
    } finally { setBusy(false); }
  };

  const cancelEntry = async (id) => {
    const reason = window.prompt('Reason for cancelling this entry?');
    if (reason === null) return;
    try {
      await axiosPrivate.patch(`${base}/entries/${id}/cancel`, { reason });
      load();
    } catch (err) { flash(err.response?.data?.message || 'Failed to cancel', false); }
  };

  const toggleStatus = async (a) => {
    try {
      await axiosPrivate.put(`${base}/${a._id}`, { status: a.status === 'Active' ? 'Inactive' : 'Active' });
      load();
    } catch (err) { flash(err.response?.data?.message || 'Failed to update', false); }
  };

  const active = accounts.filter(a => a.status === 'Active');
  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm';
  const label = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {msg && <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm font-bold ${msg.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>{msg.text}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          {backTo && <Link to={backTo} className="text-xs font-bold text-indigo-600">← Back to Funds</Link>}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accounts &amp; Cash in Hand</h1>
          <p className="text-xs text-slate-400 font-semibold">Where the Samaj's money is, account by account.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => open('account', emptyAccount)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">+ Account</button>
          <button onClick={() => open('transfer', emptyTransfer)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Deposit / Transfer</button>
          <button onClick={() => open('entry', emptyEntry)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold">Manual Entry</button>
        </div>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[['Total Balance', summary.total], ['Cash in Hand', summary.cash], ['Bank Balance', summary.bank], ['Online Balance', summary.online]].map(([t, v]) => (
              <div key={t} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t}</p>
                <p className="text-xl font-black text-slate-900">{inr(v)}</p>
              </div>
            ))}
          </div>
          {summary.lowBalanceAccounts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 font-semibold">
              Low balance: {summary.lowBalanceAccounts.map(a => `${a.name} (${inr(a.currentBalance)} &lt; ${inr(a.lowBalanceLimit)})`).join(', ')}
            </div>
          )}
          {summary.byLocation.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {summary.byLocation.map(l => (
                <span key={l.city} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-600">
                  {l.city}: <span className="text-indigo-700">{inr(l.balance)}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>{['Account', 'Type', 'Location', 'Details', 'Opening', 'Credits', 'Debits', 'Balance', 'Status', ''].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {accounts.length === 0 && <tr><td colSpan="10" className="px-3 py-6 text-center text-slate-400">No accounts yet. Add a Cash, Bank or Online account to start.</td></tr>}
            {accounts.map(a => (
              <tr key={a._id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-bold text-slate-800">{a.name}</td>
                <td className="px-3 py-2">{a.type}</td>
                <td className="px-3 py-2">{a.city || '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {a.type === 'Bank' ? [a.bankName, a.branch, a.ifsc, a.accountNumber].filter(Boolean).join(' · ') : (a.responsiblePersonName ? `Held by ${a.responsiblePersonName}` : '—')}
                </td>
                <td className="px-3 py-2">{inr(a.openingBalance)}</td>
                <td className="px-3 py-2 text-emerald-700">{inr(a.totalCredits)}</td>
                <td className="px-3 py-2 text-rose-700">{inr(a.totalDebits)}</td>
                <td className="px-3 py-2 font-black">{inr(a.currentBalance)}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleStatus(a)} className={`text-[11px] font-bold ${a.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>{a.status}</button>
                </td>
                <td className="px-3 py-2"><button onClick={() => setLedgerAccount(a._id)} className="text-xs font-bold text-indigo-600">Ledger</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-black text-slate-900">Transactions</h2>
        <select value={ledgerAccount} onChange={(e) => setLedgerAccount(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All accounts</option>
          {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>{['Date', 'Txn ID', 'Account', 'Kind', 'Description', 'Amount', 'By', 'Status', ''].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ledger.length === 0 && <tr><td colSpan="9" className="px-3 py-6 text-center text-slate-400">No transactions.</td></tr>}
            {ledger.map(e => (
              <tr key={e._id} className={`border-t border-slate-100 ${e.status === 'Cancelled' ? 'opacity-50 line-through' : ''}`}>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                <td className="px-3 py-2 text-xs">{e.transactionId}</td>
                <td className="px-3 py-2">{e.account?.name}</td>
                <td className="px-3 py-2">{e.kind}</td>
                <td className="px-3 py-2 text-slate-500">{e.description}</td>
                <td className={`px-3 py-2 font-bold ${e.direction === 'Credit' ? 'text-emerald-700' : 'text-rose-700'}`}>{e.direction === 'Credit' ? '+' : '−'}{inr(e.amount)}</td>
                <td className="px-3 py-2 text-xs">{e.createdByName}</td>
                <td className="px-3 py-2 text-xs">{e.status}</td>
                <td className="px-3 py-2">{e.status === 'Posted' && <button onClick={() => cancelEntry(e._id)} className="text-xs font-bold text-rose-600">Cancel</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3">
            <h3 className="text-lg font-black text-slate-900">
              {modal === 'account' ? 'Add Account' : modal === 'transfer' ? 'Cash Deposit / Transfer' : 'Manual Ledger Entry'}
            </h3>

            {modal === 'account' && (
              <>
                <div><label className={label}>Name</label><input required className={input} value={form.name} onChange={set('name')} placeholder="Samaj Bank Account – Indore" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={label}>Type</label>
                    <select className={input} value={form.type} onChange={set('type')}><option>Bank</option><option>Cash</option><option>Online</option></select></div>
                  <div><label className={label}>Opening balance</label><input type="number" min="0" className={input} value={form.openingBalance} onChange={set('openingBalance')} /></div>
                </div>
                {form.type === 'Bank' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Bank</label><input className={input} value={form.bankName} onChange={set('bankName')} /></div>
                    <div><label className={label}>Branch</label><input className={input} value={form.branch} onChange={set('branch')} /></div>
                    <div><label className={label}>IFSC</label><input className={input} value={form.ifsc} onChange={set('ifsc')} /></div>
                    <div><label className={label}>Account number</label><input className={input} value={form.accountNumber} onChange={set('accountNumber')} /></div>
                    <div><label className={label}>Holder</label><input className={input} value={form.accountHolder} onChange={set('accountHolder')} /></div>
                    <div><label className={label}>Account type</label>
                      <select className={input} value={form.accountType} onChange={set('accountType')}><option>Savings</option><option>Current</option></select></div>
                  </div>
                )}
                {form.type === 'Cash' && (
                  <div><label className={label}>Person responsible for the cash</label><input className={input} value={form.responsiblePersonName} onChange={set('responsiblePersonName')} /></div>
                )}
                <div><label className={label}>Low-balance alert below (₹)</label><input type="number" min="0" className={input} value={form.lowBalanceLimit} onChange={set('lowBalanceLimit')} /></div>
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Community ID</label><input required className={input} value={form.communityId} onChange={set('communityId')} /></div>
                    <div><label className={label}>Location / City</label><input className={input} value={form.city} onChange={set('city')} /></div>
                  </div>
                )}
              </>
            )}

            {modal === 'entry' && (
              <>
                <div><label className={label}>Account</label>
                  <select required className={input} value={form.accountId} onChange={set('accountId')}>
                    <option value="">Select…</option>{active.map(a => <option key={a._id} value={a._id}>{a.name} ({inr(a.currentBalance)})</option>)}
                  </select></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={label}>Direction</label><select className={input} value={form.direction} onChange={set('direction')}><option>Credit</option><option>Debit</option></select></div>
                  <div><label className={label}>Kind</label><select className={input} value={form.kind} onChange={set('kind')}><option>Adjustment</option><option>Refund</option><option>Expense</option><option>Income</option></select></div>
                  <div><label className={label}>Amount</label><input required type="number" min="1" className={input} value={form.amount} onChange={set('amount')} /></div>
                </div>
                <div><label className={label}>Description</label><input className={input} value={form.description} onChange={set('description')} /></div>
              </>
            )}

            {modal === 'transfer' && (
              <>
                <p className="text-xs text-slate-400 font-semibold">Cash → Bank is recorded as a deposit, not new income.</p>
                {[['fromAccountId', 'From'], ['toAccountId', 'To']].map(([k, t]) => (
                  <div key={k}><label className={label}>{t} account</label>
                    <select required className={input} value={form[k]} onChange={set(k)}>
                      <option value="">Select…</option>{active.map(a => <option key={a._id} value={a._id}>{a.name} ({inr(a.currentBalance)})</option>)}
                    </select></div>
                ))}
                <div><label className={label}>Amount</label><input required type="number" min="1" className={input} value={form.amount} onChange={set('amount')} /></div>
                <div><label className={label}>Note</label><input className={input} value={form.description} onChange={set('description')} /></div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Close</button>
              <button disabled={busy} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
