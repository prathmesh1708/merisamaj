import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Wallet, Vote, Send, Settings, LogOut, Menu, X, Award, ShieldCheck, Shield, Users, Calendar, Briefcase, Heart, Search, BarChart3, HeartHandshake, User, ChevronDown, ChevronUp, Mail, LayoutTemplate, Home, Share2, Megaphone, MapPin
} from 'lucide-react';
import { useData } from '../../member/context/DataProvider';
import { useHeadAuth } from '../auth/useHeadAuth';
import { Avatar } from '../../member/components/common/Avatar';
import { filterMembersForHead } from '../utils/headCommunityFilter';
import { NotificationBell } from '../../member/components/layout/NotificationBell';

export const HeadLayout = () => {
  const { headAuth, headLogout } = useHeadAuth();
  const { currentUser, members } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const headUser = headAuth.headUser || currentUser;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  // Filter members belonging to assigned communities for Head user
  const assignedMembers = useMemo(() => filterMembersForHead(members || [], headUser), [members, headUser]);

  // Live count of pending verification requests for assigned communities
  const pendingApprovalsCount = assignedMembers.filter(m => !m.isVerified).length;

  // Permission filter check for Head users
  const permissions = headUser?.headPermissions || {};
  const isSuperAdmin = currentUser?.role === 'admin';

  const isModuleAllowed = (permKey) => {
    if (isSuperAdmin) return true;
    if (!permKey) return true;
    // If permission key is explicitly false, hide it; otherwise show
    return permissions[permKey] !== false;
  };

  const navigationConfig = [
    {
      category: 'CORE DASHBOARD',
      items: [
        { 
          name: 'President Dashboard', 
          path: '/head/dashboard', 
          icon: LayoutDashboard,
          permKey: 'canViewDashboard',
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null
        },
        { 
          name: 'My Profile', 
          path: '/head/profile', 
          icon: User,
        }
      ]
    },
    {
      category: 'COMMUNITY LEDGERS',
      items: [
        {
          name: 'Social',
          icon: Share2,
          permKey: 'canViewSocial',
          children: [
            { name: 'City Feed', path: '/head/social/city-feed' },
            { name: 'Community Feed', path: '/head/social/community-feed' },
            { name: 'Community Groups', path: '/head/groups' }
          ]
        },
        {
          name: 'Members',
          icon: Users,
          permKey: 'canViewMembers',
          children: [
            { name: 'All Members', path: '/head/members', search: '?tab=list' },
            { name: 'Community Census', path: '/head/census' },
            { name: 'Verifications', path: '/head/members', search: '?tab=verification', badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null },
            { name: 'Samaj Analytics', path: '/head/members', search: '?tab=analytics' }
          ]
        },
        {
          name: 'Professionals',
          icon: Briefcase,
          permKey: 'canViewDirectory',
          children: [
            { name: 'Directory', path: '/head/professionals' },
            { name: 'Category Management', path: '/head/professionals/categories' }
          ]
        },
        {
          name: 'Matrimonial Management',
          path: '/head/matrimonial',
          permKey: 'canViewProfiles',
          icon: Heart
        }
      ]
    },
    {
      category: 'EVENTS & GOVERNANCE',
      items: [
        {
          name: 'Event Management',
          path: '/head/events',
          permKey: 'canViewEvents',
          icon: Calendar
        },
        {
          name: 'Invitations',
          path: '/head/invitations',
          permKey: 'canViewInvitations',
          icon: Mail
        },
        {
          name: 'Notification Center',
          path: '/head/notifications',
          permKey: 'canSendNotifications',
          icon: Send
        },
        { 
          name: 'Fund Governance', 
          path: '/head/funds', 
          permKey: 'canViewFunds',
          icon: Wallet 
        },
        {
          name: 'Donation Campaigns',
          path: '/head/donations',
          permKey: 'canViewDonations',
          icon: HeartHandshake
        },
        {
          name: 'Obituaries',
          path: '/head/obituaries',
          permKey: 'canViewObituary',
          icon: Award
        },
        {
          name: 'Dharmashalas',
          path: '/head/dharmashala',
          permKey: 'canViewDharmashala',
          icon: Home
        },
        {
          name: 'Leadership & Team',
          path: '/head/leadership',
          permKey: 'canViewLeadership',
          icon: Shield
        },
        {
          name: 'Local Community',
          path: '/head/local-community',
          icon: MapPin,
          headOnly: true
        }
      ]
    },
    {
      category: 'PLATFORM CONTROLS',
      items: [
        { 
          name: 'Election Commission', 
          path: '/head/elections', 
          permKey: 'canViewElections',
          icon: Vote 
        },
        {
          name: 'Home Content',
          path: '/head/home-content',
          permKey: 'canViewHomeContent',
          icon: LayoutTemplate
        },
        {
          name: 'Community Settings',
          path: '/head/settings',
          icon: Settings
        }
      ]
    }
  ];

  // Filter sections and items based on permissions
  // `headOnly` items (e.g. Local Community) are hidden for Sub-Head/Local Head
  // accounts — only the Community Head (or Admin) manages Local Heads.
  const filteredNavigationConfig = navigationConfig.map(section => ({
    ...section,
    items: section.items.filter(item =>
      isModuleAllowed(item.permKey) && (!item.headOnly || isSuperAdmin || headUser?.role === 'head')
    )
  })).filter(section => section.items.length > 0);

  // Auto-expand active category
  useEffect(() => {
    const newExpanded = { ...expandedItems };
    let changed = false;
    filteredNavigationConfig.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => 
            location.pathname === child.path && 
            (!child.search || location.search === child.search)
          );
          const matchesPath = location.pathname.startsWith(item.children[0].path);
          if ((hasActiveChild || matchesPath) && !newExpanded[item.name]) {
            newExpanded[item.name] = true;
            changed = true;
          }
        }
      });
    });
    if (changed) {
      setExpandedItems(newExpanded);
    }
  }, [location.pathname, location.search]);

  const toggleExpand = (name) => {
    setExpandedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const renderNavItems = (isMobile) => {
    return filteredNavigationConfig.map((section) => (
      <div key={section.category} className="space-y-1 pt-3">
        {/* Category Header */}
        <div className="px-4 py-1.5 text-[10px] font-bold tracking-wider text-purple-300/60 uppercase">
          {section.category}
        </div>
        
        {section.items.map((item) => {
          const Icon = item.icon;
          
          if (item.children) {
            const isParentActive = item.children.some(child => 
              location.pathname === child.path && 
              (!child.search || location.search === child.search)
            );
            const isExpanded = expandedItems[item.name];
            
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => {
                    toggleExpand(item.name);
                    if (item.children && item.children.length > 0) {
                      navigate(`${item.children[0].path}${item.children[0].search || ''}`);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg transition-all duration-200 group relative cursor-pointer border ${
                    isParentActive 
                      ? 'bg-violet-500/15 border-violet-500/30 text-white font-semibold' 
                      : 'hover:bg-white/5 border-transparent text-white/80 font-medium'
                  }`}
                >

                  <div className="flex items-center">
                    <Icon 
                      size={18} 
                      className={`mr-3 transition-colors ${isParentActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}
                    />
                    <span className="text-[13px] tracking-wide">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {item.badge !== null && item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-white/50 group-hover:text-white/85" /> : <ChevronDown size={14} className="text-white/50 group-hover:text-white/85" />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="ml-5 pl-3.5 border-l border-white/10 space-y-1 mt-1 mb-2">
                    {item.children.map((child) => {
                      const isChildActive = location.pathname === child.path && 
                        (!child.search || location.search === child.search);
                      
                      return (
                        <NavLink
                          key={child.name}
                          to={`${child.path}${child.search || ''}`}
                          onClick={(e) => {
                            if (isMobile) {
                              setIsMobileOpen(false);
                            }
                          }}
                          className={`block py-1.5 px-2.5 text-[12.5px] transition-colors rounded-lg border ${
                            isChildActive 
                              ? 'bg-violet-500/10 border-violet-500/20 text-white font-semibold' 
                              : 'hover:bg-white/5 border-transparent text-white/60 hover:text-white/95 font-medium'
                          }`}
                        >
                          {child.name}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            const isActive = location.pathname === item.path;
            return (
              <NavLink 
                key={item.name}
                to={item.path}
                onClick={(e) => {
                  if (isMobile) {
                    setIsMobileOpen(false);
                  }
                }}
                className={`flex items-center justify-between px-3.5 py-2 rounded-lg transition-all duration-200 group relative overflow-hidden border ${
                  isActive 
                    ? 'bg-violet-500/15 border-violet-500/30 text-white font-semibold' 
                    : 'hover:bg-white/5 border-transparent text-white/80 font-medium'
                }`}
              >
                {/* Active Accent Bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-violet-400 to-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
                )}
                
                <div className="flex items-center">
                  <Icon 
                    size={18} 
                    className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}
                  />
                  <span className="text-[13px] tracking-wide relative z-10">{item.name}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white border border-rose-400/20 animate-pulse relative z-10">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          }
        })}
      </div>
    ));
  };

  const handleSignOut = () => {
    headLogout();
    navigate('/head/login');
  };

  return (
    <div className="relative w-full h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* ─── DESKTOP SIDEBAR ─── */}
      {isDesktopSidebarOpen && (
        <aside 
          className="hidden md:flex flex-col w-[260px] h-full shrink-0 z-40 transition-all duration-300"
          style={{
            background: 'linear-gradient(160deg, #13093a 0%, #1e1145 30%, #25175a 65%, #2d1b69 100%)',
            borderRight: '1px solid rgba(167,139,250,0.12)',
            boxShadow: '4px 0 48px rgba(0,0,0,0.3), inset -1px 0 0 rgba(167,139,250,0.08)',
          }}
        >
          {/* Brand Header */}
          <div className="px-6 pt-7 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' }}
              >
                <span className="relative z-10">म</span>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
              </div>
              <div>
                <h1 className="text-[17px] font-extrabold text-white tracking-tight leading-none">MeriSamaj</h1>
                <p className="text-[9px] font-semibold uppercase tracking-widest mt-1.5" style={{ color: 'rgba(167,139,250,0.6)' }}>DashboardKit</p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-5 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent mb-5" />

          {/* Executive Tag */}
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200/90 font-bold uppercase tracking-wider text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-2 mx-4 mb-4">
            <Award size={16} className="text-amber-500 animate-pulse shrink-0" />
            <span>President Council</span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
            {renderNavItems(false)}
          </nav>

          {/* User Card & Sign Out */}
          <div className="p-4 space-y-2 mt-auto">
            <div className="mx-2 mb-2 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />
            
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Avatar 
                initials="MA" 
                size="sm" 
                imageUrl={currentUser?.avatar}
                color="bg-gradient-to-br from-amber-400 to-purple-600 text-white font-bold"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-none">{headUser?.name || 'Community Head'}</p>
                <p className="text-[10px] font-semibold text-purple-300/60 truncate mt-1 leading-none">{headUser?.title || 'Adhyaksh (Head)'}</p>
                {/* Community badge — shows community from DB (communityId.name) */}
                {(headUser?.communityId?.name || headUser?.community) && (
                  <p className="text-[9px] font-bold text-amber-400/80 truncate mt-1 leading-none">
                    🏛️ {headUser?.communityId?.name || headUser?.community}
                  </p>
                )}
              </div>
            </div>


            <NavLink
              to="/member/home"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 text-xs font-semibold text-indigo-200 bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30 cursor-pointer active:scale-95"
            >
              <Home size={14} className="text-indigo-400" /> <span>Switch to Member App</span>
            </NavLink>

            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 text-xs font-semibold text-rose-300/90 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer active:scale-95"
            >
              <LogOut size={14} /> <span>Log Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ─── MOBILE HEADER & TOP NAV ─── */}
      <header className="md:hidden w-full h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-md shadow-sm">
            म
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-800 leading-none">MeriSamaj</h1>
            <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Council Head</p>
          </div>
        </div>

        <button 
          onClick={() => setIsMobileOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 active:bg-slate-50 border border-slate-200 cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ─── MOBILE DRAWER MENU ─── */}
      {isMobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300"
            onClick={() => setIsMobileOpen(false)}
          />
          <div 
            className="fixed top-0 left-0 bottom-0 w-[288px] z-55 flex flex-col shadow-2xl pb-safe"
            style={{
              background: 'linear-gradient(160deg, #13093a 0%, #1e1145 30%, #25175a 65%, #2d1b69 100%)',
              borderRight: '1px solid rgba(167,139,250,0.12)',
              boxShadow: '4px 0 48px rgba(0,0,0,0.3), inset -1px 0 0 rgba(167,139,250,0.08)',
            }}
          >
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', boxShadow: '0 4px 16px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                >
                  <span className="relative z-10">म</span>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                </div>
                <div>
                  <h1 className="text-[17px] font-extrabold text-white tracking-tight leading-none">MeriSamaj</h1>
                  <p className="text-[9px] font-semibold uppercase tracking-widest mt-1.5" style={{ color: 'rgba(167,139,250,0.6)' }}>DashboardKit</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 transition-all active:scale-90 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Separator */}
            <div className="mx-5 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent mb-4" />

            {/* Executive Tag */}
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200/90 font-bold uppercase tracking-wider text-[10px] px-3.5 py-2 rounded-xl flex items-center gap-2 mx-4 mb-4">
              <Award size={16} className="text-amber-500 animate-pulse shrink-0" />
              <span>President Council</span>
            </div>

            {/* Nav items list */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto px-1 no-scrollbar">
              {renderNavItems(true)}
            </nav>

            {/* Footer */}
            <div className="p-4 mt-auto space-y-2">
              <div className="mx-2 mb-2 h-[1px] bg-gradient-to-r from-transparent via-purple-400/15 to-transparent" />
              
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <Avatar 
                  initials={headUser?.initials || (headUser?.name ? headUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'MA')} 
                  size="sm" 
                  imageUrl={headUser?.avatar}
                  color="bg-gradient-to-br from-amber-400 to-purple-600 text-white font-bold"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-none">{headUser?.name || 'Community Head'}</p>
                  <p className="text-[10px] font-semibold text-purple-300/60 truncate mt-1.5 leading-none">{headUser?.title || 'Adhyaksh (Head)'}</p>
                </div>
              </div>

              <NavLink
                to="/member/home"
                onClick={() => setIsMobileOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 text-xs font-semibold text-indigo-200 bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30 cursor-pointer active:scale-95"
              >
                <Home size={14} className="text-indigo-400" /> <span>Switch to Member App</span>
              </NavLink>

              <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-200 text-xs font-semibold text-rose-300/90 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer active:scale-95"
              >
                <LogOut size={14} /> <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── MAIN CONTENT FRAME ─── */}
      <main className="flex-1 w-full h-full min-w-0 flex flex-col relative overflow-hidden bg-slate-50">
        {/* Top Navbar */}
        <div className="h-[72px] bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 hidden md:flex z-30 shadow-sm shadow-slate-100/10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 hover:border-slate-300 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-slate-800 font-semibold text-sm tracking-wide">Council Workspace</h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-6 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-850 leading-none">{headUser?.name || 'Community Head'}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{headUser?.role === 'head' ? 'Administrator' : 'Head Panel'}</p>
              </div>
              <Avatar 
                initials={headUser?.initials || (headUser?.name ? headUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'MA')} 
                size="sm" 
                imageUrl={headUser?.avatar}
                color="bg-indigo-600 text-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-2 md:pt-3 pb-4 md:pb-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
export default HeadLayout;
