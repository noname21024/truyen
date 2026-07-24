import React from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { formatViews } from '@/lib/format';
import { StoryFollowService } from '@/lib/api';

interface NovelCardProps {
  id: string | number;
  title: string;
  author: string;
  status: string;
  statusColor?: string;
  image: string;
  views?: number;
  isVip?: boolean;
}

const NovelCard: React.FC<NovelCardProps> = ({ id, title, author, status, image, views, isVip }) => {
  const [isFollowed, setIsFollowed] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        const followed = localStorage.getItem(`follow_novel_${id}_user_${u.id}`) === '1';
        setIsFollowed(followed);
      } catch (e) {}
    }

    const handleFollowUpdate = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          const followed = localStorage.getItem(`follow_novel_${id}_user_${u.id}`) === '1';
          setIsFollowed(followed);
        } catch {}
      }
    };
    window.addEventListener('followed-novels-updated', handleFollowUpdate);
    return () => window.removeEventListener('followed-novels-updated', handleFollowUpdate);
  }, [id]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      import('@/lib/dialog').then(({ showToast }) => {
        showToast("Vui lòng đăng nhập để theo dõi truyện!");
      });
      return;
    }

    const key = `follow_novel_${id}_user_${currentUser.id}`;
    const wasFollowed = isFollowed;
    setIsFollowed(!wasFollowed);

    try {
      // This used to only write localStorage, so following from a card never
      // reached the server: it vanished on another browser, and once the shelf
      // started reading from the server it stopped showing up at all.
      const result = await StoryFollowService.toggle(id);
      setIsFollowed(result.following);
      if (result.following) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
      const { showToast } = await import('@/lib/dialog');
      showToast(result.following
        ? `Đã thêm ${title} vào danh sách theo dõi`
        : `Đã hủy theo dõi truyện ${title}`);
      window.dispatchEvent(new CustomEvent('followed-novels-updated'));
    } catch {
      setIsFollowed(wasFollowed);
      const { showToast } = await import('@/lib/dialog');
      showToast('Không thể cập nhật theo dõi. Vui lòng thử lại!');
    }
  };

  // Standardize status text and color
  const statusUpper = status ? status.toUpperCase() : '';
  const displayStatus = (statusUpper === 'HOÀN THÀNH' || statusUpper === 'COMPLETED') ? 'Hoàn thành' : 'Đang ra';
  const statusClass = (statusUpper === 'HOÀN THÀNH' || statusUpper === 'COMPLETED') 
    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
    : 'bg-primary/10 text-primary border border-primary/20';

  return (
    // `isolate` keeps the z-30 follow button and z-20 hover overlay inside the
    // card's own stacking context. Without it they sit in the page context at the
    // same z-30 as the sort/genre dropdowns on the listing pages — and since the
    // cards come later in the DOM, they painted on top of an open dropdown.
    <div className="group relative isolate">
      <Link
        data-novel-slug={id}
        to={`/detail/${id}`}
        className="block bg-surface rounded-sm overflow-hidden border border-outline-variant/50 hover:border-primary transition-colors duration-200"
      >
        <div className="relative h-48 md:h-56 overflow-hidden">
          <img
            alt={title}
            className="w-full h-full object-cover"
            src={image}
            loading="lazy"
            decoding="async"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Right top bookmark/follow button */}
          <button
            onClick={handleFollowToggle}
            className={`absolute top-3 right-3 w-8 h-8 rounded-sm border flex items-center justify-center transition-all duration-200 shadow-md backdrop-blur-sm z-30 ${
              isFollowed 
                ? 'bg-primary border-primary text-on-primary scale-105' 
                : 'bg-neutral-950/85 border-outline-variant/20 text-white/40 hover:text-white hover:scale-105'
            }`}
            title={isFollowed ? "Hủy theo dõi" : "Theo dõi truyện"}
          >
            {/* Lucide icons are stroke-only, so "filled" comes from painting the
                interior with the current text colour once followed. */}
            <ViconicIcon
              name="m9:bookmark-rounded"
              size={16}
              className={isFollowed ? 'fill-current' : ''}
            />
          </button>

          {/* Quick Action Overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
            <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg flex items-center justify-center">
              <ViconicIcon name="play_arrow" size="20px" className="text-primary" />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-outline-variant/50 bg-surface flex flex-col gap-1.5">
          {/* Status & VIP badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${statusClass} text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider`}>
              {displayStatus}
            </span>
            {isVip && (
              <span className="bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00]/20 text-[9px] px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 uppercase tracking-wider">
                <ViconicIcon name="u4:vip-crown-queen-1-bold" size={9} className="shrink-0" />
                <span>VIP</span>
              </span>
            )}
          </div>

          <h3 className="font-label-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1 uppercase tracking-wider truncate flex-grow">
              <ViconicIcon name="person" size={12} className="shrink-0" />
              <span className="truncate">{author}</span>
            </p>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <ViconicIcon name="visibility" size={12} className="shrink-0" />
              <span className="text-[10px] font-bold">{formatViews(views || 0)}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default NovelCard;
