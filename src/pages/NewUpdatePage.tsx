import React, { useState, useEffect } from 'react';
import UpdateCard from '@/components/cards/UpdateCard';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService } from '@/lib/api';

const NewUpdatePage: React.FC = () => {
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    NovelService.getNovels()
      .then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(dbNovel => ({
            id: dbNovel.slug,
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
        console.error("Failed to load novels for new updates:", err);
        setLoading(false);
      });
  }, []);

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

  // Helper to check if updated today
  const isUpdatedToday = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Split novels into today and older updates
  const todayNovels = novels.filter(n => isUpdatedToday(n.updated_at));
  const olderNovels = novels.filter(n => !isUpdatedToday(n.updated_at));

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-8 py-10 w-full min-h-screen">
        <div className="mb-10 border-b border-outline-variant/50 pb-4 animate-pulse">
          <div className="h-8 bg-outline-variant/30 rounded w-48 mb-2" />
          <div className="h-4 bg-outline-variant/30 rounded w-96" />
        </div>
        
        <div className="space-y-10 animate-pulse">
          <div>
            <div className="h-6 bg-outline-variant/30 rounded w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="bg-surface border border-outline-variant/30 rounded-sm p-2.5 flex gap-3 h-[136px]">
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
        </div>
      </div>
    );
  }

  const hasContent = todayNovels.length > 0 || olderNovels.length > 0;

  return (
    <div className="max-w-[1300px] mx-auto px-8 py-10 w-full min-h-screen">
      <div className="mb-10 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2 truncate">
          <ViconicIcon name="update" size={24} className="text-primary shrink-0" />
          Mới cập nhật
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          Luôn dẫn đầu xu hướng với những chương truyện mới nhất được cập nhật liên tục mỗi phút.
        </p>
      </div>

      {!hasContent ? (
        <div className="text-center py-20 border border-dashed border-outline-variant/50 rounded-sm bg-surface">
          <ViconicIcon name="update" size={48} className="text-outline-variant mx-auto mb-4 block shrink-0" />
          <p className="text-on-surface-variant font-medium">Chưa có truyện nào được cập nhật gần đây.</p>
        </div>
      ) : (
        <>
          {/* Today Section */}
          {todayNovels.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display-lg text-lg sm:text-xl text-on-surface mb-4 flex items-center gap-2 truncate">
                <ViconicIcon name="calendar_today" size={24} className="text-primary shrink-0" />
                Hôm nay
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {todayNovels.map((novel) => (
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
            </section>
          )}

          {/* Những ngày trước Section */}
          {olderNovels.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display-lg text-lg sm:text-xl text-on-surface mb-4 flex items-center gap-2 truncate">
                <ViconicIcon name="history" size={24} className="text-outline shrink-0" />
                Những ngày trước
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {olderNovels.map((novel) => (
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
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default NewUpdatePage;
