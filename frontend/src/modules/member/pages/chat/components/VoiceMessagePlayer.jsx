import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export const VoiceMessagePlayer = ({ src, isMine, duration = null }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const cyclePlaybackRate = (e) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Waveform bars simulation
  const bars = [4, 7, 12, 18, 14, 8, 16, 22, 19, 11, 15, 24, 18, 10, 14, 20, 16, 8, 12, 6];

  return (
    <div className={`flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[250px] select-none ${isMine ? 'text-white' : 'text-slate-800'}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all press-scale ${
          isMine 
            ? 'bg-white/25 hover:bg-white/35 text-white' 
            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90'
        }`}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
      </button>

      {/* Progress & Waveform */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="relative h-6 flex items-center gap-0.5 cursor-pointer">
          {/* Waveform visualization bars */}
          <div className="flex items-center justify-between w-full h-full gap-[2px]">
            {bars.map((barHeight, idx) => {
              const barPercent = (idx / bars.length) * 100;
              const isPassed = progressPercent >= barPercent;
              return (
                <div
                  key={idx}
                  style={{ height: `${barHeight}px` }}
                  className={`w-[3px] rounded-full transition-colors ${
                    isMine
                      ? (isPassed ? 'bg-white' : 'bg-white/40')
                      : (isPassed ? 'bg-purple-600' : 'bg-slate-300')
                  }`}
                />
              );
            })}
          </div>

          {/* Interactive Seek Range Input Overlay */}
          <input
            type="range"
            min="0"
            max={totalDuration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          />
        </div>

        {/* Time and Speed */}
        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[11px] font-bold ${isMine ? 'text-purple-100' : 'text-slate-500'}`}>
            {isPlaying ? formatTime(currentTime) : (totalDuration > 0 ? formatTime(totalDuration) : formatTime(currentTime))}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-md transition-colors ${
                isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-100 hover:bg-slate-200 text-purple-700'
              }`}
            >
              {playbackRate}x
            </button>
            <Mic size={12} className={isMine ? 'text-purple-200' : 'text-purple-600'} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
