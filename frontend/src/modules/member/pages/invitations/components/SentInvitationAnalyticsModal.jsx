import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, PartyPopper, Users, UserX, Clock, Phone, MessageCircle, Search } from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar';
import {
  buildInvitationAnalytics,
  formatRelativeTime,
  RSVP_STATUS_META
} from '../utils/invitationAnalytics';

const STATUS_BADGE = {
  attending: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  attending_family: 'bg-purple-50 text-purple-700 border-purple-200/70',
  not_attending: 'bg-rose-50 text-rose-700 border-rose-200/70',
  pending: 'bg-slate-100 text-slate-600 border-slate-200/70'
};

const MetricCard = ({ icon: Icon, value, label, tone }) => (
  <div className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-3 ${tone}`}>
    <Icon size={15} strokeWidth={2.4} className="mb-1.5 opacity-80" />
    <span className="text-[19px] font-black leading-none">{value}</span>
    <span className="text-[9.5px] font-extrabold uppercase tracking-wider mt-1 text-center opacity-80">{label}</span>
  </div>
);

const MemberRow = ({ member, meta }) => (
  <div className="flex items-center justify-between gap-3 p-3 bg-slate-50/60 border border-slate-100 rounded-2xl hover:border-purple-200/70 hover:bg-white transition-all">
    <div className="flex items-center gap-3 min-w-0">
      <Avatar initials={member.initials} size="md" avatar={member.avatar} />
      <div className="min-w-0">
        <h4 className="text-[13px] font-extrabold text-slate-800 truncate">{member.name}</h4>
        <p className="text-[10.5px] text-slate-500 font-semibold truncate">
          {[member.profession, member.city].filter(Boolean).join(' • ') || 'Samaj Member'}
        </p>
        {meta && <p className="text-[10px] text-purple-600 font-bold mt-0.5 truncate">{meta}</p>}
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      {member.status && (
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border whitespace-nowrap ${STATUS_BADGE[member.status]}`}>
          {RSVP_STATUS_META[member.status]?.label}
        </span>
      )}
      {member.phone && (
        <>
          <a
            href={`tel:${member.phone}`}
            title={`Call ${member.name}`}
            className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors press-scale"
          >
            <Phone size={14} />
          </a>
          <a
            href={`sms:${member.phone}`}
            title={`Message ${member.name}`}
            className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors press-scale"
          >
            <MessageCircle size={14} />
          </a>
        </>
      )}
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="text-center py-12 text-slate-400 text-[12px] font-semibold bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
    {message}
  </div>
);

/**
 * Creator-only drawer for a sent invitation: who opened it, and how everyone
 * answered the RSVP. Slides up from the bottom so it works one-handed on mobile.
 */
export default function SentInvitationAnalyticsModal({ inv, members = [], onClose }) {
  const [activeTab, setActiveTab] = useState('rsvp'); // 'rsvp' | 'opened'
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [query, setQuery] = useState('');

  const stats = useMemo(() => buildInvitationAnalytics(inv, members), [inv, members]);

  const displayTitle = inv?.title || `Wedding of ${inv?.groomName} & ${inv?.brideName}`;

  const rsvpFilters = [
    { id: 'all', label: 'All Responses', list: stats.all },
    { id: 'attending', label: 'Attending (Self)', list: stats.attending },
    { id: 'attending_family', label: 'Attending (Family)', list: stats.family },
    { id: 'not_attending', label: 'Not Attending', list: stats.declined },
    { id: 'pending', label: 'Pending', list: stats.pending }
  ];

  const applySearch = (list) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.city?.toLowerCase().includes(q) ||
      m.profession?.toLowerCase().includes(q)
    );
  };

  const activeRsvpList = applySearch(rsvpFilters.find(f => f.id === rsvpFilter)?.list || []);
  const openedList = applySearch(stats.opened);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b border-slate-100 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-3 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-black text-slate-900 tracking-tight truncate">RSVP & Opened Insights</h3>
                <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{displayTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} strokeWidth={2.6} />
              </button>
            </div>

            {/* Overview metrics */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <MetricCard icon={Eye} value={stats.openedCount} label="Opened" tone="bg-indigo-50/70 border-indigo-100 text-indigo-700" />
              <MetricCard icon={PartyPopper} value={stats.attendingCount} label="Attending" tone="bg-emerald-50/70 border-emerald-100 text-emerald-700" />
              <MetricCard icon={Users} value={stats.familyCount} label="With Family" tone="bg-purple-50/70 border-purple-100 text-purple-700" />
              <MetricCard icon={UserX} value={stats.declinedCount} label="Declined" tone="bg-rose-50/70 border-rose-100 text-rose-700" />
            </div>

            {stats.viewCount > stats.openedCount && (
              <p className="text-[10.5px] font-bold text-slate-400 mt-2 text-center">
                {stats.viewCount} total views from {stats.openedCount} member{stats.openedCount === 1 ? '' : 's'}
              </p>
            )}

            {/* Primary tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl mt-4">
              {[
                { id: 'rsvp', label: 'RSVP Answers', count: stats.all.length },
                { id: 'opened', label: 'Who Opened', count: stats.openedCount }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-black transition-all press-scale flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members by name, city..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[12.5px] font-semibold outline-none focus:border-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {activeTab === 'rsvp' ? (
              <>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                  {rsvpFilters.map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setRsvpFilter(filter.id)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all press-scale border ${
                        rsvpFilter === filter.id
                          ? 'bg-purple-50 text-purple-700 border-purple-200 font-black'
                          : 'bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label} ({filter.list.length})
                    </button>
                  ))}
                </div>

                {activeRsvpList.length === 0 ? (
                  <EmptyState message={query ? 'No members match your search.' : 'No responses in this category yet.'} />
                ) : (
                  activeRsvpList.map(member => (
                    <MemberRow
                      key={`${member.id}-${member.status}`}
                      member={member}
                      meta={
                        member.status === 'pending'
                          ? 'Awaiting response'
                          : member.respondedAt
                            ? `Responded ${formatRelativeTime(member.respondedAt)}`
                            : null
                      }
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 px-1">
                  <Clock size={12} className="text-purple-500" />
                  <span>Members who opened this invitation, latest first</span>
                </div>

                {openedList.length === 0 ? (
                  <EmptyState message={query ? 'No members match your search.' : 'Nobody has opened this invitation yet.'} />
                ) : (
                  openedList.map(member => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      meta={`Opened ${formatRelativeTime(member.lastOpenedAt)}${member.openCount > 1 ? ` • ${member.openCount} times` : ''}`}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
