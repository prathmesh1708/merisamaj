import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Quote, Star, Sparkles, Loader2 } from 'lucide-react';
import { successStoryService } from '../../../../core/api/matrimonialService';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';

// "Rahul & Priya" — from linked app users, or the names the admin typed in
const coupleNames = (story) => [story.groomId?.name || story.groomName, story.brideId?.name || story.brideName]
  .filter(Boolean)
  .join(' & ');

const formatMarried = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const MatrimonialSuccessStories = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    successStoryService.getPublishedStories()
      .then(res => { if (!cancelled) setStories(res.data?.data?.stories || []); })
      .catch(err => console.error('Failed to load success stories:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-30 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)} className="p-1 active:opacity-60">
          <ArrowLeft size={22} className="text-slate-800" />
        </button>
        <div>
          <h1 className="text-[17px] font-black text-slate-800 leading-none">Success Stories</h1>
          <p className="text-[10px] font-bold text-rose-500 mt-0.5">Samaj matches made in heaven</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Intro banner */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <Heart size={140} fill="white" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-amber-300 fill-amber-300" />
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">Celebrating Love</span>
          </div>
          <h2 className="text-[20px] font-black leading-tight">
            {stories.length > 0 ? `${stories.length} ${stories.length === 1 ? 'Marriage' : 'Marriages'} Celebrated` : 'Celebrating Our Couples'}
          </h2>
          <p className="text-[12px] text-white/80 mt-1 max-w-[280px] leading-relaxed font-semibold">
            ApniSamaj helps connect hearts within our traditional values. Read some of our beautiful couple testimonials.
          </p>
        </div>

        {/* Stories List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-rose-500" /></div>
        ) : stories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Heart size={28} className="mx-auto text-rose-200 mb-2" fill="currentColor" />
            <p className="text-[13px] font-semibold text-slate-500">No success stories have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map(story => {
              const married = formatMarried(story.weddingDate);
              const meta = [story.location, married && `Married ${married}`].filter(Boolean).join(' · ');
              return (
                <div
                  key={story._id}
                  onClick={() => navigate(`/member/matrimonial/success-stories/${story._id}`)}
                  className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-[0.99] transition-transform"
                >
                  {/* Image Banner */}
                  <div className="relative h-48 bg-slate-900 overflow-hidden">
                    <img
                      src={story.coverImage || FALLBACK_COVER}
                      alt={coupleNames(story)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    {story.featured && (
                      <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Star size={11} fill="currentColor" /> Featured
                      </span>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow">
                          <Heart size={14} fill="white" />
                        </div>
                        <div>
                          <h4 className="text-[15.5px] font-extrabold text-white">{coupleNames(story)}</h4>
                          {meta && <p className="text-[11px] text-white/80 font-bold">{meta}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quote Body */}
                  <div className="p-5 relative bg-white">
                    <Quote size={24} className="text-rose-100 absolute top-4 right-4" />
                    {story.title && <h3 className="text-[14px] font-extrabold text-slate-800 pr-8 mb-1">{story.title}</h3>}
                    <p className="text-[13px] text-slate-650 leading-relaxed font-semibold italic relative z-5 pr-8">
                      "{story.shortDescription}"
                    </p>

                    {/* Stars/Rating */}
                    <div className="flex items-center gap-1 mt-4 pt-3.5 border-t border-slate-100">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                      ))}
                      <span className="text-[11px] text-slate-400 font-bold ml-1.5">Read full story</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Share your story CTA */}
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart size={22} className="text-rose-500" fill="currentColor" />
          </div>
          <h3 className="text-[15px] font-extrabold text-slate-800">Found your match here?</h3>
          <p className="text-[12px] text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed font-medium">
            Share your success story and inspire other members of the community!
          </p>
          <button className="mt-4 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[12.5px] font-extrabold shadow-sm active:scale-95 transition-all">
            Share Your Story
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatrimonialSuccessStories;
