import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Trash2, Send, Pause, Play, Square, Loader2 } from 'lucide-react';

export const WhatsAppVoiceRecorder = ({ onSendVoice, onCancel }) => {
  const [recordingState, setRecordingState] = useState('recording'); // 'recording' | 'paused' | 'stopped'
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Start recording on mount
  useEffect(() => {
    let isMounted = true;

    async function initRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        // Choose supported mimeType
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
        };

        mediaRecorder.start(100);
        setRecordingState('recording');

        // Timer
        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);

      } catch (err) {
        console.error('Microphone access failed:', err);
        setPermissionError('Microphone permission denied or not supported.');
      }
    }

    initRecorder();

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStopAndPreview = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingState('stopped');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  const handleSend = () => {
    if (recordingState === 'recording') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.addEventListener('stop', () => {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          onSendVoice(blob, duration);
        }, { once: true });
        mediaRecorderRef.current.stop();
      }
    } else if (audioBlob) {
      onSendVoice(audioBlob, duration);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5 text-rose-700 text-[13px] font-bold">
        <span>{permissionError}</span>
        <button onClick={handleCancel} className="px-3 py-1 bg-rose-200 hover:bg-rose-300 rounded-lg text-rose-800">
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-md border border-purple-100 animate-fade-in-up">
      {/* Delete / Cancel button */}
      <button
        type="button"
        onClick={handleCancel}
        className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 press-scale transition-colors"
        title="Discard voice note"
      >
        <Trash2 size={18} />
      </button>

      {/* Recording Status / Waveform or Preview Player */}
      {recordingState === 'recording' ? (
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {/* Pulsing red record indicator */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-[14px] font-extrabold text-slate-800 tracking-wider">
              {formatTimer(duration)}
            </span>
          </div>

          {/* Animated sound wave bars */}
          <div className="flex-1 flex items-center justify-center gap-1 h-6 overflow-hidden">
            {[12, 20, 8, 24, 16, 28, 14, 22, 10, 26, 18, 14, 20, 10].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-purple-500 rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* Pause / Stop to review button */}
          <button
            type="button"
            onClick={handleStopAndPreview}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold rounded-lg press-scale shrink-0"
          >
            Review
          </button>
        </div>
      ) : (
        /* Preview Player */
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {audioUrl && (
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              onTimeUpdate={() => {
                if (previewAudioRef.current) {
                  const curr = previewAudioRef.current.currentTime;
                  const tot = previewAudioRef.current.duration || 1;
                  setPreviewProgress((curr / tot) * 100);
                }
              }}
            />
          )}

          <button
            type="button"
            onClick={togglePreviewPlay}
            className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center shrink-0 press-scale"
          >
            {isPlayingPreview ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>

          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden relative">
            <div
              className="bg-purple-600 h-full rounded-full transition-all"
              style={{ width: `${previewProgress}%` }}
            />
          </div>

          <span className="text-[12px] font-bold text-slate-500 shrink-0">
            {formatTimer(duration)}
          </span>
        </div>
      )}

      {/* Send voice button */}
      <button
        type="button"
        onClick={handleSend}
        className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md press-scale transition-all"
        title="Send voice note"
      >
        <Send size={18} className="ml-0.5" />
      </button>
    </div>
  );
};

export default WhatsAppVoiceRecorder;
