import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Check, Star, Bookmark, BookmarkCheck, ShieldCheck, Crown,
  MapPin, Briefcase, GraduationCap, Users, Home as HomeIcon, Utensils, Eye,
  Lock, ChevronLeft, ChevronRight, MoreVertical, X, MessageCircle, Phone,
  Share2, Flag, Ban, Clock, Cigarette, Wine, Moon, Sparkles, Image,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { useMatrimonial } from './MatrimonialContext';
import { useInterests } from '../../../../hooks/useInterests';
import {
  matrimonialProfileService,
  matrimonialModerationService,
  matrimonialChatService,
  matrimonialMarriageService
} from '../../../../core/api/matrimonialService';
import MatchScoreBadge from './components/MatchScoreBadge';
import MarriageSuccessScreen from './components/MarriageSuccessScreen';

// ─── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-2.5">
    {Icon && <Icon size={14} className="text-rose-400 shrink-0 mt-0.5" />}
    <div className="flex-1 min-w-0">
      <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-bold text-slate-800 mt-0.5">{value || 'Not specified'}</p>
    </div>
  </div>
);

// ─── Section Card ──────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100/70 shadow-sm p-4 mb-3">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100/60">
      {Icon && <Icon size={15} className="text-rose-500" />}
      <h3 className="text-[12.5px] font-extrabold text-slate-800 uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </div>
);

