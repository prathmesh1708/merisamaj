import { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldAlert, Loader2, RefreshCw, Trash2, Ban, X } from 'lucide-react';
import { safetyReportService } from '../../../../core/api/safetyReportService';

// Member reports about posts, comments, stories, chat messages and members.
// Child-safety / underage reports are "urgent": their content is already hidden
// and they are listed first (Child Safety Standards Policy, section 6).
const REASON_LABELS = {
  child_safety: 'Child safety', underage: 'Under 18', sexual_content: 'Sexual content',
  harassment: 'Harassment', hate: 'Hate speech', violence: 'Violence', spam: 'Spam / scam',
  fake_profile: 'Fake account', other: 'Other'
};
const TYPE_LABELS = { post: 'Post', comment: 'Comment', story: 'Story', message: 'Chat message', user: 'Member' };
const TABS = [['pending', 'Open'], ['actioned', 'Actioned'], ['dismissed', 'Dismissed'], ['all', 'All']];

const timeAgo = (d) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} h ago` : new Date(d).toLocaleDateString();
};

export const SafetyReportsPage = () => {
  const [status, setStatus] = useState('pending');
  const [reports, setReports] = useState([]);
  const [urgentPending, setUrgentPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  // Callers set `loading` themselves (tab click / refresh), so the effect below
  // only starts the request.
  const load = useCallback(async (which) => {
    try {
      const res = await safetyReportService.list(which);
      setReports(res.data || []);
      setUrgentPending(res.urgentPending || 0);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    safetyReportService.list(status)
      .then(res => { if (!cancelled) { setReports(res.data || []); setUrgentPending(res.urgentPending || 0); } })
      .catch(err => { if (!cancelled) setMessage(err?.response?.data?.message || 'Could not load reports.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status]);

  const act = async (report, action) => {
    const confirmText = {
      remove: 'Remove this content?',
      remove_and_block: `Remove the content AND block ${report.targetUserId?.name || 'this member'}'s account?`,
      dismiss: 'Dismiss this report? Hidden content will be shown again.'
    }[action];
    if (!window.confirm(confirmText)) return;
    const note = action === 'dismiss' ? '' : (window.prompt('Note for the record (optional). For child abuse material, note the police / cybercrime.gov.in report number.') || '');
    setBusyId(report._id);
    try {
      const res = await safetyReportService.resolve(report._id, action, note);
      setMessage(res.message || 'Done.');
      await load(status);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Action failed.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><Flag size={22} className="text-rose-500" /> Safety Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Reports from members about posts, comments, stories, chats and accounts. Child-safety reports come first.</p>
        </div>
        <button onClick={() => { setLoading(true); load(status); }} className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {urgentPending > 0 && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex gap-3">
          <ShieldAlert className="text-rose-600 shrink-0" size={22} />
          <div className="text-sm text-rose-800">
            <p className="font-black">{urgentPending} urgent child-safety {urgentPending === 1 ? 'report' : 'reports'} waiting.</p>
            <p className="mt-0.5">Review within 24 hours. Child sexual abuse material must also be reported to the police or <a className="underline font-bold" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">cybercrime.gov.in</a> (POCSO Act s.19). Do not download or forward it.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map(([value, label]) => (
          <button key={value} onClick={() => { if (value !== status) { setLoading(true); setStatus(value); } }}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${status === value ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-xl bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm font-semibold">No reports here.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const urgent = r.priority === 'urgent';
            return (
              <div key={r._id} className={`rounded-2xl border bg-white p-4 shadow-sm ${urgent ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {urgent && <span className="text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md">Urgent</span>}
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{TYPE_LABELS[r.targetType] || r.targetType}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${urgent ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{REASON_LABELS[r.reason] || r.reason}</span>
                  {r.contentHidden && <span className="text-[11px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-md">Hidden pending review</span>}
                  <span className="text-[11px] font-semibold text-slate-400 ml-auto">{timeAgo(r.createdAt)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <div className="min-w-0 space-y-1.5 text-sm">
                    <p className="text-slate-800 break-words"><span className="font-bold text-slate-500">Content: </span>{r.snapshot || '—'}</p>
                    <p className="text-slate-600"><span className="font-bold text-slate-500">Reported member: </span>{r.targetUserId?.name || '—'}{r.targetUserId?.phone ? ` · ${r.targetUserId.phone}` : ''}{r.targetUserId?.accountStatus === 'blocked' ? ' · BLOCKED' : ''}</p>
                    <p className="text-slate-600"><span className="font-bold text-slate-500">Reported by: </span>{r.reporterId?.name || '—'}</p>
                    {r.details && <p className="text-slate-600 break-words"><span className="font-bold text-slate-500">Details: </span>{r.details}</p>}
                    {r.status !== 'pending' && (
                      <p className="text-slate-500 text-xs"><span className="font-bold">{r.status === 'actioned' ? 'Actioned' : 'Dismissed'}</span>{r.resolvedBy?.name ? ` by ${r.resolvedBy.name}` : ''}{r.resolvedAt ? ` · ${new Date(r.resolvedAt).toLocaleString()}` : ''}{r.resolution ? ` · ${r.resolution}` : ''}</p>
                    )}
                    {r.targetType === 'post' && <a className="text-xs font-bold text-purple-600 hover:underline" href={`/admin/social/post/${r.targetId}`}>Open post</a>}
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <button disabled={busyId === r._id} onClick={() => act(r, 'remove')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50">
                        <Trash2 size={14} /> Remove
                      </button>
                      {r.targetUserId && (
                        <button disabled={busyId === r._id} onClick={() => act(r, 'remove_and_block')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50">
                          <Ban size={14} /> Remove + block
                        </button>
                      )}
                      <button disabled={busyId === r._id} onClick={() => act(r, 'dismiss')}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SafetyReportsPage;
