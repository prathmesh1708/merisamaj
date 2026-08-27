import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Heart, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Sub-pages where bottom nav should be hidden
const hiddenPaths = ['/member/events', '/member/groups', '/member/notifications', '/member/splash', '/member/login', '/member/setup-profile', '/member/select-community', '/member/verify-otp', '/member/chat/room', '/member/chat/call'];

export const BottomNav = ({ isVisible = true }) => {
  const location = useLocation();
  
  // Hide on onboarding and sub-pages
  const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p));
  const pathSegments = location.pathname.split('/').filter(Boolean);
  if (shouldHide || pathSegments.length > 2) {
    return null;
  }

  const navItems = [
    { name: 'Home', path: '/member/home', icon: Home, activeColor: '#7C3AED' },
    { name: 'Social', path: '/member/social', icon: Users, activeColor: '#2563EB' },
    { name: 'Matrimony', path: '/member/matrimonial', icon: Heart, activeColor: '#E11D48' },
    { name: 'Chat', path: '/member/chat', icon: MessageCircle, activeColor: '#059669' },
    { name: 'Profile', path: '/member/profile', icon: User, activeColor: '#D97706' },
  ];

  return (
    <div 
      className={`responsive-fixed-bottom z-50 md:hidden transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      {/* ── Sleek Production Glassmorphism Floating Capsule (High Transparency) ── */}
      <div 
        className="mx-4 rounded-full relative overflow-hidden transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.42)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
        }}
      >
        <div className="flex items-center justify-around h-[58px] px-2 relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/member/home' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <NavLink 
                key={item.name}
                to={item.path}
                replace
                className="flex flex-col items-center justify-center flex-1 h-full relative cursor-pointer select-none"
              >
                {/* Sleek Top Active Accent Line */}
                {isActive && (
                  <motion.div 
                    layoutId="active-top-bar"
                    className="absolute top-0 w-7 h-[3px] rounded-b-full pointer-events-none"
                    style={{ 
                      backgroundColor: item.activeColor,
                      boxShadow: `0 2px 8px ${item.activeColor}60`
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Animated Icon */}
                <motion.div 
                  whileTap={{ scale: 0.88 }}
                  animate={{ 
                    y: isActive ? -1 : 0,
                    scale: isActive ? 1.08 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center justify-center"
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.4 : 1.75}
                    style={{ color: isActive ? item.activeColor : '#64748B' }}
                    fill={isActive && (item.icon === Heart || item.icon === Home) ? 'currentColor' : 'none'}
                    className="transition-colors duration-200"
                  />
                </motion.div>

                {/* Label */}
                <span 
                  className="text-[9.5px] mt-0.5 tracking-tight transition-colors duration-200"
                  style={{ 
                    color: isActive ? item.activeColor : '#64748B',
                    fontWeight: isActive ? 700 : 500
                  }}
                >
                  {item.name}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
