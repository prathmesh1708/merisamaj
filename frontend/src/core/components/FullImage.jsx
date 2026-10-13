import React from 'react';

/**
 * Shows an uploaded photo COMPLETELY inside any fixed-size box — never cropped.
 * The photo is scaled to fit (object-contain); the empty space around it is filled
 * with a soft, blurred copy of the same photo so the card still looks full.
 *
 * The parent decides the size (e.g. h-[220px] w-full); this fills it.
 */
export const FullImage = ({ src, alt = '', className = '', imgClassName = '', blurBackground = true }) => {
  if (!src) return null;
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {blurBackground && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60 pointer-events-none select-none"
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`relative w-full h-full object-contain ${imgClassName}`}
      />
    </div>
  );
};

export default FullImage;
