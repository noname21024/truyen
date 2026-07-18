import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast, showCustomConfirm } from '@/lib/dialog';

export interface AudioTrack {
  chapterId: number;
  storySlug: string;
  storyTitle: string;
  chapterLabel: string;
  cover: string;
  src: string;
  prevChapterId?: number | null;
  nextChapterId?: number | null;
}

interface SavedProgress extends AudioTrack {
  currentTime: number;
  duration: number;
}

const PROGRESS_STORAGE_KEY = 'audio-playback-progress';
// Below this many seconds played, or this close to the end, resuming isn't worth prompting for.
const RESUME_THRESHOLD_SECONDS = 5;

const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const loadSavedProgress = (): SavedProgress | null => {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveProgress = (progress: SavedProgress) => {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
};

const clearSavedProgress = () => {
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const isResumable = (p: SavedProgress) =>
  p.currentTime > RESUME_THRESHOLD_SECONDS &&
  (p.duration <= 0 || p.duration - p.currentTime > RESUME_THRESHOLD_SECONDS);

interface AudioPlayerContextValue {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  playTrack: (track: AudioTrack) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skipBy: (seconds: number) => void;
  cyclePlaybackRate: () => void;
  changePlaybackRate: (rate: number) => void;
  goToPrev: () => void;
  goToNext: () => void;
  goToTrack: () => void;
  closeTrack: () => void;
}


const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const useAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);

  // Mirrors `track` so closures created for the resume dialog (which can be answered
  // long after they were shown) can check whether the player has since moved on.
  const trackRef = useRef<AudioTrack | null>(null);
  trackRef.current = track;
  const lastSavedAtRef = useRef(0);
  // Set right before auto-advancing to the next chapter on `ended`, so that once that
  // chapter's track actually loads we know to autoplay it instead of leaving it paused.
  const autoPlayChapterIdRef = useRef<number | null>(null);

  const persistProgress = useCallback((t: AudioTrack, time: number, dur: number) => {
    saveProgress({ ...t, currentTime: time, duration: dur });
  }, []);

  const promptResume = useCallback((newTrack: AudioTrack, resumeTime: number) => {
    const seekOnceReady = (time: number) => {
      const audio = audioRef.current;
      if (!audio || trackRef.current?.chapterId !== newTrack.chapterId) return;
      if (audio.readyState >= 1) {
        audio.currentTime = time;
        setCurrentTime(time);
      } else {
        audio.addEventListener('loadedmetadata', () => {
          if (trackRef.current?.chapterId !== newTrack.chapterId) return;
          audio.currentTime = time;
          setCurrentTime(time);
        }, { once: true });
      }
      audio.play().catch((err) => console.error('Audio playback failed:', err));
    };

    showCustomConfirm(
      'Tiếp tục nghe?',
      `Bạn đang nghe đến ${formatTime(resumeTime)} của ${newTrack.chapterLabel}. Bạn có muốn nghe tiếp không?`,
      () => seekOnceReady(resumeTime),
      () => seekOnceReady(0),
      'history',
      { confirmText: 'Nghe tiếp', cancelText: 'Nghe từ đầu' }
    );
  }, []);

  const playTrack = useCallback((newTrack: AudioTrack) => {
    setTrack(prev => {
      // Same chapter already loaded — just refresh nav metadata, keep playback position/state
      if (prev && prev.chapterId === newTrack.chapterId) {
        return { ...prev, ...newTrack };
      }

      // Read any previously saved progress for the chapter we're switching TO before
      // we (below) overwrite that single storage slot with the chapter we're leaving.
      const saved = loadSavedProgress();
      if (saved && saved.chapterId === newTrack.chapterId && isResumable(saved)) {
        promptResume(newTrack, saved.currentTime);
      }

      // Leaving a chapter mid-way — snapshot its exact last position immediately,
      // rather than relying on the throttled onTimeUpdate save to have caught up.
      if (prev && audioRef.current) {
        persistProgress(prev, audioRef.current.currentTime, audioRef.current.duration || 0);
      }

      lastSavedAtRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      return newTrack;
    });
  }, [persistProgress, promptResume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err) => console.error('Audio playback failed:', err));
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skipBy = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(Math.max(0, audio.currentTime + seconds), audio.duration || Infinity);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const audio = audioRef.current;
    setPlaybackRateState(prev => {
      const nextRate = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(prev) + 1) % PLAYBACK_RATES.length];
      if (audio) audio.playbackRate = nextRate;
      return nextRate;
    });
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const goToPrev = useCallback(() => {
    if (!track?.prevChapterId) return;
    navigate(`/chapter/${track.prevChapterId}`, { state: { storySlug: track.storySlug } });
  }, [track, navigate]);

  const goToNext = useCallback(() => {
    if (!track?.nextChapterId) return;
    navigate(`/chapter/${track.nextChapterId}`, { state: { storySlug: track.storySlug } });
  }, [track, navigate]);

  // Once the chapter we auto-advanced into (see `onEnded` below) actually finishes
  // loading its own track, start playing it — the whole point of auto-advance is that
  // listening never has to pause between chapters.
  useEffect(() => {
    if (!track || track.chapterId !== autoPlayChapterIdRef.current) return;
    autoPlayChapterIdRef.current = null;
    const audio = audioRef.current;
    if (!audio) return;
    const tryPlay = () => audio.play().catch((err) => console.error('Audio playback failed:', err));
    if (audio.readyState >= 1) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
    }
  }, [track?.chapterId]);

  const goToTrack = useCallback(() => {
    if (!track) return;
    navigate(`/chapter/${track.chapterId}`, { state: { storySlug: track.storySlug } });
  }, [track, navigate]);

  const closeTrack = useCallback(() => {
    setTrack(null);
    setIsPlaying(false);
  }, []);

  // Last-resort save for the "closed the tab mid-chapter" case — timeupdate/pause
  // usually beat this, but a tab close can happen between throttled saves.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const t = trackRef.current;
      const audio = audioRef.current;
      if (t && audio) persistProgress(t, audio.currentTime, audio.duration || 0);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persistProgress]);

  return (
    <AudioPlayerContext.Provider value={{ track, isPlaying, currentTime, duration, playbackRate, playTrack, togglePlay, seek, skipBy, cyclePlaybackRate, changePlaybackRate, goToPrev, goToNext, goToTrack, closeTrack }}>
      {children}
      {track && (
        <audio
          key={track.src}
          ref={audioRef}
          src={track.src}
          onTimeUpdate={(e) => {
            const time = e.currentTarget.currentTime;
            setCurrentTime(time);
            if (time - lastSavedAtRef.current >= 3) {
              lastSavedAtRef.current = time;
              persistProgress(track, time, e.currentTarget.duration || 0);
            }
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            e.currentTarget.playbackRate = playbackRate;
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={(e) => {
            setIsPlaying(false);
            persistProgress(track, e.currentTarget.currentTime, e.currentTarget.duration || 0);
          }}
          onEnded={() => {
            setIsPlaying(false);
            clearSavedProgress();
            if (track.nextChapterId) {
              autoPlayChapterIdRef.current = track.nextChapterId;
              goToNext();
            }
          }}
          onError={(e) => {
            console.error('Audio element error:', e.currentTarget.error);
            showToast('Không tìm thấy file audio cho chương này.');
            setTrack(null);
            setIsPlaying(false);
          }}
          preload="metadata"
          className="hidden"
        />
      )}
    </AudioPlayerContext.Provider>
  );
};
