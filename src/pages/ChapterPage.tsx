import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import novelsData from '@/data/novelsIndex.json';
import { incrementNovelView } from '@/lib/viewCountService';

const ChapterPage: React.FC = () => {
  const { novelId, chapterIndex } = useParams<{ novelId: string; chapterIndex: string }>();
  const navigate = useNavigate();
  const novel = novelsData.find(n => n.id === novelId);
  const currentIndex = parseInt(chapterIndex || '1', 10);

  const [toc, setToc] = useState<string[]>([]);
  const [chapterData, setChapterData] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight] = useState(1.8);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight') {
        if (toc.length === 0 || currentIndex < toc.length) {
          navigate(`/chapter/${novelId}/${currentIndex + 1}`);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 1) {
          navigate(`/chapter/${novelId}/${currentIndex - 1}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, novelId, toc.length, navigate]);

  useEffect(() => {
    if (novel) {
      // Fetch TOC
      fetch(`/data/${encodeURIComponent(novel.folder)}/toc.json`)
        .then(res => res.json())
        .then(data => setToc(data))
        .catch(err => console.error(err));
      
      // Fetch Chapter
      setLoading(true);
      fetch(`/data/${encodeURIComponent(novel.folder)}/chapters/chapter${currentIndex}.json`)
        .then(res => res.json())
        .then(data => {
          setChapterData(data);
          setLoading(false);
          window.scrollTo(0, 0);
        })
        .catch(err => {
          console.error("Failed to load chapter", err);
          setLoading(false);
        });
      
      // Increment view count when a chapter is opened, but only once per session per novel
      const sessionKey = `viewed_${novelId}`;
      const alreadyViewed = sessionStorage.getItem(sessionKey);
      if (!alreadyViewed) {
        if (novelId) incrementNovelView(novelId);
        sessionStorage.setItem(sessionKey, '1');
      }
    }
  }, [novel, currentIndex, novelId]);

  if (!novel) return <div className="text-center py-20">Truyện không tồn tại</div>;

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-gutter py-8 min-h-screen">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center text-label-sm font-label-sm text-on-surface-variant mb-6">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link className="hover:text-primary transition-colors flex items-center" to="/">
              <span className="material-symbols-outlined text-[16px] mr-1">home</span>
              Trang chủ
            </Link>
          </li>
          <li>
            <div className="flex items-center min-w-0">
              <span className="material-symbols-outlined text-[16px] mx-1 text-outline-variant shrink-0">chevron_right</span>
              <Link className="hover:text-primary transition-colors truncate" to={`/detail/${novel.id}`}>{novel.title}</Link>
            </div>
          </li>
          <li aria-current="page" className="min-w-0">
            <div className="flex items-center min-w-0">
              <span className="material-symbols-outlined text-[16px] mx-1 text-outline-variant shrink-0">chevron_right</span>
              <span className="text-on-surface font-medium truncate">Chương {currentIndex}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Content Header */}
      <header className="mb-8 text-center max-w-[1000px] mx-auto mt-6">
        <h1 className="font-display-lg text-xl md:text-2xl text-on-surface mt-2">{chapterData?.title || `Chương ${currentIndex}`}</h1>
      </header>

      {/* Control Bar */}
      <div className="max-w-[1000px] mx-auto mb-8 sticky top-[80px] z-40">
        <div className="bg-surface border border-outline-variant/50 rounded-sm py-1.5 px-3 flex items-center justify-between shadow-sm">
          {/* Font Size Controls */}
          <div className="flex items-center space-x-1 shrink-0">
            <button 
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
              className="p-1 rounded-sm hover:bg-surface-variant transition-colors text-on-surface-variant group border border-transparent hover:border-outline-variant/50"
            >
              <span className="material-symbols-outlined text-[16px]">text_decrease</span>
            </button>
            <span className="font-bold text-on-surface w-6 text-center text-xs">{fontSize}</span>
            <button 
              onClick={() => setFontSize(Math.min(36, fontSize + 2))}
              className="p-1 rounded-sm hover:bg-surface-variant transition-colors text-on-surface-variant group border border-transparent hover:border-outline-variant/50"
            >
              <span className="material-symbols-outlined text-[16px]">text_increase</span>
            </button>
          </div>
          {/* Chapter Selector */}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 bg-surface-variant/30 hover:bg-surface-variant/80 px-2.5 py-1.5 rounded-sm transition-colors font-bold text-xs text-on-surface border border-outline-variant/50 hover:border-primary"
            >
              <span className="material-symbols-outlined text-[14px]">list</span>
              <span>Chương {currentIndex}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
            </button>
            
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 max-h-[60vh] overflow-y-auto bg-surface border border-outline-variant/50 shadow-lg rounded-sm z-50 flex flex-col overscroll-contain">
                  {toc.map((title, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate(`/chapter/${novelId}/${idx + 1}`);
                      }}
                      className={`text-left px-3 py-2.5 hover:bg-surface-variant transition-colors border-b border-outline-variant/30 last:border-b-0 text-[11px] ${idx + 1 === currentIndex ? 'font-bold text-primary bg-primary/5 border-l-2 border-l-primary' : 'text-on-surface border-l-2 border-l-transparent'}`}
                    >
                      {title}
                    </button>
                  ))}
                  {toc.length === 0 && (
                    <div className="px-4 py-3 text-sm text-on-surface-variant text-center">Không có dữ liệu</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Main Reading Area */}
      <article className="max-w-[1000px] mx-auto mb-10">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : chapterData ? (
          <div 
            className="text-on-surface space-y-6 text-justify chapter-content-override font-body-reading"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
            dangerouslySetInnerHTML={{ __html: chapterData.content }}
          />
        ) : (
          <div className="text-center text-on-surface-variant py-10">
            Nội dung chương này chưa được cập nhật.
          </div>
        )}
        
        {/* Chapter End Decorative Element */}
        <div className="flex justify-center mt-12 text-primary-container">
          <span className="material-symbols-outlined text-[32px]">favorite</span>
          <span className="material-symbols-outlined text-[32px] mx-2">auto_awesome</span>
          <span className="material-symbols-outlined text-[32px]">favorite</span>
        </div>
      </article>

      {/* Navigation Buttons */}
      <div className="max-w-[1000px] mx-auto flex justify-between items-center mb-16">
        <button 
          onClick={() => navigate(`/chapter/${novel.id}/${currentIndex - 1}`)}
          disabled={currentIndex <= 1}
          className="flex items-center px-6 py-2.5 bg-surface border border-outline-variant text-primary rounded-sm hover:bg-surface-variant hover:border-primary transition-colors group disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
          <span>Chương Trước</span>
        </button>
        <button 
          onClick={() => navigate(`/chapter/${novel.id}/${currentIndex + 1}`)}
          disabled={toc.length > 0 && currentIndex >= toc.length}
          className="flex items-center px-6 py-2.5 bg-primary text-on-primary rounded-sm hover:bg-primary/90 transition-colors shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          <span>Chương Sau</span>
          <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default ChapterPage;
