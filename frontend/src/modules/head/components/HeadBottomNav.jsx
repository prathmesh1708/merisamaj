import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Heart, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

export const HeadBottomNav = ({ pendingApprovalsCount = 0 }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/head/dashboard', icon: LayoutDashboard, activeColor: '#7C3AED' },
    { name: 'Members', path: '/head/members', icon: Users, activeColor: '#2563EB', badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
    { name: 'Matrimony', path: '/head/matrimonial', icon: Heart, activeColor: '#E11D48' },
    { name: 'Events', path: '/head/events', icon: Calendar, activeColor: '#059669' },
    { name: 'Profile', path: '/head/profile', icon: User, activeColor: '#D97706' },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300 ease-in-out pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      {/* ── Sleek Production Glassmorphism Floating Capsule (Matching User App) ── */}
      <div 
        className="mx-4 rounded-full relative overflow-hidden transition-all duration-300 pointer-events-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.65)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
        }}
      >
        <div className="flex items-center justify-around h-[58px] px-2 relative">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <NavLink 
                key={item.name}
                to={item.path}
                className="flex flex-col items-center justify-center flex-1 h-full relative cursor-pointer select-none"
              >
                {/* Sleek Top Active Accent Line */}
                {isActive && (
                  <motion.div 
                    layoutId="head-active-top-bar"
                    className="absolute top-0 w-7 h-[3px] rounded-b-full pointer-events-none"
                    style={{ 
                      backgroundColor: item.activeColor,
                      boxShadow: `0 2px 8px ${item.activeColor}60`
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                {/* Animated Icon with Badge */}
                <motion.div 
                  whileTap={{ scale: 0.88 }}
                  animate={{ 
                    y: isActive ? -1 : 0,
                    scale: isActive ? 1.08 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center justify-center relative"
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.4 : 1.75}
                    style={{ color: isActive ? item.activeColor : '#64748B' }}
                    fill={isActive && (item.icon === Heart) ? 'currentColor' : 'none'}
                    className="transition-colors duration-200"
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2.5 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[8.5px] font-extrabold flex items-center justify-center px-0.5 leading-none shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  )}
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

export default HeadBottomNav;
