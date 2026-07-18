import React from 'react';
import { Link } from 'react-router-dom';
import ViconicIcon from '@/components/ui/ViconicIcon';

interface CategoryItemProps {
  icon: string;
  name: string;
  id?: number;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ icon, name, id }) => {
  return (
    <div>


      <Link
        className="flex flex-col items-center justify-center py-4 px-2 bg-surface rounded-sm border border-outline-variant/50 hover:border-primary transition-colors group"
        to={id ? `/genres/${id}` : `/genres/${encodeURIComponent(name)}`}
      >
        <div className="w-8 h-8 rounded-sm bg-surface-variant flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-on-primary transition-colors">
          <ViconicIcon 
            name={icon} 
            size="20px" 
            className="text-on-surface-variant group-hover:text-on-primary transition-colors" 
          />
        </div>
        <span className="font-label-bold text-on-surface group-hover:text-primary transition-colors text-[10px]">
          {name}
        </span>
      </Link>
    </div>
  );
};

export default CategoryItem;
