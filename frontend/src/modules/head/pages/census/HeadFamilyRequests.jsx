import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, UserCheck, UserX, Phone, CheckCircle, XCircle, RefreshCw, Sparkles, Link2, Clock, MapPin } from 'lucide-react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' }
];

const STAGE_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  skipped: 'bg-slate-50 text-slate-500 border-slate-200',
  overridden: 'bg-slate-50 text-slate-500 border-slate-200'
};

const LINK_LABELS = {
  linked: 'Linked account',
  invited: 'Invited (registered user)',
  not_registered: 'Not on app yet',
  declined: 'Declined invitation'
};

// Active = registered on ApniSamaj; Inactive = not registered yet; Dummy = no mobile number
const ACTIVITY_STYLES = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-rose-50 text-rose-600 border-rose-200' },
  dummy: { label: 'Dummy (no mobile)', className: 'bg-rose-50 text-rose-600 border-rose-200' }
};

const StageChip = ({ label, stage }) => (
  <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${STAGE_STYLES[stage?.status] || STAGE_STYLES.pending}`}>
    {label}: {stage?.status === 'overridden' ? 'skipped' : stage?.status || 'pending'}
  </span>
);

export const HeadFamilyRequests = () => {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [reviewerLevel, setReviewerLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // request being rejected
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axiosPrivate.get('/head/family-requests/stats')
      .then(res => { if (!cancelled) setStats(res.data?.data || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    axiosPrivate.get('/head/family-requests', { params: { status } })
      .then(res => {
        if (cancelled) return;
        setRequests(res.data?.data || []);
        setReviewerLevel(res.data?.reviewerLevel || null);
      })
      .catch(err => {
        if (!cancelled) showToast(err.response?.data?.message || 'Failed to load family requests', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [status, reloadKey]);

  const loadRequests = () => {
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  const changeStatus = (next) => {
    if (next === status) return;
    setLoading(true);
    setStatus(next);
  };

  const review = async (request, action, note = '') => {
    setBusyId(request.id);
    try {
      const res = await axiosPrivate.patch(`/head/family-requests/${request.id}`, { action, note });
      showToast(res.data?.message || 'Updated');
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setReloadKey(k => k + 1);
      setRejecting(null);
      setRejectNote('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white font-bold text-xs flex items-center gap-2 ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            <Sparkles size={16} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Family Tree Requests</h1>
            <p className="text-xs text-slate-500 font-medium">
              {reviewerLevel === 'local'
                ? 'Review family members added in your city. Approved requests go to the Community Head for final approval.'
                : 'Final approval for family members. Approved members appear in the Jangana.'}
            </p>
          </div>
        </div>
        <button
          onClick={loadRequests}
          className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-2xl hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Families', value: stats.totalFamilies, sub: 'Registered in system', icon: Users, className: 'text-indigo-600 bg-indigo-50' },
            { label: 'Active Members', value: stats.activeMembers, sub: 'Registered on ApniSamaj', icon: UserCheck, className: 'text-emerald-600 bg-emerald-50' },
            { label: 'Inactive / Dummy', value: stats.inactiveMembers + stats.dummyMembers, sub: `${stats.inactiveMembers} not registered · ${stats.dummyMembers} no mobile`, icon: UserX, className: 'text-rose-600 bg-rose-50' },
            { label: 'Total Population', value: stats.janganaCount, sub: `Jangana count · ${stats.pendingRequests} pending`, icon: User, className: 'text-violet-600 bg-violet-50' }
          ].map(card => (
            <div key={card.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${card.className}`}>
                <card.icon size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <h3 className="text-2xl font-black text-slate-900">{card.value.toLocaleString('en-IN')}</h3>
                <span className="text-[10px] text-slate-500 font-medium block truncate">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => changeStatus(tab.key)}
            className={`px-5 py-2.5 font-bold text-xs rounded-2xl transition-all ${
              status === tab.key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}{status === tab.key && !loading ? ` (${requests.length})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-10 text-center text-sm text-slate-500 border border-slate-200/80">Loading requests…</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80">
          <CheckCircle size={28} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No {status} family requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{r.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    <span className="font-bold text-indigo-600">{r.relationToHead}</span> of family head · Family <span className="font-bold text-slate-700">{r.familyCode}</span>
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-black">{r.memberCode}</span>
                  {ACTIVITY_STYLES[r.activityStatus] && (
                    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${ACTIVITY_STYLES[r.activityStatus].className}`}>
                      {ACTIVITY_STYLES[r.activityStatus].label}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
                <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {r.phone || 'No mobile'}</p>
                {r.city && <p className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {r.city}</p>}
                {r.dob && <p className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> DOB {new Date(r.dob).toLocaleDateString('en-IN')}</p>}
                <p className="flex items-center gap-1.5"><Link2 size={12} className="text-slate-400" /> {LINK_LABELS[r.linkStatus] || r.linkStatus}</p>
              </div>

              {r.addedBy && (
                <div className="flex items-center justify-between gap-2 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-3 py-2">
                  <p className="text-[11px] text-slate-600">
                    Requested by <span className="font-bold text-slate-800">{r.addedBy.name}</span>{r.addedBy.phone ? ` · ${r.addedBy.phone}` : ''}
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <StageChip label="Local Head" stage={r.approvals?.localHead} />
                <StageChip label="Community Head" stage={r.approvals?.communityHead} />
              </div>

              {(r.approvals?.localHead?.note || r.approvals?.communityHead?.note) && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: {r.approvals?.communityHead?.note || r.approvals?.localHead?.note}
                </p>
              )}

              {status === 'pending' && (
                rejecting?.id === r.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection (shared with the member)"
                      className="w-full text-xs border border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-indigo-400"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRejecting(null); setRejectNote(''); }}
                        className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-2xl hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!rejectNote.trim() || busyId === r.id}
                        onClick={() => review(r, 'reject', rejectNote)}
                        className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-2xl hover:bg-rose-700 disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => setRejecting(r)}
                      className="flex-1 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs rounded-2xl hover:bg-rose-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => review(r, 'approve')}
                      className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-2xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle size={14} /> {reviewerLevel === 'local' ? 'Approve & Forward' : 'Approve'}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeadFamilyRequests;
