import React, { useState, useEffect, useMemo, useRef } from 'react';
import NovelCard from '@/components/cards/NovelCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import SimplePagination from '@/components/ui/SimplePagination';
import { CategoryService, NovelService } from '@/lib/api';

type SortOption = 'newest' | 'chapters' | 'views' | 'follows' | 'comments';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Mới hoàn thành',
  chapters: 'Nhiều chương nhất',
  views: 'Nhiều lượt xem nhất',
  follows: 'Nhiều theo dõi nhất',
  comments: 'Nhiều bình luận nhất',
};

const PAGE_SIZE = 24;

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
            author: dbNovel.author || "Đang cập nhật",
            status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            color: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
            chapter_count: dbNovel.total_chapters || 0,
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            tags: (dbNovel.genres || []).map((g: any) => g.name),
            views: dbNovel.view_count || 0,
            follows: dbNovel.follow_count || 0,
            comments: dbNovel.comment_count || 0,
            updated_at: dbNovel.updated_at,
            is_vip: dbNovel.is_vip,
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
      case 'follows':
        result.sort((a, b) => (b.follows || 0) - (a.follows || 0));
        break;
      case 'comments':
        result.sort((a, b) => (b.comments || 0) - (a.comments || 0));
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
            <div key={n} className="bg-surface border border-outline-variant/30 rounded-sm overflow-hidden flex flex-col h-[280px]">
              <div className="h-48 bg-outline-variant/30 w-full" />
              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div className="h-4 bg-outline-variant/30 rounded w-3/4" />
                <div className="h-3 bg-outline-variant/30 rounded w-1/2" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pagedNovels.map((novel) => (
              <NovelCard
                key={novel.id}
                id={novel.id}
                title={novel.title}
                author={novel.author}
                status={novel.status}
                statusColor={novel.color}
                image={novel.cover}
                views={novel.views}
                isVip={novel.is_vip}
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
