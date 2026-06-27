import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import NovelCard from '@/components/cards/NovelCard';
import { NovelService } from '@/lib/api';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [followedNovels, setFollowedNovels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shelf' | 'activity'>('shelf');

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) {
      alert("Vui lòng đăng nhập để truy cập trang cá nhân!");
      navigate('/');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(saved);
      setCurrentUser(parsedUser);

      // Scan localStorage to find followed novel slugs for this specific user
      const followedSlugs: string[] = [];
      const prefix = 'follow_novel_';
      const userPart = `_user_${parsedUser.name}`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key.endsWith(userPart)) {
          // Robust split-based slug extraction
          const parts = key.split(userPart);
          if (parts.length > 0) {
            const slug = parts[0].substring(prefix.length);
            followedSlugs.push(slug);
          }
        }
      }

      // Fetch novels from API and filter matches
      NovelService.getNovels()
        .then(data => {
          const matched = data.filter((novel: any) => followedSlugs.includes(novel.slug));
          setFollowedNovels(matched);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load followed novels from API:", err);
          setLoading(false);
        });
    } catch (e) {
      console.error("Failed to parse user session", e);
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    alert("Đã đăng xuất tài khoản!");
    navigate('/');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-12 animate-pulse">
        <div className="h-6 bg-outline-variant/30 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-4">
            <div className="bg-surface border border-outline-variant/30 rounded-sm p-6 space-y-4">
              <div className="w-24 h-24 bg-outline-variant/30 rounded-full mx-auto" />
              <div className="h-5 bg-outline-variant/30 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-outline-variant/30 rounded w-1/3 mx-auto" />
            </div>
          </div>
          <div className="md:col-span-8 space-y-4">
            <div className="h-10 bg-outline-variant/30 rounded w-1/3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-outline-variant/30 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="max-w-[1300px] mx-auto px-6 md:px-12 pt-6 pb-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-xs opacity-75 mb-8 truncate">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <ViconicIcon name="home" size={14} className="mr-1 shrink-0" />
              Trang chủ
            </Link>
          </li>
          <li className="flex items-center font-bold">
            <ViconicIcon name="chevron_right" size={14} className="mx-1 opacity-50 shrink-0" />
            Trang cá nhân
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: User Profile Card */}
        <div className="md:col-span-4">
          <div className="bg-surface border border-outline-variant/50 rounded-sm shadow-sm overflow-hidden sticky top-[96px]">
            {/* Banner Deco */}
            <div className="h-24 bg-gradient-to-r from-primary/30 to-primary/10 relative" />
            
            <div className="px-6 pb-6 relative flex flex-col items-center">
              {/* Avatar */}
              <div className="relative -mt-12 mb-4 shrink-0">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-24 h-24 rounded-full border-4 border-surface object-cover shadow-md"
                />
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-surface rounded-full shadow-sm" />
              </div>

              {/* User Bio */}
              <h2 className="font-display-lg text-lg font-bold text-on-surface mb-0.5 text-center">{currentUser.name}</h2>
              <span className="font-label-bold text-[10px] text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider mb-5">
                Độc giả thân thiết
              </span>

              {/* Metadata details */}
              <div className="w-full space-y-3 border-t border-b border-outline-variant/30 py-4 mb-5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="mail" size={14} className="shrink-0 text-primary/80" />
                    Email:
                  </span>
                  <span className="font-bold text-on-surface">docgia@yumenovels.com</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="calendar_today" size={14} className="shrink-0 text-primary/80" />
                    Tham gia:
                  </span>
                  <span className="font-bold text-on-surface">20 tháng 6, 2026</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
                    <ViconicIcon name="login" size={14} className="shrink-0" />
                    Loại tài khoản:
                  </span>
                  <span className="font-bold text-on-surface uppercase tracking-wider text-[10px] bg-surface-variant px-2 py-0.5 rounded-sm">
                    Google (OAuth)
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full bg-surface border border-outline-variant hover:bg-surface-variant hover:text-primary transition-all duration-200 py-2.5 rounded-sm font-bold text-xs flex items-center justify-center gap-2 text-on-surface-variant active:scale-95"
              >
                <ViconicIcon name="logout" size={14} className="shrink-0" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: User content tabs */}
        <div className="md:col-span-8">
          {/* Tab selector */}
          <div className="flex border-b border-outline-variant/50 mb-6 font-label-bold text-label-bold text-sm">
            <button
              onClick={() => setActiveTab('shelf')}
              className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'shelf'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <ViconicIcon name="auto_stories" size={16} className="shrink-0" />
              <span>Tủ sách theo dõi ({followedNovels.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'activity'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-primary'
              }`}
            >
              <ViconicIcon name="history" size={16} className="shrink-0" />
              <span>Lịch sử hoạt động</span>
            </button>
          </div>

          {/* Tab Content 1: Bookshelf Grid */}
          {activeTab === 'shelf' && (
            <div>
              {followedNovels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  {followedNovels.map((novel) => (
                    <NovelCard 
                      key={novel.id}
                      id={novel.slug}
                      title={novel.title}
                      author={novel.author || "Đang cập nhật"}
                      status={novel.status === 'COMPLETED' ? 'Hoàn thành' : 'Đang ra'}
                      statusColor={novel.status === 'COMPLETED' ? 'bg-blue-600 text-white' : 'bg-primary text-on-primary'}
                      image={novel.cover_url}
                      views={novel.view_count}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-outline-variant/50 rounded-sm p-6">
                  <div className="w-16 h-16 bg-surface-variant/30 text-outline rounded-full flex items-center justify-center mx-auto mb-4 border border-outline-variant/30">
                    <ViconicIcon name="auto_stories" size={32} className="shrink-0 text-outline-variant" />
                  </div>
                  <h3 className="font-display-lg text-base font-bold text-on-surface mb-2">Tủ sách theo dõi trống</h3>
                  <p className="text-xs text-on-surface-variant/80 max-w-sm mx-auto mb-6">
                    Bạn chưa theo dõi tác phẩm nào. Hãy theo dõi các bộ tiểu thuyết yêu thích để nhận thông báo chương mới ngay tại đây!
                  </p>
                  <Link 
                    to="/" 
                    className="bg-primary text-on-primary font-bold text-xs px-6 py-2.5 rounded-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-md shadow-primary/10 active:scale-95"
                  >
                    <ViconicIcon name="explore" size={14} className="shrink-0" />
                    Khám phá truyện hay
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Activity List (Mocked / Local logs) */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex gap-4 p-4 border border-outline-variant/30 rounded-sm bg-surface/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <ViconicIcon name="favorite" size={16} className="shrink-0" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs text-on-surface font-medium">
                    Bạn đã thêm bộ truyện <Link to="/detail/xuyen-thanh-cong-chua-dien-trong-thoi-loan-the-bat-dau-bang-viec-cuop-boc-de-dung-nuoc" className="text-primary font-bold hover:underline">Xuyên Thành Công Chúa Điên Trong Thời Loạn Thế...</Link> vào danh sách theo dõi.
                  </p>
                  <span className="text-[10px] text-outline font-medium block mt-1">Vừa xong</span>
                </div>
              </div>

              <div className="flex gap-4 p-4 border border-outline-variant/30 rounded-sm bg-surface/50">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <ViconicIcon name="star" size={16} className="shrink-0" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs text-on-surface font-medium">
                    Bạn đã gửi đánh giá <strong className="text-amber-500">5 sao</strong> cho tác phẩm <Link to="/detail/xuyen-thanh-cong-chua-dien-trong-thoi-loan-the-bat-dau-bang-viec-cuop-boc-de-dung-nuoc" className="text-primary font-bold hover:underline">Xuyên Thành Công Chúa Điên Trong Thời Loạn Thế...</Link>
                  </p>
                  <span className="text-[10px] text-outline font-medium block mt-1">10 phút trước</span>
                </div>
              </div>

              <div className="flex gap-4 p-4 border border-outline-variant/30 rounded-sm bg-surface/50">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <ViconicIcon name="login" size={16} className="shrink-0" />
                </div>
                <div className="flex-grow">
                  <p className="text-xs text-on-surface font-medium">
                    Đăng nhập thành công vào hệ thống YumeNovels qua cổng kết nối Google.
                  </p>
                  <span className="text-[10px] text-outline font-medium block mt-1">20 phút trước</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
