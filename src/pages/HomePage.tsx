import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NovelCard from '@/components/cards/NovelCard';
import RankItem from '@/components/cards/RankItem';
import CategoryItem from '@/components/cards/CategoryItem';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import novelsDataJson from '@/data/novelsIndex.json';
import { getAllNovelViews } from '@/lib/viewCountService';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { CategoryService, NovelService } from '@/lib/api';

const novelsData = novelsDataJson as any[];

const CATEGORY_ICONS: Record<string, string> = {
  "3s": "bolt",
  "báo thù": "gavel",
  "be": "heart_broken",
  "cán bộ cao cấp": "shield_person",
  "cận đại": "history",
  "cao thủ đô thị": "domain",
  "chức nghiệp tinh anh": "work",
  "có cp": "favorite",
  "cổ đại": "castle",
  "cơ giới khoa học kỹ thuật": "settings",
  "cung đấu": "gavel",
  "cưới trước yêu sau": "favorite",
  "cường giả": "fitness_center",
  "cường thủ hào đoạt": "gavel",
  "dị chủng": "pets",
  "dị giới": "public",
  "dị năng": "psychology",
  "dị năng đô thị": "location_city",
  "điền văn": "grass",
  "đô thị": "domain",
  "đoàn sủng": "group",
  "e-sport": "sports_esports",
  "ge": "favorite",
  "gia đấu": "home",
  "giả heo ăn thịt hổ": "pets",
  "gia tộc thế gia": "group",
  "gương vỡ lại lành": "heart_broken",
  "h văn": "favorite",
  "hắc bang": "security",
  "hắc hóa": "dark_mode",
  "hài hước": "sentiment_very_satisfied",
  "hai thế giới": "public",
  "hào môn": "domain",
  "he": "favorite",
  "hệ thống": "settings",
  "hiện đại": "location_city",
  "hồn xuyên": "psychology",
  "huyền học": "psychology",
  "huyền huyễn": "wand_stars",
  "huyền môn": "door_front",
  "huyễn tưởng": "cloud",
  "kết hôn trước yêu sau": "favorite",
  "khoa học viễn tưởng": "science",
  "không gian tùy thân": "cloud",
  "kinh dị": "skull",
  "làm ruộng": "grass",
  "lãng mạn huyền ảo": "wand_shine",
  "lãng mạng cổ đại": "favorite",
  "lịch sử cổ đại": "history",
  "liên hành tinh": "rocket",
  "linh dị": "skull",
  "livestream": "videocam",
  "mạt thế": "coronavirus",
  "mỹ thực": "restaurant",
  "nam cường": "fitness_center",
  "ngôn tình": "favorite",
  "ngược": "heart_broken",
  "nhiều nam chính": "group",
  "nhiều nữ chính": "group",
  "niên đại": "history",
  "no cp": "heart_broken",
  "nữ cường": "woman",
  "nữ phụ văn": "woman",
  "nữ tôn": "woman",
  "nữ truy": "favorite",
  "nuôi con": "baby_changing_station",
  "oe": "favorite",
  "phá án": "search",
  "phản diện": "skull",
  "phiêu lưu": "explore",
  "phó bản": "map",
  "phó bản trò chơi": "sports_esports",
  "quân hôn": "shield_person",
  "quần tượng": "group",
  "quyền đấu": "gavel",
  "sảng văn": "sentiment_very_satisfied",
  "se": "heart_broken",
  "showbiz": "movie",
  "sinh tồn": "fitness_center",
  "song khiết": "favorite",
  "sư đồ luyến": "school",
  "sủng ngọt": "favorite",
  "tận thế": "coronavirus",
  "tận thế cực hàn": "ac_unit",
  "thanh mai trúc mã": "favorite",
  "thanh thủy văn": "water_drop",
  "thanh xuân vườn trường": "school",
  "thế thân": "group",
  "thiên kim thật - giả": "group",
  "tích trữ vật tư": "inventory_2",
  "tiên hiệp": "self_improvement",
  "tình cảm đơn phương": "favorite",
  "tổng tài": "domain",
  "trinh thám": "search",
  "trò chơi sinh tồn": "sports_esports",
  "trọng sinh": "history",
  "truy thê hỏa táng tràng": "favorite",
  "tu tiên": "self_improvement",
  "vả mặt": "gavel",
  "vô hạn lưu": "all_inclusive",
  "võ thuật": "sports_martial_arts",
  "xuyên không": "star_shine",
  "xuyên nhanh": "rocket",
  "xuyên sách": "menu_book",
  "y thuật": "medical_services",
  "zombie": "coronavirus",
  "chữa lành": "healing",
  "không gian": "crop_free",
  "nữ chính thần y": "medical_services",
  "song cường": "diversity_1",
  "thiên tai": "tsunami",
  "trồng trọt": "agriculture"
};

