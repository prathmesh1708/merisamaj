import React, { useState, useEffect } from 'react';
import { Wallet, Landmark, User, CreditCard, ShieldCheck, Loader, Save, CheckCircle, AlertCircle, X } from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

export const BankAccountSettings = () => {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Load community bank details on mount
  useEffect(() => {
    const fetchBankDetails = async () => {
      try {
        setLoading(true);
        const res = await axiosPrivate.get('/head/dashboard/community/details');
        const data = res.data?.data || res.data;
        if (data && data.accountDetails) {
          setFormData({
            accountHolderName: data.accountDetails.accountHolderName || '',
            bankName: data.accountDetails.bankName || '',
            accountNumber: data.accountDetails.accountNumber || '',
            ifscCode: data.accountDetails.ifscCode || '',
            upiId: data.accountDetails.upiId || ''
          });
        }
      } catch (err) {
        console.error('Failed to load community bank details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBankDetails();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const res = await axiosPrivate.put('/head/dashboard/community/account-details', {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        upiId: formData.upiId,
        accountHolderName: formData.accountHolderName
      });

      if (res.data?.status === 'success' || res.status === 200) {
        setToast({ message: 'Bank account details updated successfully!', type: 'success' });
      } else {
        setToast({ message: 'Failed to update bank details', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving bank details:', err);
      setToast({ message: err.response?.data?.message || 'Error saving details. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin text-purple-600" size={24} />
        <span className="text-xs font-semibold text-slate-500 ml-2">Loading bank details...</span>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all";

  return (
    <div className="p-6 space-y-6 relative">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl animate-bounce ${
          toast.type === 'success' 
            ? 'bg-emerald-500 text-white border-emerald-400/40' 
            : 'bg-red-500 text-white border-red-400/40'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Wallet size={20} className="text-purple-600" />
          Bank Account Details
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Set up the bank account where donation funds should be received. These details will be visible to members on the donation screen.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <User size={14} className="text-purple-500" />
            Account Holder Name
          </label>
          <input
            type="text"
            required
            value={formData.accountHolderName}
            onChange={e => handleChange('accountHolderName', e.target.value)}
            placeholder="e.g. Agrawal Samaj Welfare Trust"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Landmark size={14} className="text-purple-500" />
            Bank Name
          </label>
          <input
            type="text"
            required
            value={formData.bankName}
            onChange={e => handleChange('bankName', e.target.value)}
            placeholder="e.g. State Bank of India"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <CreditCard size={14} className="text-purple-500" />
              Account Number
            </label>
            <input
              type="text"
              required
              value={formData.accountNumber}
              onChange={e => handleChange('accountNumber', e.target.value)}
              placeholder="e.g. 10002345678"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Landmark size={14} className="text-purple-500" />
              IFSC Code
            </label>
            <input
              type="text"
              required
              value={formData.ifscCode}
              onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Wallet size={14} className="text-purple-500" />
            UPI ID (Optional)
          </label>
          <input
            type="text"
            value={formData.upiId}
            onChange={e => handleChange('upiId', e.target.value)}
            placeholder="e.g. agrawalsamaj@sbi"
            className={inputClass}
          />
        </div>

        <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-purple-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-purple-700 font-semibold leading-relaxed">
            Please ensure the bank account details are correct. They will be displayed to community members as the official bank details when they initiate a donation.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? <Loader size={14} className="animate-spin text-white" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Bank Details'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankAccountSettings;
