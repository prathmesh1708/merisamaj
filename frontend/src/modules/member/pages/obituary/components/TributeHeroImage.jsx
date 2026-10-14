import React from 'react';

/**
 * TributeHeroImage — Full-bleed hero image for detail page.
 * Captures the full space without borders, showing the entire uploaded image.
 */
const TributeHeroImage = ({ src, alt, deceasedName }) => {
  if (!src) return null;

  return (
    <div className="w-full pt-14">
      <div className="relative w-full overflow-hidden">
        {/* Whole photo capturing full space without border */}
        <img
          src={src}
          alt={alt || deceasedName}
          className="w-full h-auto block"
        />

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
