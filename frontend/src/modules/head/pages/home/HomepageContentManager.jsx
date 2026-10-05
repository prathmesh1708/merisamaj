import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout, Image, Edit2, Link2, Plus, Trash2, Eye, MoveUp, MoveDown, CheckCircle,
  HelpCircle, Settings2, PlusCircle, AlertCircle, Save, Check, RefreshCw, Upload, X, MapPin, UploadCloud
} from 'lucide-react';
import { useData } from '../../../member/context/DataProvider';
import { useHeadAuth } from '../../auth/useHeadAuth';
import { useCommunitySettings } from '../settings/hooks/useCommunitySettings';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import * as LucideIcons from 'lucide-react';

export const HomepageContentManager = () => {
  const { currentUser } = useData();
  const { headAuth } = useHeadAuth();
  const headUser = headAuth?.headUser;
  const isLocalHead = headUser?.accountType === 'local_head' || headUser?.subHeadType === 'local';

  // Deriving isolated community ID
  const communityId = useMemo(() => {
    return headUser?.communityId || 
           headUser?.community?.toLowerCase().replace(/\s/g, '_') || 
           currentUser?.communityId || 
           currentUser?.community?.toLowerCase().replace(/\s/g, '_') || 
           'cm_123';
  }, [headUser, currentUser]);

  const {
    settings,
    loading,
    saving,
    hasUnsavedChanges,
    updateDraft,
    saveSettings,
    discardChanges
  } = useCommunitySettings(communityId);

  const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'features' | 'promotions'
  const [toast, setToast] = useState(null);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  
  // Modals / Editor States
  const [editingFeature, setEditingFeature] = useState(null);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [isAddingPromo, setIsAddingPromo] = useState(false);

  // New Promo form state
  const [newPromo, setNewPromo] = useState({
    title: '',
    desc: '',
    image: '',
    buttonText: '',
    buttonLink: '',
    enabled: true
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Local Head: per-city Home Hero Banner (separate from the community-wide
  // settings above — this is its own backend-persisted record, not localStorage) ───
  const [locBanner, setLocBanner] = useState({ backgroundImage: '', title: '', subtitle: '', buttonText: '', buttonLink: '/member/directory' });
  const [locBannerLoading, setLocBannerLoading] = useState(isLocalHead);
  const [locBannerFile, setLocBannerFile] = useState(null);
  const [locBannerPreview, setLocBannerPreview] = useState(null);
  const [locBannerDragging, setLocBannerDragging] = useState(false);
  const [locBannerSaving, setLocBannerSaving] = useState(false);
  const locBannerFileRef = useRef(null);

  useEffect(() => {
    if (!isLocalHead) return;
    (async () => {
      try {
        const res = await axiosPrivate.get('/head/app-content/location-hero');
        const data = res.data?.data;
        if (data) {
          setLocBanner({
            backgroundImage: data.backgroundImage || '',
            title: data.title || '',
            subtitle: data.subtitle || '',
            buttonText: data.buttonText || '',
            buttonLink: data.buttonLink || '/member/directory'
          });
        }
      } catch (err) {
        console.error('Failed to load location hero banner:', err);
      } finally {
        setLocBannerLoading(false);
      }
    })();
  }, [isLocalHead]);

  const handleLocBannerFile = (file) => {
    if (!file) return;
    setLocBannerFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLocBannerPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveLocationBanner = async (e) => {
    e.preventDefault();
    setLocBannerSaving(true);
    try {
      const fd = new FormData();
      if (locBannerFile) fd.append('bannerImage', locBannerFile);
      fd.append('title', locBanner.title);
      fd.append('subtitle', locBanner.subtitle);
      fd.append('buttonText', locBanner.buttonText);
      fd.append('buttonLink', locBanner.buttonLink);
      const res = await axiosPrivate.put('/head/app-content/location-hero', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data?.data;
      if (data?.backgroundImage) setLocBanner(prev => ({ ...prev, backgroundImage: data.backgroundImage }));
      setLocBannerFile(null);
      setLocBannerPreview(null);
      showToast(`Home banner for ${headUser?.city || 'your location'} updated successfully!`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update location banner');
    } finally {
      setLocBannerSaving(false);
    }
  };


  const handleSave = async () => {
    try {
      // 1. Sync bannerUrl to MongoDB via backend API
      const bannerUrl = homepageContent.hero?.backgroundImage || '';
      if (bannerUrl) {
        await axiosPrivate.put('/head/dashboard/community/banner', { bannerUrl });
      }

      // homepageContent (including any base64 image preview) is already
      // persisted properly below via saveSettings() -> the real backend API;
      // it must never be mirrored into localStorage, since a single base64
      // image can be several MB and blow the browser's 5-10MB quota, which
      // then breaks every other unrelated localStorage write on this origin
      // (including the admin/head login session itself).
      window.dispatchEvent(new Event('merisamaj_homepage_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to sync bannerUrl to MongoDB:', e);
    }

    const success = await saveSettings();
    showToast('Community banner and homepage settings saved live to database!');
  };

  // Helper to extract homepageContent safely with default structures
  const homepageContent = useMemo(() => {
    const defaultHero = {
      backgroundImage: '',
      title: 'Welcome to our Samaj Hub',
      subtitle: 'Connecting and empowering community members across the region.',
      buttonText: 'Directory Search',
      buttonLink: '/member/directory'
    };
    const defaultFeatures = [
      { id: 'professional', label: 'Professional Network', desc: 'Find jobs & hire within the community', path: '/member/professional', icon: 'Briefcase', displayOrder: 1, enabled: true },
      { id: 'directory', label: 'Directory', desc: 'Browse Samaj Members', path: '/member/directory', icon: 'BookOpen', displayOrder: 2, enabled: true },
      { id: 'groups', label: 'Groups', desc: 'Discussions', path: '/member/groups', icon: 'Users', displayOrder: 3, enabled: true },
      { id: 'voting', label: 'Voting', desc: 'Community Polls', path: '/member/voting', icon: 'Vote', displayOrder: 4, enabled: true },
      { id: 'dharmashala', label: 'Dharmashala', desc: 'Book Rooms', path: '/member/dharmashala', icon: 'Home', displayOrder: 5, enabled: true },
      { id: 'fund', label: 'Samaj Fund', desc: 'Community Fund', path: '/member/fund', icon: 'Wallet', displayOrder: 6, enabled: true }
    ];

    const content = settings?.homepageContent || {};
    return {
      hero: { ...defaultHero, ...content.hero },
      exclusiveFeatures: Array.isArray(content.exclusiveFeatures) ? content.exclusiveFeatures : defaultFeatures,
      promotions: Array.isArray(content.promotions) ? content.promotions : []
    };
  }, [settings]);

  // Update specific sub-nodes
  const updateHeroField = (field, value) => {
    const newHero = { ...homepageContent.hero, [field]: value };
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      hero: newHero
    });
  };

  const toggleFeatureStatus = (id) => {
    const updatedFeatures = homepageContent.exclusiveFeatures.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    );
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      exclusiveFeatures: updatedFeatures
    });
    showToast('Toggled feature visibility status');
  };

  const reorderFeature = (index, direction) => {
    const features = [...homepageContent.exclusiveFeatures];
    if (direction === 'up' && index > 0) {
      const temp = features[index];
      features[index] = features[index - 1];
      features[index - 1] = temp;
    } else if (direction === 'down' && index < features.length - 1) {
      const temp = features[index];
      features[index] = features[index + 1];
      features[index + 1] = temp;
    }
    
    // Recalculate displayOrder
    const updated = features.map((f, i) => ({ ...f, displayOrder: i + 1 }));
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      exclusiveFeatures: updated
    });
  };

  const saveFeatureEdit = (e) => {
    e.preventDefault();
    const updatedFeatures = homepageContent.exclusiveFeatures.map(f => 
      f.id === editingFeature.id ? editingFeature : f
    );
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      exclusiveFeatures: updatedFeatures
    });
    setEditingFeature(null);
    showToast('Updated feature card configurations');
  };

  const togglePromotionStatus = (id) => {
    const updatedPromos = homepageContent.promotions.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      promotions: updatedPromos
    });
  };

  const deletePromotion = (id) => {
    const updatedPromos = homepageContent.promotions.filter(p => p.id !== id);
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      promotions: updatedPromos
    });
    showToast('Deleted promotional banner card');
  };

  const handleAddPromotion = (e) => {
    e.preventDefault();
    if (!newPromo.title) return;
    const item = {
      ...newPromo,
      id: `promo_${Date.now()}`
    };
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      promotions: [...homepageContent.promotions, item]
    });
    setIsAddingPromo(false);
    setNewPromo({ title: '', desc: '', image: '', buttonText: '', buttonLink: '', enabled: true });
    showToast('Created new promotional banner');
  };

  const savePromoEdit = (e) => {
    e.preventDefault();
    const updatedPromos = homepageContent.promotions.map(p => 
      p.id === editingPromotion.id ? editingPromotion : p
    );
    updateDraft('homepageContent', undefined, {
      ...homepageContent,
      promotions: updatedPromos
    });
    setEditingPromotion(null);
    showToast('Updated promotional configurations');
  };

  // Helper for dynamic Lucide Icon rendering
  const renderIconComponent = (iconName) => {
    const IconComp = LucideIcons[iconName];
    if (IconComp) {
      return <IconComp size={18} />;
    }
    return <LucideIcons.HelpCircle size={18} />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw size={28} className="text-indigo-600 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading home content settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 relative">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-xs font-semibold"
          >
            <CheckCircle size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STICKY SAVE BAR ─── */}
      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-5 py-3.5 rounded-2xl bg-amber-500 text-amber-950 shadow-2xl flex items-center justify-between border border-amber-405"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <h4 className="font-bold text-xs">Unsaved changes in homepage layout</h4>
                <p className="text-[10px] opacity-80">You have modified the homepage layout configs. Please save to apply changes.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={discardChanges}
                className="px-3 py-1.5 rounded-lg border border-amber-950/20 hover:bg-amber-600 text-[10px] font-bold transition-all cursor-pointer"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-amber-950 text-amber-100 text-[10px] font-bold hover:bg-amber-900 transition-all flex items-center gap-1 cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Homepage Content Management</h2>
            <p className="text-xs text-slate-400 mt-0.5">Customize static layout and features for: <strong className="text-slate-655">{headUser?.community || 'Agrawal Samaj'}</strong></p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* ─── TABS SELECTOR ─── */}
      <div className="flex bg-white p-1.5 border border-slate-100 rounded-xl shadow-sm gap-2">
        <button
          onClick={() => setActiveTab('hero')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'hero' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Image size={14} /> Hero Banner
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'features' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 size={14} /> Exclusive Features (Bento)
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'promotions' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle size={14} /> Custom Promo &amp; CTAs
        </button>
      </div>

      {/* ─── TABS BODY ─── */}
      <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm space-y-6">

        {/* 1. HERO BANNER TAB */}
        {activeTab === 'hero' && isLocalHead ? (
          locBannerLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={24} className="text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Loading your location's banner...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={saveLocationBanner} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin size={16} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">Home Banner for {headUser?.city || 'Your Location'}</h3>
                </div>
                <p className="text-[11px] text-slate-400 -mt-2">
                  This banner is shown only to members whose location is <strong>{headUser?.city || 'your city'}</strong> — members elsewhere keep seeing the community-wide banner.
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Banner Image</label>
                  <div
                    onClick={() => locBannerFileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setLocBannerDragging(true); }}
                    onDragLeave={() => setLocBannerDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setLocBannerDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleLocBannerFile(f); }}
                    className={`relative w-full rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                      locBannerDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                    style={{ minHeight: '140px' }}
                  >
                    {locBannerPreview ? (
                      <img src={locBannerPreview} alt="Preview" className="w-full h-36 object-cover" />
                    ) : locBanner.backgroundImage ? (
                      <>
                        <img src={locBanner.backgroundImage} alt="Current banner" className="w-full h-36 object-cover opacity-70" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                          <UploadCloud size={20} className="text-indigo-600" />
                          <p className="text-slate-800 text-xs font-bold drop-shadow">Click or drag to replace</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <UploadCloud size={22} className="text-indigo-400" />
                        <p className="text-xs font-bold text-slate-600">Click to upload or drag &amp; drop</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG, WEBP</p>
                      </div>
                    )}
                    <input
                      ref={locBannerFileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleLocBannerFile(e.target.files?.[0])}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Banner Title (optional)</label>
                  <input
                    type="text"
                    value={locBanner.title}
                    onChange={(e) => setLocBanner({ ...locBanner, title: e.target.value })}
                    placeholder="e.g. Welcome, Indore Samaj!"
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Banner Subtitle (optional)</label>
                  <textarea
                    rows={2}
                    value={locBanner.subtitle}
                    onChange={(e) => setLocBanner({ ...locBanner, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={locBannerSaving || (!locBannerFile && !locBanner.backgroundImage)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {locBannerSaving ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={14} /> Save Location Banner</>
                  )}
                </button>
              </form>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Eye size={14} className="text-slate-400" /> Member App Live Preview
                </h3>
                <div className="relative w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm" style={{ minHeight: '220px' }}>
                  <img
                    src={locBannerPreview || locBanner.backgroundImage || 'https://images.unsplash.com/photo-1595844730298-b9f149588260?auto=format&fit=crop&w=800&q=80'}
                    alt="location banner"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#3C1777]/80 via-[#4C1D95]/45 to-[#1e1145]/90" />
                  <div className="absolute inset-0 p-5 flex flex-col justify-between text-white relative z-10">
                    <span className="text-[10px] font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full uppercase w-fit">
                      {headUser?.city || 'Your Location'}
                    </span>
                    <div className="space-y-2 mt-auto text-left">
                      {locBanner.title && <h1 className="text-lg font-bold tracking-tight drop-shadow-md">{locBanner.title}</h1>}
                      {locBanner.subtitle && <p className="text-[11px] text-white/70 max-w-sm leading-snug">{locBanner.subtitle}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'hero' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Hero Banner Customization</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Banner Background Image (Select from Mobile / Device)
                </label>
                
                <div className="flex items-center gap-3 bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl">
                  {homepageContent.hero.backgroundImage ? (
                    <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <img 
                        src={homepageContent.hero.backgroundImage} 
                        alt="Banner Background Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => updateHeroField('backgroundImage', '')}
                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 shadow-sm cursor-pointer"
                        title="Remove Image"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-16 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <Image size={18} />
                      <span className="text-[8px] font-bold mt-1">Default Image</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="heroBannerImageFile"
                      className="hidden"
                      disabled={heroImageUploading}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setHeroImageUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append('bannerImage', file);
                          const res = await axiosPrivate.put('/head/app-content/hero', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          const url = res.data?.data?.backgroundImage;
                          if (url) updateHeroField('backgroundImage', url);
                        } catch (err) {
                          showToast(err.response?.data?.message || 'Failed to upload banner image');
                        } finally {
                          setHeroImageUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="heroBannerImageFile"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold cursor-pointer transition-all border border-indigo-100 ${heroImageUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {heroImageUploading ? (
                        <><div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload size={13} /> Upload Image from Mobile / Device</>
                      )}
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Pick JPG, PNG or WEBP image directly from gallery/files.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Banner Title</label>
                <input 
                  type="text" 
                  value={homepageContent.hero.title}
                  onChange={(e) => updateHeroField('title', e.target.value)}
                  placeholder="e.g. Welcome to our Samaj Hub"
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Banner Subtitle / Tagline</label>
                <textarea 
                  rows={3}
                  value={homepageContent.hero.subtitle}
                  onChange={(e) => updateHeroField('subtitle', e.target.value)}
                  placeholder="e.g. Connecting and empowering community members across the region."
                  className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50 focus:border-indigo-200 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CTA Button Text</label>
                  <input 
                    type="text" 
                    value={homepageContent.hero.buttonText}
                    onChange={(e) => updateHeroField('buttonText', e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CTA Button Link</label>
                  <input 
                    type="text" 
                    value={homepageContent.hero.buttonLink}
                    onChange={(e) => updateHeroField('buttonLink', e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                </div>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Eye size={14} className="text-slate-400" /> Member App Banner Live Preview
              </h3>
              
              <div className="relative w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm" style={{ minHeight: '220px' }}>
                <img 
                  src={homepageContent.hero.backgroundImage || 'https://images.unsplash.com/photo-1595844730298-b9f149588260?auto=format&fit=crop&w=800&q=80'} 
                  alt="samaj landmark"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#3C1777]/80 via-[#4C1D95]/45 to-[#1e1145]/90" />
                
                <div className="absolute inset-0 p-5 flex flex-col justify-between text-white relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-white/20 border border-white/20 px-2.5 py-0.5 rounded-full uppercase">
                      {headUser?.community || 'Agrawal Samaj'}
                    </span>
                    <span className="text-[9px] text-white/60">Member Portal View</span>
                  </div>

                  <div className="space-y-2 mt-auto text-left">
                    <h1 className="text-lg font-bold tracking-tight drop-shadow-md">
                      {homepageContent.hero.title || 'Welcome to our Samaj Hub'}
                    </h1>
                    <p className="text-[11px] text-white/70 max-w-sm leading-snug">
                      {homepageContent.hero.subtitle || 'Connecting and empowering community members across the region.'}
                    </p>
                    
                    <button className="px-3.5 py-1.5 bg-white text-indigo-950 font-bold rounded-lg text-[10px] mt-2 shadow-md">
                      {homepageContent.hero.buttonText} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. EXCLUSIVE FEATURES TAB */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Configure Bento Exclusive Features Grid</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">6 standard slots max</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-450 tracking-wider bg-slate-50/50">
                    <th className="p-3">Order</th>
                    <th className="p-3">Icon</th>
                    <th className="p-3">Label / Title</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">App Action Link</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {homepageContent.exclusiveFeatures.map((feat, idx) => (
                    <tr key={feat.id} className="hover:bg-slate-50/40 transition-all">
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button 
                            disabled={idx === 0}
                            onClick={() => reorderFeature(idx, 'up')}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveUp size={10} />
                          </button>
                          <button 
                            disabled={idx === homepageContent.exclusiveFeatures.length - 1}
                            onClick={() => reorderFeature(idx, 'down')}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveDown size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          {renderIconComponent(feat.icon)}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{feat.label}</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{feat.desc}</td>
                      <td className="p-3 font-mono text-[10px] text-indigo-500">{feat.path}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                          feat.enabled 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {feat.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleFeatureStatus(feat.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                              feat.enabled 
                                ? 'bg-slate-50 border-slate-200 text-slate-650' 
                                : 'bg-emerald-50 border-emerald-250 text-emerald-600'
                            }`}
                          >
                            {feat.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button 
                            onClick={() => setEditingFeature(feat)}
                            className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. PROMOTIONS & CTA TAB */}
        {activeTab === 'promotions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">Manage Custom Promotional Banners</h3>
              <button 
                onClick={() => setIsAddingPromo(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus size={14} /> Add New Banner
              </button>
            </div>

            {homepageContent.promotions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-xl">
                <HelpCircle className="mx-auto text-slate-300 mb-2" size={24} />
                <h4 className="text-xs font-bold text-slate-650">No promotional banners defined yet</h4>
                <p className="text-[10px] text-slate-400 mt-1">Add banners below the census grid to promote community campaigns, referrals or custom links.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {homepageContent.promotions.map((promo) => (
                  <div key={promo.id} className="border border-slate-150 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1 text-left space-y-1">
                        <h4 className="font-bold text-slate-800 truncate leading-tight">{promo.title}</h4>
                        <p className="text-[10.5px] text-slate-450 line-clamp-2 leading-relaxed">{promo.desc}</p>
                        {promo.buttonLink && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-500 truncate">
                            <Link2 size={10} /> {promo.buttonLink}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className={`px-2 py-0.5 rounded text-[8.5px] font-semibold ${
                        promo.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {promo.enabled ? 'Live on app' : 'Draft'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => togglePromotionStatus(promo.id)}
                          className="px-2 py-1 rounded bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[10px] font-semibold text-slate-655 cursor-pointer"
                        >
                          {promo.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          onClick={() => setEditingPromotion(promo)}
                          className="p-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 cursor-pointer"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          onClick={() => deletePromotion(promo.id)}
                          className="p-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── ADD PROMOTION MODAL ─── */}
      <AnimatePresence>
        {isAddingPromo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <PlusCircle className="text-indigo-650" size={16} /> Add Promotional Banner Card
                </h3>
                <button onClick={() => setIsAddingPromo(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer">
                  <LucideIcons.X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddPromotion} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Banner Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Join the samaj marriage forum"
                    value={newPromo.title}
                    onChange={(e) => setNewPromo({...newPromo, title: e.target.value})}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description text</label>
                  <textarea 
                    rows={2}
                    placeholder="Provide short explanation here..."
                    value={newPromo.desc}
                    onChange={(e) => setNewPromo({...newPromo, desc: e.target.value})}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Button label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Find Match"
                      value={newPromo.buttonText}
                      onChange={(e) => setNewPromo({...newPromo, buttonText: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Button path link</label>
                    <input 
                      type="text" 
                      placeholder="e.g. /member/matrimonial"
                      value={newPromo.buttonLink}
                      onChange={(e) => setNewPromo({...newPromo, buttonLink: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-50"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Create Promotional Card
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDIT EXCLUSIVE FEATURE DIALOG MODAL ─── */}
      <AnimatePresence>
        {editingFeature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit2 className="text-indigo-650" size={15} /> Edit Bento Feature Card
                </h3>
                <button onClick={() => setEditingFeature(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer">
                  <LucideIcons.X size={16} />
                </button>
              </div>

              <form onSubmit={saveFeatureEdit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Feature Title</label>
                  <input 
                    type="text" 
                    required
                    value={editingFeature.label}
                    onChange={(e) => setEditingFeature({...editingFeature, label: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Feature Sub-text / Desc</label>
                  <textarea 
                    rows={3}
                    value={editingFeature.desc}
                    onChange={(e) => setEditingFeature({...editingFeature, desc: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lucide Icon Name</label>
                  <input 
                    type="text" 
                    value={editingFeature.icon}
                    onChange={(e) => setEditingFeature({...editingFeature, icon: e.target.value})}
                    placeholder="e.g. Briefcase, BookOpen, Users"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2"
                  />
                </div>



                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer animate-fade-in"
                >
                  Save Feature Card Config
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EDIT PROMOTION MODAL ─── */}
      <AnimatePresence>
        {editingPromotion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit2 className="text-indigo-650" size={15} /> Edit Promotion Settings
                </h3>
                <button onClick={() => setEditingPromotion(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-pointer">
                  <LucideIcons.X size={16} />
                </button>
              </div>

              <form onSubmit={savePromoEdit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Promo Title</label>
                  <input 
                    type="text" 
                    required
                    value={editingPromotion.title}
                    onChange={(e) => setEditingPromotion({...editingPromotion, title: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Promo Tagline / Description</label>
                  <textarea 
                    rows={2}
                    value={editingPromotion.desc}
                    onChange={(e) => setEditingPromotion({...editingPromotion, desc: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Button Label</label>
                    <input 
                      type="text" 
                      value={editingPromotion.buttonText}
                      onChange={(e) => setEditingPromotion({...editingPromotion, buttonText: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Button Link Link</label>
                    <input 
                      type="text" 
                      value={editingPromotion.buttonLink}
                      onChange={(e) => setEditingPromotion({...editingPromotion, buttonLink: e.target.value})}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Save Promotion
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default HomepageContentManager;
