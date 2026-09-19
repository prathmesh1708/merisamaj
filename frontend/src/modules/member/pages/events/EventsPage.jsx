import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, MapPin, Clock, Users as UsersIcon, CalendarDays, CheckCircle, ChevronRight, Star, Sparkles, X, Globe } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { useDraggableScroll } from '../../../../hooks/useDraggableScroll';

const categoryConfig = {
  Cultural: { label: 'Cultural', emoji: '🎭', gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Education: { label: 'Education', emoji: '📚', gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Matrimonial: { label: 'Matrimonial', emoji: '💍', gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  Health: { label: 'Health', emoji: '🏥', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Sports: { label: 'Sports', emoji: '🏆', gradient: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

/* ─── Featured Event Banner Card ─── */
const FeaturedEventCard = ({ event, onClick }) => {
  const config = categoryConfig[event.category] || categoryConfig.Cultural;
  return (
    <div
      onClick={onClick}
      className="snap-center shrink-0 w-[88%] max-w-[340px] h-[200px] rounded-[24px] relative overflow-hidden shadow-lg cursor-pointer active:scale-[0.97] transition-transform"
    >
      {/* Event Image / Gradient Background */}
      {event.image ? (
        <img 
          src={event.image} 
          alt={event.title} 
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-300 hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
      
      {/* Decorative elements (only if no image) */}
      {!event.image && (
        <div className="absolute top-4 right-4 opacity-10">
          <CalendarDays size={80} className="text-white" />
        </div>
      )}

      {/* Featured badge */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5">
        <span className="bg-amber-400 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Star size={10} fill="currentColor" /> Featured
        </span>
        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/20">
          {config.emoji} {config.label}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-white text-[18px] font-extrabold leading-tight drop-shadow-md mb-2">
          {event.titleEn || event.title}
        </h3>
        <div className="flex items-center gap-3 text-white/80 text-[12px] font-medium">
          <span className="flex items-center gap-1">
            <CalendarDays size={12} /> {event.day} {event.monthShort}
          </span>
          <span className="w-[1px] h-3 bg-white/30" />
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {(event.venueEn || event.venue).split(',')[0]}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
            <UsersIcon size={12} className="text-white" />
            <span className="text-white text-[11px] font-bold">{event.interested}+ Interested</span>
          </div>
          {event.daysRemaining && (
            <span className="text-white/70 text-[11px] font-bold bg-black/20 px-3 py-1 rounded-full">
              {event.daysRemaining} Days Left
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Compact Event Card ─── */
const EventCard = ({ event, index, onNavigate }) => {
  const navigate = useNavigate();
  const { toggleEventRSVP } = useData();
  const config = categoryConfig[event.category] || categoryConfig.Cultural;

  return (
    <div
      className="card-neo overflow-hidden cursor-pointer animate-stagger-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => navigate(`/member/events/${event._id || event.id}`)}
    >
      {/* Top gradient strip */}
      <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

      <div className="p-4">
        <div className="flex gap-3.5">
          {/* Date Block */}
          <div className={`w-[56px] h-[64px] bg-gradient-to-br ${config.gradient} rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-md`}>
            <span className="text-white font-extrabold text-[20px] leading-none">{event.day}</span>
            <span className="text-white/90 text-[10px] font-bold mt-0.5 uppercase">{event.monthShort}</span>
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-[14px] text-gray-900 leading-snug line-clamp-2">{event.titleEn || event.title}</h4>
              <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                {config.label}
              </span>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <p className="text-[12px] text-gray-500 flex items-center gap-1.5">
                <Clock size={11} className="text-gray-400 shrink-0" /> {event.timeEn || event.time}
              </p>
              <p className="text-[12px] text-gray-500 flex items-center gap-1.5 line-clamp-1">
                <MapPin size={11} className="text-gray-400 shrink-0" /> {event.venueEn || event.venue}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {event.locationScope === 'ALL' || event.isAllLocations || !event.city || event.city === 'ALL' || event.city === 'All Locations' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    <Globe size={10} /> All Locations
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    <MapPin size={10} /> {event.city}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
              <UsersIcon size={11} className="text-gray-400" /> {event.attendees || event.goingCount || 0} Attending
            </span>
            <span className="text-[11px] text-gray-400">•</span>
            <span className="text-[11px] text-gray-500 font-medium">
              {event.interested || 0}+ Interested
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleEventRSVP(event._id || event.id);
            }}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all active:scale-95 ${
              event.isRegistered
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
            }`}
          >
            {event.isRegistered ? <><CheckCircle size={12} /> Registered</> : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Filter Bottom Sheet ─── */
const FilterSheet = ({ isOpen, onClose, filters, setFilters, categories }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-[28px] z-50 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
        
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-extrabold text-gray-900">Filter</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="mb-5">
            <p className="text-[13px] font-bold text-gray-600 mb-3">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const config = categoryConfig[cat] || {};
                const isActive = filters.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilters(f => ({ ...f, category: isActive ? 'all' : cat }))}
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                      isActive
                        ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
                        : 'bg-gray-50 text-gray-600 border border-gray-100'
                    }`}
                  >
                    {config.emoji} {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Registration Status */}
          <div className="mb-5">
            <p className="text-[13px] font-bold text-gray-600 mb-3">Registration Status</p>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'registered', label: 'Registered' },
                { key: 'unregistered', label: 'Unregistered' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilters(f => ({ ...f, registration: opt.key }))}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                    filters.registration === opt.key
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mb-6">
            <p className="text-[13px] font-bold text-gray-600 mb-3">Sort by</p>
            <div className="flex gap-2">
              {[
                { key: 'date', label: 'Date' },
                { key: 'popular', label: 'Popular' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilters(f => ({ ...f, sort: opt.key }))}
                  className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                    filters.sort === opt.key
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFilters({ category: 'all', registration: 'all', sort: 'date' });
              }}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-[13px] font-bold active:scale-95"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="flex-[2] py-3 rounded-2xl bg-brand-primary text-white text-[13px] font-bold shadow-md shadow-brand-primary/20 active:scale-95"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Main Events Page ─── */
const EventsPage = () => {
  const { events, eventsLoading, eventsError, loadEvents } = useData();
  const navigate = useNavigate();
  const featuredRef = useDraggableScroll();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', registration: 'all', sort: 'date' });

  useEffect(() => {
    loadEvents();
  }, []);

  const categories = [...new Set(events.map(e => e.category))];

  const featuredEvents = events.filter(e => e.isFeatured);

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.titleEn && e.titleEn.toLowerCase().includes(q)) ||
        e.venue.toLowerCase().includes(q) ||
        (e.categoryHi && e.categoryHi.includes(q))
      );
    }

    // Category
    if (filters.category !== 'all') {
      result = result.filter(e => e.category === filters.category);
    }

    // Registration
    if (filters.registration === 'registered') {
      result = result.filter(e => e.isRegistered);
    } else if (filters.registration === 'unregistered') {
      result = result.filter(e => !e.isRegistered);
    }

    // Sort
    if (filters.sort === 'popular') {
      result.sort((a, b) => (b.interested || 0) - (a.interested || 0));
    }

    return result;
  }, [events, searchQuery, filters]);

  const hasActiveFilters = filters.category !== 'all' || filters.registration !== 'all';

  return (
    <div className="min-h-screen bg-surface pb-28 max-w-md mx-auto w-full shadow-sm">
      {/* Header Bar — Glass morphism */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-purple-100/30 shadow-[0_2px_12px_rgba(124,58,237,0.02)]">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-text-primary hover:bg-purple-50 transition-colors press-scale">
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <h1 className="text-base font-bold text-text-primary tracking-tight">Events</h1>
          <button
            onClick={() => setShowFilter(true)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all press-scale ${hasActiveFilters ? 'bg-purple-50 text-brand-primary border border-purple-200/40' : 'bg-gray-50 text-text-primary hover:bg-purple-50'}`}
          >
            <Filter size={18} />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-purple-100/30 rounded-2xl text-[13px] text-text-primary font-bold placeholder:text-text-secondary outline-none focus:border-brand-primary/45 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* ─── Featured Events Carousel ─── */}
      {!searchQuery && filters.category === 'all' && (eventsLoading || featuredEvents.length > 0) && (
        <div className="pt-5 pb-2">
          <div className="px-5 flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" /> Featured Events
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Highlighted Events</p>
            </div>
          </div>
          <div
            ref={featuredRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 px-5 pb-3"
          >
            {eventsLoading ? (
              [1, 2, 3].map(n => (
                <div key={n} className="shrink-0 w-[88%] max-w-[340px] h-[200px] rounded-[24px] bg-gray-100/60 animate-pulse border border-gray-100" />
              ))
            ) : (
              featuredEvents.map(event => (
                <FeaturedEventCard
                  key={event._id || event.id}
                  event={event}
                  onClick={() => navigate(`/member/events/${event._id || event.id}`)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── Event Count ─── */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <p className="text-[13px] text-gray-500 font-medium">
          Total <span className="font-bold text-gray-800">{filteredEvents.length}</span> Events
        </p>
        {hasActiveFilters && (
          <button
            onClick={() => setFilters({ category: 'all', registration: 'all', sort: 'date' })}
            className="text-[11px] text-brand-primary font-bold flex items-center gap-1 active:scale-95"
          >
            <X size={12} /> Clear Filter
          </button>
        )}
      </div>

      {/* ─── Events List ─── */}
      <div className="px-4 pb-6 flex flex-col gap-3">
        {eventsLoading ? (
          [1, 2, 3, 4, 5].map(n => (
            <div key={n} className="bg-white rounded-2xl p-4 flex gap-4 animate-pulse border border-gray-100/50 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              <div className="w-[56px] h-[64px] bg-gray-100 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : eventsError ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-rose-100/40 shadow-sm">
            <p className="text-sm font-semibold text-rose-600">{eventsError || 'Unable to load events'}</p>
            <button
              onClick={loadEvents}
              className="mt-4 px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-sm shadow-brand-primary/20 press-scale"
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((event, i) => (
            <EventCard key={event.id || event._id || `event-${i}`} event={event} index={i} />
          ))
        ) : (
          <div className="text-center py-16">
            <CalendarDays size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-[15px] font-bold text-gray-400">No events found</p>
            <p className="text-[12px] text-gray-400 mt-1">Please try a different search or filter</p>
          </div>
        )}
      </div>

      {/* ─── Filter Sheet ─── */}
      <FilterSheet
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        setFilters={setFilters}
        categories={categories}
      />
    </div>
  );
};

export default EventsPage;
