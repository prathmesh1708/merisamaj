import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Calendar } from 'lucide-react';
import { resolvePostMediaUrl } from '../../../utils/mediaUtils';

/**
 * ShradhanjaliCard — Compact list card for the home screen.
 * Tapping navigates to the detail page.
 */
const ShradhanjaliCard = ({ obituary, index = 0 }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const resolvedImage = resolvePostMediaUrl(obituary.image);

  const formatCount = (n) => {
    if (!n && n !== 0) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={() => navigate(`/member/shradhanjali/${obituary.id}`)}
      className="card-std overflow-hidden cursor-pointer press-scale"
    >
      {/* Top section: photo + info */}
      <div className="flex gap-3 p-4">
        {/* Photo */}
        <div className="relative shrink-0">
          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden border border-amber-100 bg-amber-50/50 flex items-center justify-center">
            {resolvedImage && !imgError ? (
              <img
                src={resolvedImage}
                alt={obituary.deceasedName}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">🪔</span>
            )}
          </div>
          {/* Om badge */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px]"
            style={{ background: 'rgba(30,20,10,0.85)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
          >
            Om
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-[15px] leading-tight line-clamp-1"
            style={{ color: '#1A1A1A', fontFamily: 'Outfit, serif' }}
          >
            {obituary.deceasedName}
          </h3>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Age: {obituary.age} Years &bull; Passing: {obituary.dateOfPassing}
          </p>

          {/* Ceremony */}
          {obituary.funeralDetails && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Calendar size={10} className="text-amber-600" />
                {obituary.funeralDetails.date}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Clock size={10} className="text-amber-600" />
                {obituary.funeralDetails.time}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px mx-4 bg-amber-50" />

      {/* Footer: interactions + time */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={e => { e.stopPropagation(); }}
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: '#7C5C2E' }}
          >
            <span className="text-[15px]">🙏</span>
            {formatCount(obituary.haathJodeCount || obituary.shraddhanjaliCount)}
          </button>
          <button
            onClick={e => { e.stopPropagation(); }}
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: '#B8395A' }}
          >
            <span className="text-[15px]">🪷</span>
            {formatCount(obituary.malaArpanCount)}
          </button>
          <span className="flex items-center gap-1 text-[12px] text-gray-400">
            <MapPin size={10} />
            {obituary.funeralDetails?.venue?.split(',')[0] || '—'}
          </span>
        </div>
        <span className="text-[11px] text-gray-400">{obituary.timestamp}</span>
      </div>
    </motion.div>
  );
};

export default ShradhanjaliCard;
