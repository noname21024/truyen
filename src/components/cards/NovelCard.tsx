import React from 'react';
import { Link } from 'react-router-dom';

interface NovelCardProps {
  id: string;
  title: string;
  author: string;
  status: string;
  statusColor: string;
  image: string;
  views?: number;
}

const NovelCard: React.FC<NovelCardProps> = ({ id, title, author, status, statusColor, image, views }) => {
  return (
    <div className="group relative">
      <Link
        to={`/detail/${id}`}
        className="block bg-surface rounded-sm overflow-hidden border border-outline-variant/50 hover:border-primary transition-colors duration-200"
      >
        <div className="relative h-48 md:h-56 overflow-hidden">
          <img
            alt={title}
            className="w-full h-full object-cover"
            src={image}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className={`absolute top-3 left-3 ${statusColor} font-label-sm text-[10px] px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md bg-opacity-90 z-10 font-bold tracking-wider uppercase`}>
            {status}
          </div>

          {/* Quick Action Overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
            <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg">
              <span className="material-symbols-outlined text-primary text-xl">play_arrow</span>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-outline-variant/50 bg-surface">
          <h3 className="font-label-bold text-on-surface mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1 uppercase tracking-wider truncate flex-grow">
              <span className="material-symbols-outlined text-[12px] shrink-0">person</span>
              <span className="truncate">{author}</span>
            </p>
            <div className="flex items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-[12px]">visibility</span>
              <span className="text-[10px] font-bold">{views || 0}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default NovelCard;
