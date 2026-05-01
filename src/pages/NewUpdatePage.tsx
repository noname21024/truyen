import React from 'react';
import UpdateCard from '@/components/cards/UpdateCard';
import novelsData from '@/data/novelsIndex.json';
import { getAllNovelViews } from '@/lib/viewCountService';

const NewUpdatePage: React.FC = () => {
  const viewsMap = getAllNovelViews();
  return (
    <div className="max-w-[1200px] mx-auto px-8 py-10 w-full min-h-screen">
      <div className="mb-10 border-b border-outline-variant/50 pb-4">
        <h1 className="font-display-lg text-xl sm:text-2xl md:text-3xl text-on-surface mb-2 flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-primary">update</span>
          Mới cập nhật
        </h1>
        <p className="font-body-ui text-on-surface-variant text-sm">
          Luôn dẫn đầu xu hướng với những chương truyện mới nhất được cập nhật liên tục mỗi phút.
        </p>
      </div>

      {/* Today Section */}
      <section className="mb-10">
        <h2 className="font-display-lg text-lg sm:text-xl text-on-surface mb-4 flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            calendar_today
          </span>
          Hôm nay
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {novelsData.map((novel) => (
            <UpdateCard 
              key={novel.id}
              id={novel.id}
              title={novel.title} 
              chapter={`Chương ${novel.chapter_count || 1}`} 
              time="Vừa xong" 
              image={novel.cover || "https://placehold.co/400x600/e2e8f0/64748b?text=No+Cover"}
              tags={novel.tags || []}
              views={viewsMap[novel.id] || 0}
            />
          ))}
        </div>
      </section>

      {/* Những ngày trước Section */}
      <section className="mb-10">
        <h2 className="font-display-lg text-lg sm:text-xl text-on-surface mb-4 flex items-center gap-2 truncate">
          <span className="material-symbols-outlined text-outline" style={{ fontVariationSettings: "'FILL' 1" }}>
            history
          </span>
          Những ngày trước
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UpdateCard 
            id="4"
            title="Journey to the Sakura Tree" 
            chapter="Chương 89" 
            time="Hôm qua" 
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuBPkocuOlAahSC5oxMlCZ0OTu-bXsTK6bg96d1ZspvgiOa_V7ZMDvWp-klY2mzM9FW7mM_nf0n3vt_4Uq31HFLKes7rcq53R1TcJNCYNgalGxtYDZCyQpdcEIJLTHzoCAuVGqL1PC1lI28Y0pAMQpYWPmZkV-hz3JWphp1CE3yvVWy49sQ_OtIWGno9qtqyCCaCtIcTL9nQX9zQG2ESDiXfgVSXLaBjcVh9ioKY6VSFwWaFWK1WZFtQKzTmTEur4EFae6aWfg0hKKjW"
            tags={["Adventure", "Fantasy"]}
          />
          <UpdateCard 
            id="5"
            title="Stargazing Club Secrets" 
            chapter="Chương 24" 
            time="Hôm qua" 
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDzl4Z1_vRF732MuMaL6Zi2plIvCvVUYlwkP_argttEQazoiDCYzZn0qGf_enqoroYIy-d4ECcCTfUFqiEszT9pwrAaxPJAjFiU660LRr25gUVDxsjZ15-uD5o345CgrFf7G-8WxsPgQ22LCj8OPBTxJg_tq0uv4yiMY1SVbbIZaH0OH7Ds62CV777nVd-FU9LsimdAta3EF-b0dDuh7PdST8H3PKqCtilbM83-Z7OQznY0lJ9ttRrnDiVCcH8Yi1yp4Qpgt9D0Tt_s"
            tags={["School Life", "Romance"]}
          />
        </div>
      </section>
    </div>
  );
};

export default NewUpdatePage;
