import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataProvider';
import { Mail, Search, Bell, Plus, ChevronLeft, Menu, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EnvelopeInvitationCard from './components/EnvelopeInvitationCard';
import SentInvitationAnalyticsModal from './components/SentInvitationAnalyticsModal';

export default function InvitationHomePage() {
  const navigate = useNavigate();
  const { invitations, currentUser, members, setMobileMenuOpen, getUnreadCountForModule } = useData();

  const [activeCategory, setActiveCategory] = useState('All'); // 'All' | 'Received' | 'Sent'
  const [analyticsInvitationId, setAnalyticsInvitationId] = useState(null);
  const [dateFilter, setDateFilter] = useState('All Dates'); // 'All Dates' | 'Today' | 'This Week' | 'This Month' | 'Upcoming' | 'Past'
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateFilters = [
    { id: 'All Dates', label: 'All Dates' },
    { id: 'Today', label: 'Today' },
    { id: 'This Week', label: 'This Week' },
    { id: 'This Month', label: 'This Month' },
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Past', label: 'Past' }
  ];

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getCreatorIdStr = (inv) => {
    if (!inv || !inv.creatorId) return '';
    return typeof inv.creatorId === 'object' ? String(inv.creatorId._id || inv.creatorId.id) : String(inv.creatorId);
  };

  const currentUserIdStr = String(currentUser?.id || currentUser?._id || '');

  // Calculate counts for category badges
  const allCount = invitations.filter(inv => inv.status === 'Approved' || currentUser?.role === 'admin' || getCreatorIdStr(inv) === currentUserIdStr).length;
  const sentCount = invitations.filter(inv => getCreatorIdStr(inv) === currentUserIdStr).length;
  const receivedCount = invitations.filter(inv => (inv.status === 'Approved' || currentUser?.role === 'admin') && getCreatorIdStr(inv) !== currentUserIdStr).length;

  const filteredInvitations = invitations.filter(inv => {
    const isCreatedByMe = getCreatorIdStr(inv) === currentUserIdStr;

    // Only show Approved for regular users unless created by me or admin
    if (inv.status !== 'Approved' && currentUser?.role !== 'admin' && !isCreatedByMe) {
      return false;
    }

    // Category Filter
    if (activeCategory === 'Sent' && !isCreatedByMe) {
      return false;
    }
    if (activeCategory === 'Received' && isCreatedByMe) {
      return false;
    }

    // Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchGroom = inv.groomName?.toLowerCase().includes(lowerQuery);
      const matchBride = inv.brideName?.toLowerCase().includes(lowerQuery);
      const matchTitle = inv.title?.toLowerCase().includes(lowerQuery);
      const matchHost = inv.hostName?.toLowerCase().includes(lowerQuery);
      const matchLocation = inv.location?.toLowerCase().includes(lowerQuery);
      const matchFamily = inv.familyName?.toLowerCase().includes(lowerQuery);

      if (!matchGroom && !matchBride && !matchTitle && !matchHost && !matchLocation && !matchFamily) {
        return false;
      }
    }

    // Date Filter
    const invDate = parseLocalDate(inv.date);
    invDate.setHours(0, 0, 0, 0);

    if (dateFilter === 'Upcoming') {
      return invDate >= today;
    }
    if (dateFilter === 'Past') {
      return invDate < today;
    }
    if (dateFilter === 'Today') {
      return invDate.getTime() === today.getTime();
    }
    if (dateFilter === 'This Week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return invDate >= startOfWeek && invDate <= endOfWeek;
    }
    if (dateFilter === 'This Month') {
      return invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
    }

    return true;
  });

  // Resolved from the live list (not stored) so the modal reflects new opens/RSVPs as they arrive
  const analyticsInvitation = analyticsInvitationId
    ? invitations.find(inv => String(inv._id || inv.id) === String(analyticsInvitationId))
    : null;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans select-none pb-24">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/85 backdrop-blur-xl px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_12px_rgba(124,58,237,0.03)] border-b border-purple-100/30">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale">
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Mail size={17} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <h1 className="text-[17px] font-extrabold text-slate-800 tracking-tight leading-tight">Invitations</h1>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Nimantran Hub</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearching(!isSearching)} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-all press-scale">
            <Search size={18} />
          </button>
          <button onClick={() => navigate('/member/notifications?module=nimantran')} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 relative hover:bg-purple-50 transition-all press-scale">
            <Mail size={18} />
            {getUnreadCountForModule('nimantran') > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-600" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-white/70 backdrop-blur-md border-b border-purple-100/20 overflow-hidden"
          >
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by Groom, Bride, Family, Venue..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-purple-100/40 rounded-2xl pl-10 pr-4 py-3 text-[13px] font-bold outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all text-slate-800 placeholder-slate-400"
                autoFocus
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs & Date Filter Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-purple-100/30 px-4 py-3 sticky top-[56px] z-20 shadow-xs space-y-2.5">
        {/* Primary Tabs: All | Received | Sent */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
          {[
            { id: 'All', label: 'All', count: allCount },
            { id: 'Received', label: 'Received', count: receivedCount },
            { id: 'Sent', label: 'Sent', count: sentCount },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-1 py-2.5 rounded-xl text-[12.5px] font-black transition-all press-scale flex items-center justify-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
            <Calendar size={12} className="text-purple-500" /> Filter:
          </span>
          {dateFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setDateFilter(filter.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all press-scale border ${
                dateFilter === filter.id
                  ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs font-black'
                  : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        <AnimatePresence>
          {filteredInvitations.map(inv => (
            <EnvelopeInvitationCard
              key={inv._id || inv.id}
              inv={inv}
              isSentTab={activeCategory === 'Sent'}
              onOpenAnalytics={(target) => setAnalyticsInvitationId(target._id || target.id)}
              onOpenDetail={(id) => navigate(`/member/invitations/${id}`)}
            />
          ))}
        </AnimatePresence>
        
        {filteredInvitations.length === 0 && (
          <div className="text-center text-slate-500 py-16 flex flex-col items-center bg-white rounded-[28px] border border-slate-200/80 p-8 shadow-xs">
            <Mail size={44} className="mb-3 text-purple-300" />
            <h3 className="text-slate-800 font-extrabold text-base">No Invitations Found</h3>
            <p className="text-xs font-medium text-slate-400 mt-1">No invitations match the selected category & date filter.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate('/member/invitations/create')}
        className="fixed bottom-[92px] right-5 w-13 h-13 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 active:scale-90 transition-transform z-30 press-scale hover:scale-105"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Creator-only RSVP & Opened insights */}
      {analyticsInvitation && (
        <SentInvitationAnalyticsModal
          inv={analyticsInvitation}
          members={members}
          onClose={() => setAnalyticsInvitationId(null)}
        />
      )}
    </div>
  );
}
