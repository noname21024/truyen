import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { api, AuthService, CategoryService, NovelService, CoinService, NotificationService, type NotificationData } from '@/lib/api';
import { showCustomAlert, showCustomConfirm } from '@/lib/dialog';
import { isUserVIP } from '@/lib/user';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
const novelsData = novelsDataJson as any[];

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) {}
    }
    const openLogin = () => setIsLoginDialogOpen(true);
    // Re-reads the stored reader after anything changes it — a coin top-up, or
    // a new display name / avatar saved on the profile page. Without this the
    // header keeps showing the old value until a full page reload.
    const handleUserChanged = () => {
      const latest = localStorage.getItem('user');
      if (latest) {
        try { setUser(JSON.parse(latest)); } catch (e) {}
      }
    };
    window.addEventListener('open-login-dialog', openLogin);
    window.addEventListener('balance-updated', handleUserChanged);
    window.addEventListener('user-updated', handleUserChanged);
    return () => {
      window.removeEventListener('open-login-dialog', openLogin);
      window.removeEventListener('balance-updated', handleUserChanged);
      window.removeEventListener('user-updated', handleUserChanged);
    };
  }, []);

  // Fetch unread notification count when user logs in
  useEffect(() => {
    if (!user) { setUnreadCount(0); setNotifications([]); return; }
    NotificationService.getUnreadCount()
      .then(count => setUnreadCount(count))
      .catch(() => {});
  }, [user?.id]);

  // Sync user VIP status and balance with backend on mount
  useEffect(() => {
    if (!user) return;
    CoinService.getBalance()
      .then(data => {
        try {
          const saved = localStorage.getItem('user');
          if (saved) {
            const u = JSON.parse(saved);
            if (u.coin_balance !== data.coin_balance || u.is_vip !== data.is_vip || u.is_staff !== data.is_staff) {
              const updated = { ...u, coin_balance: data.coin_balance, is_vip: data.is_vip, is_staff: data.is_staff };
              localStorage.setItem('user', JSON.stringify(updated));
              setUser(updated);
            }
          }
        } catch {}
      })
      .catch(() => {});
  }, [user?.id]);

  const loginWithGoogle = async () => {
    setIsSubmitting(true);
    try {
      const resp = await api.get<{ auth_url: string }>('auth/google/');
      window.location.href = resp.data.auth_url;
    } catch {
      setIsSubmitting(false);
      alert('Không thể kết nối tới server. Vui lòng thử lại.');
    }
  };

  const loginWithFacebook = () => {
    setIsLoginDialogOpen(false);
    showCustomAlert(
      'Chưa hỗ trợ',
      'Đăng nhập bằng Facebook hiện chưa được hỗ trợ. Vui lòng dùng tài khoản Google để tiếp tục.',
      undefined,
      'hum:info'
    );
  };

  // Extract unique genres from data as fallback
  const staticGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novelsData.forEach(novel => {
      if (novel.tags) novel.tags.forEach((tag: string) => genreSet.add(tag));
    });
    return Array.from(genreSet).sort();
  }, []);

  const [genres, setGenres] = useState<Array<{ id?: number; name: string }>>([]);

  // Fetch categories from backend API
  useEffect(() => {
    CategoryService.getCategories()
      .then(data => {
        if (data && data.length > 0) {
          setGenres(data.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setGenres(staticGenres.map(name => ({ name })));
        }
      })
      .catch(err => {
        console.warn("Failed to load header categories from API, using static fallback:", err);
        setGenres(staticGenres.map(name => ({ name })));
      });
  }, [staticGenres]);

  // Load all novels from backend for autocomplete search
  const [allNovels, setAllNovels] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    NovelService.getNovels()
      .then(data => {
        if (cancelled) return;
        if (data) setAllNovels(data);
      })
      .catch(err => {
        if (!cancelled) console.warn("Failed to load autocomplete novels list", err);
      });
    return () => { cancelled = true; };
  }, []);

  // Diacritic-insensitive matching function
  const removeAccents = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Search results filtered dynamically
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = removeAccents(searchQuery.toLowerCase());
    return allNovels
      .filter(novel => {
        const titleMatch = removeAccents(novel.title.toLowerCase()).includes(q);
        const authorMatch = novel.author ? removeAccents(novel.author.toLowerCase()).includes(q) : false;
        const tagMatch = novel.genres ? novel.genres.some((g: any) => removeAccents(g.name.toLowerCase()).includes(q)) : false;
        return titleMatch || authorMatch || tagMatch;
      })
      .slice(0, 5)
      .map(dbNovel => ({
        id: dbNovel.id,
        title: dbNovel.title,
        author: dbNovel.author || "Đang cập nhật",
        cover: dbNovel.cover_url || "https://placehold.co/40x56/e2e8f0/64748b?text=?",
      }));
  }, [searchQuery, allNovels]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
    setIsNotifOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-white/70 backdrop-blur-lg border-b border-primary-container/50 shadow-sm shadow-primary-container/20">
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16 max-w-[1300px] mx-auto gap-4">
          <div className="flex items-center gap-4 lg:gap-6 xl:gap-8 min-w-0">
        {/* Brand */}
        <Link 
          className="flex items-center gap-1.5 truncate min-w-0 hover:opacity-90 transition-opacity" 
          to="/"
        >
          <img src="/logo.svg" alt="Pub Nih Truyện Logo" className="w-[30px] h-[30px] object-contain shrink-0" />
          <span className="font-black tracking-tight text-primary text-base sm:text-lg flex items-center gap-0.5 select-none">
            PUB<span className="text-on-surface font-light">NIH</span>
            <span className="text-[8px] bg-primary/10 text-primary px-1 py-0.5 rounded-sm tracking-widest font-black ml-0.5 uppercase">TRUYỆN</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8 font-label-bold text-label-bold">
          <Link 
            className={`${location.pathname === '/' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} 
            to="/"
          >
            Trang chủ
          </Link>
          
          {/* Dropdown Thể Loại — Mega Dropdown */}
          <div className="relative group">
            <Link to="/genres" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 py-1">
              Thể loại
              <ViconicIcon name="keyboard_arrow_down" size={14} className="shrink-0" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-[25%] mt-2 w-[560px] bg-white border border-outline-variant/50 rounded-sm shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
              <div className="mb-3 pb-1.5 border-b border-outline-variant/30 flex justify-between items-center">
                <span className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <ViconicIcon name="f16:tag-multiple-20-filled" size={18} className="text-primary shrink-0" />
                  Tất cả thể loại
                </span>
                <Link to="/genres" className="text-[11px] text-primary hover:underline font-bold">
                  Xem tất cả ({genres.length}) →
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {genres.map((g) => (
                  <Link
                    key={g.name}
                    to={g.id ? `/genres/${g.id}` : `/genres/${encodeURIComponent(g.name)}`}
                    className="px-2 py-1 text-xs text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm truncate font-medium"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link className={`${location.pathname === '/ranking' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} to="/ranking">Xếp hạng</Link>

          <Link 
            className={`${location.pathname === '/new-update' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} 
            to="/new-update"
          >
            Mới cập nhật
          </Link>

          <Link 
            className={`${location.pathname === '/leaderboard' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} 
            to="/leaderboard"
          >
            Bảng Công Đức
          </Link>
          </nav>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative hidden sm:block" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <ViconicIcon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Tìm kiếm truyện..." 
                className="bg-surface-variant/30 text-on-surface text-sm rounded-sm pl-10 pr-4 py-2 border border-outline-variant/50 focus:outline-none w-48 lg:w-56 xl:w-64 font-body-ui"
              />
            </form>

            {/* Autocomplete Dropdown */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline-variant/50 rounded-sm shadow-lg z-50 overflow-hidden">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.map((novel) => (
                      <Link
                        key={novel.id}
                        to={`/detail/${novel.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-variant transition-colors border-b border-outline-variant/30 last:border-b-0"
                        onClick={() => setIsSearchOpen(false)}
                      >
                        <img 
                          src={novel.cover || "https://placehold.co/40x56/e2e8f0/64748b?text=?"} 
                          alt={novel.title}
                          className="w-8 h-11 object-cover rounded-sm border border-outline-variant/50 shrink-0"
                        />
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{novel.title}</p>
                          <p className="text-[10px] text-on-surface-variant">{novel.author}</p>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setIsSearchOpen(false); }}
                      className="w-full px-4 py-2.5 text-center text-sm font-bold text-primary hover:bg-primary/5 transition-colors border-t border-outline-variant/30"
                    >
                      Xem tất cả kết quả →
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-on-surface-variant">
                    Không tìm thấy kết quả
                  </div>
                )}
              </div>
            )}
          </div>

          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={async () => {
                  const next = !isNotifOpen;
                  setIsNotifOpen(next);
                  if (next && notifications.length === 0) {
                    setNotifLoading(true);
                    try {
                      const data = await NotificationService.getNotifications();
                      setNotifications(data);
                    } catch {}
                    finally { setNotifLoading(false); }
                  }
                  if (next) {
                    setUnreadCount(0);
                  }
                }}
                className="relative p-2 text-on-surface-variant hover:text-primary transition-colors bg-surface-variant/40 border border-outline-variant/20 hover:bg-surface-variant/75 rounded-sm flex items-center justify-center shadow-sm"
                aria-label="Thông báo"
              >
                <ViconicIcon name="notifications" size={20} className="shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="fixed sm:absolute top-14 sm:top-full left-2 right-2 sm:left-auto sm:right-0 mt-2.5 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-surface border border-outline-variant/50 rounded-sm shadow-xl z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150" style={{ maxHeight: '520px' }}>
                  {/* Header sticky */}
                  <div className="px-4 py-3 border-b border-outline-variant/30 flex justify-between items-center shrink-0 bg-surface">
                    <span className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                      <ViconicIcon name="notifications" size={16} className="text-primary shrink-0" />
                      Thông báo
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <span className="bg-primary text-on-primary text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                          {notifications.filter(n => !n.is_read).length}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {notifications.some(n => !n.is_read) && (
                        <button
                          onClick={async () => {
                            await NotificationService.markAllRead().catch(() => {});
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                          }}
                          className="text-[10px] text-primary font-bold hover:underline"
                        >
                          Đọc tất cả
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={async () => {
                            await NotificationService.clearAll().catch(() => {});
                            setNotifications([]);
                          }}
                          className="text-[10px] text-on-surface-variant hover:text-error font-bold transition-colors"
                          title="Xóa tất cả"
                        >
                          <ViconicIcon name="delete_sweep" size={14} className="shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list */}
                  <div className="overflow-y-auto flex-1">
                    {notifLoading ? (
                      <div className="py-10 text-center text-xs text-on-surface-variant">Đang tải...</div>
                    ) : notifications.length === 0 ? (
                      <div className="py-10 text-center text-xs text-on-surface-variant">
                        <ViconicIcon name="notifications_none" size={32} className="mx-auto mb-2 text-outline/50" />
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`flex gap-3 px-4 py-3.5 border-b border-outline-variant/20 last:border-b-0 group transition-colors ${!notif.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-surface-variant/30'}`}
                        >
                          {/* Avatar */}
                          <div className="shrink-0 mt-0.5">
                            {notif.type === 'reply_comment' && notif.data.reply_user_avatar ? (
                              <img src={notif.data.reply_user_avatar} alt={notif.data.reply_user_name} className="w-9 h-9 rounded-full object-cover border border-outline-variant/50" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${notif.type === 'reply_comment' ? 'bg-primary/15' : 'bg-yellow-500/15'}`}>
                                <ViconicIcon name={notif.type === 'reply_comment' ? 'reply' : 'warning'} size={17} className={notif.type === 'reply_comment' ? 'text-primary' : 'text-yellow-500'} />
                              </div>
                            )}
                          </div>

                          {/* Content — clickable */}
                          <button
                            className="flex-grow min-w-0 text-left"
                            onClick={async () => {
                              if (!notif.is_read) {
                                NotificationService.markRead(notif.id).catch(() => {});
                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                              }
                              setIsNotifOpen(false);
                              const { story_slug, chapter_number, comment_id } = notif.data;
                              const anchor = comment_id ? `#comment-${comment_id}` : '';
                              const chapter_id = notif.data.chapter_id;
                              if (notif.type === 'reply_comment' && (chapter_id || (story_slug && chapter_number))) {
                                window.location.href = chapter_id
                                  ? `/chapter/${chapter_id}${anchor}`
                                  : `/chapter/${story_slug}/${chapter_number}${anchor}`;
                              } else if (story_slug) {
                                window.location.href = `/detail/${story_slug}${anchor}`;
                              }
                            }}
                          >
                            {notif.type === 'reply_comment' ? (
                              <>
                                <p className={`text-[11.5px] leading-snug mb-1 ${!notif.is_read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                                  <span className="text-primary font-bold">{notif.data.reply_user_name}</span>
                                  {' đã phản hồi bình luận của bạn'}
                                  {notif.data.story_title && <span className="text-on-surface font-medium"> trong "{notif.data.story_title}"</span>}
                                  {notif.data.chapter_number && <span className="text-outline"> · Chương {notif.data.chapter_number}</span>}
                                </p>
                                {(notif.data.comment_content || (notif.data.sticker_urls && notif.data.sticker_urls.length > 0)) && (
                                  <div className="flex items-center gap-1.5 bg-surface-variant/50 rounded px-2 py-1.5 max-w-full">
                                    {notif.data.sticker_urls && notif.data.sticker_urls.map((url, i) => (
                                      <img key={i} src={url} alt="sticker" className="h-8 w-8 object-contain shrink-0" />
                                    ))}
                                    {notif.data.comment_content && (
                                      <span className="text-[10.5px] text-on-surface-variant italic truncate">"{notif.data.comment_content}"</span>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className={`text-[11.5px] leading-snug ${!notif.is_read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                                {notif.type === 'vip_expiring' ? '⚡ VIP của bạn sắp hết hạn' : '⚠️ VIP của bạn đã hết hạn'}
                              </p>
                            )}
                            <p className="text-[9.5px] text-outline mt-1.5">
                              {new Date(notif.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </button>

                          {/* Right: unread dot + delete */}
                          <div className="flex flex-col items-center gap-2 shrink-0 ml-1">
                            {!notif.is_read && <span className="w-2 h-2 bg-primary rounded-full mt-1 flex-none"></span>}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await NotificationService.deleteNotification(notif.id).catch(() => {});
                                setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant/50 hover:text-error p-0.5 rounded"
                              title="Xóa"
                            >
                              <ViconicIcon name="close" size={13} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-1 focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                aria-expanded={isUserDropdownOpen}
              >
                {isUserVIP(user.name) ? (
                  <div className="w-9 h-9 rounded-full vip-avatar-rainbow p-[2px]">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-full h-full rounded-full border border-primary/30 object-cover bg-white" 
                    />
                  </div>
                ) : (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-9 h-9 rounded-full border border-primary/30 object-cover shadow-sm" 
                  />
                )}
                <ViconicIcon name="arrow_drop_down" size={16} className="text-on-surface-variant shrink-0" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white border border-outline-variant/50 rounded-sm shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header */}
                  <div className="px-4 py-2 border-b border-outline-variant/30 flex flex-col min-w-0">
                    <span className="font-bold text-xs text-on-surface truncate flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {isUserVIP(user.name) && (
                        <span className="vip-badge-rainbow select-none shrink-0">
                          <span className="vip-badge-rainbow-inner">
                            <span className="vip-text-rainbow text-[7px] font-black uppercase">VIP</span>
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                      {isUserVIP(user.name) ? 'Hội Viên VIP' : 'Độc giả'}
                    </span>
                  </div>

                  {/* Coin balance */}
                  <Link
                    to="/coins"
                    className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-primary/5 hover:text-primary text-xs font-semibold text-on-surface-variant transition-colors border-b border-outline-variant/20"
                  >
                    <div className="flex items-center gap-2">
                      <ViconicIcon name="toll" size={14} className="shrink-0 text-primary" />
                      <span>Ví xu</span>
                    </div>
                    <span className="font-black text-primary">
                      {(user?.coin_balance ?? 0).toLocaleString('vi-VN')} xu
                    </span>
                  </Link>

                  {/* Dropdown Options */}
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-primary/5 hover:text-primary text-xs font-semibold text-on-surface-variant transition-colors"
                  >
                    <ViconicIcon name="person" size={14} className="shrink-0" />
                    <span>Trang cá nhân</span>
                  </Link>

                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-primary/5 hover:text-primary text-xs font-semibold text-on-surface-variant transition-colors"
                  >
                    <ViconicIcon name="auto_stories" size={14} className="shrink-0" />
                    <span>Tủ sách theo dõi</span>
                  </Link>

                  <Link
                    to="/coins"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-primary/5 hover:text-primary text-xs font-semibold text-on-surface-variant transition-colors"
                  >
                    <ViconicIcon name="add_circle" size={14} className="shrink-0" />
                    <span>Nạp xu</span>
                  </Link>

                  <button
                    onClick={() => {
                      showCustomConfirm(
                        'Đăng xuất',
                        'Bạn có chắc chắn muốn đăng xuất tài khoản hiện tại không?',
                        async () => {
                          // Releases this device's slot server-side as well as
                          // clearing local state, so it stops counting towards
                          // the account's device limit right away.
                          await AuthService.logout();
                          setUser(null);
                          showCustomAlert('Thành công', 'Đã đăng xuất tài khoản!', () => {
                            window.location.reload();
                          });
                        },
                        undefined,
                        'hum:logout'
                      );
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 hover:text-red-600 text-xs font-semibold text-on-surface-variant border-t border-outline-variant/30 transition-colors text-left"
                  >
                    <ViconicIcon name="logout" size={14} className="shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="bg-primary text-on-primary border border-primary hover:bg-primary/90 hover:border-primary/95 font-label-bold text-sm py-[9px] px-[22px] rounded-sm transition-all duration-200 hidden md:flex items-center gap-2 shadow-sm active:scale-95 shrink-0"
              onClick={() => setIsLoginDialogOpen(true)}
            >
              <ViconicIcon name="login" size={16} className="shrink-0" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Hamburger Menu Toggle */}
          <button 
            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-primary-container/20 rounded-sm flex items-center justify-center"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <ViconicIcon key="icon-close" name="close" size={24} className="shrink-0" />
            ) : (
              <ViconicIcon key="icon-menu" name="menu" size={24} className="shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>

      {/* Mobile Menu Overlay/Drawer */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-0 top-16 bg-white/95 backdrop-blur-md z-40 flex flex-col border-t border-outline-variant/30 overflow-y-auto animate-in fade-in slide-in-from-top duration-200">
          <div className="px-8 py-6 space-y-6">
            {/* Search Box */}
            <div className="relative w-full">
              <form onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setIsMenuOpen(false); }}>
                <ViconicIcon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant shrink-0" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm truyện..." 
                  className="bg-surface-variant/30 text-on-surface text-sm rounded-sm pl-10 pr-4 py-2 border border-outline-variant/50 focus:outline-none w-full font-body-ui"
                />
              </form>
            </div>
            {/* Main Links */}
            <div className="flex flex-col space-y-4 font-label-bold text-base">
              <Link 
                className={`py-2.5 px-3 rounded-sm hover:bg-surface-variant hover:text-primary transition-colors flex items-center gap-3 ${location.pathname === '/' ? 'text-primary bg-primary/5 font-bold' : 'text-on-surface-variant'}`}
                to="/"
                onClick={() => setIsMenuOpen(false)}
              >
                <ViconicIcon name="home" size={20} className="shrink-0" />
                <span>Trang chủ</span>
              </Link>

              <Link 
                className={`py-2.5 px-3 rounded-sm hover:bg-surface-variant hover:text-primary transition-colors flex items-center gap-3 ${location.pathname === '/new-update' ? 'text-primary bg-primary/5 font-bold' : 'text-on-surface-variant'}`}
                to="/new-update"
                onClick={() => setIsMenuOpen(false)}
              >
                <ViconicIcon name="update" size={20} className="shrink-0" />
                <span>Mới cập nhật</span>
              </Link>
              
              <Link 
                className={`py-2.5 px-3 rounded-sm hover:bg-surface-variant hover:text-primary transition-colors flex items-center gap-3 ${location.pathname === '/ranking' ? 'text-primary bg-primary/5 font-bold' : 'text-on-surface-variant'}`}
                to="/ranking"
                onClick={() => setIsMenuOpen(false)}
              >
                <ViconicIcon name="trending_up" size={20} className="shrink-0" />
                <span>Xếp hạng</span>
              </Link>

              <Link 
                className={`py-2.5 px-3 rounded-sm hover:bg-surface-variant hover:text-primary transition-colors flex items-center gap-3 ${location.pathname === '/leaderboard' ? 'text-primary bg-primary/5 font-bold' : 'text-on-surface-variant'}`}
                to="/leaderboard"
                onClick={() => setIsMenuOpen(false)}
              >
                <ViconicIcon name="military_tech" size={20} className="shrink-0" />
                <span>Bảng Công Đức</span>
              </Link>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Genres Section */}
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-3 px-3">Thể loại</p>
              <div className="grid grid-cols-2 gap-2">
                {genres.map((g) => (
                  <Link
                    key={g.name}
                    to={g.id ? `/genres/${g.id}` : `/genres/${encodeURIComponent(g.name)}`}
                    className="px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors rounded-sm flex items-center gap-1.5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0"></span>
                    <span className="truncate">{g.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Login Button in mobile menu */}
            <div className="pt-2 pb-6">
              {user ? (
                <div className="flex flex-col items-center gap-3 bg-surface-variant/20 p-4 rounded-sm border border-outline-variant/30 w-full">
                  {isUserVIP(user.name) ? (
                    <div className="w-12 h-12 rounded-full vip-avatar-rainbow p-[3px] shrink-0">
                      <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full border border-primary/30 object-cover bg-white" />
                    </div>
                  ) : (
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-primary/30 object-cover shrink-0" />
                  )}
                  <span className="font-bold text-sm text-on-surface flex items-center gap-1.5 justify-center">
                    <span>{user.name}</span>
                    {isUserVIP(user.name) && (
                      <span className="vip-badge-rainbow select-none shrink-0">
                        <span className="vip-badge-rainbow-inner">
                          <span className="vip-text-rainbow text-[8px] font-black uppercase">VIP</span>
                        </span>
                      </span>
                    )}
                  </span>
                  <div className="w-full flex flex-col gap-1 border-t border-outline-variant/30 pt-3 text-xs font-semibold text-on-surface-variant">
                    <Link
                      to="/coins"
                      className="flex items-center justify-between px-3 py-2 text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex items-center gap-2">
                        <ViconicIcon name="toll" size={15} className="text-primary shrink-0" />
                        <span>Ví xu</span>
                      </div>
                      <span className="font-black text-primary">{(user?.coin_balance ?? 0).toLocaleString('vi-VN')} xu</span>
                    </Link>

                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ViconicIcon name="person" size={15} className="shrink-0" />
                      <span>Trang cá nhân</span>
                    </Link>

                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ViconicIcon name="auto_stories" size={15} className="shrink-0" />
                      <span>Tủ sách theo dõi</span>
                    </Link>

                    <Link
                      to="/coins"
                      className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ViconicIcon name="add_circle" size={15} className="shrink-0" />
                      <span>Nạp xu</span>
                    </Link>
                  </div>

                  <button 
                    className="w-full bg-outline-variant/30 text-on-surface-variant font-label-bold text-xs py-2 px-6 rounded-sm hover:bg-red-50 hover:text-red-600 border-t border-outline-variant/20 pt-3 transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      showCustomConfirm(
                        'Đăng xuất',
                        'Bạn có chắc chắn muốn đăng xuất tài khoản hiện tại không?',
                        () => {
                          localStorage.removeItem('user');
                          setUser(null);
                          showCustomAlert('Thành công', 'Đã đăng xuất tài khoản!', () => {
                            window.location.reload();
                          });
                        },
                        undefined,
                        'hum:logout'
                      );
                    }}
                  >
                    <ViconicIcon name="logout" size={16} className="shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <button 
                  className="w-full bg-primary text-on-primary border border-primary hover:bg-primary/90 hover:border-primary/95 font-label-bold text-sm py-3 px-6 rounded-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  onClick={() => { setIsLoginDialogOpen(true); setIsMenuOpen(false); }}
                >
                  <ViconicIcon name="login" size={16} className="shrink-0" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Dialog */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-[360px] p-6 rounded-2xl border border-outline-variant/30 bg-white/95 backdrop-blur-md shadow-2xl animate-in fade-in duration-200">
          <DialogHeader className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-primary/10 transition-transform hover:scale-105 duration-300">
              <img src="/logo.svg" alt="Pub Nih Truyện Logo" className="w-10 h-10 object-contain" />
            </div>
            <DialogTitle className="text-xl font-bold font-headline-md text-primary tracking-tight">
              Đăng nhập Pub Nih Truyện
            </DialogTitle>
            <DialogDescription className="text-xs text-on-surface-variant font-body-ui">
              Chọn phương thức đăng nhập bằng Google hoặc Facebook để bắt đầu.
            </DialogDescription>
          </DialogHeader>

          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={loginWithGoogle}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <ViconicIcon name="sccli:google-color" size={20} />
              <span>Đăng nhập bằng Google</span>
            </button>
            <button
              onClick={loginWithFacebook}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <ViconicIcon name="sccli:facebook-color" size={20} />
              <span>Đăng nhập bằng Facebook</span>
            </button>
          </div>

          <div className="text-center mt-6 text-[10px] text-on-surface-variant font-medium">
            Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
