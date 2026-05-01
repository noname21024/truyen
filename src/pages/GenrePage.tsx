import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import UpdateCard from '@/components/cards/UpdateCard';
import novelsData from '@/data/novelsIndex.json';
import { getAllNovelViews } from '@/lib/viewCountService';

type SortOption = 'newest' | 'chapters' | 'views' | 'words';

const GenrePage: React.FC = () => {
  const { genreId } = useParams<{ genreId: string }>();
  const viewsMap = getAllNovelViews();
  
  // Extract all unique genres from data
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novelsData.forEach(novel => {
      if (novel.tags) novel.tags.forEach(tag => genreSet.add(tag));
    });
    return Array.from(genreSet).sort();
  }, []);

  // Selected genres (start with the one from URL)
  const [selectedGenres, setSelectedGenres] = useState<string[]>(genreId ? [genreId] : []);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Sync URL genre on param change
  React.useEffect(() => {
    if (genreId && !selectedGenres.includes(genreId)) {
      setSelectedGenres([genreId]);
    }
  }, [genreId]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Filter novels — must contain ALL selected genres
  const filteredNovels = useMemo(() => {
    let result = novelsData.filter(novel => {
      if (selectedGenres.length === 0) return true;
      return selectedGenres.every(genre =>
        novel.tags && novel.tags.includes(genre)
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
        result = [...result].sort((a, b) => (viewsMap[b.id] || 0) - (viewsMap[a.id] || 0));
        break;
      case 'words':
        result = [...result].sort((a, b) => (b.word_count || 0) - (a.word_count || 0));
        break;
    }

    return result;
  }, [selectedGenres, sortBy, viewsMap]);

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10 w-full min-h-screen">
      <div className="mb-8 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-primary">category</span>
          Thể loại{selectedGenres.length === 1 ? `: ${selectedGenres[0]}` : ''}
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          {selectedGenres.length > 0 
            ? `Đang lọc: ${selectedGenres.join(', ')} — ${filteredNovels.length} kết quả`
            : `Tất cả ${novelsData.length} truyện`
          }
        </p>
      </div>

      {/* Genre Filter Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {allGenres.map(genre => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-sm border transition-colors ${
              selectedGenres.includes(genre)
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface text-on-surface-variant border-outline-variant/50 hover:border-primary hover:text-primary'
            }`}
          >
            {genre}
          </button>
        ))}
        {selectedGenres.length > 0 && (
          <button
            onClick={() => setSelectedGenres([])}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded-sm border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Xóa bộ lọc
          </button>
        )}
      </div>

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
      {filteredNovels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNovels.map((novel) => (
            <UpdateCard 
              key={novel.id}
              id={novel.id}
              title={novel.title} 
              chapter={`Chương ${novel.chapter_count || 1}`} 
              time="Mới cập nhật" 
              image={novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"}
              tags={novel.tags || []}
              views={viewsMap[novel.id] || 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-surface border border-outline-variant/50 rounded-sm">
          <span className="material-symbols-outlined text-4xl text-outline-variant mb-4 block">search_off</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Không tìm thấy truyện nào</h2>
          <p className="text-on-surface-variant mb-6">Thử chọn ít thể loại hơn hoặc xóa bộ lọc.</p>
          <button onClick={() => setSelectedGenres([])} className="text-primary hover:underline font-bold">Xóa bộ lọc</button>
        </div>
      )}
    </div>
  );
};

export default GenrePage;
