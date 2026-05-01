import React from 'react';
import { Link } from 'react-router-dom';

interface RankItemProps {
  id: string;
  rank: number;
  title: string;
  category: string;
  reads: string;
  image: string;
  rankColor: string;
}

const RankItem: React.FC<RankItemProps> = ({ id, rank, title, category, reads, image, rankColor }) => {
  return (
    <div>


      <Link
        className="flex items-center gap-3 p-2 rounded-sm bg-surface hover:bg-surface-variant transition-colors group border border-outline-variant/50 hover:border-primary"
        to={`/detail/${id}`}
      >
        <div className={`text-xl font-black ${rankColor} w-8 text-center`}>
          {rank.toString().padStart(2, '0')}
        </div>

        <div className="relative w-12 h-12 rounded-[5px] overflow-hidden shrink-0 border border-outline-variant/50">
          <img alt={title} className="w-full h-full object-cover" src={image} />
        </div>



        <div className="flex-grow">
          <h4 className="font-label-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] bg-primary-container text-on-primary-container font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
              {category}
            </span>
            <span className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">visibility</span>
              {reads}
            </span>
          </div>
        </div>

        <div className="w-6 h-6 rounded-[5px] bg-surface-variant flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </div>

      </Link>
    </div>
  );
};

export default RankItem;
