import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, FileText, RotateCcw, X } from 'lucide-react';
import { usePostUploads } from '../../context/PostUploadContext';

const Thumb = ({ preview }) => {
  const base = 'w-10 h-[52px] rounded-lg shrink-0 overflow-hidden bg-slate-100 border border-slate-200/70';
  if (!preview) {
    return <div className={`${base} flex items-center justify-center text-slate-400`}><FileText size={18} /></div>;
  }
  if (preview.type === 'gradient') return <div className={base} style={{ background: preview.url }} />;
  if (preview.type === 'video') {
    return <video src={preview.url} muted playsInline preload="metadata" className={`${base} object-cover`} />;
  }
  return <img src={preview.url} alt="" className={`${base} object-cover`} />;
};

const statusText = (upload) => {
  const noun = upload.kind === 'story' ? 'story' : 'post';
  switch (upload.status) {
    case 'processing': return `Finishing your ${noun}… · ${upload.progress.toFixed(1)}%`;
    case 'done': return upload.kind === 'story' ? 'Your story is shared' : 'Your post is live';
    case 'error': return `Couldn't share your ${noun}. ${upload.error}`;
    default: return `Keep the app open to finish posting · ${upload.progress.toFixed(1)}%`;
  }
};

const UploadRow = ({ upload, onRetry, onDismiss }) => {
  const failed = upload.status === 'error';
  const done = upload.status === 'done';
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <Thumb preview={upload.preview} />
      <div className="min-w-0 flex-1">
        <p className={`text-[12.5px] font-semibold leading-snug flex items-center gap-1.5 ${failed ? 'text-rose-600' : 'text-slate-700'}`}>
          {done && <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />}
          {failed && <AlertCircle size={15} className="shrink-0" />}
          <span className="line-clamp-2">{statusText(upload)}</span>
        </p>
        {!failed && (
          <div className="mt-2 h-[3px] rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 transition-[width] duration-300 ease-out"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        )}
      </div>
      {failed && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onRetry(upload.id)}
            className="h-8 px-2.5 rounded-lg bg-brand-primary text-white text-[11px] font-bold flex items-center gap-1"
          >
            <RotateCcw size={13} /> Retry
          </button>
          <button
            type="button"
            onClick={() => onDismiss(upload.id)}
            aria-label="Discard"
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Progress for posts/stories still uploading.
 * variant="inline"  — inside the feed, under the stories row
 * variant="floating" — above the bottom nav on other screens (hidden while an inline one is mounted)
 */
export const PostUploadBanner = ({ variant = 'inline' }) => {
  const ctx = usePostUploads();
  const registerInlineSlot = ctx?.registerInlineSlot;

  useEffect(() => {
    if (variant === 'inline' && registerInlineSlot) return registerInlineSlot();
    return undefined;
  }, [variant, registerInlineSlot]);

  if (!ctx) return null;
  const { uploads, retry, dismiss, inlineSlots } = ctx;
  if (variant === 'floating' && inlineSlots > 0) return null;

  const wrapper = variant === 'floating'
    ? 'fixed left-3 right-3 bottom-24 md:bottom-6 md:left-auto md:right-6 md:w-96 z-[45] rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80'
    : 'bg-white border-y border-slate-200/70 -mx-4.5 mb-2';

  return (
    <AnimatePresence>
      {uploads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: variant === 'floating' ? 16 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className={`${wrapper} divide-y divide-slate-100 overflow-hidden`}
          role="status"
          aria-live="polite"
        >
          {uploads.map(upload => (
            <UploadRow key={upload.id} upload={upload} onRetry={retry} onDismiss={dismiss} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostUploadBanner;
