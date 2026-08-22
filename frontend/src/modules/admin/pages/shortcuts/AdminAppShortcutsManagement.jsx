import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Save, Upload, RotateCcw, CheckCircle, AlertCircle, 
  ExternalLink, Layers, RefreshCw, Eye, Image as ImageIcon, Check,
  Sliders, Link2, BellRing, Smartphone, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { axiosPrivate } from '../../../../core/api/axiosPrivate';
import { 
  InvitationsIcon, 
  ContributionsIcon, 
  ObituaryIcon 
} from '../../../member/components/common/AnimatedIconCards';

export const AdminAppShortcutsManagement = () => {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  // File upload state per card: { [shortcutId]: { file, previewUrl } }
  const [pendingUploads, setPendingUploads] = useState({});
  const fileInputRefs = useRef({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchShortcuts = async () => {
    setLoading(true);
    try {
      const res = await axiosPrivate.get('/admin/shortcuts');
      if (res.data?.success) {
        setShortcuts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin shortcuts:', err);
      showToast(err.response?.data?.message || 'Failed to load shortcuts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortcuts();
  }, []);

  const handleFieldChange = (id, field, value) => {
    setShortcuts(prev => prev.map(sc => (sc._id === id ? { ...sc, [field]: value } : sc)));
  };

  const handleFileSelect = (id, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, SVG, JPG, WEBP)', 'error');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingUploads(prev => ({
      ...prev,
      [id]: { file, previewUrl }
    }));
  };

  const handleClearSelectedFile = (id) => {
    setPendingUploads(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].value = '';
    }
  };

  const handleSave = async (shortcut) => {
    setSavingId(shortcut._id);
    try {
      // 1. If there's a pending file upload, upload the icon first
      if (pendingUploads[shortcut._id]?.file) {
        const formData = new FormData();
        formData.append('icon', pendingUploads[shortcut._id].file);
        const uploadRes = await axiosPrivate.post(`/admin/shortcuts/${shortcut._id}/icon`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data?.data) {
          shortcut.customIconUrl = uploadRes.data.data.customIconUrl;
          shortcut.iconType = 'custom_upload';
        }
        handleClearSelectedFile(shortcut._id);
      }

      // 2. Update shortcut details (title, subtitle, targetRoute, etc.)
      const res = await axiosPrivate.put(`/admin/shortcuts/${shortcut._id}`, {
        title: shortcut.title,
        subtitle: shortcut.subtitle,
        targetRoute: shortcut.targetRoute,
        isActive: shortcut.isActive,
        order: shortcut.order,
        presetIconKey: shortcut.presetIconKey,
        iconType: shortcut.iconType,
        customIconUrl: shortcut.customIconUrl,
        badgeType: shortcut.badgeType,
        manualBadgeCount: shortcut.manualBadgeCount
      });

      if (res.data?.success) {
        setShortcuts(prev => prev.map(sc => (sc._id === shortcut._id ? res.data.data : sc)));
        showToast(`"${shortcut.title}" shortcut updated and live on Member Home!`);
      }
    } catch (err) {
      console.error('Failed to save shortcut:', err);
      showToast(err.response?.data?.message || 'Failed to save shortcut changes', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetToPreset = async (id) => {
    setSavingId(id);
    try {
      const res = await axiosPrivate.post(`/admin/shortcuts/${id}/reset`);
      if (res.data?.success) {
        setShortcuts(prev => prev.map(sc => (sc._id === id ? res.data.data : sc)));
        handleClearSelectedFile(id);
        showToast('Icon reset to default preset!');
      }
    } catch (err) {
      console.error('Failed to reset shortcut:', err);
      showToast('Failed to reset icon', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Preset icon renderer helper
  const renderPresetIcon = (key, className = "w-10 h-10") => {
    switch (key) {
      case 'invitations':
        return <InvitationsIcon className={className} />;
      case 'contributions':
        return <ContributionsIcon className={className} />;
      case 'obituary':
        return <ObituaryIcon className={className} />;
      default:
        return <InvitationsIcon className={className} />;
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-2.5 font-bold text-xs ${
              toast.type === 'error' 
                ? 'bg-rose-500/90 border-rose-400 text-white' 
                : 'bg-emerald-500/90 border-emerald-400 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER BANNER ─── */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 p-6 sm:p-7 rounded-3xl border border-purple-500/20 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Sparkles size={14} className="text-purple-400" /> Member Home Customizer
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            App Shortcuts & Icon Management
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/80 mt-1 max-w-2xl leading-relaxed">
            Customize the 3 quick action shortcut cards on the Member App home screen. Modify titles, subtitles, navigation destination links, or upload custom PNG/SVG icons.
          </p>
        </div>

        <button 
          onClick={fetchShortcuts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── LIVE MOBILE PREVIEW COMPONENT ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-purple-600" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Live Mobile View Preview</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
            Real-time preview
          </span>
        </div>

        <div className="max-w-md mx-auto bg-gradient-to-b from-slate-50 via-purple-50/20 to-white p-4 rounded-2xl border border-slate-200 shadow-inner">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Actions</span>
            <span className="text-[10px] text-purple-600 font-bold">Interactive</span>
          </div>

          <div className="flex gap-2 sm:gap-3">
            {shortcuts.filter(sc => sc.isActive).map((card) => {
              const pending = pendingUploads[card._id];
              const iconDisplayUrl = pending?.previewUrl || card.customIconUrl;

              return (
                <div 
                  key={card._id}
                  className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 flex flex-col items-center justify-center text-center border border-slate-100 shadow-xs relative"
                >
                  <div className="relative flex items-center justify-center p-1">
                    {card.iconType === 'custom_upload' || iconDisplayUrl ? (
                      <img 
                        src={iconDisplayUrl} 
                        alt={card.title} 
                        className="w-10 h-10 object-contain drop-shadow-sm transition-transform hover:scale-105"
                      />
                    ) : (
                      renderPresetIcon(card.presetIconKey || card.key)
                    )}

                    {card.badgeType !== 'none' && (
                      <div className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8.5px] font-black w-[17px] h-[17px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                        1
                      </div>
                    )}
                  </div>

                  <h4 className="text-[11.5px] font-extrabold text-slate-800 mt-1.5 tracking-tight leading-tight truncate w-full">
                    {card.title || 'Title'}
                  </h4>
                  <p className="text-[8.5px] font-semibold text-slate-400 mt-0.5 leading-tight truncate w-full">
                    {card.subtitle || 'Subtitle'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── SHORTCUT EDITORS CARDS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {shortcuts.map((sc, index) => {
          const pending = pendingUploads[sc._id];
          const hasCustomIcon = sc.iconType === 'custom_upload' && sc.customIconUrl;
          const isSaving = savingId === sc._id;

          return (
            <div 
              key={sc._id}
              className={`bg-white rounded-3xl border ${sc.isActive ? 'border-purple-200/80 shadow-md' : 'border-slate-200 opacity-75'} p-5 sm:p-6 space-y-5 transition-all flex flex-col justify-between relative overflow-hidden`}
            >
              {/* Top Card Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    {sc.key} Card
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[11px] font-bold text-slate-500">
                    {sc.isActive ? 'Active' : 'Disabled'}
                  </span>
                  <input 
                    type="checkbox" 
                    checked={sc.isActive}
                    onChange={(e) => handleFieldChange(sc._id, 'isActive', e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Icon Management Section */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-purple-600" /> Icon Configuration
                  </label>
                  {(hasCustomIcon || pending) && (
                    <button 
                      onClick={() => handleResetToPreset(sc._id)}
                      disabled={isSaving}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} /> Reset to Default
                    </button>
                  )}
                </div>

                {/* Current Visual Preview */}
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 flex items-center justify-center shrink-0 p-1">
                    {pending?.previewUrl ? (
                      <img src={pending.previewUrl} alt="Preview" className="w-10 h-10 object-contain" />
                    ) : hasCustomIcon ? (
                      <img src={sc.customIconUrl} alt="Custom" className="w-10 h-10 object-contain" />
                    ) : (
                      renderPresetIcon(sc.presetIconKey || sc.key)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {pending ? 'New Icon Selected (Unsaved)' : hasCustomIcon ? 'Custom Uploaded Icon' : 'Default Animated Vector'}
                    </p>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">
                      {hasCustomIcon || pending ? 'PNG, SVG, or WebP Image' : 'Pre-built lightweight animated icon'}
                    </p>
                  </div>
                </div>

                {/* Upload Action */}
                <div className="space-y-2">
                  <input 
                    type="file"
                    ref={el => fileInputRefs.current[sc._id] = el}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={(e) => handleFileSelect(sc._id, e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRefs.current[sc._id]?.click()}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>{pending ? 'Change Selected Icon' : hasCustomIcon ? 'Replace Custom Icon' : 'Upload Custom Icon (PNG/SVG)'}</span>
                  </button>
                  {pending && (
                    <p className="text-[10px] text-emerald-600 font-bold text-center">
                      ✓ Image ready. Click "Save Changes" below to publish.
                    </p>
                  )}
                </div>
              </div>

              {/* Title & Subtitle Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Display Title *
                  </label>
                  <input 
                    type="text"
                    value={sc.title}
                    onChange={(e) => handleFieldChange(sc._id, 'title', e.target.value)}
                    placeholder="e.g. Invitations"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Subtitle Description *
                  </label>
                  <input 
                    type="text"
                    value={sc.subtitle}
                    onChange={(e) => handleFieldChange(sc._id, 'subtitle', e.target.value)}
                    placeholder="e.g. View new invites"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Link2 size={12} className="text-purple-500" /> Target Navigation Route *
                  </label>
                  <input 
                    type="text"
                    value={sc.targetRoute}
                    onChange={(e) => handleFieldChange(sc._id, 'targetRoute', e.target.value)}
                    placeholder="/member/..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleSave(sc)}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>Save & Publish Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminAppShortcutsManagement;
