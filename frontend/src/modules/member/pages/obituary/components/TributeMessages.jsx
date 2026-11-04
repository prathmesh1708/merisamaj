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
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addObituaryComment(obituaryId, trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Quick message templates
  const quickMessages = ['Om Shanti 🙏', 'Rest in Peace 🙏', 'Heartfelt Condolences'];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-gray-50 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #FDF8F0 0%, #FFFBF5 100%)' }}
      >
        <span className="text-[18px]">💬</span>
        <h3 className="text-[14px] font-bold" style={{ color: '#7C5C2E' }}>
          Messages & Condolences
        </h3>
        <span className="ml-auto text-[12px] font-semibold text-gray-400">
          {comments.length} Messages
        </span>
      </div>

      {/* Messages list */}
      <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
        {comments.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2">
            <span className="text-[36px]">🕊️</span>
            <p className="text-[13px] text-gray-400 font-medium">
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
                src={comment.avatar}
                size="lg"
              />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{comment.name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0">{comment.timestamp}</span>
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed">{comment.text}</p>
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
                  <span className="text-[11px]" style={{ color: comment.isLiked ? '#F43F5E' : '#9CA3AF' }}>
                    {comment.likes > 0 ? comment.likes : ''}
                  </span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Quick messages */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide border-t border-gray-50">
        {quickMessages.map((msg) => (
          <button
            key={msg}
            onClick={() => {
              addObituaryComment(obituaryId, msg);
            }}
            className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-amber-50 hover:border-amber-200 transition-colors press-scale"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2 transition-all focus-within:ring-1"
          style={{
            borderColor: 'rgba(212,175,55,0.3)',
            '--tw-ring-color': 'rgba(212,175,55,0.4)',
            background: '#FAFAF8'
          }}
        >
          <Avatar
            initials={currentUser?.initials || 'ME'}
            size="sm"
          />
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message..."
            className="flex-1 bg-transparent border-none text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{
              background: text.trim()
                ? 'linear-gradient(135deg, #7C5C2E 0%, #D4AF37 100%)'
                : '#F3F4F6',
              color: text.trim() ? 'white' : '#9CA3AF'
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
