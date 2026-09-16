import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

const ChatRouteWrapper = () => {
  const params = useParams();
  const id = params.id || params.chatId || params.memberId;

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!id || id === 'undefined' || id === 'null' || id === 'member' || id === 'me') {
    return <Navigate to="/member/chat" replace />;
  }

  // 24-character hexadecimal ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    return <Navigate to={`/member/chat/member/${id}`} replace />;
  }

  // Safe fallback for all other invalid or legacy strings
  return <Navigate to="/member/chat" replace />;
};

export default ChatRouteWrapper;
