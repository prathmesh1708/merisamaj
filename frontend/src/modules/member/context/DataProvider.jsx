import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../core/auth/useAuth';
import { useHeadAuth } from '../../head/auth/useHeadAuth';
import { axiosPrivate } from '../../../core/api/axiosPrivate';
import { authService } from '../../../core/auth/authService';

// Import initial mocks
import { currentUser as initialUser, mockMembers as initialMembers, mockAdmins as initialAdmins } from '../data/mockUsers';
import { mockPosts as initialPosts } from '../data/mockPosts';
import { mockEvents as initialEvents } from '../data/mockEvents';
import { mockMatrimonialProfiles as initialMatrimonial } from '../data/mockMatrimonial'; // DEPRECATED: matrimonial module now uses MatrimonialContext, not DataProvider
// mockChats/mockMessages DEPRECATED — Community Chat now uses useMemberChat hook + real API
// import { mockChats as initialChats, mockMessages as initialMessages } from '../data/mockChats';
import { mockProfessionals as initialProfessionals } from '../data/mockProfessionals';
import invitationService from '../../../core/api/invitationService';
import obituaryService from '../../../core/api/obituaryService';
import { eventService } from '../services/eventService';
import { headEventService } from '../../../core/api/headEventService';
import { matrimonialProfileService } from '../../../core/api/matrimonialService';
import socialService from '../../../core/api/socialService';

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

