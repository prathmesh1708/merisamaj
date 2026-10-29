import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, MapPin, MessageCircle, UserRound, X, Hash } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import {
  RequestsGuard, PageShell, PageBody, StatusTabs, SearchBar, StatusBadge, RequestPhoto, InfoRow,
  LoadingState, EmptyState, ErrorState, DenySheet, Toast
} from './requestUi';
import { useToast, useHeadApi, timeAgo, canActOnFamilyRequest, familyStageNote } from './requestHelpers';

const EMPTY_TEXT = {
  all: 'No family requests yet',
  pending: 'No pending family requests',
  approved: 'No approved family requests yet',
  rejected: 'No rejected family requests'
};

const FamilyRequestCard = ({ request, level, busy, onApprove, onDeny }) => {
  const navigate = useNavigate();
  const openDetails = () => navigate(`/member/profile/requests/family/${request.id}`);
  const actionable = canActOnFamilyRequest(request, level);
  const stageNote = familyStageNote(request);

  return (
    <article className="rounded-3xl bg-white border border-slate-200/80 p-3.5 shadow-sm">
      <button type="button" onClick={openDetails} className="w-full flex items-start gap-3 text-left">
        <RequestPhoto src={request.avatar} name={request.name} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-extrabold text-slate-900 truncate">{request.name}</h3>
            {request.approvalStatus !== 'pending' && <StatusBadge status={request.approvalStatus} />}
          </div>
          <InfoRow icon={UserRound}>
            {request.relationToHead}{request.familyHead?.name ? ` of ${request.familyHead.name}` : ''}
          </InfoRow>
          <InfoRow icon={Hash}>{[request.memberCode, request.familyCode && `Family ${request.familyCode}`].filter(Boolean).join(' · ')}</InfoRow>
          {request.city && <InfoRow icon={MapPin}>{request.city}</InfoRow>}
          <InfoRow icon={Clock}>{timeAgo(request.createdAt)}{request.addedBy?.name ? ` · by ${request.addedBy.name}` : ''}</InfoRow>
        </div>
      </button>

      {stageNote && (
        <p className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-800">{stageNote}</p>
      )}

      {actionable ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onApprove(request)}
            disabled={busy}
            className="h-10 rounded-xl bg-emerald-600 text-white text-[12px] font-extrabold flex items-center justify-center gap-1 shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <Check size={15} /> Approve
          </button>
          <button
            type="button"
            onClick={() => navigate(`/member/chat/member/${request.addedBy.id}`)}
            disabled={!request.addedBy?.id}
            className="h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 text-[12px] font-extrabold flex items-center justify-center gap-1 hover:bg-sky-100 disabled:opacity-50"
          >
            <MessageCircle size={15} /> Message
          </button>
          <button
            type="button"
            onClick={() => onDeny(request)}
            disabled={busy}
            className="h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-[12px] font-extrabold flex items-center justify-center gap-1 hover:bg-rose-100 disabled:opacity-60"
          >
            <X size={15} /> Deny
          </button>
        </div>
      ) : (request.approvals?.communityHead?.note || request.approvals?.localHead?.note) && (
        <p className="mt-2.5 text-[11px] text-slate-500 italic">
          Note: {request.approvals?.communityHead?.note || request.approvals?.localHead?.note}
        </p>
      )}
    </article>
  );
};

const FamilyRequestsPage = () => {
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [denyTarget, setDenyTarget] = useState(null);
  const [toast, showToast] = useToast();

  const { data, loading, error, reload } = useHeadApi('/head/family-requests', { status });
  const requests = useMemo(() => data?.data || [], [data]);
  const counts = data?.counts || null;
  const level = data?.reviewerLevel || null;

  // The scoped list is small enough to filter on the device
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r => [r.name, r.city, r.memberCode, r.familyCode, r.relationToHead, r.addedBy?.name, r.familyHead?.name]
      .some(v => v && String(v).toLowerCase().includes(q)));
  }, [requests, search]);

  const changeStatus = (next) => {
    if (next === status) return;
    setStatus(next);
    reload(true);
  };

  const review = async (request, action, note = '') => {
    setBusyId(request.id);
    try {
      const res = await axiosPrivate.patch(`/head/family-requests/${request.id}`, { action, note });
      showToast(res.data?.message || 'Updated');
      setDenyTarget(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RequestsGuard>
      <PageShell>
        <PageHeader
          title="Family Request"
          subtitle={level === 'local' ? 'Approved requests go to the Community Head' : null}
          showBell={false}
        />
        <Toast toast={toast} />
        <PageBody>
          <StatusTabs value={status} onChange={changeStatus} counts={counts} />
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, city, member or family ID..." />

          {loading ? <LoadingState />
            : error ? <ErrorState message={error} onRetry={() => reload(true)} />
            : visible.length === 0 ? (
              <EmptyState
                title={search.trim() ? 'No requests match your search' : EMPTY_TEXT[status]}
                subtitle="Family members added in your authorized area will appear here."
              />
            ) : (
              <div className="space-y-3">
                {visible.map(request => (
                  <FamilyRequestCard
                    key={request.id}
                    request={request}
                    level={level}
                    busy={busyId === request.id}
                    onApprove={r => review(r, 'approve')}
                    onDeny={setDenyTarget}
                  />
                ))}
              </div>
            )}
        </PageBody>
        <DenySheet
          key={denyTarget?.id}
          target={denyTarget}
          requireReason
          busy={busyId === denyTarget?.id}
          onCancel={() => setDenyTarget(null)}
          onConfirm={note => review(denyTarget, 'reject', note)}
        />
      </PageShell>
    </RequestsGuard>
  );
};

export default FamilyRequestsPage;
