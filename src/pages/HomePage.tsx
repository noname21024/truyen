import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NovelCard from '@/components/cards/NovelCard';
import RankItem from '@/components/cards/RankItem';
import CategoryItem from '@/components/cards/CategoryItem';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import novelsData from '@/data/novelsIndex.json';
import { getAllNovelViews } from '@/lib/viewCountService';



const HomePage: React.FC = () => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const viewsMap = getAllNovelViews();

  const categories = [
    { icon: "favorite", name: "Lãng Mạn" },
    { icon: "swords", name: "Hành Động" },
    { icon: "magic_button", name: "Isekai" },
    { icon: "local_cafe", name: "Đời Thường" },
    { icon: "school", name: "Học Đường" },
    { icon: "mystery", name: "Bí Ẩn" },
    { icon: "auto_awesome", name: "Xuyên không" },
    { icon: "settings", name: "Hệ thống" },
    { icon: "coronavirus", name: "Mạt thế" },
    { icon: "inventory_2", name: "Tích trữ vật tư" },
  ];

  // Dynamic novel updates mapped from the real data
  const novelUpdates = novelsData.map(novel => ({
    id: novel.id,
    title: novel.title,
    author: novel.author || "Đang cập nhật",
    status: novel.status,
    color: novel.status === 'Hoàn thành' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200',
    img: novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"
  }));


  const displayedCategories = showAllCategories ? categories : categories.slice(0, 6);


  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full h-[400px] flex items-center justify-center overflow-hidden bg-surface">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-80 mix-blend-overlay" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAydTo29W52Dg7sbyfPwdPshpy7U6JzBu26TWMXVJ64PmlBCe75VM6G8sPesCeVpApQrYaBg61SdwNtvV4wNZkgSrfYHn5TFjmVTa509P-pr6z0ZUvaMjymZhVnAG0VXiRo7FgpBpRdaNSNX9cbEMbYyxBmNRAppC3xyZYdC3MSiaTCKqq-6sY1Gn985yu_J9TpIipMl415-_FlE25OVXNIt36AXwA3666ssWLivBn8UY9wiksyALVEFSmq7b9u23l0wadGL8ov4l3" 
          />


          {/* Soft Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-[1200px] px-8 flex flex-col items-start">
          <div>
            <span className="bg-primary text-on-primary font-bold text-xs px-3 py-1 uppercase tracking-widest mb-4 inline-block">
              YumeNovel
            </span>
            <h1 className="font-display-lg text-3xl sm:text-4xl md:text-5xl text-on-surface mb-4 max-w-2xl leading-[1.1] tracking-tight">
              Khám Phá Giấc Mơ Qua Từng Trang Sách
            </h1>
            <p className="font-body-reading text-sm sm:text-base text-on-surface-variant mb-8 max-w-xl leading-relaxed">
              Thế giới Light Novel đầy màu sắc. Nơi những cảm xúc nhẹ nhàng và những cuộc phiêu lưu kỳ thú bắt đầu.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary text-on-primary font-label-bold px-6 py-3 rounded-sm hover:bg-primary/90 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">explore</span>
                Khám Phá Ngay
              </button>
              <button className="bg-surface border border-outline text-on-surface font-label-bold px-6 py-3 rounded-sm hover:bg-surface-variant transition-colors">
                Thư Viện
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-8 py-10 space-y-16">
        {/* Mới Cập Nhật Section */}
        <section>
          <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
            <div>
              <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-primary">update</span>
                Mới Cập Nhật
              </h2>
            </div>
            <Link className="font-bold text-sm text-primary hover:text-primary/80 transition-colors" to="/new-update">
              Xem tất cả →
            </Link>
          </div>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={16}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            breakpoints={{
              640: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 5 },
            }}
            className="pb-12 swiper-custom"
          >
            {novelUpdates.map((novel) => (
              <SwiperSlide key={novel.id}>
                <NovelCard 
                  id={novel.id}
                  title={novel.title} 
                  author={novel.author} 
                  status={novel.status} 
                  statusColor={novel.color} 
                  image={novel.img}
                  views={viewsMap[novel.id] || 0}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Bảng Xếp Hạng Section */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* BXH */}
            <div className="lg:col-span-8">
              <div className="flex justify-between items-end mb-6 border-b border-outline-variant/50 pb-4">
                <div>
                  <h2 className="font-display-lg text-lg sm:text-xl md:text-2xl text-on-surface flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-primary">trending_up</span>
                    Bảng Xếp Hạng
                  </h2>
                </div>
                <div className="flex gap-1">
                  <button className="px-3 py-1 bg-primary text-on-primary text-xs font-bold rounded-sm">Tháng</button>
                  <button className="px-3 py-1 bg-surface-variant text-on-surface-variant text-xs font-bold hover:bg-surface-dim transition-colors rounded-sm">Tuần</button>
                </div>
              </div>
              <div className="bg-surface border border-outline-variant/50 p-2 space-y-1">
                {novelsData.slice(0, 3).map((novel, index) => {
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
                      reads={`${viewsMap[novel.id] || 0} views`} 
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
                <span className="material-symbols-outlined text-primary">category</span>
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
                      <span className="material-symbols-outlined text-sm">expand_less</span>
                      Ẩn bớt
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">expand_more</span>
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
