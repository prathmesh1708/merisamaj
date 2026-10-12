import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * App-wide photo cropper.
 *
 *   const cropped = await cropImageFile(file);                       // round profile photo
 *   const cropped = await cropImageFile(file, { aspect: 3, shape: 'rect' }); // cover banner
 *
 * Resolves with a cropped JPEG File, or null if the user cancels.
 * <ImageCropHost /> must be mounted once (App.jsx).
 */
let openCropper = null;

export const cropImageFile = (file, options = {}) => {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif' || !openCropper) {
    return Promise.resolve(file || null); // not croppable (or host missing) → use as-is
  }
  return new Promise((resolve) => openCropper({ file, options, resolve }));
};

const MAX_ZOOM = 4;

const CropDialog = ({ file, options, onDone }) => {
  const aspect = options.aspect || 1;
  const shape = options.shape || (aspect === 1 ? 'round' : 'rect');
  const outputWidth = options.outputWidth || (aspect === 1 ? 640 : 1200);

  const [src, setSrc] = useState(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 280, h: 280 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image centre offset from frame centre, px
  const [saving, setSaving] = useState(false);
  const imgRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  // Load the picked file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Crop frame size fits the screen
  useEffect(() => {
    const fit = () => {
      const maxW = Math.min(window.innerWidth - 32, 420);
      const maxH = Math.min(window.innerHeight - 260, 420);
      let w = maxW, h = w / aspect;
      if (h > maxH) { h = maxH; w = h * aspect; }
      setFrame({ w: Math.round(w), h: Math.round(h) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [aspect]);

  // Image size at zoom 1 = just covers the frame
  const baseScale = natural.w ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const dispW = natural.w * baseScale * zoom;
  const dispH = natural.h * baseScale * zoom;

  // Keep the image covering the whole frame (no empty edges)
  const clampPos = useCallback((p, z = zoom) => {
    const w = natural.w * baseScale * z, h = natural.h * baseScale * z;
    const maxX = Math.max(0, (w - frame.w) / 2), maxY = Math.max(0, (h - frame.h) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, p.x)), y: Math.min(maxY, Math.max(-maxY, p.y)) };
  }, [natural, baseScale, frame, zoom]);

  const applyZoom = (z) => {
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(nz);
    setPos(p => clampPos(p, nz));
  };

  // ── Drag (one finger / mouse) and pinch (two fingers) ──
  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = null;
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (!gesture.current) gesture.current = { dist, zoom };
      else applyZoom(gesture.current.zoom * (dist / gesture.current.dist));
    } else if (pts.length === 1) {
      setPos(p => clampPos({ x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
    }
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    gesture.current = null;
  };
  const onWheel = (e) => applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92));

  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };

  const save = () => {
    const img = imgRef.current;
    if (!img || !natural.w) return;
    setSaving(true);
    const scale = baseScale * zoom; // display px per source px
    const sx = (natural.w / 2) - (frame.w / 2 + pos.x) / scale;
    const sy = (natural.h / 2) - (frame.h / 2 + pos.y) / scale;
    const sw = frame.w / scale, sh = frame.h / scale;

    const outW = Math.min(outputWidth, Math.round(sw)) || outputWidth;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob((blob) => {
      setSaving(false);
      if (!blob) return onDone(file);
      const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
      onDone(new File([blob], name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  // Esc cancels
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDone(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/95 flex flex-col items-center justify-center px-4 select-none" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="w-full max-w-[420px] flex items-center justify-between mb-4">
        <button type="button" onClick={() => onDone(null)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-95" aria-label="Cancel">
          <X size={20} />
        </button>
        <p className="text-white font-bold text-[15px]">{options.title || 'Adjust photo'}</p>
        <button type="button" onClick={save} disabled={saving || !natural.w} className="h-10 px-4 rounded-full bg-[#7C3AED] text-white font-bold text-[13px] flex items-center gap-1.5 active:scale-95 disabled:opacity-60">
          <Check size={16} /> {saving ? 'Saving…' : 'Done'}
        </button>
      </div>

      {/* Crop area */}
      <div
        className="relative overflow-hidden rounded-2xl bg-black cursor-grab active:cursor-grabbing"
        style={{ width: frame.w, height: frame.h, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="absolute max-w-none pointer-events-none"
            style={{
              width: dispW || 'auto',
              height: dispH || 'auto',
              left: frame.w / 2 - dispW / 2 + pos.x,
              top: frame.h / 2 - dispH / 2 + pos.y
            }}
          />
        )}
        {/* Mask: darken outside the round area, plus a thirds grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={shape === 'round'
            ? { borderRadius: '9999px', boxShadow: '0 0 0 9999px rgba(2,6,23,0.6)', border: '2px solid rgba(255,255,255,0.9)' }
            : { border: '2px solid rgba(255,255,255,0.9)', borderRadius: '1rem' }}
        />
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/40" />)}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="w-full max-w-[420px] mt-5 flex items-center gap-3 text-white">
        <button type="button" onClick={() => applyZoom(zoom - 0.25)} className="p-2 rounded-full bg-white/10 active:scale-95" aria-label="Zoom out"><ZoomOut size={18} /></button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => applyZoom(Number(e.target.value))}
          className="flex-1 accent-[#a78bfa]"
          aria-label="Zoom"
        />
        <button type="button" onClick={() => applyZoom(zoom + 0.25)} className="p-2 rounded-full bg-white/10 active:scale-95" aria-label="Zoom in"><ZoomIn size={18} /></button>
        <button type="button" onClick={reset} className="p-2 rounded-full bg-white/10 active:scale-95" aria-label="Reset"><RotateCcw size={18} /></button>
      </div>
      <p className="text-white/60 text-[12px] mt-3">Drag to move · pinch or slide to zoom</p>
    </div>
  );
};

export const ImageCropHost = () => {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    openCropper = (req) => setRequest(prev => {
      prev?.resolve(null); // a new request cancels an unfinished one
      return req;
    });
    return () => { openCropper = null; };
  }, []);

  const finish = useCallback((result) => {
    setRequest(prev => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  if (!request) return null;
  return createPortal(
    <CropDialog key={request.file.name + request.file.size} file={request.file} options={request.options} onDone={finish} />,
    document.body
  );
};

export default ImageCropHost;
