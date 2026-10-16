import React, { useRef, useState, useEffect } from 'react';
import {
  X, Image as ImageIcon, Video, Camera, Type, ChevronRight, Loader2,
  AlignLeft, AlignCenter, AlignRight, ALargeSmall, Trash2
} from 'lucide-react';

// Same text styles the StoryViewer renders, so the editor shows exactly what viewers see
const TEXT_BG_CLASS = {
  'pill-dark': 'bg-black/55 text-white px-5 py-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg',
  'pill-light': 'bg-white/85 text-slate-900 px-5 py-3 rounded-2xl backdrop-blur-md shadow-lg border border-white/40',
  neon: 'bg-gradient-to-r from-pink-500/90 via-purple-600/90 to-indigo-600/90 text-white px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl border border-white/20',
  transparent: 'text-white px-3 py-1 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]'
};
const BG_STYLES = ['transparent', 'pill-dark', 'pill-light', 'neon'];
const FONT_SIZE_CLASS = { sm: 'text-[14px]', base: 'text-[17px]', lg: 'text-[21px]', xl: 'text-[25px]' };
const FONT_SIZES = ['sm', 'base', 'lg', 'xl'];
const ALIGNS = ['center', 'left', 'right'];
const ALIGN_ICON = { left: AlignLeft, center: AlignCenter, right: AlignRight };

const TEXT_COLORS = ['#ffffff', '#0f172a', '#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc', '#f97316'];
const GRADIENTS = [
  'linear-gradient(135deg, #f472b6 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #f97316 0%, #db2777 100%)',
  'linear-gradient(135deg, #22d3ee 0%, #6366f1 100%)',
  'linear-gradient(135deg, #34d399 0%, #0d9488 100%)',
  'linear-gradient(135deg, #facc15 0%, #f97316 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
];

const AUDIENCES = [
  { id: 'city', label: '📍 City' },
  { id: 'community', label: '👥 Samaj' },
  { id: 'both', label: '🌐 Both' }
];

const MAX_STORY_VIDEO_MB = 12; // stories keep the file inside the story record (16 MB cap)

/**
 * Full-screen, Instagram-style story editor.
 * Pick (gallery / video / camera / text) → edit (text tool, drag to place) → share.
 */
