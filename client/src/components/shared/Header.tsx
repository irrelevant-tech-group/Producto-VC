import { useState } from 'react';
import { Menu, Bell, Settings, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="bg-white border-b border-secondary-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="text-secondary-500 hover:text-secondary-600 focus:outline-none md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          {isMobile && <span className="ml-2 font-semibold text-xl">InvestFlow</span>}
        </div>
        
        <form 
          onSubmit={handleSearch}
          className="w-full max-w-xl md:ml-10 relative hidden md:block"
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <Input
            type="text"
            placeholder="Search startups, documents, or memos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-3 py-2 w-full"
          />
        </form>
        
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2 text-secondary-400"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2 text-secondary-400"
            aria-label="Settings"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
