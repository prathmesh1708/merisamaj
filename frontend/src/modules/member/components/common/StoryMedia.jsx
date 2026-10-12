import React from 'react';

// A story's "media" can be an image URL, a video, or — for text-only stories —
// a CSS background such as a gradient. Only real URLs can go into <img>/<video>.
const isCssBackground = (value) =>
  typeof value === 'string' && /^(linear|radial|conic)-gradient\(|^#|^rgb/.test(value.trim());

const isVideo = (story) =>
  story?.mediaType === 'video' ||
  (typeof story?.image === 'string' && /^data:video\/|\.(mp4|webm|mov)(\?|$)/i.test(story.image));

const FALLBACK_BACKGROUND = 'linear-gradient(135deg, #f472b6 0%, #7c3aed 100%)';

/**
 * Renders a story's visual (image, video or coloured background), filling its parent.
 * `autoPlay` is for the full-screen viewer; thumbnails stay muted and still.
 */
export const StoryMedia = ({ story, className = 'w-full h-full object-cover', autoPlay = false }) => {
  const media = story?.image;
  const background = isCssBackground(story?.background) ? story.background : null;

  if (!media || isCssBackground(media)) {
    return <div className={className} style={{ background: (isCssBackground(media) && media) || background || FALLBACK_BACKGROUND }} />;
  }

  if (isVideo(story)) {
    return (
      <video
        src={media}
        className={className}
        muted
        playsInline
        loop={autoPlay}
        autoPlay={autoPlay}
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={media}
      alt=""
      className={className}
      onError={(e) => {
        // Broken image → show the coloured background instead of a broken-image icon
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.background = background || FALLBACK_BACKGROUND;
      }}
    />
  );
};

export default StoryMedia;
