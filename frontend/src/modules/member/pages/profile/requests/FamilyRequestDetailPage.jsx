import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase, CalendarDays, Check, Hash, Heart, IdCard, Link2, MapPin, MessageCircle, Phone, User, UserRound, Users, X
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import {
  RequestsGuard, PageShell, PageBody, RequestPhoto, InfoRow, StatusBadge, LoadingState, ErrorState,
  DenySheet, Toast, ActionTile
} from './requestUi';
import { useToast, useHeadApi, ageFrom, formatDate, timeAgo, canActOnFamilyRequest, familyStageNote } from './requestHelpers';

const LINK_LABELS = {
  linked: 'Registered on the app (linked)',
  invited: 'Registered on the app (invited)',
  not_registered: 'Not on the app yet',
  declined: 'Declined the invitation'
};

const STAGE_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', skipped: 'Skipped', overridden: 'Skipped' };
const STAGE_DOT = { approved: 'bg-emerald-500', rejected: 'bg-rose-500', pending: 'bg-amber-400' };

const Stage = ({ title, stage }) => (
  <li className="flex gap-3">
    <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${STAGE_DOT[stage?.status] || 'bg-slate-300'}`} />
    <div className="min-w-0">
      <p className="text-[13px] font-bold text-slate-800">{title}: {STAGE_LABELS[stage?.status] || 'Pending'}</p>
      {stage?.at && <p className="text-[11px] text-slate-500">{formatDate(stage.at)}</p>}
      {stage?.note && <p className="text-[11px] text-slate-500 italic">“{stage.note}”</p>}
    </div>
  </li>
);

const FamilyRequestDetailPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [denyOpen, setDenyOpen] = useState(false);
  const [toast, showToast] = useToast();

  // Scoped on the server: 404 when the request is outside this Head's area
  const { data, loading, error, reload } = useHeadApi(`/head/family-requests/${requestId}`);
  const request = data?.data;
  const level = data?.reviewerLevel || null;

  const review = async (action, note = '') => {
    setBusy(action);
    try {
      const res = await axiosPrivate.patch(`/head/family-requests/${requestId}`, { action, note });
      showToast(res.data?.message || 'Updated');
      setDenyOpen(false);
      reload();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const age = ageFrom(request?.dob, request?.age);
  const actionable = request && canActOnFamilyRequest(request, level);
  const stageNote = request && familyStageNote(request);
  const chatWithRequester = () => navigate(`/member/chat/member/${request.addedBy.id}`);

  return (
    <RequestsGuard>
      <PageShell>
        <PageHeader title="Family Request Details" showBell={false} />
        <Toast toast={toast} />
        <PageBody>
          {loading ? <LoadingState />
            : error ? <ErrorState message={error} onRetry={() => reload(true)} />
            : (
              <>
                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex gap-4">
                  <RequestPhoto src={request.avatar} name={request.name} className="w-[104px] h-[124px] rounded-2xl text-3xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h2 className="text-lg font-black text-slate-900 leading-tight">{request.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold">
                        <Users size={12} /> Family Member
                      </span>
                      <StatusBadge status={request.approvalStatus} />
                    </div>
                    <InfoRow icon={UserRound}>{request.relationToHead}{request.familyHead?.name ? ` of ${request.familyHead.name}` : ''}</InfoRow>
                    {request.city && <InfoRow icon={MapPin}>{request.city}</InfoRow>}
                    {(request.gender || age) && <InfoRow icon={User}>{[request.gender, age && `${age} Years`].filter(Boolean).join(' · ')}</InfoRow>}
                    {request.maritalStatus && <InfoRow icon={Heart}>{request.maritalStatus}</InfoRow>}
                    <InfoRow icon={CalendarDays}>Requested: {formatDate(request.createdAt)}</InfoRow>
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                  <h3 className="text-sm font-black text-slate-900">Member Details</h3>
                  <InfoRow icon={Hash}>Member ID {request.memberCode}{request.familyCode ? ` · Family ${request.familyCode}` : ''}</InfoRow>
                  <InfoRow icon={Phone}>{request.phone || 'No mobile number (dummy member)'}</InfoRow>
                  {request.dob && <InfoRow icon={CalendarDays}>Born {formatDate(request.dob)}</InfoRow>}
                  {request.gotra && <InfoRow icon={IdCard}>Gotra: {request.gotra}</InfoRow>}
                  {request.occupation && <InfoRow icon={Briefcase}>{request.occupation}</InfoRow>}
                  <InfoRow icon={Link2}>{LINK_LABELS[request.linkStatus] || request.linkStatus}</InfoRow>
                </section>

                {request.addedBy && (
                  <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
                    <RequestPhoto src={request.addedBy.avatar} name={request.addedBy.name} className="w-12 h-12 rounded-full text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Requested by</p>
                      <p className="text-[14px] font-extrabold text-slate-800 truncate">{request.addedBy.name}</p>
                      <p className="text-[11px] text-slate-500">{[request.addedBy.phone, timeAgo(request.createdAt)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={chatWithRequester}
                      aria-label={`Chat with ${request.addedBy.name}`}
                      className="w-10 h-10 rounded-xl bg-purple-50 text-brand-primary flex items-center justify-center hover:bg-purple-100"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </section>
                )}

                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 mb-3">Approval Progress</h3>
                  <ol className="space-y-3">
                    <Stage title="Local Head" stage={request.approvals?.localHead} />
                    <Stage title="Community Head" stage={request.approvals?.communityHead} />
                  </ol>
                  {stageNote && <p className="mt-3 text-[11px] font-semibold text-amber-700">{stageNote}</p>}
                </section>

                <div className="grid grid-cols-2 gap-2.5">
                  {actionable && (
                    <ActionTile
                      icon={Check}
                      label={level === 'local' ? 'Approve & Forward' : 'Approve'}
                      onClick={() => review('approve')}
                      busy={busy === 'approve'}
                      disabled={!!busy}
                      className="bg-emerald-600"
                    />
                  )}
                  {request.addedBy && (
                    <ActionTile icon={MessageCircle} label="Chat" onClick={chatWithRequester} className="bg-gradient-to-br from-violet-600 to-purple-700" />
                  )}
                  {actionable && (
                    <ActionTile icon={X} label="Deny" onClick={() => setDenyOpen(true)} disabled={!!busy} className="bg-rose-500" />
                  )}
                  {request.linkedUser && (
                    <ActionTile
                      icon={IdCard}
                      label="View Profile"
                      onClick={() => navigate(`/member/directory/${request.linkedUser.id}`)}
                      className="bg-gradient-to-br from-amber-500 to-orange-500"
                    />
                  )}
                </div>
              </>
            )}
        </PageBody>
        <DenySheet
          key={denyOpen ? 'open' : 'closed'}
          target={denyOpen ? request : null}
          requireReason
          busy={busy === 'reject'}
          onCancel={() => setDenyOpen(false)}
          onConfirm={note => review('reject', note)}
        />
      </PageShell>
    </RequestsGuard>
  );
};

export default FamilyRequestDetailPage;
