import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Send, Paperclip, Clock, CheckCheck, User, Square } from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { useData } from '../../context/DataProvider';

const ChatPage = ({ memberId: propMemberId }) => {
  const { id } = useParams();
  const memberId = propMemberId || id;
  const navigate = useNavigate();
  const { members, currentUser, matrimonialProfiles } = useData();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const recipient = members.find(m => m.id === memberId) || matrimonialProfiles.find(p => p.id === memberId) || { name: 'Member', initials: 'M' };

  // Track online/offline status for the queuing logic
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // "Deliver" all pending messages when connection is restored
      setMessages(prev => prev.map(m => m.status === 'pending' ? { ...m, status: 'delivered' } : m));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (content, type = 'text') => {
    if (!content && type === 'text') return;
    
    const newMessage = {
      id: Date.now(),
      sender: 'self',
      type,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOnline ? 'delivered' : 'pending' // Simulated offline queuing
    };

    setMessages(prev => [...prev, newMessage]);
    if (type === 'text') setInputText('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        sendMessage(audioUrl, 'audio');
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone permissions to send voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ─── HEADER ─── */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 press-scale">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <Avatar src={recipient.avatar} initials={recipient.initials || recipient.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'M'} size="sm" />
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 leading-tight">{recipient.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <p className="text-[11px] font-medium text-gray-500">
                {isOnline ? 'Online' : 'Offline - Messages will queue'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CHAT HISTORY ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-60">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mic size={28} className="text-brand-primary" />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No messages yet</p>
            <p className="text-xs text-gray-500 px-10">Send a text or hold the microphone icon to record a voice note.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'self' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${msg.sender === 'self' ? 'bg-brand-primary text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                
                {msg.type === 'text' && (
                  <p translate="no" className="notranslate text-[15px] leading-snug">{msg.content}</p>
                )}
                
                {msg.type === 'audio' && (
                  <div className="flex items-center gap-2">
                    <button className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.sender === 'self' ? 'bg-white/20' : 'bg-brand-primary/10'}`}>
                      <User size={14} className={msg.sender === 'self' ? 'text-white' : 'text-brand-primary'} />
                    </button>
                    <audio src={msg.content} controls className="h-8 w-44 rounded-full outline-none" />
                  </div>
                )}
                
              </div>
              
              {/* Timestamp & Status */}
              <div className="flex items-center gap-1.5 mt-1 px-1">
                <span className="text-[10px] text-gray-400 font-medium">{msg.timestamp}</span>
                {msg.sender === 'self' && (
                  msg.status === 'pending' ? (
                    <Clock size={10} className="text-gray-400" />
                  ) : (
                    <CheckCheck size={12} className="text-emerald-500" />
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── INPUT AREA ─── */}
      <div className="bg-white border-t border-gray-100 p-3 pb-safe shrink-0">
        <div className="flex items-center gap-2 relative">
          
          {isRecording ? (
            <div className="flex-1 bg-rose-50 rounded-full py-2.5 px-4 flex items-center justify-between border border-rose-100 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                <span className="text-rose-600 font-medium text-[15px]">{formatDuration(recordingDuration)}</span>
              </div>
              <span className="text-rose-500 text-xs font-bold mr-2 uppercase tracking-wide">Recording...</span>
            </div>
          ) : (
            <>
              <button className="p-2 text-gray-400 hover:text-brand-primary press-scale shrink-0">
                <Paperclip size={22} />
              </button>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full py-2.5 px-4 text-[15px] outline-none focus:border-brand-primary focus:bg-white transition-colors"
              />
            </>
          )}

          {inputText ? (
            <button 
              onClick={() => sendMessage(inputText)}
              className="w-11 h-11 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-md press-scale shrink-0"
            >
              <Send size={18} className="ml-1" />
            </button>
          ) : (
            <button 
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 shrink-0 ${isRecording ? 'bg-rose-500 scale-110 shadow-rose-200' : 'bg-brand-primary press-scale'}`}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
