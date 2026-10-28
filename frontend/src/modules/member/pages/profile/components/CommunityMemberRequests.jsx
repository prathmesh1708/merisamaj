import { useCallback, useEffect, useState } from 'react';
import { HeadFamilyRequests } from '../../../../head/pages/census/HeadFamilyRequests';
import { Check, ChevronDown, Loader2, MapPin, Phone, RefreshCw, UserRound, X, XCircle, AlertCircle } from 'lucide-react';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';

export const CommunityMemberRequests = ({ onCountChange }) => {
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [notice, setNotice] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      // This is the existing scoped Head dashboard API; its query applies both
      // community and Local Head city scope on the server.
      const res = await axiosPrivate.get('/head/dashboard/stats?limit=50');
      const data = res.data?.data || {};
      const pendingList = data.pendingMembersList || [];
      const count = data.summary?.pendingMembersCount ?? pendingList.length;
      setRequests(pendingList);
      setPendingCount(count);
      onCountChange?.(count);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load member requests.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const review = async (member, action) => {
    const id = member._id || member.id;
    setBusyId(id);
    setNotice('');
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${id}/${action}`);
      setRequests(current => current.filter(item => (item._id || item.id) !== id));
      const nextCount = Math.max(0, pendingCount - 1);
      setPendingCount(nextCount);
      onCountChange?.(nextCount);
      setNotice(`${member.name || 'Member'} ${action === 'approve' ? 'approved successfully' : 'rejected'}.`);
      setRejectingId(null);
      // Reconcile with the server
      const res = await axiosPrivate.get('/head/dashboard/stats?limit=50');
      const data = res.data?.data || {};
      const reconciledList = data.pendingMembersList || [];
      const reconciledCount = data.summary?.pendingMembersCount ?? reconciledList.length;
      setRequests(reconciledList);
      setPendingCount(reconciledCount);
      onCountChange?.(reconciledCount);
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${action} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">Pending membership approvals</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {pendingCount} request{pendingCount === 1 ? '' : 's'} in your authorized area
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadRequests(); }}
          disabled={loading}
          aria-label="Refresh requests"
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {notice && (
        <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200/60 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200/60 px-3.5 py-2.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle size={15} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin text-purple-600" /> Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
          <UserRound size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No pending member requests</p>
          <p className="text-xs text-slate-400 mt-1">New requests for your authorized area will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(member => {
            const id = member._id || member.id;
            const isRejecting = rejectingId === id;
            return (
              <article key={id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <UserRound size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-extrabold text-slate-800 truncate">{member.name || 'New member'}</h4>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                      {member.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} />
                          {member.phone}
                        </span>
                      )}
                      {(member.city || member.state) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {[member.city, member.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {member.communityId?.name && (
                        <span className="font-semibold text-purple-700">{member.communityId.name}</span>
                      )}
                    </div>
                    {(member.email || member.subCommunity || member.gotra) && (
                      <p className="mt-2 text-[11px] text-slate-500 break-words">
                        {[member.email, member.subCommunity, member.gotra].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === id ? null : id)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 transition-colors"
                >
                  {expandedId === id ? 'Hide request details' : 'View request details'}
                  <ChevronDown size={14} className={expandedId === id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>

                {expandedId === id && (
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 p-3 text-[11px] border border-slate-100">
                    {[
                      ['Gender', member.gender],
                      ['Date of birth', member.dob ? new Date(member.dob).toLocaleDateString() : ''],
                      ['Marital status', member.maritalStatus],
                      ['Gotra', member.gotra],
                      ['Education', member.qualification],
                      ['Profession', member.profession],
                      ['Company', member.company],
                      ['Email', member.email],
                      ['Address', member.detailedAddress || member.streetAddress || member.address],
                      ['Referred by', member.referredBy?.name],
                      ['Requested', member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '']
                    ]
                      .filter(([, value]) => Boolean(value))
                      .map(([label, value]) => (
                        <p key={label} className="min-w-0">
                          <span className="text-slate-400 font-medium">{label}: </span>
                          <span className="font-bold text-slate-700 break-words">{value}</span>
                        </p>
                      ))}
                  </div>
                )}

                {isRejecting ? (
                  <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 space-y-2">
                    <p className="text-xs font-bold text-rose-800">Are you sure you want to reject this request?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingId(null)}
                        disabled={busyId === id}
                        className="flex-1 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => review(member, 'reject')}
                        disabled={busyId === id}
                        className="flex-1 h-9 rounded-xl bg-rose-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-rose-700 transition-colors disabled:opacity-60"
                      >
                        {busyId === id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={14} />} Confirm Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectingId(id)}
                      disabled={busyId === id}
                      className="h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/70 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => review(member, 'approve')}
                      disabled={busyId === id}
                      className="h-10 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
                    >
                      {busyId === id ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />} Approve
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const HeadRequestOverlay = ({ type, onClose, onCountChange }) => (
  <div
    className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
    onClick={onClose}
  >
    <section
      className="w-full sm:max-w-3xl md:max-w-4xl max-h-[92dvh] bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-pop"
      onClick={e => e.stopPropagation()}
    >
      <header className="shrink-0 px-4 sm:px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            {type === 'family' ? 'Family Requests' : 'Community Member Requests'}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {type === 'family' ? 'Review and manage family membership additions' : 'Review and manage pending community member registrations'}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close requests"
          className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center font-bold"
        >
          <X size={18} />
        </button>
      </header>
      <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 flex-1">
        {type === 'family' ? (
          <HeadFamilyRequests onCountChange={onCountChange} />
        ) : (
          <CommunityMemberRequests onCountChange={onCountChange} />
        )}
      </div>
    </section>
  </div>
);
