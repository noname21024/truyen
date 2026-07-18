import React, { useState, useEffect, useRef } from 'react';
import { SkipBack, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const GlobalAudioPlayer: React.FC = () => {
  const { track, isPlaying, currentTime, duration, playbackRate, togglePlay, seek, skipBy, changePlaybackRate, goToPrev, goToNext, goToTrack } = useAudioPlayer();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const speedDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(event.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-0 right-4 sm:right-8 z-50 flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-1.5 rounded-t-lg shadow-2xl hover:bg-primary/90 transition-all"
        title="Mở lại trình phát audio"
      >
        <ChevronUp className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold">Đang phát</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/40 bg-surface/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom duration-300">
      {/* YouTube-style thin seek bar pinned to the very top edge of the player.
          The larger drag hit-area stays fully within this wrapper's own box (no negative
          offset above it) so it can't overlap/steal clicks from page content behind it. */}
      <div className="relative w-full h-3 flex items-center group/seek">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 group-hover/seek:h-1.5 bg-current/10 pointer-events-none transition-all" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 group-hover/seek:h-1.5 bg-primary pointer-events-none transition-all" style={{ width: `${progress}%` }} />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer opacity-0"
          title="Tua"
        />
      </div>

      <div className="max-w-[1300px] mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3">
        {/* Disc thumbnail + story/chapter info — click returns to the chapter being played */}
        <button
          onClick={goToTrack}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
          title="Đi đến chương đang nghe"
        >
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0">
            <div className={`w-full h-full rounded-full overflow-hidden border-2 border-primary/40 shadow-md ${isPlaying ? 'animate-spin-slow' : ''}`}>
              <img src={track.cover} alt={track.storyTitle} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-[38%] rounded-full bg-surface border border-outline-variant/50 pointer-events-none" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{track.storyTitle}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{track.chapterLabel}</p>
          </div>
        </button>

        {/* Playback controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={goToPrev}
            disabled={!track.prevChapterId}
            className="p-1.5 rounded-full hover:bg-current/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center justify-center"
            title="Chương trước"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => skipBy(-10)}
            className="px-1.5 sm:px-2 py-1 rounded-full border border-outline-variant/50 text-[10px] font-bold hover:bg-current/10 transition-colors"
            title="Tua lùi 10 giây"
          >
            -10s
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 bg-primary text-on-primary shadow-md hover:bg-primary/90 transition-all active:scale-95"
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            <ViconicIcon name={isPlaying ? 'pause' : 'play_arrow'} size={18} className="shrink-0" />
          </button>

          <button
            onClick={() => skipBy(10)}
            className="px-1.5 sm:px-2 py-1 rounded-full border border-outline-variant/50 text-[10px] font-bold hover:bg-current/10 transition-colors"
            title="Tua nhanh 10 giây"
          >
            +10s
          </button>

          <button
            onClick={goToNext}
            disabled={!track.nextChapterId}
            className="p-1.5 rounded-full hover:bg-current/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center justify-center"
            title="Chương sau"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time labels — desktop only, mobile stays compact */}
        <span className="hidden md:inline text-[10px] font-bold tabular-nums shrink-0 opacity-70">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="flex-1 md:flex-none" />

        {/* Playback speed */}
        <div className="relative shrink-0" ref={speedDropdownRef}>
          <button
            onClick={() => setIsSpeedOpen(!isSpeedOpen)}
            className={`min-w-[2.25rem] px-2 py-1 rounded-full border text-[10px] font-bold transition-all shrink-0 ${
              isSpeedOpen
                ? 'bg-primary text-on-primary border-primary shadow-sm'
                : 'border-outline-variant/50 hover:bg-current/10'
            }`}
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>

          {isSpeedOpen && (
            <div className="absolute bottom-full right-0 mb-3 p-3.5 w-60 bg-surface border border-outline-variant/60 shadow-2xl rounded-lg z-50 flex flex-col gap-3 text-on-surface animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">Tốc độ phát</span>
                <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{playbackRate}x</span>
              </div>

              {/* Slider speed adjustment */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[9px] opacity-60 font-semibold">
                  <span>Chậm</span>
                  <span>Bình thường</span>
                  <span>Nhanh</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-current/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>

              {/* Presets Grid */}
              <div className="flex flex-col gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">Chọn nhanh</span>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 0.75, 1.0, 1.1, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        changePlaybackRate(rate);
                      }}
                      className={`text-[10px] font-bold py-1 px-1.5 rounded-sm border transition-all ${
                        playbackRate === rate
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'border-outline-variant/40 hover:bg-current/5 hover:border-outline-variant'
                      }`}
                    >
                      {rate === 1.0 ? '1x' : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapse player */}
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full hover:bg-current/10 transition-colors opacity-60 hover:opacity-100 shrink-0"
          title="Thu gọn"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GlobalAudioPlayer;
