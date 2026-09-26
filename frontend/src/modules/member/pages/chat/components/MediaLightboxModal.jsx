import React, { useEffect } from 'react';
import { X, Download, Share2 } from 'lucide-react';

export const MediaLightboxModal = ({ url, caption, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo_${Date.now()}.jpg`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div className="w-full flex items-center justify-between py-2 z-10" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors press-scale"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors press-scale"
            title="Download image"
          >
            <Download size={19} />
          </button>
        </div>
      </div>

      {/* Main Image container */}
      <div className="flex-1 w-full flex items-center justify-center p-2 min-h-0">
        <img
          src={url}
          alt={caption || 'Chat photo'}
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all"
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Caption if present */}
      {caption && (
        <div className="w-full max-w-lg py-3 px-4 bg-white/10 backdrop-blur-md rounded-2xl text-white text-center text-[14px] font-semibold mb-2 z-10">
          {caption}
        </div>
      )}
    </div>
  );
};

export default MediaLightboxModal;
