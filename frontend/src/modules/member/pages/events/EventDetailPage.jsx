import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Users, CheckCircle, Share2, CalendarDays, Heart, Phone, MessageCircle, ExternalLink, ChevronRight, Star, Bookmark, BookmarkCheck, Bell, BellOff, X, Image, User, Ticket, ChevronDown, Globe } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';
import { eventService } from '../../services/eventService';
import { useDraggableScroll } from '../../../../hooks/useDraggableScroll';

const categoryConfig = {
  Cultural: { label: 'Cultural', emoji: '🎭', gradient: 'from-purple-500 to-violet-600', lightBg: 'bg-purple-50', lightText: 'text-purple-700' },
  Education: { label: 'Education', emoji: '📚', gradient: 'from-blue-500 to-cyan-600', lightBg: 'bg-blue-50', lightText: 'text-blue-700' },
  Matrimonial: { label: 'Matrimonial', emoji: '💍', gradient: 'from-pink-500 to-rose-600', lightBg: 'bg-pink-50', lightText: 'text-pink-700' },
  Health: { label: 'Health', emoji: '🏥', gradient: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700' },
  Sports: { label: 'Sports', emoji: '🏆', gradient: 'from-orange-500 to-amber-600', lightBg: 'bg-orange-50', lightText: 'text-orange-700' },
};

const mockAttendees = [
  { initials: 'RA', name: 'Rajesh A.' },
  { initials: 'KA', name: 'Kavita A.' },
  { initials: 'SM', name: 'Suresh M.' },
  { initials: 'AG', name: 'Anita G.' },
  { initials: 'DS', name: 'Deepak S.' },
  { initials: 'VJ', name: 'Vikas J.' },
  { initials: 'PK', name: 'Priyanka K.' },
];

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toggleEventReminder, registerForEvent, toggleEventBookmark, toggleEventInterest, toggleEventRSVP } = useData();
  const attendeesRef = useDraggableScroll();
  const galleryRef = useDraggableScroll();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showShareToast, setShowShareToast] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);

  // RSVP Registration Modal State
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [rsvpStep, setRsvpStep] = useState(1); // 1: form | 2: success
  const [rsvpForm, setRsvpForm] = useState({ name: '', phone: '', attendees: '1' });
  const [rsvpErrors, setRsvpErrors] = useState({});

  // Toast for reminder
  const [showReminderToast, setShowReminderToast] = useState(false);
  const [reminderToastMsg, setReminderToastMsg] = useState('');

  const fetchEventDetails = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventService.getEventById(eventId);
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load event details:', err);
      setError('Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  const handleShare = () => {
    if (!event) return;
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleReminderToggle = async () => {
    if (!event) return;
    try {
      const targetId = event.id || event._id;
      const isNowSet = await toggleEventReminder(targetId);
      setEvent(prev => ({ ...prev, isReminderSet: isNowSet }));
      setReminderToastMsg(isNowSet ? 'Reminder set' : 'Reminder removed');
      setShowReminderToast(true);
      setTimeout(() => setShowReminderToast(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!event) return;
    try {
      const targetId = event.id || event._id;
      const isBookmarked = await toggleEventBookmark(targetId);
      setEvent(prev => ({ ...prev, isBookmarked }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleInterestToggle = async () => {
    if (!event) return;
    try {
      const targetId = event.id || event._id;
      const res = await toggleEventInterest(targetId);
      if (res) {
        setEvent(prev => ({
          ...prev,
          isInterested: res.isInterested,
          interested: res.interestedCount
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRSVPSubmit = async () => {
    if (!event) return;
    const errors = {};
    if (!rsvpForm.name.trim()) errors.name = true;
    if (!rsvpForm.phone.trim() || rsvpForm.phone.replace(/\D/g,'').length < 10) errors.phone = true;
    if (Object.keys(errors).length > 0) {
      setRsvpErrors(errors);
      return;
    }
    await registerForEvent(event._id || event.id, rsvpForm);
    setEvent(prev => ({
      ...prev,
      isRegistered: true,
      attendees: prev.attendees + 1
    }));
    setRsvpStep(2);
  };

  const handleRSVPToggle = async () => {
    if (!event) return;
    try {
      const targetId = event.id || event._id;
      const res = await toggleEventRSVP(targetId);
      if (res) {
        setEvent(prev => ({
          ...prev,
          isRegistered: res.isRegistered,
          attendees: res.attendeesCount
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center max-w-md mx-auto w-full shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-semibold">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full shadow-sm">
        <p className="text-sm font-semibold text-rose-600 mb-4">{error || 'Event not found'}</p>
        <button
          onClick={fetchEventDetails}
          className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-sm shadow-brand-primary/20 press-scale"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isReminderSet = !!event.isReminderSet;
  const isRegistered = !!event.isRegistered;
  const isInterested = !!event.isInterested;
  const isBookmarked = !!event.isBookmarked;

  // Calculate Days Left dynamically from startDate or date
  const getDaysLeft = () => {
    if (typeof event.daysRemaining === 'number') return event.daysRemaining;
    if (event.daysRemaining && event.daysRemaining !== '–') return event.daysRemaining;
    
    const rawDate = event.startDate || event.date;
    if (!rawDate) return '–';

    let targetDate = new Date(rawDate);
    if (isNaN(targetDate.getTime()) && typeof rawDate === 'string') {
      const parts = rawDate.split('-');
      if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
        targetDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }

    if (isNaN(targetDate.getTime())) return '–';

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Ended';
    if (diffDays === 0) return 'Today';
    return diffDays;
  };

  // Gallery images: use event-specific gallery or fallback to category-based photos
  const galleryImages = event.gallery || [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
    'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?w=800&q=80',
  ];

  const config = categoryConfig[event.category] || categoryConfig.Cultural;

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-32 max-w-md mx-auto w-full shadow-sm">
      {/* ─── Hero Banner ─── */}
      <div className="relative bg-gray-900">
        <div className="h-[240px] relative overflow-hidden bg-gray-900">
          {/* Event Image / Gradient Background */}
          {event.image ? (
            <img 
              src={event.image} 
              alt={event.title} 
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-90`} />
          )}
          
          {/* Decorative background elements (only if no image) */}
          {!event.image && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-6 right-6">
                <CalendarDays size={120} className="text-white" />
              </div>
              <div className="absolute bottom-4 left-4">
                <CalendarDays size={60} className="text-white rotate-12" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Nav */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-5">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform border border-white/20"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBookmarkToggle}
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform border border-white/20"
              >
                {isBookmarked ? <BookmarkCheck size={18} className="text-amber-300" fill="currentColor" /> : <Bookmark size={18} className="text-white" />}
              </button>
              <button 
                onClick={handleReminderToggle}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform border ${
                  isReminderSet
                    ? 'bg-amber-400/30 border-amber-300/40'
                    : 'bg-white/15 border-white/20'
                }`}
              >
                {isReminderSet ? <Bell size={18} className="text-amber-300" fill="currentColor" /> : <Bell size={18} className="text-white" />}
              </button>
              <button 
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform border border-white/20"
              >
                <Share2 size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-4 right-4 z-10">
            <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full border border-white/20">
              {config.emoji} {config.label}
            </span>
          </div>
        </div>

        {/* Date Badge - Overlapping */}
        <div className="absolute bottom-[-24px] left-5 z-20">
          <div className="w-[64px] h-[72px] bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center border border-gray-100">
            <span className="text-[24px] font-black text-gray-900 leading-none">{event.day}</span>
            <span className="text-[11px] font-bold text-brand-primary mt-0.5">{event.month}</span>
          </div>
        </div>
      </div>

      {/* ─── Event Title Card ─── */}
      <div className="px-4 pt-8 pb-1">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100">
          <h1 className="text-[20px] font-extrabold text-gray-900 leading-snug">{event.titleEn || event.title}</h1>

          {/* Quick Info Row */}
          <div className="flex flex-col gap-2.5 mt-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarDays size={15} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">{event.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Clock size={15} className="text-orange-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">{event.timeEn || event.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Globe size={15} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">
                  {event.locationScope === 'ALL' || event.isAllLocations || !event.city || event.city === 'ALL' || event.city === 'All Locations'
                    ? 'All Locations (सभी स्थान)'
                    : `City: ${event.city}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <MapPin size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">{event.venueEn || event.venue}</p>
              </div>
            </div>

            {event.entryFee && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Star size={15} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">Entry: {event.entryFee}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Participation Stats ─── */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <p className="text-[20px] font-black text-brand-primary leading-none">{(event.interested !== undefined ? event.interested : 0)}+</p>
            <p className="text-[10px] text-gray-500 font-bold mt-1.5">Interested</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <p className="text-[20px] font-black text-emerald-600 leading-none">{event.attendees}+</p>
            <p className="text-[10px] text-gray-500 font-bold mt-1.5">Attending</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <p className="text-[20px] font-black text-orange-500 leading-none">{getDaysLeft()}</p>
            <p className="text-[10px] text-gray-500 font-bold mt-1.5">Days Left</p>
          </div>
        </div>
      </div>

      {/* ─── About Event ─── */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <h3 className="text-[15px] font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            📋 About the Event
          </h3>
          <p className="text-[13px] text-gray-600 leading-relaxed">{event.descriptionEn || event.description}</p>

          <div className="mt-4 space-y-3.5 border-t border-gray-100 pt-4">
            {event.objectiveEn && (
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                <div className="flex-1">
                  <h4 className="text-[12.5px] font-extrabold text-gray-900">Objective</h4>
                  <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{event.objectiveEn}</p>
                </div>
              </div>
            )}

            {event.programsEn && event.programsEn.length > 0 && (
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                <div className="flex-1">
                  <h4 className="text-[12.5px] font-extrabold text-gray-900">Programs</h4>
                  <div className="grid grid-cols-1 gap-1 mt-1.5 pl-0.5">
                    {event.programsEn.map((prog, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[12px] text-gray-600">
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        <span>{prog}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {event.audienceEn && (
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                <div className="flex-1">
                  <h4 className="text-[12.5px] font-extrabold text-gray-900">Target Audience</h4>
                  <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{event.audienceEn}</p>
                </div>
              </div>
            )}

            {event.importantInfoEn && (
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                <div className="flex-1">
                  <h4 className="text-[12.5px] font-extrabold text-gray-900">Important Information</h4>
                  <p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed">{event.importantInfoEn}</p>
                </div>
              </div>
            )}
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 border-t border-gray-50 pt-3">
              {event.tags.map((tag, i) => (
                <span key={i} className="text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Organizer ─── */}
      {event.organizer && (
        <div className="px-4 pt-3">
          <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
            <h3 className="text-[15px] font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              👤 Organizer
            </h3>
            <div className="flex items-center gap-3">
              <Avatar initials={event.organizer.initials} size="lg" color="bg-brand-primary/10 text-brand-primary border-2 border-brand-primary/20" />
              <div className="flex-1">
                <h4 className="text-[14px] font-bold text-gray-900">{event.organizer.name}</h4>
                <p className="text-[12px] text-gray-500 font-medium">{event.organizer.role}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.open(`tel:${event.contact || '9876543210'}`)}
                  className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center active:scale-90 transition-transform border border-blue-100"
                >
                  <Phone size={15} className="text-blue-600" />
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/${(event.contact || '9876543210').replace(/[^0-9]/g, '')}`)}
                  className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center active:scale-90 transition-transform border border-emerald-100"
                >
                  <MessageCircle size={15} className="text-emerald-600" />
                </button>
              </div>
            </div>
            {event.contact && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-[12px] text-gray-500 flex items-center gap-2">
                  <Phone size={12} className="text-gray-400" />
                  Contact: <span className="font-bold text-gray-700">{event.contact}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Attendees ─── */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-[20px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-extrabold text-gray-900 flex items-center gap-2">
              👥 Attendees
            </h3>
            <span 
              onClick={() => setShowAttendeesModal(true)}
              className="text-[12px] text-brand-primary font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              View All <ChevronRight size={14} />
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1" ref={attendeesRef}>
            {(event.attendeeProfiles || []).map((a, i) => (
              <div key={i} className="shrink-0 flex flex-col items-center w-[56px]">
                <Avatar imageUrl={a.avatar} initials={a.initials} size="md" />
                <p className="text-[10px] text-gray-500 font-medium mt-1.5 truncate w-full text-center">{a.name}</p>
              </div>
            ))}
            {event.attendees > (event.attendeeProfiles || []).length && (
              <div className="shrink-0 flex flex-col items-center justify-center w-[56px]">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500">
                  +{event.attendees - (event.attendeeProfiles || []).length}
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1.5">More</p>
              </div>
            )}
          </div>

          {/* Stacked Avatars Preview */}
          {(event.attendeeProfiles || []).length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
              <div className="flex -space-x-2">
                {(event.attendeeProfiles || []).slice(0, 4).map((a, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 border-2 border-white flex items-center justify-center text-[8px] font-bold text-brand-primary overflow-hidden">
                    {a.avatar ? <img src={a.avatar} alt="" className="w-full h-full object-cover" /> : a.initials}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">
                <span className="font-bold text-gray-700">{event.attendeeProfiles[0].name}</span>
                {event.attendees > 1 && (
                  <> and <span className="font-bold text-gray-700">{event.attendees - 1} others</span></>
                )} are attending
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Location Map Placeholder ─── */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <div className="p-5 pb-3">
            <h3 className="text-[15px] font-extrabold text-gray-900 flex items-center gap-2">
              📍 Location
            </h3>
          </div>
          <div className="h-[140px] bg-gradient-to-br from-blue-50 to-emerald-50 mx-4 mb-3 rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              {/* Map grid pattern */}
              <div className="w-full h-full" style={{
                backgroundImage: 'linear-gradient(to right, #9ca3af 1px, transparent 1px), linear-gradient(to bottom, #9ca3af 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 mb-2">
                <MapPin size={20} className="text-white" fill="currentColor" />
              </div>
              <p className="text-[11px] text-gray-600 font-bold text-center px-4">{event.venueEn || event.venue}</p>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(event.venueEn || event.venue)}`, '_blank')}
            className="w-full py-3 text-[12px] font-bold text-blue-600 flex items-center justify-center gap-1 border-t border-gray-50 active:bg-gray-50"
          >
            <ExternalLink size={13} /> Open in Google Maps
          </button>
        </div>
      </div>

      {/* ─── Bottom CTA ─── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 p-4 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex gap-3">
          {/* Interest Button */}
          <button
            onClick={handleInterestToggle}
            className={`flex-1 py-3 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              isInterested
                ? 'bg-pink-50 text-pink-600 border-pink-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <Heart size={16} fill={isInterested ? 'currentColor' : 'none'} />
            {isInterested ? 'Interested' : 'Interested?'}
          </button>

          {/* Register/RSVP Button */}
          <button
            onClick={handleRSVPToggle}
            className={`flex-[1.5] py-3 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
              isRegistered
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-brand-primary text-white shadow-brand-primary/20'
            }`}
          >
            {isRegistered ? (
              <><CheckCircle size={16} /> Attending</>
            ) : (
              <>Join</>
            )}
          </button>
        </div>
      </div>

      {/* ─── SHARE TOAST POPUP ─── */}
      {showShareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[12px] font-bold shadow-lg animate-fade-in flex items-center gap-1.5">
          <CheckCircle size={14} className="text-emerald-400" /> Link copied to clipboard!
        </div>
      )}

      {/* ─── ATTENDEES LIST MODAL ─── */}
      {showAttendeesModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center animate-fade-in" onClick={() => setShowAttendeesModal(false)}>
          <div className="bg-white rounded-t-[28px] max-w-lg w-full h-[60vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 shrink-0" />
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h3 className="text-[15.5px] font-black text-gray-900">Attendees</h3>
              <button 
                onClick={() => setShowAttendeesModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-5">
              {(event.attendeeProfiles || []).map((a, idx) => (
                <div key={idx} className="py-3.5 flex items-center gap-3">
                  <Avatar imageUrl={a.avatar} initials={a.initials} size="md" />
                  <div>
                    <h4 className="text-[13.5px] font-bold text-gray-900">{a.name}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Community Member</p>
                  </div>
                </div>
              ))}
              {(event.attendeeProfiles || []).length === 0 && (
                <div className="text-center py-16">
                  <p className="text-sm font-semibold text-gray-400">No attendees yet. Be the first to join!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventDetailPage;
