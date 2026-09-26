import React from 'react';
import { Camera, Image as ImageIcon, FileText, Headphones, MapPin, User, X } from 'lucide-react';

export const WhatsAppAttachmentMenu = ({
  onSelectCamera,
  onSelectGallery,
  onSelectDocument,
  onSelectAudio,
  onSelectLocation,
  onClose
}) => {
  const options = [
    {
      id: 'gallery',
      label: 'Gallery',
      icon: ImageIcon,
      bgColor: 'bg-gradient-to-tr from-purple-500 to-indigo-500',
      onClick: onSelectGallery
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: Camera,
      bgColor: 'bg-gradient-to-tr from-pink-500 to-rose-500',
      onClick: onSelectCamera
    },
    {
      id: 'document',
      label: 'Document',
      icon: FileText,
      bgColor: 'bg-gradient-to-tr from-indigo-500 to-blue-500',
      onClick: onSelectDocument
    },
    {
      id: 'audio',
      label: 'Audio File',
      icon: Headphones,
      bgColor: 'bg-gradient-to-tr from-amber-500 to-orange-500',
      onClick: onSelectAudio
    },
    {
      id: 'location',
      label: 'Location',
      icon: MapPin,
      bgColor: 'bg-gradient-to-tr from-emerald-500 to-teal-500',
      onClick: onSelectLocation
    }
  ];

  return (
    <div
      className="w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-slate-200/90 z-30 animate-scale-in"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <p className="text-[13px] font-extrabold text-slate-800">Share content</p>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 press-scale"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {options.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-purple-50/60 transition-all press-scale group"
            >
              <div className={`w-12 h-12 rounded-2xl ${item.bgColor} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <span className="text-[11.5px] font-extrabold text-slate-700">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WhatsAppAttachmentMenu;
