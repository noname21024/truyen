import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import NovelCard from '@/components/cards/NovelCard';
import SimplePagination from '@/components/ui/SimplePagination';
import { NovelService, CoinService } from '@/lib/api';
import { showCustomAlert, showCustomConfirm } from '@/lib/dialog';
import { isUserVIP } from '@/lib/user';

const LIST_PAGE_SIZE = 10;
const GRID_PAGE_SIZE = 12;

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [followedNovels, setFollowedNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shelf' | 'history' | 'purchased'>('shelf');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [purchasedNovels, setPurchasedNovels] = useState<any[]>([]);
  const [shelfPage, setShelfPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [purchasedPage, setPurchasedPage] = useState(1);

  const formatRelativeTime = (isoString: string) => {
    try {
      const past = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước (${past.toLocaleDateString('vi-VN')})`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) {
      showCustomAlert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để truy cập trang cá nhân!", () => {
        navigate('/');
      });
      return;
    }
    
    try {
      const parsedUser = JSON.parse(saved);
      setCurrentUser(parsedUser);

      // Fetch latest balance & VIP status from backend to ensure immediate sync
      CoinService.getBalance()
        .then(data => {
          const updatedUser = { ...parsedUser, coin_balance: data.coin_balance, is_vip: data.is_vip, is_staff: data.is_staff };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
        })
        .catch(() => {});

      // Scan localStorage to find followed novel slugs for this specific user
      const followedSlugs: string[] = [];
      const prefix = 'follow_novel_';
      const userPart = `_user_${parsedUser.name}`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key.endsWith(userPart)) {
          // Robust split-based slug extraction
          const parts = key.split(userPart);
          if (parts.length > 0) {
            const slug = parts[0].substring(prefix.length);
            followedSlugs.push(slug);
          }
        }
      }

      // Fetch novels from API and filter matches
      NovelService.getNovels()
        .then(data => {
          const matched = data.filter((novel: any) => followedSlugs.includes(novel.slug) || followedSlugs.includes(String(novel.id)));
          setFollowedNovels(matched);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load followed novels from API:", err);
          setLoading(false);
        });
    } catch (e) {
      console.error("Failed to parse user session", e);
      setLoading(false);
    }
  }, [navigate]);

  // Load viewing history and purchased novels when currentUser is loaded
  useEffect(() => {
    if (!currentUser) return;
    
    // 1. Load viewing history list from localStorage and map with cover images
    try {
      const hist = localStorage.getItem('reading_history_list');
      if (hist) {
        const parsed = JSON.parse(hist) as any[];
        NovelService.getNovels()
          .then(allStories => {
            const mapped = parsed.map(item => {
              const matchedNovel = allStories.find(s => s.id === item.novelId || s.slug === item.novelId);
              return {
                ...item,
                coverUrl: matchedNovel?.cover_url || 'https://placehold.co/120x168/e2e8f0/64748b?text=Book'
              };
            });
            setHistoryList(mapped);
          })
          .catch(() => {
            setHistoryList(parsed);
          });
      }
    } catch {}

    // 2. Fetch purchased stories by checking spend transactions
    CoinService.getTransactions()
      .then(txns => {
        const spentTxns = txns.filter(t => t.type === 'spend' && t.status === 'completed');
        const storyTitles = new Set<string>();
        
        const parseStoryTitleFromNote = (note: string) => {
          if (!note) return null;
          if (note.startsWith("Mở khóa vĩnh viễn: ")) {
            const withoutPrefix = note.substring("Mở khóa vĩnh viễn: ".length);
            const hyphenIndex = withoutPrefix.indexOf(" - Chương");
            return hyphenIndex !== -1 ? withoutPrefix.substring(0, hyphenIndex).trim() : withoutPrefix.trim();
          }
          if (note.startsWith("Mua cả bộ: ")) {
            const withoutPrefix = note.substring("Mua cả bộ: ".length);
            const parenIndex = withoutPrefix.indexOf(" (");
            return parenIndex !== -1 ? withoutPrefix.substring(0, parenIndex).trim() : withoutPrefix.trim();
          }
          return null;
        };

        spentTxns.forEach(t => {
          const title = parseStoryTitleFromNote(t.note);
          if (title) storyTitles.add(title);
        });

        NovelService.getNovels()
          .then(allStories => {
            const matched: any[] = [];
            storyTitles.forEach(title => {
              const found = allStories.find(s => s.title.toLowerCase() === title.toLowerCase());
              if (found) {
                matched.push(found);
              } else {
                matched.push({
                  id: title,
                  slug: '#',
                  title: title,
                  author: 'Đang cập nhật',
                  cover_url: 'https://placehold.co/120x168/e2e8f0/64748b?text=Book',
                  is_fallback: true
                });
              }
            });
            setPurchasedNovels(matched);
          })
          .catch(() => {
            setPurchasedNovels(Array.from(storyTitles).map(title => ({
              id: title,
              slug: '#',
              title: title,
              author: 'Đang cập nhật',
              cover_url: 'https://placehold.co/120x168/e2e8f0/64748b?text=Book',
              is_fallback: true
            })));
          });
      })
      .catch(() => {});
  }, [currentUser]);

  const handleLogout = () => {
    showCustomConfirm(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất tài khoản hiện tại không?',
      () => {
        localStorage.removeItem('user');
        showCustomAlert("Thành công", "Đã đăng xuất tài khoản!", () => {
          navigate('/');
          window.location.reload();
        });
      },
      undefined,
      'hum:logout'
    );
  };

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-12 animate-pulse">
        <div className="h-6 bg-outline-variant/30 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-4">
            <div className="bg-surface border border-outline-variant/30 rounded-sm p-6 space-y-4">
              <div className="w-24 h-24 bg-outline-variant/30 rounded-full mx-auto" />
              <div className="h-5 bg-outline-variant/30 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-outline-variant/30 rounded w-1/3 mx-auto" />
            </div>
          </div>
          <div className="md:col-span-8 space-y-4">
            <div className="h-10 bg-outline-variant/30 rounded w-1/3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-outline-variant/30 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-8 truncate">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <ViconicIcon name="home" size={14} className="mr-1 shrink-0" />
              Trang chủ
            </Link>
          </li>
          <li className="flex items-center font-bold">
            <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
            Trang cá nhân
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: User Profile Card */}
        <div className="md:col-span-4">
          <div className="bg-surface border border-outline-variant/50 rounded-sm shadow-sm overflow-hidden sticky top-[96px]">
            {/* Banner Deco */}
            <div className="h-24 bg-gradient-to-r from-primary/30 to-primary/10 relative" />
            
            <div className="px-6 pb-6 relative flex flex-col items-center">
              {/* Avatar */}
              <div className="relative -mt-12 mb-4 shrink-0">
                {isUserVIP(currentUser.name) ? (
                  <div className="w-24 h-24 rounded-full vip-avatar-rainbow p-[3px]">
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name} 
                      className="w-full h-full rounded-full border-4 border-surface object-cover bg-white"
                    />
                  </div>
                ) : (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-24 h-24 rounded-full border-4 border-surface object-cover shadow-md"
                  />
                )}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-surface rounded-full shadow-sm" />
              </div>

              {/* User Bio */}
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-0.5 text-center flex items-center gap-1.5 justify-center">
                <span>{currentUser.name}</span>
                {isUserVIP(currentUser.name) && (
                  <span className="vip-badge-rainbow select-none shrink-0">
                    <span className="vip-badge-rainbow-inner">
                      <span className="vip-text-rainbow text-[8px] font-black uppercase">VIP</span>
                    </span>
                  </span>
                )}
              </h2>
              {isUserVIP(currentUser.name) ? (
                <span className="vip-pill-rainbow text-[10px] px-3 py-1 rounded-full uppercase tracking-wider mb-5">
                  Hội Viên VIP
                </span>
              ) : (
                <span className="font-label-bold text-[10px] text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider mb-5">
                  Độc giả thân thiết
                </span>
              )}

              {/* Metadata details */}
              <div className="w-full space-y-3 border-t border-b border-outline-variant/30 py-4 mb-5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="mail" size={14} className="shrink-0 text-primary/80" />
                    Email:
                  </span>
                  <span className="font-bold text-on-surface">docgia@pubnihtruyen.com</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="calendar_today" size={14} className="shrink-0 text-primary/80" />
                    Tham gia:
                  </span>
                  <span className="font-bold text-on-surface">20 tháng 6, 2026</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="login" size={14} className="shrink-0" />
                    Loại tài khoản:
                  </span>
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[10px] bg-surface-variant px-2 py-0.5 rounded-sm">
                    Google (OAuth)
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full bg-surface border border-outline-variant hover:bg-surface-variant hover:text-primary transition-all duration-200 py-2.5 rounded-sm font-bold text-xs flex items-center justify-center gap-2 text-on-surface-variant active:scale-95"
              >
                <ViconicIcon name="logout" size={14} className="shrink-0" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: User content tabs */}
        <div className="md:col-span-8">
          {/* Tab selector */}
          <div className="flex border-b border-outline-variant/50 mb-6 font-label-bold text-label-bold text-sm overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              onClick={() => setActiveTab('shelf')}
              className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'shelf'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <ViconicIcon name="auto_stories" size={16} className="shrink-0" />
              <span>Tủ sách theo dõi ({followedNovels.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <ViconicIcon name="history" size={16} className="shrink-0" />
              <span>Lịch sử xem ({historyList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('purchased')}
              className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'purchased'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <ViconicIcon name="payments" size={16} className="shrink-0" />
              <span>Truyện đã mua ({purchasedNovels.length})</span>
            </button>
          </div>
 
          {/* Tab Content 1: Bookshelf List */}
          {activeTab === 'shelf' && (
            <div className="space-y-4">
              {followedNovels.length > 0 ? (
                followedNovels.slice((shelfPage - 1) * LIST_PAGE_SIZE, shelfPage * LIST_PAGE_SIZE).map((novel) => (
                  <div key={novel.id} className="flex gap-4 p-3 border border-outline-variant/30 rounded-lg bg-surface/50 hover:bg-surface-variant/10 transition-colors duration-200">
                    {/* Novel Cover Image */}
                    <Link to={`/detail/${novel.id}`} className="w-16 h-22 sm:w-20 sm:h-28 rounded-md overflow-hidden shrink-0 shadow-sm border border-outline-variant/30 relative group block">
                      <img 
                        src={novel.cover_url || 'https://placehold.co/120x168/e2e8f0/64748b?text=Book'} 
                        alt={novel.title} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    
                    {/* Novel Details */}
                    <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 justify-between">
                          <Link 
                            to={`/detail/${novel.id}`} 
                            className="font-bold text-sm sm:text-base text-on-surface hover:text-primary transition-colors line-clamp-1 flex-grow"
                          >
                            {novel.title}
                          </Link>
                          {novel.is_vip && (
                            <span className="shrink-0 text-[9px] font-black uppercase bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-sm">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant/85">
                          Tác giả: <span className="font-semibold text-on-surface">{novel.author || "Đang cập nhật"}</span>
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Chương mới nhất: <span className="font-bold text-primary">Chương {novel.total_chapters || 0}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/10 pt-2 mt-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-outline">
                          <ViconicIcon name="schedule" size={12} className="shrink-0" />
                          <span>Cập nhật {formatRelativeTime(novel.updated_at)}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full ${
                          novel.status === 'COMPLETED' 
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}>
                          {novel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 border border-dashed border-outline-variant/50 rounded-sm p-6">
                  <div className="w-16 h-16 bg-surface-variant/30 text-outline rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant/30">
                    <ViconicIcon name="auto_stories" size={32} className="shrink-0 text-outline-variant" />
                  </div>
                  <h3 className="font-display-lg text-base font-bold text-on-surface mb-2">Tủ sách theo dõi trống</h3>
                  <p className="text-xs text-on-surface-variant/80 max-w-sm mx-auto mb-6">
                    Bạn chưa theo dõi tác phẩm nào. Hãy theo dõi các bộ tiểu thuyết yêu thích để nhận thông báo chương mới ngay tại đây!
                  </p>
                  <Link 
                    to="/" 
                    className="bg-primary text-on-primary font-bold text-xs px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-95"
                  >
                    <ViconicIcon name="explore" size={14} className="shrink-0" />
                    Khám phá truyện hay
                  </Link>
                </div>
              )}
              {followedNovels.length > 0 && (
                <SimplePagination
                  currentPage={shelfPage}
                  totalPages={Math.max(1, Math.ceil(followedNovels.length / LIST_PAGE_SIZE))}
                  onPageChange={(p) => { setShelfPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="mt-6"
                />
              )}
            </div>
          )}

          {/* Tab Content 2: Reading History List */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyList.length > 0 ? (
                historyList.slice((historyPage - 1) * LIST_PAGE_SIZE, historyPage * LIST_PAGE_SIZE).map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-3 border border-outline-variant/30 rounded-lg bg-surface/50 hover:bg-surface-variant/10 transition-colors duration-200">
                    {/* Novel Cover Image */}
                    <Link to={`/detail/${item.novelId}`} className="w-16 h-22 sm:w-20 sm:h-28 rounded-md overflow-hidden shrink-0 shadow-sm border border-outline-variant/30 relative group block">
                      <img 
                        src={item.coverUrl || 'https://placehold.co/120x168/e2e8f0/64748b?text=Book'} 
                        alt={item.novelTitle} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    
                    {/* Reading Details */}
                    <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
                      <div className="space-y-1">
                        <Link 
                          to={`/detail/${item.novelId}`} 
                          className="font-bold text-sm sm:text-base text-on-surface hover:text-primary transition-colors line-clamp-1 block"
                        >
                          {item.novelTitle}
                        </Link>
                        <p className="text-xs text-on-surface-variant line-clamp-1">
                          Đã xem: <span className="font-bold text-primary">{item.chapterTitle}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] text-outline font-medium">
                        <ViconicIcon name="schedule" size={12} className="shrink-0" />
                        <span>Xem {formatRelativeTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 border border-dashed border-outline-variant/50 rounded-sm p-6">
                  <div className="w-16 h-16 bg-surface-variant/30 text-outline rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant/30">
                    <ViconicIcon name="history" size={32} className="shrink-0 text-outline-variant" />
                  </div>
                  <h3 className="font-display-lg text-base font-bold text-on-surface mb-2">Lịch sử xem trống</h3>
                  <p className="text-xs text-on-surface-variant/80 max-w-sm mx-auto mb-6">
                    Bạn chưa đọc chương truyện nào gần đây. Hãy chọn một tác phẩm và bắt đầu thưởng thức ngay!
                  </p>
                  <Link 
                    to="/" 
                    className="bg-primary text-on-primary font-bold text-xs px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-95"
                  >
                    <ViconicIcon name="auto_stories" size={14} className="shrink-0" />
                    Đọc truyện mới
                  </Link>
                </div>
              )}
              {historyList.length > 0 && (
                <SimplePagination
                  currentPage={historyPage}
                  totalPages={Math.max(1, Math.ceil(historyList.length / LIST_PAGE_SIZE))}
                  onPageChange={(p) => { setHistoryPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="mt-6"
                />
              )}
            </div>
          )}

          {/* Tab Content 3: Purchased Novels Grid */}
          {activeTab === 'purchased' && (
            <div>
              {purchasedNovels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  {purchasedNovels.slice((purchasedPage - 1) * GRID_PAGE_SIZE, purchasedPage * GRID_PAGE_SIZE).map((novel) => (
                    <NovelCard
                      key={novel.id}
                      id={novel.id}
                      title={novel.title}
                      author={novel.author || "Đang cập nhật"}
                      status={novel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra'}
                      image={novel.cover_url}
                      views={novel.view_count || 0}
                      isVip={novel.is_vip}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-outline-variant/50 rounded-sm p-6">
                  <div className="w-16 h-16 bg-surface-variant/30 text-outline rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant/30">
                    <ViconicIcon name="payments" size={32} className="shrink-0 text-outline-variant" />
                  </div>
                  <h3 className="font-display-lg text-base font-bold text-on-surface mb-2">Chưa mua truyện nào</h3>
                  <p className="text-xs text-on-surface-variant/80 max-w-sm mx-auto mb-6">
                    Bạn chưa thực hiện giao dịch mở khóa chương truyện hay mua cả bộ truyện nào bằng xu.
                  </p>
                  <Link 
                    to="/" 
                    className="bg-primary text-on-primary font-bold text-xs px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-95"
                  >
                    <ViconicIcon name="explore" size={14} className="shrink-0" />
                    Khám phá truyện VIP
                  </Link>
                </div>
              )}
              {purchasedNovels.length > 0 && (
                <SimplePagination
                  currentPage={purchasedPage}
                  totalPages={Math.max(1, Math.ceil(purchasedNovels.length / GRID_PAGE_SIZE))}
                  onPageChange={(p) => { setPurchasedPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="mt-6"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
