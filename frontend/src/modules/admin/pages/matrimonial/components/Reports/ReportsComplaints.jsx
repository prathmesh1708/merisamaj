import React, { useState } from 'react';
import { Flag, CheckCircle, EyeOff, Ban, Loader2, ChevronDown } from 'lucide-react';
import { matrimonialService } from '../../services/matrimonialService';

const SEVERITY_COLORS = {
  low:    'bg-gray-500/20 text-gray-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high:   'bg-orange-500/20 text-orange-400',
  critical:'bg-red-500/20 text-red-400',
};

const STATUS_COLORS = {
  pending:     'bg-amber-500/20 text-amber-400',
  reviewed:    'bg-blue-500/20 text-blue-400',
  dismissed:   'bg-gray-500/20 text-gray-400',
  action_taken:'bg-emerald-500/20 text-emerald-400',
};

export const ReportsComplaints = ({ data }) => {
  const { reports = [], refreshReports } = data;
  const [filter, setFilter]     = useState('pending');
  const [actionId, setActionId] = useState(null);
  const [expandId, setExpandId] = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = reports.filter(r => !filter || r.status === filter);

  const handleAction = async (id, action, severity = undefined) => {
    setActionId(id);
    try {
      await matrimonialService.actionReport(id, { status: action, severity });
      showToast(`Report ${action} ✅`);
      await refreshReports?.();
    } catch (err) {
      showToast('Action failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {['', 'pending', 'reviewed', 'action_taken', 'dismissed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              filter === s ? 'bg-rose-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {s === '' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 font-semibold self-center">{filtered.length} reports</span>
      </div>

      {/* Report List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Flag size={28} className="text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No reports in this category.</p>
          </div>
        ) : filtered.map(report => {
          const isLoading = actionId === report._id;
          const isExpanded = expandId === report._id;

          return (
            <div key={report._id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <button className="w-full p-4 flex items-start gap-4 text-left hover:bg-slate-50/60 transition-colors"
                onClick={() => setExpandId(isExpanded ? null : report._id)}>
                {/* Reporter */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium}`}>
                      {report.severity || 'medium'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${STATUS_COLORS[report.status] || STATUS_COLORS.pending}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 mt-1.5 text-sm truncate">{report.reason}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reported by: <span className="text-slate-700 font-semibold">{report.reporterId?.name || '—'}</span> ·
                    Reported: <span className="text-slate-700 font-semibold">{report.reportedUserId?.name || '—'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                  {report.description && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Description</p>
                      <p className="text-sm text-slate-800 font-semibold">{report.description}</p>
                    </div>
                  )}
                  {report.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleAction(report._id, 'action_taken')} disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-40 transition-colors shadow-2xs">
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Take Action
                      </button>
                      <button onClick={() => handleAction(report._id, 'reviewed')} disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 disabled:opacity-40 transition-colors shadow-2xs">
                        Mark Reviewed
                      </button>
                      <button onClick={() => handleAction(report._id, 'dismissed')} disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 disabled:opacity-40 transition-colors shadow-2xs">
                        <EyeOff size={12} /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsComplaints;
