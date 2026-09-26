import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2, Bookmark, BookmarkCheck, Flower, Phone, Eye, Edit, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { AnimatedPage } from '../../components/layout/AnimatedPage';
import TributeHeroImage from './components/TributeHeroImage';
import CeremonySection from './components/CeremonySection';
import InteractionButtons from './components/InteractionButtons';
import TributeMessages from './components/TributeMessages';
import { Avatar } from '../../components/common/Avatar';

const ShradhanjaliDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    obituaries,
    obituariesLoading,
    obituariesError,
    loadObituaries,
    toggleHaathJode,
    incrementMalaArpan,
    saveShradhanjali,
    shareShradhanjali,
    incrementObituaryViews,
    deleteObituary,
    currentUser
  } = useData();

  useEffect(() => {
    if (obituaries.length === 0 && loadObituaries) {
      loadObituaries();
    }
  }, []);

  const obituary = obituaries.find(ob => ob.id === id);

  const isCreator = obituary?.author?.id === currentUser?.id || obituary?.author?.id === currentUser?._id;
  const isLeadOrAdmin = ['head', 'admin'].includes(currentUser?.role);
  const canModify = isCreator || isLeadOrAdmin;

  // Increment view count on mount
  useEffect(() => {
    if (obituary && incrementObituaryViews) {
      incrementObituaryViews(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!obituary]);

  const handleDelete = async () => {
    if (window.confirm('क्या आप सचमुच इस श्रद्धांजलि पोस्ट को हटाना चाहते हैं? Are you sure you want to delete this tribute?')) {
      try {
        await deleteObituary(id);
        navigate('/member/shradhanjali', { replace: true });
      } catch (error) {
        alert('Failed to delete: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (obituariesLoading && !obituary) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="text-[44px]"
          >
            🪔
          </motion.div>
          <p className="text-gray-500 font-medium">Loading tribute details...</p>
        </div>
      </AnimatedPage>
    );
  }

  if (!obituary) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <span className="text-[56px]">🕊️</span>
          <p className="text-gray-500 font-medium">Tribute post not found</p>
          <button onClick={() => navigate('/member/shradhanjali')} className="text-[13px] font-semibold px-4 py-2 border rounded-xl" style={{ color: '#7C5C2E' }}>
            Back to List
          </button>
        </div>
      </AnimatedPage>
    );
  }

  const formatCount = (n) => {
    if (!n && n !== 0) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const handleShare = async () => {
    shareShradhanjali && shareShradhanjali(id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: obituary.deceasedName,
          text: `${obituary.deceasedName}'s Tribute — MeriSamaj`,
          url: window.location.href
        });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <AnimatedPage>
      {/* Floating top bar */}
      <div
        className="responsive-fixed-top z-40"
        style={{ paddingTop: 'var(--spacing-safe-top)' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full press-scale"
            style={{ background: 'rgba(20,12,0,0.65)', backdropFilter: 'blur(14px)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            <ArrowLeft size={18} />
            <span className="text-[12.5px] font-extrabold">Tribute</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => saveShradhanjali && saveShradhanjali(id)}
              className="w-9 h-9 rounded-full flex items-center justify-center press-scale"
              style={{ background: 'rgba(20,12,0,0.65)', backdropFilter: 'blur(14px)', color: obituary.isSaved ? '#D4AF37' : 'rgba(212,175,55,0.6)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              {obituary.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
            {canModify && (
              <>
                <button
                  onClick={() => navigate(`/member/shradhanjali/edit/${id}`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center press-scale"
                  style={{ background: 'rgba(20,12,0,0.65)', backdropFilter: 'blur(14px)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-9 h-9 rounded-full flex items-center justify-center press-scale text-rose-400"
                  style={{ background: 'rgba(20,12,0,0.65)', backdropFilter: 'blur(14px)', border: '1px solid rgba(244,63,94,0.3)' }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <span className="text-[20px]">🪔</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="pb-24 max-w-lg mx-auto select-none">

        {/* Hero Image */}
        <TributeHeroImage
          src={obituary.image}
          alt={obituary.deceasedName}
          deceasedName={obituary.deceasedName}
        />

        {/* Main content card */}
        <div className="px-4 mt-3 relative z-10 space-y-4">

          {/* ── Name & Bio Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[28px] border border-amber-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center p-5 sm:p-6"
          >
            {/* Name */}
            <h1
              className="text-[22px] font-extrabold leading-tight mb-1 text-center text-slate-900 tracking-tight"
            >
              {obituary.deceasedName}
            </h1>

            {/* Age divider */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5))' }} />
              <span className="text-[12.5px] font-extrabold text-amber-900/70">Age: {obituary.age} Years</span>
              <div className="h-px flex-1 max-w-[60px]" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.5))' }} />
            </div>

            {/* Quote */}
            <p
              className="text-[13px] leading-relaxed italic text-slate-600 mb-4 px-2 text-center font-medium"
            >
              "{obituary.message}"
            </p>

            {/* Birth / Death dates */}
            <div className="flex items-center justify-center gap-6 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100/70">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Flower size={13} style={{ color: '#7C5C2E' }} />
                  <span className="text-[10px] font-extrabold text-amber-900/60 uppercase tracking-wider">Birth</span>
                </div>
                <p className="text-[13px] font-black text-slate-800 mt-0.5">
                  {obituary.birthDate || '—'}
                </p>
              </div>
              <div className="w-px h-8 bg-amber-200/60" />
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="text-[13px]">🕊️</span>
                  <span className="text-[10px] font-extrabold text-amber-900/60 uppercase tracking-wider">Passing</span>
                </div>
                <p className="text-[13px] font-black text-slate-800 mt-0.5">
                  {obituary.dateOfPassing}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Ceremony Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CeremonySection funeralDetails={obituary.funeralDetails} ceremonies={obituary.ceremonies} />
          </motion.div>

          {/* ── Interaction Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <InteractionButtons
              obituaryId={id}
              haathJodeCount={obituary.haathJodeCount || obituary.shraddhanjaliCount || 0}
              malaArpanCount={obituary.malaArpanCount || 0}
              userHasHaathJode={obituary.userHasHaathJode || obituary.hasOfferedShraddhanjali}
              userHasMalaArpan={obituary.userHasMalaArpan}
              onToggleHaathJode={toggleHaathJode}
              onIncrementMalaArpan={incrementMalaArpan}
            />
          </motion.div>

          {/* ── Author & Family Contact ── */}
          {obituary.author && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white rounded-[24px] border border-amber-200/70 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100/70 text-amber-900 font-extrabold text-[12.5px] flex items-center justify-center border border-amber-200/80 shrink-0">
                  {obituary.author.initials || obituary.author.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-[13.5px] font-extrabold text-slate-800 leading-tight">{obituary.author.name}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {obituary.author.relation} &bull; {obituary.timestamp}
                  </p>
                </div>
              </div>
              {obituary.familyContact && (
                <a
                  href={`tel:${obituary.familyContact}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11.5px] font-extrabold press-scale shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(124,92,46,0.1) 0%, rgba(212,175,55,0.1) 100%)',
                    color: '#7C5C2E',
                    border: '1px solid rgba(212,175,55,0.3)'
                  }}
                >
                  <Phone size={13} />
                  Contact
                </a>
              )}
            </motion.div>
          )}

          {/* ── Messages / Comments ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <TributeMessages
              obituaryId={id}
              comments={obituary.comments || []}
            />
          </motion.div>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default ShradhanjaliDetailPage;
