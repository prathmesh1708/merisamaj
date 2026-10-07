import React from 'react';
import { Heart, MapPin, GraduationCap, Briefcase, Star, ShieldCheck, Crown, Clock, Check, Bookmark, BookmarkCheck } from 'lucide-react';

/**
 * ProfileCard — Reusable grid/list profile card for matrimonial browsing.
 * Supports both grid (compact) and list (horizontal) layouts.
 */
const ProfileCard = ({
  profile,
  layout = 'grid', // 'grid' | 'list'
  onViewProfile,
  onSendInterest,
  onToggleShortlist,
  isShortlisted = false,
}) => {
  if (!profile) return null;

  const isBlurred = profile.photoVisibility === 'connections' && !profile.interests?.accepted;
  const interestSent = profile.interests?.sent;
  const isConnected = profile.interests?.accepted;

  // ─── GRID LAYOUT ───
  if (layout === 'grid') {
    return (
      <div
        className="bg-white rounded-2xl border border-gray-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer group transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-rose-100"
        onClick={() => onViewProfile?.(profile.id)}
      >
        {/* Photo */}
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <img
            src={profile.avatar}
            alt={profile.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isBlurred ? 'blur-[6px] brightness-90' : ''}`}
            loading="lazy"
            decoding="async"
          />

          {/* Top Badges Row */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none">
            <div className="flex flex-col gap-1.5">
              {profile.premiumStatus && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  <Crown size={9} /> Premium
                </span>
              )}
              {profile.verifiedStatus && (
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  <ShieldCheck size={9} /> Verified
                </span>
              )}
              {profile.isNew && (
                <span className="bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  New
                </span>
              )}
            </div>

            {/* Shortlist Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleShortlist?.(profile.id); }}
              className="pointer-events-auto w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              {isShortlisted ? <BookmarkCheck size={14} className="text-amber-400" /> : <Bookmark size={14} />}
            </button>
          </div>

          {/* Privacy Overlay */}
          {isBlurred && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] bg-black/60 text-white font-black px-2 py-1 rounded-full uppercase tracking-wider">
                Photo Protected
              </span>
            </div>
          )}

          {/* Online Indicator */}
          {profile.online && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[8px] text-white font-bold">Online</span>
            </div>
          )}

          {/* Match Score Badge */}
          {profile.matchScore && (
            <div className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="text-[10px] font-black text-white">{profile.matchScore}%</span>
            </div>
          )}

          {/* Bottom Gradient */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent h-20 pointer-events-none" />
        </div>

        {/* Info Section */}
        <div className="p-3">
          <h4 className="text-[13.5px] font-extrabold text-slate-800 truncate leading-tight">
            {profile.name}, {profile.age}
          </h4>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
            {profile.height} · {profile.gotra} Gotra
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Briefcase size={10} className="text-slate-400 shrink-0" />
            <span className="text-[10.5px] text-slate-500 font-medium truncate">{profile.profession}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-slate-400 shrink-0" />
            <span className="text-[10.5px] text-slate-500 font-medium truncate">{profile.city}</span>
          </div>

          {/* Quick Interest Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onSendInterest?.(profile.id); }}
            className={`w-full mt-2.5 py-2 rounded-xl text-[11.5px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
              isConnected
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : interestSent
                ? 'bg-rose-50 text-rose-500 border border-rose-200'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-200'
            }`}
          >
            {isConnected ? (
              <><Check size={13} strokeWidth={3} /> Connected</>
            ) : interestSent ? (
              <><Clock size={13} /> Interest Sent</>
            ) : (
              <><Heart size={13} fill="currentColor" /> Send Interest</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST LAYOUT ───
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden cursor-pointer hover:border-rose-100 transition-all"
      onClick={() => onViewProfile?.(profile.id)}
    >
      <div className="flex gap-3.5 p-3.5">
        {/* Photo */}
        <div className="w-24 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
          <img
            src={profile.avatar}
            alt={profile.name}
            className={`w-full h-full object-cover ${isBlurred ? 'blur-md brightness-75' : ''}`}
            loading="lazy"
            decoding="async"
          />
          {profile.online && (
            <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
          )}
          {profile.premiumStatus && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <Crown size={10} className="text-white" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-[14px] font-extrabold text-slate-800 truncate">{profile.name}, {profile.age}</h4>
              {profile.verifiedStatus && <ShieldCheck size={14} className="text-emerald-500 shrink-0" />}
            </div>
            <p className="text-[12px] text-slate-600 font-semibold">{profile.height} · {profile.gotra} Gotra</p>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5 truncate">
              {profile.profession} · {profile.city}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{profile.education}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onSendInterest?.(profile.id); }}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : interestSent
                  ? 'bg-rose-50 text-rose-500 border border-rose-200'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
              }`}
            >
              {isConnected ? <><Check size={11} /> Connected</> : interestSent ? <><Clock size={11} /> Sent</> : <><Heart size={11} fill="currentColor" /> Interest</>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleShortlist?.(profile.id); }}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
            >
              {isShortlisted ? <BookmarkCheck size={14} className="text-amber-500" /> : <Bookmark size={14} />}
            </button>
          </div>
        </div>

        {/* Match Score */}
        {profile.matchScore && (
          <div className="flex flex-col items-center justify-start pt-1">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-50 to-purple-50 border-2 border-rose-200 flex items-center justify-center">
              <span className="text-[11px] font-black text-rose-500">{profile.matchScore}%</span>
            </div>
            <span className="text-[8px] text-slate-400 font-bold mt-0.5">Match</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
