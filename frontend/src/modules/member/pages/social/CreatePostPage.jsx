import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Camera, X, Send, Mic, Radio, Users, 
  Heart, Sparkles, Folder, Layers, ImagePlus, UploadCloud, Play, 
  Trash2, Monitor, Smartphone, Link, AlertCircle 
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';

const Instagram = (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || "24"}
    height={props.size || "24"}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Youtube = (props) => (
  <svg
    viewBox="0 0 24 24"
    width={props.size || "24"}
    height={props.size || "24"}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);



const CreatePostPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { createPost, currentUser, addStory } = useData();

  const createStoryMode = location.state?.createStoryMode || false;

  // Tabs: 'post' | 'story'
  const [activeTab, setActiveTab] = useState(createStoryMode ? 'story' : 'post');

  // Input states
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Normal');
  const [isPinned, setIsPinned] = useState(false);
  const [feedType, setFeedType] = useState('city');
  const [locationInput, setLocationInput] = useState(currentUser?.city || '');
  
  // Media attachments: array of { type: 'image'|'video'|'youtube'|'instagram', url: string, file?: File }
  const [attachments, setAttachments] = useState([]);
  const [mediaLink, setMediaLink] = useState('');
  
  // Story specific states
  const [storyText, setStoryText] = useState('');

  // Upload emulation
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Auto detect pasted media link format
  useEffect(() => {
    if (!mediaLink.trim()) return;

    const link = mediaLink.trim();
    let type = 'image';
    let cleanUrl = link;

    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      type = 'youtube';
    } else if (link.includes('instagram.com/')) {
      type = 'instagram';
    } else if (link.match(/\.(mp4|webm|ogg|mov)$/i) || link.includes('video')) {
      type = 'video';
    } else {
      type = 'image'; // default fallback for raw image links
    }

    // Add media attachment
    if (activeTab === 'story') {
      // Story allows exactly 1 media attachment
      setAttachments([{ type, url: cleanUrl }]);
    } else {
      setAttachments(prev => [...prev, { type, url: cleanUrl }]);
    }

    setMediaLink('');
  }, [mediaLink, activeTab]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  // Handle uploaded files (images, videos, gifs)
  const handleFiles = (files) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Emulate progress bar
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsUploading(false), 200);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    files.forEach(file => {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result;
        const item = { type, url, file };
        if (activeTab === 'story') {
          setAttachments([item]);
        } else {
          setAttachments(prev => [...prev, item]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handlePublish = async () => {
    const mediaUrls = attachments.map(att => att.url);

    if (activeTab === 'post') {
      if (!caption.trim() && mediaUrls.length === 0) return;

      const payloadOptions = {
        title: `${category} Update`,
        category,
        city: locationInput.trim() || currentUser?.city || 'Indore',
        audience: 'all',
        likes: [],
        comments: [],
        images: mediaUrls, // arrays of images/videos/links are stored here
        feedType,
        isPinned,
      };

      try {
        await createPost(caption.trim() || "Shared media", mediaUrls, payloadOptions);
        navigate(-1);
      } catch (err) {
        alert(`Post creation failed: ${err.message}`);
      }
    } else if (activeTab === 'story') {
      // storyBg is either the media attachment URL, or default background gradient
      const storyBg = attachments.length > 0 ? attachments[0].url : 'linear-gradient(135deg, #f472b6 0%, #7c3aed 100%)';
      addStory(storyBg, storyText.trim());
      navigate(-1);
    }
  };

  // Extract YouTube ID for embed preview
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regExp);
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
    try {
      const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(fullUrl);
      if (parsed.searchParams.has('v')) {
        return `https://www.youtube-nocookie.com/embed/${parsed.searchParams.get('v')}?rel=0&modestbranding=1`;
      }
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (parsed.hostname.includes('youtu.be') && pathParts.length > 0) {
        return `https://www.youtube-nocookie.com/embed/${pathParts[0]}?rel=0&modestbranding=1`;
      }
      if (['shorts', 'live', 'embed', 'v'].includes(pathParts[0]) && pathParts.length > 1) {
        return `https://www.youtube-nocookie.com/embed/${pathParts[1]}?rel=0&modestbranding=1`;
      }
    } catch (e) {}
    return '';
  };

  const categories = ['Normal', 'Announcement', 'Event', 'Blood Donation', 'Emergency'];

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-slate-800 select-none pb-8 md:pb-0 font-sans">
      
      {/* Hidden File Upload Element */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*,video/*" 
        multiple={activeTab === 'post'} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* HEADER SECTION — Glassmorphism & Centered Width */}
      <header className="h-14 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40 shrink-0 shadow-xs">
        <div className="max-w-5xl mx-auto h-full px-3.5 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => navigate(-1)} 
              className="w-9 h-9 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 flex items-center justify-center text-slate-700 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>
            <div className="min-w-0">
              <h1 className="font-extrabold text-[15px] sm:text-[17px] tracking-tight text-slate-900 truncate leading-tight">
                {activeTab === 'post' ? 'Create Post' : 'Create Story'}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold truncate hidden xs:block">
                {activeTab === 'post' ? 'Share update to community' : 'Share 24h photo or video'}
              </p>
            </div>
          </div>

          {/* Action: Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isUploading || (activeTab === 'post' && !caption.trim() && attachments.length === 0)}
            className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-[13px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
              isUploading || (activeTab === 'post' && !caption.trim() && attachments.length === 0)
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-purple-500/25 hover:brightness-105'
            }`}
          >
            <Send size={13} strokeWidth={2.2} />
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE — Responsive 2-Column on Web, Clean Single Column on Mobile */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ─── LEFT / MAIN COLUMN (EDITOR) ─── */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            
            {/* Segmented Mode Toggle (Post vs Story) */}
            <div className="bg-slate-200/70 p-1 rounded-2xl flex items-center gap-1 border border-slate-300/40 shadow-inner">
              <button
                type="button"
                onClick={() => { setActiveTab('post'); setAttachments([]); }}
                className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'post'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles size={14} className={activeTab === 'post' ? 'text-purple-600' : 'text-slate-400'} />
                <span>Feed Post</span>
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveTab('story'); setAttachments([]); }}
                className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-[13px] font-extrabold transition-all cursor-pointer ${
                  activeTab === 'story'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera size={14} className={activeTab === 'story' ? 'text-purple-600' : 'text-slate-400'} />
                <span>24h Story</span>
              </button>
            </div>

            {/* Context / Scope Ribbon */}
            <div className="bg-white border border-slate-200/70 rounded-2xl py-2 px-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11.5px] font-bold text-slate-700 truncate">
                  📍 {currentUser?.city || 'Indore'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-semibold text-purple-600 truncate">
                  {activeTab === 'post' ? 'Samaj Public Feed' : '24 Hours Status'}
                </span>
              </div>

              <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase shrink-0">
                {activeTab === 'post' ? 'Public' : 'Story'}
              </span>
            </div>

            {/* Post Content Area */}
            {activeTab === 'post' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
                
                {/* Creator details */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-[13px] flex items-center justify-center border-2 border-white shadow-xs overflow-hidden shrink-0">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.initials || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-slate-900 leading-tight truncate">{currentUser?.name || 'Community Member'}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Sharing to Samaj Feed</p>
                  </div>
                </div>

                {/* Caption Text Box */}
                <textarea
                  placeholder="What's on your mind? Share news, events, or announcements..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-[13.5px] font-medium text-slate-800 placeholder-slate-400 outline-none h-28 sm:h-32 resize-none leading-relaxed transition-all focus:border-purple-500/50 focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                />

                {/* Category Options */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-0.5">Post Category</label>
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {categories.map(cat => {
                      const isSelected = category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer ${
                            isSelected 
                              ? 'border-purple-500 bg-purple-600 text-white shadow-xs'
                              : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pin Options */}
                {['Announcement', 'Emergency', 'Event'].includes(category) && (
                  <div className="flex items-center gap-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl p-3">
                    <input 
                      type="checkbox" 
                      id="pinPost" 
                      checked={isPinned} 
                      onChange={(e) => setIsPinned(e.target.checked)} 
                      className="w-4 h-4 text-purple-600 rounded border-amber-300 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                    />
                    <label htmlFor="pinPost" className="text-xs font-bold text-amber-900 cursor-pointer">Pin post to top of community feed</label>
                  </div>
                )}

                {/* Target Audience */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-0.5">Target Audience</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100/90 rounded-2xl p-1 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setFeedType('city')}
                      className={`py-2 px-1 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer truncate ${
                        feedType === 'city' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📍 City
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedType('community')}
                      className={`py-2 px-1 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer truncate ${
                        feedType === 'community' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      👥 Samaj
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedType('both')}
                      className={`py-2 px-1 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer truncate ${
                        feedType === 'both' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🌐 Both
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Story Content Area */}
            {activeTab === 'story' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-[13px] flex items-center justify-center border-2 border-white shadow-xs overflow-hidden shrink-0">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.initials || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-slate-900 leading-tight truncate">{currentUser?.name || 'Community Member'}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Designing 24h story</p>
                  </div>
                </div>

                {/* Story Overlay Text Box */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-0.5">Story Overlay Text</label>
                  <textarea
                    placeholder="Type overlay text to show on your story..."
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-[13.5px] font-medium text-slate-800 placeholder-slate-400 outline-none h-24 resize-none leading-relaxed transition-all focus:border-purple-500/50 focus:bg-white focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>

              </div>
            )}

            {/* MEDIA UPLOAD AREA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">Attach Media & Content Links</label>

              {/* Drag Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging 
                    ? 'border-purple-500 bg-purple-50/40' 
                    : 'border-purple-200/70 bg-purple-50/20 hover:bg-purple-50/40'
                }`}
              >
                <div className="p-3 bg-white shadow-xs rounded-2xl text-purple-600 border border-purple-100">
                  <UploadCloud size={24} className="animate-bounce" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Upload photo, video, or GIF</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Drag & drop files or tap to browse</p>
                </div>
                <div className="flex gap-2.5 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider border-t border-purple-100/60 pt-2.5 mt-1 w-full justify-center">
                  <span>PNG, JPG, WEBP</span>
                  <span>•</span>
                  <span>MP4, WEBM</span>
                </div>
              </div>

              {/* Upload Progress Bar Emulation */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Uploading files...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                    <div className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* URL Paste Media Input */}
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block px-1">Paste Media or Social URL</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2">
                  <Link size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="YouTube link, Instagram link, or direct image URL..."
                    value={mediaLink}
                    onChange={(e) => setMediaLink(e.target.value)}
                    className="bg-transparent outline-none w-full text-xs text-slate-700 placeholder-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* List of attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Attachments ({attachments.length})</span>
                    {activeTab === 'story' && <span className="text-[9px] text-amber-600 font-semibold">Story mode: Max 1 media</span>}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 p-2.5 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-550 relative">
                            {att.type === 'image' && <img src={att.url} className="w-full h-full object-cover" alt="Thumbnail" />}
                            {att.type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><Play size={14} className="text-indigo-500" /></div>}
                            {att.type === 'youtube' && <Youtube size={16} className="text-rose-500" />}
                            {att.type === 'instagram' && <Instagram size={16} className="text-pink-500" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-800 truncate capitalize">{att.type} Source</p>
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">{att.url}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 active:scale-90 transition-all shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ─── RIGHT COLUMN (DESKTOP LIVE FEED PREVIEW) ─── */}
          <div className="hidden lg:block lg:col-span-5 sticky top-20 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-600" />
                Live Feed Preview
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Updates in real-time</span>
            </div>

            {/* Rendered Preview Card */}
            {activeTab === 'post' ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden transition-all">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border-2 border-white shadow-xs overflow-hidden shrink-0">
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        currentUser?.initials || 'U'
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight">{currentUser?.name || 'Community Member'}</h4>
                      <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                        📍 {locationInput || currentUser?.city || 'Indore'} • Just now
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                    {category}
                  </span>
                </div>

                {/* Post Body Caption */}
                <div className="p-4">
                  <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${caption ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {caption || "Your post description will appear here as you type..."}
                  </p>
                </div>

                {/* Post Media Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {attachments[0].type === 'image' && (
                      <img src={attachments[0].url} alt="Preview" className="w-full max-h-64 object-cover" />
                    )}
                    {attachments[0].type === 'video' && (
                      <div className="w-full h-48 bg-slate-900 flex items-center justify-center text-white">
                        <Play size={32} className="text-white/80" />
                      </div>
                    )}
                    {attachments[0].type === 'youtube' && getYoutubeEmbedUrl(attachments[0].url) && (
                      <div className="aspect-video w-full">
                        <iframe 
                          src={getYoutubeEmbedUrl(attachments[0].url)} 
                          title="YouTube preview"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Mock Social Interactions */}
                <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                      <Heart size={14} /> 0 Likes
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-purple-600 transition-colors">
                      💬 0 Comments
                    </span>
                  </div>
                  <span className="text-[11px] text-purple-600 font-bold uppercase">
                    Audience: {feedType === 'city' ? 'City' : feedType === 'community' ? 'Samaj' : 'Both'}
                  </span>
                </div>
              </div>
            ) : (
              /* Story Preview Card */
              <div 
                className="w-full h-80 rounded-3xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden border-2 border-purple-400/40 text-white"
                style={{
                  background: attachments.length > 0 && attachments[0].type === 'image' 
                    ? `url(${attachments[0].url}) center/cover` 
                    : 'linear-gradient(135deg, #f472b6 0%, #7c3aed 100%)'
                }}
              >
                {/* Dimmer overlay if image present */}
                {attachments.length > 0 && <div className="absolute inset-0 bg-black/35 pointer-events-none" />}

                <div className="relative z-10 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/20 shrink-0">
                    {currentUser?.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">U</div>}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white leading-tight drop-shadow">{currentUser?.name || 'You'}</p>
                    <p className="text-[9.5px] text-white/80 font-medium drop-shadow">24h Story</p>
                  </div>
                </div>

                <div className="relative z-10 text-center px-4">
                  <p className="font-extrabold text-base text-white drop-shadow-md whitespace-pre-wrap">
                    {storyText || "Story text overlay..."}
                  </p>
                </div>

                <div className="relative z-10 flex justify-between items-center text-[10px] text-white/80 font-semibold">
                  <span>📍 {currentUser?.city || 'Indore'}</span>
                  <span>Expires in 24h</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
};

export default CreatePostPage;
