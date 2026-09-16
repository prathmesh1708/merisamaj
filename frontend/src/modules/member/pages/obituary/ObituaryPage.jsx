import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, MapPin, Calendar, Send, MessageCircle } from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { AnimatedPage } from '../../components/layout/AnimatedPage';
import { Avatar } from '../../components/common/Avatar';

const ObituaryPage = () => {
  const navigate = useNavigate();
  const { currentUser, obituaries, obituariesLoading, hasMoreObituaries, loadMoreObituaries, toggleObituaryShraddhanjali, addObituaryComment, markModuleAsVisited } = useData();
  const [commentTexts, setCommentTexts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    if (markModuleAsVisited) markModuleAsVisited('shradhanjali');
  }, [markModuleAsVisited]);

  const handleCommentSubmit = (obId) => {
    const text = commentTexts[obId]?.trim();
    if (text) {
      addObituaryComment(obId, text);
      setCommentTexts({ ...commentTexts, [obId]: '' });
      setExpandedComments({ ...expandedComments, [obId]: true });
    }
  };

  const toggleComments = (obId) => {
    setExpandedComments(prev => ({ ...prev, [obId]: !prev[obId] }));
  };

  return (
    <AnimatedPage>
      <PageHeader title="Tribute (Om Shanti)" />

      <div className="pt-20 pb-28 px-5 max-w-lg mx-auto space-y-5">
        {obituaries.map((ob, idx) => (
          <motion.div
            key={ob.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 relative"
          >
            {/* Watermark */}
            <div className="absolute top-4 right-4 text-[60px] leading-none text-gray-50/50 select-none pointer-events-none font-serif">
              Om
            </div>

            {/* Photo & Header */}
            <div className="p-5 flex gap-4 items-start relative z-10">
              <div className="w-20 h-20 rounded-[20px] bg-gray-100 shrink-0 border border-gray-200 overflow-hidden shadow-sm">
                <img src={ob.image} alt={ob.deceasedName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-serif font-bold text-[18px] text-gray-900 leading-tight">
                  {ob.deceasedName}
                </h3>
                <p className="text-[13px] text-gray-500 mt-1">Age: {ob.age} yrs &bull; Passed: {ob.dateOfPassing}</p>
              </div>
            </div>

            {/* Message */}
            <div className="px-5 pb-4">
              <p className="text-[14px] text-gray-700 leading-relaxed italic border-l-2 border-gray-200 pl-3">
                "{ob.message}"
              </p>
            </div>

            {/* Rites Details */}
            <div className="mx-5 mb-5 bg-gray-50 rounded-[16px] p-4 border border-gray-100">
              <h4 className="text-[12px] font-bold text-gray-900 uppercase tracking-widest mb-3">{ob.funeralDetails.type}</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{ob.funeralDetails.date}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Clock size={14} className="text-gray-400" />
                  <span>{ob.funeralDetails.time}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  <span className="leading-tight">{ob.funeralDetails.venue}</span>
                </div>
              </div>
            </div>

            {/* Footer / Author & Action */}
            <div className="px-5 py-4 border-t border-gray-50 flex items-center justify-between bg-white relative z-10">
              <div className="flex items-center gap-2.5">
                <Avatar initials={ob.author.initials} size="sm" />
                <div>
                  <p className="text-[12px] font-bold text-gray-900">{ob.author.name}</p>
                  <p className="text-[11px] text-gray-500">{ob.author.relation} &bull; {ob.timestamp}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleComments(ob.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={16} />
                  <span className="text-[12px] font-bold">{ob.comments?.length || 0}</span>
                </button>
                <button 
                  onClick={() => toggleObituaryShraddhanjali(ob.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                    ob.hasOfferedShraddhanjali 
                      ? 'bg-amber-50 border-amber-200 text-amber-700' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[14px]">🙏</span>
                  <span className="text-[12px] font-bold">{ob.shraddhanjaliCount}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {expandedComments[ob.id] && (
              <div className="bg-[#faf9f7] px-5 py-5 border-t border-gray-100">
                {/* Existing Comments */}
                {ob.comments && ob.comments.length > 0 ? (
                  <div className="space-y-4 mb-4">
                    {ob.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 items-start">
                        <div className="shrink-0 mt-1">
                          <Avatar initials={comment.name.substring(0, 2).toUpperCase()} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0 border-b border-gray-100 pb-4">
                          <div className="flex justify-between items-baseline mb-1">
                            <p className="text-[13px] font-bold text-gray-900">{comment.name}</p>
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">{comment.timestamp}</span>
                          </div>
                          <p className="text-[14px] text-gray-700 leading-relaxed italic font-serif opacity-90">"{comment.text}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 pb-8 border-b border-gray-100 mb-4">
                    <span className="text-[24px] mb-2 block opacity-40">🕊️</span>
                    <p className="text-[13px] text-gray-500 font-medium">Be the first to offer condolences.</p>
                  </div>
                )}

                {/* Add Comment Input */}
                <div className="flex items-center gap-3 bg-white rounded-2xl p-1 border border-gray-200 shadow-sm focus-within:border-amber-300 focus-within:ring-1 focus-within:ring-amber-300 transition-all">
                  <div className="shrink-0 pl-2">
                    <Avatar initials={currentUser?.initials || 'ME'} size="w-8 h-8 text-[11px]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Write a message of sympathy..."
                    className="flex-1 bg-transparent border-none py-3 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                    value={commentTexts[ob.id] || ''}
                    onChange={(e) => setCommentTexts({ ...commentTexts, [ob.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit(ob.id);
                      }
                    }}
                  />
                  <button 
                    onClick={() => handleCommentSubmit(ob.id)}
                    disabled={!commentTexts[ob.id]?.trim()}
                    className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 transition-colors mr-1"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Load More Button */}
        {hasMoreObituaries && obituaries.length > 0 && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMoreObituaries}
              disabled={obituariesLoading}
              className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {obituariesLoading ? 'Loading more...' : 'Load More Tributes'}
            </button>
          </div>
        )}
      </div>

      {/* FAB to create obituary */}
      <button
        onClick={() => navigate('/member/obituaries/create')}
        className="fixed bottom-[92px] right-5 w-14 h-14 rounded-[22px] bg-gray-900 text-white flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.2)] press-scale z-40 hover:scale-105 transition-transform"
      >
        <Plus size={24} />
      </button>
    </AnimatedPage>
  );
};

export default ObituaryPage;
