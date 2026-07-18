import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import UpdateCard from '@/components/cards/UpdateCard';
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
        document.title = `Truyện của ${authorData.name_vi || authorData.name_zh} | Pub Nih Truyện`;
        return NovelService.getNovels({ author: authorData.slug }).then(novelsData => {
          if (cancelled) return;
          const mapped = (novelsData || []).map(n => ({
            id: n.id,
            title: n.title,
            cover: n.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            tags: (n.genres || []).map(g => g.name),
            chapter_count: n.total_chapters || 0,
            views: n.view_count || 0,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-surface border border-outline-variant/30 rounded-sm p-3 flex gap-4 h-[136px]">
              <div className="w-20 h-28 bg-outline-variant/30 rounded-sm shrink-0" />
              <div className="flex flex-col justify-between py-1 flex-grow space-y-2">
                <div>
                  <div className="h-4 bg-outline-variant/30 rounded w-3/4 mb-1" />
                  <div className="h-4 bg-outline-variant/30 rounded w-1/2" />
                </div>
                <div className="h-3 bg-outline-variant/30 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : novels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {novels.map(novel => (
            <UpdateCard
              key={novel.id}
              id={novel.id}
              title={novel.title}
              chapter={`${novel.chapter_count || 0} chương`}
              time="Cập nhật"
              image={novel.cover}
              tags={novel.tags}
              views={novel.views}
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
