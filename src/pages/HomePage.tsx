import React, { useState, useEffect, useMemo } from 'react';
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
import { formatViews } from '@/lib/format';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { CategoryService, NovelService, CommentService, StoryFollowService, ReadingProgressService, type StoryCommentData, type ChapterCommentData } from '@/lib/api';

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
  const [novels, setNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'followed' | 'history'>('followed');
  const [followedNovels, setFollowedNovels] = useState<any[]>([]);
  const [historyNovels, setHistoryNovels] = useState<any[]>([]);
  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [recentComments, setRecentComments] = useState<StoryCommentData[]>([]);
  const [recentChapterComments, setRecentChapterComments] = useState<ChapterCommentData[]>([]);
  const [commentSortBy, setCommentSortBy] = useState<'newest' | 'hot'>('newest');

  const [categories, setCategories] = useState<Array<{ icon: string; name: string; id?: number }>>([
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
    let cancelled = false;

    CategoryService.getCategories()
      .then(data => {
        if (cancelled) return;
        if (data && data.length > 0) {
          const mapped = data.map(c => {
            const lower = c.name.toLowerCase();
            const icon = CATEGORY_ICONS[lower] || "category";
            return { icon, name: c.name, id: c.id };
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
        if (cancelled) return;
        if (data && data.length > 0) {
          const mapped = data.map(dbNovel => ({
            id: dbNovel.id,
            slug: dbNovel.slug,
            title: dbNovel.title,
            author: dbNovel.author || "Đang cập nhật",
            status: dbNovel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            tags: dbNovel.genres.map((g: any) => g.name),
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            background_thumbnail_url: dbNovel.background_thumbnail_url || null,
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
        if (cancelled) return;
        console.error("Failed to load novels from API, using static default list", err);
        setNovels(novelsData);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Load current user
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) { try { setCurrentUser(JSON.parse(saved)); } catch (e) {} }
  }, []);

  // Load followed novels
  useEffect(() => {
    if (!currentUser) { setFollowedNovels([]); return; }
    let cancelled = false;

    const loadFollowed = () => {
      Promise.all([NovelService.getNovels(), StoryFollowService.getMyFollows()])
        .then(([data, followedIds]) => {
          if (cancelled || !data) return;
          const followedSet = new Set(followedIds);
          const followed = data.filter(n => followedSet.has(n.id)).map(n => ({
            id: n.id,
            title: n.title,
            cover: n.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            author: n.author || "Đang cập nhật",
            update_time: n.updated_at,
            total_chapters: n.total_chapters || 0,
          }));
          followed.sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime());
          setFollowedNovels(followed);
        })
        .catch(() => {});
    };

    loadFollowed();
    // A card's follow button fires this once the server write lands.
    window.addEventListener('followed-novels-updated', loadFollowed);
    return () => { cancelled = true; window.removeEventListener('followed-novels-updated', loadFollowed); };
  }, [currentUser]);

  // Load viewing history — server-backed (survives cleared cache / new device),
  // falling back to the local list when logged out (see getHistoryStoryIds).
  useEffect(() => {
    if (novels.length === 0) return;
    let cancelled = false;
    ReadingProgressService.getHistoryStoryIds()
      .then(historyIds => {
        if (cancelled) return;
        if (historyIds.length === 0) { setHistoryNovels([]); return; }
        const matched = novels.filter(n => historyIds.includes(n.id)).map(n => ({
          id: n.id,
          title: n.title,
          cover: n.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
          author: n.author || "Đang cập nhật",
          update_time: n.update_time,
          total_chapters: n.chapter_count || 0,
        }));
        matched.sort((a, b) => historyIds.indexOf(a.id) - historyIds.indexOf(b.id));
        setHistoryNovels(matched);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [novels, currentUser]);

  // Load recent story + chapter comments
  useEffect(() => {
    CommentService.getRecentComments(60)
      .then(data => setRecentComments(data))
      .catch(() => {});
    CommentService.getRecentChapterComments(60)
      .then(data => setRecentChapterComments(data))
      .catch(() => {});
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

  const mapForShowcase = (novel: any) => ({
    id: novel.id,
    title: novel.title,
    author: novel.author || "Đang cập nhật",
    intro: novel.intro || "",
    tags: novel.tags || [],
    cover: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
    // Prefer the dedicated background thumbnail for hero banners; fall back to cover art
    banner: novel.background_thumbnail_url || novel.cover || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80",
    status: novel.status,
    views: novel.view_count || 0,
    chapters: novel.chapter_count || 0
  });

  // Top 10 most-viewed novels for the hero showcase
  const hotNovels = [...novels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10).map(mapForShowcase);

  const finalHotNovels = [...hotNovels];

  // Random 6 picks for "Hôm Nay Đọc Gì?", reshuffled once per day (stable seed = today's date)
  const dailyPicks = useMemo(() => {
    if (novels.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
    const arr = [...novels];
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 6).map(mapForShowcase);
  }, [novels]);

  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  // Render comment content: text + inline sticker images
  const renderContent = (content: string) => {
    const parts = content.split(/(<img[^>]*>)/gi);
    return parts.map((part, i) => {
      const imgMatch = part.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
      if (imgMatch) {
        return <img key={i} src={imgMatch[1]} alt="" className="inline h-5 w-5 object-contain mx-0.5 align-middle" />;
      }
      const text = decodeHtml(part.replace(/<[^>]+>/g, ''));
      return text || null;
    });
  };

  const hasVisibleContent = (content: string) => {
    const text = decodeHtml(content.replace(/<[^>]+>/g, '')).trim();
    const hasImg = /<img[^>]+>/i.test(content);
    return text.length > 0 || hasImg;
  };

  // Normalize story + chapter comments into unified shape
  type NormalizedComment = {
    key: string;
    user_name: string;
    user_avatar: string;
    content: string;
    parent: number | null;
    created_at: string;
    story_slug: string;
    story_title: string;
    chapter_number?: number;
    chapter?: number;
    commentType: 'story' | 'chapter';
    id: number;
  };

  const allComments: NormalizedComment[] = [
    ...recentComments.map(c => ({
      key: `s_${c.id}`,
      id: c.id,
      user_name: c.user_name,
      user_avatar: c.user_avatar,
      content: c.content,
      parent: c.parent,
      created_at: c.created_at,
      story_slug: c.story_slug,
      story_title: c.story_title,
      commentType: 'story' as const,
    })),
    ...recentChapterComments.map(c => ({
      key: `c_${c.id}`,
      id: c.id,
      user_name: c.user_name,
      user_avatar: c.user_avatar,
      content: c.content,
      parent: c.parent,
      created_at: c.created_at,
      story_slug: c.story_slug,
      story_title: c.story_title,
      chapter_number: c.chapter_number,
      chapter: c.chapter,
      commentType: 'chapter' as const,
    })),
  ].filter(c => hasVisibleContent(c.content));

  const replyCountMap: Record<string, number> = {};
  allComments.forEach(c => {
    if (c.parent !== null) {
      const parentKey = `${c.commentType}_${c.parent}`;
      replyCountMap[parentKey] = (replyCountMap[parentKey] || 0) + 1;
    }
  });

  const sortedRecentComments = commentSortBy === 'newest'
    ? [...allComments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...allComments].sort((a, b) => (replyCountMap[`${b.commentType}_${b.id}`] || 0) - (replyCountMap[`${a.commentType}_${a.id}`] || 0));

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-16 animate-pulse w-full min-h-screen">
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
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 pt-6">
        <section className="w-full relative bg-surface overflow-hidden rounded-xl border border-outline-variant/30 shadow-md">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={0}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            className="h-[360px] sm:h-[420px] lg:h-[480px] w-full hero-swiper"
          >
            {finalHotNovels.map((novel) => (
              <SwiperSlide key={novel.id} className="relative w-full h-full">
                {/* Full-bleed background thumbnail */}
                <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
                  <img
                    alt={novel.title}
                    className="w-full h-full object-cover"
                    src={novel.banner}
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/5" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
                </div>

                {/* Slide Content — bottom-anchored, identical structure at every breakpoint */}
                <div className="relative z-10 w-full h-full flex flex-col justify-end px-5 sm:px-8 md:px-12 pb-6 sm:pb-8 md:pb-10">
                  <div className="max-w-xl">
                    <span className="inline-block w-fit bg-primary text-on-primary text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-sm shadow-md mb-2.5">
                      TRUYỆN HOT
                    </span>

                    <h2 className="font-display-lg text-xl sm:text-2xl md:text-4xl text-white mb-2 line-clamp-2 leading-[1.2] font-bold tracking-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                      {novel.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-white/85 font-semibold mb-4 flex items-center gap-1.5">
                      <ViconicIcon name="visibility" size={13} className="shrink-0" />
                      {formatViews(novel.views)} lượt xem
                    </p>

                    {(typeof novel.id === 'string' && novel.id.startsWith("mock")) ? (
                      <button className="bg-white/25 text-white/70 font-label-bold px-5 py-2.5 rounded-sm flex items-center gap-2 cursor-not-allowed text-xs w-fit">
                        <ViconicIcon name="menu_book" size={15} className="shrink-0" />
                        Đọc Ngay (Bản Thử)
                      </button>
                    ) : (
                      <Link
                        to={`/detail/${novel.id}`}
                        className="bg-primary text-on-primary font-label-bold px-5 py-2.5 rounded-sm hover:bg-primary/95 transition-colors flex items-center gap-2 shadow-lg shadow-black/40 text-xs w-fit"
                      >
                        <ViconicIcon name="menu_book" size={15} className="shrink-0" />
                        Đọc Ngay
                      </Link>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 py-10 space-y-16">
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
            {dailyPicks.map((novel) => (
              <Link
                key={novel.id}
                to={(typeof novel.id === 'string' && novel.id.startsWith("mock")) ? "#" : `/detail/${novel.id}`}
                data-novel-slug={(typeof novel.id === 'string' && novel.id.startsWith("mock")) ? undefined : novel.id}
                className={`flex gap-4 bg-surface-container/30 border border-outline-variant/30 hover:border-primary p-4 rounded-xl transition-all duration-300 group ${(typeof novel.id === 'string' && novel.id.startsWith("mock")) ? "cursor-not-allowed opacity-90" : ""}`}
              >
                {/* Book cover image */}
                <div className="w-[80px] sm:w-[90px] aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                  <img
                    alt={novel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    src={novel.cover}
                    loading="lazy"
                    decoding="async"
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

        {/* Two-column: Mới Cập Nhật & Truyện Đã Hoàn Thành + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT: Mới Cập Nhật + Truyện Đã Hoàn Thành */}
          <div className="lg:col-span-8 flex flex-col gap-10 lg:order-1">

            {/* Mới Cập Nhật */}
            <section>
              <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
                <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                  <ViconicIcon name="update" size={24} className="text-primary shrink-0" />
                  Mới Cập Nhật
                </h2>
                <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/new-update">
                  Xem tất cả →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {novelUpdates.slice(0, 12).map((novel) => (
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

            {/* Truyện Đã Hoàn Thành */}
            {completedNovels.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
                  <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                    <ViconicIcon name="check_circle" size={24} className="text-primary shrink-0" />
                    Truyện Đã Hoàn Thành
                  </h2>
                  <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/completed">
                    Xem tất cả →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {completedNovels.slice(0, 8).map((novel) => (
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

          </div>

          {/* RIGHT Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6 lg:order-2">

            {/* Following / History widget */}
            <section className="bg-surface border border-outline-variant/50 p-4 rounded-sm shadow-sm">
              <div className="flex border-b border-outline-variant/50 mb-4 text-xs font-bold gap-1 pb-1">
                <button
                  onClick={() => { setActiveSidebarTab('followed'); setShowAllFollowed(false); }}
                  className={`flex-grow py-2 text-center rounded transition-all flex items-center justify-center gap-1.5 ${activeSidebarTab === 'followed' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
                >
                  <ViconicIcon name="favorite" size={14} className="shrink-0" />
                  Đang Theo Dõi
                </button>
                <button
                  onClick={() => { setActiveSidebarTab('history'); setShowAllHistory(false); }}
                  className={`flex-grow py-2 text-center rounded transition-all flex items-center justify-center gap-1.5 ${activeSidebarTab === 'history' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
                >
                  <ViconicIcon name="history" size={14} className="shrink-0" />
                  Lịch Sử Xem
                </button>
              </div>

              <div className="space-y-3">
                {activeSidebarTab === 'followed' ? (
                  !currentUser ? (
                    <div className="text-center py-6 text-xs text-on-surface-variant/70">
                      Vui lòng đăng nhập để xem danh sách theo dõi.
                    </div>
                  ) : followedNovels.length === 0 ? (
                    <div className="text-center py-6 text-xs text-on-surface-variant/70">Bạn chưa theo dõi truyện nào.</div>
                  ) : (
                    <>
                      {(showAllFollowed ? followedNovels : followedNovels.slice(0, 5)).map(fav => {
                        const lastRead = localStorage.getItem(`reading_progress_${fav.id}`);
                        return (
                          <Link key={fav.id} to={`/detail/${fav.id}`} className="flex gap-3 hover:bg-surface-variant/30 p-1.5 rounded transition-colors group">
                            <img alt={fav.title} className="w-10 h-14 object-cover rounded-sm border border-outline-variant/50 shrink-0" src={fav.cover} loading="lazy" decoding="async" />
                            <div className="min-w-0 flex-grow flex flex-col justify-center">
                              <h4 className="font-bold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{fav.title}</h4>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">{fav.author}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-variant/60 px-1.5 py-0.5 rounded border border-outline-variant/30 shrink-0">Mới: C{fav.total_chapters}</span>
                                {lastRead && <span className="text-[10.5px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 animate-pulse">Đang đọc: C{lastRead}</span>}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {followedNovels.length > 0 && (
                        <Link to="/profile?tab=shelf" className="block w-full text-center mt-1 py-2 font-bold text-xs text-primary hover:bg-primary/5 rounded border border-dashed border-outline-variant transition-colors">
                          Xem tất cả ({followedNovels.length})
                        </Link>
                      )}
                    </>
                  )
                ) : (
                  historyNovels.length === 0 ? (
                    <div className="text-center py-6 text-xs text-on-surface-variant/70">Chưa có lịch sử xem truyện.</div>
                  ) : (
                    <>
                      {(showAllHistory ? historyNovels : historyNovels.slice(0, 5)).map(hist => {
                        const lastRead = localStorage.getItem(`reading_progress_${hist.id}`);
                        return (
                          <Link key={hist.id} to={`/detail/${hist.id}`} className="flex gap-3 hover:bg-surface-variant/30 p-1.5 rounded transition-colors group">
                            <img alt={hist.title} className="w-10 h-14 object-cover rounded-sm border border-outline-variant/50 shrink-0" src={hist.cover} loading="lazy" decoding="async" />
                            <div className="min-w-0 flex-grow flex flex-col justify-center">
                              <h4 className="font-bold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">{hist.title}</h4>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">{hist.author}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-variant/60 px-1.5 py-0.5 rounded border border-outline-variant/30 shrink-0">C{hist.total_chapters}</span>
                                {lastRead && <span className="text-[10.5px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">Đang đọc: C{lastRead}</span>}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {historyNovels.length > 0 && (
                        <Link to="/profile?tab=history" className="block w-full text-center mt-1 py-2 font-bold text-xs text-primary hover:bg-primary/5 rounded border border-dashed border-outline-variant transition-colors">
                          Xem tất cả ({historyNovels.length})
                        </Link>
                      )}
                    </>
                  )
                )}
              </div>
            </section>

            {/* Recent Comments */}
            <section className="bg-surface border border-outline-variant/50 p-4 rounded-sm shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/50">
                <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <ViconicIcon name="comment" size={14} className="text-primary shrink-0" />
                  Bình Luận Gần Đây
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCommentSortBy('newest')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${commentSortBy === 'newest' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-dim'}`}
                  >
                    Mới nhất
                  </button>
                  <button
                    onClick={() => setCommentSortBy('hot')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-colors ${commentSortBy === 'hot' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-dim'}`}
                  >
                    Hot nhất
                  </button>
                </div>
              </div>
              <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-outline-variant/50 scrollbar-track-transparent">
                {sortedRecentComments.map(comment => {
                  const href = comment.commentType === 'chapter'
                    ? `/chapter/${comment.chapter}`
                    : `/detail/${comment.story_slug}`;
                  const replyCount = replyCountMap[`${comment.commentType}_${comment.id}`] || 0;
                  return (
                    <Link key={comment.key} to={href} className="flex gap-2.5 hover:bg-surface-variant/20 p-1.5 rounded transition-colors group">
                      <img alt={comment.user_name} className="w-7 h-7 rounded-full object-cover border border-outline-variant/50 shrink-0 mt-0.5" src={comment.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user_name}`} loading="lazy" decoding="async" />
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10.5px] font-bold text-on-surface truncate">{comment.user_name}</span>
                          {comment.parent !== null && <span className="text-[9px] bg-surface-variant text-on-surface-variant/70 px-1 py-0.5 rounded shrink-0">↩ Trả lời</span>}
                          {comment.commentType === 'chapter' && <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded shrink-0">C{comment.chapter_number}</span>}
                          <span className="text-[9px] text-on-surface-variant/60 shrink-0 ml-auto">{new Date(comment.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant line-clamp-2 flex flex-wrap items-center gap-0.5">{renderContent(comment.content)}</p>
                        <p className="text-[9px] text-primary/70 mt-0.5 truncate group-hover:text-primary transition-colors">{comment.story_title}</p>
                        {comment.parent === null && replyCount > 0 && <span className="text-[9px] text-on-surface-variant/60">{replyCount} trả lời</span>}
                      </div>
                    </Link>
                  );
                })}
                {sortedRecentComments.length === 0 && (
                  <div className="text-center py-6 text-xs text-on-surface-variant/70">Chưa có bình luận nào.</div>
                )}
              </div>
            </section>

          </div>
        </div>

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
                <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/ranking">
                  Xem tất cả →
                </Link>
              </div>
              <div className="bg-surface border border-outline-variant/50 p-2 space-y-1">
                {[...novels]
                  .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                  .slice(0, 10)
                  .map((novel, index) => {
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
                        reads={`${formatViews(novel.view_count || 0)} lượt xem`}
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
              <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-outline-variant/50 scrollbar-track-transparent">
                {categories.map((cat, index) => (
                  <CategoryItem key={index} icon={cat.icon} name={cat.name} id={cat.id} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;
