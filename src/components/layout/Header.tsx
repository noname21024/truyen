import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { CategoryService, NovelService } from '@/lib/api';
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

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const loginWithGoogle = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const mockUser = {
        name: "Độc Giả Yume (Google)",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAb-14uOcA3z6oOYNNXFQZMGk5LqtQxM2cL7kShQ6UO4TvOht8YiLfBJY-3bihJuLgXze9CkbXBa6QFIw9VqTUHkpB50TncEOMChL_WpiVyFICNRCgDJc9ARVe1kNnxXUnO8MK2up2wRutKKiFBjnuceM8exGI8iRAvDvvXidxorqEi32E5PB2o9k-EKsrzj1ffNHQkPDA5LxhyYhJbSWfwvAlEKTTvNwgrsUxFkPJ1FnXVSIeWsLB4K3mNSVpSarNi49k0D31ynmtw"
      };
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      setIsSubmitting(false);
      setIsLoginDialogOpen(false);
      alert("Đăng nhập thành công bằng tài khoản Google!");
      window.location.reload();
    }, 800);
  };

  const loginWithFacebook = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const mockUser = {
        name: "Độc Giả Yume (Facebook)",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
      };
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      setIsSubmitting(false);
      setIsLoginDialogOpen(false);
      alert("Đăng nhập thành công bằng tài khoản Facebook!");
      window.location.reload();
    }, 800);
  };

  // Extract unique genres from data as fallback
  const staticGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novelsData.forEach(novel => {
      if (novel.tags) novel.tags.forEach((tag: string) => genreSet.add(tag));
    });
    return Array.from(genreSet).sort();
  }, []);

  const [genres, setGenres] = useState<string[]>([]);

  // Fetch categories from backend API
  useEffect(() => {
    CategoryService.getCategories()
      .then(data => {
        if (data && data.length > 0) {
          setGenres(data.map(c => c.name).sort((a, b) => a.localeCompare(b)));
        } else {
          setGenres(staticGenres);
        }
      })
      .catch(err => {
        console.warn("Failed to load header categories from API, using static fallback:", err);
        setGenres(staticGenres);
      });
  }, [staticGenres]);

  // Load all novels from backend for autocomplete search
  const [allNovels, setAllNovels] = useState<any[]>([]);

  useEffect(() => {
    NovelService.getNovels()
      .then(data => {
        if (data) {
          setAllNovels(data);
        }
      })
      .catch(err => {
        console.warn("Failed to load autocomplete novels list", err);
      });
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
        id: dbNovel.slug,
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
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
        <div className="flex justify-between items-center px-8 h-16 max-w-[1300px] mx-auto">
        {/* Brand */}
        <Link 
          className="text-lg sm:text-xl md:text-2xl font-bold text-primary italic font-headline-md tracking-tight flex items-center gap-2 truncate min-w-0" 
          to="/"
        >
          <img src="/logo.svg" alt="YumeNovels Logo" className="w-9 h-9 object-contain shrink-0" />
          <span className="truncate">YumeNovels</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 font-label-bold text-label-bold">
          <Link 
            className={`${location.pathname === '/' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} 
            to="/"
          >
            Trang chủ
          </Link>
          
          {/* Dropdown Thể Loại — Mega Dropdown */}
          <div className="relative group">
            <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 py-1">
              Thể loại
              <ViconicIcon name="keyboard_arrow_down" size={14} className="shrink-0" />
            </button>
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
                {genres.map((name) => (
                  <Link 
                    key={name}
                    to={`/genres/${encodeURIComponent(name)}`} 
                    className="px-2 py-1 text-xs text-on-surface-variant hover:bg-primary/5 hover:text-primary transition-colors rounded-sm truncate font-medium"
                  >
                    {name}
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
        </nav>

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
                className="bg-surface-variant/30 text-on-surface text-sm rounded-sm pl-10 pr-4 py-2 border border-outline-variant/50 focus:outline-none w-64 font-body-ui"
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
          <button 
            className="sm:hidden p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-primary-container/20 rounded-sm flex items-center justify-center"
            onClick={() => navigate('/search')}
          >
            <ViconicIcon name="search" size={24} className="shrink-0" />
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-1 focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                aria-expanded={isUserDropdownOpen}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-9 h-9 rounded-full border border-primary/30 object-cover shadow-sm" 
                />
                <ViconicIcon name="arrow_drop_down" size={16} className="text-on-surface-variant shrink-0" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white border border-outline-variant/50 rounded-sm shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header */}
                  <div className="px-4 py-2 border-b border-outline-variant/30 flex flex-col min-w-0">
                    <span className="font-bold text-xs text-on-surface truncate">{user.name}</span>
                    <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">Độc giả</span>
                  </div>

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

                  <button 
                    onClick={() => {
                      localStorage.removeItem('user');
                      setUser(null);
                      alert("Đã đăng xuất tài khoản!");
                      window.location.reload();
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
            </div>

            <hr className="border-outline-variant/30" />

            {/* Genres Section */}
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-3 px-3">Thể loại</p>
              <div className="grid grid-cols-2 gap-2">
                {genres.map((name) => (
                  <Link 
                    key={name}
                    to={`/genres/${encodeURIComponent(name)}`} 
                    className="px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors rounded-sm flex items-center gap-1.5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0"></span>
                    <span className="truncate">{name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <hr className="border-outline-variant/30" />

            {/* Login Button in mobile menu */}
            <div className="pt-2 pb-6">
              {user ? (
                <div className="flex flex-col items-center gap-3 bg-surface-variant/20 p-4 rounded-sm border border-outline-variant/30 w-full">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border border-primary/30 object-cover" />
                  <span className="font-bold text-sm text-on-surface">{user.name}</span>
                  <button 
                    className="w-full bg-outline-variant/30 text-on-surface-variant font-label-bold text-xs py-2 px-6 rounded-sm hover:bg-outline-variant/50 transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      localStorage.removeItem('user');
                      setUser(null);
                      alert("Đã đăng xuất tài khoản!");
                      window.location.reload();
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
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-1 text-primary">
              <ViconicIcon name="star_shine" size={24} />
            </div>
            <DialogTitle className="text-xl font-bold font-headline-md text-primary tracking-tight">
              Đăng nhập YumeNovels
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
