import React, { useState, useEffect, useRef } from 'react';
import ChapterItem from '@/components/cards/ChapterItem';
import { useParams, Link } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
const novelsData = novelsDataJson as any[];
import { getNovelViews } from '@/lib/viewCountService';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { NovelService } from '@/lib/api';
import { STICKER_SETS } from '@/data/stickers';


interface Reply {
  id: number;
  user: string;
  time: string;
  text: string;
  avatar: string;
}

interface Comment {
  id: number;
  user: string;
  time: string;
  text: string;
  likes: number;
  avatar: string;
  likedByUser?: boolean;
  replies?: Reply[];
}

const getDetailSeedComments = (): Comment[] => [
  {
    id: 1,
    user: "YukiReader",
    time: "2 giờ trước",
    text: "Truyện nhẹ nhàng quá, đọc xong chương 1 mà thấy man mác buồn. Hóng chương mới!",
    likes: 12,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAN-dDBgHYemMZ3kCdUIYxicDtpk4jZimRFi2kCTlcLEt6oZzJuj0biwIJyEHpQRgzQ8nbJjKEU5Bg2aDrk5nqY7MIYz9xriM1CLk6rX0tsa-GRCpGv7zMZ0fqFmNvF5IZ46AQaz8Mt7x4-AoT1CBE6UP7BWVS01XNXCz8Uwm6ba5tvIJ0yg5mgaaRD2U1vWuM_tm4QsLeiC7s7hEBX9KnDmjf9U97hOOfpDjkFQvep4ILDLbuZhfTyLp2n00ak4WA0qG1W77v1Uskf",
    likedByUser: false
  },
  {
    id: 2,
    user: "Koko_Nut",
    time: "Hôm qua",
    text: "Haru chắc chắn có liên quan đến quá khứ của Aki. Motif quen thuộc nhưng cách viết rất mượt.",
    likes: 8,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD1epYzUm9PYg5Z4v3zZXDsv3Ph06NlgpommDOBvTTqpLS3sgVhIeXPPp9WnpwOkdoqtjcPa7sGjgQfoBHy1XdCxXIKD7tqus0SdH1HPjLIKxGI69O0lGijT1mmXVujCcTxU8e4qviArMpb35YAx9YX9MqEvEk89DXG1XvQL29j24ny5Zf8gpuufV0HirEieDmpzG4wzbSixeeYFb8Jzm5F7Pj_zz0pQAd7bOyes99b2icDY6xwJomVgVwm7mLtPK9U6SCF3BpQUm0w",
    likedByUser: false
  }
];

