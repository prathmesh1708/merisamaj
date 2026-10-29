import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, CalendarDays, Check, Heart, IdCard, Mail, MapPin, MessageCircle, Phone, User, UserPlus, Users, X, Briefcase
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { axiosPrivate } from '../../../../../core/api/axiosPrivate';
import {
  RequestsGuard, PageShell, PageBody, RequestPhoto, InfoRow, StatusBadge, LoadingState, ErrorState,
  DenySheet, Toast, ActionTile
} from './requestUi';
import { useToast, useHeadApi, memberRequestStatus, ageFrom, formatDate, timeAgo } from './requestHelpers';

const MemberRequestDetailPage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  // Scoped on the server: 404 when the applicant is outside this Head's area
  const { data, loading, error, reload } = useHeadApi(`/head/dashboard/members/${memberId}`);
  const member = data?.data;
  const [busy, setBusy] = useState(null);
  const [denyOpen, setDenyOpen] = useState(false);
  const [toast, showToast] = useToast();

  const review = async (action, note = '') => {
    setBusy(action);
    try {
      await axiosPrivate.patch(`/head/dashboard/members/${memberId}/${action}`, action === 'reject' ? { note } : undefined);
      showToast(`${member.name} ${action === 'approve' ? 'approved — welcome to the community!' : 'denied.'}`);
      setDenyOpen(false);
      reload();
    } catch (err) {
      showToast(err.response?.data?.message || `Could not ${action} this request.`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const status = member ? memberRequestStatus(member) : null;
  const age = ageFrom(member?.dob);
  const aboutText = member?.bio || (member?.about && member.about !== 'Available' ? member.about : '');
  const chat = () => navigate(`/member/chat/member/${memberId}`);
  const openProfile = () => navigate(`/member/profile/requests/members/${memberId}/profile`);

  return (
    <RequestsGuard>
      <PageShell>
        <PageHeader title="Request Details" showBell={false} />
        <Toast toast={toast} />
        <PageBody>
          {loading ? <LoadingState />
            : error ? <ErrorState message={error} onRetry={() => reload(true)} />
            : (
              <>
                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex gap-4">
                  <RequestPhoto src={member.avatar} name={member.name} className="w-[104px] h-[124px] rounded-2xl text-3xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h2 className="text-lg font-black text-slate-900 leading-tight">{member.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-brand-primary text-[11px] font-bold">
                        <BadgeCheck size={12} /> Community Member
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    {(member.city || member.state) && <InfoRow icon={MapPin}>{[member.city, member.state].filter(Boolean).join(', ')}</InfoRow>}
                    {(member.subCommunity || member.communityId?.name) && <InfoRow icon={Users}>{member.subCommunity || member.communityId?.name}</InfoRow>}
                    {(member.gender || age) && <InfoRow icon={User}>{[member.gender, age && `${age} Years`].filter(Boolean).join(' · ')}</InfoRow>}
                    {member.maritalStatus && <InfoRow icon={Heart}>{member.maritalStatus}</InfoRow>}
                    <InfoRow icon={CalendarDays}>Joined: {formatDate(member.createdAt)}</InfoRow>
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 mb-1.5">About Me</h3>
                  <p className="text-[13px] leading-relaxed text-slate-600">
                    {aboutText || <span className="text-slate-400">This member hasn't written an introduction yet.</span>}
                  </p>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm space-y-2">
                  <h3 className="text-sm font-black text-slate-900">Contact & Background</h3>
                  {member.phone && <InfoRow icon={Phone}>{member.phone}</InfoRow>}
                  {member.email && <InfoRow icon={Mail}>{member.email}</InfoRow>}
                  {member.gotra && <InfoRow icon={IdCard}>Gotra: {member.gotra}</InfoRow>}
                  {(member.profession || member.qualification) && (
                    <InfoRow icon={Briefcase}>{[member.profession, member.qualification].filter(Boolean).join(' · ')}</InfoRow>
                  )}
                  {member.referredBy?.name && (
                    <InfoRow icon={UserPlus}>Referred by {member.referredBy.name}{member.referredBy.phone ? ` (${member.referredBy.phone})` : ''}</InfoRow>
                  )}
                </section>

                {status !== 'pending' && member.membershipReview?.at && (
                  <section className={`rounded-3xl border p-4 text-[12px] ${status === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <p className="font-bold">
                      {status === 'approved' ? 'Approved' : 'Rejected'}
                      {member.membershipReview.by?.name ? ` by ${member.membershipReview.by.name}` : ''} · {timeAgo(member.membershipReview.at)}
                    </p>
                    {member.membershipReview.note && <p className="mt-1">Reason: {member.membershipReview.note}</p>}
                  </section>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {status === 'pending' && (
                    <ActionTile icon={Check} label="Approve" onClick={() => review('approve')} busy={busy === 'approve'} disabled={!!busy} className="bg-emerald-600" />
                  )}
                  <ActionTile icon={MessageCircle} label="Chat" onClick={chat} className="bg-gradient-to-br from-violet-600 to-purple-700" />
                  {status === 'pending' && (
                    <ActionTile icon={X} label="Deny" onClick={() => setDenyOpen(true)} disabled={!!busy} className="bg-rose-500" />
                  )}
                  <ActionTile icon={IdCard} label="Request Profile" onClick={openProfile} className="bg-gradient-to-br from-amber-500 to-orange-500" />
                </div>
              </>
            )}
        </PageBody>
        <DenySheet
          key={denyOpen ? 'open' : 'closed'}
          target={denyOpen ? member : null}
          busy={busy === 'reject'}
          onCancel={() => setDenyOpen(false)}
          onConfirm={note => review('reject', note)}
        />
      </PageShell>
    </RequestsGuard>
  );
};

export default MemberRequestDetailPage;
