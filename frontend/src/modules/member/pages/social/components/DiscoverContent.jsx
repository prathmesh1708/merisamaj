import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, UserCheck, UserPlus, Compass } from 'lucide-react';
import { useData } from '../../../context/DataProvider';

export const DiscoverContent = () => {
  const navigate = useNavigate();
  const { members = [], followRelations = [], sendFollowRequest, unfollowUser, currentUser } = useData();
  const [searchText, setSearchText] = useState('');
  
  const followedIds = useMemo(() => {
    return followRelations
      .filter(rel => rel.followerId === currentUser?.id)
      .map(rel => rel.followingId);
  }, [followRelations, currentUser]);

  const filteredMembers = useMemo(() => {
    if (!searchText.trim()) return members;
    const query = searchText.toLowerCase();
    return members.filter(m => 
      m.id !== currentUser?.id && (
        m.name?.toLowerCase().includes(query) ||
        m.phone?.toLowerCase().includes(query) ||
        m.id?.toLowerCase().includes(query)
      )
    );
  }, [members, searchText, currentUser]);

  const handleFollowToggle = (userId, isFollowing) => {
    if (isFollowing) {
      unfollowUser(userId);
    } else {
      sendFollowRequest(userId);
    }
  };

  const handleMemberClick = (userId) => {
    if (userId) {
      navigate(`/member/directory/${userId}`);
    }
  };

  return (
    <div className="p-4 pb-28 text-left select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 rounded-[28px] p-5 text-white mb-4 shadow-[0_8px_25px_rgba(124,58,237,0.2)] border border-purple-400/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-3 border border-white/20">
            <Compass size={22} className="text-white" />
          </div>
          <h3 className="text-[18px] font-extrabold tracking-tight">Discover Members</h3>
          <p className="text-[12.5px] text-purple-100/90 mt-0.5 font-medium leading-snug">Find and connect with people in your community.</p>
        </div>
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>
      
      {/* Search Input */}
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={16} className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, mobile, or ID..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-[13px] font-extrabold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500/50 focus:bg-white transition-all shadow-2xs"
        />
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="font-extrabold text-[14.5px] text-slate-800">
          {searchText ? 'Search Results' : 'Suggested Connections'}
        </h4>
        <span className="text-[10.5px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-full">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'Member' : 'Members'}
        </span>
      </div>

      {/* Members Grid / Empty State */}
      {filteredMembers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-[28px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 my-2">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 border border-purple-100/60 rounded-2xl flex items-center justify-center shadow-2xs mb-3">
            <Search size={24} />
          </div>
          <p className="text-[15px] font-extrabold text-slate-800">No Members Found</p>
          <p className="text-[12px] text-slate-400 font-medium mt-1 max-w-[200px]">Try searching with a different name, mobile number, or ID.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filteredMembers.map(user => {
            const isFollowing = followedIds.includes(user.id);
            const targetId = user.id || user._id;
            return (
              <div 
                key={user.id} 
                onClick={() => handleMemberClick(targetId)}
                className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(124,58,237,0.08)] p-4 flex flex-col items-center text-center relative overflow-hidden transition-all hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 font-black text-base flex items-center justify-center mb-2.5 shadow-2xs border border-purple-100/60 shrink-0 overflow-hidden">
                  {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-2xl" /> : (user.initials || (user.name || 'U').substring(0, 2).toUpperCase())}
                </div>
                <h5 className="text-[13.5px] font-extrabold text-slate-800 line-clamp-1 leading-tight hover:text-purple-700 transition-colors">{user.name}</h5>
                <p className="text-[11px] text-slate-500 mt-1 font-bold flex items-center justify-center gap-1 truncate w-full">
                  <MapPin size={11} className="text-slate-400 shrink-0" /> <span className="truncate">{user.city || 'Indore'}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 mb-3 line-clamp-1 h-3.5 w-full">{user.profession || 'Community Member'}</p>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollowToggle(user.id, isFollowing);
                  }}
                  className={`w-full py-2 flex items-center justify-center gap-1.5 text-[11px] font-extrabold rounded-xl transition-all press-scale ${
                    isFollowing 
                      ? 'bg-slate-100 text-slate-600 border border-slate-200/60 hover:bg-slate-200' 
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xs hover:opacity-95'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={13} strokeWidth={2.5} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} strokeWidth={2.5} />
                      Follow
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
