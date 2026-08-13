import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Eye, PartyPopper, UserX, BarChart3 } from 'lucide-react';
import { useData } from '../../../context/DataProvider';
import { buildInvitationAnalytics, isInvitationCreator } from '../utils/invitationAnalytics';

/**
 * Renders an invitation as a sealed envelope. Tapping it plays the open
 * animation (flap swings back in 3D, letter slides out) and then reveals the
 * full invitation card. Tapping "Close" reverses the whole sequence.
 *
 * Invitations the logged-in user created also carry an inline analytics banner
 * (opened / attending / declined counts) that opens the full insights modal.
 *
 * phase: 'closed' -> 'opening' -> 'open' -> 'closing' -> 'closed'
 */
export default function EnvelopeInvitationCard({ inv, onOpenDetail, isSentTab = false, onOpenAnalytics }) {
  const { currentUser, members, trackInvitationOpened } = useData();
  const [phase, setPhase] = useState('closed');
  const [flapBehind, setFlapBehind] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const schedule = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const images = inv.images || (inv.image ? [inv.image] : []);
  const displayTitle = inv.title || `Wedding of ${inv.groomName} & ${inv.brideName}`;
  const displayHost = inv.hostName || inv.familyName;
  const invDate = new Date(inv.date);
  const detailId = inv._id || inv.id;

  const isOpening = phase === 'opening' || phase === 'open';

  const isCreator = isInvitationCreator(inv, currentUser);
  const showAnalytics = isCreator || isSentTab;
  const stats = showAnalytics ? buildInvitationAnalytics(inv, members) : null;

  const handleOpen = () => {
    if (phase !== 'closed') return;
    // Registers this member under the creator's "Who Opened" list (no-op for the creator)
    trackInvitationOpened?.(detailId);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('opening');
    schedule(() => setFlapBehind(true), 220);   // flap slips behind the letter mid-swing
    schedule(() => setPhase('open'), 1050);     // envelope collapses, card expands
  };

  const handleClose = () => {
    if (phase !== 'open') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('closing');                        // card collapses, envelope returns
    schedule(() => setFlapBehind(false), 420);  // flap comes forward as it swings shut
    schedule(() => setPhase('closed'), 900);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-[26px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] transition-shadow duration-300"
    >
      {/* ---------- Sealed envelope ---------- */}
      <motion.div
        animate={{ height: phase === 'open' ? 0 : 272, opacity: phase === 'open' ? 0 : 1 }}
        transition={{ duration: 0.38, ease: 'easeInOut' }}
        className="relative w-full"
        style={{ perspective: 1600, overflow: phase === 'closed' ? 'visible' : 'hidden' }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={handleOpen}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpen()}
          className="absolute bottom-0 left-0 w-full h-[220px] cursor-pointer outline-none group"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Back of the envelope */}
          <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-[#1F0A47] via-[#2A0E5C] to-[#3B1578] shadow-[0_10px_30px_rgba(42,14,92,0.25)]" />

          {/* The letter tucked inside */}
          <motion.div
            animate={{ y: isOpening ? -66 : 0, scale: isOpening ? 1 : 0.97 }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
              delay: isOpening ? 0.38 : 0,
            }}
            className="absolute left-[7%] right-[7%] top-[9%] h-[74%] z-10 rounded-2xl bg-white border border-slate-200/80 shadow-[0_12px_28px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center text-center px-6 overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(#4C1D95 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }}
            />
            <h3 className="font-extrabold text-[17px] tracking-tight relative z-10 leading-snug max-w-[90%] text-purple-950 line-clamp-2">
              {displayTitle}
            </h3>
            <p className="text-[11.5px] font-bold mt-1.5 z-10 uppercase tracking-wider text-purple-700 truncate max-w-full">
              {displayHost}
            </p>
            <p className="text-[9.5px] text-purple-600 mt-2.5 z-10 border-t border-purple-100 pt-1.5 px-5 font-semibold uppercase tracking-widest">
              - Cordially Invited -
            </p>
          </motion.div>

          {/* Front pocket — everything except the flap triangle */}
          <div
            className="absolute inset-0 z-20 rounded-[26px] bg-gradient-to-b from-[#33116A] via-[#40167F] to-[#5B21B6]"
            style={{ clipPath: 'polygon(0 0, 50% 60%, 100% 0, 100% 100%, 0 100%)' }}
          >
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }}
            />
            {/* bottom fold highlight */}
            <div
              className="absolute inset-0 bg-white/5 pointer-events-none"
              style={{ clipPath: 'polygon(0 100%, 50% 52%, 100% 100%)' }}
            />
          </div>

          {/* Flap */}
          <motion.div
            animate={{ rotateX: isOpening ? -178 : 0 }}
            transition={{
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpening ? 0 : 0.3,
            }}
            className="absolute top-0 left-0 w-full h-[60%] origin-top bg-gradient-to-b from-[#4C1D95] via-[#3B1578] to-[#2A0E5C]"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              borderRadius: '26px 26px 0 0',
              transformStyle: 'preserve-3d',
              zIndex: flapBehind ? 5 : 30,
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }}
            />
          </motion.div>

          {/* Wax seal at the flap tip */}
          <motion.div
            animate={{ scale: isOpening ? 0 : 1, opacity: isOpening ? 0 : 1 }}
            transition={{ duration: 0.25, delay: isOpening ? 0 : 0.75 }}
            className="absolute left-1/2 top-[60%] z-40 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-amber-200/70 shadow-lg shadow-amber-900/30 flex items-center justify-center"
          >
            <span className="text-[13px] font-black text-[#3B1578] tracking-tight">
              {(displayHost || displayTitle || 'M').trim().charAt(0).toUpperCase()}
            </span>
          </motion.div>

          {/* Status badge + tap hint */}
          {inv.status === 'Pending' && (
            <span className="absolute top-3 right-3 z-40 bg-amber-50 text-amber-700 border border-amber-200/60 text-[9.5px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
              Pending Approval
            </span>
          )}
          {inv.status === 'Rejected' && (
            <span className="absolute top-3 right-3 z-40 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9.5px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
              Rejected
            </span>
          )}

          <motion.div
            animate={{ opacity: isOpening ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-0 w-full z-40 flex flex-col items-center gap-0.5 px-6"
          >
            <span className="text-[11px] font-extrabold text-purple-100 truncate max-w-full">
              {invDate.toLocaleString('default', { month: 'short' })} {invDate.getDate()} · {displayHost}
            </span>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-purple-300 group-hover:text-amber-200 transition-colors">
              Tap to open
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ---------- Revealed invitation ---------- */}
      <AnimatePresence initial={false}>
        {phase === 'open' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden rounded-[26px]"
          >
            {/* Banner */}
            <div className="relative overflow-hidden flex flex-col items-center justify-center text-center border-b border-purple-100/20 min-h-[165px]">
              {inv.status === 'Pending' && (
                <span className="absolute top-3 right-3 bg-amber-50 text-amber-700 border border-amber-200/60 text-[9.5px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider z-20">
                  Pending Approval
                </span>
              )}
              {inv.status === 'Rejected' && (
                <span className="absolute top-3 right-3 bg-rose-50 text-rose-700 border border-rose-200/60 text-[9.5px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider z-20">
                  Rejected
                </span>
              )}

              <button
                onClick={handleClose}
                title="Close envelope"
                className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-black/35 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/50 active:scale-90 transition-all"
              >
                <X size={15} strokeWidth={2.6} />
              </button>

              {images.length > 0 ? (
                <div
                  className="relative w-full min-h-[220px] max-h-[400px] overflow-hidden bg-slate-950 flex items-center justify-center p-2 group cursor-pointer"
                  onClick={() => setFullscreenImg(images[0])}
                  title="Click to view full image"
                >
                  {/* Glassmorphic background blur fill */}
                  <img
                    src={images[0]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110 pointer-events-none"
                  />
                  {/* Primary card image displayed completely uncropped */}
                  <img
                    src={images[0]}
                    alt="Invitation Card"
                    className="relative z-10 max-w-full max-h-[380px] w-auto h-auto object-contain rounded-lg drop-shadow-md transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                  {images.length > 1 && (
                    <span className="absolute bottom-3 right-3 z-20 bg-black/60 backdrop-blur-md text-white text-[9.5px] font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                      +{images.length - 1} More Photos
                    </span>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="relative w-full h-48 bg-gradient-to-br from-[#2A0E5C] via-[#3B1578] to-[#5B21B6] flex flex-col items-center justify-center text-center p-6 text-white shadow-inner"
                >
                  <div
                    className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }}
                  />
                  <h3 className="font-extrabold text-[17px] tracking-tight relative z-10 leading-snug max-w-[85%] text-amber-200">{displayTitle}</h3>
                  <p className="text-[12px] opacity-90 font-bold mt-1.5 z-10 uppercase tracking-wider text-purple-100">{displayHost}</p>
                  <p className="text-[10px] text-purple-200 mt-3 z-10 border-t border-white/15 pt-1.5 px-6 font-semibold uppercase tracking-widest">
                    - Cordially Invited -
                  </p>
                </motion.div>
              )}
            </div>

            {/* Body */}
            <div className="p-4.5 text-left">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-[18px] bg-purple-50 border border-purple-100 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                  <span className="text-purple-600 text-[9.5px] font-extrabold leading-none block mb-0.5 uppercase tracking-wider">
                    {invDate.toLocaleString('default', { month: 'short' })}
                  </span>
                  <span className="text-purple-700 text-[17px] font-black leading-none">{invDate.getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-[15.5px] truncate tracking-tight">{displayTitle}</h4>
                  <p className="text-slate-500 text-[12px] font-semibold mt-0.5 truncate">{displayHost}</p>
                  <p className="text-slate-500 text-[11.5px] flex items-center gap-1 mt-1 font-medium truncate">
                    <MapPin size={13} className="shrink-0 text-purple-600" />
                    <span className="truncate">{inv.location}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <button
                  onClick={() => onOpenDetail(detailId)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 font-bold text-[12.5px] py-2.5 rounded-xl active:scale-95 transition-all press-scale flex items-center justify-center gap-1.5"
                >
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Creator analytics banner (Sent tab) ---------- */}
      {showAnalytics && stats && (
        <div className="px-4 pb-4 pt-1">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-purple-500">Sender Insights</span>
              <span className="text-[9.5px] font-bold text-slate-400">
                {stats.pendingCount} pending
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <div className="flex items-center gap-1.5 bg-white/80 border border-indigo-100/70 rounded-xl px-2 py-2">
                <Eye size={14} className="text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-none">{stats.openedCount}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">Opened</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-100/70 rounded-xl px-2 py-2">
                <PartyPopper size={14} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-none">{stats.totalAttendingCount}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
                    Attending · {stats.familyCount} fam
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white/80 border border-rose-100/70 rounded-xl px-2 py-2">
                <UserX size={14} className="text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-black text-slate-800 leading-none">{stats.declinedCount}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">Declined</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenAnalytics?.(inv)}
              className="w-full mt-2.5 bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 font-black text-[11.5px] py-2.5 rounded-xl transition-all press-scale flex items-center justify-center gap-1.5"
            >
              <BarChart3 size={13} strokeWidth={2.6} />
              View Full List &amp; Responses (व्यू लिस्ट)
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImg(null)}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setFullscreenImg(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={fullscreenImg}
              alt="Full Invitation Card"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
