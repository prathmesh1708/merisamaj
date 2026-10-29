import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, MapPin, MessageCircle, MoreVertical, UserRound, X, Eye, IdCard } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import {
  RequestsGuard, PageShell, PageBody, StatusTabs, SearchBar, StatusBadge, RequestPhoto, InfoRow,
  LoadingState, EmptyState, ErrorState, DenySheet, Toast
} from './requestUi';
import { useToast, useHeadApi, timeAgo, memberRequestStatus } from './requestHelpers';

const EMPTY_TEXT = {
  all: 'No membership requests yet',
  pending: 'No pending member requests',
  approved: 'No approved requests yet',
  rejected: 'No rejected requests'
};

const MemberRequestCard = ({ member, busy, onApprove, onDeny }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const id = member._id;
  const status = memberRequestStatus(member);
  const openDetails = () => navigate(`/member/profile/requests/members/${id}`);

  return (
    <article className="rounded-3xl bg-white border border-slate-200/80 p-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <button type="button" onClick={openDetails} className="shrink-0">
          <RequestPhoto src={member.avatar} name={member.name} />
        </button>
        <button type="button" onClick={openDetails} className="min-w-0 flex-1 text-left space-y-1">
          <h3 className="text-[15px] font-extrabold text-slate-900 truncate">{member.name || 'New member'}</h3>
          <InfoRow icon={UserRound}>{member.subCommunity || member.communityId?.name || 'Community Member'}</InfoRow>
          {(member.city || member.state) && <InfoRow icon={MapPin}>{[member.city, member.state].filter(Boolean).join(', ')}</InfoRow>}
          <InfoRow icon={Clock}>{timeAgo(member.createdAt)}</InfoRow>
        </button>
        <div className="relative shrink-0 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="More options"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical size={17} />
          </button>
          {status !== 'pending' && <StatusBadge status={status} />}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5">
                {[
                  { icon: Eye, label: 'Request details', onClick: openDetails },
                  { icon: IdCard, label: 'Full profile', onClick: () => navigate(`/member/profile/requests/members/${id}/profile`) },
                  { icon: MessageCircle, label: 'Chat', onClick: () => navigate(`/member/chat/member/${id}`) }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setMenuOpen(false); item.onClick(); }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <item.icon size={15} className="text-slate-400" /> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {status === 'pending' ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onApprove(member)}
            disabled={busy}
            className="h-10 rounded-xl bg-emerald-600 text-white text-[12px] font-extrabold flex items-center justify-center gap-1 shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <Check size={15} /> Approve
          </button>
          <button
            type="button"
            onClick={() => navigate(`/member/chat/member/${id}`)}
            className="h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 text-[12px] font-extrabold flex items-center justify-center gap-1 hover:bg-sky-100"
          >
            <MessageCircle size={15} /> Message
          </button>
          <button
            type="button"
            onClick={() => onDeny(member)}
            disabled={busy}
            className="h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-[12px] font-extrabold flex items-center justify-center gap-1 hover:bg-rose-100 disabled:opacity-60"
          >
            <X size={15} /> Deny
          </button>
        </div>
      ) : member.membershipReview?.at && (
        <p className="mt-2.5 text-[11px] text-slate-500">
          {status === 'approved' ? 'Approved' : 'Rejected'}
          {member.membershipReview.by?.name ? ` by ${member.membershipReview.by.name}` : ''} · {timeAgo(member.membershipReview.at)}
          {member.membershipReview.note ? ` — “${member.membershipReview.note}”` : ''}
        </p>
      )}
    </article>
  );
};

const MemberRequestsPage = () => {
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);
  const [toast, showToast] = useToast();

  // Debounce typing so every keystroke doesn't hit the server
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useHeadApi('/head/dashboard/members/requests', { status, search: query || undefined, limit: 100 });
  const requests = data?.data || [];
  const counts = data?.counts || null;

  const changeStatus = (next) => {
    if (next === status) return;
    setStatus(next);
    reload(true);
  };

  const review = async (member, action, note = '') => {
    setBusyId(member._id);
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${member._id}/${action}`, action === 'reject' ? { note } : undefined);
      showToast(`${member.name || 'Member'} ${action === 'approve' ? 'approved' : 'denied'}.`);
      setDenyTarget(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.message || `Could not ${action} this request.`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RequestsGuard>
      <PageShell>
        <PageHeader title="Community Member Request" showBell={false} />
        <Toast toast={toast} />
        <PageBody>
          <StatusTabs value={status} onChange={changeStatus} counts={counts} />
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city or community..." />

          {loading ? <LoadingState />
            : error ? <ErrorState message={error} onRetry={() => reload(true)} />
            : requests.length === 0 ? (
              <EmptyState
                title={query ? 'No requests match your search' : EMPTY_TEXT[status]}
                subtitle="New requests for your authorized area will appear here."
              />
            ) : (
              <div className="space-y-3">
                {requests.map(member => (
                  <MemberRequestCard
                    key={member._id}
                    member={member}
                    busy={busyId === member._id}
                    onApprove={m => review(m, 'approve')}
                    onDeny={setDenyTarget}
                  />
                ))}
              </div>
            )}
        </PageBody>
        <DenySheet
          key={denyTarget?._id}
          target={denyTarget}
          busy={busyId === denyTarget?._id}
          onCancel={() => setDenyTarget(null)}
          onConfirm={note => review(denyTarget, 'reject', note)}
        />
      </PageShell>
    </RequestsGuard>
  );
};

export default MemberRequestsPage;
