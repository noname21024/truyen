import React, { useState, useEffect, useMemo, useRef } from 'react';
import UpdateCard from '@/components/cards/UpdateCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import SimplePagination from '@/components/ui/SimplePagination';
import { CategoryService, NovelService } from '@/lib/api';

type SortOption = 'newest' | 'chapters' | 'views';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Mới hoàn thành',
  chapters: 'Nhiều chương nhất',
  views: 'Nhiều lượt xem nhất',
};

const PAGE_SIZE = 20;

const CompletedNovelsPage: React.FC = () => {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    CategoryService.getCategories()
      .then(data => setGenres(data.map(c => c.name).sort((a, b) => a.localeCompare(b))))
      .catch(() => {});

    // Fetch only completed novels from the server
    NovelService.getNovels({ status: 'COMPLETED' })
      .then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(dbNovel => ({
            id: dbNovel.id,
            title: dbNovel.title,
            chapter_count: dbNovel.total_chapters || 0,
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            tags: dbNovel.genres.map((g: any) => g.name),
            views: dbNovel.view_count || 0,
            updated_at: dbNovel.updated_at,
          }));
          setNovels(mapped);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load completed novels:", err);
        setLoading(false);
      });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isSortOpen && sortRef.current && !sortRef.current.contains(target)) setIsSortOpen(false);
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(target)) setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSortOpen, isFilterOpen]);

  // Reset to page 1 whenever sort/filter changes
  useEffect(() => { setPage(1); }, [sortBy, genreFilter]);

  // Helper to format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) {
      if (date.getDate() === now.getDate()) {
        return `${diffHours} giờ trước`;
      }
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()) {
      return 'Hôm qua';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredSorted = useMemo(() => {
    let result = genreFilter === 'all'
      ? novels
      : novels.filter(n => n.tags.some((t: string) => t.toLowerCase() === genreFilter.toLowerCase()));

    result = [...result];
    switch (sortBy) {
      case 'chapters':
        result.sort((a, b) => (b.chapter_count || 0) - (a.chapter_count || 0));
        break;
      case 'views':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return result;
  }, [novels, sortBy, genreFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pagedNovels = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 w-full min-h-screen">
        <div className="mb-10 border-b border-outline-variant/50 pb-4 animate-pulse">
          <div className="h-8 bg-outline-variant/30 rounded w-48 mb-2" />
          <div className="h-4 bg-outline-variant/30 rounded w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-surface border border-outline-variant/30 rounded-sm p-4 flex gap-4 h-[170px]">
              <div className="w-[84px] h-[116px] bg-outline-variant/30 rounded-sm shrink-0" />
              <div className="flex flex-col justify-between py-0.5 flex-grow space-y-2">
                <div>
                  <div className="h-3 bg-outline-variant/30 rounded w-16 mb-2" />
                  <div className="h-4 bg-outline-variant/30 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-outline-variant/30 rounded w-1/2" />
                </div>
                <div className="flex justify-between items-center mt-auto pt-1 border-t border-outline-variant/30">
                  <div className="h-3 bg-outline-variant/30 rounded w-12" />
                  <div className="h-3 bg-outline-variant/30 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 w-full min-h-screen font-sans">
      <div className="mb-6 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2 truncate">
          <ViconicIcon name="check_circle" size={24} className="text-primary shrink-0" />
          Truyện Hoàn Thành
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          Tổng hợp những bộ truyện đã dịch hoàn thành trọn bộ, đọc liền mạch cực đã không lo bị đứt quãng.
        </p>
      </div>

      {/* Sort & Filter Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Sort dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-outline-variant/50 bg-surface text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
          >
            <ViconicIcon name="sort" size={14} className="shrink-0" />
            <span>{SORT_LABELS[sortBy]}</span>
            <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
          </button>
          {isSortOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-surface border border-outline-variant/50 shadow-xl rounded-sm z-30 overflow-hidden">
              {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setIsSortOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors ${sortBy === opt ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/40'}`}
                >
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Genre filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-sm border border-outline-variant/50 bg-surface text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-colors max-w-[180px] sm:max-w-none"
          >
            <ViconicIcon name="filter_list" size={14} className="shrink-0" />
            <span className="truncate">{genreFilter === 'all' ? 'Tất cả thể loại' : genreFilter}</span>
            <ViconicIcon name="arrow_drop_down" size={16} className="shrink-0" />
          </button>
          {isFilterOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-56 max-h-72 overflow-y-auto bg-surface border border-outline-variant/50 shadow-xl rounded-sm z-30">
              <button
                onClick={() => { setGenreFilter('all'); setIsFilterOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors ${genreFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/40'}`}
              >
                Tất cả thể loại
              </button>
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => { setGenreFilter(g); setIsFilterOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors truncate ${genreFilter === g ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/40'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-on-surface-variant ml-auto font-medium">
          {filteredSorted.length} truyện
        </span>
      </div>

      {filteredSorted.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-outline-variant/50 rounded-sm bg-surface">
          <ViconicIcon name="check_circle" size={48} className="text-outline-variant mx-auto mb-4 block shrink-0" />
          <p className="text-on-surface-variant font-medium">Chưa có truyện nào hoàn thành.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pagedNovels.map((novel) => (
              <UpdateCard
                key={novel.id}
                id={novel.id}
                title={novel.title}
                chapter={`Chương ${novel.chapter_count}`}
                time={formatRelativeTime(novel.updated_at)}
                image={novel.cover}
                tags={novel.tags}
                views={novel.views}
              />
            ))}
          </div>

          <SimplePagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
};

export default CompletedNovelsPage;
