import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, X, SlidersHorizontal, Loader2,
  Heart, BookmarkCheck, Bookmark, ShieldCheck, Crown,
  MapPin, Briefcase, ChevronDown, Check
} from 'lucide-react';
import { useMatrimonial } from './MatrimonialContext';
import { matrimonialProfileService, matrimonialInterestService } from '../../../../core/api/matrimonialService';

// ─── Profile Card ─────────────────────────────────────────────────────────────
const ProfileCard = ({ profile, onInterest, onShortlist, isShortlisted, interestsSent, navigate }) => {
  const name      = profile.personal?.fullName || 'Member';
  const age       = profile.age;
  const city      = profile.location?.city;
  const state     = profile.location?.state;
  const profession= profile.education?.occupation || profile.education?.profession;
  const community = profile.personal?.community;
  const photo     = profile.photos?.find(p => p.isPrimary)?.url
                  || profile.photos?.[0]?.url
                  || profile.avatar;
  const isVerified= profile.verificationStatus === 'verified';
  const isPremium = profile.isPremium;
  const matchScore= profile.matchScore;
  const hasSentInterest = interestsSent.has(profile._id);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
      <div
        className="relative aspect-[3/4] overflow-hidden bg-slate-100 cursor-pointer"
        onClick={() => navigate(`/member/matrimonial/${profile._id}`)}
      >
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[48px] font-black bg-gradient-to-br from-rose-100 to-pink-200 text-rose-400">
            {name[0]}
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {isPremium && (
              <span className="inline-flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                <Crown size={7} /> Premium
              </span>
            )}
            {isVerified && (
              <ShieldCheck size={12} className="text-emerald-400" />
            )}
          </div>
          <p className="text-white text-[13px] font-extrabold leading-tight">{name}{age ? `, ${age}` : ''}</p>
          {(city || state) && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-white/60" />
              <p className="text-white/70 text-[10.5px] font-semibold truncate">{[city, state].filter(Boolean).join(', ')}</p>
            </div>
          )}
          {profession && (
            <div className="flex items-center gap-1 mt-0.5">
              <Briefcase size={10} className="text-white/60" />
              <p className="text-white/70 text-[10.5px] font-semibold truncate">{profession}</p>
            </div>
          )}
          {matchScore && (
            <div className="mt-1.5">
              <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">{matchScore}% Match</span>
            </div>
          )}
        </div>

        {/* Shortlist btn */}
        <button
          onClick={e => { e.stopPropagation(); onShortlist(profile._id); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90"
        >
          {isShortlisted ? <BookmarkCheck size={14} className="text-amber-400" /> : <Bookmark size={14} />}
        </button>
      </div>

      {/* Interest button */}
      <div className="p-3">
        <button
          onClick={() => onInterest(profile._id)}
          className={`w-full py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            hasSentInterest
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'bg-rose-500 text-white shadow-sm hover:bg-rose-600'
          }`}
        >
          {hasSentInterest ? <Check size={13} strokeWidth={2.8} /> : <Heart size={12} fill="none" />}
          {hasSentInterest ? 'Sent' : 'Send Interest'}
        </button>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const MatrimonialSearchPage = () => {
  const navigate  = useNavigate();
  const matriCtx  = useMatrimonial();

  const [profiles, setProfiles]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [interestsSent, setInterestsSent] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]           = useState('');

  const [filters, setFilters] = useState({
    gender:        'female',
    ageMin:        21,
    ageMax:        35,
    communityScope:'all',
    community:     '',
    city:          '',
    state:         '',
    religion:      '',
    maritalStatus: '',
    highestQualification: '',
    profession:    '',
    diet:          '',
    sortBy:        'matchScore',
    withPhoto:     true,
    verifiedOnly:  false,
  });

  const observerRef  = useRef(null);
  const sentinelRef  = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Block married users
  useEffect(() => {
    if (matriCtx?.myProfile && (matriCtx.myProfile.isClosed || matriCtx.myProfile.status === 'married')) {
      navigate('/member/matrimonial', { replace: true });
    }
  }, [matriCtx?.myProfile, navigate]);

  // ─── Search API ─────────────────────────────────────────────────────────────
  const searchProfiles = useCallback(async (resetPage = false) => {
    if (loading) return;
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    try {
      const params = {
        ...filters,
        page: currentPage,
        limit: 12
      };
      // Remove empty filters
      Object.keys(params).forEach(k => { if (params[k] === '' || params[k] === false) delete params[k]; });

      const res = await matrimonialProfileService.searchProfiles(params);
      const data = res.data.data;
      const newProfiles = data.profiles || [];
      // Backend wraps pagination fields inside data.pagination object
      const totalCount  = data.pagination?.total || data.total || 0;
      const totalPages  = data.pagination?.pages || data.pages || 1;

      if (resetPage) {
        setProfiles(newProfiles);
        setPage(2);
      } else {
        setProfiles(prev => [...prev, ...newProfiles]);
        setPage(p => p + 1);
      }
      setTotal(totalCount);
      setHasMore(currentPage < totalPages);
    } catch (err) {
      console.error('Search failed:', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, loading]);

  // Initial search
  useEffect(() => {
    searchProfiles(true);
    // eslint-disable-next-line
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          searchProfiles(false);
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, searchProfiles]);

  const handleApplyFilters = () => {
    setPage(1);
    searchProfiles(true);
    setShowFilters(false);
  };

  const handleInterest = async (profileId) => {
    if (interestsSent.has(profileId)) return;
    try {
      await matrimonialInterestService.sendInterest({ receiverProfileId: profileId });
      setInterestsSent(prev => new Set([...prev, profileId]));
      showToast('Interest sent! 💕');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send interest.');
    }
  };

  const handleShortlist = async (profileId) => {
    const res = await matriCtx.toggleShortlist(profileId);
    if (res?.success) showToast(matriCtx.isShortlisted(profileId) ? 'Removed from shortlist' : 'Shortlisted ⭐');
  };

  const selectCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-800 outline-none focus:border-rose-500 appearance-none";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-1 active:opacity-60">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-black text-slate-800 leading-none">Find Matches</h1>
          {total > 0 && <p className="text-[10px] font-bold text-rose-500 mt-0.5">{total.toLocaleString()} profiles found</p>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${
            showFilters ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-slate-100 shadow-sm px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Gender */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Looking For</label>
              <div className="flex gap-2">
                {[{v:'female', l:'👩 Bride'}, {v:'male', l:'👨 Groom'}].map(g => (
                  <button key={g.v} type="button"
                    onClick={() => setFilters(f => ({ ...f, gender: g.v }))}
                    className={`flex-1 py-2.5 rounded-xl text-[12.5px] font-bold border transition-all ${filters.gender === g.v ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Scope */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Community Scope</label>
              <div className="flex gap-2">
                {[
                  { v: 'all', l: '🌐 All Members' },
                  { v: 'my', l: '🤝 My Samaj' },
                  { v: 'other', l: '🌍 Other Samaj' }
                ].map(cs => (
                  <button key={cs.v} type="button"
                    onClick={() => setFilters(f => ({ ...f, communityScope: cs.v }))}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${filters.communityScope === cs.v ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {cs.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Min Age</label>
              <input type="number" min="18" max="70" value={filters.ageMin} onChange={e => setFilters(f => ({ ...f, ageMin: Number(e.target.value) }))}
                className={selectCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Max Age</label>
              <input type="number" min="18" max="70" value={filters.ageMax} onChange={e => setFilters(f => ({ ...f, ageMax: Number(e.target.value) }))}
                className={selectCls} />
            </div>

            {/* City */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">City</label>
              <input type="text" placeholder="Any city" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                className={selectCls} />
            </div>

            {/* Community */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Community</label>
              <input type="text" placeholder="Any community" value={filters.community} onChange={e => setFilters(f => ({ ...f, community: e.target.value }))}
                className={selectCls} />
            </div>

            {/* Marital Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Marital Status</label>
              <select value={filters.maritalStatus} onChange={e => setFilters(f => ({ ...f, maritalStatus: e.target.value }))} className={selectCls}>
                <option value="">All</option>
                {['Never Married', 'Divorced', 'Widowed', 'Separated'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Diet */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Diet</label>
              <select value={filters.diet} onChange={e => setFilters(f => ({ ...f, diet: e.target.value }))} className={selectCls}>
                <option value="">All</option>
                {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Jain'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sort By</label>
              <select value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))} className={selectCls}>
                <option value="matchScore">Match %</option>
                <option value="recent">Recently Joined</option>
                <option value="lastActive">Recently Active</option>
                <option value="premiumFirst">Premium First</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-slate-700">With Photo Only</span>
              <div onClick={() => setFilters(f => ({ ...f, withPhoto: !f.withPhoto }))}
                className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${filters.withPhoto ? 'bg-rose-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${filters.withPhoto ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-slate-700">Verified Profiles Only</span>
              <div onClick={() => setFilters(f => ({ ...f, verifiedOnly: !f.verifiedOnly }))}
                className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${filters.verifiedOnly ? 'bg-rose-500' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${filters.verifiedOnly ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </div>

          <button onClick={handleApplyFilters}
            className="w-full py-3 bg-rose-500 text-white rounded-xl text-[13.5px] font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
            <Search size={15} /> Apply Filters
          </button>
        </div>
      )}

      {/* Results Grid */}
      <div className="flex-1 px-4 pt-4">
        {profiles.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={36} className="text-slate-300 mb-3" />
            <h3 className="text-[14px] font-extrabold text-slate-800 mb-1">No profiles found</h3>
            <p className="text-[12px] text-slate-400 font-semibold">Try adjusting your filters</p>
            <button onClick={() => { setFilters(f => ({ ...f, community: '', city: '', maritalStatus: '', diet: '' })); handleApplyFilters(); }}
              className="mt-4 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-[12.5px] font-bold active:scale-95">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map(profile => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                navigate={navigate}
                onInterest={handleInterest}
                onShortlist={handleShortlist}
                isShortlisted={matriCtx?.isShortlisted(profile._id)}
                interestsSent={interestsSent}
              />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-6" />

        {/* Loading more */}
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={26} className="text-rose-400 animate-spin" />
          </div>
        )}

        {!hasMore && profiles.length > 0 && (
          <p className="text-center text-[11px] text-slate-400 font-semibold py-4">All profiles loaded</p>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[12px] font-black px-5 py-3 rounded-full shadow-lg z-[60] max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MatrimonialSearchPage;
