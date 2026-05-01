import React from 'react';
import { Link } from 'react-router-dom';

interface UpdateCardProps {
  id: string;
  title: string;
  chapter: string;
  time: string;
  image: string;
  tags: string[];
  views?: number;
}

const UpdateCard: React.FC<UpdateCardProps> = ({ id, title, chapter, time, image, tags, views }) => {
  return (
    <div>

      <Link
        className="bg-surface border border-outline-variant/50 rounded-sm p-3 flex gap-4 hover:border-primary transition-colors group"
        to={`/detail/${id}`}
      >
        <div className="w-20 h-28 flex-shrink-0 rounded-sm overflow-hidden border border-outline-variant/50 relative">
          <img alt={title} className="w-full h-full object-cover" src={image} />
        </div>


        <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <span key={tag} className="bg-surface-variant text-on-surface-variant font-bold text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="font-label-bold text-on-surface line-clamp-2 mb-1 group-hover:text-primary transition-colors leading-tight">
              {title}
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline-variant/50">
            <p className="font-bold text-[11px] text-primary">{chapter}</p>
            <div className="flex items-center gap-3">
              <p className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">visibility</span>
                {views || 0}
              </p>
              <p className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                {time}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default UpdateCard;
