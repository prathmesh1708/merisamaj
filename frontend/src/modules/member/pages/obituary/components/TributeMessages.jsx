import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart } from 'lucide-react';
import { useData } from '../../../context/DataProvider';
import { Avatar } from '../../../components/common/Avatar';

/**
 * TributeMessages — Conversation-style tribute messages with likes.
 * Matches reference image screen 10.
 */
const TributeMessages = ({ obituaryId, comments = [] }) => {
  const { currentUser, addObituaryComment, likeObituaryComment } = useData();
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addObituaryComment(obituaryId, trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Quick message templates
  const quickMessages = ['Om Shanti 🙏', 'Rest in Peace 🙏', 'Heartfelt Condolences'];

  return (
    <div className="rounded-[24px] border border-amber-200/70 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-2">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-amber-100/70 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #FDF8F0 0%, #FFFBF5 100%)' }}
      >
        <span className="text-[17px]">💬</span>
        <h3 className="text-[14px] font-extrabold text-[#7C5C2E]">
          Messages & Condolences
        </h3>
        <span className="ml-auto text-[11.5px] font-bold text-amber-900/60">
          {comments.length} Messages
        </span>
      </div>

      {/* Messages list */}
      <div className="divide-y divide-amber-50 max-h-[320px] overflow-y-auto">
        {comments.length === 0 ? (
          <div className="py-7 flex flex-col items-center gap-1.5">
            <span className="text-[34px]">🕊️</span>
            <p className="text-[12.5px] text-slate-400 font-medium">
              Be the first to offer condolences
            </p>
          </div>
        ) : (
          comments.map((comment, idx) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex gap-3 px-4 py-3"
            >
              {/* Avatar */}
              <Avatar
                initials={comment.initials || (comment.name || '?').substring(0, 2).toUpperCase()}
                size="sm"
              />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{comment.name}</p>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">{comment.timestamp}</span>
                </div>
                <p className="text-[12.5px] text-slate-600 leading-relaxed font-medium">{comment.text}</p>
                {/* Like */}
                <button
                  onClick={() => likeObituaryComment && likeObituaryComment(obituaryId, comment.id)}
                  className="flex items-center gap-1 mt-1.5 press-scale"
                >
                  <Heart
                    size={12}
                    fill={comment.isLiked ? '#F43F5E' : 'none'}
                    stroke={comment.isLiked ? '#F43F5E' : '#9CA3AF'}
                  />
                  <span className="text-[11px] font-bold" style={{ color: comment.isLiked ? '#F43F5E' : '#9CA3AF' }}>
                    {comment.likes > 0 ? comment.likes : ''}
                  </span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Quick messages */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-amber-50 bg-amber-50/20">
        {quickMessages.map((msg) => (
          <button
            key={msg}
            onClick={() => {
              addObituaryComment(obituaryId, msg);
            }}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold border border-amber-200/80 text-amber-900 bg-white hover:bg-amber-50 transition-all press-scale shadow-2xs"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="px-3.5 py-3 border-t border-amber-100/70 bg-white">
        <div
          className="flex items-end gap-2 rounded-2xl border px-3 py-2 transition-all focus-within:ring-1"
          style={{
            borderColor: 'rgba(212,175,55,0.4)',
            '--tw-ring-color': 'rgba(212,175,55,0.4)',
            background: '#FAFAF8'
          }}
        >
          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-purple-200 mb-0.5">
            {currentUser?.initials || 'ME'}
          </div>
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write your message..."
            className="flex-1 bg-transparent border-none text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 font-medium resize-none overflow-y-auto leading-relaxed py-1 min-h-[24px] max-h-[120px]"
            style={{ boxSizing: 'border-box' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 press-scale mb-0.5"
            style={{
              background: text.trim()
                ? 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)'
                : '#F1F5F9',
              color: text.trim() ? 'white' : '#94A3B8'
            }}
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TributeMessages;
