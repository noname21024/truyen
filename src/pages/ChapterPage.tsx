import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
import { incrementNovelView } from '@/lib/viewCountService';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService, ChapterService } from '@/lib/api';
import { TtsSession, PATH_MAP } from '@realtimex/piper-tts-web';
import { Play, Pause, SkipForward, SkipBack, Loader2 } from 'lucide-react';
import { STICKER_SETS } from '@/data/stickers';

// Patch XMLHttpRequest to prevent inspector.js from throwing when responseType is 'arraybuffer' or 'blob'
if (typeof window !== 'undefined' && (window as any).XMLHttpRequest) {
  try {
    const proto = XMLHttpRequest.prototype;
    const textDescriptor = Object.getOwnPropertyDescriptor(proto, 'responseText');
    if (textDescriptor && textDescriptor.get) {
      const originalGet = textDescriptor.get;
      Object.defineProperty(proto, 'responseText', {
        get: function () {
          if (this.responseType && this.responseType !== 'text' && this.responseType !== '') {
            return '';
          }
          return originalGet.call(this);
        },
        configurable: true,
        enumerable: true
      });
    }

    const xmlDescriptor = Object.getOwnPropertyDescriptor(proto, 'responseXML');
    if (xmlDescriptor && xmlDescriptor.get) {
      const originalGetXML = xmlDescriptor.get;
      Object.defineProperty(proto, 'responseXML', {
        get: function () {
          if (this.responseType && this.responseType !== 'document' && this.responseType !== '') {
            return null;
          }
          return originalGetXML.call(this);
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    console.warn('Failed to patch XMLHttpRequest prototype:', e);
  }
}

// Register local Ngọc Huyền model to PATH_MAP
if (typeof window !== 'undefined') {
  (PATH_MAP as any)['vi_VN-ngoc_huyen'] = 'ngoc_huyen.onnx';

  // Hijack window.fetch to redirect Hugging Face CDN requests for ngoc_huyen to our local static path
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input as Request).url || '';
    if (url.includes('diffusionstudio/piper-voices/resolve/main/ngoc_huyen.onnx.json')) {
      return originalFetch('/model/ngoc_huyen.onnx.json', init);
    }
    if (url.includes('diffusionstudio/piper-voices/resolve/main/ngoc_huyen.onnx')) {
      return originalFetch('/model/ngoc_huyen.onnx', init);
    }
    return originalFetch(input, init);
  };
}

// Persistent module-level cache for TTS Session and Loader Promise to prevent reloading across chapters
let globalTtsSession: any = null;
let globalTtsSessionPromise: Promise<any> | null = null;

const novelsData = novelsDataJson as any[];

type ReadingTheme = 'light' | 'sepia' | 'green' | 'dark';
type FontType = 'serif' | 'sans' | 'mono';

const THEME_CLASSES: Record<ReadingTheme, { bg: string; text: string; border: string; accentBg: string; buttonBg: string; skeleton: string }> = {
  light: {
    bg: 'bg-white',
    text: 'text-slate-800',
    border: 'border-slate-200/80',
    accentBg: 'bg-slate-50/90 backdrop-blur-md',
    buttonBg: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    skeleton: 'bg-slate-200/80'
  },
  sepia: {
    bg: 'bg-[#FAF6EB]',
    text: 'text-[#3E2723]',
    border: 'border-[#EBE3CD]',
    accentBg: 'bg-[#F3EAD3]/90 backdrop-blur-md',
    buttonBg: 'bg-[#EBE3CD]/60 hover:bg-[#EBE3CD] text-[#5D4037]',
    skeleton: 'bg-[#E0D5BA]/70'
  },
  green: {
    bg: 'bg-[#EBF3E7]',
    text: 'text-[#1B361B]',
    border: 'border-[#D5DEC9]',
    accentBg: 'bg-[#DDE9D4]/90 backdrop-blur-md',
    buttonBg: 'bg-[#D5DEC9]/60 hover:bg-[#D5DEC9] text-[#2E4F2E]',
    skeleton: 'bg-[#C5D4B8]/60'
  },
  dark: {
    bg: 'bg-[#121316]',
    text: 'text-[#C5C8CE]',
    border: 'border-[#282B30]',
    accentBg: 'bg-[#1C1D21]/90 backdrop-blur-md',
    buttonBg: 'bg-[#282B30] hover:bg-[#34383F] text-[#C5C8CE]',
    skeleton: 'bg-[#2A2D33]'
  }
};

const FONT_MAP = {
  serif: "'Noto Serif', Georgia, serif",
  sans: "'Be Vietnam Pro', system-ui, sans-serif",
  mono: "monospace",
};

interface Reply {
  id: number;
  user: string;
  time: string;
  text: string;
  avatar: string;
}

interface Comment {
  id: number;
  user: string;
  time: string;
  text: string;
  likes: number;
  avatar: string;
  likedByUser?: boolean;
  replies?: Reply[];
}

const renderCommentContentHtml = (text: string): string => {
  if (!text) return '';
  return text.replace(/\[sticker:([a-zA-Z0-9_-]+):([a-zA-Z0-9_.-]+)\]/g, (match, setId, filename) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set) {
      return `<img src="${set.baseUrl}${filename}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain select-none animate-in zoom-in-50 duration-150" />`;
    }
    return match;
  });
};

const getSeedComments = (): Comment[] => {
  return [
    {
      id: 1,
      user: "YukiReader",
      time: "2 giờ trước",
      text: "Truyện cuốn quá, dịch mượt ghê! Hóng chương sau.",
      likes: 12,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      likedByUser: false
    },
    {
      id: 2,
      user: "Koko_Nut",
      time: "Hôm qua",
      text: "Nữ chính cá tính quá, quyết đoán thế này mới xứng đáng làm đại sự chứ!",
      likes: 8,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      likedByUser: false
    }
  ];
};

