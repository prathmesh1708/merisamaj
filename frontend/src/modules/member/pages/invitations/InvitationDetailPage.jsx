import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, MapPin, Calendar, Clock, Heart, Users, Check, X, Phone, Search, UserCheck, Mail } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';
import { extractId, isInvitationCreator } from './utils/invitationAnalytics';

export default function InvitationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invitations, currentUser, members, updateInvitationRSVP, trackInvitationOpened, addNotification, groups, addInvitesToInvitation, invitationFormConfig } = useData();
  
  const inv = invitations.find(i => String(i.id || i._id) === String(id));
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [creatorRsvpTab, setCreatorRsvpTab] = useState('attending');
  const [selectedStatus, setSelectedStatus] = useState(null);

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

  // Initialize directory states if invitation exists
  useEffect(() => {
    if (inv) {
      setInvitedMemberIds(inv.invitedMemberIds || []);
      setInvitedGroupIds(inv.invitedGroupIds || []);
    }
  }, [inv]);

  // Register the view so the creator sees this member under "Who Opened"
  useEffect(() => {
    if (id) trackInvitationOpened?.(id);
  }, [id]);

  useEffect(() => {
    if (!inv) return;

    const eventDate = new Date(inv.date);
    eventDate.setHours(12, 0, 0, 0); // Approx time

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = eventDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [inv]);

  if (!inv) return <div className="p-10 text-center">Invitation not found.</div>;

  // rsvps[].memberId arrives populated (an object) from the API, so compare on the id
  const currentUserIdStr = String(currentUser?.id || currentUser?._id || '');
  const currentRSVP = (inv.rsvps || []).find(r => extractId(r.memberId) === currentUserIdStr)?.status;

  useEffect(() => {
    setSelectedStatus(currentRSVP || null);
  }, [currentRSVP]);

  const handleRSVP = (status) => {
    setSelectedStatus(status);
  };

  const handleSubmitRSVP = () => {
    if (selectedStatus) {
      updateInvitationRSVP(inv._id || inv.id, selectedStatus);
      showToast('RSVP response submitted successfully!', 'success');
    }
  };

  const rsvpMembers = (inv.rsvps || []).map(r => {
    const memberId = extractId(r.memberId);
    const m = members.find(mem => String(mem.id) === memberId);
    const embedded = typeof r.memberId === 'object' ? r.memberId : null;
    if (!m && !embedded) return null;
    const merged = { ...(embedded || {}), ...(m || {}), id: memberId, status: r.status };
    merged.initials = merged.initials || (merged.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return merged;
  }).filter(Boolean);

  const attendingList = rsvpMembers.filter(m => m.status === 'attending');
  const familyList = rsvpMembers.filter(m => m.status === 'attending_family');
  const declinedList = rsvpMembers.filter(m => m.status === 'not_attending');
  const isCreator = isInvitationCreator(inv, currentUser);

  const displayTitle = inv.title || `Wedding of ${inv.groomName} & ${inv.brideName}`;
  const displayHost = inv.hostName || inv.familyName;
  const images = inv.images || (inv.image ? [inv.image] : []);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayTitle} - Invitation`,
          text: 'You are cordially invited.',
          url: window.location.href,
        });
      } else {
        alert('Sharing is not supported on this browser.');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  // Check event expiry logic (based on event date & time)
  const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 12, minutes: 0 };
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.endsWith('PM');
    const isAM = clean.endsWith('AM');
    let timeOnly = clean.replace('AM', '').replace('PM', '').trim();
    const parts = timeOnly.split(':');
    let hours = parseInt(parts[0], 10);
    let minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    
    return { hours, minutes };
  };

  const checkIsFutureEvent = () => {
    try {
      const eventDate = new Date(inv.date);
      const timeInfo = parseTime(inv.timeProgram || inv.timeFood || inv.timeBaraat || '12:00 PM');
      eventDate.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
      return eventDate.getTime() > Date.now();
    } catch (e) {
      return true;
    }
  };

  const isFutureEvent = checkIsFutureEvent();
  const canInviteMore = isFutureEvent;

  const directoryTabs = [
    { id: 'members', label: 'Members', enabled: invitationFormConfig?.enableMembersTab !== false },
    { id: 'presidents', label: 'Presidents', enabled: invitationFormConfig?.enablePresidentsTab !== false },
    { id: 'groups', label: 'Groups', enabled: invitationFormConfig?.enableGroupsTab !== false },
    { id: 'friends', label: 'Friends', enabled: invitationFormConfig?.enableFriendsTab !== false }
  ].filter(t => t.enabled);

  useEffect(() => {
    if (directoryTabs.length > 0 && !directoryTabs.map(t => t.id).includes(activeDirectoryTab)) {
      setActiveDirectoryTab(directoryTabs[0].id);
    }
  }, [invitationFormConfig, activeDirectoryTab]);

  const canShowDirectory = canInviteMore && directoryTabs.length > 0;

  const isFieldEnabled = (fieldId) => {
    const field = invitationFormConfig?.formFields?.find(f => f.id === fieldId);
    return field ? field.enabled !== false : true;
  };

  // Build schedule list dynamically based on availability
  const hasGroomBride = inv.groomName && inv.brideName && !inv.title;
  const scheduleItems = [];
  if (hasGroomBride) {
    if (inv.timeFood && isFieldEnabled('timeFood')) scheduleItems.push({ label: 'Reception', value: inv.timeFood });
    if (inv.timeBaraat && isFieldEnabled('timeProgram')) scheduleItems.push({ label: 'Baraat', value: inv.timeBaraat });
    if (inv.timePhere && isFieldEnabled('timeProgram')) scheduleItems.push({ label: 'Phere', value: inv.timePhere });
  } else {
    if (inv.timeFood && isFieldEnabled('timeFood')) scheduleItems.push({ label: 'Feast Time', value: inv.timeFood });
    if ((inv.timeProgram || inv.timeBaraat) && isFieldEnabled('timeProgram')) scheduleItems.push({ label: 'Program Time', value: inv.timeProgram || inv.timeBaraat });
    if ((inv.timeOther || inv.timePhere) && isFieldEnabled('timeProgram')) scheduleItems.push({ label: 'Other Time', value: inv.timeOther || inv.timePhere });
  }

  // --- Directory definitions for invite more ---
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

  const mainPresident = {
    id: 'pres_main',
    name: `Shri Mohan Lal ${activeSurname}`,
    role: 'Main Samaj President (मुख्य समाज अध्यक्ष)',
    city: 'Indore',
    initials: 'ML',
    isPresident: true
  };

  const cityPresidents = [
    { id: 'pres_indore', name: `Shri Mohan Lal ${activeSurname}`, role: 'Indore President (इंदौर अध्यक्ष)', city: 'Indore', initials: 'ML', isPresident: true },
    { id: 'pres_jaipur', name: `Smt. Kamla ${activeSurname}`, role: 'Jaipur President (जयपुर अध्यक्ष)', city: 'Jaipur', initials: 'KA', isPresident: true },
    { id: 'pres_bhopal', name: `Shri Kailash ${activeSurname}`, role: 'Bhopal President (भोपाल अध्यक्ष)', city: 'Bhopal', initials: 'KA', isPresident: true },
    { id: 'pres_ujjain', name: `Shri Ghanshyam ${activeSurname}`, role: 'Ujjain President (उज्जैन अध्यक्ष)', city: 'Ujjain', initials: 'GA', isPresident: true },
    { id: 'pres_gwalior', name: `Shri Omprakash ${activeSurname}`, role: 'Gwalior President (ग्वालियर अध्यक्ष)', city: 'Gwalior', initials: 'OA', isPresident: true },
  ];

  const presidents = [mainPresident, ...cityPresidents];
  const friends = members.filter(m => currentUser.followingList?.includes(m.id) || m.isVerified);

  // Filter lists based on tab, search, and city
  const filteredMembers = members.filter(member => {
    if (member.id === currentUser?.id) return false;
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
    if (friend.id === currentUser?.id) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return friend.name?.toLowerCase().includes(q) || friend.profession?.toLowerCase().includes(q) || friend.city?.toLowerCase().includes(q);
    }
    if (selectedCity !== 'All' && friend.city !== selectedCity) return false;
    return true;
  });

  const filteredGroups = groups.filter(group => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return group.name?.toLowerCase().includes(q) || group.category?.toLowerCase().includes(q);
    }
    return true;
  });

  // Toggling batch button states (check if all filtered ones are selected)
  const isAllPresidentsInvited = filteredPresidents.length > 0 && filteredPresidents.every(p => invitedMemberIds.includes(p.id));
  const isAllInCityInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id));
  const isAllMembersInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id));
  const isAllGroupsInvited = filteredGroups.length > 0 && filteredGroups.every(g => invitedGroupIds.includes(g.id));
  const isAllFriendsInvited = filteredFriends.length > 0 && filteredFriends.every(f => invitedMemberIds.includes(f.id));

  const handleToggleInvite = (member) => {
    const memberId = member.id;
    const originalMemberIds = inv.invitedMemberIds || [];
    if (originalMemberIds.includes(memberId)) return; // Prevent toggling off already invited members
    
    const isCurrentlyInvited = invitedMemberIds.includes(memberId);
    let updatedIds;
    
    if (isCurrentlyInvited) {
      updatedIds = invitedMemberIds.filter(id => id !== memberId);
    } else {
      updatedIds = [...invitedMemberIds, memberId];
    }
    
    setInvitedMemberIds(updatedIds);
  };

  const handleToggleGroupInvite = (group) => {
    const groupId = group.id;
    const originalGroupIds = inv.invitedGroupIds || [];
    if (originalGroupIds.includes(groupId)) return; // Prevent toggling off already invited groups
    
    const isCurrentlyInvited = invitedGroupIds.includes(groupId);
    let updatedIds;
    
    if (isCurrentlyInvited) {
      updatedIds = invitedGroupIds.filter(id => id !== groupId);
    } else {
      updatedIds = [...invitedGroupIds, groupId];
    }
    
    setInvitedGroupIds(updatedIds);
  };

  // Save new invitations and trigger notifications in a single batch
  const handleSaveInvitations = () => {
    const originalMemberIds = inv.invitedMemberIds || [];
    const newlyInvitedMemberIds = invitedMemberIds.filter(id => !originalMemberIds.includes(id));

    const originalGroupIds = inv.invitedGroupIds || [];
    const newlyInvitedGroupIds = invitedGroupIds.filter(id => !originalGroupIds.includes(id));

    if (newlyInvitedMemberIds.length === 0 && newlyInvitedGroupIds.length === 0) {
      showToast('No new members or groups selected to invite.', 'info');
      return;
    }

    // Save all to global context
    addInvitesToInvitation(inv._id || inv.id, invitedMemberIds, invitedGroupIds);

    // Send notifications for newly invited members
    newlyInvitedMemberIds.forEach(memberId => {
      const member = members.find(m => m.id === memberId) || presidents.find(p => p.id === memberId);
      if (member) {
        addNotification({
          type: 'invitation',
          title: 'New Invitation',
          message: `You have been invited to "${displayTitle}".`,
        });
      }
    });

    // Send notifications for newly invited groups
    newlyInvitedGroupIds.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        addNotification({
          type: 'invitation',
          title: 'Group Invited',
          message: `The group "${group.name}" has been invited to "${displayTitle}".`,
        });
      }
    });

    showToast('Invitations sent successfully!', 'success');
  };

  // Batch Select Actions
  const handleInviteAllPresidents = () => {
    const originalMemberIds = inv.invitedMemberIds || [];
    if (isAllPresidentsInvited) {
      const matchingIds = filteredPresidents.map(p => p.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id) || originalMemberIds.includes(id)));
    } else {
      const uninvited = filteredPresidents.filter(p => !invitedMemberIds.includes(p.id));
      const newIds = uninvited.map(p => p.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllInCity = () => {
    const originalMemberIds = inv.invitedMemberIds || [];
    if (isAllInCityInvited) {
      const matchingIds = filteredMembers.map(m => m.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id) || originalMemberIds.includes(id)));
    } else {
      const uninvited = filteredMembers.filter(m => !invitedMemberIds.includes(m.id));
      const newIds = uninvited.map(m => m.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllMembers = () => {
    const originalMemberIds = inv.invitedMemberIds || [];
    if (isAllMembersInvited) {
      const matchingIds = filteredMembers.map(m => m.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id) || originalMemberIds.includes(id)));
    } else {
      const uninvited = filteredMembers.filter(m => !invitedMemberIds.includes(m.id));
      const newIds = uninvited.map(m => m.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllGroups = () => {
    const originalGroupIds = inv.invitedGroupIds || [];
    if (isAllGroupsInvited) {
      const matchingIds = filteredGroups.map(g => g.id);
      setInvitedGroupIds(prev => prev.filter(id => !matchingIds.includes(id) || originalGroupIds.includes(id)));
    } else {
      const uninvited = filteredGroups.filter(g => !invitedGroupIds.includes(g.id));
      const newIds = uninvited.map(g => g.id);
      setInvitedGroupIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllFriends = () => {
    const originalMemberIds = inv.invitedMemberIds || [];
    if (isAllFriendsInvited) {
      const matchingIds = filteredFriends.map(f => f.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id) || originalMemberIds.includes(id)));
    } else {
      const uninvited = filteredFriends.filter(f => !invitedMemberIds.includes(f.id));
      const newIds = uninvited.map(f => f.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-bold text-slate-800">Invitation Details</h1>
        </div>
        <button onClick={handleShare} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors">
          <Share2 size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* Full Card Visual */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <div className="relative overflow-hidden flex flex-col items-center justify-center text-center">
            {images.length > 0 ? (
              <div 
                className="relative w-full min-h-[280px] max-h-[520px] overflow-hidden bg-slate-950 flex items-center justify-center group p-2 cursor-pointer"
                onClick={() => setFullscreenImg(images[currentImgIndex])}
                title="Click to view full screen image"
              >
                {/* Background blur fill */}
                <img 
                  src={images[currentImgIndex]} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110 pointer-events-none" 
                />
                
                {/* Main full image uncropped */}
                <img 
                  src={images[currentImgIndex]} 
                  alt="Invitation Event Card" 
                  className="relative z-10 max-w-full max-h-[500px] w-auto h-auto object-contain drop-shadow-lg rounded-lg transition-transform duration-300 group-hover:scale-[1.01]" 
                />
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev - 1 + images.length) % images.length); }} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 transition-colors text-xl shadow-md"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev + 1) % images.length); }} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 transition-colors text-xl shadow-md"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                      {images.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'bg-white w-3' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-8 w-full min-h-[220px] flex flex-col items-center justify-center relative bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-inner">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '12px 12px' }} />
                
                {hasGroomBride ? (
                  <>
                    <h3 className="text-white/80 font-bold text-[14px] mb-4 tracking-widest relative z-10 uppercase">Wedding Invitation</h3>
                    <div className="flex flex-col items-center justify-center gap-2 mb-4 relative z-10">
                      <span className="text-3xl font-black">{inv.groomName}</span>
                      <div className="my-1">
                        <Heart size={20} className="text-rose-400 fill-rose-400" />
                      </div>
                      <span className="text-3xl font-black">{inv.brideName}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-black leading-snug max-w-[85%] relative z-10 drop-shadow-sm">{displayTitle}</h3>
                    <p className="text-[13px] opacity-90 font-bold mt-2 z-10 uppercase tracking-wide">{displayHost}</p>
                  </>
                )}
                
                {isFieldEnabled('message') && (
                  <p className="text-white/70 text-[13px] font-medium mt-4 z-10 border-t border-white/20 pt-2 px-8">
                    {inv.message || 'You are cordially invited.'}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-white p-5 border-t border-slate-100">
            <h4 className="text-center font-bold text-slate-700 text-[13px] mb-4">Time Remaining</h4>
            <div className="flex items-center justify-center gap-3">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-700 font-black text-xl mb-1 border border-indigo-100/50 shadow-inner">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-[#F8F9FB] p-5 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-800 text-[15px] mb-4 border-b border-slate-200/60 pb-2">Main Event Details</h4>
          
          <div className="space-y-3.5">
            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                <p className="font-bold text-slate-800 text-[14px]">{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
              </div>
            </div>
            
            {/* Time */}
            {scheduleItems.length > 0 && (
              <div className="flex items-start gap-3 pt-3 border-t border-slate-200/50">
                <Clock size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                <div className="w-full">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Schedule</p>
                  <div className="grid grid-cols-2 gap-y-1.5 mt-1 text-[13px]">
                    {scheduleItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-24 text-slate-500 font-semibold">{item.label}:</span> 
                        <span className="font-bold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-3 pt-3 border-t border-slate-200/50">
              <MapPin size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Venue</p>
                <p className="font-bold text-slate-800 text-[14px] leading-snug">{inv.location}</p>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {invitationFormConfig?.customFields && invitationFormConfig.customFields.map(field => {
            const val = inv.customFields?.[field.id];
            if (!val) return null;
            return (
              <div key={field.id} className="flex items-start gap-3 pt-3 border-t border-slate-200/50 mt-3">
                <div className="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[8px] font-bold text-indigo-700">{field.label.substring(0, 1).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{field.label}</p>
                  <p className="font-bold text-slate-800 text-[14px] whitespace-pre-wrap leading-snug">{val}</p>
                </div>
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex gap-2.5 mt-6">
            {inv.mapLink && isFieldEnabled('mapLink') && (
              <a href={inv.mapLink} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-blue-200 transition-colors">
                <MapPin size={14} /> Directions
              </a>
            )}
            {inv.contact && isFieldEnabled('contact') && (
              <a href={`tel:${inv.contact}`} className="flex-1 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-emerald-200 transition-colors">
                <Phone size={14} /> Call
              </a>
            )}
            <button onClick={handleShare} className="flex-1 py-2.5 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center gap-1.5 font-bold text-[12px] hover:bg-rose-200 transition-colors">
              <Share2 size={14} /> Share
            </button>
          </div>
        </div>

        {/* RSVP Section */}
        {isCreator ? (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-800 text-[15px]">RSVP Dashboard</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Track invitation responses</p>
              </div>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg">
                Creator View
              </span>
            </div>

            {/* Metric Cards (Tabs) */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {/* Attending Card */}
              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('attending')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'attending'
                    ? 'border-indigo-600 bg-indigo-50/45 text-indigo-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black mb-1">{attendingList.length}</span>
                <span className="text-[10px] font-bold text-center whitespace-nowrap">Attending</span>
              </button>

              {/* With Family Card */}
              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('attending_family')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'attending_family'
                    ? 'border-purple-600 bg-purple-50/45 text-purple-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black mb-1">{familyList.length}</span>
                <span className="text-[10px] font-bold text-center whitespace-nowrap">With Family</span>
              </button>

              {/* Declined Card */}
              <button 
                type="button"
                onClick={() => setCreatorRsvpTab('not_attending')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  creatorRsvpTab === 'not_attending'
                    ? 'border-slate-500 bg-slate-100 text-slate-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl font-black mb-1">{declinedList.length}</span>
                <span className="text-[10px] font-bold text-center whitespace-nowrap">Declined</span>
              </button>
            </div>

            {/* Selected List */}
            <div className="space-y-2.5">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {creatorRsvpTab === 'attending' && 'Attending Members'}
                {creatorRsvpTab === 'attending_family' && 'Attending With Family'}
                {creatorRsvpTab === 'not_attending' && 'Declined Members'}
              </h5>

              {creatorRsvpTab === 'attending' && (
                attendingList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-[12px] bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                    No members attending yet.
                  </div>
                ) : (
                  attendingList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession} • {member.city}</p>
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
                  <div className="text-center py-8 text-slate-400 text-[12px] bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                    No members attending with family yet.
                  </div>
                ) : (
                  familyList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession} • {member.city}</p>
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
                  <div className="text-center py-8 text-slate-400 text-[12px] bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                    No members declined yet.
                  </div>
                ) : (
                  declinedList.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <Avatar initials={member.initials} size="md" imageUrl={member.avatar} />
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">{member.profession} • {member.city}</p>
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
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 text-[15px] mb-4">RSVP (Attendance)</h4>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleRSVP('attending')}
                className={`w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all border-2 ${
                  selectedStatus === 'attending' 
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                }`}
              >
                I am Attending
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleRSVP('attending_family')}
                  className={`flex-1 py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all border-2 ${
                    selectedStatus === 'attending_family' 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  With Family
                </button>
                <button 
                  onClick={() => handleRSVP('not_attending')}
                  className={`flex-1 py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all border-2 ${
                    selectedStatus === 'not_attending' 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  Declined
                </button>
              </div>
            </div>

            {selectedStatus !== currentRSVP && (
              <button
                type="button"
                onClick={handleSubmitRSVP}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[13px] py-3 rounded-xl shadow-sm transition-all press-scale mt-4 flex items-center justify-center gap-1.5 animate-fade-in"
              >
                <Check size={14} strokeWidth={3} /> Submit RSVP
              </button>
            )}

            {/* RSVP Members List */}
            {rsvpMembers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[13px] font-bold text-slate-600">
                  Total {inv.rsvps.length} person(s) RSVP'd
                </p>
                <div className="flex -space-x-2">
                  {rsvpMembers.slice(0, 4).map((member, i) => (
                    <div key={member.id} className="relative w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden z-10" style={{ zIndex: 10 - i }}>
                       <Avatar initials={member.initials} size="sm" imageUrl={member.avatar} />
                    </div>
                  ))}
                  {rsvpMembers.length > 4 && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600 z-0 relative">
                      +{rsvpMembers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INVITE MORE MEMBERS SECTION (Active prior to event date) */}
        {canShowDirectory && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <h4 className="font-extrabold text-slate-800 text-[15px]">
                Invite More Members
              </h4>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg">Active Event</span>
            </div>

            {/* Directory Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 p-1 rounded-xl">
              {directoryTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveDirectoryTab(tab.id); setSearchQuery(''); }}
                  className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all text-center ${
                    activeDirectoryTab === tab.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & City Filter Dropdown Row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder={activeDirectoryTab === 'groups' ? "Search groups..." : "Search by name, place..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[13px] outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-800"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Hide city dropdown for group & friends tabs */}
              {['members', 'presidents'].includes(activeDirectoryTab) && (
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-100 hover:border-slate-300 transition-colors h-full press-scale whitespace-nowrap"
                  >
                    <span>📍 {selectedCity === 'All' ? 'All Cities' : selectedCity}</span>
                    <span className="text-[9px] text-slate-400">▼</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto">
                        <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Select City
                        </div>
                        <button 
                          type="button"
                          onClick={() => { setSelectedCity('All'); setIsDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-[12px] font-bold transition-colors ${selectedCity === 'All' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          All Cities
                        </button>
                        {Array.from(new Set(members.map(m => m.city).filter(Boolean))).map(city => (
                          <button 
                            key={city}
                            type="button"
                            onClick={() => { setSelectedCity(city); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[12px] font-bold transition-colors ${selectedCity === city ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
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

            {/* Batch Actions Row */}
            {invitationFormConfig?.enableBatchInvite !== false && (
              <div className="bg-slate-50 p-2.5 rounded-xl flex flex-wrap gap-2 items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  {activeDirectoryTab === 'members' && `${filteredMembers.length} Members`}
                  {activeDirectoryTab === 'presidents' && `${filteredPresidents.length} Presidents`}
                  {activeDirectoryTab === 'groups' && `${filteredGroups.length} Groups`}
                  {activeDirectoryTab === 'friends' && `${filteredFriends.length} Friends`}
                </span>
                
                <div className="flex gap-2">
                  {activeDirectoryTab === 'members' && (
                    <>
                      {selectedCity !== 'All' && (
                        <button 
                          onClick={handleInviteAllInCity}
                          type="button"
                          className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 press-scale ${
                            isAllInCityInvited 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {isAllInCityInvited ? `Uninvite All in ${selectedCity}` : `Invite All in ${selectedCity}`}
                        </button>
                      )}
                      <button 
                        onClick={handleInviteAllMembers}
                        type="button"
                        className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors press-scale ${
                          isAllMembersInvited 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isAllMembersInvited ? 'Uninvite All Members' : 'Invite All Members'}
                      </button>
                    </>
                  )}
                  {activeDirectoryTab === 'presidents' && (
                    <button 
                      onClick={handleInviteAllPresidents}
                      type="button"
                      className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors press-scale ${
                        isAllPresidentsInvited 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isAllPresidentsInvited ? 'Uninvite All Presidents' : 'Invite All Presidents'}
                    </button>
                  )}
                  {activeDirectoryTab === 'groups' && (
                    <button 
                      onClick={handleInviteAllGroups}
                      type="button"
                      className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors press-scale ${
                        isAllGroupsInvited 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isAllGroupsInvited ? 'Uninvite All Groups' : 'Invite All Groups'}
                    </button>
                  )}
                  {activeDirectoryTab === 'friends' && (
                    <button 
                      onClick={handleInviteAllFriends}
                      type="button"
                      className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors press-scale ${
                        isAllFriendsInvited 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isAllFriendsInvited ? 'Uninvite All Friends' : 'Invite All Friends'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Directory Lists */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              
              {/* Members Tab */}
              {activeDirectoryTab === 'members' && filteredMembers.map(member => {
                const isInvited = invitedMemberIds.includes(member.id);
                const isOriginalInvited = (inv.invitedMemberIds || []).includes(member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white transition-all">
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
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                          {member.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{member.profession || 'Member'} • {member.city || 'Indore'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(member)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}

              {/* Presidents Tab */}
              {activeDirectoryTab === 'presidents' && filteredPresidents.map(president => {
                const isInvited = invitedMemberIds.includes(president.id);
                const isOriginalInvited = (inv.invitedMemberIds || []).includes(president.id);
                return (
                  <div key={president.id} className="flex items-center justify-between p-3 bg-indigo-50/20 border border-indigo-100/40 rounded-xl hover:border-slate-200 hover:bg-white transition-all">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => setSelectedProfileMember(president)}
                    >
                      <div className="relative shrink-0">
                        <Avatar 
                          initials={president.initials || (president.name || 'P').substring(0, 2).toUpperCase()} 
                          size="md" 
                          imageUrl={president.avatar || president.photo} 
                        />
                        <span className="absolute -top-1 -right-1 text-[10px] bg-amber-100 rounded-full w-4 h-4 flex items-center justify-center border border-amber-300 shadow-2xs">👑</span>
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                          {president.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{president.role} • City: {president.city}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(president)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}

              {/* Groups Tab */}
              {activeDirectoryTab === 'groups' && filteredGroups.map(group => {
                const isInvited = invitedGroupIds.includes(group.id);
                const isOriginalInvited = (inv.invitedGroupIds || []).includes(group.id);
                return (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-purple-50/20 border border-purple-100/40 rounded-xl hover:border-purple-200 hover:bg-white transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-[12px] border border-purple-250 uppercase shrink-0">
                        👥
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800">{group.name}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{group.category} • {group.members || 0} Members</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleGroupInvite(group)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-white text-purple-600 border border-purple-100 hover:bg-purple-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite Group'}
                    </button>
                  </div>
                );
              })}

              {/* Friends Tab */}
              {activeDirectoryTab === 'friends' && filteredFriends.map(friend => {
                const isInvited = invitedMemberIds.includes(friend.id);
                const isOriginalInvited = (inv.invitedMemberIds || []).includes(friend.id);
                return (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-pink-50/20 border border-pink-100/40 rounded-xl hover:border-pink-200 hover:bg-white transition-all">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1 group"
                      onClick={() => setSelectedProfileMember(friend)}
                    >
                      <Avatar 
                        initials={friend.initials || (friend.name || 'F').substring(0, 2).toUpperCase()} 
                        size="md" 
                        imageUrl={friend.avatar || friend.photo || friend.profileImage} 
                      />
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                          {friend.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">{friend.profession || 'Friend'} • {friend.city || 'Indore'}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      disabled={isOriginalInvited}
                      onClick={() => handleToggleInvite(friend)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                        isInvited 
                          ? isOriginalInvited 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-emerald-500 text-white shadow-md' 
                          : 'bg-white text-pink-600 border border-pink-100 hover:bg-pink-50'
                      }`}
                    >
                      {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                    </button>
                  </div>
                );
              })}

              {/* Empty States */}
              {activeDirectoryTab === 'members' && filteredMembers.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[12px]">No members found in {selectedCity}.</div>
              )}
              {activeDirectoryTab === 'presidents' && filteredPresidents.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[12px]">No presidents found in {selectedCity}.</div>
              )}
              {activeDirectoryTab === 'groups' && filteredGroups.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[12px]">No groups found.</div>
              )}
              {activeDirectoryTab === 'friends' && filteredFriends.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[12px]">No friends found.</div>
              )}

            </div>

            {/* Batch Submit Button for Detail Page */}
            <button 
              type="button"
              onClick={handleSaveInvitations}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[13px] py-3.5 rounded-2xl shadow-sm transition-all press-scale mt-3 flex items-center justify-center gap-1.5 animate-fade-in"
            >
              <Check size={16} strokeWidth={3} /> Send Invitations
            </button>
          </div>
        )}

      </div>
      {toast.show && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-white text-[12px] font-black px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-800 shadow-slate-800/20'
        }`}>
          <Check size={14} strokeWidth={3} className="shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Member Profile Detail Modal */}
      {selectedProfileMember && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedProfileMember(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-purple-100/50 text-center animate-scale-in"
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

              <h3 className="text-[18px] font-black text-slate-900 leading-tight">
                {selectedProfileMember.name}
              </h3>
              
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 mt-2">
                {selectedProfileMember.role || selectedProfileMember.profession || 'Samaj Member'}
              </span>

              <div className="w-full mt-5 space-y-2.5 text-left border-t border-slate-100 pt-4">
                {selectedProfileMember.city && (
                  <div className="flex items-center gap-2.5 text-slate-700 text-[13px] font-medium">
                    <MapPin size={15} className="text-purple-600 shrink-0" />
                    <span><strong>City:</strong> {selectedProfileMember.city}</span>
                  </div>
                )}
                {selectedProfileMember.phone && (
                  <div className="flex items-center gap-2.5 text-slate-700 text-[13px] font-medium">
                    <Phone size={15} className="text-emerald-600 shrink-0" />
                    <span><strong>Phone:</strong> {selectedProfileMember.phone}</span>
                  </div>
                )}
                {selectedProfileMember.email && (
                  <div className="flex items-center gap-2.5 text-slate-700 text-[13px] font-medium truncate">
                    <Mail size={15} className="text-blue-600 shrink-0" />
                    <span className="truncate"><strong>Email:</strong> {selectedProfileMember.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 w-full mt-6">
                {selectedProfileMember.phone && (
                  <a 
                    href={`tel:${selectedProfileMember.phone}`}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all press-scale"
                  >
                    <Phone size={14} /> Call Member
                  </a>
                )}
                <button
                  onClick={() => setSelectedProfileMember(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[12.5px] py-2.5 rounded-xl transition-all press-scale"
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
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            onClick={() => setFullscreenImg(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={fullscreenImg}
            alt="Full Invitation Card"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
