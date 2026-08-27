import React, { useState, useEffect } from 'react';
import { 
  LayoutTemplate, Image as ImageIcon, Sparkles, Heart, Crown, 
  Plus, Edit3, Trash2, CheckCircle2, AlertCircle, Save, 
  ExternalLink, Eye, RefreshCw, ChevronRight, Phone, MapPin, 
  Star, Layers, ShieldCheck, Briefcase, BookOpen, Users, 
  Vote, Building, Wallet, Calendar, GraduationCap, X, Check,
  Upload, Sliders, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { appContentService } from '../../services/appContentService';
import { getAllCommunities } from '../../services/communityService';

const AVAILABLE_ICONS = [
  'Briefcase', 'BookOpen', 'Users', 'Vote', 'Building', 'Wallet', 
  'Calendar', 'GraduationCap', 'Heart', 'Sparkles', 'ShieldCheck', 
  'Crown', 'MapPin', 'Layers', 'Sliders'
];

const ICON_COMPONENTS = {
  Briefcase, BookOpen, Users, Vote, Building, Wallet,
  Calendar, GraduationCap, Heart, Sparkles, ShieldCheck,
  Crown, MapPin, Layers, Sliders
};

export const UserAppEditsPage = () => {
  const [activeTab, setActiveTab] = useState('banner'); // banner | features | stories | leadership
  const [communities, setCommunities] = useState([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // App Content state
  const [appContent, setAppContent] = useState(null);

  // Hero Banner Form State
  const [heroForm, setHeroForm] = useState({
    backgroundImage: '',
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '/member/directory',
    enabled: true
  });

  // Modals
  const [featureModal, setFeatureModal] = useState({ isOpen: false, isEditing: false, data: null });
  const [storyModal, setStoryModal] = useState({ isOpen: false, isEditing: false, data: null });
  const [headModal, setHeadModal] = useState({ isOpen: false, data: null });
  const [committeeModal, setCommitteeModal] = useState({ isOpen: false, isEditing: false, data: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: '', id: '', title: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await getAllCommunities();
        if (res.success && res.data) {
          setCommunities(res.data);
          if (res.data.length > 0 && !selectedCommunityId) {
            setSelectedCommunityId(res.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Error loading communities:', err);
      }
    };
    fetchCommunities();
  }, []);

  // Fetch App Content for selected community
  const fetchAppContent = async (commId) => {
    setLoading(true);
    try {
      const res = await appContentService.getAppContent(commId);
      if (res.success && res.data) {
        setAppContent(res.data);
        if (res.data.heroBanner) {
          setHeroForm({
            backgroundImage: res.data.heroBanner.backgroundImage || '',
            title: res.data.heroBanner.title || '',
            subtitle: res.data.heroBanner.subtitle || '',
            buttonText: res.data.heroBanner.buttonText || '',
            buttonLink: res.data.heroBanner.buttonLink || '/member/directory',
            enabled: res.data.heroBanner.enabled !== false
          });
        }
      }
    } catch (err) {
      console.error('Error fetching app content:', err);
      showToast(err.response?.data?.message || 'Failed to load app content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCommunityId) {
      fetchAppContent(selectedCommunityId);
    }
  }, [selectedCommunityId]);

  // Save Hero Banner
  const handleSaveHero = async () => {
    setSaving(true);
    try {
      const res = await appContentService.updateHeroBanner(heroForm, selectedCommunityId);
      if (res.success) {
        showToast('Header banner updated successfully!');
        fetchAppContent(selectedCommunityId);
      }
    } catch (err) {
      console.error('Error saving hero banner:', err);
      showToast(err.response?.data?.message || 'Failed to update hero banner', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Feature Actions
  const handleSaveFeature = async (formData) => {
    setSaving(true);
    try {
      if (featureModal.isEditing) {
        await appContentService.updateFeature(featureModal.data.id, formData, selectedCommunityId);
        showToast('Exclusive feature updated successfully!');
      } else {
        await appContentService.createFeature(formData, selectedCommunityId);
        showToast('New exclusive feature added successfully!');
      }
      setFeatureModal({ isOpen: false, isEditing: false, data: null });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      console.error('Error saving feature:', err);
      showToast(err.response?.data?.message || 'Failed to save feature', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeature = async (id) => {
    try {
      await appContentService.deleteFeature(id, selectedCommunityId);
      showToast('Feature deleted successfully');
      setDeleteConfirm({ isOpen: false, type: '', id: '', title: '' });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      showToast('Failed to delete feature', 'error');
    }
  };

  // Story Actions
  const handleSaveStory = async (formData) => {
    setSaving(true);
    try {
      if (storyModal.isEditing) {
        await appContentService.updateSuccessStory(storyModal.data.id, formData, selectedCommunityId);
        showToast('Success story updated successfully!');
      } else {
        await appContentService.createSuccessStory(formData, selectedCommunityId);
        showToast('New success story created successfully!');
      }
      setStoryModal({ isOpen: false, isEditing: false, data: null });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      console.error('Error saving story:', err);
      showToast(err.response?.data?.message || 'Failed to save success story', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStory = async (id) => {
    try {
      await appContentService.deleteSuccessStory(id, selectedCommunityId);
      showToast('Success story deleted successfully');
      setDeleteConfirm({ isOpen: false, type: '', id: '', title: '' });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      showToast('Failed to delete story', 'error');
    }
  };

  // Community Head Actions
  const handleSaveHead = async (formData) => {
    setSaving(true);
    try {
      await appContentService.updateCommunityHead(formData, selectedCommunityId);
      showToast('Community Head profile updated successfully!');
      setHeadModal({ isOpen: false, data: null });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      console.error('Error saving community head:', err);
      showToast(err.response?.data?.message || 'Failed to update community head', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Committee Actions
  const handleSaveCommittee = async (formData) => {
    setSaving(true);
    try {
      if (committeeModal.isEditing) {
        await appContentService.updateCommitteeMember(committeeModal.data.id, formData, selectedCommunityId);
        showToast('Committee member updated successfully!');
      } else {
        await appContentService.createCommitteeMember(formData, selectedCommunityId);
        showToast('New committee member added successfully!');
      }
      setCommitteeModal({ isOpen: false, isEditing: false, data: null });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      console.error('Error saving committee member:', err);
      showToast(err.response?.data?.message || 'Failed to save committee member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommittee = async (id) => {
    try {
      await appContentService.deleteCommitteeMember(id, selectedCommunityId);
      showToast('Committee member removed successfully');
      setDeleteConfirm({ isOpen: false, type: '', id: '', title: '' });
      fetchAppContent(selectedCommunityId);
    } catch (err) {
      showToast('Failed to remove committee member', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-left">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-rose-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-6 text-white shadow-xl shadow-purple-950/20 border border-purple-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase tracking-widest mb-1.5">
              <Sliders size={14} className="text-purple-400" />
              <span>Mobile CMS & Content Control</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">User App Edits</h1>
            <p className="text-purple-200/80 text-xs mt-1 max-w-xl">
              Manage and customize the member mobile home screen: Top Palace Banner, Exclusive Features grid, Matrimonial Success Stories, and Leadership Profiles.
            </p>
          </div>

          {/* Community Switcher */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
            <span className="text-xs font-bold text-purple-200 whitespace-nowrap">Community:</span>
            <select
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              className="bg-purple-950/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-400/30 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            >
              {communities.map((c) => (
                <option key={c._id} value={c._id} className="bg-purple-950 text-white">
                  {c.name} ({c.city || 'Indore'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('banner')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'banner'
              ? 'bg-white text-purple-700 shadow-md shadow-purple-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ImageIcon size={15} />
          Top Header Banner
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'features'
              ? 'bg-white text-purple-700 shadow-md shadow-purple-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles size={15} />
          Exclusive Features ({(appContent?.exclusiveFeatures || []).length})
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'stories'
              ? 'bg-white text-purple-700 shadow-md shadow-purple-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Heart size={15} />
          Success Stories ({(appContent?.successStories || []).length})
        </button>

        <button
          onClick={() => setActiveTab('leadership')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'leadership'
              ? 'bg-white text-purple-700 shadow-md shadow-purple-900/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Crown size={15} />
          Core Members & Leadership
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="animate-spin text-purple-600" size={28} />
          <p className="text-xs font-bold">Loading app customization data...</p>
        </div>
      ) : (
        <div>
          {/* ─── TAB 1: TOP HEADER BANNER ─── */}
          {activeTab === 'banner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Controls */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Header Banner Settings</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Customize the main palace backdrop and greeting details</p>
                  </div>
                  <button
                    onClick={handleSaveHero}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50 press-scale"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save Banner'}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">
                    Background Image URL (Palace / Temple Backdrop)
                  </label>
                  <input
                    type="text"
                    value={heroForm.backgroundImage}
                    onChange={(e) => setHeroForm({ ...heroForm, backgroundImage: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Recommended size: 1200x600 px (Landscape photo with dark top)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Banner Title (Optional)</label>
                    <input
                      type="text"
                      value={heroForm.title}
                      onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                      placeholder="e.g. Welcome to Agrawal Samaj"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Banner Subtitle (Optional)</label>
                    <input
                      type="text"
                      value={heroForm.subtitle}
                      onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                      placeholder="e.g. Uniting our community together"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Action Button Text (Optional)</label>
                    <input
                      type="text"
                      value={heroForm.buttonText}
                      onChange={(e) => setHeroForm({ ...heroForm, buttonText: e.target.value })}
                      placeholder="e.g. Explore Directory"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1.5">Action Button Link</label>
                    <input
                      type="text"
                      value={heroForm.buttonLink}
                      onChange={(e) => setHeroForm({ ...heroForm, buttonLink: e.target.value })}
                      placeholder="/member/directory"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="heroEnabled"
                    checked={heroForm.enabled}
                    onChange={(e) => setHeroForm({ ...heroForm, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="heroEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Enable custom banner image on member home screen
                  </label>
                </div>
              </div>

              {/* Live Preview Column */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-slate-700 text-xs font-black uppercase tracking-wider">
                  <Smartphone size={15} className="text-purple-600" />
                  <span>Live Mobile Preview</span>
                </div>

                <div className="w-full rounded-[28px] overflow-hidden relative shadow-xl min-h-[220px] bg-slate-900 border-4 border-slate-800">
                  <img
                    src={heroForm.backgroundImage || 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80'}
                    alt="Header Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#1F0940]/85 via-[#3B1578]/50 to-[#120726]/95" />

                  <div className="relative z-10 p-5 flex flex-col justify-between h-full min-h-[220px] text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs">
                          RS
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-purple-200 uppercase tracking-widest">GOOD AFTERNOON 🕉️</p>
                          <h4 className="text-sm font-black">Rahul Sharma</h4>
                          <p className="text-[10px] text-amber-300 font-semibold">Agrawal Samaj Indore</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      {heroForm.title && (
                        <h3 className="text-sm font-black text-white">{heroForm.title}</h3>
                      )}
                      {heroForm.subtitle && (
                        <p className="text-[10px] text-white/80 font-medium">{heroForm.subtitle}</p>
                      )}
                      {heroForm.buttonText && (
                        <span className="inline-block mt-2 px-3 py-1 bg-white text-purple-950 text-[10px] font-black rounded-lg shadow">
                          {heroForm.buttonText} →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: EXCLUSIVE FEATURES (BENTO GRID) ─── */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-slate-900">Exclusive Features Bento Grid</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage the 2-column feature shortcut cards displayed on the member home screen</p>
                </div>
                <button
                  onClick={() => setFeatureModal({
                    isOpen: true,
                    isEditing: false,
                    data: {
                      label: '',
                      desc: '',
                      path: '/member/directory',
                      state: null,
                      icon: 'Briefcase',
                      bgImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80',
                      displayOrder: (appContent?.exclusiveFeatures || []).length + 1,
                      enabled: true
                    }
                  })}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:opacity-95 press-scale"
                >
                  <Plus size={15} />
                  Add New Feature
                </button>
              </div>

              {/* Grid of Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(appContent?.exclusiveFeatures || []).map((feat, idx) => {
                  const IconComp = ICON_COMPONENTS[feat.icon] || Briefcase;
                  return (
                    <div
                      key={feat.id || idx}
                      className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px] relative overflow-hidden group"
                    >
                      {/* Top Preview Card */}
                      <div className="h-32 rounded-2xl relative overflow-hidden bg-slate-900 mb-3 shadow-inner">
                        <img
                          src={feat.bgImage}
                          alt={feat.label}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-black/35" />
                        <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                          <IconComp size={18} />
                        </div>
                        <span className={`absolute top-3 right-3 text-[9px] font-black px-2.5 py-0.5 rounded-full ${feat.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                          {feat.enabled ? 'Active' : 'Disabled'}
                        </span>
                        <div className="absolute bottom-2.5 left-3 right-3 text-white">
                          <h4 className="text-xs font-black leading-tight drop-shadow">{feat.label}</h4>
                          <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">{feat.desc}</p>
                        </div>
                      </div>

                      {/* Card Details & Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 truncate max-w-[140px]">
                          Route: <span className="text-purple-600 font-mono text-[10px]">{feat.path}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFeatureModal({ isOpen: true, isEditing: true, data: feat })}
                            className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            title="Edit Feature"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, type: 'feature', id: feat.id, title: feat.label })}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Delete Feature"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── TAB 3: SUCCESS STORIES ─── */}
          {activeTab === 'stories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                <div>
                  <h3 className="text-base font-black text-slate-900">Matrimonial Success Stories</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage the featured story banner and matrimonial match story cards</p>
                </div>
                <button
                  onClick={() => setStoryModal({
                    isOpen: true,
                    isEditing: false,
                    data: {
                      title: '',
                      tag: 'Featured Match',
                      quote: '',
                      shortDescription: '',
                      coverImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
                      weddingDate: '2024',
                      groomName: '',
                      brideName: '',
                      featured: false,
                      displayOrder: (appContent?.successStories || []).length + 1,
                      enabled: true
                    }
                  })}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl text-xs font-black shadow-md hover:opacity-95 press-scale"
                >
                  <Plus size={15} />
                  Add Success Story
                </button>
              </div>

              {/* Grid of Stories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(appContent?.successStories || []).map((story, idx) => (
                  <div
                    key={story.id || idx}
                    className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                  >
                    {/* Story Preview Photo */}
                    <div className="h-44 rounded-2xl relative overflow-hidden bg-slate-900 mb-3 shadow-inner">
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {story.featured && (
                          <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                            <Star size={10} fill="currentColor" /> Featured
                          </span>
                        )}
                        <span className="bg-pink-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {story.tag || 'Success Story'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h4 className="text-sm font-black drop-shadow">{story.title}</h4>
                        <p className="text-[10px] text-white/80 font-medium mt-0.5">Married in {story.weddingDate || '2024'}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 italic line-clamp-2 px-1 mb-3">
                      "{story.quote || story.shortDescription}"
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className={`text-[10px] font-bold ${story.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {story.enabled ? '● Published' : '○ Hidden'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setStoryModal({ isOpen: true, isEditing: true, data: story })}
                          className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                          title="Edit Story"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, type: 'story', id: story.id, title: story.title })}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Delete Story"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 4: CORE MEMBERS & LEADERSHIP ─── */}
          {activeTab === 'leadership' && (
            <div className="space-y-8">
              {/* 1. Community Head (President) Banner Section */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Community Head (President Banner)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Edit the primary leadership card displayed on top of the Core Members section</p>
                  </div>
                  <button
                    onClick={() => setHeadModal({ isOpen: true, data: appContent?.coreMembers?.communityHead })}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:opacity-95 press-scale"
                  >
                    <Edit3 size={14} />
                    Edit Community Head
                  </button>
                </div>

                {/* Head Card Preview */}
                <div className="rounded-[24px] bg-gradient-to-r from-[#1e1145] via-[#2d1b69] to-[#4C1D95] p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden shadow-xl">
                  <div className="flex items-center gap-4 relative z-10">
                    <img
                      src={appContent?.coreMembers?.communityHead?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80'}
                      alt="Head Avatar"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/60 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500/80 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-purple-400/30">
                          {appContent?.coreMembers?.communityHead?.role || 'COMMUNITY HEAD (PRESIDENT)'}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white mt-1">
                        {appContent?.coreMembers?.communityHead?.name || 'Dr. Rajesh Agrawal'}
                      </h4>
                      <p className="text-purple-200/90 text-xs font-medium">
                        {[appContent?.coreMembers?.communityHead?.city, appContent?.coreMembers?.communityHead?.state].filter(Boolean).join(', ') || 'Indore, Madhya Pradesh'}
                        {appContent?.coreMembers?.communityHead?.termYears ? ` • Term: ${appContent.coreMembers.communityHead.termYears}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10 text-xs font-bold text-purple-200">
                    <Phone size={14} className="text-purple-300" />
                    <span>{appContent?.coreMembers?.communityHead?.phone || '+91 98260 12345'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Committee Members (Slider Cards) */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Core Committee Officers</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Officers shown in the horizontal slider cards on Member Home and Leadership pages</p>
                  </div>
                  <button
                    onClick={() => setCommitteeModal({
                      isOpen: true,
                      isEditing: false,
                      data: {
                        name: '',
                        role: 'Treasurer',
                        designation: 'Treasurer',
                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                        phone: '',
                        city: 'Indore',
                        displayOrder: (appContent?.coreMembers?.committee || []).length + 1,
                        enabled: true
                      }
                    })}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:opacity-95 press-scale"
                  >
                    <Plus size={14} />
                    Add Committee Member
                  </button>
                </div>

                {/* Committee Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {(appContent?.coreMembers?.committee || []).map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex flex-col items-center text-center justify-between relative group hover:shadow-md transition-all"
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white mb-2 shadow-sm border border-slate-200">
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      </div>

                      <span className="text-[8.5px] font-black text-white px-2 py-0.5 rounded-md bg-purple-600 mb-1 max-w-full truncate">
                        {member.role || member.designation}
                      </span>

                      <h4 className="text-xs font-black text-slate-900 line-clamp-1">{member.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{member.phone || member.city || 'Indore'}</p>

                      <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-200/60 w-full justify-center">
                        <button
                          onClick={() => setCommitteeModal({ isOpen: true, isEditing: true, data: member })}
                          className="p-1.5 rounded-lg bg-white text-purple-600 hover:bg-purple-100 transition-colors shadow-2xs"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, type: 'committee', id: member.id, title: member.name })}
                          className="p-1.5 rounded-lg bg-white text-rose-600 hover:bg-rose-100 transition-colors shadow-2xs"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: EXCLUSIVE FEATURE ─── */}
      {featureModal.isOpen && (
        <FeatureFormModal
          isOpen={featureModal.isOpen}
          isEditing={featureModal.isEditing}
          initialData={featureModal.data}
          onClose={() => setFeatureModal({ isOpen: false, isEditing: false, data: null })}
          onSave={handleSaveFeature}
          saving={saving}
        />
      )}

      {/* ─── MODAL: SUCCESS STORY ─── */}
      {storyModal.isOpen && (
        <StoryFormModal
          isOpen={storyModal.isOpen}
          isEditing={storyModal.isEditing}
          initialData={storyModal.data}
          onClose={() => setStoryModal({ isOpen: false, isEditing: false, data: null })}
          onSave={handleSaveStory}
          saving={saving}
        />
      )}

      {/* ─── MODAL: COMMUNITY HEAD ─── */}
      {headModal.isOpen && (
        <HeadFormModal
          isOpen={headModal.isOpen}
          initialData={headModal.data}
          onClose={() => setHeadModal({ isOpen: false, data: null })}
          onSave={handleSaveHead}
          saving={saving}
        />
      )}

      {/* ─── MODAL: COMMITTEE MEMBER ─── */}
      {committeeModal.isOpen && (
        <CommitteeFormModal
          isOpen={committeeModal.isOpen}
          isEditing={committeeModal.isEditing}
          initialData={committeeModal.data}
          onClose={() => setCommitteeModal({ isOpen: false, isEditing: false, data: null })}
          onSave={handleSaveCommittee}
          saving={saving}
        />
      )}

      {/* ─── MODAL: DELETE CONFIRMATION ─── */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Delete Item?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-700">"{deleteConfirm.title}"</span>? This will take effect on member app immediately.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, type: '', id: '', title: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'feature') handleDeleteFeature(deleteConfirm.id);
                  if (deleteConfirm.type === 'story') handleDeleteStory(deleteConfirm.id);
                  if (deleteConfirm.type === 'committee') handleDeleteCommittee(deleteConfirm.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black shadow-md hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── FORM MODAL COMPONENTS ───

const FeatureFormModal = ({ isOpen, isEditing, initialData, onClose, onSave, saving }) => {
  const [form, setForm] = useState(initialData || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{isEditing ? 'Edit Exclusive Feature' : 'Add Exclusive Feature'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Feature Label / Title *</label>
            <input
              type="text"
              required
              value={form.label || ''}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Professional Network"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Description / Subtitle</label>
            <input
              type="text"
              value={form.desc || ''}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              placeholder="e.g. Find jobs & hire within community"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Target Route *</label>
              <input
                type="text"
                required
                value={form.path || ''}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="/member/professionals"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Icon</label>
              <select
                value={form.icon || 'Briefcase'}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 cursor-pointer"
              >
                {AVAILABLE_ICONS.map((ic) => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Background Image URL</label>
            <input
              type="text"
              value={form.bgImage || ''}
              onChange={(e) => setForm({ ...form, bgImage: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="featEnabled"
              checked={form.enabled !== false}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="featEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
              Enabled & Visible on Member Home Screen
            </label>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Feature' : 'Add Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StoryFormModal = ({ isOpen, isEditing, initialData, onClose, onSave, saving }) => {
  const [form, setForm] = useState(initialData || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{isEditing ? 'Edit Success Story' : 'Add Success Story'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Couple Names / Story Title *</label>
            <input
              type="text"
              required
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Rajesh & Priya Agrawal"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Tag / Badge</label>
              <input
                type="text"
                value={form.tag || ''}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="e.g. Featured Match"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Wedding Year / Date</label>
              <input
                type="text"
                value={form.weddingDate || ''}
                onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
                placeholder="e.g. 2024"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Quote / Story Snippet</label>
            <textarea
              rows={3}
              value={form.quote || form.shortDescription || ''}
              onChange={(e) => setForm({ ...form, quote: e.target.value, shortDescription: e.target.value })}
              placeholder="Found their life partner through MeriSamaj within 3 months of verified listing."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Cover Image URL</label>
            <input
              type="text"
              value={form.coverImage || ''}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-5 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.featured || false}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Set as Featured Match (Top Banner)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.enabled !== false}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Published</span>
            </label>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Story' : 'Add Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HeadFormModal = ({ isOpen, initialData, onClose, onSave, saving }) => {
  const [form, setForm] = useState(initialData || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">Edit Community Head (President)</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dr. Rajesh Agrawal"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Role / Title *</label>
              <input
                type="text"
                required
                value={form.role || ''}
                onChange={(e) => setForm({ ...form, role: e.target.value, designation: e.target.value })}
                placeholder="Community Head (President)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Term Years</label>
              <input
                type="text"
                value={form.termYears || ''}
                onChange={(e) => setForm({ ...form, termYears: e.target.value })}
                placeholder="2024-2027"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">City</label>
              <input
                type="text"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Indore"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98260 12345"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Avatar / Photo URL</label>
            <input
              type="text"
              value={form.avatar || ''}
              onChange={(e) => setForm({ ...form, avatar: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Head Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CommitteeFormModal = ({ isOpen, isEditing, initialData, onClose, onSave, saving }) => {
  const [form, setForm] = useState(initialData || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-scale-up text-left">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">{isEditing ? 'Edit Committee Member' : 'Add Committee Member'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ramesh Mittal"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Role / Designation *</label>
              <input
                type="text"
                required
                value={form.role || ''}
                onChange={(e) => setForm({ ...form, role: e.target.value, designation: e.target.value })}
                placeholder="Treasurer / Secretary"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98262 33445"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">City</label>
              <input
                type="text"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Indore"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Display Order</label>
              <input
                type="number"
                value={form.displayOrder || 1}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 1 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Avatar / Photo URL</label>
            <input
              type="text"
              value={form.avatar || ''}
              onChange={(e) => setForm({ ...form, avatar: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="commEnabled"
              checked={form.enabled !== false}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="commEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
              Active on Member Slider Cards
            </label>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md hover:opacity-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserAppEditsPage;
