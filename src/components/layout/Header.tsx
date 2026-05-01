import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
const novelsData = novelsDataJson as any[];

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Extract unique genres from data
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novelsData.forEach(novel => {
      if (novel.tags) novel.tags.forEach((tag: string) => genreSet.add(tag));
    });
    return Array.from(genreSet).sort();
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return novelsData.filter(novel =>
      novel.title.toLowerCase().includes(q) ||
      (novel.author && novel.author.toLowerCase().includes(q)) ||
      (novel.tags && novel.tags.some((tag: string) => tag.toLowerCase().includes(q)))
    ).slice(0, 5);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-lg border-b border-primary-container/50 shadow-sm shadow-primary-container/20">
      <div className="flex justify-between items-center px-8 h-16 max-w-[1200px] mx-auto">
        {/* Brand */}
        <Link 
          className="text-lg sm:text-xl md:text-2xl font-bold text-primary italic font-headline-md tracking-tight flex items-center gap-2 truncate min-w-0" 
          to="/"
        >
          <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <span className="truncate">YumeNovel</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 font-label-bold text-label-bold">
          <Link 
            className={`${location.pathname === '/' ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`} 
            to="/"
          >
            Trang chủ
          </Link>
          
          {/* Dropdown Thể Loại — Dynamic from data */}
          <div className="relative group">
            <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 py-1">
              Thể loại
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-outline-variant/50 rounded-sm shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2 grid grid-cols-1 max-h-[60vh] overflow-y-auto">
                {allGenres.map((name) => (
                  <Link 
                    key={name}
                    to={`/genres/${encodeURIComponent(name)}`} 
                    className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-variant hover:text-primary transition-colors"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link className="text-on-surface-variant hover:text-primary transition-colors" to="#">Xếp hạng</Link>

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
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
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
            className="sm:hidden p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-primary-container/20 rounded-sm"
            onClick={() => navigate('/search')}
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