export const InstagramStoryComposer = ({ currentUser, feedType, onFeedTypeChange, onClose, onSwitchToPost, onPublish }) => {
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const movedRef = useRef(false); // a drag shouldn't count as a tap

  const [media, setMedia] = useState(null);         // { type: 'image' | 'video', url }
  const [textMode, setTextMode] = useState(false);  // text-only story (no media)
  const [gradient, setGradient] = useState(GRADIENTS[0]);

  const [text, setText] = useState('');
  const [editingText, setEditingText] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [style, setStyle] = useState({ color: '#ffffff', fontSize: 'lg', align: 'center', bgStyle: 'transparent' });
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const isEditing = Boolean(media) || textMode;

  // Lock page scroll while the full-screen editor is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (editingText) requestAnimationFrame(() => textInputRef.current?.focus());
  }, [editingText]);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > MAX_STORY_VIDEO_MB * 1024 * 1024) {
      alert(`This video is too large (max ${MAX_STORY_VIDEO_MB} MB for a story). Please choose a shorter video.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setMedia({ type: isVideo ? 'video' : 'image', url: reader.result });
      setTextMode(false);
    };
    reader.readAsDataURL(file);
  };

  const startTextStory = () => {
    setMedia(null);
    setTextMode(true);
    setStyle(s => ({ ...s, bgStyle: 'transparent', fontSize: 'xl' }));
    setEditingText(true);
  };

  const discard = () => {
    if ((media || text) && !window.confirm('Discard this story?')) return;
    setMedia(null);
    setTextMode(false);
    setText('');
    setEditingText(false);
    setPosition({ x: 50, y: 50 });
  };

  // Drag the text around the canvas
  const moveText = (e) => {
    if (!dragging || !canvasRef.current) return;
    movedRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(88, Math.max(12, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.min(88, Math.max(12, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    setPosition({ x, y });
  };

  const cycle = (list, current) => list[(list.indexOf(current) + 1) % list.length];

  const share = async () => {
    if (publishing) return;
    if (!media && !text.trim()) return;
    setPublishing(true);
    try {
      await onPublish({
        media: media ? media.url : gradient,
        text: text.trim(),
        textPosition: position,
        textStyle: style
      });
    } finally {
      setPublishing(false);
    }
  };

  const AlignIcon = ALIGN_ICON[style.align] || AlignCenter;

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col select-none">
      <input ref={galleryRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={pickFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />

      {!isEditing ? (
        /* ─── STEP 1: choose what to share ─── */
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 shrink-0">
            <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center" aria-label="Close">
              <X size={26} />
            </button>
            <h2 className="text-[16px] font-bold">Add to story</h2>
            <span className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                onClick={() => galleryRef.current?.click()}
                className="col-span-2 aspect-[2/1] rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <ImageIcon size={34} />
                <span className="text-[15px] font-bold">Gallery</span>
                <span className="text-[11px] text-white/80 font-medium">Photos & videos</span>
              </button>
              <button
                onClick={() => videoRef.current?.click()}
                className="aspect-square rounded-3xl bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Video size={30} />
                <span className="text-[14px] font-bold">Video</span>
                <span className="text-[10.5px] text-white/60 font-medium">Up to {MAX_STORY_VIDEO_MB} MB</span>
              </button>
              <button
                onClick={() => cameraRef.current?.click()}
                className="aspect-square rounded-3xl bg-white/10 border border-white/10 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Camera size={30} />
                <span className="text-[14px] font-bold">Camera</span>
                <span className="text-[10.5px] text-white/60 font-medium">Take a photo</span>
              </button>
              <button
                onClick={startTextStory}
                className="col-span-2 py-5 rounded-3xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
                style={{ background: GRADIENTS[2] }}
              >
                <span className="text-[26px] font-black leading-none">Aa</span>
                <span className="text-left">
                  <span className="block text-[14px] font-bold">Text story</span>
                  <span className="block text-[11px] text-white/80 font-medium">Write on a colour background</span>
                </span>
              </button>
            </div>
          </div>

          {/* Post / Story switcher, like Instagram's bottom mode bar */}
          <div className="shrink-0 flex justify-center gap-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 text-[13px] font-bold tracking-wide">
            <button onClick={onSwitchToPost} className="text-white/50 px-2 py-1">POST</button>
            <span className="text-white px-2 py-1 border-b-2 border-white">STORY</span>
          </div>
        </div>
      ) : (
        /* ─── STEP 2: edit & share ─── */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center px-0 sm:px-4 pt-[env(safe-area-inset-top)]">
            <div
              ref={canvasRef}
              onPointerMove={moveText}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
              className="relative h-full max-h-full w-full sm:w-auto aspect-[9/16] sm:rounded-3xl overflow-hidden touch-none bg-neutral-900"
              style={media ? undefined : { background: gradient }}
            >
              {media?.type === 'image' && (
                <img src={media.url} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
              {media?.type === 'video' && (
                <video src={media.url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
              {/* Soft shade so the top/bottom controls stay readable on bright photos */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

              {/* Top toolbar */}
              {!editingText && (
                <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 pt-3 z-20">
                  <button onClick={discard} className="w-10 h-10 rounded-full bg-black/35 backdrop-blur flex items-center justify-center" aria-label="Discard">
                    <X size={22} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingText(true)}
                      className="w-10 h-10 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-[17px] font-black"
                      aria-label="Add text"
                    >
                      Aa
                    </button>
                    {text && (
                      <button
                        onClick={() => { setText(''); setPosition({ x: 50, y: 50 }); }}
                        className="w-10 h-10 rounded-full bg-black/35 backdrop-blur flex items-center justify-center"
                        aria-label="Remove text"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Placed text — drag to move, tap to edit */}
              {text && !editingText && (
                <div
                  onPointerDown={() => { movedRef.current = false; setDragging(true); }}
                  onClick={() => { if (!movedRef.current) setEditingText(true); }}
                  className={`absolute z-10 max-w-[85%] cursor-grab ${dragging ? 'scale-105' : ''} transition-transform duration-75`}
                  style={{ top: `${position.y}%`, left: `${position.x}%`, transform: 'translate(-50%, -50%)', textAlign: style.align }}
                >
                  <span
                    className={`inline-block font-black leading-relaxed whitespace-pre-wrap break-words ${TEXT_BG_CLASS[style.bgStyle]} ${FONT_SIZE_CLASS[style.fontSize]}`}
                    style={{ color: style.color, textAlign: style.align }}
                  >
                    {text}
                  </span>
                </div>
              )}

              {/* Text-only story with no text yet */}
              {textMode && !text && !editingText && (
                <button onClick={() => setEditingText(true)} className="absolute inset-0 flex items-center justify-center text-white/70 text-[22px] font-bold">
                  Tap to type
                </button>
              )}

              {/* Text editor overlay */}
              {editingText && (
                <div className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[2px] flex flex-col">
                  <div className="flex items-center justify-between px-3 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStyle(s => ({ ...s, bgStyle: cycle(BG_STYLES, s.bgStyle) }))}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-black border border-white/40 ${style.bgStyle === 'transparent' ? '' : 'bg-white text-black'}`}
                        aria-label="Text background"
                      >
                        A
                      </button>
                      <button
                        onClick={() => setStyle(s => ({ ...s, align: cycle(ALIGNS, s.align) }))}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/40"
                        aria-label="Alignment"
                      >
                        <AlignIcon size={18} />
                      </button>
                      <button
                        onClick={() => setStyle(s => ({ ...s, fontSize: cycle(FONT_SIZES, s.fontSize) }))}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/40"
                        aria-label="Text size"
                      >
                        <ALargeSmall size={18} />
                      </button>
                    </div>
                    <button onClick={() => setEditingText(false)} className="px-4 h-10 rounded-full text-[15px] font-bold">
                      Done
                    </button>
                  </div>

                  <div className="flex-1 flex items-center justify-center px-6" onClick={() => textInputRef.current?.focus()}>
                    <textarea
                      ref={textInputRef}
                      value={text}
                      onChange={e => setText(e.target.value.slice(0, 220))}
                      placeholder="Type something…"
                      rows={3}
                      className={`w-full bg-transparent outline-none resize-none font-black leading-snug placeholder-white/50 ${FONT_SIZE_CLASS[style.fontSize]}`}
                      style={{ color: style.color, textAlign: style.align }}
                    />
                  </div>

                  {/* Colour swatches */}
                  <div className="flex items-center justify-center gap-2.5 pb-4 px-3 flex-wrap">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setStyle(s => ({ ...s, color: c }))}
                        className={`w-7 h-7 rounded-full border-2 ${style.color === c ? 'border-white scale-110' : 'border-white/50'} transition-transform`}
                        style={{ background: c }}
                        aria-label={`Text colour ${c}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Background colours for a text story */}
              {textMode && !editingText && (
                <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center gap-2.5">
                  {GRADIENTS.map(g => (
                    <button
                      key={g}
                      onClick={() => setGradient(g)}
                      className={`w-7 h-7 rounded-full border-2 ${gradient === g ? 'border-white scale-110' : 'border-white/50'} transition-transform`}
                      style={{ background: g }}
                      aria-label="Background colour"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom share bar */}
          {!editingText && (
            <div className="shrink-0 px-3 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] flex items-center gap-2">
              <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {AUDIENCES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onFeedTypeChange(a.id)}
                    className={`shrink-0 px-3 py-2 rounded-full text-[12px] font-bold border transition-colors ${
                      feedType === a.id ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <button
                onClick={share}
                disabled={publishing || (!media && !text.trim())}
                className="shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white text-black disabled:opacity-50 active:scale-95 transition-transform"
              >
                <span className="w-7 h-7 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center text-[11px] font-black text-purple-700">
                  {currentUser?.avatar
                    ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                    : (currentUser?.name || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px] font-bold">Your story</span>
                {publishing ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InstagramStoryComposer;
