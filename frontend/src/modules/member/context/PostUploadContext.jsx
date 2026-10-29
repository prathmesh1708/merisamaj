import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Background uploads for posts and stories (Instagram style): the create screen
// hands the work over and closes, and PostUploadBanner shows the progress.
//
// Progress: 0–90% is the request body reaching our server (axios onUploadProgress);
// the server then pushes the media to cloud storage, so 90–99% creeps while we wait
// for the response, and the response itself is 100%.

const PostUploadContext = createContext(null);

const UPLOAD_SHARE = 90;
const DONE_VISIBLE_MS = 2500;

let nextId = 1;

export const PostUploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]);
  const [inlineSlots, setInlineSlots] = useState(0);
  const jobs = useRef(new Map()); // id -> { run, onDone } kept for Retry

  const update = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => (u.id === id ? { ...u, ...(typeof patch === 'function' ? patch(u) : patch) } : u)));
  }, []);

  const dismiss = useCallback((id) => {
    jobs.current.delete(id);
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const runJob = useCallback(async (id) => {
    const job = jobs.current.get(id);
    if (!job) return;
    update(id, { status: 'uploading', progress: 0, error: '' });

    const onUploadProgress = (evt) => {
      const fraction = evt.total ? evt.loaded / evt.total : (evt.progress || 0);
      update(id, u => (u.status === 'uploading' ? {
        progress: Math.max(u.progress, Math.min(UPLOAD_SHARE, fraction * UPLOAD_SHARE)),
        status: fraction >= 1 ? 'processing' : 'uploading'
      } : {}));
    };

    try {
      const result = await job.run(onUploadProgress);
      update(id, { status: 'done', progress: 100 });
      job.onDone?.(result);
      setTimeout(() => dismiss(id), DONE_VISIBLE_MS);
    } catch (err) {
      update(id, { status: 'error', error: err?.message || 'Upload failed' });
    }
  }, [update, dismiss]);

  /**
   * Starts a background upload.
   * @param {object} opts
   * @param {'post'|'story'} opts.kind
   * @param {{type: 'image'|'video'|'gradient', url: string}|null} opts.preview  thumbnail shown in the banner
   * @param {(onUploadProgress: Function) => Promise} opts.run  performs the request
   * @param {(result: any) => void} [opts.onDone]
   */
  const startUpload = useCallback(({ kind, preview = null, run, onDone }) => {
    const id = nextId++;
    jobs.current.set(id, { run, onDone });
    setUploads(prev => [{ id, kind, preview, status: 'uploading', progress: 0, error: '' }, ...prev]);
    runJob(id);
    return id;
  }, [runJob]);

  const retry = useCallback((id) => runJob(id), [runJob]);

  // The feed shows the banner inline; while it is mounted the floating copy hides
  const registerInlineSlot = useCallback(() => {
    setInlineSlots(n => n + 1);
    return () => setInlineSlots(n => n - 1);
  }, []);

  const hasProcessing = uploads.some(u => u.status === 'processing');
  const isBusy = uploads.some(u => u.status === 'uploading' || u.status === 'processing');

  // Ease 90% → 99% while the server finishes, so the bar never looks frozen
  useEffect(() => {
    if (!hasProcessing) return undefined;
    const timer = setInterval(() => {
      setUploads(prev => prev.map(u => (u.status === 'processing'
        ? { ...u, progress: Math.min(99, u.progress + (99 - u.progress) * 0.08) }
        : u)));
    }, 400);
    return () => clearInterval(timer);
  }, [hasProcessing]);

  // Closing or reloading the tab would cancel the request
  useEffect(() => {
    if (!isBusy) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isBusy]);

  return (
    <PostUploadContext.Provider value={{ uploads, startUpload, retry, dismiss, inlineSlots, registerInlineSlot }}>
      {children}
    </PostUploadContext.Provider>
  );
};

export const usePostUploads = () => useContext(PostUploadContext);

// Thumbnail descriptor for a media string (data URL, remote URL or CSS gradient)
export const previewFor = (media, type) => {
  if (!media) return null;
  if (/-gradient\(/.test(media)) return { type: 'gradient', url: media };
  const isVideo = type === 'video' || media.startsWith('data:video/') || /\.(mp4|webm|mov)(\?|$)/i.test(media);
  return { type: isVideo ? 'video' : 'image', url: media };
};
