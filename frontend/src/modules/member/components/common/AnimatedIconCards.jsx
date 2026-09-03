import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ── 1. ANIMATED INVITATIONS ICON (Electric Violet & Indigo with Glowing Sparkles) ──
export const InvitationsIcon = ({ className = "w-11 h-11" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_6px_16px_rgba(124,58,237,0.25)]"
      >
        <defs>
          <linearGradient id="invGradMainVivid" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9333EA" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="invGradFlapVivid" x1="8" y1="12" x2="40" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
        </defs>

        {/* Floating Paper / Letter slipping out */}
        <motion.path
          d="M14 18H34V28H14Z"
          fill="#F3E8FF"
          initial={{ y: 2 }}
          animate={{ y: [-1, -5, -1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main Envelope Body */}
        <path
          d="M7 16C7 13.2386 9.23858 11 12 11H36C38.7614 11 41 13.2386 41 16V34C41 36.7614 38.7614 39 36 39H12C9.23858 39 7 36.7614 7 34V16Z"
          fill="url(#invGradMainVivid)"
        />

        {/* Inner Fold Shadows */}
        <path
          d="M7 35L19 25M41 35L29 25"
          stroke="#3B0764"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Animated Envelope Flap */}
        <motion.path
          d="M7 14L24 26.5L41 14"
          stroke="url(#invGradFlapVivid)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            scaleY: [1, 0.94, 1],
            y: [0, -1, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "24px 14px" }}
        />

        {/* Pink Heart Seal Accent */}
        <motion.circle
          cx="24"
          cy="26"
          r="4.5"
          fill="#F43F5E"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <path
          d="M24 27.5L22.5 25.5C21.8 24.8 22.8 23.8 23.5 24.5L24 25L24.5 24.5C25.2 23.8 26.2 24.8 25.5 25.5L24 27.5Z"
          fill="white"
        />

        {/* Cyan & Pink Sparkles */}
        <motion.path
          d="M38 10L39 7.5L41.5 6.5L39 5.5L38 3L37 5.5L34.5 6.5L37 7.5L38 10Z"
          fill="#38BDF8"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="10"
          cy="9"
          r="1.8"
          fill="#F472B6"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
};

// ── 2. ANIMATED CONTRIBUTIONS ICON (Vibrant Ruby Coral Pink & Gold) ──
export const ContributionsIcon = ({ className = "w-11 h-11" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_6px_16px_rgba(244,63,94,0.25)]"
      >
        <defs>
          <linearGradient id="contribGradVivid" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#BE123C" />
          </linearGradient>
        </defs>

        {/* Animated Heart Pulsing */}
        <motion.path
          d="M24 38C24 38 8.5 28 8.5 17.5C8.5 12.5294 12.5294 8.5 17.5 8.5C20.4074 8.5 22.9859 9.87974 24 12.0233C25.0141 9.87974 27.5926 8.5 30.5 8.5C35.4706 8.5 39.5 12.5294 39.5 17.5C39.5 28 24 38 24 38Z"
          fill="url(#contribGradVivid)"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "24px 23px" }}
        />

        {/* Inner Handshake / Support Line inside Heart */}
        <motion.path
          d="M17 19.5L21.5 24L24 21.5L26.5 24L31 19.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />

        {/* Floating Mini Heart / Sparkle Rising */}
        <motion.path
          d="M37.5 10.5C37.5 10.5 33.5 6.5 33.5 4.3C33.5 3 34.5 2 35.7 2C36.5 2 37.1 2.5 37.5 3.1C37.9 2.5 38.5 2 39.3 2C40.5 2 41.5 3 41.5 4.3C41.5 6.5 37.5 10.5 37.5 10.5Z"
          fill="#FB7185"
          animate={{
            y: [2, -6, 2],
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.1, 0.8]
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Golden Dot Accent */}
        <motion.circle
          cx="10"
          cy="10"
          r="2.5"
          fill="#FACC15"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </svg>
    </div>
  );
};