const HomePage: React.FC = () => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const viewsMap = getAllNovelViews();
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Array<{ icon: string; name: string }>>([
    { icon: "favorite", name: "Lãng Mạn" },
    { icon: "swords", name: "Hành Động" },
    { icon: "wand_stars", name: "Isekai" },
    { icon: "local_cafe", name: "Đời Thường" },
    { icon: "school", name: "Học Đường" },
    { icon: "mystery", name: "Bí Ẩn" },
    { icon: "star_shine", name: "Xuyên không" },
    { icon: "settings", name: "Hệ thống" },
    { icon: "coronavirus", name: "Mạt thế" },
    { icon: "inventory_2", name: "Tích trữ vật tư" },
  ]);

  useEffect(() => {
    CategoryService.getCategories()
      .then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(c => {
            const lower = c.name.toLowerCase();
            const icon = CATEGORY_ICONS[lower] || "category";
            return { icon, name: c.name };
          });
          setCategories(mapped);
        }
      })
      .catch(err => {
        console.warn("Failed to fetch categories from API, using static default list", err);
      });

    // Fetch dynamic novels from backend API
    NovelService.getNovels()
      .then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(dbNovel => ({
            id: dbNovel.slug,
            title: dbNovel.title,
            author: dbNovel.author || "Đang cập nhật",
            status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            tags: dbNovel.genres.map((g: any) => g.name),
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            intro: dbNovel.description ? dbNovel.description.replace(/\\n/g, '\n') : "",
            word_count: 0,
            chapter_count: dbNovel.total_chapters || 0,
            update_time: dbNovel.updated_at,
            view_count: dbNovel.view_count || 0,
            is_vip: dbNovel.is_vip,
          }));
          setNovels(mapped);
        } else {
          setNovels(novelsData);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load novels from API, using static default list", err);
        setNovels(novelsData);
        setLoading(false);
      });
  }, []);

  // Dynamic novel updates mapped from the real data
  const novelUpdates = novels.map(novel => ({
    id: novel.id,
    title: novel.title,
    author: novel.author || "Đang cập nhật",
    status: novel.status,
    color: novel.status === 'Hoàn thành' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200',
    img: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
    views: novel.view_count || 0,
    is_vip: novel.is_vip
  }));

  // Dynamic completed novels mapped from real data
  const completedNovels = novels.filter(n => n.status === 'Hoàn thành').map(novel => ({
    id: novel.id,
    title: novel.title,
    author: novel.author || "Đang cập nhật",
    status: novel.status,
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    img: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
    views: novel.view_count || 0,
    is_vip: novel.is_vip
  }));

  // Map novels from novelsData for hot section
  const hotNovels = novels.map(novel => ({
    id: novel.id,
    title: novel.title,
    author: novel.author || "Đang cập nhật",
    intro: novel.intro || "",
    tags: novel.tags || [],
    cover: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
    // Use the novel cover or a fallback scenery image as banner background
    banner: novel.cover || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80",
    status: novel.status
  }));

  // Fallback to high quality mock hot novels if the database is small, to showcase a beautiful carousel
  const finalHotNovels = [...hotNovels];

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 6);

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-8 py-10 space-y-16 animate-pulse w-full min-h-screen">
        {/* Hero Banner Skeleton */}
        <div className="h-[360px] md:h-[420px] bg-outline-variant/30 rounded-xl" />
        
        {/* Categories Section */}
        <div>
          <div className="h-6 bg-outline-variant/30 rounded w-36 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="h-10 bg-outline-variant/30 rounded" />
            ))}
          </div>
        </div>

        {/* Story Grid Section */}
        <div>
          <div className="h-6 bg-outline-variant/30 rounded w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl border border-outline-variant/20 bg-surface-container/30">
                <div className="w-[80px] sm:w-[90px] aspect-[2/3] bg-outline-variant/30 rounded-lg shrink-0" />
                <div className="flex flex-col justify-between py-1 flex-grow space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 bg-outline-variant/30 rounded w-3/4" />
                    <div className="h-3 bg-outline-variant/30 rounded w-1/2" />
                    <div className="h-3 bg-outline-variant/30 rounded w-full" />
                    <div className="h-3 bg-outline-variant/30 rounded w-[85%]" />
                  </div>
                  <div className="flex gap-1.5 mt-auto">
                    <div className="h-5 bg-outline-variant/30 rounded w-14" />
                    <div className="h-5 bg-outline-variant/30 rounded w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Swiper Section */}
      <div className="max-w-[1300px] mx-auto px-8 pt-6">
        <section className="w-full relative bg-surface overflow-hidden rounded-xl border border-outline-variant/30 shadow-md">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={0}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            className="h-[360px] md:h-[420px] w-full hero-swiper"
          >
            {finalHotNovels.map((novel) => (
              <SwiperSlide key={novel.id} className="relative w-full h-full flex items-center justify-center">
                {/* Background with blur / overlay */}
                <div className="absolute inset-0 z-0 select-none pointer-events-none">
                  <img 
                    alt={novel.title} 
                    className="w-full h-full object-cover opacity-[0.45] dark:opacity-[0.25] scale-105 blur-[3px]" 
                    src={novel.banner} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/75 to-transparent dark:from-slate-950 dark:via-slate-950/75 dark:to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
                </div>

                {/* Slide Content */}
                <div className="relative z-10 w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center h-full px-8 md:px-12 py-6">
                  {/* Left Text details */}
                  <div className="md:col-span-8 flex flex-col justify-center text-left">
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      <span className="bg-primary/15 text-primary text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm border border-primary/20">
                        TRUYỆN HOT
                      </span>
                      <span className="bg-surface-variant text-on-surface-variant text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm border border-outline-variant/30">
                        {novel.status}
                      </span>
                      {novel.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="bg-surface-container text-on-surface-variant/90 text-[10px] px-2.5 py-1 rounded-sm border border-outline-variant/20 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h2 className="font-display-lg text-xl sm:text-2xl md:text-3xl lg:text-4xl text-on-surface mb-2.5 line-clamp-2 leading-[1.2] font-bold tracking-tight">
                      {novel.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-on-surface-variant/80 font-semibold mb-4 flex items-center gap-1.5">
                      <ViconicIcon name="person" size={14} className="text-primary shrink-0" />
                      {novel.author}
                    </p>

                    <p className="font-body-reading text-xs sm:text-sm text-on-surface-variant/90 mb-5 line-clamp-2 md:line-clamp-3 max-w-2xl leading-relaxed">
                      {novel.intro}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {novel.id.startsWith("mock") ? (
                        <button className="bg-primary/40 text-on-primary/60 font-label-bold px-5 py-2.5 rounded-sm flex items-center gap-2 cursor-not-allowed text-xs">
                          <ViconicIcon name="menu_book" size={15} className="shrink-0" />
                          Đọc Ngay (Bản Thử)
                        </button>
                      ) : (
                        <Link 
                          to={`/detail/${novel.id}`}
                          className="bg-primary text-on-primary font-label-bold px-5 py-2.5 rounded-sm hover:bg-primary/95 transition-colors flex items-center gap-2 shadow-lg shadow-primary/25 text-xs"
                        >
                          <ViconicIcon name="menu_book" size={15} className="shrink-0" />
                          Đọc Ngay
                        </Link>
                      )}
                      
                      {!novel.id.startsWith("mock") && (
                        <Link 
                          to={`/detail/${novel.id}`}
                          className="bg-surface border border-outline text-on-surface font-label-bold px-5 py-2.5 rounded-sm hover:bg-surface-variant transition-colors text-xs"
                        >
                          Chi Tiết
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Right Book Cover */}
                  <div className="hidden md:col-span-4 md:flex justify-center items-center">
                    <div className="relative group/cover w-[150px] lg:w-[180px] aspect-[2/3] rounded-sm overflow-hidden shadow-xl shadow-black/30 border border-outline-variant/30 transform rotate-1 transition-transform duration-300 hover:rotate-0">
                      <img 
                        alt={novel.title} 
                        className="w-full h-full object-cover" 
                        src={novel.cover}
                        loading="eager"
                      />
                      {!novel.id.startsWith("mock") && (
                        <Link 
                          to={`/detail/${novel.id}`}
                          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3"
                        >
                          <span className="bg-white/90 text-primary font-bold text-[10px] px-2.5 py-1 rounded-sm flex items-center gap-1 shadow-md">
                            <ViconicIcon name="play_arrow" size={12} className="shrink-0" /> Chi tiết
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-10 space-y-16">
        {/* Hôm Nay Đọc Gì Section */}
        <section>
          <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
            <div>
              <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                <ViconicIcon name="auto_stories" size={24} className="text-primary shrink-0" />
                Hôm Nay Đọc Gì?
              </h2>
            </div>
            <span className="text-xs text-on-surface-variant italic font-medium">Gợi ý ngẫu nhiên mỗi ngày</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalHotNovels.map((novel) => (
              <Link
                key={novel.id}
                to={novel.id.startsWith("mock") ? "#" : `/detail/${novel.id}`}
                data-novel-slug={novel.id.startsWith("mock") ? undefined : novel.id}
                className={`flex gap-4 bg-surface-container/30 border border-outline-variant/30 hover:border-primary p-4 rounded-xl transition-all duration-300 group ${novel.id.startsWith("mock") ? "cursor-not-allowed opacity-90" : ""}`}
              >
                {/* Book cover image */}
                <div className="w-[80px] sm:w-[90px] aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                  <img 
                    alt={novel.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    src={novel.cover} 
                  />
                </div>

                {/* Book Info */}
                <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
                  <div>
                    <h3 className="font-label-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1 mb-1 font-bold leading-tight">
                      {novel.title}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant/80 flex items-center gap-1 mb-2">
                      <ViconicIcon name="person" size={12} className="text-primary/70 shrink-0" />
                      <span className="truncate">{novel.author}</span>
                    </p>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-2 whitespace-pre-line">
                      {novel.intro}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {novel.tags.slice(0, 2).map((tag: string, idx: number) => (
                      <span key={idx} className="bg-surface-variant text-on-surface-variant text-[9px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Mới Cập Nhật Section */}
        <section>
          <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
            <div>
              <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                <ViconicIcon name="update" size={24} className="text-primary shrink-0" />
                Mới Cập Nhật
              </h2>
            </div>
            <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/new-update">
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {novelUpdates.slice(0, 18).map((novel) => (
              <NovelCard 
                key={novel.id}
                id={novel.id}
                title={novel.title} 
                author={novel.author} 
                status={novel.status} 
                statusColor={novel.color} 
                image={novel.img}
                views={novel.views}
                isVip={novel.is_vip}
              />
            ))}
          </div>
        </section>

        {/* Truyện Đã Hoàn Thành Section */}
        {completedNovels.length > 0 && (
          <section>
            <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
              <div>
                <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                  <ViconicIcon name="check_circle" size={24} className="text-primary shrink-0" />
                  Truyện Đã Hoàn Thành
                </h2>
              </div>
              <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/genres">
                Xem tất cả →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {completedNovels.slice(0, 6).map((novel) => (
                <NovelCard 
                  key={novel.id}
                  id={novel.id}
                  title={novel.title} 
                  author={novel.author} 
                  status={novel.status} 
                  statusColor={novel.color} 
                  image={novel.img}
                  views={novel.views}
                  isVip={novel.is_vip}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bảng Xếp Hạng Section */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* BXH */}
            <div className="lg:col-span-8">
              <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
                <div>
                  <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                    <ViconicIcon name="trending_up" size={24} className="text-primary shrink-0" />
                    Bảng Xếp Hạng
                  </h2>
                </div>
                <div className="flex gap-1">
                  <button className="px-3 py-1 bg-primary text-on-primary text-xs font-bold rounded-sm">Tháng</button>
                  <button className="px-3 py-1 bg-surface-variant text-on-surface-variant text-xs font-bold hover:bg-surface-dim transition-colors rounded-sm">Tuần</button>
                </div>
              </div>
              <div className="bg-surface border border-outline-variant/50 p-2 space-y-1">
                {novels.slice(0, 3).map((novel, index) => {
                  let rankColor = "text-on-surface-variant";
                  if (index === 0) rankColor = "text-amber-500";
                  else if (index === 1) rankColor = "text-slate-400";
                  else if (index === 2) rankColor = "text-orange-400";

                  return (
                    <RankItem 
                      key={novel.id}
                      id={novel.id}
                      rank={index + 1} 
                      title={novel.title} 
                      category={novel.tags && novel.tags.length > 0 ? novel.tags[0] : "Chưa có"} 
                      reads={`${novel.view_count !== undefined ? novel.view_count : (viewsMap[novel.id] || 0)} lượt xem`} 
                      image={novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"}
                      rankColor={rankColor}
                    />
                  );
                })}
              </div>
            </div>

            {/* Thể Loại */}
            <div className="lg:col-span-4">
              <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface mb-6 border-b border-outline-variant/50 pb-4 flex items-center gap-2 truncate">
                <ViconicIcon name="category" size={24} className="text-primary shrink-0" />
                Thể Loại
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {displayedCategories.map((cat, index) => (
                  <CategoryItem key={index} icon={cat.icon} name={cat.name} />
                ))}
              </div>
              {categories.length > 6 && (
                <button 
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="w-full mt-4 py-2 bg-surface-variant text-on-surface-variant font-bold text-xs rounded-sm hover:bg-surface-dim transition-colors flex items-center justify-center gap-2"
                >
                  {showAllCategories ? (
                    <>
                      <ViconicIcon name="keyboard_arrow_up" size={14} className="shrink-0" />
                      Ẩn bớt
                    </>
                  ) : (
                    <>
                      <ViconicIcon name="keyboard_arrow_down" size={14} className="shrink-0" />
                      Xem thêm ({categories.length - 6})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
