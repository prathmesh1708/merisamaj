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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Heart size={18} className="fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Support Noble Cause</h3>
              <p className="text-[11px] text-slate-500 font-semibold line-clamp-1 max-w-[220px]">{donation.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-semibold text-slate-700">
          {/* Preset Amount Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Amount (₹)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    amount === preset
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Custom Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Leave blank for Anonymous donation"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Bank Account Details of Community Head */}
          {donation.communityId?.accountDetails && (donation.communityId.accountDetails.accountNumber || donation.communityId.accountDetails.upiId) && (
            <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/80 rounded-2xl space-y-3 shadow-sm text-left">
              <div className="flex items-center gap-2">
                <Landmark size={15} className="text-indigo-600" />
                <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Official Bank Details (Community Head)
                </h4>
              </div>

              <div className="space-y-2 text-[11px] font-semibold text-slate-600">
                {donation.communityId.accountDetails.accountHolderName && (
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400">Holder Name</span>
                    <span className="font-bold text-slate-800">{donation.communityId.accountDetails.accountHolderName}</span>
                  </div>
                )}
                
                {donation.communityId.accountDetails.bankName && (
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400">Bank Name</span>
                    <span className="font-bold text-slate-800">{donation.communityId.accountDetails.bankName}</span>
                  </div>
                )}

                {donation.communityId.accountDetails.accountNumber && (
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400">Account No.</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{donation.communityId.accountDetails.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(donation.communityId.accountDetails.accountNumber, 'accountNumber')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copiedField === 'accountNumber' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                {donation.communityId.accountDetails.ifscCode && (
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400">IFSC Code</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{donation.communityId.accountDetails.ifscCode}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(donation.communityId.accountDetails.ifscCode, 'ifscCode')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Copy IFSC Code"
                      >
                        {copiedField === 'ifscCode' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                {donation.communityId.accountDetails.upiId && (
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400">UPI ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-600">{donation.communityId.accountDetails.upiId}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(donation.communityId.accountDetails.upiId, 'upiId')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedField === 'upiId' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800 font-bold">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>100% Secure Transaction & Instant Digital Receipt</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
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
