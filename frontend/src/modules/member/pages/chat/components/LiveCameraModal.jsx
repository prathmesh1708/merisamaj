import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Send, AlertCircle, Zap, ZapOff, ArrowLeft } from 'lucide-react';

export const LiveCameraModal = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [caption, setCaption] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackInputRef = useRef(null);

  // Initialize camera stream
  const startCamera = async (mode) => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraError(null);
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback without width/height ideal constraints
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setCameraError('Unable to open camera stream. You can use your device camera directly.');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage({ file, dataUrl });
      }
    }, 'image/jpeg', 0.95);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCaption('');
    startCamera(facingMode);
  };

  const handleConfirmSend = () => {
    if (capturedImage) {
      onCapture(capturedImage.file, caption);
      onClose();
    }
  };

  const handleFallbackFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCapturedImage({ file, dataUrl: ev.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex flex-col w-screen h-screen overflow-hidden select-none animate-fade-in"
      style={{ touchAction: 'none' }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Viewfinder / Full-Screen Video ── */}
      <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {capturedImage ? (
          <img
            src={capturedImage.dataUrl}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        ) : cameraError ? (
          <div className="p-8 text-center text-white flex flex-col items-center gap-4 z-10 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle size={36} />
            </div>
            <p className="text-[15px] font-bold text-slate-200">{cameraError}</p>
            <button
              onClick={() => fallbackInputRef.current?.click()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-[14px] flex items-center gap-2 press-scale shadow-lg"
            >
              <Camera size={18} /> Open Device Camera
            </button>
            <input
              type="file"
              ref={fallbackInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFallbackFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      {/* ── Top Header Controls Overlay ── */}
      <div 
        className="absolute top-0 left-0 right-0 p-4 pt-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 16px)' }}
      >
        {/* Close or Back button */}
        <button
          onClick={capturedImage ? handleRetake : onClose}
          className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center press-scale shadow-md"
        >
          {capturedImage ? <ArrowLeft size={22} /> : <X size={22} />}
        </button>

        {/* Top Actions when live */}
        {!capturedImage && !cameraError && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFlashActive(p => !p)}
              className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center press-scale shadow-md ${
                isFlashActive ? 'bg-amber-400 text-black' : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
            >
              {isFlashActive ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>

            <button
              onClick={toggleFacingMode}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center press-scale shadow-md"
              title="Flip camera"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Overlay ── */}
      <div 
        className="absolute bottom-0 left-0 right-0 p-5 pb-8 flex flex-col items-center justify-end z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 24px, 24px)' }}
      >
        {capturedImage ? (
          /* Captured photo confirm & caption bar */
          <div className="w-full max-w-lg flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/60 backdrop-blur-xl border border-white/20 rounded-full px-4 py-3 flex items-center shadow-xl">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-white/60 text-[15px] font-medium outline-none"
                  autoFocus
                />
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleConfirmSend}
                className="w-13 h-13 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-2xl press-scale"
                title="Send photo"
              >
                <Send size={22} className="ml-0.5" />
              </button>
            </div>
          </div>
        ) : !cameraError ? (
          /* Live Camera Shutter & Gallery triggers */
          <div className="w-full max-w-sm flex items-center justify-around">
            {/* Gallery fallback */}
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center press-scale shadow-md"
              title="Open files"
            >
              <Camera size={20} />
            </button>
            <input
              type="file"
              ref={fallbackInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFallbackFileChange}
              className="hidden"
            />

            {/* Big Shutter Ring */}
            <button
              type="button"
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white p-1.5 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl backdrop-blur-sm bg-white/20"
            >
              <div className="w-full h-full bg-white rounded-full shadow-inner" />
            </button>

            {/* Flip Camera */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center press-scale shadow-md"
              title="Flip camera"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LiveCameraModal;
