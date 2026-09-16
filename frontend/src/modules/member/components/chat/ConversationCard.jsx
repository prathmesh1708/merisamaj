import React from 'react';
import { Users, Heart } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const ConversationCard = ({ conv, onClick }) => {
  const { title, avatar, type, lastMessagePreview, lastMessageAt, unreadCount, isOnline } = conv;
  
  const initials = title ? title.substring(0, 2).toUpperCase() : 'U';
  
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3.5 px-4 py-3 border-b border-slate-100/70 bg-white hover:bg-purple-50/20 active:bg-purple-100/30 cursor-pointer transition-colors text-left select-none"
    >
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200/70 shadow-2xs">
          {avatar ? (
            <img src={avatar} alt={title} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
        )}
        {type === 'matrimonial' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white shadow-xs text-white">
            <Heart size={9} fill="white" />
          </div>
        )}
        {type === 'group' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-xs text-white">
            <Users size={9} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-[14.5px] font-extrabold text-slate-800 truncate pr-2">{title}</h3>
          <span className="text-[11px] font-bold whitespace-nowrap shrink-0 text-slate-400">
            {formatTime(lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[12.5px] truncate leading-snug ${unreadCount > 0 ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-medium'}`}>
            {lastMessagePreview || (type === 'group' ? 'Start chatting...' : 'No messages yet')}
          </p>
          {unreadCount > 0 && (
            <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shadow-2xs shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;
