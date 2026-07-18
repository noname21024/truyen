import React from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';
import { formatViews } from '@/lib/format';

interface UpdateCardProps {
  id: string | number;
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
        className="bg-surface border border-outline-variant/50 rounded-sm p-4 flex gap-4 hover:border-primary transition-colors group"
        to={`/detail/${id}`}
      >
        <div className="w-[110px] h-[150px] flex-shrink-0 rounded-sm overflow-hidden border border-outline-variant/50 relative bg-slate-50 dark:bg-slate-900">
          <img alt={title} className="w-full h-full object-cover" src={image} loading="lazy" decoding="async" />
        </div>

        <div className="flex flex-col justify-between py-0.5 flex-grow min-w-0">
          <div>
            <div className="flex gap-1.5 mb-2 flex-wrap items-center">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="bg-surface-variant text-on-surface-variant font-bold text-[10px] px-2 py-1 rounded-sm uppercase tracking-tighter">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-on-surface-variant font-bold text-[10px] px-0.5 py-1 tracking-tighter select-none">
                  ...
                </span>
              )}
            </div>
            <h3 className="font-label-bold text-base text-on-surface line-clamp-2 mb-1 group-hover:text-primary transition-colors leading-snug">
              {title}
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline-variant/30">
            <p className="font-bold text-xs text-primary">{chapter}</p>
            <div className="flex items-center gap-3">
              <p className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1">
                <ViconicIcon name="visibility" size={13} className="shrink-0" />
                {formatViews(views || 0)}
              </p>
              <p className="font-label-sm text-xs text-on-surface-variant flex items-center gap-1">
                <ViconicIcon name="schedule" size={13} className="shrink-0" />
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
