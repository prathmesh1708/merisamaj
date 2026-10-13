import React from 'react';
import { FullImage } from '../../../../../core/components/FullImage';

/**
 * TributeHeroImage — Full-bleed hero image for detail page.
 * Shows Om Shanti badge, floral corner decorations, and gradient overlays.
 */
const TributeHeroImage = ({ src, alt, deceasedName }) => {
  return (
    <div className="w-full pt-14">
      <div className="relative w-full h-[320px] sm:h-[360px] overflow-hidden bg-slate-900">
        {/* Photo */}
        {/* Whole photo, never cropped */}
        <FullImage src={src} alt={alt || deceasedName} />

        {/* Decorative floral corners */}
        <div className="absolute bottom-2 left-3 right-3 flex justify-between pointer-events-none z-10">
          <span className="text-[26px] opacity-70 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>🌸</span>
          <span className="text-[26px] opacity-70 select-none" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>🌸</span>
        </div>
      </div>
    </div>
  );
};

export default TributeHeroImage;
