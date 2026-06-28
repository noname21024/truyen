import React from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';

interface ChapterItemProps {
  id: string;
  title: string;
  date: string;
  isLocked?: boolean;
  onLockedClick?: () => void;
}

const ChapterItem: React.FC<ChapterItemProps> = ({ id, title, date, isLocked, onLockedClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      if (onLockedClick) {
        onLockedClick();
      }
    }
  };

  return (
    <div>
      <Link 
        className="flex justify-between items-center p-3 rounded-sm hover:bg-surface-variant transition-colors border border-outline-variant/50 hover:border-primary group bg-surface" 
        to={isLocked ? '#' : `/chapter/${id}`}
        onClick={handleClick}
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
          <ViconicIcon 
            name={isLocked ? "m9:lock-outline" : "chevron_right"} 
            size={14} 
            className="text-on-surface-variant group-hover:text-on-primary transition-colors shrink-0" 
          />
        </div>
      </Link>
    </div>
  );
};

export default ChapterItem;
