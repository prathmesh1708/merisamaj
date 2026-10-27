import React from 'react';
import { Check, X, MessageCircle, Eye, Undo2, BadgeCheck } from 'lucide-react';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '');

// Height is stored in cm → 5' 6"
const fmtHeight = (cm) => {
  const n = Number(cm);
  if (!n) return '';
  const inches = Math.round(n / 2.54);
  return `${Math.floor(inches / 12)}' ${inches % 12}"`;
};

const activeText = (d) => {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active on ${fmtDate(d)}`;
};

/**
 * Jeevansathi-style interest card: full photo, status line on top, key details and
 * round action buttons at the bottom. `tab` is 'Received' | 'Accepted' | 'Sent'.
 */
export const InterestProfileCard = ({ item, tab, onOpen, onAccept, onDecline, onCancel, onChat }) => {
  const profile = item.senderProfile || item.receiverProfile || item;
  // Public profiles don't send a name until the interest is accepted (privacy)
  const name = profile.personal?.fullName || profile.userId?.name || '';
  const age = profile.age;
  const photo = profile.photos?.[0]?.url || profile.userId?.avatar || null;
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const heading = name ? `${name}${age ? `, ${age}` : ''}` : (age ? `${age} yrs` : '');

  const line1 = [fmtHeight(profile.personal?.height), profile.location?.city, profile.personal?.community || profile.subCommunity]
    .filter(Boolean).join(' · ');
  const line2 = [profile.education?.profession || profile.education?.occupation, profile.education?.annualIncome && `Earns ${profile.education.annualIncome}`]
    .filter(Boolean).join(' · ');
  const line3 = [profile.education?.highestQualification, profile.personal?.gotra && `Gotra ${profile.personal.gotra}`]
    .filter(Boolean).join(' · ');

  const status = item.status === 'accepted'
    ? { title: 'Interest Accepted', date: item.acceptedAt || item.updatedAt }
    : tab === 'Received'
      ? { title: 'Interest Received', date: item.createdAt }
      : { title: 'Interest Sent', date: item.createdAt };

  const Action = ({ icon: Icon, label, onClick, tone = 'default' }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
    >
      <span className={`w-14 h-14 rounded-full flex items-center justify-center border ${
        tone === 'primary' ? 'bg-rose-500 border-rose-400 text-white'
          : tone === 'success' ? 'bg-emerald-500 border-emerald-400 text-white'
          : 'bg-white/10 border-white/20 text-white backdrop-blur'
      }`}>
        <Icon size={22} />
      </span>
      <span className="text-[12px] font-bold text-white">{label}</span>
    </button>
  );

  return (
    <div
      onClick={onOpen}
      className="relative w-full aspect-[3/4.4] rounded-[28px] overflow-hidden cursor-pointer p-[3px] bg-gradient-to-br from-rose-500 via-orange-400 to-rose-500 shadow-lg shadow-rose-500/20"
    >
      <div className="relative w-full h-full rounded-[25px] overflow-hidden bg-slate-900">
        {/* Photo (or initials) fills the card */}
        {photo ? (
          <img src={photo} alt={name || 'Matrimonial profile'} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900">
            <span className="text-[72px] font-black text-white/15">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />

        {/* Status line */}
        <div className="absolute top-0 inset-x-0 p-4">
          <p className="text-[14px] font-bold text-white">{status.title}</p>
          {status.date && <p className="text-[11.5px] font-semibold text-white/80">on {fmtDate(status.date)}</p>}
        </div>

        {/* Details */}
        <div className="absolute bottom-0 inset-x-0">
          <div className="px-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {profile.verificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                  <BadgeCheck size={12} /> Verified
                </span>
              )}
              {profile.lastActiveAt && <span className="text-[11px] font-semibold text-white/75">{activeText(profile.lastActiveAt)}</span>}
            </div>
            <h3 className="text-[24px] font-black text-white leading-tight break-words">
              {heading}
            </h3>
            {line1 && <p className="text-[13px] font-medium text-white/90 mt-1 truncate">{line1}</p>}
            {line2 && <p className="text-[13px] font-medium text-white/90 truncate">{line2}</p>}
            {line3 && <p className="text-[12px] font-medium text-white/70 truncate">{line3}</p>}
          </div>

          {profile.managedByFamily && (
            <div className="mt-2.5 px-4 py-1.5 bg-rose-900/60 text-[12px] italic font-semibold text-white/90">
              Profile managed by family
            </div>
          )}

          {/* Actions change with the tab */}
          <div className="flex items-start justify-around px-3 pt-3.5 pb-4">
            {tab === 'Received' && item.status !== 'accepted' && (
              <>
                <Action icon={X} label="Decline" onClick={onDecline} />
                <Action icon={Eye} label="View Profile" onClick={onOpen} />
                <Action icon={Check} label="Accept" onClick={onAccept} tone="primary" />
              </>
            )}
            {(tab === 'Accepted' || item.status === 'accepted') && (
              <>
                <Action icon={Eye} label="View Profile" onClick={onOpen} />
                <Action icon={MessageCircle} label="Chat" onClick={onChat} tone="success" />
              </>
            )}
            {tab === 'Sent' && item.status !== 'accepted' && (
              <>
                <Action icon={Undo2} label="Cancel" onClick={onCancel} />
                <Action icon={Eye} label="View Profile" onClick={onOpen} tone="primary" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterestProfileCard;
