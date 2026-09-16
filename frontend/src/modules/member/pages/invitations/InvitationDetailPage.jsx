import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Share2, MapPin, Calendar, Clock, Heart, Users, Check, X, 
  Phone, Search, UserCheck, Mail, Edit3, Trash2, Ban, AlertOctagon, 
  ExternalLink, Copy, CheckCircle2, MessageCircle, Utensils, Music,
  CalendarPlus, User, Loader2, Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';
import { extractId, isInvitationCreator } from './utils/invitationAnalytics';
import CancelInvitationModal from './components/CancelInvitationModal';
import DeleteInvitationModal from './components/DeleteInvitationModal';
import invitationService from '../../../../core/api/invitationService';

export default function InvitationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    invitations, currentUser, members, updateInvitationRSVP, trackInvitationOpened, 
    addNotification, groups, addInvitesToInvitation, invitationFormConfig,
    deleteInvitation, cancelInvitation 
  } = useData();
  
  // Local state for invitation data, allowing direct URL loading or cached sync
  const [inv, setInv] = useState(() => invitations.find(i => String(i.id || i._id) === String(id)) || null);
  const [loading, setLoading] = useState(!inv);
  const [fetchError, setFetchError] = useState(null);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [creatorRsvpTab, setCreatorRsvpTab] = useState('attending');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isSubmittingRSVP, setIsSubmittingRSVP] = useState(false);

  // Modals for Cancel & Delete
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Directory States for inviting more members later
  const [invitedMemberIds, setInvitedMemberIds] = useState([]);
  const [invitedGroupIds, setInvitedGroupIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('members');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedProfileMember, setSelectedProfileMember] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // 1. Fetch fresh invitation details from API
  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    // If we don't have inv yet, set loading to true
    if (!inv) setLoading(true);

    invitationService.getInvitationById(id)
      .then(data => {
        if (isMounted && data) {
          setInv(data);
          setFetchError(null);
        }
      })
      .catch(err => {
        console.error('Failed to load invitation by ID:', err);
        if (isMounted && !inv) {
          setFetchError(err.response?.data?.message || 'Unable to load invitation details');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Sync if invitations in context changes and matches ID
  useEffect(() => {
    const matched = invitations.find(i => String(i.id || i._id) === String(id));
    if (matched && (!inv || matched.updatedAt !== inv.updatedAt)) {
      setInv(matched);
    }
  }, [invitations, id]);

  // 2. Track view for the creator analytics
  useEffect(() => {
    if (id && trackInvitationOpened) {
      trackInvitationOpened(id);
    }
  }, [id, trackInvitationOpened]);

  // 3. Initialize directory states if invitation exists
  useEffect(() => {
    if (inv) {
      setInvitedMemberIds(inv.invitedMemberIds?.map(m => typeof m === 'object' ? (m._id || m.id) : m) || []);
      setInvitedGroupIds(inv.invitedGroupIds || []);
    }
  }, [inv]);

  // 4. Safe local date parser
  const parseEventDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const str = String(dateStr).trim();
    
    // YYYY-MM-DD
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  // 5. Countdown timer logic
  useEffect(() => {
    if (!inv?.date) return;

    const eventDate = parseEventDate(inv.date) || new Date(inv.date);
    eventDate.setHours(12, 0, 0, 0); // Midday default

    const calculateTime = () => {
      const now = new Date().getTime();
      const distance = eventDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          isPast: false
        });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [inv?.date]);

  // Current user's RSVP status
  const currentUserIdStr = String(currentUser?.id || currentUser?._id || '');
  const currentRSVP = useMemo(() => {
    if (!inv?.rsvps) return null;
    return (inv.rsvps || []).find(r => extractId(r.memberId) === currentUserIdStr)?.status || null;
  }, [inv?.rsvps, currentUserIdStr]);

  useEffect(() => {
    setSelectedStatus(currentRSVP || null);
  }, [currentRSVP]);

  // Handle RSVP status selection & direct submit
  const handleRSVP = async (status) => {
    setSelectedStatus(status);
    setIsSubmittingRSVP(true);
    try {
      if (updateInvitationRSVP) {
        await updateInvitationRSVP(inv._id || inv.id, status);
      } else {
        const res = await invitationService.updateRSVP(inv._id || inv.id, status);
        if (res) setInv(res);
      }
      showToast('RSVP response recorded successfully! 🎉', 'success');
    } catch (err) {
      console.error('Failed to submit RSVP:', err);
      showToast('Failed to submit RSVP. Please try again.', 'error');
    } finally {
      setIsSubmittingRSVP(false);
    }
  };

  // Normalized RSVP list for creator analytics
  const rsvpMembers = useMemo(() => {
    if (!inv?.rsvps) return [];
    return (inv.rsvps || []).map(r => {
      const memberId = extractId(r.memberId);
      const m = members.find(mem => String(mem.id || mem._id) === memberId);
      const embedded = typeof r.memberId === 'object' ? r.memberId : null;
      if (!m && !embedded) return null;
      const merged = { ...(embedded || {}), ...(m || {}), id: memberId, status: r.status };
      merged.initials = merged.initials || (merged.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return merged;
    }).filter(Boolean);
  }, [inv?.rsvps, members]);

  const attendingList = rsvpMembers.filter(m => m.status === 'attending');
  const familyList = rsvpMembers.filter(m => m.status === 'attending_family');
  const declinedList = rsvpMembers.filter(m => m.status === 'not_attending');
  const totalAttendingGuests = attendingList.length + familyList.length;

  const isCreator = isInvitationCreator(inv, currentUser);
  const canManage = isCreator || ['head', 'admin', 'head_admin', 'super_admin', 'master_admin'].includes((currentUser?.role || '').toLowerCase());
  const isCancelled = inv?.status === 'Cancelled' || inv?.isCancelled;

  const handleCancelInvitation = async (reason) => {
    try {
      if (cancelInvitation) {
        await cancelInvitation(inv._id || inv.id, reason);
      } else {
        await invitationService.cancelInvitation(inv._id || inv.id, reason);
      }
      setInv(prev => ({ ...prev, status: 'Cancelled', isCancelled: true, cancellationReason: reason }));
      showToast('Invitation cancelled successfully. All invitees have been notified.', 'success');
    } catch (err) {
      showToast('Failed to cancel invitation', 'error');
    }
  };

  const handleDeleteInvitation = async () => {
    try {
      if (deleteInvitation) {
        await deleteInvitation(inv._id || inv.id);
      } else {
        await invitationService.deleteInvitation(inv._id || inv.id);
      }
      showToast('Invitation deleted for everyone.', 'success');
      navigate('/member/invitations');
    } catch (err) {
      showToast('Failed to delete invitation', 'error');
    }
  };

  const handleShare = async () => {
    const title = inv?.title || 'Ceremony Invitation';
    const text = `You are cordially invited to ${title}. Please check the details & RSVP here:`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.log('Share dismissed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast('Invitation link copied to clipboard! 📋', 'success');
      } catch (e) {
        showToast('Link copied: ' + url, 'info');
      }
    }
  };

  // Google Calendar Link generator
  const getGoogleCalendarUrl = () => {
    if (!inv?.date) return '#';
    const eventDate = parseEventDate(inv.date) || new Date(inv.date);
    const dateStr = eventDate.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 8);
    const title = encodeURIComponent(inv.title || 'Ceremony Invitation');
    const details = encodeURIComponent(inv.message || 'Invitation from Samaj Member');
    const location = encodeURIComponent(inv.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}T043000Z/${dateStr}T173000Z&details=${details}&location=${location}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-4 animate-pulse shadow-sm">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">Loading Invitation Details...</h3>
        <p className="text-xs text-slate-500 mt-1">Fetching event schedule, venue, and host details</p>
      </div>
    );
  }

  // Error state
  if (!inv || fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <AlertOctagon size={32} />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">Invitation Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{fetchError || 'This invitation may have been removed or is unavailable.'}</p>
        <div className="flex gap-2 mt-5">
          <button 
            onClick={() => navigate('/member/invitations')} 
            className="px-5 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors"
          >
            Go Back to Hub
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="px-5 py-2.5 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayTitle = inv.title || (inv.groomName && inv.brideName ? `Wedding of ${inv.groomName} & ${inv.brideName}` : 'Ceremony Invitation');
  const displayHost = inv.hostName || inv.familyName || inv.creatorId?.name || 'Samaj Host';
  const images = inv.images || (inv.image ? [inv.image] : []);
  const eventDateObj = parseEventDate(inv.date) || new Date(inv.date);
  const formattedEventDate = !isNaN(eventDateObj?.getTime()) 
    ? eventDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : String(inv.date);

  // Collect all available program and ceremony times
  const scheduleItems = [];
  if (inv.timeProgram) {
    scheduleItems.push({ label: 'Program / Ceremony Time', hindiLabel: 'मुख्य कार्यक्रम समय', value: inv.timeProgram, icon: Clock, color: 'text-indigo-600 bg-indigo-50' });
  }
  if (inv.timeFood) {
    scheduleItems.push({ label: 'Feast / Bhoj / Mahaprasad', hindiLabel: 'भोजन / महाप्रसाद समय', value: inv.timeFood, icon: Utensils, color: 'text-emerald-600 bg-emerald-50' });
  }
  if (inv.timeBaraat) {
    scheduleItems.push({ label: 'Baraat / Shobha Yatra', hindiLabel: 'बारात / शोभा यात्रा समय', value: inv.timeBaraat, icon: Music, color: 'text-purple-600 bg-purple-50' });
  }
  if (inv.timePhere) {
    scheduleItems.push({ label: 'Phere / Lagna Vidhi', hindiLabel: 'फेरे / पाणिग्रहण संस्कार', value: inv.timePhere, icon: Heart, color: 'text-rose-600 bg-rose-50' });
  }
  if (inv.timeOther) {
    scheduleItems.push({ label: 'Other Event Schedule', hindiLabel: 'अन्य विशेष समय', value: inv.timeOther, icon: Clock, color: 'text-amber-600 bg-amber-50' });
  }

  // Directory tabs for active event
  const directoryTabs = [
    { id: 'members', label: 'Members', enabled: invitationFormConfig?.enableMembersTab !== false },
    { id: 'presidents', label: 'Presidents', enabled: invitationFormConfig?.enablePresidentsTab !== false },
    { id: 'groups', label: 'Groups', enabled: invitationFormConfig?.enableGroupsTab !== false },
    { id: 'friends', label: 'Friends', enabled: invitationFormConfig?.enableFriendsTab !== false }
  ].filter(t => t.enabled);

  const canShowDirectory = !timeLeft.isPast && !isCancelled && directoryTabs.length > 0;

  // Directory filter logic
  const getCommunitySurname = (community) => {
    if (!community) return 'Agrawal';
    if (community.includes('Mali')) return 'Mali';
    if (community.includes('Gupta')) return 'Gupta';
    if (community.includes('Sharma')) return 'Sharma';
    if (community.includes('Jain')) return 'Jain';
    if (community.includes('Patel')) return 'Patel';
    if (community.includes('Verma')) return 'Verma';
    return 'Agrawal';
  };
  const activeSurname = currentUser ? getCommunitySurname(currentUser.community) : 'Agrawal';

  const presidents = [
    { id: 'pres_main', name: `Shri Mohan Lal ${activeSurname}`, role: 'Main Samaj President (मुख्य अध्यक्ष)', city: 'Indore', initials: 'ML', isPresident: true },
    { id: 'pres_indore', name: `Shri Mohan Lal ${activeSurname}`, role: 'Indore President (इंदौर अध्यक्ष)', city: 'Indore', initials: 'ML', isPresident: true },
    { id: 'pres_jaipur', name: `Smt. Kamla ${activeSurname}`, role: 'Jaipur President (जयपुर अध्यक्ष)', city: 'Jaipur', initials: 'KA', isPresident: true },
    { id: 'pres_bhopal', name: `Shri Kailash ${activeSurname}`, role: 'Bhopal President (भोपाल अध्यक्ष)', city: 'Bhopal', initials: 'KA', isPresident: true },
    { id: 'pres_ujjain', name: `Shri Ghanshyam ${activeSurname}`, role: 'Ujjain President (उज्जैन अध्यक्ष)', city: 'Ujjain', initials: 'GA', isPresident: true },
    { id: 'pres_gwalior', name: `Shri Omprakash ${activeSurname}`, role: 'Gwalior President (ग्वालियर अध्यक्ष)', city: 'Gwalior', initials: 'OA', isPresident: true },
  ];
  const friends = members.filter(m => currentUser?.followingList?.includes(m.id || m._id) || m.isVerified);

  const filteredMembers = members.filter(member => {
    if (String(member.id || member._id) === String(currentUser?.id || currentUser?._id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return member.name?.toLowerCase().includes(q) || member.profession?.toLowerCase().includes(q) || member.city?.toLowerCase().includes(q);
    }
    if (selectedCity !== 'All' && member.city !== selectedCity) return false;
    return true;
  });

  const filteredPresidents = presidents.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    }
    if (selectedCity !== 'All' && p.city !== selectedCity) return false;
    return true;
  });

  const filteredFriends = friends.filter(friend => {
    if (String(friend.id || friend._id) === String(currentUser?.id || currentUser?._id)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return friend.name?.toLowerCase().includes(q) || friend.profession?.toLowerCase().includes(q) || friend.city?.toLowerCase().includes(q);
    }
    if (selectedCity !== 'All' && friend.city !== selectedCity) return false;
    return true;
  });

  const filteredGroups = (groups || []).filter(group => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return group.name?.toLowerCase().includes(q) || group.category?.toLowerCase().includes(q);
    }
    return true;
  });

  const isAllPresidentsInvited = filteredPresidents.length > 0 && filteredPresidents.every(p => invitedMemberIds.includes(p.id));
  const isAllInCityInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id || m._id));
  const isAllMembersInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id || m._id));
  const isAllGroupsInvited = filteredGroups.length > 0 && filteredGroups.every(g => invitedGroupIds.includes(g.id || g._id));
  const isAllFriendsInvited = filteredFriends.length > 0 && filteredFriends.every(f => invitedMemberIds.includes(f.id || f._id));

  const handleToggleInvite = (member) => {
    const memberId = String(member.id || member._id);
    const originalMemberIds = (inv.invitedMemberIds || []).map(m => String(typeof m === 'object' ? (m._id || m.id) : m));
    if (originalMemberIds.includes(memberId)) return;
    
    if (invitedMemberIds.includes(memberId)) {
      setInvitedMemberIds(invitedMemberIds.filter(id => id !== memberId));
    } else {
      setInvitedMemberIds([...invitedMemberIds, memberId]);
    }
  };

  const handleToggleGroupInvite = (group) => {
    const groupId = String(group.id || group._id);
    const originalGroupIds = (inv.invitedGroupIds || []).map(g => String(typeof g === 'object' ? (g._id || g.id) : g));
    if (originalGroupIds.includes(groupId)) return;
    
    if (invitedGroupIds.includes(groupId)) {
      setInvitedGroupIds(invitedGroupIds.filter(id => id !== groupId));
    } else {
      setInvitedGroupIds([...invitedGroupIds, groupId]);
    }
  };

  const handleSaveInvitations = async () => {
    const originalMemberIds = (inv.invitedMemberIds || []).map(m => String(typeof m === 'object' ? (m._id || m.id) : m));
    const newlyInvitedMemberIds = invitedMemberIds.filter(id => !originalMemberIds.includes(id));

    const originalGroupIds = (inv.invitedGroupIds || []).map(g => String(typeof g === 'object' ? (g._id || g.id) : g));
    const newlyInvitedGroupIds = invitedGroupIds.filter(id => !originalGroupIds.includes(id));

    if (newlyInvitedMemberIds.length === 0 && newlyInvitedGroupIds.length === 0) {
      showToast('No new members or groups selected.', 'info');
      return;
    }

    try {
      if (addInvitesToInvitation) {
        await addInvitesToInvitation(inv._id || inv.id, invitedMemberIds, invitedGroupIds);
      }
      showToast('New invitations sent successfully! 💌', 'success');
    } catch (err) {
      showToast('Failed to send invitations', 'error');
    }
  };

  // Google Maps Direct Search URL fallback
  const mapsUrl = inv.mapLink && inv.mapLink.trim().length > 0 
    ? inv.mapLink 
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inv.location || 'Indore')}`;

  const cleanContactPhone = inv.contact ? inv.contact.replace(/\D/g, '') : (inv.creatorId?.phone ? inv.creatorId.phone.replace(/\D/g, '') : '');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Top Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors press-scale"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-[16px] font-black text-slate-800 tracking-tight leading-none">Invitation Details</h1>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mt-0.5">निमंत्रण विवरण</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleShare} 
            className="w-9 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center transition-colors press-scale border border-purple-200/60"
            title="Share Invitation"
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-3.5 sm:p-5 space-y-4 max-w-2xl mx-auto w-full">
        
        {/* Host Controls & Actions Bar (For Organizer / Admins) */}
        {canManage && (
          <div className="bg-gradient-to-r from-[#1F0A47] via-[#2A0E5C] to-[#3B1578] text-white p-4 rounded-3xl shadow-md border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Host Controls (आयोजक विकल्प)</span>
              <h3 className="text-sm font-black text-white mt-0.5">Manage This Invitation</h3>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate(`/member/invitations/edit/${inv._id || inv.id}`)}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all press-scale border border-white/20"
              >
                <Edit3 size={13} /> Edit (बदलाव करें)
              </button>
              {!isCancelled && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500/80 hover:bg-amber-500 backdrop-blur-md text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all press-scale border border-amber-400/30"
                >
                  <Ban size={13} /> Cancel Event (रद्द करें)
                </button>
              )}
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 backdrop-blur-md text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all press-scale border border-rose-400/30"
              >
                <Trash2 size={13} /> Delete (हटाएं)
              </button>
            </div>
          </div>
        )}

        {/* Cancellation Notice Banner */}
        {isCancelled && (
          <div className="bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-300 rounded-3xl p-5 shadow-sm space-y-2.5 text-left">
            <div className="flex items-center gap-2.5 text-rose-700">
              <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertOctagon size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-800">EVENT CANCELLED (कार्यक्रम रद्द किया गया)</h3>
                <p className="text-[11px] text-rose-600 font-semibold">This invitation has been officially cancelled by the host.</p>
              </div>
            </div>
            {inv.cancellationReason && (
              <div className="bg-white/90 border border-rose-200 rounded-2xl p-3.5 mt-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Cancellation Reason (रद्द करने का कारण)</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{inv.cancellationReason}</p>
              </div>
            )}
            {inv.cancelledAt && (
              <p className="text-[10.5px] text-rose-600 font-medium">
                Cancelled on: {new Date(inv.cancelledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* Flyer Card / Visual Hero */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200/90 text-left">
          
          {/* Main Visual Media Display */}
          {images.length > 0 ? (
            <div className="relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
              <div 
                className="relative w-full min-h-[280px] max-h-[500px] overflow-hidden flex items-center justify-center group p-2 cursor-zoom-in"
                onClick={() => setFullscreenImg(images[currentImgIndex])}
                title="Click to view full screen image"
              >
                {/* Backdrop Blur effect */}
                <img 
                  src={images[currentImgIndex]} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none" 
                />
                
                {/* Clean Full Uncropped Image */}
                <img 
                  src={images[currentImgIndex]} 
                  alt="Invitation Event Card" 
                  className="relative z-10 max-w-full max-h-[480px] w-auto h-auto object-contain drop-shadow-xl rounded-xl transition-transform duration-300 group-hover:scale-[1.01]" 
                />

                {/* Multiple Images Navigation Controls */}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev - 1 + images.length) % images.length); }} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors text-xl shadow-md border border-white/20"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev + 1) % images.length); }} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors text-xl shadow-md border border-white/20"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                      {images.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'bg-white w-3.5' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <span className="absolute top-3.5 right-3.5 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                  Tap to Zoom 🔍
                </span>
              </div>

              {/* Title & Host Ribbon below Image */}
              <div className="w-full bg-gradient-to-r from-[#1F0A47] to-[#3B1578] text-white p-4 text-center border-t border-purple-900/50">
                <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest block mb-1">
                  Ceremonial Invitation · शुभ निमंत्रण
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                  {displayTitle}
                </h2>
                <p className="text-xs text-purple-200 font-bold mt-1 uppercase tracking-wide">
                  Hosted by: {displayHost}
                </p>
              </div>
            </div>
          ) : (
            /* Royal Traditional Fallback Card */
            <div className="p-8 w-full min-h-[220px] flex flex-col items-center justify-center relative bg-gradient-to-br from-[#1F0A47] via-[#2A0E5C] to-[#3B1578] text-white shadow-inner text-center overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }} />
              
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 text-lg mb-3 shadow-inner">
                ✨
              </div>

              <span className="text-[10.5px] font-black uppercase tracking-[0.25em] text-amber-300 mb-2">
                - Cordially Invited (सादर आमंत्रित) -
              </span>

              {inv.groomName && inv.brideName ? (
                <div className="flex flex-col items-center justify-center gap-1 mb-2 relative z-10">
                  <span className="text-2xl sm:text-3xl font-black text-white">{inv.groomName}</span>
                  <div className="my-1">
                    <Heart size={20} className="text-rose-400 fill-rose-400 animate-pulse" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white">{inv.brideName}</span>
                </div>
              ) : (
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug max-w-[90%] relative z-10 drop-shadow-sm">
                  {displayTitle}
                </h2>
              )}

              <p className="text-xs opacity-90 font-bold mt-2 z-10 uppercase tracking-wider text-purple-200">
                {displayHost}
              </p>
            </div>
          )}

          {/* Live Countdown Timer / Status */}
          <div className="bg-white p-4 sm:p-5 border-t border-slate-100 text-center">
            <h4 className="font-extrabold text-slate-700 text-[12.5px] mb-3 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-purple-600" />
              {isCancelled ? 'Event Status (स्थिति)' : timeLeft.isPast ? 'Event Concluded (सम्पन्न)' : 'Time Remaining (शेष समय)'}
            </h4>

            {isCancelled ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 py-3 px-4 rounded-2xl text-center font-black text-sm flex items-center justify-center gap-2">
                <AlertOctagon size={18} className="text-rose-600 shrink-0" />
                <span>EVENT CANCELLED (रद्द किया गया)</span>
              </div>
            ) : timeLeft.isPast ? (
              <div className="bg-slate-100 border border-slate-200 text-slate-700 py-3 px-4 rounded-2xl text-center font-bold text-xs">
                This event has successfully concluded. Thank you for your blessings.
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                {[
                  { label: 'Days', value: timeLeft.days },
                  { label: 'Hours', value: timeLeft.hours },
                  { label: 'Mins', value: timeLeft.minutes },
                  { label: 'Secs', value: timeLeft.seconds }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-50 to-indigo-50/70 rounded-2xl flex items-center justify-center text-purple-900 font-black text-lg sm:text-xl mb-1 border border-purple-100 shadow-2xs">
                      {String(item.value).padStart(2, '0')}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Core Event Details Section */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-[16px]">Main Event Details</h3>
              <p className="text-[11px] text-slate-500 font-semibold">कार्यक्रम की सम्पूर्ण जानकारी</p>
            </div>
            <a 
              href={getGoogleCalendarUrl()} 
              target="_blank" 
              rel="noreferrer"
              className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl border border-purple-200/70 flex items-center gap-1.5 transition-colors press-scale"
            >
              <CalendarPlus size={13} /> Add to Calendar
            </a>
          </div>

          <div className="space-y-4">
            {/* Event Title */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Event Title (कार्यक्रम का नाम)</p>
              <p className="font-black text-slate-900 text-[15px] mt-0.5">{displayTitle}</p>
            </div>

            {/* Date */}
            <div className="flex items-start gap-3.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Date (दिनांक)</p>
                <p className="font-black text-slate-900 text-[14px] mt-0.5">{formattedEventDate}</p>
              </div>
            </div>

            {/* Complete Schedule Timeline */}
            {scheduleItems.length > 0 && (
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-purple-600" /> Event Schedule & Timings (समय सारणी)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {scheduleItems.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                          <ItemIcon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase leading-none">{item.label}</p>
                          <p className="text-[13px] font-black text-slate-800 leading-tight mt-0.5">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Venue & Location */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <MapPin size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Venue / Address (स्थान व पता)</p>
                  <p className="font-black text-slate-900 text-[14px] mt-0.5 leading-snug">{inv.location || 'Indore, MP'}</p>
                </div>
              </div>

              <a 
                href={mapsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-blue-200/70 press-scale"
              >
                <MapPin size={14} /> View Location on Google Maps (गूगल मैप पर देखें)
              </a>
            </div>

            {/* Host & Organizer Info Card */}
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center border border-purple-200 shrink-0">
                  {(displayHost || 'H').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">Organized By (आयोजक)</p>
                  <h4 className="text-[13.5px] font-black text-slate-900 truncate">{displayHost}</h4>
                  {inv.contact && (
                    <p className="text-[11.5px] font-bold text-slate-600">Ph: {inv.contact}</p>
                  )}
                </div>
              </div>

              {cleanContactPhone && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a 
                    href={`tel:${cleanContactPhone}`}
                    className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors press-scale shadow-sm shadow-emerald-500/20"
                    title="Call Organizer"
                  >
                    <Phone size={15} />
                  </a>
                  <a 
                    href={`https://wa.me/91${cleanContactPhone}?text=Namaste,%20regarding%20invitation%20for%20${encodeURIComponent(displayTitle)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors press-scale shadow-sm"
                    title="WhatsApp Organizer"
                  >
                    <MessageCircle size={15} />
                  </a>
                </div>
              )}
            </div>

            {/* Invitation Message / Blessings Box */}
            {inv.message && (
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 relative overflow-hidden">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-1">
                  Invitation Message (निमंत्रण संदेश)
                </span>
                <p className="text-xs font-bold text-slate-800 leading-relaxed italic">
                  "{inv.message}"
                </p>
              </div>
            )}

            {/* Custom / Additional Fields */}
            {inv.customFields && Object.keys(inv.customFields).length > 0 && (
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Additional Information (अतिरिक्त विवरण)</p>
                <div className="space-y-1.5 pt-1">
                  {Object.entries(inv.customFields).map(([key, val]) => {
                    if (!val) return null;
                    return (
                      <div key={key} className="flex items-start justify-between text-xs py-1 border-b border-slate-200/50 last:border-0">
                        <span className="font-bold text-slate-500 capitalize">{key}:</span>
                        <span className="font-black text-slate-800 text-right">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Direct Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            {cleanContactPhone ? (
              <a 
                href={`tel:${cleanContactPhone}`} 
                className="py-2.5 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-emerald-100 transition-colors border border-emerald-200/60 press-scale"
              >
                <Phone size={14} /> Call Host
              </a>
            ) : (
              <div className="py-2.5 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] opacity-60">
                <Phone size={14} /> Call Host
              </div>
            )}

            <a 
              href={mapsUrl} 
              target="_blank" 
              rel="noreferrer"
              className="py-2.5 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-blue-100 transition-colors border border-blue-200/60 press-scale"
            >
              <MapPin size={14} /> Directions
            </a>

            <button 
              onClick={handleShare} 
              className="py-2.5 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-purple-100 transition-colors border border-purple-200/60 press-scale"
            >
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* RSVP Section */}
        {isCreator ? (
          /* Creator Analytics & Responses View */
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/90 text-left">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-[15px]">RSVP Dashboard</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Track responses from invited members</p>
              </div>
              <span className="text-[11px] bg-purple-50 text-purple-700 font-extrabold px-2.5 py-1 rounded-xl border border-purple-100">
                Creator View
              </span>
            </div>

            {/* Metric Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('attending')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'attending'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black">{attendingList.length}</span>
                <span className="text-[10.5px] font-bold text-center whitespace-nowrap mt-0.5">Attending</span>
              </button>

              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('attending_family')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'attending_family'
                    ? 'border-purple-600 bg-purple-50/50 text-purple-700 shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black">{familyList.length}</span>
                <span className="text-[10.5px] font-bold text-center whitespace-nowrap mt-0.5">With Family</span>
              </button>

              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('not_attending')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'not_attending'
                    ? 'border-slate-600 bg-slate-100 text-slate-800 shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black">{declinedList.length}</span>
                <span className="text-[10.5px] font-bold text-center whitespace-nowrap mt-0.5">Declined</span>
              </button>
            </div>

            {/* Responses List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {creatorRsvpTab === 'attending' && (
                attendingList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No members confirmed individual attendance yet.
                  </div>
                ) : (
                  attendingList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-100 rounded-xl hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession || 'Member'} • {member.city || 'Indore'}</p>
                        </div>
                      </div>
                      {member.phone && (
                        <a 
                          href={`tel:${member.phone}`}
                          className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors press-scale"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  ))
                )
              )}

              {creatorRsvpTab === 'attending_family' && (
                familyList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No members confirmed family attendance yet.
                  </div>
                ) : (
                  familyList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-100 rounded-xl hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession || 'Member'} • {member.city || 'Indore'}</p>
                        </div>
                      </div>
                      {member.phone && (
                        <a 
                          href={`tel:${member.phone}`}
                          className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors press-scale"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  ))
                )
              )}

              {creatorRsvpTab === 'not_attending' && (
                declinedList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No members declined yet.
                  </div>
                ) : (
                  declinedList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-100 rounded-xl hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession || 'Member'} • {member.city || 'Indore'}</p>
                        </div>
                      </div>
                      {member.phone && (
                        <a 
                          href={`tel:${member.phone}`}
                          className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors press-scale"
                        >
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        ) : (
          /* Recipient RSVP Card */
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/90 text-left">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-[15px]">RSVP (आपकी उपस्थिति)</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Please confirm your attendance with the host</p>
              </div>
              {selectedStatus && (
                <span className="text-[10.5px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                  Response Recorded ✓
                </span>
              )}
            </div>

            {isCancelled ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-1.5">
                <AlertOctagon size={24} className="text-rose-600 mx-auto" />
                <p className="text-xs font-black text-rose-800">Event Cancelled by Organizer (कार्यक्रम रद्द)</p>
                <p className="text-[11.5px] text-rose-600 font-medium">RSVP responses are closed for this event.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button 
                  onClick={() => handleRSVP('attending')}
                  disabled={isSubmittingRSVP}
                  className={`w-full py-3.5 rounded-2xl font-black text-[13.5px] flex items-center justify-center gap-2 transition-all border-2 press-scale ${
                    selectedStatus === 'attending' 
                      ? 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                      : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'
                  }`}
                >
                  <Check size={16} strokeWidth={3} />
                  <span>I am Attending (उपस्थित रहूंगा)</span>
                </button>

                <div className="flex gap-2.5">
                  <button 
                    onClick={() => handleRSVP('attending_family')}
                    disabled={isSubmittingRSVP}
                    className={`flex-1 py-3 rounded-2xl font-bold text-[12.5px] flex items-center justify-center gap-1.5 transition-all border-2 press-scale ${
                      selectedStatus === 'attending_family' 
                        ? 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                        : 'border-slate-200 bg-white text-slate-700 hover:border-purple-200'
                    }`}
                  >
                    <Users size={15} />
                    <span>With Family (सपरिवार)</span>
                  </button>

                  <button 
                    onClick={() => handleRSVP('not_attending')}
                    disabled={isSubmittingRSVP}
                    className={`flex-1 py-3 rounded-2xl font-bold text-[12.5px] flex items-center justify-center gap-1.5 transition-all border-2 press-scale ${
                      selectedStatus === 'not_attending' 
                        ? 'border-slate-700 bg-slate-800 text-white shadow-md' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <X size={15} strokeWidth={2.5} />
                    <span>Declined (असमर्थ)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Community RSVP Count & Avatars */}
            {rsvpMembers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[12px] font-bold text-slate-600">
                  Total <strong className="text-purple-700">{totalAttendingGuests}</strong> member(s) attending
                </p>
                <div className="flex -space-x-2">
                  {rsvpMembers.slice(0, 4).map((member, i) => (
                    <div key={member.id} className="relative w-7 h-7 rounded-full border-2 border-white shadow-2xs overflow-hidden z-10" style={{ zIndex: 10 - i }}>
                       <Avatar initials={member.initials} size="sm" imageUrl={member.avatar} />
                    </div>
                  ))}
                  {rsvpMembers.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white shadow-2xs flex items-center justify-center text-[9.5px] font-bold text-purple-700 z-0 relative">
                      +{rsvpMembers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite More Members Section (Available prior to event date) */}
        {canShowDirectory && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="font-extrabold text-slate-900 text-[15px]">
                  Invite More Members
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold">Share this ceremonial invitation with more samaj members</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-xl border border-emerald-100">
                Active Event
              </span>
            </div>

            {/* Directory Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-100/70 p-1 rounded-2xl">
              {directoryTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveDirectoryTab(tab.id); setSearchQuery(''); }}
                  className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all text-center ${
                    activeDirectoryTab === tab.id 
                      ? 'bg-white text-purple-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & City Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder={activeDirectoryTab === 'groups' ? "Search groups..." : "Search by name, place..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] outline-none focus:border-purple-600 focus:bg-white transition-all font-medium text-slate-800"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {['members', 'presidents'].includes(activeDirectoryTab) && (
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[12px] font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-100 transition-colors h-full press-scale whitespace-nowrap"
                  >
                    <span>📍 {selectedCity === 'All' ? 'All Cities' : selectedCity}</span>
                    <span className="text-[9px] text-slate-400">▼</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto">
                        <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Select City
                        </div>
                        <button 
                          type="button"
                          onClick={() => { setSelectedCity('All'); setIsDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-[12px] font-bold transition-colors ${selectedCity === 'All' ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          All Cities
                        </button>
                        {Array.from(new Set(members.map(m => m.city).filter(Boolean))).map(city => (
                          <button 
                            key={city}
                            type="button"
                            onClick={() => { setSelectedCity(city); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-bold transition-colors ${selectedCity === city ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Directory Lists */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {activeDirectoryTab === 'members' && filteredMembers.map(member => {
                const memberId = String(member.id || member._id);
                const isInvited = invitedMemberIds.includes(memberId);
                const isOriginalInvited = (inv.invitedMemberIds || []).map(m => String(typeof m === 'object' ? (m._id || m.id) : m)).includes(memberId);
                return (
                  <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50/60 border border-slate-100 rounded-xl hover:bg-white transition-all">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => setSelectedProfileMember(member)}
                    >
                      <Avatar 
                        initials={member.initials || (member.name || 'M').substring(0, 2).toUpperCase()} 
                        size="md" 
                        imageUrl={member.avatar || member.photo || member.profileImage} 
                      />
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                          {member.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{member.profession || 'Member'} • {member.city || 'Indore'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(member)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}

              {activeDirectoryTab === 'presidents' && filteredPresidents.map(president => {
                const presId = String(president.id);
                const isInvited = invitedMemberIds.includes(presId);
                const isOriginalInvited = (inv.invitedMemberIds || []).map(m => String(typeof m === 'object' ? (m._id || m.id) : m)).includes(presId);
                return (
                  <div key={presId} className="flex items-center justify-between p-3 bg-purple-50/30 border border-purple-100/50 rounded-xl hover:bg-white transition-all">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => setSelectedProfileMember(president)}
                    >
                      <div className="relative shrink-0">
                        <Avatar 
                          initials={president.initials || 'PR'} 
                          size="md" 
                        />
                        <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                          {president.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{president.role}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(president)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}

              {activeDirectoryTab === 'groups' && filteredGroups.map(group => {
                const groupId = String(group.id || group._id);
                const isInvited = invitedGroupIds.includes(groupId);
                const isOriginalInvited = (inv.invitedGroupIds || []).map(g => String(typeof g === 'object' ? (g._id || g.id) : g)).includes(groupId);
                return (
                  <div key={groupId} className="flex items-center justify-between p-3 bg-purple-50/30 border border-purple-100/50 rounded-xl hover:bg-white transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs">
                        👥
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">{group.name}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{group.category || 'Samaj Group'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleGroupInvite(group)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite Group'}
                    </button>
                  </div>
                );
              })}

              {activeDirectoryTab === 'friends' && filteredFriends.map(friend => {
                const friendId = String(friend.id || friend._id);
                const isInvited = invitedMemberIds.includes(friendId);
                const isOriginalInvited = (inv.invitedMemberIds || []).map(m => String(typeof m === 'object' ? (m._id || m.id) : m)).includes(friendId);
                return (
                  <div key={friendId} className="flex items-center justify-between p-3 bg-pink-50/20 border border-pink-100/40 rounded-xl hover:bg-white transition-all">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => setSelectedProfileMember(friend)}
                    >
                      <Avatar 
                        initials={friend.initials || (friend.name || 'F').substring(0, 2).toUpperCase()} 
                        size="md" 
                        imageUrl={friend.avatar || friend.photo} 
                      />
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                          {friend.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{friend.profession || 'Friend'} • {friend.city || 'Indore'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(friend)}
                      className={`px-3.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-sm' 
                          : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Save & Broadcast Invitations */}
            <button 
              type="button"
              onClick={handleSaveInvitations}
              className="w-full bg-slate-900 hover:bg-black text-white font-extrabold text-[13px] py-3.5 rounded-2xl shadow-md transition-all press-scale flex items-center justify-center gap-1.5"
            >
              <Check size={16} strokeWidth={3} /> Send Invitations (निमंत्रण भेजें)
            </button>
          </div>
        )}

      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-white text-[12px] font-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-slate-900 shadow-slate-900/30'
        }`}>
          <CheckCircle2 size={15} strokeWidth={2.5} className="shrink-0 text-white" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Member Profile Quick Modal */}
      {selectedProfileMember && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProfileMember(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-purple-100 text-center animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProfileMember(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <Avatar 
                  initials={selectedProfileMember.initials || (selectedProfileMember.name || 'M').substring(0, 2).toUpperCase()} 
                  size="xl" 
                  imageUrl={selectedProfileMember.avatar || selectedProfileMember.photo || selectedProfileMember.profileImage} 
                />
                {selectedProfileMember.isPresident && (
                  <span className="absolute -top-1 -right-1 text-lg">👑</span>
                )}
              </div>

              <h3 className="text-[17px] font-black text-slate-900 leading-tight">
                {selectedProfileMember.name}
              </h3>
              
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 mt-2">
                {selectedProfileMember.role || selectedProfileMember.profession || 'Samaj Member'}
              </span>

              <div className="w-full mt-4 space-y-2 text-left border-t border-slate-100 pt-3 text-xs text-slate-700">
                {selectedProfileMember.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-purple-600 shrink-0" />
                    <span><strong>City:</strong> {selectedProfileMember.city}</span>
                  </div>
                )}
                {selectedProfileMember.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-emerald-600 shrink-0" />
                    <span><strong>Phone:</strong> {selectedProfileMember.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full mt-5">
                {selectedProfileMember.phone && (
                  <a 
                    href={`tel:${selectedProfileMember.phone}`}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all press-scale"
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
                <button
                  onClick={() => setSelectedProfileMember(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all press-scale"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {fullscreenImg && (
        <div 
          onClick={() => setFullscreenImg(null)}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            onClick={() => setFullscreenImg(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={fullscreenImg}
            alt="Full Invitation Card"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Cancel Invitation Modal */}
      <CancelInvitationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        invitation={inv}
        onConfirm={handleCancelInvitation}
      />

      {/* Delete Invitation Modal */}
      <DeleteInvitationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        invitation={inv}
        onConfirm={handleDeleteInvitation}
      />
    </div>
  );
}
