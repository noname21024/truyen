import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import NovelCard from '@/components/cards/NovelCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import SimplePagination from '@/components/ui/SimplePagination';
import { NovelService } from '@/lib/api';

const PAGE_SIZE = 24;

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
    const mapItem = (dbNovel: any) => ({
      id: dbNovel.id,
      title: dbNovel.title,
      update_time: dbNovel.updated_at,
      author: dbNovel.author || "Đang cập nhật",
      status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
      color: dbNovel.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-100 text-green-700 border-green-200',
      tags: (dbNovel.genres || []).map((g: any) => g.name),
      cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
      chapter_count: dbNovel.total_chapters || 0,
      views: dbNovel.view_count || 0,
      is_vip: dbNovel.is_vip,
    });

    if (!query.trim()) {
      return allNovels.map(mapItem);
    }

    const q = removeAccents(query.toLowerCase());
    return allNovels
      .filter(novel => {
        const titleMatch = removeAccents(novel.title.toLowerCase()).includes(q);
        const authorMatch = novel.author ? removeAccents(novel.author.toLowerCase()).includes(q) : false;
        const tagMatch = novel.genres ? novel.genres.some((g: any) => removeAccents(g.name.toLowerCase()).includes(q)) : false;
        return titleMatch || authorMatch || tagMatch;
      })
      .map(mapItem);
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
      ) : novels.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-w-0">
            {novels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((novel) => (
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
