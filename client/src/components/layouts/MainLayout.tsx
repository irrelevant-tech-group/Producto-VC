import React, { ReactNode } from 'react';
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="font-sans bg-secondary-50 text-secondary-900 h-screen flex overflow-hidden">
      {/* Sidebar - hidden on mobile by default, controlled by state */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header toggleSidebar={toggleSidebar} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-secondary-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;