// ─── Main ──────────────────────────────────────────────────────────────────────
const MatrimonialProfilePage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();

  const matriCtx = useMatrimonial();
  const { sendInterest, cancelInterest, actionLoading } = useInterests();

  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [toast, setToast]             = useState('');
  const [interestStatus, setInterestStatus] = useState(null); // null | 'sent' | 'accepted'
  const [myInterestId, setMyInterestId] = useState(null);
  const [reportModal, setReportModal]     = useState(false);
  const [reportReason, setReportReason]   = useState('');
  const [reportSending, setReportSending] = useState(false);

  // ─── Marriage Lifecycle State ─────────────────────────────────────────────
  const [marriageModal, setMarriageModal]       = useState(false);
  const [marriageLoading, setMarriageLoading]   = useState(false);
  const [showMarriageSuccess, setShowMarriageSuccess] = useState(false);
  const [pendingMarriageRequestId, setPendingMarriageRequestId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  // ─── Load Profile ────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await matrimonialProfileService.getUserProfile(profileId);
      setProfile(res.data.data.profile);
      // interestRelationship comes from the API privacy middleware
      const rel = res.data.data.interestRelationship;
      if (rel?.status === 'accepted') setInterestStatus('accepted');
      else if (rel?.status === 'pending' && rel?.isSender) {
        setInterestStatus('sent');
        setMyInterestId(rel._id);
      }
    } catch (err) {
      if (err.response?.status === 404) setError('Profile not found.');
      else setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Track visitor — profile is already loaded above, no second call needed
  // The backend records the visit automatically in getUserProfile

  // Scroll lock for overlay
  useEffect(() => {
    document.body.style.overflow = (isMenuOpen || reportModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen, reportModal]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <AlertCircle size={40} className="text-rose-300" />
      <p className="text-slate-500 font-semibold text-center">{error || 'Profile not found'}</p>
      <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold">
        Go Back
      </button>
    </div>
  );

  // Data
  const photos     = profile.photos?.filter(p => !p.isDeleted) || [];
  const primaryPhoto = photos.find(p => p.isPrimary) || photos[0];
  const displayPhotos = photos.length > 0 ? photos : [];

  const isConnected    = interestStatus === 'accepted';
  const isInterestSent = interestStatus === 'sent';
  const isPhotoVisible = profile.visibility === 'public' || profile.visibility === 'all_members' || isConnected || profile.isOwnProfile;
  const isBlocked      = matriCtx?.isBlocked(profile.userId?._id);
  const isShortlisted  = matriCtx?.isShortlisted(profile._id);

  const age       = profile.age;
  const name      = profile.personal?.fullName || 'Member';
  const location  = [profile.location?.city, profile.location?.state].filter(Boolean).join(', ');
  const matchScore = profile.matchScore;

  // ─── Actions ────────────────────────────────────────────────────────────────
  const handleInterest = async () => {
    if (isConnected) {
      // Open chat
      try {
        const res = await matrimonialChatService.openConversation(profile._id);
        navigate(`/member/matrimonial/chat/${res.data.data.conversation._id}`);
      } catch (err) {
        showToast('Cannot open chat.');
      }
      return;
    }
    if (isInterestSent) {
      // Withdraw
      const res = await cancelInterest(myInterestId);
      if (res.success) { setInterestStatus(null); setMyInterestId(null); showToast('Interest withdrawn.'); }
      else showToast(res.error);
      return;
    }
    // Send interest
    const res = await sendInterest(profile._id, '');
    if (res.success) {
      setInterestStatus('sent');
      setMyInterestId(res.interest?._id);
      showToast('Interest sent! 💕');
    } else {
      showToast(res.error || 'Failed to send interest.');
    }
  };

  // ─── Send Marriage Request ────────────────────────────────────────────────
  const handleMarkAsMarried = async () => {
    if (marriageLoading) return;
    setMarriageLoading(true);
    try {
      await matrimonialMarriageService.sendRequest({ partnerProfileId: profile._id, message: '' });
      showToast('Marriage confirmation sent! Waiting for partner\'s response. 💍');
      setMarriageModal(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send marriage request.');
      setMarriageModal(false); // Close the modal so they aren't stuck on the error
    } finally {
      setMarriageLoading(false);
    }
  };

  const handleToggleShortlist = async () => {
    const res = await matriCtx.toggleShortlist(profile._id);
    showToast(isShortlisted ? 'Removed from shortlist' : 'Shortlisted ⭐');
  };

  const handleBlock = async () => {
    const res = isBlocked
      ? await matriCtx.unblockUser(profile.userId?._id)
      : await matriCtx.blockUser(profile.userId?._id, 'User preference');
    showToast(isBlocked ? 'Unblocked.' : 'Profile blocked.');
    setIsMenuOpen(false);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setReportSending(true);
    try {
      await matrimonialModerationService.reportProfile({
        reportedUserId: profile.userId?._id || profile.userId,  // Backend expects userId, not profileId
        reason: reportReason
      });
      showToast('Report submitted. Thank you.');
      setReportModal(false);
      setReportReason('');
    } catch (err) {
      showToast('Failed to submit report.');
    } finally {
      setReportSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      {/* ─── MARRIAGE SUCCESS SCREEN ─── */}
      {showMarriageSuccess && (
        <MarriageSuccessScreen
          partnerName={profile?.personal?.fullName}
          onDismiss={() => { setShowMarriageSuccess(false); navigate('/member/matrimonial'); }}
        />
      )}

      {/* ─── PHOTO GALLERY ─── */}
      <div className="relative bg-zinc-900">
        {/* Sticky Overlay Header */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleToggleShortlist}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90">
              {isShortlisted ? <BookmarkCheck size={17} className="text-amber-400" /> : <Bookmark size={17} />}
            </button>
            <button onClick={() => setIsMenuOpen(true)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Photo */}
        <div className="relative aspect-[3/4] max-h-[480px] overflow-hidden">
          {displayPhotos.length > 0 && isPhotoVisible ? (
            <img
              src={displayPhotos[activePhotoIndex]?.url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : primaryPhoto && !isPhotoVisible ? (
            <>
              <img src={primaryPhoto.url} alt={name} className="w-full h-full object-cover blur-2xl brightness-75 scale-105" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 z-10">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 relative mb-4">
                  <Image size={28} className="text-white/80" />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow">
                    <Lock size={13} className="text-slate-800" />
                  </div>
                </div>
                <p className="text-[13px] text-white font-extrabold px-4 leading-relaxed">
                  Photo visible only after connection is established
                </p>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-200 to-pink-300 flex items-center justify-center">
              <span className="text-[80px] font-black text-white/40">{name[0]}</span>
            </div>
          )}

          {/* Photo Nav */}
          {displayPhotos.length > 1 && isPhotoVisible && (
            <>
              {activePhotoIndex > 0 && (
                <button onClick={() => setActivePhotoIndex(p => p - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-12 bg-black/40 rounded-r-xl flex items-center justify-center text-white z-20">
                  <ChevronLeft size={20} />
                </button>
              )}
              {activePhotoIndex < displayPhotos.length - 1 && (
                <button onClick={() => setActivePhotoIndex(p => p + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-12 bg-black/40 rounded-l-xl flex items-center justify-center text-white z-20">
                  <ChevronRight size={20} />
                </button>
              )}
            </>
          )}

          {/* Dots */}
          {displayPhotos.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {displayPhotos.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i === activePhotoIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`} />
              ))}
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20 pb-5 px-5">
            <div className="flex items-center gap-2 mb-2">
              {profile.subscription?.isActive && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  <Crown size={9} /> Premium
                </span>
              )}
              {profile.verificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  <ShieldCheck size={9} /> Verified
                </span>
              )}
            </div>
            <h1 className="text-white text-[22px] font-black leading-tight">{name}{age ? `, ${age}` : ''}</h1>
            <p className="text-white/80 text-[12.5px] font-bold mt-1">
              {[profile.education?.profession, profile.personal?.community].filter(Boolean).join(' · ')}
            </p>
            {location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={11} className="text-white/60" />
                <span className="text-white/65 text-[11.5px] font-semibold">{location}</span>
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {profile.lastActiveAt && (
                  <div className="flex items-center gap-1 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                    <Clock size={9} className="text-white/60" />
                    <span className="text-[9px] text-white/60 font-bold">
                      {new Date(profile.lastActiveAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>
              {matchScore && <MatchScoreBadge score={matchScore} size={46} strokeWidth={3.5} />}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PROFILE CONTENT ─── */}
      <div className="px-4 mt-4">

        {/* About */}
        {profile.about?.biography && (
          <SectionCard title="About" icon={Sparkles}>
            <p className="text-[13px] text-slate-700 leading-relaxed font-semibold">"{profile.about.biography}"</p>
            {profile.lifestyle?.hobbies?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.lifestyle.hobbies.map((h, i) => (
                  <span key={i} className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-100">{h}</span>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Basic Details */}
        <SectionCard title="Basic Details" icon={Users}>
          <div className="grid grid-cols-2 gap-x-4">
            <InfoRow label="Height"        value={profile.personal?.height ? `${profile.personal.height} cm` : null} />
            <InfoRow label="Weight"        value={profile.personal?.weight ? `${profile.personal.weight} kg` : null} />
            <InfoRow label="Marital Status"value={profile.personal?.maritalStatus} />
            <InfoRow label="Mother Tongue" value={profile.personal?.motherTongue} />
            <InfoRow label="Religion"      value={profile.personal?.religion} />
            <InfoRow label="Community"     value={profile.personal?.community} />
          </div>
        </SectionCard>

        {/* Locked gate or full details */}
        {!profile.isRestricted || isConnected ? (
          <>
            <SectionCard title="Religious Background" icon={Moon}>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Gotra"   value={profile.personal?.gotra} />
                <InfoRow label="Manglik" value={profile.horoscope?.manglik} />
                <InfoRow label="Rashi"   value={profile.horoscope?.rashi} />
                <InfoRow label="Star"    value={profile.horoscope?.star} />
              </div>
            </SectionCard>

            <SectionCard title="Education & Career" icon={GraduationCap}>
              <InfoRow label="Qualification" value={profile.education?.highestQualification} icon={GraduationCap} />
              <InfoRow label="College"       value={profile.education?.college} />
              <InfoRow label="Profession"    value={profile.education?.profession} icon={Briefcase} />
              <InfoRow label="Company"       value={profile.education?.company} />
              <InfoRow label="Annual Income" value={profile.education?.annualIncome} />
            </SectionCard>

            <SectionCard title="Family Details" icon={HomeIcon}>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Father's Occupation" value={profile.family?.fatherOccupation} />
                <InfoRow label="Mother's Occupation" value={profile.family?.motherOccupation} />
                <InfoRow label="Brothers"  value={String(profile.family?.brothers ?? '')} />
                <InfoRow label="Sisters"   value={String(profile.family?.sisters ?? '')} />
                <InfoRow label="Family Type"  value={profile.family?.familyType} />
                <InfoRow label="Family Values" value={profile.family?.familyValues} />
              </div>
            </SectionCard>

            <SectionCard title="Lifestyle" icon={Utensils}>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Diet"     value={profile.lifestyle?.diet} icon={Utensils} />
                <InfoRow label="Smoking"  value={profile.lifestyle?.smoking} icon={Cigarette} />
                <InfoRow label="Drinking" value={profile.lifestyle?.drinking} icon={Wine} />
              </div>
            </SectionCard>

            {profile.preferences && (
              <SectionCard title="Partner Preferences" icon={Heart}>
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="Age Range"   value={`${profile.preferences.ageMin || ''}–${profile.preferences.ageMax || ''} yrs`} />
                  <InfoRow label="Education"   value={profile.preferences.education} />
                  <InfoRow label="Occupation"  value={profile.preferences.occupation} />
                  <InfoRow label="Community"   value={profile.preferences.community} />
                  <InfoRow label="City"        value={profile.preferences.city} />
                </div>
                {profile.about?.partnerExpectations && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400 font-semibold mb-0.5 uppercase tracking-wide">Expectations</p>
                    <p className="text-[12.5px] text-slate-700 font-semibold leading-relaxed">{profile.about.partnerExpectations}</p>
                  </div>
                )}
              </SectionCard>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm mb-4">
            <Lock size={20} className="text-slate-400 mx-auto mb-2" />
            <p className="text-[13px] font-black text-slate-800">Additional Details Locked</p>
            <p className="text-[11.5px] text-slate-400 mt-1 font-semibold leading-relaxed">
              These details unlock automatically if they accept your interest request, or you can view them instantly with a Premium Subscription.
            </p>
            <button 
              onClick={() => navigate('/member/profile/upgrade')}
              className="mt-4 bg-rose-50 text-rose-500 font-bold text-[12px] px-4 py-2 rounded-lg border border-rose-100 active:scale-95 transition-transform"
            >
              Get Premium Subscription
            </button>
          </div>
        )}
      </div>

      {/* ─── FIXED BOTTOM ACTION BAR ─── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 p-3 z-40 shadow-lg"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90">
            <X size={22} />
          </button>

          <button onClick={handleToggleShortlist}
            className={`w-12 h-12 rounded-xl flex items-center justify-center active:scale-90 transition-all ${
              isShortlisted ? 'bg-amber-100 text-amber-500 border border-amber-200' : 'bg-amber-50 text-amber-400 border border-amber-100'
            }`}>
            <Star size={21} fill={isShortlisted ? 'currentColor' : 'none'} />
          </button>

          <button onClick={handleInterest} disabled={actionLoading}
            className={`flex-1 py-3.5 rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-60 ${
              isConnected
                ? 'bg-emerald-500 text-white'
                : isInterestSent
                ? 'bg-rose-100 text-rose-500 border border-rose-200'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200'
            }`}>
            {actionLoading
              ? <Loader2 size={18} className="animate-spin" />
              : isConnected
              ? <><MessageCircle size={17} /> Chat Now</>
              : isInterestSent
              ? <><Check size={17} strokeWidth={3} /> Interest Sent</>
              : <><Heart size={17} fill="currentColor" /> Express Interest</>
            }
          </button>

          {isConnected && (
            <a href={`tel:${profile.userId?.phone}`}
              className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 active:scale-90">
              <Phone size={21} />
            </a>
          )}

          {/* Mark as Married — only for connected, non-closed profiles */}
          {isConnected && !profile.isClosed && (
            <button
              id="mark-as-married-btn"
              onClick={() => setMarriageModal(true)}
              className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center active:scale-90 shrink-0"
              title="Mark as Married"
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }} role="img" aria-label="ring">💍</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 3-DOT MENU ─── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsMenuOpen(false)} />
          <div className="bg-white w-full rounded-t-[28px] p-5 z-50 relative shadow-2xl max-w-md">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[15px] font-black text-slate-800 text-center mb-5">Profile Options</h3>
            <div className="space-y-2.5 mb-5">
              <button onClick={() => { handleToggleShortlist(); setIsMenuOpen(false); }}
                className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
                {isShortlisted ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {isShortlisted ? 'Remove from Shortlist' : 'Shortlist Profile'}
              </button>
              <button className="w-full py-3 bg-slate-50 text-slate-700 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
                <Share2 size={15} /> Share Profile
              </button>
              <button onClick={handleBlock}
                className="w-full py-3 bg-slate-50 text-red-500 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
                <Ban size={15} /> {isBlocked ? 'Unblock Profile' : 'Block Profile'}
              </button>
              <button onClick={() => { setReportModal(true); setIsMenuOpen(false); }}
                className="w-full py-3 bg-slate-50 text-red-500 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2">
                <Flag size={15} /> Report Abuse / Fake Profile
              </button>
            </div>
            <button onClick={() => setIsMenuOpen(false)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[13px] font-bold active:scale-95">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── REPORT MODAL ─── */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setReportModal(false)} />
          <div className="bg-white w-full rounded-t-[28px] p-5 z-50 relative shadow-2xl max-w-md">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[15px] font-black text-slate-800 mb-4">Report Profile</h3>
            <div className="space-y-2 mb-4">
              {['Fake / Fraud Profile', 'Inappropriate Photos', 'Abusive Behaviour', 'Spam / Scam', 'Other'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full py-2.5 rounded-xl text-[13px] font-bold text-left px-4 transition-all ${
                    reportReason === r ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-slate-50 text-slate-700'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={handleReport} disabled={!reportReason || reportSending}
              className="w-full py-3.5 bg-red-500 text-white rounded-xl text-[13px] font-bold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {reportSending && <Loader2 size={15} className="animate-spin" />}
              Submit Report
            </button>
            <button onClick={() => setReportModal(false)} className="w-full py-3 text-slate-400 text-[12px] font-bold mt-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── MARRIAGE CONFIRMATION MODAL ─── */}
      {marriageModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMarriageModal(false)} />
          <div className="bg-white w-full rounded-t-[28px] p-6 z-50 relative shadow-2xl max-w-md">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <span style={{ fontSize: '48px', lineHeight: 1, display: 'block', marginBottom: '12px' }} role="img" aria-label="rings">💍🥚</span>
              <h3 className="text-[17px] font-black text-slate-800 mb-2">Confirm Marriage?</h3>
              <p className="text-[13px] text-slate-500 font-semibold leading-relaxed">
                You are about to send a marriage confirmation request to <strong className="text-slate-800">{profile?.personal?.fullName || 'this person'}</strong>.
              </p>
              <p className="text-[12px] text-rose-500 font-bold mt-3 bg-rose-50 rounded-xl px-4 py-2">
                Once both parties confirm, both profiles will be permanently closed and removed from matchmaking.
              </p>
            </div>
            <button
              id="confirm-marriage-request-btn"
              onClick={handleMarkAsMarried}
              disabled={marriageLoading}
              className="w-full py-3.5 rounded-xl text-[14px] font-extrabold text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 mb-3"
              style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
            >
              {marriageLoading
                ? <Loader2 size={16} className="animate-spin" />
                : <span role="img" aria-label="ring">💍</span>}
              Send Marriage Confirmation
            </button>
            <button
              onClick={() => setMarriageModal(false)}
              className="w-full py-3 text-slate-400 text-[12px] font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[12px] font-black px-5 py-3 rounded-full shadow-lg z-[60] max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MatrimonialProfilePage;
