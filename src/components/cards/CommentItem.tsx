import React from 'react';

interface CommentItemProps {
  user: string;
  time: string;
  text: string;
  likes: number;
  avatar: string;
}

const CommentItem: React.FC<CommentItemProps> = ({ user, time, text, likes, avatar }) => {
  return (
    <div 
      className="flex gap-3 p-3 rounded-sm bg-surface hover:bg-surface-variant transition-colors border border-outline-variant/50"
    >
      <div className="relative shrink-0">
        <img alt={user} className="w-10 h-10 rounded-sm object-cover border border-outline-variant/50" src={avatar} />

        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border border-surface rounded-full" />
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-label-bold text-on-surface text-xs">{user}</span>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-80">{time}</span>
          </div>
          <button className="text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">more_horiz</span>
          </button>
        </div>
        <p className="font-body-ui text-[12px] text-on-surface mt-1 leading-relaxed">
          {text}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <button className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors group">
            <span className="material-symbols-outlined text-[14px]">favorite</span> 
            <span className="font-bold text-[10px]">{likes}</span>
          </button>
          <button className="font-bold text-[10px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">reply</span>
            Phản hồi
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
