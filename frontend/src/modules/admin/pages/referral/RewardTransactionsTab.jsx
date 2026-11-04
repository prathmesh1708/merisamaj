import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminReferralService } from '../../../../core/api/referralService';

export default function RewardTransactionsTab() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try { const res = await adminReferralService.getRewardTransactions({ limit: 100 }); setRows(res.data?.data?.transactions || []); }
    catch (e) { setError(e.response?.data?.message || 'Could not load reward transactions.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []);
  return <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-gray-900">Reward transaction ledger</h2><button onClick={load} className="rounded-lg border px-3 py-2 text-sm font-bold"><RefreshCw size={14} className="mr-1 inline"/>Refresh</button></div>
    {error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {busy ? <p className="py-8 text-center text-sm text-slate-500">Loading transactions…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-3">Member</th><th className="p-3">Type</th><th className="p-3">Points</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Description</th></tr></thead><tbody className="divide-y">{rows.map(row => <tr key={row._id}><td className="p-3">{row.userId?.name || 'Unknown'}<small className="block text-slate-500">{row.userId?.phone || ''}</small></td><td className="p-3">{row.kind} · {row.eventType}</td><td className={`p-3 font-bold ${row.kind === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>{row.kind === 'credit' ? '+' : '−'}{row.points}</td><td className="p-3">{row.status}</td><td className="p-3">{new Date(row.createdAt).toLocaleString()}</td><td className="p-3">{row.description || '—'}</td></tr>)}{!rows.length && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No reward transactions yet.</td></tr>}</tbody></table></div>}
  </section>;
}
