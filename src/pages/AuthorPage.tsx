import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NovelCard from '@/components/cards/NovelCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { AuthorService, NovelService, type Author } from '@/lib/api';

const AuthorPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    // The URL param can be either the numeric id (new short links) or the legacy slug —
    // fetch the author first, then use its real slug to filter novels (backend expects a slug there).
    AuthorService.getAuthorDetail(slug)
      .then(authorData => {
        if (cancelled) return;
        setAuthor(authorData);
        const authorName = authorData.name_vi || authorData.name_zh || "Đang cập nhật";
        document.title = `Truyện của ${authorName} | Pub Nih Truyện`;
        return NovelService.getNovels({ author: authorData.slug }).then(novelsData => {
          if (cancelled) return;
          const mapped = (novelsData || []).map(n => ({
            id: n.id,
            title: n.title,
            author: n.author || authorName,
            status: n.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            color: n.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-100 text-green-700 border-green-200',
            update_time: n.updated_at,
            cover: n.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            tags: (n.genres || []).map(g => g.name),
            chapter_count: n.total_chapters || 0,
            views: n.view_count || 0,
            is_vip: n.is_vip,
          }));
          mapped.sort((a, b) => b.views - a.views);
          setNovels(mapped);
        });
      })
      .catch(err => {
        console.error("Failed to load author detail", err);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  const displayName = author?.name_vi || author?.name_zh || slug;

  if (!loading && notFound) {
    return (
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-16 w-full min-h-screen text-center">
        <ViconicIcon name="person_off" size={40} className="text-outline-variant mb-4 block mx-auto shrink-0" />
        <h1 className="font-display-lg text-xl mb-2">Không tìm thấy tác giả</h1>
        <Link to="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 w-full min-h-screen">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-6 truncate">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <ViconicIcon name="home" size={14} className="mr-1 shrink-0" />
              Trang chủ
            </Link>
          </li>
          <li className="flex items-center font-bold truncate">
            <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
            <span className="truncate">{loading ? "Đang tải..." : displayName}</span>
          </li>
        </ol>
      </nav>

      {/* Author Header */}
      <div className="mb-8 border-b border-outline-variant/50 pb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ViconicIcon name="person" size={32} className="text-primary" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <div className="h-6 bg-outline-variant/30 rounded w-48 mb-2 animate-pulse" />
              <div className="h-4 bg-outline-variant/30 rounded w-32 animate-pulse" />
            </>
          ) : (
            <>
              <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface truncate">
                {displayName}
              </h1>
              <p className="font-body-ui text-on-surface-variant text-sm mt-1 flex items-center gap-1.5">
                <ViconicIcon name="auto_stories" size={14} className="text-primary shrink-0" />
                Đã sáng tác <strong className="text-primary">{author?.story_count ?? novels.length}</strong> truyện
              </p>
            </>
          )}
        </div>
      </div>

      {/* Story Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {novels.map(novel => (
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
      ) : (
        <div className="text-center py-20 bg-surface border border-outline-variant/50 rounded-sm">
          <ViconicIcon name="search_off" size={40} className="text-outline-variant mb-4 block mx-auto shrink-0" />
          <h2 className="text-lg font-bold text-on-surface">Tác giả này chưa có truyện nào.</h2>
        </div>
      )}
    </div>
  );
};

export default AuthorPage;
