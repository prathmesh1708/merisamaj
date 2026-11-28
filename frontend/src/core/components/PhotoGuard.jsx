/**
 * PhotoGuard — the owner's "Screenshot Protection" for matrimonial photos.
 *
 * A website can't stop phone screenshots (the phone takes them; the page is never
 * told), so this makes copies traceable and harder to save instead:
 *   - a faint repeated watermark with the VIEWER's name and the last digits of their
 *     phone, so a shared screenshot shows who took it;
 *   - long-press "Download image", right-click "Save image" and dragging are blocked
 *     (a transparent layer sits over the photo, and the image ignores touches);
 *   - the photo blurs while the app is in the background (app-switcher preview).
 *
 * Usage: wrap the <img>. `className` positions the wrapper (e.g. "absolute inset-0").
 * With `enabled={false}` the photo is shown as is.
 */
import { useEffect, useMemo, useState } from 'react';

const viewerMark = () => {
  try {
    const u = JSON.parse(localStorage.getItem('merisamaj_user') || 'null');
    const digits = String(u?.phone || '').replace(/\D/g, '');
    const tail = digits ? `••${digits.slice(-4)}` : (u?.memberId || u?.referralCode || '');
    return [u?.name, tail].filter(Boolean).join(' · ') || 'ApniSamaj member';
  } catch {
    return 'ApniSamaj member';
  }
};

const block = (e) => e.preventDefault();

const PhotoGuard = ({ enabled = true, className = '', children }) => {
  const mark = useMemo(() => viewerMark(), []);
  const [backgrounded, setBackgrounded] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    if (!enabled) return undefined;
    const update = () => setBackgrounded(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [enabled]);

  if (!enabled) return children;

  const rows = Array.from({ length: 7 });
  return (
    <div
      className={`select-none [&_img]:pointer-events-none [&_img]:select-none ${className}`}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={block}
      onDragStart={block}
    >
      <div className={`w-full h-full transition-[filter] duration-200 ${backgrounded ? 'blur-2xl' : ''}`}>
        {children}
      </div>
      {/* Takes long-presses / right-clicks instead of the image; taps still reach the card */}
      <div className="absolute inset-0 z-[1]" aria-hidden="true" onContextMenu={block} />
      {/* Watermark: the viewer's identity, repeated diagonally */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden" aria-hidden="true" translate="no">
        <div className="absolute -inset-1/4 flex flex-col justify-around -rotate-[28deg]">
          {rows.map((_, i) => (
            <div key={i} className={`flex gap-10 whitespace-nowrap ${i % 2 ? 'translate-x-16' : ''}`}>
              {Array.from({ length: 4 }).map((__, j) => (
                <span key={j} className="text-[11px] font-bold tracking-wide text-white/40" style={{ textShadow: '0 0 2px rgba(0,0,0,0.35)' }}>
                  {mark}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoGuard;