const ChapterPage: React.FC = () => {
  const { novelId, chapterIndex } = useParams<{ novelId: string; chapterIndex: string }>();
  const navigate = useNavigate();
  const [novel, setNovel] = useState<any | null>(null);
  const currentIndex = parseInt(chapterIndex || '1', 10);

  const [toc, setToc] = useState<string[]>([]);
  const [chapterData, setChapterData] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportErrorName, setReportErrorName] = useState('');
  const [reportErrorMessage, setReportErrorMessage] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const incrementedRef = useRef<string | null>(null);

  const mainEditorRef = useRef<HTMLDivElement>(null);
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [isMainStickerOpen, setIsMainStickerOpen] = useState(false);
  const [replyStickerOpenId, setReplyStickerOpenId] = useState<number | null>(null);
  const [activeStickerSetId, setActiveStickerSetId] = useState('trollface');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const [activeCommentMenuId, setActiveCommentMenuId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // --- Fixed floating control bar visibility (IntersectionObserver) ---
  const [isHeaderControlsVisible, setIsHeaderControlsVisible] = useState(false);
  const originalBarRef = useRef<HTMLDivElement>(null);

  // --- TTS STATE & CONTROLS ---
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1); // -1 = not started
  const [ttsSpeed, setTtsSpeed] = useState(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsPlayingRef = useRef(false); // ref to control auto-advance (avoids stale closure)
  const currentSentenceRef = useRef(-1);

  // Helper to load/warmup the global TTS session
  const getTtsSession = async (
    onLoadStart: () => void,
    onLoadEnd: () => void
  ): Promise<any> => {
    if (globalTtsSession) {
      return globalTtsSession;
    }
    if (globalTtsSessionPromise) {
      return globalTtsSessionPromise;
    }

    onLoadStart();
    globalTtsSessionPromise = (async () => {
      try {
        const session = new TtsSession({
          voiceId: 'vi_VN-ngoc_huyen',
          allowLocalModels: true,
          fallbackStrategy: 'local',
        });
        // Warm up model with a space to trigger loading and compiling of WASM
        await session.predict(" ");
        globalTtsSession = session;
        return session;
      } catch (error) {
        globalTtsSessionPromise = null;
        throw error;
      } finally {
        onLoadEnd();
      }
    })();

    return globalTtsSessionPromise;
  };
  // Play a single sentence by index: convert → play → scroll → auto-advance on end
  const playSentence = async (index: number) => {
    if (index < 0 || index >= sentencesInfo.length) {
      // End of chapter
      ttsPlayingRef.current = false;
      setIsTtsPlaying(false);
      return;
    }

    setCurrentSentenceIndex(index);
    currentSentenceRef.current = index;
    setIsTtsLoading(true);
    setIsTtsPlaying(true);
    ttsPlayingRef.current = true;
    setTtsError(null);

    try {
      const session = await getTtsSession(
        () => setIsModelLoading(true),
        () => setIsModelLoading(false)
      );

      const wavBlob = await session.predict(sentencesInfo[index].text);

      // Check if user stopped while we were converting
      if (!ttsPlayingRef.current) return;

      const url = URL.createObjectURL(wavBlob);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = ttsSpeed;
        await audioRef.current.play();
      }

      setIsTtsLoading(false);

      // Scroll to the paragraph containing this sentence
      const paragraphIdx = sentencesInfo[index]?.paragraphIndex;
      if (paragraphIdx !== undefined) {
        const el = document.getElementById(`p-${paragraphIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } catch (error: any) {
      console.error('Error playing sentence:', error);
      setTtsError(error?.message || 'Lỗi chuyển đổi.');
      setIsTtsLoading(false);
      setIsTtsPlaying(false);
      ttsPlayingRef.current = false;
    }
  };

  const pauseTts = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    ttsPlayingRef.current = false;
    setIsTtsPlaying(false);
  };

  const resumeTts = () => {
    if (currentSentenceRef.current < 0) {
      playSentence(0);
      return;
    }

    // Resume current audio if paused mid-sentence
    if (audioRef.current && audioRef.current.src && audioRef.current.paused) {
      ttsPlayingRef.current = true;
      audioRef.current.play().then(() => {
        setIsTtsPlaying(true);
      }).catch(() => {
        // If resume fails (e.g. audio already ended), replay current sentence
        playSentence(currentSentenceRef.current);
      });
    } else {
      playSentence(currentSentenceRef.current);
    }
  };

  const stopTts = () => {
    ttsPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
    }
    setIsTtsPlaying(false);
    setIsTtsLoading(false);
    setCurrentSentenceIndex(-1);
    currentSentenceRef.current = -1;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  // Click on a paragraph to jump and play from that paragraph
  const handleParagraphTtsClick = (paragraphIndex: number) => {
    const sentenceIdx = sentencesInfo.findIndex(s => s.paragraphIndex === paragraphIndex);
    if (sentenceIdx !== -1) {
      playSentence(sentenceIdx);
    }
  };

  useEffect(() => {
    return () => {
      ttsPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // When audio ends, auto-advance to next sentence
  const handleAudioEnded = () => {
    if (ttsPlayingRef.current) {
      playSentence(currentSentenceRef.current + 1);
    } else {
      setIsTtsPlaying(false);
    }
  };

  // Load current user session
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  // Back to top scroll listener
  useEffect(() => {
    const handleScrollVisibility = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScrollVisibility);
    return () => window.removeEventListener('scroll', handleScrollVisibility);
  }, []);

  const handleReportErrorClick = () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để báo lỗi chương!");
      return;
    }
    setReportErrorName('');
    setReportErrorMessage('');
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportErrorName.trim() || !reportErrorMessage.trim() || !currentUser) return;

    // Persist report to localStorage
    const newReport = {
      id: Date.now(),
      novelId,
      chapterIndex: currentIndex,
      chapterTitle: chapterData?.title || `Chương ${currentIndex}`,
      user: currentUser.name,
      errorName: reportErrorName.trim(),
      errorMessage: reportErrorMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const savedReports = localStorage.getItem('error_reports');
    let reportsList = [];
    if (savedReports) {
      try {
        reportsList = JSON.parse(savedReports);
      } catch (e) { }
    }
    reportsList.push(newReport);
    localStorage.setItem('error_reports', JSON.stringify(reportsList));

    alert("Báo cáo lỗi đã được gửi thành công! Cảm ơn sự đóng góp của bạn.");
    setIsReportModalOpen(false);
  };

  const paragraphs = useMemo(() => {
    if (!chapterData?.content) return [];
    return chapterData.content
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }, [chapterData?.content]);

  // Split entire chapter content into list of sentences with paragraph mapping
  const sentencesInfo = useMemo(() => {
    if (paragraphs.length === 0) return [];
    const flat: { text: string; paragraphIndex: number }[] = [];
    paragraphs.forEach((p, pIdx) => {
      // Split sentence endpoints (. ! ?) keeping delimiters, then filter out empty ones
      const rawSentences = p
        .replace(/([.!?]+)(?=\s|$)/g, "$1|")
        .split(/[|\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      rawSentences.forEach(sText => {
        flat.push({
          text: sText,
          paragraphIndex: pIdx
        });
      });
    });
    return flat;
  }, [paragraphs]);

  // Compute active paragraph index for highlighting based on active sentence
  const currentParagraphIndex = useMemo(() => {
    if (currentSentenceIndex < 0) return -1;
    return sentencesInfo[currentSentenceIndex]?.paragraphIndex ?? -1;
  }, [sentencesInfo, currentSentenceIndex]);

  // Autoplay TTS if coming from skip previous/next buttons
  useEffect(() => {
    if (!loading && sentencesInfo.length > 0) {
      const autoplay = localStorage.getItem('tts-autoplay');
      if (autoplay === 'true') {
        localStorage.removeItem('tts-autoplay');
        playSentence(0);
      }
    }
  }, [loading, sentencesInfo]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Font controls dropdown
      if (isFontDropdownOpen && !target.closest('.font-controls-container')) {
        setIsFontDropdownOpen(false);
      }

      // TOC dropdown
      if (isDropdownOpen && !target.closest('.toc-dropdown-container')) {
        setIsDropdownOpen(false);
      }

      // Main sticker dropdown
      if (isMainStickerOpen && !target.closest('.main-sticker-container')) {
        setIsMainStickerOpen(false);
      }

      // Reply sticker dropdown
      if (replyStickerOpenId !== null && !target.closest('.reply-sticker-container')) {
        setReplyStickerOpenId(null);
      }

      // Comment context menu dropdown
      if (activeCommentMenuId !== null && !target.closest('.comment-menu-container')) {
        setActiveCommentMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFontDropdownOpen, isDropdownOpen, isMainStickerOpen, replyStickerOpenId, activeCommentMenuId]);

  // Load and save comments for specific chapter
  useEffect(() => {
    if (novelId && currentIndex) {
      const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setComments(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved comments", e);
          const seeds = getSeedComments();
          setComments(seeds);
          localStorage.setItem(storageKey, JSON.stringify(seeds));
        }
      } else {
        const seeds = getSeedComments();
        setComments(seeds);
        localStorage.setItem(storageKey, JSON.stringify(seeds));
      }
    }
  }, [novelId, currentIndex]);

  const insertStickerToMain = (setId: string, filename: string) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set && mainEditorRef.current) {
      const url = `${set.baseUrl}${filename}`;
      mainEditorRef.current.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (mainEditorRef.current.contains(range.commonAncestorContainer)) {
          const imgHtml = `<img src="${url}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain" />&nbsp;`;
          document.execCommand('insertHTML', false, imgHtml);
          setNewCommentText(mainEditorRef.current.innerHTML);
          setIsMainStickerOpen(false);
          return;
        }
      }
      mainEditorRef.current.innerHTML += `<img src="${url}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain" />&nbsp;`;
      setNewCommentText(mainEditorRef.current.innerHTML);
    }
    setIsMainStickerOpen(false);
  };

  const insertStickerToReply = (setId: string, filename: string) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set && replyEditorRef.current) {
      const url = `${set.baseUrl}${filename}`;
      replyEditorRef.current.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (replyEditorRef.current.contains(range.commonAncestorContainer)) {
          const imgHtml = `<img src="${url}" alt="sticker" class="w-10 h-10 inline-block align-middle my-0.5 mx-1 max-h-10 object-contain" />&nbsp;`;
          document.execCommand('insertHTML', false, imgHtml);
          setReplyText(replyEditorRef.current.innerHTML);
          setReplyStickerOpenId(null);
          return;
        }
      }
      replyEditorRef.current.innerHTML += `<img src="${url}" alt="sticker" class="w-10 h-10 inline-block align-middle my-0.5 mx-1 max-h-10 object-contain" />&nbsp;`;
      setReplyText(replyEditorRef.current.innerHTML);
    }
    setReplyStickerOpenId(null);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser) return;

    const newComment: Comment = {
      id: Date.now(),
      user: currentUser.name,
      time: "Vừa xong",
      text: newCommentText.trim(),
      likes: 0,
      avatar: currentUser.avatar,
      likedByUser: false,
      replies: []
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    setNewCommentText('');
    if (mainEditorRef.current) {
      mainEditorRef.current.innerHTML = '';
    }

    if (novelId && currentIndex) {
      const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const handleAddReply = (commentId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!currentUser) {
      alert("Vui lòng đăng nhập để phản hồi cảm nhận!");
      return;
    }

    const newReply: Reply = {
      id: Date.now(),
      user: currentUser.name,
      time: "Vừa xong",
      text: replyText.trim(),
      avatar: currentUser.avatar,
    };

    const updatedComments = comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    setComments(updatedComments);
    setReplyText('');
    setReplyingToId(null);
    if (replyEditorRef.current) {
      replyEditorRef.current.innerHTML = '';
    }

    if (novelId && currentIndex) {
      const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedComments));
    }
  };

  const handleLikeComment = (commentId: number) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để thích bình luận!");
      return;
    }
    const updated = comments.map(c => {
      if (c.id === commentId) {
        const liked = !c.likedByUser;
        return {
          ...c,
          likedByUser: liked,
          likes: liked ? c.likes + 1 : Math.max(0, c.likes - 1)
        };
      }
      return c;
    });
    setComments(updated);
    if (novelId && currentIndex) {
      const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      const updated = comments.filter(c => c.id !== commentId);
      setComments(updated);
      if (novelId && currentIndex) {
        const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      setActiveCommentMenuId(null);
    }
  };

  const handleStartEdit = (commentId: number, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
    setActiveCommentMenuId(null);
  };

  const handleSaveEdit = (commentId: number) => {
    if (!editingCommentText.trim()) {
      alert("Nội dung bình luận không được để trống!");
      return;
    }
    const updated = comments.map(c => {
      if (c.id === commentId) {
        return { ...c, text: editingCommentText };
      }
      return c;
    });
    setComments(updated);
    if (novelId && currentIndex) {
      const storageKey = `comments_${novelId}_chapter_${currentIndex}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  // Load preferences from localStorage (UX-friendly)
  const [fontSize, setFontSize] = useState<number>(() => {
    return parseInt(localStorage.getItem('reader-font-size') || '16', 10);
  });
  const [fontType, setFontType] = useState<FontType>(() => {
    return (localStorage.getItem('reader-font-type') as FontType) || 'serif';
  });
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    return (localStorage.getItem('reader-theme') as ReadingTheme) || 'sepia';
  });

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-font-type', fontType);
  }, [fontType]);

  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  // Track scrolling progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollPercent(Math.round((window.scrollY / totalHeight) * 100));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show fixed control bar when original bar scrolls out of viewport
  useEffect(() => {
    const el = originalBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When original bar is NOT intersecting (scrolled out), show fixed bar
        setIsHeaderControlsVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation (Left / Right Arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;

      if (e.key === 'ArrowRight') {
        if (toc.length === 0 || currentIndex < toc.length) {
          navigate(`/chapter/${novelId}/${currentIndex + 1}`);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 1) {
          navigate(`/chapter/${novelId}/${currentIndex - 1}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, novelId, toc.length, navigate]);

  // Load novel metadata and TOC
  useEffect(() => {
    if (novelId) {
      NovelService.getNovelDetail(novelId)
        .then(data => {
          const mapped = {
            id: data.slug,
            slug: data.slug,
            title: data.title,
            cover: data.cover_url,
            folder: data.slug,
          };
          setNovel(mapped);
          if (data.chapters && data.chapters.length > 0) {
            setToc(data.chapters.map((c: any) => c.title));
          }
        })
        .catch(err => {
          console.error("Failed to load novel detail from API", err);
          // Fallback to static
          const staticNovel = novelsData.find(n => n.id === novelId);
          if (staticNovel) {
            setNovel(staticNovel);
            fetch(`/data/${encodeURIComponent(staticNovel.folder)}/toc.json`)
              .then(res => res.json())
              .then(tocData => setToc(tocData))
              .catch(() => { });
          }
        });
    }
  }, [novelId]);

  // Load chapter content
  useEffect(() => {
    if (novelId && currentIndex) {
      setLoading(true);

      // Stop and reset audio playback for the new chapter
      stopTts();

      ChapterService.getChapterByNumber(novelId, currentIndex)
        .then(chap => {
          if (chap) {
            ChapterService.getChapterContent(chap.id)
              .then(data => {
                setChapterData(data);
                setLoading(false);
                window.scrollTo(0, 0);

                // Increment chapter views count on backend database on every load
                const incrementKey = `${novelId}_${currentIndex}`;
                if (incrementedRef.current !== incrementKey) {
                  incrementedRef.current = incrementKey;
                  ChapterService.incrementViews(chap.id).catch(() => { });
                }
              })
              .catch(err => {
                console.warn("Failed to fetch chapter content from proxy, attempting fallback", err);
                fallbackLoad();
              });
          } else {
            fallbackLoad();
          }
        })
        .catch(err => {
          console.warn("Failed to query chapter from API, attempting fallback", err);
          fallbackLoad();
        });
    }

    function fallbackLoad() {
      // Find static folder from static list as fallback
      const staticNovel = novelsData.find(n => n.id === novelId);
      const folder = staticNovel ? staticNovel.folder : novelId;
      if (novelId) incrementNovelView(novelId);

      fetch(`/data/${encodeURIComponent(folder)}/chapters/chapter${currentIndex}.json`)
        .then(res => res.json())
        .then(data => {
          setChapterData(data);
          setLoading(false);
          window.scrollTo(0, 0);
        })
        .catch(err => {
          console.error("Failed to load chapter static fallback", err);
          setLoading(false);
        });
    }
  }, [novelId, currentIndex]);

  if (!novel && !loading) {
    return (
      <div className="pt-20 pb-12 px-6 text-center text-on-surface">
        <h1 className="font-display-lg text-xl md:text-2xl mb-4">Truyện không tồn tại</h1>
        <Link to="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  const parsedTitle = useMemo(() => {
    const fullTitle = chapterData?.title || `Chương ${currentIndex}`;
    const colonIndex = fullTitle.indexOf(':');
    if (colonIndex > 0) {
      const num = fullTitle.substring(0, colonIndex).trim();
      const name = fullTitle.substring(colonIndex + 1).trim();
      return { num, name };
    }
    return { num: '', name: fullTitle };
  }, [chapterData, currentIndex]);

  const currentTheme = THEME_CLASSES[theme];

  // Helper to render novel text cleanly, mapping parsed paragraphs
  const renderChapterContent = () => {
    if (paragraphs.length === 0) return null;

    return (
      <div
        className="space-y-6 leading-relaxed text-justify select-text max-w-[760px] mx-auto"
        style={{
          fontFamily: FONT_MAP[fontType],
          fontSize: `${fontSize}px`,
          lineHeight: 1.85
        }}
      >
        {paragraphs.map((paragraph, index) => {
          let trimmed = paragraph.trim();

          const hasHTML = /<\/?[a-z][\s\S]*>/i.test(trimmed);

          // Add a dash prefix for dialogue lines starting with double quotes
          const startsWithQuote = trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.startsWith('”');
          if (startsWithQuote) {
            const hasDash = trimmed.startsWith('-') || trimmed.startsWith('–') || trimmed.startsWith('—');
            if (!hasDash) {
              trimmed = `- ${trimmed}`;
            }
          }

          const isCurrentParagraph = (isTtsPlaying || isTtsLoading) && index === currentParagraphIndex;

          return (
            <p
              id={`p-${index}`}
              key={index}
              onClick={() => handleParagraphTtsClick(index)}
              className={`tracking-wide transition-[background-color,color,padding-left,border-color] duration-300 rounded-sm cursor-pointer hover:bg-primary/[0.03] ${isCurrentParagraph
                  ? 'bg-primary/5 text-primary border-l-2 border-l-primary pl-3 py-0.5'
                  : ''
                }`}
              dangerouslySetInnerHTML={hasHTML ? { __html: trimmed } : undefined}
            >
              {hasHTML ? undefined : trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'hot') {
      return b.likes - a.likes;
    }
    return b.id - a.id;
  });

  return (
    <div className={`w-full min-h-screen ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300 pb-20`}>
      {/* Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-50 transition-all duration-150"
        style={{ width: `${scrollPercent}%` }}
      />

      <div className="max-w-[860px] mx-auto px-6 pt-6">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-6 truncate min-w-0">
          <ol className="inline-flex items-center space-x-1 md:space-x-2 truncate">
            <li className="inline-flex items-center shrink-0">
              <Link className="hover:text-primary transition-colors flex items-center" to="/">
                <ViconicIcon name="home" size={14} className="sm:mr-1 shrink-0" />
                <span className="hidden sm:inline">Trang chủ</span>
              </Link>
            </li>
            <li className="min-w-0 flex items-center">
              <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
              {novel ? (
                <Link className="hover:text-primary transition-colors truncate" to={`/detail/${novel.id}`}>
                  {novel.title}
                </Link>
              ) : (
                <span className={`h-3.5 ${currentTheme.skeleton} rounded w-36 animate-pulse inline-block`} />
              )}
            </li>
            <li aria-current="page" className="shrink-0 min-w-0 flex items-center">
              <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
              <span className="font-bold truncate">Chương {currentIndex}</span>
            </li>
          </ol>
        </nav>

        {/* Content Header */}
        <header className="mb-8 border-b border-dashed pb-6 border-slate-200 dark:border-slate-800 text-left mt-6">
          {loading ? (
            <div className="animate-pulse space-y-3.5">
              <div className={`h-3 ${currentTheme.skeleton} rounded w-48`} />
              <div className={`h-2.5 ${currentTheme.skeleton} rounded w-20`} />
              <div className={`h-8 ${currentTheme.skeleton} rounded w-2/3`} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Link
                  to={`/detail/${novelId}`}
                  className="hover:text-primary transition-colors text-xs font-bold opacity-60 tracking-wider"
                >
                  {novel?.title}
                </Link>
              </div>
              {parsedTitle.num && (
                <span className="block text-[11px] font-black uppercase tracking-widest text-primary/95 mb-2">
                  {parsedTitle.num}
                </span>
              )}
              <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                {parsedTitle.name}
              </h1>
            </>
          )}
        </header>

        {/* Premium Sticky Control Bar */}
        <div ref={originalBarRef} className="mb-8">
          <div className={`border ${currentTheme.border} ${currentTheme.accentBg} rounded-md p-3.5 flex items-center justify-between gap-4 shadow-md w-full`}>

            {/* Left: Font controls */}
            <div className="flex items-center justify-start relative shrink-0 gap-2 font-controls-container">
              <button
                onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                className={`flex items-center space-x-1 px-3 py-2 sm:space-x-1.5 sm:px-4.5 sm:py-2.5 rounded-sm transition-all font-bold text-xs ${currentTheme.buttonBg} border ${currentTheme.border} shadow-sm`}
                title="Cài đặt phông chữ và kích thước"
              >
                <ViconicIcon name="format_size" size={14} className="shrink-0" />
                <span className="hidden sm:inline">Cỡ chữ & Phông</span>
                <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
              </button>

              {isFontDropdownOpen && (
                <div className={`absolute top-full left-0 mt-2 w-64 p-4 ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex flex-col gap-4 overscroll-contain`}>

                  {/* Font Size slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Kích thước chữ</span>
                      <span className="font-bold text-xs text-primary">{fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-60">A-</span>
                      <input
                        type="range"
                        min={14}
                        max={32}
                        step={2}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-xs font-bold opacity-80">A+</span>
                    </div>
                  </div>

                  {/* Font Type Selection */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-85">Kiểu chữ</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['serif', 'sans', 'mono'] as FontType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setFontType(type)}
                          className={`text-[10px] font-bold py-1.5 rounded-sm border uppercase transition-all ${fontType === type
                            ? 'border-primary text-primary bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-300'
                            }`}
                        >
                          {type === 'serif' ? 'Book' : type === 'sans' ? 'Clean' : 'Code'}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Center: Table of Contents Dropdown */}
            <div className="flex justify-center flex-grow max-w-[150px] sm:max-w-[280px] md:max-w-[340px]">
              <div className="relative w-full toc-dropdown-container">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center space-x-1 px-3 py-2 sm:space-x-1.5 sm:px-4.5 sm:py-2.5 rounded-sm transition-all font-bold text-xs ${currentTheme.buttonBg} border ${currentTheme.border} shadow-sm w-full justify-between`}
                >
                  <div className="flex items-center space-x-1.5 truncate mr-1.5">
                    <ViconicIcon name="list" size={14} className="shrink-0" />
                    <span className="truncate select-none hidden sm:inline">{chapterData?.title || `Chương ${currentIndex}`}</span>
                    <span className="truncate select-none sm:hidden">Chương {currentIndex}</span>
                  </div>
                  <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
                </button>

                {isDropdownOpen && (
                  <div className={`absolute top-full left-0 w-full mt-2 max-h-[50vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'
                    } border shadow-xl rounded-md z-50 flex flex-col overscroll-contain`}>
                    {toc.map((title, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsDropdownOpen(false);
                          navigate(`/chapter/${novelId}/${idx + 1}`);
                        }}
                        className={`text-left px-4 py-2.5 hover:bg-primary/5 transition-colors border-b last:border-b-0 text-xs ${theme === 'dark' ? 'border-[#282B30]' : 'border-slate-100'
                          } ${idx + 1 === currentIndex ? 'font-bold text-primary bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                      >
                        {title}
                      </button>
                    ))}
                    {toc.length === 0 && (
                      <div className="px-4 py-3 text-xs text-center opacity-70">Không có dữ liệu</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Theme selection */}
            <div className="flex items-center justify-end shrink-0">
              {/* Reading Themes Selection */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {(['light', 'sepia', 'green', 'dark'] as ReadingTheme[]).map(t => {
                  const colors = {
                    light: 'bg-white border-slate-300',
                    sepia: 'bg-[#F5EEDC] border-[#DCD3B9]',
                    green: 'bg-[#E1EDDB] border-[#C3D5B9]',
                    dark: 'bg-[#1C1D21] border-[#2E3238]',
                  };
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border transition-transform hover:scale-110 active:scale-95 ${colors[t]} ${theme === t ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-[#121316]' : 'opacity-80'
                        }`}
                      title={`Chủ đề ${t}`}
                    />
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Fixed Control Bar — appears when original bar scrolls out of viewport */}
        <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${currentTheme.border} ${currentTheme.accentBg} shadow-lg ${
          isHeaderControlsVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}>
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-3 max-w-[860px] mx-auto">

              {/* Left: Font controls */}
              <div className="flex items-center justify-start relative shrink-0 gap-2 font-controls-container">
                <button
                  onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                  className={`flex items-center space-x-1 px-3 py-2 sm:space-x-1.5 sm:px-4.5 sm:py-2.5 rounded-sm transition-all font-bold text-xs ${currentTheme.buttonBg} border ${currentTheme.border} shadow-sm`}
                  title="Cài đặt phông chữ và kích thước"
                >
                  <ViconicIcon name="format_size" size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Cỡ chữ & Phông</span>
                  <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
                </button>
                {isFontDropdownOpen && (
                  <div className={`absolute top-full left-0 mt-2 w-64 p-4 ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex flex-col gap-4 overscroll-contain`}>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Kích thước chữ</span>
                        <span className="font-bold text-xs text-primary">{fontSize}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-60">A-</span>
                        <input type="range" min={14} max={32} step={2} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                        <span className="text-xs font-bold opacity-80">A+</span>
                      </div>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider mb-2 opacity-85">Kiểu chữ</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['serif', 'sans', 'mono'] as FontType[]).map(type => (
                          <button key={type} onClick={() => setFontType(type)} className={`text-[10px] font-bold py-1.5 rounded-sm border uppercase transition-all ${fontType === type ? 'border-primary text-primary bg-primary/10' : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-300'}`}>
                            {type === 'serif' ? 'Book' : type === 'sans' ? 'Clean' : 'Code'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Center: Chapter nav */}
              <div className="flex justify-center flex-grow max-w-[150px] sm:max-w-[280px] md:max-w-[340px]">
                <div className="relative w-full toc-dropdown-container">
                  <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`flex items-center space-x-1 px-3 py-2 sm:space-x-1.5 sm:px-4.5 sm:py-2.5 rounded-sm transition-all font-bold text-xs ${currentTheme.buttonBg} border ${currentTheme.border} shadow-sm w-full justify-between`}>
                    <div className="flex items-center space-x-1.5 truncate mr-1.5">
                      <ViconicIcon name="list" size={14} className="shrink-0" />
                      <span className="truncate select-none hidden sm:inline">{chapterData?.title || `Chương ${currentIndex}`}</span>
                      <span className="truncate select-none sm:hidden">Chương {currentIndex}</span>
                    </div>
                    <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
                  </button>
                  {isDropdownOpen && (
                    <div className={`absolute top-full left-0 w-full mt-2 max-h-[50vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex flex-col overscroll-contain`}>
                      {toc.map((title, idx) => (
                        <button key={idx} onClick={() => { setIsDropdownOpen(false); navigate(`/chapter/${novelId}/${idx + 1}`); }} className={`text-left px-4 py-2.5 hover:bg-primary/5 transition-colors border-b last:border-b-0 text-xs ${theme === 'dark' ? 'border-[#282B30]' : 'border-slate-100'} ${idx + 1 === currentIndex ? 'font-bold text-primary bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                          {title}
                        </button>
                      ))}
                      {toc.length === 0 && (<div className="px-4 py-3 text-xs text-center opacity-70">Không có dữ liệu</div>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Theme selection */}
              <div className="flex items-center justify-end shrink-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  {(['light', 'sepia', 'green', 'dark'] as ReadingTheme[]).map(t => {
                    const colors = { light: 'bg-white border-slate-300', sepia: 'bg-[#F5EEDC] border-[#DCD3B9]', green: 'bg-[#E1EDDB] border-[#C3D5B9]', dark: 'bg-[#1C1D21] border-[#2E3238]' };
                    return (<button key={t} onClick={() => setTheme(t)} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border transition-transform hover:scale-110 active:scale-95 ${colors[t]} ${theme === t ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-[#121316]' : 'opacity-80'}`} title={`Chủ đề ${t}`} />);
                  })}
                </div>
              </div>

          </div>
        </div>

        {/* Immersive Reading Article */}
        <article className="mb-14">
          {loading ? (
            <div className="animate-pulse space-y-5">
              {/* Paragraph 1 */}
              <div className="space-y-2.5">
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[92%]`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[78%]`} />
              </div>
              {/* Paragraph 2 */}
              <div className="space-y-2.5">
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[88%]`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[65%]`} />
              </div>
              {/* Paragraph 3 */}
              <div className="space-y-2.5">
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[95%]`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[82%]`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[45%]`} />
              </div>
              {/* Paragraph 4 */}
              <div className="space-y-2.5">
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[90%]`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-full`} />
                <div className={`h-[18px] ${currentTheme.skeleton} rounded w-[72%]`} />
              </div>
            </div>
          ) : chapterData ? (
            renderChapterContent()
          ) : (
            <div className="text-center opacity-70 py-16 border border-dashed rounded-md">
              Nội dung chương này chưa được cập nhật.
            </div>
          )}

          {/* Chapter Ending Separator */}
          {!loading && chapterData && (
            <div className="flex justify-center mt-16 items-center gap-4 opacity-30">
              <div className={`h-[1px] w-20 ${theme === 'dark' ? 'bg-white' : 'bg-slate-800'}`} />
              <ViconicIcon name="menu_book" size={16} className="shrink-0" />
              <div className={`h-[1px] w-20 ${theme === 'dark' ? 'bg-white' : 'bg-slate-800'}`} />
            </div>
          )}
        </article>

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between items-center mb-10 gap-2">
          <button
            onClick={() => navigate(`/chapter/${novelId}/${currentIndex - 1}`)}
            disabled={currentIndex <= 1}
            className={`flex items-center px-3 py-2.5 sm:px-5 sm:py-2.5 border rounded-sm font-bold text-xs transition-all ${currentTheme.buttonBg} ${currentTheme.border} disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <ViconicIcon name="arrow_back" size={14} className="sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Chương trước</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to={`/detail/${novelId}`}
              className={`flex items-center px-3 py-2.5 sm:px-4 sm:py-2.5 border rounded-sm font-bold text-xs transition-all ${currentTheme.buttonBg} ${currentTheme.border}`}
              title="Quay lại chi tiết truyện"
            >
              <ViconicIcon name="auto_stories" size={14} className="shrink-0" />
            </Link>

            <button
              onClick={handleReportErrorClick}
              className={`flex items-center px-3 py-2.5 sm:px-4 sm:py-2.5 border rounded-sm font-bold text-xs transition-all ${currentTheme.buttonBg} ${currentTheme.border} hover:text-primary`}
              title="Báo lỗi chương"
            >
              <ViconicIcon name="report" size={14} className="sm:mr-1 shrink-0" />
              <span className="hidden sm:inline">Báo lỗi</span>
            </button>
          </div>

          <button
            onClick={() => navigate(`/chapter/${novelId}/${currentIndex + 1}`)}
            disabled={toc.length > 0 && currentIndex >= toc.length}
            className={`flex items-center px-3 py-2.5 sm:px-5 sm:py-2.5 bg-primary text-on-primary rounded-sm font-bold text-xs transition-all hover:bg-primary/95 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/10`}
          >
            <span className="hidden sm:inline">Chương sau</span>
            <ViconicIcon name="arrow_forward" size={14} className="sm:ml-1.5 shrink-0" />
          </button>
        </div>

        {/* Comments Section */}
        <section className={`mt-12 pt-8 border-t border-dashed ${currentTheme.border}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display-lg text-lg md:text-xl font-bold flex items-center gap-2">
              <ViconicIcon name="forum" size={20} className="text-primary shrink-0" />
              <span>Bình luận ({comments.length})</span>
            </h2>
            <div className={`flex items-center border ${currentTheme.border} rounded-sm overflow-hidden p-0.5 text-[10px] font-bold`}>
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 transition-all rounded-[3px] ${sortBy === 'newest'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'opacity-70 hover:opacity-100'
                  }`}
              >
                Mới nhất
              </button>
              <button
                type="button"
                onClick={() => setSortBy('hot')}
                className={`px-2.5 py-1 transition-all rounded-[3px] ${sortBy === 'hot'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'opacity-70 hover:opacity-100'
                  }`}
              >
                Nổi bật
              </button>
            </div>
          </div>

          {/* Comment Form */}
          {!currentUser ? (
            <div className={`mb-8 border border-dashed ${currentTheme.border} p-5 rounded-sm text-center ${currentTheme.accentBg}`}>
              <p className="text-xs mb-3">Vui lòng đăng nhập tài khoản để tham gia gửi bình luận về chương này.</p>
              <button
                onClick={() => {
                  const mockUser = {
                    name: "Độc Giả Yume",
                    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAb-14uOcA3z6oOYNNXFQZMGk5LqtQxM2cL7kShQ6UO4TvOht8YiLfBJY-3bihJuLgXze9CkbXBa6QFIw9VqTUHkpB50TncEOMChL_WpiVyFICNRCgDJc9ARVe1kNnxXUnO8MK2up2wRutKKiFBjnuceM8exGI8iRAvDvvXidxorqEi32E5PB2o9k-EKsrzj1ffNHQkPDA5LxhyYhJbSWfwvAlEKTTvNwgrsUxFkPJ1FnXVSIeWsLB4K3mNSVpSarNi49k0D31ynmtw"
                  };
                  localStorage.setItem('user', JSON.stringify(mockUser));
                  setCurrentUser(mockUser);
                  alert("Đăng nhập thành công (Demo)!");
                  window.location.reload();
                }}
                className="bg-primary text-on-primary font-bold text-xs py-2 px-5 rounded-sm hover:bg-primary/95 transition-colors inline-flex items-center gap-1.5 active:scale-95"
              >
                <ViconicIcon name="login" size={12} className="shrink-0" />
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="mb-8 flex gap-4">
              <img
                alt="Your avatar"
                className={`w-10 h-10 rounded-sm shrink-0 object-cover border ${currentTheme.border}`}
                src={currentUser.avatar}
              />
              <div className="flex-grow flex flex-col gap-2.5">
                <style>{`
              .rich-editor:empty:before {
                content: attr(placeholder);
                color: #94a3b8;
                cursor: text;
              }
            `}</style>
                <div
                  ref={mainEditorRef}
                  contentEditable={true}
                  className={`w-full ${currentTheme.accentBg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm p-3 font-body-ui text-xs min-h-[80px] max-h-[200px] overflow-y-auto shadow-inner outline-none transition-colors duration-200 rich-editor`}
                  {...({ placeholder: "Chia sẻ cảm nghĩ của bạn về chương này..." } as any)}
                  onInput={(e) => setNewCommentText(e.currentTarget.innerHTML)}
                />
                <div className="flex justify-between items-center relative">
                  {/* Sticker button on the left */}
                  <div className="relative main-sticker-container">
                    <button
                      type="button"
                      onClick={() => setIsMainStickerOpen(!isMainStickerOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border ${currentTheme.border} ${currentTheme.buttonBg} transition-all rounded-sm text-xs font-bold`}
                    >
                      <ViconicIcon name="sentiment_satisfied" size={14} className="shrink-0" />
                      Stickers
                    </button>
                    {/* Sticker Dropdown Popup */}
                    {isMainStickerOpen && (
                      <div className={`absolute left-0 bottom-full mb-2 z-50 w-[320px] sm:w-[360px] border border-outline-variant/60 shadow-xl ${currentTheme.accentBg} rounded-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                        {/* Header: Tab select button of sticker sets */}
                        <div className="flex bg-current/5 border-b border-current/10 p-1.5 gap-2 shrink-0">
                          {STICKER_SETS.map(set => {
                            const firstStickerUrl = `${set.baseUrl}${set.items[0]}`;
                            return (
                              <button
                                key={set.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setActiveStickerSetId(set.id);
                                }}
                                className={`p-1 rounded-sm border transition-colors flex items-center justify-center ${activeStickerSetId === set.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-transparent hover:bg-current/10'
                                  }`}
                                title={set.name}
                              >
                                <img src={firstStickerUrl} alt={set.name} className="w-6 h-6 object-contain" />
                              </button>
                            );
                          })}
                        </div>
                        {/* Scrollable list of stickers */}
                        {(() => {
                          const activeSet = STICKER_SETS.find(s => s.id === activeStickerSetId) || STICKER_SETS[0];
                          return (
                            <div className="grid grid-cols-6 gap-2 p-3 overflow-y-auto max-h-[180px] min-h-[180px] bg-transparent select-none">
                              {activeSet.items.map(filename => {
                                const url = `${activeSet.baseUrl}${filename}`;
                                return (
                                  <button
                                    key={filename}
                                    type="button"
                                    onClick={() => insertStickerToMain(activeSet.id, filename)}
                                    className="p-1 hover:bg-current/10 rounded-sm transition-colors aspect-square flex items-center justify-center border border-transparent hover:border-current/20 active:scale-90"
                                  >
                                    <img src={url} alt={filename} className="w-10 h-10 object-contain" loading="lazy" />
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-sm hover:bg-primary/95 transition-colors text-xs shadow-md shadow-primary/10">Đăng cảm nhận</button>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className={`flex gap-3 p-4 rounded-sm border ${currentTheme.border} ${currentTheme.accentBg} hover:bg-opacity-100 transition-colors duration-200`}
              >
                <div className="relative shrink-0">
                  <img
                    alt={comment.user}
                    className={`w-10 h-10 rounded-sm object-cover border ${currentTheme.border}`}
                    src={comment.avatar}
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 truncate">
                      <span className="font-label-bold text-xs truncate">{comment.user}</span>
                      <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest shrink-0">{comment.time}</span>
                    </div>

                    {/* Actions Dropdown */}
                    <div className="relative comment-menu-container">
                      <button
                        onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                        className="opacity-60 hover:opacity-100 hover:text-primary transition-colors flex items-center justify-center shrink-0 p-1 rounded-sm"
                      >
                        <ViconicIcon name="more_horiz" size={14} className="shrink-0" />
                      </button>
                      {activeCommentMenuId === comment.id && (
                        <div className={`absolute right-0 top-full mt-1.5 w-24 border ${currentTheme.border} shadow-xl ${currentTheme.accentBg} rounded-sm overflow-hidden flex flex-col z-30 animate-in fade-in slide-in-from-top-1 duration-150`}>
                          <button
                            onClick={() => handleStartEdit(comment.id, comment.text)}
                            className="px-3 py-2 text-left text-[11px] font-bold hover:bg-primary/5 transition-colors border-b last:border-b-0 border-current/10"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <div
                        contentEditable={true}
                        ref={(el) => {
                          if (el && !el.dataset.initialized) {
                            el.innerHTML = editingCommentText;
                            el.dataset.initialized = 'true';
                          }
                        }}
                        onInput={(e) => setEditingCommentText(e.currentTarget.innerHTML)}
                        className={`w-full ${currentTheme.bg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm p-2.5 font-body-ui text-xs min-h-[60px] outline-none shadow-inner`}
                        dir="ltr"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="px-3 py-1.5 border border-dashed rounded-sm text-[10px] font-bold opacity-75 hover:opacity-100 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1.5 bg-primary text-on-primary rounded-sm text-[10px] font-bold hover:bg-primary/95 transition-all shadow-sm active:scale-95"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="font-body-ui text-[12px] mt-1.5 leading-relaxed text-justify break-words"
                      dangerouslySetInnerHTML={{ __html: renderCommentContentHtml(comment.text) }}
                    />
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 transition-colors group ${comment.likedByUser ? 'text-primary' : 'opacity-70 hover:opacity-100 hover:text-primary'
                        }`}
                    >
                      <ViconicIcon
                        name="favorite"
                        size={14}
                        className={`shrink-0 ${comment.likedByUser ? 'text-primary scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}
                      />
                      <span className="font-bold text-[10px]">{comment.likes}</span>
                    </button>
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className={`font-bold text-[10px] opacity-70 hover:opacity-100 hover:text-primary transition-colors flex items-center gap-1 ${replyingToId === comment.id ? 'text-primary animate-pulse' : ''
                        }`}
                    >
                      <ViconicIcon name="reply" size={14} className="shrink-0" />
                      Phản hồi
                    </button>
                  </div>

                  {/* Nested Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3.5 space-y-3.5 pl-4 border-l-2 border-dashed border-current/20 animate-in fade-in duration-300">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className={`flex gap-2.5 p-2.5 rounded-sm border ${currentTheme.border} bg-current/5`}>
                          <img alt={reply.user} className={`w-8 h-8 rounded-sm object-cover border ${currentTheme.border} shrink-0`} src={reply.avatar} />
                          <div className="flex-grow min-w-0">
                            <div className="flex items-baseline gap-2 truncate">
                              <span className="font-label-bold text-[11px] truncate">{reply.user}</span>
                              <span className="text-[8px] opacity-60 font-bold uppercase tracking-widest shrink-0">{reply.time}</span>
                            </div>
                            <p
                              className="font-body-ui text-[11.5px] mt-1 leading-relaxed text-justify break-words"
                              dangerouslySetInnerHTML={{ __html: renderCommentContentHtml(reply.text) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingToId === comment.id && (
                    <form onSubmit={(e) => handleAddReply(comment.id, e)} className={`mt-3 p-2 sm:p-3 rounded-sm border border-dashed ${currentTheme.border} bg-current/5 flex gap-2 sm:gap-3 animate-in slide-in-from-top-2 duration-200`}>
                      <img alt="Your avatar" className={`w-6 h-6 sm:w-8 sm:h-8 rounded-sm shrink-0 object-cover border ${currentTheme.border}`} src={currentUser ? currentUser.avatar : "https://lh3.googleusercontent.com/aida-public/AB6AXuD1epYzUm9PYg5Z4v3zZXDsv3Ph06NlgpommDOBvTTqpLS3sgVhIeXPPp9WnpwOkdoqtjcPa7sGjgQfoBHy1XdCxXIKD7tqus0SdH1HPjLIKxGI69O0lGijT1mmXVujCcTxU8e4qviArMpb35YAx9YX9MqEvEk89DXG1XvQL29j24ny5Zf8gpuufV0HirEieDmpzG4wzbSixeeYFb8Jzm5F7Pj_zz0pQAd7bOyes99b2icDY6xwJomVgVwm7mLtPK9U6SCF3BpQUm0w"} />
                      <div className="flex-grow flex flex-col gap-2">
                        <div
                          ref={replyEditorRef}
                          contentEditable={true}
                          className={`w-full ${currentTheme.bg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm p-2 sm:p-2.5 font-body-ui text-[11px] sm:text-xs min-h-[44px] sm:min-h-[56px] max-h-[120px] overflow-y-auto outline-none shadow-inner rich-editor`}
                          {...({ placeholder: `Phản hồi bình luận của ${comment.user}...` } as any)}
                          onInput={(e) => setReplyText(e.currentTarget.innerHTML)}
                        />
                        <div className="flex justify-between items-center relative text-[9px] sm:text-[10px]">
                          {/* Reply Sticker button */}
                          <div className="relative reply-sticker-container">
                            <button
                              type="button"
                              onClick={() => setReplyStickerOpenId(replyStickerOpenId === comment.id ? null : comment.id)}
                              className={`flex items-center gap-1 px-2 py-1 border ${currentTheme.border} hover:border-primary/50 hover:bg-current/5 transition-all rounded-sm text-[10px] font-bold`}
                            >
                              <ViconicIcon name="sentiment_satisfied" size={12} className="shrink-0" />
                              <span className="hidden sm:inline">Stickers</span>
                            </button>
                            {/* Reply Sticker Dropdown Popup */}
                            {replyStickerOpenId === comment.id && (
                              <div className={`absolute left-0 bottom-full mb-2 z-50 w-[280px] sm:w-[320px] border ${currentTheme.border} shadow-xl ${currentTheme.accentBg} rounded-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                                {/* Header: Tab select button of sticker sets */}
                                <div className="flex bg-current/5 border-b border-current/10 p-1.5 gap-2 shrink-0">
                                  {STICKER_SETS.map(set => {
                                    const firstStickerUrl = `${set.baseUrl}${set.items[0]}`;
                                    return (
                                      <button
                                        key={set.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setActiveStickerSetId(set.id);
                                        }}
                                        className={`p-1 rounded-sm border transition-colors flex items-center justify-center ${activeStickerSetId === set.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-transparent hover:bg-current/10'
                                          }`}
                                        title={set.name}
                                      >
                                        <img src={firstStickerUrl} alt={set.name} className="w-5 h-5 object-contain" />
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* Scrollable list of stickers */}
                                {(() => {
                                  const activeSet = STICKER_SETS.find(s => s.id === activeStickerSetId) || STICKER_SETS[0];
                                  return (
                                    <div className="grid grid-cols-5 gap-1.5 p-2 overflow-y-auto max-h-[150px] min-h-[150px] bg-transparent select-none">
                                      {activeSet.items.map(filename => {
                                        const url = `${activeSet.baseUrl}${filename}`;
                                        return (
                                          <button
                                            key={filename}
                                            type="button"
                                            onClick={() => insertStickerToReply(activeSet.id, filename)}
                                            className="p-1 hover:bg-current/10 rounded-sm transition-colors aspect-square flex items-center justify-center border border-transparent hover:border-current/20 active:scale-90"
                                          >
                                            <img src={url} alt={filename} className="w-8 h-8 object-contain" loading="lazy" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => setReplyingToId(null)}
                              className={`p-1.5 sm:px-3 sm:py-1 border ${currentTheme.border} ${currentTheme.buttonBg} hover:opacity-90 transition-colors rounded-sm font-bold`}
                              title="Hủy"
                            >
                              <ViconicIcon name="close" size={12} className="sm:hidden shrink-0" />
                              <span className="hidden sm:inline">Hủy</span>
                            </button>
                            <button
                              type="submit"
                              className="p-1.5 sm:px-3 sm:py-1 bg-primary text-on-primary hover:bg-primary/95 transition-colors rounded-sm font-bold shadow-xs shadow-primary/10"
                              title="Phản hồi"
                            >
                              <ViconicIcon name="send" size={12} className="sm:hidden shrink-0" />
                              <span className="hidden sm:inline">Phản hồi</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <div className={`text-center py-10 border border-dashed rounded-sm ${currentTheme.border} opacity-50 text-xs`}>
                Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Report Error Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setIsReportModalOpen(false)} />

          <div className={`relative w-full max-w-md ${currentTheme.accentBg} ${currentTheme.text} ${currentTheme.border} border rounded-md shadow-2xl p-6 z-10 animate-in zoom-in-95 duration-200 flex flex-col`}>

            <div className="flex items-center justify-between pb-3 border-b border-dashed border-current/10 mb-4">
              <h3 className="font-display-lg text-sm md:text-base font-bold flex items-center gap-1.5 text-primary">
                <ViconicIcon name="report" size={18} className="shrink-0" />
                <span>Báo lỗi chương truyện</span>
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="opacity-70 hover:opacity-100 p-1 flex items-center justify-center rounded-sm hover:bg-current/5"
              >
                <ViconicIcon name="close" size={16} className="shrink-0" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Loại lỗi / Tên lỗi
                </label>
                <input
                  type="text"
                  required
                  value={reportErrorName}
                  onChange={(e) => setReportErrorName(e.target.value)}
                  placeholder="Ví dụ: Lỗi chính tả, Thiếu chương, Lặp chương..."
                  className={`w-full ${currentTheme.bg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm px-3 py-2 text-xs placeholder:text-current placeholder:opacity-40 outline-none transition-colors duration-200`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-80">
                  Chi tiết nội dung lỗi
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportErrorMessage}
                  onChange={(e) => setReportErrorMessage(e.target.value)}
                  placeholder="Mô tả chi tiết lỗi gặp phải..."
                  className={`w-full ${currentTheme.bg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm p-3 text-xs placeholder:text-current placeholder:opacity-40 resize-none outline-none transition-colors duration-200 h-28`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-current/10">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className={`px-4 py-2 text-xs font-bold rounded-sm border ${currentTheme.border} ${currentTheme.buttonBg} hover:opacity-90`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-sm bg-primary hover:bg-primary/95 text-on-primary shadow-md shadow-primary/10 active:scale-95 transition-all"
                >
                  Gửi báo cáo
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Back to Top button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-20 right-6 z-40 p-3 rounded-full border shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${currentTheme.buttonBg} ${currentTheme.border} text-primary`}
          title="Cuộn lên đầu trang"
        >
          <ViconicIcon name="arrow_upward" size={18} className="shrink-0" />
        </button>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        style={{ display: 'none' }}
      />

      {/* Floating Audio Player - Per-sentence streaming */}
      {/* Floating Audio Player - Per-paragraph streaming */}
      {paragraphs.length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 border-t ${currentTheme.border} ${currentTheme.accentBg} shadow-2xl animate-in slide-in-from-bottom duration-300`}>
          <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[860px] mx-auto">
            {/* Left: Info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 bg-primary/10 text-primary rounded-sm flex items-center justify-center shrink-0">
                {isTtsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ViconicIcon name="settings_voice" size={16} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold truncate">
                  {ttsError ? (
                    <span className="text-destructive">{ttsError}</span>
                  ) : isModelLoading ? (
                    <span className="animate-pulse text-primary">Đang tải mô hình...</span>
                  ) : isTtsLoading ? (
                    <span className="animate-pulse text-primary">Đang chuyển đổi...</span>
                  ) : currentParagraphIndex >= 0 ? (
                    <span className="truncate">
                      Đoạn {currentParagraphIndex + 1}/{paragraphs.length}
                    </span>
                  ) : (
                    <span className="opacity-70 truncate hidden sm:inline">Chọn đoạn hoặc nhấn Phát để nghe</span>
                  )}
                </p>
              </div>
            </div>

            {/* Center: Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Skip Previous Button */}
              <button
                onClick={() => {
                  localStorage.setItem('tts-autoplay', 'true');
                  navigate(`/chapter/${novelId}/${currentIndex - 1}`);
                }}
                disabled={currentIndex <= 1}
                className="p-1.5 rounded-full hover:bg-current/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center justify-center"
                title="Chương trước"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Play/Pause Toggle Button */}
              <button
                onClick={isTtsPlaying ? pauseTts : resumeTts}
                className="p-2 sm:p-2.5 bg-primary text-on-primary rounded-full hover:bg-primary/95 transition-all shadow-md active:scale-95 flex items-center justify-center"
                title={isTtsPlaying ? "Tạm dừng" : "Phát"}
              >
                {isTtsPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>

              {/* Skip Next Button */}
              <button
                onClick={() => {
                  localStorage.setItem('tts-autoplay', 'true');
                  navigate(`/chapter/${novelId}/${currentIndex + 1}`);
                }}
                disabled={toc.length > 0 && currentIndex >= toc.length}
                className="p-1.5 rounded-full hover:bg-current/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-primary flex items-center justify-center"
                title="Chương sau"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Speed control */}
            <div className="flex items-center gap-2 max-w-[120px] sm:max-w-[160px] flex-1 justify-end">
              <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap opacity-80 min-w-[32px] text-right">
                {ttsSpeed.toFixed(1)}x
              </span>
              <input
                type="range"
                min="1.0"
                max="2.0"
                step="0.1"
                value={ttsSpeed}
                onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                className="w-16 sm:w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary shrink-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterPage;
