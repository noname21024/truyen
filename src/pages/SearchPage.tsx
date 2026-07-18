import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import UpdateCard from '@/components/cards/UpdateCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import SimplePagination from '@/components/ui/SimplePagination';
import { NovelService } from '@/lib/api';

const PAGE_SIZE = 12;

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [allNovels, setAllNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => { setPage(1); }, [query]);

  // Load all novels from backend on mount
  useEffect(() => {
    setLoading(true);
    NovelService.getNovels()
      .then(data => {
        if (data) {
          setAllNovels(data);
        } else {
          setAllNovels([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load search novels list", err);
        setAllNovels([]);
        setLoading(false);
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

  // Filter novels locally
  const novels = useMemo(() => {
    if (!query.trim()) {
      // If query is empty, show all novels
      return allNovels.map(dbNovel => ({
        id: dbNovel.id,
        title: dbNovel.title,
        author: dbNovel.author || "Đang cập nhật",
        status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
        tags: (dbNovel.genres || []).map((g: any) => g.name),
        cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
        chapter_count: dbNovel.total_chapters || 0,
        views: dbNovel.view_count || 0,
      }));
    }

    const q = removeAccents(query.toLowerCase());
    return allNovels
      .filter(novel => {
        const titleMatch = removeAccents(novel.title.toLowerCase()).includes(q);
        const authorMatch = novel.author ? removeAccents(novel.author.toLowerCase()).includes(q) : false;
        const tagMatch = novel.genres ? novel.genres.some((g: any) => removeAccents(g.name.toLowerCase()).includes(q)) : false;
        return titleMatch || authorMatch || tagMatch;
      })
      .map(dbNovel => ({
        id: dbNovel.id,
        title: dbNovel.title,
        author: dbNovel.author || "Đang cập nhật",
        status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
        tags: (dbNovel.genres || []).map((g: any) => g.name),
        cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
        chapter_count: dbNovel.total_chapters || 0,
        views: dbNovel.view_count || 0,
      }));
  }, [query, allNovels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: localQuery });
  };

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 w-full min-h-screen">
      <div className="mb-10 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-4 flex items-center gap-2 truncate">
          <ViconicIcon name="search" size={24} className="text-primary shrink-0" />
          Tìm kiếm
        </h1>
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <ViconicIcon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant shrink-0" />
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
            Tìm thấy <strong className="text-on-surface">{novels.length}</strong> kết quả cho "<strong className="text-primary">{query}</strong>"
          </p>
        )}
      </div>

      {loading ? (
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
      ) : novels.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0">
            {novels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((novel) => (
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
            totalPages={Math.max(1, Math.ceil(novels.length / PAGE_SIZE))}
            onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="mt-8"
          />
        </>
      ) : (
        <div className="text-center py-20 bg-surface border border-outline-variant/50 rounded-sm">
          <ViconicIcon name="search_off" size={40} className="text-outline-variant mb-4 block mx-auto shrink-0" />
          <h2 className="text-xl font-bold text-on-surface mb-2">Không tìm thấy kết quả</h2>
          <p className="text-on-surface-variant mb-6">Thử tìm kiếm với từ khóa khác.</p>
          <Link to="/" className="text-primary hover:underline font-bold">Quay lại trang chủ</Link>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
