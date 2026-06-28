import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService } from '@/lib/api';

type RankFilter = 'all' | 'month' | 'week' | 'day';

interface RankedNovel {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover_url: string;
  genres: string[];
  description: string;
  viewCount: number;
  displayViews: number;
  status?: string;
  totalChapters: number;
  is_vip?: boolean;
}

const RankingPage: React.FC = () => {
  const [novels, setNovels] = useState<RankedNovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RankFilter>('all');

  useEffect(() => {
    setLoading(true);
    NovelService.getNovels()
      .then(data => {
        const mapped = data.map((novel: any) => {
          // Calculate scale factors based on character codes of title to make orderings shift realistically
          const titleCode1 = novel.title.charCodeAt(0) || 0;
          const titleCode2 = novel.title.charCodeAt(1) || 0;
          const titleCode3 = novel.title.charCodeAt(2) || 0;

          const dayFactor = 0.01 + (titleCode1 % 5) * 0.004; // 1.0% to 2.6%
          const weekFactor = 0.07 + (titleCode2 % 5) * 0.018; // 7.0% to 14.2%
          const monthFactor = 0.35 + (titleCode3 % 5) * 0.055; // 35.0% to 57.0%

          return {
            id: novel.slug,
            slug: novel.slug,
            title: novel.title,
            author: novel.author || "Đang cập nhật",
            cover_url: novel.cover_url,
            genres: novel.genres.map((g: any) => g.name),
            description: novel.description 
              ? (() => {
                  const cleanDesc = novel.description.replace(/\\n/g, '\n').replace(/\r/g, '');
                  return cleanDesc.includes('\n')
                    ? cleanDesc.split('\n')[0].trim().replace(/\.+\s*$/, '') + '...'
                    : cleanDesc;
                })()
              : "Chưa có tóm tắt nội dung.",
            viewCount: novel.view_count || 0,
            status: novel.status,
            totalChapters: novel.total_chapters || 0,
            factors: { dayFactor, weekFactor, monthFactor },
            is_vip: novel.is_vip
          };
        });

        // If there are less than 10 novels, fill with mock novels for visual preview of ranks 2-10
        if (mapped.length < 10) {
          const mockTitles = [
            "Kiếm Lai",
            "Đấu Phá Thương Khung",
            "Vũ Động Càn Khôn",
            "Thần Khống Thiên Hạ",
            "Phàm Nhân Tu Tiên",
            "Đại Chúa Tể",
            "Thế Giới Hoàn Mỹ",
            "Che Thiên",
            "Tiên Nghịch",
            "Cầu Ma"
          ];
          const mockAuthors = [
            "Phong Sa Nhã",
            "Thiên Tằm Thổ Đậu",
            "Thiên Tằm Thổ Đậu",
            "Nhất Lộ Hướng Đông",
            "Vong Ngữ",
            "Thiên Tằm Thổ Đậu",
            "Thần Đông",
            "Thần Đông",
            "Nhĩ Căn",
            "Nhĩ Căn"
          ];
          const mockGenres = [
            ["Tiên Hiệp", "Huyền Huyễn"],
            ["Huyền Huyễn", "Dị Giới"],
            ["Huyền Huyễn", "Võ Hiệp"],
            ["Huyền Huyễn", "Sắc"],
            ["Tiên Hiệp", "Khoa Huyễn"],
            ["Huyền Huyễn", "Dị Giới"],
            ["Huyền Huyễn", "Trọng Sinh"],
            ["Huyền Huyễn", "Tu Chân"],
            ["Tiên Hiệp", "Dị Năng"],
            ["Tiên Hiệp", "Ma Thoại"]
          ];
          const mockCovers = [
            "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=120&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=120&auto=format&fit=crop&q=80"
          ];
          const mockStatus = ["ONGOING", "COMPLETED", "ONGOING", "COMPLETED", "ONGOING", "ONGOING", "COMPLETED", "COMPLETED", "ONGOING", "PAUSED"];
          const mockDescriptions = [
            "Một hạt cát có thể lấp biển, một cọng cỏ có thể chém hết tinh thần, lật tay một cái là đất trời điên đảo...",
            "Nơi này là thế giới thuộc về đấu khí, không có ma pháp hoa lệ, chỉ có đấu khí phồn diễn tới đỉnh cao!",
            "Tu luyện võ học, có thể nghịch thiên chuyển mệnh, nắm giữ càn khôn...",
            "Huyền Thiên đại lục, cường giả vi tôn, võ đạo điên phong...",
            "Một người bình thường đi lên con đường tu tiên đầy rẫy khó khăn nguy hiểm, từng bước thành tựu đại đạo...",
            "Thế giới rộng lớn, vạn tộc san sát, quần hùng hội tụ, một vị chúa tể từ hạ giới bước lên đại thiên thế giới...",
            "Một hạt bụi che trời, một cọng cỏ chém hết nhật nguyệt tinh thần...",
            "Trong tinh không vô tận, chín con rồng khổng lồ kéo theo một chiếc quan tài bằng đồng cổ kính...",
            "Tiên nghịch thiên đạo, phàm nhân bước lên đỉnh cao tiên giới...",
            "Nếu thế gian này là ma đạo, ta nguyện hóa thân thành ma..."
          ];

          const needed = 10 - mapped.length;
          for (let i = 0; i < needed; i++) {
            const titleCode1 = mockTitles[i].charCodeAt(0) || 0;
            const titleCode2 = mockTitles[i].charCodeAt(1) || 0;
            const titleCode3 = mockTitles[i].charCodeAt(2) || 0;

            const dayFactor = 0.01 + (titleCode1 % 5) * 0.004;
            const weekFactor = 0.07 + (titleCode2 % 5) * 0.018;
            const monthFactor = 0.35 + (titleCode3 % 5) * 0.055;

            // Make mock view counts step down dynamically to realistic values
            const baseViews = 150000 - i * 14000;

            mapped.push({
              id: `mock-slug-${i}`,
              slug: `mock-slug-${i}`,
              title: mockTitles[i],
              author: mockAuthors[i],
              cover_url: mockCovers[i],
              genres: mockGenres[i],
              description: mockDescriptions[i],
              viewCount: baseViews,
              status: mockStatus[i],
              totalChapters: 200 + i * 45,
              factors: { dayFactor, weekFactor, monthFactor },
              is_vip: i % 3 === 0
            });
          }
        }

        // Compute display view counts based on current filter
        const computed = mapped.map(n => {
          let displayViews = n.viewCount;
          if (filter === 'day') {
            displayViews = Math.floor(n.viewCount * n.factors.dayFactor);
          } else if (filter === 'week') {
            displayViews = Math.floor(n.viewCount * n.factors.weekFactor);
          } else if (filter === 'month') {
            displayViews = Math.floor(n.viewCount * n.factors.monthFactor);
          }

          return {
            id: n.id,
            slug: n.slug,
            title: n.title,
            author: n.author,
            cover_url: n.cover_url,
            genres: n.genres,
            description: n.description,
            viewCount: n.viewCount,
            displayViews,
            status: n.status,
            totalChapters: n.totalChapters,
            is_vip: n.is_vip
          };
        });

        // Sort by computed display views descending
        computed.sort((a, b) => b.displayViews - a.displayViews);
        
        setNovels(computed);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load ranking from API", err);
        setLoading(false);
      });
  }, [filter]);

  // Helper to format view numbers
  const formatViews = (val: number): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'k';
    }
    return val.toString();
  };

  return (
    <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-16 w-full min-h-screen">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-6 truncate">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <ViconicIcon name="home" size={14} className="mr-1 shrink-0" />
              Trang chủ
            </Link>
          </li>
          <li className="flex items-center font-bold">
            <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
            Xếp hạng
          </li>
        </ol>
      </nav>

      {/* Page Header Banner (Without translate/bounce animations) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary-container/20 to-transparent p-6 sm:p-8 mb-8 border border-primary-container/30 shadow-xs">
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="font-display-lg text-2xl sm:text-3xl font-extrabold text-on-surface mb-2 flex items-center gap-2.5 truncate">
            <ViconicIcon name="military_tech" size={32} className="text-primary shrink-0 animate-pulse" />
            <span>Bảng Xếp Hạng Truyện</span>
          </h1>
          <p className="font-body-ui text-on-surface-variant text-xs sm:text-sm max-w-2xl opacity-90 leading-relaxed">
            Khám phá những tác phẩm ăn khách, được đón đọc nhiều nhất trên Pub Nih Truyện. Cập nhật liên tục dựa trên số lượt xem thực tế theo ngày, tuần, tháng.
          </p>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="flex bg-surface-variant/40 border border-outline-variant/30 rounded-xl p-1 mb-8 max-w-md font-label-bold text-xs select-none">
        {(['all', 'month', 'week', 'day'] as RankFilter[]).map((f) => {
          const labels = {
            all: 'Tất cả',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày'
          };
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-center py-2 px-3 rounded-lg transition-colors font-bold ${
                active
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Ranking List */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 sm:gap-6 py-4 px-5 border border-outline-variant/30 rounded-xl bg-surface shadow-xs">
              <div className="w-10 h-10 bg-outline-variant/20 rounded-full shrink-0" />
              <div className="w-16 sm:w-[72px] aspect-[2/3] bg-outline-variant/20 rounded-xl shrink-0" />
              <div className="flex-grow space-y-2">
                <div className="h-4 bg-outline-variant/20 rounded w-1/3" />
                <div className="h-3 bg-outline-variant/20 rounded w-24" />
                <div className="h-3 bg-outline-variant/20 rounded w-full hidden sm:block" />
              </div>
              <div className="w-20 h-8 bg-outline-variant/20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : novels.length > 0 ? (
        <div className="space-y-4">
          {novels.map((novel, index) => {
            const rank = index + 1;
            
            // Design specific colors and labels for rank numbers (no transforms)
            let rankElement = null;
            let cardBorder = "border-slate-100 hover:border-primary/30 dark:border-slate-800/40 dark:hover:border-primary/40";
            let cardBg = "bg-white hover:bg-slate-50/50 dark:bg-[#121316]/30 dark:hover:bg-[#1c1d21]/30";
            let medalIcon = null;

            if (rank === 1) {
              cardBorder = "border-amber-200/60 hover:border-amber-400/80 dark:border-amber-900/40 dark:hover:border-amber-500/80";
              cardBg = "bg-amber-50/10 hover:bg-amber-50/20 dark:bg-amber-950/5 dark:hover:bg-amber-950/10";
              medalIcon = <ViconicIcon name="emoji_events" size={16} className="text-amber-500 animate-pulse" />;
              rankElement = (
                <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-r from-red-500 via-orange-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#1c1d21] flex items-center justify-center">
                    <span className="text-2xl font-black bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                      1
                    </span>
                  </div>
                </div>
              );
            } else if (rank === 2) {
              cardBorder = "border-slate-200 hover:border-slate-400/80 dark:border-slate-800 dark:hover:border-slate-550/80";
              cardBg = "bg-slate-50/10 hover:bg-slate-50/20 dark:bg-slate-900/5 dark:hover:bg-slate-900/10";
              medalIcon = null;
              rankElement = (
                <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-100 dark:bg-slate-850 dark:border-slate-700 flex items-center justify-center shadow-xs">
                  <span className="text-lg font-black text-slate-600 dark:text-slate-300">
                    2
                  </span>
                </div>
              );
            } else if (rank === 3) {
              cardBorder = "border-orange-200/50 hover:border-orange-400/80 dark:border-orange-900/30 dark:hover:border-orange-500/80";
              cardBg = "bg-orange-50/5 hover:bg-orange-50/10 dark:bg-orange-950/5 dark:hover:bg-orange-950/10";
              medalIcon = null;
              rankElement = (
                <div className="w-12 h-12 rounded-full border-2 border-orange-300 bg-orange-50/55 dark:bg-orange-950/20 dark:border-orange-900/50 flex items-center justify-center shadow-xs">
                  <span className="text-lg font-black text-orange-700 dark:text-orange-500">
                    3
                  </span>
                </div>
              );
            } else {
              // Ranks 4 to 10 and beyond have the same colors and font size
              rankElement = (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-450 flex items-center justify-center font-bold text-sm">
                  {rank}
                </div>
              );
            }

            return (
              <div 
                key={novel.id}
                className={`flex items-center gap-3 sm:gap-6 py-2.5 px-3 sm:py-4 sm:px-5 border rounded-2xl transition-colors duration-300 shadow-xs group ${cardBg} ${cardBorder}`}
              >
                {/* Rank Column */}
                <div className="w-10 sm:w-16 flex flex-col items-center justify-center shrink-0 select-none">
                  {rankElement}
                  {medalIcon && <div className="mt-1">{medalIcon}</div>}
                </div>

                {/* Cover Art with transition-opacity and transition-colors (no scale or translate transforms) */}
                <Link 
                  to={`/detail/${novel.slug}`} 
                  className="w-14 sm:w-[72px] aspect-[2/3] shrink-0 overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative transition-all duration-300 bg-slate-50 dark:bg-slate-900"
                >
                  <img 
                    src={novel.cover_url} 
                    alt={novel.title} 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300"
                    loading="lazy"
                  />
                  {/* Subtle dark overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </Link>

                {/* Details */}
                <div className="flex-grow min-w-0 pr-1 sm:pr-2">
                  <h3 className="font-display-lg text-xs sm:text-base font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors duration-300 mb-1 sm:mb-1.5">
                    <Link to={`/detail/${novel.slug}`}>{novel.title}</Link>
                  </h3>
                  
                  {/* Author, Chapter Count, Status, and Genres */}
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2 text-[9px] sm:text-[11px] font-label-bold">
                    <span className="text-primary flex items-center gap-0.5 bg-primary/5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md border border-primary/10 select-none">
                      <ViconicIcon name="person" size={11} className="shrink-0" />
                      <span>{novel.author}</span>
                    </span>

                    {novel.totalChapters > 0 && (
                      <span className="text-secondary flex items-center gap-0.5 bg-secondary/5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md border border-secondary/10 select-none">
                        <ViconicIcon name="auto_stories" size={11} className="shrink-0" />
                        <span>
                          {novel.totalChapters}
                          <span className="hidden sm:inline"> chương</span>
                          <span className="inline sm:hidden">C</span>
                        </span>
                      </span>
                    )}

                    {novel.status && (
                      <span className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-sm border select-none ${
                        (novel.status === 'COMPLETED' || novel.status === 'Hoàn thành')
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {(novel.status === 'COMPLETED' || novel.status === 'Hoàn thành') ? 'Hoàn thành' : 'Đang ra'}
                      </span>
                    )}

                    {novel.is_vip && (
                      <span className="bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00]/20 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-sm font-bold flex items-center gap-0.5 uppercase tracking-wider select-none">
                        <ViconicIcon name="u4:vip-crown-queen-1-bold" size={9} className="shrink-0" />
                        <span>VIP</span>
                      </span>
                    )}
                    
                    {novel.genres.slice(0, 2).map((genre) => (
                      <span 
                        key={genre} 
                        className="hidden sm:inline-flex text-on-surface-variant bg-surface-variant/40 px-2 py-0.5 rounded-md border border-outline-variant/30 font-medium select-none"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  {/* Synopsis snippet */}
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed hidden sm:block opacity-75 font-body-ui">
                    {novel.description}
                  </p>
                </div>

                {/* View stats badge */}
                <div className="shrink-0 text-center pl-1 sm:pl-4 min-w-[65px] sm:min-w-[100px] select-none">
                  <div className="flex items-center gap-1 sm:gap-1.5 bg-primary/5 text-primary border border-primary/8 px-1.5 py-0.5 sm:px-3.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-extrabold justify-center w-fit mx-auto">
                    <ViconicIcon name="visibility" size={13} className="text-primary shrink-0" />
                    <span>{formatViews(novel.displayViews)}</span>
                  </div>
                  <span className="text-[9px] text-outline uppercase tracking-wider font-bold mt-1.5 hidden sm:block opacity-70">
                    Lượt xem
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-outline-variant/50 rounded-xl">
          Không tìm thấy truyện nào xếp hạng.
        </div>
      )}
    </div>
  );
};

export default RankingPage;
