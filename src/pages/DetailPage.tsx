import React, { useState, useEffect } from 'react';
import ChapterItem from '@/components/cards/ChapterItem';
import CommentItem from '@/components/cards/CommentItem';
import { useParams, Link } from 'react-router-dom';
import novelsDataJson from '@/data/novelsIndex.json';
const novelsData = novelsDataJson as any[];
import { getNovelViews } from '@/lib/viewCountService';

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const novel = novelsData.find(n => n.id === id);

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [chapters, setChapters] = useState<string[]>([]);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (id) {
      setViewCount(getNovelViews(id));
    }
  }, [id]);

  useEffect(() => {
    if (novel) {
      fetch(`/data/${encodeURIComponent(novel.folder)}/toc.json`)
        .then(res => res.json())
        .then(data => setChapters(data))
        .catch(err => console.error("Failed to load TOC", err));
    }
  }, [novel]);

  if (!novel) {
    return (
      <div className="pt-20 pb-12 px-6 text-center text-on-surface">
        <h1 className="font-display-lg text-xl md:text-2xl mb-4">Truyện không tồn tại</h1>
        <Link to="/" className="text-primary hover:underline">Quay lại trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-12 px-6 md:px-12 max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Novel Header (Cover + Info) */}
      <section 
        className="md:col-span-12 flex flex-col md:flex-row gap-8 mb-6 bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm"
      >
        {/* Cover Art */}
        <div className="md:w-1/3 lg:w-1/4 shrink-0 relative group">
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
        <div className="md:w-2/3 lg:w-3/4 flex flex-col justify-center">
          <h1 className="font-display-lg text-2xl md:text-3xl text-on-surface mb-2 leading-tight tracking-tight">{novel.title}</h1>
          <p className="font-body-ui text-primary mb-4 flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-sm">edit</span>
            {novel.author || "Đang cập nhật"}
          </p>
          <div className="flex items-center gap-4 mb-6 bg-surface-variant/30 p-2.5 rounded-sm border border-outline-variant/50 w-fit">
            <div className="flex items-center text-amber-500 gap-0.5 sm:gap-1 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="material-symbols-outlined text-base sm:text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
              <span className="material-symbols-outlined text-base sm:text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
              <span className="ml-1 font-bold text-on-surface text-xs sm:text-sm">4.8</span>
              <span className="text-on-surface-variant text-[10px] sm:text-xs ml-1">(1,240)</span>
            </div>
            <div className="h-4 w-px bg-outline-variant" />
            <span className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">visibility</span>
              {viewCount} lượt xem
            </span>
            <div className="h-4 w-px bg-outline-variant" />
            <span className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-primary text-sm">text_snippet</span>
              {novel.word_count ? `${Math.floor(novel.word_count / 1000)}k` : "0"} chữ
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
              <span className="material-symbols-outlined text-sm">menu_book</span>
              Đọc Ngay
            </Link>
            <button className="bg-surface border border-outline-variant text-primary font-bold px-6 py-2.5 rounded-sm hover:bg-surface-variant transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0" }}>favorite</span>
              Theo Dõi
            </button>
          </div>
        </div>
      </section>

      {/* Left Column: Synopsis & Chapters */}
      <div className="md:col-span-8 flex flex-col gap-6">
        {/* Synopsis */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          <h2 className="font-display-lg text-lg md:text-xl text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <span className="material-symbols-outlined text-primary">info</span>
            Nội dung tóm tắt
          </h2>
          <div className="font-body-reading text-sm text-on-surface-variant space-y-4 leading-relaxed relative">
            {(() => {
              const paragraphs = (novel.intro || "Đang cập nhật nội dung tóm tắt.").split('\n').filter((p: string) => p.trim() !== '');
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
          {((novel.intro || "").split('\n').filter((p: string) => p.trim() !== '').length > 3) && (
            <button 
              onClick={() => setIsDescExpanded(!isDescExpanded)}
              className="mt-4 font-bold text-sm text-primary hover:underline flex items-center gap-1"
            >
              {isDescExpanded ? "Thu gọn" : "Xem thêm"}
              <span className="material-symbols-outlined text-sm">{isDescExpanded ? "expand_less" : "expand_more"}</span>
            </button>
          )}
        </section>

        {/* Chapter List */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-outline-variant/50 pb-3">
            <h2 className="font-display-lg text-lg md:text-xl text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">format_list_bulleted</span>
              Danh sách chương
            </h2>
            <span className="font-bold text-[10px] sm:text-xs text-on-surface-variant bg-surface-variant px-2 py-1 rounded-sm shrink-0">
              {chapters.length > 0 ? chapters.length : novel.chapter_count || 0} Chương
            </span>
          </div>
          <div className="space-y-1">
            {[...chapters].reverse().slice(0, showAllChapters ? chapters.length : 10).map((title, displayIdx) => {
              const realIndex = chapters.length - displayIdx; // chapter number (1-based)
              return (
                <ChapterItem 
                  key={displayIdx} 
                  id={`${novel.id}/${realIndex}`} 
                  title={title} 
                  date={novel.update_time ? new Date(novel.update_time).toLocaleDateString('vi-VN') : "Mới đây"} 
                />
              );
            })}
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
        {/* Author Card */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm text-center relative overflow-hidden">
          <div className="relative z-10">
            <img 
              alt="Author Profile" 
              className="w-20 h-20 rounded-sm mx-auto mb-4 border border-outline-variant/50 object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfl8dBytya6bKlC_Npx-rb30V1qPRjtJUQFu5T2BA-TwXGepBnHzr-7woUP2HQM6YMdKFHhfeI4zH4ZatJWH4jyk3Q8e2OyY8qg65dVbaD0TULy9Xl0CToRZ9X7XBMqLg0yVb4AQQDubWGN2FpWpjDJZhJwrhxkaMLpkIbg28nCUJ8P6-KV-r0nKaHItrD5urNgo-TgccHVtZOnO6R8P723hpZrOXFpO3iWHWLofwle1BrpyaQcRm_I5KMs7v39tDzjFHYkKSBIpp0" 
            />
            <h3 className="font-display-lg text-lg text-on-surface mb-1">Sakura Minori</h3>
            <p className="font-medium text-xs text-on-surface-variant mb-4 px-2 leading-relaxed">"Dệt nên những giấc mơ từ những cánh hoa đào rơi."</p>
            <div className="flex justify-center gap-2">
              <button className="w-8 h-8 rounded-sm bg-surface-variant flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">language</span>
              </button>
              <button className="w-8 h-8 rounded-sm bg-surface-variant flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">mail</span>
              </button>
            </div>
          </div>
        </section>

        {/* Thoughts/Comments */}
        <section className="bg-surface border border-outline-variant/50 p-6 rounded-sm shadow-sm">
          <h2 className="font-display-lg text-lg md:text-xl text-on-surface mb-4 flex items-center gap-2 border-b border-outline-variant/50 pb-3">
            <span className="material-symbols-outlined text-primary">forum</span>
            Cảm nhận
          </h2>
          <div className="mb-6 flex gap-3">
            <img alt="Your avatar" className="w-10 h-10 rounded-sm shrink-0 object-cover border border-outline-variant/50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb-14uOcA3z6oOYNNXFQZMGk5LqtQxM2cL7kShQ6UO4TvOht8YiLfBJY-3bihJuLgXze9CkbXBa6QFIw9VqTUHkpB50TncEOMChL_WpiVyFICNRCgDJc9ARVe1kNnxXUnO8MK2up2wRutKKiFBjnuceM8exGI8iRAvDvvXidxorqEi32E5PB2o9k-EKsrzj1ffNHQkPDA5LxhyYhJbSWfwvAlEKTTvNwgrsUxFkPJ1FnXVSIeWsLB4K3mNSVpSarNi49k0D31ynmtw" />
            <div className="flex-grow flex flex-col gap-2">
              <textarea className="w-full bg-surface-variant/30 border border-outline-variant/50 focus:border-primary focus:ring-0 rounded-sm p-3 font-body-ui text-xs text-on-surface resize-none h-20 placeholder:text-outline shadow-inner" placeholder="Chia sẻ suy nghĩ của bạn về bộ truyện này..."></textarea>
              <div className="flex justify-end">
                <button className="bg-primary text-on-primary font-bold px-6 py-2 rounded-sm hover:bg-primary/90 transition-colors text-xs">Đăng cảm nhận</button>
              </div>
            </div>
          </div>
          <div className="space-y-2 border-t border-outline-variant/50 pt-4">
            <CommentItem 
              user="YukiReader" 
              time="2 giờ trước" 
              text="Truyện nhẹ nhàng quá, đọc xong chương 1 mà thấy man mác buồn. Hóng chương mới!" 
              likes={12} 
              avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuAN-dDBgHYemMZ3kCdUIYxicDtpk4jZimRFi2kCTlcLEt6oZzJuj0biwIJyEHpQRgzQ8nbJjKEU5Bg2aDrk5nqY7MIYz9xriM1CLk6rX0tsa-GRCpGv7zMZ0fqFmNvF5IZ46AQaz8Mt7x4-AoT1CBE6UP7BWVS01XNXCz8Uwm6ba5tvIJ0yg5mgaaRD2U1vWuM_tm4QsLeiC7s7hEBX9KnDmjf9U97hOOfpDjkFQvep4ILDLbuZhfTyLp2n00ak4WA0qG1W77v1Uskf" 
            />
            <CommentItem 
              user="Koko_Nut" 
              time="Hôm qua" 
              text="Haru chắc chắn có liên quan đến quá khứ của Aki. Motif quen thuộc nhưng cách viết rất mượt." 
              likes={8} 
              avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuD1epYzUm9PYg5Z4v3zZXDsv3Ph06NlgpommDOBvTTqpLS3sgVhIeXPPp9WnpwOkdoqtjcPa7sGjgQfoBHy1XdCxXIKD7tqus0SdH1HPjLIKxGI69O0lGijT1mmXVujCcTxU8e4qviArMpb35YAx9YX9MqEvEk89DXG1XvQL29j24ny5Zf8gpuufV0HirEieDmpzG4wzbSixeeYFb8Jzm5F7Pj_zz0pQAd7bOyes99b2icDY6xwJomVgVwm7mLtPK9U6SCF3BpQUm0w" 
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DetailPage;
