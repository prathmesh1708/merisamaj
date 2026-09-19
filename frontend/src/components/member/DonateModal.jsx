import React, { useState } from 'react';
import { X, Heart, ShieldCheck, CheckCircle2, Landmark, Copy, Check } from 'lucide-react';

export const DonateModal = ({
  isOpen,
  onClose,
  donation = null,
  onConfirmDonation,
  isSubmitting = false
}) => {
  const [amount, setAmount] = useState('500');
  const [donorName, setDonorName] = useState('');
  const [presetAmounts] = useState(['100', '500', '1000', '2500', '5000']);
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !donation) return null;

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return;
    onConfirmDonation(donation._id, { amount: num, donorName });
  };

  const acc = donation.accountDetails || donation.communityId?.accountDetails || donation.createdBy?.accountDetails;
  const receiver = donation.receiverInfo || (donation.createdBy ? {
    name: donation.createdBy.name,
    role: donation.createdBy.role === 'head' ? 'Community Head' : (donation.createdBy.role === 'sub_head' || donation.createdBy.accountType === 'local_head' ? 'Local Head' : (donation.createdBy.role || 'Community Head')),
    city: donation.createdBy.city || donation.city || ''
  } : null);
  const hasBankInfo = acc && (acc.accountNumber || acc.upiId || acc.bankName || acc.accountHolderName);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 bg-transparent" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[88vh] bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <Heart size={16} className="fill-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Support Noble Cause</h3>
              <p className="text-[11px] text-slate-500 font-semibold truncate max-w-[210px] sm:max-w-[260px]">{donation.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form with Scrollable Body & Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain text-xs font-semibold text-slate-700">
            {/* Preset Amount Chips */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Select Amount (₹)
              </label>
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`py-2 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all border cursor-pointer ${
                      amount === preset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Custom Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Optional Donor Name Input */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for Anonymous donation"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400 font-normal"
              />
            </div>

            {/* Beneficiary / Receiver (Head or Local Head) Bank & UPI Details */}
            {(hasBankInfo || receiver) && (
              <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/80 via-purple-50/70 to-emerald-50/40 border border-indigo-100/90 rounded-2xl space-y-2.5 shadow-2xs text-left">
                <div className="flex items-center justify-between border-b border-indigo-100/70 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Landmark size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wide">Receiver Account</span>
                        <span className="text-[9px] font-bold text-slate-400 hidden xs:inline">/ बैंक विवरण</span>
                      </div>
                      {receiver && (
                        <p className="text-[10.5px] text-slate-600 font-bold truncate">
                          {receiver.role || 'Creator'}: <span className="text-indigo-700 font-extrabold">{receiver.name || 'Samaj Head'}</span>
                          {receiver.city ? ` · ${receiver.city}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 ml-1">
                    Verified
                  </span>
                </div>

                {hasBankInfo ? (
                  <div className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                    {acc.accountHolderName && (
                      <div className="flex justify-between items-center bg-white/85 px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Holder Name</span>
                        <span className="font-extrabold text-slate-800 text-right truncate ml-2">{acc.accountHolderName}</span>
                      </div>
                    )}

                    {acc.bankName && (
                      <div className="flex justify-between items-center bg-white/85 px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Bank Name</span>
                        <span className="font-extrabold text-slate-800 text-right truncate ml-2">{acc.bankName}</span>
                      </div>
                    )}

                    {acc.accountNumber && (
                      <div className="flex justify-between items-center bg-white/85 px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">Account No.</span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="font-mono font-black text-slate-800 text-[11.5px] tracking-wider">{acc.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.accountNumber, 'accountNumber')}
                            className="p-1 hover:bg-indigo-50 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer border border-slate-200 bg-white shrink-0"
                            title="Copy Account Number"
                          >
                            {copiedField === 'accountNumber' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {acc.ifscCode && (
                      <div className="flex justify-between items-center bg-white/85 px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">IFSC Code</span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="font-mono font-black text-slate-800 text-[11.5px] tracking-wider uppercase">{acc.ifscCode}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.ifscCode, 'ifscCode')}
                            className="p-1 hover:bg-indigo-50 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer border border-slate-200 bg-white shrink-0"
                            title="Copy IFSC Code"
                          >
                            {copiedField === 'ifscCode' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {acc.upiId && (
                      <div className="flex justify-between items-center bg-white/85 px-3 py-2 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">UPI ID / VPA</span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="font-mono font-black text-indigo-600 text-[11.5px] truncate">{acc.upiId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(acc.upiId, 'upiId')}
                            className="p-1 hover:bg-indigo-50 rounded-md text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer border border-slate-200 bg-white shrink-0"
                            title="Copy UPI ID"
                          >
                            {copiedField === 'upiId' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/70 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium">
                    Funds will be securely credited to <strong className="text-slate-700">{receiver?.name || 'Community Head'}</strong>.
                  </div>
                )}
              </div>
            )}

            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-[10.5px] sm:text-[11px] text-emerald-800 font-bold">
              <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
              <span>100% Secure Transaction & Instant Digital Receipt</span>
            </div>
          </div>

          {/* Fixed Footer Action Buttons */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-2.5 pb-[max(14px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5"
            >
              <Heart size={14} className="fill-white" /> {isSubmitting ? 'Processing...' : `Pay ₹${Number(amount || 0).toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonateModal;