// ── 3. ANIMATED OBITUARY ICON (Radiant Warm Saffron & Deep Amber Flame) ──
export const ObituaryIcon = ({ className = "w-11 h-11" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_6px_16px_rgba(245,158,11,0.25)]"
      >
        <defs>
          <linearGradient id="obDiyaBodyVivid" x1="8" y1="24" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="obFlameOuterVivid" x1="24" y1="6" x2="24" y2="25" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE600" />
            <stop offset="45%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="obFlameInnerVivid" x1="24" y1="10" x2="24" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFF59D" />
          </linearGradient>
        </defs>

        {/* Soft Radial Aura behind Flame */}
        <motion.circle
          cx="24"
          cy="17"
          r="11"
          fill="#FDE047"
          opacity="0.3"
          animate={{
            scale: [0.85, 1.25, 0.85],
            opacity: [0.2, 0.45, 0.2]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Diya Base */}
        <path
          d="M18 39H30V41C30 42.1046 29.1046 43 28 43H20C18.8954 43 18 42.1046 18 41V39Z"
          fill="#78350F"
        />

        {/* Diya Lamp Bowl */}
        <path
          d="M8 26C8 26 10 38 24 38C38 38 40 26 40 26C40 26 33 28 24 28C15 28 8 26 8 26Z"
          fill="url(#obDiyaBodyVivid)"
        />

        {/* Diya Bowl Top Rim */}
        <ellipse
          cx="24"
          cy="26"
          rx="16"
          ry="3"
          fill="#FDE047"
        />

        {/* Wick */}
        <path
          d="M24 25V21"
          stroke="#451A03"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Outer Flickering Flame */}
        <motion.path
          d="M24 6C24 6 29.5 13 29.5 18C29.5 21.0376 27.0376 23.5 24 23.5C20.9624 23.5 18.5 21.0376 18.5 18C18.5 13 24 6 24 6Z"
          fill="url(#obFlameOuterVivid)"
          animate={{
            scaleY: [1, 1.12, 0.94, 1.08, 1],
            skewX: [0, -2.5, 2, -1, 0],
            rotate: [0, -1.5, 2, -1, 0]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "24px 23.5px" }}
        />

        {/* Inner Bright Flame Core */}
        <motion.path
          d="M24 11C24 11 27 15.5 27 18.5C27 20.1569 25.6569 21.5 24 21.5C22.3431 21.5 21 20.1569 21 18.5C21 15.5 24 11 24 11Z"
          fill="url(#obFlameInnerVivid)"
          animate={{
            scaleY: [1, 1.1, 0.95, 1.05, 1],
            opacity: [0.9, 1, 0.85, 1, 0.9]
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "24px 21.5px" }}
        />

        {/* Rising Particle */}
        <motion.circle
          cx="24"
          cy="4"
          r="1.2"
          fill="#FEF08A"
          animate={{
            y: [-2, -8, -12],
            opacity: [0, 0.9, 0],
            scale: [0.5, 1.2, 0.2]
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
};

// ── COMPONENT CONTAINER: AnimatedIconCards (Dynamic with Custom Admin Icon Support) ──
import { axiosPrivate } from '../../../../core/api/axiosPrivate';

export const AnimatedIconCards = ({
  invitationCount = 0,
  donationCount = 0,
  shradhanjaliCount = 0,
  onNavigate
}) => {
  const defaultCards = [
    {
      _id: 'invitations',
      key: 'invitations',
      title: 'Invitations',
      subtitle: 'View new invites',
      presetIconKey: 'invitations',
      iconType: 'preset',
      customIconUrl: '',
      targetRoute: '/member/invitations',
      badgeType: 'dynamic_count',
      badgeCount: invitationCount,
    },
    {
      _id: 'contributions',
      key: 'contributions',
      title: 'Contributions',
      subtitle: 'Support the Samaj',
      presetIconKey: 'contributions',
      iconType: 'preset',
      customIconUrl: '',
      targetRoute: '/member/donation',
      badgeType: 'dynamic_count',
      badgeCount: donationCount,
    },
    {
      _id: 'obituary',
      key: 'obituary',
      title: 'Obituary',
      subtitle: 'Heartfelt tributes',
      presetIconKey: 'obituary',
      iconType: 'preset',
      customIconUrl: '',
      targetRoute: '/member/shradhanjali',
      badgeType: 'dynamic_count',
      badgeCount: shradhanjaliCount,
    },
  ];

  const [cards, setCards] = useState(defaultCards);

  useEffect(() => {
    let isMounted = true;
    const fetchShortcuts = async () => {
      try {
        const res = await axiosPrivate.get('/app-shortcuts');
        if (res.data?.success && res.data.data?.length > 0 && isMounted) {
          setCards(res.data.data);
        }
      } catch (err) {
        // Fallback to default local cards
      }
    };
    fetchShortcuts();
    return () => { isMounted = false; };
  }, []);

  const renderCardIcon = (card) => {
    if (card.iconType === 'custom_upload' && card.customIconUrl) {
      return (
        <img 
          src={card.customIconUrl} 
          alt={card.title} 
          className="w-10 h-10 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105" 
        />
      );
    }

    const iconKey = card.presetIconKey || card.key;
    switch (iconKey) {
      case 'invitations':
        return <InvitationsIcon className="w-10 h-10" />;
      case 'contributions':
        return <ContributionsIcon className="w-10 h-10" />;
      case 'obituary':
        return <ObituaryIcon className="w-10 h-10" />;
      default:
        return <InvitationsIcon className="w-10 h-10" />;
    }
  };

  const getBadgeCount = (card) => {
    if (card.badgeType === 'none') return 0;
    if (card.badgeType === 'manual') return card.manualBadgeCount || 0;
    if (card.badgeCount !== undefined) return card.badgeCount;
    if (card.key === 'invitations') return invitationCount;
    if (card.key === 'contributions') return donationCount;
    if (card.key === 'obituary') return shradhanjaliCount;
    return 0;
  };

  return (
    <div className="px-3 mt-3 relative z-10 flex gap-2 sm:gap-3">
      {cards.filter(c => c.isActive !== false).map((card) => {
        const badgeNum = getBadgeCount(card);
        const navPath = card.targetRoute || card.path;

        return (
          <motion.div
            key={card._id || card.key}
            onClick={() => onNavigate && onNavigate(navPath)}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex-1 bg-transparent py-2 px-1 flex flex-col items-center justify-center text-center cursor-pointer relative transition-all duration-300 group"
          >
            {/* Icon Container — Clean Transparent Floating Icon */}
            <div className="relative flex items-center justify-center p-1">
              {renderCardIcon(card)}

              {/* Red Notification Badge */}
              {badgeNum > 0 && (
                <div className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8.5px] font-black w-[17px] h-[17px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {badgeNum}
                </div>
              )}
            </div>

            {/* Title & Subtitle — Compact Sleek Typography */}
            <h4 className="text-[11.5px] font-extrabold text-slate-800 mt-1.5 tracking-tight leading-tight group-hover:text-purple-700 transition-colors">
              {card.title}
            </h4>
            <p className="text-[8.5px] font-semibold text-slate-400 mt-0.5 leading-tight">
              {card.subtitle}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AnimatedIconCards;
