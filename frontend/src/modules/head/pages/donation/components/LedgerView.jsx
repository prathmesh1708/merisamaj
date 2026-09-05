import React, { useState, useEffect } from 'react';
import { IndianRupee, ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import headDonationService from '../../../../../core/api/headDonationService';

const LedgerView = () => {
  const [ledger, setLedger] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const data = await headDonationService.getLedger();
        setLedger(data);
      } catch (error) {
        console.error('Failed to fetch ledger:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLedger();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading ledger data...</p>
      </div>
    );
  }

  if (!ledger) return null;

  const filteredTransactions = (ledger.transactions || []).filter(t => 
    (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.campaignTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Ledger Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 font-semibold mb-1 uppercase tracking-wider text-xs">Total Income (Received)</p>
            <h3 className="text-3xl font-black">₹{(ledger.totalIncome || 0).toLocaleString()}</h3>
          </div>
          <ArrowDownRight className="absolute -bottom-4 -right-4 text-emerald-400 opacity-30" size={100} />
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-rose-100 font-semibold mb-1 uppercase tracking-wider text-xs">Total Expenses (Utilized)</p>
            <h3 className="text-3xl font-black">₹{(ledger.totalExpenses || 0).toLocaleString()}</h3>
          </div>
          <ArrowUpRight className="absolute -bottom-4 -right-4 text-rose-400 opacity-30" size={100} />
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-200 font-semibold mb-1 uppercase tracking-wider text-xs">Available Balance</p>
            <h3 className="text-3xl font-black">₹{(ledger.availableBalance || 0).toLocaleString()}</h3>
          </div>
          <IndianRupee className="absolute -bottom-4 -right-4 text-indigo-400 opacity-30" size={100} />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Transaction History</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
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
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Transaction Details</th>
                <th className="px-6 py-4">Campaign</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn, idx) => (
                  <tr key={txn.id || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(txn.date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-sm">{txn.title || 'Transaction'}</p>
                      {txn.txnId && <p className="text-xs text-gray-500 font-mono mt-0.5">Ref: {txn.txnId}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {txn.campaignTitle || 'General'}
                    </td>
                    <td className="px-6 py-4">
                      {txn.type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <ArrowDownRight size={14} /> Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                          <ArrowUpRight size={14} /> Expense
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {txn.type === 'INCOME' ? '+' : '-'} ₹{(txn.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No transactions found.
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

export default LedgerView;
