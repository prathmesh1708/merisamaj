import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Sheet Content — Glass panel with purple accent */}
      <div 
        className={`relative w-full bg-white/95 backdrop-blur-xl rounded-t-[28px] shadow-[0_-8px_40px_rgba(124,58,237,0.1)] flex flex-col max-h-[90vh] gpu-accel ${isOpen ? 'animate-slide-up' : 'animate-slide-down'}`}
        onAnimationEnd={handleAnimationEnd}
        style={{ paddingBottom: 'var(--spacing-safe-bottom)' }}
      >
        {/* Drag handle with purple accent */}
        <div className="flex justify-center p-3 pb-1">
          <div className="w-10 h-1 bg-gradient-to-r from-purple-300 to-violet-300 rounded-full opacity-60" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h2 className="text-[17px] font-bold text-text-primary tracking-tight">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-gray-100/80 hover:bg-purple-50 text-gray-500 hover:text-purple-600 flex items-center justify-center press-scale transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subtle separator */}
        <div className="mx-5 h-[1px] bg-gradient-to-r from-transparent via-purple-200/30 to-transparent" />
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {children}
        </div>
      </div>
    </div>
  );
};
