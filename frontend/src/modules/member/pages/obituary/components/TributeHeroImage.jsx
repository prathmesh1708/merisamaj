import React, { useState } from 'react';
import { resolvePostMediaUrl } from '../../../utils/mediaUtils';

/**
 * TributeHeroImage — Full-bleed hero image for detail page.
 * Shows Om Shanti badge, floral corner decorations, and peaceful placeholder if needed.
 */
const TributeHeroImage = ({ src, alt, deceasedName }) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolvePostMediaUrl(src);

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden flex items-center justify-center">
        {/* Photo or Serene Fallback */}
        {resolvedUrl && !imgError ? (
          <div className="relative w-full">
            {/* Main responsive image without letterboxing or artificial white/gray spaces */}
            <img
              src={resolvedUrl}
              alt={alt || deceasedName}
              onError={() => setImgError(true)}
              className="w-full h-auto max-h-[500px] object-cover sm:object-contain block"
            />

            {/* Decorative floral corners attached to the bottom corners of the image */}
            <div className="absolute bottom-2 left-3 right-3 flex justify-between pointer-events-none z-20">
              <span className="text-[26px] opacity-80 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🌸</span>
              <span className="text-[26px] opacity-80 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🌸</span>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-[260px] pt-16 pb-8 bg-gradient-to-b from-amber-100/60 to-amber-50/30 flex flex-col items-center justify-center gap-3 p-6 text-center border-b border-amber-200/60">
            <span className="text-[64px] animate-pulse">🪔</span>
            <div className="px-4 py-1.5 rounded-full bg-amber-900/10 border border-amber-900/20 text-amber-900 font-extrabold text-xs tracking-wider uppercase">
              In Loving Memory
            </div>
            <p className="text-sm font-bold text-slate-600">{deceasedName}</p>

            {/* Decorative floral corners */}
            <div className="absolute bottom-2 left-3 right-3 flex justify-between pointer-events-none z-20">
              <span className="text-[26px] opacity-80 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🌸</span>
              <span className="text-[26px] opacity-80 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>🌸</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TributeHeroImage;
