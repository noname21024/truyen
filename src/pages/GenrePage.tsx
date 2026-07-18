import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UpdateCard from '@/components/cards/UpdateCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import SimplePagination from '@/components/ui/SimplePagination';
import { CategoryService, NovelService } from '@/lib/api';

type SortOption = 'newest' | 'chapters' | 'views' | 'words';

const PAGE_SIZE = 12;

const GenrePage: React.FC = () => {
  const { genreId } = useParams<{ genreId: string }>();
  const genreIdIsNumeric = !!genreId && /^\d+$/.test(genreId);

  const [genres, setGenres] = useState<string[]>([]);
  const [categoriesData, setCategoriesData] = useState<{ id: number; name: string }[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [novels, setNovels] = useState<any[]>([]);
  const [loadingNovels, setLoadingNovels] = useState(true);

  // Load genres from backend CategoryService
  useEffect(() => {
    setLoadingGenres(true);
    CategoryService.getCategories()
      .then(data => {
        if (data && data.length > 0) {
          setCategoriesData(data);
          setGenres(data.map(c => c.name).sort((a, b) => a.localeCompare(b)));
        }
      })
      .catch(err => {
        console.warn("Failed to load categories from API", err);
      })
      .finally(() => setLoadingGenres(false));
  }, []);

  // Load all novels from backend NovelService on mount to filter locally
  useEffect(() => {
    setLoadingNovels(true);
    NovelService.getNovels()
      .then(data => {
        if (data) {
          const mapped = data.map(dbNovel => ({
            id: dbNovel.id,
            title: dbNovel.title,
            author: dbNovel.author || "Đang cập nhật",
            status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            tags: (dbNovel.genres || []).map((g: any) => g.name),
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            chapter_count: dbNovel.total_chapters || 0,
            views: dbNovel.view_count || 0,
            update_time: dbNovel.updated_at,
            word_count: 0,
          }));
          setNovels(mapped);
        }
        setLoadingNovels(false);
      })
      .catch(err => {
        console.error("Failed to load novels for genre filtering", err);
        setNovels([]);
        setLoadingNovels(false);
      });
  }, []);

  // Selected genres (start with the one from URL — only if it's a legacy name-based link;
  // numeric id-based links resolve to a name once categories load, see effect below)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(genreId && !genreIdIsNumeric ? [genreId] : []);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => { setPage(1); }, [selectedGenres, sortBy]);

  // Auto-expand showAllGenres if any selected genre is not in the first 24
  useEffect(() => {
    if (selectedGenres.length > 0 && genres.length > 0) {
      const top24 = genres.slice(0, 24);
      const hasHiddenSelected = selectedGenres.some(g => !top24.some(topG => topG.toLowerCase() === g.toLowerCase()));
      if (hasHiddenSelected) {
        setShowAllGenres(true);
      }
    }
  }, [selectedGenres, genres]);

  const displayedGenres = showAllGenres ? genres : genres.slice(0, 24);

  // Sync URL genre on param change — supports both numeric id (new short links) and raw name (legacy links)
  useEffect(() => {
    if (!genreId) return;
    if (genreIdIsNumeric) {
      if (categoriesData.length === 0) return; // wait for categories to load before resolving
      const found = categoriesData.find(c => String(c.id) === genreId);
      if (found && !selectedGenres.includes(found.name)) {
        setSelectedGenres([found.name]);
      }
    } else if (!selectedGenres.includes(genreId)) {
      setSelectedGenres([genreId]);
    }
  }, [genreId, genreIdIsNumeric, categoriesData]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Filter novels — must contain ALL selected genres (case-insensitive)
  const filteredNovels = useMemo(() => {
    let result = novels.filter(novel => {
      if (selectedGenres.length === 0) return true;
      return selectedGenres.every(genre =>
        novel.tags && novel.tags.some((tag: string) => tag.toLowerCase() === genre.toLowerCase())
      );
    });

    // Sort
    switch (sortBy) {
      case 'newest':
        result = [...result].sort((a, b) => (b.update_time || '').localeCompare(a.update_time || ''));
        break;
      case 'chapters':
        result = [...result].sort((a, b) => (b.chapter_count || 0) - (a.chapter_count || 0));
        break;
      case 'views':
        result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'words':
        result = [...result].sort((a, b) => (b.word_count || 0) - (a.word_count || 0));
        break;
    }

    return result;
  }, [novels, selectedGenres, sortBy]);

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 w-full min-h-screen">
      <div className="mb-8 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2 truncate">
          <ViconicIcon name="f16:tag-multiple-20-filled" size={32} className="text-primary shrink-0" />
          Thể loại{selectedGenres.length === 1 ? `: ${selectedGenres[0]}` : ''}
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          {loadingNovels ? (
            "Đang tải danh sách truyện..."
          ) : selectedGenres.length > 0 
            ? `Đang lọc: ${selectedGenres.join(', ')} — ${filteredNovels.length} kết quả`
            : `Tất cả ${novels.length} truyện`
          }
        </p>
      </div>

      {/* Genre Filter Bar */}
      {loadingGenres ? (
        <div className="mb-6 flex flex-wrap gap-2 items-center animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
            <div key={n} className="h-7 bg-outline-variant/30 rounded" style={{ width: `${50 + Math.random() * 50}px` }} />
          ))}
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          {displayedGenres.map(genre => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`text-[11px] font-bold uppercase px-2.5 py-1.5 rounded-sm border transition-colors ${
                selectedGenres.includes(genre)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:border-primary hover:text-primary'
              }`}
            >
              {genre}
            </button>
          ))}

          {genres.length > 24 && (
            <button
              onClick={() => setShowAllGenres(!showAllGenres)}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-sm border border-dashed border-primary text-primary hover:bg-primary/5 transition-colors flex items-center gap-1"
            >
              <ViconicIcon name={showAllGenres ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} className="shrink-0" />
              {showAllGenres ? "Thu gọn" : `Xem thêm (${genres.length - 24})`}
            </button>
          )}

          {selectedGenres.length > 0 && (
            <button
              onClick={() => setSelectedGenres([])}
              className="text-[11px] font-bold px-2.5 py-1.5 rounded-sm border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center gap-1"
            >
              <ViconicIcon name="close" size={14} className="shrink-0" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Sort Bar */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-on-surface-variant font-bold">Sắp xếp:</span>
        {([
          { key: 'newest' as SortOption, label: 'Mới nhất' },
          { key: 'chapters' as SortOption, label: 'Nhiều chương' },
          { key: 'views' as SortOption, label: 'Nhiều lượt xem' },
          { key: 'words' as SortOption, label: 'Nhiều chữ' },
        ]).map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-sm border transition-colors ${
              sortBy === opt.key
                ? 'bg-on-surface text-surface border-on-surface'
                : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:border-primary hover:text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loadingNovels ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-surface border border-outline-variant/30 rounded-sm p-3 flex gap-4 h-[136px]">
              <div className="w-20 h-28 bg-outline-variant/30 rounded-sm shrink-0" />
              <div className="flex flex-col justify-between py-1 flex-grow space-y-2">
                <div>
                  <div className="h-3 bg-outline-variant/30 rounded w-16 mb-2" />
                  <div className="h-4 bg-outline-variant/30 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-outline-variant/30 rounded w-1/2" />
                </div>
                <div className="flex justify-between items-center mt-auto pt-2 border-t border-outline-variant/30">
                  <div className="h-3 bg-outline-variant/30 rounded w-12" />
                  <div className="h-3 bg-outline-variant/30 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNovels.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNovels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((novel) => (
              <UpdateCard
                key={novel.id}
                id={novel.id}
                title={novel.title}
                chapter={`Chương ${novel.chapter_count || 1}`}
                time="Mới cập nhật"
                image={novel.cover}
                tags={novel.tags}
                views={novel.views}
              />
            ))}
          </div>
          <SimplePagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(filteredNovels.length / PAGE_SIZE))}
            onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="mt-8"
          />
        </>
      ) : (
        <div className="text-center py-20 bg-surface border border-outline-variant/50 rounded-sm">
          <ViconicIcon name="search_off" size={40} className="text-outline-variant mb-4 block mx-auto shrink-0" />
          <h2 className="text-xl font-bold text-on-surface mb-2">Không tìm thấy truyện nào</h2>
          <p className="text-on-surface-variant mb-6">Thử chọn ít thể loại hơn hoặc xóa bộ lọc.</p>
          <button onClick={() => setSelectedGenres([])} className="text-primary hover:underline font-bold">Xóa bộ lọc</button>
        </div>
      )}
    </div>
  );
};

export default GenrePage;
