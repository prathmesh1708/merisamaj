import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ChevronLeft, Calendar, Loader2 } from 'lucide-react';
import { successStoryService } from '../../../../core/api/matrimonialService';

const SuccessStoryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const res = await successStoryService.getStoryDetails(id);
        setStory(res.data.data.story);
      } catch (err) {
        console.error('Failed to fetch story details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-24">
        <Loader2 className="animate-spin text-pink-500 w-10 h-10" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Story Not Found</h2>
        <p className="text-slate-500 mb-6">This success story might have been removed or is unavailable.</p>
        <button onClick={() => navigate('/member/home')} className="bg-pink-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-pink-600 transition-all">
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* ─── Hero Cover ─── */}
      <div className="relative w-full h-[400px] md:h-[500px]">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <ChevronLeft size={24} />
        </button>

        <img 
          src={story.coverImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'} 
          alt={story.title} 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex flex-col items-center text-center">
          <div className="bg-pink-500/90 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest inline-flex self-center mb-4 shadow-sm border border-pink-400/40">
            Met through Samaj Matrimony
          </div>
          <h1 className="text-white text-3xl md:text-5xl font-serif font-bold leading-tight drop-shadow-lg mb-3">
            {/* Linked app users, or the names the admin typed in */}
            {story.groomId?.name || story.groomName} & {story.brideId?.name || story.brideName}
          </h1>
          {(story.weddingDate || story.location) && (
            <p className="text-white/90 text-sm md:text-base font-medium flex items-center gap-2 drop-shadow-md">
              <Heart size={16} className="text-pink-400 fill-pink-400" />
              {story.weddingDate
                ? `Married on ${new Date(story.weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Happily married'}
              {story.location ? ` · ${story.location}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* ─── Story Content ─── */}
      <div className="max-w-2xl mx-auto px-5 py-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">{story.title}</h2>
        
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
          <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-line text-justify md:text-left">
            {story.story}
          </p>
        </div>

        {/* ─── Gallery ─── */}
        {story.gallery && story.gallery.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-lg flex items-center justify-center">📷</span> 
              Wedding Gallery
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {story.gallery.map((img, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all">
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-30 flex justify-center">
        <button 
          onClick={() => navigate('/member/matrimonial')}
          className="w-full max-w-md bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-500/25 active:scale-95 transition-all"
        >
          Find Your Perfect Match 💖
        </button>
      </div>
    </div>
  );
};

export default SuccessStoryDetails;
