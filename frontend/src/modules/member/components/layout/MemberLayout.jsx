import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { useData } from '../../context/DataProvider';
import { useAuth } from '../../../../core/auth/useAuth';
import { useHeadAuth } from '../../../head/auth/useHeadAuth';
import { 
  Home, Users, Heart, BookOpen, MessageCircle, User, Vote, 
  HeartHandshake, Briefcase, Shield, X, LogOut, Award, Mail, Settings, Gift,
  ShieldCheck, ChevronRight
} from 'lucide-react';
import { Avatar } from '../common/Avatar';

const hiddenPaths = ['/member/events', '/member/groups', '/member/notifications', '/member/splash', '/member/login', '/member/setup-profile', '/member/select-community', '/member/verify-otp', '/member/chat/room', '/member/chat/call', '/member/matrimonial'];
const sideNavHiddenPaths = ['/member/events', '/member/groups', '/member/notifications', '/member/splash', '/member/login', '/member/setup-profile', '/member/select-community', '/member/verify-otp'];

export const MemberLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobileMenuOpen, setMobileMenuOpen, currentUser } = useData();
  const { auth, logout } = useAuth();
  const { headAuth } = useHeadAuth();

  const activeUser = auth?.isAuthenticated ? auth?.user : currentUser;
  const effectiveRole = activeUser?.role;
  const isHeadUser = activeUser && ['head', 'sub_head', 'admin'].includes(effectiveRole);

  const [isBottomNavVisible, setBottomNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const handleToggle = (e) => {
      if (e.detail !== undefined) {
        setBottomNavVisible(e.detail);
      }
    };
    window.addEventListener('toggle-bottom-nav', handleToggle);
    return () => {
      window.removeEventListener('toggle-bottom-nav', handleToggle);
    };
  }, []);

  // Always show BottomNav and reset scroll to top on path change
  useEffect(() => {
    setBottomNavVisible(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const shouldHideBottomNav = hiddenPaths.some(p => location.pathname.startsWith(p)) || location.pathname.split('/').filter(Boolean).length > 2;
  const shouldHideSideNav = sideNavHiddenPaths.some(p => location.pathname.startsWith(p)) || location.pathname.split('/').filter(Boolean).length > 2;
  const isFullHeightRoute = location.pathname.startsWith('/member/social') || location.pathname === '/member/chat';

  const handleMenuLinkClick = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const menuItems = [
    { name: 'Home', path: '/member/home', icon: Home },
    { name: 'Social Hub', path: '/member/social', icon: Users },
    { name: 'Matrimonial', path: '/member/matrimonial', icon: Heart },
    { name: 'Invitations', path: '/member/invitations', icon: Mail },
    { name: 'Directory', path: '/member/directory', icon: BookOpen },
    { name: 'Chat Messenger', path: '/member/chat', icon: MessageCircle },
    { name: 'Voting / Polls', path: '/member/voting', icon: Vote },
    { name: 'Donations', path: '/member/donation', icon: HeartHandshake },
    { name: 'Condolences', path: '/member/shradhanjali', icon: Award },
    { name: 'Refer & Earn', path: '/member/referral', icon: Gift },
    { name: 'Professional Network', path: '/member/professional', icon: Briefcase },
    { name: 'Leadership & Board', path: '/member/leadership', icon: Shield },
    { name: 'My Profile', path: '/member/profile', icon: User },
    { name: 'Settings', path: '/member/settings', icon: Settings },
  ];

  return (
    <div className="relative w-full h-[100dvh] bg-surface flex flex-col md:flex-row overflow-hidden">
      <SideNav />
      <div 
        ref={scrollContainerRef}
        className={`flex-1 w-full min-w-0 h-full overflow-y-auto ${shouldHideBottomNav || isFullHeightRoute ? 'pb-0' : 'pb-20'} md:pb-0 ${shouldHideSideNav ? '' : 'md:ml-[260px]'}`}
      >
        {/* pb-20 accounts for floating bottom nav with margin */}
        <Outlet />
      </div>
      <BottomNav isVisible={isBottomNavVisible} />

      {/* ─── MOBILE DRAWER MENU ─── */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden transition-all duration-300 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel — Deep Premium Dark Glass */}
          <div 
            className="fixed top-0 left-0 bottom-0 z-55 w-[288px] flex flex-col shadow-2xl md:hidden animate-slide-right pb-safe"
            style={{
              background: 'linear-gradient(160deg, #13093a 0%, #1e1145 30%, #25175a 65%, #2d1b69 100%)',
              borderRight: '1px solid rgba(167,139,250,0.12)',
              boxShadow: '4px 0 48px rgba(0,0,0,0.3), inset -1px 0 0 rgba(167,139,250,0.08)',
            }}
          >
            {/* Top User Profile Header */}
            <div className="p-5 pb-4 flex flex-col gap-3 relative">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <X size={14} />
              </button>
              
              {/* Brand mark */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-black text-lg relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                >
                  <span className="relative z-10">म</span>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                </div>
                <div>
                  <h2 className="text-[17px] font-black text-white tracking-tight leading-none">MeriSamaj</h2>
                  <p className="text-[9px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>Community Platform</p>
                </div>
              </div>

              {/* User card — premium glass */}
              <div className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
              >
                <div className="relative shrink-0">
                  <Avatar 
                    initials={currentUser?.initials || 'U'} 
                    size="md" 
                    color="bg-gradient-to-br from-purple-400 to-violet-600 text-white font-bold" 
                    imageUrl={currentUser?.avatar}
                  />
                  {/* Online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1e1145]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-bold text-white truncate leading-tight">
                    {currentUser?.name || 'User Profile'}
                  </h4>
                  <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wider leading-none" style={{ color: 'rgba(167,139,250,0.55)' }}>
                    {currentUser?.community || 'Samaj Member'}
                  </p>
                </div>
                <div className="shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ background: 'rgba(124,58,237,0.25)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  {effectiveRole === 'head' ? 'Community Head' : effectiveRole === 'sub_head' ? 'Local Head' : 'Member'}
                </div>
              </div>

              {/* Privileged Head Panel Switcher Button — ONLY for Community Head, Local Head or Admin */}
              {isHeadUser && (
                <button
                  onClick={() => handleMenuLinkClick('/head/dashboard')}
                  className="w-full mt-1 p-2.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-indigo-500/20 border border-amber-400/40 rounded-xl text-amber-200 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all font-bold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-400 animate-pulse shrink-0" />
                    <span>{effectiveRole === 'sub_head' ? 'Local Head Panel' : 'Head Control Panel'}</span>
                  </div>
                  <ChevronRight size={14} className="text-amber-400 shrink-0" />
                </button>
              )}
            </div>

            {/* Separator */}
            <div className="mx-5 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />

            {/* Scrollable Navigation Links */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {menuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleMenuLinkClick(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-[10px] rounded-[14px] text-[13px] tracking-wide transition-all duration-200 active:scale-[0.98] relative overflow-hidden ${
                      isActive 
                        ? 'font-semibold' 
                        : 'hover:bg-white/5'
                    }`}
                    style={isActive ? {
                      background: 'rgba(124,58,237,0.18)',
                      border: '1px solid rgba(124,58,237,0.25)',
                      color: 'rgba(255,255,255,0.95)',
                    } : {
                      border: '1px solid transparent',
                      color: 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {/* Active left glow bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, #A78BFA, #7C3AED)', boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
                    )}
                    {/* Subtle shine overlay on active */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-[14px]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%)' }} />
                    )}
                    <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive ? '' : ''
                    }`}
                      style={isActive ? {
                        background: 'rgba(124,58,237,0.25)',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.2)'
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <Icon size={16} style={{ color: isActive ? 'rgba(196,181,253,0.95)' : 'rgba(255,255,255,0.55)' }} />
                    </div>
                    <span className="relative z-10">{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer Logout Button */}
            <div className="p-4 shrink-0">
              <div className="mx-1 mb-3 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />
              <button 
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                  navigate('/member/login', { state: { skipLanguage: true } });
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-[14px] text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  color: 'rgba(252,165,165,0.9)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
