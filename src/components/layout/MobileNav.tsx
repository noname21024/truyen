import { Link, useLocation } from 'react-router-dom';

const MobileNav: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[320px] rounded-full border border-primary-container/50 bg-white/80 backdrop-blur-xl shadow-xl shadow-primary-container/20 z-50">
      <div className="flex justify-around items-center py-2 px-4">
        <Link 
          className={`flex flex-col items-center ${location.pathname === '/' ? 'text-primary' : 'text-outline'}`} 
          to="/"
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
        </Link>
        <Link 
          className={`flex flex-col items-center ${location.pathname.startsWith('/genres') ? 'text-primary' : 'text-outline'}`} 
          to="/genres"
        >
          <span className="material-symbols-outlined text-[24px]">category</span>
        </Link>
        <Link className="flex flex-col items-center text-outline" to="#">
          <span className="material-symbols-outlined text-[24px]">trending_up</span>
        </Link>
        <Link 
          className={`flex flex-col items-center ${location.pathname === '/new-update' ? 'text-primary' : 'text-outline'}`} 
          to="/new-update"
        >
          <span className="material-symbols-outlined text-[24px]">update</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNav;
