import React, { useState, useRef } from 'react';
import {
  ArrowLeft, Phone, Video, Search, Bell,
  Image as ImageIcon, FileText, ChevronRight,
  Camera, Ban, Trash2, X, Check, Pencil, Edit3,
  User, ShieldCheck, MapPin, Mail, Sparkles, Loader2, ExternalLink,
  Mic, UserCheck, AlertCircle
} from 'lucide-react';
import { LiveCameraModal } from './LiveCameraModal';

const WHATSAPP_STATUS_PRESETS = [
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'At the movies',
  'At school',
  'Battery about to die',
  "Can't talk, WhatsApp only",
  'At the gym',
  'Sleeping',
  'Urgent calls only'
];

export const WhatsAppContactProfileModal = ({
  contact,
  messages = [],
  isMuted = false,
  onToggleMute,
  onClearChat,
  onDeleteChat,
  onOpenSearch,
  onOpenWallpaper,
  onImageClick,
  onClose,
  currentUser,
  onUpdateOwnProfile
}) => {
  const [viewMode, setViewMode] = useState(
    contact?._id === currentUser?._id || contact?._id === currentUser?.id ? 'myProfile' : 'contact'
  ); // 'contact' | 'myProfile'

  const [activeMediaTab, setActiveMediaTab] = useState('media'); // 'media' | 'docs' | 'voice'
  
  // Edit states for user profile
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState(currentUser?.name || '');
  
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState(
    currentUser?.about || currentUser?.bio || 'Available'
  );

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [avatarToView, setAvatarToView] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const avatarFileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Shared media from conversation
  const sharedPhotos = messages.filter(m => m.type === 'image' && m.mediaUrl && !m.isDeleted);
  const sharedDocs   = messages.filter(m => m.type === 'file' && !m.isDeleted);
  const sharedAudio  = messages.filter(m => (m.type === 'audio' || m.type === 'voice') && m.mediaUrl && !m.isDeleted);

  const isContactOwner = currentUser && (contact?._id === currentUser._id || contact?._id === currentUser.id);
  const activeProfile = viewMode === 'myProfile' || isContactOwner ? currentUser : contact;

  // Save Name handler
  const handleSaveName = async () => {
    if (!nameText.trim() || nameText.trim() === currentUser?.name) {
      setIsEditingName(false);
      return;
    }
    setIsUpdating(true);
    try {
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({ name: nameText.trim() });
        showToast('Name updated successfully');
      }
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
      showToast('Failed to update name');
    } finally {
      setIsUpdating(false);
    }
  };

  // Save About / Status handler
  const handleSaveAbout = async (newAbout) => {
    const textToSave = (newAbout !== undefined ? newAbout : aboutText).trim();
    if (!textToSave) return;
    setIsUpdating(true);
    try {
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({ about: textToSave, bio: textToSave });
        setAboutText(textToSave);
        showToast('Status updated');
      }
      setIsEditingAbout(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Avatar file upload from gallery
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarMenu(false);
    setIsUpdating(true);
    try {
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({ avatarFile: file });
        showToast('Profile photo updated');
      }
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      showToast('Failed to update profile photo');
    } finally {
      setIsUpdating(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Avatar capture from Live Camera
  const handleCameraCapture = async (file) => {
    setShowLiveCamera(false);
    setShowAvatarMenu(false);
    if (!file) return;
    setIsUpdating(true);
    try {
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({ avatarFile: file });
        showToast('Profile photo updated');
      }
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      showToast('Failed to update profile photo');
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove profile photo
  const handleRemoveAvatar = async () => {
    setShowAvatarMenu(false);
    if (!window.confirm('Remove current profile photo?')) return;
    setIsUpdating(true);
    try {
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({ avatar: '' });
        showToast('Profile photo removed');
      }
    } catch (err) {
      console.error('Failed to remove photo:', err);
      showToast('Failed to remove photo');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-[#f0f2f5] overflow-hidden animate-slide-in-right"
      style={{ touchAction: 'pan-y' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={avatarFileInputRef}
        accept="image/*"
        onChange={handleAvatarFileSelect}
        className="hidden"
      />

      {/* Live Camera Modal for Profile Photo */}
      {showLiveCamera && (
        <LiveCameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowLiveCamera(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[250] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[13px] font-bold shadow-xl animate-fade-in flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER BAR (WhatsApp Style) ── */}
      <div 
        className="bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 hover:bg-purple-50 transition-colors press-scale"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="font-black text-[17px] text-slate-900 leading-tight">
              {viewMode === 'myProfile' ? 'My Profile' : 'Contact Info'}
            </h2>
            <p className="text-[11px] font-bold text-slate-400">
              {viewMode === 'myProfile' ? 'Edit & Customize' : contact?.name || 'User'}
            </p>
          </div>
        </div>

        {/* Mode Switcher pill */}
        {!isContactOwner && (
          <button
            onClick={() => {
              setViewMode(prev => prev === 'contact' ? 'myProfile' : 'contact');
              setNameText(currentUser?.name || '');
              setAboutText(currentUser?.about || currentUser?.bio || 'Available');
            }}
            className="px-3 py-1.5 rounded-full text-[12px] font-black bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors border border-purple-200"
          >
            {viewMode === 'contact' ? 'My Profile ✏️' : 'Contact Info 👤'}
          </button>
        )}
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto pb-12 space-y-3">

        {/* ── PROFILE HERO CARD ── */}
        <div className="bg-white flex flex-col items-center pt-8 pb-6 px-6 border-b border-slate-200/70 shadow-2xs text-center relative">
          
          {/* Avatar Container */}
          <div className="relative mb-3 group">
            <div 
              onClick={() => {
                if (activeProfile?.avatar) {
                  setAvatarToView(activeProfile.avatar);
                  setShowFullAvatar(true);
                } else if (viewMode === 'myProfile') {
                  setShowAvatarMenu(true);
                }
              }}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-gradient-to-tr from-purple-600 to-indigo-600 border-4 border-white shadow-xl flex items-center justify-center cursor-pointer hover:opacity-95 transition-transform press-scale relative"
            >
              {activeProfile?.avatar ? (
                <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-white">
                  {(activeProfile?.name || 'M').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* If viewing own profile: Camera Edit Button */}
            {viewMode === 'myProfile' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAvatarMenu(true);
                }}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center border-2 border-white hover:bg-purple-700 transition-transform press-scale"
                title="Change Profile Photo"
              >
                <Camera size={18} />
              </button>
            )}

            {/* Quick full view icon if contact avatar exists */}
            {viewMode === 'contact' && activeProfile?.avatar && (
              <button
                onClick={() => {
                  setAvatarToView(activeProfile.avatar);
                  setShowFullAvatar(true);
                }}
                className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-white p-2 rounded-full shadow-md hover:bg-black/80"
                title="View Photo"
              >
                <Search size={14} />
              </button>
            )}
          </div>

          {/* User Name & Community */}
          {viewMode === 'myProfile' ? (
            <div className="w-full max-w-sm">
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={nameText}
                    onChange={e => setNameText(e.target.value)}
                    maxLength={35}
                    placeholder="Enter your name"
                    className="flex-1 bg-slate-50 border border-purple-300 rounded-xl px-3 py-2 text-[16px] font-bold text-slate-900 outline-none focus:bg-white text-center"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isUpdating}
                    className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-[21px] font-black text-slate-900 leading-snug">{activeProfile?.name || 'Your Name'}</h1>
                  <button
                    onClick={() => {
                      setNameText(currentUser?.name || '');
                      setIsEditingName(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 p-1 rounded-lg hover:bg-purple-50"
                    title="Edit Name"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <h1 className="text-[21px] font-black text-slate-900 leading-snug">{activeProfile?.name || 'Community Member'}</h1>
          )}

          <p className="text-[13px] font-extrabold text-purple-600 mt-1 flex items-center justify-center gap-1.5">
            <span>{activeProfile?.role || 'Community Member'}</span>
            {activeProfile?.communityId?.name && <span>• {activeProfile.communityId.name}</span>}
          </p>

          {activeProfile?.phone && (
            <p className="text-[13px] font-bold text-slate-500 mt-0.5">
              📞 {activeProfile.phone}
            </p>
          )}

          {/* Quick Action Icons in Contact Mode */}
          {viewMode === 'contact' && (
            <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-slate-100 w-full max-w-xs">
              <button
                onClick={() => {
                  onClose();
                  onOpenSearch?.();
                }}
                className="flex flex-col items-center gap-1.5 text-slate-700 hover:text-purple-600 transition-colors press-scale"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs border border-purple-100/60">
                  <Search size={19} />
                </div>
                <span className="text-[11.5px] font-extrabold">Search</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenWallpaper?.();
                }}
                className="flex flex-col items-center gap-1.5 text-slate-700 hover:text-purple-600 transition-colors press-scale"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs border border-indigo-100/60">
                  <Sparkles size={19} />
                </div>
                <span className="text-[11.5px] font-extrabold">Wallpaper</span>
              </button>
            </div>
          )}
        </div>

        {/* ── ABOUT / STATUS SECTION (WhatsApp Style) ── */}
        <div className="bg-white px-5 py-4 border-y border-slate-200/70 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11.5px] font-black text-slate-400 uppercase tracking-wider">
              {viewMode === 'myProfile' ? 'About / Status' : 'About'}
            </p>
            {viewMode === 'myProfile' && !isEditingAbout && (
              <button 
                onClick={() => {
                  setAboutText(currentUser?.about || currentUser?.bio || 'Available');
                  setIsEditingAbout(true);
                }}
                className="text-purple-600 text-[12px] font-extrabold flex items-center gap-1 hover:underline"
              >
                <Pencil size={13} /> Edit Status
              </button>
            )}
          </div>

          {viewMode === 'myProfile' && isEditingAbout ? (
            <div className="flex flex-col gap-3 mt-1">
              <div className="relative">
                <input
                  type="text"
                  value={aboutText}
                  onChange={e => setAboutText(e.target.value)}
                  maxLength={139}
                  placeholder="Set your status..."
                  className="w-full bg-slate-50 border border-purple-300 rounded-xl px-3.5 py-2.5 text-[14.5px] font-bold text-slate-800 outline-none focus:bg-white pr-14"
                  autoFocus
                />
                <span className="absolute right-3 top-3 text-[11px] font-bold text-slate-400">
                  {139 - aboutText.length}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditingAbout(false)}
                  className="px-3.5 py-1.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveAbout()}
                  disabled={isUpdating || !aboutText.trim()}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[12.5px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                </button>
              </div>

              {/* Standard WhatsApp Status Presets */}
              <div className="mt-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Select About Preset
                </p>
                <div className="space-y-1">
                  {WHATSAPP_STATUS_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSaveAbout(preset)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        aboutText === preset ? 'bg-purple-50 text-purple-700 font-black' : 'hover:bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <span className="text-[13.5px]">{preset}</span>
                      {aboutText === preset && <Check size={16} className="text-purple-600" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[15px] font-bold text-slate-800 leading-relaxed">
              {activeProfile?.about || activeProfile?.bio || 'Available'}
            </p>
          )}
        </div>

        {/* ── SHARED MEDIA, LINKS & DOCS (Visible in Contact Mode or when messages exist) ── */}
        <div className="bg-white border-y border-slate-200/70 shadow-2xs">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-purple-600" />
              <p className="text-[14px] font-black text-slate-900">Media, Links & Docs</p>
            </div>
            <span className="text-[12.5px] font-extrabold text-slate-400">
              {sharedPhotos.length + sharedDocs.length + sharedAudio.length}
            </span>
          </div>

          {/* Media Tabs */}
          <div className="flex border-b border-slate-100 px-4 bg-slate-50/50">
            {[
              { id: 'media', label: `Photos (${sharedPhotos.length})` },
              { id: 'docs', label: `Docs (${sharedDocs.length})` },
              { id: 'voice', label: `Voice (${sharedAudio.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveMediaTab(tab.id)}
                className={`py-2.5 px-3.5 text-[12px] font-black border-b-2 transition-all ${
                  activeMediaTab === tab.id
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeMediaTab === 'media' && (
              sharedPhotos.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {sharedPhotos.map(m => (
                    <div 
                      key={m._id}
                      onClick={() => onImageClick?.(m.mediaUrl, m.message)}
                      className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 shadow-2xs border border-slate-200/70"
                    >
                      <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400 text-[13px] font-semibold">No shared photos yet</p>
              )
            )}

            {activeMediaTab === 'docs' && (
              sharedDocs.length > 0 ? (
                <div className="space-y-2">
                  {sharedDocs.map(m => (
                    <a
                      key={m._id}
                      href={m.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="flex items-center gap-3 p-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-200/80 transition-colors"
                    >
                      <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-extrabold text-slate-800 truncate">{m.message || 'Document'}</p>
                        <span className="text-[11px] text-purple-600 font-bold flex items-center gap-1">Download file <ExternalLink size={10} /></span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400 text-[13px] font-semibold">No shared documents yet</p>
              )
            )}

            {activeMediaTab === 'voice' && (
              sharedAudio.length > 0 ? (
                <div className="space-y-2">
                  {sharedAudio.map(m => (
                    <div key={m._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <audio src={m.mediaUrl} controls className="w-full h-8" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-slate-400 text-[13px] font-semibold">No voice notes recorded yet</p>
              )
            )}
          </div>
        </div>

        {/* ── SETTINGS & CHAT ACTIONS (Contact Mode) ── */}
        {viewMode === 'contact' && (
          <>
            <div className="bg-white border-y border-slate-200/70 shadow-2xs divide-y divide-slate-100">
              <div 
                onClick={onToggleMute}
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Bell size={19} className="text-slate-500" />
                  <span className="text-[14.5px] font-bold text-slate-800">Mute notifications</span>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors ${isMuted ? 'bg-purple-600' : 'bg-slate-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${isMuted ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>

            {/* Danger Zone: Clear & Delete */}
            <div className="bg-white border-y border-slate-200/70 shadow-2xs divide-y divide-slate-100">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all messages in this chat?')) {
                    onClearChat?.();
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3.5 px-5 py-3.5 text-rose-600 hover:bg-rose-50/50 transition-colors text-left font-extrabold text-[14px]"
              >
                <Trash2 size={19} />
                <span>Clear Chat</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Delete this entire conversation?')) {
                    onDeleteChat?.();
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-3.5 px-5 py-3.5 text-rose-600 hover:bg-rose-50/50 transition-colors text-left font-extrabold text-[14px]"
              >
                <Ban size={19} />
                <span>Delete Conversation</span>
              </button>
            </div>
          </>
        )}

      </div>

      {/* ── AVATAR EDIT ACTION SHEET ── */}
      {showAvatarMenu && (
        <div 
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
          onClick={() => setShowAvatarMenu(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 space-y-4 shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-[17px] font-black text-slate-900 text-center">Profile photo</h3>
            
            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAvatarMenu(false);
                  setShowLiveCamera(true);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors press-scale"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Camera size={22} />
                </div>
                <span className="text-[13px] font-black">Camera</span>
              </button>

              <button
                onClick={() => {
                  avatarFileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors press-scale"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ImageIcon size={22} />
                </div>
                <span className="text-[13px] font-black">Gallery</span>
              </button>

              <button
                onClick={handleRemoveAvatar}
                disabled={!currentUser?.avatar}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors press-scale disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                  <Trash2 size={22} />
                </div>
                <span className="text-[13px] font-black">Remove</span>
              </button>
            </div>

            <button
              onClick={() => setShowAvatarMenu(false)}
              className="w-full py-3 text-center text-slate-600 font-extrabold text-[14px] bg-slate-100 hover:bg-slate-200 rounded-2xl mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── FULL SCREEN AVATAR LIGHTBOX ── */}
      {showFullAvatar && avatarToView && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-between p-4 animate-fade-in"
          onClick={() => setShowFullAvatar(false)}
        >
          <div className="w-full flex items-center justify-between pt-2">
            <span className="text-white font-black text-[16px]">{activeProfile?.name || 'Profile Photo'}</span>
            <button 
              onClick={() => setShowFullAvatar(false)}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
          <img 
            src={avatarToView} 
            alt={activeProfile?.name || 'Avatar'} 
            className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
          />
          <div className="pb-4" />
        </div>
      )}
    </div>
  );
};

export default WhatsAppContactProfileModal;
