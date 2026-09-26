import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Eye, MessageCircle, Bell, Menu } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { AnimatedPage } from '../../components/layout/AnimatedPage';
import { resolvePostMediaUrl } from '../../utils/mediaUtils';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
  { id: 'ceremony', label: 'Upcoming Ceremonies' },
  { id: 'saved', label: 'Saved' },
];

const formatCount = (n) => {
  if (!n && n !== 0) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

/* ─── Elegant Light Cream / White Memorial Card ─── */
const MemorialCard = ({ obituary, index }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const resolvedImage = resolvePostMediaUrl(obituary.image);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate(`/member/shradhanjali/${obituary.id}`)}
      className="relative rounded-[24px] overflow-hidden cursor-pointer card-press bg-white border border-amber-200/70 shadow-[0_4px_22px_rgba(124,92,46,0.07)] hover:shadow-[0_8px_30px_rgba(124,92,46,0.12)] transition-all"
    >
      {/* ── Hero photo / Peaceful Placeholder ── */}
      <div className="relative h-[220px] bg-gradient-to-b from-amber-100/50 via-amber-50/30 to-amber-100/40 flex items-center justify-center overflow-hidden border-b border-amber-100/80">
        {resolvedImage && !imgError ? (
          <>
            {/* Ambient blur background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <img
                src={resolvedImage}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover blur-xl scale-125 opacity-30"
              />
            </div>
            <img
              src={resolvedImage}
              alt={obituary.deceasedName}
              onError={() => setImgError(true)}
              className="relative z-0 w-full h-full object-contain"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-[52px] animate-pulse">🪔</span>
            <div className="px-3.5 py-1 rounded-full bg-amber-900/10 border border-amber-900/20 text-amber-900 font-extrabold text-[11px] tracking-wider uppercase">
              In Loving Memory
            </div>
            <p className="text-[13px] font-bold text-slate-600 max-w-[200px] truncate">
              {obituary.deceasedName}
            </p>
          </div>
        )}

        {/* Om Shanti badge */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-extrabold shadow-sm z-10"
          style={{
            background: 'rgba(20, 12, 0, 0.72)',
            backdropFilter: 'blur(12px)',
            color: '#F5E6C8',
            border: '1px solid rgba(212,175,55,0.4)',
          }}
        >
          🪔 Om Shanti
        </div>

        {/* Floral corners */}
        <div className="absolute bottom-2 left-3 right-3 flex justify-between pointer-events-none z-10">
          <span className="text-[22px] select-none opacity-80" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>🌸</span>
          <span className="text-[22px] select-none opacity-80" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>🌸</span>
        </div>
      </div>

      {/* ── Info block in Light Cream / White ── */}
      <div className="p-4 pt-3.5 bg-gradient-to-b from-[#FFFDF9] to-white text-left">
        {/* Name */}
        <h2
          className="text-[18px] font-extrabold leading-snug mb-1 text-slate-800 tracking-tight"
          style={{ fontFamily: 'Outfit, serif' }}
        >
          {obituary.deceasedName}
        </h2>

        {/* Age + Passing Date */}
        <p className="text-[12.5px] font-bold text-amber-800/90 mb-1">
          {obituary.age > 0 ? `Age: ${obituary.age} Years` : ''}
          {obituary.age > 0 && obituary.dateOfPassing ? ' • ' : ''}
          {obituary.dateOfPassing ? `Passing: ${obituary.dateOfPassing}` : ''}
        </p>

        {/* Birth date */}
        {obituary.birthDate && (
          <p className="text-[11.5px] font-semibold text-slate-500 mb-2.5">
            🌸 Birth: {obituary.birthDate}
          </p>
        )}

        {/* Message */}
        {obituary.message && (
          <p className="text-[12.5px] leading-relaxed line-clamp-2 mb-3.5 text-slate-600 font-medium italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/70">
            "{obituary.message}"
          </p>
        )}

        {/* ── Stats row ── */}
        <div
          className="flex items-center justify-around py-2.5 px-2 rounded-xl bg-amber-50/50 border border-amber-200/50 mb-3.5"
        >
          {/* Haath Jode */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[17px]">🙏</span>
            <span className="text-[13px] font-black text-amber-900">
              {formatCount(obituary.haathJodeCount ?? obituary.shraddhanjaliCount)}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              Folded Hands
            </span>
          </div>

          <div className="w-px h-7 bg-amber-200/60" />

          {/* Mala Arpan */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[17px]">🪷</span>
            <span className="text-[13px] font-black text-pink-600">
              {formatCount(obituary.malaArpanCount)}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              Garland
            </span>
          </div>

          <div className="w-px h-7 bg-amber-200/60" />

          {/* Views */}
          <div className="flex flex-col items-center gap-0.5">
            <Eye size={16} className="text-slate-500" />
            <span className="text-[13px] font-black text-slate-700">
              {formatCount(obituary.views)}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              Views
            </span>
          </div>
        </div>

        {/* ── Author + timestamp row ── */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-100/70 text-slate-500">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-black shrink-0 bg-amber-100 text-amber-900 border border-amber-200"
            >
              {obituary.author?.initials || '?'}
            </div>
            <span className="text-[11.5px] font-bold text-slate-600 truncate max-w-[180px]">
              {obituary.author?.name} {obituary.author?.relation ? `(${obituary.author.relation})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 shrink-0">
            <div className="flex items-center gap-1">
              <MessageCircle size={12} />
              <span className="text-[11px] font-bold">
                {obituary.comments?.length || 0}
              </span>
            </div>
            <span className="text-[11px] font-medium">
              {obituary.timestamp}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Page ─── */
const ShradhanjaliHomePage = () => {
  const navigate = useNavigate();
  const { obituaries, obituariesLoading, obituariesError, loadObituaries, hasMoreObituaries, loadMoreObituaries, getUnreadCountForModule, currentUser, setMobileMenuOpen, markModuleAsVisited } = useData();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (loadObituaries) loadObituaries();
    if (markModuleAsVisited) markModuleAsVisited('shradhanjali');
  }, []); // Run on mount

  const communityId = useMemo(() => {
    const comName = currentUser?.community;
    return comName ? comName.toLowerCase().replace(/\s/g, '_') : 'cm_123';
  }, [currentUser]);

  const settings = useMemo(() => {
    const saved = localStorage.getItem(`community_settings_${communityId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.shradhanjali) return parsed.shradhanjali;
      } catch (e) {}
    }
    return { enabled: true, memberSubmissionEnabled: true, requireApproval: true };
  }, [communityId]);

  const parseDateSafe = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const str = String(dateStr).trim();
    // YYYY-MM-DD
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const filtered = obituaries.filter((ob) => {
    if (!ob) return false;

    // 0. Status check: regular users see Approved posts or their own
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const isOwner = ob.author?.id && String(ob.author.id) === currentUserId;
    const status = (ob.status || 'Approved').toLowerCase();
    if (currentUser?.role !== 'admin' && !isOwner && status !== 'approved') {
      return false;
    }

    // 1. Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchSearch = (
        ob.deceasedName?.toLowerCase().includes(q) ||
        ob.deceasedNameEn?.toLowerCase().includes(q) ||
        ob.author?.name?.toLowerCase().includes(q) ||
        ob.message?.toLowerCase().includes(q) ||
        ob.funeralDetails?.venue?.toLowerCase().includes(q) ||
        ob.funeralDetails?.type?.toLowerCase().includes(q)
      );
      if (!matchSearch) return false;
    }

    // 2. Tab filter
    if (activeFilter === 'recent') {
      const dateToCheck = ob.dateOfPassing || ob.createdAt || ob.timestamp;
      if (dateToCheck) {
        const passingDate = parseDateSafe(dateToCheck);
        if (passingDate) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          thirtyDaysAgo.setHours(0, 0, 0, 0);
          return passingDate >= thirtyDaysAgo;
        }
      }
      return true;
    }

    if (activeFilter === 'ceremony') {
      const dates = [];
      if (ob.funeralDetails?.date) dates.push(ob.funeralDetails.date);
      if (Array.isArray(ob.ceremonies)) {
        ob.ceremonies.forEach(c => {
          if (c.date) dates.push(c.date);
        });
      }
      if (dates.length === 0) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dates.some(dStr => {
        const parsed = parseDateSafe(dStr);
        if (!parsed) return false;
        parsed.setHours(0, 0, 0, 0);
        return parsed >= today;
      });
    }

    if (activeFilter === 'saved') {
      return !!ob.isSaved || !!ob.saved;
    }

    return true;
  });

  if (!settings.enabled) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center gap-4">
          <span className="text-[64px]">🪔</span>
          <h2 className="text-xl font-bold text-gray-800">Obituary Section Disabled</h2>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
            The Obituary (Shradhanjali) portal has been disabled by your Samaj Administrator or Community Head. Please contact them for more details.
          </p>
          <button 
            onClick={() => navigate('/member/home')}
            className="mt-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white press-scale"
            style={{ background: '#7C5C2E' }}
          >
            Go back to Home
          </button>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      {/* ─── Header ─── */}
      <div
        className="responsive-fixed-top z-40 border-b"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(212,175,55,0.22)',
          boxShadow: '0 2px 14px rgba(124,92,46,0.04)',
          paddingTop: 'var(--spacing-safe-top)',
        }}
      >
        <div className="flex items-center h-14 px-4 gap-3">
          <AnimatePresence mode="wait">
            {showSearch ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex items-center gap-2 rounded-2xl px-3.5 py-2 border shadow-inner"
                style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'rgba(253,248,240,0.5)' }}
              >
                <Search size={16} className="text-amber-700/60 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by deceased name..."
                  className="flex-1 bg-transparent border-none text-[13px] text-gray-900 placeholder-amber-900/40 focus:outline-none font-bold"
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X size={14} className="text-amber-800" />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="title"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2.5 flex-1 text-left"
              >
                <button 
                  onClick={() => setMobileMenuOpen && setMobileMenuOpen(true)}
                  className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-amber-50 transition-colors press-scale"
                  aria-label="Open Navigation Menu"
                >
                  <Menu size={20} style={{ color: '#7C5C2E' }} />
                </button>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shrink-0">
                  <span className="text-[17px]">🪔</span>
                </div>
                <div>
                  <h1 className="text-[16px] font-extrabold leading-tight tracking-tight" style={{ color: '#7C5C2E' }}>
                    Shradhanjali
                  </h1>
                  <p className="text-[10px] font-extrabold text-amber-900/60 uppercase tracking-wider">Om Shanti</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: count badge + bell + search toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {!showSearch && filtered.length > 0 && (
              <span
                className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full"
                style={{ background: 'rgba(124,92,46,0.1)', color: '#7C5C2E' }}
              >
                {filtered.length} Posts
              </span>
            )}
            <button
              onClick={() => navigate('/member/notifications?module=shradhanjali')}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 relative hover:bg-amber-50 transition-all press-scale"
            >
              <Bell size={18} style={{ color: '#7C5C2E' }} />
              {getUnreadCountForModule('shradhanjali') > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearch(''); }}
              className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-amber-50 transition-all press-scale"
            >
              {showSearch
                ? <X size={18} style={{ color: '#7C5C2E' }} />
                : <Search size={18} style={{ color: '#7C5C2E' }} />}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className="shrink-0 px-4 py-1.5 rounded-xl text-[11.5px] font-extrabold transition-all press-scale border"
              style={{
                background: activeFilter === tab.id ? 'linear-gradient(135deg, #7C5C2E 0%, #A37A3E 100%)' : 'white',
                color: activeFilter === tab.id ? 'white' : '#7C5C2E',
                borderColor: activeFilter === tab.id ? '#7C5C2E' : 'rgba(124,92,46,0.2)',
                boxShadow: activeFilter === tab.id ? '0 4px 14px rgba(124,92,46,0.25)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Cards List ─── */}
      <div className="pt-[116px] pb-32 px-4 max-w-lg mx-auto space-y-6">
        {obituariesLoading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="text-[44px]"
            >
              🪔
            </motion.div>
            <p className="text-[13px] text-slate-600 font-extrabold">Loading tributes...</p>
          </div>
        ) : obituariesError && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-[44px]">⚠️</span>
            <p className="text-[13px] text-red-500 font-extrabold">{obituariesError}</p>
            <button
              onClick={() => loadObituaries && loadObituaries()}
              className="px-5 py-2.5 rounded-xl text-[12px] font-extrabold text-white press-scale shadow-md"
              style={{ background: '#7C5C2E' }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="flex items-center justify-between pt-1 pb-1">
                <span className="text-[12px] font-extrabold text-slate-400">
                  {filtered.length} Obituary Tributes
                </span>
              </div>
            )}

            <div className="space-y-6">
              {filtered.map((ob, idx) => (
                <MemorialCard key={ob.id} obituary={ob} index={idx} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreObituaries && filtered.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreObituaries}
                  disabled={obituariesLoading}
                  className="px-6 py-2.5 rounded-xl border border-[#7C5C2E]/30 text-[#7C5C2E] font-extrabold text-xs bg-amber-50/60 hover:bg-amber-100/60 transition-colors disabled:opacity-50 press-scale"
                >
                  {obituariesLoading ? 'Loading more tributes...' : 'Load More Tributes'}
                </button>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 py-16 bg-white rounded-[28px] border border-amber-200/60 p-8 shadow-xs text-center"
              >
                <span className="text-[52px]">🪔</span>
                <p className="text-[15px] font-extrabold text-slate-800">
                  {activeFilter === 'saved' ? 'No saved obituaries yet' : 'No obituaries found'}
                </p>
                {activeFilter === 'saved' && (
                  <p className="text-[12px] text-slate-400 font-medium max-w-xs">
                    Tribute posts that you bookmark will appear here for easy access.
                  </p>
                )}
                {search && (
                  <p className="text-[12px] text-slate-400 font-medium">
                    No results found matching "{search}"
                  </p>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ─── FAB ─── */}
      {settings.memberSubmissionEnabled && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/member/shradhanjali/create')}
          className="fixed bottom-[92px] right-5 flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-extrabold text-[13px] shadow-xl z-40 press-scale"
          style={{
            background: 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)',
            boxShadow: '0 8px 24px rgba(124,92,46,0.35)',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Post Obituary</span>
        </motion.button>
      )}
    </AnimatedPage>
  );
};

export default ShradhanjaliHomePage;
