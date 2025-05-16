import { Link, useLocation } from 'wouter';
import {
  Home,
  Building2,
  FileText,
  FileArchive,
  MessageCircle,
  BarChart2,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [location] = useLocation();

  // Helper to check if a path is active (exact or partial match)
  const isActive = (path: string, exact = false) => {
    if (exact) return location === path;
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <aside className={cn(
      "md:flex flex-col w-64 bg-white border-r border-secondary-200 z-20",
      "fixed md:relative inset-y-0 left-0 transform transition-transform duration-200 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      { "hidden": !isOpen && !isOpen }
    )}>
      <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white font-bold">
            IF
          </div>
          <span className="ml-2 font-semibold text-xl">InvestFlow</span>
        </div>
        <button 
          onClick={onClose} 
          className="md:hidden text-secondary-500 hover:text-secondary-700"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
          Main
        </div>
        
        <Link href="/">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/', true)
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <Home className="h-5 w-5 mr-3" />
            Dashboard
          </a>
        </Link>

        <Link href="/startups">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/startups')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <Building2 className="h-5 w-5 mr-3" />
            Startups
          </a>
        </Link>

        <Link href="/memos">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/memos')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <FileText className="h-5 w-5 mr-3" />
            Memos
          </a>
        </Link>

        <Link href="/documents">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/documents')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <FileArchive className="h-5 w-5 mr-3" />
            Documents
          </a>
        </Link>
        
        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
          Tools
        </div>
        
        <Link href="/ai-assistant">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/ai-assistant')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <MessageCircle className="h-5 w-5 mr-3" />
            Ask AI
          </a>
        </Link>

        <Link href="/analytics">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/analytics')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <BarChart2 className="h-5 w-5 mr-3" />
            Analytics
          </a>
        </Link>

        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
          Settings
        </div>
        
        <Link href="/settings">
          <a className={cn(
            "flex items-center px-4 py-2 text-sm",
            isActive('/settings')
              ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
              : "text-secondary-600 hover:bg-secondary-50"
          )}>
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </a>
        </Link>
      </nav>
      
      <div className="p-4 border-t border-secondary-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium">
            DR
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium">David Rodriguez</p>
            <p className="text-xs text-secondary-500">Investment Analyst</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
