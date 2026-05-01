import React from 'react';
import { Link } from 'react-router-dom';

interface ChapterItemProps {
  id: string;
  title: string;
  date: string;
}

const ChapterItem: React.FC<ChapterItemProps> = ({ id, title, date }) => {
  return (
    <div>

      <Link 
        className="flex justify-between items-center p-3 rounded-sm hover:bg-surface-variant transition-colors border border-outline-variant/50 hover:border-primary group bg-surface" 
        to={`/chapter/${id}`}
      >
        <div className="min-w-0 flex-grow mr-4">
          <span className="font-label-bold text-on-surface group-hover:text-primary transition-colors block text-xs truncate">
            {title}
          </span>
          <span className="block font-label-sm text-[10px] text-on-surface-variant mt-1 opacity-80 truncate">
            {date}
          </span>
        </div>
        <div className="w-6 h-6 rounded-sm bg-surface-variant flex items-center justify-center group-hover:bg-primary transition-colors">
          <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-on-primary">chevron_right</span>
        </div>
      </Link>
    </div>
  );
};

export default ChapterItem;
