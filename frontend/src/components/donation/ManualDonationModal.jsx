import React, { useState } from 'react';
import { axiosPrivate } from '../../core/api/axiosPrivate';

const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];
const blank = { campaignId: '', donorName: '', donorPhone: '', donorAddress: '', amount: '', paymentMode: 'Cash', notes: '' };

/**
 * Record a donation handed over in person. Works for Community Head, Local Head and Admin
 * (all use the same endpoint; the server checks the role and community/city scope).
 * If the phone number matches a member, the donation is linked to that member's account
 * so they see it, with who collected it, in their own donation history.
 */
export default function ManualDonationModal({ open, onClose, campaigns = [], onSaved }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  if (!open) return null;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const close = () => { setForm(blank); setError(''); setDone(null); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await axiosPrivate.post('/head/donations/manual', form);
      setDone(res.data.data);
      if (onSaved) onSaved(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the donation.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-800';
  const label = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1';
  const usable = campaigns.filter(c => !['Draft', 'Cancelled', 'Archived'].includes(c.status));

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6">
        {done ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">🙏</div>
            <h3 className="text-lg font-black text-slate-900">Donation recorded</h3>
            <p className="text-sm text-slate-600">₹{done.amount.toLocaleString('en-IN')} · Receipt <b>{done.receiptNo}</b></p>
            <p className="text-xs font-semibold text-slate-500">
              {done.donorLinked
                ? `Linked to ${done.donorMemberName}'s account. They can see it in My Donations and were notified.`
                : 'No member account matched this phone number, so it is saved with the donor details only.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button onClick={() => { setDone(null); setForm(blank); }} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold">Add another</button>
              <button onClick={close} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h3 className="text-lg font-black text-slate-900">Record manual donation</h3>
            <p className="text-xs text-slate-500 font-semibold -mt-1">For a donation received in person. It counts toward the campaign immediately.</p>

            <div>
              <label className={label}>Campaign *</label>
              <select required className={input} value={form.campaignId} onChange={set('campaignId')}>
                <option value="">Select a campaign…</option>
                {usable.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Donor name *</label><input required className={input} value={form.donorName} onChange={set('donorName')} /></div>
              <div><label className={label}>Mobile number</label><input className={input} inputMode="numeric" placeholder="Links to a member if it matches" value={form.donorPhone} onChange={set('donorPhone')} /></div>
            </div>
            <div><label className={label}>Address / location</label><input className={input} value={form.donorAddress} onChange={set('donorAddress')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Amount (₹) *</label><input required type="number" min="1" className={input} value={form.amount} onChange={set('amount')} /></div>
              <div><label className={label}>Payment mode</label>
                <select className={input} value={form.paymentMode} onChange={set('paymentMode')}>{MODES.map(m => <option key={m}>{m}</option>)}</select></div>
            </div>
            <div><label className={label}>Notes</label><input className={input} value={form.notes} onChange={set('notes')} /></div>

            {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button>
              <button disabled={saving} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Record donation'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
