import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Video, Search, Bell,
  Image as ImageIcon, FileText, Link2, ChevronRight,
  UserPlus, Camera, Ban, Trash2
} from 'lucide-react';
import { useData } from '../../context/DataProvider';
import { Avatar } from '../../components/common/Avatar';
import { mockChats } from '../../data/mockChats';

const ChatInfoPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats } = useData();
  const [activeTab, setActiveTab] = useState('media'); // media, docs, links

  const chat = mockChats.find(c => c.id === chatId) || chats.find(c => c.id === chatId);
  
  const [isMuted, setIsMuted] = useState(chat?.isMuted || false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };
  
  if (!chat) {
    return <div className="flex h-screen items-center justify-center">Chat not found</div>;
  }

  const mockMedia = Array(12).fill(null).map((_, i) => `https://images.unsplash.com/photo-${1500000000000 + i}?w=200&h=200&fit=crop`);
  const mockDocs = [
    { name: 'Meeting_Agenda.pdf', size: '2.4 MB', date: 'Yesterday' },
    { name: 'Event_Budget.xlsx', size: '1.1 MB', date: '12 May' },
    { name: 'Guidelines.docx', size: '500 KB', date: '04 May' },
  ];
  const mockLinks = [
    { url: 'https://example.com/registration', title: 'Event Registration Form', domain: 'example.com' },
    { url: 'https://youtube.com/watch?v=123', title: 'Previous Event Highlights', domain: 'youtube.com' },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* HEADER */}
      <div className="bg-white px-3 flex items-center justify-between sticky top-0 z-20 shadow-sm border-b border-gray-100 pb-3"
           style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 12px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 -ml-2">
            <ArrowLeft size={22} className="text-gray-800" />
          </button>
          <span className="font-bold text-[18px] text-gray-900">{chat.isGroup ? 'Group Info' : 'Contact Info'}</span>
        </div>
        {chat.isGroup && chat.adminIds?.includes('u1') && (
          <button className="text-brand-primary font-bold text-[14px] px-2 active:opacity-70">
            Edit
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* PROFILE HEADER */}
        <div className="bg-white flex flex-col items-center pt-8 pb-6 px-6 shadow-sm mb-2 text-center">
          <div className="relative mb-4">
            <Avatar src={chat.avatar} initials={chat.initials} size="xl" className="w-32 h-32 text-4xl shadow-lg border-4 border-white"
                    color={chat.isGroup ? 'bg-violet-100 text-violet-600' : 'bg-orange-100 text-orange-600'} />
            {chat.isGroup && chat.adminIds?.includes('u1') && (
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center border-[3px] border-white shadow-sm active:scale-95">
                <Camera size={18} />
              </button>
            )}
          </div>
          <h1 className="text-[22px] font-bold text-gray-900 mb-1">{chat.name}</h1>
          <p className="text-gray-500 text-[14px]">
            {chat.isGroup 
              ? `Group • ${chat.participants?.length || 0} participants` 
              : '+91 98765 43210'}
          </p>
          <div className="flex items-center gap-6 mt-6">
            <button onClick={() => navigate(-1)} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-brand-primary active:bg-gray-50 transition-colors">
                <Search size={22} />
              </div>
              <span className="text-[12px] font-semibold text-gray-600">Search</span>
            </button>
          </div>
        </div>

        {/* DESCRIPTION / ABOUT */}
        <div className="bg-white px-5 py-4 shadow-sm mb-2">
          <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {chat.isGroup ? 'Description' : 'About'}
          </p>
          <p className="text-[15px] text-gray-900 leading-relaxed">
            {chat.description || (chat.isGroup ? 'No description provided.' : 'Available')}
          </p>
          {chat.isGroup && chat.createdAt && (
            <p className="text-[12px] text-gray-400 mt-2">
              Created on {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* MEDIA */}
        <div className="bg-white shadow-sm mb-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-pointer active:bg-gray-50">
            <p className="text-[15px] font-bold text-gray-900">Shared Media</p>
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-[14px]">{mockMedia.length}</span>
              <ChevronRight size={20} />
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-1.5">
              {mockMedia.map((url, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-md overflow-hidden">
                  <img src={url} alt="media" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SETTINGS */}
        <div className="bg-white shadow-sm mb-2">
          <div onClick={() => setIsMuted(!isMuted)} className="flex items-center justify-between px-5 py-4 active:bg-gray-50 cursor-pointer">
            <div className="flex items-center gap-4">
              <Bell size={22} className="text-gray-500" />
              <span className="text-[15px] font-medium text-gray-900">Mute notifications</span>
            </div>
            {/* Toggle Switch UI */}
            <div className={`w-11 h-6 rounded-full p-1 transition-colors ${isMuted ? 'bg-brand-primary' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isMuted ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* GROUP PARTICIPANTS (If Group) */}
        {chat.isGroup && (
          <div className="bg-white shadow-sm mb-2 py-2">
            <div className="flex items-center justify-between px-5 py-2">
              <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">
                {chat.participants?.length || 0} Participants
              </p>
              <Search size={18} className="text-gray-400" />
            </div>
            
            {chat.adminIds?.includes('u1') && (
              <div className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <UserPlus size={20} />
                </div>
                <span className="text-[15px] font-semibold text-brand-primary">Add participants</span>
              </div>
            )}

            {/* Mock Participant List */}
            {['u1', 'u2', 'u3'].map(uid => (
              <div key={uid} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 cursor-pointer group">
                <Avatar initials={`U${uid[1]}`} size="md" color="bg-gray-200 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-gray-900 truncate">
                    {uid === 'u1' ? 'You' : `Participant ${uid[1]}`}
                  </p>
                  <p className="text-[13px] text-gray-500 truncate">Hey there! I am using ApniSamaj.</p>
                </div>
                {chat.adminIds?.includes(uid) && (
                  <span className="text-[11px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20 shrink-0">
                    Group Admin
                  </span>
                )}
              </div>
            ))}
            <div className="px-5 py-3 border-t border-gray-50 mt-1 cursor-pointer">
              <p className="text-[14px] font-semibold text-gray-500">View all ({chat.participants?.length || 0})</p>
            </div>
          </div>
        )}

        {/* DANGER ACTIONS */}
        <div className="bg-white shadow-sm py-2">
          {!chat.isGroup ? (
            <>
              <button 
                onClick={() => {
                  showConfirm(`Are you sure you want to block ${chat.name}?`, () => navigate('/member/chat'));
                }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-red-500 transition-colors"
              >
                <Ban size={22} />
                <span className="text-[15px] font-semibold">Block {chat.name}</span>
              </button>
              <button 
                onClick={() => {
                  showConfirm("Are you sure you want to delete this chat?", () => navigate('/member/chat'));
                }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-red-500 transition-colors"
              >
                <Trash2 size={22} />
                <span className="text-[15px] font-semibold">Delete Chat</span>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  showConfirm("Are you sure you want to exit this group?", () => navigate('/member/groups'));
                }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-red-500 transition-colors"
              >
                <ArrowLeft size={22} />
                <span className="text-[15px] font-semibold">Exit Group</span>
              </button>
              {chat.adminIds?.includes('u1') && (
                <button 
                  onClick={() => {
                    showConfirm("Are you sure you want to delete this group?", () => navigate('/member/groups'));
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 text-red-500 transition-colors"
                >
                  <Trash2 size={22} />
                  <span className="text-[15px] font-semibold">Delete Group</span>
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {confirmDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-3xl w-full max-w-[320px] overflow-hidden animate-scale-up shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-[15.5px] font-bold text-gray-900 leading-snug">{confirmDialog.message}</h3>
            </div>
            <div className="p-4 flex gap-3 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="flex-1 py-2 rounded-xl text-[13px] font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }} 
                className="flex-1 py-2 rounded-xl text-[13px] font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInfoPage;
