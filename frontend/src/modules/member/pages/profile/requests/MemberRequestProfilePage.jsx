import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, CalendarDays, ChevronDown, GraduationCap, Heart, MapPin, MessageCircle, User, Users, X, Home, Phone
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
  RequestsGuard, PageShell, PageBody, RequestPhoto, InfoRow, StatusBadge, LoadingState, ErrorState
} from './requestUi';
import { useHeadApi, memberRequestStatus, ageFrom, formatDate } from './requestHelpers';

const Fields = ({ rows }) => {
  const filled = rows.filter(([, value]) => value);
  if (filled.length === 0) return <p className="text-[12px] text-slate-400">Not provided yet.</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {filled.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
          <dd className="text-[13px] font-semibold text-slate-700 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const Section = ({ icon: Icon, title, open, onToggle, children }) => (
  <div className="border-b border-slate-100 last:border-0">
    <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 py-3.5 text-left">
      <span className="w-8 h-8 rounded-xl bg-purple-50 text-brand-primary flex items-center justify-center shrink-0">
        <Icon size={16} />
      </span>
      <span className="flex-1 text-[14px] font-bold text-slate-800">{title}</span>
      <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="pb-4 pl-11">{children}</div>}
  </div>
);

const MemberRequestProfilePage = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useHeadApi(`/head/dashboard/members/${memberId}`);
  const member = data?.data;
  const [openSection, setOpenSection] = useState('personal');
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [viewer, setViewer] = useState(null);

  const toggle = (key) => setOpenSection(current => (current === key ? null : key));
  const gallery = member?.gallery || [];
  const age = ageFrom(member?.dob);
  const address = member && [member.houseNumber, member.streetAddress, member.landmark, member.areaAddress].filter(Boolean).join(', ');

  return (
    <RequestsGuard>
      <PageShell>
        <PageHeader title="Request Profile" showBell={false} />
        <PageBody>
          {loading ? <LoadingState />
            : error ? <ErrorState message={error} onRetry={() => reload(true)} />
            : (
              <>
                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm flex gap-4">
                  <RequestPhoto src={member.avatar} name={member.name} className="w-[96px] h-[112px] rounded-2xl text-3xl" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h2 className="text-lg font-black text-slate-900 leading-tight">{member.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-brand-primary text-[11px] font-bold">
                        <BadgeCheck size={12} /> Community Member
                      </span>
                      <StatusBadge status={memberRequestStatus(member)} />
                    </div>
                    {(member.city || member.state) && <InfoRow icon={MapPin}>{[member.city, member.state].filter(Boolean).join(', ')}</InfoRow>}
                    {(member.subCommunity || member.communityId?.name) && <InfoRow icon={Users}>{member.subCommunity || member.communityId?.name}</InfoRow>}
                    {(member.gender || age) && <InfoRow icon={User}>{[member.gender, age && `${age} Years`].filter(Boolean).join(' · ')}</InfoRow>}
                    <InfoRow icon={CalendarDays}>Joined: {formatDate(member.createdAt)}</InfoRow>
                  </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-900">Gallery ({gallery.length})</h3>
                    {gallery.length > 4 && (
                      <button type="button" onClick={() => setShowAllPhotos(v => !v)} className="text-[12px] font-bold text-brand-primary">
                        {showAllPhotos ? 'Show less' : 'View All'}
                      </button>
                    )}
                  </div>
                  {gallery.length === 0 ? (
                    <p className="text-[12px] text-slate-400">No photos shared yet.</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {(showAllPhotos ? gallery : gallery.slice(0, 4)).map(url => (
                        <button key={url} type="button" onClick={() => setViewer(url)} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                          <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl bg-white border border-slate-200/80 px-4 shadow-sm">
                  <Section icon={User} title="Personal Information" open={openSection === 'personal'} onToggle={() => toggle('personal')}>
                    <Fields rows={[
                      ['Gender', member.gender],
                      ['Date of birth', formatDate(member.dob)],
                      ['Age', age && `${age} years`],
                      ['Marital status', member.maritalStatus],
                      ['Blood group', member.bloodGroup],
                      ['Gotra', member.gotra],
                      ['Sub-community', member.subCommunity],
                      ['Family type', member.familyType]
                    ]} />
                  </Section>
                  <Section icon={Heart} title="Family Details" open={openSection === 'family'} onToggle={() => toggle('family')}>
                    {member.familyMembers?.length ? (
                      <ul className="space-y-2">
                        {member.familyMembers.map((f, i) => (
                          <li key={f.recordId || i} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="font-semibold text-slate-700 truncate">{f.name}</span>
                            <span className="text-[11px] text-slate-500 shrink-0">{[f.relation, f.age && `${f.age} yrs`].filter(Boolean).join(' · ')}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-[12px] text-slate-400">No family members added yet.</p>}
                  </Section>
                  <Section icon={GraduationCap} title="Education & Profession" open={openSection === 'education'} onToggle={() => toggle('education')}>
                    <Fields rows={[
                      ['Qualification', member.qualification],
                      ['School / College', member.school],
                      ['Passing year', member.passingYear],
                      ['Profession', member.profession],
                      ['Company', member.company],
                      ['Annual income', member.annualIncome],
                      ['Work city', member.workCity]
                    ]} />
                  </Section>
                  <Section icon={Home} title="Address Details" open={openSection === 'address'} onToggle={() => toggle('address')}>
                    <Fields rows={[
                      ['Address', member.detailedAddress || address],
                      ['City', member.city],
                      ['District', member.district],
                      ['State', member.state],
                      ['Pincode', member.pincode || member.pincodeAddress]
                    ]} />
                  </Section>
                  <Section icon={Phone} title="Contact Details" open={openSection === 'contact'} onToggle={() => toggle('contact')}>
                    <Fields rows={[
                      ['Mobile', member.phone],
                      ['Alternate mobile', member.alternatePhone],
                      ['Email', member.email],
                      ['Alternate email', member.alternateEmail]
                    ]} />
                  </Section>
                </section>

                <button
                  type="button"
                  onClick={() => navigate(`/member/chat/member/${memberId}`)}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={18} /> Chat with {member.name?.split(' ')[0] || 'member'}
                </button>
              </>
            )}
        </PageBody>

        {viewer && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
            <button type="button" aria-label="Close photo" className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
              <X size={20} />
            </button>
            <img src={viewer} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
          </div>
        )}
      </PageShell>
    </RequestsGuard>
  );
};

export default MemberRequestProfilePage;
