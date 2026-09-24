import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Heart, Trash2, Loader2,
  RefreshCw, MapPin, Briefcase, ShieldCheck, Crown,
  Edit3, Check, X
} from 'lucide-react';
import { matrimonialShortlistService, matrimonialInterestService } from '../../../../core/api/matrimonialService';
import { useMatrimonial } from './MatrimonialContext';

const MatrimonialShortlistPage = () => {
  const navigate  = useNavigate();
  const matriCtx  = useMatrimonial();

  const [shortlist, setShortlist]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [removing, setRemoving]     = useState(null);
  const [editNotes, setEditNotes]   = useState(null); // profileId being edited
  const [notesInput, setNotesInput] = useState('');
  const [sendingInterest, setSendingInterest] = useState(null);
  const [toast, setToast]           = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadShortlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await matrimonialShortlistService.getShortlist();
      // Backend returns data.items (not data.shortlist)
      setShortlist(res.data.data?.items || res.data.data?.shortlist || []);
    } catch (err) {
      console.error('Shortlist fetch failed:', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShortlist(); }, [loadShortlist]);

  const handleRemove = async (profileId) => {
    setRemoving(profileId);
    try {
      await matrimonialShortlistService.removeFromShortlist(profileId);
      setShortlist(prev => prev.filter(s => s.profileId?._id !== profileId));
      matriCtx?.setShortlistedIds(prev => prev.filter(id => id !== profileId));
      showToast('Removed from shortlist.');
    } catch (err) {
      showToast('Failed to remove.');
    } finally {
      setRemoving(null);
    }
  };

  const handleSaveNotes = async (profileId) => {
    try {
      await matrimonialShortlistService.updateNotes(profileId, notesInput);
      setShortlist(prev => prev.map(s =>
        s.profileId?._id === profileId ? { ...s, notes: notesInput } : s
      ));
      setEditNotes(null);
      showToast('Notes saved.');
    } catch (err) {
      showToast('Failed to save notes.');
    }
  };

  const handleSendInterest = async (profileId) => {
    setSendingInterest(profileId);
    try {
      const res = await matrimonialInterestService.sendInterest({ receiverProfileId: profileId });
      if (res.data.status === 'success') {
        showToast('Interest sent! 💕');
        setShortlist(prev => prev.map(s =>
          s.profileId?._id === profileId ? { ...s, interestSent: true } : s
        ));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send interest.';
      showToast(msg);
    } finally {
      setSendingInterest(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-1 active:opacity-60">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-black text-slate-800 leading-none">Shortlisted Profiles</h1>
          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{shortlist.length} profile{shortlist.length !== 1 ? 's' : ''} saved</p>
        </div>
        <button onClick={loadShortlist} className="p-2 text-slate-400 active:scale-90">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {shortlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-6">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 border border-amber-100">
              <Star size={26} className="text-amber-500 fill-amber-500" />
            </div>
            <h3 className="text-[15px] font-black text-slate-800 mb-1">No shortlisted profiles</h3>
            <p className="text-[12px] text-slate-400 max-w-[220px] leading-relaxed font-semibold">
              Tap the bookmark icon while browsing matches to save profiles here.
            </p>
            <button onClick={() => navigate('/member/matrimonial')}
              className="mt-5 px-6 py-2.5 bg-rose-500 text-white rounded-xl text-[13px] font-bold active:scale-95 transition-transform">
              Browse Matches
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shortlist.map(item => {
              const profile    = item.profileId;
              if (!profile) return null;
              const profileId  = profile._id;
              const name       = profile.personal?.fullName || 'Unknown';
              const photo      = profile.photos?.find(p => p.isPrimary)?.url
                              || profile.photos?.[0]?.url;
              const age        = profile.age;
              const city       = profile.location?.city;
              const profession = profile.education?.occupation || profile.education?.profession;
              const isVerified = profile.verificationStatus === 'verified';
              const notes      = item.notes;
              const isRemoving = removing === profileId;
              const isSending  = sendingInterest === profileId;
              const isEditing  = editNotes === profileId;

              return (
                <div key={profileId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex gap-3.5 p-3.5 items-start">
                    {/* Photo */}
                    <div
                      className="w-16 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer"
                      onClick={() => navigate(`/member/matrimonial/${profileId}`)}
                    >
                      {photo
                        ? <img src={photo} alt={name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-rose-100 to-pink-100">{name[0]}</div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/member/matrimonial/${profileId}`)}>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[13.5px] font-extrabold text-slate-800 truncate">{name}</h4>
                        {isVerified && <ShieldCheck size={12} className="text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[11.5px] text-slate-500 font-semibold mt-0.5">
                        {age ? `${age} yrs` : ''}{city ? ` · ${city}` : ''}
                      </p>
                      {profession && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Briefcase size={10} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400 truncate">{profession}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Saved on {new Date(item.addedAt || item.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>

                    {/* Remove */}
                    <button onClick={() => handleRemove(profileId)} disabled={isRemoving}
                      className="p-1.5 text-slate-300 hover:text-red-400 transition-colors active:scale-90 disabled:opacity-40">
                      {isRemoving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>

                  {/* Notes */}
                  <div className="px-3.5 pb-3 border-t border-slate-50 pt-2.5">
                    {isEditing ? (
                      <div className="flex gap-2 items-start">
                        <textarea
                          value={notesInput}
                          onChange={e => setNotesInput(e.target.value)}
                          placeholder="Add private notes..."
                          rows={2}
                          className="flex-1 text-[12px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-rose-400"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1.5 pt-0.5">
                          <button onClick={() => handleSaveNotes(profileId)}
                            className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white active:scale-90">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditNotes(null)}
                            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 active:scale-90">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setEditNotes(profileId); setNotesInput(notes || ''); }}
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold active:scale-95">
                        <Edit3 size={11} />
                        {notes ? <span className="text-slate-600 truncate max-w-[220px]">{notes}</span> : 'Add private notes...'}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-3.5 pb-3.5 flex gap-2">
                    <button onClick={() => handleSendInterest(profileId)} disabled={item.interestSent || isSending}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                        item.interestSent
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-rose-500 text-white shadow-sm hover:bg-rose-600'
                      } disabled:opacity-80`}>
                      {isSending ? <Loader2 size={13} className="animate-spin" /> : item.interestSent ? <Check size={13} strokeWidth={2.8} /> : <Heart size={12} fill="none" />}
                      {item.interestSent ? 'Sent' : 'Send Interest'}
                    </button>
                    <button onClick={() => navigate(`/member/matrimonial/${profileId}`)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[12px] font-bold active:scale-95 transition-all">
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[12px] font-black px-5 py-3 rounded-full shadow-lg z-[60]">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MatrimonialShortlistPage;
