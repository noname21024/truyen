import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import UpdateCard from '@/components/cards/UpdateCard';
import novelsData from '@/data/novelsIndex.json';
import { getAllNovelViews } from '@/lib/viewCountService';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const viewsMap = getAllNovelViews();

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const filteredNovels = novelsData.filter(novel => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      novel.title.toLowerCase().includes(q) ||
      (novel.author && novel.author.toLowerCase().includes(q)) ||
      (novel.tags && novel.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: localQuery });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10 w-full min-h-screen">
      <div className="mb-10 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-4 flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-primary">search</span>
          Tìm kiếm
        </h1>
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Nhập tên truyện, tác giả, hoặc thể loại..."
            className="w-full bg-surface text-on-surface text-sm rounded-sm pl-10 pr-4 py-3 border border-outline-variant/50 focus:outline-none font-body-ui"
          />
        </form>
        {query && (
          <p className="font-body-ui text-on-surface-variant text-sm mt-3">
            Tìm thấy <strong className="text-on-surface">{filteredNovels.length}</strong> kết quả cho "<strong className="text-primary">{query}</strong>"
          </p>
        )}
      </div>

      {filteredNovels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
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
          <h2 className="text-xl font-bold text-on-surface mb-2">Không tìm thấy kết quả</h2>
          <p className="text-on-surface-variant mb-6">Thử tìm kiếm với từ khóa khác.</p>
          <Link to="/" className="text-primary hover:underline font-bold">Quay lại trang chủ</Link>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
