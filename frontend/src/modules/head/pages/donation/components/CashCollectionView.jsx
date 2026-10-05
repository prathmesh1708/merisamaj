import React, { useState, useEffect } from 'react';
import { Wallet, Search, CheckCircle2, User, Hash } from 'lucide-react';
import headDonationService from '../../../../../core/api/headDonationService';

const CashCollectionView = () => {
  const [pending, setPending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collectingId, setCollectingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const data = await headDonationService.getPendingCashDonations();
      setPending(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch pending cash donations:', error);
      setPending([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleCollect = async (donationId) => {
    setCollectingId(donationId);
    const donorName = pending.find(d => d.id === donationId)?.donorName || 'donor';
    try {
      const result = await headDonationService.collectCashDonation(donationId);
      setToast(`Collected ₹${(result.amount || 0).toLocaleString()} from ${donorName} — marked as Cash Collected.`);
      setTimeout(() => setToast(null), 4000);
      setPending(prev => prev.filter(d => d.id !== donationId));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to collect cash donation. You may not have access to this donor.');
    } finally {
      setCollectingId(null);
    }
  };

  const filtered = pending.filter(d =>
    (d.donorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.campaignTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading pending cash donations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && (
        <div className="px-5 py-3 rounded-2xl shadow-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-amber-100 font-semibold mb-1 uppercase tracking-wider text-xs">Pending Cash Collections (In Your Hierarchy)</p>
          <h3 className="text-3xl font-black">{pending.length} Pledge{pending.length === 1 ? '' : 's'}</h3>
          <p className="text-amber-50 text-xs font-semibold mt-1">
            ₹{pending.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()} awaiting collection
          </p>
        </div>
        <Wallet className="absolute -bottom-4 -right-4 text-amber-300 opacity-30" size={100} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Pending Cash Donations</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
            <input
              type="text"
              placeholder="Search by donor or campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              className="pr-4 py-2 rounded-xl border border-gray-200 focus:border-brand-primary outline-none transition-all text-sm w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Donor</th>
                <th className="px-6 py-4">Campaign</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Collection Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" /> {d.donorName}
                      </p>
                      {d.donorCity && <p className="text-xs text-gray-500 mt-0.5">{d.donorCity}</p>}
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                        <Hash size={10} /> {d.donationId}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.campaignTitle || 'General'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                        <Wallet size={13} /> Cash
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">
                      ₹{(d.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCollect(d.id)}
                        disabled={collectingId === d.id}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      >
                        {collectingId === d.id ? 'Collecting...' : 'Collect Cash'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No pending cash donations to collect right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashCollectionView;
