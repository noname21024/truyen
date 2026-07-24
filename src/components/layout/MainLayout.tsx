import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService } from '@/lib/api';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/reader/GlobalAudioPlayer';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isChapterPage = location.pathname.startsWith('/chapter/');
  const { track } = useAudioPlayer();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsAdminUser(!!user?.is_staff);
          return;
        }
      } catch {}
      setIsAdminUser(false);
    };

    checkAdmin();
    const interval = setInterval(checkAdmin, 1000);
    return () => clearInterval(interval);
  }, []);

  // DevTools and Copy protection for non-admin users
  useEffect(() => {
    if (isAdminUser) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd) {
        const key = e.key.toLowerCase();
        if (
          (e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
          key === 'u' ||
          key === 's' ||
          key === 'p' ||
          key === 'a' ||
          key === 'c'
        ) {
          e.preventDefault();
          return false;
        }
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', 'Bản quyền thuộc về Pub Nih Truyện. Vui lòng không sao chép dưới mọi hình thức.');
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const blockDevTools = () => {
      debugger;
    };
    const devToolsInterval = setInterval(blockDevTools, 200);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      clearInterval(devToolsInterval);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [isAdminUser]);

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    icon?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Global custom toast listener
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToastMessage(customEvent.detail.message);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    };
    window.addEventListener('show-custom-toast', handleShowToast);
    return () => {
      window.removeEventListener('show-custom-toast', handleShowToast);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleShowDialog = (e: Event) => {
      const customEvent = e as CustomEvent;
      setDialog({
        isOpen: true,
        ...customEvent.detail
      });
    };
    window.addEventListener('show-custom-dialog', handleShowDialog);
    return () => window.removeEventListener('show-custom-dialog', handleShowDialog);
  }, []);

  const handleConfirmDialog = () => {
    if (dialog?.onConfirm) dialog.onConfirm();
    setDialog(null);
  };

  const handleCancelDialog = () => {
    if (dialog?.onCancel) dialog.onCancel();
    setDialog(null);
  };

  // Reset hovered novel when switching pages/routes
  useEffect(() => {
    setHoveredNovel(null);
  }, [location.pathname]);

  // States for cursor-following novel preview (no CSS transforms)
  const [allNovels, setAllNovels] = useState<any[]>([]);
  const [hoveredNovel, setHoveredNovel] = useState<any | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    NovelService.getNovels()
      .then(data => {
        if (cancelled) return;
        if (data) setAllNovels(data);
      })
      .catch(err => {
        if (!cancelled) console.warn("Failed to load novels for hover preview:", err);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-novel-slug]');
      if (card) {
        const slug = card.getAttribute('data-novel-slug');
        if (slug) {
          const found = allNovels.find(n => n.slug === slug || String(n.id) === slug);
          if (found) {
            setHoveredNovel(found);
          }
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('[data-novel-slug]');
      if (card) {
        const related = e.relatedTarget as HTMLElement;
        if (!related || !card.contains(related)) {
          setHoveredNovel(null);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [allNovels]);

  // Calculate tooltip positioning based on mouse quadrant to avoid blocking user's view (no transforms)
  const cardWidth = 300;
  const cardHeight = 280;
  let left = coords.x + 20;
  let top = coords.y + 20;

  if (typeof window !== 'undefined') {
    // Show to the left if mouse is in the right half of the screen
    if (coords.x > window.innerWidth / 2) {
      left = coords.x - cardWidth - 20;
    } else {
      left = coords.x + 20;
    }

    // Show above if mouse is in the bottom half of the screen
    if (coords.y > window.innerHeight / 2) {
      top = coords.y - cardHeight - 20;
    } else {
      top = coords.y + 20;
    }

    // Safe boundaries check
    if (left < 10) left = 10;
    if (left + cardWidth > window.innerWidth - 10) {
      left = window.innerWidth - cardWidth - 10;
    }
    if (top < 10) top = 10;
    if (top + cardHeight > window.innerHeight - 10) {
      top = window.innerHeight - cardHeight - 10;
    }
  }

  return (
    <div className={`bg-surface text-on-surface font-body-ui text-body-ui min-h-screen flex flex-col relative overflow-x-hidden ${!isAdminUser ? 'select-none [&_*]:select-none' : ''}`}>
      {/* Ambient Sakura Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_50%_50%,rgba(255,209,220,0.1)_0%,transparent_80%)]"></div>
      
      <Header />

      {/* The audio mini-player is fixed at the bottom, so pages need bottom room
          to keep their last content from hiding behind it — except ChapterPage,
          which already reserves its own pb-20, so adding pb-16 here just left a
          dead gap under the chapter. */}
      <main className={`flex-grow ${track && !isChapterPage ? 'pb-16' : ''}`}>
        {children}
      </main>

      <Footer />

      {/* Global persistent audio mini-player — survives route changes across the whole app */}
      <GlobalAudioPlayer />

      {/* Global Back to Top button (only on non-chapter pages since ChapterPage has its own themed button) */}
      {!isChapterPage && showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-primary hover:bg-primary/95 text-on-primary shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-primary/20 flex items-center justify-center"
          title="Cuộn lên đầu trang"
        >
          <ViconicIcon name="arrow_upward" size={18} className="shrink-0" />
        </button>
      )}

      {/* Cursor-Following Hover Preview (No Transform) */}
      {hoveredNovel && (
        <div 
          className="hidden md:block fixed z-[100] w-[300px] max-h-[300px] bg-white/95 dark:bg-[#121316]/95 backdrop-blur-md border border-slate-200/10 dark:border-slate-800/15 rounded-2xl p-4 shadow-2xl pointer-events-none transition-opacity duration-200 flex flex-col justify-between overflow-hidden"
          style={{
            left: `${left}px`,
            top: `${top}px`,
          }}
        >
          <div className="flex gap-3">
            <img 
              src={hoveredNovel.cover_url} 
              alt={hoveredNovel.title} 
              className="w-14 h-20 object-cover rounded-xl border border-slate-200/50 dark:border-slate-800/50 shrink-0" 
            />
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-on-surface line-clamp-2 leading-snug mb-1">
                {hoveredNovel.title}
              </h4>
              <p className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                <ViconicIcon name="person" size={11} className="shrink-0" />
                <span className="truncate">{hoveredNovel.author || "Đang cập nhật"}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-bold">
                {hoveredNovel.status && (
                  <span className={`px-1.5 py-0.5 rounded border ${
                    (hoveredNovel.status === 'COMPLETED' || hoveredNovel.status === 'Hoàn thành')
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {(hoveredNovel.status === 'COMPLETED' || hoveredNovel.status === 'Hoàn thành') ? 'Hoàn thành' : 'Đang ra'}
                  </span>
                )}
                {hoveredNovel.is_vip && (
                  <span className="bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00]/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <ViconicIcon name="u4:vip-crown-queen-1-bold" size={9} className="shrink-0" />
                    <span>VIP</span>
                  </span>
                )}
                <span className="text-secondary flex items-center gap-0.5 bg-secondary/5 px-1.5 py-0.5 rounded border border-secondary/10">
                  <ViconicIcon name="auto_stories" size={10} className="shrink-0" />
                  <span>{hoveredNovel.total_chapters || 0} ch</span>
                </span>
              </div>
            </div>
          </div>

          {/* Stats and Description */}
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant mb-2">
              <span className="flex items-center gap-1">
                <ViconicIcon name="visibility" size={11} className="shrink-0" />
                Lượt xem: <strong className="text-on-surface font-extrabold">{hoveredNovel.view_count || 0}</strong>
              </span>
              <span className="flex items-center gap-1">
                <ViconicIcon name="favorite" size={11} className="shrink-0 text-red-500" />
                Theo dõi: <strong className="text-on-surface font-extrabold">{(() => {
                  let count = hoveredNovel.follow_count || 0;
                  const currentUserStr = localStorage.getItem('user');
                  if (currentUserStr) {
                    try {
                      const currentUser = JSON.parse(currentUserStr);
                      const isFollowedById = localStorage.getItem(`follow_novel_${hoveredNovel.id}_user_${currentUser.id}`) === '1';
                      const isFollowedBySlug = localStorage.getItem(`follow_novel_${hoveredNovel.slug}_user_${currentUser.id}`) === '1';
                      if (isFollowedById || isFollowedBySlug) {
                        count += 1;
                      }
                    } catch (e) {}
                  }
                  return count;
                })()}</strong>
              </span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mb-2">
              {hoveredNovel.genres?.slice(0, 3).map((g: any) => (
                <span key={g.name} className="text-[9px] font-bold text-on-surface-variant bg-surface-variant/40 px-1.5 py-0.5 rounded border border-outline-variant/30 uppercase tracking-tighter">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-on-surface-variant/80 line-clamp-5 leading-relaxed font-body-ui bg-slate-50/50 dark:bg-slate-800/20 p-2 rounded-xl whitespace-pre-line flex-grow overflow-hidden">
              {hoveredNovel.description ? hoveredNovel.description.replace(/\\n/g, '\n') : "Chưa có tóm tắt nội dung."}
            </p>
          </div>
        </div>
      )}

      {/* Global Custom Dialog Modal */}
      {dialog && dialog.isOpen && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121316] max-w-sm w-full border border-outline-variant/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Top-to-Bottom Centered Layout */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-3.5 rounded-full shrink-0 ${
                dialog.type === 'confirm' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600'
              }`}>
                <ViconicIcon name={dialog.icon || (dialog.type === 'confirm' ? 'help_outline' : 'warning_amber')} size={32} />
              </div>
              <div className="space-y-2 min-w-0 w-full">
                <h3 className="font-black text-lg text-on-surface leading-tight">
                  {dialog.title}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {dialog.message}
                </p>
              </div>
            </div>

            {/* Equal-Width Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1 w-full">
              {dialog.type === 'confirm' && (
                <button
                  onClick={handleCancelDialog}
                  className="flex-1 bg-surface border border-outline-variant/40 hover:bg-surface-variant/20 py-2.5 rounded-xl font-bold text-xs transition-colors text-on-surface-variant"
                >
                  {dialog.cancelText || 'Hủy'}
                </button>
              )}
              <button
                onClick={handleConfirmDialog}
                className="flex-1 bg-primary text-on-primary hover:bg-primary/95 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm shadow-primary/10"
              >
                {dialog.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sleek Floating Toast Notification without icon */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-80 bg-neutral-900 text-white border border-outline-variant/10 rounded-xl p-3.5 shadow-2xl z-[99999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <p className="text-xs font-semibold leading-normal">
            {toastMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
