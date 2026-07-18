import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService, ChapterService, CoinService, CommentService, API_BASE_URL } from '@/lib/api';
import { isUserVIP } from '@/lib/user';
import { showToast, showCustomConfirm } from '@/lib/dialog';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { STICKER_SETS } from '@/data/stickers';

const novelsData = novelsDataJson as any[];

type ReadingTheme = 'light' | 'sepia' | 'green' | 'dark';
type FontType = 'serif' | 'sans' | 'mono';

const THEME_CLASSES: Record<ReadingTheme, { bg: string; text: string; border: string; accentBg: string; buttonBg: string; buttonBorder: string; skeleton: string }> = {
  light: {
    bg: 'bg-white',
    text: 'text-slate-800',
    border: 'border-slate-200/80',
    accentBg: 'bg-slate-100/80 backdrop-blur-md',
    buttonBg: 'bg-white hover:bg-slate-50 text-slate-700',
    buttonBorder: 'border-slate-300',
    skeleton: 'bg-slate-200/80'
  },
  sepia: {
    bg: 'bg-[#FAF6EB]',
    text: 'text-[#3E2723]',
    border: 'border-[#EBE3CD]',
    accentBg: 'bg-[#EEE3C8]/90 backdrop-blur-md',
    buttonBg: 'bg-[#FBF7EC] hover:bg-white text-[#5D4037]',
    buttonBorder: 'border-[#D9C9A0]',
    skeleton: 'bg-[#E0D5BA]/70'
  },
  green: {
    bg: 'bg-[#EBF3E7]',
    text: 'text-[#1B361B]',
    border: 'border-[#D5DEC9]',
    accentBg: 'bg-[#D7E5CC]/90 backdrop-blur-md',
    buttonBg: 'bg-[#F3F8EF] hover:bg-white text-[#2E4F2E]',
    buttonBorder: 'border-[#B9CDA6]',
    skeleton: 'bg-[#C5D4B8]/60'
  },
  dark: {
    bg: 'bg-[#121316]',
    text: 'text-[#C5C8CE]',
    border: 'border-[#282B30]',
    accentBg: 'bg-[#1A1B1F]/90 backdrop-blur-md',
    buttonBg: 'bg-[#33373E] hover:bg-[#3E434B] text-[#C5C8CE]',
    buttonBorder: 'border-[#454A52]',
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
  isVip?: boolean;
  isStaff?: boolean;
}

interface Comment {
  id: number;
  user: string;
  time: string;
  text: string;
  likes: number;
  avatar: string;
  likedByUser?: boolean;
  isVip?: boolean;
  isStaff?: boolean;
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


type TocEntry = { id: number; chapter_number: number; title: string };

const ChapterPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { track: audioTrack, playTrack, closeTrack: closeAudioTrack } = useAudioPlayer();
  const { state: routeState } = useLocation();
  const [novel, setNovel] = useState<any | null>(null);
  const [novelLoading, setNovelLoading] = useState(true);
  const [storySlug, setStorySlug] = useState<string>((routeState as any)?.storySlug || '');
  const [currentChapterNumber, setCurrentChapterNumber] = useState(0);

  const [toc, setToc] = useState<TocEntry[]>([]);
  const [chapterData, setChapterData] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
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
  // In-memory cache of fully-resolved chapters (metadata + content), keyed by
  // chapter id. Populated by the background prefetch below so clicking
  // "next" on a novel — the overwhelmingly common navigation here — usually
  // finds everything already sitting in memory instead of waiting on two
  // sequential network round-trips (metadata, then signed content fetch).
  const chapterBundleCache = useRef<Map<string, { chap: any; audioUrlValue: string | null; data: any; ts: number }>>(new Map());
  const prefetchingRef = useRef<Set<string>>(new Set());
  const latestRequestRef = useRef<string | null>(null);
  const BUNDLE_TTL_MS = 10 * 60 * 1000;

  const mainEditorRef = useRef<HTMLDivElement>(null);
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [isMainStickerOpen, setIsMainStickerOpen] = useState(false);
  const [replyStickerOpenId, setReplyStickerOpenId] = useState<number | null>(null);
  const [activeStickerSetId, setActiveStickerSetId] = useState('trollface');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const [activeCommentMenuId, setActiveCommentMenuId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // --- VIP chapter lock ---
  const UNLOCK_COST = 100;
  const [freeUpTo, setFreeUpTo] = useState(50); // updated from API based on story's total chapters
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  const [unlockedChapters, setUnlockedChapters] = useState<number[]>([]);
  const [isVIPMember, setIsVIPMember] = useState(false);
  const [, setVipExpiresAt] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').coin_balance ?? 0; } catch { return 0; }
  });
  const [isUnlocking, setIsUnlocking] = useState(false);

  // --- Fixed floating control bar visibility (IntersectionObserver) ---
  const [isHeaderControlsVisible, setIsHeaderControlsVisible] = useState(false);
  const originalBarRef = useRef<HTMLDivElement>(null);

  // --- Floating controls auto-hide/fade ---
  const [isControlsHovered, setIsControlsHovered] = useState(false);
  const [isControlsActive, setIsControlsActive] = useState(true);

  useEffect(() => {
    if (isControlsHovered || isThemeDropdownOpen || isFontDropdownOpen) {
      setIsControlsActive(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsControlsActive(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isControlsHovered, isThemeDropdownOpen, isFontDropdownOpen]);

  // --- Chapter audio (uploaded .opus link, not TTS) ---
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load current user session
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  // Same free_up_to formula the backend uses, computed client-side so
  // anonymous readers see the correct lock icons too (see DetailPage.tsx
  // for the full explanation — this used to stay stuck at the useState
  // default until a login-gated API call updated it).
  useEffect(() => {
    if (novel?.is_vip && novel?.total_chapters) {
      setFreeUpTo(Math.max(1, Math.floor(novel.total_chapters * 0.10)));
    }
  }, [novel?.is_vip, novel?.total_chapters]);

  // Fetch unlocked chapters + VIP status when this is a VIP novel and user is logged in
  useEffect(() => {
    if (novel?.is_vip && currentUser && storySlug) {
      CoinService.getUnlockedChapters(storySlug)
        .then(data => {
          setUnlockedChapters(data.unlocked_chapters);
          setIsVIPMember(data.is_vip);
          setVipExpiresAt(data.vip_expires_at);
          setFreeUpTo(data.free_up_to);
        })
        .catch(() => {});
    }
  }, [novel?.is_vip, currentUser, storySlug]);

  // Sync coin balance from localStorage on mount
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setCoinBalance(u.coin_balance ?? 0);
    } catch {}
  }, [currentUser]);

  // Load/persist follow status for this novel
  useEffect(() => {
    if (storySlug && currentUser) {
      setIsFollowed(!!localStorage.getItem(`follow_novel_${storySlug}_user_${currentUser.name}`));
    } else {
      setIsFollowed(false);
    }
  }, [storySlug, currentUser]);

  const handleFollowToggle = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản để theo dõi truyện!');
      return;
    }
    const nextState = !isFollowed;
    setIsFollowed(nextState);
    if (nextState) {
      localStorage.setItem(`follow_novel_${storySlug}_user_${currentUser.name}`, '1');
      showToast('Đã thêm bộ truyện vào tủ sách theo dõi!');
    } else {
      localStorage.removeItem(`follow_novel_${storySlug}_user_${currentUser.name}`);
      showToast('Đã hủy theo dõi bộ truyện.');
    }
  };

  const isLocked = novel?.is_vip && currentChapterNumber > freeUpTo && !isVIPMember && !unlockedChapters.includes(currentChapterNumber);

  const curTocIdx = toc.findIndex(c => c.chapter_number === currentChapterNumber);
  const prevEntry = curTocIdx > 0 ? toc[curTocIdx - 1] : null;
  const nextEntry = curTocIdx >= 0 && curTocIdx < toc.length - 1 ? toc[curTocIdx + 1] : null;

  // Push this chapter's audio into the global player so it keeps playing across page navigation.
  // Deliberately does NOT depend on `audioTrack` — that value changes every time playTrack runs,
  // so including it here would re-trigger this same effect forever (infinite render loop).
  useEffect(() => {
    if (!audioUrl || !novel || !currentChapterId || isLocked) return;
    playTrack({
      chapterId: currentChapterId,
      storySlug,
      storyTitle: novel.title,
      chapterLabel: `Chương ${currentChapterNumber}`,
      cover: novel.cover,
      src: audioUrl,
      prevChapterId: prevEntry?.id ?? null,
      nextChapterId: nextEntry?.id ?? null,
    });
  }, [audioUrl, novel?.title, novel?.cover, currentChapterId, currentChapterNumber, storySlug, prevEntry?.id, nextEntry?.id, playTrack, isLocked]);

  // This chapter has no audio of its own — if we've navigated into a different novel,
  // stop whatever that other story was playing. Separate from the effect above so that
  // updates to the currently-playing track never cause this to re-fire on its own.
  useEffect(() => {
    if (audioUrl || !storySlug) return;
    if (audioTrack && audioTrack.storySlug !== storySlug) {
      closeAudioTrack();
    }
  }, [audioUrl, storySlug]);



  const handleUnlock = async () => {
    if (!currentChapterId || isUnlocking) return;
    setIsUnlocking(true);
    try {
      const result = await CoinService.unlockChapter(currentChapterId);
      setUnlockedChapters(prev => [...prev, currentChapterNumber]);
      setCoinBalance(result.coin_balance);
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        u.coin_balance = result.coin_balance;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('balance-updated'));
      } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Mở khóa chương thất bại. Vui lòng thử lại.';
      alert(msg);
    } finally {
      setIsUnlocking(false);
    }
  };

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
      novelId: storySlug,
      chapterIndex: currentChapterNumber,
      chapterTitle: chapterData?.title || `Chương ${currentChapterNumber}`,
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Font controls dropdown
      if (isFontDropdownOpen && !target.closest('.font-controls-container')) {
        setIsFontDropdownOpen(false);
      }

      // Theme controls dropdown
      if (isThemeDropdownOpen && !target.closest('.theme-controls-container')) {
        setIsThemeDropdownOpen(false);
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
  }, [isFontDropdownOpen, isThemeDropdownOpen, isDropdownOpen, isMainStickerOpen, replyStickerOpenId, activeCommentMenuId]);

  // Load comments from server for this chapter
  useEffect(() => {
    if (!currentChapterId) return;
    CommentService.getChapterComments(currentChapterId)
      .then(data => {
        const likedKey = `liked_chapter_comments_${currentChapterId}`;
        const liked: number[] = JSON.parse(localStorage.getItem(likedKey) || '[]');
        const mapped: Comment[] = data.map(c => ({
          id: c.id,
          user: c.user_name || 'Ẩn danh',
          time: new Date(c.created_at).toLocaleDateString('vi-VN'),
          text: c.content,
          likes: 0,
          avatar: c.user_avatar || '',
          likedByUser: liked.includes(c.id),
          isVip: !!c.user_is_vip,
          isStaff: !!c.user_is_staff,
          replies: [],
        }));
        const roots: Comment[] = [];
        const map: Record<number, Comment> = {};
        mapped.forEach(c => { map[c.id] = c; });
        data.forEach((c, i) => {
          if (c.parent && map[c.parent]) {
            map[c.parent].replies = [...(map[c.parent].replies || []), mapped[i]];
          } else {
            roots.push(mapped[i]);
          }
        });
        setComments(roots);
        setTimeout(() => {
          const hash = window.location.hash;
          if (hash?.startsWith('#comment-')) {
            const commentId = parseInt(hash.slice('#comment-'.length));
            if (!isNaN(commentId)) {
              setHighlightedCommentId(commentId);
              setTimeout(() => setHighlightedCommentId(null), 2500);
              document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }, 300);
      })
      .catch(() => setComments([]));
  }, [currentChapterId]);

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser || !currentChapterId || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const created = await CommentService.postChapterComment(currentChapterId, newCommentText.trim());
      const newComment: Comment = {
        id: created.id,
        user: created.user_name || currentUser.name,
        time: "Vừa xong",
        text: created.content,
        likes: 0,
        avatar: created.user_avatar || currentUser.avatar,
        likedByUser: false,
        isVip: !!created.user_is_vip,
        isStaff: !!created.user_is_staff,
        replies: [],
      };
      setComments(prev => [newComment, ...prev]);
      setNewCommentText('');
      if (mainEditorRef.current) mainEditorRef.current.innerHTML = '';
    } catch {
      showToast("Đăng bình luận thất bại. Vui lòng đăng nhập và thử lại!");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAddReply = async (commentId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentChapterId) return;
    if (!currentUser) {
      showToast("Vui lòng đăng nhập để phản hồi cảm nhận!");
      return;
    }
    try {
      const created = await CommentService.postChapterComment(currentChapterId, replyText.trim(), commentId);
      const newReply: Reply = {
        id: created.id,
        user: created.user_name || currentUser.name,
        time: "Vừa xong",
        text: created.content,
        avatar: created.user_avatar || currentUser.avatar,
        isVip: !!created.user_is_vip,
        isStaff: !!created.user_is_staff,
      };
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
      ));
      setReplyText('');
      setReplyingToId(null);
      if (replyEditorRef.current) replyEditorRef.current.innerHTML = '';
    } catch {
      showToast("Phản hồi thất bại. Vui lòng đăng nhập và thử lại!");
    }
  };

  const handleLikeComment = (commentId: number) => {
    if (!currentUser) {
      showToast("Vui lòng đăng nhập tài khoản để thích bình luận!");
      return;
    }
    const likedKey = `liked_chapter_comments_${currentChapterId}`;
    const liked: number[] = JSON.parse(localStorage.getItem(likedKey) || '[]');
    const isLiked = liked.includes(commentId);
    const updatedLiked = isLiked ? liked.filter(x => x !== commentId) : [...liked, commentId];
    localStorage.setItem(likedKey, JSON.stringify(updatedLiked));
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likedByUser: !isLiked, likes: isLiked ? Math.max(0, c.likes - 1) : c.likes + 1 }
        : c
    ));
  };

  const handleDeleteComment = (commentId: number, parentId?: number) => {
    showCustomConfirm(
      "Xóa bình luận",
      "Bạn có chắc chắn muốn xóa bình luận này?",
      async () => {
        try {
          await CommentService.deleteChapterComment(commentId);
          if (parentId) {
            setComments(prev => prev.map(c =>
              c.id === parentId ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) } : c
            ));
          } else {
            setComments(prev => prev.filter(c => c.id !== commentId));
          }
        } catch {
          showToast("Xóa bình luận thất bại. Bạn chỉ có thể xóa bình luận của chính mình.");
        }
      }
    );
    setActiveCommentMenuId(null);
  };

  const handleStartEdit = (commentId: number, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
    setActiveCommentMenuId(null);
  };

  const handleSaveEdit = async (commentId: number, parentId?: number) => {
    if (!editingCommentText.trim()) {
      showToast("Nội dung bình luận không được để trống!");
      return;
    }
    try {
      const updated = await CommentService.editChapterComment(commentId, editingCommentText);
      if (parentId) {
        setComments(prev => prev.map(c =>
          c.id === parentId ? { ...c, replies: (c.replies || []).map(r => r.id === commentId ? { ...r, text: updated.content } : r) } : c
        ));
      } else {
        setComments(prev => prev.map(c =>
          c.id === commentId ? { ...c, text: updated.content } : c
        ));
      }
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch {
      showToast("Sửa bình luận thất bại. Bạn chỉ có thể sửa bình luận của chính mình.");
    }
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
      const curIdx = toc.findIndex(c => c.chapter_number === currentChapterNumber);
      if (e.key === 'ArrowRight') {
        const next = curIdx >= 0 && curIdx < toc.length - 1 ? toc[curIdx + 1] : null;
        if (next) navigate(`/chapter/${next.id}`, { state: { storySlug } });
      } else if (e.key === 'ArrowLeft') {
        const prev = curIdx > 0 ? toc[curIdx - 1] : null;
        if (prev) navigate(`/chapter/${prev.id}`, { state: { storySlug } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterNumber, storySlug, toc, navigate]);

  // Load novel metadata and TOC (runs when storySlug becomes known from chapter response or route state)
  useEffect(() => {
    if (!storySlug) return;
    setNovelLoading(true);
    NovelService.getNovelDetail(storySlug)
      .then(data => {
        setNovel({
          id: data.id,
          slug: data.slug,
          title: data.title,
          cover: data.cover_url,
          folder: data.slug,
          is_vip: data.is_vip,
          total_chapters: data.total_chapters,
        });
        if (data.toc && data.toc.length > 0) {
          setToc(data.toc);
        }
      })
      .catch(err => {
        console.error("Failed to load novel detail from API", err);
        const staticNovel = novelsData.find((n: any) => n.id === storySlug);
        if (staticNovel) {
          setNovel(staticNovel);
          fetch(`/data/${encodeURIComponent(staticNovel.folder)}/toc.json`)
            .then(res => res.json())
            .then((tocData: string[]) => setToc(tocData.map((title, idx) => ({ id: idx + 1, chapter_number: idx + 1, title }))))
            .catch(() => {});
        }
      })
      .finally(() => setNovelLoading(false));
  }, [storySlug]);

  // Resolves one chapter's metadata + content. Shared by the main loader
  // below and the background prefetch, so a chapter warmed by prefetch and
  // one loaded on demand go through identical caching logic.
  const loadChapterBundle = async (id: string) => {
    const chap = await ChapterService.getChapterDetail(id);

    let audioUrlValue: string | null = null;
    if (chap.has_audio && chap.audio_url) {
      audioUrlValue = chap.audio_url;
    } else if (chap.has_audio) {
      // Paid chapter — audio_url comes back null from the API on purpose
      // (see is_paid_chapter in the backend). Stream it through the
      // authenticated proxy instead; <audio> can't send an Authorization
      // header, so the token travels as a query param here.
      const token = localStorage.getItem('auth_token');
      audioUrlValue = token ? `${API_BASE_URL}chapters/${chap.id}/audio/?token=${encodeURIComponent(token)}` : null;
    }

    let data;
    if (chap.content_url) {
      // Keyed by chapter id, not the URL — content_url carries a signature
      // that's different on every fetch, so keying by the URL itself never
      // hit this cache even for a chapter read minutes ago.
      const cacheKey = `cc:${chap.id}`;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Date.now() < cached.exp) data = cached.data;
        }
      } catch {}

      if (data === undefined) {
        // Fetch directly from Cloudflare CDN edge (bypasses Django proxy → saves ~700ms)
        const res = await fetch(chap.content_url);
        if (!res.ok) throw new Error(`Content fetch failed: ${res.status}`);
        data = await res.json();

        // Cache for 30 minutes in localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 30 * 60 * 1000 }));
        } catch {}
      }
    } else {
      // Fallback to backend proxy only if no direct URL
      data = await ChapterService.getChapterContent(chap.id);
    }

    return { chap, audioUrlValue, data };
  };

  const runLoad = (id: string) => {
    setLoading(true);
    setLoadError(false);
    setAudioUrl(null);
    // Nav buttons stay clickable even mid-load (no `disabled={loading}`) so
    // a slow chapter never traps the reader — this guard is what keeps that
    // safe: if the reader clicks again before this request finishes, its
    // result is stale by the time it resolves and must not overwrite
    // whatever the latest click already kicked off.
    latestRequestRef.current = id;

    const warm = chapterBundleCache.current.get(id);
    const bundlePromise = (warm && Date.now() - warm.ts < BUNDLE_TTL_MS)
      ? Promise.resolve(warm)
      : loadChapterBundle(id);
    chapterBundleCache.current.delete(id);

    bundlePromise
      .then(({ chap, audioUrlValue, data }) => {
        if (latestRequestRef.current !== id) return; // superseded by a newer navigation

        // Apply chapter number, title, audio and content together so the
        // header/dropdown never shows the new chapter number while the
        // reading pane still shows the previous one's content.
        setCurrentChapterId(chap.id);
        setCurrentChapterNumber(chap.chapter_number);
        document.title = `${chap.title || `Chương ${chap.chapter_number}`} - ${chap.story_title} | Pub Nih Truyện`;
        if (chap.story_slug) setStorySlug(chap.story_slug);
        setAudioUrl(audioUrlValue);
        setChapterData(data);
        setLoading(false);
        window.scrollTo(0, 0);
        if (incrementedRef.current !== id) {
          incrementedRef.current = id;
          ChapterService.incrementViews(id).catch(() => {});
        }

        // Warm the next chapter in the background — by far the most common
        // click from here is "next", so this is what actually makes that
        // click feel instant instead of repeating both round-trips.
        const curIdx = toc.findIndex(t => t.chapter_number === chap.chapter_number);
        const nextId = curIdx >= 0 && curIdx < toc.length - 1 ? String(toc[curIdx + 1].id) : null;
        if (nextId && !chapterBundleCache.current.has(nextId) && !prefetchingRef.current.has(nextId)) {
          prefetchingRef.current.add(nextId);
          loadChapterBundle(nextId)
            .then(bundle => chapterBundleCache.current.set(nextId, { ...bundle, ts: Date.now() }))
            .catch(() => {})
            .finally(() => prefetchingRef.current.delete(nextId));
        }
      })
      .catch(err => {
        if (latestRequestRef.current !== id) return; // a newer navigation already took over
        // A failed fetch here is almost always either a network hiccup or the
        // reader (or the prefetcher, on their behalf) briefly tripping
        // Cloudflare's rate limit — that block response can't carry CORS
        // headers, so the browser hides the real 429 and this looks like a
        // generic failure. Surface something actionable either way instead
        // of silently leaving the reading pane blank.
        console.warn("Failed to load chapter from API", err);
        setLoading(false);
        setLoadError(true);
      });
  };

  // Load chapter content
  useEffect(() => {
    if (!chapterId) return;
    runLoad(chapterId);
  }, [chapterId]);

  const parsedTitle = useMemo(() => {
    const fullTitle = chapterData?.title || (currentChapterNumber ? `Chương ${currentChapterNumber}` : '');
    const colonIndex = fullTitle.indexOf(':');
    if (colonIndex > 0) {
      const num = fullTitle.substring(0, colonIndex).trim();
      const name = fullTitle.substring(colonIndex + 1).trim();
      return { num, name };
    }
    return { num: '', name: fullTitle };
  }, [chapterData, currentChapterNumber]);

  // Save viewed chapter to reading history list
  useEffect(() => {
    if (!storySlug || !currentChapterNumber || !chapterData?.title) return;
    try {
      const novelIdentifier = novel?.id ?? storySlug;
      const historyStr = localStorage.getItem('reading_history_list') || '[]';
      const history = JSON.parse(historyStr) as any[];
      const filtered = history.filter((item: any) => item.novelId !== novelIdentifier);

      let novelTitle = novel?.title;
      if (!novelTitle) {
        const staticNovel = novelsData.find((n: any) => n.id === storySlug);
        novelTitle = staticNovel?.title || storySlug;
      }

      const newItem = {
        novelId: novelIdentifier,
        novelTitle,
        chapterNumber: currentChapterNumber,
        chapterTitle: chapterData.title,
        timestamp: new Date().toISOString()
      };

      const updated = [newItem, ...filtered].slice(0, 30);
      localStorage.setItem('reading_history_list', JSON.stringify(updated));
      localStorage.setItem(`reading_progress_${storySlug}`, currentChapterNumber.toString());
    } catch (e) {
      console.error("Failed to save reading history list:", e);
    }
  }, [storySlug, currentChapterNumber, chapterData?.title, novel?.title, novel?.id]);

  if (!novel && !loading && !novelLoading) {
    return (
      <div className="pt-20 pb-12 px-6 text-center text-on-surface">
        <h1 className="font-display-lg text-xl md:text-2xl mb-4">Truyện không tồn tại</h1>
        <Link to="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  const currentTheme = THEME_CLASSES[theme];

  // Compact control bar: Home + TOC menu (left), Prev/chapter-select/Next (center), Follow (right)
  const renderControlBar = (bare: boolean = false) => (
    <div className={bare
      ? `${currentTheme.accentBg} rounded-md flex items-center justify-between gap-1.5 sm:gap-3 w-full`
      : `border ${currentTheme.border} ${currentTheme.accentBg} rounded-md p-2.5 sm:p-3 flex items-center justify-between gap-1.5 sm:gap-3 shadow-md w-full`
    }>

      {/* Left: Home + Menu (TOC) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <Link
          to="/"
          className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm border ${currentTheme.buttonBg} ${currentTheme.buttonBorder} shadow-sm transition-all active:scale-95 shrink-0`}
          title="Trang chủ"
        >
          <ViconicIcon name="home" size={16} className="shrink-0" />
        </Link>
        <Link
          to={`/detail/${novel?.id ?? storySlug}`}
          className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-sm border ${currentTheme.buttonBg} ${currentTheme.buttonBorder} shadow-sm transition-all active:scale-95 shrink-0`}
          title="Danh sách chương"
        >
          <ViconicIcon name="menu" size={16} className="shrink-0" />
        </Link>
      </div>

      {/* Center: Prev / Chapter select / Next */}
      <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-center min-w-0">
        <button
          onClick={() => prevEntry && navigate(`/chapter/${prevEntry.id}`, { state: { storySlug } })}
          disabled={!prevEntry}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="Chương trước"
        >
          <ViconicIcon name="arrow_back" size={15} className="shrink-0" />
        </button>

        <div className="relative toc-dropdown-container min-w-0 max-w-[76px] sm:max-w-[200px] flex-1">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-sm border font-bold text-[11px] sm:text-xs ${currentTheme.buttonBg} ${currentTheme.buttonBorder} shadow-sm w-full truncate`}
          >
            {loading ? (
              <span className={`h-3 w-10 ${currentTheme.skeleton} rounded animate-pulse inline-block`} />
            ) : (
              <span className="truncate select-none">
                <span className="sm:hidden">C.{currentChapterNumber}</span>
                <span className="hidden sm:inline">Chương {currentChapterNumber}</span>
              </span>
            )}
            <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
          </button>

          {isDropdownOpen && (
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-[50vh] overflow-y-auto ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex flex-col overscroll-contain`}>
              {toc.map((entry, idx) => (
                <button
                  key={idx}
                  onClick={() => { setIsDropdownOpen(false); navigate(`/chapter/${entry.id}`, { state: { storySlug } }); }}
                  className={`text-left px-4 py-2.5 hover:bg-primary/5 transition-colors border-b last:border-b-0 text-xs ${theme === 'dark' ? 'border-[#282B30]' : 'border-slate-100'} ${entry.chapter_number === currentChapterNumber ? 'font-bold text-primary bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
                >
                  {entry.title}
                </button>
              ))}
              {toc.length === 0 && (
                <div className="px-4 py-3 text-xs text-center opacity-70">Không có dữ liệu</div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => nextEntry && navigate(`/chapter/${nextEntry.id}`, { state: { storySlug } })}
          disabled={!nextEntry}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          title="Chương sau"
        >
          <ViconicIcon name="arrow_forward" size={15} className="shrink-0" />
        </button>
      </div>

      {/* Right: Follow */}
      <button
        onClick={handleFollowToggle}
        className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold text-xs transition-all active:scale-95 shrink-0 border ${
          isFollowed
            ? 'bg-primary text-on-primary border-primary hover:bg-primary/90 shadow-sm'
            : `${currentTheme.buttonBg} ${currentTheme.buttonBorder}`
        }`}
        title={isFollowed ? 'Đã theo dõi truyện này' : 'Theo dõi truyện này'}
      >
        <ViconicIcon name="favorite" size={14} className="shrink-0" />
        <span className="hidden sm:inline">{isFollowed ? 'Đã theo dõi' : 'Theo dõi'}</span>
      </button>
    </div>
  );

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

          return (
            <p
              id={`p-${index}`}
              key={index}
              className="tracking-wide"
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

      {/* Floating reading tools — fixed beside the content column, identical position/behavior at every viewport width */}
      <div
        className={`fixed z-40 flex flex-col gap-2.5 transition-opacity ease-in-out ${isControlsActive ? 'opacity-100 duration-200' : 'opacity-50 duration-1000'}`}
        style={{ right: 'max(0.625rem, calc((100vw - 860px) / 2 - 80px))', top: '38%' }}
        onMouseEnter={() => setIsControlsHovered(true)}
        onMouseLeave={() => setIsControlsHovered(false)}
      >
        <div className="relative theme-controls-container">
          <button
            onClick={() => { setIsThemeDropdownOpen(!isThemeDropdownOpen); setIsFontDropdownOpen(false); }}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all shadow-md active:scale-95 ${currentTheme.buttonBg} ${currentTheme.buttonBorder}`}
            title="Đổi giao diện đọc"
          >
            <ViconicIcon name="palette" size={17} className="shrink-0" />
            <span className="text-[8px] sm:text-[8.5px] font-bold leading-none text-center px-0.5">Giao diện</span>
          </button>

          {isThemeDropdownOpen && (
            <div className={`absolute right-full mr-2.5 top-0 p-3 w-max ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex items-center gap-2.5`}>
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
                    className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 active:scale-95 ${colors[t]} ${theme === t ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-[#121316]' : 'opacity-80'}`}
                    title={`Chủ đề ${t}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="relative font-controls-container">
          <button
            onClick={() => { setIsFontDropdownOpen(!isFontDropdownOpen); setIsThemeDropdownOpen(false); }}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all shadow-md active:scale-95 ${currentTheme.buttonBg} ${currentTheme.buttonBorder}`}
            title="Cài đặt phông chữ và kích thước"
          >
            <ViconicIcon name="format_size" size={17} className="shrink-0" />
            <span className="text-[8px] sm:text-[8.5px] font-bold leading-none text-center px-0.5">Cỡ chữ</span>
          </button>

          {isFontDropdownOpen && (
            <div className={`absolute right-full mr-2.5 top-0 w-64 max-w-[calc(100vw-2rem)] p-4 ${theme === 'dark' ? 'bg-[#1C1D21] text-[#C5C8CE] border-[#282B30]' : 'bg-white text-slate-800 border-slate-200'} border shadow-xl rounded-md z-50 flex flex-col gap-4 overscroll-contain`}>
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
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pt-6">
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
              {loading ? (
                <span className={`h-3.5 ${currentTheme.skeleton} rounded w-16 animate-pulse inline-block`} />
              ) : (
                <span className="font-bold truncate">Chương {currentChapterNumber}</span>
              )}
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
                  to={`/detail/${novel?.id ?? storySlug}`}
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
          {renderControlBar()}
        </div>

        {/* Fixed Control Bar — appears when original bar scrolls out of viewport */}
        <div className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${currentTheme.border} ${currentTheme.accentBg} shadow-lg ${
          isHeaderControlsVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}>
          <div className="px-3 py-2.5 sm:px-6 sm:py-3 max-w-[860px] mx-auto">
            {renderControlBar(true)}
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
          ) : isLocked ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center gap-5 py-16 border border-dashed rounded-md">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <ViconicIcon name="lock" size={38} className="text-primary" />
              </div>
              <div className="text-center">
                <span className="inline-block mb-2 text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-full">VIP</span>
                <h3 className="font-bold text-lg mb-1">Chương khóa</h3>
                <p className="text-sm opacity-60">Chương {currentChapterNumber} chỉ dành cho độc giả VIP.</p>
              </div>
              {currentUser ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ViconicIcon name="toll" size={16} className="text-primary shrink-0" />
                    <span>Số dư: <strong className="text-primary">{coinBalance.toLocaleString('vi-VN')} xu</strong></span>
                  </div>

                  {/* Option 1: Buy chapter permanently */}
                  {coinBalance >= UNLOCK_COST ? (
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="w-full bg-primary text-on-primary px-6 py-3 rounded-sm font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-60 hover:bg-primary/95 transition-colors"
                    >
                      {isUnlocking ? (
                        <><span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Đang mở khóa...</>
                      ) : (
                        <><ViconicIcon name="lock_open" size={16} />Mở khóa vĩnh viễn · {UNLOCK_COST} xu</>
                      )}
                    </button>
                  ) : (
                    <Link
                      to="/coins"
                      className="w-full bg-primary text-on-primary px-6 py-3 rounded-sm font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/95 transition-colors"
                    >
                      <ViconicIcon name="add_circle" size={16} />Nạp xu · cần thêm {(UNLOCK_COST - coinBalance).toLocaleString()} xu
                    </Link>
                  )}
                  <p className="text-[10px] text-on-surface-variant text-center">Mua chương = sở hữu vĩnh viễn, không bao giờ mất quyền đọc.</p>

                  {/* Option 2: Subscribe VIP */}
                  <div className="w-full border-t border-dashed border-outline-variant/40 pt-4 flex flex-col items-center gap-2">
                    <p className="text-xs font-semibold opacity-70">Hoặc đăng ký hội viên để đọc <strong>tất cả</strong> truyện VIP</p>
                    <Link
                      to="/coins"
                      className="w-full border-2 border-primary text-primary px-6 py-2.5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
                    >
                      <ViconicIcon name="workspace_premium" size={16} />Hội viên · 49.000 xu/tháng
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-login-dialog'))}
                  className="bg-primary text-on-primary px-8 py-3 rounded-sm font-bold text-sm flex items-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/95 transition-colors"
                >
                  <ViconicIcon name="login" size={16} />Đăng nhập để mở khóa
                </button>
              )}
            </div>
          ) : chapterData ? (
            renderChapterContent()
          ) : loadError ? (
            <div className="text-center py-16 border border-dashed rounded-md flex flex-col items-center gap-3">
              <p className="opacity-70 text-sm">
                Kết nối đang chậm hoặc bạn thao tác quá nhanh. Vui lòng thử lại sau vài giây.
              </p>
              <button
                onClick={() => chapterId && runLoad(chapterId)}
                className="px-5 py-2 rounded-sm font-bold text-sm bg-primary text-on-primary shadow-sm hover:bg-primary/95 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="text-center opacity-70 py-16 border border-dashed rounded-md">
              Nội dung chương này chưa được cập nhật.
            </div>
          )}

          {/* Chapter Ending Separator */}
          {!loading && chapterData && !isLocked && (
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
            onClick={() => prevEntry && navigate(`/chapter/${prevEntry.id}`, { state: { storySlug } })}
            disabled={!prevEntry}
            className={`flex items-center px-3 py-2.5 sm:px-5 sm:py-2.5 border rounded-sm font-bold text-xs transition-all ${currentTheme.buttonBg} ${currentTheme.border} disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            <ViconicIcon name="arrow_back" size={14} className="sm:mr-1.5 shrink-0" />
            <span className="hidden sm:inline">Chương trước</span>
          </button>

          <div className="flex items-center gap-2">
            <Link
              to={`/detail/${novel?.id ?? storySlug}`}
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
            onClick={() => nextEntry && navigate(`/chapter/${nextEntry.id}`, { state: { storySlug } })}
            disabled={!nextEntry}
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
              <span>Bình luận ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})</span>
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
                    name: "Độc Giả Pub Nih",
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
              {currentUser && isUserVIP(currentUser.name) ? (
                <div className="w-10 h-10 rounded-sm shrink-0 vip-avatar-rainbow">
                  <img alt="Your avatar" className="w-full h-full rounded-sm object-cover bg-white" src={currentUser.avatar} />
                </div>
              ) : (
                <img
                  alt="Your avatar"
                  className={`w-10 h-10 rounded-sm shrink-0 object-cover border ${currentTheme.border}`}
                  src={currentUser.avatar}
                />
              )}
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
                  <button type="submit" disabled={commentSubmitting} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-sm hover:bg-primary/95 transition-colors text-xs shadow-md shadow-primary/10 disabled:opacity-60">{commentSubmitting ? 'Đang đăng...' : 'Đăng cảm nhận'}</button>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`flex gap-3 p-4 rounded-sm border transition-all duration-300 ${highlightedCommentId === comment.id ? 'border-primary shadow-md shadow-primary/20 ring-1 ring-primary/40' : currentTheme.border} ${currentTheme.accentBg} hover:bg-opacity-100`}
              >
                <div className="relative shrink-0">
                  {comment.isVip ? (
                    <div className="w-10 h-10 rounded-sm vip-avatar-rainbow">
                      <img alt={comment.user} className="w-full h-full rounded-sm object-cover bg-white" src={comment.avatar} />
                    </div>
                  ) : (
                    <img
                      alt={comment.user}
                      className={`w-10 h-10 rounded-sm object-cover border ${currentTheme.border}`}
                      src={comment.avatar}
                    />
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`font-label-bold text-xs truncate ${comment.isVip ? 'text-primary font-black' : ''}`}>
                        {comment.user}
                      </span>
                      {comment.isVip && (
                        <span className="vip-badge-rainbow select-none shrink-0">
                          <span className="vip-badge-rainbow-inner">
                            <span className="vip-text-rainbow text-[7px] font-black uppercase">VIP</span>
                          </span>
                        </span>
                      )}
                      {comment.isStaff && (
                        <span className="admin-badge select-none shrink-0">ADMIN</span>
                      )}
                      <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest shrink-0">{comment.time}</span>
                    </div>

                    {/* Actions Dropdown — own comment: edit + delete; admin: delete only */}
                    {(comment.user === currentUser?.name || currentUser?.is_staff) && (
                      <div className="relative comment-menu-container">
                        <button
                          onClick={() => setActiveCommentMenuId(activeCommentMenuId === comment.id ? null : comment.id)}
                          className="opacity-60 hover:opacity-100 hover:text-primary transition-colors flex items-center justify-center shrink-0 p-1 rounded-sm"
                        >
                          <ViconicIcon name="more_horiz" size={14} className="shrink-0" />
                        </button>
                        {activeCommentMenuId === comment.id && (
                          <div className={`absolute right-0 top-full mt-1.5 w-24 border ${currentTheme.border} shadow-xl ${currentTheme.accentBg} rounded-sm overflow-hidden flex flex-col z-30 animate-in fade-in slide-in-from-top-1 duration-150`}>
                            {comment.user === currentUser?.name && (
                              <button
                                onClick={() => handleStartEdit(comment.id, comment.text)}
                                className="px-3 py-2 text-left text-[11px] font-bold hover:bg-primary/5 transition-colors border-b last:border-b-0 border-current/10"
                              >
                                Sửa
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
                          {reply.isVip ? (
                            <div className="w-8 h-8 rounded-sm vip-avatar-rainbow shrink-0">
                              <img alt={reply.user} className="w-full h-full rounded-sm object-cover bg-white" src={reply.avatar} />
                            </div>
                          ) : (
                            <img alt={reply.user} className={`w-8 h-8 rounded-sm object-cover border ${currentTheme.border} shrink-0`} src={reply.avatar} />
                          )}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className={`font-label-bold text-[11px] truncate ${reply.isVip ? 'text-primary font-black' : ''}`}>{reply.user}</span>
                                 {reply.isVip && (
                                  <span className="vip-badge-rainbow select-none shrink-0">
                                    <span className="vip-badge-rainbow-inner">
                                      <span className="vip-text-rainbow text-[7px] font-black uppercase">VIP</span>
                                    </span>
                                  </span>
                                )}
                                {reply.isStaff && (
                                  <span className="admin-badge select-none shrink-0">ADMIN</span>
                                )}
                                <span className="text-[8px] opacity-60 font-bold uppercase tracking-widest shrink-0">{reply.time}</span>
                              </div>

                              {(reply.user === currentUser?.name || currentUser?.is_staff) && (
                                <div className="relative comment-menu-container">
                                  <button
                                    onClick={() => setActiveCommentMenuId(activeCommentMenuId === reply.id ? null : reply.id)}
                                    className="opacity-60 hover:opacity-100 hover:text-primary transition-colors flex items-center justify-center shrink-0 p-1 rounded-sm"
                                  >
                                    <ViconicIcon name="more_horiz" size={13} className="shrink-0" />
                                  </button>
                                  {activeCommentMenuId === reply.id && (
                                    <div className={`absolute right-0 top-full mt-1.5 w-24 border ${currentTheme.border} shadow-xl ${currentTheme.accentBg} rounded-sm overflow-hidden flex flex-col z-30 animate-in fade-in slide-in-from-top-1 duration-150`}>
                                      {reply.user === currentUser?.name && (
                                        <button
                                          onClick={() => handleStartEdit(reply.id, reply.text)}
                                          className="px-3 py-2 text-left text-[11px] font-bold hover:bg-primary/5 transition-colors border-b last:border-b-0 border-current/10"
                                        >
                                          Sửa
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteComment(reply.id, comment.id)}
                                        className="px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {editingCommentId === reply.id ? (
                              <div className="flex flex-col gap-2 mt-1.5">
                                <div
                                  contentEditable={true}
                                  ref={(el) => {
                                    if (el && !el.dataset.initialized) {
                                      el.innerHTML = editingCommentText;
                                      el.dataset.initialized = 'true';
                                    }
                                  }}
                                  onInput={(e) => setEditingCommentText(e.currentTarget.innerHTML)}
                                  className={`w-full ${currentTheme.bg} border ${currentTheme.border} focus:border-primary focus:ring-0 rounded-sm p-2 font-body-ui text-[11px] min-h-[50px] outline-none shadow-inner`}
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
                                    onClick={() => handleSaveEdit(reply.id, comment.id)}
                                    className="px-3 py-1.5 bg-primary text-on-primary rounded-sm text-[10px] font-bold hover:bg-primary/95 transition-all shadow-sm active:scale-95"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="font-body-ui text-[11.5px] mt-1 leading-relaxed text-justify break-words"
                                dangerouslySetInnerHTML={{ __html: renderCommentContentHtml(reply.text) }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingToId === comment.id && (
                    <form onSubmit={(e) => handleAddReply(comment.id, e)} className={`mt-3 p-2 sm:p-3 rounded-sm border border-dashed ${currentTheme.border} bg-current/5 flex gap-2 sm:gap-3 animate-in slide-in-from-top-2 duration-200`}>
                      {currentUser && isUserVIP(currentUser.name) ? (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-sm shrink-0 vip-avatar-rainbow">
                          <img alt="Your avatar" className="w-full h-full rounded-sm object-cover bg-white" src={currentUser.avatar} />
                        </div>
                      ) : (
                        <img alt="Your avatar" className={`w-6 h-6 sm:w-8 sm:h-8 rounded-sm shrink-0 object-cover border ${currentTheme.border}`} src={currentUser ? currentUser.avatar : "https://lh3.googleusercontent.com/aida-public/AB6AXuD1epYzUm9PYg5Z4v3zZXDsv3Ph06NlgpommDOBvTTqpLS3sgVhIeXPPp9WnpwOkdoqtjcPa7sGjgQfoBHy1XdCxXIKD7tqus0SdH1HPjLIKxGI69O0lGijT1mmXVujCcTxU8e4qviArMpb35YAx9YX9MqEvEk89DXG1XvQL29j24ny5Zf8gpuufV0HirEieDmpzG4wzbSixeeYFb8Jzm5F7Pj_zz0pQAd7bOyes99b2icDY6xwJomVgVwm7mLtPK9U6SCF3BpQUm0w"} />
                      )}
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

    </div>
  );
};

export default ChapterPage;
