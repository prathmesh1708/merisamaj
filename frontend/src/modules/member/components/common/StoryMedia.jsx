import React, { useEffect, useRef } from 'react';

// A story's "media" can be an image URL, a video, or — for text-only stories —
// a CSS background such as a gradient. Only real URLs can go into <img>/<video>.
const isCssBackground = (value) =>
  typeof value === 'string' && /^(linear|radial|conic)-gradient\(|^#|^rgb/.test(value.trim());

export const isVideo = (story) =>
  story?.mediaType === 'video' ||
  (typeof story?.image === 'string' && /^data:video\/|\.(mp4|webm|mov)(\?|$)/i.test(story.image));

const FALLBACK_BACKGROUND = 'linear-gradient(135deg, #f472b6 0%, #7c3aed 100%)';

/**
 * Renders a story's visual (image, video or coloured background), filling its parent.
 * `autoPlay` is for the full-screen viewer; thumbnails stay muted and still.
 * In the viewer a video drives its own timeline: `onVideoProgress(0..1)` while it
 * plays, `onVideoEnded` when it finishes, `onVideoError` if it can't play.
 * `paused` pauses/resumes it (e.g. while the user holds the screen).
 */
export const StoryMedia = ({
  story,
  className = 'w-full h-full object-cover',
  autoPlay = false,
  paused = false,
  onVideoProgress,
  onVideoEnded,
  onVideoError
}) => {
  const media = story?.image;
  const background = isCssBackground(story?.background) ? story.background : null;
  const videoRef = useRef(null);
  const showsVideo = Boolean(media) && !isCssBackground(media) && isVideo(story);

  // Pause / resume together with the viewer
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused, autoPlay, showsVideo]);

  // Report playback position every frame so the progress bar moves smoothly
  useEffect(() => {
    if (!showsVideo || !autoPlay || !onVideoProgress) return;
    let frame;
    const tick = () => {
      const video = videoRef.current;
      if (video && video.duration && Number.isFinite(video.duration)) {
        onVideoProgress(Math.min(1, video.currentTime / video.duration));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [showsVideo, autoPlay, onVideoProgress]);

  if (!media || isCssBackground(media)) {
    return <div className={className} style={{ background: (isCssBackground(media) && media) || background || FALLBACK_BACKGROUND }} />;
  }

  if (isVideo(story)) {
    return (
      <video
        ref={videoRef}
        src={media}
        className={className}
        muted
        playsInline
        // In the viewer the story ends with the video; thumbnails just sit still
        loop={false}
        autoPlay={autoPlay}
        preload={autoPlay ? 'auto' : 'metadata'}
        onEnded={autoPlay ? onVideoEnded : undefined}
        onError={autoPlay ? onVideoError : undefined}
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
