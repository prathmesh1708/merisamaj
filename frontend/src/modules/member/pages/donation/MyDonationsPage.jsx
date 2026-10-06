import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useDonation } from './DonationContext';

const MyDonationsPage = () => {
  const navigate = useNavigate();
  const { donationHistory } = useDonation();
  
  // Tabs: 'all' (सभी) | 'once' (एक बार) | 'regular' (नियमित)
  const [activeTab, setActiveTab] = useState('all');

  const filteredHistory = donationHistory.filter(txn => {
    if (activeTab === 'once') return txn.type === 'One-time';
    if (activeTab === 'regular') return txn.type === 'Regular';
    return true;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-surface pb-16">
      {/* Header */}
      <div className="bg-card border-b border-gray-100 flex items-center justify-between px-4 h-14 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/member/donation')} className="p-1 -ml-1 press-scale">
            <ArrowLeft size={22} className="text-text-primary" />
          </button>
          <h1 className="text-base font-bold text-text-primary">My Donations</h1>
        </div>
        <div className="text-xs font-semibold text-text-secondary bg-gray-100 px-3 py-1 rounded-full">
          Total ({donationHistory.length})
        </div>
      </div>

      <div className="px-4 pt-5 max-w-xl mx-auto space-y-5">
        {/* Segmented control tabs */}
        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'all' 
                ? 'bg-white text-text-primary shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('once')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'once' 
                ? 'bg-white text-text-primary shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            One-time
          </button>
          <button 
            onClick={() => setActiveTab('regular')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'regular' 
                ? 'bg-white text-text-primary shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Regular
          </button>
        </div>

        {/* History List */}
        <div className="space-y-3.5">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(txn => (
              <div 
                key={txn.id} 
                className="bg-card rounded-2xl p-4 border border-gray-100/80 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                    <h4 className="text-xs font-bold text-text-primary">{txn.purposeTitle}</h4>
                  </div>
                  
                  <div className="text-[10px] text-text-secondary space-y-0.5 leading-relaxed">
                    <p className="flex items-center gap-1">
                      <Calendar size={11} className="text-gray-400" />
                      {txn.date} • {txn.time}
                    </p>
                    <p className="flex items-center gap-1 font-mono">
                      <FileText size={11} className="text-gray-400" />
                      {txn.receiptNo || txn.txnId}
                    </p>
                    {txn.isManual && (
                      <p className="text-[10px] font-semibold text-emerald-700">
                        {txn.paymentMode} · collected by {txn.collectedByName}{txn.collectedByRole ? ` (${txn.collectedByRole})` : ''}
                      </p>
                    )}
                    {!txn.isManual && txn.paymentMode === 'Cash' && txn.collectionStatus === 'pending' && (
                      <p className="text-[10px] font-semibold text-amber-600">Cash pledge, waiting to be collected</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span className="text-xs font-black text-emerald-600 block bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                    + ₹{formatCurrency(txn.amount)}
                  </span>
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block bg-gray-50 border border-gray-100 px-1 py-0.5 rounded">
                    {txn.type}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-card rounded-2xl p-8 border border-gray-100 text-center space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xs font-bold text-text-primary">No donations found</h4>
              <p className="text-[10px] text-text-secondary max-w-[200px] mx-auto">No transaction history currently available in the selected category.</p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {filteredHistory.length > 0 && (
          <button 
            onClick={() => alert('All donation history is displayed.')}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-text-secondary text-xs font-bold rounded-2xl border border-gray-200/50 press-scale"
          >
            Load More
          </button>
        )}

      </div>
    </div>
  );
};

export default MyDonationsPage;
