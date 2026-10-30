import React, { useState } from 'react';
import { X, ShieldCheck, Crown, Phone, Mail, MapPin, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const ageFrom = (dob) => {
  if (!dob) return null;
  const b = new Date(dob);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};

const Section = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-100 p-4">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">{title}</p>
    {children}
  </div>
);

// Label/value grid — empty values are skipped
const Fields = ({ rows }) => {
  const shown = rows.filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length));
  if (!shown.length) return <p className="text-xs text-slate-400">Not filled</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {shown.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
          <p className="text-[13px] font-semibold text-slate-800 break-words">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
        </div>
      ))}
    </div>
  );
};

/**
 * Admin view of one matrimonial profile: photos, basic details and plan.
 * Uses the row from the directory list (it already carries the full profile).
 */
const ProfileDetailDrawer = ({ profile: p, onClose }) => {
  const photos = (p.photos || []).filter(ph => !ph.isDeleted && ph.url);
  const [viewer, setViewer] = useState(null); // index of enlarged photo

  const name = p.personal?.fullName || p.userId?.name || 'Unknown';
  const age = p.age ?? ageFrom(p.personal?.dateOfBirth);
  const sub = p.subscription;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-900 truncate flex items-center gap-1.5">
              {name}{age ? `, ${age}` : ''}
              {p.verificationStatus === 'verified' && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
            </h3>
            <p className="text-xs text-slate-500 capitalize">
              {p.status}{p.isClosed ? ' · closed' : ''} · verification: {p.verificationStatus || 'unverified'} · joined {fmtDate(p.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photos */}
          <Section title={`Photos (${photos.length})`}>
            {photos.length === 0 ? (
              <p className="text-xs text-slate-400">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {photos.map((ph, i) => (
                  <button key={ph._id || i} onClick={() => setViewer(i)} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={ph.url} alt={`${name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    {ph.isPrimary && (
                      <span className="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star size={9} fill="currentColor" /> Primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Plan */}
          <Section title="Subscription Plan">
            {sub?.isActive ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Crown size={18} /></div>
                <div>
                  <p className="text-[15px] font-black text-purple-700">{sub.planName}</p>
                  <p className="text-xs text-slate-500 font-semibold">
                    {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{sub.status}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / 86400000))} days left
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-600">Free — no active paid plan</p>
            )}
          </Section>

          {/* Contact (from the member's account) */}
          <Section title="Account & Contact">
            <div className="space-y-1.5 text-sm text-slate-700">
              <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {p.userId?.phone || '—'}</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {p.userId?.email || '—'}</p>
              <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {[p.location?.city, p.location?.state, p.location?.country].filter(Boolean).join(', ') || '—'}</p>
              {p.communityId?.name && <p className="text-xs text-slate-500">Community: <b>{p.communityId.name}</b></p>}
            </div>
          </Section>

          <Section title="Basic Details">
            <Fields rows={[
              ['Gender', p.personal?.gender],
              ['Date of birth', p.personal?.dateOfBirth ? fmtDate(p.personal.dateOfBirth) : ''],
              ['Height', p.personal?.height ? `${p.personal.height} cm` : ''],
              ['Weight', p.personal?.weight ? `${p.personal.weight} kg` : ''],
              ['Marital status', p.personal?.maritalStatus],
              ['Religion', p.personal?.religion],
              ['Community', p.personal?.community],
              ['Gotra', p.personal?.gotra],
              ['Mother tongue', p.personal?.motherTongue],
              ['Managed by', p.managedBy || p.profileCreatedBy],
            ]} />
          </Section>

          <Section title="Education & Career">
            <Fields rows={[
              ['Qualification', p.education?.highestQualification],
              ['College', p.education?.college],
              ['Profession', p.education?.profession],
              ['Occupation', p.education?.occupation],
              ['Company', p.education?.company],
              ['Annual income', p.education?.annualIncome],
            ]} />
          </Section>

          <Section title="Family">
            <Fields rows={[
              ['Father', p.family?.fatherName],
              ["Father's occupation", p.family?.fatherOccupation],
              ['Mother', p.family?.motherName],
              ["Mother's occupation", p.family?.motherOccupation],
              ['Brothers', p.family?.brothers],
              ['Sisters', p.family?.sisters],
              ['Family type', p.family?.familyType],
              ['Family values', p.family?.familyValues],
            ]} />
          </Section>

          <Section title="Lifestyle">
            <Fields rows={[
              ['Diet', p.lifestyle?.diet],
              ['Smoking', p.lifestyle?.smoking],
              ['Drinking', p.lifestyle?.drinking],
              ['Disabilities', p.lifestyle?.disabilities],
              ['Hobbies', p.lifestyle?.hobbies],
            ]} />
          </Section>

          {(p.about?.biography || p.about?.partnerExpectations) && (
            <Section title="About">
              {p.about?.biography && <p className="text-sm text-slate-700 whitespace-pre-line">{p.about.biography}</p>}
              {p.about?.partnerExpectations && (
                <p className="text-sm text-slate-600 mt-3"><b>Partner expectations:</b> {p.about.partnerExpectations}</p>
              )}
            </Section>
          )}

          <Section title="Activity">
            <Fields rows={[
              ['Profile complete', p.profileCompletion?.percentage != null ? `${p.profileCompletion.percentage}%` : ''],
              ['Total profile views', p.totalProfileViews ?? 0],
              ['Last active', p.lastActiveAt ? fmtDate(p.lastActiveAt) : ''],
              ['Marriages ended', p.previousMarriages?.length || ''],
            ]} />
          </Section>
        </div>
      </div>

      {/* Enlarged photo */}
      {viewer !== null && photos[viewer] && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" onClick={() => setViewer(null)}>
          <img src={photos[viewer].url} alt="" className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <button className="absolute top-5 right-5 text-white p-2" onClick={() => setViewer(null)}><X size={24} /></button>
          {photos.length > 1 && (
            <>
              <button className="absolute left-4 text-white p-2 bg-white/10 rounded-full" onClick={e => { e.stopPropagation(); setViewer((viewer - 1 + photos.length) % photos.length); }}><ChevronLeft size={26} /></button>
              <button className="absolute right-4 text-white p-2 bg-white/10 rounded-full" onClick={e => { e.stopPropagation(); setViewer((viewer + 1) % photos.length); }}><ChevronRight size={26} /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileDetailDrawer;
