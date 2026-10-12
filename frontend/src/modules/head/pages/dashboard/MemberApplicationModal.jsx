import React, { useEffect, useState } from 'react';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { motion } from 'framer-motion';
import {
  X, Shield, ShieldCheck, ShieldAlert, Phone, MapPin, User, Users, GraduationCap,
  CheckCircle2, Clock
} from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ageFrom = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 130 ? `${age} yrs` : '';
};

// One label/value row — hidden when there is no value (no fake defaults)
const Row = ({ label, value }) => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-slate-500 font-semibold shrink-0">{label}</span>
      <span className="font-bold text-slate-900 text-right break-words min-w-0">{value}</span>
    </div>
  );
};

// A titled card that disappears when none of its rows have data
const Section = ({ icon: Icon, title, children }) => {
  const rows = React.Children.toArray(children).filter(child =>
    child && (child.type !== Row || (child.props.value !== undefined && child.props.value !== null && String(child.props.value).trim() !== ''))
  );
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Icon size={14} className="text-indigo-600" />
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">{title}</h4>
      </div>
      <div className="px-4 py-2 text-xs divide-y divide-slate-50">{rows}</div>
    </div>
  );
};

const Badge = ({ ok, okText, pendingText }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
    ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
  }`}>
    {ok ? <CheckCircle2 size={11} /> : <Clock size={11} />} {ok ? okText : pendingText}
  </span>
);

/**
 * Full profile of a member waiting for approval, for the Community Head / Local Head.
 */
export const MemberApplicationModal = ({ member: listMember, onClose, onApprove, onReject }) => {
  // The list only carries some fields — load the full profile for the review
  const [fullProfile, setFullProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false); // full-screen photo viewer
  const memberId = listMember?._id || listMember?.id;

  useEffect(() => {
    if (!memberId) return undefined;
    let cancelled = false;
    setFullProfile(null);
    setLoading(true);
    axiosPrivate.get(`/head/dashboard/members/${memberId}`)
      .then(res => { if (!cancelled) setFullProfile(res.data?.data || null); })
      .catch(() => {}) // fall back to what the list already has
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  if (!listMember) return null;
  const member = { ...listMember, ...(fullProfile || {}) };

  const communityName = member.communityId?.name || member.community;
  const address = [member.houseNumber, member.streetAddress, member.areaAddress, member.landmark]
    .filter(Boolean).join(', ') || member.detailedAddress;
  const place = [member.city, member.district, member.state, member.pincode].filter(Boolean).join(', ');
  const family = (member.familyMembers || []).filter(f => f && f.name);
  const initials = (member.name || '?').trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
  const id = member._id || member.id;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-lg max-h-[92vh] bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        {/* Header with photo */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-start gap-4 shrink-0">
          {member.avatar ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              title="View full photo"
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 shrink-0 cursor-zoom-in group"
            >
              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] font-bold">View</span>
            </button>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-3xl flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Membership application</p>
            <h3 className="text-base font-black text-slate-900 truncate">{member.name || 'Unnamed member'}</h3>
            <p className="text-xs text-slate-500 font-semibold truncate">
              {[communityName, member.subCommunity].filter(Boolean).join(' · ') || 'Community not set'}
            </p>
            {member.createdAt && (
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Applied {formatDate(member.createdAt)}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="p-4 space-y-3 overflow-y-auto overscroll-contain flex-1">
          {loading && !fullProfile && (
            <p className="text-[11px] text-slate-400 text-center font-semibold">Loading full profile…</p>
          )}

          {/* Verification */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              {member.isAadharVerified ? <ShieldCheck size={16} className="text-emerald-600" /> : <ShieldAlert size={16} className="text-amber-600" />}
              <p className="text-xs font-bold text-indigo-900">
                {member.isAadharVerified ? 'Identity verified through government ID check.' : 'Identity not verified yet — please review the details before approving.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge ok={member.isAadharVerified} okText="Aadhaar verified" pendingText="Aadhaar pending" />
              <Badge ok={member.isPhoneVerified} okText="Phone verified" pendingText="Phone not verified" />
              {member.isFaceVerified !== undefined && <Badge ok={member.isFaceVerified} okText="Face verified" pendingText="Face not verified" />}
            </div>
          </div>

          <Section icon={Phone} title="Contact">
            <Row label="Phone" value={member.phone} />
            <Row label="Alternate phone" value={member.alternatePhone} />
            <Row label="Email" value={member.email} />
            <Row label="Alternate email" value={member.alternateEmail} />
          </Section>

          <Section icon={User} title="Personal">
            <Row label="Gender" value={member.gender} />
            <Row label="Date of birth" value={[formatDate(member.dob), ageFrom(member.dob)].filter(Boolean).join(' · ')} />
            <Row label="Marital status" value={member.maritalStatus} />
            <Row label="Blood group" value={member.bloodGroup} />
            <Row label="About" value={member.bio || member.about} />
          </Section>

          <Section icon={Shield} title="Community">
            <Row label="Samaj" value={communityName} />
            <Row label="Sub-community" value={member.subCommunity} />
            <Row label="Gotra" value={member.gotra} />
            <Row label="Family type" value={member.familyType} />
            <Row label="Referred by" value={member.referredBy?.name ? `${member.referredBy.name}${member.referredBy.phone ? ` (${member.referredBy.phone})` : ''}` : ''} />
            <Row label="Registered via" value={member.registrationSource} />
          </Section>

          <Section icon={MapPin} title="Address">
            <Row label="City / District" value={place} />
            <Row label="Address" value={address} />
            <Row label="Country" value={member.country && member.country !== 'India' ? member.country : ''} />
          </Section>

          <Section icon={GraduationCap} title="Education & Work">
            <Row label="Qualification" value={member.qualification} />
            <Row label="School / College" value={member.school} />
            <Row label="Passing year" value={member.passingYear} />
            <Row label="Profession" value={member.profession} />
            <Row label="Company / Business" value={member.company} />
            <Row label="Work city" value={member.workCity} />
            <Row label="Annual income" value={member.annualIncome} />
          </Section>

          {family.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                <Users size={14} className="text-indigo-600" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">Family members ({family.length})</h4>
              </div>
              <div className="divide-y divide-slate-50">
                {family.map((f, i) => (
                  <div key={f.recordId || i} className="px-4 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{f.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {[f.relation, f.gender, f.age ? `${f.age} yrs` : ageFrom(f.dob), f.occupation].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {(f.phone || f.mobile) && <span className="text-[11px] font-semibold text-slate-600 shrink-0">{f.phone || f.mobile}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nothing filled in beyond the basics */}
          {!loading && !member.gender && !member.dob && !member.profession && !member.qualification && !address && family.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center px-4 py-2">
              This member has only filled in basic details so far.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
          <button
            onClick={() => onReject(id, member.name)}
            className="flex-1 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-100 transition-all text-center cursor-pointer"
          >
            Reject Account
          </button>
          <button
            onClick={() => onApprove(id, member.name)}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all text-center shadow-xs cursor-pointer"
          >
            Approve Account
          </button>
        </div>
      </motion.div>

      {/* Full-screen photo viewer — shows the whole image, uncropped */}
      {photoOpen && member.avatar && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setPhotoOpen(false)}
          role="dialog"
          aria-label={`Photo of ${member.name}`}
        >
          <img
            src={member.avatar}
            alt={member.name}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setPhotoOpen(false)}
            aria-label="Close photo"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <X size={20} />
          </button>
          <p className="absolute bottom-5 left-0 right-0 text-center text-white/80 text-sm font-semibold">{member.name}</p>
        </div>
      )}
    </div>
  );
};

export default MemberApplicationModal;