const renderCommentContentHtml = (text: string): string => {
  if (!text) return '';
  return text.replace(/\[sticker:([a-zA-Z0-9_-]+):([a-zA-Z0-9_.-]+)\]/g, (match, setId, filename) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set) {
      return `<img src="${set.baseUrl}${filename}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain select-none animate-in zoom-in-50 duration-150" />`;
    }
    return match;
  });
};

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const mainEditorRef = useRef<HTMLDivElement>(null);
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [novel, setNovel] = useState<any | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');

  const [ratingData, setRatingData] = useState({
    count: 1240,
    sum: 1240 * 4.8,
    userRating: 0
  });
  const [hoverRating, setHoverRating] = useState(0);

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followedNovels, setFollowedNovels] = useState<any[]>([]);
  const [showAllFollowed, setShowAllFollowed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'followed' | 'history'>('followed');
  const [historyNovels, setHistoryNovels] = useState<any[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [hotRanking, setHotRanking] = useState<any[]>([]);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isMainStickerOpen, setIsMainStickerOpen] = useState(false);
  const [replyStickerOpenId, setReplyStickerOpenId] = useState<number | null>(null);
  const [activeStickerSetId, setActiveStickerSetId] = useState('trollface');


  // Load current user session
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Load follow status per user
  useEffect(() => {
    if (id && currentUser) {
      const followed = localStorage.getItem(`follow_novel_${id}_user_${currentUser.name}`);
      setIsFollowed(!!followed);
    } else {
      setIsFollowed(false);
    }
  }, [id, currentUser]);

  // Load followed novels sorted by update time
  useEffect(() => {
    NovelService.getNovels()
      .then(data => {
        if (data && currentUser) {
          const followed = data.filter(dbNovel => {
            const isFollowedById = localStorage.getItem(`follow_novel_${dbNovel.id}_user_${currentUser.name}`) === '1';
            const isFollowedBySlug = localStorage.getItem(`follow_novel_${dbNovel.slug}_user_${currentUser.name}`) === '1';
            return isFollowedById || isFollowedBySlug;
          }).map(dbNovel => ({
            id: dbNovel.slug,
            title: dbNovel.title,
            cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            author: dbNovel.author || "Đang cập nhật",
            update_time: dbNovel.updated_at,
            total_chapters: dbNovel.total_chapters || 0,
          }));

          // Sort by update time descending
          followed.sort((a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime());
          setFollowedNovels(followed);
        } else {
          setFollowedNovels([]);
        }
      })
      .catch(e => console.warn("Failed to load followed novels:", e));
  }, [currentUser, isFollowed]);

  // Save viewed novel to viewing history
  useEffect(() => {
    if (novel) {
      const historyStr = localStorage.getItem('viewing_history') || '[]';
      try {
        const history = JSON.parse(historyStr) as string[];
        const updated = [novel.slug, ...history.filter(slug => slug !== novel.slug)].slice(0, 15);
        localStorage.setItem('viewing_history', JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to update viewing history", e);
      }
    }
  }, [novel]);

  // Load viewing history
  useEffect(() => {
    const historyStr = localStorage.getItem('viewing_history') || '[]';
    try {
      const historySlugs = JSON.parse(historyStr) as string[];
      if (historySlugs.length > 0) {
        NovelService.getNovels()
          .then(data => {
            if (data && Array.isArray(data)) {
              const matched = data.filter(dbNovel => historySlugs.includes(dbNovel.slug))
                .map(dbNovel => ({
                  id: dbNovel.slug,
                  title: dbNovel.title,
                  cover: dbNovel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
                  author: dbNovel.author || "Đang cập nhật",
                  update_time: dbNovel.updated_at,
                  total_chapters: dbNovel.total_chapters || 0,
                }));

              // Sort matched novels according to history index (most recent first)
              matched.sort((a, b) => historySlugs.indexOf(a.id) - historySlugs.indexOf(b.id));
              setHistoryNovels(matched);
            }
          })
          .catch(e => console.warn("Failed to load history novels:", e));
      } else {
        setHistoryNovels([]);
      }
    } catch (e) {
      console.warn("Failed to parse viewing history:", e);
    }
  }, [novel]);

  // Load hot ranking list matching the RankingPage logic
  useEffect(() => {
    NovelService.getNovels()
      .then(data => {
        let mapped: any[] = [];
        const mockCovers = [
          "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=120&auto=format&fit=crop&q=80",
        ];

        if (data && Array.isArray(data)) {
          mapped = data.map((novel: any) => ({
            id: novel.slug,
            title: novel.title,
            views: novel.view_count || 0,
            cover: novel.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
          }));
        } else {
          // Fallback if data is null/undefined/not an array
          mapped = novelsData.map((novel: any) => ({
            id: novel.id,
            title: novel.title,
            views: getNovelViews(novel.id),
            cover: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
          }));
        }

        // Fill with mock novels if less than 5 to make it match the ranking page
        if (mapped.length < 5) {
          const mockTitles = [
            "Kiếm Lai",
            "Đấu Phá Thương Khung",
            "Vũ Động Càn Khôn",
            "Thần Khống Thiên Hạ",
            "Phàm Nhân Tu Tiên",
          ];
          const needed = 5 - mapped.length;
          for (let i = 0; i < needed; i++) {
            const baseViews = 150000 - i * 14000;
            mapped.push({
              id: `mock-slug-${i}`,
              title: mockTitles[i],
              views: baseViews,
              cover: mockCovers[i],
            });
          }
        }

        // Sort by views descending and take top 5
        mapped.sort((a, b) => b.views - a.views);
        setHotRanking(mapped.slice(0, 5));
      })
      .catch(err => {
        console.warn("Failed to load hot ranking from API, using static fallbacks:", err);
        const mockCovers = [
          "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=120&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=120&auto=format&fit=crop&q=80",
        ];
        // Fallback to static novelsData
        const fallbackList = novelsData.map((novel: any) => ({
          id: novel.id,
          title: novel.title,
          views: getNovelViews(novel.id),
          cover: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
        }));

        if (fallbackList.length < 5) {
          const mockTitles = [
            "Kiếm Lai",
            "Đấu Phá Thương Khung",
            "Vũ Động Càn Khôn",
            "Thần Khống Thiên Hạ",
            "Phàm Nhân Tu Tiên",
          ];
          const needed = 5 - fallbackList.length;
          for (let i = 0; i < needed; i++) {
            const baseViews = 150000 - i * 14000;
            fallbackList.push({
              id: `mock-slug-${i}`,
              title: mockTitles[i],
              views: baseViews,
              cover: mockCovers[i],
            });
          }
        }

        fallbackList.sort((a: any, b: any) => b.views - a.views);
        setHotRanking(fallbackList.slice(0, 5));
      });
  }, []);

  // Load comments
  useEffect(() => {
    if (id) {
      const storageKey = `comments_novel_${id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setComments(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse comments", e);
          const seeds = getDetailSeedComments();
          setComments(seeds);
          localStorage.setItem(storageKey, JSON.stringify(seeds));
        }
      } else {
        const seeds = getDetailSeedComments();
        setComments(seeds);
        localStorage.setItem(storageKey, JSON.stringify(seeds));
      }
    }
  }, [id]);

  // Load rating
  useEffect(() => {
    if (id) {
      const savedRating = localStorage.getItem(`rating_data_${id}`);
      if (savedRating) {
        try {
          setRatingData(JSON.parse(savedRating));
        } catch (e) {
          console.error("Failed to parse rating data", e);
        }
      } else {
        setRatingData({
          count: 1240,
          sum: 1240 * 4.8,
          userRating: 0
        });
      }
    }
  }, [id]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentUser) return;

    const newComment: Comment = {
      id: Date.now(),
      user: currentUser.name,
      time: "Vừa xong",
      text: newCommentText.trim(),
      likes: 0,
      avatar: currentUser.avatar,
      likedByUser: false,
      replies: []
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    setNewCommentText('');
    if (mainEditorRef.current) {
      mainEditorRef.current.innerHTML = '';
    }

    if (id) {
      localStorage.setItem(`comments_novel_${id}`, JSON.stringify(updated));
    }
  };

  const handleAddReply = (commentId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (!currentUser) {
      alert("Vui lòng đăng nhập để phản hồi cảm nhận!");
      return;
    }

    const newReply: Reply = {
      id: Date.now(),
      user: currentUser.name,
      time: "Vừa xong",
      text: replyText.trim(),
      avatar: currentUser.avatar,
    };

    const updatedComments = comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    setComments(updatedComments);
    setReplyText('');
    setReplyingToId(null);
    if (replyEditorRef.current) {
      replyEditorRef.current.innerHTML = '';
    }

    if (id) {
      localStorage.setItem(`comments_novel_${id}`, JSON.stringify(updatedComments));
    }
  };

  const insertStickerToMain = (setId: string, filename: string) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set && mainEditorRef.current) {
      const url = `${set.baseUrl}${filename}`;
      mainEditorRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (mainEditorRef.current.contains(range.commonAncestorContainer)) {
          const imgHtml = `<img src="${url}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain" />&nbsp;`;
          document.execCommand('insertHTML', false, imgHtml);
          setNewCommentText(mainEditorRef.current.innerHTML);
          setIsMainStickerOpen(false);
          return;
        }
      }
      mainEditorRef.current.innerHTML += `<img src="${url}" alt="sticker" class="w-12 h-12 inline-block align-middle my-0.5 mx-1 max-h-12 object-contain" />&nbsp;`;
      setNewCommentText(mainEditorRef.current.innerHTML);
    }
    setIsMainStickerOpen(false);
  };

  const insertStickerToReply = (setId: string, filename: string) => {
    const set = STICKER_SETS.find(s => s.id === setId);
    if (set && replyEditorRef.current) {
      const url = `${set.baseUrl}${filename}`;
      replyEditorRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (replyEditorRef.current.contains(range.commonAncestorContainer)) {
          const imgHtml = `<img src="${url}" alt="sticker" class="w-10 h-10 inline-block align-middle my-0.5 mx-1 max-h-10 object-contain" />&nbsp;`;
          document.execCommand('insertHTML', false, imgHtml);
          setReplyText(replyEditorRef.current.innerHTML);
          setReplyStickerOpenId(null);
          return;
        }
      }
      replyEditorRef.current.innerHTML += `<img src="${url}" alt="sticker" class="w-10 h-10 inline-block align-middle my-0.5 mx-1 max-h-10 object-contain" />&nbsp;`;
      setReplyText(replyEditorRef.current.innerHTML);
    }
    setReplyStickerOpenId(null);
  };

  const handleLikeComment = (commentId: number) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để thích bình luận!");
      return;
    }
    const updated = comments.map(c => {
      if (c.id === commentId) {
        const liked = !c.likedByUser;
        return {
          ...c,
          likedByUser: liked,
          likes: liked ? c.likes + 1 : Math.max(0, c.likes - 1)
        };
      }
      return c;
    });
    setComments(updated);
    if (id) {
      localStorage.setItem(`comments_novel_${id}`, JSON.stringify(updated));
    }
  };

  const handleRate = (rating: number) => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để đánh giá truyện!");
      return;
    }
    if (ratingData.userRating > 0) return;
    const newCount = ratingData.count + 1;
    const newSum = ratingData.sum + rating;
    const updated = {
      count: newCount,
      sum: newSum,
      userRating: rating
    };
    setRatingData(updated);
    localStorage.setItem(`rating_data_${id}`, JSON.stringify(updated));
  };

  const handleFollowToggle = () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập tài khoản để theo dõi truyện!");
      return;
    }
    const nextState = !isFollowed;
    setIsFollowed(nextState);
    if (nextState) {
      localStorage.setItem(`follow_novel_${id}_user_${currentUser.name}`, '1');
      alert(`Đã thêm bộ truyện vào tủ sách theo dõi!`);
    } else {
      localStorage.removeItem(`follow_novel_${id}_user_${currentUser.name}`);
      alert(`Đã hủy theo dõi bộ truyện.`);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      NovelService.getNovelDetail(id)
        .then(data => {
          setViewCount(data.view_count || 0);
          
          const mapped = {
            id: data.slug,
            slug: data.slug,
            title: data.title,
            author: data.author || "Đang cập nhật",
            status: data.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra',
            cover: data.cover_url || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover",
            background_thumbnail_url: data.background_thumbnail_url,
            intro: data.description || "Đang cập nhật nội dung tóm tắt.",
            tags: data.genres.map((g: any) => g.name),
            chapter_count: data.total_chapters || data.chapters?.length || 0,
            word_count: 0,
            update_time: data.updated_at,
          };
          setNovel(mapped);
          setChapters(data.chapters || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load novel details from backend", err);
          // Try to fallback to static data
          const staticNovel = novelsData.find(n => n.id === id);
          if (staticNovel) {
            setNovel(staticNovel);
            setViewCount(getNovelViews(id));
            // Fetch static TOC
            fetch(`/data/${encodeURIComponent(staticNovel.folder)}/toc.json`)
              .then(res => res.json())
              .then(tocData => {
                const dummyChapters = tocData.map((title: string, idx: number) => ({
                  id: idx + 1,
                  chapter_number: idx + 1,
                  title: title,
                  published_at: staticNovel.update_time,
                }));
                setChapters(dummyChapters);
              })
              .catch(() => {});
          }
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="pt-6 pb-12 px-6 md:px-12 max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 animate-pulse w-full min-h-screen">
        {/* Banner Section Skeleton */}
        <div className="md:col-span-12 flex flex-col md:flex-row gap-8 mb-6 bg-surface border border-outline-variant/30 p-6 rounded-sm shadow-sm">
          <div className="w-[200px] aspect-[2/3] bg-outline-variant/30 rounded-sm shrink-0" />
          <div className="flex flex-col justify-center space-y-4 flex-grow">
            <div className="h-8 bg-outline-variant/30 rounded w-2/3" />
            <div className="h-4 bg-outline-variant/30 rounded w-1/4" />
            <div className="flex items-center gap-3 py-1">
              <div className="h-5 bg-outline-variant/30 rounded w-20" />
              <div className="h-5 bg-outline-variant/30 rounded w-24" />
              <div className="h-5 bg-outline-variant/30 rounded w-20" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-outline-variant/30 rounded w-16" />
              <div className="h-6 bg-outline-variant/30 rounded w-16" />
              <div className="h-6 bg-outline-variant/30 rounded w-16" />
            </div>
            <div className="flex gap-3 pt-2">
              <div className="h-10 bg-outline-variant/30 rounded w-28" />
              <div className="h-10 bg-outline-variant/30 rounded w-28" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="md:col-span-8 space-y-6">
          {/* Synopsis skeleton */}
          <div className="bg-surface p-6 rounded-sm border border-outline-variant/30 space-y-3">
            <div className="h-6 bg-outline-variant/30 rounded w-40 mb-5" />
            <div className="h-3.5 bg-outline-variant/30 rounded w-full" />
            <div className="h-3.5 bg-outline-variant/30 rounded w-full" />
            <div className="h-3.5 bg-outline-variant/30 rounded w-[90%]" />
            <div className="h-3.5 bg-outline-variant/30 rounded w-full" />
            <div className="h-3.5 bg-outline-variant/30 rounded w-[70%]" />
          </div>
          {/* Chapter list skeleton */}
          <div className="bg-surface p-6 rounded-sm border border-outline-variant/30 space-y-3">
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 bg-outline-variant/30 rounded w-40" />
              <div className="h-5 bg-outline-variant/30 rounded w-16" />
            </div>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="flex justify-between items-center py-2">
                <div className="h-4 bg-outline-variant/30 rounded w-[60%]" />
                <div className="h-3.5 bg-outline-variant/30 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Sidebar skeleton for followed novels */}
        <div className="md:col-span-4 bg-surface p-6 rounded-sm border border-outline-variant/30 space-y-4">
          <div className="h-6 bg-outline-variant/30 rounded w-40 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex gap-3 animate-pulse">
                <div className="w-10 h-14 bg-outline-variant/30 rounded-sm shrink-0" />
                <div className="flex-grow space-y-2">
                  <div className="h-4 bg-outline-variant/30 rounded w-2/3" />
                  <div className="h-3 bg-outline-variant/30 rounded w-1/3" />
                  <div className="h-3 bg-outline-variant/30 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="pt-20 pb-12 px-6 text-center text-on-surface">
        <h1 className="font-display-lg text-xl md:text-2xl mb-4">Truyện không tồn tại</h1>
        <Link to="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'hot') {
      return b.likes - a.likes;
    }
    return b.id - a.id;
  });

  return (
    <div className="pt-6 pb-12 px-6 md:px-12 max-w-[1300px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Novel Header (Cover + Info) */}
      <section 
        className="md:col-span-12 flex flex-col md:flex-row gap-8 mb-6 bg-surface/90 border border-outline-variant/50 p-6 md:p-8 rounded-sm shadow-md relative overflow-hidden backdrop-blur-sm animate-in fade-in duration-300"
      >
        {/* Blurred Background Art */}
        {novel.background_thumbnail_url && (
          <>
            <div 
              className="absolute inset-0 z-0 select-none pointer-events-none"
              style={{
                backgroundImage: `url(${novel.background_thumbnail_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                filter: 'blur(10px) saturate(1.4)',
                opacity: 0.55,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-surface/10 z-0 pointer-events-none" />
          </>
        )}

        {/* Cover Art */}
        <div className="md:w-1/3 lg:w-1/4 shrink-0 relative group z-10">
          <div className="relative">
            <img 
              alt="Novel Cover" 
              className="w-full rounded-sm border border-outline-variant/50" 
              src={novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"} 
            />
            <div className={`absolute top-2 left-2 ${novel.status === 'Hoàn thành' ? 'bg-blue-600' : 'bg-primary'} text-on-primary font-bold text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm`}>
              {novel.status}
            </div>
          </div>
        </div>
        
        {/* Novel Metadata */}
        <div className="md:w-2/3 lg:w-3/4 flex flex-col justify-center relative z-10">
          <h1 className="font-display-lg text-2xl md:text-3xl text-on-surface mb-2 leading-tight tracking-tight">{novel.title}</h1>
          <p className="font-body-ui text-primary mb-4 flex items-center gap-1 font-bold">
            <ViconicIcon name="edit" size={14} className="shrink-0 text-primary" />
            {novel.author || "Đang cập nhật"}
          </p>
          <div className="flex items-center gap-4 mb-6 bg-surface p-2.5 rounded-sm border border-outline-variant/50 w-fit">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center text-amber-500 gap-0.5 sm:gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const avgRating = ratingData.count > 0 ? (ratingData.sum / ratingData.count).toFixed(1) : "0.0";
                  const isFilled = hoverRating > 0 
                    ? star <= hoverRating 
                    : star <= Math.round(parseFloat(avgRating));
                  
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => ratingData.userRating === 0 && setHoverRating(star)}
                      onMouseLeave={() => ratingData.userRating === 0 && setHoverRating(0)}
                      onClick={() => handleRate(star)}
                      disabled={ratingData.userRating > 0}
                      className={`transition-all duration-150 ${ratingData.userRating === 0 ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
                      title={ratingData.userRating > 0 ? `Bạn đã đánh giá ${ratingData.userRating} sao` : `Đánh giá ${star} sao`}
                    >
                      <ViconicIcon 
                        name="star" 
                        size="16px" 
                        className={`shrink-0 ${isFilled ? 'text-amber-500' : 'text-slate-300'}`} 
                      />
                    </button>
                  );
                })}
              </div>
              <span className="ml-1 font-bold text-on-surface text-xs sm:text-sm">
                {(ratingData.count > 0 ? (ratingData.sum / ratingData.count) : 0).toFixed(1)}
              </span>
              <span className="text-on-surface-variant text-[10px] sm:text-xs ml-0.5">
                ({ratingData.count.toLocaleString('vi-VN')})
              </span>
              {ratingData.userRating > 0 && (
                <span className="text-[9px] text-green-600 font-bold bg-green-500/10 px-1.5 py-0.5 rounded-full ml-1 dark:text-green-400">
                  Đã đánh giá {ratingData.userRating}★
                </span>
              )}
            </div>
            <div className="h-4 w-px bg-outline-variant" />
            <span className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
              <ViconicIcon name="visibility" size={14} className="text-primary shrink-0" />
              {viewCount} lượt xem
            </span>
          </div>
          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(novel.tags && novel.tags.length > 0 ? novel.tags : ["Chưa phân loại"]).map((genre: string) => (
              <Link 
                to={`/genres/${encodeURIComponent(genre)}`}
                key={genre} 
                className="bg-surface-variant text-on-surface-variant font-bold text-[10px] uppercase px-3 py-1.5 rounded-sm hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
              >
                {genre}
              </Link>
            ))}
          </div>
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Link 
              to={`/chapter/${novel.id}/1`}
              className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <ViconicIcon name="menu_book" size={14} className="shrink-0" />
              Đọc Ngay
            </Link>
            <button 
              onClick={handleFollowToggle}
              className={`font-bold px-6 py-2.5 rounded-sm transition-all duration-200 flex items-center gap-2 border active:scale-95 ${
                isFollowed
                  ? 'bg-primary text-on-primary border-primary hover:bg-primary/95 shadow-sm'
                  : 'bg-surface border-outline-variant text-primary hover:bg-surface-variant'
              }`}
            >
              <ViconicIcon name="favorite" size={14} className="shrink-0" />
              {isFollowed ? 'Đã Theo Dõi' : 'Theo Dõi'}
            </button>
          </div>
        </div>
      </section>

      {/* Left Column: Synopsis & Chapters */}
      <div className="md:col-span-8 flex flex-col gap-6">
        {/* Synopsis */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          <h2 className="font-display-lg text-lg md:text-xl text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <ViconicIcon name="info" size={24} className="text-primary shrink-0" />
            Nội dung tóm tắt
          </h2>
          <div className="font-body-reading text-sm text-on-surface-variant space-y-4 leading-relaxed relative">
            {(() => {
              const paragraphs = (novel.intro || "Đang cập nhật nội dung tóm tắt.").replace(/\\n/g, '\n').split('\n').filter((p: string) => p.trim() !== '');
              const displayParagraphs = isDescExpanded ? paragraphs : paragraphs.slice(0, 3);
              return (
                <>
                  {displayParagraphs.map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                  {!isDescExpanded && paragraphs.length > 3 && (
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
                  )}
                </>
              );
            })()}
          </div>
          {((novel.intro || "").replace(/\\n/g, '\n').split('\n').filter((p: string) => p.trim() !== '').length > 3) && (
            <button 
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="mt-4 font-bold text-sm text-primary hover:underline flex items-center gap-1"
            >
              {isDescExpanded ? "Thu gọn" : "Xem thêm"}
              <ViconicIcon name={isDescExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={14} className="shrink-0" />
            </button>
          )}
        </section>

        {/* Chapter List */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-outline-variant/50 pb-3">
            <h2 className="font-display-lg text-lg md:text-xl text-on-surface flex items-center gap-2">
              <ViconicIcon name="format_list_bulleted" size={24} className="text-primary shrink-0" />
              Danh sách chương
            </h2>
            <span className="font-bold text-[10px] sm:text-xs text-on-surface-variant bg-surface-variant px-2 py-1 rounded-sm shrink-0">
              {chapters.length > 0 ? chapters.length : novel.chapter_count || 0} Chương
            </span>
          </div>
          <div className="space-y-1">
            {[...chapters].reverse().slice(0, showAllChapters ? chapters.length : 10).map((chap: any) => (
              <ChapterItem 
                key={chap.id || chap.chapter_number} 
                id={`${novel.id}/${chap.chapter_number}`} 
                title={chap.title} 
                date={chap.published_at ? new Date(chap.published_at).toLocaleDateString('vi-VN') : "Mới đây"} 
              />
            ))}
            {chapters.length === 0 && Array.from({ length: Math.min(novel.chapter_count || 3, 5) }).map((_, idx) => (
              <ChapterItem 
                key={idx} 
                id={`${novel.id}/${idx + 1}`} 
                title={`Chương ${idx + 1}`} 
                date={novel.update_time ? new Date(novel.update_time).toLocaleDateString('vi-VN') : "Mới đây"} 
              />
            ))}
            {chapters.length > 10 && (
              <button 
                onClick={() => setShowAllChapters(!showAllChapters)}
                className="w-full mt-4 py-2.5 text-center font-bold text-sm text-primary hover:bg-primary/5 rounded-sm border border-dashed border-outline-variant transition-colors"
              >
                {showAllChapters ? "Thu gọn danh sách" : "Xem thêm các chương khác"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Right Column: Sidebar */}
      <div className="md:col-span-4 flex flex-col gap-6">
        {/* Truyện Đang Theo Dõi / Lịch Sử Xem Tabbed Widget */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          {/* Tab buttons */}
          <div className="flex border-b border-outline-variant/50 mb-4 text-xs font-bold gap-1 pb-1">
            <button
              onClick={() => { setActiveSidebarTab('followed'); setShowAllFollowed(false); }}
              className={`flex-grow py-2 text-center rounded transition-all flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'followed'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-variant/30'
              }`}
            >
              <ViconicIcon name="favorite" size={14} className="shrink-0" />
              Đang Theo Dõi
            </button>
            <button
              onClick={() => { setActiveSidebarTab('history'); setShowAllHistory(false); }}
              className={`flex-grow py-2 text-center rounded transition-all flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'history'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-variant/30'
              }`}
            >
              <ViconicIcon name="history" size={14} className="shrink-0" />
              Lịch Sử Xem
            </button>
          </div>

          <div className="space-y-4">
            {activeSidebarTab === 'followed' ? (
              !currentUser ? (
                <div className="text-center py-6">
                  <p className="text-xs text-on-surface-variant mb-2">Vui lòng đăng nhập để xem danh sách theo dõi.</p>
                  <button 
                    onClick={() => {
                      const mockUser = {
                        name: "Độc Giả Yume",
                        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAb-14uOcA3z6oOYNNXFQZMGk5LqtQxM2cL7kShQ6UO4TvOht8YiLfBJY-3bihJuLgXze9CkbXBa6QFIw9VqTUHkpB50TncEOMChL_WpiVyFICNRCgDJc9ARVe1kNnxXUnO8MK2up2wRutKKiFBjnuceM8exGI8iRAvDvvXidxorqEi32E5PB2o9k-EKsrzj1ffNHQkPDA5LxhyYhJbSWfwvAlEKTTvNwgrsUxFkPJ1FnXVSIeWsLB4K3mNSVpSarNi49k0D31ynmtw"
                      };
                      localStorage.setItem('user', JSON.stringify(mockUser));
                      setCurrentUser(mockUser);
                      alert("Đăng nhập thành công (Demo)!");
                      window.location.reload();
                    }}
                    className="bg-primary/10 text-primary font-bold text-xs py-1 px-3 rounded hover:bg-primary/20 transition-all animate-pulse"
                  >
                    Đăng nhập
                  </button>
                </div>
              ) : (
                <>
                  {(showAllFollowed ? followedNovels : followedNovels.slice(0, 5)).map((fav) => {
                    const lastRead = localStorage.getItem(`reading_progress_${fav.id}`);
                    return (
                      <Link 
                        key={fav.id}
                        to={`/detail/${fav.id}`}
                        className="flex gap-3 hover:bg-surface-variant/30 p-1.5 rounded transition-colors group"
                      >
                        <img 
                          src={fav.cover} 
                          alt={fav.title} 
                          className="w-10 h-14 object-cover rounded-sm border border-outline-variant/50 shrink-0" 
                        />
                        <div className="min-w-0 flex-grow flex flex-col justify-center">
                          <h4 className="font-bold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                            {fav.title}
                          </h4>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{fav.author}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-variant/60 px-1.5 py-0.5 rounded border border-outline-variant/30 shrink-0">
                              Mới: C{fav.total_chapters}
                            </span>
                            {lastRead ? (
                              <span className="text-[10.5px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 animate-pulse">
                                Đang đọc: C{lastRead}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-outline bg-surface-variant/40 px-1.5 py-0.5 rounded shrink-0">
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {followedNovels.length === 0 && (
                    <div className="text-center py-6 text-xs text-on-surface-variant/70">
                      Bạn chưa theo dõi truyện nào.
                    </div>
                  )}
                  {followedNovels.length > 5 && (
                    <button 
                      onClick={() => setShowAllFollowed(!showAllFollowed)}
                      className="w-full text-center mt-2 py-2 font-bold text-xs text-primary hover:bg-primary/5 rounded border border-dashed border-outline-variant transition-colors"
                    >
                      {showAllFollowed ? "Thu gọn danh sách" : "Xem tất cả"}
                    </button>
                  )}
                </>
              )
            ) : (
              <>
                {(showAllHistory ? historyNovels : historyNovels.slice(0, 5)).map((hist) => {
                  const lastRead = localStorage.getItem(`reading_progress_${hist.id}`);
                  return (
                    <Link 
                      key={hist.id}
                      to={`/detail/${hist.id}`}
                      className="flex gap-3 hover:bg-surface-variant/30 p-1.5 rounded transition-colors group animate-in fade-in duration-300"
                    >
                      <img 
                        src={hist.cover} 
                        alt={hist.title} 
                        className="w-10 h-14 object-cover rounded-sm border border-outline-variant/50 shrink-0" 
                      />
                      <div className="min-w-0 flex-grow flex flex-col justify-center">
                        <h4 className="font-bold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                          {hist.title}
                        </h4>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                          <p className="text-[10px] text-on-surface-variant truncate">{hist.author}</p>
                          {lastRead ? (
                            <span className="text-[10.5px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                              Đang đọc: C{lastRead}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-outline bg-surface-variant/50 px-1.5 py-0.5 rounded shrink-0">
                              Chưa đọc
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-outline mt-1 font-medium">Cập nhật: {new Date(hist.update_time).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </Link>
                  );
                })}
                {historyNovels.length === 0 && (
                  <div className="text-center py-6 text-xs text-on-surface-variant/70">
                    Chưa có lịch sử xem truyện.
                  </div>
                )}
                {historyNovels.length > 5 && (
                  <button 
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full text-center mt-2 py-2 font-bold text-xs text-primary hover:bg-primary/5 rounded border border-dashed border-outline-variant transition-colors"
                  >
                    {showAllHistory ? "Thu gọn danh sách" : "Xem tất cả"}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Hot Ranking Widget */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm animate-in fade-in duration-300">
          <h2 className="font-display-lg text-lg md:text-xl text-on-surface flex items-center gap-2 mb-4 border-b border-outline-variant/50 pb-3">
            <ViconicIcon name="trending_up" size={24} className="text-primary shrink-0" />
            Truyện Đang Hot
          </h2>
          <div className="space-y-3.5">
            {hotRanking.map((novel, index) => {
              const rankColor = index === 0 
                ? 'bg-red-500 text-white shadow-xs shadow-red-500/20' 
                : index === 1 
                  ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/20' 
                  : index === 2 
                    ? 'bg-yellow-500 text-black font-extrabold shadow-xs shadow-yellow-500/20' 
                    : 'bg-surface-variant text-on-surface-variant border border-outline-variant/50';
              return (
                <Link 
                  key={novel.id}
                  to={`/detail/${novel.id}`}
                  className="flex items-center gap-3 hover:bg-surface-variant/30 p-1.5 rounded transition-colors group"
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-sm text-[10px] font-bold ${rankColor} shrink-0`}>
                    {index + 1}
                  </span>
                  <img 
                    src={novel.cover} 
                    alt={novel.title} 
                    className="w-10 h-14 object-cover rounded-sm border border-outline-variant/50 shrink-0" 
                  />
                  <div className="min-w-0 flex-grow">
                    <h4 className="font-bold text-xs text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                      {novel.title}
                    </h4>
                    <p className="text-[9px] text-on-surface-variant mt-1.5 flex items-center gap-0.5 font-medium">
                      <ViconicIcon name="visibility" size={10} className="shrink-0 text-primary" />
                      {novel.views.toLocaleString('vi-VN')} lượt xem
                    </p>
                  </div>
                </Link>
              );
            })}
            {hotRanking.length === 0 && (
              <div className="text-center py-4 text-xs text-on-surface-variant/70">
                Đang tải bảng xếp hạng...
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Thoughts/Comments at the very bottom spanning full width */}
      <section className="md:col-span-12 bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-outline-variant/50 pb-3">
        <h2 className="font-display-lg text-lg md:text-xl text-on-surface flex items-center gap-2">
          <ViconicIcon name="forum" size={24} className="text-primary shrink-0" />
          Cảm nhận ({comments.length})
        </h2>
        <div className="flex items-center border border-outline-variant/50 rounded-sm overflow-hidden p-0.5 text-[9px] font-bold">
          <button
            type="button"
            onClick={() => setSortBy('newest')}
            className={`px-2 py-0.5 transition-all rounded-[3px] ${
              sortBy === 'newest'
                ? 'bg-primary text-on-primary font-bold'
                : 'opacity-70 hover:opacity-100 text-on-surface-variant'
            }`}
          >
            Mới
          </button>
          <button
            type="button"
            onClick={() => setSortBy('hot')}
            className={`px-2 py-0.5 transition-all rounded-[3px] ${
              sortBy === 'hot'
                ? 'bg-primary text-on-primary font-bold'
                : 'opacity-70 hover:opacity-100 text-on-surface-variant'
            }`}
          >
            Hot
          </button>
        </div>
      </div>
      
      {!currentUser ? (
        <div className="mb-6 bg-surface-variant/20 border border-dashed border-outline-variant/50 p-4 rounded-sm text-center">
          <p className="text-xs text-on-surface-variant mb-2">Vui lòng đăng nhập để gửi cảm nhận của bạn về bộ truyện này.</p>
          <button 
            onClick={() => {
              const mockUser = {
                name: "Độc Giả Yume",
                avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAb-14uOcA3z6oOYNNXFQZMGk5LqtQxM2cL7kShQ6UO4TvOht8YiLfBJY-3bihJuLgXze9CkbXBa6QFIw9VqTUHkpB50TncEOMChL_WpiVyFICNRCgDJc9ARVe1kNnxXUnO8MK2up2wRutKKiFBjnuceM8exGI8iRAvDvvXidxorqEi32E5PB2o9k-EKsrzj1ffNHQkPDA5LxhyYhJbSWfwvAlEKTTvNwgrsUxFkPJ1FnXVSIeWsLB4K3mNSVpSarNi49k0D31ynmtw"
              };
              localStorage.setItem('user', JSON.stringify(mockUser));
              setCurrentUser(mockUser);
              alert("Đăng nhập thành công (Demo)!");
              window.location.reload();
            }}
            className="bg-primary text-on-primary font-bold text-xs py-1.5 px-4 rounded-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 active:scale-95"
          >
            <ViconicIcon name="login" size={12} className="shrink-0" />
            Đăng nhập ngay
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddComment} className="mb-6 flex gap-3">
          <img alt="Your avatar" className="w-10 h-10 rounded-sm shrink-0 object-cover border border-outline-variant/50" src={currentUser.avatar} />
          <div className="flex-grow flex flex-col gap-2">
            <style>{`
              .rich-editor:empty:before {
                content: attr(placeholder);
                color: #94a3b8;
                cursor: text;
              }
            `}</style>
             <div 
              ref={mainEditorRef}
              contentEditable={true}
              className="w-full bg-surface-variant/30 border border-outline-variant/50 focus:border-primary focus:ring-0 rounded-sm p-3 font-body-ui text-xs text-on-surface min-h-[80px] max-h-[200px] overflow-y-auto shadow-inner outline-none transition-colors duration-200 rich-editor" 
              {...({ placeholder: "Chia sẻ suy nghĩ của bạn về bộ truyện này..." } as any)}
              onInput={(e) => setNewCommentText(e.currentTarget.innerHTML)}
            />
            <div className="flex justify-between items-center relative">
              {/* Sticker button on the left */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMainStickerOpen(!isMainStickerOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant hover:border-primary/50 hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-all rounded-sm text-xs font-bold"
                >
                  <ViconicIcon name="sentiment_satisfied" size={14} className="shrink-0" />
                  Stickers
                </button>
                {/* Sticker Dropdown Popup */}
                {isMainStickerOpen && (
                  <div className="absolute left-0 bottom-full mb-2 z-50 w-[320px] sm:w-[360px] border border-outline-variant/60 shadow-xl bg-surface rounded-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Header: Tab select button of sticker sets */}
                    <div className="flex bg-surface-variant/40 border-b border-outline-variant/40 p-1.5 gap-2 shrink-0">
                      {STICKER_SETS.map(set => {
                        const firstStickerUrl = `${set.baseUrl}${set.items[0]}`;
                        return (
                          <button
                            key={set.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveStickerSetId(set.id);
                            }}
                            className={`p-1 rounded-sm border transition-colors flex items-center justify-center ${
                              activeStickerSetId === set.id 
                                ? 'border-primary bg-primary/10' 
                                : 'border-transparent hover:bg-surface-variant'
                            }`}
                            title={set.name}
                          >
                            <img src={firstStickerUrl} alt={set.name} className="w-6 h-6 object-contain" />
                          </button>
                        );
                      })}
                    </div>
                    {/* Scrollable list of stickers */}
                    {(() => {
                      const activeSet = STICKER_SETS.find(s => s.id === activeStickerSetId) || STICKER_SETS[0];
                      return (
                        <div className="grid grid-cols-6 gap-2 p-3 overflow-y-auto max-h-[180px] min-h-[180px] bg-surface select-none">
                          {activeSet.items.map(filename => {
                            const url = `${activeSet.baseUrl}${filename}`;
                            return (
                              <button
                                key={filename}
                                type="button"
                                onClick={() => insertStickerToMain(activeSet.id, filename)}
                                className="p-1 hover:bg-surface-variant/60 rounded-sm transition-colors aspect-square flex items-center justify-center border border-transparent hover:border-outline-variant/30 active:scale-90"
                              >
                                <img src={url} alt={filename} className="w-10 h-10 object-contain" loading="lazy" />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-sm hover:bg-primary/90 transition-colors text-xs shadow-md shadow-primary/10">Đăng cảm nhận</button>
            </div>
          </div>
        </form>
      )}
      
      <div className="space-y-3 border-t border-outline-variant/50 pt-4">
        {sortedComments.map((comment) => (
          <div 
            key={comment.id}
            className="flex gap-3 p-3 rounded-sm bg-surface hover:bg-surface-variant/20 transition-colors border border-outline-variant/50"
          >
            <div className="relative shrink-0">
              <img alt={comment.user} className="w-10 h-10 rounded-sm object-cover border border-outline-variant/50" src={comment.avatar} />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-2 truncate">
                  <span className="font-label-bold text-on-surface text-xs truncate">{comment.user}</span>
                  <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-80 shrink-0">{comment.time}</span>
                </div>
                <button className="text-outline hover:text-primary transition-colors flex items-center justify-center shrink-0">
                  <ViconicIcon name="more_horiz" size={14} className="shrink-0" />
                </button>
              </div>
              <p 
                className="font-body-ui text-[12px] text-on-surface mt-1 leading-relaxed text-justify break-words"
                dangerouslySetInnerHTML={{ __html: renderCommentContentHtml(comment.text) }}
              />
              <div className="flex items-center gap-4 mt-2">
                <button 
                  onClick={() => handleLikeComment(comment.id)}
                  className={`flex items-center gap-1 transition-colors group ${
                    comment.likedByUser ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <ViconicIcon name="favorite" size={14} className={`shrink-0 ${comment.likedByUser ? 'text-primary scale-110' : 'group-hover:scale-110'} transition-transform duration-150`} /> 
                  <span className="font-bold text-[10px]">{comment.likes}</span>
                </button>
                <button 
                  onClick={() => {
                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                    setReplyText('');
                  }}
                  className={`font-bold text-[10px] transition-colors flex items-center gap-1 ${
                    replyingToId === comment.id ? 'text-primary animate-pulse' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <ViconicIcon name="reply" size={14} className="shrink-0" />
                  Phản hồi
                </button>
              </div>

              {/* Nested Replies List */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3.5 space-y-3.5 pl-4 border-l-2 border-outline-variant/30 animate-in fade-in duration-300">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2.5 bg-surface-variant/20 p-2.5 rounded-sm border border-outline-variant/20">
                      <img alt={reply.user} className="w-8 h-8 rounded-sm object-cover border border-outline-variant/50 shrink-0" src={reply.avatar} />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-baseline gap-2 truncate">
                          <span className="font-label-bold text-on-surface text-[11px] truncate">{reply.user}</span>
                          <span className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest opacity-80 shrink-0">{reply.time}</span>
                        </div>
                        <p 
                          className="font-body-ui text-[11.5px] text-on-surface mt-1 leading-relaxed text-justify break-words"
                          dangerouslySetInnerHTML={{ __html: renderCommentContentHtml(reply.text) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {replyingToId === comment.id && (
                <form onSubmit={(e) => handleAddReply(comment.id, e)} className="mt-3 bg-surface-variant/10 p-3 rounded-sm border border-dashed border-outline-variant/60 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                  <img alt="Your avatar" className="w-8 h-8 rounded-sm shrink-0 object-cover border border-outline-variant/50" src={currentUser ? currentUser.avatar : "https://lh3.googleusercontent.com/aida-public/AB6AXuD1epYzUm9PYg5Z4v3zZXDsv3Ph06NlgpommDOBvTTqpLS3sgVhIeXPPp9WnpwOkdoqtjcPa7sGjgQfoBHy1XdCxXIKD7tqus0SdH1HPjLIKxGI69O0lGijT1mmXVujCcTxU8e4qviArMpb35YAx9YX9MqEvEk89DXG1XvQL29j24ny5Zf8gpuufV0HirEieDmpzG4wzbSixeeYFb8Jzm5F7Pj_zz0pQAd7bOyes99b2icDY6xwJomVgVwm7mLtPK9U6SCF3BpQUm0w"} />
                  <div className="flex-grow flex flex-col gap-2">
                    <div 
                      ref={replyEditorRef}
                      contentEditable={true}
                      className="w-full bg-surface border border-outline-variant/50 focus:border-primary focus:ring-0 rounded-sm p-2.5 font-body-ui text-xs text-on-surface min-h-[56px] max-h-[120px] overflow-y-auto placeholder:text-outline outline-none shadow-inner rich-editor" 
                      {...({ placeholder: `Phản hồi bình luận của ${comment.user}...` } as any)}
                      onInput={(e) => setReplyText(e.currentTarget.innerHTML)}
                    />
                    <div className="flex justify-between items-center relative text-[10px]">
                      {/* Reply Sticker button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setReplyStickerOpenId(replyStickerOpenId === comment.id ? null : comment.id)}
                          className="flex items-center gap-1 px-2 py-1 border border-outline-variant hover:border-primary/50 hover:bg-primary/5 text-on-surface-variant hover:text-primary transition-all rounded-sm text-[10px] font-bold"
                        >
                          <ViconicIcon name="sentiment_satisfied" size={12} className="shrink-0" />
                          Stickers
                        </button>
                        {/* Reply Sticker Dropdown Popup */}
                        {replyStickerOpenId === comment.id && (
                          <div className="absolute left-0 bottom-full mb-2 z-50 w-[280px] sm:w-[320px] border border-outline-variant/60 shadow-xl bg-surface rounded-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {/* Header: Tab select button of sticker sets */}
                            <div className="flex bg-surface-variant/40 border-b border-outline-variant/40 p-1.5 gap-2 shrink-0">
                              {STICKER_SETS.map(set => {
                                const firstStickerUrl = `${set.baseUrl}${set.items[0]}`;
                                return (
                                  <button
                                    key={set.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setActiveStickerSetId(set.id);
                                    }}
                                    className={`p-1 rounded-sm border transition-colors flex items-center justify-center ${
                                      activeStickerSetId === set.id 
                                        ? 'border-primary bg-primary/10' 
                                        : 'border-transparent hover:bg-surface-variant'
                                    }`}
                                    title={set.name}
                                  >
                                    <img src={firstStickerUrl} alt={set.name} className="w-5 h-5 object-contain" />
                                  </button>
                                );
                              })}
                            </div>
                            {/* Scrollable list of stickers */}
                            {(() => {
                              const activeSet = STICKER_SETS.find(s => s.id === activeStickerSetId) || STICKER_SETS[0];
                              return (
                                <div className="grid grid-cols-5 gap-1.5 p-2 overflow-y-auto max-h-[150px] min-h-[150px] bg-surface select-none">
                                  {activeSet.items.map(filename => {
                                    const url = `${activeSet.baseUrl}${filename}`;
                                    return (
                                      <button
                                        key={filename}
                                        type="button"
                                        onClick={() => insertStickerToReply(activeSet.id, filename)}
                                        className="p-1 hover:bg-surface-variant/60 rounded-sm transition-colors aspect-square flex items-center justify-center border border-transparent hover:border-outline-variant/30 active:scale-90"
                                      >
                                        <img src={url} alt={filename} className="w-8 h-8 object-contain" loading="lazy" />
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1 bg-surface border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors rounded-sm font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-primary text-on-primary hover:bg-primary/95 transition-colors rounded-sm font-bold shadow-xs shadow-primary/10"
                        >
                          Phản hồi
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="text-center py-8 border border-dashed border-outline-variant/50 rounded-sm text-xs text-on-surface-variant/70">
            Chưa có cảm nhận nào cho truyện. Hãy viết cảm nhận đầu tiên!
          </div>
        )}
      </div>
    </section>
    </div>
  );
};

export default DetailPage;
