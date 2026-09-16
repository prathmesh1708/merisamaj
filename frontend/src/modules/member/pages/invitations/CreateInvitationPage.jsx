import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, MapPin, Search, Check, X, CheckCircle2, UserCheck, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import DatePicker from '../../../../components/ui/DatePicker';
import TimePicker from '../../../../components/ui/TimePicker';
import invitationService from '../../../../core/api/invitationService';

export default function CreateInvitationPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { createInvitation, updateInvitation, invitations, members, currentUser, addNotification, groups, addInvitesToInvitation, invitationFormConfig } = useData();
  
  const [formData, setFormData] = useState({
    title: '',
    hostName: '',
    date: '',
    timeFood: '',
    timeProgram: '',
    location: '',
    mapLink: '',
    contact: '',
    message: 'You are cordially invited.',
    customFields: {},
    images: [],
  });

  const [existingImages, setExistingImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isCreated, setIsCreated] = useState(false);
  const [createdInv, setCreatedInv] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  
  // Member & President inviting states
  const [invitedMemberIds, setInvitedMemberIds] = useState([]);
  const [invitedGroupIds, setInvitedGroupIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('members'); // members | presidents | groups | friends
  const [toastMessage, setToastMessage] = useState('');

  // Load existing invitation in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const existing = invitations.find(i => String(i.id || i._id) === String(id));
      if (existing) {
        setFormData({
          title: existing.title || '',
          hostName: existing.hostName || existing.familyName || '',
          date: existing.date || '',
          timeFood: existing.timeFood || '',
          timeProgram: existing.timeProgram || '',
          location: existing.location || '',
          mapLink: existing.mapLink || '',
          contact: existing.contact || '',
          message: existing.message || 'You are cordially invited.',
          customFields: existing.customFields || {},
          images: [],
        });
        setExistingImages(existing.images || (existing.image ? [existing.image] : []));
        setLoadingInitial(false);
      } else {
        invitationService.getInvitationById(id).then(res => {
          if (res) {
            setFormData({
              title: res.title || '',
              hostName: res.hostName || res.familyName || '',
              date: res.date || '',
              timeFood: res.timeFood || '',
              timeProgram: res.timeProgram || '',
              location: res.location || '',
              mapLink: res.mapLink || '',
              contact: res.contact || '',
              message: res.message || 'You are cordially invited.',
              customFields: res.customFields || {},
              images: [],
            });
            setExistingImages(res.images || (res.image ? [res.image] : []));
          }
        }).catch(err => {
          console.error('Error fetching invitation for editing:', err);
        }).finally(() => setLoadingInitial(false));
      }
    }
  }, [id, isEditMode, invitations]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newUrls = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newUrls]);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...files] // Store File objects
      }));
    }
  };

  const removeImage = (indexToRemove) => {
    setImagePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const removeExistingImage = (indexToRemove) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contact') {
      const formatted = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    if (name === 'title' || name === 'hostName') {
      // Remove standard keyboard special characters but allow unicode/languages
      const formatted = value.replace(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`]/g, '');
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldId]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.hostName || !formData.date || !formData.location) {
      setToastMessage("Please fill in Title, Host/Family name, Date, and Venue.");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    // Validate dynamic required fields
    if (invitationFormConfig?.formFields?.length > 0) {
      const missingFields = invitationFormConfig.formFields
        .filter(f => f.required && f.enabled !== false && !(formData[f.id] !== undefined && formData[f.id] !== '' ? formData[f.id] : formData.customFields?.[f.id]))
        .map(f => f.label);
      if (missingFields.length > 0) {
        setToastMessage(`Please fill in required fields: ${missingFields.join(', ')}`);
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('hostName', formData.hostName);
    data.append('date', formData.date);
    data.append('timeFood', formData.timeFood || '');
    data.append('timeProgram', formData.timeProgram || '');
    data.append('location', formData.location);
    data.append('mapLink', formData.mapLink || '');
    data.append('contact', formData.contact || '');
    data.append('message', formData.message || '');
    
    // Backward compatibility fields
    data.append('groomName', formData.title.split('&')[0]?.trim() || formData.title);
    data.append('brideName', formData.title.split('&')[1]?.trim() || '');
    data.append('familyName', formData.hostName);

    if (isEditMode) {
      data.append('existingImages', JSON.stringify(existingImages));
    }

    if (formData.images && formData.images.length > 0) {
      formData.images.forEach(img => {
        data.append('images', img);
      });
    }

    data.append('customFields', JSON.stringify(formData.customFields || {}));
    
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateInvitation(id, data);
        setToastMessage("Invitation updated successfully! (निमंत्रण अपडेट हो गया)");
        setTimeout(() => {
          navigate(`/member/invitations/${id}`);
        }, 800);
      } else {
        const created = await createInvitation(data);
        setCreatedInv(created);
        setIsCreated(true);
      }
    } catch (err) {
      setToastMessage(isEditMode ? "Failed to update invitation" : "Failed to create invitation");
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleInvite = (member) => {
    const memberId = member.id;
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
    const isCurrentlyInvited = invitedGroupIds.includes(groupId);
    let updatedIds;
    
    if (isCurrentlyInvited) {
      updatedIds = invitedGroupIds.filter(id => id !== groupId);
    } else {
      updatedIds = [...invitedGroupIds, groupId];
    }
    
    setInvitedGroupIds(updatedIds);
  };

  // Resolve Community Surname to build mock presidents list
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

  // Presidents list definitions
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

  // Friends & Chats list: members who are followed or verified
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

  // Get unique cities from members and presidents
  const uniqueCities = Array.from(new Set([...members.map(m => m.city), ...presidents.map(p => p.city)])).filter(Boolean).sort();

  // Toggling batch button states (check if all filtered ones are selected)
  const isAllPresidentsInvited = filteredPresidents.length > 0 && filteredPresidents.every(p => invitedMemberIds.includes(p.id));
  const isAllInCityInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id));
  const isAllMembersInvited = filteredMembers.length > 0 && filteredMembers.every(m => invitedMemberIds.includes(m.id));
  const isAllGroupsInvited = filteredGroups.length > 0 && filteredGroups.every(g => invitedGroupIds.includes(g.id));
  const isAllFriendsInvited = filteredFriends.length > 0 && filteredFriends.every(f => invitedMemberIds.includes(f.id));

  // Batch Select Actions
  const handleInviteAllPresidents = () => {
    if (isAllPresidentsInvited) {
      const matchingIds = filteredPresidents.map(p => p.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      const uninvited = filteredPresidents.filter(p => !invitedMemberIds.includes(p.id));
      const newIds = uninvited.map(p => p.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllInCity = () => {
    if (isAllInCityInvited) {
      const matchingIds = filteredMembers.map(m => m.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      const uninvited = filteredMembers.filter(m => !invitedMemberIds.includes(m.id));
      const newIds = uninvited.map(m => m.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllMembers = () => {
    if (isAllMembersInvited) {
      const matchingIds = filteredMembers.map(m => m.id);
      setInvitedMemberIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      const uninvited = filteredMembers.filter(m => !invitedMemberIds.includes(m.id));
      const newIds = uninvited.map(m => m.id);
      setInvitedMemberIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllGroups = () => {
    if (isAllGroupsInvited) {
      const matchingIds = filteredGroups.map(g => g.id);
      setInvitedGroupIds(prev => prev.filter(id => !matchingIds.includes(id)));
    } else {
      const uninvited = filteredGroups.filter(g => !invitedGroupIds.includes(g.id));
      const newIds = uninvited.map(g => g.id);
      setInvitedGroupIds(prev => [...prev, ...newIds]);
    }
  };

  const handleInviteAllFriends = () => {
    if (isAllFriendsInvited) {
      uninvitedFriendsInFilter.forEach(f => {
        addNotification({
          type: 'invitation',
          title: 'मित्र को आमंत्रण (Friend Invited)',
          message: `${f.name} को "${createdInv?.title || 'कार्यक्रम'}" के लिए आमंत्रित किया गया है।`,
        });
      });
    }
  };

  const renderToast = () => toastMessage && (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-[#1e1145] text-white border border-purple-500/20 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-bounce font-sans text-xs font-bold select-none max-w-[90%] w-max text-center">
      <AlertCircle size={15} className="text-purple-300 shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface pb-24 relative">
      {renderToast()}
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold text-slate-800">
          {isEditMode ? 'Edit Invitation (निमंत्रण संपादित करें)' : isCreated ? 'Invitation Created' : 'Create New Invitation'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-2xl mx-auto w-full">
        {loadingInitial ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 size={32} className="animate-spin text-purple-600" />
            <p className="text-xs font-bold">Loading invitation details...</p>
          </div>
        ) : !isCreated ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* File Upload Section (Multiple photos) */}
            {invitationFormConfig?.formFields?.some(f => f.id === 'photos' && f.enabled !== false) && (
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700 block">
                  Upload Event Photos / Invitation Cards
                </label>
                
                <label className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50 transition-colors relative overflow-hidden min-h-32 block w-full">
                  <input 
                    type="file" 
                    multiple
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500 mb-2">
                    <Upload size={20} />
                  </div>
                  <p className="text-indigo-900 text-[13px] font-bold">Upload Event Photos (Multiple)</p>
                  <p className="text-[11px] text-slate-400 mt-1">Tap to select photos of card, venue, or program</p>
                </label>

                {/* Existing Images Previews (in Edit Mode) */}
                {existingImages.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Existing Photos</p>
                    <div className="grid grid-cols-3 gap-2">
                      {existingImages.map((imgUrl, index) => (
                        <div key={`existing-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                          <img src={imgUrl} alt={`existing-${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md"
                            title="Remove photo"
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newly Uploaded Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 mb-1.5">New Photos to Upload</p>
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-indigo-200 group bg-slate-100">
                          <img src={preview} alt={`preview-${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-md"
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Event Details Form Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="font-bold text-slate-800 text-[15px] border-b border-slate-100 pb-2">
                Enter Invitation Details
              </h3>
              
              {/* Event Title */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-slate-500">Event Title *</label>
                <input 
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="e.g. Marriage Ceremony, House Warming & Dinner"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                />
              </div>
              
              {/* Host/Family Name */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-slate-500">Host / Family Name *</label>
                <input 
                  type="text"
                  name="hostName"
                  value={formData.hostName}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="e.g. Verma Family / Shri Ramesh Gupta"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                />
              </div>

              {/* Event Date */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-slate-500">Event Date *</label>
                <DatePicker 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  placeholder="Select Date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                />
              </div>

              {/* Event Venue */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-slate-500">Venue *</label>
                <input 
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="e.g. Community Hall, Vijay Nagar / Grand Palace"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                />
              </div>

              {/* Event Schedules / Timings */}
              {/* Dynamic Form Fields */}
              {invitationFormConfig?.formFields?.filter(f => f.type !== 'file' && f.enabled !== false).map(field => (
                <div key={field.id} className="space-y-1 pt-1">
                  <label className="text-[12px] font-bold text-slate-500">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      name={field.id}
                      value={formData[field.id] !== undefined ? formData[field.id] : (formData.customFields?.[field.id] || '')}
                      onChange={(e) => {
                        if (formData[field.id] !== undefined) handleChange(e);
                        else handleCustomFieldChange(field.id, e.target.value);
                      }}
                      rows={2}
                      placeholder={field.desc || `Enter ${field.label}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800 resize-none"
                    />
                  ) : field.type === 'time' ? (
                    <TimePicker 
                      name={field.id}
                      value={formData[field.id] !== undefined ? formData[field.id] : (formData.customFields?.[field.id] || '')}
                      onChange={(e) => {
                         if (formData[field.id] !== undefined) handleChange(e);
                         else handleCustomFieldChange(field.id, e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                    />
                  ) : field.type === 'date' ? (
                    <DatePicker 
                      name={field.id}
                      value={formData[field.id] !== undefined ? formData[field.id] : (formData.customFields?.[field.id] || '')}
                      onChange={(e) => {
                         if (formData[field.id] !== undefined) handleChange(e);
                         else handleCustomFieldChange(field.id, e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                    />
                  ) : (
                    <input 
                      type={field.type || 'text'}
                      name={field.id}
                      maxLength={field.type === 'tel' ? 10 : undefined}
                      value={formData[field.id] !== undefined ? formData[field.id] : (formData.customFields?.[field.id] || '')}
                      onChange={(e) => {
                        if (formData[field.id] !== undefined) handleChange(e);
                        else handleCustomFieldChange(field.id, e.target.value);
                      }}
                      placeholder={field.desc || `Enter ${field.label}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-indigo-500 focus:bg-white transition-colors font-medium text-slate-800"
                    />
                  )}
                </div>
              ))}

            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-[15px] py-4 rounded-xl shadow-lg shadow-purple-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{isEditMode ? 'Saving Changes...' : 'Creating Invitation...'}</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save & Update Invitation (बदलाव सहेजें)' : 'Create Invitation (निमंत्रण बनाएं)'}</span>
              )}
            </button>
          </form>
        ) : (
          /* SUCCESS VIEW & MEMBER DIRECTORY */
          <div className="space-y-6">
            {/* Success message */}
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <CheckCircle2 size={44} className="text-emerald-500" />
              <h2 className="text-[16px] font-black text-emerald-800">Invitation Created Successfully!</h2>
              <p className="text-[12px] text-emerald-700 font-semibold">
                Your invitation is successfully created. You can now invite Samaj members, leaders, and groups.
              </p>
            </div>

            {/* Created Invitation Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="relative h-40 bg-gradient-to-r from-purple-600 to-indigo-700 flex flex-col items-center justify-center text-center p-4">
                {createdInv.images && createdInv.images.length > 0 ? (
                  <>
                    <img src={createdInv.images[0]} alt="Card Main" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-slate-900/40" />
                    <div className="text-white z-10 p-2">
                      <h3 className="font-extrabold text-[17px] tracking-wide line-clamp-1">{createdInv.title}</h3>
                      <p className="text-[12px] opacity-90 mt-0.5 font-bold">{createdInv.hostName}</p>
                      <p className="text-[11px] opacity-75 mt-1 font-semibold">{createdInv.date}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-white z-10 p-4">
                    <h3 className="font-extrabold text-[17px] tracking-wide line-clamp-1">{createdInv.title}</h3>
                    <p className="text-[12px] opacity-90 mt-0.5 font-bold">{createdInv.hostName}</p>
                    <p className="text-[11px] opacity-75 mt-1.5 font-semibold">{createdInv.date}</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-[12px] font-semibold text-slate-600 flex flex-col gap-1">
                <p className="truncate">📍 {createdInv.location}</p>
                <p>📞 {createdInv.contact}</p>
              </div>
            </div>

            {/* Member Inviting Directory with Tabs */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-800 text-[14px]">
                  {currentUser?.community || 'Samaj'} Directory
                </h3>
              </div>

              {/* Directory Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1 rounded-xl overflow-x-auto custom-scrollbar">
                {[
                  { id: 'members', label: 'Members', show: invitationFormConfig?.enableMembersTab !== false },
                  { id: 'presidents', label: 'Presidents', show: invitationFormConfig?.enablePresidentsTab !== false },
                  { id: 'groups', label: 'Groups', show: invitationFormConfig?.enableGroupsTab !== false },
                  { id: 'friends', label: 'Friends', show: invitationFormConfig?.enableFriendsTab !== false }
                ].filter(t => t.show).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveDirectoryTab(tab.id); setSearchQuery(''); }}
                    className={`flex-1 min-w-[80px] py-2 text-[11px] font-black rounded-lg transition-all text-center ${
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
                          {uniqueCities.map(city => (
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
              <div className="bg-slate-50 p-2.5 rounded-xl flex flex-wrap gap-2 items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  {activeDirectoryTab === 'members' && `${filteredMembers.length} Members filtered`}
                  {activeDirectoryTab === 'presidents' && `${filteredPresidents.length} Presidents filtered`}
                  {activeDirectoryTab === 'groups' && `${filteredGroups.length} Groups available`}
                  {activeDirectoryTab === 'friends' && `${filteredFriends.length} Friends filtered`}
                </span>
                
                {invitationFormConfig?.enableBatchInvite !== false && (
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
                            <MapPin size={10} /> {isAllInCityInvited ? `Uninvite All in ${selectedCity}` : `Invite All in ${selectedCity}`}
                          </button>
                        )}
                        <button 
                          onClick={handleInviteAllMembers}
                          type="button"
                          className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg text-white transition-colors flex items-center gap-1 shadow-sm press-scale ${
                            isAllMembersInvited ? 'bg-indigo-800 hover:bg-indigo-900' : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          <Users size={10} /> {isAllMembersInvited ? 'Uninvite All Members' : 'Invite All Members'}
                        </button>
                      </>
                    )}
                    {activeDirectoryTab === 'presidents' && (
                      <button 
                        onClick={handleInviteAllPresidents}
                        type="button"
                        className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 press-scale ${
                          isAllPresidentsInvited 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <UserCheck size={10} /> {isAllPresidentsInvited ? 'Uninvite All Presidents' : 'Invite All Presidents'}
                      </button>
                    )}
                    {activeDirectoryTab === 'groups' && (
                      <button 
                        onClick={handleInviteAllGroups}
                        type="button"
                        className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 press-scale ${
                          isAllGroupsInvited 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Users size={10} /> {isAllGroupsInvited ? 'Uninvite All Groups' : 'Invite All Groups'}
                      </button>
                    )}
                    {activeDirectoryTab === 'friends' && (
                      <button 
                        onClick={handleInviteAllFriends}
                        type="button"
                        className={`font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 press-scale ${
                          isAllFriendsInvited 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <UserCheck size={10} /> {isAllFriendsInvited ? 'Uninvite All Friends' : 'Invite All Friends'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Lists Display */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                
                {/* 1. MEMBERS LIST */}
                {activeDirectoryTab === 'members' && filteredMembers.map(member => {
                  const isInvited = invitedMemberIds.includes(member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-white transition-all animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold flex items-center justify-center text-[12px] border border-indigo-100/30 uppercase">
                          {member.initials}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{member.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {member.profession || 'Member'} • {member.city || 'No city'}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleInvite(member)}
                        className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale ${
                          isInvited ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'
                        }`}
                      >
                        {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                      </button>
                    </div>
                  );
                })}

                {/* 2. PRESIDENTS LIST */}
                {activeDirectoryTab === 'presidents' && filteredPresidents.map(president => {
                  const isInvited = invitedMemberIds.includes(president.id);
                  return (
                    <div key={president.id} className="flex items-center justify-between p-3 bg-indigo-50/20 border border-indigo-100/40 rounded-xl hover:border-indigo-200 hover:bg-white transition-all animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-extrabold flex items-center justify-center text-[12px] border border-amber-600 shadow-sm uppercase shrink-0">
                          👑
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                            {president.name} 
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">President</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {president.role} • City: {president.city}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleInvite(president)}
                        className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                          isInvited ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'
                        }`}
                      >
                        {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                      </button>
                    </div>
                  );
                })}

                {/* 3. GROUPS LIST */}
                {activeDirectoryTab === 'groups' && filteredGroups.map(group => {
                  const isInvited = invitedGroupIds.includes(group.id);
                  return (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-purple-50/20 border border-purple-100/40 rounded-xl hover:border-purple-200 hover:bg-white transition-all animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-[12px] border border-purple-250 uppercase shrink-0">
                          👥
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{group.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {group.category || 'General'} • {group.members || 0} Members
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleGroupInvite(group)}
                        className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                          isInvited ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-purple-600 border border-purple-100 hover:bg-purple-50'
                        }`}
                      >
                        {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite Group'}
                      </button>
                    </div>
                  );
                })}

                {/* 4. FRIENDS & CHATS LIST */}
                {activeDirectoryTab === 'friends' && filteredFriends.map(friend => {
                  const isInvited = invitedMemberIds.includes(friend.id);
                  return (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-pink-50/20 border border-pink-100/40 rounded-xl hover:border-pink-200 hover:bg-white transition-all animate-fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 font-extrabold flex items-center justify-center text-[12px] border border-pink-250 uppercase shrink-0">
                          {friend.initials}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-slate-800">{friend.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {friend.profession || 'Friend'} • {friend.city || 'No city'}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleToggleInvite(friend)}
                        className={`px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all press-scale shrink-0 ${
                          isInvited ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-100 hover:bg-pink-50'
                        }`}
                      >
                        {isInvited ? <><Check size={12} strokeWidth={3} /> Invited</> : 'Invite'}
                      </button>
                    </div>
                  );
                })}

                {/* EMPTY FALLBACKS */}
                {activeDirectoryTab === 'members' && filteredMembers.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-[12px] font-semibold">No members found in {selectedCity === 'All' ? 'any city' : selectedCity}.</div>
                )}
                {activeDirectoryTab === 'presidents' && filteredPresidents.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-[12px] font-semibold">No presidents found in {selectedCity === 'All' ? 'any city' : selectedCity}.</div>
                )}
                {activeDirectoryTab === 'groups' && filteredGroups.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-[12px] font-semibold">No groups found matching filter.</div>
                )}
                {activeDirectoryTab === 'friends' && filteredFriends.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-[12px] font-semibold">No friends found in {selectedCity === 'All' ? 'any city' : selectedCity}.</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <button 
              onClick={() => {
                // Save invited members and groups to context
                addInvitesToInvitation(createdInv.id, invitedMemberIds, invitedGroupIds);
                
                // Dispatch all notifications at once
                invitedMemberIds.forEach(memberId => {
                  const member = members.find(m => m.id === memberId) || presidents.find(p => p.id === memberId);
                  if (member) {
                    addNotification({
                      type: 'invitation',
                      title: 'नया आमंत्रण (New Invitation)',
                      message: `आपको "${createdInv.title || 'कार्यक्रम'}" के लिए आमंत्रित किया गया है।`,
                    });
                  }
                });

                invitedGroupIds.forEach(groupId => {
                  const group = groups.find(g => g.id === groupId);
                  if (group) {
                    addNotification({
                      type: 'invitation',
                      title: 'ग्रुप को आमंत्रण (Group Invited)',
                      message: `आपके "${group.name}" ग्रुप को "${createdInv.title || 'कार्यक्रम'}" के लिए आमंत्रित किया गया है।`,
                    });
                  }
                });

                navigate('/member/invitations');
              }}
              className="w-full bg-slate-800 text-white font-black text-[15px] py-4 rounded-xl shadow-lg hover:bg-slate-900 active:scale-95 transition-all"
            >
              Done &amp; View All Invitations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
