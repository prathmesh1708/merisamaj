import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, CheckCircle, Phone, MessageCircle, MapPin, Share2, X, 
  Clock, ShieldCheck, Briefcase, Award, Building2, User, Globe, Mail,
  ExternalLink, Play, ChevronRight, Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import useProfessionalDirectory from '../../hooks/useProfessionalDirectory';
import { AnimatedPage } from '../../components/layout/AnimatedPage';

const ProfessionalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useData();
  const { listings, isLoading, error } = useProfessionalDirectory(currentUser?.communityId || 'default');
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Find the specific professional by ID
  const activeProfessional = listings.find(p => p.id === id);

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Business Profile...</p>
          </div>
        </div>
      </AnimatedPage>
    );
  }

  if (error || !activeProfessional) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-5 text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-4 border border-indigo-100 shadow-sm">
            <Building2 size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-800">Business Profile Not Found</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-sm font-medium">The professional listing you are looking for does not exist or has been removed.</p>
          <button onClick={() => navigate(-1)} className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all">
            Return to Directory
          </button>
        </div>
      </AnimatedPage>
    );
  }

  const primaryPhoto = activeProfessional.media?.find(m => m.type === 'image')?.url || activeProfessional.logo;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-50/80 font-sans pb-28 text-slate-800">
        
        {/* ── STICKY TOP APP BAR ── */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 h-15 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-1 rounded-2xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 transition-colors press-scale"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight line-clamp-1">
                {activeProfessional.title}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {activeProfessional.category}
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: activeProfessional.title,
                  text: `Check out ${activeProfessional.title} on ApniSamaj Business Directory`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }
            }}
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors press-scale border border-indigo-100/50 shrink-0"
            title="Share Business"
          >
            <Share2 size={17} />
          </button>
        </header>

        <main className="max-w-2xl mx-auto w-full px-4 pt-4 space-y-4">
          
          {/* ── PROFILE CARD ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 relative">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full inline-block mb-2">
                  {activeProfessional.category}
                </span>
                <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  {activeProfessional.title}
                </h2>
                <p className="text-[13px] font-bold text-slate-600 mt-1">
                  {activeProfessional.profession || activeProfessional.category}
                </p>
              </div>

              {activeProfessional.verified && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-100 shrink-0">
                  <ShieldCheck size={13} className="text-emerald-600" /> Verified
                </span>
              )}
            </div>

            {activeProfessional.community && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Building2 size={12} className="text-slate-500" />
                  {activeProfessional.community} Chapter
                </span>
                {activeProfessional.experience !== undefined && activeProfessional.experience !== null && (
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                    {activeProfessional.experience} {Number(activeProfessional.experience) === 1 ? 'Year' : 'Years'} Experience
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── QUICK STATS HIGHLIGHT BAR ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Working Hours */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Working Hours</span>
                <Clock size={15} className="text-indigo-500" />
              </div>
              <p className="text-[14px] font-black text-slate-900 pt-0.5">{activeProfessional.businessTiming || '09:00 AM - 08:00 PM'}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Open Today
              </span>
            </div>

            {/* Location & Address */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Location / City</span>
                <MapPin size={15} className="text-indigo-500" />
              </div>
              <p className="text-[14px] font-black text-slate-900 truncate pt-0.5">{activeProfessional.city || 'Indore'}</p>
              <p className="text-[11px] text-slate-500 font-bold truncate">{activeProfessional.address || 'Address provided on request'}</p>
            </div>
          </div>

          {/* ── ABOUT BUSINESS DESCRIPTION ── */}
          {activeProfessional.description && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-2.5">
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" /> About Services & Business
              </h3>
              <p className="text-[14px] text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                {activeProfessional.description}
              </p>
            </div>
          )}

          {/* ── PHOTOS & VIDEOS GALLERY ── */}
          {activeProfessional.media && activeProfessional.media.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Photos & Media ({activeProfessional.media.length})
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Tap to view full screen</span>
              </div>
              
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {activeProfessional.media.map((media, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedMedia(media)}
                    className="w-[200px] h-[130px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    {media.type === 'video' ? (
                      <>
                        <video 
                          src={media.url} 
                          className="w-full h-full object-cover pointer-events-none" 
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center group-hover:bg-slate-900/40 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform">
                            <Play size={18} className="text-indigo-600 fill-indigo-600 translate-x-[1px]" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img 
                        src={media.url} 
                        alt="Business gallery" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-md text-[8px] font-extrabold text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {media.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OWNER & CONTACT DETAILS CARD ── */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
              Contact & Owner Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                  <p className="text-[15px] font-black text-slate-900 mt-0.5">{activeProfessional.phone || 'Not specified'}</p>
                </div>
                <a 
                  href={`tel:${activeProfessional.phone}`}
                  className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors press-scale"
                  title="Call Now"
                >
                  <Phone size={16} />
                </a>
              </div>

              {/* Owner Name */}
              {activeProfessional.owner?.name && (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Listing Owner / Representative</span>
                    <p className="text-[14px] font-bold text-slate-800 mt-0.5">{activeProfessional.owner.name}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <User size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>

        </main>

        {/* ── FIXED ACTION BOTTOM BAR ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 p-3.5 pb-safe z-40 max-w-2xl mx-auto">
          <div className="flex gap-3">
            {/* Phone Call Button (launches native mobile phone dialer) */}
            {activeProfessional.phone && (
              <a
                href={`tel:${activeProfessional.phone.replace(/[^0-9+]/g, '')}`}
                className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[14px] font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Phone size={17} />
                <span>Call</span>
              </a>
            )}

            {/* In-App Direct Message (launches Chat Section) */}
            <button
              onClick={() => {
                const targetId = activeProfessional.ownerId || activeProfessional.owner?._id || activeProfessional.id;
                navigate(`/member/chat/member/${targetId}`);
              }}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[14px] font-black shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle size={18} />
              <span>Send Message</span>
            </button>
          </div>
        </div>

        {/* ── LIGHTBOX / FULL-SCREEN MEDIA VIEWER ── */}
        {selectedMedia && (
          <div 
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center z-[100] p-4 animate-fade-in"
            onClick={() => setSelectedMedia(null)}
          >
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md press-scale border border-white/10 z-[110] transition-colors"
            >
              <X size={22} />
            </button>
            
            <div 
              className="w-full max-w-3xl max-h-[80vh] flex items-center justify-center relative select-none animate-zoom-in"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedMedia.type === 'video' ? (
                <video 
                  src={selectedMedia.url} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" 
                  playsInline
                />
              ) : (
                <img 
                  src={selectedMedia.url} 
                  alt="Full size view" 
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-fade-in"
                />
              )}
            </div>
            
            <p className="text-slate-400 text-xs font-bold mt-4 tracking-wide">Tap outside to close</p>
          </div>
        )}

      </div>
    </AnimatedPage>
  );
};

export default ProfessionalDetailPage;
