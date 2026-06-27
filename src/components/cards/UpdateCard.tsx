import React from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';

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
        data-novel-slug={id}
        className="bg-surface border border-outline-variant/50 rounded-sm p-2.5 flex gap-3 hover:border-primary transition-colors group"
        to={`/detail/${id}`}
      >
        <div className="w-[84px] h-[116px] flex-shrink-0 rounded-sm overflow-hidden border border-outline-variant/50 relative bg-slate-50 dark:bg-slate-900">
          <img alt={title} className="w-full h-full object-cover" src={image} />
        </div>

        <div className="flex flex-col justify-between py-0.5 flex-grow min-w-0">
          <div>
            <div className="flex gap-1.5 mb-1.5 flex-wrap items-center">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="bg-surface-variant text-on-surface-variant font-bold text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-tighter">
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-on-surface-variant font-bold text-[9px] px-0.5 py-0.5 tracking-tighter select-none">
                  ...
                </span>
              )}
            </div>
            <h3 className="font-label-bold text-xs text-on-surface line-clamp-2 mb-0.5 group-hover:text-primary transition-colors leading-snug">
              {title}
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto pt-1 border-t border-outline-variant/30">
            <p className="font-bold text-[10px] text-primary">{chapter}</p>
            <div className="flex items-center gap-2">
              <p className="font-label-sm text-[9.5px] text-on-surface-variant flex items-center gap-0.5">
                <ViconicIcon name="visibility" size={11} className="shrink-0" />
                {views || 0}
              </p>
              <p className="font-label-sm text-[9.5px] text-on-surface-variant flex items-center gap-0.5">
                <ViconicIcon name="schedule" size={11} className="shrink-0" />
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
