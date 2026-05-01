import React from 'react';
import Header from './Header';
import Footer from './Footer';
import MobileNav from './MobileNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="bg-surface text-on-surface font-body-ui text-body-ui min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Ambient Sakura Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[radial-gradient(circle_at_50%_50%,rgba(255,209,220,0.1)_0%,transparent_80%)]"></div>
      
      <Header />
      
      <main className="flex-grow">
        {children}
      </main>
      
      <MobileNav />
      
      <Footer />
    </div>
  );
};

export default MainLayout;
