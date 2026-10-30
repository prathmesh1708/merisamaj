import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const OPTIONS = [
  { value: 'Divorced', hint: 'Divorce is final' },
  { value: 'Awaiting Divorce', hint: 'Divorce case is in progress' },
  { value: 'Separated', hint: 'Living separately' },
  { value: 'Widowed', hint: 'Spouse has passed away' },
];

/**
 * Bottom sheet for a married member whose marriage has ended: pick the new
 * marital status and reopen the profile for matchmaking.
 */
const ReopenProfileSheet = ({ onClose, onSubmit }) => {
  const [maritalStatus, setMaritalStatus] = useState('');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSubmit({ maritalStatus, note });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-black text-slate-800">Update Marital Status</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>
        <p className="text-[12px] text-slate-500 font-medium leading-relaxed mb-4">
          If your marriage has ended, choose your current status. Your profile will be active in matchmaking again and you can see new matches as per your subscription plan.
        </p>

        <div className="space-y-2">
          {OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                maritalStatus === opt.value ? 'border-rose-400 bg-rose-50' : 'border-slate-100'
              }`}
            >
              <input
                type="radio"
                name="reopenMaritalStatus"
                value={opt.value}
                checked={maritalStatus === opt.value}
                onChange={() => setMaritalStatus(opt.value)}
                className="accent-rose-500"
              />
              <span>
                <span className="block text-[14px] font-bold text-slate-800">{opt.value}</span>
                <span className="block text-[11px] text-slate-400 font-semibold">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
          placeholder="Anything you'd like to add (optional, private)"
          className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-[13px] text-slate-800 outline-none focus:border-rose-400 h-20 resize-none"
        />

        <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="w-4 h-4 mt-0.5 accent-rose-500" />
          <span className="text-[12px] text-slate-600 font-semibold leading-snug">
            I confirm this information is true. My earlier marriage will be removed from my profile and any published success story about it will be taken down.
          </span>
        </label>

        {error && <p className="text-[12px] font-bold text-rose-600 mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!maritalStatus || !confirmed || saving}
          className="w-full mt-4 py-3.5 rounded-2xl bg-rose-500 text-white text-[14px] font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Reopen My Profile
        </button>
      </div>
    </div>
  );
};

export default ReopenProfileSheet;