const mapSingleObituaryFromBackend = (ob, currentUserId) => {
  if (!ob) return null;
  // Calculate garland count
  const malaArpanCount = Array.isArray(ob.malaArpanUsers)
    ? ob.malaArpanUsers.reduce((sum, item) => sum + (item.count || 0), 0)
    : 0;

  const userHasMalaArpan = Array.isArray(ob.malaArpanUsers)
    ? ob.malaArpanUsers.some(item => (item.user?._id || item.user || '').toString() === (currentUserId || '').toString() && item.count > 0)
    : false;

  // Comments mapping
  const comments = Array.isArray(ob.comments) ? ob.comments.map(c => ({
    id: c._id || c.id,
    name: c.name || 'Anonymous',
    initials: c.initials || (c.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
    text: c.text,
    timestamp: c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'Just now',
    likes: Array.isArray(c.likes) ? c.likes.length : 0,
    isLiked: Array.isArray(c.likes) ? c.likes.some(uId => (uId?._id || uId || '').toString() === (currentUserId || '').toString()) : false
  })) : [];

  const creatorId = ob.creatorId?._id || ob.creatorId;
  const authorInitials = ob.creatorId?.initials || (ob.creatorId?.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return {
    id: ob._id || ob.id,
    deceasedName: ob.deceasedName,
    deceasedNameEn: ob.deceasedNameEn || '',
    prefix: ob.prefix || '',
    age: ob.age || 0,
    birthDate: ob.birthDate || '',
    dateOfPassing: ob.dateOfPassing,
    funeralDetails: ob.funeralDetails || {},
    message: ob.message,
    image: ob.image || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    author: {
      id: creatorId,
      name: ob.creatorId?.name || 'Samaj Member',
      initials: authorInitials,
      relation: ob.relation,
      email: ob.creatorId?.email || '',
      phone: ob.creatorId?.phone || ''
    },
    shraddhanjaliCount: Array.isArray(ob.haathJodeUsers) ? ob.haathJodeUsers.length : 0,
    hasOfferedShraddhanjali: Array.isArray(ob.haathJodeUsers) ? ob.haathJodeUsers.some(uId => (uId?._id || uId || '').toString() === (currentUserId || '').toString()) : false,
    haathJodeCount: Array.isArray(ob.haathJodeUsers) ? ob.haathJodeUsers.length : 0,
    malaArpanCount,
    userHasHaathJode: Array.isArray(ob.haathJodeUsers) ? ob.haathJodeUsers.some(uId => (uId?._id || uId || '').toString() === (currentUserId || '').toString()) : false,
    userHasMalaArpan,
    views: ob.views || 0,
    shares: ob.shares || 0,
    saves: Array.isArray(ob.saves) ? ob.saves.length : 0,
    isSaved: Array.isArray(ob.saves) ? ob.saves.some(uId => (uId?._id || uId || '').toString() === (currentUserId || '').toString()) : false,
    privacy: ob.privacy || 'public',
    familyContact: ob.familyContact || '',
    timestamp: ob.createdAt ? new Date(ob.createdAt).toLocaleDateString() : 'Just now',
    status: ob.status || 'Approved',
    comments
  };
};

const mapObituariesFromBackend = (data, currentUserId) => {
  if (!Array.isArray(data)) return [];
  return data.map(ob => mapSingleObituaryFromBackend(ob, currentUserId)).filter(Boolean);
};

const mapBackendProfileToFrontend = (p) => {
  const dob = new Date(p.personal?.dateOfBirth);
  const age = isNaN(dob) ? 25 : new Date().getFullYear() - dob.getFullYear();

  return {
    id: p._id || p.id,
    userId: p.userId,
    name: p.personal?.fullName || 'Anonymous',
    initials: (p.personal?.fullName || 'A').substring(0, 2).toUpperCase(),
    gender: p.personal?.gender || 'Female',
    age: age,
    height: p.personal?.height ? `${Math.floor(p.personal.height / 12)}'${p.personal.height % 12}"` : "5'5\"",
    weight: p.personal?.weight ? `${p.personal.weight} kg` : '60 kg',
    bodyType: p.personal?.bodyType || 'Average',
    complexion: p.personal?.complexion || 'Fair',
    bloodGroup: p.personal?.bloodGroup || 'O+',
    maritalStatus: p.personal?.maritalStatus || 'Never Married',
    motherTongue: p.personal?.motherTongue || 'Hindi',
    education: p.education?.highestQualification || 'Graduate',
    college: p.education?.college || '',
    profession: p.education?.profession || 'Professional',
    company: p.education?.company || '',
    annualIncome: p.education?.annualIncome || '5-10 LPA',
    city: p.location?.city || '',
    state: p.location?.state || '',
    community: p.personal?.community || 'Agrawal',
    gotra: p.personal?.gotra || '',
    manglik: p.horoscope?.manglik || 'No',
    star: p.horoscope?.star || '',
    rashi: p.horoscope?.rashi || '',
    diet: p.lifestyle?.diet || 'Vegetarian',
    smoking: p.lifestyle?.smoking || 'No',
    drinking: p.lifestyle?.drinking || 'No',
    hobbies: p.lifestyle?.hobbies || [],
    about: p.about?.biography || '',
    avatar: (p.photos && p.photos.length > 0) ? p.photos.find(img => img.isPrimary)?.url || p.photos[0].url : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
    photos: (p.photos || []).map(img => img.url),
    photoCount: (p.photos || []).length,
    isNew: true,
    premiumStatus: p.premiumStatus || false,
    photoVisibility: p.visibility || 'all',
    compatibilityTag: 'New Match',
    matchScore: p.matchPercentage || 80,
    lastActive: p.lastActiveAt ? new Date(p.lastActiveAt).toLocaleDateString() : 'Active Today',
    online: p.status === 'online',
    verifiedStatus: p.verificationStatus === 'verified',
    verifiedBadge: p.verificationStatus === 'verified' ? 'id' : null,
    familyType: p.family?.familyType || 'Nuclear',
    familyValues: p.family?.familyValues || 'Moderate',
    familyAffluence: p.family?.familyAffluence || 'Middle Class',
    fatherOccupation: p.family?.fatherOccupation || 'Retired',
    motherOccupation: p.family?.motherOccupation || 'Homemaker',
    brothers: `${p.family?.brothers || 0}`,
    sisters: `${p.family?.sisters || 0}`,
    partnerPreferences: {
      ageRange: p.preferences?.ageMin ? `${p.preferences.ageMin} - ${p.preferences.ageMax}` : '20-30',
      heightRange: "5'2\" - 6'0\"",
      education: p.preferences?.education || 'Any',
      profession: p.preferences?.occupation || 'Any',
      location: p.preferences?.city || 'Any',
      diet: 'Any',
      manglik: 'Any',
    },
    interests: {
      sent: p.interests?.sent || false,
      received: p.interests?.received || false,
      accepted: p.interests?.accepted || false,
      declined: false
    },
    shortlisted: p.shortlisted || false,
    blocked: p.blocked || false,
    joinedDate: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recently'
  };
};

const initialGroups = [
  { id: 'g1', name: 'Community General Group', initials: 'CG', members: 125, online: 8, posts: 28, category: 'General', lastActivity: '10:30 AM', isJoined: true, description: 'General discussion and announcement group for all community members.', isMuted: false, unread: 5, creatorId: 's1' },
  { id: 'g2', name: 'Youth Group', initials: 'YG', members: 85, online: 4, posts: 15, category: 'Youth', lastActivity: '09:15 AM', isJoined: true, description: 'For networking, career, and creative activities among community youth.', isMuted: false, unread: 2, creatorId: 'u1' },
  { id: 'g3', name: 'Women Group', initials: 'WG', members: 60, online: 2, posts: 45, category: 'Women', lastActivity: 'Yesterday', isJoined: true, description: 'Dialogue on women welfare, empowerment, and cottage industry.', isMuted: false, unread: 0, creatorId: 'm2' },
  { id: 'g4', name: 'Business Group', initials: 'BG', members: 45, online: 5, posts: 8, category: 'Business', lastActivity: 'Yesterday', isJoined: false, description: 'Business platform for community traders, entrepreneurs, and professionals.', isMuted: false, unread: 0, creatorId: 'm3' },
  { id: 'g5', name: 'Education Group', initials: 'EG', members: 55, online: 3, posts: 22, category: 'Education', lastActivity: '18/05/24', isJoined: false, description: 'Information on scholarship, school/college admission, and career guidance.', isMuted: false, unread: 0, creatorId: 's2' },
  { id: 'g6', name: 'Religious & Spiritual Group', initials: 'RG', members: 75, online: 6, posts: 19, category: 'Religious', lastActivity: '17/05/24', isJoined: false, description: 'Group for Satsang, religious festivals, and spiritual discussion.', isMuted: false, unread: 0, creatorId: 's7' }
];

const initialGroupMessages = {
  g1: [
    { id: 1, senderId: 's1', senderName: 'Rajesh Sharma', initials: 'RS', role: 'Admin', text: 'Hello to all members! A meeting has been scheduled at Samaj Bhawan at 7 PM today! Everyone\'s presence is mandatory.', time: '10:30 AM', isMe: false, reactions: ['🔥', '👍'] },
    { id: 2, senderId: 'me', senderName: 'Rajesh Agrawal', initials: 'RA', role: 'Member', text: 'Yes, I will be present.', time: '10:32 AM', isMe: true },
    { id: 3, senderId: 's2', senderName: 'Sushma Devi', initials: 'SD', role: 'Member', text: 'What will be the agenda of the program?', time: '10:35 AM', isMe: false },
    { id: 4, senderId: 's1', senderName: 'Rajesh Sharma', initials: 'RS', role: 'Admin', text: 'Agenda document has been shared in the group.', time: '10:40 AM', isMe: false },
    { id: 5, senderId: 's1', senderName: 'Rajesh Sharma', initials: 'RS', role: 'Admin', time: '10:40 AM', isMe: false, attachment: { type: 'file', name: 'Agenda.pdf', size: '1.2 MB' } },
    { id: 6, senderId: 's3', senderName: 'Veena Patel', initials: 'VP', role: 'Member', text: 'Thank you Admin', time: '10:45 AM', isMe: false }
  ],
  g2: [
    { id: 1, senderId: 's4', senderName: 'Amit', initials: 'AM', role: 'Member', text: 'There is a meeting tomorrow, everyone please come on time.', time: '09:15 AM', isMe: false }
  ],
  g3: [
    { id: 1, senderId: 's5', senderName: 'Reema', initials: 'RM', role: 'Member', text: 'Today\'s program was successful, thank you everyone.', time: 'Yesterday', isMe: false }
  ],
  g4: [
    { id: 1, senderId: 's6', senderName: 'Sunil', initials: 'SL', role: 'Member', text: 'Let\'s talk about the new order tomorrow.', time: 'Yesterday', isMe: false }
  ],
  g5: [
    { id: 1, senderId: 's2', senderName: 'Sudha', initials: 'SH', role: 'Member', text: 'Notes have been shared, please check.', time: '18/05/24', isMe: false }
  ],
  g6: [
    { id: 1, senderId: 's7', senderName: 'Pooja', initials: 'PJ', role: 'Member', text: 'The time for Satsang has been set for 7 PM.', time: '17/05/24', isMe: false }
  ]
};

const initialNotifications = [
  { id: 'n1', type: 'announcement', title: 'Annual Samaj Mahotsav', message: 'Registration is now open for the Annual Mahotsav on Jul 15.', time: '10 min ago', isRead: false },
  { id: 'n2', type: 'matrimonial', title: 'New Interest Received', message: 'Amit Agrawal has expressed interest in your matrimonial profile.', time: '1 hour ago', isRead: false },
  { id: 'n3', type: 'event', title: 'Event Reminder', message: 'Youth Career Seminar is happening tomorrow at 3 PM.', time: '3 hours ago', isRead: true },
  { id: 'n4', type: 'community', title: 'New Member Joined', message: 'Pooja Agrawal from Ahmedabad has joined the community.', time: '5 hours ago', isRead: true },
  { id: 'n5', type: 'announcement', title: 'Office Bearers Meeting', message: 'Monthly meeting scheduled for Sunday, 10 AM at Samaj Bhawan.', time: '1 day ago', isRead: true },
  { id: 'ng1', type: 'group', groupId: 'g1', groupName: 'Agrawal Youth Indore', title: 'New message in Agrawal Youth Indore', message: 'Vikas Jain: Has anyone got the details for the upcoming...', time: '12 min ago', isRead: false },
  { id: 'nv1', type: 'voting', title: 'समाज चुनाव शुरू हुआ', message: 'Samaj Head election voting has started. Cast your vote before Jul 20.', time: '2 hours ago', isRead: false },
  { id: 'nd1', type: 'donation', title: 'योगदान प्राप्त हुआ', message: 'आपके ₹5,000 के योगदान की रसीद जेनरेट हो गई है।', time: '4 hours ago', isRead: false },
  { id: 'nn1', type: 'nimantran', title: 'नया आमंत्रण', message: 'राकेश गुप्ता ने आपको गृह प्रवेश कार्यक्रम में आमंत्रित किया है।', time: '30 min ago', isRead: false },
  { id: 'ns1', type: 'shradhanjali', title: 'श्रद्धांजलि सभा सूचना', message: 'स्व. रामप्रसाद जी की पगड़ी रस्म कल दोपहर 2 बजे रखी गई है।', time: '1 day ago', isRead: false }
];

const defaultSentNotifications = [
  {
    id: 'nlog-1',
    communityId: 'c1',
    type: 'Announcement',
    audience: 'Entire Community',
    title: 'Samaj Bhawan Renovation Fund',
    subtitle: 'Contribution request',
    message: 'We are starting the renovation of our Indore Samaj Bhawan. We request all members to contribute generously to this noble cause.',
    channels: ['Push', 'Email', 'In-App'],
    attachments: [{ name: 'Renovation_Plan.pdf', type: 'document', size: '2.4 MB' }],
    ctaButton: { text: 'Donate Now', url: '/head/funds' },
    status: 'Delivered',
    stats: { sentCount: 120, openCount: 95, clickCount: 42 },
    scheduledTime: null,
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-01T10:00:00Z',
    isPinned: true
  },
  {
    id: 'nlog-2',
    communityId: 'c1',
    type: 'Event Update',
    audience: 'Volunteers',
    title: 'Volunteer Briefing - Career Seminar',
    subtitle: 'Meeting instructions',
    message: 'All volunteers for tomorrow\'s Youth Career Seminar are requested to assemble at the venue by 2 PM for a final briefing.',
    channels: ['Push', 'SMS'],
    attachments: [],
    ctaButton: null,
    status: 'Delivered',
    stats: { sentCount: 15, openCount: 15, clickCount: 10 },
    scheduledTime: null,
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-06T15:00:00Z',
    isPinned: false
  },
  {
    id: 'nlog-3',
    communityId: 'c1',
    type: 'Emergency Alert',
    audience: 'Entire Community',
    title: 'Heavy Rain Warning - Meeting Postponed',
    subtitle: 'Urgent notice',
    message: 'Due to the heavy rain warning issued by the meteorological department, today\'s executive body meeting is postponed to next Sunday.',
    channels: ['Push', 'SMS', 'Email', 'In-App'],
    attachments: [],
    ctaButton: null,
    status: 'Delivered',
    stats: { sentCount: 120, openCount: 110, clickCount: 88 },
    scheduledTime: null,
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-07T08:00:00Z',
    isPinned: false
  },
  {
    id: 'nlog-4',
    communityId: 'c1',
    type: 'Matrimonial Update',
    audience: 'Verified Members',
    title: 'New Matrimonial Profiles Added',
    subtitle: 'Weekly digest',
    message: '5 new matrimonial profiles of brides and grooms have been verified and added to our Agrawal Samaj Indore directory this week.',
    channels: ['Push', 'Email'],
    attachments: [],
    ctaButton: { text: 'View Profiles', url: '/head/matrimonial' },
    status: 'Delivered',
    stats: { sentCount: 95, openCount: 72, clickCount: 30 },
    scheduledTime: null,
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-05T09:00:00Z',
    isPinned: false
  },
  {
    id: 'nlog-5',
    communityId: 'c1',
    type: 'Announcement',
    audience: 'Committee Members',
    title: 'Monthly Audit Report Discussion',
    subtitle: 'Agenda notice',
    message: 'Please review the monthly audit report sent via email. We will discuss it during the committee meeting next Tuesday.',
    channels: ['Email'],
    attachments: [{ name: 'Audit_Report_June.pdf', type: 'document', size: '1.8 MB' }],
    ctaButton: null,
    status: 'Failed',
    stats: { sentCount: 10, openCount: 0, clickCount: 0 },
    scheduledTime: null,
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-06T11:00:00Z',
    isPinned: false
  },
  {
    id: 'nlog-6',
    communityId: 'c1',
    type: 'Festival Greeting',
    audience: 'Entire Community',
    title: 'Happy Guru Purnima Greetings',
    subtitle: 'Greetings from President',
    message: 'Wishing all members a very happy and blessed Guru Purnima. Let us follow the path of knowledge and wisdom shown by our gurus.',
    channels: ['Push', 'In-App'],
    attachments: [],
    ctaButton: null,
    status: 'Queued',
    stats: { sentCount: 0, openCount: 0, clickCount: 0 },
    scheduledTime: '2026-07-10T08:00:00Z',
    expiryDate: null,
    createdBy: 'Rajesh Agrawal',
    createdTime: '2026-07-07T12:00:00Z',
    isPinned: false
  }
];

const defaultTemplates = [
  {
    id: 'tpl-1',
    type: 'Community Announcement',
    titleTemplate: 'General Body Meeting - {{communityName}}',
    bodyTemplate: 'Dear Members, you are cordially invited to the general body meeting scheduled on {{date}} at {{time}} at {{location}}. Agenda: audit discussion and election prep.',
    variables: ['communityName', 'date', 'time', 'location'],
    createdBy: 'System'
  },
  {
    id: 'tpl-2',
    type: 'Meeting Reminder',
    titleTemplate: 'Reminder: Committee Meeting Today',
    bodyTemplate: 'Dear Committee Member, this is a gentle reminder for our monthly meeting scheduled today at {{time}} at {{location}}. Please be on time.',
    variables: ['time', 'location'],
    createdBy: 'System'
  },
  {
    id: 'tpl-3',
    type: 'Event Reminder',
    titleTemplate: 'Reminder: {{eventName}}',
    bodyTemplate: 'Hello {{memberName}}, the event "{{eventName}}" is scheduled on {{date}} at {{time}} at {{location}}. We look forward to seeing you.',
    variables: ['memberName', 'eventName', 'date', 'time', 'location'],
    createdBy: 'System'
  },
  {
    id: 'tpl-4',
    type: 'Registration Approved',
    titleTemplate: 'Registration Approved: {{eventName}}',
    bodyTemplate: 'Dear {{memberName}}, your registration for "{{eventName}}" has been approved. Please carry your digital pass for automated attendance check-in.',
    variables: ['memberName', 'eventName'],
    createdBy: 'System'
  },
  {
    id: 'tpl-5',
    type: 'Member Verification',
    titleTemplate: 'Profile Verified: {{communityName}}',
    bodyTemplate: 'Dear {{memberName}}, congratulations! Your member listing in {{communityName}} has been successfully verified. You now have full access to directories and funds.',
    variables: ['memberName', 'communityName'],
    createdBy: 'System'
  }
];

export const getNotificationModule = (type) => {
  if (['announcement', 'event', 'system', 'global'].includes(type)) return 'home';
  if (['matrimonial'].includes(type)) return 'matrimonial';
  if (['nimantran', 'invitation'].includes(type)) return 'nimantran';
  if (['chat', 'group', 'message'].includes(type)) return 'chat';
  if (['donation'].includes(type)) return 'donation';
  if (['voting'].includes(type)) return 'voting';
  if (['shradhanjali'].includes(type)) return 'shradhanjali';
  if (['community', 'member', 'follow_request_sent', 'follow_accept', 'follow_request'].includes(type)) return 'community';
  return 'home';
};

const adaptGroups = (groupsList, community) => {
  const surname = getCommunitySurname(community);
  return groupsList.map(g => {
    const newName = g.name.replaceAll('Agrawal', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname).replaceAll('Sharma', surname).replaceAll('Jain', surname).replaceAll('Patel', surname).replaceAll('Verma', surname);
    const newDesc = g.description.replaceAll('Agrawal', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname).replaceAll('Sharma', surname).replaceAll('Jain', surname).replaceAll('Patel', surname).replaceAll('Verma', surname);
    const newInitials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      ...g,
      name: newName,
      description: newDesc,
      initials: newInitials
    };
  });
};

const adaptGroupMessages = (messagesMap, community) => {
  const surname = getCommunitySurname(community);
  const result = {};
  Object.keys(messagesMap).forEach(key => {
    result[key] = messagesMap[key].map(m => {
      const newName = m.senderName ? m.senderName.replaceAll('Agrawal', surname).replaceAll('Jain', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname).replaceAll('Sharma', surname).replaceAll('Patel', surname).replaceAll('Verma', surname) : '';
      const newInitials = newName ? newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '';
      return {
        ...m,
        senderName: newName,
        initials: newInitials,
        text: m.text ? m.text.replaceAll('Agrawal', surname).replaceAll('Jain', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname).replaceAll('Sharma', surname).replaceAll('Patel', surname).replaceAll('Verma', surname) : m.text
      };
    });
  });
  return result;
};

const adaptNotifications = (notificationsList, community) => {
  const surname = getCommunitySurname(community);
  return notificationsList.map(n => {
    const newTitle = n.title.replaceAll('Agrawal', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname);
    const newMessage = n.message.replaceAll('Agrawal', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname);
    const newGroupName = n.groupName ? n.groupName.replaceAll('Agrawal', surname).replaceAll('Mali', surname).replaceAll('Gupta', surname) : undefined;
    return {
      ...n,
      title: newTitle,
      message: newMessage,
      groupName: newGroupName
    };
  });
};

const adaptMembers = (membersList, community) => {
  const surname = getCommunitySurname(community);
  return membersList.map(m => {
    const newName = m.name.replaceAll('Agrawal', surname);
    const newInitials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const newFamily = m.familyMembers?.map(fm => {
      const newFmName = fm.name.replaceAll('Agrawal', surname);
      return {
        ...fm,
        name: newFmName,
        initials: newFmName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    });
    return {
      ...m,
      name: newName,
      initials: newInitials,
      community: community,
      familyMembers: newFamily
    };
  });
};

const adaptAdmins = (adminsList, community) => {
  const surname = getCommunitySurname(community);
  return adminsList.map(a => {
    const newName = a.name.replaceAll('Agrawal', surname);
    const newInitials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      ...a,
      name: newName,
      initials: newInitials,
      community: community
    };
  });
};

const adaptPosts = (postsList, community) => {
  const surname = getCommunitySurname(community);
  return postsList.map(p => {
    const newAuthorName = p.author.name.replaceAll('Agrawal', surname);
    const newAuthorInitials = newAuthorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const newContent = p.content.replaceAll('Agrawal', surname);
    return {
      ...p,
      author: {
        ...p.author,
        name: newAuthorName,
        initials: newAuthorInitials
      },
      content: newContent,
      community: community
    };
  });
};

const adaptStories = (storiesList, community) => {
  const surname = getCommunitySurname(community);
  return storiesList.map(s => {
    const newName = s.name.replaceAll('Agrawal', surname);
    const newInitials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return {
      ...s,
      name: newName,
      initials: newInitials
    };
  });
};

const adaptMatrimonial = (profilesList, currentUser) => {
  if (!currentUser) return profilesList;
  const community = currentUser.community;
  const surname = getCommunitySurname(community);

  let oppositeGender = currentUser.gender === 'Male' ? 'Female' : 'Male';

  if (currentUser.matrimonySubscription && currentUser.matrimonySubscription.status === 'active') {
    const sub = currentUser.matrimonySubscription;
    if (sub.plan === 'Groom') {
      oppositeGender = 'Female';
    } else if (sub.plan === 'Bride') {
      oppositeGender = 'Male';
    } else if (sub.plan === 'Combo') {
      oppositeGender = sub.activeProfileType === 'groom' ? 'Female' : 'Male';
    }
  }

  return profilesList
    .filter(p => p.gender === oppositeGender)
    .map(p => {
      const newName = p.name.replaceAll('Agrawal', surname);
      const newInitials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return {
        ...p,
        name: newName,
        initials: newInitials,
        community: community
      };
    });
};

const defaultFollowRelations = [
  { followerId: 'u1', followingId: 'm1', status: 'accepted' },
  { followerId: 'm1', followingId: 'u1', status: 'accepted' },
  { followerId: 'm2', followingId: 'u1', status: 'accepted' },
  { followerId: 'm3', followingId: 'u1', status: 'pending' },
  { followerId: 'u1', followingId: 'm2', status: 'pending' }
];

const defaultProfilePrivacy = {
  u1: 'public',
  m1: 'public',
  m2: 'private',
  m3: 'public',
  m4: 'private',
  m5: 'public',
  m6: 'private'
};

const defaultBlockedUsers = [];

const defaultGranularPrivacy = {
  u1: { phone: 'followers', email: 'followers', familyTree: 'followers', gallery: 'followers' },
  m1: { phone: 'public', email: 'public', familyTree: 'public', gallery: 'public' },
  m2: { phone: 'followers', email: 'followers', familyTree: 'followers', gallery: 'followers' },
  m3: { phone: 'private', email: 'private', familyTree: 'private', gallery: 'private' },
  m4: { phone: 'followers', email: 'followers', familyTree: 'followers', gallery: 'followers' },
  m5: { phone: 'public', email: 'public', familyTree: 'public', gallery: 'public' },
  m6: { phone: 'private', email: 'private', familyTree: 'private', gallery: 'private' }
};

const defaultInvitationFormConfig = {
  enableMembersTab: true,
  enablePresidentsTab: true,
  enableGroupsTab: true,
  enableFriendsTab: true,
  enableBatchInvite: true,
  formFields: [
    { id: 'timeFood', label: 'Feast Time Field', desc: 'Allow members to specify food timing', type: 'time', required: false, enabled: true },
    { id: 'timeProgram', label: 'Program Time Field', desc: 'Allow members to specify main event timing', type: 'time', required: false, enabled: true },
    { id: 'mapLink', label: 'Google Map Link Field', desc: 'Allow members to add Google Map URLs', type: 'url', required: false, enabled: true },
    { id: 'contact', label: 'Contact Number Field', desc: 'Require contact number on invitations', type: 'tel', required: true, enabled: true },
    { id: 'message', label: 'Personal Message Field', desc: 'Allow members to add a custom message', type: 'text', required: false, enabled: true },
    { id: 'photos', label: 'Photo/Card Upload', desc: 'Allow members to upload images of their invitation cards', type: 'file', required: false, enabled: true }
  ]
};

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { auth, setAuth, logout } = useAuth();
  const { headAuth } = useHeadAuth();
  // Helpers for localStorage
  const loadState = (key, defaultState) => {
    try {
      const serialized = localStorage.getItem(`merisamaj_v6_${key}`);
      if (serialized === null) {
        // Save initial to localStorage so it's persisted immediately
        localStorage.setItem(`merisamaj_v6_${key}`, JSON.stringify(defaultState));
        return defaultState;
      }
      return JSON.parse(serialized);
    } catch (err) {
      return defaultState;
    }
  };

  const saveState = (key, state) => {
    try {
      let safeState = state;
      if (key === 'currentUser' && state && typeof state === 'object') {
        safeState = { ...state };
        if (typeof safeState.avatar === 'string' && safeState.avatar.startsWith('data:image')) {
          delete safeState.avatar;
        }
      }
      localStorage.setItem(`merisamaj_v6_${key}`, JSON.stringify(safeState));
    } catch (err) {
      // Gracefully handle browser storage quota limits
    }
  };

  const deduplicateById = (arr) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    return arr.filter(item => {
      if (!item || !item.id) return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  // State Definitions
  const [currentUser, setCurrentUser] = useState(() => {
    if (auth?.isAuthenticated && auth?.user) return auth.user;
    if (headAuth?.isAuthenticated && headAuth?.headUser) return headAuth.headUser;
    const savedUser = localStorage.getItem('merisamaj_user') || localStorage.getItem('head_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.id || parsed._id || parsed.name)) return parsed;
      } catch {}
    }
    return auth?.user || headAuth?.headUser || null;
  });

  useEffect(() => {
    const activeUser = (auth.isAuthenticated && auth.user) ? auth.user : (headAuth.isAuthenticated && headAuth.headUser) ? headAuth.headUser : null;
    if (activeUser) {
      setCurrentUser(activeUser);
    } else if (!auth.isAuthenticated && !headAuth.isAuthenticated) {
      setCurrentUser(null);
    }
  }, [auth.isAuthenticated, auth.user, headAuth.isAuthenticated, headAuth.headUser]);

  const [members, setMembers] = useState(() => loadState('members', initialMembers));

  // Invitation Form Configuration State
  const [invitationFormConfig, setInvitationFormConfig] = useState(() => {
    return loadState('invitationFormConfig_v2', loadState('invitationFormConfig', defaultInvitationFormConfig));
  });

  useEffect(() => {
    saveState('invitationFormConfig', invitationFormConfig);
    saveState('invitationFormConfig_v2', invitationFormConfig);
  }, [invitationFormConfig]);

  const updateInvitationConfig = (newConfig) => {
    setInvitationFormConfig(newConfig);
  };

  const loadMembers = async () => {
    try {
      const response = await axiosPrivate.get('/member/members', { params: { limit: 200 } });
      if (response.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data.map(m => ({
          ...m,
          id: m._id || m.id,
          initials: m.name ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
        }));
        setMembers(mapped);
        saveState('members', mapped);
      }
    } catch (error) {
      console.error('Failed to load real members for invitations:', error);
    }
  };

  const currentUserId = auth.user?._id || auth.user?.id || currentUser?._id || currentUser?.id;

  useEffect(() => {
    if (auth.isAuthenticated && currentUserId) {
      loadMembers();
    } else if (!auth.isAuthenticated) {
      setMembers(initialMembers);
    }
  }, [auth.isAuthenticated, currentUserId]);

  const [admins, setAdmins] = useState(() => {
    const loaded = loadState('admins', initialAdmins);
    if (loaded && loaded.length < initialAdmins.length) {
      localStorage.setItem('merisamaj_v6_admins', JSON.stringify(initialAdmins));
      return initialAdmins;
    }
    return loaded;
  });
  const [posts, setPosts] = useState([]);
  const [cityPosts, setCityPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const inFlightFeedRequests = useRef(new Map());

  useEffect(() => {
    if (auth.isAuthenticated && currentUserId) {
      fetchFeedPosts('city');
      fetchStoriesList();
    } else {
      setPosts([]);
      setCityPosts([]);
      setCommunityPosts([]);
      setStories([]);
    }
  }, [auth.isAuthenticated, currentUserId]);

  const [followedAnnouncements, setFollowedAnnouncements] = useState(() => loadState('followedAnnouncements', {
    announcements: true,
    matrimonial: true,
    events: true,
    groups: true
  }));
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(null);

  const loadEvents = async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const isHeadPanel = typeof window !== 'undefined' && window.location.pathname.startsWith('/head');
      if (isHeadPanel && headAuth?.isAuthenticated) {
        const res = await headEventService.getEvents();
        setEvents(res.data || []);
      } else if (auth.isAuthenticated) {
        const res = await eventService.getEvents();
        setEvents(res.data || []);
      }

      if (headAuth?.isAuthenticated) {
        try {
          const res = await headEventService.getEvents();
          setEvents(res.data || []);
          return;
        } catch (e) {
          // Fallback if head fetch fails
        }
      }
    } catch (error) {
      console.error('Failed to load events', error);
      setEventsError(error.response?.data?.message || 'Failed to fetch events');
    } finally {
      setEventsLoading(false);
    }
  };

  // Events are loaded lazily on-demand by EventsPage to eliminate un-needed background queries on app mount
  const [obituaries, setObituaries] = useState([]);
  const [obituariesLoading, setObituariesLoading] = useState(false);
  const [obituariesError, setObituariesError] = useState(null);



  const [professionals, setProfessionals] = useState(() => {
    const saved = loadState('professionals', initialProfessionals);
    return saved.map((p, index) => {
      // Establish generic RBAC bindings: some belong to c1, others to c2 etc.
      let communityId = 'c2';
      if (p.id === 'p4' || p.id === 'p5') communityId = 'c1'; // Indore & Bhopal
      else if (p.id === 'p1') communityId = 'c2';
      else if (p.id === 'p2') communityId = 'c3';
      else if (p.id === 'p3') communityId = 'c4';
      else if (p.id === 'p6') communityId = 'c5';
      else if (p.id === 'p7') communityId = 'c6';

      return {
        ...p,
        communityId,
        status: p.status || 'Verified', // Lifecycle: Draft, Submitted, Under Review, Verified, Featured, Inactive, Suspended, Removed
        ownerName: p.ownerName || 'Shri Ramesh Kumar',
        ownerPhoto: p.ownerPhoto || null,
        memberId: p.memberId || `M-${10000 + index}`,
        gstNumber: p.gstNumber || `22AAAAA0000A1Z${index}`,
        businessId: p.businessId || `B-${20000 + index}`,
        experience: p.experience || `${5 + index} Years`,
        verificationBadge: p.verificationBadge || 'Gold',
        rating: p.rating || 4.5,
        category: p.category || 'Manufacturing',
        subcategory: p.subcategory || 'Heavy Machinery',
        businessHours: p.businessHours || '09:00 AM - 08:00 PM',
        website: p.website || `www.${(p.title || 'business').toLowerCase().replace(' ', '')}.com`,
        socialLinks: p.socialLinks || { facebook: '#', linkedin: '#', twitter: '#' },
        contact: p.contact || p.phone || '+91 98765 43210',
        address: p.address || '101, Main Street, Vijay Nagar',
        landmark: p.landmark || 'Near Capital Tower',
        state: p.state || 'Madhya Pradesh',
        pinCode: p.pinCode || '452010',
        emergencyContact: p.emergencyContact || '+91 90000 12345',
        documents: p.documents || [
          { id: 'doc1', type: 'GST Certificate', status: 'Verified', fileName: 'GST_Registration.pdf', fileUrl: '#', notes: 'Verified on GST Portal' },
          { id: 'doc2', type: 'Trade License', status: 'Verified', fileName: 'Trade_License_2026.pdf', fileUrl: '#', notes: 'Valid till 2027' },
          { id: 'doc3', type: 'Shop Registration', status: 'Verified', fileName: 'Shop_Establishment_Certificate.pdf', fileUrl: '#', notes: 'Verified establishment' }
        ],
        gallery: p.gallery || [
          { id: 'img1', fileType: 'Photo', fileUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', fileName: 'storefront.jpg', caption: 'Business Front View', sortOrder: 1, isCoverImage: true, isFeaturedImage: true },
          { id: 'img2', fileType: 'Photo', fileUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800', fileName: 'interior.jpg', caption: 'Interior Workspace', sortOrder: 2, isCoverImage: false, isFeaturedImage: false }
        ],
        complaints: p.complaints || [
          { id: 'comp1', type: 'Quality Issue', reportedBy: 'Anil Agrawal', evidence: 'Defective products received', priority: 'Medium', status: 'Pending', assignedDate: '2026-06-15T10:00:00Z', notes: '' }
        ],
        auditLogs: p.auditLogs || [
          { id: 'log1', action: 'Listing Creation', oldValue: null, newValue: 'Draft created', performedBy: 'Ramesh Kumar', timestamp: '2026-05-10T14:00:00Z' },
          { id: 'log2', action: 'Verification Review', oldValue: 'Submitted', newValue: 'Verified', performedBy: 'Shri Mohan Lal Agrawal', timestamp: '2026-05-12T11:00:00Z' }
        ]
      };
    });
  });
  // ─── Matrimonial Profiles ─────────────────────────────────────────────────
  // NOTE: The Matrimonial module now uses MatrimonialContext exclusively for data.
  // This state is kept as an empty placeholder for admin panel functions that
  // mutate profile objects passed in by reference (updateMatrimonialProfileStatus, etc.)
  // Do NOT initialise from mockMatrimonial — that data is served by the backend.
  const [matrimonialProfiles, setMatrimonialProfiles] = useState([]);
  const [language, setLanguage] = useState(() => loadState('language', 'en'));
  const [notifications, setNotifications] = useState(() => loadState('notifications', initialNotifications));
  const [sentNotifications, setSentNotifications] = useState(() => loadState('sentNotifications', defaultSentNotifications));
  const [notificationTemplates, setNotificationTemplates] = useState(() => loadState('notificationTemplates', defaultTemplates));

  // ─── DEPRECATED — Groups now served by useGroups hook + real API ────────────────────────────────
  // Stubs kept for backward-compat with any legacy references. Use useGroups() for new code.
  const [groups, setGroups] = useState([]);
  const [groupMessages, setGroupMessages] = useState({});


  // ─── DEPRECATED — 1-to-1 Chats now served by useMemberChat + real API (⽔member⽔chat) ───────────────────────────────────────────────────────
  // These stubs are kept to avoid breaking any legacy component references.
  // Do NOT add new features here. Use useMemberChat() instead.

  // Event Reminders State: { [eventId]: true/false }
  const [eventReminders, setEventReminders] = useState(() => loadState('eventReminders', {}));

  // Event RSVP Registrations: { [eventId]: { name, phone, attendees, registeredAt } }
  const [eventRegistrations, setEventRegistrations] = useState(() => loadState('eventRegistrations', {}));

  // Survey Responses State: { [surveyId]: { [questionId]: answer } }
  const [surveyResponses, setSurveyResponses] = useState(() => loadState('surveyResponses', {}));

  // Mobile Menu Navigation Drawer State
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── DEPRECATED — Chats now served by useMemberChat + real API ─────────────────────────────────────────────────────────────────────────────────────────────
  const [chats, setChats] = useState([]);
  const [chatMessages, setChatMessages] = useState({});

  // Follow System & Privacy States
  const [profilePrivacy, setProfilePrivacy] = useState(() => loadState('profilePrivacy', defaultProfilePrivacy));
  const [followRelations, setFollowRelations] = useState(() => loadState('followRelations', defaultFollowRelations));
  const [blockedUsers, setBlockedUsers] = useState(() => loadState('blockedUsers', defaultBlockedUsers));
  const [granularPrivacy, setGranularPrivacy] = useState(() => loadState('granularPrivacy', defaultGranularPrivacy));

  // Invitations State
  const [invitations, setInvitations] = useState([]);
  // Invitation ids whose "opened" record has already been sent this session
  const trackedInvitationOpensRef = useRef(new Set());

  useEffect(() => {
    const loadInvitations = async () => {
      try {
        const data = await invitationService.getInvitations();
        setInvitations(data);
      } catch (error) {
        console.error('Failed to load invitations', error);
      }
    };
    if (auth.isAuthenticated || headAuth?.isAuthenticated) {
      loadInvitations();
    }
  }, [auth.isAuthenticated, headAuth?.isAuthenticated]);

  // Obituaries Load
  const [obituariesPage, setObituariesPage] = useState(1);
  const [hasMoreObituaries, setHasMoreObituaries] = useState(true);

  const loadObituaries = async (params = { page: 1, limit: 15 }) => {
    setObituariesLoading(true);
    setObituariesError(null);
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 15;
      const data = await obituaryService.getObituaries({ ...params, page, limit });
      const rawList = Array.isArray(data) ? data : (data.data || []);
      const formatted = mapObituariesFromBackend(rawList, currentUser?.id || currentUser?._id);

      if (rawList.length < limit) {
        setHasMoreObituaries(false);
      } else {
        setHasMoreObituaries(true);
      }

      if (page > 1) {
        setObituaries(prev => {
          const existingIds = new Set(prev.map(o => o.id));
          const newItems = formatted.filter(o => !existingIds.has(o.id));
          return [...prev, ...newItems];
        });
      } else {
        setObituaries(formatted);
      }
      setObituariesPage(page);
    } catch (error) {
      console.error('Failed to load obituaries', error);
      setObituariesError(error.response?.data?.message || 'Failed to fetch obituaries');
    } finally {
      setObituariesLoading(false);
    }
  };

  const loadMoreObituaries = async () => {
    if (obituariesLoading || !hasMoreObituaries) return;
    await loadObituaries({ page: obituariesPage + 1, limit: 15 });
  };

  const loadMatrimonialProfiles = async () => {
    try {
      const res = await matrimonialProfileService.searchProfiles({});
      if (res?.data?.data?.profiles) {
        const formatted = res.data.data.profiles.map(mapBackendProfileToFrontend);
        setMatrimonialProfiles(formatted);
      }
    } catch (error) {
      console.error('Failed to load matrimonial profiles from backend', error);
      // Fallback is whatever is in localStorage
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated || headAuth?.isAuthenticated) {
      loadObituaries();
    }
    // NOTE: Matrimonial profiles are loaded by MatrimonialContext, not DataProvider
  }, [auth.isAuthenticated, headAuth?.isAuthenticated]);

  // Sync to localStorage when state changes
  useEffect(() => saveState('currentUser', currentUser), [currentUser]);
  useEffect(() => saveState('members', members), [members]);
  useEffect(() => saveState('admins', admins), [admins]);
  // useEffect(() => saveState('posts', posts), [posts]); // Disabled persistence for Feed redesign
  useEffect(() => saveState('followedAnnouncements', followedAnnouncements), [followedAnnouncements]);
  useEffect(() => saveState('events', events), [events]);
  // useEffect(() => saveState('obituaries', obituaries), [obituaries]); // Managed dynamically via backend now
  // NOTE: matrimonialProfiles localStorage sync removed — managed by MatrimonialContext
  useEffect(() => saveState('language', language), [language]);
  useEffect(() => saveState('professionals', professionals), [professionals]);
  // Groups localStorage sync DEPRECATED — useGroups hook manages its own state
  // useEffect(() => saveState('groups', groups), [groups]);
  // useEffect(() => saveState('groupMessages', groupMessages), [groupMessages]);
  // Chats localStorage sync DEPRECATED — useMemberChat hook manages its own state
  // useEffect(() => saveState('chats', chats), [chats]);
  // useEffect(() => saveState('chatMessages', chatMessages), [chatMessages]);

  // Active localStorage effects
  useEffect(() => saveState('notifications', notifications), [notifications]);
  useEffect(() => saveState('sentNotifications', sentNotifications), [sentNotifications]);
  useEffect(() => saveState('notificationTemplates', notificationTemplates), [notificationTemplates]);
  useEffect(() => saveState('eventReminders', eventReminders), [eventReminders]);
  useEffect(() => saveState('eventRegistrations', eventRegistrations), [eventRegistrations]);
  useEffect(() => saveState('surveyResponses', surveyResponses), [surveyResponses]);

  // Follow System Syncs
  useEffect(() => saveState('profilePrivacy', profilePrivacy), [profilePrivacy]);
  useEffect(() => saveState('followRelations', followRelations), [followRelations]);
  useEffect(() => saveState('blockedUsers', blockedUsers), [blockedUsers]);
  useEffect(() => saveState('granularPrivacy', granularPrivacy), [granularPrivacy]);
  // useEffect(() => saveState('invitations', invitations), [invitations]); // Disabled persistence so newly created cards reset on refresh

  // Follow System Methods
  const sendFollowRequest = async (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => {
      const exists = prev.some(r => r.followerId === myId && r.followingId === targetUserId);
      if (exists) return prev;
      const targetPrivacy = profilePrivacy[targetUserId] || 'public';
      const status = targetPrivacy === 'private' ? 'pending' : 'accepted';
      return [...prev, { followerId: myId, followingId: targetUserId, status }];
    });

    try {
      const res = await socialService.toggleFollow(targetUserId);
      return res;
    } catch (err) {
      console.error('Failed to send follow request via API:', err);
    }
  };

  const cancelFollowRequest = (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => prev.filter(r => !(r.followerId === myId && r.followingId === targetUserId && r.status === 'pending')));
  };

  const acceptFollowRequest = (senderUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => prev.map(r => {
      if (r.followerId === senderUserId && r.followingId === myId && r.status === 'pending') {
        return { ...r, status: 'accepted' };
      }
      return r;
    }));

    const sender = members.find(m => m.id === senderUserId) || admins.find(a => a.id === senderUserId);
    const senderName = sender ? sender.name : 'A member';
    const newNotification = {
      id: `nf_accept_${Date.now()}`,
      type: 'follow_accept',
      title: 'Follow Request Accepted',
      message: `You accepted ${senderName}'s follow request.`,
      time: 'Just now',
      isRead: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const rejectFollowRequest = (senderUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => prev.filter(r => !(r.followerId === senderUserId && r.followingId === myId && r.status === 'pending')));
  };

  const unfollowUser = async (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => prev.filter(r => !(r.followerId === myId && r.followingId === targetUserId)));

    try {
      const res = await socialService.toggleFollow(targetUserId);
      return res;
    } catch (err) {
      console.error('Failed to unfollow user via API:', err);
    }
  };

  const removeFollower = (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setFollowRelations(prev => prev.filter(r => !(r.followerId === targetUserId && r.followingId === myId)));
  };

  const updateProfilePrivacy = (privacySetting) => {
    setProfilePrivacy(prev => ({
      ...prev,
      u1: privacySetting
    }));
  };

  const updateGranularPrivacy = (field, setting) => {
    setGranularPrivacy(prev => {
      // Check if it's already a dictionary style or flat style
      if (prev && prev.u1) {
        return {
          ...prev,
          u1: {
            ...prev.u1,
            [field]: setting
          }
        };
      } else {
        // If it was flat, convert to dictionary style and save
        return {
          ...prev,
          u1: {
            ...prev,
            [field]: setting
          }
        };
      }
    });
  };

  const blockUser = (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setBlockedUsers(prev => {
      if (prev.some(b => b.blockerId === myId && b.blockedId === targetUserId)) return prev;
      return [...prev, { blockerId: myId, blockedId: targetUserId }];
    });
    // Remove any follow relationships
    setFollowRelations(prev => prev.filter(r =>
      !((r.followerId === myId && r.followingId === targetUserId) || (r.followerId === targetUserId && r.followingId === myId))
    ));
  };

  const unblockUser = (targetUserId) => {
    const myId = currentUser?.id || currentUser?._id || 'u1';
    setBlockedUsers(prev => prev.filter(b => !(b.blockerId === myId && b.blockedId === targetUserId)));
  };

  const updateProfile = async (updatedData) => {
    try {
      const response = await authService.updateProfile(updatedData);
      localStorage.setItem('merisamaj_user', JSON.stringify(response));
      setCurrentUser(response);
      setAuth(prev => ({ ...prev, user: response }));
    } catch (err) {
      console.error('Failed to update profile via API', err);
      setCurrentUser(prev => ({ ...prev, ...updatedData }));
    }
  };

  const loginUser = (userData) => {
    setCurrentUser(userData);
  };

  const logoutUser = async () => {
    // Reset state values
    setCurrentUser(null);
    setPosts([]);
    setEvents([]);
    setObituaries([]);
    setNotifications([]);
    setChats([]);
    setChatMessages({});

    await logout();
  };

  const addFamilyMember = (newMember) => {
    const memberWithId = { ...newMember, id: `f${Date.now()}`, initials: newMember.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() };
    setCurrentUser(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, memberWithId]
    }));
  };

  const deleteFamilyMember = (memberId) => {
    setCurrentUser(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter(m => m.id !== memberId)
    }));
  };

  const updateFamilyMember = (memberId, updatedMember) => {
    setCurrentUser(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map(m => m.id === memberId ? { ...m, ...updatedMember, initials: updatedMember.name ? updatedMember.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : m.initials } : m)
    }));
  };

  const toggleEventRSVP = async (eventId) => {
    try {
      const res = await eventService.toggleAttend(eventId);
      setEvents(prev => prev.map(e => {
        if (e.id === eventId || e._id === eventId) {
          return {
            ...e,
            isRegistered: res.data.isRegistered,
            attendees: res.data.attendeesCount
          };
        }
        return e;
      }));
      return res.data;
    } catch (error) {
      console.error('Failed to toggle event RSVP:', error);
    }
  };

  const toggleEventInterest = async (eventId) => {
    try {
      const res = await eventService.toggleInterested(eventId);
      setEvents(prev => prev.map(e => {
        if (e.id === eventId || e._id === eventId) {
          return {
            ...e,
            isInterested: res.data.isInterested,
            interested: res.data.interestedCount
          };
        }
        return e;
      }));
      return res.data;
    } catch (error) {
      console.error('Failed to toggle event interest:', error);
    }
  };

  const fetchFeedPosts = async (feedType, category = '', cursor = '') => {
    const reqKey = `${feedType}_${category}_${cursor}`;
    if (inFlightFeedRequests.current.has(reqKey)) {
      return inFlightFeedRequests.current.get(reqKey);
    }

    const promise = (async () => {
      try {
        const res = await socialService.getPosts(feedType, category, 10, cursor);
        const data = res.data.map(p => ({
          ...p,
          id: p._id,
          author: {
            id: p.userId?._id || p.userId?.id || 'Unknown',
            name: p.userId?.name || 'Member',
            avatar: p.userId?.avatar,
            initials: p.userId?.name ? p.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
          },
          images: p.media?.map(m => m.url) || [],
          likes: p.likesCount || 0,
          comments: p.commentsCount || 0,
          views: p.viewsCount || 0
        }));

        if (feedType === 'city') {
          setCityPosts(prev => cursor ? [...prev, ...data] : data);
          setPosts(prev => cursor ? [...prev, ...data] : data);
        } else {
          setCommunityPosts(prev => cursor ? [...prev, ...data] : data);
          setPosts(prev => cursor ? [...prev, ...data] : data);
        }
        return res;
      } catch (error) {
        console.error('Failed to fetch feed posts:', error);
      } finally {
        inFlightFeedRequests.current.delete(reqKey);
      }
    })();

    inFlightFeedRequests.current.set(reqKey, promise);
    return promise;
  };

  const fetchStoriesList = async () => {
    try {
      const res = await socialService.getStories();
      const formatted = (res.data || []).map(s => ({
        id: s._id,
        memberId: s.userId?._id || s.userId?.id,
        name: s.userId?.name || 'Member',
        initials: s.userId?.name ? s.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U',
        avatar: s.userId?.avatar,
        image: s.media,
        text: s.text,
        textPosition: s.textPosition || { x: 50, y: 50 },
        textStyle: s.textStyle || {
          color: '#ffffff',
          fontSize: 'base',
          align: 'center',
          bgStyle: 'pill-dark'
        },
        timestamp: 'Active',
        hasSeen: false
      }));
      setStories(formatted);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const createPost = async (postContent, images = [], options = {}) => {
    try {
      const media = images.map(url => ({ url }));
      const res = await socialService.createPost({
        content: postContent,
        category: options.category || 'Notice',
        media,
        location: options.city,
        feedType: options.feedType || 'city'
      });

      const formatSinglePost = (p) => ({
        ...p,
        id: p._id,
        city: options.city || currentUser?.city || 'Indore',
        community: currentUser?.community || 'Agrawal Samaj',
        feedType: p.feedType || 'city',
        author: {
          id: p.userId?._id || p.userId?.id || currentUser?.id,
          name: p.userId?.name || currentUser?.name || 'Member',
          avatar: p.userId?.avatar || currentUser?.avatar,
          initials: p.userId?.name
            ? p.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : (currentUser?.initials || 'U')
        },
        images: p.media?.map(m => m.url) || images || [],
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        views: p.viewsCount || 0
      });

      if (res?.posts && Array.isArray(res.posts) && res.posts.length === 2) {
        const cityFormatted = formatSinglePost(res.posts[0]);
        const communityFormatted = formatSinglePost(res.posts[1]);

        setCityPosts(prev => [cityFormatted, ...prev]);
        setCommunityPosts(prev => [communityFormatted, ...prev]);
        setPosts(prev => [cityFormatted, communityFormatted, ...prev]);

        return { success: true, data: cityFormatted, posts: [cityFormatted, communityFormatted] };
      }

      const postData = (res && res.data) ? res.data : res;
      const formatted = formatSinglePost(postData);

      if (formatted.feedType === 'city') {
        setCityPosts(prev => [formatted, ...prev]);
      } else if (formatted.feedType === 'community') {
        setCommunityPosts(prev => [formatted, ...prev]);
      }
      setPosts(prev => [formatted, ...prev]);
      return { success: true, data: formatted };
    } catch (error) {
      console.error('Failed to create post:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to publish post';
      throw new Error(msg);
    }
  };

  const updateStateIfPresent = (setter, postId, updateFn) => {
    setter(prev => {
      if (!prev.some(p => p._id === postId || p.id === postId)) return prev;
      return prev.map(updateFn);
    });
  };

  const togglePostLike = async (postId) => {
    // Optimistic Update
    const applyLike = p => {
      if (p._id === postId || p.id === postId) {
        const nextLiked = !p.isLiked;
        const nextCount = nextLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1);
        return { ...p, isLiked: nextLiked, likes: nextCount };
      }
      return p;
    };

    updateStateIfPresent(setPosts, postId, applyLike);
    updateStateIfPresent(setCityPosts, postId, applyLike);
    updateStateIfPresent(setCommunityPosts, postId, applyLike);

    try {
      const res = await socialService.toggleLike(postId);
      const reconcileFn = p => (p._id === postId || p.id === postId)
        ? { ...p, isLiked: res.liked }
        : p;
      updateStateIfPresent(setPosts, postId, reconcileFn);
      updateStateIfPresent(setCityPosts, postId, reconcileFn);
      updateStateIfPresent(setCommunityPosts, postId, reconcileFn);
    } catch (error) {
      console.error('Failed to toggle post like, rolling back:', error);
      const rollbackFn = p => {
        if (p._id === postId || p.id === postId) {
          const prevLiked = !p.isLiked;
          const prevCount = prevLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 0) - 1);
          return { ...p, isLiked: prevLiked, likes: prevCount };
        }
        return p;
      };
      updateStateIfPresent(setPosts, postId, rollbackFn);
      updateStateIfPresent(setCityPosts, postId, rollbackFn);
      updateStateIfPresent(setCommunityPosts, postId, rollbackFn);
    }
  };

  const togglePostSave = async (postId) => {
    const applySave = p => (p._id === postId || p.id === postId) ? { ...p, isSaved: !p.isSaved } : p;
    updateStateIfPresent(setPosts, postId, applySave);
    updateStateIfPresent(setCityPosts, postId, applySave);
    updateStateIfPresent(setCommunityPosts, postId, applySave);

    try {
      const res = await socialService.toggleSave(postId);
      const reconcileFn = p => (p._id === postId || p.id === postId) ? { ...p, isSaved: res.saved } : p;
      updateStateIfPresent(setPosts, postId, reconcileFn);
      updateStateIfPresent(setCityPosts, postId, reconcileFn);
      updateStateIfPresent(setCommunityPosts, postId, reconcileFn);
    } catch (error) {
      console.error('Failed to toggle post save, rolling back:', error);
      const rollbackFn = p => (p._id === postId || p.id === postId) ? { ...p, isSaved: !p.isSaved } : p;
      updateStateIfPresent(setPosts, postId, rollbackFn);
      updateStateIfPresent(setCityPosts, postId, rollbackFn);
      updateStateIfPresent(setCommunityPosts, postId, rollbackFn);
    }
  };

  const fetchPostComments = async (postId) => {
    try {
      const res = await socialService.getComments(postId);
      const commentsData = res.data || [];
      const currentUserId = currentUser?.id || currentUser?._id;

      const allFormatted = commentsData.map(c => {
        const likesArr = c.likes || [];
        const isLiked = currentUserId ? likesArr.some(id => (id._id || id).toString() === currentUserId.toString()) : false;
        return {
          ...c,
          id: c._id || c.id,
          parentCommentId: c.parentCommentId ? String(c.parentCommentId) : null,
          author: {
            id: c.userId?._id || c.userId?.id || 'Unknown',
            name: c.userId?.name || 'Member',
            avatar: c.userId?.avatar,
            initials: c.userId?.name ? c.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M',
            isVerified: true
          },
          text: c.text,
          time: c.createdAt ? new Date(c.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          likes: c.likesCount || likesArr.length || 0,
          isLiked: !!isLiked,
          replies: []
        };
      });

      const topLevel = allFormatted.filter(c => !c.parentCommentId);
      const replies = allFormatted.filter(c => c.parentCommentId);

      topLevel.forEach(parent => {
        parent.replies = replies.filter(r => String(r.parentCommentId) === String(parent.id));
      });

      const updateFn = p => (p._id === postId || p.id === postId)
        ? { ...p, commentsList: topLevel, comments: allFormatted.length, commentsCount: allFormatted.length }
        : p;

      updateStateIfPresent(setPosts, postId, updateFn);
      updateStateIfPresent(setCityPosts, postId, updateFn);
      updateStateIfPresent(setCommunityPosts, postId, updateFn);
      return topLevel;
    } catch (error) {
      console.error('Failed to fetch post comments:', error);
    }
  };

  const addPostComment = async (postId, commentText) => {
    if (!commentText || !commentText.trim()) return;
    const tempId = `temp_c_${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      _id: tempId,
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
      time: 'Just now',
      author: {
        id: currentUser?.id || currentUser?._id || 'me',
        name: currentUser?.name || 'Member',
        avatar: currentUser?.avatar,
        initials: currentUser?.initials || (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ME'),
        isVerified: true
      },
      likes: 0,
      isLiked: false,
      replies: []
    };

    // Optimistic Update
    const applyComment = p => {
      if (p._id === postId || p.id === postId) {
        return {
          ...p,
          comments: (p.comments || 0) + 1,
          commentsCount: (p.commentsCount || p.comments || 0) + 1,
          commentsList: [...(p.commentsList || []), optimisticComment]
        };
      }
      return p;
    };
    updateStateIfPresent(setPosts, postId, applyComment);
    updateStateIfPresent(setCityPosts, postId, applyComment);
    updateStateIfPresent(setCommunityPosts, postId, applyComment);

    try {
      const res = await socialService.addComment(postId, { text: commentText });
      const commentDoc = res.data;
      const realComment = {
        ...commentDoc,
        id: commentDoc._id || commentDoc.id,
        author: {
          id: commentDoc.userId?._id || commentDoc.userId?.id || currentUser?.id,
          name: commentDoc.userId?.name || currentUser?.name || 'Member',
          avatar: commentDoc.userId?.avatar || currentUser?.avatar,
          initials: commentDoc.userId?.name
            ? commentDoc.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : (currentUser?.initials || 'M')
        },
        text: commentDoc.text || commentText.trim(),
        time: 'Just now',
        likes: 0,
        isLiked: false,
        replies: []
      };

      const reconcileFn = p => {
        if (p._id === postId || p.id === postId) {
          const list = (p.commentsList || []).map(c => (c.id === tempId || c._id === tempId) ? realComment : c);
          return { ...p, commentsList: list };
        }
        return p;
      };
      updateStateIfPresent(setPosts, postId, reconcileFn);
      updateStateIfPresent(setCityPosts, postId, reconcileFn);
      updateStateIfPresent(setCommunityPosts, postId, reconcileFn);
      return realComment;
    } catch (error) {
      console.error('Failed to add comment, rolling back:', error);
      const rollbackFn = p => {
        if (p._id === postId || p.id === postId) {
          const list = (p.commentsList || []).filter(c => c.id !== tempId && c._id !== tempId);
          const nextCount = Math.max(0, (p.comments || 1) - 1);
          return { ...p, comments: nextCount, commentsCount: nextCount, commentsList: list };
        }
        return p;
      };
      updateStateIfPresent(setPosts, postId, rollbackFn);
      updateStateIfPresent(setCityPosts, postId, rollbackFn);
      updateStateIfPresent(setCommunityPosts, postId, rollbackFn);
      throw error;
    }
  };

  const addCommentReply = async (postId, commentId, replyText) => {
    try {
      const res = await socialService.addComment(postId, { text: replyText, parentCommentId: commentId });
      const replyDoc = res.data;
      const formattedReply = {
        ...replyDoc,
        id: replyDoc._id || replyDoc.id || `r_${Date.now()}`,
        author: {
          id: replyDoc.userId?._id || replyDoc.userId?.id || currentUser?.id,
          name: replyDoc.userId?.name || currentUser?.name || 'Member',
          avatar: replyDoc.userId?.avatar || currentUser?.avatar,
          initials: replyDoc.userId?.name
            ? replyDoc.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : (currentUser?.initials || 'M'),
          isVerified: true
        },
        text: replyDoc.text || replyText,
        time: 'Just now'
      };

      const updateFn = p => {
        if (p._id === postId || p.id === postId) {
          return {
            ...p,
            commentsList: (p.commentsList || []).map(c => (c._id === commentId || c.id === commentId)
              ? { ...c, replies: [...(c.replies || []), formattedReply] }
              : c
            )
          };
        }
        return p;
      };
      setPosts(prev => prev.map(updateFn));
      setCityPosts(prev => prev.map(updateFn));
      setCommunityPosts(prev => prev.map(updateFn));
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const toggleCommentLike = async (postId, commentId) => {
    try {
      const res = await socialService.toggleCommentLike(commentId);
      const isLiked = res.data?.isLiked;
      const likesCount = res.data?.likesCount;

      const updateFn = p => {
        if (p._id === postId || p.id === postId) {
          return {
            ...p,
            commentsList: (p.commentsList || []).map(c => {
              if (c._id === commentId || c.id === commentId) {
                return { ...c, isLiked, likes: likesCount };
              }
              return c;
            })
          };
        }
        return p;
      };
      setPosts(prev => prev.map(updateFn));
      setCityPosts(prev => prev.map(updateFn));
      setCommunityPosts(prev => prev.map(updateFn));
      return res.data;
    } catch (error) {
      console.error('Failed to toggle comment like:', error);
    }
  };

  const recordPostView = async (postId) => {
    try {
      const res = await socialService.recordView(postId);
      if (res && res.viewsCount !== undefined) {
        const updateFn = p => (p._id === postId || p.id === postId)
          ? { ...p, views: res.viewsCount, viewsCount: res.viewsCount }
          : p;
        updateStateIfPresent(setPosts, postId, updateFn);
        updateStateIfPresent(setCityPosts, postId, updateFn);
        updateStateIfPresent(setCommunityPosts, postId, updateFn);
      }
    } catch (error) {
      console.error('Failed to record post view:', error);
    }
  };

  const toggleFollowedAnnouncement = (type) => {
    setFollowedAnnouncements(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const addMatrimonialProfile = (profileData) => {
    const newProfile = {
      ...profileData,
      id: `mp${Date.now()}`,
      name: currentUser.name,
      initials: currentUser.initials,
      city: currentUser.city,
      photos: 1,
      isNew: true,
      interests: { sent: false, received: false }
    };
    setMatrimonialProfiles(prev => [newProfile, ...prev]);
  };

  // NOTE: toggleMatrimonialInterest and handleMatrimonialInterestResponse have been removed.
  // All interest operations now go through matrimonialInterestService (real API).
  // Use the interest actions in MatrimonialContext or call matrimonialInterestService directly.

  const updateMatrimonialBio = (newBio) => {
    setCurrentUser(prev => ({
      ...prev,
      matrimonialBio: newBio
    }));
  };

  const getOrCreateChat = (memberId) => {
    const newChatId = `c_dm_${memberId}`;
    const existing = chats.find(c => c.id === newChatId || (!c.isGroup && c.participants && c.participants.includes(memberId)));
    if (existing) {
      return existing.id;
    }

    const recipient = members.find(m => m.id === memberId) ||
      matrimonialProfiles.find(p => p.id === memberId) ||
      { name: 'Samaj Member', initials: 'SM' };

    const myId = currentUser?.id || currentUser?._id || 'u1';
    const newChat = {
      id: newChatId,
      isGroup: false,
      participants: [myId, memberId],
      name: recipient.name,
      avatar: recipient.avatar || null,
      initials: recipient.initials || (recipient.name ? recipient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SM'),
      lastMessage: {
        text: 'No messages yet',
        timestamp: new Date().toISOString(),
        senderId: memberId,
        isRead: true
      },
      unreadCount: 0,
      online: recipient.online || false
    };

    setChats(prev => deduplicateById([newChat, ...prev]));
    setChatMessages(prev => ({
      ...prev,
      [newChatId]: prev[newChatId] || []
    }));

    return newChatId;
  };

  const sendChatMessage = (chatId, text) => {
    const newMsg = {
      id: `m_${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      senderId: 'u1',
      senderName: currentUser?.name?.split(' ')[0] || 'You'
    };

    setChatMessages(prev => {
      const currentMsgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: [...currentMsgs, newMsg]
      };
    });

    setChats(prev => {
      const target = prev.find(c => c.id === chatId);
      if (!target) return prev;
      const updatedTarget = {
        ...target,
        lastMessage: {
          text,
          timestamp: new Date().toISOString(),
          senderId: 'u1',
          isRead: true
        }
      };
      return [updatedTarget, ...prev.filter(c => c.id !== chatId)];
    });

    // Simulate Reply for DM Chats
    const targetChat = chats.find(c => c.id === chatId);
    if (targetChat && !targetChat.isGroup) {
      setTimeout(() => {
        const autoText = [
          'हाँ, बिल्कुल! 😊',
          'ठीक है, मैं देख लूंगा।',
          'धन्यवाद! बताता हूँ।',
          'अच्छा, समझ गया।',
          'जी हाँ, कल मिलते हैं।',
          'Sure! Will get back to you.',
        ][Math.floor(Math.random() * 6)];

        const replyMsg = {
          id: `m_${Date.now()}_reply`,
          text: autoText,
          timestamp: new Date().toISOString(),
          senderId: targetChat.participants.find(p => p !== 'u1') || 'member',
          senderName: targetChat.name.split(' ')[0] || 'Member'
        };

        setChatMessages(current => {
          const currentMsgs = current[chatId] || [];
          return {
            ...current,
            [chatId]: [...currentMsgs, replyMsg]
          };
        });

        setChats(current => {
          const target = current.find(c => c.id === chatId);
          if (!target) return current;
          const updatedTarget = {
            ...target,
            lastMessage: {
              text: autoText,
              timestamp: new Date().toISOString(),
              senderId: replyMsg.senderId,
              isRead: false
            },
            unreadCount: (target.unreadCount || 0) + 1
          };
          return [updatedTarget, ...current.filter(c => c.id !== chatId)];
        });
      }, 1500);
    }

    // Simulate Reply for Matrimonial Chats
    if (chatId.startsWith('matrimonial_')) {
      setTimeout(() => {
        const partnerId = chatId.replace('matrimonial_', '');
        const autoText = [
          'Thanks for messaging! I went through your profile and found it interesting. 😊',
          'Let me discuss this with my parents and get back to you soon. 🙏',
          'Hi! Let us connect over a call sometime this weekend? 📞',
          'Hi, nice to meet you. Would you like to share your horoscope first? ✨',
          'Yes, absolutely. I am open to discussing further. 💍',
        ][Math.floor(Math.random() * 5)];

        const mockDict = {
          'feed_priya': 'Priyel',
          'feed_ruchi': 'Aakanksha',
          's_verma': 'S verma',
          'rani': 'Rani',
          'jagriti': 'Jagriti',
          'pragati': 'Pragati',
          'txar8899': 'TXAR8899',
          'aanchal': 'Aanchal'
        };
        const partnerName = mockDict[partnerId] || 'Partner';

        const replyMsg = {
          id: `m_${Date.now()}_reply`,
          text: autoText,
          timestamp: new Date().toISOString(),
          senderId: partnerId,
          senderName: partnerName
        };

        setChatMessages(current => {
          const currentMsgs = current[chatId] || [];
          return {
            ...current,
            [chatId]: [...currentMsgs, replyMsg]
          };
        });
      }, 2000);
    }
  };

  const addObituary = async (obituaryData) => {
    try {
      const communityId = (currentUser?.community || '').toLowerCase().replace(/\s/g, '_');
      let status = 'Approved';
      const savedSettings = localStorage.getItem(`community_settings_${communityId}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.shradhanjali?.requireApproval) {
            status = 'Pending';
          }
        } catch (e) { }
      }

      if (obituaryData instanceof FormData) {
        obituaryData.append('status', status);
      } else {
        obituaryData.status = status;
      }

      const newOb = await obituaryService.createObituary(obituaryData);
      const formatted = mapObituariesFromBackend([newOb], currentUser?.id || currentUser?._id)[0];
      setObituaries(prev => [formatted, ...prev]);
      return formatted;
    } catch (error) {
      console.error('Failed to add obituary:', error);
      throw error;
    }
  };

  const addStory = async (storyImage, storyText = '', storyOptions = {}) => {
    try {
      const textPosition = storyOptions.textPosition || { x: 50, y: 50 };
      const textStyle = storyOptions.textStyle || {
        color: '#ffffff',
        fontSize: 'base',
        align: 'center',
        bgStyle: 'pill-dark'
      };

      const res = await socialService.createStory({
        media: storyImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        mediaType: 'image',
        text: storyText,
        textPosition,
        textStyle,
        background: storyImage.startsWith('http') ? undefined : storyImage
      });

      const formatted = {
        id: res.data._id,
        memberId: res.data.userId?._id || res.data.userId?.id,
        name: res.data.userId?.name || 'Member',
        initials: res.data.userId?.name ? res.data.userId.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U',
        avatar: res.data.userId?.avatar,
        image: res.data.media,
        text: res.data.text,
        textPosition: res.data.textPosition || textPosition,
        textStyle: res.data.textStyle || textStyle,
        timestamp: 'Active',
        hasSeen: false
      };

      setStories(prev => [formatted, ...prev]);
    } catch (error) {
      console.error('Failed to add story:', error);
    }
  };

  const updateObituary = async (id, obituaryData) => {
    try {
      const updated = await obituaryService.updateObituary(id, obituaryData);
      const formatted = mapObituariesFromBackend([updated], currentUser?.id || currentUser?._id)[0];
      setObituaries(prev => prev.map(o => o.id === id ? formatted : o));
      return formatted;
    } catch (error) {
      console.error('Failed to update obituary:', error);
      throw error;
    }
  };

  const updateObituaryStatus = async (id, status) => {
    try {
      const updated = await obituaryService.updateObituaryStatus(id, status);
      const formatted = mapObituariesFromBackend([updated], currentUser?.id || currentUser?._id)[0];
      setObituaries(prev => prev.map(o => o.id === id ? formatted : o));
      return formatted;
    } catch (error) {
      console.error('Failed to update obituary status:', error);
      throw error;
    }
  };

  const deleteObituary = async (id) => {
    try {
      await obituaryService.deleteObituary(id);
      setObituaries(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('Failed to delete obituary:', error);
      throw error;
    }
  };

  const toggleObituaryShraddhanjali = async (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return {
          ...ob,
          hasOfferedShraddhanjali: !ob.hasOfferedShraddhanjali,
          shraddhanjaliCount: ob.hasOfferedShraddhanjali ? ob.shraddhanjaliCount - 1 : ob.shraddhanjaliCount + 1,
          userHasHaathJode: !ob.userHasHaathJode,
          haathJodeCount: ob.userHasHaathJode ? (ob.haathJodeCount || 0) - 1 : (ob.haathJodeCount || 0) + 1
        };
      }
      return ob;
    }));
    try {
      await obituaryService.toggleHaathJode(obId);
    } catch (error) {
      console.error('Error toggling shradhanjali:', error);
      loadObituaries();
    }
  };

  const toggleHaathJode = async (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return {
          ...ob,
          userHasHaathJode: !ob.userHasHaathJode,
          haathJodeCount: ob.userHasHaathJode ? (ob.haathJodeCount || 0) - 1 : (ob.haathJodeCount || 0) + 1,
          hasOfferedShraddhanjali: !ob.userHasHaathJode,
          shraddhanjaliCount: ob.userHasHaathJode ? (ob.shraddhanjaliCount || 0) - 1 : (ob.shraddhanjaliCount || 0) + 1
        };
      }
      return ob;
    }));
    try {
      await obituaryService.toggleHaathJode(obId);
    } catch (error) {
      console.error('Error toggling haath jode:', error);
      loadObituaries();
    }
  };

  const toggleMalaArpan = async (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return {
          ...ob,
          userHasMalaArpan: !ob.userHasMalaArpan,
          malaArpanCount: ob.userHasMalaArpan ? Math.max(0, (ob.malaArpanCount || 0) - 1) : (ob.malaArpanCount || 0) + 1
        };
      }
      return ob;
    }));
    try {
      await obituaryService.incrementMalaArpan(obId, 1);
    } catch (error) {
      console.error('Error toggling mala arpan:', error);
      loadObituaries();
    }
  };

  const incrementMalaArpan = async (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return {
          ...ob,
          userHasMalaArpan: !ob.userHasMalaArpan,
          malaArpanCount: ob.userHasMalaArpan ? Math.max(0, (ob.malaArpanCount || 0) - 1) : (ob.malaArpanCount || 0) + 1
        };
      }
      return ob;
    }));
    try {
      await obituaryService.incrementMalaArpan(obId, 1);
    } catch (error) {
      console.error('Error toggling mala arpan:', error);
      loadObituaries();
    }
  };

  const saveShradhanjali = async (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return {
          ...ob,
          isSaved: !ob.isSaved,
          saves: ob.isSaved ? Math.max(0, (ob.saves || 0) - 1) : (ob.saves || 0) + 1
        };
      }
      return ob;
    }));
    try {
      await obituaryService.toggleSave(obId);
    } catch (error) {
      console.error('Error saving shradhanjali:', error);
      loadObituaries();
    }
  };

  const shareShradhanjali = (obId) => {
    setObituaries(prev => prev.map(ob => {
      if (ob.id === obId) {
        return { ...ob, shares: (ob.shares || 0) + 1 };
      }
      return ob;
    }));
  };

  const incrementObituaryViews = async (obId) => {
    try {
      const res = await obituaryService.incrementViews(obId);
      const serverViews = res?.views;
      setObituaries(prev => prev.map(ob => {
        if (ob.id === obId) {
          return { ...ob, views: typeof serverViews === 'number' ? serverViews : ob.views };
        }
        return ob;
      }));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  };

  const addObituaryComment = async (obId, commentText) => {
    try {
      const updatedComments = await obituaryService.addComment(obId, commentText);
      const mappedComments = updatedComments.map(c => ({
        id: c._id || c.id,
        name: c.name || 'Anonymous',
        initials: c.initials || (c.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        text: c.text,
        timestamp: c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'Just now',
        likes: Array.isArray(c.likes) ? c.likes.length : 0,
        isLiked: Array.isArray(c.likes) ? c.likes.some(uId => (uId?._id || uId || '').toString() === (currentUser?.id || currentUser?._id || '').toString()) : false
      }));

      setObituaries(prev => prev.map(ob => {
        if (ob.id === obId) {
          return {
            ...ob,
            comments: mappedComments
          };
        }
        return ob;
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const likeObituaryComment = async (obId, commentId) => {
    try {
      const updatedComments = await obituaryService.toggleCommentLike(obId, commentId);
      const mappedComments = updatedComments.map(c => ({
        id: c._id || c.id,
        name: c.name || 'Anonymous',
        initials: c.initials || (c.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        text: c.text,
        timestamp: c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'Just now',
        likes: Array.isArray(c.likes) ? c.likes.length : 0,
        isLiked: Array.isArray(c.likes) ? c.likes.some(uId => (uId?._id || uId || '').toString() === (currentUser?.id || currentUser?._id || '').toString()) : false
      }));

      setObituaries(prev => prev.map(ob => {
        if (ob.id === obId) {
          return {
            ...ob,
            comments: mappedComments
          };
        }
        return ob;
      }));
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    setCurrentUser(initialUser);
    setMembers(initialMembers);
    setAdmins(initialAdmins);
    setPosts(initialPosts);
    setEvents(initialEvents);
    setMatrimonialProfiles([]); // Matrimonial data is served by backend via MatrimonialContext
    setGroups(initialGroups);
    setGroupMessages(initialGroupMessages);
    setNotifications(initialNotifications);
  };

  const createGroup = (groupData) => {
    const newGroup = {
      id: `g${Date.now()}`,
      name: groupData.name,
      initials: groupData.name.substring(0, 2),
      avatarUrl: groupData.avatarUrl || null,
      members: groupData.members || 1,
      online: 1,
      posts: 0,
      category: groupData.category || 'General',
      lastActivity: 'Just now',
      isJoined: true,
      description: groupData.description || '',
      isMuted: false,
      unread: 0,
      privacy: groupData.privacy,
      chatSettings: groupData.chatSettings,
      creatorId: currentUser.id
    };
    setGroups(prev => [newGroup, ...prev]);
    setGroupMessages(prev => ({
      ...prev,
      [newGroup.id]: groupData.initialMessage ? [
        {
          id: Date.now(),
          senderId: 'me',
          senderName: currentUser.name,
          initials: currentUser.initials,
          role: 'Admin',
          text: groupData.initialMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true
        }
      ] : []
    }));
  };

  const joinGroup = (groupId) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, isJoined: true, members: g.members + 1 } : g));
  };

  const leaveGroup = (groupId) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, isJoined: false, members: g.members - 1 } : g));
  };

  const toggleGroupMute = (groupId) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, isMuted: !g.isMuted } : g));
  };

  const updateGroupDetails = (groupId, updatedFields) => {
    setGroups(prevGroups => prevGroups.map(g => {
      if (g.id === groupId) {
        let initials = g.initials;
        if (updatedFields.name) {
          initials = updatedFields.name.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        }
        return {
          ...g,
          ...updatedFields,
          initials
        };
      }
      return g;
    }));
  };

  const reactToGroupMessage = (groupId, messageId, emoji) => {
    setGroupMessages(prev => {
      const messages = prev[groupId] || [];
      const updatedMessages = messages.map(m => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || [];
          let nextReactions;
          if (currentReactions.includes(emoji)) {
            nextReactions = currentReactions.filter(r => r !== emoji);
          } else {
            nextReactions = [...currentReactions, emoji];
          }
          return {
            ...m,
            reactions: nextReactions
          };
        }
        return m;
      });
      return {
        ...prev,
        [groupId]: updatedMessages
      };
    });
  };

  const sendGroupMessage = (groupId, text, attachment = null, replyTo = null) => {
    const newMsg = {
      id: Date.now(),
      senderId: 'me',
      senderName: currentUser.name,
      initials: currentUser.initials,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      attachment: attachment,
      replyTo: replyTo
    };
    setGroupMessages(prev => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), newMsg]
    }));

    // Trigger mock notification response for other members if group notifications are active
    const targetGroup = groups.find(g => g.id === groupId);
    if (targetGroup && !targetGroup.isMuted) {
      setTimeout(() => {
        const replyMsg = {
          id: Date.now() + 1,
          senderId: 'mock-reply',
          senderName: 'Vikas Jain',
          initials: 'VJ',
          text: `Got your message, Rajesh! Thanks for sharing.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: false
        };
        setGroupMessages(prev => {
          const currentList = prev[groupId] || [];
          if (currentList.some(m => m.senderId === 'mock-reply' && m.text.includes('Got your message'))) {
            return prev;
          }
          return {
            ...prev,
            [groupId]: [...currentList, replyMsg]
          };
        });

        // Also add a group notification!
        const newNotification = {
          id: `ng-${Date.now()}`,
          type: 'group',
          groupId: groupId,
          groupName: targetGroup.name,
          title: `New message in ${targetGroup.name}`,
          message: `Vikas Jain: Got your message, Rajesh!`,
          time: 'Just now',
          isRead: false
        };
        setNotifications(prev => [newNotification, ...prev]);
      }, 3000);
    }
  };

  const markAllNotificationsRead = (moduleName = null) => {
    setNotifications(prev => prev.map(n => {
      if (moduleName && getNotificationModule(n.type) !== moduleName) return n;
      return { ...n, isRead: true };
    }));
  };

  const addNotification = (notificationData) => {
    const newNotification = {
      id: `nd-${Date.now()}`,
      time: 'Just now',
      isRead: false,
      ...notificationData
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const getNotificationsForModule = (moduleName) => {
    return adaptedNotificationsList.filter(n => getNotificationModule(n.type) === moduleName);
  };

  const getUnreadCountForModule = (moduleName) => {
    return adaptedNotificationsList.filter(n => getNotificationModule(n.type) === moduleName && !n.isRead).length;
  };

  const clearChatMessages = (groupId) => {
    setGroupMessages(prev => ({
      ...prev,
      [groupId]: []
    }));
  };

  const activeCommunity = currentUser ? currentUser.community : 'Agrawal Samaj';

  const adaptedMembersList = adaptMembers(members, activeCommunity);
  const adaptedAdminsList = adaptAdmins(admins, activeCommunity);
  const adaptedPostsList = adaptPosts(posts, activeCommunity);
  const adaptedStoriesList = adaptStories(stories, activeCommunity);
  const adaptedMatrimonialList = matrimonialProfiles; // Admin functions operate on injected data; no adapt needed
  const adaptedGroupsList = adaptGroups(groups, activeCommunity);
  const adaptedGroupMessagesMap = adaptGroupMessages(groupMessages, activeCommunity);
  const adaptedNotificationsList = adaptNotifications(notifications, activeCommunity);

  const updateInvitationRSVP = async (invitationId, status) => {
    try {
      const updatedInv = await invitationService.updateRSVP(invitationId, status);
      setInvitations(prev => prev.map(inv => inv._id === invitationId || inv.id === invitationId ? updatedInv : inv));
    } catch (error) {
      console.error('Failed to update RSVP', error);
    }
  };

  /**
   * Records that the logged-in member opened an invitation, so its creator can
   * see them under "Who Opened" in the Sent-tab analytics. Fired once per
   * invitation per session; a creator opening their own card is not an "open".
   */
  const trackInvitationOpened = async (invitationId) => {
    if (!invitationId || !currentUserId) return;

    const key = String(invitationId);
    if (trackedInvitationOpensRef.current.has(key)) return;

    const inv = invitations.find(i => String(i._id) === key || String(i.id) === key);
    const creator = inv?.creatorId;
    const creatorIdStr = creator ? String(creator._id || creator.id || creator) : '';
    if (creatorIdStr && creatorIdStr === String(currentUserId)) return;

    trackedInvitationOpensRef.current.add(key);

    // Optimistic: show the viewer in the list immediately, before the round trip
    const now = new Date().toISOString();
    const viewer = {
      _id: currentUserId,
      name: currentUser?.name,
      avatar: currentUser?.avatar,
      phone: currentUser?.phone,
      city: currentUser?.city,
      profession: currentUser?.profession
    };

    setInvitations(prev => prev.map(i => {
      if (String(i._id) !== key && String(i.id) !== key) return i;
      const openedBy = i.openedBy || [];
      const already = openedBy.some(o => String(o.memberId?._id || o.memberId) === String(currentUserId));
      return {
        ...i,
        viewCount: (i.viewCount || 0) + 1,
        openedBy: already
          ? openedBy.map(o => (
              String(o.memberId?._id || o.memberId) === String(currentUserId)
                ? { ...o, lastOpenedAt: now, openCount: (o.openCount || 1) + 1 }
                : o
            ))
          : [...openedBy, { memberId: viewer, openedAt: now, lastOpenedAt: now, openCount: 1 }]
      };
    }));

    try {
      const updatedInv = await invitationService.trackOpened(invitationId);
      setInvitations(prev => prev.map(i => (String(i._id) === key || String(i.id) === key) ? updatedInv : i));
    } catch (error) {
      trackedInvitationOpensRef.current.delete(key);
      console.error('Failed to track invitation open', error);
    }
  };

  const createInvitation = async (invitationData) => {
    try {
      const newInv = await invitationService.createInvitation(invitationData);
      setInvitations(prev => [newInv, ...prev]);
      return newInv;
    } catch (error) {
      console.error('Failed to create invitation', error);
      throw error;
    }
  };

  const addInvitesToInvitation = async (invitationId, memberIds = [], groupIds = []) => {
    try {
      const existingInv = invitations.find(inv => inv._id === invitationId || inv.id === invitationId);
      if (!existingInv) return;

      const updatedMemberIds = Array.from(new Set([...(existingInv.invitedMemberIds || []), ...memberIds]));
      const updatedGroupIds = Array.from(new Set([...(existingInv.invitedGroupIds || []), ...groupIds]));

      const data = new FormData();
      data.append('invitedMemberIds', JSON.stringify(updatedMemberIds));
      data.append('invitedGroupIds', JSON.stringify(updatedGroupIds));

      const updatedInv = await invitationService.updateInvitation(invitationId, data);
      setInvitations(prev => prev.map(inv => (inv.id === invitationId || inv._id === invitationId) ? updatedInv : inv));
    } catch (error) {
      console.error('Failed to add invites to invitation', error);
    }
  };

  const updateInvitationStatus = async (invitationId, status) => {
    try {
      const data = new FormData();
      data.append('status', status);
      const updatedInv = await invitationService.updateInvitation(invitationId, data);
      setInvitations(prev => prev.map(inv => (inv.id === invitationId || inv._id === invitationId) ? updatedInv : inv));
    } catch (error) {
      console.error('Failed to update invitation status', error);
    }
  };

  const updateInvitation = async (invitationId, updatedData) => {
    try {
      const updatedInv = await invitationService.updateInvitation(invitationId, updatedData);
      setInvitations(prev => prev.map(inv => (inv.id === invitationId || inv._id === invitationId) ? updatedInv : inv));
      return updatedInv;
    } catch (error) {
      console.error('Failed to update invitation', error);
      throw error;
    }
  };

  const deleteInvitation = async (invitationId) => {
    try {
      await invitationService.deleteInvitation(invitationId);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId && inv._id !== invitationId));
    } catch (error) {
      console.error('Failed to delete invitation on backend', error);
      throw error;
    }
  };

  const verifyMember = (memberId) => {
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, isVerified: true } : m));
  };

  const rejectMember = (memberId) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const addEvent = async (eventData) => {
    try {
      const res = await headEventService.createEvent(eventData);
      setEvents(prev => [res.data, ...prev]);
    } catch (error) {
      console.error('Failed to create event on backend:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId, updatedData) => {
    try {
      const res = await headEventService.updateEvent(eventId, updatedData);
      setEvents(prev => prev.map(ev => (ev.id === eventId || ev._id === eventId) ? res.data : ev));
    } catch (error) {
      console.error('Failed to update event on backend:', error);
      throw error;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await headEventService.deleteEvent(eventId);
      setEvents(prev => prev.filter(ev => ev.id !== eventId && ev._id !== eventId));
    } catch (error) {
      console.error('Failed to delete event on backend:', error);
      throw error;
    }
  };

  const duplicateEvent = async (eventId) => {
    try {
      const src = events.find(ev => ev.id === eventId || ev._id === eventId);
      if (!src) return;
      const copyData = {
        ...src,
        title: `${src.title} (Copy)`,
        titleEn: src.titleEn ? `${src.titleEn} (Copy)` : undefined,
        status: 'Draft',
        startDate: src.startDate || new Date().toISOString()
      };
      const res = await headEventService.createEvent(copyData);
      setEvents(prev => [res.data, ...prev]);
    } catch (error) {
      console.error('Failed to duplicate event on backend:', error);
    }
  };

  const updateRegistrationStatus = (eventId, regId, status) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const updatedRegs = (ev.registrations || []).map(r => {
          if (r.id === regId) {
            const oldStatus = r.status;
            const updated = { ...r, status };
            const log = {
              id: `log-${Date.now()}`,
              action: 'Registration Approval',
              entityType: 'Registration',
              entityId: regId,
              oldValue: `Member ${r.name}: ${oldStatus}`,
              newValue: `Status changed to ${status}`,
              performedBy: currentUser?.name || 'Admin',
              timestamp: new Date().toISOString(),
              ipAddress: '127.0.0.1',
              device: 'Browser Console',
              reason: 'Administrative review'
            };
            ev.auditLogs = [log, ...(ev.auditLogs || [])];
            return updated;
          }
          return r;
        });
        return { ...ev, registrations: updatedRegs };
      }
      return ev;
    }));
  };

  const updateAttendanceStatus = (eventId, regId, attendance) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const updatedRegs = (ev.registrations || []).map(r => {
          if (r.id === regId) {
            const oldAttendance = r.attendance || 'Registered';
            const checkinTime = (attendance === 'Checked In' || attendance === 'Late') ? new Date().toISOString() : null;
            const updated = { ...r, attendance, checkinTime };
            const log = {
              id: `log-${Date.now()}`,
              action: 'Attendance Update',
              entityType: 'Registration',
              entityId: regId,
              oldValue: `Attendance: ${oldAttendance}`,
              newValue: `Attendance: ${attendance}`,
              performedBy: currentUser?.name || 'Admin',
              timestamp: new Date().toISOString(),
              ipAddress: '127.0.0.1',
              device: 'Browser Console',
              reason: 'Manual attendance toggle'
            };
            ev.auditLogs = [log, ...(ev.auditLogs || [])];
            return updated;
          }
          return r;
        });
        return { ...ev, registrations: updatedRegs };
      }
      return ev;
    }));
  };

  const uploadGalleryItem = (eventId, item) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const newItem = { ...item, id: `g-${Date.now()}`, sortOrder: (ev.gallery || []).length + 1 };
        const gallery = [...(ev.gallery || []), newItem];
        const log = {
          id: `log-${Date.now()}`,
          action: 'Gallery Upload',
          entityType: 'Gallery',
          entityId: newItem.id,
          oldValue: `Gallery size: ${(ev.gallery || []).length}`,
          newValue: `Added ${item.fileType}: ${item.fileName}`,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          ipAddress: '127.0.0.1',
          device: 'Browser Console',
          reason: 'Gallery media upload'
        };
        return { ...ev, gallery, auditLogs: [log, ...(ev.auditLogs || [])] };
      }
      return ev;
    }));
  };

  const deleteGalleryItem = (eventId, itemId) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const gallery = (ev.gallery || []).filter(item => item.id !== itemId);
        const log = {
          id: `log-${Date.now()}`,
          action: 'Gallery Item Delete',
          entityType: 'Gallery',
          entityId: itemId,
          oldValue: `Gallery size: ${(ev.gallery || []).length}`,
          newValue: `Removed gallery item ${itemId}`,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          ipAddress: '127.0.0.1',
          device: 'Browser Console',
          reason: 'Gallery item deletion'
        };
        return { ...ev, gallery, auditLogs: [log, ...(ev.auditLogs || [])] };
      }
      return ev;
    }));
  };

  const addEventAnnouncement = (eventId, announcementContent) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const newAnn = {
          id: `ann-${Date.now()}`,
          content: announcementContent,
          status: 'Published',
          scheduleTime: null,
          expirationTime: null,
          communityId: ev.communityId,
          author: currentUser?.name || 'Admin'
        };
        const announcements = [newAnn, ...(ev.announcements || [])];
        const log = {
          id: `log-${Date.now()}`,
          action: 'Broadcast Announcement',
          entityType: 'Announcement',
          entityId: newAnn.id,
          oldValue: `Announcements size: ${(ev.announcements || []).length}`,
          newValue: `Broadcast notice: "${announcementContent.substring(0, 30)}..."`,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          ipAddress: '127.0.0.1',
          device: 'Browser Console',
          reason: 'Broadcast circular'
        };
        return { ...ev, announcements, auditLogs: [log, ...(ev.auditLogs || [])] };
      }
      return ev;
    }));
  };

  const addProfessional = (profData) => {
    const newProf = {
      ...profData,
      id: `p-${Date.now()}`,
      communityId: currentUser?.communityId || 'c1',
      status: profData.status || 'Submitted',
      verificationBadge: 'None',
      rating: 0,
      documents: profData.documents || [],
      gallery: [],
      complaints: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: 'Listing Creation',
          oldValue: null,
          newValue: 'Listing initialized in state',
          performedBy: currentUser?.name || 'Owner',
          timestamp: new Date().toISOString()
        }
      ]
    };
    setProfessionals(prev => [newProf, ...prev]);
  };

  const updateProfessional = (profId, updatedData) => {
    setProfessionals(prev => prev.map(p => {
      if (p.id === profId) {
        const merged = { ...p, ...updatedData };
        const changes = Object.keys(updatedData).map(k => `${k}: ${JSON.stringify(p[k])} -> ${JSON.stringify(updatedData[k])}`).join(', ');
        const log = {
          id: `log-${Date.now()}`,
          action: 'Listing Update',
          oldValue: `Fields: ${Object.keys(updatedData).join(', ')}`,
          newValue: changes,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString()
        };
        merged.auditLogs = [log, ...(merged.auditLogs || [])];
        return merged;
      }
      return p;
    }));
  };

  const deleteProfessional = (profId) => {
    setProfessionals(prev => prev.map(p => {
      if (p.id === profId) {
        const log = {
          id: `log-${Date.now()}`,
          action: 'Listing Soft Delete',
          oldValue: 'Active',
          newValue: 'isDeleted = true',
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString()
        };
        return { ...p, isDeleted: true, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const updateProfessionalStatus = (profId, status) => {
    setProfessionals(prev => prev.map(p => {
      if (p.id === profId) {
        const oldStatus = p.status;
        const log = {
          id: `log-${Date.now()}`,
          action: 'Status Change',
          oldValue: oldStatus,
          newValue: status,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString()
        };
        return { ...p, status, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const updateProfessionalDocumentStatus = (profId, docId, status, notes) => {
    setProfessionals(prev => prev.map(p => {
      if (p.id === profId) {
        const updatedDocs = (p.documents || []).map(d => {
          if (d.id === docId) {
            return { ...d, status, notes: notes || d.notes };
          }
          return d;
        });
        const log = {
          id: `log-${Date.now()}`,
          action: 'Document Review',
          oldValue: `Doc ${docId} Status`,
          newValue: `Status: ${status}, Notes: ${notes || 'N/A'}`,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString()
        };
        return { ...p, documents: updatedDocs, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const resolveProfessionalComplaint = (profId, complaintId, status, notes) => {
    setProfessionals(prev => prev.map(p => {
      if (p.id === profId) {
        const updatedComplaints = (p.complaints || []).map(c => {
          if (c.id === complaintId) {
            return { ...c, status, notes: notes || c.notes };
          }
          return c;
        });
        const log = {
          id: `log-${Date.now()}`,
          action: 'Complaint Resolution',
          oldValue: `Complaint ${complaintId} Status`,
          newValue: `Status: ${status}, Notes: ${notes || 'N/A'}`,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString()
        };
        return { ...p, complaints: updatedComplaints, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const sendCommunityNotification = (notifData) => {
    const newLog = {
      ...notifData,
      id: `nlog-${Date.now()}`,
      communityId: currentUser?.communityId || 'c1',
      status: notifData.scheduledTime ? 'Queued' : 'Delivered',
      stats: { sentCount: 120, openCount: 0, clickCount: 0 },
      createdBy: currentUser?.name || 'Admin',
      createdTime: new Date().toISOString(),
      isPinned: false
    };
    setSentNotifications(prev => [newLog, ...prev]);

    // Also push to member notifications tray if sent immediately
    if (!notifData.scheduledTime) {
      const newTrayNotif = {
        id: `n-${Date.now()}`,
        type: notifData.type.toLowerCase().replace(' ', '_'),
        title: notifData.title,
        message: notifData.message,
        time: 'Just now',
        isRead: false
      };
      setNotifications(prev => [newTrayNotif, ...prev]);
    }
  };

  const cancelScheduledNotification = (logId) => {
    setSentNotifications(prev => prev.map(log => {
      if (log.id === logId && log.status === 'Queued') {
        return { ...log, status: 'Failed', message: `${log.message} (Cancelled by Admin)` };
      }
      return log;
    }));
  };

  const retryFailedNotification = (logId) => {
    setSentNotifications(prev => prev.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          status: 'Delivered',
          stats: { ...log.stats, sentCount: log.stats.sentCount || 120, openCount: Math.floor((log.stats.sentCount || 120) * 0.8) }
        };
      }
      return log;
    }));
  };

  const deleteNotificationLog = (logId) => {
    setSentNotifications(prev => prev.filter(log => log.id !== logId));
  };

  const addNotificationTemplate = (tplData) => {
    const newTpl = {
      ...tplData,
      id: `tpl-${Date.now()}`,
      createdBy: currentUser?.name || 'Admin'
    };
    setNotificationTemplates(prev => [...prev, newTpl]);
  };

  const updateNotificationTemplate = (tplId, updatedData) => {
    setNotificationTemplates(prev => prev.map(t => t.id === tplId ? { ...t, ...updatedData } : t));
  };

  const deleteNotificationTemplate = (tplId) => {
    setNotificationTemplates(prev => prev.filter(t => t.id !== tplId));
  };

  const togglePinNotificationLog = (logId) => {
    setSentNotifications(prev => prev.map(log => {
      if (log.id === logId) {
        return { ...log, isPinned: !log.isPinned };
      }
      return log;
    }));
  };

  const updateMatrimonialProfileStatus = (profileId, status, reason) => {
    setMatrimonialProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const oldStatus = p.status;
        const log = {
          id: `log-${Date.now()}`,
          action: 'Status Change',
          oldStatus,
          newStatus: status,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          reason: reason || 'Status transition update'
        };
        return { ...p, status, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const updateMatrimonialProfileDocumentStatus = (profileId, docId, status, notes) => {
    setMatrimonialProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const updatedDocs = (p.documents || []).map(d => d.id === docId ? { ...d, status, notes } : d);
        const log = {
          id: `log-${Date.now()}`,
          action: 'Document Verification',
          oldStatus: `Doc ${docId} Status`,
          newStatus: status,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          reason: notes || 'Document verification update'
        };
        return { ...p, documents: updatedDocs, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const resolveMatrimonialComplaint = (profileId, complaintId, status, notes) => {
    setMatrimonialProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const updatedComplaints = (p.complaints || []).map(c => c.id === complaintId ? { ...c, status, notes } : c);
        const log = {
          id: `log-${Date.now()}`,
          action: 'Complaint Resolution',
          oldStatus: `Complaint ${complaintId} Status`,
          newStatus: status,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          reason: notes || 'Complaint closure update'
        };
        return { ...p, complaints: updatedComplaints, auditLogs: [log, ...(p.auditLogs || [])] };
      }
      return p;
    }));
  };

  const updateMatrimonialProfile = (profileId, updatedData) => {
    setMatrimonialProfiles(prev => prev.map(p => {
      if (p.id === profileId) {
        const merged = { ...p, ...updatedData };
        const log = {
          id: `log-${Date.now()}`,
          action: 'Profile Moderation',
          oldStatus: 'Active',
          newStatus: 'Moderated details updated',
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
          reason: 'Profile content moderation'
        };
        merged.auditLogs = [log, ...(merged.auditLogs || [])];
        return merged;
      }
      return p;
    }));
  };

  const toggleEventBookmark = async (eventId) => {
    try {
      const res = await eventService.toggleBookmark(eventId);
      setEvents(prev => prev.map(ev => {
        if (ev.id === eventId || ev._id === eventId) {
          return { ...ev, isBookmarked: res.data.isBookmarked };
        }
        return ev;
      }));
      return res.data.isBookmarked;
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const value = {
    currentUser,
    loginUser,
    logoutUser,
    updateProfile,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    members: adaptedMembersList,
    admins: adaptedAdminsList,
    posts: adaptedPostsList,
    events,
    eventsLoading,
    eventsError,
    loadEvents,
    verifyMember,
    rejectMember,
    addEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    updateRegistrationStatus,
    updateAttendanceStatus,
    uploadGalleryItem,
    deleteGalleryItem,
    addEventAnnouncement,
    professionals,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    updateProfessionalStatus,
    updateProfessionalDocumentStatus,
    resolveProfessionalComplaint,
    sentNotifications,
    notificationTemplates,
    sendCommunityNotification,
    cancelScheduledNotification,
    retryFailedNotification,
    deleteNotificationLog,
    addNotificationTemplate,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    togglePinNotificationLog,
    rawMatrimonialProfiles: matrimonialProfiles,
    updateMatrimonialProfileStatus,
    updateMatrimonialProfileDocumentStatus,
    resolveMatrimonialComplaint,
    updateMatrimonialProfile,
    matrimonialProfiles: adaptedMatrimonialList,
    updateProfile,
    loginUser,
    logoutUser,
    addFamilyMember,
    deleteFamilyMember,
    updateFamilyMember,
    createPost,
    fetchFeedPosts,
    fetchStoriesList,
    toggleEventRSVP,
    toggleEventInterest,
    togglePostLike,
    togglePostSave,
    addPostComment,
    fetchPostComments,
    recordPostView,
    addCommentReply,
    toggleCommentLike,
    followedAnnouncements,
    toggleFollowedAnnouncement,
    // NOTE: addMatrimonialProfile, toggleMatrimonialInterest, handleMatrimonialInterestResponse REMOVED.
    // Use matrimonialInterestService and matrimonialProfileService (real API) directly.
    updateMatrimonialBio,
    chats,
    chatMessages,
    getOrCreateChat,
    sendChatMessage,
    invitations,
    createInvitation,
    addInvitesToInvitation,
    updateInvitationRSVP,
    trackInvitationOpened,
    updateInvitationStatus,
    updateInvitation,
    deleteInvitation,
    invitationFormConfig,
    updateInvitationConfig,
    obituaries,
    obituariesLoading,
    obituariesError,
    loadObituaries,
    hasMoreObituaries,
    loadMoreObituaries,
    addObituary,
    updateObituary,
    updateObituaryStatus,
    deleteObituary,
    toggleObituaryShraddhanjali,
    addObituaryComment,
    toggleHaathJode,
    toggleMalaArpan,
    incrementMalaArpan,
    saveShradhanjali,
    shareShradhanjali,
    incrementObituaryViews,
    likeObituaryComment,
    resetAllData,
    language,
    setLanguage,
    groups: adaptedGroupsList,
    groupMessages: adaptedGroupMessagesMap,
    notifications: adaptedNotificationsList,
    joinGroup,
    leaveGroup,
    toggleGroupMute,
    sendGroupMessage,
    createGroup,
    markAllNotificationsRead,
    addNotification,
    getNotificationsForModule,
    getUnreadCountForModule,
    getNotificationModule,
    updateGroupDetails,
    reactToGroupMessage,
    clearChatMessages,
    stories: adaptedStoriesList,
    addStory,

    // Follow System & Privacy Exports
    profilePrivacy,
    followRelations,
    blockedUsers,
    granularPrivacy,
    sendFollowRequest,
    cancelFollowRequest,
    acceptFollowRequest,
    rejectFollowRequest,
    unfollowUser,
    removeFollower,
    updateProfilePrivacy,
    updateGranularPrivacy,
    blockUser,
    unblockUser,

    // Event Reminders
    eventReminders,
    toggleEventReminder: async (eventId) => {
      try {
        const res = await eventService.toggleReminder(eventId);
        setEventReminders(prev => ({
          ...prev,
          [eventId]: res.data.isReminderSet
        }));
        setEvents(prev => prev.map(ev => {
          if (ev.id === eventId || ev._id === eventId) {
            return { ...ev, isReminderSet: res.data.isReminderSet };
          }
          return ev;
        }));
      } catch (error) {
        console.error('Failed to toggle reminder:', error);
      }
    },

    // Event RSVP Registrations with Optimistic UI updates
    eventRegistrations,
    toggleEventRSVP: async (eventId) => {
      // 1. Optimistic UI update
      setEvents(prev => prev.map(ev => {
        if (ev.id === eventId || ev._id === eventId) {
          const nextState = !ev.isRegistered;
          const delta = nextState ? 1 : -1;
          return {
            ...ev,
            isRegistered: nextState,
            attendees: Math.max(0, (ev.attendees || 0) + delta),
            goingCount: Math.max(0, (ev.goingCount || 0) + delta)
          };
        }
        return ev;
      }));

      try {
        const res = await eventService.toggleAttend(eventId);
        if (res && res.data) {
          setEvents(prev => prev.map(ev => {
            if (ev.id === eventId || ev._id === eventId) {
              return { ...ev, isRegistered: res.data.isRegistered, attendees: res.data.attendeesCount, goingCount: res.data.attendeesCount };
            }
            return ev;
          }));
        }
      } catch (error) {
        console.error('Failed to toggle event RSVP, rolling back:', error);
        // Rollback on error
        setEvents(prev => prev.map(ev => {
          if (ev.id === eventId || ev._id === eventId) {
            const prevState = !ev.isRegistered;
            const delta = prevState ? 1 : -1;
            return {
              ...ev,
              isRegistered: prevState,
              attendees: Math.max(0, (ev.attendees || 0) + delta),
              goingCount: Math.max(0, (ev.goingCount || 0) + delta)
            };
          }
          return ev;
        }));
      }
    },
    registerForEvent: async (eventId, registrationData) => {
      try {
        const res = await eventService.toggleAttend(eventId);
        setEventRegistrations(prev => ({
          ...prev,
          [eventId]: { ...registrationData, registeredAt: new Date().toISOString() }
        }));
        setEvents(prev => prev.map(ev => {
          if (ev.id === eventId || ev._id === eventId) {
            return { ...ev, isRegistered: res.data.isRegistered, attendees: res.data.attendeesCount };
          }
          return ev;
        }));
      } catch (error) {
        console.error('Failed to register for event:', error);
      }
    },
    cancelEventRegistration: async (eventId) => {
      try {
        const res = await eventService.toggleAttend(eventId);
        setEventRegistrations(prev => {
          const updated = { ...prev };
          delete updated[eventId];
          return updated;
        });
        setEvents(prev => prev.map(ev => {
          if (ev.id === eventId || ev._id === eventId) {
            return { ...ev, isRegistered: res.data.isRegistered, attendees: res.data.attendeesCount };
          }
          return ev;
        }));
      } catch (error) {
        console.error('Failed to cancel event registration:', error);
      }
    },
    toggleEventBookmark,

    // Survey Responses
    surveyResponses,
    submitSurveyAnswer: (surveyId, questionId, answer) => {
      setSurveyResponses(prev => ({
        ...prev,
        [surveyId]: { ...(prev[surveyId] || {}), [questionId]: answer }
      }));
    },
    submitFullSurvey: (surveyId, answersMap) => {
      setSurveyResponses(prev => ({
        ...prev,
        [surveyId]: { ...answersMap, submittedAt: new Date().toISOString() }
      }));
    },

    // Mobile Menu
    isMobileMenuOpen,
    setMobileMenuOpen,

    // Invitation Form Configuration
    invitationFormConfig,
    updateInvitationConfig,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
